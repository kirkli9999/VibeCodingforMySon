/**
 * Triple Choice: Ace Duel - Canvas 渲染引擎
 * 火柴人角色 + HUD 血條 + 子彈渲染
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
                    ctx.shadowColor = '#ffaa00';
                    ctx.shadowBlur = 6;
                    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
                    ctx.shadowBlur = 0;
                }
            });
        }

        // 玩家（火柴人）
        state.players.forEach(player => drawStickman(player));

        // HUD
        drawHUD(state.players);

        // 操控提示
        drawControlHint();
    }

    // ===== 火柴人繪製 =====
    function drawStickman(p) {
        ctx.save();

        // 無敵閃爍
        if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        // 碰撞框的中心與底部
        const cx = p.x + p.w / 2;
        const bottom = p.y + p.h;

        // 火柴人比例（基於碰撞框高度）
        const h = p.h;             // 總高度
        const headR = h * 0.16;    // 頭半徑
        const headY = p.y + headR + 2;
        const neckY = headY + headR;
        const hipY = bottom - h * 0.38;
        const shoulderY = neckY + h * 0.06;

        // 前空翻旋轉
        if (p.is_flipping) {
            ctx.translate(cx, p.y + h / 2);
            ctx.rotate(p.flip_angle * Math.PI / 180);
            ctx.translate(-cx, -(p.y + h / 2));
        }

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // --- 頭 ---
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.stroke();

        // 眼睛
        const eyeOff = p.facing === 1 ? 3 : -3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + eyeOff, headY - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        // --- 身體 ---
        ctx.beginPath();
        ctx.moveTo(cx, neckY);
        ctx.lineTo(cx, hipY);
        ctx.stroke();

        // --- 腿 ---
        const footSpread = h * 0.22;
        const legLen = bottom - hipY;

        // 簡單走路動畫
        let legPhase = 0;
        if (Math.abs(p.x % 20 - 10) > 0.1 && p.on_ground) {
            legPhase = Math.sin((p.x / 8) * Math.PI) * 0.3;
        }

        // 蹲下時腿彎曲
        if (p.is_crouching) {
            const kneeY = hipY + legLen * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - footSpread * 1.3, kneeY);
            ctx.lineTo(cx - footSpread * 0.8, bottom);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + footSpread * 1.3, kneeY);
            ctx.lineTo(cx + footSpread * 0.8, bottom);
            ctx.stroke();
        } else {
            // 左腿
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - footSpread + legPhase * footSpread, bottom);
            ctx.stroke();
            // 右腿
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + footSpread - legPhase * footSpread, bottom);
            ctx.stroke();
        }

        // --- 手臂 ---
        const armLen = h * 0.30;

        if (p.is_attacking) {
            // 攻擊動作：武器手伸直朝前
            const weaponX = cx + p.facing * armLen * 1.4;
            const weaponY = shoulderY + 4;
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(weaponX, weaponY);
            ctx.stroke();

            // 武器視覺
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(weaponX, weaponY - 6);
            ctx.lineTo(weaponX + p.facing * 12, weaponY);
            ctx.lineTo(weaponX, weaponY + 6);
            ctx.stroke();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;

            // 另一隻手自然下垂
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx - p.facing * armLen * 0.5, shoulderY + armLen * 0.8);
            ctx.stroke();
        } else if (p.is_punching) {
            // 拳擊動作：拳頭伸出
            const fistX = cx + p.facing * armLen * 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(fistX, shoulderY + 2);
            ctx.stroke();

            // 拳頭
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(fistX, shoulderY + 2, 5, 0, Math.PI * 2);
            ctx.fill();

            // 另一隻手
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx - p.facing * armLen * 0.4, shoulderY + armLen * 0.7);
            ctx.stroke();
        } else {
            // 正常站姿：雙手微張
            // 左手
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx - armLen * 0.7, shoulderY + armLen * 0.7);
            ctx.stroke();
            // 右手
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx + armLen * 0.7, shoulderY + armLen * 0.7);
            ctx.stroke();
        }

        // --- 隊伍標示 ---
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.id === 0 ? 'P1' : 'P2', cx, p.y - 8);

        ctx.restore();
    }

    // ===== HUD 血條 =====
    function drawHUD(players) {
        const barW = 200;
        const barH = 16;
        const pad = 20;

        players.forEach((p, i) => {
            const x = i === 0 ? pad : GAME_WIDTH - pad - barW;
            const y = 40;

            // 背景
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);

            // 血條
            const ratio = Math.max(0, (p.hp || 0) / (p.max_hp || 20));
            const color = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff3333';
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW * ratio, barH);

            // 血量文字
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.max(0, p.hp || 0)}/${p.max_hp || 20}`, x + barW / 2, y + 13);

            // 玩家名稱
            ctx.fillStyle = p.color;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = i === 0 ? 'left' : 'right';
            ctx.fillText(p.id === 0 ? 'P1 藍隊' : 'P2 紅隊', i === 0 ? x : x + barW, y - 6);

            // 武器
            if (p.weapon_name) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '12px sans-serif';
                ctx.textAlign = i === 0 ? 'left' : 'right';
                ctx.fillText(`武器: ${p.weapon_name} [${p.weapon}]`, i === 0 ? x : x + barW, y + barH + 16);
            }
        });
    }

    function drawControlHint() {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WASD移動 | W二段跳 | F攻擊 | G打 | 1/2/3換武器 | 蹲+跳=前空翻', GAME_WIDTH / 2, GAME_HEIGHT - 8);
    }

    return { init, resize, render };
})();

window.Renderer = Renderer;
