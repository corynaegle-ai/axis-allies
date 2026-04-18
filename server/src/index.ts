import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { ClientMsg, ServerMsg } from "@aa/shared";
import { Lobby } from "./lobby.js";
import { advancePhase, applyMove, applyPlace, applyPurchase, applyResolveBattle } from "./game.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

const lobby = new Lobby();

const server = http.createServer((req, res) => {
  // Serve built client if present, otherwise a helpful message.
  if (!fs.existsSync(CLIENT_DIST)) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Axis & Allies server is running. Run `npm run dev:client` separately, or build the client.");
    return;
  }
  let reqPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";
  const abs = path.join(CLIENT_DIST, reqPath);
  if (!abs.startsWith(CLIENT_DIST) || !fs.existsSync(abs)) {
    // SPA fallback
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream(path.join(CLIENT_DIST, "index.html")).pipe(res);
    return;
  }
  const ext = path.extname(abs).toLowerCase();
  const mime: Record<string, string> = {
    ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
    ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
    ".ico": "image/x-icon", ".map": "application/json",
  };
  res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
  fs.createReadStream(abs).pipe(res);
});

const wss = new WebSocketServer({ server, path: "/ws" });

function send(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcastRoom(roomId: string, msg: ServerMsg): void {
  const room = lobby.rooms.get(roomId);
  if (!room) return;
  for (const s of room.sockets) send(s, msg);
}

function broadcastLobby(): void {
  const msg: ServerMsg = { type: "games", games: lobby.summary() };
  for (const ws of wss.clients) send(ws as WebSocket, msg);
}

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let msg: ClientMsg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    const sessionId = lobby.sockets.get(ws);

    try {
      switch (msg.type) {
        case "hello": {
          const session = lobby.ensureSession(msg.sessionId, msg.name);
          lobby.sockets.set(ws, session.sessionId);
          send(ws, { type: "welcome", session });
          send(ws, { type: "games", games: lobby.summary() });
          return;
        }
        case "listGames": {
          send(ws, { type: "games", games: lobby.summary() });
          return;
        }
        case "createGame": {
          if (!sessionId) return send(ws, { type: "error", message: "No session." });
          const room = lobby.createRoom(msg.name || "Game");
          room.sockets.add(ws);
          broadcastLobby();
          send(ws, { type: "info", message: `Created ${room.id}` });
          return;
        }
        case "joinGame": {
          if (!sessionId) return send(ws, { type: "error", message: "No session." });
          const room = lobby.rooms.get(msg.gameId);
          if (!room) return send(ws, { type: "error", message: "No such game." });
          const session = lobby.sessions.get(sessionId)!;
          const err = lobby.joinRoom(room, sessionId, session.name, msg.power);
          if (err) return send(ws, { type: "error", message: err });
          room.sockets.add(ws);
          session.power = msg.power;
          broadcastLobby();
          if (room.state) send(ws, { type: "gameState", state: room.state });
          return;
        }
        case "leaveGame": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !sessionId) return;
          room.sockets.delete(ws);
          room.players.delete(sessionId);
          broadcastLobby();
          return;
        }
        case "startGame": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room) return send(ws, { type: "error", message: "No such game." });
          lobby.startRoom(room);
          broadcastRoom(room.id, { type: "gameState", state: room.state! });
          broadcastLobby();
          return;
        }
        case "purchase": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const p = room.players.get(sessionId)?.power;
          if (!p) return send(ws, { type: "error", message: "You have no power." });
          const err = applyPurchase(room.state, p, msg.orders);
          if (err) return send(ws, { type: "error", message: err });
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "moveOrder": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const p = room.players.get(sessionId)?.power;
          if (!p) return send(ws, { type: "error", message: "You have no power." });
          const err = applyMove(room.state, p, msg.unitIds, msg.path, msg.kind);
          if (err) return send(ws, { type: "error", message: err });
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "resolveBattle": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const p = room.players.get(sessionId)?.power;
          if (!p) return;
          const err = applyResolveBattle(room.state, p, msg.territory, {
            retreat: msg.retreat, retreatTo: msg.retreatTo, casualties: msg.casualties,
          });
          if (err) return send(ws, { type: "error", message: err });
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "placeUnit": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const p = room.players.get(sessionId)?.power;
          if (!p) return;
          const err = applyPlace(room.state, p, msg.unit as any, msg.territory);
          if (err) return send(ws, { type: "error", message: err });
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "endPhase": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const p = room.players.get(sessionId)?.power;
          if (!p || p !== room.state.activePower) {
            return send(ws, { type: "error", message: "Not your turn." });
          }
          advancePhase(room.state);
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "chat": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !sessionId) return;
          const name = lobby.sessions.get(sessionId)?.name ?? "anon";
          broadcastRoom(room.id, { type: "chat", from: name, text: msg.text, gameId: room.id });
          return;
        }
      }
    } catch (e) {
      console.error(e);
      send(ws, { type: "error", message: (e as Error).message });
    }
  });

  ws.on("close", () => {
    lobby.sockets.delete(ws);
    for (const room of lobby.rooms.values()) room.sockets.delete(ws);
    broadcastLobby();
  });
});

server.listen(PORT, () => {
  console.log(`Axis & Allies server on http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
