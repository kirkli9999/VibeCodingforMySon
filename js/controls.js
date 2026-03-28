/**
 * Triple Choice: Ace Duel - 操控系統
 */
const Controls = (() => {
    const activeP1 = new Set();
    const activeP2 = new Set();
    let p1Callback = null;
    let p2Callback = null;
    const p1KeyMap = {
        'KeyA': 'left', 'KeyD': 'right',
        'KeyW': 'jump', 'KeyS': 'crouch',
        'KeyG': 'attack', 'Digit1': 'switchWeapon',
    };
    const p2KeyMap = {
        'ArrowLeft': 'left', 'ArrowRight': 'right',
        'ArrowUp': 'jump', 'ArrowDown': 'crouch',
        'Comma': 'attack', 'Digit0': 'switchWeapon',
    };
    const soloKeyMap = {
        'KeyA': 'left', 'ArrowLeft': 'left',
        'KeyD': 'right', 'ArrowRight': 'right',
        'KeyW': 'jump', 'ArrowUp': 'jump',
        'KeyS': 'crouch', 'ArrowDown': 'crouch',
        'KeyG': 'attack', 'Comma': 'attack',
        'Digit1': 'switchWeapon', 'Digit0': 'switchWeapon',
    };
    function init(onAction) {
        p1Callback = onAction; p2Callback = null;
        setupTouch(onAction); setupSoloKeyboard(); detectDevice();
    }
    function initLocal(onP1, onP2) {
        p1Callback = onP1; p2Callback = onP2;
        setupLocalKeyboard();
        const controls = document.getElementById('controls');
        if (controls) controls.classList.add('hidden');
        const hint = document.createElement('div');
        hint.id = 'keyboard-hint';
        hint.textContent = 'P1: WASD+G攻擊+1換武器 | P2: 方向鍵+<攻擊+0換武器';
        document.body.appendChild(hint);
    }
    function detectDevice() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const controls = document.getElementById('controls');
        if (!isTouch && controls) {
            controls.classList.add('hidden');
            if (!document.getElementById('keyboard-hint')) {
                const hint = document.createElement('div');
                hint.id = 'keyboard-hint';
                hint.textContent = 'WASD/方向鍵移動 | G/<攻擊 | 1/0換武器';
                document.body.appendChild(hint);
            }
        }
    }
    function setupTouch() {
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            const action = btn.dataset.action;
            if (!action) return;
            let mapped = action;
            if (action === 'punch') mapped = 'attack';
            if (action === 'weapon1' || action === 'weapon2' || action === 'weapon3') mapped = 'switchWeapon';
            btn.addEventListener('touchstart', e => { e.preventDefault(); btn.classList.add('pressed'); handleSoloPress(mapped); }, { passive: false });
            btn.addEventListener('touchend', e => { e.preventDefault(); btn.classList.remove('pressed'); handleSoloRelease(mapped); }, { passive: false });
            btn.addEventListener('touchcancel', e => { e.preventDefault(); btn.classList.remove('pressed'); handleSoloRelease(mapped); }, { passive: false });
            btn.addEventListener('mousedown', e => { e.preventDefault(); btn.classList.add('pressed'); handleSoloPress(mapped); });
            btn.addEventListener('mouseup', e => { e.preventDefault(); btn.classList.remove('pressed'); handleSoloRelease(mapped); });
            btn.addEventListener('mouseleave', () => { btn.classList.remove('pressed'); if (activeP1.has(mapped)) handleSoloRelease(mapped); });
        });
    }
    function setupSoloKeyboard() {
        document.addEventListener('keydown', e => {
            const action = soloKeyMap[e.code];
            if (action && !e.repeat) { e.preventDefault(); handleSoloPress(action); }
        });
        document.addEventListener('keyup', e => {
            const action = soloKeyMap[e.code];
            if (action) { e.preventDefault(); handleSoloRelease(action); }
        });
    }
    function handleSoloPress(action) {
        if (activeP1.has(action)) return;
        activeP1.add(action);
        if (action === 'jump' && activeP1.has('crouch')) { if (p1Callback) p1Callback('flip', true); return; }
        if (p1Callback) p1Callback(action, true);
    }
    function handleSoloRelease(action) {
        if (!activeP1.has(action)) return;
        activeP1.delete(action);
        if (p1Callback) p1Callback(action, false);
    }
    function setupLocalKeyboard() {
        document.addEventListener('keydown', e => {
            const a1 = p1KeyMap[e.code];
            if (a1 && !e.repeat) {
                e.preventDefault();
                if (!activeP1.has(a1)) { activeP1.add(a1); if (a1==='jump'&&activeP1.has('crouch')){p1Callback('flip',true);return;} p1Callback(a1,true); }
                return;
            }
            const a2 = p2KeyMap[e.code];
            if (a2 && !e.repeat) {
                e.preventDefault();
                if (!activeP2.has(a2)) { activeP2.add(a2); if (a2==='jump'&&activeP2.has('crouch')){p2Callback('flip',true);return;} p2Callback(a2,true); }
            }
        });
        document.addEventListener('keyup', e => {
            const a1 = p1KeyMap[e.code];
            if (a1) { e.preventDefault(); if (activeP1.has(a1)){activeP1.delete(a1);p1Callback(a1,false);} return; }
            const a2 = p2KeyMap[e.code];
            if (a2) { e.preventDefault(); if (activeP2.has(a2)){activeP2.delete(a2);p2Callback(a2,false);} }
        });
    }
    return { init, initLocal };
})();
window.Controls = Controls;
