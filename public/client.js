const socket = io();

// ============================================
// LOBBY STATE
// ============================================
let playerName = "";
let currentRoomCode = "";
let isHost = false;
let currentLobbyVisibility = "private";
let gamemodes = [];
let lastPlayerCount = 0;
let selectedGameMode = "";
let bugFixerState = null;
let bugFixerSelectedCards = [];

fetch("/gamemodes.json")
    .then((response) => response.json())
    .then((data) => {
        gamemodes = Array.isArray(data) ? data : [];
        updateGamemodeOptions(lastPlayerCount);
    })
    .catch(() => {
        gamemodes = [];
    });

// ============================================
// NAME ENTRY & MENU
// ============================================

function submitName() {
    const name = document.getElementById("nameInput").value.trim();
    if (!/^[A-Za-z0-9 ]{1,}$/.test(name)) {
        alert("Name must be 1+ characters (letters, numbers, spaces)");
        return;
    }
    playerName = name;
    document.getElementById("nameEntry").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}

function hostPrivateLobby() {
    socket.emit("host-room", { name: playerName, visibility: "private" });
}

function joinRandomLobby() {
    showRandomJoin();
}

function showRandomJoin() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("randomJoinSection").classList.remove("hidden");
    renderRandomGameChecklist();
}

function renderRandomGameChecklist() {
    const checklist = document.getElementById("randomGameChecklist");
    checklist.innerHTML = "";

    if (!Array.isArray(gamemodes) || gamemodes.length === 0) {
        checklist.innerText = "No games are available for random matchmaking.";
        return;
    }

    gamemodes.forEach((mode) => {
        const row = document.createElement("div");
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.name = "randomGameMode";
        checkbox.value = mode.name;

        label.appendChild(checkbox);
        label.append(` ${mode.displayName || mode.name} - ${mode.description}`);
        row.appendChild(label);
        checklist.appendChild(row);
    });
}

function submitRandomJoinPreferences() {
    const selected = Array.from(document.querySelectorAll("input[name='randomGameMode']:checked"))
        .map((entry) => entry.value)
        .filter(Boolean);

    if (selected.length === 0) {
        alert("Select at least one game for random matchmaking.");
        return;
    }

    currentRoomCode = "";
    isHost = false;
    currentLobbyVisibility = "public";
    socket.emit("join-random-room", {
        name: playerName,
        preferredGameModes: selected,
    });
}

function showJoin() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("randomJoinSection").classList.add("hidden");
    document.getElementById("joinSection").classList.remove("hidden");
}

function joinLobby() {
    const code = document.getElementById("joinCode").value.trim().toUpperCase();
    if (code.length !== 6) {
        alert("Room code must be 6 characters");
        return;
    }
    socket.emit("join-room", { roomCode: code, name: playerName });
}

function back() {
    location.reload();
}

function backToMenu() {
    document.getElementById("randomJoinSection").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}

// ============================================
// SOCKET EVENTS — LOBBY
// ============================================

socket.on("room-created", (payload) => {
    const roomCode = typeof payload === "string" ? payload : payload.roomCode;
    const visibility = payload && typeof payload === "object" ? payload.visibility : "private";

    currentRoomCode = roomCode || "";
    currentLobbyVisibility = visibility || "private";
    isHost = payload && typeof payload === "object" ? Boolean(payload.isHost) : true;

    document.getElementById("roomKey").innerText = roomCode || "-";
    document.getElementById("lobbyTypeLabel").innerText = visibility === "public" ? "Public" : "Private";
    document.getElementById("hostSection").classList.remove("hidden");
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("randomJoinSection").classList.add("hidden");

    if (payload && payload.selectedGame) {
        selectedGameMode = payload.selectedGame;
    }
});

socket.on("room-joined", ({ roomCode: code, hostId }) => {
    currentRoomCode = code;
    isHost = false;
    // hostSection becomes visible when update-players fires
});

socket.on("join-error", (msg) => {
    alert("Error: " + msg);
    document.getElementById("joinCode").value = "";
});

socket.on("update-players", (payload) => {
    const players = Array.isArray(payload) ? payload : payload.players;
    const hostId = Array.isArray(payload) ? null : payload.hostId;
    const visibility = Array.isArray(payload) ? "private" : payload.visibility || "private";

    if (hostId) isHost = socket.id === hostId;
    lastPlayerCount = players.length;
    currentLobbyVisibility = visibility;

    // Show lobby for all players (host and joined)
    document.getElementById("hostSection").classList.remove("hidden");
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("randomJoinSection").classList.add("hidden");

    // Update player table
    const table = document.getElementById("playerTable");
    table.innerHTML = "<tr><th>Name</th></tr>";
    players.forEach((p) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p.name}${p.id === hostId ? " (Host)" : ""}</td>`;
        table.appendChild(row);
    });

    // Also update waiting player table if visible
    const waitingTable = document.getElementById("waitingPlayerTable");
    if (waitingTable) {
        waitingTable.innerHTML = "<tr><th>Name</th></tr>";
        players.forEach((p) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${p.name}${p.id === hostId ? " (Host)" : ""}</td>`;
            waitingTable.appendChild(row);
        });
    }

    // Show room code only to host
    document.getElementById("roomCodeArea").classList.toggle("hidden", !isHost);
    document.getElementById("lobbySectionTitle").innerText = isHost ? "Hosting Lobby" : "Waiting for Host";
    document.getElementById("lobbyTypeLabel").innerText = visibility === "public" ? "Public" : "Private";

    // Show "Select a Game" button for host with 2–8 players in a private lobby
    const canStart = isHost && players.length >= 2 && players.length <= 8 && visibility !== "public";
    document.getElementById("selectGameButton").classList.toggle("hidden", !canStart);

    // Status message
    const statusMsg = document.getElementById("lobbyStatusMsg");
    if (!isHost) {
        statusMsg.innerText = `${players.length} player${players.length !== 1 ? "s" : ""} in lobby. Waiting for host to start...`;
        statusMsg.classList.remove("hidden");
    } else {
        const needed = Math.max(0, 2 - players.length);
        if (needed > 0) {
            statusMsg.innerText = `Need ${needed} more player${needed !== 1 ? "s" : ""} to start.`;
            statusMsg.classList.remove("hidden");
        } else {
            statusMsg.classList.add("hidden");
        }
    }

    updateGamemodeOptions(players.length);
    renderBugFixerControls();
    renderTerminationControls();
});

// ============================================
// GAME HUB — HOST SELECTS A GAME
// ============================================

function showGameSelect() {
    document.getElementById("hostSection").classList.add("hidden");
    document.getElementById("gameHub").classList.remove("hidden");
    document.getElementById("gameHubPlayerCount").innerText =
        `${lastPlayerCount} player${lastPlayerCount !== 1 ? "s" : ""} in lobby`;
    renderGameModeCards();
    socket.emit("host-entering-gamehub", { roomCode: currentRoomCode });
}

function renderGameModeCards() {
    const container = document.getElementById("gameModeCards");
    container.innerHTML = "";
    selectedGameMode = "";
    document.getElementById("gameHubStartBtn").classList.add("hidden");
    document.getElementById("gameHubSettings").classList.add("hidden");

    gamemodes.forEach((mode) => {
        const card = document.createElement("div");
        card.className = "game-card";
        const meets = lastPlayerCount >= mode.minPlayers;
        if (!meets) card.classList.add("unavailable");
        card.innerHTML = `
            <div class="game-icon">${mode.icon || "🎮"}</div>
            <div class="game-name">${mode.displayName || mode.name}</div>
            <div class="game-desc">${mode.description}</div>
            <div class="game-min">Min: ${mode.minPlayers} player${mode.minPlayers !== 1 ? "s" : ""}</div>`;
        if (meets) card.onclick = () => selectGameMode(mode);
        container.appendChild(card);
    });
}

function selectGameMode(mode) {
    document.querySelectorAll(".game-card").forEach((c) => c.classList.remove("selected"));
    const idx = gamemodes.indexOf(mode);
    const cards = document.querySelectorAll(".game-card");
    if (cards[idx]) cards[idx].classList.add("selected");

    selectedGameMode = mode.name;
    renderGameHubSettings(mode);
    document.getElementById("gameHubStartBtn").classList.remove("hidden");
    socket.emit("select-gamemode", { roomCode: currentRoomCode, gameMode: mode.name });
}

function renderGameHubSettings(mode) {
    const area = document.getElementById("gameHubSettings");
    area.classList.remove("hidden");

    if (mode.launchType === "redirect") {
        area.innerHTML = `<p>This is a standalone game. All players will be redirected to <strong>${mode.url}</strong> when launched.</p>`;
        return;
    }

    if (mode.name === "bugFixerGame") {
        area.innerHTML = `
            <h3>Bug Fixer Settings</h3>
            <label>Points to win:</label>
            <input id="bugFixerPointsToWinInput" type="number" min="1" value="5">
            <label>Player submit timer (seconds, 0 = off):</label>
            <input id="bugFixerSubmissionSecondsInput" type="number" min="0" value="0">
            <label>Decider pick timer (seconds, 0 = off):</label>
            <input id="bugFixerDeciderSecondsInput" type="number" min="0" value="0">
            <label>If decider times out:</label>
            <select id="bugFixerDeciderTimeoutAction">
                <option value="no-point">No point awarded</option>
                <option value="lowest-score">Award point to lowest-score player</option>
            </select>`;
    } else if (mode.name === "LogicCAH") {
        area.innerHTML = `
            <h3>Logic CAH Settings</h3>
            <label>Number of Rounds:</label>
            <select id="numRounds">
                <option value="1">1 Round</option>
                <option value="2" selected>2 Rounds</option>
                <option value="3">3 Rounds</option>
                <option value="5">5 Rounds</option>
            </select>
            <label>Time Limit (seconds):</label>
            <input id="timeLimit" type="number" value="30" min="10" max="300">
            <label>Prompts per Round:</label>
            <input id="numPrompts" type="number" value="2" min="1" max="5">`;
    } else if (mode.name === "programmerProphunt") {
        area.innerHTML = `
            <h3>Programmer Prophunt Settings</h3>
            <label>Number of Rounds:</label>
            <select id="numRounds">
                <option value="1">1 Round</option>
                <option value="2" selected>2 Rounds</option>
                <option value="3">3 Rounds</option>
                <option value="5">5 Rounds</option>
            </select>
            <label>Time Limit (seconds):</label>
            <input id="timeLimit" type="number" value="30" min="10" max="300">
            <label>Code Complexity:</label>
            <select id="complexity">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
            </select>`;
    } else if (mode.name === "codeTyperMultiplayer") {
        area.innerHTML = `
            <h3>Code Typer Multiplayer Settings</h3>
            <p>Race against others to type the snippet the fastest.</p>`;
    } else {
        area.innerHTML = "";
    }
}

function launchSelectedGame() {
    const mode = gamemodes.find((m) => m.name === selectedGameMode);
    if (!mode || !currentRoomCode) return;

    if (mode.launchType === "redirect") {
        socket.emit("launch-redirect-game", { roomCode: currentRoomCode, url: mode.url });
        window.location.href = mode.url;
        return;
    }

    if (mode.name === "bugFixerGame") {
        startBugFixerGame();
    } else if (mode.name === "codeTyperMultiplayer") {
        startCodeTyperGame();
    } else {
        const numRounds = parseInt(document.getElementById("numRounds").value);
        const timeLimit = parseInt(document.getElementById("timeLimit").value);
        const config = { roomCode: currentRoomCode, gameMode: mode.name, numRounds, timeLimit };
        if (mode.name === "LogicCAH") {
            config.numPrompts = parseInt(document.getElementById("numPrompts").value);
        } else {
            config.complexity = document.getElementById("complexity").value;
        }
        socket.emit("start-game", config);
    }
}

function backToLobby() {
    document.getElementById("gameHub").classList.add("hidden");
    document.getElementById("hostSection").classList.remove("hidden");
    socket.emit("host-left-gamehub", { roomCode: currentRoomCode });
}

socket.on("host-selecting-game", () => {
    document.getElementById("hostSection").classList.add("hidden");
    document.getElementById("gameHubWaiting").classList.remove("hidden");
});

socket.on("host-left-gamehub", () => {
    document.getElementById("gameHubWaiting").classList.add("hidden");
    document.getElementById("hostSection").classList.remove("hidden");
});

socket.on("redirect-to-game", ({ url }) => {
    window.location.href = url;
});

// ============================================
// GAME MODE SELECTION (inline dropdown fallback)
// ============================================

function confirmGameSelect() {
    const gameMode = document.getElementById("gameSelect").value;
    const mode = gamemodes.find((entry) => entry.name === gameMode);

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

socket.on("gamemode-selected", (gameMode) => {
    selectedGameMode = gameMode;

    const selectedGameDisplay = document.getElementById("selectedGameDisplay");
    if (gameMode) {
        const mode = gamemodes.find((m) => m.name === gameMode);
        const displayName = mode ? mode.displayName || gameMode : gameMode;
        selectedGameDisplay.innerText = `Selected game: ${displayName}`;
        selectedGameDisplay.classList.remove("hidden");
    } else {
        selectedGameDisplay.classList.add("hidden");
    }

    // Update waiting screen message for non-host players
    if (!isHost) {
        const mode = gamemodes.find((m) => m.name === gameMode);
        const name = mode ? mode.displayName || gameMode : gameMode;
        const waitingMsg = document.getElementById("gameHubWaitingMsg");
        if (waitingMsg) {
            waitingMsg.innerText = `Host is considering: ${name}`;
        }
    }

    const bugFixerArea = document.getElementById("bugFixerArea");
    const codeTyperLobbyControls = document.getElementById("codeTyperLobbyControls");

    if (gameMode === "bugFixerGame") {
        bugFixerArea.classList.remove("hidden");
        if (codeTyperLobbyControls) codeTyperLobbyControls.classList.add("hidden");
        renderBugFixerControls();
    } else if (gameMode === "codeTyperMultiplayer") {
        bugFixerArea.classList.add("hidden");
        if (codeTyperLobbyControls) codeTyperLobbyControls.classList.remove("hidden");
        const startCodeTyperButton = document.getElementById("startCodeTyperButton");
        if (startCodeTyperButton) startCodeTyperButton.classList.toggle("hidden", !isHost);
        bugFixerState = null;
        bugFixerSelectedCards = [];
    } else {
        bugFixerArea.classList.add("hidden");
        if (codeTyperLobbyControls) codeTyperLobbyControls.classList.add("hidden");
        bugFixerState = null;
        bugFixerSelectedCards = [];
    }

    renderTerminationControls();
});

// ============================================
// BUG FIXER GAME
// ============================================

function startCodeTyperGame() {
    if (!currentRoomCode || selectedGameMode !== "codeTyperMultiplayer") {
        return;
    }

    socket.emit("start-codetyper-multiplayer", {
        roomCode: currentRoomCode,
    });

    document.getElementById("gameHub").classList.add("hidden");
    document.getElementById("hostSection").classList.remove("hidden");
}

function startBugFixerGame() {
    if (!currentRoomCode || selectedGameMode !== "bugFixerGame") {
        return;
    }

    const pointsInput = document.getElementById("bugFixerPointsToWinInput");
    const submissionSecondsInput = document.getElementById("bugFixerSubmissionSecondsInput");
    const deciderSecondsInput = document.getElementById("bugFixerDeciderSecondsInput");
    const deciderTimeoutAction = document.getElementById("bugFixerDeciderTimeoutAction");

    const pointsToWin = Number(pointsInput.value);
    const submissionSeconds = Number(submissionSecondsInput.value);
    const deciderSeconds = Number(deciderSecondsInput.value);

    if (!Number.isInteger(pointsToWin) || pointsToWin < 1) {
        alert("Points to win must be a whole number of at least 1.");
        return;
    }

    if (!Number.isInteger(submissionSeconds) || submissionSeconds < 0) {
        alert("Player submit timer must be a whole number of 0 or higher.");
        return;
    }

    if (!Number.isInteger(deciderSeconds) || deciderSeconds < 0) {
        alert("Decider timer must be a whole number of 0 or higher.");
        return;
    }

    socket.emit("start-bugfixer", {
        roomCode: currentRoomCode,
        pointsToWin,
        submissionSeconds,
        deciderSeconds,
        deciderTimeoutAction: deciderTimeoutAction.value === "lowest-score" ? "lowest-score" : "no-point",
    });

    // Close Game Hub and show lobby with bugfixer area
    document.getElementById("gameHub").classList.add("hidden");
    document.getElementById("hostSection").classList.remove("hidden");
}

function submitBugFixerCards() {
    if (!bugFixerState || !Array.isArray(bugFixerState.yourHand)) {
        return;
    }

    if (bugFixerSelectedCards.length !== bugFixerState.responsesRequired) {
        alert(`Select exactly ${bugFixerState.responsesRequired} card(s).`);
        return;
    }

    socket.emit("bugfixer-submit", {
        roomCode: currentRoomCode,
        chosenCards: [...bugFixerSelectedCards],
    });
}

function pickBugFixerWinner(submissionId) {
    socket.emit("bugfixer-pick-winner", {
        roomCode: currentRoomCode,
        submissionId,
    });
}

function terminateCurrentGame() {
    if (!currentRoomCode || !selectedGameMode || !isHost) {
        return;
    }
    socket.emit("terminate-game", { roomCode: currentRoomCode });
}

function addBugFixerCard(cardText) {
    if (!bugFixerState || !bugFixerState.active || bugFixerState.yourSubmitted) {
        return;
    }

    if (bugFixerSelectedCards.length >= bugFixerState.responsesRequired) {
        return;
    }

    if (bugFixerSelectedCards.includes(cardText)) {
        return;
    }

    bugFixerSelectedCards.push(cardText);
    renderBugFixerState(bugFixerState);
}

function removeBugFixerCard(index) {
    if (index < 0 || index >= bugFixerSelectedCards.length) {
        return;
    }
    bugFixerSelectedCards.splice(index, 1);
    renderBugFixerState(bugFixerState);
}

function renderTerminationControls() {
    const terminateButton = document.getElementById("terminateGameButton");
    const canTerminate = Boolean(isHost && currentRoomCode && selectedGameMode);
    terminateButton.classList.toggle("hidden", !canTerminate);
}

function renderBugFixerControls() {
    const startButton = document.getElementById("startBugFixerButton");
    const submitButton = document.getElementById("bugFixerSubmitButton");
    const judgeArea = document.getElementById("bugFixerJudgeArea");

    if (selectedGameMode !== "bugFixerGame") {
        startButton.classList.add("hidden");
        submitButton.classList.add("hidden");
        judgeArea.classList.add("hidden");
        renderTerminationControls();
        return;
    }

    if (!bugFixerState) {
        startButton.classList.toggle("hidden", !isHost || lastPlayerCount < 3);
        submitButton.classList.add("hidden");
        judgeArea.classList.add("hidden");
        return;
    }

    startButton.classList.toggle("hidden", !(isHost && bugFixerState.canStart));

    const showSubmit =
        bugFixerState.active &&
        !bugFixerState.isDecider &&
        bugFixerState.phase === "submitting" &&
        !bugFixerState.yourSubmitted;
    submitButton.classList.toggle("hidden", !showSubmit);

    const showJudge =
        bugFixerState.active &&
        bugFixerState.isDecider &&
        (bugFixerState.phase === "judging" || bugFixerState.phase === "confirming");
    judgeArea.classList.toggle("hidden", !showJudge);

    renderTerminationControls();
}

function renderBugFixerState(state) {
    bugFixerState = state;

    const status = document.getElementById("bugFixerStatus");
    const decider = document.getElementById("bugFixerDecider");
    const prompt = document.getElementById("bugFixerPrompt");
    const responsesRequired = document.getElementById("bugFixerResponsesRequired");
    const hand = document.getElementById("bugFixerHand");
    const selectedOrder = document.getElementById("bugFixerSelectedOrder");
    const submissions = document.getElementById("bugFixerSubmissions");
    const scoreboard = document.getElementById("bugFixerScoreboard");
    const revealList = document.getElementById("bugFixerRevealList");
    const pointsToWinInput = document.getElementById("bugFixerPointsToWinInput");
    const submissionSecondsInput = document.getElementById("bugFixerSubmissionSecondsInput");
    const deciderSecondsInput = document.getElementById("bugFixerDeciderSecondsInput");
    const deciderTimeoutAction = document.getElementById("bugFixerDeciderTimeoutAction");

    if (state.pointsToWin) {
        pointsToWinInput.value = String(state.pointsToWin);
    }

    if (state.timerSettings) {
        submissionSecondsInput.value = String(state.timerSettings.submissionSeconds || 0);
        deciderSecondsInput.value = String(state.timerSettings.deciderSeconds || 0);
        deciderTimeoutAction.value =
            state.timerSettings.deciderTimeoutAction === "lowest-score" ? "lowest-score" : "no-point";
    }

    pointsToWinInput.disabled = Boolean(state.active);
    submissionSecondsInput.disabled = Boolean(state.active);
    deciderSecondsInput.disabled = Boolean(state.active);
    deciderTimeoutAction.disabled = Boolean(state.active);

    status.innerText = state.message || "";
    if (state.lastResult && state.lastResult.message && (!state.active || state.phase === "confirming")) {
        status.innerText = state.lastResult.message;
    }

    decider.innerText = state.deciderName || "-";
    prompt.innerText = state.prompt || "-";
    responsesRequired.innerText = String(state.responsesRequired || 0);

    const currentHand = Array.isArray(state.yourHand) ? state.yourHand : [];
    bugFixerSelectedCards = bugFixerSelectedCards.filter((card) => currentHand.includes(card));

    hand.innerHTML = "";
    if (Array.isArray(state.yourHand) && state.yourHand.length > 0) {
        state.yourHand.forEach((cardText, index) => {
            const row = document.createElement("div");
            const label = document.createElement("label");
            label.append(`${index + 1}. ${cardText} `);

            const addButton = document.createElement("button");
            addButton.innerText = "Add";
            const alreadySelected = bugFixerSelectedCards.includes(cardText);
            const atLimit = bugFixerSelectedCards.length >= (state.responsesRequired || 1);
            addButton.disabled = alreadySelected || atLimit || state.yourSubmitted;
            addButton.onclick = () => addBugFixerCard(cardText);

            label.appendChild(addButton);
            row.appendChild(label);
            hand.appendChild(row);
        });
    } else if (state.active && !state.isDecider) {
        hand.innerText = state.yourSubmitted ? "Cards submitted." : "Waiting for hand.";
    }

    selectedOrder.innerHTML = "";
    if (bugFixerSelectedCards.length === 0) {
        selectedOrder.innerText = "No cards selected yet.";
    } else {
        bugFixerSelectedCards.forEach((cardText, index) => {
            const row = document.createElement("div");
            const removeButton = document.createElement("button");
            removeButton.innerText = "Remove";
            removeButton.disabled = state.yourSubmitted;
            removeButton.onclick = () => removeBugFixerCard(index);
            row.append(`${index + 1}. ${cardText} `);
            row.appendChild(removeButton);
            selectedOrder.appendChild(row);
        });
    }

    submissions.innerHTML = "";
    if (Array.isArray(state.submissionOptions) && state.submissionOptions.length > 0) {
        state.submissionOptions.forEach((entry) => {
            const row = document.createElement("div");
            const buttonLabel = state.phase === "confirming" ? "Switch to This" : "Pick";
            row.innerHTML = `<button onclick="pickBugFixerWinner(${entry.submissionId})">${buttonLabel}</button> ${entry.text}`;
            submissions.appendChild(row);
        });
    }

    scoreboard.innerHTML = "";
    if (Array.isArray(state.scores)) {
        const sorted = [...state.scores].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        sorted.forEach((entry) => {
            const item = document.createElement("li");
            item.innerText = `${entry.name}: ${entry.score}`;
            scoreboard.appendChild(item);
        });
    }

    revealList.innerHTML = "";
    if (state.lastResult && Array.isArray(state.lastResult.revealedSubmissions)) {
        state.lastResult.revealedSubmissions.forEach((entry) => {
            const item = document.createElement("li");
            item.innerText = `${entry.playerName}: ${entry.text}`;
            revealList.appendChild(item);
        });
    }

    renderBugFixerControls();
}

socket.on("bugfixer-state", (state) => {
    if (selectedGameMode === "bugFixerGame") {
        document.getElementById("bugFixerArea").classList.remove("hidden");
    }
    renderBugFixerState(state);
});

socket.on("bugfixer-error", (message) => {
    alert(message);
});

socket.on("launch-codetyper", ({ roomCode }) => {
    const iframe = document.getElementById("codeTyperIframe");
    iframe.src = `/codeTyperMultiplayer/?roomCode=${roomCode}&name=${encodeURIComponent(playerName)}&isHost=${isHost}&t=${Date.now()}`;
    document.getElementById("codeTyperArea").classList.remove("hidden");
});

socket.on("game-terminated", (payload) => {
    selectedGameMode = "";
    bugFixerState = null;
    bugFixerSelectedCards = [];

    document.getElementById("selectedGameDisplay").classList.add("hidden");
    document.getElementById("bugFixerArea").classList.add("hidden");

    document.getElementById("codeTyperArea").classList.add("hidden");
    const codeTyperLobbyControls = document.getElementById("codeTyperLobbyControls");
    if (codeTyperLobbyControls) codeTyperLobbyControls.classList.add("hidden");

    renderTerminationControls();

    if (payload && payload.gameMode) {
        alert(`${payload.gameMode} was terminated by host ${payload.byHost}.`);
    }
});

// ============================================
// GAME MODE OPTIONS (inline dropdown)
// ============================================

function updateGamemodeOptions(playerCount) {
    const select = document.getElementById("gameSelect");
    const details = document.getElementById("gameDetails");
    if (!select || !details) {
        return;
    }

    select.innerHTML = "";
    const available = gamemodes.filter((mode) => playerCount >= mode.minPlayers);

    available.forEach((mode) => {
        const option = document.createElement("option");
        option.value = mode.name;
        option.textContent = mode.displayName || mode.name;
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

document.getElementById("gameSelect").addEventListener("change", (event) => {
    const selected = gamemodes.find((mode) => mode.name === event.target.value);
    if (selected) {
        updateGamemodeDetails(selected);
    }
});

// ============================================
// ERROR HANDLING
// ============================================

socket.on("error", (msg) => {
    console.error("Socket error:", msg);
    alert("Error: " + msg);
});
