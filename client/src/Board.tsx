import React, { useEffect, useMemo, useRef, useState } from "react";
import { TERRITORIES, TERRITORY_MAP, POWERS, UNITS, type GameState, type PowerId, type UnitId, type UnitStack } from "@aa/shared";
import { Piece } from "./pieces.js";
import { NaturalEarthLand } from "./geography.js";
import "./board.css";

interface BoardProps {
  state: GameState;
  myPower: PowerId | null;
  selectedTerritory: string | null;
  setSelectedTerritory: (t: string | null) => void;
  reachable: Set<string>;
  onTerritoryClick: (id: string) => void;
}

// World dimensions for the map — all territory (x,y) are in this coordinate space.
const WORLD_W = 2400;
const WORLD_H = 1200;

// Default viewport the "Center Map" button returns to.
const HOME_VIEWPORT = { x: 200, y: 80, scale: 0.55 };

// Pan damping: <1 means the map moves slower than the mouse (more control, less overshoot).
const PAN_SPEED = 0.45;

// Continent scenery is now rendered by <NaturalEarthLand /> using Natural Earth
// coastline data (d3-geo + topojson-client + world-atlas). It is purely
// decorative and does not participate in adjacency or gameplay logic.

// ----- Curved adjacency path helper (a subtle bezier arc) -----
function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset ~ 8% of length, capped
  const off = Math.min(28, len * 0.08);
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * off;
  const cy = my + ny * off;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function Board(props: BoardProps) {
  const { state, myPower, selectedTerritory, reachable, onTerritoryClick } = props;
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewport, setViewport] = useState({ ...HOME_VIEWPORT });
  const [drag, setDrag] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);

  // Pan — PAN_SPEED damps the world delta so the map tracks more slowly than the mouse.
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as Element).closest("[data-territory]") || (e.target as Element).closest("[data-stack]")) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ ox: e.clientX, oy: e.clientY, x: viewport.x, y: viewport.y });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = ((e.clientX - drag.ox) * PAN_SPEED) / viewport.scale;
    const dy = ((e.clientY - drag.oy) * PAN_SPEED) / viewport.scale;
    setViewport({ ...viewport, x: drag.x - dx, y: drag.y - dy });
  }
  function onPointerUp() { setDrag(null); }

  function centerMap() { setViewport({ ...HOME_VIEWPORT }); }

  // Zoom (wheel)
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(0.25, Math.min(2.2, viewport.scale * factor));
    // zoom toward cursor:
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({
      scale: newScale,
      x: wx - mx / newScale,
      y: wy - my / newScale,
    });
  }

  const vbw = WORLD_W;
  const vbh = WORLD_H;
  const viewBox = `${viewport.x} ${viewport.y} ${vbw / viewport.scale} ${vbh / viewport.scale}`;

  // Group units by territory → owner → unit type (for stacking display).
  const stacksByTerritory = useMemo(() => {
    const m: Record<string, Record<PowerId, Partial<Record<UnitId, UnitStack[]>>>> = {};
    for (const u of Object.values(state.units)) {
      (m[u.territory] ??= {} as any);
      (m[u.territory][u.owner] ??= {});
      const arr = (m[u.territory][u.owner][u.unit] ??= []);
      arr.push(u);
    }
    return m;
  }, [state.units]);

  return (
    <>
    <svg
      ref={svgRef}
      className={"board-svg" + (drag ? " grabbing" : "")}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <defs>
        {/* Deep nautical ocean gradient */}
        <radialGradient id="ocean-grad" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#2e5d86" />
          <stop offset="55%" stopColor="#1a3f5e" />
          <stop offset="100%" stopColor="#0c1f30" />
        </radialGradient>

        {/* Parchment tone for landmass blobs */}
        <radialGradient id="parchment-grad" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#e7d3a6" />
          <stop offset="70%" stopColor="#c7ad7a" />
          <stop offset="100%" stopColor="#9a8457" />
        </radialGradient>

        {/* Subtle diagonal hatch on sea for texture */}
        <pattern id="sea-hatch" patternUnits="userSpaceOnUse" width="22" height="22" patternTransform="rotate(22)">
          <rect width="22" height="22" fill="url(#ocean-grad)" />
          <line x1="0" y1="0" x2="0" y2="22" stroke="#2a5678" strokeOpacity="0.35" strokeWidth="1" />
          <line x1="11" y1="0" x2="11" y2="22" stroke="#143249" strokeOpacity="0.30" strokeWidth="1" />
        </pattern>

        {/* Per-power territory gradient tints */}
        <linearGradient id="land-ru" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8a7a8" /><stop offset="100%" stopColor="#a66061" />
        </linearGradient>
        <linearGradient id="land-de" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8b8b8" /><stop offset="100%" stopColor="#7a7a7a" />
        </linearGradient>
        <linearGradient id="land-uk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ead7a1" /><stop offset="100%" stopColor="#a88a44" />
        </linearGradient>
        <linearGradient id="land-jp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2c488" /><stop offset="100%" stopColor="#b57a2c" />
        </linearGradient>
        <linearGradient id="land-us" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b5d8c2" /><stop offset="100%" stopColor="#3f7a5e" />
        </linearGradient>
        <linearGradient id="land-neutral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dccfa0" /><stop offset="100%" stopColor="#a08a58" />
        </linearGradient>

        {/* Drop-shadow for land territories (depth) */}
        <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="1.5" dy="2" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft-edged shadow for continent blobs */}
        <filter id="blob-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="3" dy="4" result="b" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Sea label soft shadow */}
        <filter id="sea-label-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0" dy="1" result="b" />
          <feComponentTransfer><feFuncA type="linear" slope="0.75" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Cartouche frame gradient */}
        <linearGradient id="cartouche-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e2b5" />
          <stop offset="100%" stopColor="#c7a556" />
        </linearGradient>
      </defs>

      {/* Ocean background (deeper gradient) */}
      <rect x="0" y="0" width={WORLD_W} height={WORLD_H} fill="url(#ocean-grad)" />
      {/* Hatch overlay, lightly opaque, for paper-map feel */}
      <rect x="0" y="0" width={WORLD_W} height={WORLD_H} fill="url(#sea-hatch)" opacity="0.35" />

      {/* Natural Earth coastline scenery (decorative, below territories) */}
      <NaturalEarthLand />

      {/* Sea zone labels (beneath sea ellipses/territories) */}
      {TERRITORIES.filter((t) => t.terrain === "sea").map((t) => (
        <text
          key={`sea-name-${t.id}`}
          className="sea-zone-label"
          x={t.x}
          y={t.y - 54}
          filter="url(#sea-label-shadow)"
        >
          {t.name}
        </text>
      ))}

      {/* Curved adjacency lines — warm dashed arcs */}
      <g className="adjacency-layer">
        {TERRITORIES.flatMap((t) =>
          t.neighbors.filter((n) => n > t.id).map((n) => {
            const a = t;
            const b = TERRITORY_MAP[n];
            if (!b) return null;
            return (
              <path
                key={`adj-${t.id}-${n}`}
                d={arcPath(a.x, a.y, b.x, b.y)}
                className="adj-line"
                fill="none"
              />
            );
          })
        )}
      </g>

      {/* Territory shapes */}
      {TERRITORIES.map((t) => {
        const owner = state.territories[t.id]?.owner ?? null;
        const ownerCls = owner ? ownerShort(owner) : "neutral";
        const isCap = owner != null && POWERS[owner].capital === t.id;
        const isSelected = selectedTerritory === t.id;
        const isReach = reachable.has(t.id);
        const r = t.terrain === "land" ? 30 : 26;
        return (
          <g key={t.id} data-territory={t.id}
             onClick={(e) => { e.stopPropagation(); onTerritoryClick(t.id); }}
             style={{ cursor: "pointer" }}>
            {t.terrain === "land" ? (
              <polygon
                className={`territory land ${ownerCls} ${isSelected ? "selected" : ""} ${isReach ? "reachable" : ""}`}
                points={hexPoints(t.x, t.y, r)}
                filter="url(#land-shadow)"
              />
            ) : (
              <ellipse
                className={`territory sea ${isSelected ? "selected" : ""} ${isReach ? "reachable" : ""}`}
                cx={t.x} cy={t.y} rx={r} ry={r * 0.72}
              />
            )}
            {isCap && <circle className="capital-marker" cx={t.x} cy={t.y - 18} r={4} />}
            <text className={"territory-label" + (t.terrain === "sea" ? " sea-label-inner" : "")} x={t.x} y={t.y - 4}>{t.name}</text>
            {t.terrain === "land" && t.ipc > 0 && (
              <text className="territory-ipc" x={t.x} y={t.y + 4}>IPC {t.ipc}</text>
            )}

            {/* Unit stacks: arranged in a small grid inside the territory */}
            {renderStacks(t.id, t.x, t.y + 10, stacksByTerritory[t.id])}
          </g>
        );
      })}

      {/* Active power marker at their capital */}
      {(() => {
        const cap = POWERS[state.activePower].capital;
        const t = TERRITORY_MAP[cap];
        if (!t) return null;
        return <circle cx={t.x} cy={t.y - 30} r={10} fill="none" stroke="#ffd05b" strokeWidth="2" strokeDasharray="4 4">
          <animate attributeName="r" values="10;14;10" dur="1.6s" repeatCount="indefinite" />
        </circle>;
      })()}

      {/* Compass rose (lower-left ocean) */}
      <CompassRose cx={300} cy={1080} size={110} />

      {/* Title cartouche (upper-right ocean) */}
      <TitleCartouche cx={2060} cy={150} />
    </svg>
    <div className="map-controls">
      <button className="map-btn" onClick={centerMap} title="Recenter the map">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>Center</span>
      </button>
    </div>
    </>
  );
}

function ownerShort(id: PowerId): string {
  return { russia: "ru", germany: "de", uk: "uk", japan: "jp", usa: "us" }[id];
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function renderStacks(
  tid: string,
  cx: number,
  cy: number,
  byOwner: Record<PowerId, Partial<Record<UnitId, UnitStack[]>>> | undefined,
): React.ReactNode {
  if (!byOwner) return null;
  const entries: { owner: PowerId; unit: UnitId; count: number }[] = [];
  for (const [owner, byUnit] of Object.entries(byOwner) as [PowerId, Partial<Record<UnitId, UnitStack[]>>][]) {
    for (const [unit, stacks] of Object.entries(byUnit) as [UnitId, UnitStack[]][]) {
      entries.push({ owner, unit, count: stacks.length });
    }
  }
  entries.sort((a, b) => {
    // Factories & AA at the back
    const prio = (u: UnitId) => (u === "factory" ? 0 : u === "aa" ? 1 : 2);
    return prio(b.unit) - prio(a.unit);
  });
  const perRow = 4;
  const cellW = 24;
  const cellH = 24;
  return (
    <g data-stack={tid}>
      {entries.map((e, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = cx + (col - (perRow - 1) / 2) * cellW;
        const y = cy + row * cellH;
        const power = POWERS[e.owner];
        return (
          <g key={`${e.owner}-${e.unit}-${i}`} transform={`translate(${x - 12}, ${y - 12})`}>
            <rect x={0} y={0} width={24} height={24} rx={4} fill={power.color} stroke={power.accent} strokeWidth={1} />
            <g transform="translate(-2,-2) scale(0.7)">
              <Piece unit={e.unit} fill="#fff" accent={power.accent} size={28} />
            </g>
            {e.count > 1 && (
              <>
                <rect x={16} y={14} width={12} height={10} rx={2} fill="#000" opacity={0.7} />
                <text className="stack-count" x={22} y={22}>{e.count}</text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

// --- Decorative compass rose ---
function CompassRose({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const r = size / 2;
  const inner = r * 0.35;
  // 4 long cardinal points + 4 short diagonal points
  const long = (angDeg: number) => {
    const a = (angDeg * Math.PI) / 180;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  };
  const short = (angDeg: number) => {
    const a = (angDeg * Math.PI) / 180;
    return `${cx + Math.cos(a) * (r * 0.55)},${cy + Math.sin(a) * (r * 0.55)}`;
  };
  const side = (angDeg: number) => {
    const a = (angDeg * Math.PI) / 180;
    return `${cx + Math.cos(a) * (inner * 0.8)},${cy + Math.sin(a) * (inner * 0.8)}`;
  };
  // Cardinal star points (each as a diamond: tip, left-base, right-base)
  const starPath = (tipDeg: number) => {
    const leftDeg = tipDeg + 90;
    const rightDeg = tipDeg - 90;
    return `M ${long(tipDeg)} L ${side(leftDeg)} L ${cx},${cy} L ${side(rightDeg)} Z`;
  };
  const diagPath = (tipDeg: number) => {
    const leftDeg = tipDeg + 90;
    const rightDeg = tipDeg - 90;
    return `M ${short(tipDeg)} L ${side(leftDeg)} L ${cx},${cy} L ${side(rightDeg)} Z`;
  };
  return (
    <g className="compass-rose" transform={`translate(0,0)`} opacity="0.82">
      <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="#e6cf8f" strokeWidth="1.2" strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={r} fill="rgba(20,36,54,0.45)" stroke="#e6cf8f" strokeWidth="1.5" />
      {/* diagonal (short) points */}
      {[45, 135, 225, 315].map((d) => (
        <path key={`d-${d}`} d={diagPath(d)} fill="#d6b667" stroke="#7a5c1c" strokeWidth="0.8" />
      ))}
      {/* cardinal (long) points */}
      {[0, 90, 180, 270].map((d) => (
        <path key={`c-${d}`} d={starPath(d)} fill="#f2dfa0" stroke="#7a5c1c" strokeWidth="1" />
      ))}
      <circle cx={cx} cy={cy} r={5} fill="#7a5c1c" />
      {/* Labels N, E, S, W */}
      <text className="compass-letter" x={cx} y={cy - r - 16}>N</text>
      <text className="compass-letter" x={cx + r + 16} y={cy + 5}>E</text>
      <text className="compass-letter" x={cx} y={cy + r + 24}>S</text>
      <text className="compass-letter" x={cx - r - 16} y={cy + 5}>W</text>
    </g>
  );
}

// --- Decorative title cartouche ---
function TitleCartouche({ cx, cy }: { cx: number; cy: number }) {
  const w = 460;
  const h = 110;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Scrolled/cartouche outline
  const outline = `
    M ${x + 24} ${y}
    L ${x + w - 24} ${y}
    Q ${x + w} ${y}, ${x + w} ${y + 24}
    L ${x + w} ${y + h - 24}
    Q ${x + w} ${y + h}, ${x + w - 24} ${y + h}
    L ${x + 24} ${y + h}
    Q ${x} ${y + h}, ${x} ${y + h - 24}
    L ${x} ${y + 24}
    Q ${x} ${y}, ${x + 24} ${y}
    Z
  `;
  return (
    <g className="title-cartouche" opacity="0.95">
      <path d={outline} fill="url(#cartouche-grad)" stroke="#6a4d18" strokeWidth="2.5" />
      <path d={outline} fill="none" stroke="#fff2c7" strokeWidth="1" opacity="0.6" transform="translate(0,2)" />
      <text className="cartouche-title" x={cx} y={cy - 8}>AXIS &amp; ALLIES</text>
      <text className="cartouche-subtitle" x={cx} y={cy + 26}>· 1942 ·</text>
    </g>
  );
}
