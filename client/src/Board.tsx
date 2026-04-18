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

// Prefer geo centroid; fall back to scaling old-format coords to new canvas.
function getCenter(t: Territory): [number, number] {
  const geo = TERRITORY_GEO[t.id];
  if (geo) return geo.centroid;
  return [Math.round(t.x * (WORLD_W / 2048)), Math.round(t.y * (WORLD_H / 910))];
}

export function Board(props: BoardProps) {
  const { state, selectedTerritory, reachable, onTerritoryClick } = props;
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

  // Separate land and sea for layer ordering (land on top of sea)
  const landTerritories = useMemo(() => TERRITORIES.filter(t => t.terrain === "land"), []);
  const seaTerritories  = useMemo(() => TERRITORIES.filter(t => t.terrain === "sea"),  []);

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
        <filter id="land-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="3" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Land fill gradients per power */}
        {(["ru","de","uk","jp","us","neutral"] as const).map(code => (
          <linearGradient key={code} id={`land-${code}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GRAD_TOP[code] ?? "#888"} stopOpacity="0.78" />
            <stop offset="100%" stopColor={GRAD_BOT[code] ?? "#555"} stopOpacity="0.68" />
          </linearGradient>
        ))}

        {/* Glow filter for selected territories */}
        <filter id="glow-selected" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Layer 0: TripleA base terrain map ── */}
      <image href="/map-aa.png" x="0" y="0" width={WORLD_W} height={WORLD_H} />

      {/* ── Layer 1: Sea zone polygons ── */}
      <g className="sea-zone-layer">
        {seaTerritories.map((t) => {
          const geo = TERRITORY_GEO[t.id];
          const isSelected = selectedTerritory === t.id;
          const isReach    = reachable.has(t.id);
          if (!geo) return null;
          return (
            <g key={t.id} data-territory={t.id}
               onClick={(e) => { e.stopPropagation(); onTerritoryClick(t.id); }}
               style={{ cursor: "pointer" }}>
              {geo.polygons.map((pts, idx) => (
                <polygon
                  key={idx}
                  className={`territory sea${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                  points={pts}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* ── Layer 2: Land territory polygons ── */}
      <g className="land-territory-layer">
        {landTerritories.map((t) => {
          const geo = TERRITORY_GEO[t.id];
          const center   = getCenter(t);
          const owner    = state.territories[t.id]?.owner ?? null;
          const ownerCls = owner ? OWNER_SHORT[owner] : "neutral";
          const isCap    = owner != null && POWERS[owner].capital === t.id;
          const isSelected = selectedTerritory === t.id;
          const isReach    = reachable.has(t.id);

          return (
            <g key={t.id} data-territory={t.id}
               onClick={(e) => { e.stopPropagation(); onTerritoryClick(t.id); }}
               style={{ cursor: "pointer" }}>

              {geo ? (
                geo.polygons.map((pts, idx) => (
                  <polygon
                    key={idx}
                    className={`territory land ${ownerCls}${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                    points={pts}
                    filter={isSelected ? "url(#glow-selected)" : "url(#land-shadow)"}
                  />
                ))
              ) : (
                // Fallback hex marker for territories not in geo data
                <polygon
                  className={`territory land ${ownerCls}${isSelected ? " selected" : ""}${isReach ? " reachable" : ""}`}
                  points={hexPoints(center[0], center[1], 32)}
                  filter="url(#land-shadow)"
                  opacity="0.72"
                />
              )}

              {isCap && (
                <circle
                  className="capital-marker"
                  cx={center[0]}
                  cy={center[1] - (geo ? 22 : 16)}
                  r={geo ? 7 : 4}
                />
              )}

              {renderStacks(t.id, center[0], center[1], stacksByTerritory[t.id], !!geo)}
            </g>
          );
        })}
      </g>

      {/* ── Layer 3: Territory labels ── */}
      <g className="labels-layer" pointerEvents="none">
        {landTerritories.map((t) => {
          const geo = TERRITORY_GEO[t.id];
          if (!geo) return null;
          const [cx, cy] = geo.centroid;
          return (
            <g key={t.id} className="territory-label-group">
              {/* Territory name */}
              <text
                className="territory-label land-label"
                x={cx} y={cy - 4}
              >
                {t.name}
              </text>
              {/* IPC value badge */}
              {t.ipc > 0 && (
                <text
                  className="territory-ipc"
                  x={cx} y={cy + 16}
                >
                  {t.ipc}
                </text>
              )}
            </g>
          );
        })}
        {seaTerritories.map((t) => {
          const geo = TERRITORY_GEO[t.id];
          if (!geo) return null;
          const [cx, cy] = geo.centroid;
          // Only show SZ number, not full "Sea Zone N" text
          const szNum = t.id.replace("sz_", "");
          return (
            <text key={t.id} className="sea-zone-number" x={cx} y={cy}>
              {szNum}
            </text>
          );
        })}
      </g>

      {/* ── Layer 4: Active power capital pulse ring ── */}
      {(() => {
        const cap = POWERS[state.activePower].capital;
        const t = TERRITORY_MAP[cap];
        if (!t) return null;
        const [cx, cy] = getCenter(t);
        return (
          <circle cx={cx} cy={cy - 22} r={16} fill="none" stroke="#ffd05b" strokeWidth="3" strokeDasharray="5 4">
            <animate attributeName="r" values="16;24;16" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.5;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        );
      })()}
    </svg>

    <div className="map-controls">
      <button className="map-btn map-btn-icon" onClick={zoomIn} title="Zoom in">+</button>
      <button className="map-btn map-btn-icon" onClick={zoomOut} title="Zoom out">−</button>
      <button className="map-btn map-btn-icon" onClick={centerMap} title="Fit map to screen">⊙</button>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OWNER_SHORT: Record<PowerId, string> = {
  russia: "ru", germany: "de", uk: "uk", japan: "jp", usa: "us",
};

const GRAD_TOP: Record<string, string> = {
  ru: "#c84840", de: "#848484", uk: "#d4b060", jp: "#e8a040", us: "#4e8a6c", neutral: "#b4a472",
};
const GRAD_BOT: Record<string, string> = {
  ru: "#8c2828", de: "#525252", uk: "#9e7830", jp: "#a06020", us: "#2e5a40", neutral: "#7a7050",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const cellW = hasGeo ? 32 : 26;
  const cellH = hasGeo ? 32 : 26;
  // Place stack below centroid
  const startY = cy + (hasGeo ? 20 : 10);

  return (
    <g data-stack={tid}>
      {entries.map((e, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = cx + (col - (perRow - 1) / 2) * cellW;
        const y = startY + row * cellH;
        const power = POWERS[e.owner];
        return (
          <g key={`${e.owner}-${e.unit}-${i}`} transform={`translate(${x - 13}, ${y - 13})`}>
            <rect x={0} y={0} width={26} height={26} rx={5} fill={power.color} stroke={power.accent} strokeWidth={1.5} />
            <g transform="translate(-1.5,-1.5) scale(0.75)">
              <Piece unit={e.unit} fill="#fff" accent={power.accent} size={28} />
            </g>
            {e.count > 1 && (
              <>
                <rect x={17} y={15} width={13} height={11} rx={3} fill="#000" opacity={0.75} />
                <text className="stack-count" x={23} y={23}>{e.count}</text>
              </>
            )}
            {e.damaged && UNITS[e.unit].hitpoints > 1 && (
              <circle cx={23} cy={2} r={4} fill="#e03030" />
            )}
          </g>
        );
      })}
    </g>
  );
}
