/**
 * Triple Choice: Ace Duel - 操控系統
 * 支援觸控 (手機) 和鍵盤 (電腦) 雙模式
 */

const Controls = (() => {
    // 當前按下的動作
    const activeActions = new Set();
    let sendCallback = null;
    let isTouchDevice = false;

    // 鍵盤映射 (WASD + 方向鍵都支援)
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
        // 有觸控能力就顯示按鈕
        isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const controls = document.getElementById('controls');
        if (!isTouchDevice) {
            controls.classList.add('hidden');
            showKeyboardHint();
        }
    }

    function showKeyboardHint() {
        const hint = document.createElement('div');
        hint.id = 'keyboard-hint';
        hint.textContent = '鍵盤操控: WASD 或 方向鍵 移動/跳躍';
        document.body.appendChild(hint);
    }

    // --- 觸控操控 ---
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

            // 滑鼠也支援 (桌面測試用)
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
            btn.addEventListener('mouseleave', (e) => {
                btn.classList.remove('pressed');
                if (activeActions.has(action)) {
                    handleRelease(action);
                }
            });
        });
    }

    // --- 鍵盤操控 ---
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

    // --- 共通邏輯 ---
    function handlePress(action) {
        if (activeActions.has(action)) return;
        activeActions.add(action);

        // 偵測前空翻: 蹲下時按跳
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
        if (sendCallback) {
            sendCallback(action, pressed);
        }
    }

    return { init };
})();
