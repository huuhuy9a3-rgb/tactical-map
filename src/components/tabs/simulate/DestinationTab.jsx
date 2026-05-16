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

// ── OSRM fetch (road) ────────────────────────────────────
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

// ── Aerial path (straight line, interpolated) ────────────
// Nội suy N bước từ điểm A → B theo đường thẳng trên không.
// Altitude có thể climb lên đỉnh rồi descend (arc) hoặc giữ flat.
function buildAerialPath(
  startLat,
  startLon,
  startAlt,
  endLat,
  endLon,
  endAlt,
  steps = 20,
  arcHeight = 0, // độ cao cộng thêm ở điểm giữa (arc)
) {
  const heading = calcHeading(startLat, startLon, endLat, endLon);
  const path = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = startLat + (endLat - startLat) * t;
    const lon = startLon + (endLon - startLon) * t;

    // Alt: linear blend + optional parabolic arc
    const baseAlt = startAlt + (endAlt - startAlt) * t;
    const arc = arcHeight * 4 * t * (1 - t); // đỉnh ở t=0.5
    const alt = baseAlt + arc;

    path.push({ lat, lon, alt, heading });
  }

  return path;
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

  // ── Chế độ bay ──────────────────────────────────────────
  const [flightMode, setFlightMode] = useState("road"); // "road" | "aerial"
  const [aerialSteps, setAerialSteps] = useState("30");
  const [arcHeight, setArcHeight] = useState("0");

  // ── Bước nhảy mỗi lần PREV / NEXT ───────────────────────
  const [jumpSize, setJumpSize] = useState("1");

  const isIdle = phase === "idle";
  const atStart = stepIndex === 0;
  const atEnd = stepIndex >= totalSteps - 1;
  const displayStep = Math.min(stepIndex + 1, totalSteps);
  const showJumpSize = totalSteps >= 20;

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
      let p;

      if (flightMode === "aerial") {
        // Đường thẳng trên không — không cần API
        p = buildAerialPath(
          parseFloat(selected.lat),
          parseFloat(selected.lon),
          parseFloat(selected.alt) || 100,
          parseFloat(destLat),
          parseFloat(destLon),
          parseFloat(destAlt) || 100,
          Math.max(2, parseInt(aerialSteps) || 30),
          parseFloat(arcHeight) || 0,
        );
      } else {
        // Đường bộ qua OSRM
        p = await fetchRoadPath(
          parseFloat(selected.lat),
          parseFloat(selected.lon),
          parseFloat(destLat),
          parseFloat(destLon),
          destAlt,
        );
      }

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
      alert(e.message || "Lỗi khi tính đường!");
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

  const getJumpSize = () => Math.max(1, parseInt(jumpSize) || 1);

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
    setJumpSize("1");
    setStepIndex(0);
    setTotalSteps(0);
    setPhase("idle");
  };

  return (
    <>
      {/* ── Flight mode toggle ─────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ ...lbl, marginBottom: 6 }}>CHẾ ĐỘ DI CHUYỂN</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "road", label: "🚗 ROAD", color: "#00ff88" },
            { key: "aerial", label: "✈ AERIAL", color: "#00ccff" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              disabled={!isIdle}
              onClick={() => isIdle && setFlightMode(key)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 4,
                fontFamily: "Courier New",
                fontSize: 10,
                letterSpacing: 1,
                cursor: isIdle ? "pointer" : "not-allowed",
                border: `1px solid ${flightMode === key ? color : color + "33"}`,
                color: flightMode === key ? color : color + "55",
                background: flightMode === key ? `${color}18` : "transparent",
                transition: "all 0.2s",
                opacity: !isIdle ? 0.5 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mô tả mode */}
        <div
          style={{
            fontSize: 9,
            color: "#ffffff33",
            marginTop: 5,
            lineHeight: 1.6,
          }}
        >
          {flightMode === "road"
            ? "Tìm đường bộ thực tế qua OSRM"
            : "Bay thẳng trên không theo đường nội suy"}
        </div>
      </div>

      {/* ── Aerial-only params ─────────────────────────────── */}
      {flightMode === "aerial" && isIdle && (
        <div
          style={{
            background: "#00ccff08",
            border: "1px solid #00ccff22",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 10,
          }}
        >
          <div style={{ ...lbl, color: "#00ccffaa", marginBottom: 6 }}>
            CẤU HÌNH AERIAL
          </div>

          <div style={lbl}>Số bước nội suy</div>
          <input
            type="number"
            value={aerialSteps}
            min={2}
            max={500}
            step={1}
            onChange={(e) => setAerialSteps(e.target.value)}
            style={{ ...inputStyle("#00ccff"), marginBottom: 8 }}
          />

          <div style={lbl}>Arc height (m) — độ cao đỉnh cung</div>
          <input
            type="number"
            value={arcHeight}
            min={0}
            step={10}
            onChange={(e) => setArcHeight(e.target.value)}
            style={{ ...inputStyle("#00ccff"), marginBottom: 0 }}
          />
          <div style={{ fontSize: 9, color: "#ffffff22", marginTop: 3 }}>
            0 = bay phẳng · &gt;0 = bay vòng cung lên cao rồi xuống
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid #ffffff0d", marginBottom: 10 }} />

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

      <div style={lbl}>ĐỘ CAO ĐIỂM ĐẾN (m)</div>
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
          style={mkBtn(
            flightMode === "aerial" ? "#00ccff" : "#00ff88",
            !selected || loading,
          )}
          onClick={handleCalc}
          disabled={!selected || loading}
        >
          {loading
            ? "⏳ ĐANG TÍNH..."
            : flightMode === "aerial"
              ? "✈ TÍNH ĐƯỜNG BAY"
              : "⬡ TÍNH TOÁN QUÃNG ĐƯỜNG"}
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

          {/* Jump size — chỉ hiện khi tổng step >= 20 */}
          {showJumpSize && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff06",
                border: "1px solid #ffffff11",
                borderRadius: 4,
                padding: "5px 8px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#ffffff44",
                  whiteSpace: "nowrap",
                  letterSpacing: 1,
                }}
              >
                BƯỚC NHẢY
              </div>
              <input
                type="number"
                value={jumpSize}
                min={1}
                max={totalSteps}
                step={1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 1) setJumpSize(String(v));
                  else if (e.target.value === "") setJumpSize("1");
                }}
                style={{
                  flex: 1,
                  background: "#0d1a2a",
                  border: "1px solid #00ccff44",
                  borderRadius: 3,
                  color: "#00ccff",
                  padding: "3px 6px",
                  fontFamily: "Courier New",
                  fontSize: 11,
                  outline: "none",
                  textAlign: "center",
                  minWidth: 0,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: "#ffffff33",
                  whiteSpace: "nowrap",
                }}
              >
                / {totalSteps}
              </div>
            </div>
          )}

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
              onClick={() => jumpTo(indexRef.current - getJumpSize())}
              disabled={atStart}
            >
              ◀ PREV
            </button>
            <button
              style={mkBtn("#00ccff", atEnd)}
              onClick={() => jumpTo(indexRef.current + getJumpSize())}
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
