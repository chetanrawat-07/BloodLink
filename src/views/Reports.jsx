import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useModel, useStore, audit } from "../store.js";
import { scopeOf, whereOf, can } from "../access.js";
import { REPORTS, buildReport } from "../reports.js";
import { STATES } from "../engine.js";
import { Tabs, Select, OPT, exportCSV, printPDF, Bars, Provenance } from "../ui.jsx";

// tab: "reports" | "performance" | "wastage" (separate nav entries share this view)
export default function Reports({ user, tab = "reports", params = {}, toast }) {
  const { t } = useLang();
  const model = useModel();
  const transfers = useStore((s) => s.transfers);
  const emergencies = useStore((s) => s.emergencies);
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const [id, setId] = useState(params.report || (tab === "performance" ? "district" : tab === "wastage" ? "wastage" : "daily"));
  const [state, setState] = useState("all");

  const w = (f) => where(f) && (state === "all" || f.state === state);
  const label = state === "all" ? scope.label || "All participating States/UTs" : STATES.find((s) => s.id === state).name;
  const rep = useMemo(() => buildReport(id, model, { where: w, transfers, emergencies, scopeLabel: label }), [id, model, state, transfers, emergencies]); // eslint-disable-line react-hooks/exhaustive-deps
  const allowed = can(user, "reports.export");

  function exp(kind) {
    const name = `${rep.title} — ${label}`;
    if (kind === "csv") exportCSV(`${id}-report-${state}`, rep.columns, rep.rows, [name, rep.period, ...rep.meta, ...rep.notes]);
    else if (!printPDF(name, [rep.period, ...rep.meta], rep.columns, rep.rows, rep.notes)) return toast(t("Allow pop-ups to export PDF."));
    audit(user, "report.exported", `${rep.title} (${label}) as ${kind.toUpperCase()}`);
  }

  const choices = tab === "performance" ? REPORTS.filter(([r]) => ["district", "supply", "monthly"].includes(r)) : tab === "wastage" ? REPORTS.filter(([r]) => ["wastage", "weekly"].includes(r)) : REPORTS;

  // wastage chart: top 5 facilities by discarded units (recorded) in the last 90 days
  const top5 = useMemo(() => {
    if (id !== "wastage") return [];
    const m = {};
    for (const r of rep.rows) m[r[0]] = (m[r[0]] || 0) + r[3];
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [rep, id]);

  return (
    <>
      <div className="panel">
        <div className="filters">
          <div className="fsel"><span>{t("Report")}</span><Tabs value={id} onChange={setId} tabs={choices} /></div>
        </div>
        <div className="filters" style={{ marginTop: 10 }}>
          {scope.level === "all" && <Select label="State/UT" value={state} onChange={setState} options={OPT.states} allLabel="All States/UTs" />}
          {allowed ? (
            <div className="row-actions">
              <button className="btn sm" onClick={() => exp("csv")}>{t("Export CSV")}</button>
              <button className="btn sm" onClick={() => exp("pdf")}>{t("Export PDF")}</button>
            </div>
          ) : <span className="hint">{t("Your role cannot export reports.")}</span>}
        </div>
      </div>

      {top5.length > 0 && (
        <div className="panel"><div className="panel-head"><h3>{t("Top five facilities by wastage (units discarded, 90 days)")}</h3><span className="badge neutral">{t("Recorded")}</span></div><Bars rows={top5} unit=" u" /></div>
      )}

      <div className="panel">
        <div className="panel-head"><h3>{t(rep.title)}</h3><span className="hint">{rep.period} · {label}</span></div>
        <div className="table-wrap"><table className="data">
          <thead><tr>{rep.columns.map((c) => <th key={c}>{t(c)}</th>)}</tr></thead>
          <tbody>{rep.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table></div>
        {rep.rows.length === 0 && <p className="hint">{t("No rows for this jurisdiction.")}</p>}
        {rep.notes.map((n) => <p key={n} className="hint" style={{ fontSize: 11.5, marginTop: 8 }}>ℹ {t(n)}</p>)}
        <Provenance period={rep.period} />
      </div>
    </>
  );
}
