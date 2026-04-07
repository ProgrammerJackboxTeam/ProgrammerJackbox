// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/codeTyper", express.static("gameModes/codeTyper"));
app.use("/flexboxSpider", express.static("gameModes/flexboxSpider"));

const BUG_FIXER_MIN_PLAYERS = 3;
const BUG_FIXER_HAND_SIZE = 5;
const BUG_FIXER_FINALIZE_DELAY_MS = 10000;

function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
}

function loadBugFixerData() {
    const gameDir = path.join(__dirname, "gameModes", "bugFixerGame");
    const promptsPath = path.join(gameDir, "bugPrompts.json");
    const solutionsPath = path.join(gameDir, "solutionCards.json");

    let prompts = [];
    let solutions = [];

    try {
        prompts = JSON.parse(fs.readFileSync(promptsPath, "utf8"));
    } catch {
        prompts = [];
    }

    try {
        solutions = JSON.parse(fs.readFileSync(solutionsPath, "utf8"));
    } catch {
        solutions = [];
    }

    return {
        prompts: Array.isArray(prompts) ? prompts : [],
        solutions: Array.isArray(solutions) ? solutions : []
    };
}

const bugFixerData = loadBugFixerData();

function loadGameModes() {
    const gameModesPath = path.join(__dirname, "public", "gamemodes.json");
    try {
        const raw = JSON.parse(fs.readFileSync(gameModesPath, "utf8"));
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

const gameModesData = loadGameModes();
const validGameModeNames = new Set(
    gameModesData
        .map(entry => entry && entry.name)
        .filter(Boolean)
);

const rooms = {}; // { ROOMCODE: { host, players, selectedGame, visibility, bugFixer } }

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function sampleUnique(array, count) {
    if (count > array.length) {
        return [];
    }

    return shuffle(array).slice(0, count);
}

function randomItem(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }

    return array[Math.floor(Math.random() * array.length)];
}

function sanitizeNonNegativeInt(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}

function clearBugFixerTimer(state, key) {
    if (!state || !state.timerHandles || !state.timerHandles[key]) {
        return;
    }

    clearTimeout(state.timerHandles[key]);
    state.timerHandles[key] = null;
}

function clearAllBugFixerTimers(state) {
    clearBugFixerTimer(state, "submissionTimeout");
    clearBugFixerTimer(state, "deciderTimeout");
    clearBugFixerTimer(state, "finalizeTimeout");
}

function countPromptBlanks(prompt) {
    const matches = String(prompt || "").match(/_{5}/g);
    return matches ? matches.length : 0;
}

function getSolutionResponses() {
    return bugFixerData.solutions
        .map(entry => entry.response)
        .filter(Boolean);
}

function drawCardsForHand(currentHand, targetSize) {
    const responses = getSolutionResponses();
    const safeHand = Array.isArray(currentHand) ? [...currentHand] : [];

    while (safeHand.length < targetSize) {
        const options = responses.filter(card => !safeHand.includes(card));
        if (options.length === 0) {
            break;
        }
        const draw = options[Math.floor(Math.random() * options.length)];
        safeHand.push(draw);
    }

    return safeHand;
}

function ensureBugFixerPlayerState(room) {
    if (!room.bugFixer) {
        return;
    }

    if (!room.bugFixer.scores) {
        room.bugFixer.scores = {};
    }
    if (!room.bugFixer.hands) {
        room.bugFixer.hands = {};
    }

    const validIds = room.players.map(player => player.id);
    const staleScoreIds = Object.keys(room.bugFixer.scores).filter(id => !validIds.includes(id));
    staleScoreIds.forEach(id => {
        delete room.bugFixer.scores[id];
    });

    const staleHandIds = Object.keys(room.bugFixer.hands).filter(id => !validIds.includes(id));
    staleHandIds.forEach(id => {
        delete room.bugFixer.hands[id];
    });

    room.players.forEach(player => {
        if (typeof room.bugFixer.scores[player.id] !== "number") {
            room.bugFixer.scores[player.id] = 0;
        }
        room.bugFixer.hands[player.id] = drawCardsForHand(room.bugFixer.hands[player.id], BUG_FIXER_HAND_SIZE);
    });
}

function getPlayerName(room, id) {
    const player = room.players.find(entry => entry.id === id);
    return player ? player.name : "Unknown";
}

function buildBugFixerScores(room, state) {
    return room.players.map(player => ({
        id: player.id,
        name: player.name,
        score: state && state.scores[player.id] ? state.scores[player.id] : 0
    }));
}

function nextPrompt(state) {
    const prompts = bugFixerData.prompts;
    if (prompts.length === 0) {
        return null;
    }

    return randomItem(prompts);
}

function ensureDeciderOrder(room) {
    const state = room.bugFixer;
    const playerIds = room.players.map(player => player.id);

    if (!Array.isArray(state.deciderOrder) || state.deciderOrder.length !== playerIds.length) {
        state.deciderOrder = shuffle(playerIds);
        state.deciderIndex = 0;
        return;
    }

    const missing = state.deciderOrder.some(id => !playerIds.includes(id));
    if (missing) {
        state.deciderOrder = shuffle(playerIds);
        state.deciderIndex = 0;
    }
}

function pickRandomCardsFromHand(hand, count) {
    const safeHand = Array.isArray(hand) ? [...hand] : [];
    const wanted = Math.max(1, count);
    if (safeHand.length <= wanted) {
        return safeHand;
    }
    return sampleUnique(safeHand, wanted);
}

function buildSubmissionOptions(round) {
    const shuffled = shuffle(Object.values(round.submissions));
    return shuffled.map((submission, index) => ({
        submissionId: index + 1,
        playerId: submission.playerId,
        text: submission.text
    }));
}

function getNonDeciderPlayerIds(room, round) {
    return room.players
        .map(player => player.id)
        .filter(playerId => playerId !== round.deciderId);
}

function chooseLowestScorePlayerId(room, round) {
    const eligible = getNonDeciderPlayerIds(room, round);
    if (eligible.length === 0) {
        return null;
    }

    let lowest = Number.POSITIVE_INFINITY;
    eligible.forEach(playerId => {
        const score = room.bugFixer.scores[playerId] || 0;
        if (score < lowest) {
            lowest = score;
        }
    });

    const tied = eligible.filter(playerId => (room.bugFixer.scores[playerId] || 0) === lowest);
    return randomItem(tied);
}

function replenishHandsAfterRound(room, round) {
    Object.values(round.submissions).forEach(submission => {
        const currentHand = room.bugFixer.hands[submission.playerId] || [];
        const remaining = [...currentHand];

        submission.cards.forEach(card => {
            const removeAt = remaining.indexOf(card);
            if (removeAt !== -1) {
                remaining.splice(removeAt, 1);
            }
        });

        room.bugFixer.hands[submission.playerId] = drawCardsForHand(remaining, BUG_FIXER_HAND_SIZE);
    });
}

function enterJudgingPhase(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.bugFixer || !room.bugFixer.currentRound) {
        return;
    }

    const state = room.bugFixer;
    const round = state.currentRound;

    round.phase = "judging";
    round.submissionOptions = buildSubmissionOptions(round);
    round.deciderDeadlineAt = null;
    round.finalizeDeadlineAt = null;
    round.pendingWinnerPlayerId = null;
    round.pendingWinnerSubmissionId = null;

    clearBugFixerTimer(state, "submissionTimeout");
    clearBugFixerTimer(state, "finalizeTimeout");
    clearBugFixerTimer(state, "deciderTimeout");

    const deciderSeconds = sanitizeNonNegativeInt(state.settings && state.settings.deciderSeconds, 0);
    if (deciderSeconds > 0) {
        round.deciderDeadlineAt = Date.now() + (deciderSeconds * 1000);
        state.timerHandles.deciderTimeout = setTimeout(() => {
            const liveRoom = rooms[roomCode];
            if (!liveRoom || !liveRoom.bugFixer || !liveRoom.bugFixer.active || !liveRoom.bugFixer.currentRound) {
                return;
            }

            const liveRound = liveRoom.bugFixer.currentRound;
            if (liveRound.phase !== "judging" && liveRound.phase !== "confirming") {
                return;
            }

            let timedOutWinnerId = null;
            if ((liveRoom.bugFixer.settings && liveRoom.bugFixer.settings.deciderTimeoutAction) === "lowest-score") {
                timedOutWinnerId = chooseLowestScorePlayerId(liveRoom, liveRound);
            }

            finalizeBugFixerRound(roomCode, {
                winnerPlayerId: timedOutWinnerId,
                reason: timedOutWinnerId ? "decider-timeout-lowest" : "decider-timeout-none"
            });
        }, deciderSeconds * 1000);
    }

    emitBugFixerState(roomCode);
}

function finalizeBugFixerRound(roomCode, { winnerPlayerId = null, reason = "decider-picked" } = {}) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "bugFixerGame" || !room.bugFixer || !room.bugFixer.active || !room.bugFixer.currentRound) {
        return;
    }

    const state = room.bugFixer;
    const round = state.currentRound;

    clearAllBugFixerTimers(state);

    if (winnerPlayerId) {
        if (!state.scores[winnerPlayerId]) {
            state.scores[winnerPlayerId] = 0;
        }
        state.scores[winnerPlayerId] += 1;
    }

    replenishHandsAfterRound(room, round);

    const revealedSubmissions = (round.submissionOptions || []).map(option => ({
        playerName: getPlayerName(room, option.playerId),
        text: option.text
    }));

    if (!winnerPlayerId) {
        state.lastResult = {
            message: reason === "decider-timeout-none"
                ? `${getPlayerName(room, round.deciderId)} timed out. No point awarded this round.`
                : "No point awarded this round.",
            revealedSubmissions
        };
    } else if (reason === "decider-timeout-lowest") {
        state.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} timed out. Point awarded to lowest-score player ${getPlayerName(room, winnerPlayerId)}.`,
            revealedSubmissions
        };
    } else {
        state.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} picked ${getPlayerName(room, winnerPlayerId)}.`,
            revealedSubmissions
        };
    }

    if (winnerPlayerId && state.scores[winnerPlayerId] >= state.pointsToWin) {
        state.active = false;
        state.currentRound = null;
        state.lastResult = {
            message: `${getPlayerName(room, winnerPlayerId)} wins Bug Fixer (${state.scores[winnerPlayerId]} points)!`,
            revealedSubmissions
        };
        emitBugFixerState(roomCode);
        return;
    }

    startNextBugFixerRound(roomCode);
}

function autoSubmitMissingPlayers(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.bugFixer || !room.bugFixer.currentRound || !room.bugFixer.active) {
        return;
    }

    const round = room.bugFixer.currentRound;
    if (round.phase !== "submitting") {
        return;
    }

    const nonDeciderIds = getNonDeciderPlayerIds(room, round);
    nonDeciderIds.forEach(playerId => {
        if (round.submissions[playerId]) {
            return;
        }

        const hand = room.bugFixer.hands[playerId] || [];
        const pickedCards = pickRandomCardsFromHand(hand, round.responsesRequired);
        round.submissions[playerId] = {
            playerId,
            cards: pickedCards,
            text: pickedCards.join(" | ")
        };
    });

    enterJudgingPhase(roomCode);
}

function buildBugFixerPayloadForPlayer(room, playerId) {
    const state = room.bugFixer;
    const canStart = room.selectedGame === "bugFixerGame"
        && room.host === playerId
        && room.players.length >= BUG_FIXER_MIN_PLAYERS;

    if (!state || !state.active || !state.currentRound) {
        return {
            active: false,
            canStart,
            message: room.players.length < BUG_FIXER_MIN_PLAYERS
                ? `Need at least ${BUG_FIXER_MIN_PLAYERS} players to start Bug Fixer.`
                : "Bug Fixer is ready.",
            pointsToWin: state && state.pointsToWin ? state.pointsToWin : null,
            timerSettings: state && state.settings ? state.settings : null,
            scores: buildBugFixerScores(room, state || { scores: {} }),
            lastResult: state ? state.lastResult : null
        };
    }

    const round = state.currentRound;
    const isDecider = round.deciderId === playerId;
    const submissionsNeeded = room.players.length - 1;
    const submittedCount = Object.keys(round.submissions).length;
    let message = "";

    if (round.phase === "submitting") {
        message = `Waiting for submissions (${submittedCount}/${submissionsNeeded}).`;
    } else if (round.phase === "judging") {
        message = isDecider
            ? "Choose a winner."
            : "Decider is choosing a winner.";
    } else if (round.phase === "confirming") {
        message = isDecider
            ? "Winner selected. You can still change it before finalization."
            : "Decider locked a choice. Finalizing shortly.";
    }

    return {
        active: true,
        canStart,
        message,
        roundNumber: state.roundNumber,
        phase: round.phase,
        prompt: round.prompt,
        responsesRequired: round.responsesRequired,
        pointsToWin: state.pointsToWin,
        timerSettings: state.settings,
        deciderId: round.deciderId,
        deciderName: getPlayerName(room, round.deciderId),
        isDecider,
        yourHand: isDecider ? [] : (state.hands[playerId] || []),
        yourSubmitted: Boolean(round.submissions[playerId]),
        submissionsNeeded,
        submittedCount,
        submissionOptions: isDecider && (round.phase === "judging" || round.phase === "confirming")
            ? round.submissionOptions.map(option => ({
                submissionId: option.submissionId,
                text: option.text
            }))
            : [],
        submissionDeadlineTs: round.submissionDeadlineAt || null,
        deciderDeadlineTs: round.deciderDeadlineAt || null,
        finalizeDeadlineTs: round.finalizeDeadlineAt || null,
        pendingWinnerSubmissionId: isDecider ? (round.pendingWinnerSubmissionId || null) : null,
        serverNowTs: Date.now(),
        scores: buildBugFixerScores(room, state),
        lastResult: state.lastResult
    };
}

function emitBugFixerState(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "bugFixerGame") {
        return;
    }

    room.players.forEach(player => {
        io.to(player.id).emit("bugfixer-state", buildBugFixerPayloadForPlayer(room, player.id));
    });
}

function startNextBugFixerRound(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "bugFixerGame" || !room.bugFixer || !room.bugFixer.active) {
        return;
    }

    if (room.players.length < BUG_FIXER_MIN_PLAYERS) {
        room.bugFixer.active = false;
        room.bugFixer.currentRound = null;
        room.bugFixer.lastResult = { message: `Need at least ${BUG_FIXER_MIN_PLAYERS} players to continue.` };
        emitBugFixerState(roomCode);
        return;
    }

    ensureBugFixerPlayerState(room);
    ensureDeciderOrder(room);
    const state = room.bugFixer;

    clearAllBugFixerTimers(state);

    if (state.deciderIndex >= state.deciderOrder.length) {
        state.deciderIndex = 0;
    }

    const deciderId = state.deciderOrder[state.deciderIndex];
    state.deciderIndex += 1;

    const promptCard = nextPrompt(state);
    if (!promptCard) {
        state.active = false;
        state.currentRound = null;
        state.lastResult = { message: "No prompt cards are available." };
        emitBugFixerState(roomCode);
        return;
    }

    const promptText = String(promptCard.prompt || "");
    const explicitResponses = Number(promptCard.responses) || 1;
    const blankCount = countPromptBlanks(promptText);
    const responsesRequired = Math.max(1, blankCount || explicitResponses);

    state.roundNumber += 1;
    state.currentRound = {
        phase: "submitting",
        deciderId,
        prompt: promptText,
        responsesRequired,
        submissions: {},
        submissionOptions: [],
        pendingWinnerPlayerId: null,
        pendingWinnerSubmissionId: null,
        submissionDeadlineAt: null,
        deciderDeadlineAt: null,
        finalizeDeadlineAt: null
    };

    const submitSeconds = sanitizeNonNegativeInt(state.settings && state.settings.submissionSeconds, 0);
    if (submitSeconds > 0) {
        state.currentRound.submissionDeadlineAt = Date.now() + (submitSeconds * 1000);
        state.timerHandles.submissionTimeout = setTimeout(() => {
            autoSubmitMissingPlayers(roomCode);
        }, submitSeconds * 1000);
    }

    emitBugFixerState(roomCode);
}

function initializeBugFixer(roomCode, payload) {
    const room = rooms[roomCode];
    if (!room) {
        return "Room not found.";
    }

    if (room.players.length < BUG_FIXER_MIN_PLAYERS) {
        return `Need at least ${BUG_FIXER_MIN_PLAYERS} players to start Bug Fixer.`;
    }

    const promptCount = bugFixerData.prompts.length;
    const solutionCount = bugFixerData.solutions.filter(entry => entry.response).length;
    if (promptCount === 0 || solutionCount < BUG_FIXER_HAND_SIZE) {
        return "Bug Fixer data is incomplete. Check prompt and solution card JSON files.";
    }

    const targetPoints = Number(payload && payload.pointsToWin);
    if (!Number.isInteger(targetPoints) || targetPoints < 1) {
        return "Points to win must be a whole number of at least 1.";
    }

    const submissionSeconds = sanitizeNonNegativeInt(payload && payload.submissionSeconds, 0);
    const deciderSeconds = sanitizeNonNegativeInt(payload && payload.deciderSeconds, 0);
    const timeoutAction = payload && payload.deciderTimeoutAction === "lowest-score"
        ? "lowest-score"
        : "no-point";

    const scores = {};
    const hands = {};
    room.players.forEach(player => {
        scores[player.id] = 0;
        hands[player.id] = drawCardsForHand([], BUG_FIXER_HAND_SIZE);
    });

    if (room.bugFixer) {
        clearAllBugFixerTimers(room.bugFixer);
    }

    room.bugFixer = {
        active: true,
        pointsToWin: targetPoints,
        settings: {
            submissionSeconds,
            deciderSeconds,
            deciderTimeoutAction: timeoutAction
        },
        scores,
        hands,
        deciderOrder: [],
        deciderIndex: 0,
        roundNumber: 0,
        currentRound: null,
        lastResult: null,
        timerHandles: {
            submissionTimeout: null,
            deciderTimeout: null,
            finalizeTimeout: null
        }
    };

    startNextBugFixerRound(roomCode);
    return null;
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom({ hostId, hostName, visibility = "private", selectedGame = null }) {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
        host: hostId,
        players: [{ id: hostId, name: hostName }],
        selectedGame,
        visibility,
        bugFixer: null
    };
    return roomCode;
}

function getPreferredGameModes(preferredGameModes) {
    if (!Array.isArray(preferredGameModes)) {
        return [];
    }

    const unique = [...new Set(preferredGameModes.map(entry => String(entry || "").trim()).filter(Boolean))];
    return unique.filter(game => validGameModeNames.has(game));
}

function findAvailablePublicRoomsByGames(preferredGames) {
    const preferred = new Set(preferredGames);
    return Object.entries(rooms)
        .filter(([, room]) => {
            if (!room || room.visibility !== "public") {
                return false;
            }

            if (!room.selectedGame || !preferred.has(room.selectedGame)) {
                return false;
            }

            if (room.selectedGame === "bugFixerGame" && room.bugFixer && room.bugFixer.active) {
                return false;
            }

            return true;
        })
        .map(([roomCode, room]) => ({ roomCode, room }));
}

function emitRoomUpdate(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    io.to(roomCode).emit("update-players", {
        players: room.players,
        hostId: room.host,
        visibility: room.visibility || "private"
    });
}

io.on("connection", socket => {
    console.log("User connected:", socket.id);

    socket.on("host-room", payload => {
        const rawName = typeof payload === "object" && payload !== null ? payload.name : payload;
        const visibility = typeof payload === "object" && payload !== null && payload.visibility === "public"
            ? "public"
            : "private";

        const trimmedName = String(rawName || "").trim();
        if (!trimmedName) {
            socket.emit("join-error", "Name is required.");
            return;
        }

        const roomCode = createRoom({
            hostId: socket.id,
            hostName: trimmedName,
            visibility,
            selectedGame: null
        });

        socket.join(roomCode);
        socket.emit("room-created", { roomCode, visibility, isHost: true });
        emitRoomUpdate(roomCode);
    });

    socket.on("join-random-room", ({ name, preferredGameModes }) => {
        const trimmedName = String(name || "").trim();
        if (!trimmedName) {
            socket.emit("join-error", "Name is required.");
            return;
        }

        const preferred = getPreferredGameModes(preferredGameModes);
        if (preferred.length === 0) {
            socket.emit("join-error", "Select at least one valid game for random matchmaking.");
            return;
        }

        const availableRooms = findAvailablePublicRoomsByGames(preferred);
        let targetRoomCode = null;
        let targetRoom = null;
        let created = false;

        if (availableRooms.length > 0) {
            const byGame = {};
            availableRooms.forEach(entry => {
                if (!byGame[entry.room.selectedGame]) {
                    byGame[entry.room.selectedGame] = [];
                }
                byGame[entry.room.selectedGame].push(entry);
            });

            const availableGames = Object.keys(byGame);
            const selectedGame = randomItem(availableGames);
            const roomEntry = randomItem(byGame[selectedGame]);
            targetRoomCode = roomEntry.roomCode;
            targetRoom = roomEntry.room;
        } else {
            const selectedGame = randomItem(preferred);
            targetRoomCode = createRoom({
                hostId: socket.id,
                hostName: trimmedName,
                visibility: "public",
                selectedGame
            });
            targetRoom = rooms[targetRoomCode];
            created = true;
        }

        const duplicate = targetRoom.players.some(player => normalizeName(player.name) === normalizeName(trimmedName));
        if (duplicate) {
            socket.emit("join-error", "That name is already in this lobby. Choose a different name.");
            return;
        }

        if (!created) {
            targetRoom.players.push({ id: socket.id, name: trimmedName });
        }

        socket.join(targetRoomCode);

        socket.emit("room-created", {
            roomCode: targetRoomCode,
            visibility: "public",
            isHost: created,
            selectedGame: targetRoom.selectedGame
        });

        emitRoomUpdate(targetRoomCode);
        io.to(targetRoomCode).emit("gamemode-selected", targetRoom.selectedGame);

        if (targetRoom.selectedGame === "bugFixerGame") {
            emitBugFixerState(targetRoomCode);
        }
    });

    socket.on("join-room", ({ roomCode, name }) => {
        if (!rooms[roomCode]) {
            socket.emit("join-error", "Room does not exist");
            return;
        }

        const room = rooms[roomCode];
        if (room.visibility === "public") {
            socket.emit("join-error", "This is a public random lobby. Use random matchmaking to join public games.");
            return;
        }

        const normalizedIncomingName = normalizeName(name);
        if (!normalizedIncomingName) {
            socket.emit("join-error", "Name is required.");
            return;
        }

        const duplicate = room.players.some(player => normalizeName(player.name) === normalizedIncomingName);
        if (duplicate) {
            socket.emit("join-error", "That name is already in this lobby. Choose a different name.");
            return;
        }

        if (room.selectedGame === "bugFixerGame" && room.bugFixer && room.bugFixer.active) {
            socket.emit("join-error", "Bug Fixer is already in progress. Please wait for the next game.");
            return;
        }

        room.players.push({ id: socket.id, name: String(name).trim() });
        socket.join(roomCode);

        emitRoomUpdate(roomCode);

        if (room.selectedGame) {
            socket.emit("gamemode-selected", room.selectedGame);
            if (room.selectedGame === "bugFixerGame") {
                emitBugFixerState(roomCode);
            }
        }
    });

    socket.on("select-gamemode", ({ roomCode, gameMode }) => {
        const room = rooms[roomCode];

        if (!room || room.host !== socket.id) {
            return;
        }

        if (room.visibility === "public") {
            return;
        }

        room.selectedGame = gameMode;
        room.bugFixer = null;
        io.to(roomCode).emit("gamemode-selected", gameMode);

        if (gameMode === "bugFixerGame") {
            emitBugFixerState(roomCode);
        }
    });

    socket.on("start-bugfixer", payload => {
        const roomCode = payload && payload.roomCode;
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || room.selectedGame !== "bugFixerGame") {
            return;
        }

        const error = initializeBugFixer(roomCode, payload || {});
        if (error) {
            socket.emit("bugfixer-error", error);
        }
    });

    socket.on("bugfixer-submit", ({ roomCode, chosenCards }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "bugFixerGame" || !room.bugFixer || !room.bugFixer.active) {
            return;
        }

        const round = room.bugFixer.currentRound;
        if (!round || round.phase !== "submitting") {
            return;
        }

        if (socket.id === round.deciderId) {
            return;
        }

        const hand = room.bugFixer.hands[socket.id] || [];
        if (!Array.isArray(chosenCards) || chosenCards.length !== round.responsesRequired) {
            socket.emit("bugfixer-error", `Submit exactly ${round.responsesRequired} card(s).`);
            return;
        }

        const uniqueCards = [...new Set(chosenCards)];
        if (uniqueCards.length !== chosenCards.length) {
            socket.emit("bugfixer-error", "Do not submit duplicate cards.");
            return;
        }

        const valid = chosenCards.every(card => hand.includes(card));
        if (!valid) {
            socket.emit("bugfixer-error", "Submission contains cards not in your hand.");
            return;
        }

        round.submissions[socket.id] = {
            playerId: socket.id,
            cards: chosenCards,
            text: chosenCards.join(" | ")
        };

        const nonDeciderCount = room.players.length - 1;
        if (Object.keys(round.submissions).length >= nonDeciderCount) {
            enterJudgingPhase(roomCode);
            return;
        }

        emitBugFixerState(roomCode);
    });

    socket.on("bugfixer-pick-winner", ({ roomCode, submissionId }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "bugFixerGame" || !room.bugFixer || !room.bugFixer.active) {
            return;
        }

        const round = room.bugFixer.currentRound;
        if (!round || (round.phase !== "judging" && round.phase !== "confirming") || round.deciderId !== socket.id) {
            return;
        }

        const picked = round.submissionOptions.find(option => option.submissionId === submissionId);
        if (!picked) {
            socket.emit("bugfixer-error", "Invalid winner selection.");
            return;
        }

        clearBugFixerTimer(room.bugFixer, "deciderTimeout");
        clearBugFixerTimer(room.bugFixer, "finalizeTimeout");

        round.phase = "confirming";
        round.pendingWinnerPlayerId = picked.playerId;
        round.pendingWinnerSubmissionId = picked.submissionId;
        round.finalizeDeadlineAt = Date.now() + BUG_FIXER_FINALIZE_DELAY_MS;

        room.bugFixer.timerHandles.finalizeTimeout = setTimeout(() => {
            finalizeBugFixerRound(roomCode, {
                winnerPlayerId: picked.playerId,
                reason: "decider-picked"
            });
        }, BUG_FIXER_FINALIZE_DELAY_MS);

        room.bugFixer.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} selected a winner. Finalizing in 10 seconds (selection can still be changed).`,
            revealedSubmissions: []
        };

        emitBugFixerState(roomCode);
    });

    socket.on("terminate-game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || !room.selectedGame) {
            return;
        }

        const terminatedGame = room.selectedGame;
        if (room.bugFixer) {
            clearAllBugFixerTimers(room.bugFixer);
        }
        room.selectedGame = null;
        room.bugFixer = null;

        io.to(roomCode).emit("game-terminated", {
            gameMode: terminatedGame,
            byHost: getPlayerName(room, socket.id)
        });
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            const room = rooms[code];
            const index = room.players.findIndex(p => p.id === socket.id);

            if (index !== -1) {
                room.players.splice(index, 1);

                if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    if (room.host === socket.id) {
                        room.host = room.players[0].id;
                    }

                    if (room.selectedGame === "bugFixerGame") {
                        if (room.bugFixer) {
                            clearAllBugFixerTimers(room.bugFixer);
                            ensureBugFixerPlayerState(room);
                        }

                        if (room.players.length < BUG_FIXER_MIN_PLAYERS) {
                            room.bugFixer = room.bugFixer || {
                                scores: {},
                                hands: {},
                                roundNumber: 0
                            };
                            room.bugFixer.active = false;
                            room.bugFixer.currentRound = null;
                            room.bugFixer.lastResult = { message: `Need at least ${BUG_FIXER_MIN_PLAYERS} players to continue.` };
                            emitBugFixerState(code);
                        } else if (room.bugFixer && room.bugFixer.active) {
                            startNextBugFixerRound(code);
                        } else {
                            emitBugFixerState(code);
                        }
                    }

                    emitRoomUpdate(code);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
