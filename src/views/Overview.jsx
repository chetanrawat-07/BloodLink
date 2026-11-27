import { regions, groupMix, activity, camps } from "../data.js";
import { useLang } from "../i18n.jsx";
import { useModel } from "../store.js";
import { analyseAll, daysLeft } from "../engine.js";

const STATUS_PILL = { critical: ["bad", "Critical"], low: ["warn", "Low"], ok: ["ok", "Healthy"] };

export default function Overview({ regionFilter, setView }) {
  const { t } = useLang();
  const filteredRegions = regions.filter((r) => regionFilter === "all" || regionFilter === r.id);
  const sum = (k) => filteredRegions.reduce((n, r) => n + r[k], 0);
  // live figures from the data layer (the rest of this page is the original static overview)
  const model = useModel();
  const ladakhONeg = analyseAll(model, { state: "ladakh", group: "O-", comp: "PRBC" });
  const lehStock = ladakhONeg.reduce((n, a) => n + a.available, 0);
  const lehMin = ladakhONeg.reduce((n, a) => n + a.minLevel, 0);
  const expiring72 = analyseAll(model).reduce((n, a) => n + model.byKey.get(a.key).units.filter((u) => u.status === "Available").slice(0, a.available).filter((u) => daysLeft(u) <= 3).length, 0);
  const activeCamps = camps.filter((c) => c.status !== "Completed" && (regionFilter === "all" || c.region === regionFilter)).length;

  return (
    <>
      <div className="alert-banner">
        🔴 <strong>{t("Critical:")}</strong>&nbsp;{t("O‑negative PRBC stock in Ladakh is {n} units against a combined minimum of {m}.", { n: lehStock, m: lehMin })}
        <button onClick={() => setView("forecast", { state: "ladakh", group: "O-", comp: "PRBC" })}>{t("View forecast →")}</button>
      </div>

      <div className="grid cols-5">
        <div className="kpi">
          <div className="num">{sum("units").toLocaleString()}</div>
          <div className="lbl">{t("Units in stock")}</div>
          <div className="delta up">▲ 3.1% {t("vs last week")}</div>
        </div>
        <div className="kpi">
          <div className="num">{sum("banks")}</div>
          <div className="lbl">{t("Connected blood banks")}</div>
          <div className="delta">{t("{n} states / UTs · 1 shared instance", { n: filteredRegions.length })}</div>
        </div>
        <div className="kpi">
          <div className="num">{sum("critical")}</div>
          <div className="lbl">{t("Critical shortage alerts")}</div>
          <div className="delta down">▲ {t("since yesterday")}</div>
        </div>
        <div className="kpi">
          <div className="num">{expiring72}</div>
          <div className="lbl">{t("Units expiring in 72h")}</div>
          <div className="delta down">{t("FIFO redistribution pending")}</div>
        </div>
        <div className="kpi">
          <div className="num">{activeCamps}</div>
          <div className="lbl">{t("Camps upcoming or running")}</div>
          <div className="delta up">{t("incl. Amarnath Yatra route")}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("Stock by region")}</h3>
            <span className="hint">{t("Tap a region chip above to filter")}</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>{t("Region")}</th><th>{t("Blood banks")}</th><th>{t("Units in stock")}</th><th>{t("Critical alerts")}</th><th>{t("Status")}</th></tr>
              </thead>
              <tbody>
                {filteredRegions.map((r) => {
                  const [cls, label] = STATUS_PILL[r.status];
                  return (
                    <tr key={r.id}>
                      <td>{t(r.name)}</td>
                      <td>{r.banks}</td>
                      <td>{r.units.toLocaleString()}</td>
                      <td>{r.critical}</td>
                      <td><span className={`pill ${cls}`}>{t(label)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Blood group mix, network‑wide")}</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groupMix.map((g) => (
              <div key={g.g}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{g.g}</span>
                  <span className="mono" style={{ color: "var(--text-muted)" }}>{g.pct}%</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${g.pct * 2.6}%`, background: g.g.includes("-") ? "var(--accent)" : "var(--primary)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Recent activity")}</h3>
          <span className="hint">{t("Latest actions synced across the network")}</span>
        </div>
        <div className="timeline">
          {activity.map((a, i) => (
            <div className="t-row" key={i}>
              <div className="t-dot" style={{ background: a.c }} />
              <div className="t-body">
                <div className="t-title">{t(a.t)}</div>
                <div className="t-meta">{t(a.m)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
