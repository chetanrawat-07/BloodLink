import { useMemo, useState } from "react";
import { useModel } from "../store.js";
import { scopeOf, whereOf } from "../access.js";
import {
  aggregateForecast, analyseCell, recommendTransfers, seasonalIndex, demandChange,
  FORECAST_METHOD, FACILITIES, GROUPS, COMPONENTS, DISTRICTS, STATES, compById, facById, districtById, cellKey, HISTORY_DAYS,
} from "../engine.js";
import { useLang } from "../i18n.jsx";
import { ForecastChart, Heatmap, Bars, Provenance, InsufficientData, Select, Tabs, OPT, pct, StatusPill } from "../ui.jsx";
import RecCard from "./RecCard.jsx";

const HORIZONS = [7, 15, 30];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATA_REQ = "Production forecasting needs at least 12 months of daily issue, collection and stock history per blood bank, group and component (e.g. from e-RaktKosh), with a minimum of 10 units issued in the last 90 days for each series.";

export default function Forecast({ user, params = {}, setView, toast }) {
  const { t } = useLang();
  const model = useModel();
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const [horizon, setHorizon] = useState(7);
  const [state, setState] = useState(params.state || (scope.level === "state" || scope.level === "district" ? scope.state : "all"));
  const [district, setDistrict] = useState(params.district || scope.district || "all");
  const [facId, setFacId] = useState(params.facId || scope.facId || "all");
  const [group, setGroup] = useState(params.group || "all");
  const [comp, setComp] = useState(params.comp || "all");
  const [breakdown, setBreakdown] = useState("group");
  const [heatComp, setHeatComp] = useState(params.comp && params.comp !== "all" ? params.comp : "PRBC");

  const filter = { state, district, facId, group, comp, where };
  const agg = useMemo(() => aggregateForecast(model, filter, horizon), [model, state, district, facId, group, comp, horizon]); // eslint-disable-line react-hooks/exhaustive-deps
  const fc = agg.fc;
  const change = demandChange(agg.series);
  const season = seasonalIndex(agg.series);

  const facsInView = FACILITIES.filter((f) => where(f) && (state === "all" || f.state === state) && (district === "all" || f.district === district));

  const rows = useMemo(() => {
    const mk = (label, extra) => {
      const a = aggregateForecast(model, { ...filter, ...extra }, horizon);
      let last30 = 0; for (let i = HISTORY_DAYS - 30; i < HISTORY_DAYS; i++) last30 += a.series[i];
      return { label, extra, a, last30 };
    };
    if (breakdown === "group") return GROUPS.map((g) => mk(g, { group: g }));
    if (breakdown === "comp") return COMPONENTS.map((c) => mk(c.name, { comp: c.id }));
    if (breakdown === "district") return DISTRICTS.filter((d) => facsInView.some((f) => f.district === d.id)).map((d) => mk(d.name, { district: d.id, facId: "all" }));
    if (breakdown === "facility") return facsInView.map((f) => mk(f.name, { facId: f.id }));
    return [];
  }, [model, breakdown, horizon, state, district, facId, group, comp]); // eslint-disable-line react-hooks/exhaustive-deps

  const recs = useMemo(() => recommendTransfers(model, { group, comp, where: (f) => facsInView.includes(f) }), [model, group, comp, state, district]); // eslint-disable-line react-hooks/exhaustive-deps

  // collection requirement uses the upper 80% bound so it covers a busy week, not just the average
  const collectNeed = fc.status === "ok" ? Math.max(0, Math.ceil(fc.upper - (agg.available + agg.supplyMu * horizon))) : null;
  const attention = facsInView
    .flatMap((f) => (group === "all" ? GROUPS : [group]).flatMap((g) => (comp === "all" ? ["PRBC", "PLT"] : [comp]).map((c) => analyseCell(model, cellKey(f.id, g, c), horizon))))
    .filter((a) => a.fc.status === "ok" && a.shortageProb >= 0.5)
    .sort((a, b) => b.shortageProb - a.shortageProb)
    .slice(0, 6);

  const selLabel = [facId !== "all" ? facById[facId].name : district !== "all" ? districtById[district].name : state !== "all" ? STATES.find((s) => s.id === state).name : scope.label || "All participating States/UTs", group !== "all" ? group : t("all groups"), comp !== "all" ? compById[comp].name : t("all components")].join(" · ");
  const periodLabel = t("Next {n} days", { n: horizon });

  function pick(extra) {
    if (extra.group) setGroup(extra.group);
    if (extra.comp) setComp(extra.comp);
    if (extra.district) { setDistrict(extra.district); setFacId("all"); }
    if (extra.facId) setFacId(extra.facId);
  }

  return (
    <>
      <div className="panel">
        <div className="filters">
          {scope.level === "all" && <Select label="State/UT" value={state} onChange={(v) => { setState(v); setDistrict("all"); setFacId("all"); }} options={OPT.states} allLabel="All States/UTs" />}
          {(scope.level === "all" || scope.level === "state") && <Select label="District" value={district} onChange={(v) => { setDistrict(v); setFacId("all"); }} options={OPT.districts(state).filter(([id]) => FACILITIES.some((f) => where(f) && f.district === id))} allLabel="All districts" />}
          {scope.level !== "facility" && <Select label="Blood bank" value={facId} onChange={setFacId} options={facsInView.map((f) => [f.id, f.name])} allLabel="All blood banks" />}
          <Select label="Blood group" value={group} onChange={setGroup} options={OPT.groups} allLabel="All groups" />
          <Select label="Component" value={comp} onChange={setComp} options={OPT.comps} allLabel="All components" />
          <div className="fsel"><span>{t("Forecast period")}</span>
            <div className="chip-row">{HORIZONS.map((h) => <button key={h} className={`chip${horizon === h ? " active" : ""}`} onClick={() => setHorizon(h)}>{t("{n} days", { n: h })}</button>)}</div>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("Historical vs predicted demand")}</h3>
            <span className="hint">{selLabel}</span>
          </div>
          {fc.status === "ok" ? <ForecastChart series={agg.series} fc={fc} /> : <InsufficientData reason={fc.reason} requirement={DATA_REQ} />}
          <Provenance period={periodLabel} confidence={fc.status === "ok" ? `${fc.confidence} (back-test error ${Math.round(fc.backtestErr * 100)}%)` : "Not available"} method={FORECAST_METHOD} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Projection for the selection")}</h3><span className="badge demo">{t("Prediction")}</span></div>
          {fc.status === "ok" ? (
            <div className="grid cols-2">
              <div className="kpi"><div className="num">{fc.total.toFixed(0)}</div><div className="lbl">{t("Forecast demand, next {n} days", { n: horizon })}</div><div className="delta">{t("80% range {a}–{b}", { a: fc.lower.toFixed(0), b: fc.upper.toFixed(0) })}</div></div>
              <div className="kpi"><div className="num">{agg.available}</div><div className="lbl">{t("Available stock now")}</div><div className="delta">{t("+ ~{n} expected collections", { n: (agg.supplyMu * horizon).toFixed(0) })}</div></div>
              <div className="kpi"><div className="num" style={{ color: agg.projected < 0 ? "var(--critical)" : undefined }}>{agg.projected.toFixed(0)}</div><div className="lbl">{t("Projected stock at end of period")}</div></div>
              <div className="kpi"><div className="num" style={{ color: agg.shortageProb >= 0.6 ? "var(--critical)" : undefined }}>{pct(agg.shortageProb)}</div><div className="lbl">{t("Shortage probability")}</div></div>
              <div className="kpi"><div className="num">{fc.trendPerWeek >= 0 ? "▲" : "▼"} {Math.abs(fc.trendPerWeek).toFixed(1)}</div><div className="lbl">{t("Trend (units/day change per week)")}</div></div>
              <div className="kpi"><div className="num">{change.pct == null ? "—" : `${change.pct >= 0 ? "+" : ""}${Math.round(change.pct * 100)}%`}</div><div className="lbl">{t("Demand change: last 14 days vs previous 14 (historical)")}</div></div>
            </div>
          ) : <InsufficientData reason={fc.reason} requirement={DATA_REQ} />}
          {collectNeed != null && (
            <div className="empty" style={{ marginTop: 12 }}>
              <strong>{collectNeed > 0 ? t("Recommended additional collection: {n} units", { n: collectNeed }) : t("No additional collection needed for this period")}</strong>
              <span>{t("Upper 80% forecast minus stock and expected collections.")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Forecast breakdown")}</h3>
          <Tabs value={breakdown} onChange={setBreakdown} tabs={[["group", "By blood group"], ["comp", "By component"], ["district", "By district"], ["facility", "By blood bank"], ["hospital", "By hospital"]]} />
        </div>
        {breakdown === "hospital" ? (
          <InsufficientData reason="Hospital-wise demand is not available in the current dataset — issues are recorded per blood bank, not per receiving hospital." requirement="Requires issue records carrying the receiving hospital ID (e-RaktKosh issue register or hospital HMIS feed)." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>{t("Segment")}</th><th>{t("Issued, last 30 d")}</th><th>{t("Forecast {n} d", { n: horizon })}</th><th>{t("80% range")}</th><th>{t("Stock")}</th><th>{t("Shortage prob.")}</th><th>{t("Confidence")}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="clickable" onClick={() => pick(r.extra)}>
                    <td><strong>{r.label}</strong></td>
                    <td>{Math.round(r.last30)}</td>
                    {r.a.fc.status === "ok" ? (
                      <>
                        <td>{r.a.fc.total.toFixed(1)}</td>
                        <td className="mono">{r.a.fc.lower.toFixed(0)}–{r.a.fc.upper.toFixed(0)}</td>
                        <td>{r.a.available}</td>
                        <td><span className={`pill ${r.a.shortageProb >= 0.6 ? "bad" : r.a.shortageProb >= 0.3 ? "warn" : "ok"}`}>{pct(r.a.shortageProb)}</span></td>
                        <td>{t(r.a.fc.confidence)}</td>
                      </>
                    ) : (
                      <td colSpan={5}><span className="pill neutral">{t("Insufficient Data")}</span> <span className="hint">{t("{n} units in 90 d", { n: r.a.fc.last90 })}</span></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginTop: 8, fontSize: 11.5 }}>{t("Click a row to drill down.")}</p>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("Shortage risk heatmap")}</h3>
            <Select label="Component" value={heatComp} onChange={setHeatComp} options={OPT.comps} />
          </div>
          <Heatmap
            rows={facsInView.map((f) => [f.id, f.name])}
            cols={GROUPS.map((g) => [g, g])}
            cell={(fid, g) => { const a = analyseCell(model, cellKey(fid, g, heatComp), horizon); return a.fc.status === "ok" ? a.shortageProb : null; }}
            onPick={(fid, g) => { setFacId(fid); setGroup(g); setComp(heatComp); }}
          />
          <Provenance period={periodLabel} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Seasonal pattern (historical)")}</h3><span className="hint">{t("Monthly demand index, last 12 months (1.0 = average)")}</span></div>
          {agg.series.reduce((a, b) => a + b, 0) > 0 ? (
            <Bars rows={season.map((v, m) => ({ label: t(MONTHS[m]), value: v, display: v.toFixed(2), tone: v >= 1.15 ? "var(--accent)" : "var(--primary)" }))} />
          ) : <InsufficientData reason="No issues recorded for this selection." />}
          <p className="hint" style={{ marginTop: 10, fontSize: 11.5 }}>{t("One year of history; 2–3 years are needed to confirm a repeating season.")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("Locations requiring immediate attention")}</h3><span className="hint">{t("Blood bank × group cells with ≥50% shortage probability in the next {n} days", { n: horizon })}</span></div>
        {attention.length ? (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>{t("Blood bank")}</th><th>{t("Group")}</th><th>{t("Component")}</th><th>{t("Stock")}</th><th>{t("Forecast")}</th><th>{t("Depletes by")}</th><th>{t("Shortage prob.")}</th><th>{t("Status")}</th></tr></thead>
            <tbody>{attention.map((a) => (
              <tr key={a.key}>
                <td>{facById[a.facId].name}</td><td>{a.group}</td><td>{compById[a.comp].name}</td><td>{a.available}</td>
                <td>{a.fc.total.toFixed(1)}</td><td>{a.depletionDay ? t("day {n}", { n: a.depletionDay }) : "—"}</td>
                <td><span className="pill bad">{pct(a.shortageProb)}</span></td><td><StatusPill status={a.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="hint">{t("No location in this selection crosses the 50% threshold.")}</p>}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("AI recommendations: replenishment & redistribution")}</h3><span className="hint">{t("{n} recommendation(s) for this selection", { n: recs.length })}</span></div>
        <div className="grid cols-2">
          {recs.slice(0, 4).map((r) => <RecCard key={r.id} rec={r} user={user} toast={toast} setView={setView} />)}
        </div>
        {recs.length === 0 && <p className="hint">{t("No surplus source can safely cover a shortage in this selection.")}</p>}
        {recs.length > 4 && <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setView("map", { group, comp })}>{t("See all {n} in Supply Chain Intelligence →", { n: recs.length })}</button>}
      </div>
    </>
  );
}

