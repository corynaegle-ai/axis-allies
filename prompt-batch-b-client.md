Fix three client-side bugs in client/src/Game.tsx, client/src/Panel.tsx, and client/src/Board.tsx (Batch B).

Goal: Correct three bugs in the React client — a hardcoded movement range that ignores unit type, a blocking browser prompt() in the retreat flow, and missing visual feedback for damaged ships. All fixes are confined to the three client source files; no server or shared code changes.

---

## FIX-02 — axis-allies-8he: Client movement preview uses hardcoded range and ignores unit domain

**What exists today:**
- `Game.tsx` lines 22–41 compute the `reachable` set via a BFS that uses a hardcoded `maxMove = 4` for all units.
- The BFS traverses all territories regardless of terrain, so it highlights sea zones as reachable for infantry and land territories as reachable for destroyers.
- The highlighted territories are passed as `reachable: Set<string>` to `Board.tsx` (line 97) and rendered with the `reachable` CSS class. The visual preview is therefore wrong for every unit type except fighters (which coincidentally have move 4).
- `moveUnits: Set<string>` (Game.tsx line 20) contains the selected unit IDs. The unit definitions are available via `UNITS` imported from `@aa/shared` (already imported at line 3). Domain helpers `isLand`, `isSea`, `isAir` are also imported.
- `TERRITORY_MAP` and territory `.terrain` field are available in shared types.

**What to build:**
- Replace the hardcoded `maxMove = 4` with the actual maximum move value across the currently selected units:
  ```ts
  const maxMove = moveUnits.size > 0
    ? Math.max(...[...moveUnits].map((id) => UNITS[state.units[id]?.unit ?? "infantry"].move))
    : 0;
  ```
- Filter BFS neighbors to only include territories whose terrain matches the domain of the selected units. Use the following rule: if all selected units are land-domain (`isLand`), skip sea-zone neighbors; if all are sea-domain (`isSea`), skip land-zone neighbors; if all are air-domain (`isAir`), allow both (air can fly over any terrain). If the selection is mixed (which is uncommon but possible), allow all terrain and let the server validate.
- Domain of a unit: read from `UNITS[u.unit].domain` (type `"land" | "sea" | "air"`). The terrain of a territory: read from `TERRITORY_MAP[id].terrain` (type `"land" | "sea"`).
- Keep the `reachable` memoization dependency array as `[moveSrc, moveUnits]` so it recomputes when the unit selection changes.

**Acceptance criteria:**
- When infantry is selected at Moscow (land territory), only land territories within 1 step are highlighted — no sea zones appear reachable.
- When a destroyer is selected, only sea zones within 2 steps are highlighted — no land territories appear reachable.
- When a fighter is selected, all territories (land and sea) within 4 steps are highlighted.
- When no units are selected (`moveUnits.size === 0`), the reachable set is empty.
- The `reachable` set updates correctly when the user re-selects a territory with different unit types.

---

## FIX-05 — axis-allies-6za: Retreat uses window.prompt() — replace with map click UI

**What exists today:**
- `Panel.tsx` lines 499–505 in the `BattleBox` component:
  ```tsx
  onClick={() => {
    const origin = prompt("Retreat to which adjacent friendly territory? (type id)") || "";
    if (origin) onResolve(b.territory, { retreat: true, retreatTo: origin });
  }}
  ```
- `window.prompt()` is a blocking browser dialog. It requires the user to type a raw territory ID (an internal key like `"germany_terr"`), which is not user-friendly and breaks in environments that block `prompt()`.
- `Panel.tsx` currently receives no map-click callback or retreat-state setter. The `onResolveBattle` prop signature is `(territory: string, opts: { retreat?: boolean; retreatTo?: string }) => void` — this stays unchanged.
- `Game.tsx` `onTerritoryClick` handles territory selection during move phases but has no retreat-pending state.

**What to build:**
- Add a `retreatPending` state variable in `Game.tsx` (alongside existing `moveSrc`, `moveUnits`): `const [retreatPending, setRetreatPending] = useState<string | null>(null)` where the value is the battle territory ID the attacker is retreating from.
- When `retreatPending` is set, `onTerritoryClick` should: on the next click, call `net.send({ type: "resolveBattle", gameId, territory: retreatPending, retreat: true, retreatTo: id })` then clear `retreatPending`. Do not enter move-source mode while retreat is pending.
- Pass a new `onRetreat` prop from `Game.tsx` to `Panel.tsx`: `onRetreat: (battleTerritory: string) => void`. In `Game.tsx`, `onRetreat` sets `retreatPending` to the given territory.
- Update `PanelProps` in `Panel.tsx` to include `onRetreat: (battleTerritory: string) => void`.
- In `BattleBox`, remove the `prompt()` call. The Retreat button's `onClick` becomes: `onClick={() => onRetreat(b.territory)}`. Pass `onRetreat` down through `Panel` → `BattleBox` as a prop.
- Display a banner in `Game.tsx` (next to the existing `moveSrc` legend div at line 113) when `retreatPending` is set: `"Retreat from {territory name}: click the destination territory."` Clear `retreatPending` when the user clicks a territory.
- Do not change the `onResolveBattle` prop type or the existing ROLL button behavior.

**Acceptance criteria:**
- Clicking Retreat does not open any browser dialog.
- After clicking Retreat, the map shows a banner instructing the player to click a destination.
- Clicking a territory on the map sends the retreat order with that territory as `retreatTo`.
- Clicking the same territory as the battle territory cancels the retreat (sets `retreatPending` to null without sending).
- The Retreat button is still disabled when `!canAct`.

---

## FIX-06 — axis-allies-9dx: Damaged ships have no visual indicator

**What exists today:**
- `UnitStack.hitsTaken?: number` is defined in `shared/src/types.ts` line 57. Battleships and carriers have `hitpoints: 2` in `UNITS`; when they absorb one hit, `hitsTaken` is set to a positive number by the combat resolver (`server/src/combat.ts` — not modified in this batch).
- `Board.tsx` `renderStacks` function (lines 321–367) renders each unit type as a colored `<rect>` with a `<Piece>` SVG icon inside. It receives the full `UnitStack[]` arrays and already has access to individual `UnitStack` objects (line 99: `arr.push(u)`).
- The `stacksByTerritory` memo in `Board.tsx` lines 93–102 groups units by territory → owner → unit type and stores the array of stacks, so `hitsTaken` is accessible per-stack.
- Currently no visual distinction exists between a fresh battleship and a damaged one.

**What to build:**
- In `renderStacks`, for each entry, check if any unit in the group has `hitsTaken` greater than 0. The `entries` array currently stores `{ owner, unit, count }` — add `damaged: boolean` to track this:
  ```ts
  entries.push({ owner, unit, count: stacks.length, damaged: stacks.some((s) => (s.hitsTaken ?? 0) > 0) });
  ```
- When rendering each entry's `<rect>`, conditionally add a damage indicator when `damaged` is true. Use a small `<circle>` overlaid at the top-right corner of the unit tile: `<circle cx={22} cy={2} r={3} fill="#e03030" />`. This is a simple red dot that appears on the tile without changing the tile's overall shape or layout.
- No new CSS classes required — use inline SVG attributes only for the damage dot to keep the change self-contained.
- Only apply the indicator to unit types with `hitpoints > 1` (battleship, carrier). Do not apply to any unit with `hitpoints === 1` even if `hitsTaken` is somehow non-zero.

**Acceptance criteria:**
- A battleship with `hitsTaken: 0` renders without the red dot.
- A battleship with `hitsTaken: 1` renders with the red dot in the top-right corner of its tile.
- A carrier with `hitsTaken: 1` renders with the red dot.
- An infantry unit never renders the red dot regardless of its `hitsTaken` value.
- The red dot does not interfere with the existing stack-count badge (which appears at position `x={16} y={14}` per line 358 in Board.tsx).

---

## Priority order

1. FIX-02 (movement range preview) — foundational to the movement UX; users see incorrect highlights on every move attempt. Fix first because it touches `Game.tsx` state, and FIX-05 also modifies `Game.tsx` state — resolve the simpler, lower-coupling change first.
2. FIX-05 (retreat map click) — adds new state to `Game.tsx` and a new prop to `Panel.tsx`. Fix second, after FIX-02 is stable, to avoid merge conflicts within `Game.tsx`.
3. FIX-06 (damaged ship indicator) — purely additive change to `Board.tsx`; no interaction with the other two fixes. Fix last as it is the lowest risk and most isolated.

## Constraints

- Touch only `client/src/Game.tsx`, `client/src/Panel.tsx`, and `client/src/Board.tsx`. Do not modify shared types, server code, or CSS files (inline SVG attributes are acceptable for the damage dot).
- Do not add new npm packages. All fixes use React hooks, existing shared imports, and native SVG.
- Do not change the WebSocket message types or the `onResolveBattle` callback signature in `PanelProps`.
- For FIX-05: do not introduce a modal, popover, or any new component. The banner should reuse the existing `<div className="legend">` pattern already in `Game.tsx` line 113.
- For FIX-02: the `bfsPath` function (Game.tsx lines 148–166) is used for path construction when sending the order — do not change it. The domain filter applies only to the `reachable` highlight set, not to path finding.
- For FIX-06: do not modify `stacksByTerritory` memo shape in a way that breaks the `renderStacks` call signature — the change is internal to `renderStacks`.
- Do not remove the `moveSrc` state or the existing legend div when adding `retreatPending` in FIX-05.

## What "good" looks like

**FIX-02 correct:** Player selects a destroyer stack in the Atlantic. Only sea zones appear highlighted. Nearby land territories (UK, France) are not highlighted even though they are one hop away.

**FIX-02 incorrect:** The reachable set still uses `maxMove = 4` and shows land territories adjacent to sea zones as reachable for naval units — the pre-fix behavior.

**FIX-02 most likely failure mode:** The `moveUnits` Set is not in the `useMemo` dependency array, causing the reachable set to not update when the selection changes. Ensure `[moveSrc, moveUnits]` (or `[moveSrc, state.units, moveUnits]` if unit data is needed) is the dependency array.

**FIX-05 correct:** Attacker clicks Retreat. Banner appears: "Retreat from France: click the destination territory." Player clicks Germany. `resolveBattle` message is sent with `retreat: true, retreatTo: "germany_terr"`. Banner disappears.

**FIX-05 incorrect:** Clicking Retreat still opens a browser `prompt()` dialog, or clicking a territory during retreat-pending accidentally starts a move order instead.

**FIX-05 most likely failure mode:** `onTerritoryClick` handles retreat but also sets `moveSrc`, entering movement mode simultaneously. The `retreatPending` check must come before the movement-phase block and return early after handling the retreat click.

**FIX-06 correct:** Battleship tile has a small red circle at its top-right corner after absorbing a hit. An undamaged battleship in the same sea zone has no red dot.

**FIX-06 incorrect:** The red dot appears on submarines or destroyers (which have `hitpoints: 1`) because the `hitsTaken` field was set transiently during combat resolution.

**FIX-06 most likely failure mode:** Checking `damaged` only per-group (any ship in the stack is damaged → whole stack shows dot) rather than per-unit. Since `renderStacks` renders one tile per owner+unit-type group and the count badge already aggregates, flagging the group as damaged if any member is damaged is acceptable and is the intended behavior.
