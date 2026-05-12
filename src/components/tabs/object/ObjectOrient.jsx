import { Field, btn } from "../../common/common.jsx";

export default function ObjectOrient({ selected, onUpdate, onRotate }) {
  return (
    <>
      <Field
        label="HEADING °"
        val={selected.heading ?? "0"}
        set={(v) => onUpdate("heading", v)}
        color="#ff88ff"
        step={1}
        placeholder="Nhập hướng (°)"
      />
      <Field
        label="PITCH °"
        val={selected.pitch ?? "0"}
        set={(v) => onUpdate("pitch", v)}
        color="#ff88ff"
        step={1}
        placeholder="Nhập góc nghiêng (°)"
      />
      <Field
        label="ROLL °"
        val={selected.roll ?? "0"}
        set={(v) => onUpdate("roll", v)}
        color="#ff88ff"
        step={1}
        placeholder="Nhập góc lăn (°)"
      />
      <button style={btn("#ff88ff")} onClick={onRotate}>
        ↻ ROTATE
      </button>
    </>
  );
}
