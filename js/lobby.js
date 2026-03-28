/**
 * Triple Choice: Ace Duel - 大廳邏輯
 */

(() => {
    const lobbySection = document.getElementById('lobby');
    const waitingSection = document.getElementById('waiting');
    const colorPickSection = document.getElementById('color-pick');
    const colorPickTitle = document.getElementById('color-pick-title');
    const colorGrid = document.getElementById('color-grid');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const statusText = document.getElementById('status-text');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomCodeInput = document.getElementById('room-code-input');
    const practiceBtn = document.getElementById('btn-practice');
    const localBtn = document.getElementById('btn-local');
    const createBtn = document.getElementById('btn-create');
    const joinBtn = document.getElementById('btn-join');
    const backBtn = document.getElementById('btn-back');

    let isHost = false, gameState = null, latestState = null, gameLoopId = null;
    let aiController = null;
    let pendingMode = null; // 'practice' | 'local' | 'host' | 'guest'
    let p1Color = null, p2Color = null;

    const COLOR_OPTIONS = [
        { name: '紅', hex: '#ff4444' },
        { name: '橙', hex: '#ff8800' },
        { name: '黃', hex: '#ffcc00' },
        { name: '綠', hex: '#44cc44' },
        { name: '藍', hex: '#4488ff' },
        { name: '靛', hex: '#4455cc' },
        { name: '紫', hex: '#aa44ff' },
        { name: '黑', hex: '#888888' },
    ];

    // ===== 畫面切換 =====
    function showLobby() {
        lobbySection.style.display = 'flex';
        waitingSection.style.display = 'none';
        colorPickSection.style.display = 'none';
        gameContainer.style.display = 'none';
    }
    function showWaiting(text) {
        lobbySection.style.display = 'none';
        waitingSection.style.display = 'flex';
        colorPickSection.style.display = 'none';
        gameContainer.style.display = 'none';
        statusText.textContent = text;
    }
    function showColorPick() {
        lobbySection.style.display = 'none';
        waitingSection.style.display = 'none';
        colorPickSection.style.display = 'flex';
        gameContainer.style.display = 'none';
    }
    function showGame() {
        lobbySection.style.display = 'none';
        waitingSection.style.display = 'none';
        colorPickSection.style.display = 'none';
        gameContainer.style.display = 'block';
    }

    // ===== 選色 =====
    function buildColorGrid(disabledHex) {
        colorGrid.innerHTML = '';
        COLOR_OPTIONS.forEach(c => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c.hex;
            swatch.title = c.name;
            if (disabledHex && c.hex === disabledHex) {
                swatch.classList.add('disabled');
            }
            swatch.addEventListener('click', () => onColorPicked(c.hex));
            colorGrid.appendChild(swatch);
        });
    }

    function onColorPicked(hex) {
        if (pendingMode === 'practice') {
            p1Color = hex;
            p2Color = COLOR_OPTIONS.find(c => c.hex !== hex).hex; // AI gets first different color
            showGame();
            Renderer.init(canvas);
            startPracticeGame();
        } else if (pendingMode === 'local') {
            if (!p1Color) {
                // P1 chose, now P2 chooses
                p1Color = hex;
                colorPickTitle.textContent = 'P2 選擇顏色';
                buildColorGrid(p1Color); // disable P1's color
            } else {
                p2Color = hex;
                showGame();
                Renderer.init(canvas);
                startLocalGame();
            }
        } else if (pendingMode === 'host') {
            p1Color = hex;
            showWaiting('建立房間中...');
            doCreateRoom();
        } else if (pendingMode === 'guest') {
            p2Color = hex;
            showWaiting('連線中...');
            doJoinRoom();
        }
    }

    // --- 單人練習 (vs AI) ---
    practiceBtn.addEventListener('click', () => {
        pendingMode = 'practice';
        p1Color = null; p2Color = null;
        colorPickTitle.textContent = '選擇你的顏色';
        buildColorGrid(null);
        showColorPick();
    });

    // --- 電腦雙人 ---
    if (localBtn) {
        localBtn.addEventListener('click', () => {
            pendingMode = 'local';
            p1Color = null; p2Color = null;
            colorPickTitle.textContent = 'P1 選擇顏色';
            buildColorGrid(null);
            showColorPick();
        });
    }

    // --- 建立房間 ---
    createBtn.addEventListener('click', () => {
        pendingMode = 'host';
        p1Color = null; p2Color = null;
        isHost = true;
        colorPickTitle.textContent = '選擇你的顏色';
        buildColorGrid(null);
        showColorPick();
    });

    async function doCreateRoom() {
        createBtn.disabled = true;
        try {
            const code = await NetworkManager.createRoom();
            roomCodeDisplay.textContent = code;
            showWaiting('');
            statusText.textContent = '等待對手加入...';
            document.getElementById('code-container').style.display = 'block';
            NetworkManager.onConnect(() => {
                // Send host color to guest
                NetworkManager.send({ type: 'hostColor', color: p1Color });
                startNetGame();
            });
            NetworkManager.onDisconnect(() => { stopGame(); showWaiting('對手已斷線...'); });
        } catch (err) { alert('建立房間失敗：' + err.message); showLobby(); }
        createBtn.disabled = false;
    }

    // --- 加入房間 ---
    joinBtn.addEventListener('click', () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 4) { alert('請輸入 4 碼房間代碼'); return; }
        pendingMode = 'guest';
        p1Color = null; p2Color = null;
        isHost = false;
        colorPickTitle.textContent = '選擇你的顏色';
        buildColorGrid(null);
        showColorPick();
    });

    async function doJoinRoom() {
        const code = roomCodeInput.value.trim().toUpperCase();
        joinBtn.disabled = true;
        try {
            await NetworkManager.joinRoom(code);
            NetworkManager.onDisconnect(() => { stopGame(); showWaiting('連線中斷...'); setTimeout(() => showLobby(), 2000); });
            // Send guest color to host
            NetworkManager.send({ type: 'guestColor', color: p2Color });
            startNetGame();
        } catch (err) { alert('加入房間失敗：' + err.message); showLobby(); }
        joinBtn.disabled = false;
    }

    backBtn.addEventListener('click', () => { NetworkManager.destroy(); stopGame(); showLobby(); });

    function startNetGame() {
        showGame();
        Renderer.init(canvas);
        if (isHost) startHostGame();
        else startGuestGame();
    }

    // ===== 單人練習 (P1 vs AI) =====
    function startPracticeGame() {
        gameState = new GameState(p1Color, p2Color);
        gameState.started = true;
        aiController = new AIController(1);

        Controls.init((action, pressed) => {
            gameState.players[0].applyInput(action, pressed);
        });

        gameLoopId = setInterval(() => {
            aiController.update(gameState);
            gameState.update();
            Renderer.render(gameState.toDict());
        }, 1000 / 60);
    }

    // ===== 電腦雙人 (同一鍵盤) =====
    function startLocalGame() {
        gameState = new GameState(p1Color, p2Color);
        gameState.started = true;

        Controls.initLocal(
            (action, pressed) => { gameState.players[0].applyInput(action, pressed); },
            (action, pressed) => { gameState.players[1].applyInput(action, pressed); }
        );

        gameLoopId = setInterval(() => {
            gameState.update();
            Renderer.render(gameState.toDict());
        }, 1000 / 60);
    }

    // ===== Host 網路 =====
    function startHostGame() {
        // Default colors if not set via network
        if (!p2Color) p2Color = '#ff4444';
        gameState = new GameState(p1Color, p2Color);
        gameState.started = true;

        Controls.init((action, pressed) => {
            gameState.players[0].applyInput(action, pressed);
        });

        NetworkManager.onMessage(data => {
            if (data.type === 'input') gameState.players[1].applyInput(data.action, data.pressed);
            if (data.type === 'guestColor') {
                p2Color = data.color;
                gameState.players[1].color = p2Color;
            }
        });

        gameLoopId = setInterval(() => {
            gameState.update();
            const state = gameState.toDict();
            NetworkManager.send({ type: 'state', ...state });
            Renderer.render(state);
        }, 1000 / 60);
    }

    // ===== Guest 網路 =====
    function startGuestGame() {
        latestState = null;
        Controls.init((action, pressed) => {
            NetworkManager.send({ type: 'input', action, pressed });
        });
        NetworkManager.onMessage(data => {
            if (data.type === 'state') latestState = data;
            if (data.type === 'hostColor') {
                p1Color = data.color;
            }
        });
        function renderLoop() { if (latestState) Renderer.render(latestState); requestAnimationFrame(renderLoop); }
        renderLoop();
    }

    function stopGame() {
        if (gameLoopId) { clearInterval(gameLoopId); gameLoopId = null; }
        gameState = null; latestState = null; aiController = null;
    }

    showLobby();
    window.addEventListener('resize', () => Renderer.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => Renderer.resize(), 100));
})();
