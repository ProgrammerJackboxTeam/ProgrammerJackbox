// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const LogicCAH = require("./gameModes/LogicCAH/LogicCAH.js");
const ProgrammerProphunt = require("./gameModes/programmerProphunt/ProgrammerProphunt.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { ROOMCODE: { host: socket.id, players: [], gameMode: null, game: null, gameState: "LOBBY" } }

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", socket => {
    console.log("User connected:", socket.id);

    socket.on("host-room", name => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name }]
        };

        socket.join(roomCode);
        socket.emit("room-created", roomCode);
        io.to(roomCode).emit("update-players", rooms[roomCode].players);
    });

    socket.on("join-room", ({ roomCode, name }) => {
        if (!rooms[roomCode]) {
            socket.emit("join-error", "Room does not exist");
            return;
        }

        rooms[roomCode].players.push({ id: socket.id, name });
        socket.join(roomCode);

        io.to(roomCode).emit("update-players", rooms[roomCode].players);
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
            status: room.game.getGameStatus()
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
                playerId: socket.id
            });

            if (result.allSubmitted) {
                io.to(roomCode).emit("show-answers", {
                    answers: room.game.getAnonymousAnswers(),
                    deciderName: room.game.getCurrentDecider().name
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
                points: revealed.points
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
                        status: room.game.getGameStatus()
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
                playerId: socket.id
            });

            if (result.allSubmitted) {
                io.to(roomCode).emit("show-code-and-finders", {
                    codeBlock: room.game.getCodeBlock(),
                    finderNames: room.game.getFindingTeam().map(p => p.name)
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
                playerId: socket.id
            });

            if (room.game.allFindersSubmitted()) {
                const results = room.game.getRoundResults();
                const hiderNames = room.game.getHidingTeam().map(h => ({ id: h.id, name: h.name }));
                
                io.to(roomCode).emit("round-results", {
                    findersScore: results.findersScore,
                    hidersScore: results.hidersScore,
                    correctlyIdentified: results.correctlyIdentified.map(id => 
                        hiderNames.find(h => h.id === id).name
                    ),
                    notIdentified: results.notIdentified.map(id =>
                        hiderNames.find(h => h.id === id).name
                    ),
                    scores: room.game.scores
                });

                setTimeout(() => {
                    if (room.game.isGameOver()) {
                        const finalScores = room.game.getFinalScores();
                        io.to(roomCode).emit("game-over", { finalScores });
                        room.gameState = "LOBBY";
                    } else {
                        room.game.completeRound();
                        io.to(roomCode).emit("round-completed", {
                            status: room.game.getGameStatus()
                        });
                    }
                }, 3000);
            }
        } catch (e) {
            socket.emit("error", e.message);
        }
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
                    io.to(code).emit("update-players", room.players);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
