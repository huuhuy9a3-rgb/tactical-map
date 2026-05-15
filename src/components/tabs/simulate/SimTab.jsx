import { useState, useRef, useEffect } from "react";
import GpsTab, { pauseAll, simStateMap } from "./GpsTab";
import DestinationTab from "./DestinationTab";

const ITEM_HEIGHT = 39;
const MAX_VISIBLE = 5;

// State mặc định cho mỗi object
const defaultDestState = () => ({
  destLat: "",
  destLon: "",
  destAlt: "10",
  phase: "idle",
  stepIndex: 0,
  totalSteps: 0,
});

export default function SimTab({
  onSimulate,
  onMoveObject,
  onRotateObject,
  onDrawPath,
  onClearPath,
  objects,
  selectedId,
  setSelectedId,
  camLat,
  camLon,
  pauseRef,
}) {
  const [activeSection, setActiveSection] = useState("gps");
  const selected = objects?.find((o) => o.id === selectedId);

  // ── State map theo objectId ──────────────────────────────
  const [destStateMap, setDestStateMap] = useState({});

  // Ref map theo objectId
  const destIntervalRefs = useRef({});
  const destIndexRefs = useRef({});
  const destPathRefs = useRef({});

  // Lấy state của object hiện tại (hoặc default)
  const currentState =
    selectedId && destStateMap[selectedId]
      ? destStateMap[selectedId]
      : defaultDestState();

  // Setter cho từng field của object hiện tại
  const patchState = (patch) => {
    if (!selectedId) return;
    setDestStateMap((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] ?? defaultDestState()),
        ...patch,
      },
    }));
  };

  // Getter ref theo objectId (tự tạo nếu chưa có)
  const getIntervalRef = (id) => {
    if (!destIntervalRefs.current[id])
      destIntervalRefs.current[id] = { current: null };
    return destIntervalRefs.current[id];
  };
  const getIndexRef = (id) => {
    if (!destIndexRefs.current[id]) destIndexRefs.current[id] = { current: 0 };
    return destIndexRefs.current[id];
  };
  const getPathRef = (id) => {
    if (!destPathRefs.current[id]) destPathRefs.current[id] = { current: [] };
    return destPathRefs.current[id];
  };

  // ── Pause tất cả ────────────────────────────────────────
  const pauseEverything = () => {
    // Pause tất cả destination interval đang chạy
    Object.keys(destIntervalRefs.current).forEach((id) => {
      const ref = destIntervalRefs.current[id];
      if (ref?.current) {
        clearInterval(ref.current);
        ref.current = null;
        setDestStateMap((prev) => {
          if (prev[id]?.phase === "running") {
            return { ...prev, [id]: { ...prev[id], phase: "paused" } };
          }
          return prev;
        });
      }
    });
    pauseAll();
  };

  // ── Expose ra ngoài qua pauseRef ────────────────────────
  useEffect(() => {
    if (pauseRef) pauseRef.current = pauseEverything;
  });

  // ── Chuyển section ───────────────────────────────────────
  const handleSetSection = (s) => {
    pauseEverything();
    setActiveSection(s);
  };

  const stopGpsForObject = (id) => {
    pauseAll(); // dừng interval GPS
    onClearPath?.(id); // xóa path trên bản đồ

    // ← Đưa object về vị trí ban đầu trước khi xóa origin
    const gpsState = simStateMap[id];
    if (gpsState?.origin) {
      onMoveObject?.({ id, ...gpsState.origin });
      onRotateObject?.({ id, heading: 0, pitch: 0, roll: 0 });
    }

    // Reset simStateMap về idle
    if (simStateMap[id]) {
      simStateMap[id].status = "idle";
      simStateMap[id].stepIndex = 0;
      simStateMap[id].path = [];
      simStateMap[id].origin = null;
    }
  };

  const stopDestForObject = (id) => {
    const ref = getIntervalRef(id);
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }

    // ← Đưa object về điểm đầu path Destination
    const p = getPathRef(id).current;
    if (p?.length > 0) {
      onMoveObject?.({ id, ...p[0] });
      onRotateObject?.({ id, heading: p[0].heading ?? 0, pitch: 0, roll: 0 });
    }

    getPathRef(id).current = [];
    getIndexRef(id).current = 0;
    onClearPath?.(id);

    setDestStateMap((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? defaultDestState()),
        phase: "idle",
        stepIndex: 0,
        totalSteps: 0,
      },
    }));
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

      {/* GPS */}
      <div style={{ display: activeSection === "gps" ? "block" : "none" }}>
        <GpsTab
          selected={selected}
          onMoveObject={onMoveObject}
          onRotateObject={onRotateObject}
          onDrawPath={onDrawPath}
          onClearPath={onClearPath}
          stopDest={stopDestForObject}
        />
      </div>

      {/* DESTINATION — render theo selectedId để reset đúng ref */}
      <div
        style={{ display: activeSection === "destination" ? "block" : "none" }}
      >
        {selectedId ? (
          <DestinationTab
            key={selectedId}
            selected={selected}
            onMoveObject={onMoveObject}
            onRotateObject={onRotateObject}
            onDrawPath={onDrawPath}
            onClearPath={onClearPath}
            camLat={camLat}
            camLon={camLon}
            // per-object state
            destLat={currentState.destLat}
            setDestLat={(v) => patchState({ destLat: v })}
            destLon={currentState.destLon}
            setDestLon={(v) => patchState({ destLon: v })}
            destAlt={currentState.destAlt}
            setDestAlt={(v) => patchState({ destAlt: v })}
            phase={currentState.phase}
            setPhase={(v) => patchState({ phase: v })}
            stepIndex={currentState.stepIndex}
            setStepIndex={(v) => patchState({ stepIndex: v })}
            totalSteps={currentState.totalSteps}
            setTotalSteps={(v) => patchState({ totalSteps: v })}
            intervalRef={getIntervalRef(selectedId)}
            indexRef={getIndexRef(selectedId)}
            pathRef={getPathRef(selectedId)}
            stopGps={stopGpsForObject}
          />
        ) : (
          <div
            style={{
              fontSize: 10,
              color: "#ffffff33",
              textAlign: "center",
              padding: "16px 0",
              border: "1px solid #ffffff11",
              borderRadius: 4,
            }}
          >
            Chọn object để bắt đầu
          </div>
        )}
      </div>
    </>
  );
}
