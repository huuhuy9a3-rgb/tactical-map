export const input = (color = "#00ffcc") => ({
  width: "100%",
  background: "#0d1a2a",
  border: `1px solid ${color}33`,
  borderRadius: 4,
  color,
  padding: "4px 8px",
  fontFamily: "Courier New",
  fontSize: 12,
});

export const btn = (color = "#00ff88") => ({
  marginTop: 4,
  marginBottom: 4,
  width: "100%",
  padding: "8px 0",
  background: "transparent",
  border: `1px solid ${color}`,
  color,
  fontFamily: "Courier New",
  fontSize: 11,
  letterSpacing: 1,
  cursor: "pointer",
});

export const lbl = { fontSize: 10, color: "#ffffff66", marginBottom: 2 };

export function Field({ label, val, set, color, placeholder = "" }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={lbl}>{label}</div>
      <input
        type="number"
        value={val}
        onChange={(e) => set(e.target.value)}
        style={input(color)}
        placeholder={placeholder}
      />
    </div>
  );
}
