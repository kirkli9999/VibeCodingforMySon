"""
Triple Choice: Ace Duel - Game Physics Engine
遊戲物理引擎：重力、碰撞、玩家狀態管理
"""

# --- 物理常數 ---
CANVAS_WIDTH = 800
CANVAS_HEIGHT = 600
GRAVITY = 0.6
JUMP_FORCE = -12
MOVE_SPEED = 5
PLAYER_WIDTH = 36
PLAYER_HEIGHT = 54
CROUCH_HEIGHT = 30
FLIP_DURATION = 24  # 幀數 (~0.4秒 at 60fps)
FLIP_SPEED = 10     # 前空翻水平速度
FLIP_JUMP = -8      # 前空翻垂直力
GROUND_Y = 570      # 地面 Y 座標


class Platform:
    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    def to_dict(self):
        return {"x": self.x, "y": self.y, "w": self.width, "h": self.height}


class Player:
    def __init__(self, player_id, x, y, color):
        self.id = player_id
        self.x = x
        self.y = y
        self.color = color
        self.vel_x = 0
        self.vel_y = 0
        self.width = PLAYER_WIDTH
        self.height = PLAYER_HEIGHT
        self.on_ground = True  # 玩家初始在地面上
        self.is_crouching = False
        self.is_flipping = False
        self.facing = 1 if player_id == 0 else -1  # 藍朝右, 紅朝左
        self.flip_timer = 0
        self.flip_angle = 0

        # 當前按下的按鍵
        self.inputs = {
            "left": False,
            "right": False,
            "jump": False,
            "crouch": False,
            "flip": False,
        }

    def apply_input(self, action, pressed):
        """處理玩家輸入 (按下/放開)"""
        if action in self.inputs:
            self.inputs[action] = pressed

    def update(self, platforms):
        """每幀更新玩家狀態"""
        if self.is_flipping:
            self._update_flip()
            self._apply_gravity()
            self._check_collisions(platforms)
            return

        # 處理前空翻觸發：蹲下時按跳
        if self.inputs["flip"] and self.on_ground:
            self._start_flip()
            self.inputs["flip"] = False
            self._apply_gravity()
            self._check_collisions(platforms)
            return

        # 水平移動
        self.vel_x = 0
        if self.inputs["left"]:
            self.vel_x = -MOVE_SPEED
            self.facing = -1
        if self.inputs["right"]:
            self.vel_x = MOVE_SPEED
            self.facing = 1

        # 蹲下
        was_crouching = self.is_crouching
        self.is_crouching = self.inputs["crouch"] and self.on_ground
        if self.is_crouching:
            self.vel_x = 0  # 蹲下時不能移動
            self.height = CROUCH_HEIGHT
            if not was_crouching:
                # 蹲下時調整 y 座標讓腳保持在地面
                self.y += PLAYER_HEIGHT - CROUCH_HEIGHT
        elif was_crouching:
            self.y -= PLAYER_HEIGHT - CROUCH_HEIGHT
            self.height = PLAYER_HEIGHT

        # 跳躍
        if self.inputs["jump"] and self.on_ground and not self.is_crouching:
            self.vel_y = JUMP_FORCE
            self.on_ground = False

        self._apply_gravity()
        self._check_collisions(platforms)

    def _start_flip(self):
        """啟動前空翻"""
        self.is_flipping = True
        self.flip_timer = FLIP_DURATION
        self.flip_angle = 0
        self.vel_y = FLIP_JUMP
        self.vel_x = FLIP_SPEED * self.facing
        self.on_ground = False
        # 如果正在蹲下，恢復正常高度
        if self.is_crouching:
            self.y -= PLAYER_HEIGHT - CROUCH_HEIGHT
            self.height = PLAYER_HEIGHT
            self.is_crouching = False

    def _update_flip(self):
        """更新前空翻動畫"""
        self.flip_timer -= 1
        self.flip_angle = 360 * (1 - self.flip_timer / FLIP_DURATION)
        self.vel_x = FLIP_SPEED * self.facing

        if self.flip_timer <= 0:
            self.is_flipping = False
            self.flip_angle = 0
            self.vel_x = 0

    def _apply_gravity(self):
        """套用重力"""
        self.vel_y += GRAVITY
        self.x += self.vel_x
        self.y += self.vel_y

        # 邊界限制
        if self.x < 0:
            self.x = 0
        if self.x + self.width > CANVAS_WIDTH:
            self.x = CANVAS_WIDTH - self.width

    def _check_collisions(self, platforms):
        """檢查與平台的碰撞"""
        self.on_ground = False

        for plat in platforms:
            # 只檢查從上方落下的碰撞
            if self.vel_y >= 0:
                player_bottom = self.y + self.height
                # 角色底部在平台頂部附近，且水平有重疊
                if (player_bottom >= plat.y and
                    player_bottom <= plat.y + plat.height + self.vel_y and
                    self.x + self.width > plat.x and
                    self.x < plat.x + plat.width):
                    self.y = plat.y - self.height
                    self.vel_y = 0
                    self.on_ground = True
                    break

        # 地面碰撞
        if self.y + self.height >= GROUND_Y:
            self.y = GROUND_Y - self.height
            self.vel_y = 0
            self.on_ground = True

    def to_dict(self):
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "w": self.width,
            "h": self.height,
            "color": self.color,
            "facing": self.facing,
            "is_flipping": self.is_flipping,
            "flip_angle": self.flip_angle,
            "is_crouching": self.is_crouching,
            "on_ground": self.on_ground,
        }


class GameState:
    def __init__(self):
        self.platforms = [
            # 中央高平台
            Platform(325, 300, 150, 15),
            # 左側平台
            Platform(80, 430, 170, 15),
            # 右側平台
            Platform(550, 430, 170, 15),
        ]
        self.players = [
            Player(0, 100, GROUND_Y - PLAYER_HEIGHT, "#4488ff"),  # 藍隊 左側
            Player(1, 660, GROUND_Y - PLAYER_HEIGHT, "#ff4444"),  # 紅隊 右側
        ]
        self.started = False

    def update(self):
        """每幀更新遊戲狀態"""
        if not self.started:
            return
        for player in self.players:
            player.update(self.platforms)

    def to_dict(self):
        return {
            "players": [p.to_dict() for p in self.players],
            "platforms": [p.to_dict() for p in self.platforms],
            "started": self.started,
        }
