/**
 * Triple Choice: Ace Duel - 遊戲物理引擎
 * 從 Python game_logic.py 移植並擴充
 */

// --- 物理常數 ---
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

// --- 武器定義 ---
const WEAPONS = {
    1: { name: '拳頭', range: 50, damage: 1, cooldown: 15, type: 'melee' },
    2: { name: '劍', range: 80, damage: 2, cooldown: 25, type: 'melee' },
    3: { name: '槍', range: 300, damage: 3, cooldown: 45, type: 'ranged', bulletSpeed: 10 },
};

class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    toDict() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }
}

class Bullet {
    constructor(x, y, direction, ownerId) {
        this.x = x;
        this.y = y;
        this.velX = WEAPONS[3].bulletSpeed * direction;
        this.width = 8;
        this.height = 4;
        this.ownerId = ownerId;
        this.active = true;
    }

    update() {
        this.x += this.velX;
        if (this.x < -10 || this.x > CANVAS_WIDTH + 10) {
            this.active = false;
        }
    }

    toDict() {
        return {
            x: this.x, y: this.y,
            w: this.width, h: this.height,
            owner: this.ownerId, active: this.active,
        };
    }
}

class Player {
    constructor(playerId, x, y, color) {
        this.id = playerId;
        this.x = x;
        this.y = y;
        this.color = color;
        this.velX = 0;
        this.velY = 0;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.onGround = true;
        this.isCrouching = false;
        this.isFlipping = false;
        this.facing = playerId === 0 ? 1 : -1;
        this.flipTimer = 0;
        this.flipAngle = 0;

        // 血量
        this.hp = MAX_HP;

        // 二段跳
        this.jumpCount = 0;
        this.maxJumps = 2;

        // 武器系統
        this.weapon = 1;  // 預設拳頭
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.punchCooldown = 0;
        this.isPunching = false;
        this.punchTimer = 0;

        // 無敵幀（被打後短暫無敵）
        this.invincible = 0;

        this.inputs = {
            left: false,
            right: false,
            jump: false,
            crouch: false,
            flip: false,
            attack: false,
            punch: false,
            weapon1: false,
            weapon2: false,
            weapon3: false,
        };
    }

    applyInput(action, pressed) {
        if (action in this.inputs) {
            this.inputs[action] = pressed;
        }
    }

    update(platforms, opponents, bullets) {
        // 無敵幀倒數
        if (this.invincible > 0) this.invincible--;

        // 攻擊冷卻
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.punchCooldown > 0) this.punchCooldown--;
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer <= 0) this.isAttacking = false;
        }
        if (this.punchTimer > 0) {
            this.punchTimer--;
            if (this.punchTimer <= 0) this.isPunching = false;
        }

        // 切換武器
        if (this.inputs.weapon1) { this.weapon = 1; this.inputs.weapon1 = false; }
        if (this.inputs.weapon2) { this.weapon = 2; this.inputs.weapon2 = false; }
        if (this.inputs.weapon3) { this.weapon = 3; this.inputs.weapon3 = false; }

        // 攻擊（F 鍵 - 使用武器）
        if (this.inputs.attack && this.attackCooldown <= 0) {
            this.inputs.attack = false;
            this._doAttack(opponents, bullets);
        }

        // 打（G 鍵 - 近身拳擊）
        if (this.inputs.punch && this.punchCooldown <= 0) {
            this.inputs.punch = false;
            this._doPunch(opponents);
        }

        if (this.isFlipping) {
            this._updateFlip();
            this._applyGravity();
            this._checkCollisions(platforms);
            return;
        }

        if (this.inputs.flip && this.onGround) {
            this._startFlip();
            this.inputs.flip = false;
            this._applyGravity();
            this._checkCollisions(platforms);
            return;
        }

        // 水平移動
        this.velX = 0;
        if (this.inputs.left) {
            this.velX = -MOVE_SPEED;
            this.facing = -1;
        }
        if (this.inputs.right) {
            this.velX = MOVE_SPEED;
            this.facing = 1;
        }

        // 蹲下
        const wasCrouching = this.isCrouching;
        this.isCrouching = this.inputs.crouch && this.onGround;
        if (this.isCrouching) {
            this.velX = 0;
            this.height = CROUCH_HEIGHT;
            if (!wasCrouching) {
                this.y += PLAYER_HEIGHT - CROUCH_HEIGHT;
            }
        } else if (wasCrouching) {
            this.y -= PLAYER_HEIGHT - CROUCH_HEIGHT;
            this.height = PLAYER_HEIGHT;
        }

        // 跳躍（支援二段跳）
        if (this.inputs.jump && !this.isCrouching && this.jumpCount < this.maxJumps) {
            this.velY = JUMP_FORCE;
            this.onGround = false;
            this.jumpCount++;
            this.inputs.jump = false;  // 避免連續觸發
        }

        this._applyGravity();
        this._checkCollisions(platforms);
    }

    _doAttack(opponents, bullets) {
        const wpn = WEAPONS[this.weapon];
        this.attackCooldown = wpn.cooldown;
        this.isAttacking = true;
        this.attackTimer = 10;

        if (wpn.type === 'ranged') {
            // 遠程：發射子彈
            const bx = this.facing === 1 ? this.x + this.width : this.x - 8;
            const by = this.y + this.height / 2;
            bullets.push(new Bullet(bx, by, this.facing, this.id));
        } else {
            // 近戰：範圍判定
            this._meleeHit(opponents, wpn.range, wpn.damage);
        }
    }

    _doPunch(opponents) {
        this.punchCooldown = 15;
        this.isPunching = true;
        this.punchTimer = 8;
        this._meleeHit(opponents, 50, 1);
    }

    _meleeHit(opponents, range, damage) {
        for (const opp of opponents) {
            if (opp.id === this.id) continue;
            if (opp.invincible > 0) continue;

            const myCenter = this.x + this.width / 2;
            const oppCenter = opp.x + opp.width / 2;
            const dist = Math.abs(myCenter - oppCenter);
            const direction = oppCenter > myCenter ? 1 : -1;

            // 必須面對對手方向
            if (direction !== this.facing) continue;

            if (dist <= range && Math.abs(this.y - opp.y) < 60) {
                opp.hp -= damage;
                opp.invincible = 30;  // 0.5秒無敵
                // 擊退
                opp.velX = 6 * this.facing;
                opp.velY = -4;
                opp.onGround = false;
            }
        }
    }

    _startFlip() {
        this.isFlipping = true;
        this.flipTimer = FLIP_DURATION;
        this.flipAngle = 0;
        this.velY = FLIP_JUMP;
        this.velX = FLIP_SPEED * this.facing;
        this.onGround = false;
        this.jumpCount = this.maxJumps;  // 空翻消耗所有跳躍
        if (this.isCrouching) {
            this.y -= PLAYER_HEIGHT - CROUCH_HEIGHT;
            this.height = PLAYER_HEIGHT;
            this.isCrouching = false;
        }
    }

    _updateFlip() {
        this.flipTimer -= 1;
        this.flipAngle = 360 * (1 - this.flipTimer / FLIP_DURATION);
        this.velX = FLIP_SPEED * this.facing;

        if (this.flipTimer <= 0) {
            this.isFlipping = false;
            this.flipAngle = 0;
            this.velX = 0;
        }
    }

    _applyGravity() {
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;
    }

    _checkCollisions(platforms) {
        this.onGround = false;

        for (const plat of platforms) {
            if (this.velY >= 0) {
                const playerBottom = this.y + this.height;
                if (playerBottom >= plat.y &&
                    playerBottom <= plat.y + plat.height + this.velY &&
                    this.x + this.width > plat.x &&
                    this.x < plat.x + plat.width) {
                    this.y = plat.y - this.height;
                    this.velY = 0;
                    this.onGround = true;
                    this.jumpCount = 0;  // 落地重置跳躍次數
                    break;
                }
            }
        }

        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.velY = 0;
            this.onGround = true;
            this.jumpCount = 0;
        }
    }

    toDict() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height,
            color: this.color,
            facing: this.facing,
            is_flipping: this.isFlipping,
            flip_angle: this.flipAngle,
            is_crouching: this.isCrouching,
            on_ground: this.onGround,
            hp: this.hp,
            max_hp: MAX_HP,
            weapon: this.weapon,
            weapon_name: WEAPONS[this.weapon].name,
            is_attacking: this.isAttacking,
            is_punching: this.isPunching,
            invincible: this.invincible,
            jump_count: this.jumpCount,
        };
    }
}

class GameState {
    constructor() {
        this.platforms = [
            new Platform(325, 300, 150, 15),   // 中央高台
            new Platform(80, 430, 170, 15),     // 左台（出場點）
            new Platform(550, 430, 170, 15),    // 右台（出場點）
        ];
        // 玩家從左右平台出場
        this.players = [
            new Player(0, 120, 430 - PLAYER_HEIGHT, '#4488ff'),   // P1 在左台上
            new Player(1, 600, 430 - PLAYER_HEIGHT, '#ff4444'),   // P2 在右台上
        ];
        this.bullets = [];
        this.started = false;
    }

    update() {
        if (!this.started) return;

        // 更新子彈
        for (const bullet of this.bullets) {
            bullet.update();
            // 子彈碰撞檢測
            for (const player of this.players) {
                if (player.id === bullet.ownerId) continue;
                if (player.invincible > 0) continue;
                if (!bullet.active) continue;
                if (bullet.x < player.x + player.width &&
                    bullet.x + bullet.width > player.x &&
                    bullet.y < player.y + player.height &&
                    bullet.y + bullet.height > player.y) {
                    player.hp -= WEAPONS[3].damage;
                    player.invincible = 30;
                    player.velX = (bullet.velX > 0 ? 1 : -1) * 4;
                    player.velY = -3;
                    player.onGround = false;
                    bullet.active = false;
                }
            }
        }
        // 移除失效子彈
        this.bullets = this.bullets.filter(b => b.active);

        for (const player of this.players) {
            player.update(this.platforms, this.players, this.bullets);
        }
    }

    toDict() {
        return {
            players: this.players.map(p => p.toDict()),
            platforms: this.platforms.map(p => p.toDict()),
            bullets: this.bullets.map(b => b.toDict()),
            started: this.started,
        };
    }
}

window.GameState = GameState;
window.WEAPONS = WEAPONS;
window.MAX_HP = MAX_HP;
