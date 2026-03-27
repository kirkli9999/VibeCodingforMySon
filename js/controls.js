/**
 * Triple Choice: Ace Duel - 操控系統
 * 支援觸控 (手機) 和鍵盤 (電腦) 雙模式
 */

const Controls = (() => {
    const activeActions = new Set();
    let sendCallback = null;

    const keyMap = {
        'KeyA': 'left',
        'ArrowLeft': 'left',
        'KeyD': 'right',
        'ArrowRight': 'right',
        'KeyW': 'jump',
        'ArrowUp': 'jump',
        'KeyS': 'crouch',
        'ArrowDown': 'crouch',
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
            hint.textContent = '鍵盤操控: WASD 或 方向鍵 移動/跳躍';
            document.body.appendChild(hint);
        }
    }

    function setupTouch() {
        const buttons = document.querySelectorAll('.ctrl-btn');
        buttons.forEach(btn => {
            const action = btn.dataset.action;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                handlePress(action);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                handleRelease(action);
            }, { passive: false });

            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                handleRelease(action);
            }, { passive: false });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                handlePress(action);
            });
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                handleRelease(action);
            });
            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('pressed');
                if (activeActions.has(action)) handleRelease(action);
            });
        });
    }

    function setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            const action = keyMap[e.code];
            if (action && !e.repeat) {
                e.preventDefault();
                handlePress(action);
            }
        });

        document.addEventListener('keyup', (e) => {
            const action = keyMap[e.code];
            if (action) {
                e.preventDefault();
                handleRelease(action);
            }
        });
    }

    function handlePress(action) {
        if (activeActions.has(action)) return;
        activeActions.add(action);

        // 蹲下時按跳 = 前空翻
        if (action === 'jump' && activeActions.has('crouch')) {
            sendAction('flip', true);
            return;
        }

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
