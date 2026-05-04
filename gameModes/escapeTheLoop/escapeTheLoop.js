// --- Game State & Level Data ---
const levels = typeof window !== 'undefined' && window.levels ? window.levels : (typeof module !== 'undefined' ? require('./levels.js') : []);

let currentLevelIndex = 0;
let bot = { x: 0, y: 0, dir: 0 }; 
let isRunning = false;
let isLevelComplete = false;

// UI Elements
let gridContainer, gameStatus, levelIndicator, scriptContainer, btnRun, btnClear;

function initUI() {
    gridContainer = document.getElementById('grid-container');
    gameStatus = document.getElementById('game-status');
    levelIndicator = document.getElementById('level-indicator');
    scriptContainer = document.getElementById('script-container');
    btnRun = document.getElementById('btn-run');
    btnClear = document.getElementById('btn-clear');
}
initUI();

const DIR_MAP = {
    0: { dx: 0, dy: -1 },
    90: { dx: 1, dy: 0 },
    180: { dx: 0, dy: 1 },
    270: { dx: -1, dy: 0 }
};

// --- Initialization ---
function loadLevel(index) {
    const level = levels[index];
    levelIndicator.textContent = `Level ${level.id}`;
    
    // Convert direction string to degrees
    const dirMapStr = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
    
    bot.x = level.start.x;
    bot.y = level.start.y;
    bot.dir = dirMapStr[level.start.dir] || 0;
    
    renderGrid(level);
    updateBotVisual(false);
    gameStatus.textContent = "Awaiting commands...";
    gameStatus.style.color = "var(--accent-blue)";
    isLevelComplete = false;
    btnRun.textContent = "Run Script";
}

function renderGrid(level) {
    gridContainer.style.gridTemplateColumns = `repeat(${level.cols}, 50px)`;
    gridContainer.style.gridTemplateRows = `repeat(${level.rows}, 50px)`;
    gridContainer.innerHTML = '';
    
    for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // Check wall
            if (level.walls.some(w => w.x === x && w.y === y)) {
                cell.classList.add('wall');
            }
            // Check door
            else if (level.exit.x === x && level.exit.y === y) {
                cell.classList.add('door');
                cell.textContent = '🚪';
            }
            
            gridContainer.appendChild(cell);
        }
    }
    
    // Add bot
    const botEl = document.createElement('div');
    botEl.classList.add('robot');
    botEl.id = 'robot';
    gridContainer.appendChild(botEl);
}

function updateBotVisual(animate = true) {
    const botEl = document.getElementById('robot');
    if (!botEl) return;
    
    if (!animate) {
        botEl.style.transition = 'none';
        // force reflow
        void botEl.offsetWidth;
    } else {
        botEl.style.transition = 'all 0.3s ease';
    }
    
    // Grid gap is 4px. Cell is 50px.
    botEl.style.transform = `translate(${bot.x * 54}px, ${bot.y * 54}px) rotate(${bot.dir}deg)`;
}

// --- Drag & Drop Engine ---
let draggedEle = null;
let isTemplate = false;

document.querySelectorAll('.block').forEach(setupDraggable);
document.querySelectorAll('.dropzone').forEach(setupDropzone);

function setupDraggable(ele) {
    ele.addEventListener('dragstart', (e) => {
        if (isRunning) { e.preventDefault(); return; }
        
        draggedEle = ele;
        isTemplate = ele.closest('.toolbox') !== null;
        
        // Delay adding the dragging class so the browser captures the full opacity drag image
        setTimeout(() => ele.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = isTemplate ? 'copy' : 'move';
        e.dataTransfer.setData('text/plain', ele.dataset.type);
    });
    
    ele.addEventListener('dragend', () => {
        ele.classList.remove('dragging');
        draggedEle = null;
    });
}

function setupDropzone(zone) {
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = isTemplate ? 'copy' : 'move';
        zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
        
        if (!draggedEle) return;
        
        // Prevent nesting loop into itself or putting loop inside loop
        if (zone.classList.contains('loop-body') && draggedEle.dataset.type === 'loop') {
            gameStatus.textContent = "Nested loops not supported!";
            setTimeout(() => gameStatus.textContent = "Awaiting commands...", 2000);
            return;
        }
        
        if (isTemplate) {
            const clone = draggedEle.cloneNode(true);
            // Ensure the clone does not inherit the dragging class from its template
            clone.classList.remove('dragging');
            setupDraggable(clone);
            
            const innerZone = clone.querySelector('.dropzone');
            if (innerZone) {
                setupDropzone(innerZone);
            }
            
            addDeleteBtn(clone);
            zone.appendChild(clone);
        } else {
            // Check if dropping block inside itself
            if(draggedEle.contains(zone)) {
                return;
            }
            zone.appendChild(draggedEle);
        }
    });
}

function addDeleteBtn(block) {
    const del = document.createElement('span');
    del.innerHTML = ' &times;';
    del.style.cursor = 'pointer';
    del.style.marginLeft = 'auto';
    del.style.color = '#fff';
    del.style.fontWeight = 'bold';
    del.onclick = () => block.remove();
    
    if (block.dataset.type === 'loop') {
        const header = block.querySelector('.loop-header');
        header.appendChild(del);
    } else {
        block.style.display = 'flex';
        block.style.alignItems = 'center';
        block.appendChild(del);
    }
}

function clearScript() {
    if (isRunning) return;
    scriptContainer.innerHTML = '';
}

btnClear.addEventListener('click', clearScript);

// --- Game Logic Engine ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScript() {
    if (isRunning) return;

    if (isLevelComplete) {
        if (currentLevelIndex < levels.length - 1) {
            currentLevelIndex++;
            clearScript();
            loadLevel(currentLevelIndex);
        }
        return;
    }
    
    const cmds = parseCommands(scriptContainer);
    if (cmds.length === 0) {
        gameStatus.textContent = "Please add commands first.";
        return;
    }
    
    isRunning = true;
    btnRun.disabled = true;
    btnClear.disabled = true;
    gameStatus.style.color = "var(--text-main)";
    
    // Reset bot
    loadLevel(currentLevelIndex);
    await sleep(400);
    
    let success = false;
    let crashed = false;
    const level = levels[currentLevelIndex];
    
    for (const cmd of cmds) {
        if (crashed) break;
        
        gameStatus.textContent = `Executing: ${cmd.type}()`;
        
        if (cmd.type === 'forward') {
            const normalizedDir = ((bot.dir % 360) + 360) % 360;
            const d = DIR_MAP[normalizedDir];
            const nx = bot.x + d.dx;
            const ny = bot.y + d.dy;
            
            // Check bounds
            if (nx < 0 || nx >= level.cols || ny < 0 || ny >= level.rows) {
                crashed = true;
                gameStatus.textContent = "CRASH! Out of bounds.";
            } 
            // Check walls
            else if (level.walls.some(w => w.x === nx && w.y === ny)) {
                crashed = true;
                gameStatus.textContent = "CRASH! Hit a wall.";
            }
            else {
                bot.x = nx;
                bot.y = ny;
            }
        } 
        else if (cmd.type === 'turnLeft') {
            bot.dir -= 90;
        }
        else if (cmd.type === 'turnRight') {
            bot.dir += 90;
        }
        
        updateBotVisual(true);
        await sleep(600);
        
        if (crashed) break;
        
        // Check win
        if (bot.x === level.exit.x && bot.y === level.exit.y) {
            success = true;
            break;
        }
    }
    
    if (success) {
        if (currentLevelIndex < levels.length - 1) {
            gameStatus.textContent = "SUCCESS! Area Clear. Ready for next phase.";
            gameStatus.style.color = "var(--accent-green)";
            btnRun.textContent = "Next Level";
            isLevelComplete = true;
        } else {
            gameStatus.textContent = "SUCCESS! You Escaped the Grand Factory!";
            gameStatus.style.color = "var(--accent-green)";
        }
    } else if (!crashed) {
        gameStatus.textContent = "FAILED: End of execution reached.";
        gameStatus.style.color = "var(--accent-red)";
    } else {
        gameStatus.style.color = "var(--accent-red)";
    }
    
    isRunning = false;
    btnRun.disabled = false;
    btnClear.disabled = false;
}

function parseCommands(container) {
    const results = [];
    const children = container.children;
    for (let c of children) {
        if (!c.classList.contains('block')) continue;
        const type = c.dataset.type;
        
        if (type === 'loop') {
            const countInput = c.querySelector('.loop-count');
            const iters = parseInt(countInput.value) || 2;
            const body = c.querySelector('.loop-body');
            const innerCmds = parseCommands(body);
            for(let i = 0; i < iters; i++){
                results.push(...innerCmds);
            }
        } else {
            results.push({ type });
        }
    }
    return results;
}

btnRun.addEventListener('click', runScript);

// Init
if (typeof module === 'undefined') {
    // Only auto-load if in browser
    if (typeof levels !== 'undefined') loadLevel(0);
} else {
    module.exports = {
        loadLevel,
        renderGrid,
        updateBotVisual,
        runScript,
        parseCommands,
        clearScript,
        bot,
        setIsRunning: (v) => isRunning = v,
        setCurrentLevel: (v) => currentLevelIndex = v,
        getCurrentLevel: () => currentLevelIndex,
        getBot: () => bot,
        getIsComplete: () => isLevelComplete
    };
}
