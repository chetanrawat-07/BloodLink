import { useEffect, useRef, useState } from "react";
import { mapNodes, GOOGLE_MAPS_API_KEY } from "../data.js";

const COLORS = { ok: "var(--success)", warn: "var(--warning)", critical: "var(--critical)" };
const COLOR_HEX = { ok: "#1F7A4D", warn: "#A8600A", critical: "#B3261E" };
const ALL_NODES = [...mapNodes.jk, ...mapNodes.ladakh, ...mapNodes.punjab];
const W = 420, H = 330;

function SchematicMap({ layer }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="320" role="img" aria-label="Schematic supply map">
      <text x="60" y="30" fontSize="11" fill="var(--text-muted)" fontWeight="600">J&amp;K</text>
      <text x="290" y="20" fontSize="11" fill="var(--text-muted)" fontWeight="600">LADAKH</text>
      <text x="80" y="245" fontSize="11" fill="var(--text-muted)" fontWeight="600">PUNJAB</text>
      {layer === "road" ? (
        <>
          <line x1="150" y1="150" x2="280" y2="40" stroke="var(--critical)" strokeWidth="2" strokeDasharray="5 4" />
          <text x="190" y="90" fontSize="9" fill="var(--critical)">⛔ Zojila La (closed Nov–May)</text>
          <line x1="150" y1="150" x2="140" y2="260" stroke="var(--border)" strokeWidth="2" />
          <line x1="120" y1="70" x2="150" y2="150" stroke="var(--border)" strokeWidth="2" />
          <line x1="140" y1="260" x2="230" y2="290" stroke="var(--border)" strokeWidth="2" />
        </>
      ) : (
        <>
          <line x1="150" y1="150" x2="280" y2="40" stroke="var(--primary)" strokeWidth="2" strokeDasharray="2 4" />
          <text x="195" y="90" fontSize="9" fill="var(--primary)">✈ Jammu–Leh, 2h10m</text>
        </>
      )}
      {ALL_NODES.map((n) => (
        <g key={n.label}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={COLORS[n.s]} opacity="0.85" />
          <text x={n.x} y={n.y + n.r + 12} textAnchor="middle" fontSize="9.5" fill="var(--text)">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function SupplyMap() {
  const [layer, setLayer] = useState("road");
  const [mapMode, setMapMode] = useState("schematic");
  const gWrapRef = useRef(null);
  const gMapRef = useRef(null);
  const overlaysRef = useRef([]);

  // Load Google Maps once per page (not once per mount) — this view component
  // mounts/unmounts every time the user switches to/away from this sidebar
  // item, so we guard against re-adding the script or losing an in-flight load.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") return;
    let cancelled = false;

    function initMap() {
      if (cancelled) return;
      try {
        gMapRef.current = new window.google.maps.Map(gWrapRef.current, {
          center: { lat: 32.9, lng: 76.0 },
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
        });
        setMapMode("google");
      } catch {
        // stay schematic
      }
    }

    // Already loaded from an earlier visit to this view — just build the map.
    if (window.google && window.google.maps) {
      initMap();
      return () => {
        cancelled = true;
      };
    }

    // A previous mount already requested the script — chain onto its callback
    // instead of injecting a second <script> tag.
    const existingScript = document.getElementById("bl-gmaps-script");
    if (existingScript) {
      const prev = window.__blGMapsReady;
      window.__blGMapsReady = () => {
        if (typeof prev === "function") prev();
        initMap();
      };
      return () => {
        cancelled = true;
      };
    }

    window.__blGMapsReady = initMap;
    const script = document.createElement("script");
    script.id = "bl-gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=__blGMapsReady`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  // render the Google Maps overlay layer whenever it's active and the layer toggle changes
  useEffect(() => {
    if (mapMode !== "google" || !gMapRef.current) return;
    const google = window.google;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const jammu = mapNodes.jk[1];
    const leh = mapNodes.ladakh[0];
    const path = [
      { lat: jammu.lat, lng: jammu.lng },
      { lat: leh.lat, lng: leh.lng },
    ];
    const line = new google.maps.Polyline({
      path,
      strokeColor: layer === "road" ? "#B3261E" : "#8B1538",
      strokeOpacity: layer === "road" ? 0.9 : 0.8,
      strokeWeight: 2,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: layer === "road" ? 3 : 2 }, offset: "0", repeat: layer === "road" ? "12px" : "8px" }],
      map: gMapRef.current,
    });
    overlaysRef.current.push(line);

    ALL_NODES.forEach((n) => {
      const marker = new google.maps.Marker({
        position: { lat: n.lat, lng: n.lng },
        map: gMapRef.current,
        title: n.label,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: COLOR_HEX[n.s], fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 2 },
      });
      const info = new google.maps.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:12.5px;"><b>${n.label}</b></div>` });
      marker.addListener("click", () => info.open(gMapRef.current, marker));
      overlaysRef.current.push(marker);
    });
  }, [mapMode, layer]);

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>Supply map &amp; routes</h3>
          <div className="chip-row">
            <span className={`badge ${mapMode === "google" ? "success" : "neutral"}`}>
              {mapMode === "google" ? "Live Google Map" : "Schematic diagram"}
            </span>
            <button className={`chip${layer === "road" ? " active" : ""}`} onClick={() => setLayer("road")}>
              Road status
            </button>
            <button className={`chip${layer === "air" ? " active" : ""}`} onClick={() => setLayer("air")}>
              Air routes
            </button>
          </div>
        </div>
        <p className="hint" style={{ marginBottom: 10 }}>
          {mapMode === "google"
            ? "Live map — marker colour = supply status, as recorded in this demo."
            : "Schematic network diagram, not a geographic map — node size = units in stock, colour = supply status."}
        </p>
        <div className="map-wrap" hidden={mapMode === "google"}>
          <SchematicMap layer={layer} />
        </div>
        <div className="map-wrap" ref={gWrapRef} hidden={mapMode !== "google"} style={{ height: 360 }} />
        <div className="legend">
          <span><i className="dotlg" style={{ background: "var(--success)" }} /> Sufficient stock</span>
          <span><i className="dotlg" style={{ background: "var(--warning)" }} /> Low stock</span>
          <span><i className="dotlg" style={{ background: "var(--critical)" }} /> Critical</span>
          <span>— open road</span>
          <span>┄ closed / seasonal road (e.g. Zojila La, Nov–May)</span>
          <span>✈️ air transfer route</span>
        </div>
      </div>
    </>
  );
}
