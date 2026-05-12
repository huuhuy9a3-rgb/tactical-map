import { useEffect, useState } from "react";
import GpsTab, { pauseAll, simStateMap } from "./Gpstab ";
import DestinationTab from "./DestinationTab ";

const ITEM_HEIGHT = 39;
const MAX_VISIBLE = 5;

export default function SimTab({
  onSimulate,
  onMoveObject,
  onRotateObject,
  onDrawPath,
  onClearPath,
  objects,
  selectedId,
  setSelectedId,
}) {
  const [activeSection, setActiveSection] = useState("gps");
  const selected = objects?.find((o) => o.id === selectedId);

  const handleSetSection = (s) => {
    if (s === "destination") pauseAll();
    setActiveSection(s);
  };

  return (
    <>
      {/* Object selector */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#ffffff66", marginBottom: 4 }}>
          OBJECT
        </div>
        {!objects || objects.length === 0 ? (
          <div
            style={{
              fontSize: 10,
              color: "#ffffff33",
              textAlign: "center",
              padding: "8px 0",
              border: "1px solid #ffffff11",
              borderRadius: 4,
            }}
          >
            Chưa có object nào
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * 4,
              overflowY: objects.length > MAX_VISIBLE ? "auto" : "visible",
              overflowX: "hidden",
              scrollbarWidth: "thin",
              scrollbarColor: "#00ff8833 transparent",
            }}
          >
            {objects.map((obj) => (
              <div
                key={obj.id}
                onClick={() =>
                  setSelectedId(selectedId === obj.id ? null : obj.id)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  border: `1px solid ${selectedId === obj.id ? obj.color : "#ffffff11"}`,
                  background: selectedId === obj.id ? "#1a3a2a" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: obj.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 11, color: "#ccc", flex: 1 }}>
                  {obj.name}
                </div>
                {selectedId === obj.id && (
                  <div style={{ fontSize: 9, color: obj.color }}>✓</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #ffffff11", marginBottom: 10 }} />

      {/* Mode toggle */}
      <div style={{ display: "flex", marginBottom: 10, gap: 4 }}>
        {["gps", "destination"].map((s) => (
          <div
            key={s}
            onClick={() => handleSetSection(s)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "4px 0",
              fontSize: 9,
              letterSpacing: 1,
              cursor: "pointer",
              textTransform: "uppercase",
              color: activeSection === s ? "#00ffcc" : "#ffffff44",
              borderBottom:
                activeSection === s
                  ? "1px solid #00ffcc"
                  : "1px solid transparent",
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeSection === "gps" && (
        <GpsTab
          selected={selected}
          onMoveObject={onMoveObject}
          onRotateObject={onRotateObject}
          onDrawPath={onDrawPath}
          onClearPath={onClearPath}
        />
      )}
      {activeSection === "destination" && (
        <DestinationTab selected={selected} onSimulate={onSimulate} />
      )}
    </>
  );
}
