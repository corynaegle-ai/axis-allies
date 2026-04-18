import React, { useState } from "react";
import type { LobbyGame, PowerId } from "@aa/shared";
import { POWERS, POWER_ORDER } from "@aa/shared";
import { Net } from "./net.js";
import { Globe } from "./Globe.js";
import { RU, DE, GB, JP, US } from "country-flag-icons/react/3x2";
import "./lobby.css";

/* -------------------------------------------------------------------------
   Hero illustration — spinning d3-geo globe flanked by power flags
   ------------------------------------------------------------------------- */
function HeroIllustration() {
  const FLAG_COMPONENTS: Record<PowerId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    russia: RU, germany: DE, uk: GB, japan: JP, usa: US,
  };
  const left: PowerId[]  = ["russia", "germany"];
  const right: PowerId[] = ["uk",     "japan",  "usa"];

  return (
    <div className="hero-illustration">
      <div className="hero-flags hero-flags-left">
        {left.map(p => {
          const Flag = FLAG_COMPONENTS[p];
          return (
            <div key={p} className="hero-flag-wrap" style={{ borderColor: POWERS[p].accent }}>
              <Flag style={{ width: 80, height: 53, display: "block" }} />
            </div>
          );
        })}
      </div>

      <div className="hero-globe-wrap">
        <Globe />
      </div>

      <div className="hero-flags hero-flags-right">
        {right.map(p => {
          const Flag = FLAG_COMPONENTS[p];
          return (
            <div key={p} className="hero-flag-wrap" style={{ borderColor: POWERS[p].accent }}>
              <Flag style={{ width: 80, height: 53, display: "block" }} />
            </div>
          );
        })}
      </div>
    </div>
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

const FLAG_COMPONENTS: Record<PowerId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  russia: RU, germany: DE, uk: GB, japan: JP, usa: US,
};

function PowerBadge({ power }: { power: PowerId }) {
  const p = POWERS[power];
  const Flag = FLAG_COMPONENTS[power];
  return (
    <div
      className="power-badge"
      style={{ ["--badge-color" as string]: p.color, ["--badge-accent" as string]: p.accent } as React.CSSProperties}
      aria-label={p.name}
    >
      <Flag className="power-flag" style={{ width: 56, height: 37, display: "block", borderRadius: 2 }} />
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
