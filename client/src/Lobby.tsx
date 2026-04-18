import React, { useState } from "react";
import type { LobbyGame, PowerId } from "@aa/shared";
import { POWERS, POWER_ORDER } from "@aa/shared";
import { Net } from "./net.js";
import "./lobby.css";

/* -------------------------------------------------------------------------
   Inline SVG — a wartime-poster hero:
   A stylized globe with crossed flags, flanked by marching silhouettes
   (soldier, tank, bomber, battleship, fighter) in each power's colors.
   ------------------------------------------------------------------------- */
function HeroIllustration() {
  const ruCol = POWERS.russia.color;
  const deCol = POWERS.germany.color;
  const ukCol = POWERS.uk.color;
  const jpCol = POWERS.japan.color;
  const usCol = POWERS.usa.color;

  return (
    <svg
      className="hero-svg"
      viewBox="0 0 1000 300"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Axis and Allies 1942 hero illustration"
    >
      <defs>
        <radialGradient id="sky" cx="50%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#3a2a15" />
          <stop offset="60%" stopColor="#1b1308" />
          <stop offset="100%" stopColor="#0a0704" />
        </radialGradient>
        <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6d57a" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#c99230" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c99230" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="globeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2b1f10" />
          <stop offset="100%" stopColor="#0d0905" />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a52" />
          <stop offset="100%" stopColor="#0a1622" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="3" result="offsetBlur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sky / backdrop */}
      <rect x="0" y="0" width="1000" height="300" fill="url(#sky)" />

      {/* Radiant sun behind globe */}
      <circle cx="500" cy="150" r="160" fill="url(#sunGrad)" />

      {/* Radiating rays */}
      <g opacity="0.35" transform="translate(500 150)">
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * Math.PI) / 8;
          const x2 = Math.cos(a) * 260;
          const y2 = Math.sin(a) * 260;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={x2}
              y2={y2}
              stroke="#d4a94a"
              strokeWidth={i % 2 === 0 ? 3 : 1.5}
              strokeLinecap="round"
              opacity={i % 2 === 0 ? 0.55 : 0.28}
            />
          );
        })}
      </g>

      {/* Drifting clouds layer */}
      <g className="hero-clouds">
        <g className="cloud-drift slow" opacity="0.6">
          <ellipse cx="160" cy="60" rx="70" ry="10" fill="#2a2012" />
          <ellipse cx="820" cy="85" rx="90" ry="12" fill="#2a2012" />
          <ellipse cx="420" cy="45" rx="60" ry="8" fill="#2a2012" />
        </g>
        <g className="cloud-drift" opacity="0.5">
          <ellipse cx="260" cy="95" rx="55" ry="7" fill="#3a2c18" />
          <ellipse cx="700" cy="55" rx="70" ry="9" fill="#3a2c18" />
        </g>
      </g>

      {/* Fleet silhouettes on the horizon */}
      <g transform="translate(0 230)" fill="#0a0604" opacity="0.85" filter="url(#softShadow)">
        <rect x="0" y="10" width="1000" height="40" fill="url(#seaGrad)" />
        {/* ship 1 */}
        <g transform="translate(80 0)">
          <path d="M0 10 L100 10 L95 22 L5 22 Z" />
          <rect x="30" y="-12" width="10" height="22" />
          <rect x="45" y="-20" width="6" height="30" />
          <rect x="60" y="-14" width="10" height="24" />
        </g>
        {/* ship 2 (bigger battleship) */}
        <g transform="translate(780 -4)">
          <path d="M0 14 L140 14 L132 28 L8 28 Z" />
          <rect x="30" y="-6" width="14" height="20" />
          <rect x="55" y="-18" width="8" height="32" />
          <rect x="80" y="-10" width="14" height="24" />
          <rect x="105" y="-4" width="10" height="18" />
        </g>
        {/* ship 3 (far) */}
        <g transform="translate(420 6) scale(0.6)">
          <path d="M0 10 L120 10 L115 22 L5 22 Z" />
          <rect x="40" y="-14" width="8" height="24" />
          <rect x="60" y="-22" width="6" height="32" />
        </g>
      </g>

      {/* Bombers in the sky */}
      <g fill="#0a0604" opacity="0.8">
        <g transform="translate(230 100)">
          <path d="M0 0 L40 0 L44 3 L40 6 L0 6 L-4 3 Z" />
          <path d="M14 -12 L26 -12 L28 6 L12 6 Z" />
          <rect x="18" y="6" width="4" height="6" />
        </g>
        <g transform="translate(680 80) scale(0.8)">
          <path d="M0 0 L40 0 L44 3 L40 6 L0 6 L-4 3 Z" />
          <path d="M14 -12 L26 -12 L28 6 L12 6 Z" />
        </g>
        <g transform="translate(860 130) scale(0.55)">
          <path d="M0 0 L40 0 L44 3 L40 6 L0 6 L-4 3 Z" />
          <path d="M14 -12 L26 -12 L28 6 L12 6 Z" />
        </g>
      </g>

      {/* Central globe */}
      <g transform="translate(500 150)" filter="url(#softShadow)">
        <circle r="96" fill="url(#globeGrad)" stroke="#d4a94a" strokeWidth="3" />
        <circle r="96" fill="none" stroke="#8a6c1f" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
        {/* Meridians */}
        <ellipse rx="96" ry="30" fill="none" stroke="#8a6c1f" strokeWidth="1" opacity="0.55" />
        <ellipse rx="96" ry="60" fill="none" stroke="#8a6c1f" strokeWidth="1" opacity="0.4" />
        <ellipse rx="30" ry="96" fill="none" stroke="#8a6c1f" strokeWidth="1" opacity="0.55" />
        <ellipse rx="60" ry="96" fill="none" stroke="#8a6c1f" strokeWidth="1" opacity="0.4" />
        {/* Stylized continents */}
        <g fill="#c8b88e" opacity="0.85">
          {/* Americas */}
          <path d="M-70 -30 Q-80 -10 -70 20 Q-60 45 -50 30 Q-40 10 -55 -10 Q-65 -30 -70 -30 Z" />
          <path d="M-45 25 Q-40 45 -30 55 Q-25 40 -38 25 Z" />
          {/* Europe/Africa */}
          <path d="M-5 -40 Q5 -35 15 -30 Q22 -10 10 10 Q5 30 -5 45 Q-15 55 -15 25 Q-18 0 -10 -20 Z" />
          {/* Asia */}
          <path d="M20 -38 Q45 -40 65 -25 Q75 -10 65 0 Q50 5 35 -5 Q25 -20 20 -38 Z" />
          {/* Australia */}
          <path d="M45 30 Q60 28 65 40 Q55 48 45 42 Z" />
        </g>
      </g>

      {/* Crossed flags — Allies (gold pole, red field) and Axis (navy field, gold cross) */}
      <g transform="translate(500 150)" filter="url(#softShadow)">
        {/* Left flag pole (tilted) */}
        <g transform="rotate(-28)">
          <rect x="-4" y="-120" width="4" height="180" fill="#5a3e12" />
          <polygon
            points="0,-120 70,-112 70,-72 0,-64"
            fill={ruCol}
            stroke="#4a0a0a"
            strokeWidth="1.5"
          />
          {/* star on flag */}
          <polygon
            points="35,-96 39,-88 48,-87 41,-81 43,-73 35,-77 27,-73 29,-81 22,-87 31,-88"
            fill="#f0d477"
          />
        </g>
        {/* Right flag pole */}
        <g transform="rotate(28)">
          <rect x="0" y="-120" width="4" height="180" fill="#5a3e12" />
          <polygon
            points="4,-120 -66,-112 -66,-72 4,-64"
            fill={usCol}
            stroke="#1a2e22"
            strokeWidth="1.5"
          />
          {/* stripes */}
          <rect x="-66" y="-108" width="70" height="3" fill="#f0e3c0" opacity="0.6" />
          <rect x="-66" y="-98" width="70" height="3" fill="#f0e3c0" opacity="0.6" />
          <rect x="-66" y="-88" width="70" height="3" fill="#f0e3c0" opacity="0.6" />
          <rect x="-66" y="-78" width="70" height="3" fill="#f0e3c0" opacity="0.6" />
        </g>
      </g>

      {/* Marching troop silhouettes across the bottom in power colors */}
      <g transform="translate(0 255)" filter="url(#softShadow)">
        {/* soldier - russia */}
        <g transform="translate(60 -8)" fill={ruCol} stroke="#000" strokeWidth="0.5">
          <circle cx="0" cy="-22" r="5" />
          <rect x="-4" y="-16" width="8" height="14" />
          <rect x="-6" y="-2" width="4" height="12" />
          <rect x="2" y="-2" width="4" height="12" />
          <line x1="6" y1="-14" x2="14" y2="-26" stroke="#111" strokeWidth="1.2" />
        </g>
        {/* tank - germany */}
        <g transform="translate(240 -10)" fill={deCol} stroke="#000" strokeWidth="0.6">
          <rect x="-20" y="-8" width="40" height="10" rx="2" />
          <rect x="-12" y="-16" width="20" height="8" rx="2" />
          <rect x="-2" y="-20" width="20" height="4" />
          <circle cx="-14" cy="4" r="3.5" fill="#222" />
          <circle cx="-4" cy="4" r="3.5" fill="#222" />
          <circle cx="6" cy="4" r="3.5" fill="#222" />
          <circle cx="16" cy="4" r="3.5" fill="#222" />
        </g>
        {/* soldier - uk */}
        <g transform="translate(440 -8)" fill={ukCol} stroke="#000" strokeWidth="0.5">
          <circle cx="0" cy="-22" r="5" />
          <rect x="-4" y="-16" width="8" height="14" />
          <rect x="-6" y="-2" width="4" height="12" />
          <rect x="2" y="-2" width="4" height="12" />
          <line x1="-6" y1="-14" x2="-14" y2="-26" stroke="#111" strokeWidth="1.2" />
        </g>
        {/* fighter plane - japan */}
        <g transform="translate(640 -22)" fill={jpCol} stroke="#000" strokeWidth="0.6">
          <ellipse cx="0" cy="0" rx="22" ry="4" />
          <polygon points="-18,0 -10,-10 10,-10 18,0" />
          <polygon points="-14,2 -6,10 6,10 14,2" />
          <circle cx="0" cy="0" r="3" fill="#2a1a0a" />
        </g>
        {/* battleship - usa */}
        <g transform="translate(860 -8)" fill={usCol} stroke="#000" strokeWidth="0.6">
          <path d="M-28 0 L28 0 L22 8 L-22 8 Z" />
          <rect x="-10" y="-10" width="6" height="10" />
          <rect x="-2" y="-16" width="4" height="16" />
          <rect x="6" y="-8" width="6" height="8" />
          <line x1="-2" y1="-16" x2="-2" y2="-22" stroke="#000" strokeWidth="0.8" />
        </g>
      </g>

      {/* Banner scroll above the globe */}
      <g transform="translate(500 52)">
        <polygon
          points="-220,-14 220,-14 240,0 220,14 -220,14 -240,0"
          fill={POWERS.russia.color}
          stroke="#4a0a0a"
          strokeWidth="1.5"
        />
        <polygon points="-240,0 -220,-14 -220,14" fill="#6e1d1e" />
        <polygon points="240,0 220,-14 220,14" fill="#6e1d1e" />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontFamily='"Stencil Std", Impact, "Arial Black", sans-serif'
          fontSize="18"
          letterSpacing="8"
          fill="#f5e7c8"
          style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.7)" }}
        >
          FOR VICTORY
        </text>
      </g>
    </svg>
  );
}

/* Corner star ornament for the hero panel */
function CornerStar({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`hero-corner ${pos}`} viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="12,2 14.5,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9.5,9" />
    </svg>
  );
}

/* Tiny stylized "flag" for each power badge */
function PowerFlag({ power }: { power: PowerId }) {
  const p = POWERS[power];
  // Unique, simple flag-style swatch per power
  if (power === "russia") {
    return (
      <svg className="power-flag" viewBox="0 0 56 36" aria-hidden="true">
        <rect width="56" height="36" fill={p.color} />
        <polygon
          points="28,8 31,16 40,16 33,21 36,29 28,24 20,29 23,21 16,16 25,16"
          fill="#f0d477"
        />
      </svg>
    );
  }
  if (power === "germany") {
    return (
      <svg className="power-flag" viewBox="0 0 56 36" aria-hidden="true">
        <rect width="56" height="36" fill={p.color} />
        <rect x="0" y="14" width="56" height="8" fill={p.accent} />
        <rect x="24" y="0" width="8" height="36" fill={p.accent} />
      </svg>
    );
  }
  if (power === "uk") {
    return (
      <svg className="power-flag" viewBox="0 0 56 36" aria-hidden="true">
        <rect width="56" height="36" fill={p.color} />
        <line x1="0" y1="0" x2="56" y2="36" stroke="#fff" strokeWidth="3" />
        <line x1="56" y1="0" x2="0" y2="36" stroke="#fff" strokeWidth="3" />
        <rect x="24" y="0" width="8" height="36" fill="#fff" />
        <rect x="0" y="14" width="56" height="8" fill="#fff" />
        <rect x="26" y="0" width="4" height="36" fill={p.accent} />
        <rect x="0" y="16" width="56" height="4" fill={p.accent} />
      </svg>
    );
  }
  if (power === "japan") {
    return (
      <svg className="power-flag" viewBox="0 0 56 36" aria-hidden="true">
        <rect width="56" height="36" fill="#f5e3c4" />
        <circle cx="28" cy="18" r="10" fill={p.color} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={28}
              y1={18}
              x2={28 + Math.cos(a) * 22}
              y2={18 + Math.sin(a) * 22}
              stroke={p.color}
              strokeWidth="1.2"
              opacity="0.5"
            />
          );
        })}
      </svg>
    );
  }
  // usa
  return (
    <svg className="power-flag" viewBox="0 0 56 36" aria-hidden="true">
      <rect width="56" height="36" fill="#f5e3c4" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="0" y={i * 6} width="56" height="3" fill={p.color} />
      ))}
      <rect x="0" y="0" width="24" height="18" fill={p.accent} />
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <circle key={i} cx={4 + col * 8} cy={4 + row * 5} r="1.3" fill="#f5e3c4" />
        );
      })}
    </svg>
  );
}

function PowerBadge({ power }: { power: PowerId }) {
  const p = POWERS[power];
  return (
    <div
      className="power-badge"
      style={
        {
          ["--badge-color" as string]: p.color,
          ["--badge-accent" as string]: p.accent,
        } as React.CSSProperties
      }
      aria-label={p.name}
    >
      <PowerFlag power={power} />
      <span className="power-badge-name">{p.name}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Main Lobby component
   ------------------------------------------------------------------------- */
export function Lobby({
  net,
  games,
  myName,
  authUser,
  onLogout,
  setName,
}: {
  net: Net;
  games: LobbyGame[];
  myName: string;
  authUser: { displayName: string; email: string } | null;
  onLogout: () => void;
  setName: (s: string) => void;
}) {
  const [newGame, setNewGame] = useState("Showdown");
  const [selectedPower, setSelectedPower] = useState<PowerId>("russia");

  return (
    <div className="lobby-page">
      <div className="lobby-shell">
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <CornerStar pos="tl" />
          <CornerStar pos="tr" />
          <CornerStar pos="bl" />
          <CornerStar pos="br" />

          <HeroIllustration />

          <div className="hero-title-block">
            <h1 className="hero-title">
              AXIS <span className="amp">&amp;</span> ALLIES
            </h1>
            <div className="hero-year">1942</div>
            <div className="hero-tagline">
              Five Powers &middot; One World &middot; Your Strategy
            </div>
            <div className="hero-rule" />
          </div>
        </section>

        {/* ---------- Power badges ---------- */}
        <div className="powers-strip" role="list" aria-label="The five powers">
          {POWER_ORDER.map((p) => (
            <div role="listitem" key={p}>
              <PowerBadge power={p} />
            </div>
          ))}
        </div>

        {/* ---------- Commander identity ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">Commander Identity</h2>
          {authUser && (
            <div className="lobby-profile-row">
              <div className="lobby-profile-info">
                <span className="lobby-profile-name">{authUser.displayName}</span>
                <span className="lobby-profile-email">{authUser.email}</span>
              </div>
              <button className="lobby-btn lobby-btn-logout" onClick={onLogout}>
                Log out
              </button>
            </div>
          )}
          <div className="lobby-field-row">
            <input
              type="text"
              className="lobby-input"
              value={myName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name in game"
            />
            <button
              className="lobby-btn"
              onClick={() => net.send({ type: "hello", name: myName })}
            >
              Update
            </button>
          </div>
        </section>

        {/* ---------- Create game ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">Launch a New Campaign</h2>
          <div className="lobby-field-row">
            <input
              type="text"
              className="lobby-input"
              value={newGame}
              onChange={(e) => setNewGame(e.target.value)}
              placeholder="Campaign name"
            />
            <button
              className="lobby-btn primary"
              onClick={() => net.send({ type: "createGame", name: newGame })}
            >
              Create
            </button>
          </div>
        </section>

        {/* ---------- Games list ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">Active Theatres of War</h2>

          {games.length === 0 && (
            <div className="games-empty">No campaigns underway &mdash; rally the troops.</div>
          )}

          <div className="games-list">
            {games.map((g) => (
              <div
                key={g.id}
                className={`game-row ${g.started ? "started" : ""}`}
              >
                <div className="game-name">
                  <span>{g.name}</span>
                  <span className="game-id">#{g.id}</span>
                </div>

                <div className="game-players">
                  {g.players.length === 0 && <span className="none">No commanders yet</span>}
                  {g.players.map((p) => {
                    const pow = p.power ? POWERS[p.power as PowerId] : null;
                    return (
                      <span
                        key={p.sessionId}
                        className="player-chip"
                        style={
                          {
                            ["--chip-color" as string]: pow?.color ?? "#555",
                          } as React.CSSProperties
                        }
                      >
                        <span className="player-chip-dot" />
                        {p.name}
                        {pow ? ` · ${pow.name}` : ""}
                      </span>
                    );
                  })}
                </div>

                <select
                  className="lobby-select"
                  value={selectedPower}
                  onChange={(e) => setSelectedPower(e.target.value as PowerId)}
                  aria-label="Choose power"
                >
                  {POWER_ORDER.map((p) => (
                    <option
                      key={p}
                      value={p}
                      disabled={g.players.some((pp) => pp.power === p)}
                    >
                      {POWERS[p].name}
                    </option>
                  ))}
                </select>

                <button
                  className="lobby-btn"
                  disabled={g.started}
                  onClick={() =>
                    net.send({
                      type: "joinGame",
                      gameId: g.id,
                      power: selectedPower,
                    })
                  }
                >
                  Join
                </button>

                <button
                  className="lobby-btn primary"
                  disabled={g.started || g.players.length === 0}
                  onClick={() => net.send({ type: "startGame", gameId: g.id })}
                >
                  {g.started ? "In Progress" : "Start"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Footnote ---------- */}
        <div className="lobby-footnote">
          Open this URL on multiple devices, each joining a different power, then
          press <b>Start</b> to commence hostilities.
        </div>
      </div>
    </div>
  );
}
