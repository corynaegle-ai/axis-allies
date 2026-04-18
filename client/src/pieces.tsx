import React from "react";
import type { UnitId } from "@aa/shared";

/**
 * Unit silhouettes — art direction by Mary James.
 *
 * Each piece draws inside a 40x40 viewBox with a ~4px safe margin so it
 * sits clean inside the 24x24 colored token rendered by Board.tsx.
 *
 * Rules of the house:
 *  - Read at 16px first: every silhouette must be instantly identifiable
 *    at token scale. Narrative details are secondary.
 *  - A set, not 13 individuals: shared linework weight, shared horizon,
 *    shared top-left light source, shared ratio of highlight to shadow.
 *  - Depth via gradients: each piece has a single top-lit linear gradient
 *    keyed to `fill` (brighter at top-left) and `accent` (darker at
 *    bottom-right). All gradient ids come from React.useId() so multiple
 *    instances on one page never collide.
 *  - Signature touches: ship wakes, aircraft roundels, tank track links,
 *    a spent shell casing for artillery, smoke curling off the factory.
 */

export interface PieceProps {
  unit: UnitId;
  fill?: string;
  accent?: string;
  size?: number;
}

export function Piece({ unit, fill = "#ccc", accent = "#333", size = 28 }: PieceProps): JSX.Element {
  const reactId = React.useId();
  // React.useId() returns strings with ":" which are invalid in SVG ids/url(#...).
  const idBase = `p${reactId.replace(/:/g, "")}`;
  const gradId = `${idBase}-g`;
  const rimId = `${idBase}-r`;
  const shadowId = `${idBase}-s`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ overflow: "visible", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        {/* Top-lit body gradient: brighter than fill at top-left, darker toward accent. */}
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="55%" stopColor={fill} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
        </linearGradient>
        {/* Edge rim — a touch of accent for outline weight without a hard stroke. */}
        <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.9" />
        </linearGradient>
        {/* Contact shadow — sits on the horizon line at y=34. */}
        <radialGradient id={shadowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {renderGlyph(unit, fill, accent, gradId, rimId, shadowId)}
    </svg>
  );
}

type GlyphArgs = {
  fill: string;
  accent: string;
  body: string; // url(#gradId)
  rim: string;  // url(#rimId)
  shadow: string; // url(#shadowId)
};

function renderGlyph(
  unit: UnitId,
  fill: string,
  accent: string,
  gradId: string,
  rimId: string,
  shadowId: string,
): React.ReactNode {
  const body = `url(#${gradId})`;
  const rim = `url(#${rimId})`;
  const shadow = `url(#${shadowId})`;
  const a: GlyphArgs = { fill, accent, body, rim, shadow };

  switch (unit) {
    case "infantry":    return <Infantry    {...a} />;
    case "artillery":   return <Artillery   {...a} />;
    case "tank":        return <Tank        {...a} />;
    case "fighter":     return <Fighter     {...a} />;
    case "bomber":      return <Bomber      {...a} />;
    case "battleship":  return <Battleship  {...a} />;
    case "cruiser":     return <Cruiser     {...a} />;
    case "destroyer":   return <Destroyer   {...a} />;
    case "submarine":   return <Submarine   {...a} />;
    case "transport":   return <Transport   {...a} />;
    case "carrier":     return <Carrier     {...a} />;
    case "aa":          return <AA          {...a} />;
    case "factory":     return <Factory     {...a} />;
  }
}

/* ------------------------------------------------------------------ */
/*  LAND PIECES                                                        */
/* ------------------------------------------------------------------ */

function Infantry({ body, accent, shadow }: GlyphArgs) {
  // Helmeted soldier, shouldered rifle. Silhouette keys on the helmet dome
  // plus the diagonal rifle line — unmistakable at 16px.
  return (
    <g>
      <ellipse cx="20" cy="35" rx="9" ry="1.6" fill={shadow} />
      {/* Helmet */}
      <path d="M14 11 Q20 5 26 11 L26 13 L14 13 Z" fill={body} />
      <path d="M13 12.5 L27 12.5" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
      {/* Head shadow under helmet */}
      <rect x="16" y="13" width="8" height="2" fill={accent} opacity="0.55" />
      {/* Torso + webbing */}
      <path d="M14 15 L26 15 L28 27 L12 27 Z" fill={body} />
      <path d="M17 16 L23 26" stroke={accent} strokeWidth="0.8" opacity="0.55" />
      {/* Belt */}
      <rect x="13" y="24" width="14" height="1.6" fill={accent} opacity="0.75" />
      {/* Legs */}
      <rect x="14" y="27" width="4.5" height="7" fill={body} />
      <rect x="21.5" y="27" width="4.5" height="7" fill={body} />
      {/* Boots */}
      <rect x="13.5" y="33" width="5.5" height="1.6" fill={accent} />
      <rect x="21" y="33" width="5.5" height="1.6" fill={accent} />
      {/* Rifle slung across body */}
      <line x1="9" y1="28" x2="31" y2="10" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="28.5" y1="12" x2="30.5" y2="9.5" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
    </g>
  );
}

function Artillery({ body, accent, fill, shadow }: GlyphArgs) {
  // Howitzer, barrel rising to upper right. Spent shell casing at ground-left
  // is the narrative flourish.
  return (
    <g>
      <ellipse cx="20" cy="35" rx="14" ry="1.6" fill={shadow} />
      {/* Trail (tail) */}
      <path d="M6 32 L16 26 L18 28 L8 34 Z" fill={accent} opacity="0.85" />
      {/* Carriage body */}
      <path d="M10 24 L26 24 L28 30 L10 30 Z" fill={body} />
      {/* Breech */}
      <rect x="17" y="20" width="7" height="6" rx="1" fill={body} />
      {/* Barrel — long diagonal, tapered muzzle */}
      <path d="M22 22 L36 13 L37 14.5 L23 24 Z" fill={body} />
      <circle cx="36.3" cy="13.7" r="1.1" fill={accent} />
      {/* Muzzle brake */}
      <rect x="34" y="12" width="2.4" height="3" fill={accent} transform="rotate(-32 35 13.5)" />
      {/* Wheels */}
      <circle cx="14" cy="30" r="3.2" fill={accent} />
      <circle cx="24" cy="30" r="3.2" fill={accent} />
      <circle cx="14" cy="30" r="1.1" fill={fill} />
      <circle cx="24" cy="30" r="1.1" fill={fill} />
      {/* Spent shell casing on the ground */}
      <rect x="4" y="33" width="3" height="1.3" rx="0.3" fill={accent} />
      <rect x="6.5" y="33" width="0.7" height="1.3" fill={fill} opacity="0.6" />
    </g>
  );
}

function Tank({ body, accent, fill, shadow }: GlyphArgs) {
  // Hull + turret + gun. Visible track links along the bottom — not just wheels.
  return (
    <g>
      <ellipse cx="20" cy="35" rx="16" ry="1.6" fill={shadow} />
      {/* Tracks (continuous band) */}
      <rect x="4" y="27" width="32" height="6" rx="3" fill={accent} />
      {/* Track links — tiny tick marks read as treads at 16px */}
      {[6, 9.5, 13, 16.5, 20, 23.5, 27, 30.5, 34].map((x) => (
        <rect key={x} x={x - 0.5} y="29" width="1" height="2" fill={fill} opacity="0.55" />
      ))}
      {/* Road wheels peeking through */}
      {[8, 14, 20, 26, 32].map((x) => (
        <circle key={x} cx={x} cy="30" r="1.6" fill={fill} opacity="0.25" />
      ))}
      {/* Hull */}
      <path d="M5 22 L35 22 L37 27 L3 27 Z" fill={body} />
      {/* Glacis highlight */}
      <path d="M5 22 L35 22 L34 23 L6 23 Z" fill={fill} opacity="0.25" />
      {/* Turret */}
      <rect x="13" y="14" width="14" height="8" rx="2" fill={body} />
      <rect x="13" y="14" width="14" height="1.5" rx="1" fill={fill} opacity="0.3" />
      {/* Main gun */}
      <rect x="25" y="17" width="13" height="2.2" rx="0.6" fill={accent} />
      {/* Cupola */}
      <rect x="17" y="11.5" width="4" height="3" rx="0.6" fill={accent} />
    </g>
  );
}

function AA({ body, accent, fill, shadow }: GlyphArgs) {
  // Anti-aircraft: quad-barrel gun on a wheeled base, barrels elevated.
  return (
    <g>
      <ellipse cx="20" cy="35" rx="12" ry="1.5" fill={shadow} />
      {/* Base platform */}
      <path d="M7 28 L33 28 L31 33 L9 33 Z" fill={body} />
      {/* Wheels */}
      <circle cx="12" cy="33" r="2.4" fill={accent} />
      <circle cx="28" cy="33" r="2.4" fill={accent} />
      <circle cx="12" cy="33" r="0.9" fill={fill} />
      <circle cx="28" cy="33" r="0.9" fill={fill} />
      {/* Mount */}
      <rect x="16" y="22" width="8" height="6" rx="1" fill={body} />
      {/* Four barrels, elevated high — AA signature */}
      <line x1="20" y1="24" x2="11" y2="6"  stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="24" x2="17" y2="4"  stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="24" x2="23" y2="4"  stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="24" x2="29" y2="6"  stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      {/* Ring sight on top */}
      <circle cx="20" cy="20" r="1.8" fill="none" stroke={accent} strokeWidth="0.8" />
    </g>
  );
}

function Factory({ body, accent, fill, shadow }: GlyphArgs) {
  // Classic sawtooth factory roof + smokestack with a curl of smoke.
  return (
    <g>
      <ellipse cx="20" cy="35" rx="16" ry="1.5" fill={shadow} />
      {/* Smoke curling from the stack (neutral tone so it reads on any fill) */}
      <path
        d="M28 6 Q30 4 28.5 2 Q27 0.5 29 -0.5"
        fill="none"
        stroke="#9aa4ae"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.65"
      />
      <circle cx="28.2" cy="5.2" r="1.1" fill="#9aa4ae" opacity="0.55" />
      {/* Smokestack */}
      <rect x="26" y="6" width="3" height="9" fill={accent} />
      <rect x="25.5" y="6" width="4" height="1" fill={fill} opacity="0.4" />
      {/* Sawtooth roof */}
      <path
        d="M4 16 L10 10 L14 16 L18 10 L22 16 L26 10 L30 16 Z"
        fill={body}
      />
      <path
        d="M10 10 L14 16 M18 10 L22 16 M26 10 L30 16"
        stroke={accent}
        strokeWidth="0.7"
        fill="none"
        opacity="0.7"
      />
      {/* Main wall */}
      <rect x="4" y="16" width="30" height="17" fill={body} />
      {/* Ground line */}
      <rect x="4" y="31" width="30" height="2" fill={accent} opacity="0.8" />
      {/* Windows — three lit panes */}
      <rect x="7"  y="20" width="5" height="5" fill={accent} />
      <rect x="15" y="20" width="5" height="5" fill={accent} />
      <rect x="23" y="20" width="5" height="5" fill={accent} />
      {/* Window mullions */}
      <line x1="9.5"  y1="20" x2="9.5"  y2="25" stroke={fill} strokeWidth="0.5" opacity="0.6" />
      <line x1="17.5" y1="20" x2="17.5" y2="25" stroke={fill} strokeWidth="0.5" opacity="0.6" />
      <line x1="25.5" y1="20" x2="25.5" y2="25" stroke={fill} strokeWidth="0.5" opacity="0.6" />
      <line x1="7" y1="22.5" x2="28" y2="22.5" stroke={fill} strokeWidth="0.4" opacity="0.6" />
      {/* Loading door */}
      <rect x="14" y="27" width="6" height="6" fill={accent} />
      <rect x="16.8" y="27" width="0.4" height="6" fill={fill} opacity="0.5" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  AIR PIECES — flat neutral roundel for readability                  */
/* ------------------------------------------------------------------ */

function Fighter({ body, accent, shadow }: GlyphArgs) {
  // Top-down single-engine fighter. Flat white roundel on the wing.
  return (
    <g>
      <ellipse cx="20" cy="36" rx="8" ry="1.2" fill={shadow} />
      {/* Fuselage */}
      <path d="M20 4 L22 30 L20 36 L18 30 Z" fill={body} />
      {/* Wings */}
      <path d="M3 22 L20 18 L37 22 L20 24 Z" fill={body} />
      {/* Tailplane */}
      <path d="M14 32 L20 30 L26 32 L20 34 Z" fill={body} />
      {/* Wing shadow underside */}
      <path d="M3 22 L20 21.5 L37 22 L20 22.5 Z" fill={accent} opacity="0.35" />
      {/* Canopy */}
      <ellipse cx="20" cy="17" rx="1.8" ry="3" fill={accent} />
      {/* Propeller hub */}
      <circle cx="20" cy="5" r="1" fill={accent} />
      <line x1="16" y1="5" x2="24" y2="5" stroke={accent} strokeWidth="0.6" />
      {/* Roundel — neutral white */}
      <circle cx="11" cy="22" r="1.8" fill="#ffffff" opacity="0.92" />
      <circle cx="29" cy="22" r="1.8" fill="#ffffff" opacity="0.92" />
    </g>
  );
}

function Bomber({ body, accent, shadow }: GlyphArgs) {
  // Heavy four-engine bomber. Big wingspan, twin tail.
  return (
    <g>
      <ellipse cx="20" cy="37" rx="11" ry="1.2" fill={shadow} />
      {/* Fuselage */}
      <path d="M20 3 L22 32 L20 37 L18 32 Z" fill={body} />
      {/* Wings — long, read clearly at tiny sizes */}
      <path d="M1 21 L20 17 L39 21 L20 25 Z" fill={body} />
      {/* Wing shadow */}
      <path d="M1 21 L20 20 L39 21 L20 22 Z" fill={accent} opacity="0.35" />
      {/* Four engines */}
      <rect x="6"  y="20" width="3" height="4" rx="0.8" fill={accent} />
      <rect x="12" y="19" width="3" height="4" rx="0.8" fill={accent} />
      <rect x="25" y="19" width="3" height="4" rx="0.8" fill={accent} />
      <rect x="31" y="20" width="3" height="4" rx="0.8" fill={accent} />
      {/* Twin tail */}
      <path d="M13 33 L20 30 L27 33 L20 35 Z" fill={body} />
      <rect x="14" y="30" width="1.5" height="4" fill={accent} />
      <rect x="24.5" y="30" width="1.5" height="4" fill={accent} />
      {/* Cockpit */}
      <ellipse cx="20" cy="10" rx="1.6" ry="3" fill={accent} />
      {/* Roundel */}
      <circle cx="10" cy="21" r="1.6" fill="#ffffff" opacity="0.92" />
      <circle cx="30" cy="21" r="1.6" fill="#ffffff" opacity="0.92" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  SEA PIECES — each has a two-crescent wake                          */
/* ------------------------------------------------------------------ */

function Wake() {
  // Two small white crescents astern of the ship. Drawn in absolute
  // coordinates for each vessel so the horizon stays consistent.
  return (
    <g opacity="0.8">
      <path d="M4 32 Q7 31 10 32" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M6 34 Q9 33 12 34" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Waterline() {
  // Thin horizon tick so ships share the same ground plane.
  return <line x1="2" y1="30" x2="38" y2="30" stroke="#ffffff" strokeWidth="0.3" opacity="0.22" />;
}

function Battleship({ body, accent, fill, shadow }: GlyphArgs) {
  // Heavy dreadnought — big hull, tall pagoda bridge, triple turrets.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="17" ry="1.1" fill={shadow} />
      <Waterline />
      {/* Hull */}
      <path d="M2 24 L4 20 L36 20 L38 24 L34 28 L6 28 Z" fill={body} />
      {/* Deck highlight */}
      <path d="M4 20 L36 20 L35 21 L5 21 Z" fill={fill} opacity="0.3" />
      {/* Bridge tower */}
      <rect x="16" y="10" width="6" height="10" fill={body} />
      <rect x="17" y="6"  width="4" height="4" fill={body} />
      <rect x="18.5" y="3" width="1" height="3" fill={accent} />
      {/* Turrets (fore & aft) */}
      <rect x="7"  y="16" width="5" height="4" rx="0.8" fill={accent} />
      <rect x="28" y="16" width="5" height="4" rx="0.8" fill={accent} />
      {/* Gun barrels */}
      <rect x="4"  y="17.4" width="5" height="1.1" fill={accent} />
      <rect x="31" y="17.4" width="5" height="1.1" fill={accent} />
      {/* Portholes */}
      <circle cx="10" cy="25" r="0.7" fill={accent} />
      <circle cx="20" cy="25" r="0.7" fill={accent} />
      <circle cx="30" cy="25" r="0.7" fill={accent} />
      <Wake />
    </g>
  );
}

function Cruiser({ body, accent, fill, shadow }: GlyphArgs) {
  // Sleeker than a battleship, single stack, two turrets.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="15" ry="1" fill={shadow} />
      <Waterline />
      <path d="M4 24 L6 21 L34 21 L36 24 L32 28 L8 28 Z" fill={body} />
      <path d="M6 21 L34 21 L33 22 L7 22 Z" fill={fill} opacity="0.3" />
      {/* Superstructure */}
      <rect x="15" y="13" width="6" height="8" fill={body} />
      {/* Stack */}
      <rect x="22" y="14" width="3" height="7" fill={accent} />
      <rect x="21.5" y="13.5" width="4" height="1" fill={fill} opacity="0.4" />
      {/* Mast */}
      <rect x="17.5" y="8" width="1" height="5" fill={accent} />
      {/* Turrets */}
      <rect x="9"  y="18" width="4" height="3" rx="0.6" fill={accent} />
      <rect x="27" y="18" width="4" height="3" rx="0.6" fill={accent} />
      <rect x="7"  y="19" width="3" height="1" fill={accent} />
      <rect x="30" y="19" width="3" height="1" fill={accent} />
      <Wake />
    </g>
  );
}

function Destroyer({ body, accent, fill, shadow }: GlyphArgs) {
  // Low and fast. Single gun forward, torpedo mount amidships.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="14" ry="1" fill={shadow} />
      <Waterline />
      <path d="M4 25 L6 22 L34 22 L36 25 L32 28 L8 28 Z" fill={body} />
      <path d="M6 22 L34 22 L33 23 L7 23 Z" fill={fill} opacity="0.3" />
      {/* Low bridge */}
      <rect x="16" y="17" width="5" height="5" fill={body} />
      {/* Two short stacks */}
      <rect x="22" y="17" width="2" height="5" fill={accent} />
      <rect x="25" y="17" width="2" height="5" fill={accent} />
      {/* Forward gun */}
      <rect x="9"  y="20" width="3" height="2" rx="0.4" fill={accent} />
      <rect x="7"  y="20.7" width="3" height="0.8" fill={accent} />
      {/* Mast */}
      <rect x="17.5" y="11" width="1" height="6" fill={accent} />
      {/* Depth-charge rack (antiSub signature) */}
      <rect x="29" y="20.5" width="3" height="1.5" fill={accent} />
      <circle cx="30" cy="21.3" r="0.4" fill={fill} opacity="0.8" />
      <circle cx="31.2" cy="21.3" r="0.4" fill={fill} opacity="0.8" />
      <Wake />
    </g>
  );
}

function Submarine({ body, accent, fill, shadow }: GlyphArgs) {
  // Cigar hull, conning tower, periscope — surfaced profile.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="15" ry="1" fill={shadow} />
      <Waterline />
      {/* Hull */}
      <path d="M3 25 Q5 22 20 22 Q35 22 37 25 Q35 28 20 28 Q5 28 3 25 Z" fill={body} />
      <path d="M5 23.4 Q20 22.4 35 23.4" stroke={fill} strokeWidth="0.6" opacity="0.35" fill="none" />
      {/* Conning tower */}
      <path d="M16 16 L24 16 L23 22 L17 22 Z" fill={body} />
      <rect x="16" y="16" width="8" height="1" fill={fill} opacity="0.35" />
      {/* Periscope */}
      <rect x="19.5" y="10" width="1" height="6" fill={accent} />
      <rect x="18.5" y="10" width="3" height="1" fill={accent} />
      {/* Snorkel */}
      <rect x="22" y="12" width="1" height="4" fill={accent} />
      {/* Wake — light because she runs quiet */}
      <path d="M4 29.5 Q7 28.8 10 29.5" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.65" />
    </g>
  );
}

function Transport({ body, accent, fill, shadow }: GlyphArgs) {
  // Merchant freighter: bow, bridge aft, two deck cranes over cargo holds.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="15" ry="1" fill={shadow} />
      <Waterline />
      {/* Hull */}
      <path d="M3 24 L5 20 L35 20 L37 24 L33 28 L7 28 Z" fill={body} />
      <path d="M5 20 L35 20 L34 21 L6 21 Z" fill={fill} opacity="0.3" />
      {/* Cargo holds (darker deck rectangles) */}
      <rect x="8"  y="17" width="7" height="3" fill={accent} opacity="0.85" />
      <rect x="16" y="17" width="7" height="3" fill={accent} opacity="0.85" />
      {/* Deck cranes */}
      <line x1="11.5" y1="17" x2="11.5" y2="10" stroke={accent} strokeWidth="0.9" />
      <line x1="11.5" y1="10" x2="16"   y2="13" stroke={accent} strokeWidth="0.9" />
      <line x1="19.5" y1="17" x2="19.5" y2="11" stroke={accent} strokeWidth="0.9" />
      <line x1="19.5" y1="11" x2="15"   y2="14" stroke={accent} strokeWidth="0.9" />
      {/* Bridge aft */}
      <rect x="25" y="13" width="6" height="7" fill={body} />
      <rect x="27" y="9"  width="2" height="4" fill={body} />
      <rect x="27.5" y="6" width="1" height="3" fill={accent} />
      {/* Hull stripe */}
      <rect x="6" y="25" width="28" height="0.8" fill={accent} opacity="0.7" />
      <Wake />
    </g>
  );
}

function Carrier({ body, accent, fill, shadow }: GlyphArgs) {
  // Flat flight deck, island offset to starboard, centerline dashes.
  return (
    <g>
      <ellipse cx="20" cy="30.5" rx="17" ry="1.1" fill={shadow} />
      <Waterline />
      {/* Flight deck */}
      <path d="M2 20 L6 18 L36 18 L38 20 L38 23 L2 23 Z" fill={body} />
      <path d="M2 20 L38 20 L38 20.8 L2 20.8 Z" fill={fill} opacity="0.35" />
      {/* Hull below deck */}
      <path d="M4 23 L36 23 L33 28 L7 28 Z" fill={body} />
      <rect x="4" y="23" width="32" height="0.8" fill={accent} opacity="0.7" />
      {/* Island superstructure */}
      <rect x="27" y="11" width="5" height="7" fill={body} />
      <rect x="28" y="7"  width="2" height="4" fill={body} />
      <rect x="28.5" y="3" width="1" height="4" fill={accent} />
      {/* Centerline dashes */}
      <line x1="5" y1="21.2" x2="25" y2="21.2" stroke={fill} strokeWidth="0.5" strokeDasharray="1.6 1.6" opacity="0.8" />
      {/* Arrester wires aft */}
      <line x1="3" y1="22.2" x2="14" y2="22.2" stroke={accent} strokeWidth="0.4" opacity="0.7" />
      <Wake />
    </g>
  );
}
