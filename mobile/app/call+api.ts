import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ noServer: true });
const clients = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substring(7);
  clients.set(id, ws);

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());
    
    switch (data.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        const targetClient = clients.get(data.target);
        if (targetClient) {
          targetClient.send(JSON.stringify({
            type: data.type,
            payload: data.payload,
            from: id
          }));
        }
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(id);
  });

  ws.send(JSON.stringify({ type: 'connected', id }));
});

export default function GET(req: Request) {
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  const { response, socket } = Deno.upgradeWebSocket(req);
  wss.handleUpgrade(req, socket, [], (ws) => {
    wss.emit('connection', ws);
  });

  return response;
}