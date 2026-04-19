Fix six server-side bugs in game.ts and shared/src/types.ts (Batch A).

Goal: Correct six distinct bugs in the server game logic, ranging from a game-breaking double-move exploit to silent accumulation of dead state. Each fix is self-contained within server/src/game.ts and shared/src/types.ts. No client files are touched in this batch.

---

## FIX-01 — axis-allies-4s0: Units can move multiple times per phase

**What exists today:**
- `applyMove` in `server/src/game.ts` lines 94–109 validates that the requested path length does not exceed `def.move`, but this check uses only the current path's step count, not accumulated movement.
- `UnitStack.movesUsed` is incremented at line 138 (`u.movesUsed = (u.movesUsed ?? 0) + (path.length - 1)`) but is never read during validation.
- A player can call `applyMove` a second time with the same unit ID, pass a one-step path, and move that unit again even though it already moved this phase — game-breaking.

**What to build:**
- In the per-unit validation loop (lines 94–109), after retrieving `def`, reject the order if `(u.movesUsed ?? 0) + steps > def.move`. Use the existing `movesUsed` field already on `UnitStack`.
- Return the error string `"Unit already moved its maximum distance."` (consistent with the error-string convention used throughout `applyMove`).

**Acceptance criteria:**
- A unit with `move: 1` (infantry) that has already moved once is rejected on any subsequent `applyMove` call during the same phase.
- A unit with `move: 2` (tank) that moved one step is still allowed to be included in a second order that moves it one additional step, but is rejected if that second move would bring total to 3.
- `movesUsed` is cleared to 0 at end-of-turn (already done at line 317 in `advancePhase` — do not change that).

---

## FIX-03 — axis-allies-kwd: Retreat logic operator precedence bug

**What exists today:**
- `applyResolveBattle` in `server/src/game.ts` lines 184–187 contains:
  ```
  return u && u.movedFrom && TERRITORY_MAP[u.movedFrom] && [u.movedFrom, battle.territory].includes(retreatTo) || TERRITORY_MAP[u.movedFrom!]?.neighbors.includes(retreatTo);
  ```
- JavaScript `||` binds more loosely than `&&`, so the right side of the `||` evaluates independently of the `u &&` guard. If any attacking unit's movedFrom territory has `retreatTo` as a neighbor, the condition is `true` for the entire `every()` check — allowing retreat to arbitrary adjacent territory regardless of whether units came from there.
- The fallback block at lines 189–191 is reached only when the `every()` returns false, which is now rarely triggered.

**What to build:**
- Wrap the full per-unit expression in the `every()` callback in parentheses so the `||` is part of the boolean for that single unit, not a second arm of the outer expression:
  ```
  return (u && u.movedFrom && TERRITORY_MAP[u.movedFrom] && [u.movedFrom, battle.territory].includes(retreatTo)) || (u?.movedFrom != null && TERRITORY_MAP[u.movedFrom!]?.neighbors.includes(retreatTo));
  ```
- Alternatively, simplify: the valid retreat destinations are the `movedFrom` territory of the attacking units (all must share the same origin for a coherent retreat) or an adjacent friendly territory that was not the battle territory. Choose the simplest correct reading — what matters is that the `u &&` guard cannot be bypassed.

**Acceptance criteria:**
- Retreating to the territory an attacking unit came from succeeds.
- Retreating to a territory that is a neighbor of the battle territory but was NOT where any unit came from is rejected.
- The `|| TERRITORY_MAP[u.movedFrom!]?.neighbors.includes(retreatTo)` clause (if retained) cannot return true when `u` is undefined or `u.movedFrom` is undefined.

---

## FIX-04 — axis-allies-wdk: Non-combat move allows neutral territory entry

**What exists today:**
- `applyMove` non-combat branch in `server/src/game.ts` lines 122–130:
  ```ts
  const territoryOwner = state.territories[dest].owner;
  if (destTerr.terrain === "land" && territoryOwner != null && POWERS[territoryOwner].alliance !== POWERS[power].alliance) {
    return "Cannot non-combat into enemy territory.";
  }
  ```
- Neutral territories have `owner: null` in `TerritoryState`. The condition `territoryOwner != null` is false for neutrals, so the enemy-territory check is skipped and non-combat moves into neutrals are silently allowed.
- In 1942 2nd Edition rules, neutrals may not be entered during non-combat move.

**What to build:**
- Add a separate check for neutral land territories before the existing enemy-territory check:
  ```ts
  if (destTerr.terrain === "land" && territoryOwner === null) {
    return "Cannot non-combat into neutral territory.";
  }
  ```
- Place this check immediately after the existing enemy-unit check (after line 126) and before the existing `territoryOwner != null` enemy-territory check.

**Acceptance criteria:**
- Non-combat move into a land territory with `owner: null` is rejected with `"Cannot non-combat into neutral territory."`.
- Non-combat move into a friendly land territory succeeds.
- Non-combat move into an enemy land territory is still rejected by the existing check.
- Non-combat move into a sea zone is unaffected (sea zones have no owner concept relevant here).

---

## FIX-07 — axis-allies-mu8: Eliminated powers not auto-detected

**What exists today:**
- `GameState.powers[p].eliminated` field exists in `shared/src/types.ts` (line 113) and is checked during turn advancement (`advancePhase`, line 327) to skip eliminated powers.
- `eliminated` is never set to `true` anywhere in `server/src/game.ts`. It is initialized `false` in `newGame` (line 31) and never changed.
- Capital capture (lines 224–230 of `applyResolveBattle`) logs a looting message but does not mark the power as eliminated.
- `checkVictory` (lines 343–353) only checks for alliance-wide win conditions; it does not check per-power elimination based on capital loss and zero units.

**What to build:**
- At the end of `applyResolveBattle`, after `checkVictory(state)`, add a call to a new helper `checkElimination(state)`.
- `checkElimination` iterates over all five powers. For each power not already marked `eliminated`, check: (a) their capital territory is owned by an enemy, AND (b) they have no units remaining on the board (no `UnitStack` with `owner === p`). If both conditions are true, set `state.powers[p].eliminated = true` and append a log entry: `"${POWERS[p].name} has been eliminated."`.
- Also call `checkElimination` at the end of `advancePhase` after the combat-phase auto-resolve block, so walkovers also trigger elimination detection.
- Do not mark a power eliminated if they still have units anywhere on the board, even if their capital is lost.

**Acceptance criteria:**
- A power whose capital is captured AND who has no surviving units gets `eliminated: true` set.
- A power whose capital is captured but still has units elsewhere does NOT get `eliminated: true`.
- A power that loses all units but retains their capital does NOT get `eliminated: true`.
- Once `eliminated: true`, `advancePhase` already skips them (line 327) — do not change that logic.
- The log entry `"Germany has been eliminated."` (for example) appears exactly once, not repeatedly on subsequent turns.

---

## FIX-08 — axis-allies-d64: Remove unused pendingOrders dead code

**What exists today:**
- `GameState.pendingOrders: Order[]` is declared in `shared/src/types.ts` line 118.
- `Order` interface is declared in `shared/src/types.ts` lines 63–69.
- `applyMove` pushes to `state.pendingOrders` at lines 141–143 in `server/src/game.ts`.
- `pendingOrders` is cleared at line 321 in `advancePhase`.
- `pendingOrders` is never read anywhere for game logic, display, or validation. It is pure dead state that bloats every serialized game snapshot sent over the wire.

**What to build:**
- Remove the `pendingOrders: Order[]` field from the `GameState` interface in `shared/src/types.ts`.
- Remove the `Order` interface from `shared/src/types.ts` (lines 63–69) — verify it is not referenced anywhere else before removing.
- Remove the `state.pendingOrders.push(...)` block from `applyMove` in `server/src/game.ts` (lines 141–143).
- Remove `state.pendingOrders = []` from the collect-phase block in `advancePhase` (line 321).
- Remove `pendingOrders: []` from the initial state construction in `newGame` (line 44).
- Remove the `Order` and `PurchaseOrder` imports from `game.ts` if `Order` is no longer used (keep `PurchaseOrder` — it is still used).

**Acceptance criteria:**
- `GameState` no longer has a `pendingOrders` property.
- `Order` type no longer exists in shared types.
- `tsc --noEmit` passes with no new errors after the removal.
- No other file in the repo imports or references `Order` or `pendingOrders` (search before deleting).

---

## FIX-09 — axis-allies-9kb: Cap game log at 200 entries

**What exists today:**
- `GameState.log: string[]` grows without bound in `server/src/game.ts`. Every call to `applyMove`, `applyPurchase`, `applyResolveBattle`, `applyPlace`, and `advancePhase` appends one or more entries.
- The client in `client/src/Game.tsx` line 140 slices display to 80 entries, but the full array is serialized and sent in every `gameState` WebSocket broadcast. A long game accumulates thousands of entries in memory and wire payload.
- There is no log rotation or cap anywhere in the server.

**What to build:**
- Add a small helper at the bottom of `server/src/game.ts`:
  ```ts
  const LOG_CAP = 200;
  function appendLog(state: GameState, entry: string): void {
    state.log.push(entry);
    if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP);
  }
  ```
- Replace every `state.log.push(...)` call in `server/src/game.ts` with `appendLog(state, ...)`. There are approximately 15 call sites across `newGame`, `applyPurchase`, `applyMove`, `applyResolveBattle`, `applyPlace`, `advancePhase`, and `checkVictory`.
- Do not change the `log` field type or name in `GameState` — it stays `string[]`.

**Acceptance criteria:**
- After more than 200 log entries have been generated in a single game, `state.log.length` never exceeds 200.
- The most recent entries are preserved; old entries are dropped from the front.
- All existing log push call sites in `server/src/game.ts` use `appendLog` — no bare `state.log.push` remains in that file.

---

## Priority order

1. FIX-01 (double-move) — game-breaking exploit; fix first so the game state is trustworthy for all other fixes.
2. FIX-04 (neutral territory) — rule violation that affects game state validity; fix before adding elimination detection which depends on correct ownership.
3. FIX-03 (retreat operator precedence) — security/correctness bug in combat resolution; fix before elimination detection which reads post-battle state.
4. FIX-07 (elimination detection) — depends on correct battle resolution and territory ownership from FIX-03 and FIX-04.
5. FIX-08 (remove pendingOrders) — pure cleanup; no functional dependencies, but do after FIX-07 to avoid touching the same file in an interleaved way.
6. FIX-09 (log cap) — lowest risk, pure addition; do last.

## Constraints

- Touch only `server/src/game.ts` and `shared/src/types.ts`. Do not modify any client file.
- Do not change the WebSocket protocol (`shared/src/protocol.ts`) or add new message types.
- Do not add external dependencies. All fixes use only existing language features and the patterns already in `game.ts`.
- Do not rewrite or restructure functions beyond what is required for each fix. Surgical edits only.
- For FIX-08: run a codebase-wide search for `pendingOrders` and `Order` references before deleting anything.
- For FIX-07: `checkElimination` must be idempotent — calling it when a power is already `eliminated: true` must not append a second log entry.
- Error strings returned from `applyMove` must be plain strings (not thrown), matching the `string | null` return convention used throughout the file.

## What "good" looks like

**FIX-01 correct:** Infantry at Moscow moved to Leningrad in combatMove phase. A second `moveOrder` for the same infantry ID to Karelia is rejected. A different infantry that has not moved yet is accepted.

**FIX-01 incorrect:** Allowing the second move because the new path is only 1 step and the path-length check (line 101) passes for step count alone.

**FIX-03 correct:** Attacker retreats from France to Germany (where units came from) — accepted. Attacker tries to retreat to a sea zone adjacent to France — rejected.

**FIX-03 incorrect:** The `||` short-circuit lets retreat succeed to any territory that happens to neighbor the battle zone, bypassing the `u &&` null guard.

**FIX-04 correct:** Non-combat move to a neutral land territory returns `"Cannot non-combat into neutral territory."`. Non-combat move to an unoccupied friendly territory succeeds.

**FIX-04 incorrect:** Move succeeds because `territoryOwner === null` makes the existing `territoryOwner != null` guard skip the enemy check entirely.

**FIX-07 correct:** Germany loses Berlin, then in the same `applyResolveBattle` call Germany's last unit is eliminated — `eliminated: true` is set, a log entry is written, and Germany is skipped in future turns.

**FIX-07 incorrect:** Calling `checkElimination` in a loop that re-checks already-eliminated powers and appends duplicate log entries.

**FIX-08 correct:** TypeScript compiles cleanly. No `pendingOrders` key appears in any `GameState` object literal in the codebase.

**FIX-08 incorrect:** Leaving `pendingOrders: []` in `newGame` while removing the field from the type, causing a TS error; or leaving the `Order` import in `game.ts` causing an unused-import warning.

**FIX-09 correct:** After 250 moves in a game, `state.log.length === 200` and the entries are the 200 most recent.

**FIX-09 incorrect:** Using `state.log = state.log.slice(-200)` inside `appendLog` — this allocates a new array every call. Use `splice(0, N)` to mutate in place and keep the same array reference.

Most likely failure mode overall: fixing one bug while accidentally introducing a regression in the validation flow of `applyMove`. After each fix, mentally trace a full move order (origin check → unit ownership check → step-count check → moved check → domain check → adjacency check → combat/non-combat branch) to verify all paths are still reachable.
