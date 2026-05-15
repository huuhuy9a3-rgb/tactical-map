import { useRef, useState } from "react";

export const DEFAULT_MODELS = [
  { label: "Arrow", uri: "/models/arrow.glb" },
  { label: "Jet Fighter", uri: "/models/jet_fighter.glb" },
  { label: "Duck", uri: "/models/duck.glb" },
  { label: "Cube", uri: "/models/cube.glb" },
  { label: "Sphere", uri: "/models/sphere.glb" },
  { label: "Cylinder", uri: "/models/cylinder.glb" },
  { label: "Cone", uri: "/models/cone.glb" },
  { label: "Torus", uri: "/models/torus.glb" },
  { label: "Pyramid", uri: "/models/pyramid.glb" },
  { label: "Octahedron", uri: "/models/octahedron.glb" },
  { label: "Capsule", uri: "/models/capsule.glb" },
  { label: "Diamond", uri: "/models/diamond.glb" },
];

export const MODELS = DEFAULT_MODELS;
export const DEFAULT_MODEL_URI = "/models/arrow.glb";

export default function ObjectModelSelect({
  value,
  onChange,
  color = "#00ffcc",
  models,
  onModelsChange,
}) {
  const fileRef = useRef();
  const [open, setOpen] = useState(false);

  const selected =
    models.find((m) => m.uri === value) ??
    models.find((m) => m.uri === DEFAULT_MODEL_URI);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    const baseName = file.name.replace(/\.glb$/i, "");
    const existingLabels = models.map((m) => m.label);
    let label = baseName;
    let n = 1;
    while (existingLabels.includes(label)) label = `${baseName} (${n++})`;
    onModelsChange((prev) => [{ label, uri, custom: true }, ...prev]);
    onChange(uri);
    setOpen(false);
    e.target.value = "";
  };

  const handleDelete = (e, uri) => {
    e.stopPropagation();
    onModelsChange((prev) => prev.filter((m) => m.uri !== uri));
    if (value === uri) onChange(DEFAULT_MODEL_URI);
    URL.revokeObjectURL(uri);
  };

  return (
    <div style={{ marginBottom: 10, position: "relative" }}>
      <div style={{ fontSize: 10, color: "#ffffff66", marginBottom: 4 }}>
        MODEL
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {/* Trigger */}
        <div
          onClick={() => setOpen((o) => !o)}
          style={{
            flex: 1,
            background: "#0d1a2a",
            border: `1px solid ${color}44`,
            borderRadius: 4,
            color,
            padding: "5px 8px",
            fontFamily: "Courier New",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            userSelect: "none",
          }}
        >
          <span>
            {selected?.custom ? "📂 " : ""}
            {selected?.label ?? "—"}
          </span>
          <span style={{ fontSize: 9, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
        </div>

        {/* Upload */}
        <button
          onClick={() => fileRef.current.click()}
          title="Upload .glb"
          style={{
            background: "transparent",
            border: `1px solid ${color}44`,
            borderRadius: 4,
            color,
            cursor: "pointer",
            padding: "0 10px",
            fontSize: 14,
          }}
        >
          📂
        </button>
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 36,
            zIndex: 9999,
            background: "#0a1628",
            border: `1px solid ${color}33`,
            borderRadius: 4,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 4px 20px #00000088",
          }}
        >
          {models.map((m) => (
            <div
              key={m.uri}
              onClick={() => {
                onChange(m.uri);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "5px 8px",
                cursor: "pointer",
                background: value === m.uri ? `${color}15` : "transparent",
                borderLeft:
                  value === m.uri
                    ? `2px solid ${color}`
                    : "2px solid transparent",
                fontFamily: "Courier New",
                fontSize: 11,
                color: m.custom ? color : "#ccc",
                gap: 6,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = `${color}10`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  value === m.uri ? `${color}15` : "transparent")
              }
            >
              {m.custom && <span style={{ fontSize: 9 }}>📂</span>}
              <span style={{ flex: 1, textAlign: "left" }}>{m.label}</span>
              {m.custom && (
                <span
                  onClick={(e) => handleDelete(e, m.uri)}
                  style={{
                    color: "#ff444488",
                    fontSize: 12,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#ff4444")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#ff444488")
                  }
                >
                  ✕
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}
