import React, { useState } from "react";
import { UNITS, POWERS, TERRITORY_MAP, type GameState, type PowerId, type UnitId, type UnitStack } from "@aa/shared";
import { Piece } from "./pieces.js";

interface Props {
  sourceId: string;
  units: UnitStack[];
  myPower: PowerId;
  state: GameState;
  onConfirm: (unitIds: string[]) => void;
  onCancel: () => void;
}

interface UnitGroup {
  type: UnitId;
  ids: string[];
  selected: number;
}

export function UnitSelectionPopup({ sourceId, units, myPower, state, onConfirm, onCancel }: Props) {
  const territory = TERRITORY_MAP[sourceId];
  const power = POWERS[myPower];

  // Group units by type
  const groupMap = new Map<UnitId, string[]>();
  for (const u of units) {
    const existing = groupMap.get(u.unit) ?? [];
    existing.push(u.id);
    groupMap.set(u.unit, existing);
  }

  const initialGroups: UnitGroup[] = Array.from(groupMap.entries()).map(([type, ids]) => ({
    type,
    ids,
    selected: 0,
  }));

  const [groups, setGroups] = useState<UnitGroup[]>(initialGroups);

  const totalSelected = groups.reduce((sum, g) => sum + g.selected, 0);

  function adjust(type: UnitId, delta: number) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.type !== type) return g;
        const next = Math.max(0, Math.min(g.ids.length, g.selected + delta));
        return { ...g, selected: next };
      })
    );
  }

  function handleConfirm() {
    const ids: string[] = [];
    for (const g of groups) {
      ids.push(...g.ids.slice(0, g.selected));
    }
    onConfirm(ids);
  }

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle: React.CSSProperties = {
    background: "#131c2b",
    border: "2px solid #d6b667",
    borderRadius: 8,
    padding: 24,
    minWidth: 340,
    maxWidth: 440,
    color: "#e8dfc0",
    fontFamily: '"Garamond", "Georgia", serif',
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    color: "#ffd05b",
    letterSpacing: 1,
    textTransform: "uppercase",
  };

  const unitRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  const stepperBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 3,
    color: "#ffd05b",
    cursor: "pointer",
    width: 24,
    height: 24,
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const stepperBtnDisabledStyle: React.CSSProperties = {
    ...stepperBtnStyle,
    opacity: 0.35,
    cursor: "not-allowed",
  };

  const countStyle: React.CSSProperties = {
    minWidth: 28,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 600,
  };

  const footerStyle: React.CSSProperties = {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    fontSize: 13,
    color: "#b0a888",
    marginBottom: 4,
  };

  const actionRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.1)",
  };

  const cancelBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 4,
    color: "#c0b898",
    padding: 10,
    cursor: "pointer",
    flex: 1,
    fontFamily: '"Garamond", "Georgia", serif',
    fontSize: 14,
  };

  const confirmBtnStyle: React.CSSProperties = {
    background: "#2a4a30",
    border: "1px solid #d6b667",
    borderRadius: 4,
    color: "#ffd05b",
    padding: 10,
    fontWeight: 700,
    cursor: totalSelected === 0 ? "not-allowed" : "pointer",
    flex: 2,
    opacity: totalSelected === 0 ? 0.5 : 1,
    fontFamily: '"Garamond", "Georgia", serif',
    fontSize: 14,
  };

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>
          Select Units to Move
        </div>
        <div style={{ fontSize: 13, color: "#a0987a", marginBottom: 14 }}>
          From: {territory?.name ?? sourceId}
        </div>

        {groups.map((g) => {
          const unitDef = UNITS[g.type];
          return (
            <div key={g.type} style={unitRowStyle}>
              {/* Unit icon */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 5,
                background: power.color,
                border: `1.5px solid ${power.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Piece unit={g.type} fill="#fff" accent={power.accent} size={22} />
              </div>

              {/* Unit name + availability */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{unitDef.name}</div>
                <div style={{ fontSize: 11, color: "#8a8068" }}>{g.ids.length} available</div>
              </div>

              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  style={g.selected === 0 ? stepperBtnDisabledStyle : stepperBtnStyle}
                  disabled={g.selected === 0}
                  onClick={() => adjust(g.type, -1)}
                >
                  −
                </button>
                <span style={countStyle}>{g.selected}</span>
                <button
                  style={g.selected >= g.ids.length ? stepperBtnDisabledStyle : stepperBtnStyle}
                  disabled={g.selected >= g.ids.length}
                  onClick={() => adjust(g.type, +1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        <div style={footerStyle}>
          {totalSelected} unit{totalSelected !== 1 ? "s" : ""} selected
        </div>

        <div style={actionRowStyle}>
          <button style={cancelBtnStyle} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={confirmBtnStyle}
            disabled={totalSelected === 0}
            onClick={handleConfirm}
          >
            Move {totalSelected > 0 ? totalSelected : ""} unit{totalSelected !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
