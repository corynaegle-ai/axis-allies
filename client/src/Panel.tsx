import React, { useMemo, useState } from "react";
import {
  GameState, POWERS, POWER_ORDER, PURCHASABLE, UNITS, PowerId, UnitId, TERRITORY_MAP,
} from "@aa/shared";
import { Piece } from "./pieces.js";
import "./panel.css";

/**
 * Side Panel — Command Room.
 * Art direction by Mary James.
 *
 * Layout hierarchy (top → bottom, in order of priority to the player
 * mid-turn):
 *   1. COMMAND STRIP: active power banner + phase + end-phase CTA.
 *      This is what the player reads first every time it's their move.
 *   2. ACTION ZONE (phase-sensitive):
 *        purchase → shipyard grid with running total bar
 *        place    → mobilization dossier with pending unit queue
 *        combat   → battle dossier cards with dramatic ROLL button
 *   3. INTEL: treasury + income for all powers, sorted by turn order,
 *      with the acting power breathing.
 *   4. TERRITORY INSPECTOR: only when a territory is selected — lives
 *      at the bottom so it doesn't push action content off screen.
 */

interface PanelProps {
  state: GameState;
  myPower: PowerId | null;
  selectedTerritory: string | null;
  onPurchase: (orders: { unit: UnitId; qty: number }[]) => void;
  onEndPhase: () => void;
  onResolveBattle: (territory: string, opts: { retreat?: boolean; retreatTo?: string }) => void;
  onPlace: (unit: UnitId, territory: string) => void;
}

const PHASE_LABEL: Record<string, string> = {
  purchase: "Procurement",
  combatMove: "Combat Movement",
  combat: "Engagement",
  nonCombatMove: "Redeployment",
  place: "Mobilization",
  collect: "Income",
};

const PHASE_SUB: Record<string, string> = {
  purchase: "Draw from the treasury. Sign the requisitions.",
  combatMove: "Declare offensives. Set the line of advance.",
  combat: "Resolve engagements. Roll for hits.",
  nonCombatMove: "Shift the reserve. Garrison the line.",
  place: "Mobilize newly produced units to the front.",
  collect: "Tally income. Prepare the next cycle.",
};

export function Panel({
  state, myPower, selectedTerritory,
  onPurchase, onEndPhase, onResolveBattle, onPlace,
}: PanelProps): JSX.Element {
  const active = state.activePower;
  const isMyTurn = myPower === active;
  const activePower = POWERS[active];

  // Accent stripe across the top of the panel reflects who holds the initiative.
  const accentStripe: React.CSSProperties = {
    background: `linear-gradient(90deg, ${activePower.accent}, ${activePower.color}, ${activePower.accent})`,
  };

  return (
    <div className="mj-panel" style={{ ["--active-color" as any]: activePower.color, ["--active-accent" as any]: activePower.accent }}>
      <div className="mj-accent-stripe" style={accentStripe} />

      {/* 1. COMMAND STRIP ---------------------------------------------- */}
      <section className="mj-section mj-command">
        <div className="mj-command-head">
          <div className="mj-active-badge">
            <span className={"mj-pulse-dot" + (isMyTurn ? " mine" : "")} style={{ background: activePower.color, boxShadow: `0 0 0 2px ${activePower.accent}` }} />
            <div className="mj-active-names">
              <div className="mj-power-stencil" style={{ color: activePower.color, textShadow: `0 0 6px ${activePower.accent}55` }}>
                {activePower.name.toUpperCase()}
              </div>
              <div className="mj-turn-line">
                TURN {state.turn} · ROUND {state.turn} · {activePower.alliance === "axis" ? "AXIS" : "ALLIES"}
              </div>
            </div>
          </div>
          <div className="mj-phase-block">
            <div className="mj-phase-label">PHASE {phaseIndex(state.phase) + 1}/6</div>
            <div className="mj-phase-name">{PHASE_LABEL[state.phase] ?? state.phase}</div>
          </div>
        </div>
        <div className="mj-phase-sub">{PHASE_SUB[state.phase] ?? ""}</div>

        <div className="mj-phase-track">
          {PHASE_ORDER.map((ph) => (
            <div
              key={ph}
              className={
                "mj-phase-pip" +
                (ph === state.phase ? " active" : "") +
                (phaseIndex(ph) < phaseIndex(state.phase) ? " past" : "")
              }
              title={PHASE_LABEL[ph] ?? ph}
            />
          ))}
        </div>

        <div className="mj-command-actions">
          <button
            className="mj-cta"
            disabled={!isMyTurn}
            onClick={onEndPhase}
            title={isMyTurn ? `End ${PHASE_LABEL[state.phase] ?? state.phase}` : "Waiting for the active power"}
          >
            <span className="mj-cta-label">{isMyTurn ? "END PHASE" : "WAITING"}</span>
            <span className="mj-cta-sub">{isMyTurn ? (PHASE_LABEL[state.phase] ?? state.phase) : POWERS[active].name + " is deciding"}</span>
          </button>
          {myPower && (
            <div className="mj-you-tag">
              <span className="mj-you-label">YOU</span>
              <span className="mj-you-name" style={{ color: POWERS[myPower].color }}>{POWERS[myPower].name}</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. ACTION ZONE ------------------------------------------------ */}
      {state.phase === "purchase" && isMyTurn && (
        <PurchaseBox
          treasury={state.powers[active].treasury}
          powerColor={activePower.color}
          powerAccent={activePower.accent}
          onSubmit={onPurchase}
        />
      )}

      {state.phase === "place" && isMyTurn && (
        <PlaceBox
          state={state}
          power={active}
          selectedTerritory={selectedTerritory}
          onPlace={onPlace}
        />
      )}

      {state.phase === "combat" && (
        <BattleBox state={state} myPower={myPower} onResolve={onResolveBattle} />
      )}

      {/* 3. INTEL ------------------------------------------------------ */}
      <section className="mj-section mj-intel">
        <header className="mj-h3"><span>Powers</span><span className="mj-h3-sub">treasury · income</span></header>
        <div className="mj-powers-list">
          {POWER_ORDER.map((pid) => {
            const pp = POWERS[pid];
            const s = state.powers[pid];
            const isActive = pid === active;
            const isMe = pid === myPower;
            return (
              <div
                key={pid}
                className={
                  "mj-power-row" +
                  (isActive ? " active" : "") +
                  (isMe ? " mine" : "") +
                  (s.eliminated ? " eliminated" : "")
                }
              >
                <span className="mj-power-flag" style={{ background: pp.color, borderColor: pp.accent }} />
                <span className="mj-power-name" style={{ color: pp.color }}>
                  {pp.name}
                  {pp.alliance === "axis"
                    ? <span className="mj-alliance-tag axis">AXIS</span>
                    : <span className="mj-alliance-tag allies">ALLIES</span>}
                </span>
                <span className="mj-power-nums">
                  <span className="mj-treasury" title="Treasury (IPC)">{s.treasury}</span>
                  <span className="mj-income" title="Income per turn">+{s.income}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. TERRITORY INSPECTOR --------------------------------------- */}
      {selectedTerritory && (
        <TerritoryInspector state={state} territory={selectedTerritory} />
      )}
    </div>
  );
}

/* =================================================================== */
/*  PURCHASE BOX — the shipyard                                         */
/* =================================================================== */

function PurchaseBox({
  treasury, powerColor, powerAccent, onSubmit,
}: {
  treasury: number;
  powerColor: string;
  powerAccent: string;
  onSubmit: (o: { unit: UnitId; qty: number }[]) => void;
}) {
  const [qty, setQty] = useState<Record<UnitId, number>>({} as Record<UnitId, number>);
  const [collapsed, setCollapsed] = useState(false);
  const total = useMemo(
    () => Object.entries(qty).reduce((s, [u, q]) => s + UNITS[u as UnitId].cost * (q || 0), 0),
    [qty],
  );
  const over = total > treasury;
  const remaining = treasury - total;
  const fillPct = treasury > 0 ? Math.min(100, (total / treasury) * 100) : 0;
  const totalPicked = useMemo(
    () => Object.values(qty).reduce<number>((s, q) => s + (q || 0), 0),
    [qty],
  );

  function bump(u: UnitId, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, (prev[u] ?? 0) + delta);
      const cand = { ...prev, [u]: next };
      const candTotal = Object.entries(cand).reduce((s, [uu, q]) => s + UNITS[uu as UnitId].cost * (q || 0), 0);
      // Allow exceeding so we can show the over state, but never let a single + push past by huge margins.
      if (delta > 0 && candTotal > treasury + UNITS[u].cost * 4) return prev;
      return cand;
    });
  }

  return (
    <section className={"mj-section mj-shipyard" + (collapsed ? " collapsed" : "")}>
      <header className="mj-h3 mj-h3-collapsible" onClick={() => setCollapsed((c) => !c)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed((c) => !c); } }}
              aria-expanded={!collapsed} aria-controls="mj-shipyard-body"
              title={collapsed ? "Expand requisitions" : "Collapse requisitions"}>
        <span className="mj-collapse-caret" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
        <span>Shipyard · Requisitions</span>
        <span className="mj-h3-sub">
          {collapsed
            ? `${totalPicked} picked · ${total}/${treasury} IPC`
            : `${treasury} IPC available`}
        </span>
      </header>

      {collapsed ? null : (
      <div id="mj-shipyard-body">
      <div className={"mj-budget-bar" + (over ? " over" : "")} title={`${total} / ${treasury} IPC committed`}>
        <div
          className="mj-budget-fill"
          style={{
            width: `${fillPct}%`,
            background: `linear-gradient(90deg, ${powerAccent}, ${powerColor})`,
          }}
        />
        <div className="mj-budget-labels">
          <span>{total} IPC</span>
          <span className={"mj-budget-remaining" + (over ? " over" : "")}>
            {over ? `OVER BUDGET BY ${Math.abs(remaining)}` : `${remaining} remaining`}
          </span>
        </div>
      </div>

      <div className="mj-purchase-list">
        {PURCHASABLE.map((u) => {
          const def = UNITS[u];
          const n = qty[u] ?? 0;
          const lineCost = def.cost * n;
          const nextCantAfford = total + def.cost > treasury;
          return (
            <div key={u} className={"mj-purchase-row" + (n > 0 ? " picked" : "")}>
              <div className="mj-purchase-piece">
                <Piece unit={u} fill={powerColor} accent={powerAccent} size={28} />
              </div>
              <div className="mj-purchase-meta">
                <div className="mj-purchase-name">{def.name}</div>
                <div className="mj-purchase-stats">
                  <StatBlock label="A" value={def.attack} />
                  <StatBlock label="D" value={def.defense} />
                  <StatBlock label="M" value={def.move} />
                  <StatBlock label="HP" value={def.hitpoints} subtle />
                </div>
              </div>
              <div className="mj-purchase-cost">
                <span className="mj-cost-num">{def.cost}</span>
                <span className="mj-cost-unit">IPC</span>
              </div>
              <div className="mj-stepper">
                <button
                  type="button"
                  className="mj-step-btn"
                  onClick={() => bump(u, -1)}
                  disabled={n === 0}
                  aria-label={`Remove one ${def.name}`}
                >−</button>
                <span className="mj-step-qty">{n}</span>
                <button
                  type="button"
                  className="mj-step-btn"
                  onClick={() => bump(u, +1)}
                  disabled={nextCantAfford}
                  aria-label={`Add one ${def.name}`}
                >+</button>
              </div>
              {n > 0 && (
                <div className="mj-purchase-subtotal">{lineCost}</div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="mj-cta mj-cta-confirm"
        disabled={over || total === 0}
        onClick={() => {
          const orders = (Object.entries(qty) as [UnitId, number][])
            .filter(([, q]) => q > 0)
            .map(([unit, qty]) => ({ unit, qty }));
          onSubmit(orders);
          setQty({} as Record<UnitId, number>);
        }}
      >
        <span className="mj-cta-label">
          {over ? "INSUFFICIENT TREASURY" : total === 0 ? "NOTHING REQUISITIONED" : "CONFIRM REQUISITIONS"}
        </span>
        <span className="mj-cta-sub">
          {total > 0 && !over ? `Commit ${total} IPC` : over ? `Exceeds treasury by ${Math.abs(remaining)}` : "Pick at least one unit"}
        </span>
      </button>
      </div>
      )}
    </section>
  );
}

function StatBlock({ label, value, subtle }: { label: string; value: number; subtle?: boolean }) {
  return (
    <span className={"mj-stat" + (subtle ? " subtle" : "")}>
      <span className="mj-stat-label">{label}</span>
      <span className="mj-stat-val">{value}</span>
    </span>
  );
}

/* =================================================================== */
/*  PLACE BOX — mobilization dossier                                   */
/* =================================================================== */

function PlaceBox({
  state, power, selectedTerritory, onPlace,
}: {
  state: GameState; power: PowerId; selectedTerritory: string | null;
  onPlace: (u: UnitId, t: string) => void;
}) {
  const pool = state.powers[power].producedThisTurn;
  const target = selectedTerritory ? TERRITORY_MAP[selectedTerritory] : null;
  const pp = POWERS[power];
  const remainingTotal = pool.reduce((s, o) => s + o.qty, 0);

  return (
    <section className="mj-section mj-mobilize">
      <header className="mj-h3">
        <span>Mobilization</span>
        <span className="mj-h3-sub">{remainingTotal} unit{remainingTotal === 1 ? "" : "s"} staged</span>
      </header>

      <div className="mj-mobilize-target">
        <span className="mj-mobilize-target-label">DEPLOY TO</span>
        <span className="mj-mobilize-target-name">
          {target ? target.name : "— select a territory on the map —"}
        </span>
      </div>

      {pool.length === 0 ? (
        <div className="mj-empty">No units in production this cycle.</div>
      ) : (
        <div className="mj-mobilize-list">
          {pool.map((o, i) => (
            <div key={i} className="mj-mobilize-row">
              <div className="mj-mobilize-piece">
                <Piece unit={o.unit} fill={pp.color} accent={pp.accent} size={24} />
              </div>
              <div className="mj-mobilize-name">{UNITS[o.unit].name}</div>
              <div className="mj-mobilize-qty">×{o.qty}</div>
              <button
                className="mj-btn mj-btn-ghost"
                disabled={!selectedTerritory}
                onClick={() => selectedTerritory && onPlace(o.unit, selectedTerritory)}
                title={selectedTerritory ? `Deploy 1 ${UNITS[o.unit].name} to ${target?.name ?? selectedTerritory}` : "Select a territory first"}
              >
                DEPLOY 1
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* =================================================================== */
/*  BATTLE BOX — dossier cards                                         */
/* =================================================================== */

function BattleBox({
  state, myPower, onResolve,
}: {
  state: GameState;
  myPower: PowerId | null;
  onResolve: (t: string, opts: { retreat?: boolean; retreatTo?: string }) => void;
}) {
  const open = state.battles.filter((b) => !b.resolved);

  if (open.length === 0) {
    return (
      <section className="mj-section mj-battles">
        <header className="mj-h3"><span>Engagements</span><span className="mj-h3-sub">all quiet</span></header>
        <div className="mj-empty">No active battles. End the phase to proceed.</div>
      </section>
    );
  }

  return (
    <section className="mj-section mj-battles">
      <header className="mj-h3"><span>Engagements</span><span className="mj-h3-sub">{open.length} open</span></header>
      <div className="mj-battle-stack">
        {open.map((b) => {
          const t = TERRITORY_MAP[b.territory];
          const canAct = myPower === b.attacker;
          const atkPower = POWERS[b.attacker];
          const defPower = b.defender ? POWERS[b.defender] : null;
          const atkUnits = b.attackingUnits
            .map((id) => state.units[id])
            .filter(Boolean);
          const defUnits = b.defendingUnits
            .map((id) => state.units[id])
            .filter(Boolean);
          const atkCounts = countUnits(atkUnits.map((u) => u.unit));
          const defCounts = countUnits(defUnits.map((u) => u.unit));
          const lastRound = b.rounds[b.rounds.length - 1];

          return (
            <article className="mj-battle-card" key={b.territory}>
              <div className="mj-battle-clip" />
              <div className="mj-battle-head">
                <div className="mj-battle-title">{t?.name ?? b.territory}</div>
                <div className="mj-battle-meta">
                  Round {b.rounds.length + 1}
                  {t?.terrain === "sea" ? " · Sea" : " · Land"}
                </div>
              </div>

              <div className="mj-battle-vs">
                <BattleSide
                  label="ATTACKER"
                  power={atkPower}
                  counts={atkCounts}
                  side="atk"
                />
                <div className="mj-battle-vs-mark">
                  <div className="mj-vs-line" />
                  <div className="mj-vs-txt">VS</div>
                  <div className="mj-vs-line" />
                </div>
                <BattleSide
                  label="DEFENDER"
                  power={defPower}
                  counts={defCounts}
                  side="def"
                />
              </div>

              {lastRound && (
                <div className="mj-battle-log">
                  <LogRow
                    label="ATK"
                    rolls={lastRound.attackerRolls}
                    hits={lastRound.attackerHits}
                    color={atkPower.color}
                  />
                  <LogRow
                    label="DEF"
                    rolls={lastRound.defenderRolls}
                    hits={lastRound.defenderHits}
                    color={defPower?.color ?? "#888"}
                  />
                </div>
              )}

              <div className="mj-battle-actions">
                <button
                  className="mj-cta mj-cta-roll"
                  disabled={!canAct}
                  onClick={() => onResolve(b.territory, {})}
                >
                  <span className="mj-cta-label">ROLL</span>
                  <span className="mj-cta-sub">{canAct ? "Engage" : "waiting on attacker"}</span>
                </button>
                <button
                  className="mj-btn mj-btn-retreat"
                  disabled={!canAct}
                  onClick={() => {
                    const origin = prompt("Retreat to which adjacent friendly territory? (type id)") || "";
                    if (origin) onResolve(b.territory, { retreat: true, retreatTo: origin });
                  }}
                >
                  Retreat
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BattleSide({
  label, power, counts, side,
}: {
  label: string;
  power: { color: string; accent: string; name: string } | null;
  counts: { unit: UnitId; n: number }[];
  side: "atk" | "def";
}) {
  const color = power?.color ?? "#666";
  const accent = power?.accent ?? "#222";
  // Prominent silhouette = the most numerous combat unit
  const hero = counts[0];
  return (
    <div className={"mj-battle-side " + side}>
      <div className="mj-battle-side-head">
        <span className="mj-battle-side-label">{label}</span>
        <span className="mj-battle-side-name" style={{ color }}>{power?.name ?? "—"}</span>
      </div>
      <div className="mj-battle-silhouette" style={{ background: `radial-gradient(ellipse at center, ${color}22, transparent 70%)` }}>
        {hero ? <Piece unit={hero.unit} fill={color} accent={accent} size={44} /> : null}
      </div>
      <div className="mj-battle-side-roster">
        {counts.length === 0 && <span className="mj-empty-inline">—</span>}
        {counts.map(({ unit, n }) => (
          <span key={unit} className="mj-roster-chip" title={UNITS[unit].name}>
            <Piece unit={unit} fill={color} accent={accent} size={14} />
            <span className="mj-roster-n">×{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function LogRow({ label, rolls, hits, color }: { label: string; rolls: number[]; hits: number; color: string }) {
  return (
    <div className="mj-log-row">
      <span className="mj-log-label" style={{ color }}>{label}</span>
      <div className="mj-pips">
        {rolls.map((r, i) => (
          <span
            key={i}
            className={"mj-pip" + (isHit(r, rolls, hits, i) ? " hit" : "")}
            title={`Rolled ${r}`}
          >{r}</span>
        ))}
        {rolls.length === 0 && <span className="mj-pip muted">—</span>}
      </div>
      <span className="mj-log-hits">{hits} hit{hits === 1 ? "" : "s"}</span>
    </div>
  );
}

// We don't have per-die hit/miss flags in the log; highlight the N lowest
// rolls as the hits (standard A&A hits are "rolled <= stat" so lower = hit).
function isHit(_r: number, rolls: number[], hits: number, idx: number): boolean {
  if (hits === 0) return false;
  const sortedIdx = rolls
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .slice(0, hits)
    .map((x) => x.i);
  return sortedIdx.includes(idx);
}

/* =================================================================== */
/*  TERRITORY INSPECTOR                                                */
/* =================================================================== */

function TerritoryInspector({ state, territory }: { state: GameState; territory: string }) {
  const t = TERRITORY_MAP[territory];
  const owner = state.territories[territory]?.owner ?? null;
  const ownerPower = owner ? POWERS[owner] : null;
  const units = Object.values(state.units).filter((u) => u.territory === territory);

  const byOwner = new Map<PowerId, Map<UnitId, number>>();
  for (const u of units) {
    const o = byOwner.get(u.owner) ?? new Map<UnitId, number>();
    o.set(u.unit, (o.get(u.unit) ?? 0) + 1);
    byOwner.set(u.owner, o);
  }

  const stripeColor = ownerPower?.color ?? "#3a4656";
  const stripeAccent = ownerPower?.accent ?? "#1e2530";

  return (
    <section
      className={"mj-section mj-inspector" + (owner ? "" : " neutral")}
      style={{ ["--strip" as any]: stripeColor, ["--strip-accent" as any]: stripeAccent }}
    >
      <header className="mj-h3">
        <span>Territory</span>
        <span className="mj-h3-sub">{t?.terrain === "sea" ? "sea zone" : "land"}</span>
      </header>
      <div className="mj-inspector-body">
        <div className="mj-inspector-title">
          <span className="mj-inspector-name">{t?.name ?? territory}</span>
          {t?.terrain === "land" && t.ipc > 0 && (
            <span className="mj-ipc-badge" title={`${t.ipc} IPC per turn`}>
              <span className="mj-ipc-num">{t.ipc}</span>
              <span className="mj-ipc-unit">IPC</span>
            </span>
          )}
        </div>
        <div className="mj-inspector-owner">
          CONTROLLED BY{" "}
          <span style={{ color: ownerPower?.color ?? "var(--mj-steel)" }}>
            {ownerPower?.name.toUpperCase() ?? "NEUTRAL"}
          </span>
          {t?.originalOwner && owner && t.originalOwner !== owner && (
            <span className="mj-inspector-orig">
              (originally {POWERS[t.originalOwner].name})
            </span>
          )}
        </div>

        {byOwner.size === 0 ? (
          <div className="mj-empty">No units present.</div>
        ) : (
          <div className="mj-inspector-groups">
            {[...byOwner.entries()].map(([p, unitsMap]) => {
              const pp = POWERS[p];
              const total = [...unitsMap.values()].reduce((s, n) => s + n, 0);
              const valueSum = [...unitsMap.entries()].reduce(
                (s, [u, n]) => s + UNITS[u].cost * n, 0,
              );
              return (
                <div
                  key={p}
                  className="mj-inspector-group"
                  style={{ ["--g-color" as any]: pp.color, ["--g-accent" as any]: pp.accent }}
                >
                  <div className="mj-inspector-group-head">
                    <span className="mj-power-flag" style={{ background: pp.color, borderColor: pp.accent }} />
                    <span className="mj-inspector-group-name" style={{ color: pp.color }}>
                      {pp.name}
                    </span>
                    <span className="mj-inspector-group-meta">
                      {total} unit{total === 1 ? "" : "s"} · {valueSum} IPC
                    </span>
                  </div>
                  <div className="mj-inspector-pieces">
                    {[...unitsMap.entries()].map(([u, n]) => (
                      <div key={u} className="mj-inspector-chip" title={`${UNITS[u].name} ×${n}`}>
                        <Piece unit={u} fill={pp.color} accent={pp.accent} size={20} />
                        <span className="mj-inspector-chip-n">×{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* =================================================================== */
/*  utilities                                                          */
/* =================================================================== */

const PHASE_ORDER: GameState["phase"][] = [
  "purchase", "combatMove", "combat", "nonCombatMove", "place", "collect",
];

function phaseIndex(p: GameState["phase"]): number {
  const i = PHASE_ORDER.indexOf(p);
  return i < 0 ? 0 : i;
}

function countUnits(units: UnitId[]): { unit: UnitId; n: number }[] {
  const m = new Map<UnitId, number>();
  for (const u of units) m.set(u, (m.get(u) ?? 0) + 1);
  const combatRank: Record<UnitId, number> = {
    battleship: 1, carrier: 2, bomber: 3, fighter: 4, tank: 5, cruiser: 6,
    destroyer: 7, submarine: 8, artillery: 9, infantry: 10, transport: 11,
    aa: 12, factory: 13,
  };
  return [...m.entries()]
    .map(([unit, n]) => ({ unit, n }))
    .sort((a, b) => (combatRank[a.unit] - combatRank[b.unit]) || (b.n - a.n));
}
