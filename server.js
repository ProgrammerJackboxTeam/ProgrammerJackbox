// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { ROOMCODE: { host: socket.id, players: [], selectedGame: null } }

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
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name }],
            selectedGame: null
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

        rooms[roomCode].players.push({ id: socket.id, name });
        socket.join(roomCode);

        emitRoomUpdate(roomCode);

        if (rooms[roomCode].selectedGame) {
            socket.emit("gamemode-selected", rooms[roomCode].selectedGame);
        }
    });

    socket.on("select-gamemode", ({ roomCode, gameMode }) => {
        const room = rooms[roomCode];

        if (!room || room.host !== socket.id) {
            return;
        }

        room.selectedGame = gameMode;
        io.to(roomCode).emit("gamemode-selected", gameMode);
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

                    emitRoomUpdate(code);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
