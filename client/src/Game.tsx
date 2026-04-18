import React, { useEffect, useMemo, useState } from "react";
import {
  GameState, POWERS, POWER_ORDER, PowerId, TERRITORY_MAP, UnitId, UNITS, isAir, isLand, isSea,
  type AuthUser,
} from "@aa/shared";
import { Board } from "./Board.js";
import { Panel } from "./Panel.js";
import { Net } from "./net.js";
import { UnitSelectionPopup } from "./UnitSelectionPopup.js";

interface GameProps {
  net: Net;
  gameId: string;
  state: GameState;
  myPower: PowerId | null;
  authUser: AuthUser | null;
  error: string | null;
  notice: string | null;
  lastSaved: number | null;
  onLogout: () => void;
  onQuit: () => void;
}

export function Game({ net, gameId, state, myPower, authUser, error, notice, lastSaved, onLogout, onQuit }: GameProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [moveSrc, setMoveSrc] = useState<string | null>(null);
  const [moveUnits, setMoveUnits] = useState<string[]>([]);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [pickerSource, setPickerSource] = useState<string | null>(null);
  const [retreatPending, setRetreatPending] = useState<string | null>(null);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s so the "saved X minutes ago" label stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const reachable = useMemo<Set<string>>(() => {
    if (!moveSrc) return new Set();
    const src = TERRITORY_MAP[moveSrc];
    if (!src) return new Set();
    const maxMove = moveUnits.length > 0
      ? Math.max(...moveUnits.map((id) => UNITS[state.units[id]?.unit ?? "infantry"].move))
      : 0;
    if (maxMove === 0) return new Set();

    const domains = new Set(moveUnits.map((id) => UNITS[state.units[id]?.unit ?? "infantry"].domain));
    const allLand = [...domains].every((d) => d === "land");
    const allSea = [...domains].every((d) => d === "sea");

    const out = new Set<string>();
    const q: [string, number][] = [[moveSrc, 0]];
    const seen = new Set<string>([moveSrc]);
    while (q.length) {
      const [id, d] = q.shift()!;
      if (d >= maxMove) continue;
      for (const n of TERRITORY_MAP[id]?.neighbors ?? []) {
        if (seen.has(n)) continue;
        const nTerrain = TERRITORY_MAP[n]?.terrain;
        if (allLand && nTerrain !== "land") continue;
        if (allSea && nTerrain !== "sea") continue;
        seen.add(n);
        out.add(n);
        q.push([n, d + 1]);
      }
    }
    return out;
  }, [moveSrc, moveUnits, state.units]);

  function onRetreatRequest(battleTerritory: string) {
    setRetreatPending(battleTerritory);
  }

  function onTerritoryClick(id: string): void {
    if (retreatPending) {
      net.send({ type: "resolveBattle", gameId, territory: retreatPending, retreat: true, retreatTo: id });
      setRetreatPending(null);
      return;
    }
    setSelected(id);

    if (state.phase === "purchase" || state.phase === "collect" || state.phase === "place") return;

    if (state.phase === "combatMove" || state.phase === "nonCombatMove") {
      if (myPower !== state.activePower) return;

      if (!moveSrc) {
        const myUnits = Object.values(state.units).filter(u => u.territory === id && u.owner === myPower);
        if (myUnits.length > 0) {
          setPickerSource(id);
          setShowUnitPicker(true);
        }
      } else {
        if (id === moveSrc) { setMoveSrc(null); setMoveUnits([]); return; }
        const path = bfsPath(moveSrc, id);
        if (!path || moveUnits.length === 0) return;
        net.send({
          type: "moveOrder",
          gameId,
          unitIds: moveUnits,
          path,
          kind: state.phase === "combatMove" ? "combat" : "nonCombat",
        });
        setMoveSrc(null);
        setMoveUnits([]);
      }
    }
  }

  function onPickerConfirm(unitIds: string[]) {
    setShowUnitPicker(false);
    setMoveSrc(pickerSource!);
    setMoveUnits(unitIds);
    setPickerSource(null);
  }

  function onPickerCancel() {
    setShowUnitPicker(false);
    setPickerSource(null);
  }

  function onPurchase(orders: { unit: UnitId; qty: number }[]) {
    net.send({ type: "purchase", gameId, orders });
  }
  function onEndPhase() { net.send({ type: "endPhase", gameId }); }
  function onResolveBattle(territory: string, opts: { retreat?: boolean; retreatTo?: string }) {
    net.send({ type: "resolveBattle", gameId, territory, ...opts });
  }
  function onPlace(unit: UnitId, territory: string) {
    net.send({ type: "placeUnit", gameId, unit, territory });
  }

  function savedLabel(): string {
    if (!lastSaved) return "";
    const secs = Math.floor((now - lastSaved) / 1000);
    if (secs < 5) return "Saved";
    if (secs < 60) return `Saved ${secs}s ago`;
    return `Saved ${Math.floor(secs / 60)}m ago`;
  }

  return (
    <div className="app">
      {/* Quit confirmation overlay */}
      {confirmingQuit && (
        <div className="quit-overlay">
          <div className="quit-dialog">
            <div className="quit-title">Forfeit game?</div>
            <div className="quit-body">
              {myPower
                ? `You will surrender as ${POWERS[myPower].name}. Your territories remain on the map — opponents can still attack them.`
                : "You will leave this game."}
            </div>
            <div className="quit-actions">
              <button className="btn" onClick={() => setConfirmingQuit(false)}>Cancel</button>
              <button
                className="btn danger"
                onClick={() => { setConfirmingQuit(false); onQuit(); }}
              >
                Yes, forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="board-wrap">
        <Board
          state={state}
          myPower={myPower}
          selectedTerritory={selected}
          setSelectedTerritory={setSelected}
          reachable={reachable}
          onTerritoryClick={onTerritoryClick}
        />
        <div className="phase-banner">
          <span className="power-chip" style={{ background: POWERS[state.activePower].color }}>
            <span className="dot" style={{ background: POWERS[state.activePower].accent }} />
            {POWERS[state.activePower].name}
          </span>
          <span className="phase-name">{state.phase}</span>
          {myPower && <span style={{ fontSize: 12, color: "#8aa0b5" }}>
            you: {POWERS[myPower].name} {myPower === state.activePower ? "— your move" : "— waiting"}
          </span>}
        </div>
        {moveSrc && (
          <div className="legend">
            Moving from <b>{TERRITORY_MAP[moveSrc].name}</b> · click destination ({moveUnits.length} units) — click origin again to cancel
          </div>
        )}
        {retreatPending && (
          <div className="legend">
            Retreat from <b>{TERRITORY_MAP[retreatPending]?.name ?? retreatPending}</b> · click destination territory to retreat
          </div>
        )}
        {error && <div className="toast toast-error">{error}</div>}
        {notice && !error && <div className="toast toast-notice">{notice}</div>}
        {state.winner && (
          <div className="toast toast-victory">
            {state.winner === "axis" ? "AXIS VICTORY" : "ALLIES VICTORY"}
          </div>
        )}
        {showUnitPicker && pickerSource && myPower && (
          <UnitSelectionPopup
            sourceId={pickerSource}
            units={Object.values(state.units).filter(u => u.territory === pickerSource && u.owner === myPower)}
            myPower={myPower}
            state={state}
            onConfirm={onPickerConfirm}
            onCancel={onPickerCancel}
          />
        )}
      </div>

      <div className="side">
        <div className="header">
          <span className="brand">Axis &amp; Allies</span>
          <span className="save-status">{savedLabel()}</span>
          <span className="turn">Game {gameId}</span>
          {authUser && (
            <span className="profile-chip" title={authUser.email}>
              {authUser.displayName}
            </span>
          )}
          <button className="btn logout-btn" onClick={onLogout} title="Log out">
            Log out
          </button>
          {!state.winner && (
            <button
              className="btn danger quit-btn"
              title="Forfeit and leave this game"
              onClick={() => setConfirmingQuit(true)}
            >
              Quit
            </button>
          )}
        </div>
        <Panel
          state={state}
          myPower={myPower}
          selectedTerritory={selected}
          onPurchase={onPurchase}
          onEndPhase={onEndPhase}
          onResolveBattle={onResolveBattle}
          onPlace={onPlace}
          onRetreat={onRetreatRequest}
        />
        <div className="log">
          {[...state.log].reverse().slice(0, 80).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

/** Simple BFS through the territory graph (no domain constraint — sufficient for display). */
function bfsPath(from: string, to: string): string[] | null {
  const prev: Record<string, string | null> = { [from]: null };
  const q = [from];
  while (q.length) {
    const id = q.shift()!;
    if (id === to) {
      const out: string[] = [];
      let cur: string | null = id;
      while (cur) { out.unshift(cur); cur = prev[cur]; }
      return out;
    }
    for (const n of TERRITORY_MAP[id]?.neighbors ?? []) {
      if (n in prev) continue;
      prev[n] = id;
      q.push(n);
    }
  }
  return null;
}
