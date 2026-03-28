/**
 * Triple Choice: Ace Duel - 遊戲物理引擎
 * 從 Python game_logic.py 1:1 移植
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

        this.inputs = {
            left: false,
            right: false,
            jump: false,
            crouch: false,
            flip: false,
        };
    }

    applyInput(action, pressed) {
        if (action in this.inputs) {
            this.inputs[action] = pressed;
        }
    }

    update(platforms) {
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

        this.velX = 0;
        if (this.inputs.left) {
            this.velX = -MOVE_SPEED;
            this.facing = -1;
        }
        if (this.inputs.right) {
            this.velX = MOVE_SPEED;
            this.facing = 1;
        }

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

        if (this.inputs.jump && this.onGround && !this.isCrouching) {
            this.velY = JUMP_FORCE;
            this.onGround = false;
        }

        this._applyGravity();
        this._checkCollisions(platforms);
    }

    _startFlip() {
        this.isFlipping = true;
        this.flipTimer = FLIP_DURATION;
        this.flipAngle = 0;
        this.velY = FLIP_JUMP;
        this.velX = FLIP_SPEED * this.facing;
        this.onGround = false;
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
                    break;
                }
            }
        }

        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.velY = 0;
            this.onGround = true;
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
        };
    }
}

class GameState {
    constructor() {
        this.platforms = [
            new Platform(325, 300, 150, 15),
            new Platform(80, 430, 170, 15),
            new Platform(550, 430, 170, 15),
        ];
        this.players = [
            new Player(0, 100, GROUND_Y - PLAYER_HEIGHT, '#4488ff'),
            new Player(1, 660, GROUND_Y - PLAYER_HEIGHT, '#ff4444'),
        ];
        this.started = false;
    }

    update() {
        if (!this.started) return;
        for (const player of this.players) {
            player.update(this.platforms);
        }
    }

    toDict() {
        return {
            players: this.players.map(p => p.toDict()),
            platforms: this.platforms.map(p => p.toDict()),
            started: this.started,
        };
    }
}

window.GameState = GameState;