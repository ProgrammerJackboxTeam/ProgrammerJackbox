const socket = io();

let playerName = "";
let roomCode = "";
let isHost = false;
let currentGameMode = null;
let currentSelection = null;
let logiccahAnswers = [];

// ============================================
// LOBBY MANAGEMENT
// ============================================
let currentRoomCode = "";
let isHost = false;
let currentLobbyVisibility = "private";
let gamemodes = [];
let lastPlayerCount = 0;
let selectedGameMode = "";
let bugFixerState = null;
let bugFixerSelectedCards = [];

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

    if (!/^[A-Za-z0-9 ]{1,}$/.test(name)) {
        alert("Name must be 1+ characters (letters, numbers, spaces)");
        return;
    }

    playerName = name;
    document.getElementById("nameEntry").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
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

    gamemodes.forEach(mode => {
        const row = document.createElement("div");
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.name = "randomGameMode";
        checkbox.value = mode.name;

        label.appendChild(checkbox);
        label.append(` ${mode.name} - ${mode.description}`);
        row.appendChild(label);
        checklist.appendChild(row);
    });
}

function submitRandomJoinPreferences() {
    const selected = Array.from(document.querySelectorAll("input[name='randomGameMode']:checked"))
        .map(entry => entry.value)
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
        preferredGameModes: selected
    });
}

function showJoin() {
    document.getElementById("mainMenu").classList.add("hidden");
socket.on("room-created", payload => {
    const roomCode = typeof payload === "string" ? payload : payload.roomCode;
    const visibility = payload && typeof payload === "object" ? payload.visibility : "private";

    document.getElementById("roomKey").innerText = roomCode || "-";
    document.getElementById("lobbyTypeLabel").innerText = visibility === "public" ? "Public" : "Private";
    document.getElementById("hostSection").classList.remove("hidden");
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("randomJoinSection").classList.add("hidden");
    currentRoomCode = roomCode || "";
    currentLobbyVisibility = visibility || "private";
    isHost = payload && typeof payload === "object" ? Boolean(payload.isHost) : true;

    if (payload && payload.selectedGame) {
        selectedGameMode = payload.selectedGame;
    }
});

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
    document.getElementById("mainMenu").classList.remove("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("hostLobby").classList.add("hidden");
    document.getElementById("joinedLobby").classList.add("hidden");
    document.getElementById("logiccahGame").classList.add("hidden");
    document.getElementById("prophuntGame").classList.add("hidden");
    document.getElementById("gameSettings").classList.add("hidden");
}

// ============================================
// SOCKET EVENTS
// ============================================

socket.on("room-created", code => {
    roomCode = code;
    isHost = true;
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("roomKey").innerText = code;
    document.getElementById("hostLobby").classList.remove("hidden");
    updateSettingsVisibility();
});

socket.on("update-players", players => {
    // Update host view
    currentRoomCode = roomCode;
    isHost = false;
    currentLobbyVisibility = "private";
    socket.emit("join-room", { roomCode, name: playerName });
}

socket.on("join-error", msg => {
    alert(msg);
    currentRoomCode = "";
    currentLobbyVisibility = "private";
});

socket.on("update-players", payload => {
    const players = Array.isArray(payload) ? payload : payload.players;
    const hostId = Array.isArray(payload) ? null : payload.hostId;
    const visibility = Array.isArray(payload) ? "private" : (payload.visibility || "private");
    const table = document.getElementById("playerTable");
    table.innerHTML = "<tr><th>Name</th></tr>";
    players.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p.name}</td>`;
        table.appendChild(row);
    });

    // Update joined view
    const joinedTable = document.getElementById("joinedPlayerTable");
    joinedTable.innerHTML = "<tr><th>Name</th></tr>";
    players.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p.name}</td>`;
        joinedTable.appendChild(row);
    });

    // Enable start button if host and 2+ players
    if (isHost && players.length >= 2) {
        document.getElementById("startGameBtn").disabled = false;
        document.getElementById("startGameBtn").innerText = `Start Game (${players.length} players)`;
    }
});

socket.on("join-error", msg => {
    alert("Error: " + msg);
    document.getElementById("joinCode").value = "";
});

socket.on("room-joined", (code) => {
    roomCode = code;
    isHost = false;
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("joinedLobby").classList.remove("hidden");
});

// ============================================
// GAME SETTINGS
// ============================================

function toggleSettings() {
    document.getElementById("gameSettings").classList.toggle("hidden");
}

function updateSettings() {
    updateSettingsVisibility();
}

function updateSettingsVisibility() {
    const gameMode = document.getElementById("gameModeSelect").value;
    if (gameMode === "LogicCAH") {
        document.getElementById("logiccahSettings").classList.remove("hidden");
        document.getElementById("prophuntSettings").classList.add("hidden");
    } else {
        document.getElementById("logiccahSettings").classList.add("hidden");
        document.getElementById("prophuntSettings").classList.remove("hidden");
    }
}

function startGame() {
    const gameMode = document.getElementById("gameModeSelect").value;
    const numRounds = parseInt(document.getElementById("numRounds").value);
    const timeLimit = parseInt(document.getElementById("timeLimit").value);
    
    let config = {
        roomCode,
        gameMode,
        numRounds,
        timeLimit
    };

    if (gameMode === "LogicCAH") {
        config.numPrompts = parseInt(document.getElementById("numPrompts").value);
    } else {
        config.complexity = document.getElementById("complexity").value;
    }

    socket.emit("start-game", config);
}

socket.on("game-started", ({ gameMode, status }) => {
    currentGameMode = gameMode;
    document.getElementById("hostLobby").classList.add("hidden");
    document.getElementById("joinedLobby").classList.add("hidden");
    
    if (gameMode === "LogicCAH") {
        startLogiccahGame(status);
    } else {
        startProphuntGame(status);
    }
});

// ============================================
// LOGICCAH GAME
// ============================================

function startLogiccahGame(status) {
    document.getElementById("logiccahGame").classList.remove("hidden");
    updateLogiccahStatus(status);
    
    // Check if this player is the decider
    if (status.currentDecider.name === playerName) {
        document.getElementById("waitingPhase").classList.add("hidden");
        document.getElementById("deciderPhase").classList.remove("hidden");
        document.getElementById("answerPhase").classList.add("hidden");
    } else {
        document.getElementById("answerPhase").classList.remove("hidden");
        document.getElementById("deciderPhase").classList.add("hidden");
        document.getElementById("waitingPhase").classList.add("hidden");
        showLogiccahPrompts();
    }
}

function updateLogiccahStatus(status) {
    const statusDiv = document.getElementById("gameStatus");
    statusDiv.innerHTML = `
        <strong>Round ${status.currentRound + 1}/${status.totalRounds}</strong><br>
        Decider: ${status.currentDecider.name}<br>
        <br>
        <strong>Scores:</strong><br>
        ${Object.entries(status.scores).map(([id, score]) => {
            const name = playerName; // Simplified for demo
            return `${name}: ${score}`;
        }).join('<br>')}
    `;
}

function showLogiccahPrompts() {
    // Demo prompts (in real game, these come from server)
    const prompts = [
        "What does a good programmer value most?",
        "What's the worst part of debugging?"
    ];

    const container = document.getElementById("promptsContainer");
    container.innerHTML = "";
    logiccahAnswers = [];

    prompts.forEach((prompt, idx) => {
        const div = document.createElement("div");
        div.innerHTML = `
            <div class="prompt">${idx + 1}. ${prompt}</div>
            <input type="text" class="answer-input" placeholder="Your answer" 
                onchange="logiccahAnswers[${idx}] = this.value">
        `;
        container.appendChild(div);
    });
}

function submitLogiccahAnswers() {
    if (logiccahAnswers.length < 2 || logiccahAnswers.some(a => !a || a.trim() === "")) {
        alert("Please answer all prompts");
        return;
    }

    socket.emit("submit-answers", { roomCode, answers: logiccahAnswers });
    document.getElementById("answerPhase").classList.add("hidden");
    document.getElementById("waitingPhase").classList.remove("hidden");
}

socket.on("show-answers", ({ answers, deciderName }) => {
    if (playerName !== deciderName) return;

    const container = document.getElementById("answersContainer");
    container.innerHTML = "";

    answers.forEach((ans, idx) => {
        const div = document.createElement("div");
        div.className = "answer-option";
        div.style.cursor = "pointer";
        div.innerHTML = `
            <strong>Option ${idx + 1}:</strong><br>
            ${ans.answers.join("<br>")}
        `;
        div.onclick = () => selectLogiccahAnswer(idx, div, ans.playerId);
        container.appendChild(div);
    });
});

function selectLogiccahAnswer(idx, element, playerId) {
    document.querySelectorAll("#answersContainer .answer-option").forEach(el => {
        el.classList.remove("selected");
    });
    element.classList.add("selected");
    currentSelection = playerId;
}

socket.on("selected-player-revealed", ({ selectedPlayerName, points }) => {
    document.getElementById("answersContainer").innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>${selectedPlayerName} was selected!</h3>
            <p>They now have ${points} point(s)</p>
        </div>
    `;
});

socket.on("round-completed", ({ status }) => {
    document.getElementById("deciderPhase").classList.add("hidden");
    document.getElementById("waitingPhase").classList.add("hidden");
    updateLogiccahStatus(status);
    startLogiccahGame(status);
});

socket.on("game-over", ({ finalScores }) => {
    const scoresDiv = document.getElementById("finalScores");
    scoresDiv.innerHTML = "<h3>Final Standings:</h3>";
    finalScores.forEach((score, idx) => {
        const div = document.createElement("div");
        div.className = "score-item";
        div.innerHTML = `<strong>${idx + 1}. ${score.name}</strong> <span>${score.score} points</span>`;
        scoresDiv.appendChild(div);
    });

    document.getElementById("answerPhase").classList.add("hidden");
    document.getElementById("deciderPhase").classList.add("hidden");
    document.getElementById("waitingPhase").classList.add("hidden");
    document.getElementById("gameOverPhase").classList.remove("hidden");
});

// ============================================
// PROPHUNT GAME
// ============================================

function startProphuntGame(status) {
    document.getElementById("prophuntGame").classList.remove("hidden");
    updateProphuntStatus(status);

    const playerTeam = status.hidingTeam.some(p => p.name === playerName) ? "hider" : "finder";

    if (playerTeam === "hider") {
        document.getElementById("hiderPhase").classList.remove("hidden");
        document.getElementById("finderPhase").classList.add("hidden");
        document.getElementById("prophuntWaitingPhase").classList.add("hidden");
    } else {
        document.getElementById("hiderPhase").classList.add("hidden");
        document.getElementById("finderPhase").classList.add("hidden");
        document.getElementById("prophuntWaitingPhase").classList.remove("hidden");
    }
}

function updateProphuntStatus(status) {
    const statusDiv = document.getElementById("prophuntStatus");
    const hidersStr = status.hidingTeam.map(p => p.name).join(", ");
    const findersStr = status.findingTeam.map(p => p.name).join(", ");
    
    statusDiv.innerHTML = `
        <strong>Round ${status.currentRound + 1}/${status.totalRounds}</strong><br>
        Phase: ${status.currentPhase}<br>
        <br>
        <strong>Hiders:</strong> ${hidersStr}<br>
        <strong>Finders:</strong> ${findersStr}
    `;
}

function submitHiderLine() {
    const codeLine = document.getElementById("codeInput").value.trim();
    if (!codeLine) {
        alert("Please enter a line of code");
        return;
    }

    socket.emit("submit-hider-line", { roomCode, codeLine });
    document.getElementById("codeInput").value = "";
    document.getElementById("hiderPhase").classList.add("hidden");
    document.getElementById("prophuntWaitingPhase").classList.remove("hidden");
}

socket.on("show-code-and-finders", ({ codeBlock, finderNames }) => {
    // Show code to finders
    document.getElementById("codeDisplay").innerText = codeBlock;

    const container = document.getElementById("lineSelectContainer");
    container.innerHTML = "";

    // Create options for each line (simplified - just number of hiders)
    const numLines = codeBlock.split('\n').filter(l => l.trim().length > 0).length;
    for (let i = 0; i < numLines; i++) {
        const div = document.createElement("div");
        div.className = "answer-option";
        div.innerHTML = `<strong>Select this line</strong>`;
        div.onclick = () => selectLine(i, div);
        container.appendChild(div);
    }

    // Only show to finders
    if (finderNames.includes(playerName)) {
        document.getElementById("finderPhase").classList.remove("hidden");
        document.getElementById("prophuntWaitingPhase").classList.add("hidden");
    }
});

function selectLine(idx, element) {
    document.querySelectorAll("#lineSelectContainer .answer-option").forEach(el => {
        el.classList.remove("selected");
    });
    element.classList.add("selected");
    currentSelection = idx;
}

function submitFinderSelection() {
    if (currentSelection === null) {
        alert("Please select a line");
        return;
    }

    // In real game, map line number to hider ID
    socket.emit("finder-select", { roomCode, selectedHiderId: currentSelection });
    document.getElementById("finderPhase").classList.add("hidden");
    document.getElementById("prophuntWaitingPhase").classList.remove("hidden");
}

socket.on("round-results", ({ findersScore, hidersScore, correctlyIdentified, notIdentified, scores }) => {
    const resultsDiv = document.getElementById("prophuntResultsDisplay");
    resultsDiv.innerHTML = `
        <h4>Finders Score: ${findersScore}</h4>
        <h4>Hiders Score: ${hidersScore}</h4>
        <p><strong>Correctly Identified:</strong> ${correctlyIdentified.join(", ") || "None"}</p>
        <p><strong>Not Identified:</strong> ${notIdentified.join(", ") || "None"}</p>
    `;

    document.getElementById("hiderPhase").classList.add("hidden");
    document.getElementById("finderPhase").classList.add("hidden");
    document.getElementById("prophuntWaitingPhase").classList.add("hidden");
    document.getElementById("prophuntResultsPhase").classList.remove("hidden");
});

socket.on("game-over", ({ finalScores }) => {
    const scoresDiv = document.getElementById("prophuntFinalScores");
    scoresDiv.innerHTML = "<h3>Final Standings:</h3>";
    finalScores.forEach((score, idx) => {
        const div = document.createElement("div");
        div.className = "score-item";
        div.innerHTML = `<strong>${idx + 1}. ${score.name}</strong> <span>${score.score} points (${score.team})</span>`;
        scoresDiv.appendChild(div);
    });

    document.getElementById("prophuntResultsPhase").classList.add("hidden");
    document.getElementById("prophuntGameOverPhase").classList.remove("hidden");
});

socket.on("error", msg => {
    console.error("Error:", msg);
    alert("Error: " + msg);
    if (currentRoomCode) {
        document.getElementById("hostSection").classList.remove("hidden");
        document.getElementById("menu").classList.add("hidden");
        document.getElementById("joinSection").classList.add("hidden");
        document.getElementById("randomJoinSection").classList.add("hidden");
    }

    lastPlayerCount = players.length;
    currentLobbyVisibility = visibility;
    document.getElementById("lobbyTypeLabel").innerText = visibility === "public" ? "Public" : "Private";
    if (hostId) {
        isHost = socket.id === hostId;
    }

    updateGamemodeOptions(lastPlayerCount);

    const selectGameButton = document.getElementById("selectGameButton");
    if (isHost && players.length > 2 && currentLobbyVisibility !== "public") {
        selectGameButton.classList.remove("hidden");
    } else {
        selectGameButton.classList.add("hidden");
    }

    renderBugFixerControls();
});

socket.on("gamemode-selected", gameMode => {
    selectedGameMode = gameMode;
    const selectedGameDisplay = document.getElementById("selectedGameDisplay");
    if (gameMode) {
        selectedGameDisplay.innerText = `Selected game: ${gameMode}`;
        selectedGameDisplay.classList.remove("hidden");
    } else {
        selectedGameDisplay.classList.add("hidden");
    }

    const bugFixerArea = document.getElementById("bugFixerArea");
    if (gameMode === "bugFixerGame") {
        bugFixerArea.classList.remove("hidden");
        renderBugFixerControls();
    } else {
        bugFixerArea.classList.add("hidden");
        bugFixerState = null;
        bugFixerSelectedCards = [];
    }

    renderTerminationControls();
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
        deciderTimeoutAction: deciderTimeoutAction.value === "lowest-score" ? "lowest-score" : "no-point"
    });
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
        chosenCards: [...bugFixerSelectedCards]
    });
}

function pickBugFixerWinner(submissionId) {
    socket.emit("bugfixer-pick-winner", {
        roomCode: currentRoomCode,
        submissionId
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

    const showSubmit = bugFixerState.active
        && !bugFixerState.isDecider
        && bugFixerState.phase === "submitting"
        && !bugFixerState.yourSubmitted;
    submitButton.classList.toggle("hidden", !showSubmit);

    const showJudge = bugFixerState.active
        && bugFixerState.isDecider
        && (bugFixerState.phase === "judging" || bugFixerState.phase === "confirming");
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
        deciderTimeoutAction.value = state.timerSettings.deciderTimeoutAction === "lowest-score"
            ? "lowest-score"
            : "no-point";
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
    bugFixerSelectedCards = bugFixerSelectedCards.filter(card => currentHand.includes(card));

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
        state.submissionOptions.forEach(entry => {
            const row = document.createElement("div");
            const buttonLabel = state.phase === "confirming" ? "Switch to This" : "Pick";
            row.innerHTML = `<button onclick="pickBugFixerWinner(${entry.submissionId})">${buttonLabel}</button> ${entry.text}`;
            submissions.appendChild(row);
        });
    }

    scoreboard.innerHTML = "";
    if (Array.isArray(state.scores)) {
        const sorted = [...state.scores].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        sorted.forEach(entry => {
            const item = document.createElement("li");
            item.innerText = `${entry.name}: ${entry.score}`;
            scoreboard.appendChild(item);
        });
    }

    revealList.innerHTML = "";
    if (state.lastResult && Array.isArray(state.lastResult.revealedSubmissions)) {
        state.lastResult.revealedSubmissions.forEach(entry => {
            const item = document.createElement("li");
            item.innerText = `${entry.playerName}: ${entry.text}`;
            revealList.appendChild(item);
        });
    }

    renderBugFixerControls();
}

socket.on("bugfixer-state", state => {
    if (selectedGameMode === "bugFixerGame") {
        document.getElementById("bugFixerArea").classList.remove("hidden");
    }
    renderBugFixerState(state);
});

socket.on("bugfixer-error", message => {
    alert(message);
});

socket.on("game-terminated", payload => {
    selectedGameMode = "";
    bugFixerState = null;
    bugFixerSelectedCards = [];

    document.getElementById("selectedGameDisplay").classList.add("hidden");
    document.getElementById("bugFixerArea").classList.add("hidden");
    renderTerminationControls();

    if (payload && payload.gameMode) {
        alert(`${payload.gameMode} was terminated by host ${payload.byHost}.`);
    }
});

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

function backToMenu() {
    document.getElementById("randomJoinSection").classList.add("hidden");
    document.getElementById("joinSection").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}
