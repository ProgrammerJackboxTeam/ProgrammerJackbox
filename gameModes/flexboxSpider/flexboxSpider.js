let levels = typeof window !== "undefined" && window.levels ? window.levels : [];
let currentLevelIndex = 0;

if (typeof fetch !== "undefined") {
    fetch("/flexboxSpider/levels.json")
        .then((res) => res.json())
        .then((data) => {
            levels = data;
            loadLevel(0);
        });
}

const webContainer = document.getElementById("web-container") || document.createElement("div");
const targetContainer = document.getElementById("target-container") || document.createElement("div");
const spiderEl = document.getElementById("spider") || document.createElement("div");
const targetWebEl = document.getElementById("target-web") || document.createElement("div");
const cssInput = document.getElementById("css-input") || document.createElement("textarea");
const feedbackEl = document.getElementById("feedback") || document.createElement("div");
const nextBtn = document.getElementById("next-btn") || document.createElement("button");

function loadLevel(index) {
    currentLevelIndex = index;
    const lvl = levels[index];

    const lbl = document.getElementById("level-label");
    if (lbl) lbl.textContent = `Level ${index + 1} / ${levels.length}`;
    const desc = document.getElementById("level-desc");
    if (desc) desc.textContent = lvl.description;
    const hint = document.getElementById("level-hint");
    if (hint) hint.textContent = "💡 Hint: " + lvl.hint;

    // Update CSS selector label based on target
    const selectorLabel = document.getElementById("css-selector-label");
    if (selectorLabel) selectorLabel.textContent = lvl.target === "spider" ? "#spider {" : "#web-container {";

    // Reset styles
    webContainer.style.cssText = "";
    targetContainer.style.cssText = "";
    spiderEl.style.cssText = "";
    targetWebEl.style.cssText = "";

    // Apply starting CSS to the web container & target container
    if (lvl.startCss) {
        for (const [prop, val] of Object.entries(lvl.startCss)) {
            webContainer.style[prop] = val;
            targetContainer.style[prop] = val;
        }
    }

    // Apply the "answer" to the target container/element so the web is placed at the goal
    const expectedProp = camelCase(lvl.property);
    const expectedVal = lvl.answer;

    if (lvl.target === "spider") {
        targetWebEl.style[expectedProp] = expectedVal;
    } else {
        targetContainer.style[expectedProp] = expectedVal;
    }

    // Force the inner text and base styles
    spiderEl.textContent = "🕷️";
    spiderEl.className = "spider-item";
    spiderEl.style.fontSize = "40px";

    targetWebEl.textContent = "🕸️";
    targetWebEl.className = "target-item";
    targetWebEl.style.fontSize = "40px";

    // Add or remove dummy items for wrap level
    webContainer.innerHTML = "";
    targetContainer.innerHTML = "";

    // Dynamic item count based on level type
    if (lvl.answer.includes("space-")) {
        webContainer.appendChild(spiderEl);
        targetContainer.appendChild(targetWebEl);
        // Space-between / space-around needs multiple items to be visible
        for (let i = 0; i < 2; i++) {
            let dSpider = document.createElement("div");
            dSpider.textContent = "🕷️";
            dSpider.className = "spider-item";
            dSpider.style.fontSize = "40px";
            webContainer.appendChild(dSpider);

            let dWeb = document.createElement("div");
            dWeb.textContent = "🕸️";
            dWeb.className = "target-item";
            dWeb.style.fontSize = "40px";
            targetContainer.appendChild(dWeb);
        }
    } else if (lvl.answer === "wrap") {
        webContainer.appendChild(spiderEl);
        targetContainer.appendChild(targetWebEl);
        webContainer.style.width = "160px"; // Force a small container
        targetContainer.style.width = "160px";
        spiderEl.style.minWidth = "100px";
        targetWebEl.style.minWidth = "100px";

        // Add additional spiders/webs to force wrap visually
        for (let i = 0; i < 2; i++) {
            let dSpider = document.createElement("div");
            dSpider.textContent = "🕷️";
            dSpider.className = "spider-item";
            dSpider.style.fontSize = "40px";
            dSpider.style.minWidth = "100px";
            webContainer.appendChild(dSpider);

            let dWeb = document.createElement("div");
            dWeb.textContent = "🕸️";
            dWeb.className = "target-item";
            dWeb.style.fontSize = "40px";
            dWeb.style.minWidth = "100px";
            targetContainer.appendChild(dWeb);
        }
    } else if (lvl.property === "order" || lvl.property === "align-self") {
        // Add 2 decoy items first
        for (let i = 0; i < 2; i++) {
            let fly1 = document.createElement("div");
            fly1.textContent = "🕷️";
            fly1.className = "spider-item";
            fly1.style.fontSize = "40px";
            fly1.style.opacity = "0.5";
            webContainer.appendChild(fly1);

            let webFly1 = document.createElement("div");
            webFly1.textContent = "🕸️";
            webFly1.className = "target-item";
            webFly1.style.fontSize = "40px";
            webFly1.style.opacity = "0.5";
            targetContainer.appendChild(webFly1);
        }

        // Then the main spider/target
        spiderEl.style.opacity = "1";
        targetWebEl.style.opacity = "1";
        webContainer.appendChild(spiderEl);
        targetContainer.appendChild(targetWebEl);

        // Let's add 2 more decoy items
        for (let i = 0; i < 2; i++) {
            let fly2 = document.createElement("div");
            fly2.textContent = "🕷️";
            fly2.className = "spider-item";
            fly2.style.fontSize = "40px";
            fly2.style.opacity = "0.5";
            webContainer.appendChild(fly2);

            let webFly2 = document.createElement("div");
            webFly2.textContent = "🕸️";
            webFly2.className = "target-item";
            webFly2.style.fontSize = "40px";
            webFly2.style.opacity = "0.5";
            targetContainer.appendChild(webFly2);
        }

        // Reset properties on decoys so they don't move with the spider when applyCSS is called
    } else {
        // Default single item layout
        spiderEl.style.opacity = "1";
        targetWebEl.style.opacity = "1";
        spiderEl.style.minWidth = "60px";
        targetWebEl.style.minWidth = "60px";
        webContainer.appendChild(spiderEl);
        targetContainer.appendChild(targetWebEl);
    }

    // Reset input & feedback
    cssInput.value = "";
    if (cssInput.focus) cssInput.focus();
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

if (typeof module !== "undefined" && module.exports) {
    window.applyCSS = applyCSS;
    window.nextLevel = nextLevel;
    window.restartGame = restartGame;
    module.exports = {
        loadLevel,
        applyCSS,
        nextLevel,
        finishGame,
        restartGame,
        showFeedback,
        hideFeedback,
        parseCSS,
        camelCase,
    };
}

// Allow Enter key in textarea to trigger Apply
cssInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        applyCSS();
    }
});
