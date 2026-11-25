import { useState } from "react";
import { inventory } from "../data.js";
import { useLang } from "../i18n.jsx";

const COMPS = [
  { id: "all", label: "All components" },
  { id: "RBC", label: "RBC" },
  { id: "Platelets", label: "Platelets" },
  { id: "Plasma", label: "Plasma (FFP)" },
  { id: "Cryo", label: "Cryoprecipitate" },
];

const STATUS_CLS = { Quarantine: "bad", Reserved: "warn", Available: "ok" };

function expiryCls(expiry) {
  return expiry <= 2 ? "bad" : expiry <= 10 ? "warn" : "neutral";
}

export default function Inventory({ regionFilter }) {
  const { t } = useLang();
  const [filter, setFilter] = useState("all");
  const rows = inventory
    .filter((u) => (filter === "all" || u.comp.includes(filter)) && (regionFilter === "all" || u.region === regionFilter))
    .sort((a, b) => a.expiry - b.expiry);

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>{t("Blood unit inventory")}</h3>
          <span className="hint">
            {t("Sorted oldest‑expiry‑first (FIFO) to minimise wastage · each unit is ISBT‑128 tagged and tracked individually")}
          </span>
        </div>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {COMPS.map((c) => (
            <button
              key={c.id}
              className={`chip${filter === c.id ? " active" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {t(c.label)}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("Unit ID")}</th><th>{t("Blood bank")}</th><th>{t("Group")}</th><th>{t("Component")}</th><th>{t("Collected")}</th>
                <th>{t("Expiry")}</th><th>{t("Cold‑chain temp")}</th><th>{t("Status")}</th><th>{t("Batch ref")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td>{u.bank}</td>
                  <td>{u.group}</td>
                  <td>{t(u.comp)}</td>
                  <td>{u.collected}</td>
                  <td><span className={`pill ${expiryCls(u.expiry)}`}>{t("{n}d", { n: u.expiry })}</span></td>
                  <td className="mono">
                    {u.temp.includes("⚠") ? (
                      <span style={{ color: "var(--critical)", fontWeight: 600 }}>{u.temp}</span>
                    ) : (
                      u.temp
                    )}
                  </td>
                  <td><span className={`pill ${STATUS_CLS[u.status]}`}>{t(u.status)}</span></td>
                  <td><span className="hash">{u.hash}</span></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="hint">{t("No units match this filter.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Cold‑chain reference ranges")}</h3></div>
        <div className="grid cols-4">
          <div className="kpi"><div className="num">2–6°C</div><div className="lbl">{t("RBC / whole blood, 35–42 day shelf life")}</div></div>
          <div className="kpi"><div className="num">20–24°C</div><div className="lbl">{t("Platelets, agitated, 5 day shelf life")}</div></div>
          <div className="kpi"><div className="num">≤ −18°C</div><div className="lbl">{t("Plasma (FFP), frozen, up to 12 months")}</div></div>
          <div className="kpi"><div className="num">{t("IoT alert")}</div><div className="lbl">{t("Breach auto‑quarantines the unit and notifies the duty officer")}</div></div>
        </div>
      </div>
    </>
  );
}
