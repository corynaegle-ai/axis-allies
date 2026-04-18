import React, { useEffect, useMemo, useRef, useState } from "react";
import { TERRITORIES, TERRITORY_MAP, POWERS, UNITS, type GameState, type PowerId, type UnitId, type UnitStack } from "@aa/shared";
import { Piece } from "./pieces.js";
import "./board.css";

interface BoardProps {
  state: GameState;
  myPower: PowerId | null;
  selectedTerritory: string | null;
  setSelectedTerritory: (t: string | null) => void;
  reachable: Set<string>;
  onTerritoryClick: (id: string) => void;
}

// World dimensions match the map image exactly.
const WORLD_W = 2048;
const WORLD_H = 910;

// Default viewport shows the full map.
const HOME_VIEWPORT = { x: 0, y: 0, scale: 1.0 };

// Pan damping: <1 means the map moves slower than the mouse (more control, less overshoot).
const PAN_SPEED = 0.45;

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

  function centerMap() {
    const svg = svgRef.current;
    if (!svg) { setViewport({ x: 0, y: 0, scale: 1.0 }); return; }
    const { width: sw, height: sh } = svg.getBoundingClientRect();
    const fitScale = Math.min(sw / WORLD_W, sh / WORLD_H);
    const vbw = WORLD_W / fitScale;
    const vbh = WORLD_H / fitScale;
    setViewport({ x: -(vbw - WORLD_W) / 2, y: -(vbh - WORLD_H) / 2, scale: fitScale });
  }

  useEffect(() => { centerMap(); }, []);

  function zoomIn() {
    const svg = svgRef.current;
    if (!svg) return;
    const { width: sw, height: sh } = svg.getBoundingClientRect();
    const mx = sw / 2;
    const my = sh / 2;
    const newScale = Math.min(2.2, viewport.scale * 1.3);
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({ scale: newScale, x: wx - mx / newScale, y: wy - my / newScale });
  }

  function zoomOut() {
    const svg = svgRef.current;
    if (!svg) return;
    const { width: sw, height: sh } = svg.getBoundingClientRect();
    const mx = sw / 2;
    const my = sh / 2;
    const newScale = Math.max(0.25, viewport.scale / 1.3);
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({ scale: newScale, x: wx - mx / newScale, y: wy - my / newScale });
  }

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
        {/* Drop-shadow for territory markers */}
        <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="1" dy="1.5" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Map image background */}
      <image href="/map.png" x="0" y="0" width={WORLD_W} height={WORLD_H} />

      {/* Territory markers — semi-transparent ownership indicators over the image */}
      {TERRITORIES.map((t) => {
        const owner = state.territories[t.id]?.owner ?? null;
        const ownerCls = owner ? ownerShort(owner) : "neutral";
        const isCap = owner != null && POWERS[owner].capital === t.id;
        const isSelected = selectedTerritory === t.id;
        const isReach = reachable.has(t.id);
        const r = t.terrain === "land" ? 14 : 11;
        return (
          <g key={t.id} data-territory={t.id}
             onClick={(e) => { e.stopPropagation(); onTerritoryClick(t.id); }}
             style={{ cursor: "pointer" }}>
            {t.terrain === "land" ? (
              <polygon
                className={`territory land ${ownerCls} ${isSelected ? "selected" : ""} ${isReach ? "reachable" : ""}`}
                points={hexPoints(t.x, t.y, r)}
                filter="url(#land-shadow)"
                opacity="0.72"
              />
            ) : (
              <ellipse
                className={`territory sea ${isSelected ? "selected" : ""} ${isReach ? "reachable" : ""}`}
                cx={t.x} cy={t.y} rx={r} ry={r * 0.72}
                opacity="0.6"
              />
            )}
            {isCap && <circle className="capital-marker" cx={t.x} cy={t.y - 12} r={3.5} />}

            {/* Unit stacks: arranged in a small grid below the marker */}
            {renderStacks(t.id, t.x, t.y + 8, stacksByTerritory[t.id])}
          </g>
        );
      })}

      {/* Active power marker at their capital */}
      {(() => {
        const cap = POWERS[state.activePower].capital;
        const t = TERRITORY_MAP[cap];
        if (!t) return null;
        return <circle cx={t.x} cy={t.y - 18} r={8} fill="none" stroke="#ffd05b" strokeWidth="2" strokeDasharray="3 3">
          <animate attributeName="r" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
        </circle>;
      })()}
    </svg>
    <div className="map-controls">
      <button className="map-btn" onClick={zoomIn} title="Zoom in">
        <span>+</span>
        <span>Zoom In</span>
      </button>
      <button className="map-btn" onClick={zoomOut} title="Zoom out">
        <span>−</span>
        <span>Zoom Out</span>
      </button>
      <button className="map-btn" onClick={centerMap} title="Fit map to screen">
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
  const entries: { owner: PowerId; unit: UnitId; count: number; damaged: boolean }[] = [];
  for (const [owner, byUnit] of Object.entries(byOwner) as [PowerId, Partial<Record<UnitId, UnitStack[]>>][]) {
    for (const [unit, stacks] of Object.entries(byUnit) as [UnitId, UnitStack[]][]) {
      entries.push({ owner, unit, count: stacks.length, damaged: stacks.some((s) => (s.hitsTaken ?? 0) > 0) });
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
            {e.damaged && UNITS[e.unit].hitpoints > 1 && (
              <circle cx={22} cy={2} r={3} fill="#e03030" />
            )}
          </g>
        );
      })}
    </g>
  );
}

