import { useState, useRef, useEffect } from "react";
import { Field, btn } from "../../common/common.jsx";

export default function CameraTab({
  onFly,
  onHighlight,
  camLat,
  setCamLat,
  camLon,
  setCamLon,
  camAlt,
  setCamAlt,
  camHeading,
  setCamHeading,
  camPitch,
  setCamPitch,
  pickedPos,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef(null);

  const flyToLocation = ({ lat, lon }) => {
    // Fly từ trên xuống
    onFly({
      lat,
      lon,
      alt: 500, // độ cao 500m nhìn thấy rõ
      heading: "0",
      pitch: "-89", // gần như nhìn thẳng xuống
    });
    // Highlight điểm
    onHighlight({ lat, lon });
    // Cập nhật fields
    setCamLat(String(lat));
    setCamLon(String(lon));
    setCamAlt("500");
    setCamHeading("0");
    setCamPitch("-89");
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=20`,
          { headers: { "Accept-Language": "vi" } },
        );
        const data = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat).toFixed(6);
    const lon = parseFloat(item.lon).toFixed(6);
    const name = item.display_name.split(",").slice(0, 2).join(",");
    setQuery(item.display_name.split(",")[0]);
    setSuggestions([]);
    onFly({ lat, lon, alt: "500", heading: "0", pitch: "-89" });
    onHighlight({ lat, lon, name });
    setCamLat(lat);
    setCamLon(lon);
    setCamAlt("500");
    setCamHeading("0");
    setCamPitch("-89");
  };

  useEffect(() => {
    if (!pickedPos) return;
    setCamLat(pickedPos.lat);
    setCamLon(pickedPos.lon);
  }, [pickedPos]);

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: 12, position: "relative" }}>
        <div style={{ fontSize: 10, color: "#ffffff66", marginBottom: 4 }}>
          TÌM VỊ TRÍ
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            position: "relative",
          }}
        >
          <input
            value={query}
            onChange={handleInput}
            placeholder="Nhập địa chỉ..."
            style={{
              flex: 1,
              background: "#0d1a2a",
              border: "1px solid #00ff8844",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 28px 4px 8px",
              fontFamily: "Courier New",
              fontSize: 11,
            }}
          />
          {query && (
            <div
              onClick={() => {
                setQuery("");
                setSuggestions([]);
              }}
              style={{
                position: "absolute",
                right: searching ? 28 : 6,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#ffffff55",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
                padding: "2px 4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff55")}
            >
              ✕
            </div>
          )}
          {searching && (
            <div style={{ color: "#00ff88", fontSize: 11 }}>...</div>
          )}
        </div>

        {/* Dropdown */}
        {suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#0d1a2a",
              border: "1px solid #00ff8844",
              borderRadius: 4,
              zIndex: 9999,
              maxHeight: 200,
              overflowY: "auto",
              marginTop: 2,
            }}
          >
            {suggestions.map((item, i) => (
              <div
                key={i}
                onClick={() => handleSelect(item)}
                style={{
                  padding: "8px 10px",
                  fontSize: 10,
                  color: "#ccc",
                  cursor: "pointer",
                  borderBottom: "1px solid #ffffff11",
                  lineHeight: 1.5,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1a3a2a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ color: "#00ffcc", marginBottom: 2 }}>
                  {item.display_name.split(",")[0]}
                </div>
                <div style={{ color: "#ffffff55", fontSize: 9 }}>
                  {item.display_name.split(",").slice(1, 3).join(",")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #ffffff11", marginBottom: 12 }} />

      <Field
        label="Latitude"
        val={camLat}
        set={setCamLat}
        color="#00ffcc"
        step={0.001}
        placeholder="Nhập vĩ độ"
      />
      <Field
        label="Longitude"
        val={camLon}
        set={setCamLon}
        color="#00ffcc"
        step={0.001}
        placeholder="Nhập kinh độ"
      />
      <Field
        label="Altitude (m)"
        val={camAlt}
        set={setCamAlt}
        color="#00ffcc"
        step={10}
        placeholder="Nhập độ cao (m)"
      />
      <Field
        label="HEADING °"
        val={camHeading}
        set={setCamHeading}
        color="#00ffcc"
        step={1}
        placeholder="Nhập hướng (°)"
      />
      <Field
        label="PITCH °"
        val={camPitch}
        set={setCamPitch}
        color="#00ffcc"
        step={1}
        placeholder="Nhập góc nghiêng (°)"
      />

      <button
        style={btn("#00ff88")}
        onClick={() => {
          onFly({
            lat: camLat,
            lon: camLon,
            alt: camAlt,
            heading: camHeading,
            pitch: camPitch,
          });
          onHighlight({ lat: camLat, lon: camLon });
        }}
      >
        ▶ FLY TO
      </button>

      <button
        style={{ ...btn(copied ? "#00ff88" : "#00ffcc"), marginTop: 4 }}
        onClick={() => {
          const text = `{ "lat": ${camLat}, "lon": ${camLon}, "alt": ${camAlt}, "heading": ${camHeading}, "pitch": ${camPitch} },`;
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "✓ COPIED!" : "⎘ COPY COORDS"}
      </button>
    </>
  );
}
