import { useState } from "react";

// ── Haversine distance (meters) ─────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Simplify path ────────────────────────────────────────
function simplifyPath(points, minDistanceMeters = 50) {
  if (points.length === 0) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    if (
      haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon) >=
      minDistanceMeters
    ) {
      result.push(curr);
    }
  }
  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) result.push(last);
  return result;
}

// ── Heading giữa 2 điểm ─────────────────────────────────
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

// ── OSRM fetch ───────────────────────────────────────────
async function fetchRoadPath(startLat, startLon, endLat, endLon, alt = 10) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLon},${startLat};${endLon},${endLat}` +
    `?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length)
    throw new Error("Không tìm được đường!");
  const coords = data.routes[0].geometry.coordinates;
  const raw = coords.map(([lon, lat], i, arr) => {
    const next = arr[i + 1];
    const heading = next
      ? calcHeading(lat, lon, next[1], next[0])
      : i > 0
        ? calcHeading(arr[i - 1][1], arr[i - 1][0], lat, lon)
        : 0;
    return { lat, lon, alt: parseFloat(alt), heading };
  });
  return simplifyPath(raw, 50);
}

// ── Styles ───────────────────────────────────────────────
const lbl = { fontSize: 10, color: "#ffffff66", marginBottom: 2 };

const inputStyle = (color = "#00ffcc", disabled = false) => ({
  width: "100%",
  background: disabled ? "#0a1520" : "#0d1a2a",
  border: `1px solid ${color}44`,
  borderRadius: 4,
  color: disabled ? "#ffffff33" : color,
  padding: "5px 8px",
  fontFamily: "Courier New",
  fontSize: 12,
  marginBottom: 8,
  outline: "none",
  boxSizing: "border-box",
});

const btnBase = {
  fontFamily: "Courier New",
  fontSize: 10,
  letterSpacing: 1,
  borderRadius: 4,
  padding: "7px 0",
  textAlign: "center",
  border: "1px solid",
  transition: "all 0.2s",
  width: "100%",
};

const mkBtn = (color, disabled = false) => ({
  ...btnBase,
  color: disabled ? "#ffffff22" : color,
  borderColor: disabled ? "#ffffff11" : `${color}88`,
  background: disabled ? "transparent" : `${color}15`,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
});

// ── Component ────────────────────────────────────────────
export default function DestinationTab({
  selected,
  onMoveObject,
  onRotateObject,
  onDrawPath,
  onClearPath,
  camLat,
  camLon,
  // ── lifted state từ SimTab ──
  destLat,
  setDestLat,
  destLon,
  setDestLon,
  destAlt,
  setDestAlt,
  phase,
  setPhase,
  stepIndex,
  setStepIndex,
  totalSteps,
  setTotalSteps,
  intervalRef,
  indexRef,
  pathRef,
  stopGps,
}) {
  const [loading, setLoading] = useState(false);

  const isIdle = phase === "idle";
  const atStart = stepIndex === 0;
  const atEnd = stepIndex >= totalSteps - 1;
  const displayStep = Math.min(stepIndex + 1, totalSteps);

  // ── Dùng vị trí camera ──────────────────────────────────
  const handleUseCameraPos = () => {
    if (camLat) setDestLat(camLat);
    if (camLon) setDestLon(camLon);
  };

  // ── Tính đường ───────────────────────────────────────────
  const handleCalc = async () => {
    if (!selected) return alert("Chọn object trước!");
    if (!destLat || !destLon) return alert("Nhập tọa độ điểm đến!");
    stopGps?.(selected.id);
    setLoading(true);
    try {
      const p = await fetchRoadPath(
        parseFloat(selected.lat),
        parseFloat(selected.lon),
        parseFloat(destLat),
        parseFloat(destLon),
        destAlt,
      );
      pathRef.current = p;
      indexRef.current = 0;
      setStepIndex(0);
      setTotalSteps(p.length);
      onDrawPath?.(p, selected.id);
      onMoveObject?.({ id: selected.id, ...p[0] });
      onRotateObject?.({
        id: selected.id,
        heading: p[0].heading,
        pitch: 0,
        roll: 0,
      });
      setPhase("ready");
    } catch (e) {
      alert(e.message || "Lỗi khi tìm đường!");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto run ─────────────────────────────────────────────
  const startAutoRun = (fromIndex) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    indexRef.current = fromIndex;
    setPhase("running");

    intervalRef.current = setInterval(() => {
      const i = indexRef.current;
      const p = pathRef.current;
      if (i >= p.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPhase("paused");
        return;
      }
      const pt = p[i];
      onMoveObject?.({ id: selected.id, ...pt });
      onRotateObject?.({
        id: selected.id,
        heading: pt.heading,
        pitch: 0,
        roll: 0,
      });
      indexRef.current = i + 1;
      setStepIndex(i + 1);
    }, 800);
  };

  const handleStart = () => startAutoRun(indexRef.current);

  const handlePause = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("paused");
  };

  const handleResume = () => startAutoRun(indexRef.current);

  const handleRerun = () => {
    clearInterval(intervalRef.current);
    const p = pathRef.current;
    onMoveObject?.({ id: selected.id, ...p[0] });
    onRotateObject?.({
      id: selected.id,
      heading: p[0].heading,
      pitch: 0,
      roll: 0,
    });
    startAutoRun(0);
  };

  // ── Jump (prev/next) ─────────────────────────────────────
  const jumpTo = (i) => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("paused");
    const p = pathRef.current;
    const clamped = Math.max(0, Math.min(i, p.length - 1));
    indexRef.current = clamped;
    setStepIndex(clamped);
    const pt = p[clamped];
    onMoveObject?.({ id: selected.id, ...pt });
    onRotateObject?.({
      id: selected.id,
      heading: pt.heading,
      pitch: 0,
      roll: 0,
    });
  };

  // ── Reset ────────────────────────────────────────────────
  const handleReset = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const p = pathRef.current;
    indexRef.current = 0;
    setStepIndex(0);
    if (p.length > 0) {
      onMoveObject?.({ id: selected.id, ...p[0] });
      onRotateObject?.({
        id: selected.id,
        heading: p[0].heading,
        pitch: 0,
        roll: 0,
      });
    }
    setPhase("ready");
  };

  // ── Stop sim ─────────────────────────────────────────────
  const handleStop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    onClearPath?.(selected?.id);
    pathRef.current = [];
    indexRef.current = 0;
    setStepIndex(0);
    setTotalSteps(0);
    setPhase("idle");
  };

  return (
    <>
      <div
        style={{
          fontSize: 9,
          color: "#ffffff33",
          marginBottom: 10,
          lineHeight: 1.6,
        }}
      >
        Tìm đường bộ từ object → điểm đến (OSRM)
      </div>

      {/* XUẤT PHÁT */}
      <div style={lbl}>XUẤT PHÁT (từ object)</div>
      <div
        style={{
          ...inputStyle("#ffffff33", true),
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        {selected
          ? `${parseFloat(selected.lat).toFixed(5)}, ${parseFloat(selected.lon).toFixed(5)}`
          : "— chưa chọn object —"}
      </div>

      {/* ĐIỂM ĐẾN */}
      <div style={lbl}>ĐIỂM ĐẾN</div>
      <button
        onClick={handleUseCameraPos}
        disabled={!isIdle}
        style={{
          ...mkBtn("#00ffcc", !isIdle),
          marginBottom: 8,
          padding: "5px 0",
        }}
      >
        ⊕ Sử dụng vị trí hiện tại
      </button>

      <div style={lbl}>Latitude</div>
      <input
        type="number"
        value={destLat}
        step={0.001}
        disabled={!isIdle}
        onChange={(e) => setDestLat(e.target.value)}
        placeholder="Nhập vĩ độ"
        style={inputStyle(!isIdle ? "#ffffff33" : "#ffcc00", !isIdle)}
      />

      <div style={lbl}>Longitude</div>
      <input
        type="number"
        value={destLon}
        step={0.001}
        disabled={!isIdle}
        onChange={(e) => setDestLon(e.target.value)}
        placeholder="Nhập kinh độ"
        style={inputStyle(!isIdle ? "#ffffff33" : "#ffcc00", !isIdle)}
      />

      <div style={lbl}>ĐỘ CAO (m)</div>
      <input
        type="number"
        value={destAlt}
        step={1}
        disabled={!isIdle}
        onChange={(e) => setDestAlt(e.target.value)}
        style={inputStyle(!isIdle ? "#ffffff33" : "#ffcc00", !isIdle)}
      />

      {/* ── IDLE ── */}
      {isIdle && (
        <button
          style={mkBtn("#00ff88", !selected || loading)}
          onClick={handleCalc}
          disabled={!selected || loading}
        >
          {loading ? "⏳ ĐANG TÍNH ĐƯỜNG..." : "⬡ TÍNH TOÁN QUÃNG ĐƯỜNG"}
        </button>
      )}

      {/* ── READY / RUNNING / PAUSED ── */}
      {!isIdle && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Step indicator */}
          <div
            style={{
              fontSize: 10,
              color: "#ffffff55",
              textAlign: "center",
              letterSpacing: 1,
              padding: "4px 0",
              borderTop: "1px solid #ffffff11",
            }}
          >
            STEP {displayStep} / {totalSteps}
          </div>

          {/* Row 1: Primary action */}
          <div style={{ display: "flex", gap: 6 }}>
            {phase === "ready" && (
              <button style={mkBtn("#00ff88")} onClick={handleStart}>
                ▶ START
              </button>
            )}
            {phase === "running" && (
              <button style={mkBtn("#ffcc00")} onClick={handlePause}>
                ⏸ PAUSE
              </button>
            )}
            {phase === "paused" && !atEnd && (
              <button style={mkBtn("#00ffcc")} onClick={handleResume}>
                ▶ RESUME
              </button>
            )}
            {phase === "paused" && atEnd && (
              <button style={mkBtn("#00ffcc")} onClick={handleRerun}>
                ↺ RERUN
              </button>
            )}
          </div>

          {/* Row 2: PREV + NEXT */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={mkBtn("#00ccff", atStart)}
              onClick={() => jumpTo(indexRef.current - 1)}
              disabled={atStart}
            >
              ◀ PREV
            </button>
            <button
              style={mkBtn("#00ccff", atEnd)}
              onClick={() => jumpTo(indexRef.current + 1)}
              disabled={atEnd}
            >
              NEXT ▶
            </button>
          </div>

          {/* Row 3: RESET + STOP */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            <button style={mkBtn("#ffaa00")} onClick={handleReset}>
              ↺ RESET
            </button>
            <button style={mkBtn("#ff4444")} onClick={handleStop}>
              ■ STOP SIM
            </button>
          </div>
        </div>
      )}
    </>
  );
}
