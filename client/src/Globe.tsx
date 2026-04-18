import React, { useEffect, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

const SIZE = 260;
const RADIUS = SIZE / 2 - 2;

// Numeric ISO-3166 codes for the five 1942 powers
const POWER_COUNTRIES: Record<string, string> = {
  // USSR
  "643": "ru",
  // Germany + occupied: Germany
  "276": "de",
  // UK + dominions
  "826": "uk", "36": "uk", "124": "uk", "356": "uk", "710": "uk", "554": "uk",
  // Japan
  "392": "jp",
  // USA
  "840": "us",
};

const POWER_FILL: Record<string, string> = {
  ru: "#7a2020",
  de: "#4a4a4a",
  uk: "#1a3a6a",
  jp: "#8a5010",
  us: "#1a4a2a",
};

const LAND_FILL = "#2a3020";
const OCEAN_FILL = "#0d1c2a";
const GRATICULE_STROKE = "rgba(100,160,200,0.15)";
const OUTLINE_STROKE = "rgba(100,160,200,0.3)";

const countries = feature(
  worldData as unknown as Topology,
  (worldData as any).objects.countries as GeometryCollection,
);

const graticule = geoGraticule()();
const outline = { type: "Sphere" } as unknown as GeoJSON.GeoJsonObject;

export function Globe() {
  const rotRef = useRef({ yaw: -20, pitch: 20 });
  const rafRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let last = performance.now();
    function tick(now: number) {
      const dt = now - last;
      last = now;
      rotRef.current.yaw += dt * 0.018;
      forceRender(v => v + 1);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const projection = geoOrthographic()
    .scale(RADIUS)
    .translate([SIZE / 2, SIZE / 2])
    .rotate([-rotRef.current.yaw, -rotRef.current.pitch, 0])
    .clipAngle(90);

  const path = geoPath(projection);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Rotating globe"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="ocean-grad" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#1a3a58" />
          <stop offset="100%" stopColor={OCEAN_FILL} />
        </radialGradient>
        <radialGradient id="globe-shine" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Drop shadow ellipse — no SVG filter on the globe content to avoid graticule artifacts */}
      <ellipse cx={SIZE / 2 + 6} cy={SIZE / 2 + 12} rx={RADIUS * 0.88} ry={RADIUS * 0.2}
        fill="rgba(0,0,0,0.45)" style={{ filter: "blur(10px)" }} />

      <g>
        {/* Ocean */}
        <path d={path(outline as any) ?? ""} fill="url(#ocean-grad)" />

        {/* Graticule grid */}
        <path d={path(graticule) ?? ""} fill="none" stroke={GRATICULE_STROKE} strokeWidth={0.5} />

        {/* Land — all countries */}
        {(countries.features as any[]).map((f: any) => {
          const id = String(f.id);
          const power = POWER_COUNTRIES[id];
          const fill = power ? POWER_FILL[power] : LAND_FILL;
          const d = path(f);
          if (!d) return null;
          return (
            <path
              key={id}
              d={d}
              fill={fill}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={0.4}
            />
          );
        })}

        {/* Globe outline ring */}
        <path d={path(outline as any) ?? ""} fill="none" stroke={OUTLINE_STROKE} strokeWidth={1} />

        {/* Specular shine */}
        <path d={path(outline as any) ?? ""} fill="url(#globe-shine)" />
      </g>
    </svg>
  );
}
