import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { ClientMsg, ServerMsg, POWERS, POWER_ORDER } from "@aa/shared";
import { Lobby } from "./lobby.js";
import { advancePhase, applyMove, applyPlace, applyPurchase, applyResolveBattle } from "./game.js";
import {
  openDb, saveGame, createGameRecord, addGamePlayer, markPlayerQuit,
  upsertPlayer, loadActiveGames,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

// Open DB and restore any in-progress games before accepting connections.
openDb();
const lobby = new Lobby();
for (const saved of loadActiveGames()) {
  lobby.restoreRoom(saved.gameId, saved.gameName, saved.state, saved.players);
  console.log(`[db] Restored game ${saved.gameId} (turn ${saved.state.turn}, ${saved.players.length} players)`);
}

const server = http.createServer((req, res) => {
  if (!fs.existsSync(CLIENT_DIST)) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Axis & Allies server is running. Run `npm run dev:client` separately, or build the client.");
    return;
  }
  let reqPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";
  const abs = path.join(CLIENT_DIST, reqPath);
  if (!abs.startsWith(CLIENT_DIST) || !fs.existsSync(abs)) {
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

/**
 * After advancing the phase, keep advancing while the active power has quit.
 * This skips all 6 phases of any forfeited power so the game continues unblocked.
 * Guard prevents infinite loops if (somehow) all powers have quit.
 */
function advanceSkippingQuit(roomId: string): void {
  const room = lobby.rooms.get(roomId);
  if (!room?.state) return;
  const maxSteps = POWER_ORDER.length * 6;
  let steps = 0;
  while (room.quitPowers.has(room.state.activePower) && !room.state.winner && steps++ < maxSteps) {
    advancePhase(room.state);
  }
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
          upsertPlayer(session);
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
          createGameRecord(room.id, room.name);
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
          addGamePlayer(msg.gameId, sessionId, msg.power);
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
          saveGame(room.id, room.name, room.state!);
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
          saveGame(room.id, room.name, room.state);
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
          saveGame(room.id, room.name, room.state);
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
          saveGame(room.id, room.name, room.state);
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
          saveGame(room.id, room.name, room.state);
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
          advanceSkippingQuit(room.id);
          saveGame(room.id, room.name, room.state);
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          return;
        }
        case "quitGame": {
          const room = lobby.rooms.get(msg.gameId);
          if (!room || !room.state || !sessionId) return;
          const player = room.players.get(sessionId);
          if (!player?.power) return send(ws, { type: "error", message: "You are not in this game." });

          const quittingPower = player.power;
          const quittingName = player.name;

          // Mark in DB and update in-memory structures.
          markPlayerQuit(msg.gameId, sessionId);
          room.quitPowers.add(quittingPower);
          room.players.delete(sessionId);

          room.state.log.push(`${quittingName} (${POWERS[quittingPower].name}) has forfeited.`);

          // Determine outcome based on remaining human players.
          const remaining = [...room.players.values()];
          if (remaining.length === 0) {
            // Everyone quit — abandon the game.
            room.state.log.push("All players have left. Game abandoned.");
          } else if (remaining.length === 1) {
            // Last player standing wins — declare their alliance the victor.
            const lastPower = remaining[0].power!;
            room.state.winner = POWERS[lastPower].alliance;
            room.state.log.push(`${remaining[0].name} wins by forfeit!`);
          } else {
            // 3+ player game continues; if it's the quit power's turn, auto-advance.
            if (room.state.activePower === quittingPower) {
              advanceSkippingQuit(room.id);
            }
          }

          saveGame(room.id, room.name, room.state);
          broadcastRoom(room.id, {
            type: "playerQuit",
            gameId: room.id,
            power: quittingPower,
            playerName: quittingName,
          });
          broadcastRoom(room.id, { type: "gameState", state: room.state });
          broadcastLobby();
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
