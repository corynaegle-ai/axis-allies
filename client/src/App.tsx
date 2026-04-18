import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, LobbyGame, PowerId, ServerMsg } from "@aa/shared";
import { POWERS } from "@aa/shared";
import { Net } from "./net.js";
import { Lobby } from "./Lobby.js";
import { Game } from "./Game.js";

const STORAGE = "aa.session";

function loadSession(): { id?: string; name: string } {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "Commander" };
}
function saveSession(s: { id?: string; name: string }) {
  try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch {}
}

export function App() {
  const netRef = useRef<Net | null>(null);
  if (!netRef.current) netRef.current = new Net();
  const net = netRef.current;

  const [sessionName, setSessionName] = useState<string>(() => loadSession().name);
  const [sessionId, setSessionId] = useState<string | undefined>(() => loadSession().id);
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  function showNotice(msg: string, durationMs = 5000) {
    setNotice(msg);
    setTimeout(() => setNotice(null), durationMs);
  }

  useEffect(() => {
    const unsub = net.on((msg: ServerMsg) => {
      switch (msg.type) {
        case "welcome":
          setSessionId(msg.session.sessionId);
          saveSession({ id: msg.session.sessionId, name: msg.session.name });
          break;
        case "games":
          setGames(msg.games);
          break;
        case "gameState":
          setState(msg.state);
          setGameId(msg.state.id);
          setLastSaved(Date.now());
          break;
        case "error":
          setError(msg.message);
          setTimeout(() => setError(null), 3000);
          break;
        case "info":
          showNotice(msg.message);
          break;
        case "playerQuit":
          showNotice(
            `${msg.playerName} (${POWERS[msg.power].name}) has forfeited.`,
            7000,
          );
          break;
      }
    });
    net.connect();
    net.send({ type: "hello", name: sessionName, sessionId });
    return unsub;
  }, []);

  const myPower: PowerId | null = useMemo(() => {
    if (!state || !gameId) return null;
    const g = games.find((g) => g.id === gameId);
    const p = g?.players.find((p) => p.sessionId === sessionId);
    return (p?.power as PowerId) ?? null;
  }, [games, gameId, sessionId, state]);

  useEffect(() => { saveSession({ id: sessionId, name: sessionName }); }, [sessionId, sessionName]);

  if (!state || !gameId) {
    return (
      <Lobby
        net={net}
        games={games}
        myName={sessionName}
        setName={(s) => {
          setSessionName(s);
          net.send({ type: "hello", name: s, sessionId });
        }}
      />
    );
  }

  return (
    <Game
      net={net}
      gameId={gameId}
      state={state}
      myPower={myPower}
      error={error}
      notice={notice}
      lastSaved={lastSaved}
      onQuit={() => {
        net.send({ type: "quitGame", gameId });
        setState(null);
        setGameId(null);
      }}
    />
  );
}
