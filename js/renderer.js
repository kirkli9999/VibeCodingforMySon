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
        const controlsHeight = (controls && !controls.classList.contains('hidden')) ? 140 : 0;
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

        // 子彈
        if (state.bullets) {
            state.bullets.forEach(bullet => {
                if (bullet.active) {
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
                    // 子彈尾焰
                    ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
                    const tailX = bullet.x + (bullet.w > 0 ? -6 : 6);
                    ctx.fillRect(tailX, bullet.y, 6, bullet.h);
                }
            });
        }

        // 玩家
        state.players.forEach(player => drawPlayer(player));

        // HUD：血條和武器資訊
        drawHUD(state.players);

        // 操控提示
        drawControlHint();
    }

    function drawHUD(players) {
        const barWidth = 200;
        const barHeight = 16;
        const padding = 20;

        players.forEach((player, i) => {
            const x = i === 0 ? padding : GAME_WIDTH - padding - barWidth;
            const y = 40;

            // 血條背景
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

            // 血條
            const hpRatio = Math.max(0, player.hp / player.max_hp);
            const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = hpColor;
            ctx.fillRect(x, y, barWidth * hpRatio, barHeight);

            // 血量數字
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.max(0, player.hp)}/${player.max_hp}`, x + barWidth / 2, y + 13);

            // 玩家名稱
            ctx.fillStyle = player.color;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = i === 0 ? 'left' : 'right';
            const nameX = i === 0 ? x : x + barWidth;
            ctx.fillText(player.id === 0 ? 'P1 藍隊' : 'P2 紅隊', nameX, y - 6);

            // 武器資訊
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = i === 0 ? 'left' : 'right';
            const wpnX = i === 0 ? x : x + barWidth;
            ctx.fillText(`武器: ${player.weapon_name || '拳頭'} [${player.weapon}]`, wpnX, y + barHeight + 16);
        });
    }

    function drawControlHint() {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WASD移動 | W二段跳 | F攻擊 | G打 | 1/2/3換武器 | 蹲+跳=前空翻', GAME_WIDTH / 2, GAME_HEIGHT - 8);
    }

    function drawPlayer(player) {
        ctx.save();

        // 無敵閃爍效果
        if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

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

        // 攻擊效果
        if (player.is_attacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            const attackX = player.facing === 1 ? player.x + player.w : player.x - 30;
            ctx.strokeRect(attackX, player.y + 10, 30, 20);
        }

        // 拳擊效果
        if (player.is_punching) {
            ctx.fillStyle = 'rgba(255, 150, 0, 0.6)';
            const punchX = player.facing === 1 ? player.x + player.w : player.x - 20;
            ctx.beginPath();
            ctx.arc(punchX + 10, player.y + player.h / 2, 12, 0, Math.PI * 2);
            ctx.fill();
        }

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
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.id === 0 ? 'P1' : 'P2', player.x + player.w / 2, player.y - 5);

        ctx.restore();
    }

    return { init, resize, render };
})();

window.Renderer = Renderer;
