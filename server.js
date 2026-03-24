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

const BUG_FIXER_MIN_PLAYERS = 4;
const BUG_FIXER_HAND_SIZE = 5;

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

const rooms = {}; // { ROOMCODE: { host, players, selectedGame, bugFixer } }

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

    if (!Array.isArray(state.usedPromptIndices)) {
        state.usedPromptIndices = [];
    }

    if (state.usedPromptIndices.length >= prompts.length) {
        state.usedPromptIndices = [];
    }

    const availableIndices = [];
    for (let i = 0; i < prompts.length; i += 1) {
        if (!state.usedPromptIndices.includes(i)) {
            availableIndices.push(i);
        }
    }

    if (availableIndices.length === 0) {
        return null;
    }

    const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    state.usedPromptIndices.push(selectedIndex);
    return prompts[selectedIndex];
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
            scores: buildBugFixerScores(room, state || { scores: {} }),
            lastResult: state ? state.lastResult : null
        };
    }

    const round = state.currentRound;
    const isDecider = round.deciderId === playerId;
    const submissionsNeeded = room.players.length - 1;
    const submittedCount = Object.keys(round.submissions).length;

    return {
        active: true,
        canStart,
        roundNumber: state.roundNumber,
        phase: round.phase,
        prompt: round.prompt,
        responsesRequired: round.responsesRequired,
        pointsToWin: state.pointsToWin,
        deciderId: round.deciderId,
        deciderName: getPlayerName(room, round.deciderId),
        isDecider,
        yourHand: isDecider ? [] : (state.hands[playerId] || []),
        yourSubmitted: Boolean(round.submissions[playerId]),
        submissionsNeeded,
        submittedCount,
        submissionOptions: isDecider && round.phase === "judging"
            ? round.submissionOptions.map(option => ({
                submissionId: option.submissionId,
                text: option.text
            }))
            : [],
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

    if (state.deciderIndex >= state.deciderOrder.length) {
        state.deciderOrder = shuffle(room.players.map(player => player.id));
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
        submissionOptions: []
    };

    emitBugFixerState(roomCode);
}

function initializeBugFixer(roomCode, pointsToWin) {
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

    const targetPoints = Number(pointsToWin);
    if (!Number.isInteger(targetPoints) || targetPoints < 1) {
        return "Points to win must be a whole number of at least 1.";
    }

    const scores = {};
    const hands = {};
    room.players.forEach(player => {
        scores[player.id] = 0;
        hands[player.id] = drawCardsForHand([], BUG_FIXER_HAND_SIZE);
    });

    room.bugFixer = {
        active: true,
        pointsToWin: targetPoints,
        scores,
        hands,
        deciderOrder: [],
        deciderIndex: 0,
        usedPromptIndices: [],
        roundNumber: 0,
        currentRound: null,
        lastResult: null
    };

    startNextBugFixerRound(roomCode);
    return null;
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function emitRoomUpdate(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        return;
    }

    io.to(roomCode).emit("update-players", {
        players: room.players,
        hostId: room.host
    });
}

io.on("connection", socket => {
    console.log("User connected:", socket.id);

    socket.on("host-room", name => {
        const trimmedName = String(name || "").trim();
        if (!trimmedName) {
            socket.emit("join-error", "Name is required.");
            return;
        }

        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name: trimmedName }],
            selectedGame: null,
            bugFixer: null
        };

        socket.join(roomCode);
        socket.emit("room-created", roomCode);
        emitRoomUpdate(roomCode);
    });

    socket.on("join-room", ({ roomCode, name }) => {
        if (!rooms[roomCode]) {
            socket.emit("join-error", "Room does not exist");
            return;
        }

        const room = rooms[roomCode];
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

        room.selectedGame = gameMode;
        room.bugFixer = null;
        io.to(roomCode).emit("gamemode-selected", gameMode);

        if (gameMode === "bugFixerGame") {
            emitBugFixerState(roomCode);
        }
    });

    socket.on("start-bugfixer", ({ roomCode, pointsToWin }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || room.selectedGame !== "bugFixerGame") {
            return;
        }

        const error = initializeBugFixer(roomCode, pointsToWin);
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
            round.phase = "judging";
            const shuffled = shuffle(Object.values(round.submissions));
            round.submissionOptions = shuffled.map((submission, index) => ({
                submissionId: index + 1,
                playerId: submission.playerId,
                text: submission.text
            }));
        }

        emitBugFixerState(roomCode);
    });

    socket.on("bugfixer-pick-winner", ({ roomCode, submissionId }) => {
        const room = rooms[roomCode];
        if (!room || room.selectedGame !== "bugFixerGame" || !room.bugFixer || !room.bugFixer.active) {
            return;
        }

        const round = room.bugFixer.currentRound;
        if (!round || round.phase !== "judging" || round.deciderId !== socket.id) {
            return;
        }

        const picked = round.submissionOptions.find(option => option.submissionId === submissionId);
        if (!picked) {
            socket.emit("bugfixer-error", "Invalid winner selection.");
            return;
        }

        if (!room.bugFixer.scores[picked.playerId]) {
            room.bugFixer.scores[picked.playerId] = 0;
        }
        room.bugFixer.scores[picked.playerId] += 1;
        room.bugFixer.lastResult = {
            message: `${getPlayerName(room, round.deciderId)} picked ${getPlayerName(room, picked.playerId)}.`,
            revealedSubmissions: round.submissionOptions.map(option => ({
                playerName: getPlayerName(room, option.playerId),
                text: option.text
            }))
        };

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

        if (room.bugFixer.scores[picked.playerId] >= room.bugFixer.pointsToWin) {
            room.bugFixer.active = false;
            room.bugFixer.currentRound = null;
            room.bugFixer.lastResult = {
                message: `${getPlayerName(room, picked.playerId)} wins Bug Fixer (${room.bugFixer.scores[picked.playerId]} points)!`,
                revealedSubmissions: round.submissionOptions.map(option => ({
                    playerName: getPlayerName(room, option.playerId),
                    text: option.text
                }))
            };
            emitBugFixerState(roomCode);
            return;
        }

        startNextBugFixerRound(roomCode);
    });

    socket.on("terminate-game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || !room.selectedGame) {
            return;
        }

        const terminatedGame = room.selectedGame;
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
