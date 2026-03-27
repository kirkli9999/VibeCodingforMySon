/**
 * Triple Choice: Ace Duel - 遊戲渲染引擎 + WebSocket 客戶端
 */

(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const statusOverlay = document.getElementById('status-overlay');
    const statusText = document.getElementById('status-text');

    // 遊戲狀態
    let gameState = null;
    let myPlayerId = null;
    let ws = null;
    let connected = false;

    // 畫布邏輯尺寸
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 600;

    // --- WebSocket 連線 ---
    function connect() {
        const wsHost = window.location.hostname || 'localhost';
        const wsUrl = `ws://${wsHost}:8765`;

        statusText.textContent = '連線中...';
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            connected = true;
            statusText.textContent = '等待對手加入...';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                statusText.textContent = data.error;
                return;
            }

            if (data.type === 'assigned') {
                myPlayerId = data.player_id;
                statusText.textContent = `你是${myPlayerId === 0 ? '🔵 藍隊' : '🔴 紅隊'}！等待對手...`;
                return;
            }

            // 遊戲狀態更新
            gameState = data;
            if (data.started) {
                statusOverlay.classList.add('hidden');
            } else {
                statusOverlay.classList.remove('hidden');
                statusText.textContent = `你是${myPlayerId === 0 ? '🔵 藍隊' : '🔴 紅隊'}！等待對手...`;
            }
        };

        ws.onclose = () => {
            connected = false;
            statusOverlay.classList.remove('hidden');
            statusText.textContent = '連線中斷，重新連線中...';
            setTimeout(connect, 2000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }

    function sendInput(action, pressed) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, pressed }));
        }
    }

    // --- 畫面渲染 ---
    function resizeCanvas() {
        const controlsHeight = document.getElementById('controls').classList.contains('hidden') ? 0 : 120;
        const availHeight = window.innerHeight - controlsHeight;
        const availWidth = window.innerWidth;

        // 維持 4:3 比例
        const ratio = GAME_WIDTH / GAME_HEIGHT;
        let w, h;
        if (availWidth / availHeight > ratio) {
            h = availHeight;
            w = h * ratio;
        } else {
            w = availWidth;
            h = w / ratio;
        }

        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
    }

    function render() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 背景漸層
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        if (!gameState) {
            requestAnimationFrame(render);
            return;
        }

        // 繪製平台
        gameState.platforms.forEach(plat => {
            drawPlatform(plat);
        });

        // 繪製地面
        ctx.fillStyle = '#3a3a5c';
        ctx.fillRect(0, 570, GAME_WIDTH, 30);
        ctx.fillStyle = '#4a4a6c';
        ctx.fillRect(0, 570, GAME_WIDTH, 3);

        // 繪製玩家
        gameState.players.forEach(player => {
            drawPlayer(player);
        });

        requestAnimationFrame(render);
    }

    function drawPlatform(plat) {
        // 平台本體
        ctx.fillStyle = '#4a4a6c';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // 平台頂部高光
        ctx.fillStyle = '#6a6a8c';
        ctx.fillRect(plat.x, plat.y, plat.w, 3);
    }

    function drawPlayer(player) {
        ctx.save();

        // 前空翻旋轉
        if (player.is_flipping) {
            const cx = player.x + player.w / 2;
            const cy = player.y + player.h / 2;
            ctx.translate(cx, cy);
            ctx.rotate(player.flip_angle * Math.PI / 180);
            ctx.translate(-cx, -cy);
        }

        // 身體
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.w, player.h);

        // 身體邊框
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.w, player.h);

        // 眼睛 (表示朝向)
        const eyeSize = 5;
        const eyeY = player.y + player.h * 0.3;
        let eyeX;
        if (player.facing === 1) {
            eyeX = player.x + player.w * 0.65;
        } else {
            eyeX = player.x + player.w * 0.35 - eyeSize;
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);

        // 瞳孔
        const pupilSize = 3;
        const pupilOffsetX = player.facing === 1 ? 2 : 0;
        ctx.fillStyle = '#000';
        ctx.fillRect(eyeX + pupilOffsetX, eyeY + 1, pupilSize, pupilSize);

        // 隊伍標示
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const label = player.id === 0 ? 'P1' : 'P2';
        ctx.fillText(label, player.x + player.w / 2, player.y - 5);

        ctx.restore();
    }

    // --- 初始化 ---
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 100);
    });

    resizeCanvas();
    Controls.init(sendInput);
    connect();
    render();
})();
