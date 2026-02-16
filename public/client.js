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

function hostLobby() {
    socket.emit("host-room", playerName);
}

function showJoin() {
    document.getElementById("mainMenu").classList.add("hidden");
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
});

function back() {
    location.reload();
}
