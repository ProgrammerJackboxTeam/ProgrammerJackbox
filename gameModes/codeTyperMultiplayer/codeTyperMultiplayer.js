const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('roomCode');
const playerName = urlParams.get('name');
const isHost = urlParams.get('isHost') === 'true';

if (!roomCode || !playerName) {
    window.location.href = '/';
}

document.getElementById("room-info").innerText = `Room: ${roomCode} | Player: ${playerName}`;

if (isHost) {
    document.getElementById("btn-start").classList.remove("hidden");
    document.getElementById("btn-next").classList.remove("hidden");
}

let snippets = [];
let currentSnippet = null;
let opponents = {};

fetch("/codeTyperMultiplayer/snippets.json")
    .then(res => res.json())
    .then(data => {
        snippets = data;
        socket.emit("codetyper-rejoin-room", { roomCode, name: playerName });
    });

socket.on("codetyper-set-snippet", (snippet) => {
    currentSnippet = snippet;
    document.getElementById("waiting-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    resetMatch();
});

socket.on("codetyper-progress-update", (playersData) => {
    opponents = playersData;
    renderOpponentProgress();
    
    // Update waiting screen list
    const playersList = document.getElementById("players-list");
    playersList.innerHTML = "";
    Object.values(opponents).forEach(p => {
        const div = document.createElement("div");
        div.className = "player-item";
        div.textContent = p.name;
        playersList.appendChild(div);
    });

    checkIfAllFinished();
});

function hostStart() {
    if (!snippets.length) return;
    const next = snippets[Math.floor(Math.random() * snippets.length)];
    socket.emit("codetyper-sync-snippet", { roomCode, snippet: next });
}

let startTime = null;
let timerInterval = null;
let started = false;
let typed = "";
let gameActive = false;
let totalErrors = 0;

const displayEl = document.getElementById("code-display");

function resetMatch() {
    clearInterval(timerInterval);
    startTime = null;
    timerInterval = null;
    started = false;
    typed = "";
    gameActive = true;
    totalErrors = 0;

    renderCode();
    updateNextKey();

    document.getElementById("stat-wpm").textContent = "0";
    document.getElementById("stat-acc").textContent = "100%";
    document.getElementById("stat-err").textContent = "0";
    document.getElementById("stat-time").textContent = "0s";
    
    // reset server state
    socket.emit("codetyper-rejoin-room", { roomCode, name: playerName });
}

function renderCode() {
    displayEl.innerHTML = "";
    for (let i = 0; i < currentSnippet.code.length; i++) {
        const span = document.createElement("span");
        span.textContent = currentSnippet.code[i];
        if (i === 0) span.className = "char-cursor";
        displayEl.appendChild(span);
    }
}

function renderOpponentProgress() {
    const container = document.getElementById("opponent-progress");
    container.innerHTML = "";
    
    Object.keys(opponents).forEach(id => {
        if (id === socket.id) return; // Don't show self
        const p = opponents[id];
        const pct = Math.floor(p.progress * 100);
        
        container.innerHTML += `
            <div class="progress-label">
                <span>${p.name}</span>
                <span>${p.isFinished ? p.time + 's' : pct + '% | ' + p.wpm + ' WPM'}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${pct}%"></div>
            </div>
        `;
    });
}

function checkIfAllFinished() {
    const vals = Object.values(opponents);
    if (vals.length > 0 && vals.every(p => p.isFinished)) {
        showResults();
    }
}

document.addEventListener("keydown", e => {
    if (!gameActive) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const code = currentSnippet.code;

    if (["Tab", "Backspace", "Enter", " "].includes(e.key) ||
        (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
    }

    if (e.key === "Backspace") {
        if (typed.length > 0) typed = typed.slice(0, -1);
    } else if (e.key === "Tab") {
        const ahead = code.slice(typed.length);
        if (ahead[0] === "\t") {
            typed += "\t";
        } else if (ahead[0] === " ") {
            let count = 0;
            while (ahead[count] === " ") count++;
            typed += " ".repeat(count);
        }
    } else if (e.key === "Enter") {
        typed += "\n";
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        typed += e.key;
        if (typed.length <= code.length && typed[typed.length - 1] !== code[typed.length - 1]) {
            totalErrors++;
        }
    } else {
        return;
    }

    if (!started && typed.length > 0) {
        started = true;
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById("stat-time").textContent = elapsed + "s";
        }, 500);
    }

    const spans = displayEl.querySelectorAll("span");
    let errors = 0;
    spans.forEach((span, i) => {
        span.className = "";
        if (i < typed.length) {
            if (typed[i] === code[i]) {
                span.className = "char-correct";
            } else {
                span.className = "char-wrong";
                errors++;
            }
        } else if (i === typed.length) {
            span.className = "char-cursor";
        }
    });

    const elapsedMin = startTime ? (Date.now() - startTime) / 60000 : 0;
    const correctChars = typed.length - errors;
    const wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
    const progress = Math.min(1, typed.length / code.length);

    refreshStats(typed, errors, wpm);
    updateNextKey();
    
    // Broadcast Progress
    socket.emit("codetyper-progress", { roomCode, progress, wpm });

    if (typed.length === code.length && errors === 0) {
        finishGame();
    } else if (typed.length === code.length && errors > 0) {
        document.getElementById("code-display").style.borderColor = "#ff6060";
        let errLabel = document.getElementById("err-label-msg");
        if (!errLabel) {
            errLabel = document.createElement("div");
            errLabel.id = "err-label-msg";
            errLabel.style.color = "#ff6060";
            errLabel.style.fontWeight = "bold";
            errLabel.style.marginTop = "10px";
            errLabel.innerText = "You have typos! Press Backspace and fix them to finish!";
            document.getElementById("game-screen").insertBefore(errLabel, document.getElementById("stats"));
        }
        setTimeout(() => { document.getElementById("code-display").style.borderColor = "#444"; }, 300);
    }
});

function refreshStats(typed, errors, wpm) {
    const accuracy = typed.length > 0 ? Math.round(((typed.length - errors) / typed.length) * 100) : 100;

    document.getElementById("stat-wpm").textContent = wpm;
    document.getElementById("stat-acc").textContent = Math.max(0, accuracy) + "%";
    document.getElementById("stat-err").textContent = errors;
}

function finishGame() {
    clearInterval(timerInterval);
    gameActive = false;

    const elapsed = Math.round((Date.now() - startTime) / 10) / 100;
    document.getElementById("stat-time").textContent = elapsed + "s";
    document.getElementById("code-display").innerHTML = "<h3 style='color:#6bcf6b; text-align:center;'>Done! Waiting for others to finish...</h3>";
    
    socket.emit("codetyper-finished", { roomCode, time: elapsed });
}

function showResults() {
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");

    const leaderboard = document.getElementById("final-leaderboard");
    leaderboard.innerHTML = "";

    const sortedPlayers = Object.values(opponents).sort((a, b) => a.time - b.time);
    
    sortedPlayers.forEach((p, idx) => {
        const li = document.createElement("li");
        const rankClass = idx < 3 ? `rank-${idx + 1}` : '';
        li.innerHTML = `
            <span class="${rankClass}">#${idx + 1} ${p.name}</span>
            <span>${p.time}s (${p.wpm} WPM)</span>
        `;
        leaderboard.appendChild(li);
    });
}

function charToKey(ch) {
    if (ch === '\n') return 'Enter';
    if (ch === '\t') return 'Tab';
    return ch.toLowerCase();
}

function updateNextKey() {
    document.querySelectorAll('.key.next-key').forEach(k => k.classList.remove('next-key'));

    if (!currentSnippet) return;
    const nextChar = currentSnippet.code[typed.length];
    if (nextChar === undefined) return;

    const keyVal = charToKey(nextChar);
    document.querySelectorAll(`.key[data-key="${CSS.escape(keyVal)}"]`)
        .forEach(k => k.classList.add('next-key'));
}

window.addEventListener('keydown', e => {
    const val = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    document.querySelectorAll(`.key[data-key="${CSS.escape(val)}"]`)
        .forEach(k => k.classList.add('pressed'));
});

window.addEventListener('keyup', e => {
    const val = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    document.querySelectorAll(`.key[data-key="${CSS.escape(val)}"]`)
        .forEach(k => k.classList.remove('pressed'));
});
