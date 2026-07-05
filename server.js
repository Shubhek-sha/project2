import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

const port = Number(process.env.PORT || 3001);
const wss = new WebSocketServer({ port });

let boardState = {
  tasks: [],
  revision: 0,
};

const clients = new Map();

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients.keys()) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function broadcastPresence() {
  const presence = Array.from(clients.values())
    .filter(Boolean)
    .map((entry) => ({
      userId: entry.userId,
      userName: entry.userName,
      active: entry.active,
    }));

  broadcast({ type: "presence", data: presence });
}

wss.on("connection", (socket) => {
  const clientId = randomUUID();
  clients.set(socket, {
    userId: clientId,
    userName: "Guest",
    active: true,
  });

  socket.send(
    JSON.stringify({
      type: "snapshot",
      data: { boardState, clients: Array.from(clients.values()) },
    }),
  );
  broadcastPresence();

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === "join") {
        const current = clients.get(socket);
        clients.set(socket, {
          ...current,
          userId: message.payload.userId,
          userName: message.payload.userName || "Guest",
          active: true,
        });
        broadcastPresence();
        return;
      }

      if (message.type === "presence") {
        const current = clients.get(socket);
        clients.set(socket, {
          ...current,
          userId: message.payload.userId,
          userName: message.payload.userName || "Guest",
          active: message.payload.active !== false,
        });
        broadcastPresence();
        return;
      }

      if (message.type === "state") {
        boardState = {
          tasks: message.payload.tasks || [],
          revision: message.payload.revision || boardState.revision + 1,
        };
        broadcast({
          type: "snapshot",
          data: { boardState, clients: Array.from(clients.values()) },
        });
      }
    } catch (error) {
      console.error("Failed to parse message", error);
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    broadcastPresence();
  });
});

console.log(`Collaborative board server running on ws://localhost:${port}`);
