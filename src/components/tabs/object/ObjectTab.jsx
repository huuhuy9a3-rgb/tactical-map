import { useState } from "react";
import ObjectPosition from "./ObjectPosition.jsx";
import ObjectOrient from "./ObjectOrient.jsx";
import ObjectModelSelect, { DEFAULT_MODELS } from "./ObjectModelSelect.jsx";
import AddObjectModal from "./AddObjectModal.jsx";

const COLORS = ["#00ff88", "#ff4444", "#ffaa00", "#00ccff", "#ff88ff"];

const ITEM_HEIGHT = 41;
const MAX_VISIBLE = 5;

export default function ObjectTab({
  onAddObject,
  onRemoveObject,
  onMoveObject,
  onTrackObject,
  onRotateObject,
  camLat = "20.99352",
  camLon = "105.80232",
  camAlt = "150",
  onRenameObject,
  onChangeModel,
  objects,
  setObjects,
  selectedId,
  setSelectedId,
  counterRef,
}) {
  const [activeSection, setActiveSection] = useState("position");
  const [showModal, setShowModal] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);

  const selected = objects.find((o) => o.id === selectedId);

  const updateObject = (id, key, val) =>
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [key]: val } : o)),
    );

  const handleConfirmAdd = ({ name, lat, lon, alt, model }) => {
    const index = counterRef.current++;
    const obj = {
      id: `obj_${index}`,
      name: name || `Object-${index}`,
      lat,
      lon,
      alt,
      heading: "0",
      pitch: "0",
      roll: "0",
      modelUri: model,
      color: COLORS[(index - 1) % COLORS.length],
    };
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
    setShowModal(false);
    onAddObject({ id: obj.id, name: obj.name, lat, lon, alt, modelUri: model });
  };

  const handleRemove = (id) => {
    setObjects((prev) => {
      const next = prev.filter((o) => o.id !== id);
      if (next.length === 0) counterRef.current = 1;
      return next;
    });
    if (selectedId === id) setSelectedId(null);
    onRemoveObject(id);
  };

  return (
    <div>
      {/* Modal */}
      {showModal && (
        <AddObjectModal
          camLat={camLat}
          camLon={camLon}
          camAlt={camAlt}
          onConfirm={handleConfirmAdd}
          onClose={() => setShowModal(false)}
          models={models}
          onModelsChange={setModels}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 10, color: "#ffffff44", letterSpacing: 1 }}>
          {objects.length} OBJECT{objects.length !== 1 ? "S" : ""}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {objects.length > 1 && (
            <button
              onClick={() => {
                objects.forEach((o) => onRemoveObject(o.id));
                setObjects([]);
                setSelectedId(null);
                counterRef.current = 1;
              }}
              style={{
                background: "transparent",
                border: "1px solid #ff444488",
                color: "#ff4444",
                cursor: "pointer",
                borderRadius: 4,
                padding: "3px 10px",
                fontFamily: "Courier New",
                fontSize: 11,
              }}
            >
              ✕ ALL
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "transparent",
              border: "1px solid #00ff88",
              color: "#00ff88",
              cursor: "pointer",
              borderRadius: 4,
              padding: "3px 10px",
              fontFamily: "Courier New",
              fontSize: 11,
            }}
          >
            + ADD
          </button>
        </div>
      </div>

      {/* Object list — scroll khi > MAX_VISIBLE */}
      {objects.length === 0 ? (
        <div
          style={{
            color: "#ffffff33",
            fontSize: 10,
            textAlign: "center",
            padding: "16px 0",
          }}
        >
          Chưa có object nào
        </div>
      ) : (
        <div
          style={{
            maxHeight: MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * 4,
            overflowY: objects.length > MAX_VISIBLE ? "auto" : "visible",
            overflowX: "hidden",
            paddingRight: objects.length > MAX_VISIBLE ? 2 : 0,
            scrollbarWidth: "thin",
            scrollbarColor: "#00ff8833 transparent",
          }}
        >
          {objects.map((obj) => (
            <div
              key={obj.id}
              // ✅ Toggle: click lại object đang chọn → bỏ chọn
              onClick={() =>
                setSelectedId(selectedId === obj.id ? null : obj.id)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 4,
                marginBottom: 4,
                cursor: "pointer",
                border: `1px solid ${selectedId === obj.id ? obj.color : "#ffffff11"}`,
                background: selectedId === obj.id ? "#1a3a2a" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: obj.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: 11, color: "#ccc" }}>
                {obj.name}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(obj.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ff444488",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 2px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected object editor */}
      {selected && (
        <div style={{ marginTop: 12 }}>
          <div style={{ borderTop: "1px solid #ffffff11", marginBottom: 12 }} />

          {/* Name */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#ffffff66", marginBottom: 2 }}>
              NAME
            </div>
            <input
              value={selected.name}
              onChange={(e) => {
                updateObject(selected.id, "name", e.target.value);
                onRenameObject({ id: selected.id, name: e.target.value });
              }}
              style={{
                width: "100%",
                background: "#0d1a2a",
                border: `1px solid ${selected.color}44`,
                borderRadius: 4,
                color: selected.color,
                padding: "4px 8px",
                fontFamily: "Courier New",
                fontSize: 12,
              }}
            />
          </div>

          {/* Model */}
          <ObjectModelSelect
            value={selected.modelUri}
            onChange={(val) => {
              updateObject(selected.id, "modelUri", val);
              onChangeModel({ id: selected.id, modelUri: val });
            }}
            color={selected.color}
            models={models}
            onModelsChange={setModels}
          />

          {/* Section toggle */}
          <div style={{ display: "flex", marginBottom: 10, gap: 4 }}>
            {["position", "orient"].map((s) => (
              <div
                key={s}
                onClick={() => setActiveSection(s)}
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

          {activeSection === "position" && (
            <ObjectPosition
              selected={selected}
              onUpdate={(key, val) => updateObject(selected.id, key, val)}
              onMove={() =>
                onMoveObject({
                  id: selected.id,
                  lat: selected.lat,
                  lon: selected.lon,
                  alt: selected.alt,
                })
              }
              onTrack={() => onTrackObject(selected.id)}
              camLat={camLat}
              camLon={camLon}
              camAlt={camAlt}
            />
          )}
          {activeSection === "orient" && (
            <ObjectOrient
              selected={selected}
              onUpdate={(key, val) => updateObject(selected.id, key, val)}
              onRotate={() =>
                onRotateObject({
                  id: selected.id,
                  heading: selected.heading || "0",
                  pitch: selected.pitch || "0",
                  roll: selected.roll || "0",
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
