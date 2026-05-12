import { useState, useRef, useEffect } from "react";
import CameraTab from "./components/tabs/camera/CameraTab";
import ObjectTab from "./components/tabs/object/ObjectTab";
import SimTab from "./components/tabs/simulate/SimTab";
import { pauseAll, simStateMap } from "./components/tabs/simulate/Gpstab ";

const TABS = ["CAMERA", "OBJECT", "SIM"];

export default function ControlPanel({
  onFly,
  onAddObject,
  onRemoveObject,
  onMoveObject,
  onTrackObject,
  onRotateObject,
  onSimulate,
  onDrawPath,
  onHighlight,
  pickedPos,
  onRenameObject,
  onChangeModel,
  onClearPath,
}) {
  const [tab, setTab] = useState("CAMERA");

  const [camLat, setCamLat] = useState("20.990979");
  const [camLon, setCamLon] = useState("105.798641");
  const [camAlt, setCamAlt] = useState("295");
  const [camHeading, setCamHeading] = useState("52.5");
  const [camPitch, setCamPitch] = useState("-32.2");

  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const counterRef = useRef(1);

  // Trong ControlPanel, theo dõi tab thay đổi
  const handleSetTab = (t) => {
    if (t !== "SIM") pauseAll();
    setTab(t);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 999,
        background: "rgba(10,20,30,0.88)",
        border: "1px solid #00ff8844",
        borderRadius: 8,
        width: 230,
        color: "#00ff88",
        fontFamily: "Courier New",
      }}
    >
      <div
        style={{
          padding: "10px 14px 0",
          fontSize: 11,
          letterSpacing: 2,
          color: "#00ffcc",
        }}
      >
        TACTICAL CONTROL
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #00ff8822",
          marginTop: 8,
        }}
      >
        {TABS.map((t) => (
          <div
            key={t}
            onClick={() => handleSetTab(t)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 0",
              fontSize: 9,
              letterSpacing: 1,
              cursor: "pointer",
              color: tab === t ? "#00ffcc" : "#ffffff44",
              borderBottom:
                tab === t ? "2px solid #00ffcc" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ padding: 14 }}>
        {/* CAMERA */}
        <div style={{ display: tab === "CAMERA" ? "block" : "none" }}>
          <CameraTab
            onFly={onFly}
            camLat={camLat}
            setCamLat={setCamLat}
            camLon={camLon}
            setCamLon={setCamLon}
            camAlt={camAlt}
            setCamAlt={setCamAlt}
            camHeading={camHeading}
            setCamHeading={setCamHeading}
            camPitch={camPitch}
            setCamPitch={setCamPitch}
            onHighlight={onHighlight}
            pickedPos={pickedPos}
          />
        </div>

        {/* OBJECT */}
        <div style={{ display: tab === "OBJECT" ? "block" : "none" }}>
          <ObjectTab
            onAddObject={onAddObject}
            onRemoveObject={onRemoveObject}
            onMoveObject={onMoveObject}
            onTrackObject={onTrackObject}
            onRotateObject={onRotateObject}
            onRenameObject={onRenameObject}
            onChangeModel={onChangeModel}
            camLat={camLat}
            camLon={camLon}
            camAlt={camAlt}
            objects={objects}
            setObjects={setObjects}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            counterRef={counterRef}
          />
        </div>

        {/* SIM */}
        <div style={{ display: tab === "SIM" ? "block" : "none" }}>
          <SimTab
            onSimulate={onSimulate}
            onMoveObject={onMoveObject}
            onRotateObject={onRotateObject}
            onDrawPath={onDrawPath}
            onClearPath={onClearPath}
            objects={objects}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}
