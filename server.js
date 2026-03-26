// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/codeTyper", express.static("gameModes/codeTyper"));
app.use("/flexboxSpider", express.static("gameModes/flexboxSpider"));

const rooms = {}; // { ROOMCODE: { host: socket.id, players: [] } }

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
