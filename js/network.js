/**
 * Triple Choice: Ace Duel - PeerJS 網路連線管理
 */

const NetworkManager = (() => {
    let peer = null;
    let conn = null;
    let messageCallback = null;
    let connectCallback = null;
    let disconnectCallback = null;

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    function createRoom() {
        return new Promise((resolve, reject) => {
            const code = generateCode();
            const peerId = 'ace-duel-' + code;

            peer = new Peer(peerId);

            peer.on('open', () => {
                peer.on('connection', (connection) => {
                    conn = connection;
                    setupConnection(conn);
                });
                resolve(code);
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    peer.destroy();
                    createRoom().then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });
        });
    }

    function joinRoom(code) {
        return new Promise((resolve, reject) => {
            const peerId = 'ace-duel-' + code.toUpperCase();

            peer = new Peer();

            peer.on('open', () => {
                conn = peer.connect(peerId, { reliable: true });

                conn.on('open', () => {
                    setupConnection(conn);
                    resolve();
                });

                conn.on('error', (err) => reject(err));
            });

            peer.on('error', (err) => reject(err));

            setTimeout(() => reject(new Error('連線超時')), 10000);
        });
    }

    function setupConnection(connection) {
        connection.on('data', (data) => {
            if (messageCallback) messageCallback(data);
        });

        connection.on('close', () => {
            if (disconnectCallback) disconnectCallback();
        });

        if (connectCallback) connectCallback();
    }

    function send(data) {
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    function onMessage(cb) { messageCallback = cb; }
    function onConnect(cb) { connectCallback = cb; }
    function onDisconnect(cb) { disconnectCallback = cb; }

    function destroy() {
        if (conn) conn.close();
        if (peer) peer.destroy();
        conn = null;
        peer = null;
    }

    return { createRoom, joinRoom, send, onMessage, onConnect, onDisconnect, destroy };
})();

window.NetworkManager = NetworkManager;