// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const LogicCAH = require("./gameModes/LogicCAH/LogicCAH.js");
const ProgrammerProphunt = require("./gameModes/programmerProphunt/ProgrammerProphunt.js");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/codeTyper", express.static("gameModes/codeTyper"));
app.use("/codeTyperMultiplayer", express.static("gameModes/codeTyperMultiplayer"));
app.use("/flexboxSpider", express.static("gameModes/flexboxSpider"));

const BUG_FIXER_MIN_PLAYERS = 3;
const BUG_FIXER_HAND_SIZE = 5;
const BUG_FIXER_FINALIZE_DELAY_MS = 10000;
const PROPHUNT_MIN_PLAYERS = 4;

const PROPHUNT_SNIPPETS = {
    easy: [
        [
            "function sum(nums) {",
            "  let total = 0;",
            "  for (const n of nums) {",
            "    total += n;",
            "  }",
            "  return total;",
            "}"
        ],
        [
            "function greet(name) {",
            "  if (!name) return \"Hello\";",
            "  return `Hello, ${name}`;",
            "}"
        ]
    ],
    medium: [
        [
            "function formatUsers(users) {",
            "  return users",
            "    .filter(user => user.active)",
            "    .map(user => ({",
            "      id: user.id,",
            "      tag: `${user.first}.${user.last}`.toLowerCase()",
            "    }));",
            "}"
        ],
        [
            "function buildReport(rows) {",
            "  const grouped = {};",
            "  for (const row of rows) {",
            "    grouped[row.type] = (grouped[row.type] || 0) + row.value;",
            "  }",
            "  return Object.entries(grouped).sort((a, b) => b[1] - a[1]);",
            "}"
        ]
    ],
    hard: [
        [
            "async function loadDashboard(client) {",
            "  const [projects, users] = await Promise.all([",
            "    client.getProjects(),",
            "    client.getUsers()",
            "  ]);",
            "",
            "  const userById = new Map(users.map(u => [u.id, u]));",
            "  return projects.map(project => ({",
            "    id: project.id,",
            "    owner: userById.get(project.ownerId)?.name || \"unknown\",",
            "    openIssues: project.issues.filter(issue => !issue.closed).length",
            "  }));",
            "}"
        ],
        [
            "function tokenize(source) {",
            "  const tokens = [];",
            "  let current = \"\";",
            "",
            "  for (const ch of source) {",
            "    if (/\\s/.test(ch)) {",
            "      if (current) tokens.push(current);",
            "      current = \"\";",
            "      continue;",
            "    }",
            "    current += ch;",
            "  }",
            "",
            "  if (current) tokens.push(current);",
            "  return tokens;",
            "}"
        ]
    ]
};

function normalizeName(name) {
    return String(name || "")
        .trim()
        .toLowerCase();
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
        solutions: Array.isArray(solutions) ? solutions : [],
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
const validGameModeNames = new Set(gameModesData.map((entry) => entry && entry.name).filter(Boolean));

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

function clearProphuntTimers(state) {
    if (!state || !state.timerHandles) {
        return;
    }
    if (state.timerHandles.phaseTimeout) {
        clearTimeout(state.timerHandles.phaseTimeout);
        state.timerHandles.phaseTimeout = null;
    }
}

function countPromptBlanks(prompt) {
    const matches = String(prompt || "").match(/_{5}/g);
    return matches ? matches.length : 0;
}

function getSolutionResponses() {
    return bugFixerData.solutions.map((entry) => entry.response).filter(Boolean);
}

function drawCardsForHand(currentHand, targetSize) {
    const responses = getSolutionResponses();
    const safeHand = Array.isArray(currentHand) ? [...currentHand] : [];

    while (safeHand.length < targetSize) {
        const options = responses.filter((card) => !safeHand.includes(card));
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

    const validIds = room.players.map((player) => player.id);
    const staleScoreIds = Object.keys(room.bugFixer.scores).filter((id) => !validIds.includes(id));
    staleScoreIds.forEach((id) => {
        delete room.bugFixer.scores[id];
    });

    const staleHandIds = Object.keys(room.bugFixer.hands).filter((id) => !validIds.includes(id));
    staleHandIds.forEach((id) => {
        delete room.bugFixer.hands[id];
    });

    room.players.forEach((player) => {
        if (typeof room.bugFixer.scores[player.id] !== "number") {
            room.bugFixer.scores[player.id] = 0;
        }
        room.bugFixer.hands[player.id] = drawCardsForHand(room.bugFixer.hands[player.id], BUG_FIXER_HAND_SIZE);
    });
}

function getPlayerName(room, id) {
    const player = room.players.find((entry) => entry.id === id);
    return player ? player.name : "Unknown";
}

function buildBugFixerScores(room, state) {
    return room.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: state && state.scores[player.id] ? state.scores[player.id] : 0,
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
    const playerIds = room.players.map((player) => player.id);

    if (!Array.isArray(state.deciderOrder) || state.deciderOrder.length !== playerIds.length) {
        state.deciderOrder = shuffle(playerIds);
        state.deciderIndex = 0;
        return;
    }

    const missing = state.deciderOrder.some((id) => !playerIds.includes(id));
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
        text: submission.text,
    }));
}

function getNonDeciderPlayerIds(room, round) {
    return room.players.map((player) => player.id).filter((playerId) => playerId !== round.deciderId);
}

function chooseLowestScorePlayerId(room, round) {
    const eligible = getNonDeciderPlayerIds(room, round);
    if (eligible.length === 0) {
        return null;
    }

    let lowest = Number.POSITIVE_INFINITY;
    eligible.forEach((playerId) => {
        const score = room.bugFixer.scores[playerId] || 0;
        if (score < lowest) {
            lowest = score;
        }
    });

    const tied = eligible.filter((playerId) => (room.bugFixer.scores[playerId] || 0) === lowest);
    return randomItem(tied);
}

function replenishHandsAfterRound(room, round) {
    Object.values(round.submissions).forEach((submission) => {
        const currentHand = room.bugFixer.hands[submission.playerId] || [];
        const remaining = [...currentHand];

        submission.cards.forEach((card) => {
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
        round.deciderDeadlineAt = Date.now() + deciderSeconds * 1000;
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
                reason: timedOutWinnerId ? "decider-timeout-lowest" : "decider-timeout-none",
            });
        }, deciderSeconds * 1000);
    }

    emitBugFixerState(roomCode);
}

function finalizeBugFixerRound(roomCode, { winnerPlayerId = null, reason = "decider-picked" } = {}) {
    const room = rooms[roomCode];
    if (
        !room ||
        room.selectedGame !== "bugFixerGame" ||
        !room.bugFixer ||
        !room.bugFixer.active ||
        !room.bugFixer.currentRound
    ) {
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

    const revealedSubmissions = (round.submissionOptions || []).map((option) => ({
        playerName: getPlayerName(room, option.playerId),
        text: option.text,
    }));

    if (!winnerPlayerId) {
        state.lastResult = {
            message:
                reason === "decider-timeout-none"
                    ? `${getPlayerName(room, round.deciderId)} timed out. No point awarded this round.`
                    : "No point awarded this round.",
            revealedSubmissions,
        };
    } else if (reason === "decider-timeout-lowest") {
        state.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} timed out. Point awarded to lowest-score player ${getPlayerName(room, winnerPlayerId)}.`,
            revealedSubmissions,
        };
    } else {
        state.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} picked ${getPlayerName(room, winnerPlayerId)}.`,
            revealedSubmissions,
        };
    }

    if (winnerPlayerId && state.scores[winnerPlayerId] >= state.pointsToWin) {
        state.active = false;
        state.currentRound = null;
        state.lastResult = {
            message: `${getPlayerName(room, winnerPlayerId)} wins Bug Fixer (${state.scores[winnerPlayerId]} points)!`,
            revealedSubmissions,
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
    nonDeciderIds.forEach((playerId) => {
        if (round.submissions[playerId]) {
            return;
        }

        const hand = room.bugFixer.hands[playerId] || [];
        const pickedCards = pickRandomCardsFromHand(hand, round.responsesRequired);
        round.submissions[playerId] = {
            playerId,
            cards: pickedCards,
            text: pickedCards.join(" | "),
        };
    });

    enterJudgingPhase(roomCode);
}

function buildBugFixerPayloadForPlayer(room, playerId) {
    const state = room.bugFixer;
    const canStart =
        room.selectedGame === "bugFixerGame" && room.host === playerId && room.players.length >= BUG_FIXER_MIN_PLAYERS;

    if (!state || !state.active || !state.currentRound) {
        return {
            active: false,
            canStart,
            message:
                room.players.length < BUG_FIXER_MIN_PLAYERS
                    ? `Need at least ${BUG_FIXER_MIN_PLAYERS} players to start Bug Fixer.`
                    : "Bug Fixer is ready.",
            pointsToWin: state && state.pointsToWin ? state.pointsToWin : null,
            timerSettings: state && state.settings ? state.settings : null,
            scores: buildBugFixerScores(room, state || { scores: {} }),
            lastResult: state ? state.lastResult : null,
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
        message = isDecider ? "Choose a winner." : "Decider is choosing a winner.";
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
        yourHand: isDecider ? [] : state.hands[playerId] || [],
        yourSubmitted: Boolean(round.submissions[playerId]),
        submissionsNeeded,
        submittedCount,
        submissionOptions:
            isDecider && (round.phase === "judging" || round.phase === "confirming")
                ? round.submissionOptions.map((option) => ({
                      submissionId: option.submissionId,
                      text: option.text,
                  }))
                : [],
        submissionDeadlineTs: round.submissionDeadlineAt || null,
        deciderDeadlineTs: round.deciderDeadlineAt || null,
        finalizeDeadlineTs: round.finalizeDeadlineAt || null,
        pendingWinnerSubmissionId: isDecider ? round.pendingWinnerSubmissionId || null : null,
        serverNowTs: Date.now(),
        scores: buildBugFixerScores(room, state),
        lastResult: state.lastResult,
    };
}

function emitBugFixerState(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "bugFixerGame") {
        return;
    }

    room.players.forEach((player) => {
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
        finalizeDeadlineAt: null,
    };

    const submitSeconds = sanitizeNonNegativeInt(state.settings && state.settings.submissionSeconds, 0);
    if (submitSeconds > 0) {
        state.currentRound.submissionDeadlineAt = Date.now() + submitSeconds * 1000;
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
    const solutionCount = bugFixerData.solutions.filter((entry) => entry.response).length;
    if (promptCount === 0 || solutionCount < BUG_FIXER_HAND_SIZE) {
        return "Bug Fixer data is incomplete. Check prompt and solution card JSON files.";
    }

    const targetPoints = Number(payload && payload.pointsToWin);
    if (!Number.isInteger(targetPoints) || targetPoints < 1) {
        return "Points to win must be a whole number of at least 1.";
    }

    const submissionSeconds = sanitizeNonNegativeInt(payload && payload.submissionSeconds, 0);
    const deciderSeconds = sanitizeNonNegativeInt(payload && payload.deciderSeconds, 0);
    const timeoutAction = payload && payload.deciderTimeoutAction === "lowest-score" ? "lowest-score" : "no-point";

    const scores = {};
    const hands = {};
    room.players.forEach((player) => {
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
            deciderTimeoutAction: timeoutAction,
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
            finalizeTimeout: null,
        },
    };

    startNextBugFixerRound(roomCode);
    return null;
}

function getProphuntTeamName(teamId) {
    return teamId === "A" ? "Team A" : "Team B";
}

function getPlayerTeam(state, playerId) {
    if (!state || !state.teams) {
        return null;
    }
    if (state.teams.A.includes(playerId)) {
        return "A";
    }
    if (state.teams.B.includes(playerId)) {
        return "B";
    }
    return null;
}

function createProphuntBaseLines(complexity) {
    const key = ["easy", "medium", "hard"].includes(complexity) ? complexity : "easy";
    const snippet = randomItem(PROPHUNT_SNIPPETS[key]) || PROPHUNT_SNIPPETS.easy[0];
    return snippet.map((text, index) => ({ ref: `B:${index + 1}`, text }));
}

function buildProphuntComposedLines(room, state) {
    const byRef = {};
    Object.entries(state.hiderAssignments || {}).forEach(([playerId, assignment]) => {
        if (!assignment) {
            return;
        }
        byRef[assignment.lineRef] = {
            ...assignment,
            playerId
        };
    });

    const baseLines = (state.baseLines || []).map(base => {
        const override = byRef[base.ref];
        return {
            ref: base.ref,
            text: override ? override.text : base.text,
            ownerPlayerId: override ? override.playerId : null,
            isNew: false
        };
    });

    const newLines = Object.entries(byRef)
        .filter(([, assignment]) => assignment.isNew)
        .sort((a, b) => getPlayerName(room, a[1].playerId).localeCompare(getPlayerName(room, b[1].playerId)))
        .map(([, assignment]) => ({
            ref: assignment.lineRef,
            text: assignment.text,
            ownerPlayerId: assignment.playerId,
            isNew: true
        }));

    return [...baseLines, ...newLines];
}

function buildProphuntLineOptions(room, state, playerId) {
    const current = state.hiderAssignments[playerId];
    const currentRef = current ? current.lineRef : null;
    const options = [];

    (state.baseLines || []).forEach((line, index) => {
        const takenByOther = Object.entries(state.hiderAssignments || {}).some(([otherPlayerId, assignment]) => {
            return otherPlayerId !== playerId && assignment && assignment.lineRef === line.ref;
        });
        if (!takenByOther || currentRef === line.ref) {
            options.push({
                ref: line.ref,
                label: `Line ${index + 1}`
            });
        }
    });

    options.push({ ref: "NEW_LINE", label: "Create new line" });
    return options;
}

function emitProphuntState(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "programmerProphunt") {
        return;
    }

    room.players.forEach(player => {
        io.to(player.id).emit("prophunt-state", buildProphuntPayloadForPlayer(room, player.id));
    });
}

function buildProphuntPayloadForPlayer(room, playerId) {
    const state = room.prophunt;
    const canStart = room.selectedGame === "programmerProphunt"
        && room.host === playerId
        && room.players.length >= PROPHUNT_MIN_PLAYERS
        && room.players.length % 2 === 0;

    if (!state || !state.active) {
        return {
            active: false,
            canStart,
            message: room.players.length < PROPHUNT_MIN_PLAYERS
                ? `Need at least ${PROPHUNT_MIN_PLAYERS} players to start Programmer Prophunt.`
                : room.players.length % 2 !== 0
                    ? "Programmer Prophunt needs an even number of players."
                    : "Programmer Prophunt is ready.",
            teamA: [],
            teamB: [],
            scores: state && state.scores ? state.scores : { A: 0, B: 0 },
            lastResultMessage: state && state.lastResultMessage ? state.lastResultMessage : ""
        };
    }

    const playerTeam = getPlayerTeam(state, playerId);
    const role = state.phase === "hiding"
        ? (playerTeam === state.hidingTeam ? "hider" : "finder")
        : state.phase === "finding"
            ? (playerTeam === state.finderTeam ? "finder" : "hider")
            : "observer";

    const composedLines = buildProphuntComposedLines(room, state);
    const shouldShowCode = state.phase !== "hiding" || role === "hider";
    const visibleLines = shouldShowCode
        ? composedLines.map((line, index) => ({ number: index + 1, ref: line.ref, text: line.text }))
        : [];

    const finderLineOptions = state.phase === "finding" && role === "finder"
        ? composedLines.map((line, index) => ({ ref: line.ref, label: `Line ${index + 1}` }))
        : [];

    const yourAssignment = state.hiderAssignments[playerId] || null;
    const yourDraftLine = yourAssignment ? yourAssignment.text : "";
    const message = state.message || "";

    return {
        active: true,
        canStart,
        message,
        phase: state.phase,
        roundNumber: state.roundNumber,
        totalRounds: state.totalRounds,
        role,
        hidingTeamName: getProphuntTeamName(state.hidingTeam),
        finderTeamName: getProphuntTeamName(state.finderTeam),
        teamA: state.teams.A.map(id => getPlayerName(room, id)),
        teamB: state.teams.B.map(id => getPlayerName(room, id)),
        visibleLines,
        editableLineOptions: state.phase === "hiding" && role === "hider"
            ? buildProphuntLineOptions(room, state, playerId)
            : [],
        finderLineOptions,
        yourDraftLine,
        scores: state.scores,
        lastResultMessage: state.lastResultMessage || "",
        deadlineTs: state.deadlineTs || null,
        serverNowTs: Date.now()
    };
}

function startProphuntHidingPhase(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.selectedGame !== "programmerProphunt" || !room.prophunt || !room.prophunt.active) {
        return;
    }

    const state = room.prophunt;
    clearProphuntTimers(state);

    state.phase = "hiding";
    state.message = `Round ${state.roundNumber}: ${getProphuntTeamName(state.hidingTeam)} is hiding.`;
    state.baseLines = createProphuntBaseLines(state.settings.complexity);
    state.hiderAssignments = {};
    state.finderGuesses = {};
    state.deadlineTs = Date.now() + (state.settings.roundSeconds * 1000);

    state.timerHandles.phaseTimeout = setTimeout(() => {
        finishProphuntHidingPhase(roomCode, true);
    }, state.settings.roundSeconds * 1000);

    emitProphuntState(roomCode);
}

function finishProphuntHidingPhase(roomCode, fromTimeout = false) {
    const room = rooms[roomCode];
    if (!room || !room.prophunt || !room.prophunt.active || room.prophunt.phase !== "hiding") {
        return;
    }

    const state = room.prophunt;
    clearProphuntTimers(state);

    const hiders = state.teams[state.hidingTeam];
    let penalties = 0;
    hiders.forEach(playerId => {
        const assignment = state.hiderAssignments[playerId];
        if (!assignment || !assignment.confirmed) {
            penalties += 1;
            delete state.hiderAssignments[playerId];
        }
    });

    if (fromTimeout && penalties > 0) {
        state.scores[state.hidingTeam] -= penalties;
    }

    state.phase = "finding";
    state.message = `${getProphuntTeamName(state.finderTeam)} is finding suspicious lines.`;
    state.deadlineTs = Date.now() + (state.settings.roundSeconds * 1000);

    state.timerHandles.phaseTimeout = setTimeout(() => {
        finalizeProphuntRound(roomCode, true);
    }, state.settings.roundSeconds * 1000);

    emitProphuntState(roomCode);
}

function finalizeProphuntRound(roomCode, fromTimeout = false) {
    const room = rooms[roomCode];
    if (!room || !room.prophunt || !room.prophunt.active || room.prophunt.phase !== "finding") {
        return;
    }

    const state = room.prophunt;
    clearProphuntTimers(state);

    const finders = state.teams[state.finderTeam];
    let finderPenalty = 0;
    finders.forEach(playerId => {
        const guess = state.finderGuesses[playerId];
        if (!guess || !guess.confirmed) {
            finderPenalty += 1;
        }
    });
    if (fromTimeout && finderPenalty > 0) {
        state.scores[state.finderTeam] -= finderPenalty;
    }

    const hiderByLine = {};
    Object.entries(state.hiderAssignments || {}).forEach(([playerId, assignment]) => {
        if (assignment) {
            hiderByLine[assignment.lineRef] = playerId;
        }
    });

    let finderPoints = 0;
    const calledOutHiders = new Set();
    Object.values(state.finderGuesses || {}).forEach(guess => {
        if (!guess || !guess.confirmed) {
            return;
        }
        const calledHider = hiderByLine[guess.lineRef];
        if (calledHider) {
            finderPoints += 1;
            calledOutHiders.add(calledHider);
        }
    });

    const hiderIds = Object.keys(state.hiderAssignments || {});
    const hiddenCount = hiderIds.filter(id => !calledOutHiders.has(id)).length;

    state.scores[state.finderTeam] += finderPoints;
    state.scores[state.hidingTeam] += hiddenCount;

    state.lastResultMessage = `${getProphuntTeamName(state.finderTeam)} earned ${finderPoints} point(s); ${getProphuntTeamName(state.hidingTeam)} earned ${hiddenCount} point(s).${finderPenalty > 0 ? ` ${getProphuntTeamName(state.finderTeam)} also lost ${finderPenalty} point(s) from timeouts.` : ""}`;

    if (state.roundNumber >= state.totalRounds) {
        state.active = false;
        state.phase = "finished";
        state.message = `Programmer Prophunt finished. Team A: ${state.scores.A}, Team B: ${state.scores.B}.`;
        state.deadlineTs = null;
        emitProphuntState(roomCode);
        return;
    }

    state.roundNumber += 1;
    state.hidingTeam = state.hidingTeam === "A" ? "B" : "A";
    state.finderTeam = state.hidingTeam === "A" ? "B" : "A";
    startProphuntHidingPhase(roomCode);
}

function initializeProphunt(roomCode, payload) {
    const room = rooms[roomCode];
    if (!room) {
        return "Room not found.";
    }

    if (room.players.length < PROPHUNT_MIN_PLAYERS) {
        return `Need at least ${PROPHUNT_MIN_PLAYERS} players to start Programmer Prophunt.`;
    }
    if (room.players.length % 2 !== 0) {
        return "Programmer Prophunt requires an even number of players.";
    }

    const complexity = ["easy", "medium", "hard"].includes(payload && payload.complexity)
        ? payload.complexity
        : "easy";
    const roundSeconds = sanitizeNonNegativeInt(payload && payload.roundSeconds, 45);
    const totalRounds = sanitizeNonNegativeInt(payload && payload.rounds, 3);
    if (roundSeconds < 5) {
        return "Round timer must be at least 5 seconds.";
    }
    if (totalRounds < 1) {
        return "Rounds must be at least 1.";
    }

    if (room.prophunt) {
        clearProphuntTimers(room.prophunt);
    }

    const shuffledPlayers = shuffle(room.players.map(player => player.id));
    const half = shuffledPlayers.length / 2;

    room.prophunt = {
        active: true,
        settings: {
            complexity,
            roundSeconds
        },
        totalRounds,
        roundNumber: 1,
        teams: {
            A: shuffledPlayers.slice(0, half),
            B: shuffledPlayers.slice(half)
        },
        scores: {
            A: 0,
            B: 0
        },
        hidingTeam: "A",
        finderTeam: "B",
        phase: "hiding",
        baseLines: [],
        hiderAssignments: {},
        finderGuesses: {},
        message: "",
        lastResultMessage: "",
        deadlineTs: null,
        timerHandles: {
            phaseTimeout: null
        }
    };

    startProphuntHidingPhase(roomCode);
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
        bugFixer: null,
        prophunt: null
    };
    return roomCode;
}

function getPreferredGameModes(preferredGameModes) {
    if (!Array.isArray(preferredGameModes)) {
        return [];
    }

    const unique = [...new Set(preferredGameModes.map((entry) => String(entry || "").trim()).filter(Boolean))];
    return unique.filter((game) => validGameModeNames.has(game));
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
            if (room.selectedGame === "programmerProphunt" && room.prophunt && room.prophunt.active) {
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
        visibility: room.visibility || "private",
    });
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("host-room", (payload) => {
        const rawName = typeof payload === "object" && payload !== null ? payload.name : payload;
        const visibility =
            typeof payload === "object" && payload !== null && payload.visibility === "public" ? "public" : "private";

        const trimmedName = String(rawName || "").trim();
        if (!trimmedName) {
            socket.emit("join-error", "Name is required.");
            return;
        }

        const roomCode = createRoom({
            hostId: socket.id,
            hostName: trimmedName,
            visibility,
            selectedGame: null,
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
            availableRooms.forEach((entry) => {
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
                selectedGame,
            });
            targetRoom = rooms[targetRoomCode];
            created = true;
        }

        const duplicate = targetRoom.players.some(
            (player) => normalizeName(player.name) === normalizeName(trimmedName)
        );
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
            selectedGame: targetRoom.selectedGame,
        });

        emitRoomUpdate(targetRoomCode);
        io.to(targetRoomCode).emit("gamemode-selected", targetRoom.selectedGame);

        if (targetRoom.selectedGame === "bugFixerGame") {
            emitBugFixerState(targetRoomCode);
        } else if (targetRoom.selectedGame === "programmerProphunt") {
            emitProphuntState(targetRoomCode);
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

        const duplicate = room.players.some((player) => normalizeName(player.name) === normalizedIncomingName);
        if (duplicate) {
            socket.emit("join-error", "That name is already in this lobby. Choose a different name.");
            return;
        }

        if (room.selectedGame === "bugFixerGame" && room.bugFixer && room.bugFixer.active) {
            socket.emit("join-error", "Bug Fixer is already in progress. Please wait for the next game.");
            return;
        }
        if (room.selectedGame === "programmerProphunt" && room.prophunt && room.prophunt.active) {
            socket.emit("join-error", "Programmer Prophunt is already in progress. Please wait for the next game.");
            return;
        }

        room.players.push({ id: socket.id, name: String(name).trim() });
        socket.join(roomCode);
        socket.emit("room-joined", { roomCode, hostId: room.host });

        emitRoomUpdate(roomCode);

        if (room.selectedGame) {
            socket.emit("gamemode-selected", room.selectedGame);
            if (room.selectedGame === "bugFixerGame") {
                emitBugFixerState(roomCode);
            } else if (room.selectedGame === "programmerProphunt") {
                emitProphuntState(roomCode);
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
        if (room.bugFixer) {
            clearAllBugFixerTimers(room.bugFixer);
        }
        if (room.prophunt) {
            clearProphuntTimers(room.prophunt);
        }
        room.bugFixer = null;
        room.prophunt = null;
        io.to(roomCode).emit("gamemode-selected", gameMode);

        if (gameMode === "bugFixerGame") {
            emitBugFixerState(roomCode);
        } else if (gameMode === "programmerProphunt") {
            emitProphuntState(roomCode);
        }
    });

    socket.on("start-prophunt", payload => {
        const roomCode = payload && payload.roomCode;
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || room.selectedGame !== "programmerProphunt") {
            return;
        }

        const error = initializeProphunt(roomCode, payload || {});
        if (error) {
            socket.emit("prophunt-error", error);
        }
    });

    socket.on("prophunt-edit-line", ({ roomCode, lineRef, lineText }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "programmerProphunt" || !room.prophunt || !room.prophunt.active) {
            return;
        }

        const state = room.prophunt;
        if (state.phase !== "hiding") {
            socket.emit("prophunt-error", "You can only edit during the hiding phase.");
            return;
        }

        const team = getPlayerTeam(state, socket.id);
        if (team !== state.hidingTeam) {
            socket.emit("prophunt-error", "Only the hiding team can edit right now.");
            return;
        }

        const text = String(lineText || "");
        if (!text.trim()) {
            socket.emit("prophunt-error", "Line content cannot be empty.");
            return;
        }

        let targetRef = lineRef;
        let isNew = false;
        if (lineRef === "NEW_LINE") {
            targetRef = `N:${socket.id}`;
            isNew = true;
        } else {
            const exists = (state.baseLines || []).some(line => line.ref === lineRef);
            if (!exists) {
                socket.emit("prophunt-error", "Invalid line target.");
                return;
            }
        }

        const takenByOther = Object.entries(state.hiderAssignments || {}).some(([playerId, assignment]) => {
            return playerId !== socket.id && assignment && assignment.lineRef === targetRef;
        });
        if (takenByOther) {
            socket.emit("prophunt-error", "Another hider already controls that line.");
            return;
        }

        state.hiderAssignments[socket.id] = {
            lineRef: targetRef,
            text,
            isNew,
            confirmed: false
        };
        state.message = `${getPlayerName(room, socket.id)} updated their line.`;
        emitProphuntState(roomCode);
    });

    socket.on("prophunt-confirm-hider", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "programmerProphunt" || !room.prophunt || !room.prophunt.active) {
            return;
        }

        const state = room.prophunt;
        if (state.phase !== "hiding") {
            return;
        }
        if (getPlayerTeam(state, socket.id) !== state.hidingTeam) {
            return;
        }

        const assignment = state.hiderAssignments[socket.id];
        if (!assignment || !assignment.text.trim()) {
            socket.emit("prophunt-error", "Apply one line edit before confirming.");
            return;
        }

        assignment.confirmed = true;
        const allConfirmed = state.teams[state.hidingTeam].every(playerId => {
            const entry = state.hiderAssignments[playerId];
            return entry && entry.confirmed;
        });

        if (allConfirmed) {
            finishProphuntHidingPhase(roomCode, false);
            return;
        }

        emitProphuntState(roomCode);
    });

    socket.on("prophunt-confirm-finder", ({ roomCode, lineRef }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "programmerProphunt" || !room.prophunt || !room.prophunt.active) {
            return;
        }

        const state = room.prophunt;
        if (state.phase !== "finding") {
            return;
        }
        if (getPlayerTeam(state, socket.id) !== state.finderTeam) {
            return;
        }

        if (state.finderGuesses[socket.id] && state.finderGuesses[socket.id].confirmed) {
            socket.emit("prophunt-error", "You already confirmed your guess for this round.");
            return;
        }

        const composed = buildProphuntComposedLines(room, state);
        const exists = composed.some(line => line.ref === lineRef);
        if (!exists) {
            socket.emit("prophunt-error", "Choose a valid suspicious line.");
            return;
        }

        const takenByOtherFinder = Object.entries(state.finderGuesses).some(([playerId, guess]) => {
            return playerId !== socket.id && guess && guess.confirmed && guess.lineRef === lineRef;
        });
        if (takenByOtherFinder) {
            socket.emit("prophunt-error", "Another finder already selected that line.");
            return;
        }

        state.finderGuesses[socket.id] = {
            lineRef,
            confirmed: true
        };

        const allConfirmed = state.teams[state.finderTeam].every(playerId => {
            const guess = state.finderGuesses[playerId];
            return guess && guess.confirmed;
        });

        if (allConfirmed) {
            finalizeProphuntRound(roomCode, false);
            return;
        }

        emitProphuntState(roomCode);
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

        const valid = chosenCards.every((card) => hand.includes(card));
        if (!valid) {
            socket.emit("bugfixer-error", "Submission contains cards not in your hand.");
            return;
        }

        round.submissions[socket.id] = {
            playerId: socket.id,
            cards: chosenCards,
            text: chosenCards.join(" | "),
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

        const picked = round.submissionOptions.find((option) => option.submissionId === submissionId);
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
                reason: "decider-picked",
            });
        }, BUG_FIXER_FINALIZE_DELAY_MS);

        room.bugFixer.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} selected a winner. Finalizing in 10 seconds (selection can still be changed).`,
            revealedSubmissions: [],
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
        if (room.prophunt) {
            clearProphuntTimers(room.prophunt);
        }
        room.selectedGame = null;
        room.bugFixer = null;
        room.prophunt = null;

        io.to(roomCode).emit("game-terminated", {
            gameMode: terminatedGame,
            byHost: getPlayerName(room, socket.id),
        });
    });

    socket.on("start-game", ({ roomCode, gameMode, numRounds, timeLimit, complexity, numPrompts }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id) {
            socket.emit("error", "Not authorized to start game");
            return;
        }

        if (room.players.length < 2) {
            socket.emit("error", "Need at least 2 players to start");
            return;
        }

        // Create game instance
        if (gameMode === "LogicCAH") {
            room.game = new LogicCAH(room.players, numRounds, timeLimit, numPrompts);
        } else if (gameMode === "ProgrammerProphunt") {
            room.game = new ProgrammerProphunt(room.players, numRounds, timeLimit, complexity);
        } else {
            socket.emit("error", "Invalid game mode");
            return;
        }

        room.gameMode = gameMode;
        room.gameState = "PLAYING";

        io.to(roomCode).emit("game-started", {
            gameMode,
            gameState: room.gameState,
            status: room.game.getGameStatus(),
        });
    });

    socket.on("submit-answers", ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        if (!room || !room.game || room.gameMode !== "LogicCAH") return;

        try {
            const result = room.game.submitAnswers(socket.id, answers);

            io.to(roomCode).emit("answers-submitted", {
                success: true,
                allSubmitted: result.allSubmitted,
                playerId: socket.id,
            });

            if (result.allSubmitted) {
                io.to(roomCode).emit("show-answers", {
                    answers: room.game.getAnonymousAnswers(),
                    deciderName: room.game.getCurrentDecider().name,
                });
            }
        } catch (e) {
            socket.emit("error", e.message);
        }
    });

    socket.on("decider-select", ({ roomCode, selectedPlayerId }) => {
        const room = rooms[roomCode];
        if (!room || !room.game || room.gameMode !== "LogicCAH") return;

        try {
            const result = room.game.deciderSelectsAnswers(selectedPlayerId);

            const revealed = room.game.revealSelectedPlayer();
            io.to(roomCode).emit("selected-player-revealed", {
                selectedPlayerName: revealed.selectedPlayerName,
                points: revealed.points,
            });

            // Auto-complete round after 3 seconds
            setTimeout(() => {
                if (room.game.isGameOver()) {
                    const finalScores = room.game.getFinalScores();
                    io.to(roomCode).emit("game-over", { finalScores });
                    room.gameState = "LOBBY";
                } else {
                    room.game.completeRound();
                    io.to(roomCode).emit("round-completed", {
                        status: room.game.getGameStatus(),
                    });
                }
            }, 3000);
        } catch (e) {
            socket.emit("error", e.message);
        }
    });

    socket.on("submit-hider-line", ({ roomCode, codeLine }) => {
        const room = rooms[roomCode];
        if (!room || !room.game || room.gameMode !== "ProgrammerProphunt") return;

        try {
            const result = room.game.submitHiderLine(socket.id, codeLine);

            io.to(roomCode).emit("hider-line-submitted", {
                success: true,
                allSubmitted: result.allSubmitted,
                playerId: socket.id,
            });

            if (result.allSubmitted) {
                io.to(roomCode).emit("show-code-and-finders", {
                    codeBlock: room.game.getCodeBlock(),
                    finderNames: room.game.getFindingTeam().map((p) => p.name),
                });
            }
        } catch (e) {
            socket.emit("error", e.message);
        }
    });

    socket.on("finder-select", ({ roomCode, selectedHiderId }) => {
        const room = rooms[roomCode];
        if (!room || !room.game || room.gameMode !== "ProgrammerProphunt") return;

        try {
            room.game.finderSelectsHider(socket.id, selectedHiderId);

            io.to(roomCode).emit("finder-selection-made", {
                success: true,
                allSubmitted: room.game.allFindersSubmitted(),
                playerId: socket.id,
            });

            if (room.game.allFindersSubmitted()) {
                const results = room.game.getRoundResults();
                const hiderNames = room.game.getHidingTeam().map((h) => ({ id: h.id, name: h.name }));

                io.to(roomCode).emit("round-results", {
                    findersScore: results.findersScore,
                    hidersScore: results.hidersScore,
                    correctlyIdentified: results.correctlyIdentified.map(
                        (id) => hiderNames.find((h) => h.id === id).name
                    ),
                    notIdentified: results.notIdentified.map((id) => hiderNames.find((h) => h.id === id).name),
                    scores: room.game.scores,
                });

                setTimeout(() => {
                    if (room.game.isGameOver()) {
                        const finalScores = room.game.getFinalScores();
                        io.to(roomCode).emit("game-over", { finalScores });
                        room.gameState = "LOBBY";
                    } else {
                        room.game.completeRound();
                        io.to(roomCode).emit("round-completed", {
                            status: room.game.getGameStatus(),
                        });
                    }
                }, 3000);
            }
        } catch (e) {
            socket.emit("error", e.message);
        }
    });

    socket.on("host-entering-gamehub", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id) return;
        socket.to(roomCode).emit("host-selecting-game");
    });

    socket.on("host-left-gamehub", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id) return;
        socket.to(roomCode).emit("host-left-gamehub");
    });

    socket.on("launch-redirect-game", ({ roomCode, url }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id) return;
        const allowed = ["/codeTyper/", "/flexboxSpider/"];
        if (!allowed.includes(url)) return;
        socket.to(roomCode).emit("redirect-to-game", { url });
    });

    socket.on("start-codetyper-multiplayer", (payload) => {
        const roomCode = payload && payload.roomCode;
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || room.selectedGame !== "codeTyperMultiplayer") {
            return;
        }

        io.to(roomCode).emit("launch-codetyper", { roomCode });
    });

    socket.on("codetyper-rejoin-room", ({ roomCode, name }) => {
        const room = rooms[roomCode];
        if (!room) return;
        socket.join(roomCode);
        if (!room.codeTyperMultiplayer) {
            room.codeTyperMultiplayer = { players: {} };
        }
        room.codeTyperMultiplayer.players[socket.id] = { name, isFinished: false, progress: 0, wpm: 0 };
    });

    socket.on("codetyper-progress", ({ roomCode, progress, wpm }) => {
        const room = rooms[roomCode];
        if (!room || !room.codeTyperMultiplayer || !room.codeTyperMultiplayer.players[socket.id]) {
            return;
        }
        room.codeTyperMultiplayer.players[socket.id].progress = progress;
        room.codeTyperMultiplayer.players[socket.id].wpm = wpm;
        io.to(roomCode).emit("codetyper-progress-update", room.codeTyperMultiplayer.players);
    });

    socket.on("codetyper-finished", ({ roomCode, time }) => {
        const room = rooms[roomCode];
        if (!room || !room.codeTyperMultiplayer || !room.codeTyperMultiplayer.players[socket.id]) {
            return;
        }
        room.codeTyperMultiplayer.players[socket.id].isFinished = true;
        room.codeTyperMultiplayer.players[socket.id].time = time;
        io.to(roomCode).emit("codetyper-progress-update", room.codeTyperMultiplayer.players);
    });

    socket.on("codetyper-sync-snippet", ({ roomCode, snippet }) => {
        const room = rooms[roomCode];
        if (!room) return;
        io.to(roomCode).emit("codetyper-set-snippet", snippet);
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            const room = rooms[code];

            if (room.codeTyperMultiplayer && room.codeTyperMultiplayer.players[socket.id]) {
                delete room.codeTyperMultiplayer.players[socket.id];
                io.to(code).emit("codetyper-progress-update", room.codeTyperMultiplayer.players);
            }

            const index = room.players.findIndex((p) => p.id === socket.id);

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
                                roundNumber: 0,
                            };
                            room.bugFixer.active = false;
                            room.bugFixer.currentRound = null;
                            room.bugFixer.lastResult = {
                                message: `Need at least ${BUG_FIXER_MIN_PLAYERS} players to continue.`,
                            };
                            emitBugFixerState(code);
                        } else if (room.bugFixer && room.bugFixer.active) {
                            startNextBugFixerRound(code);
                        } else {
                            emitBugFixerState(code);
                        }
                    } else if (room.selectedGame === "programmerProphunt") {
                        if (room.prophunt) {
                            clearProphuntTimers(room.prophunt);
                        }

                        if (room.players.length < PROPHUNT_MIN_PLAYERS || room.players.length % 2 !== 0) {
                            room.prophunt = room.prophunt || {
                                scores: { A: 0, B: 0 },
                                timerHandles: { phaseTimeout: null }
                            };
                            room.prophunt.active = false;
                            room.prophunt.message = `Need at least ${PROPHUNT_MIN_PLAYERS} players and an even player count to continue.`;
                            room.prophunt.lastResultMessage = room.prophunt.message;
                            emitProphuntState(code);
                        } else if (room.prophunt && room.prophunt.active) {
                            room.prophunt.teams = {
                                A: room.prophunt.teams.A.filter(id => room.players.some(player => player.id === id)),
                                B: room.prophunt.teams.B.filter(id => room.players.some(player => player.id === id))
                            };
                            emitProphuntState(code);
                        } else {
                            emitProphuntState(code);
                        }
                    }

                    emitRoomUpdate(code);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Localhost: http://localhost:${PORT}`);
    console.log(`Accessible from local network: http://<your-ip>:${PORT}`);
});
