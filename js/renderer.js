/**
 * Triple Choice: Ace Duel - Canvas 渲染引擎
 */

const Renderer = (() => {
    let canvas, ctx;
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 600;

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
    }

    function resize() {
        const controls = document.getElementById('controls');
        const controlsHeight = (controls && !controls.classList.contains('hidden')) ? 120 : 0;
        const availHeight = window.innerHeight - controlsHeight;
        const availWidth = window.innerWidth;

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

    function render(state) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 背景漸層
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        if (!state) return;

        // 平台
        state.platforms.forEach(plat => {
            ctx.fillStyle = '#4a4a6c';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#6a6a8c';
            ctx.fillRect(plat.x, plat.y, plat.w, 3);
        });

        // 地面
        ctx.fillStyle = '#3a3a5c';
        ctx.fillRect(0, 570, GAME_WIDTH, 30);
        ctx.fillStyle = '#4a4a6c';
        ctx.fillRect(0, 570, GAME_WIDTH, 3);

        // 玩家
        state.players.forEach(player => drawPlayer(player));

        // 操控提示
        drawControlHint();
    }

    function drawControlHint() {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← → 移動 | ↑/W 跳躍 | ↓/S 蹲下 | 蹲+跳=前空翻', GAME_WIDTH / 2, 20);
    }

    function drawPlayer(player) {
        ctx.save();

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

        // 邊框
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.w, player.h);

        // 眼睛
        const eyeSize = 5;
        const eyeY = player.y + player.h * 0.3;
        const eyeX = player.facing === 1
            ? player.x + player.w * 0.65
            : player.x + player.w * 0.35 - eyeSize;
        ctx.fillStyle = '#fff';
        ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);

        // 瞳孔
        ctx.fillStyle = '#000';
        ctx.fillRect(eyeX + (player.facing === 1 ? 2 : 0), eyeY + 1, 3, 3);

        // 隊伍標示
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.id === 0 ? 'P1' : 'P2', player.x + player.w / 2, player.y - 5);

        ctx.restore();
    }

    return { init, resize, render };
})();

window.Renderer = Renderer;
