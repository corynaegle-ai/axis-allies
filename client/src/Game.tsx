import React, { useEffect, useMemo, useState } from "react";
import {
  GameState, POWERS, POWER_ORDER, PowerId, TERRITORY_MAP, UnitId, UNITS, isAir, isLand, isSea,
} from "@aa/shared";
import { Board } from "./Board.js";
import { Panel } from "./Panel.js";
import { Net } from "./net.js";

interface GameProps {
  net: Net;
  gameId: string;
  state: GameState;
  myPower: PowerId | null;
  error: string | null;
}

export function Game({ net, gameId, state, myPower, error }: GameProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [moveSrc, setMoveSrc] = useState<string | null>(null);
  const [moveUnits, setMoveUnits] = useState<Set<string>>(new Set());

  const reachable = useMemo<Set<string>>(() => {
    if (!moveSrc) return new Set();
    const src = TERRITORY_MAP[moveSrc];
    if (!src) return new Set();
    const maxMove = 4;
    const out = new Set<string>();
    const q: [string, number][] = [[moveSrc, 0]];
    const seen = new Set<string>([moveSrc]);
    while (q.length) {
      const [id, d] = q.shift()!;
      if (d >= maxMove) continue;
      for (const n of TERRITORY_MAP[id]?.neighbors ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        out.add(n);
        q.push([n, d + 1]);
      }
    }
    return out;
  }, [moveSrc]);

  function onTerritoryClick(id: string): void {
    setSelected(id);

    // Purchase / collect / place: just select for info
    if (state.phase === "purchase" || state.phase === "collect" || state.phase === "place") {
      return;
    }

    // Movement phases: pick origin then destination
    if (state.phase === "combatMove" || state.phase === "nonCombatMove") {
      if (!moveSrc) {
        const hasOwnUnit = Object.values(state.units).some((u) => u.territory === id && u.owner === myPower);
        if (hasOwnUnit) {
          setMoveSrc(id);
          // Select all own units by default
          const own = Object.values(state.units).filter((u) => u.territory === id && u.owner === myPower);
          setMoveUnits(new Set(own.map((u) => u.id)));
        }
      } else {
        if (id === moveSrc) { setMoveSrc(null); setMoveUnits(new Set()); return; }
        // Build shortest path in domain-appropriate graph (BFS — simple).
        const path = bfsPath(moveSrc, id);
        if (!path) return;
        const unitIds = [...moveUnits];
        if (unitIds.length === 0) return;
        net.send({
          type: "moveOrder",
          gameId,
          unitIds,
          path,
          kind: state.phase === "combatMove" ? "combat" : "nonCombat",
        });
        setMoveSrc(null);
        setMoveUnits(new Set());
      }
    }
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

  return (
    <div className="app">
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
            Moving from <b>{TERRITORY_MAP[moveSrc].name}</b> · click destination ({moveUnits.size} units) — click origin again to cancel
          </div>
        )}
        {error && <div className="toast">{error}</div>}
        {state.winner && (
          <div className="toast" style={{ background: "#0f2a18", color: "#cfe", borderColor: "#2a5a3a" }}>
            {state.winner === "axis" ? "AXIS VICTORY" : "ALLIES VICTORY"}
          </div>
        )}
      </div>
      <div className="side">
        <div className="header">
          <span className="brand">Axis &amp; Allies</span>
          <span className="turn">Game {gameId}</span>
        </div>
        <Panel
          state={state}
          myPower={myPower}
          selectedTerritory={selected}
          onPurchase={onPurchase}
          onEndPhase={onEndPhase}
          onResolveBattle={onResolveBattle}
          onPlace={onPlace}
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
