import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TERRITORIES, TERRITORY_MAP, POWERS, UNITS, TERRITORY_GEO,
  type GameState, type PowerId, type UnitId, type UnitStack, type Territory,
} from "@aa/shared";
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

// TripleA native map dimensions — matches map-aa.png and map-geo.ts coordinates.
const WORLD_W = 3500;
const WORLD_H = 2000;

const HOME_VIEWPORT = { x: 0, y: 0, scale: 1.0 };

const PAN_SPEED = 0.45;

// Prefer geo centroid; fall back to scaling old 2048×910 coords to new canvas.
function getCenter(t: Territory): [number, number] {
  const geo = TERRITORY_GEO[t.id];
  if (geo) return geo.centroid;
  return [Math.round(t.x * (WORLD_W / 2048)), Math.round(t.y * (WORLD_H / 910))];
}

export function Board(props: BoardProps) {
  const { state, myPower, selectedTerritory, reachable, onTerritoryClick } = props;
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewport, setViewport] = useState({ ...HOME_VIEWPORT });
  const [drag, setDrag] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);

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
    const mx = sw / 2, my = sh / 2;
    const newScale = Math.min(2.2, viewport.scale * 1.3);
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({ scale: newScale, x: wx - mx / newScale, y: wy - my / newScale });
  }

  function zoomOut() {
    const svg = svgRef.current;
    if (!svg) return;
    const { width: sw, height: sh } = svg.getBoundingClientRect();
    const mx = sw / 2, my = sh / 2;
    const newScale = Math.max(0.15, viewport.scale / 1.3);
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({ scale: newScale, x: wx - mx / newScale, y: wy - my / newScale });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(0.15, Math.min(2.2, viewport.scale * factor));
    const wx = viewport.x + mx / viewport.scale;
    const wy = viewport.y + my / viewport.scale;
    setViewport({ scale: newScale, x: wx - mx / newScale, y: wy - my / newScale });
  }

  const viewBox = `${viewport.x} ${viewport.y} ${WORLD_W / viewport.scale} ${WORLD_H / viewport.scale}`;

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
        <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="1.5" dy="2" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient fills for land territories by power */}
        {(["ru","de","uk","jp","us","neutral"] as const).map(code => (
          <linearGradient key={code} id={`land-${code}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={landGradientTop(code)} stopOpacity="0.82" />
            <stop offset="100%" stopColor={landGradientBot(code)} stopOpacity="0.72" />
          </linearGradient>
        ))}
      </defs>

      {/* TripleA base terrain map — ocean and land base colors */}
      <image href="/map-aa.png" x="0" y="0" width={WORLD_W} height={WORLD_H} />

      {/* Territory polygons (land) and zone markers (sea) */}
      {TERRITORIES.map((t) => {
        const geo = TERRITORY_GEO[t.id];
        const center = getCenter(t);
        const owner = state.territories[t.id]?.owner ?? null;
        const ownerCls = owner ? ownerShort(owner) : "neutral";
        const isCap = owner != null && POWERS[owner].capital === t.id;
        const isSelected = selectedTerritory === t.id;
        const isReach = reachable.has(t.id);

        return (
          <g key={t.id} data-territory={t.id}
             onClick={(e) => { e.stopPropagation(); onTerritoryClick(t.id); }}
             style={{ cursor: "pointer" }}>

            {geo ? (
              // Actual polygon shape from TripleA geometry data
              geo.polygons.map((pts, idx) => (
                <polygon
                  key={idx}
                  className={`territory ${t.terrain} ${ownerCls}${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                  points={pts}
                  filter={t.terrain === "land" ? "url(#land-shadow)" : undefined}
                />
              ))
            ) : (
              // Fallback marker for territories not yet in geo data
              t.terrain === "land" ? (
                <polygon
                  className={`territory land ${ownerCls}${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                  points={hexPoints(center[0], center[1], 28)}
                  filter="url(#land-shadow)"
                  opacity="0.72"
                />
              ) : (
                <ellipse
                  className={`territory sea${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                  cx={center[0]} cy={center[1]} rx={28} ry={20}
                  opacity="0.5"
                />
              )
            )}

            {isCap && (
              <circle
                className="capital-marker"
                cx={center[0]} cy={center[1] - (geo ? 20 : 14)}
                r={geo ? 6 : 3.5}
              />
            )}

            {renderStacks(t.id, center[0], center[1], stacksByTerritory[t.id], !!geo)}
          </g>
        );
      })}

      {/* Animated ring on active power's capital */}
      {(() => {
        const cap = POWERS[state.activePower].capital;
        const t = TERRITORY_MAP[cap];
        if (!t) return null;
        const [cx, cy] = getCenter(t);
        return (
          <circle cx={cx} cy={cy - 20} r={14} fill="none" stroke="#ffd05b" strokeWidth="2.5" strokeDasharray="4 4">
            <animate attributeName="r" values="14;20;14" dur="1.6s" repeatCount="indefinite" />
          </circle>
        );
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

function landGradientTop(code: string): string {
  return { ru: "#c4453a", de: "#7a7a7a", uk: "#d4b262", jp: "#e8a040", us: "#4e8a6c", neutral: "#b8a870" }[code] ?? "#888";
}
function landGradientBot(code: string): string {
  return { ru: "#8c2826", de: "#505050", uk: "#9e7830", jp: "#a0601a", us: "#2e5a3e", neutral: "#7a7255" }[code] ?? "#555";
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
  hasGeo: boolean,
): React.ReactNode {
  if (!byOwner) return null;
  const entries: { owner: PowerId; unit: UnitId; count: number; damaged: boolean }[] = [];
  for (const [owner, byUnit] of Object.entries(byOwner) as [PowerId, Partial<Record<UnitId, UnitStack[]>>][]) {
    for (const [unit, stacks] of Object.entries(byUnit) as [UnitId, UnitStack[]][]) {
      entries.push({ owner, unit, count: stacks.length, damaged: stacks.some((s) => (s.hitsTaken ?? 0) > 0) });
    }
  }
  entries.sort((a, b) => {
    const prio = (u: UnitId) => (u === "factory" ? 0 : u === "aa" ? 1 : 2);
    return prio(b.unit) - prio(a.unit);
  });

  const perRow = 4;
  const cellW = hasGeo ? 30 : 24;
  const cellH = hasGeo ? 30 : 24;
  // Offset the stack below the territory center
  const startY = cy + (hasGeo ? 12 : 8);

  return (
    <g data-stack={tid}>
      {entries.map((e, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = cx + (col - (perRow - 1) / 2) * cellW;
        const y = startY + row * cellH;
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
