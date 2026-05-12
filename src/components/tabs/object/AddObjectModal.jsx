import { useState } from "react";
import ObjectModelSelect, {
  DEFAULT_MODEL_URI,
  MODELS,
} from "./ObjectModelSelect.jsx";

export default function AddObjectModal({
  camLat,
  camLon,
  camAlt,
  onConfirm,
  onClose,
  models,
  onModelsChange,
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [alt, setAlt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_URI);

  const lbl = { fontSize: 10, color: "#ffffff66", marginBottom: 2 };
  const input = (color = "#00ffcc") => ({
    width: "100%",
    background: "#080f18",
    border: `1px solid ${color}44`,
    borderRadius: 4,
    color,
    padding: "6px 8px",
    fontFamily: "Courier New",
    fontSize: 12,
    marginBottom: 10,
    outline: "none",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0a1628",
          border: "1px solid #00ff8844",
          borderRadius: 10,
          padding: 20,
          width: 280,
          zIndex: 9999,
          fontFamily: "Courier New",
          color: "#00ff88",
          boxShadow: "0 0 40px #00ff8822",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#00ffcc" }}>
            + NEW OBJECT
          </div>
          <div
            onClick={onClose}
            style={{ cursor: "pointer", color: "#ffffff44", fontSize: 16 }}
          >
            ✕
          </div>
        </div>

        {/* Name */}
        <div style={lbl}>NAME</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Object name"
          style={input("#00ffcc")}
        />

        {/* Model */}
        <ObjectModelSelect
          value={model}
          onChange={setModel}
          color="#00ffcc"
          models={models}
          onModelsChange={onModelsChange}
        />

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid #ffffff11",
            margin: "4px 0 12px",
            fontSize: 9,
            color: "#ffffff33",
            letterSpacing: 1,
            paddingTop: 8,
          }}
        >
          VỊ TRÍ — để trống sẽ lấy tọa độ camera
        </div>

        {/* USE CAMERA */}
        <button
          onClick={() => {
            setLat(camLat);
            setLon(camLon);
            setAlt(camAlt);
          }}
          style={{
            width: "100%",
            padding: "5px 0",
            marginBottom: 10,
            background: "transparent",
            border: "1px solid #00ff8833",
            color: "#00ff8888",
            borderRadius: 4,
            fontFamily: "Courier New",
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 1,
          }}
        >
          ⊕ Sử dụng vị trí hiện tại
        </button>

        {/* Latitude */}
        <div style={lbl}>Latitude</div>
        <input
          type="number"
          value={lat}
          step={0.001}
          onChange={(e) => setLat(e.target.value)}
          placeholder={"Nhập vĩ độ"}
          style={input("#ffcc00")}
        />

        {/* Longitude */}
        <div style={lbl}>Longitude</div>
        <input
          type="number"
          value={lon}
          step={0.001}
          onChange={(e) => setLon(e.target.value)}
          placeholder={"Nhập kinh độ"}
          style={input("#ffcc00")}
        />

        {/* Altitude */}
        <div style={lbl}>Altitude (m)</div>
        <input
          type="number"
          value={alt}
          step={10}
          onChange={(e) => setAlt(e.target.value)}
          placeholder={"Nhập độ cao (m)"}
          style={input("#ffcc00")}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "transparent",
              border: "1px solid #ff444466",
              color: "#ff4444",
              borderRadius: 4,
              fontFamily: "Courier New",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            ✕ CANCEL
          </button>
          <button
            onClick={() =>
              onConfirm({
                name,
                lat: lat || camLat,
                lon: lon || camLon,
                alt: alt || 50,
                model,
              })
            }
            style={{
              flex: 1,
              padding: "8px 0",
              background: "#00ff8811",
              border: "1px solid #00ff88",
              color: "#00ff88",
              borderRadius: 4,
              fontFamily: "Courier New",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            ✓ CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
