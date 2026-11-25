import { useState } from "react";
import { inventory } from "../data.js";

const COMPS = [
  { id: "all", label: "All components" },
  { id: "RBC", label: "RBC" },
  { id: "Platelets", label: "Platelets" },
  { id: "Plasma", label: "Plasma (FFP)" },
  { id: "Cryo", label: "Cryoprecipitate" },
];

function expiryPill(expiry) {
  if (expiry <= 2) return <span className="pill bad">{expiry}d</span>;
  if (expiry <= 10) return <span className="pill warn">{expiry}d</span>;
  return <span className="pill neutral">{expiry}d</span>;
}

function statusPill(status) {
  if (status === "Quarantine") return <span className="pill bad">Quarantine</span>;
  if (status === "Reserved") return <span className="pill warn">Reserved</span>;
  return <span className="pill ok">Available</span>;
}

export default function Inventory() {
  const [filter, setFilter] = useState("all");
  const rows = inventory.filter((u) => filter === "all" || u.comp.includes(filter));

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>Blood unit inventory</h3>
          <span className="hint">
            Sorted oldest‑expiry‑first (FIFO) to minimise wastage · each unit is ISBT‑128 tagged and tracked individually
          </span>
        </div>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {COMPS.map((c) => (
            <button
              key={c.id}
              className={`chip${filter === c.id ? " active" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Unit ID</th><th>Blood bank</th><th>Group</th><th>Component</th><th>Collected</th>
                <th>Expiry</th><th>Cold‑chain temp</th><th>Status</th><th>Batch ref</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td>{u.bank}</td>
                  <td>{u.group}</td>
                  <td>{u.comp}</td>
                  <td>{u.collected}</td>
                  <td>{expiryPill(u.expiry)}</td>
                  <td className="mono">
                    {u.temp.includes("⚠") ? (
                      <span style={{ color: "var(--critical)", fontWeight: 600 }}>{u.temp}</span>
                    ) : (
                      u.temp
                    )}
                  </td>
                  <td>{statusPill(u.status)}</td>
                  <td><span className="hash">{u.hash}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Cold‑chain reference ranges</h3></div>
        <div className="grid cols-4">
          <div className="kpi"><div className="num">2–6°C</div><div className="lbl">RBC / whole blood, 35–42 day shelf life</div></div>
          <div className="kpi"><div className="num">20–24°C</div><div className="lbl">Platelets, agitated, 5 day shelf life</div></div>
          <div className="kpi"><div className="num">≤ −18°C</div><div className="lbl">Plasma (FFP), frozen, up to 12 months</div></div>
          <div className="kpi"><div className="num">IoT alert</div><div className="lbl">Breach auto‑quarantines the unit and notifies the duty officer</div></div>
        </div>
      </div>
    </>
  );
}
