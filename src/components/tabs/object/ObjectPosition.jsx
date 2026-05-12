import { Field, btn } from "../../common/common.jsx";

export default function ObjectPosition({
  selected,
  onUpdate,
  onMove,
  onTrack,
  camLat,
  camLon,
  camAlt,
}) {
  return (
    <>
      {/* ✅ Nút USE CAMERA POS trên cùng giống AddObjectModal */}
      <button
        onClick={() => {
          onUpdate("lat", camLat);
          onUpdate("lon", camLon);
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
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#00ff88aa";
          e.currentTarget.style.color = "#00ff88";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#00ff8833";
          e.currentTarget.style.color = "#00ff8888";
        }}
      >
        ⊕ Sử dụng vị trí hiện tại
      </button>

      <Field
        label="Latitude"
        val={selected.lat}
        set={(v) => onUpdate("lat", v)}
        color="#ffcc00"
        step={0.001}
        placeholder="Nhập vĩ độ"
      />
      <Field
        label="Longitude"
        val={selected.lon}
        set={(v) => onUpdate("lon", v)}
        color="#ffcc00"
        step={0.001}
        placeholder="Nhập kinh độ"
      />
      <Field
        label="Altitude (m)"
        val={selected.alt}
        set={(v) => onUpdate("alt", v)}
        color="#ffcc00"
        step={10}
        placeholder="Nhập độ cao (m)"
      />

      <button style={btn("#ffaa00")} onClick={onMove}>
        ▶ MOVE
      </button>
      <button style={btn("#00ccff")} onClick={onTrack}>
        ◎ FLY TO
      </button>
    </>
  );
}
