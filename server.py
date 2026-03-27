"""
Triple Choice: Ace Duel - WebSocket Game Server
WebSocket 遊戲伺服器：處理連線、廣播遊戲狀態
"""

import asyncio
import json
import os
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread

import websockets

from game_logic import GameState

# --- 設定 ---
WS_PORT = 8765
HTTP_PORT = 8080
TICK_RATE = 60  # 遊戲更新頻率 (Hz)
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


class Game:
    def __init__(self):
        self.state = GameState()
        self.connections = {}  # websocket -> player_id
        self.websockets = {}  # player_id -> websocket

    def add_player(self, ws):
        """新增玩家，回傳 player_id (0 或 1)，滿了回傳 None"""
        if len(self.connections) >= 2:
            return None
        player_id = 0 if 0 not in self.websockets else 1
        self.connections[ws] = player_id
        self.websockets[player_id] = ws
        if len(self.connections) == 2:
            self.state.started = True
        return player_id

    def remove_player(self, ws):
        """移除斷線的玩家"""
        if ws in self.connections:
            player_id = self.connections[ws]
            del self.connections[ws]
            del self.websockets[player_id]
            self.state.started = False

    def handle_input(self, ws, message):
        """處理玩家輸入"""
        player_id = self.connections.get(ws)
        if player_id is None:
            return
        try:
            data = json.loads(message)
            action = data.get("action")
            pressed = data.get("pressed", True)
            if action:
                self.state.players[player_id].apply_input(action, pressed)
        except (json.JSONDecodeError, KeyError, IndexError):
            pass


game = Game()


async def game_loop():
    """主遊戲迴圈，以固定頻率更新並廣播狀態"""
    interval = 1 / TICK_RATE
    while True:
        game.state.update()

        if game.connections:
            state_json = json.dumps(game.state.to_dict())
            # 廣播給所有連線的客戶端
            disconnected = []
            for ws in list(game.connections.keys()):
                try:
                    await ws.send(state_json)
                except websockets.ConnectionClosed:
                    disconnected.append(ws)
            for ws in disconnected:
                game.remove_player(ws)

        await asyncio.sleep(interval)


async def handle_connection(websocket):
    """處理新的 WebSocket 連線"""
    player_id = game.add_player(websocket)
    if player_id is None:
        await websocket.send(json.dumps({"error": "遊戲已滿，請稍後再試"}))
        await websocket.close()
        return

    # 告知客戶端分配的隊伍
    await websocket.send(json.dumps({
        "type": "assigned",
        "player_id": player_id,
        "color": game.state.players[player_id].color,
    }))

    print(f"玩家 {player_id} 已連線 ({'藍隊' if player_id == 0 else '紅隊'})")

    try:
        async for message in websocket:
            game.handle_input(websocket, message)
    except websockets.ConnectionClosed:
        pass
    finally:
        game.remove_player(websocket)
        print(f"玩家 {player_id} 已斷線")
        # 重置斷線玩家的位置
        game.state.players[player_id].__init__(
            player_id,
            100 if player_id == 0 else 660,
            game.state.players[player_id].y,
            game.state.players[player_id].color,
        )


def get_local_ip():
    """取得本機區網 IP"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def start_http_server():
    """啟動 HTTP 靜態檔案伺服器"""
    os.chdir(STATIC_DIR)
    handler = SimpleHTTPRequestHandler
    httpd = HTTPServer(("0.0.0.0", HTTP_PORT), handler)
    httpd.serve_forever()


async def main():
    local_ip = get_local_ip()

    # 啟動 HTTP 伺服器 (在背景執行緒)
    http_thread = Thread(target=start_http_server, daemon=True)
    http_thread.start()

    # 啟動 WebSocket 伺服器
    async with websockets.serve(handle_connection, "0.0.0.0", WS_PORT):
        print("=" * 50)
        print("🎮 Triple Choice: Ace Duel 伺服器已啟動!")
        print("=" * 50)
        print(f"📱 手機連線網址: http://{local_ip}:{HTTP_PORT}")
        print(f"💻 電腦連線網址: http://localhost:{HTTP_PORT}")
        print(f"🔌 WebSocket 埠: {WS_PORT}")
        print("=" * 50)
        print("等待兩位玩家連線...")

        await game_loop()


if __name__ == "__main__":
    asyncio.run(main())
