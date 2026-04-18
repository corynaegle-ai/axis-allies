import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser, GameState, LobbyGame, PowerId, ServerMsg } from "@aa/shared";
import { POWERS } from "@aa/shared";
import { Net } from "./net.js";
import { Lobby } from "./Lobby.js";
import { Game } from "./Game.js";
import { AuthScreen } from "./AuthScreen.js";

const STORAGE = "aa.session";
const AUTH_TOKEN_KEY = "aa.auth.token";

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

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // On mount: validate stored token or clear it
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((user: AuthUser) => {
        setAuthUser(user);
        setSessionName(user.displayName);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => setAuthLoading(false));
  }, []);

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
    net.send({ type: "hello", name: authUser?.displayName ?? sessionName, sessionId });
    return unsub;
  }, []);

  const myPower: PowerId | null = useMemo(() => {
    if (!state || !gameId) return null;
    const g = games.find((g) => g.id === gameId);
    const p = g?.players.find((p) => p.sessionId === sessionId);
    return (p?.power as PowerId) ?? null;
  }, [games, gameId, sessionId, state]);

  useEffect(() => { saveSession({ id: sessionId, name: sessionName }); }, [sessionId, sessionName]);

  if (authLoading) {
    return null; // brief flash while token is validated
  }

  if (!authUser) {
    return (
      <AuthScreen
        onAuth={(user) => {
          setAuthUser(user);
          setSessionName(user.displayName);
        }}
      />
    );
  }

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
