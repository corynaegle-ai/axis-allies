# Axis & Allies (web)

Self-hosted, multiplayer web implementation of Axis & Allies (1942 2nd Edition, simplified).

- **Server**: Node + TypeScript + `ws` (WebSocket). In-memory game state.
- **Client**: React + Vite + SVG. Pan/zoom world map, vector-drawn unit pieces for all 13 unit types.
- **Shared**: TypeScript types, unit stats, map data, wire protocol.

## Quick start

```bash
npm install
npm run dev
```

That starts the server on `http://localhost:8787` and the client dev server on `http://localhost:5173` (which proxies `/ws` to the server).

Open `http://localhost:5173` on each player's machine, pick a name, create or join a game, choose a power, and hit **Start**.

## Production (self-host)

```bash
npm install
npm run build     # builds shared, server, client
npm run start     # serves client from server on :8787
```

Then expose port 8787 (reverse-proxy via nginx/caddy for TLS).
Set `PORT=...` to change port.

## Gameplay

Five powers in turn order: **Russia → Germany → UK → Japan → USA**.
Each turn has six phases: **Purchase · Combat Move · Combat · Non-Combat Move · Place · Collect**.
Victory: Axis holds all three Allied capitals, or Allies hold both Axis capitals.

### Controls
- **Pan**: click-drag the map background.
- **Zoom**: scroll wheel.
- **Select**: click a territory. Shows unit breakdown in right panel.
- **Move** (during `combatMove`/`nonCombatMove`): click the origin territory with your units, then click a destination within reach (dashed blue outline).
- **Purchase** (during `purchase`): set quantities in the right panel, confirm.
- **Combat**: click **Roll** in each battle card to resolve a round, or **Retreat** to withdraw.
- **Place** (during `place`): select a land territory with one of your factories, then click **Place 1** next to a unit in the pool.
- **End phase**: top of right panel.

### MVP scope / what's deferred
Implemented: 13 unit types with attack/defense/move, artillery-supported infantry, 2-hit ships, land/sea/air domain rules, capital looting, factory production, income collection.
Deferred: tech rolls, national objectives, strategic bombing, convoy disruption, kamikaze, neutrals, AA interception rolls, shore bombard, transport loading/unloading mechanics, submarine submerge/sneak-attack ordering.

## Layout

```
shared/   types, unit stats, map data, protocol
server/   Node WebSocket server, game engine, combat resolver, lobby
client/   React + Vite SPA, SVG pieces, pan/zoom board
```
