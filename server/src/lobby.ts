import { nanoid } from "nanoid";
import type { WebSocket } from "ws";
import { GameState, ClientSession, LobbyGame, PowerId } from "@aa/shared";
import { newGame } from "./game.js";

export interface Room {
  id: string;
  name: string;
  state: GameState | null;
  players: Map<string, { name: string; power?: PowerId }>;
  sockets: Set<WebSocket>;
  started: boolean;
  /** Powers whose human controllers have forfeited — their turns are auto-skipped. */
  quitPowers: Set<PowerId>;
}

export class Lobby {
  rooms = new Map<string, Room>();
  sessions = new Map<string, ClientSession>();
  sockets = new Map<WebSocket, string>(); // socket -> sessionId

  ensureSession(sessionId: string | undefined, name: string): ClientSession {
    if (sessionId && this.sessions.has(sessionId)) {
      const s = this.sessions.get(sessionId)!;
      s.name = name;
      return s;
    }
    const id = sessionId ?? nanoid(10);
    const s: ClientSession = { sessionId: id, name };
    this.sessions.set(id, s);
    return s;
  }

  createRoom(name: string): Room {
    const id = nanoid(6).toUpperCase();
    const room: Room = {
      id, name, state: null,
      players: new Map(), sockets: new Set(), started: false,
      quitPowers: new Set(),
    };
    this.rooms.set(id, room);
    return room;
  }

  summary(): LobbyGame[] {
    return [...this.rooms.values()].map((r) => ({
      id: r.id, name: r.name, started: r.started,
      players: [...r.players.entries()].map(([sid, p]) => ({
        sessionId: sid, name: p.name, power: p.power,
      })),
    }));
  }

  joinRoom(room: Room, sessionId: string, name: string, power: PowerId): string | null {
    if (room.started) return "Game already started.";
    for (const [sid, p] of room.players) {
      if (p.power === power && sid !== sessionId) return "Power already taken.";
    }
    room.players.set(sessionId, { name, power });
    return null;
  }

  startRoom(room: Room): void {
    if (room.started) return;
    room.state = newGame(room.id);
    room.started = true;
  }

  /** Rebuild a room from a persisted snapshot (called on server restart). */
  restoreRoom(
    gameId: string,
    gameName: string,
    state: GameState,
    players: Array<{ sessionId: string; name: string; power: PowerId; status: string }>,
  ): Room {
    const room: Room = {
      id: gameId,
      name: gameName,
      state,
      players: new Map(
        players
          .filter((p) => p.status === "active")
          .map((p) => [p.sessionId, { name: p.name, power: p.power }]),
      ),
      sockets: new Set(),
      started: true,
      quitPowers: new Set(
        players.filter((p) => p.status === "quit").map((p) => p.power),
      ),
    };
    this.rooms.set(gameId, room);
    // Restore session stubs so players can reconnect with their sessionId.
    for (const p of players) {
      if (!this.sessions.has(p.sessionId)) {
        this.sessions.set(p.sessionId, { sessionId: p.sessionId, name: p.name, power: p.power });
      }
    }
    return room;
  }
}
