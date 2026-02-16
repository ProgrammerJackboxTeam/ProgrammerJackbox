const socket = io();

let playerName = "";
let currentRoomCode = "";
let isHost = false;
let gamemodes = [];
let lastPlayerCount = 0;

fetch("/gamemodes.json")
    .then(response => response.json())
    .then(data => {
        gamemodes = Array.isArray(data) ? data : [];
        updateGamemodeOptions(lastPlayerCount);
    })
    .catch(() => {
        gamemodes = [];
    });

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
    currentRoomCode = roomCode;
    isHost = true;
});

function showJoin() {
    document.getElementById("joinSection").classList.remove("hidden");
}

function joinLobby() {
    const roomCode = document.getElementById("joinCode").value.trim().toUpperCase();

    currentRoomCode = roomCode;
    isHost = false;
    socket.emit("join-room", { roomCode, name: playerName });
}

socket.on("join-error", msg => {
    alert(msg);
    currentRoomCode = "";
});

socket.on("update-players", payload => {
    const players = Array.isArray(payload) ? payload : payload.players;
    const hostId = Array.isArray(payload) ? null : payload.hostId;
    const table = document.getElementById("playerTable");
    table.innerHTML = "<tr><th>Name</th></tr>";

    players.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p.name}</td>`;
        table.appendChild(row);
    });

    lastPlayerCount = players.length;
    if (hostId) {
        isHost = socket.id === hostId;
    }

    updateGamemodeOptions(lastPlayerCount);

    const selectGameButton = document.getElementById("selectGameButton");
    if (isHost && players.length > 3) {
        selectGameButton.classList.remove("hidden");
    } else {
        selectGameButton.classList.add("hidden");
    }
});

socket.on("gamemode-selected", gameMode => {
    const selectedGameDisplay = document.getElementById("selectedGameDisplay");
    selectedGameDisplay.innerText = `Selected game: ${gameMode}`;
    selectedGameDisplay.classList.remove("hidden");
});

function showGameSelect() {
    document.getElementById("gameSelectArea").classList.remove("hidden");
}

function confirmGameSelect() {
    const gameMode = document.getElementById("gameSelect").value;
    const mode = gamemodes.find(entry => entry.name === gameMode);

    if (!currentRoomCode) {
        return;
    }

    if (!mode || lastPlayerCount < mode.minPlayers) {
        alert("Not enough players for that game mode.");
        return;
    }

    socket.emit("select-gamemode", { roomCode: currentRoomCode, gameMode });
    document.getElementById("gameSelectArea").classList.add("hidden");
}

function updateGamemodeOptions(playerCount) {
    const select = document.getElementById("gameSelect");
    const details = document.getElementById("gameDetails");
    if (!select || !details) {
        return;
    }

    select.innerHTML = "";
    const available = gamemodes.filter(mode => playerCount >= mode.minPlayers);

    available.forEach(mode => {
        const option = document.createElement("option");
        option.value = mode.name;
        option.textContent = mode.name;
        select.appendChild(option);
    });

    if (available.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No available modes";
        select.appendChild(option);
        select.disabled = true;
        details.innerText = "";
        return;
    }

    select.disabled = false;
    updateGamemodeDetails(available[0]);
}

function updateGamemodeDetails(mode) {
    const details = document.getElementById("gameDetails");
    details.innerText = `${mode.description} (Min players: ${mode.minPlayers})`;
}

document.getElementById("gameSelect").addEventListener("change", event => {
    const selected = gamemodes.find(mode => mode.name === event.target.value);
    if (selected) {
        updateGamemodeDetails(selected);
    }
});

function back() {
    location.reload();
}
