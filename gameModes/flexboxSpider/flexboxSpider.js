let levels = [];
let currentLevelIndex = 0;

fetch("/flexboxSpider/levels.json")
    .then((res) => res.json())
    .then((data) => {
        levels = data;
        loadLevel(0);
    });

const webContainer = document.getElementById("web-container");
const spiderEl = document.getElementById("spider");
const targetWebEl = document.getElementById("target-web");
const cssInput = document.getElementById("css-input");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("next-btn");

function loadLevel(index) {
    currentLevelIndex = index;
    const lvl = levels[index];

    document.getElementById("level-label").textContent = `Level ${index + 1} / ${levels.length}`;
    document.getElementById("level-desc").textContent = lvl.description;
    document.getElementById("level-hint").textContent = "💡 Hint: " + lvl.hint;

    // Update CSS selector label based on target
    const selectorLabel = document.getElementById("css-selector-label");
    selectorLabel.textContent = lvl.target === "spider" ? "#spider {" : "#web-container {";

    // Reset styles
    webContainer.style.cssText = "";
    spiderEl.style.cssText = "";
    targetWebEl.style.cssText = "";

    // Apply starting CSS to the web container
    if (lvl.startCss) {
        for (const [prop, val] of Object.entries(lvl.startCss)) {
            webContainer.style[prop] = val;
        }
    }

    // Special layout for wrap level: elements need explicit width to force wrap
    if (lvl.answer === "wrap") {
        spiderEl.style.minWidth = "55%";
        targetWebEl.style.minWidth = "55%";
    }

    // Reset input & feedback
    cssInput.value = "";
    cssInput.focus();
    hideFeedback();
    nextBtn.classList.add("hidden");
}

function applyCSS() {
    const lvl = levels[currentLevelIndex];
    const raw = cssInput.value.trim();

    if (!raw) {
        showFeedback("❌ Enter a CSS property first!", "wrong");
        return;
    }

    // Parse "property: value;" entries from the textarea
    const parsed = parseCSS(raw);

    if (Object.keys(parsed).length === 0) {
        showFeedback("❌ Couldn't parse that CSS. Try: " + lvl.property + ": " + lvl.answer + ";", "wrong");
        return;
    }

    // Apply to the correct target element
    const target = lvl.target === "spider" ? spiderEl : webContainer;
    for (const [prop, val] of Object.entries(parsed)) {
        target.style[prop] = val;
    }

    // Check correctness: look for the expected property/value pair
    const expectedProp = camelCase(lvl.property);
    const expectedVal = lvl.answer.trim().toLowerCase();
    const appliedVal = (parsed[expectedProp] || "").trim().toLowerCase();

    if (appliedVal === expectedVal) {
        showFeedback("✅ Correct! The spider found its web!", "correct");
        nextBtn.classList.remove("hidden");
    } else {
        showFeedback(`❌ Not quite. Try: ${lvl.property}: ${lvl.answer};`, "wrong");
    }
}

function nextLevel() {
    if (currentLevelIndex + 1 >= levels.length) {
        finishGame();
    } else {
        loadLevel(currentLevelIndex + 1);
    }
}

function finishGame() {
    document.getElementById("res-levels").textContent = levels.length + " / " + levels.length;
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
}

function restartGame() {
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("result-screen").classList.add("hidden");
    loadLevel(0);
}

function showFeedback(msg, type) {
    feedbackEl.textContent = msg;
    feedbackEl.className = type; // "correct" or "wrong"
    feedbackEl.classList.remove("hidden");
}

function hideFeedback() {
    feedbackEl.textContent = "";
    feedbackEl.className = "hidden";
}

// Parse "prop: value; prop2: value2;" into a camelCase object
function parseCSS(text) {
    const result = {};
    const declarations = text
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    for (const decl of declarations) {
        const colonIdx = decl.indexOf(":");
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim();
        const val = decl.slice(colonIdx + 1).trim();
        if (prop && val) {
            result[camelCase(prop)] = val;
        }
    }
    return result;
}

// Convert kebab-case to camelCase
function camelCase(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Allow Enter key in textarea to trigger Apply
cssInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        applyCSS();
    }
});
