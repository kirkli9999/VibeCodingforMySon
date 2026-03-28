/**
 * Triple Choice: Ace Duel - 操控系統
 */

const Controls = (() => {
    const activeActions = new Set();
    let sendCallback = null;

    const keyMap = {
        'KeyA': 'left', 'ArrowLeft': 'left',
        'KeyD': 'right', 'ArrowRight': 'right',
        'KeyW': 'jump', 'ArrowUp': 'jump',
        'KeyS': 'crouch', 'ArrowDown': 'crouch',
        'KeyF': 'attack',
        'KeyG': 'punch',
        'Digit1': 'weapon1',
        'Digit2': 'weapon2',
        'Digit3': 'weapon3',
    };

    function init(onAction) {
        sendCallback = onAction;
        setupTouch();
        setupKeyboard();
        detectDevice();
    }

    function detectDevice() {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const controls = document.getElementById('controls');
        if (!isTouchDevice && controls) {
            controls.classList.add('hidden');
            const hint = document.createElement('div');
            hint.id = 'keyboard-hint';
            hint.textContent = 'WASD/方向鍵移動 | W二段跳 | F攻擊 | G打 | 1/2/3換武器';
            document.body.appendChild(hint);
        }
    }

    function setupTouch() {
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            const action = btn.dataset.action;
            if (!action) return;
            btn.addEventListener('touchstart', e => { e.preventDefault(); btn.classList.add('pressed'); handlePress(action); }, { passive: false });
            btn.addEventListener('touchend', e => { e.preventDefault(); btn.classList.remove('pressed'); handleRelease(action); }, { passive: false });
            btn.addEventListener('touchcancel', e => { e.preventDefault(); btn.classList.remove('pressed'); handleRelease(action); }, { passive: false });
            btn.addEventListener('mousedown', e => { e.preventDefault(); btn.classList.add('pressed'); handlePress(action); });
            btn.addEventListener('mouseup', e => { e.preventDefault(); btn.classList.remove('pressed'); handleRelease(action); });
            btn.addEventListener('mouseleave', () => { btn.classList.remove('pressed'); if (activeActions.has(action)) handleRelease(action); });
        });
    }

    function setupKeyboard() {
        document.addEventListener('keydown', e => {
            const action = keyMap[e.code];
            if (action && !e.repeat) { e.preventDefault(); handlePress(action); }
        });
        document.addEventListener('keyup', e => {
            const action = keyMap[e.code];
            if (action) { e.preventDefault(); handleRelease(action); }
        });
    }

    function handlePress(action) {
        if (activeActions.has(action)) return;
        activeActions.add(action);
        if (action === 'jump' && activeActions.has('crouch')) { sendAction('flip', true); return; }
        sendAction(action, true);
    }

    function handleRelease(action) {
        if (!activeActions.has(action)) return;
        activeActions.delete(action);
        sendAction(action, false);
    }

    function sendAction(action, pressed) {
        if (sendCallback) sendCallback(action, pressed);
    }

    return { init };
})();

window.Controls = Controls;
