/**
 * Triple Choice: Ace Duel - 大廳邏輯與遊戲迴圈編排
 */

(() => {
    // DOM 元素
    const lobbySection = document.getElementById('lobby');
    const waitingSection = document.getElementById('waiting');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const statusText = document.getElementById('status-text');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomCodeInput = document.getElementById('room-code-input');
    const createBtn = document.getElementById('btn-create');
    const joinBtn = document.getElementById('btn-join');
    const backBtn = document.getElementById('btn-back');

    let isHost = false;
    let gameState = null;
    let latestState = null;
    let gameLoopId = null;

    // --- 畫面切換 ---
    function showLobby() {
        lobbySection.style.display = 'flex';
        waitingSection.style.display = 'none';
        gameContainer.style.display = 'none';
    }

    function showWaiting(text) {
        lobbySection.style.display = 'none';
        waitingSection.style.display = 'flex';
        gameContainer.style.display = 'none';
        statusText.textContent = text;
    }

    function showGame() {
        lobbySection.style.display = 'none';
        waitingSection.style.display = 'none';
        gameContainer.style.display = 'block';
    }

    // --- 建立房間 (Host) ---
    createBtn.addEventListener('click', async () => {
        createBtn.disabled = true;
        showWaiting('建立房間中...');

        try {
            const code = await NetworkManager.createRoom();
            roomCodeDisplay.textContent = code;
            showWaiting('');
            statusText.textContent = '等待對手加入...';
            document.getElementById('code-container').style.display = 'block';

            isHost = true;

            NetworkManager.onConnect(() => {
                startGame();
            });

            NetworkManager.onDisconnect(() => {
                stopGame();
                showWaiting('對手已斷線，等待重新連線...');
            });

        } catch (err) {
            alert('建立房間失敗：' + err.message);
            showLobby();
        }
        createBtn.disabled = false;
    });

    // --- 加入房間 (Guest) ---
    joinBtn.addEventListener('click', async () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 4) {
            alert('請輸入 4 碼房間代碼');
            return;
        }

        joinBtn.disabled = true;
        showWaiting('連線中...');

        try {
            await NetworkManager.joinRoom(code);
            isHost = false;

            NetworkManager.onDisconnect(() => {
                stopGame();
                showWaiting('連線中斷...');
                setTimeout(() => showLobby(), 2000);
            });

            startGame();
        } catch (err) {
            alert('加入房間失敗：' + err.message);
            showLobby();
        }
        joinBtn.disabled = false;
    });

    // --- 返回大廳 ---
    backBtn.addEventListener('click', () => {
        NetworkManager.destroy();
        stopGame();
        showLobby();
    });

    // --- 啟動遊戲 ---
    function startGame() {
        showGame();
        Renderer.init(canvas);

        if (isHost) {
            startHostGame();
        } else {
            startGuestGame();
        }
    }

    // --- Host 遊戲迴圈 ---
    function startHostGame() {
        gameState = new GameState();
        gameState.started = true;

        // 本地輸入 → Player 0 (藍隊)
        Controls.init((action, pressed) => {
            gameState.players[0].applyInput(action, pressed);
        });

        // 網路輸入 → Player 1 (紅隊)
        NetworkManager.onMessage((data) => {
            if (data.type === 'input') {
                gameState.players[1].applyInput(data.action, data.pressed);
            }
        });

        // 60Hz 固定物理迴圈
        gameLoopId = setInterval(() => {
            gameState.update();
            const state = gameState.toDict();

            // 傳送狀態給 Guest
            NetworkManager.send({ type: 'state', ...state });

            // 本地渲染
            Renderer.render(state);
        }, 1000 / 60);
    }

    // --- Guest 遊戲迴圈 ---
    function startGuestGame() {
        latestState = null;

        // 本地輸入 → 透過網路傳送
        Controls.init((action, pressed) => {
            NetworkManager.send({ type: 'input', action, pressed });
        });

        // 接收 Host 的遊戲狀態
        NetworkManager.onMessage((data) => {
            if (data.type === 'state') {
                latestState = data;
            }
        });

        // 渲染迴圈
        function renderLoop() {
            if (latestState) {
                Renderer.render(latestState);
            }
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }

    // --- 停止遊戲 ---
    function stopGame() {
        if (gameLoopId) {
            clearInterval(gameLoopId);
            gameLoopId = null;
        }
        gameState = null;
        latestState = null;
    }

    // --- 初始化 ---
    showLobby();

    // 視窗大小變化
    window.addEventListener('resize', () => Renderer.resize());
    window.addEventListener('orientationchange', () => {
        setTimeout(() => Renderer.resize(), 100);
    });
})();
