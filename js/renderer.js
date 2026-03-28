/**
 * Triple Choice: Ace Duel - Canvas 渲染引擎
 * 火柴人角色 + HUD 血條 + 武器外觀 + 勝負畫面
 */

const Renderer = (() => {
    let canvas, ctx;
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 600;

    function init(canvasEl) { canvas = canvasEl; ctx = canvas.getContext('2d'); resize(); }

    function resize() {
        const controls = document.getElementById('controls');
        const controlsHeight = (controls && !controls.classList.contains('hidden')) ? 140 : 0;
        const availHeight = window.innerHeight - controlsHeight;
        const availWidth = window.innerWidth;
        const ratio = GAME_WIDTH / GAME_HEIGHT;
        let w, h;
        if (availWidth / availHeight > ratio) { h = availHeight; w = h * ratio; }
        else { w = availWidth; h = w / ratio; }
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        canvas.width = GAME_WIDTH; canvas.height = GAME_HEIGHT;
    }

    function render(state) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        if (!state) return;

        // 平台
        state.platforms.forEach(plat => {
            ctx.fillStyle = '#4a4a6c'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#6a6a8c'; ctx.fillRect(plat.x, plat.y, plat.w, 3);
        });
        // 地面
        ctx.fillStyle = '#3a3a5c'; ctx.fillRect(0, 570, GAME_WIDTH, 30);
        ctx.fillStyle = '#4a4a6c'; ctx.fillRect(0, 570, GAME_WIDTH, 3);

        // 子彈
        if (state.bullets) {
            state.bullets.forEach(b => {
                if (!b.active) return;
                ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
                ctx.fillRect(b.x, b.y, b.w, b.h); ctx.shadowBlur = 0;
            });
        }

        // 玩家
        state.players.forEach(p => drawStickman(p));

        // HUD
        drawHUD(state);

        // 操控提示
        drawControlHint();

        // 回合結束
        if (state.round_over && !state.match_over) {
            drawRoundEnd(state);
        }
        // 比賽結束
        if (state.match_over) {
            drawMatchEnd(state);
        }
    }

    // ===== 火柴人 =====
    function drawStickman(p) {
        ctx.save();
        if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) ctx.globalAlpha = 0.35;
        if (p.hp <= 0) ctx.globalAlpha = 0.2; // 死亡半透明

        const cx = p.x + p.w / 2;
        const bottom = p.y + p.h;
        const h = p.h;
        const headR = h * 0.16;
        const headY = p.y + headR + 2;
        const neckY = headY + headR;
        const hipY = bottom - h * 0.38;
        const shoulderY = neckY + h * 0.06;

        if (p.is_flipping) {
            ctx.translate(cx, p.y + h / 2);
            ctx.rotate(p.flip_angle * Math.PI / 180);
            ctx.translate(-cx, -(p.y + h / 2));
        }

        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // 頭
        ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.stroke();
        const eyeOff = p.facing === 1 ? 3 : -3;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + eyeOff, headY - 1, 2, 0, Math.PI * 2); ctx.fill();

        // 身體
        ctx.beginPath(); ctx.moveTo(cx, neckY); ctx.lineTo(cx, hipY); ctx.stroke();

        // 腿
        const footSpread = h * 0.22;
        let legPhase = 0;
        if (p.on_ground && Math.abs(p.x % 20 - 10) > 0.1) {
            legPhase = Math.sin((p.x / 8) * Math.PI) * 0.3;
        }
        if (p.is_crouching) {
            const kneeY = hipY + (bottom - hipY) * 0.3;
            ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx - footSpread * 1.3, kneeY); ctx.lineTo(cx - footSpread * 0.8, bottom); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx + footSpread * 1.3, kneeY); ctx.lineTo(cx + footSpread * 0.8, bottom); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx - footSpread + legPhase * footSpread, bottom); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx + footSpread - legPhase * footSpread, bottom); ctx.stroke();
        }

        // 手臂 + 武器外觀
        const armLen = h * 0.30;
        drawArmsAndWeapon(p, cx, shoulderY, armLen);

        // 隊伍標示
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(p.id === 0 ? 'P1' : 'P2', cx, p.y - 8);
        ctx.restore();
    }

    function drawArmsAndWeapon(p, cx, shoulderY, armLen) {
        const wpnType = p.weapon_type || 'melee';
        const wpn = p.weapon || 1;

        if (p.is_attacking) {
            if (wpn === 3) {
                // 槍：雙手持槍姿勢
                const gunEnd = cx + p.facing * armLen * 1.6;
                const gunY = shoulderY + 6;
                // 前手
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(gunEnd - p.facing * 8, gunY); ctx.stroke();
                // 後手
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(gunEnd - p.facing * 16, gunY + 2); ctx.stroke();
                // 槍身
                ctx.strokeStyle = '#888'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(cx + p.facing * 5, gunY); ctx.lineTo(gunEnd + p.facing * 5, gunY); ctx.stroke();
                // 槍口火焰
                ctx.fillStyle = '#ff8800';
                ctx.beginPath(); ctx.arc(gunEnd + p.facing * 8, gunY, 4, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = p.color; ctx.lineWidth = 3;
            } else if (wpn === 2) {
                // 劍：揮劍動作
                const swordEnd = cx + p.facing * armLen * 1.8;
                const swordY = shoulderY - 2;
                // 持劍手
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + p.facing * armLen * 0.8, shoulderY + 2); ctx.stroke();
                // 劍身
                ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx + p.facing * armLen * 0.7, shoulderY + 4);
                ctx.lineTo(swordEnd, swordY);
                ctx.stroke();
                // 劍尖
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(swordEnd, swordY - 3);
                ctx.lineTo(swordEnd + p.facing * 8, swordY);
                ctx.lineTo(swordEnd, swordY + 3);
                ctx.fill();
                ctx.strokeStyle = p.color; ctx.lineWidth = 3;
                // 另一隻手
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - p.facing * armLen * 0.5, shoulderY + armLen * 0.8); ctx.stroke();
            } else {
                // 拳頭：出拳
                const fistX = cx + p.facing * armLen * 1.5;
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(fistX, shoulderY + 2); ctx.stroke();
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(fistX, shoulderY + 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - p.facing * armLen * 0.4, shoulderY + armLen * 0.7); ctx.stroke();
            }
        } else {
            // 站立持武器姿勢
            if (wpn === 3) {
                // 持槍待命
                const gunY = shoulderY + 10;
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + p.facing * armLen * 0.6, gunY); ctx.stroke();
                ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx + p.facing * 2, gunY + 2);
                ctx.lineTo(cx + p.facing * armLen * 1.2, gunY - 2);
                ctx.stroke();
                ctx.strokeStyle = p.color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - p.facing * armLen * 0.5, shoulderY + armLen * 0.6); ctx.stroke();
            } else if (wpn === 2) {
                // 持劍待命
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + p.facing * armLen * 0.5, shoulderY + armLen * 0.3); ctx.stroke();
                ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx + p.facing * armLen * 0.4, shoulderY + armLen * 0.4);
                ctx.lineTo(cx + p.facing * armLen * 0.3, shoulderY + armLen * 1.0);
                ctx.stroke();
                ctx.strokeStyle = p.color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - p.facing * armLen * 0.7, shoulderY + armLen * 0.7); ctx.stroke();
            } else {
                // 空手
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - armLen * 0.7, shoulderY + armLen * 0.7); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + armLen * 0.7, shoulderY + armLen * 0.7); ctx.stroke();
            }
        }
    }

    // ===== HUD =====
    function drawHUD(state) {
        const barW = 200, barH = 16, pad = 20;
        const players = state.players;

        players.forEach((p, i) => {
            const x = i === 0 ? pad : GAME_WIDTH - pad - barW;
            const y = 40;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);

            const ratio = Math.max(0, (p.hp || 0) / (p.max_hp || 20));
            const color = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff3333';
            ctx.fillStyle = '#333'; ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = color; ctx.fillRect(x, y, barW * ratio, barH);

            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`${Math.max(0, p.hp || 0)}/${p.max_hp || 20}`, x + barW / 2, y + 13);

            ctx.fillStyle = p.color; ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = i === 0 ? 'left' : 'right';
            ctx.fillText(p.id === 0 ? 'P1 藍隊' : 'P2 紅隊', i === 0 ? x : x + barW, y - 6);

            if (p.weapon_name) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px sans-serif';
                ctx.textAlign = i === 0 ? 'left' : 'right';
                ctx.fillText(`武器: ${p.weapon_name}`, i === 0 ? x : x + barW, y + barH + 16);
            }
        });

        // 比分
        const p1w = state.p1_wins || 0;
        const p2w = state.p2_wins || 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${p1w}  -  ${p2w}`, GAME_WIDTH / 2, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px sans-serif';
        ctx.fillText('五局三勝', GAME_WIDTH / 2, 48);
    }

    function drawRoundEnd(state) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, GAME_HEIGHT / 2 - 50, GAME_WIDTH, 100);

        const winner = state.winner_id;
        const color = winner === 0 ? '#4488ff' : '#ff4444';
        const name = winner === 0 ? 'P1 藍隊' : 'P2 紅隊';

        ctx.fillStyle = color; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${name} 贏得此局！`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5);

        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '16px sans-serif';
        ctx.fillText('準備下一局...', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
    }

    function drawMatchEnd(state) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const winner = state.match_winner;
        const color = winner === 0 ? '#4488ff' : '#ff4444';
        const name = winner === 0 ? 'P1 藍隊' : 'P2 紅隊';

        ctx.fillStyle = color; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${name} 獲勝！`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${state.p1_wins || 0} - ${state.p2_wins || 0}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);

        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '18px sans-serif';
        ctx.fillText('重新整理頁面開始新的比賽', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65);
    }

    function drawControlHint() {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('P1: WASD+G攻擊+1換武器 | P2: 方向鍵+<攻擊+0換武器 | 蹲+跳=前空翻', GAME_WIDTH / 2, GAME_HEIGHT - 8);
    }

    return { init, resize, render };
})();

window.Renderer = Renderer;
