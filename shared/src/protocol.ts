import type { GameState, PowerId, PurchaseOrder, ClientSession } from "./types.js";

/** WebSocket envelope — discriminated union of client→server and server→client messages. */

export type ClientMsg =
  | { type: "hello"; name: string; sessionId?: string }
  | { type: "listGames" }
  | { type: "createGame"; name: string; power: PowerId }
  | { type: "joinGame"; gameId: string; power: PowerId }
  | { type: "leaveGame"; gameId: string }
  | { type: "startGame"; gameId: string }
  | { type: "purchase"; gameId: string; orders: PurchaseOrder[] }
  | { type: "moveOrder"; gameId: string; unitIds: string[]; path: string[]; kind: "combat" | "nonCombat" }
  | { type: "endPhase"; gameId: string }
  | { type: "resolveBattle"; gameId: string; territory: string; retreat?: boolean; retreatTo?: string; casualties?: string[] }
  | { type: "placeUnit"; gameId: string; unit: string; territory: string }
  | { type: "chat"; gameId: string; text: string }
  | { type: "quitGame"; gameId: string }
  | { type: "rejoinGame"; gameId: string }
  | { type: "abandonGame"; gameId: string }
  | { type: "lookupGame"; gameId: string };

export interface LobbyGame {
  id: string;
  name: string;
  players: { sessionId: string; name: string; power?: PowerId }[];
  started: boolean;
}

export type ServerMsg =
  | { type: "welcome"; session: ClientSession }
  | { type: "games"; games: LobbyGame[] }
  | { type: "gameState"; state: GameState }
  | { type: "chat"; from: string; text: string; gameId: string }
  | { type: "error"; message: string }
  | { type: "info"; message: string }
  | { type: "playerQuit"; gameId: string; power: PowerId; playerName: string }
  | { type: "gameFound"; game: LobbyGame };
