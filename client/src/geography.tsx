import React, { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldData from "world-atlas/land-110m.json";

// World canvas dimensions — mirrored from Board.tsx. The Natural Earth land
// layer is fit into this rectangle via projection.fitExtent so continents fill
// the full board viewBox.
const WORLD_W = 2400;
const WORLD_H = 1200;

/**
 * Renders the Natural Earth coastline as a decorative scenery layer behind
 * the territory hexes. The Natural Earth I projection is chosen because it
 * is a compromise projection that yields the classic reference-atlas look
 * (less polar distortion than Mercator, less visual stretch than equal-area
 * alternatives) and keeps recognizable continent shapes for players.
 *
 * This layer is *purely decorative*. Territory hex positions are hand-placed
 * for gameplay legibility and will not line up perfectly with the rendered
 * coastline.
 */
export function NaturalEarthLand(): React.ReactElement {
  const d = useMemo(() => {
    // world-atlas ships a TopoJSON file; the JSON import has to be coerced
    // to the typed TopoJSON Topology shape.
    const topo = worldData as unknown as Topology;
    const landFeature = feature(
      topo,
      topo.objects.land as GeometryCollection,
    );
    const projection = geoNaturalEarth1().fitExtent(
      [
        [0, 0],
        [WORLD_W, WORLD_H],
      ],
      landFeature,
    );
    const path = geoPath(projection);
    return path(landFeature) ?? "";
  }, []);

  return (
    <g className="natural-earth-layer" filter="url(#blob-shadow)" pointerEvents="none">
      {/* Fill pass — warm parchment continents */}
      <path
        className="natural-earth-land"
        d={d}
        fill="url(#parchment-grad)"
      />
      {/* Coastline pass — crisp darker stroke over the fill for definition */}
      <path
        className="natural-earth-coast"
        d={d}
        fill="none"
      />
    </g>
  );
}
