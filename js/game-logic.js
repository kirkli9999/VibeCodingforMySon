/**
 * Triple Choice: Ace Duel - 遊戲物理引擎
 */

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 54;
const CROUCH_HEIGHT = 30;
const FLIP_DURATION = 24;
const FLIP_SPEED = 10;
const FLIP_JUMP = -8;
const GROUND_Y = 570;
const MAX_HP = 20;
const WEAPON_COUNT = 3;

const WEAPONS = {
    1: { name: '拳頭', range: 50, damage: 1, cooldown: 15, type: 'melee' },
    2: { name: '劍', range: 80, damage: 2, cooldown: 25, type: 'melee' },
    3: { name: '槍', range: 300, damage: 3, cooldown: 45, type: 'ranged', bulletSpeed: 10 },
};

class Platform {
    constructor(x, y, width, height) {
        this.x = x; this.y = y; this.width = width; this.height = height;
    }
    toDict() { return { x: this.x, y: this.y, w: this.width, h: this.height }; }
}

class Bullet {
    constructor(x, y, direction, ownerId) {
        this.x = x; this.y = y;
        this.velX = WEAPONS[3].bulletSpeed * direction;
        this.width = 8; this.height = 4;
        this.ownerId = ownerId; this.active = true;
    }
    update() {
        this.x += this.velX;
        if (this.x < -10 || this.x > CANVAS_WIDTH + 10) this.active = false;
    }
    toDict() {
        return { x: this.x, y: this.y, w: this.width, h: this.height, owner: this.ownerId, active: this.active };
    }
}

class Player {
    constructor(playerId, x, y, color) {
        this.id = playerId;
        this.x = x; this.y = y; this.color = color;
        this.velX = 0; this.velY = 0;
        this.width = PLAYER_WIDTH; this.height = PLAYER_HEIGHT;
        this.onGround = true;
        this.isCrouching = false; this.isFlipping = false;
        this.facing = playerId === 0 ? 1 : -1;
        this.flipTimer = 0; this.flipAngle = 0;
        this.hp = MAX_HP;
        this.jumpCount = 0; this.maxJumps = 2;
        this.weapon = 1;
        this.attackCooldown = 0; this.isAttacking = false; this.attackTimer = 0;
        this.invincible = 0;
        this.inputs = {
            left: false, right: false, jump: false, crouch: false, flip: false,
            attack: false, switchWeapon: false,
        };
    }

    applyInput(action, pressed) {
        if (action in this.inputs) this.inputs[action] = pressed;
    }

    update(platforms, opponents, bullets) {
        if (this.hp <= 0) return; // 死亡不更新

        if (this.invincible > 0) this.invincible--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer <= 0) this.isAttacking = false;
        }

        // 切換武器（循環 1→2→3→1）
        if (this.inputs.switchWeapon) {
            this.inputs.switchWeapon = false;
            this.weapon = (this.weapon % WEAPON_COUNT) + 1;
        }

        // 攻擊
        if (this.inputs.attack && this.attackCooldown <= 0) {
            this.inputs.attack = false;
            this._doAttack(opponents, bullets);
        }

        if (this.isFlipping) {
            this._updateFlip(); this._applyGravity(); this._checkCollisions(platforms); return;
        }
        if (this.inputs.flip && this.onGround) {
            this._startFlip(); this.inputs.flip = false;
            this._applyGravity(); this._checkCollisions(platforms); return;
        }

        this.velX = 0;
        if (this.inputs.left) { this.velX = -MOVE_SPEED; this.facing = -1; }
        if (this.inputs.right) { this.velX = MOVE_SPEED; this.facing = 1; }

        const wasCrouching = this.isCrouching;
        this.isCrouching = this.inputs.crouch && this.onGround;
        if (this.isCrouching) {
            this.velX = 0; this.height = CROUCH_HEIGHT;
            if (!wasCrouching) this.y += PLAYER_HEIGHT - CROUCH_HEIGHT;
        } else if (wasCrouching) {
            this.y -= PLAYER_HEIGHT - CROUCH_HEIGHT; this.height = PLAYER_HEIGHT;
        }

        if (this.inputs.jump && !this.isCrouching && this.jumpCount < this.maxJumps) {
            this.velY = JUMP_FORCE; this.onGround = false;
            this.jumpCount++; this.inputs.jump = false;
        }

        this._applyGravity(); this._checkCollisions(platforms);
    }

    _doAttack(opponents, bullets) {
        const wpn = WEAPONS[this.weapon];
        this.attackCooldown = wpn.cooldown;
        this.isAttacking = true;
        this.attackTimer = 10;
        if (wpn.type === 'ranged') {
            const bx = this.facing === 1 ? this.x + this.width : this.x - 8;
            bullets.push(new Bullet(bx, this.y + this.height / 2, this.facing, this.id));
        } else {
            this._meleeHit(opponents, wpn.range, wpn.damage);
        }
    }

    _meleeHit(opponents, range, damage) {
        for (const opp of opponents) {
            if (opp.id === this.id || opp.invincible > 0 || opp.hp <= 0) continue;
            const myCenter = this.x + this.width / 2;
            const oppCenter = opp.x + opp.width / 2;
            const dist = Math.abs(myCenter - oppCenter);
            const dir = oppCenter > myCenter ? 1 : -1;
            if (dir !== this.facing) continue;
            if (dist <= range && Math.abs(this.y - opp.y) < 60) {
                opp.hp -= damage; opp.invincible = 30;
                opp.velX = 6 * this.facing; opp.velY = -4; opp.onGround = false;
            }
        }
    }

    _startFlip() {
        this.isFlipping = true; this.flipTimer = FLIP_DURATION; this.flipAngle = 0;
        this.velY = FLIP_JUMP; this.velX = FLIP_SPEED * this.facing;
        this.onGround = false; this.jumpCount = this.maxJumps;
        if (this.isCrouching) {
            this.y -= PLAYER_HEIGHT - CROUCH_HEIGHT; this.height = PLAYER_HEIGHT; this.isCrouching = false;
        }
    }

    _updateFlip() {
        this.flipTimer--;
        this.flipAngle = 360 * (1 - this.flipTimer / FLIP_DURATION);
        this.velX = FLIP_SPEED * this.facing;
        if (this.flipTimer <= 0) { this.isFlipping = false; this.flipAngle = 0; this.velX = 0; }
    }

    _applyGravity() {
        this.velY += GRAVITY; this.x += this.velX; this.y += this.velY;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;
    }

    _checkCollisions(platforms) {
        this.onGround = false;
        for (const plat of platforms) {
            if (this.velY >= 0) {
                const pb = this.y + this.height;
                if (pb >= plat.y && pb <= plat.y + plat.height + this.velY &&
                    this.x + this.width > plat.x && this.x < plat.x + plat.width) {
                    this.y = plat.y - this.height; this.velY = 0;
                    this.onGround = true; this.jumpCount = 0; break;
                }
            }
        }
        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height; this.velY = 0;
            this.onGround = true; this.jumpCount = 0;
        }
    }

    toDict() {
        return {
            id: this.id, x: this.x, y: this.y, w: this.width, h: this.height,
            color: this.color, facing: this.facing,
            is_flipping: this.isFlipping, flip_angle: this.flipAngle,
            is_crouching: this.isCrouching, on_ground: this.onGround,
            hp: this.hp, max_hp: MAX_HP,
            weapon: this.weapon, weapon_name: WEAPONS[this.weapon].name,
            weapon_type: WEAPONS[this.weapon].type,
            is_attacking: this.isAttacking,
            invincible: this.invincible, jump_count: this.jumpCount,
        };
    }
}

// ===== AI 電腦玩家 =====
class AIController {
    constructor(playerId) {
        this.playerId = playerId;
        this.tickCounter = 0;
        this.actionTimer = 0;
        this.currentAction = null;
    }

    update(gameState) {
        this.tickCounter++;
        const me = gameState.players[this.playerId];
        const opp = gameState.players[1 - this.playerId];
        if (me.hp <= 0) return;

        // 每 10~30 幀做一次決策
        if (this.actionTimer > 0) { this.actionTimer--; return; }
        this.actionTimer = 10 + Math.floor(Math.random() * 20);

        // 清除所有輸入
        for (const key in me.inputs) me.inputs[key] = false;

        const myX = me.x + me.width / 2;
        const oppX = opp.x + opp.width / 2;
        const dist = Math.abs(myX - oppX);
        const oppDir = oppX > myX ? 1 : -1;

        // 面向對手
        me.facing = oppDir;
        if (oppDir === 1) me.inputs.right = true;
        else me.inputs.left = true;

        // 攻擊範圍內
        const wpn = WEAPONS[me.weapon];
        if (dist < wpn.range + 10) {
            me.inputs.left = false;
            me.inputs.right = false;
            if (me.attackCooldown <= 0 && Math.random() < 0.6) {
                me.inputs.attack = true;
            }
            // 隨機閃避
            if (Math.random() < 0.2) {
                me.inputs.jump = true;
            }
            if (Math.random() < 0.1) {
                me.inputs.crouch = true;
            }
        }

        // 被攻擊時隨機跳躍閃避
        if (me.invincible > 0 && Math.random() < 0.5) {
            me.inputs.jump = true;
        }

        // 偶爾切換武器
        if (Math.random() < 0.02) {
            me.inputs.switchWeapon = true;
        }

        // 如果在平台下方，跳上去
        if (!me.onGround && me.velY > 0) {
            // 落地中，不做額外動作
        } else if (Math.random() < 0.05) {
            me.inputs.jump = true;
        }
    }
}

// ===== 遊戲狀態 =====
class GameState {
    constructor() {
        this.platforms = [
            new Platform(325, 300, 150, 15),
            new Platform(80, 430, 170, 15),
            new Platform(550, 430, 170, 15),
        ];
        this.players = [
            new Player(0, 120, 430 - PLAYER_HEIGHT, '#4488ff'),
            new Player(1, 600, 430 - PLAYER_HEIGHT, '#ff4444'),
        ];
        this.bullets = [];
        this.started = false;

        // 勝負系統
        this.roundOver = false;
        this.winnerId = -1;
        this.roundEndTimer = 0;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.matchOver = false;
        this.matchWinner = -1;
    }

    resetRound() {
        this.players[0].x = 120; this.players[0].y = 430 - PLAYER_HEIGHT;
        this.players[1].x = 600; this.players[1].y = 430 - PLAYER_HEIGHT;
        for (const p of this.players) {
            p.hp = MAX_HP; p.velX = 0; p.velY = 0;
            p.onGround = true; p.isCrouching = false; p.isFlipping = false;
            p.weapon = 1; p.attackCooldown = 0; p.isAttacking = false;
            p.invincible = 0; p.jumpCount = 0; p.height = PLAYER_HEIGHT;
            p.facing = p.id === 0 ? 1 : -1;
            for (const k in p.inputs) p.inputs[k] = false;
        }
        this.bullets = [];
        this.roundOver = false;
        this.winnerId = -1;
        this.roundEndTimer = 0;
    }

    update() {
        if (!this.started || this.matchOver) return;

        // 回合結束倒數
        if (this.roundOver) {
            this.roundEndTimer--;
            if (this.roundEndTimer <= 0) {
                // 檢查是否五局三勝
                if (this.p1Wins >= 3) {
                    this.matchOver = true; this.matchWinner = 0;
                } else if (this.p2Wins >= 3) {
                    this.matchOver = true; this.matchWinner = 1;
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        // 子彈更新
        for (const bullet of this.bullets) {
            bullet.update();
            for (const player of this.players) {
                if (player.id === bullet.ownerId || player.invincible > 0 || !bullet.active || player.hp <= 0) continue;
                if (bullet.x < player.x + player.width && bullet.x + bullet.width > player.x &&
                    bullet.y < player.y + player.height && bullet.y + bullet.height > player.y) {
                    player.hp -= WEAPONS[3].damage; player.invincible = 30;
                    player.velX = (bullet.velX > 0 ? 1 : -1) * 4;
                    player.velY = -3; player.onGround = false; bullet.active = false;
                }
            }
        }
        this.bullets = this.bullets.filter(b => b.active);

        for (const player of this.players) {
            player.update(this.platforms, this.players, this.bullets);
        }

        // 檢查勝負
        for (const p of this.players) {
            if (p.hp <= 0) {
                this.roundOver = true;
                this.winnerId = 1 - p.id; // 對手贏
                this.roundEndTimer = 120; // 2 秒後下一局
                if (this.winnerId === 0) this.p1Wins++;
                else this.p2Wins++;
                break;
            }
        }
    }

    toDict() {
        return {
            players: this.players.map(p => p.toDict()),
            platforms: this.platforms.map(p => p.toDict()),
            bullets: this.bullets.map(b => b.toDict()),
            started: this.started,
            round_over: this.roundOver,
            winner_id: this.winnerId,
            p1_wins: this.p1Wins,
            p2_wins: this.p2Wins,
            match_over: this.matchOver,
            match_winner: this.matchWinner,
        };
    }
}

window.GameState = GameState;
window.AIController = AIController;
window.WEAPONS = WEAPONS;
window.MAX_HP = MAX_HP;
