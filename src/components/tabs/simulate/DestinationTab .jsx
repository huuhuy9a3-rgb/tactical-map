import { useState } from "react";
import { btn } from "../../common/common";

// ── Tính heading giữa 2 điểm ────────────────────────────
function calcHeading(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── Gọi OSRM API tìm đường bộ ───────────────────────────
async function fetchRoadPath(startLat, startLon, endLat, endLon, alt = 10) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLon},${startLat};${endLon},${endLat}` +
    `?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("Không tìm được đường!");
  }

  const coords = data.routes[0].geometry.coordinates;

  return coords.map(([lon, lat], i, arr) => {
    const next = arr[i + 1];
    const heading = next
      ? calcHeading(lat, lon, next[1], next[0])
      : i > 0
        ? calcHeading(arr[i - 1][1], arr[i - 1][0], lat, lon)
        : 0;
    return { lat, lon, alt: parseFloat(alt), heading };
  });
}

const lbl = { fontSize: 10, color: "#ffffff66", marginBottom: 2 };

const inputStyle = (color = "#00ffcc") => ({
  width: "100%",
  background: "#0d1a2a",
  border: `1px solid ${color}44`,
  borderRadius: 4,
  color,
  padding: "5px 8px",
  fontFamily: "Courier New",
  fontSize: 12,
  marginBottom: 8,
  outline: "none",
  boxSizing: "border-box",
});

export default function DestinationTab({ selected, onSimulate }) {
  const [destLat, setDestLat] = useState("");
  const [destLon, setDestLon] = useState("");
  const [destAlt, setDestAlt] = useState("10");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!selected) return alert("Chọn object trước!");
    if (!destLat || !destLon) return alert("Nhập tọa độ điểm đến!");

    setLoading(true);
    try {
      const path = await fetchRoadPath(
        parseFloat(selected.lat),
        parseFloat(selected.lon),
        parseFloat(destLat),
        parseFloat(destLon),
        destAlt,
      );
      onSimulate({ id: selected.id, path });
    } catch (e) {
      alert(e.message || "Lỗi khi tìm đường!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          fontSize: 9,
          color: "#ffffff44",
          marginBottom: 10,
          letterSpacing: 0.5,
          lineHeight: 1.6,
        }}
      >
        Xuất phát từ vị trí hiện tại của object → tìm đường bộ đến điểm đến
        (OSRM)
      </div>

      {/* Điểm xuất phát — readonly */}
      <div style={lbl}>XUẤT PHÁT (từ object)</div>
      <div
        style={{
          ...inputStyle("#ffffff33"),
          color: "#ffffff44",
          marginBottom: 8,
          fontSize: 11,
        }}
      >
        {selected
          ? `${parseFloat(selected.lat).toFixed(5)}, ${parseFloat(selected.lon).toFixed(5)}`
          : "— chưa chọn object —"}
      </div>

      {/* Điểm đến */}
      <div style={lbl}>ĐIỂM ĐẾN — Latitude</div>
      <input
        type="number"
        value={destLat}
        step={0.001}
        onChange={(e) => setDestLat(e.target.value)}
        placeholder="Nhập vĩ độ"
        style={inputStyle("#ffcc00")}
      />

      <div style={lbl}>ĐIỂM ĐẾN — Longitude</div>
      <input
        type="number"
        value={destLon}
        step={0.001}
        onChange={(e) => setDestLon(e.target.value)}
        placeholder="Nhập kinh độ"
        style={inputStyle("#ffcc00")}
      />

      <div style={lbl}>ĐỘ CAO (m)</div>
      <input
        type="number"
        value={destAlt}
        step={1}
        onChange={(e) => setDestAlt(e.target.value)}
        placeholder="Độ cao mặt đất (m)"
        style={inputStyle("#ffcc00")}
      />

      <button
        style={{
          ...btn("#00ff88"),
          opacity: !selected || loading ? 0.4 : 1,
          cursor: !selected || loading ? "not-allowed" : "pointer",
        }}
        onClick={handleStart}
      >
        {loading
          ? "⏳ ĐANG TÌM ĐƯỜNG..."
          : `▶ START${selected ? ` · ${selected.name}` : ""}`}
      </button>
    </>
  );
}
