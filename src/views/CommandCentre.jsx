import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useModel, useStore, now } from "../store.js";
import { scopeOf, whereOf } from "../access.js";
import {
  networkSummary, analyseAll, generateInsights, recommendTransfers, demandChange, sumSeries, selectCells,
  FACILITIES, STATES, DISTRICTS, GROUPS, COMPONENTS, compById, facById,
} from "../engine.js";
import { Bars, KindTag, Provenance, StatusPill, pct, fmtH } from "../ui.jsx";

const SCENARIOS = [
  { n: 1, title: "Predictive shortage", view: "forecast", params: { state: "ladakh", group: "O-", comp: "PRBC" },
    desc: "Rising O− use and low winter collections put Leh and Kargil below minimum within days." },
  { n: 2, title: "Near-expiry inventory", view: "inventory", params: { tab: "expiry", comp: "PLT" },
    desc: "GMC Amritsar platelets expire before local use; Patiala needs them." },
  { n: 3, title: "Intelligent redistribution", view: "map", params: { group: "O-", comp: "PRBC", facId: "LA-LEH-SNM" },
    desc: "Surplus O− in Jammu/Srinagar to Leh by air (Zojila closed). Draft, then approve." },
  { n: 4, title: "Emergency request", view: "emergency", params: { id: "EM-2026-0311" },
    desc: "4 × O− PRBC for a trauma case in Leh, from source match to fulfilment." },
  { n: 5, title: "Command Centre", view: "command", params: {},
    desc: "State/UT stock, predicted shortages, wastage and transfer performance." },
];

export default function CommandCentre({ user, setView }) {
  const { t } = useLang();
  const model = useModel();
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const transfers = useStore((s) => s.transfers);
  const emergencies = useStore((s) => s.emergencies);
  const [stateSel, setStateSel] = useState(scope.level === "all" ? "all" : scope.state);
  const clock = now();

  const w = (f) => where(f) && (stateSel === "all" || f.state === stateSel);
  const sum = useMemo(() => networkSummary(model, w), [model, stateSel]); // eslint-disable-line react-hooks/exhaustive-deps
  const analyses = useMemo(() => analyseAll(model, { where: w }), [model, stateSel]); // eslint-disable-line react-hooks/exhaustive-deps
  const insights = useMemo(() => generateInsights(model, w).slice(0, 6), [model, stateSel]); // eslint-disable-line react-hooks/exhaustive-deps
  const recs = useMemo(() => recommendTransfers(model, { where: w }), [model, stateSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const byGroup = GROUPS.map((g) => ({ label: g, value: analyses.filter((a) => a.group === g).reduce((s, a) => s + a.available, 0) }));
  const byComp = COMPONENTS.map((c) => ({ label: c.name, value: analyses.filter((a) => a.comp === c.id).reduce((s, a) => s + a.available, 0) }));
  const shortages = analyses.filter((a) => a.fc.status === "ok" && a.shortageProb >= 0.6).sort((a, b) => b.shortageProb - a.shortageProb);
  const waste = FACILITIES.filter(w).map((f) => ({ f, n: analyses.filter((a) => a.facId === f.id).reduce((s, a) => s + a.wasteCount, 0) })).sort((a, b) => b.n - a.n).slice(0, 5);

  const districts = DISTRICTS.filter((d) => FACILITIES.some((f) => w(f) && f.district === d.id)).map((d) => {
    const as = analyses.filter((a) => a.district === d.id);
    const ch = demandChange(sumSeries(selectCells(model, { district: d.id })));
    const facs = FACILITIES.filter((f) => f.district === d.id);
    return {
      d, available: as.reduce((s, a) => s + a.available, 0),
      critical: as.filter((a) => a.status === "critical").length,
      predicted: as.filter((a) => a.fc.status === "ok" && a.shortageProb >= 0.6).length,
      waste: as.reduce((s, a) => s + a.wasteCount, 0), change: ch.pct,
      staleH: Math.max(...facs.map((f) => f.lastUpdateH)),
    };
  }).sort((a, b) => b.predicted - a.predicted || b.critical - a.critical);

  const tIn = transfers.filter((x) => w(facById[x.to]) || w(facById[x.from]));
  const delayed = tIn.filter((x) => ["Dispatched", "In Transit"].includes(x.status) && x.dispatch?.eta && clock > x.dispatch.eta);
  const done = tIn.filter((x) => ["Received", "Closed"].includes(x.status));
  const eIn = emergencies.filter((r) => w(facById[r.destFacId]));
  const pendingReq = eIn.filter((r) => !["Fulfilled", "Closed", "Rejected"].includes(r.status)).length;
  const completedReq = eIn.filter((r) => ["Fulfilled", "Closed"].includes(r.status)).length;

  return (
    <>
      {scope.level === "all" && (
        <div className="chip-row">
          {[["all", "All States/UTs"], ...STATES.map((s) => [s.id, s.name])].map(([id, l]) => (
            <button key={id} className={`chip${stateSel === id ? " active" : ""}`} onClick={() => setStateSel(id)}>{t(l)}</button>
          ))}
        </div>
      )}

      <div className="grid cols-5">
        <div className="kpi"><div className="num">{sum.facilities}</div><div className="lbl">{t("Participating blood banks")}</div></div>
        <div className="kpi"><div className="num">{sum.available.toLocaleString()}</div><div className="lbl">{t("Total available inventory (units)")}</div></div>
        <div className="kpi"><div className="num">{sum.collected30.toLocaleString()}</div><div className="lbl">{t("Collection, last 30 days")}</div></div>
        <div className="kpi"><div className="num">{sum.utilised30.toLocaleString()}</div><div className="lbl">{t("Utilisation, last 30 days")}</div></div>
        <div className="kpi"><div className="num">{sum.nearExpiry}</div><div className="lbl">{t("Near-expiry units")}</div></div>
        <div className="kpi"><div className="num">{pendingReq}</div><div className="lbl">{t("Pending emergency requests")}</div></div>
        <div className="kpi"><div className="num">{completedReq}</div><div className="lbl">{t("Completed requests")}</div></div>
        <div className="kpi"><div className="num" style={{ color: "var(--critical)" }}>{sum.critical}</div><div className="lbl">{t("Critical stock cells (bank × group × component)")}</div></div>
        <div className="kpi"><div className="num">{shortages.length}</div><div className="lbl">{t("Predicted shortages, next 7 days")}</div><div className="delta">{t("Prediction")}</div></div>
        <div className="kpi"><div className="num">{sum.predictedWaste}</div><div className="lbl">{t("Units at risk of wastage")}</div><div className="delta">{t("Prediction")}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("Demonstration scenarios")}</h3></div>
        <div className="grid cols-3">
          {SCENARIOS.map((s) => (
            <div key={s.n} className="scenario">
              <strong>{t("Scenario {n}", { n: s.n })}: {t(s.title)}</strong>
              <p className="hint" style={{ fontSize: 12.2 }}>{t(s.desc)}</p>
              <button className="btn sm primary" onClick={() => setView(s.view, s.params)}>{t("Open")}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-3">
        {STATES.filter((s) => scope.level === "all" || s.id === scope.state).map((s) => {
          const sm = networkSummary(model, (f) => where(f) && f.state === s.id);
          return (
            <div key={s.id} className="panel clickable" onClick={() => setStateSel(s.id)} style={stateSel === s.id ? { outline: "2px solid var(--primary)" } : undefined}>
              <div className="panel-head"><h3>{t(s.name)}</h3><span className="hint">{t("{n} blood banks", { n: sm.facilities })}</span></div>
              <div className="rec-grid">
                <div><b>{t("Available")}</b>{sm.available.toLocaleString()}</div>
                <div><b>{t("Critical cells")}</b>{sm.critical}</div>
                <div><b>{t("Near expiry")}</b>{sm.nearExpiry}</div>
                <div><b>{t("Wastage last 30 d")}</b>{sm.discarded30}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="two-col">
        <div className="panel"><div className="panel-head"><h3>{t("Blood group-wise availability")}</h3></div><Bars rows={byGroup} /></div>
        <div className="panel"><div className="panel-head"><h3>{t("Component-wise availability")}</h3></div><Bars rows={byComp} /></div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("District-wise operational status")}</h3><span className="hint">{t("Sorted by predicted shortages")}</span></div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>{t("District")}</th><th>{t("Available")}</th><th>{t("Critical cells")}</th><th>{t("Predicted shortages (7 d)")}</th><th>{t("Units at wastage risk")}</th><th>{t("Demand change (14 d)")}</th><th>{t("Oldest update")}</th></tr></thead>
          <tbody>{districts.map((r) => (
            <tr key={r.d.id} className="clickable" onClick={() => setView("forecast", { district: r.d.id })}>
              <td><strong>{r.d.name}</strong></td><td>{r.available}</td>
              <td>{r.critical ? <span className="pill bad">{r.critical}</span> : 0}</td>
              <td>{r.predicted ? <span className="pill bad">{r.predicted}</span> : 0}</td>
              <td>{r.waste}</td>
              <td>{r.change == null ? "—" : `${r.change >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(r.change * 100))}%`}</td>
              <td>{r.staleH > model.config.delayedUpdateHours ? <span className="pill warn">{r.staleH} h</span> : `${r.staleH} h`}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>{t("Upcoming shortage predictions")}</h3><KindTag kind="prediction" /></div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>{t("Blood bank")}</th><th>{t("Need")}</th><th>{t("Stock")}</th><th>{t("Prob.")}</th><th>{t("Status")}</th></tr></thead>
            <tbody>{shortages.slice(0, 8).map((a) => (
              <tr key={a.key}><td>{facById[a.facId].name}</td><td>{a.group} {compById[a.comp].name}</td><td>{a.available}</td><td><span className="pill bad">{pct(a.shortageProb)}</span></td><td><StatusPill status={a.status} /></td></tr>
            ))}</tbody>
          </table></div>
          <Provenance period="Next 7 days" />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Potential wastage")}</h3><KindTag kind="prediction" /></div>
          <Bars rows={waste.map((x) => ({ label: x.f.name, value: x.n }))} unit=" u" />
          <p className="hint" style={{ marginTop: 10, fontSize: 11.5 }}>{t("{n} redistribution opportunities identified", { n: recs.length })} · <button className="btn sm ghost" onClick={() => setView("map")}>{t("Open Supply Chain →")}</button></p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("Supply chain monitoring")}</h3><button className="btn sm ghost" onClick={() => setView("transfers")}>{t("Transfer Management →")}</button></div>
        <div className="grid cols-5">
          <div className="kpi"><div className="num">{tIn.filter((x) => x.status === "Pending Approval").length}</div><div className="lbl">{t("Pending approvals")}</div></div>
          <div className="kpi"><div className="num">{tIn.filter((x) => ["Approved", "Dispatched", "In Transit"].includes(x.status)).length}</div><div className="lbl">{t("Active transfers")}</div></div>
          <div className="kpi"><div className="num">{tIn.filter((x) => x.status === "In Transit").length}</div><div className="lbl">{t("In transit")}</div></div>
          <div className="kpi"><div className="num" style={{ color: delayed.length ? "var(--critical)" : undefined }}>{delayed.length}</div><div className="lbl">{t("Delayed deliveries")}</div></div>
          <div className="kpi"><div className="num">{done.length}/{tIn.length}</div><div className="lbl">{t("Completed / total transfers")}</div><div className="delta">{done.length ? t("avg {h} submit→receipt", { h: fmtH(done.reduce((s, x) => s + ((x.history.find((h) => h[0] === "Received")?.[1] ?? x.createdAt) - x.createdAt), 0) / done.length / 3600000) }) : ""}</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("AI-generated insights")}</h3><button className="btn sm ghost" onClick={() => setView("insights")}>{t("All insights →")}</button></div>
        <div className="timeline">
          {insights.map((i, k) => (
            <div className="t-row" key={k}>
              <div className="t-dot" style={{ background: i.sev === "critical" ? "var(--critical)" : i.sev === "warning" ? "var(--warning)" : "var(--primary)" }} />
              <div className="t-body">
                <div className="t-title"><KindTag kind={i.kind} /> {i.text}</div>
                <div className="t-meta">{i.detail} · {t(i.period)}</div>
              </div>
            </div>
          ))}
        </div>
        <Provenance />
      </div>
    </>
  );
}
