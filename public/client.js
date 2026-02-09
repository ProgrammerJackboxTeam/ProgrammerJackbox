const socket = io();

let playerName = "";

function submitName() {
    const name = document.getElementById("nameInput").value.trim();

    if (!/^[A-Za-z0-9]{1,}$/.test(name)) {
        alert("Name must be at least 1 character and contain only letters or numbers.");
        return;
    }

    playerName = name;
    document.getElementById("menu").classList.remove("hidden");
}

function hostLobby() {
    socket.emit("host-room", playerName);
}

socket.on("room-created", roomCode => {
    document.getElementById("roomKey").innerText = roomCode;
    document.getElementById("hostSection").classList.remove("hidden");
});

function showJoin() {
    document.getElementById("joinSection").classList.remove("hidden");
}

function joinLobby() {
    const roomCode = document.getElementById("joinCode").value.trim().toUpperCase();

    socket.emit("join-room", { roomCode, name: playerName });
}

socket.on("join-error", msg => {
    alert(msg);
});

socket.on("update-players", players => {
    const table = document.getElementById("playerTable");
    table.innerHTML = "<tr><th>Name</th></tr>";

    players.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p.name}</td>`;
        table.appendChild(row);
    });
});

function back() {
    location.reload();
}
