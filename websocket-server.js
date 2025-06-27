const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 }, () => {
  console.log('✅ Serveur WebSocket lancé sur ws://localhost:3000');
});

const users = new Map(); // username => WebSocket

function broadcastUserList() {
  const usernames = Array.from(users.keys());
  const payload = JSON.stringify({ type: 'user-list', users: usernames });
  users.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

wss.on('connection', ws => {
  let username = null;

  ws.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('❌ Erreur JSON:', e);
      return;
    }

    const { type, to, from, payload, room } = data;

    if (type === 'register') {
      username = data.username;
      users.set(username, ws);
      console.log(`👤 ${username} connecté`);
      broadcastUserList();
    }

    if (['offer', 'answer', 'ice-candidate'].includes(type) && to && users.has(to)) {
      users.get(to).send(JSON.stringify({ type, from, payload }));
    }

    // ✅ GESTION DE L’INVITATION JITSI
    if (type === 'jitsi-invite' && to && users.has(to)) {
      users.get(to).send(JSON.stringify({
        type: 'jitsi-invite',
        from,
        room
      }));
    }
  });

  ws.on('close', () => {
    if (username) {
      users.delete(username);
      console.log(`❌ ${username} déconnecté`);
      broadcastUserList();
    }
  });
});
