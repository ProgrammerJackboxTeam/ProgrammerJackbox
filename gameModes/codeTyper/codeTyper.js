let snippets = [];
let currentSnippet = null;

fetch("/codeTyper/snippets.json")
    .then(res => res.json())
    .then(data => {
        snippets = data;
        newGame();
    });

let startTime = null;
let timerInterval = null;
let started = false;

const inputEl = document.getElementById("typing-input");
const displayEl = document.getElementById("code-display");

function newGame() {
    clearInterval(timerInterval);
    startTime = null;
    timerInterval = null;
    started = false;

    // Pick a random snippet, avoid repeating the same one
    let next;
    do {
        next = snippets[Math.floor(Math.random() * snippets.length)];
    } while (snippets.length > 1 && next === currentSnippet);
    currentSnippet = next;

    renderCode();
    updateNextKey();

    inputEl.value = "";
    inputEl.disabled = false;
    inputEl.focus();

    document.getElementById("stat-wpm").textContent = "0";
    document.getElementById("stat-acc").textContent = "100%";
    document.getElementById("stat-err").textContent = "0";
    document.getElementById("stat-time").textContent = "0s";

    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("result-screen").classList.add("hidden");
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

inputEl.addEventListener("input", handleInput);

// Prevent paste to keep it a fair typing test
inputEl.addEventListener("paste", e => e.preventDefault());

// Trap Tab key so it inserts indentation matching the snippet instead of moving focus
inputEl.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const start    = inputEl.selectionStart;
    const typedRaw = inputEl.value.slice(0, start).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const ahead    = currentSnippet ? currentSnippet.code.slice(typedRaw.length) : "";

    let toInsert = "";
    if (ahead[0] === "\t") {
        // Snippet uses real tabs
        toInsert = "\t";
    } else if (ahead[0] === " ") {
        // Snippet uses spaces — swallow the whole run of spaces in one Tab press
        let count = 0;
        while (ahead[count] === " ") count++;
        toInsert = " ".repeat(count);
    } else {
        return; // Not at an indentation point, ignore Tab
    }

    const end = inputEl.selectionEnd;
    inputEl.value = inputEl.value.slice(0, start) + toInsert + inputEl.value.slice(end);
    inputEl.selectionStart = inputEl.selectionEnd = start + toInsert.length;
    inputEl.dispatchEvent(new Event("input"));
});

function handleInput() {
    const typed = inputEl.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const code = currentSnippet.code;

    // Start timer on first keystroke
    if (!started && typed.length > 0) {
        started = true;
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById("stat-time").textContent = elapsed + "s";
        }, 500);
    }

    // Highlight each character in the display
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

    refreshStats(typed, errors);
    updateNextKey();

    if (typed.length === code.length) {
        finishGame(typed, errors);
    }
}

function refreshStats(typed, errors) {
    const correctChars = typed.length - errors;
    const elapsed = startTime ? (Date.now() - startTime) / 60000 : 0;
    const wpm = elapsed > 0 ? Math.round((correctChars / 5) / elapsed) : 0;
    const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

    document.getElementById("stat-wpm").textContent = wpm;
    document.getElementById("stat-acc").textContent = accuracy + "%";
    document.getElementById("stat-err").textContent = errors;
}

function finishGame(typed, errors) {
    clearInterval(timerInterval);
    inputEl.disabled = true;

    const elapsed = (Date.now() - startTime) / 1000;
    const elapsedMin = elapsed / 60;
    const correctChars = typed.length - errors;
    const wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
    const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

    document.getElementById("res-wpm").textContent = wpm;
    document.getElementById("res-acc").textContent = accuracy + "%";
    document.getElementById("res-err").textContent = errors;
    document.getElementById("res-time").textContent = Math.round(elapsed) + "s";

    document.getElementById("guess-result").textContent = "";
    document.getElementById("lang-guess-input").value = "";

    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
}

function submitGuess() {
    const guess = document.getElementById("lang-guess-input").value.trim().toLowerCase();
    const actual = currentSnippet.language.toLowerCase();
    const resultEl = document.getElementById("guess-result");

    if (!guess) return;

    if (guess === actual) {
        resultEl.textContent = "Correct! It was " + currentSnippet.language + ".";
        resultEl.style.color = "#6bcf6b";
    } else {
        resultEl.textContent = "Nope! It was " + currentSnippet.language + ".";
        resultEl.style.color = "#ff6060";
    }
}


// ── Keyboard ──────────────────────────────────────────

// Map a character to the data-key value used on the keyboard
function charToKey(ch) {
    if (ch === '\n') return 'Enter';
    if (ch === '\t') return 'Tab';
    return ch.toLowerCase();
}

// Highlight the key that corresponds to the next char to type
function updateNextKey() {
    document.querySelectorAll('.key.next-key').forEach(k => k.classList.remove('next-key'));

    if (!currentSnippet) return;
    const typed = inputEl.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const nextChar = currentSnippet.code[typed.length];
    if (nextChar === undefined) return;

    const keyVal = charToKey(nextChar);
    document.querySelectorAll(`.key[data-key="${CSS.escape(keyVal)}"]`)
        .forEach(k => k.classList.add('next-key'));
}

// Press / release animations
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


