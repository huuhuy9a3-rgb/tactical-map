import { useState, useRef, useEffect } from "react";

const DEFAULT_PATH = JSON.stringify(
  [
    { lat: 20.99352, lon: 105.80232, alt: 150, heading: 45 },
    { lat: 20.995, lon: 105.804, alt: 200, heading: 60 },
    { lat: 20.997, lon: 105.806, alt: 250, heading: 90 },
    { lat: 20.999, lon: 105.808, alt: 200, heading: 120 },
    { lat: 21.001, lon: 105.81, alt: 150, heading: 90 },
  ],
  null,
  2,
);

const LAT_LON_THRESHOLD = 0.0001;
const ALT_THRESHOLD = 10;

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

function buildFinalPath(selected, rawPath) {
  const objLat = parseFloat(selected.lat);
  const objLon = parseFloat(selected.lon);
  const objAlt = parseFloat(selected.alt);
  const first = rawPath[0];
  const isSame =
    Math.abs(objLat - parseFloat(first.lat)) < LAT_LON_THRESHOLD &&
    Math.abs(objLon - parseFloat(first.lon)) < LAT_LON_THRESHOLD &&
    Math.abs(objAlt - parseFloat(first.alt)) < ALT_THRESHOLD;
  if (isSame) return rawPath;
  const heading = calcHeading(
    objLat,
    objLon,
    parseFloat(first.lat),
    parseFloat(first.lon),
  );
  return [{ lat: objLat, lon: objLon, alt: objAlt, heading }, ...rawPath];
}

const lbl = { fontSize: 10, color: "#ffffff66", marginBottom: 2 };

const mkBtn = (color, disabled = false) => ({
  flex: 1,
  padding: "7px 0",
  borderRadius: 4,
  fontFamily: "Courier New",
  fontSize: 11,
  letterSpacing: 1,
  transition: "opacity 0.2s",
  background: disabled ? "transparent" : `${color}11`,
  border: `1px solid ${disabled ? color + "33" : color}`,
  color: disabled ? color + "55" : color,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

export const simStateMap = {};
export const intervalMap = {};

export function pauseAll() {
  Object.keys(intervalMap).forEach((k) => {
    if (intervalMap[k]) {
      clearInterval(intervalMap[k]);
      intervalMap[k] = null;
    }
    if (simStateMap[k]?.status === "playing") {
      simStateMap[k].status = "paused";
    }
  });
}

function getState(id) {
  if (!simStateMap[id]) {
    simStateMap[id] = {
      status: "idle",
      stepIndex: 0,
      path: [],
      simPath: DEFAULT_PATH,
      origin: null,
      pathEntityId: null,
    };
  }
  return simStateMap[id];
}

export default function GpsTab({
  selected,
  onMoveObject,
  onRotateObject,
  onDrawPath,
  onClearPath,
  stopDest,
}) {
  const id = selected?.id;
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const intervalRef = useRef(null);
  const indexRef = useRef(0);
  const state = id ? getState(id) : null;

  useEffect(() => {
    // Pause tất cả object khác đang chạy
    Object.keys(intervalMap).forEach((k) => {
      if (k !== id && intervalMap[k]) {
        clearInterval(intervalMap[k]);
        intervalMap[k] = null;
        if (simStateMap[k]?.status === "playing") {
          simStateMap[k].status = "paused";
        }
      }
    });

    // Clear interval hiện tại
    if (intervalMap[id]) {
      clearInterval(intervalMap[id]);
      intervalMap[id] = null;
    }

    // Restore state object mới
    if (state) {
      indexRef.current = state.stepIndex;
      if (state.status === "playing") startPlaying(state.path);
    }

    rerender();
  }, [id]);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  // Khi switch object → pause
  useEffect(() => {
    if (!id) return;
    const prev = Object.keys(simStateMap).find(
      (k) => k !== id && simStateMap[k]?.status === "playing",
    );
    if (prev) {
      // pause object cũ
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      simStateMap[prev].status = "paused";
    }

    // Restore state của object mới
    indexRef.current = state?.stepIndex ?? 0;
    rerender();
  }, [id]);

  const saveState = (patch) => {
    if (!id) return;
    Object.assign(simStateMap[id], patch);
    rerender();
  };

  const applyStep = (path, i) => {
    if (!selected || i >= path.length) return;
    const { lat, lon, alt, heading, pitch } = path[i];
    onMoveObject({ id: selected.id, lat, lon, alt });
    onRotateObject({
      id: selected.id,
      heading: heading ?? 0,
      pitch: pitch ?? 0,
      roll: 0,
    });
  };

  const startPlaying = (path) => {
    if (intervalMap[id]) clearInterval(intervalMap[id]);
    intervalMap[id] = setInterval(() => {
      const i = indexRef.current;
      if (i >= path.length) {
        clearInterval(intervalMap[id]);
        intervalMap[id] = null;
        saveState({ status: "done" });
        return;
      }
      applyStep(path, i);
      indexRef.current = i + 1;
      saveState({ stepIndex: i + 1 });
    }, 1000);
    saveState({ status: "playing" });
  };

  const handleStartSim = () => {
    if (!selected) return alert("Chọn object trước!");
    stopDest?.(selected.id);
    let rawPath;
    try {
      rawPath = JSON.parse(state.simPath);
    } catch {
      return alert("JSON không hợp lệ!");
    }
    if (!Array.isArray(rawPath) || !rawPath.length)
      return alert("Path phải là array có ít nhất 1 điểm!");

    const finalPath = buildFinalPath(selected, rawPath);
    const origin = { lat: selected.lat, lon: selected.lon, alt: selected.alt };

    // Chỉ vẽ đường, chưa chạy
    onDrawPath(finalPath, selected.id);
    indexRef.current = 0;
    saveState({ path: finalPath, origin, stepIndex: 0, status: "ready" });
  };
  const handlePlay = () => startPlaying(state.path);

  const handlePause = () => {
    clearInterval(intervalMap[id]);
    intervalMap[id] = null;
    saveState({ status: "paused" });
  };

  const handleResume = () => startPlaying(state.path);
  const handleRerun = () => {
    indexRef.current = 0;
    saveState({ stepIndex: 0 });
    startPlaying(state.path);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (state.origin && selected) {
      onMoveObject({ id: selected.id, ...state.origin });
      onRotateObject({ id: selected.id, heading: 0, pitch: 0, roll: 0 });
    }
    onClearPath?.(selected.id);
    indexRef.current = 0;
    saveState({ status: "idle", stepIndex: 0, path: [], origin: null });
  };

  const handlePrev = () => {
    if (!isActive) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const prev = Math.max(0, indexRef.current - 2);
    indexRef.current = prev + 1;
    applyStep(state.path, prev);
    saveState({
      status: status === "ready" ? "ready" : "paused",
      stepIndex: prev + 1,
    });
  };

  const handleNext = () => {
    if (!isActive) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const cur = indexRef.current;
    if (cur >= state.path.length) return;
    applyStep(state.path, cur);
    const next = cur + 1;
    indexRef.current = next;
    saveState({
      status:
        next >= state.path.length
          ? "done"
          : status === "ready"
            ? "ready"
            : "paused",
      stepIndex: next,
    });
  };

  if (!state) return null;

  const { status, stepIndex, path, simPath } = state;
  const total = path.length;
  const displayedStep = Math.max(0, stepIndex - 1);
  const isFirst = displayedStep <= 0;
  const isLast = stepIndex >= total;
  const isActive =
    status === "ready" ||
    status === "playing" ||
    status === "paused" ||
    status === "done";

  const isValidJson = (() => {
    try {
      JSON.parse(state.simPath);
      return true;
    } catch {
      return false;
    }
  })();

  // Hàm clean JSON — xóa các field null/undefined/empty
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(state.simPath);
      const cleaned = parsed.map((point) =>
        Object.fromEntries(
          Object.entries(point).filter(
            ([_, v]) => v !== null && v !== undefined && v !== "",
          ),
        ),
      );
      saveState({ simPath: JSON.stringify(cleaned, null, 2) });
    } catch {
      alert("JSON không hợp lệ!");
    }
  };

  const canFormat = state.simPath.trim() && isValidJson;

  return (
    <>
      {/* GPS PATH textarea */}
      <div style={lbl}>GPS PATH (JSON)</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={lbl}>GPS PATH (JSON)</div>
        <button
          onClick={handleFormat}
          disabled={!canFormat}
          style={{
            background: canFormat ? "#00ff8811" : "transparent",
            border: `1px solid ${canFormat ? "#00ff8866" : "#ffffff11"}`,
            color: canFormat ? "#00ff88" : "#ffffff22",
            borderRadius: 4,
            padding: "3px 10px",
            fontFamily: "Courier New",
            fontSize: 9,
            cursor: canFormat ? "pointer" : "not-allowed",
            letterSpacing: 1,
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (canFormat) e.currentTarget.style.background = "#00ff8822";
          }}
          onMouseLeave={(e) => {
            if (canFormat) e.currentTarget.style.background = "#00ff8811";
          }}
        >
          ✦ FORMAT
        </button>
      </div>
      <textarea
        placeholder="Nhập các tọa độ"
        value={simPath}
        onChange={(e) => {
          if (status === "idle") saveState({ simPath: e.target.value });
        }}
        rows={8}
        style={{
          width: "100%",
          background: "#0d1a2a",
          border: `1px solid ${status === "idle" ? "#ff444433" : "#ffffff11"}`,
          borderRadius: 4,
          color: status === "idle" ? "#ff8888" : "#ffffff33",
          padding: "4px 8px",
          fontFamily: "Courier New",
          fontSize: 10,
          resize: "vertical",
          marginBottom: 10,
          boxSizing: "border-box",
        }}
      />

      {/* Chưa start → nút START SIMULATOR */}
      {!isActive && (
        <button
          onClick={handleStartSim}
          style={{
            width: "100%",
            padding: "9px 0",
            marginBottom: 8,
            background: selected ? "#ff444411" : "transparent",
            border: `1px solid ${selected ? "#ff4444" : "#ff444433"}`,
            color: selected ? "#ff4444" : "#ff444455",
            borderRadius: 4,
            fontFamily: "Courier New",
            fontSize: 11,
            letterSpacing: 1,
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          ▶ START SIMULATOR {selected ? `· ${selected.name}` : ""}
        </button>
      )}

      {/* Đang active → 3 dòng controls */}
      {isActive && (
        <>
          {/* Step counter */}
          <div
            style={{
              fontSize: 9,
              color: "#ffffff44",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            {`STEP ${Math.min(displayedStep + 1, total)} / ${total}`}
          </div>

          {/* Dòng 1 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {status === "ready" && (
              <button style={mkBtn("#00ff88")} onClick={handlePlay}>
                ▶ START
              </button>
            )}
            {status === "playing" && (
              <button style={mkBtn("#ffaa00")} onClick={handlePause}>
                ⏸ PAUSE
              </button>
            )}
            {status === "paused" && (
              <button style={mkBtn("#00ff88")} onClick={handleResume}>
                ▶ RESUME
              </button>
            )}
            {status === "done" && (
              <button style={mkBtn("#00ffcc")} onClick={handleRerun}>
                ↺ RERUN
              </button>
            )}
          </div>

          {/* Dòng 2: PREV / NEXT — hiện cả khi ready */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              style={mkBtn("#00ccff", isFirst)}
              onClick={handlePrev}
              disabled={isFirst}
            >
              ◀ PREV
            </button>
            <button
              style={mkBtn("#00ccff", isLast)}
              onClick={handleNext}
              disabled={isLast}
            >
              NEXT ▶
            </button>
          </div>

          {/* Dòng 3: RESET / STOP SIMULATOR */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={mkBtn("#ffaa00")}
              onClick={() => {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                indexRef.current = 0;
                saveState({ status: "ready", stepIndex: 0 });
                // Đưa object về vị trí ban đầu
                if (state.origin && selected) {
                  onMoveObject({ id: selected.id, ...state.origin });
                  onRotateObject({
                    id: selected.id,
                    heading: 0,
                    pitch: 0,
                    roll: 0,
                  });
                }
              }}
            >
              ↺ RESET
            </button>
            <button style={mkBtn("#ff4444")} onClick={handleStop}>
              ■ STOP SIM
            </button>
          </div>
        </>
      )}
    </>
  );
}
