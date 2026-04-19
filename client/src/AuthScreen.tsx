import React, { useState, useEffect } from "react";
import type { AuthUser } from "@aa/shared";
import { Globe } from "./Globe.js";
import { RU, DE, GB, JP, US } from "country-flag-icons/react/3x2";

const AUTH_TOKEN_KEY = "aa.auth.token";

interface AuthScreenProps {
  onAuth: (user: AuthUser) => void;
}

type Mode = "login" | "signup";

/* ─────────────────────────────────────────────
   Power color constants
───────────────────────────────────────────── */
const POWERS_DATA = [
  {
    id: "USSR",
    name: "Soviet Union",
    color: "#8b1a1a",
    glyph: "★",
    label: "CCCP",
  },
  {
    id: "GERMANY",
    name: "Germany",
    color: "#3a3a3a",
    glyph: "✚",
    label: "REICH",
  },
  {
    id: "UK",
    name: "United Kingdom",
    color: "#1a4a8b",
    glyph: "✦",
    label: "BRITAIN",
  },
  {
    id: "JAPAN",
    name: "Japan",
    color: "#8b6914",
    glyph: "☀",
    label: "NIHON",
  },
  {
    id: "USA",
    name: "United States",
    color: "#1a6b2f",
    glyph: "★",
    label: "U.S.A.",
  },
] as const;

/* ─────────────────────────────────────────────
   CSS animations injected once
───────────────────────────────────────────── */
const ANIMATION_CSS = `
  @keyframes fogDrift {
    0%   { transform: translateX(-60px) scaleX(1);   opacity: 0.18; }
    50%  { transform: translateX(60px)  scaleX(1.08); opacity: 0.28; }
    100% { transform: translateX(-60px) scaleX(1);   opacity: 0.18; }
  }
  @keyframes fogDriftSlow {
    0%   { transform: translateX(40px)  scaleX(1.05); opacity: 0.12; }
    50%  { transform: translateX(-40px) scaleX(0.97); opacity: 0.22; }
    100% { transform: translateX(40px)  scaleX(1.05); opacity: 0.12; }
  }
  @keyframes marchLeft {
    0%   { transform: translateX(0px);   }
    100% { transform: translateX(-320px); }
  }
  @keyframes marchRight {
    0%   { transform: translateX(0px);   }
    100% { transform: translateX(320px); }
  }
  @keyframes titlePulse {
    0%, 100% { text-shadow: 0 0 40px rgba(201,162,39,0.55), 0 2px 0 #000; }
    50%       { text-shadow: 0 0 80px rgba(201,162,39,0.85), 0 2px 0 #000; }
  }
  @keyframes horizonGlow {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.65; }
  }
  @keyframes bomberFloat {
    0%   { transform: translate(0px, 0px);  }
    33%  { transform: translate(6px, -4px); }
    66%  { transform: translate(-4px, 2px); }
    100% { transform: translate(0px, 0px);  }
  }
  @keyframes medalPulse {
    0%, 100% { box-shadow: 0 0 0px transparent; }
    50%       { box-shadow: 0 0 18px var(--power-color); }
  }
  @keyframes fadeUp {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0);    }
  }
  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
  .auth-input:focus {
    outline: none;
    border-bottom: 2px solid #c9a227 !important;
    box-shadow: 0 2px 12px rgba(201,162,39,0.35);
    background: rgba(201,162,39,0.05) !important;
  }
  .auth-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #d4b030 0%, #a07820 100%) !important;
    transform: scale(1.015);
    box-shadow: 0 4px 24px rgba(201,162,39,0.45) !important;
  }
  .auth-btn:active:not(:disabled) {
    transform: scale(0.99);
  }
  .auth-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .auth-link:hover {
    color: #f5e7c8 !important;
    text-decoration: underline;
  }
`;

/* ─────────────────────────────────────────────
   Globe + flags overlay (replaces SVG globe)
───────────────────────────────────────────── */
const FLAG_DATA = [
  { id: "russia", Flag: RU, color: "#7a2020" },
  { id: "germany", Flag: DE, color: "#4a4a4a" },
  { id: "uk", Flag: GB, color: "#1a3a6a" },
  { id: "japan", Flag: JP, color: "#8a5010" },
  { id: "usa", Flag: US, color: "#1a4a2a" },
] as const;

function AuthHeroGlobe() {
  const left = FLAG_DATA.slice(0, 2);
  const right = FLAG_DATA.slice(2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {left.map(({ id, Flag, color }) => (
          <div key={id} style={{
            border: `2px solid ${color}`,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 0 10px ${color}88`,
          }}>
            <Flag style={{ width: 68, height: 45, display: "block" }} />
          </div>
        ))}
      </div>
      <Globe />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {right.map(({ id, Flag, color }) => (
          <div key={id} style={{
            border: `2px solid ${color}`,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 0 10px ${color}88`,
          }}>
            <Flag style={{ width: 68, height: 45, display: "block" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SVG Hero Scene (background: sky, rays, sea, soldiers)
───────────────────────────────────────────── */
function HeroScene() {
  return (
    <svg
      viewBox="0 0 600 480"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="auth-sky" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2a1e0e" />
          <stop offset="55%" stopColor="#111108" />
          <stop offset="100%" stopColor="#080806" />
        </radialGradient>
        <radialGradient id="auth-horizon" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#c9a227" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#8b5e14" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="auth-fog1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a1610" stopOpacity="0" />
          <stop offset="30%" stopColor="#1a1610" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#1a1610" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1a1610" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="auth-fog2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f0e0a" stopOpacity="0" />
          <stop offset="25%" stopColor="#0f0e0a" stopOpacity="0.75" />
          <stop offset="75%" stopColor="#0f0e0a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0f0e0a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="auth-sea" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a2e3a" />
          <stop offset="100%" stopColor="#080e14" />
        </linearGradient>
        <radialGradient id="auth-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5d56a" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#c9a227" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
        </radialGradient>
        <filter id="auth-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feOffset dx="0" dy="3" result="blur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="auth-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="600" height="480" fill="url(#auth-sky)" />
      <rect x="0" y="280" width="600" height="200" fill="url(#auth-horizon)"
        style={{ animation: "horizonGlow 4s ease-in-out infinite" }} />
      <circle cx="300" cy="200" r="180" fill="url(#auth-sun)" />

      {/* Sun rays */}
      <g opacity="0.3" transform="translate(300 200)">
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i * Math.PI) / 10;
          return (
            <line key={i} x1="0" y1="0" x2={Math.cos(a)*300} y2={Math.sin(a)*300}
              stroke="#d4a94a" strokeWidth={i % 2 === 0 ? 2.5 : 1}
              strokeLinecap="round" opacity={i % 2 === 0 ? 0.5 : 0.22} />
          );
        })}
      </g>

      {/* ── Sea / ground ── */}
      <rect x="0" y="360" width="600" height="120" fill="url(#auth-sea)" />
      <g stroke="#1e3a52" strokeWidth="1" opacity="0.5">
        <path d="M0 370 Q75 366 150 370 Q225 374 300 370 Q375 366 450 370 Q525 374 600 370" fill="none" />
        <path d="M0 382 Q75 378 150 382 Q225 386 300 382 Q375 378 450 382 Q525 386 600 382" fill="none" />
      </g>

      {/* ── Left marching group ── */}
      <g style={{ animation: "marchLeft 28s linear infinite" }} opacity="0.88" filter="url(#auth-shadow)">
        <g transform="translate(90 348)" fill="#8b1a1a" stroke="#000" strokeWidth="0.5">
          <circle cx="0" cy="-24" r="5.5" />
          <rect x="-4.5" y="-18" width="9" height="15" />
          <rect x="-6" y="-3" width="4.5" height="13" />
          <rect x="1.5" y="-3" width="4.5" height="13" />
          <line x1="6" y1="-16" x2="15" y2="-30" stroke="#111" strokeWidth="1.3" />
        </g>
        <g transform="translate(170 348)" fill="#1a4a8b" stroke="#000" strokeWidth="0.5">
          <circle cx="0" cy="-24" r="5.5" />
          <rect x="-4.5" y="-18" width="9" height="15" />
          <rect x="-6" y="-3" width="4.5" height="13" />
          <rect x="1.5" y="-3" width="4.5" height="13" />
          <line x1="-6" y1="-16" x2="-15" y2="-30" stroke="#111" strokeWidth="1.3" />
        </g>
        <g transform="translate(270 350)" fill="#3a3a3a" stroke="#000" strokeWidth="0.7">
          <rect x="-22" y="-10" width="44" height="11" rx="2" />
          <rect x="-14" y="-19" width="24" height="9" rx="2" />
          <rect x="-2" y="-23" width="24" height="5" />
          <circle cx="-15" cy="3" r="4" fill="#1a1a1a" />
          <circle cx="-5" cy="3" r="4" fill="#1a1a1a" />
          <circle cx="5" cy="3" r="4" fill="#1a1a1a" />
          <circle cx="17" cy="3" r="4" fill="#1a1a1a" />
        </g>
      </g>

      {/* ── Right marching group ── */}
      <g style={{ animation: "marchRight 34s linear infinite" }} opacity="0.88" filter="url(#auth-shadow)">
        <g transform="translate(380 312)" fill="#8b6914" stroke="#000" strokeWidth="0.7"
          style={{ animation: "bomberFloat 6s ease-in-out infinite" }}>
          <ellipse cx="0" cy="0" rx="26" ry="5" />
          <polygon points="-22,0 -12,-12 12,-12 22,0" />
          <polygon points="-16,2 -7,12 7,12 16,2" />
          <circle cx="0" cy="0" r="4" fill="#3a2a08" />
        </g>
        <g transform="translate(460 348)" fill="#1a6b2f" stroke="#000" strokeWidth="0.5">
          <circle cx="0" cy="-24" r="5.5" />
          <rect x="-4.5" y="-18" width="9" height="15" />
          <rect x="-6" y="-3" width="4.5" height="13" />
          <rect x="1.5" y="-3" width="4.5" height="13" />
          <line x1="6" y1="-16" x2="15" y2="-30" stroke="#111" strokeWidth="1.3" />
        </g>
        <g transform="translate(540 355)" fill="#1a6b2f" stroke="#000" strokeWidth="0.7">
          <path d="M-32 0 L32 0 L25 9 L-25 9 Z" />
          <rect x="-12" y="-12" width="7" height="12" />
          <rect x="-3" y="-20" width="5" height="20" />
          <rect x="6" y="-9" width="7" height="9" />
        </g>
      </g>

      {/* ── Fog layers ── */}
      <rect x="-100" y="300" width="800" height="55" fill="url(#auth-fog1)"
        style={{ animation: "fogDrift 12s ease-in-out infinite" }} />
      <rect x="-100" y="320" width="800" height="45" fill="url(#auth-fog2)"
        style={{ animation: "fogDriftSlow 18s ease-in-out infinite" }} />
      <rect x="-100" y="340" width="800" height="35" fill="url(#auth-fog1)"
        style={{ animation: "fogDrift 22s ease-in-out infinite reverse" }} />
      <rect x="0" y="355" width="600" height="20" fill="#000" opacity="0.55" />

      {/* ── Top decorative rule ── */}
      <g transform="translate(300 28)">
        <line x1="-200" y1="0" x2="200" y2="0" stroke="#c9a227" strokeWidth="1" opacity="0.5" />
        <polygon points="0,-5 6,0 0,5 -6,0" fill="#c9a227" opacity="0.7" />
        <line x1="-220" y1="0" x2="-200" y2="0" stroke="#8a6c1f" strokeWidth="0.7" opacity="0.5" />
        <line x1="200" y1="0" x2="220" y2="0" stroke="#8a6c1f" strokeWidth="0.7" opacity="0.5" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Five Powers Medal Row
───────────────────────────────────────────── */
function PowerMedals() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "clamp(12px, 3vw, 28px)",
        flexWrap: "wrap",
      }}
    >
      {POWERS_DATA.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            animation: "fadeUp 0.8s ease-out both",
          }}
        >
          {/* Medal circle */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: `2px solid ${p.color}`,
              background: `radial-gradient(circle at 38% 35%, ${p.color}55, ${p.color}1a 70%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              color: p.color,
              boxShadow: `0 0 0 1px rgba(201,162,39,0.2), inset 0 1px 0 rgba(255,255,255,0.07)`,
              transition: "box-shadow 0.3s ease",
              // @ts-ignore css var
              "--power-color": p.color,
            } as React.CSSProperties}
          >
            {p.glyph}
          </div>
          {/* Power label */}
          <span
            style={{
              fontFamily: '"Georgia", "Times New Roman", serif',
              fontSize: "0.55rem",
              letterSpacing: "0.2em",
              color: "#8a7050",
              textTransform: "uppercase" as const,
              textAlign: "center" as const,
              lineHeight: 1,
            }}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Underline input field
───────────────────────────────────────────── */
function UnderlineInput({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  maxLength,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label
        style={{
          fontSize: "0.65rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: "#8a7050",
          fontFamily: '"Georgia", serif',
        }}
      >
        {label}
      </label>
      <input
        className="auth-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder ?? ""}
        autoComplete={autoComplete}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: "1px solid #5a3e12",
          borderRadius: 0,
          padding: "8px 2px 6px",
          color: "#f5e7c8",
          fontSize: "0.95rem",
          fontFamily: '"Georgia", serif',
          width: "100%",
          boxSizing: "border-box" as const,
          transition: "border-bottom 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [narrow, setNarrow] = useState(window.innerWidth < 768);

  // Inject CSS animations once
  useEffect(() => {
    const id = "auth-screen-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = ANIMATION_CSS;
      document.head.appendChild(style);
    }
    return () => {
      // leave styles in DOM — safe to share across mounts
    };
  }, []);

  // Responsive breakpoint
  useEffect(() => {
    const handler = () => setNarrow(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Form submission (logic preserved 1:1) ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, displayName };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      onAuth(data.user as AuthUser);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Layout ── */
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0a0a08",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Georgia", "Times New Roman", Times, serif',
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Main split ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          minHeight: narrow ? undefined : "100vh",
        }}
      >
        {/* ── LEFT: Hero visual ── */}
        <div
          style={{
            flex: narrow ? "0 0 auto" : "1 1 55%",
            position: "relative",
            minHeight: narrow ? 260 : undefined,
            background: "#0a0a08",
            overflow: "hidden",
          }}
        >
          {/* Subtle vignette over the SVG */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: narrow
                ? "linear-gradient(to bottom, transparent 60%, #0a0a08 100%)"
                : "linear-gradient(to right, transparent 70%, #0a0a08 100%)",
              zIndex: 3,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
            <HeroScene />
          </div>
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingBottom: "15%",
          }}>
            <AuthHeroGlobe />
          </div>

          {/* "FOR VICTORY" banner text over the hero */}
          {!narrow && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                left: 0,
                right: 0,
                zIndex: 4,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.6rem",
                  letterSpacing: "0.35em",
                  color: "#8a7050",
                  textTransform: "uppercase" as const,
                  borderTop: "1px solid #4a3810",
                  borderBottom: "1px solid #4a3810",
                  padding: "6px 20px",
                }}
              >
                Global Strategy · 1942 · Five Powers
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Auth card ── */}
        <div
          style={{
            flex: narrow ? "1 1 auto" : "0 0 420px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: narrow ? "32px 24px 48px" : "48px 40px",
            background: narrow
              ? "#0a0a08"
              : "linear-gradient(160deg, #100e08 0%, #0a0a08 60%)",
            position: "relative",
            zIndex: 5,
          }}
        >
          {/* Gold corner rule (desktop only) */}
          {!narrow && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              {/* Top rule */}
              <div
                style={{
                  position: "absolute",
                  top: 32,
                  left: 32,
                  right: 32,
                  height: "1px",
                  background:
                    "linear-gradient(to right, transparent, #5a3e12 30%, #c9a227 50%, #5a3e12 70%, transparent)",
                }}
              />
              {/* Bottom rule */}
              <div
                style={{
                  position: "absolute",
                  bottom: 32,
                  left: 32,
                  right: 32,
                  height: "1px",
                  background:
                    "linear-gradient(to right, transparent, #5a3e12 30%, #c9a227 50%, #5a3e12 70%, transparent)",
                }}
              />
            </div>
          )}

          {/* Card content */}
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              position: "relative",
              zIndex: 1,
              animation: "fadeUp 0.6s ease-out both",
            }}
          >
            {/* ── Masthead ── */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              {/* Decorative diamond */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background:
                      "linear-gradient(to right, transparent, #5a3e12)",
                  }}
                />
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  style={{ flexShrink: 0 }}
                >
                  <polygon
                    points="12,2 22,12 12,22 2,12"
                    fill="none"
                    stroke="#c9a227"
                    strokeWidth="1.5"
                  />
                  <polygon points="12,6 18,12 12,18 6,12" fill="#c9a227" opacity="0.4" />
                </svg>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background:
                      "linear-gradient(to left, transparent, #5a3e12)",
                  }}
                />
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
                  fontFamily: '"Georgia", "Times New Roman", serif',
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "#c9a227",
                  lineHeight: 1,
                  animation: "titlePulse 5s ease-in-out infinite",
                }}
              >
                AXIS &amp; ALLIES
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "0.7rem",
                  letterSpacing: "0.3em",
                  color: "#6a5a30",
                  textTransform: "uppercase" as const,
                  fontVariant: "small-caps",
                }}
              >
                1942 &middot; Second Edition
              </p>
            </div>

            {/* ── Auth card box ── */}
            <div
              style={{
                background:
                  "linear-gradient(160deg, #1a1208 0%, #110e06 100%)",
                border: "1px solid #3a2a0e",
                borderRadius: 4,
                padding: "28px 28px 24px",
                boxShadow:
                  "0 8px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(201,162,39,0.08), 0 0 0 1px rgba(201,162,39,0.04)",
              }}
            >
              {/* Mode header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #2e2010",
                  paddingBottom: 12,
                  marginBottom: 22,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase" as const,
                    color: "#d4a94a",
                    fontWeight: 400,
                  }}
                >
                  {mode === "login" ? "Command Access" : "Enlist"}
                </h2>
                <span
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.12em",
                    color: "#4a3810",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {mode === "login" ? "Sign In" : "Create Account"}
                </span>
              </div>

              {/* ── Form ── */}
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <UnderlineInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                {mode === "signup" && (
                  <UnderlineInput
                    label="Commander Name"
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    required
                    minLength={2}
                    maxLength={30}
                    placeholder="2–30 characters"
                    autoComplete="username"
                  />
                )}

                <UnderlineInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />

                {mode === "signup" && (
                  <UnderlineInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                )}

                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(139,26,26,0.15)",
                      border: "1px solid #6b1a1a",
                      borderLeft: "3px solid #8b1a1a",
                      borderRadius: 2,
                      color: "#f08080",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                      animation: "errorShake 0.4s ease-out",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="auth-btn"
                  style={{
                    marginTop: 6,
                    padding: "13px 20px",
                    background:
                      "linear-gradient(135deg, #c9a227 0%, #8a6c1f 100%)",
                    border: "none",
                    borderRadius: 2,
                    color: "#0a0a08",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    fontFamily: '"Georgia", serif',
                    letterSpacing: "0.22em",
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                    width: "100%",
                    transition:
                      "background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease",
                    boxShadow: "0 2px 12px rgba(201,162,39,0.25)",
                  }}
                >
                  {submitting
                    ? "Deploying..."
                    : mode === "login"
                    ? "Enter Command"
                    : "Enlist Now"}
                </button>
              </form>
            </div>

            {/* ── Toggle ── */}
            <p
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#5a4a28",
                letterSpacing: "0.05em",
              }}
            >
              {mode === "login" ? (
                <>
                  No commission yet?{" "}
                  <button
                    className="auth-link"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#c9a227",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      padding: 0,
                      fontFamily: "inherit",
                      letterSpacing: "0.05em",
                      transition: "color 0.2s ease",
                    }}
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                  >
                    Enlist here
                  </button>
                </>
              ) : (
                <>
                  Already commissioned?{" "}
                  <button
                    className="auth-link"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#c9a227",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      padding: 0,
                      fontFamily: "inherit",
                      letterSpacing: "0.05em",
                      transition: "color 0.2s ease",
                    }}
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Five Powers footer ── */}
      <div
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.85))",
          borderTop: "1px solid #1e1608",
          padding: "24px 24px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          zIndex: 10,
        }}
      >
        <PowerMedals />
        <p
          style={{
            margin: 0,
            fontSize: "0.58rem",
            letterSpacing: "0.25em",
            color: "#4a3a1a",
            textTransform: "uppercase" as const,
            textAlign: "center",
          }}
        >
          Five Powers &middot; One World &middot; Your Strategy
        </p>
      </div>
    </div>
  );
}
