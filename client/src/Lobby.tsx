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

function GamePlayers({
  game,
  mySessionId,
}: {
  game: LobbyGame;
  mySessionId: string | undefined;
}) {
  return (
    <div className="game-players">
      {game.players.length === 0 && <span className="none">No commanders yet</span>}
      {game.players.map((p) => {
        const pow = p.power ? POWERS[p.power as PowerId] : null;
        return (
          <span
            key={p.sessionId}
            className={"player-chip" + (p.sessionId === mySessionId ? " mine" : "")}
            style={{ ["--chip-color" as string]: pow?.color ?? "#555" } as React.CSSProperties}
          >
            <span className="player-chip-dot" />
            {p.name}{pow ? ` · ${pow.name}` : ""}
          </span>
        );
      })}
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
  mySessionId,
  authUser,
  onLogout,
  setName,
  foundGame,
  onClearFoundGame,
}: {
  net: Net;
  games: LobbyGame[];
  myName: string;
  mySessionId: string | undefined;
  authUser: { displayName: string; email: string } | null;
  onLogout: () => void;
  setName: (s: string) => void;
  foundGame: LobbyGame | null;
  onClearFoundGame: () => void;
}) {
  const [newGameName, setNewGameName] = useState("Showdown");
  const [createPower, setCreatePower] = useState<PowerId>("russia");
  const [joinCode, setJoinCode] = useState("");
  const [joinPower, setJoinPower] = useState<PowerId>("russia");

  function handleLookup() {
    if (!joinCode.trim()) return;
    net.send({ type: "lookupGame", gameId: joinCode.trim() });
  }

  function handleJoinFound() {
    if (!foundGame) return;
    net.send({ type: "joinGame", gameId: foundGame.id, power: joinPower });
    onClearFoundGame();
    setJoinCode("");
  }

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

        {/* ---------- Launch new campaign ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">Launch a New Campaign</h2>
          <p className="lobby-panel-hint">
            Create a game and share the code with friends so they can join.
          </p>
          <div className="lobby-field-row">
            <input
              type="text"
              className="lobby-input"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder="Campaign name"
            />
            <select
              className="lobby-select"
              value={createPower}
              onChange={(e) => setCreatePower(e.target.value as PowerId)}
              aria-label="Your power"
            >
              {POWER_ORDER.map((p) => (
                <option key={p} value={p}>{POWERS[p].name}</option>
              ))}
            </select>
            <button
              className="lobby-btn primary"
              onClick={() => net.send({ type: "createGame", name: newGameName, power: createPower })}
            >
              Create &amp; Join
            </button>
          </div>
        </section>

        {/* ---------- Join by code ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">Join a Friend's Campaign</h2>
          <p className="lobby-panel-hint">
            Enter the game code your friend shared to find their campaign.
          </p>
          <div className="lobby-field-row">
            <input
              type="text"
              className="lobby-input lobby-input-code"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); onClearFoundGame(); }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="Game code (e.g. ABC123)"
              maxLength={10}
            />
            <button className="lobby-btn" onClick={handleLookup}>
              Look Up
            </button>
          </div>

          {foundGame && (
            <div className="found-game-card">
              <div className="found-game-header">
                <span className="found-game-name">{foundGame.name}</span>
                <span className="game-id">#{foundGame.id}</span>
                {foundGame.started && <span className="game-status-badge">In Progress</span>}
              </div>
              <GamePlayers game={foundGame} mySessionId={mySessionId} />
              {!foundGame.started ? (
                <div className="lobby-field-row" style={{ marginTop: 10 }}>
                  <select
                    className="lobby-select"
                    value={joinPower}
                    onChange={(e) => setJoinPower(e.target.value as PowerId)}
                    aria-label="Choose power"
                  >
                    {POWER_ORDER.map((p) => (
                      <option key={p} value={p} disabled={foundGame.players.some(pp => pp.power === p)}>
                        {POWERS[p].name}
                      </option>
                    ))}
                  </select>
                  <button className="lobby-btn primary" onClick={handleJoinFound}>
                    Join
                  </button>
                </div>
              ) : (
                <p className="lobby-panel-hint" style={{ marginTop: 8 }}>
                  This campaign is already underway — you cannot join mid-game.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ---------- My campaigns ---------- */}
        <section className="lobby-panel">
          <h2 className="lobby-panel-title">My Campaigns</h2>

          {games.length === 0 && (
            <div className="games-empty">
              No campaigns yet &mdash; launch one above or join a friend's.
            </div>
          )}

          <div className="games-list">
            {games.map((g) => {
              const isMember = g.players.some(p => p.sessionId === mySessionId);
              return (
                <div
                  key={g.id}
                  className={`game-row ${g.started ? "started" : ""}`}
                >
                  <div className="game-row-top">
                    <div className="game-name">
                      <span>{g.name}</span>
                      <span className="game-id">#{g.id}</span>
                    </div>
                    <button
                      className="lobby-btn abandon-btn"
                      title="Abandon this game"
                      onClick={() => {
                        if (confirm(`Abandon game #${g.id}? This cannot be undone.`)) {
                          net.send({ type: "abandonGame", gameId: g.id });
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <GamePlayers game={g} mySessionId={mySessionId} />

                  <div className="game-row-actions">
                    {isMember && g.started ? (
                      <button
                        className="lobby-btn primary"
                        onClick={() => net.send({ type: "rejoinGame", gameId: g.id })}
                      >
                        Rejoin
                      </button>
                    ) : !g.started ? (
                      <>
                        {!isMember && (
                          <select
                            className="lobby-select"
                            value={joinPower}
                            onChange={(e) => setJoinPower(e.target.value as PowerId)}
                            aria-label="Choose power"
                          >
                            {POWER_ORDER.map((p) => (
                              <option key={p} value={p} disabled={g.players.some(pp => pp.power === p)}>
                                {POWERS[p].name}
                              </option>
                            ))}
                          </select>
                        )}
                        {!isMember && (
                          <button
                            className="lobby-btn"
                            onClick={() => net.send({ type: "joinGame", gameId: g.id, power: joinPower })}
                          >
                            Join
                          </button>
                        )}
                        <button
                          className="lobby-btn primary"
                          disabled={g.players.length === 0}
                          onClick={() => net.send({ type: "startGame", gameId: g.id })}
                        >
                          Start
                        </button>
                      </>
                    ) : (
                      <span className="game-status-badge">In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Footnote ---------- */}
        <div className="lobby-footnote">
          Create a campaign and share the game code &mdash; friends enter it under
          &ldquo;Join a Friend's Campaign&rdquo; to find and join your game.
        </div>
      </div>
    </div>
  );
}
