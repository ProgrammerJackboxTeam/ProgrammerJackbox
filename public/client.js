const socket = io();

let playerName = "";
let currentRoomCode = "";
let isHost = false;
let currentLobbyVisibility = "private";
let gamemodes = [];
let lastPlayerCount = 0;
let selectedGameMode = "";
let bugFixerState = null;
let bugFixerSelectedCards = [];
let prophuntState = null;

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
    const roomCode = document.getElementById("joinCode").value.trim().toUpperCase();

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
    const prophuntArea = document.getElementById("prophuntArea");
    if (gameMode === "bugFixerGame") {
        bugFixerArea.classList.remove("hidden");
        prophuntArea.classList.add("hidden");
        renderBugFixerControls();
    } else if (gameMode === "programmerProphunt") {
        bugFixerArea.classList.add("hidden");
        prophuntArea.classList.remove("hidden");
        bugFixerState = null;
        bugFixerSelectedCards = [];
        renderProphuntControls();
    } else {
        bugFixerArea.classList.add("hidden");
        prophuntArea.classList.add("hidden");
        bugFixerState = null;
        bugFixerSelectedCards = [];
        prophuntState = null;
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

function startProphuntGame() {
    if (!currentRoomCode || selectedGameMode !== "programmerProphunt") {
        return;
    }

    const complexity = document.getElementById("prophuntComplexityInput").value;
    const roundSeconds = Number(document.getElementById("prophuntRoundSecondsInput").value);
    const rounds = Number(document.getElementById("prophuntRoundsInput").value);

    if (!["easy", "medium", "hard"].includes(complexity)) {
        alert("Complexity must be easy, medium, or hard.");
        return;
    }
    if (!Number.isInteger(roundSeconds) || roundSeconds < 5) {
        alert("Round timer must be at least 5 seconds.");
        return;
    }
    if (!Number.isInteger(rounds) || rounds < 1) {
        alert("Rounds must be at least 1.");
        return;
    }

    socket.emit("start-prophunt", {
        roomCode: currentRoomCode,
        complexity,
        roundSeconds,
        rounds
    });
}

function applyProphuntEdit() {
    if (!prophuntState || !prophuntState.active) {
        return;
    }

    const lineRef = document.getElementById("prophuntLineSelect").value;
    const lineText = document.getElementById("prophuntLineTextInput").value;
    socket.emit("prophunt-edit-line", {
        roomCode: currentRoomCode,
        lineRef,
        lineText
    });
}

function confirmProphuntHiderEdit() {
    if (!prophuntState || !prophuntState.active) {
        return;
    }

    socket.emit("prophunt-confirm-hider", { roomCode: currentRoomCode });
}

function confirmProphuntFinderGuess() {
    if (!prophuntState || !prophuntState.active) {
        return;
    }

    const lineRef = document.getElementById("prophuntFinderLineSelect").value;
    socket.emit("prophunt-confirm-finder", {
        roomCode: currentRoomCode,
        lineRef
    });
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

function renderProphuntControls() {
    const startButton = document.getElementById("startProphuntButton");
    const hiderControls = document.getElementById("prophuntHiderControls");
    const finderControls = document.getElementById("prophuntFinderControls");

    if (selectedGameMode !== "programmerProphunt") {
        startButton.classList.add("hidden");
        hiderControls.classList.add("hidden");
        finderControls.classList.add("hidden");
        return;
    }

    if (!prophuntState) {
        startButton.classList.toggle("hidden", !isHost || lastPlayerCount < 4);
        hiderControls.classList.add("hidden");
        finderControls.classList.add("hidden");
        return;
    }

    startButton.classList.toggle("hidden", !(isHost && prophuntState.canStart));
    hiderControls.classList.toggle("hidden", !(prophuntState.active && prophuntState.role === "hider" && prophuntState.phase === "hiding"));
    finderControls.classList.toggle("hidden", !(prophuntState.active && prophuntState.role === "finder" && prophuntState.phase === "finding"));
}

function renderProphuntState(state) {
    prophuntState = state;

    const status = document.getElementById("prophuntStatus");
    const roundDisplay = document.getElementById("prophuntRoundDisplay");
    const phaseDisplay = document.getElementById("prophuntPhaseDisplay");
    const hidingTeamDisplay = document.getElementById("prophuntHidingTeamDisplay");
    const finderTeamDisplay = document.getElementById("prophuntFinderTeamDisplay");
    const teamAList = document.getElementById("prophuntTeamAList");
    const teamBList = document.getElementById("prophuntTeamBList");
    const codeBlock = document.getElementById("prophuntCodeBlock");
    const lineSelect = document.getElementById("prophuntLineSelect");
    const finderLineSelect = document.getElementById("prophuntFinderLineSelect");
    const lineTextInput = document.getElementById("prophuntLineTextInput");
    const scoreboard = document.getElementById("prophuntScoreboard");
    const lastResult = document.getElementById("prophuntLastResult");
    const complexityInput = document.getElementById("prophuntComplexityInput");
    const roundSecondsInput = document.getElementById("prophuntRoundSecondsInput");
    const roundsInput = document.getElementById("prophuntRoundsInput");

    status.innerText = state.message || "";
    roundDisplay.innerText = state.active ? `${state.roundNumber}/${state.totalRounds}` : "-";
    phaseDisplay.innerText = state.phase || "-";
    hidingTeamDisplay.innerText = state.hidingTeamName || "-";
    finderTeamDisplay.innerText = state.finderTeamName || "-";

    if (Array.isArray(state.teamA) && state.teamA.length > 0) {
        teamAList.innerText = state.teamA.join(", ");
    } else {
        teamAList.innerText = "-";
    }
    if (Array.isArray(state.teamB) && state.teamB.length > 0) {
        teamBList.innerText = state.teamB.join(", ");
    } else {
        teamBList.innerText = "-";
    }

    if (Array.isArray(state.visibleLines) && state.visibleLines.length > 0) {
        codeBlock.innerText = state.visibleLines.map(line => `${line.number}. ${line.text}`).join("\n");
    } else {
        codeBlock.innerText = "Code is hidden for this phase.";
    }

    complexityInput.disabled = Boolean(state.active);
    roundSecondsInput.disabled = Boolean(state.active);
    roundsInput.disabled = Boolean(state.active);

    lineSelect.innerHTML = "";
    if (Array.isArray(state.editableLineOptions)) {
        state.editableLineOptions.forEach(option => {
            const el = document.createElement("option");
            el.value = option.ref;
            el.textContent = option.label;
            lineSelect.appendChild(el);
        });
    }

    finderLineSelect.innerHTML = "";
    if (Array.isArray(state.finderLineOptions)) {
        state.finderLineOptions.forEach(option => {
            const el = document.createElement("option");
            el.value = option.ref;
            el.textContent = option.label;
            finderLineSelect.appendChild(el);
        });
    }

    lineTextInput.value = state.yourDraftLine || "";

    scoreboard.innerHTML = "";
    if (state.scores) {
        ["A", "B"].forEach(team => {
            const li = document.createElement("li");
            li.innerText = `Team ${team}: ${state.scores[team] || 0}`;
            scoreboard.appendChild(li);
        });
    }

    lastResult.innerText = state.lastResultMessage || "-";
    renderProphuntControls();
}

socket.on("prophunt-state", state => {
    if (selectedGameMode === "programmerProphunt") {
        document.getElementById("prophuntArea").classList.remove("hidden");
    }
    renderProphuntState(state);
});

socket.on("prophunt-error", message => {
    alert(message);
});

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
    prophuntState = null;

    document.getElementById("selectedGameDisplay").classList.add("hidden");
    document.getElementById("bugFixerArea").classList.add("hidden");
    document.getElementById("prophuntArea").classList.add("hidden");
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
