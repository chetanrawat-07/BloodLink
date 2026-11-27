import { useMemo, useState } from "react";
import { inventory } from "../data.js";
import { useLang } from "../i18n.jsx";
import { useModel, useStore } from "../store.js";
import { scopeOf, whereOf } from "../access.js";
import {
  analyseAll, analyseCell, inventoryAlerts, recommendTransfers, daysLeft, expiryRisk,
  FACILITIES, COMPONENTS, STATES, compById, facById, districtById,
} from "../engine.js";
import { Provenance, Select, Tabs, OPT, StatusPill, exportCSV, fmtDay, Empty } from "../ui.jsx";
import RecCard from "./RecCard.jsx";

// ---------- original prototype table (kept as-is) ----------
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

function ColdChainWatch({ regionFilter }) {
  const { t } = useLang();
  const [filter, setFilter] = useState("all");
  const rows = inventory
    .filter((u) => (filter === "all" || u.comp.includes(filter)) && (regionFilter === "all" || u.region === regionFilter))
    .sort((a, b) => a.expiry - b.expiry);

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>{t("Cold-chain watch (original prototype sample)")}</h3>
          <span className="hint">
            {t("Sorted oldest‑expiry‑first (FIFO) to minimise wastage · each unit is ISBT‑128 tagged and tracked individually")}
          </span>
        </div>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {COMPS.map((c) => (
            <button key={c.id} className={`chip${filter === c.id ? " active" : ""}`} onClick={() => setFilter(c.id)}>
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
                    {u.temp.includes("⚠") ? <span style={{ color: "var(--critical)", fontWeight: 600 }}>{u.temp}</span> : u.temp}
                  </td>
                  <td><span className={`pill ${STATUS_CLS[u.status]}`}>{t(u.status)}</span></td>
                  <td><span className="hash">{u.hash}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="hint">{t("No units match this filter.")}</td></tr>}
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

// ---------- Smart Inventory Intelligence ----------
const GROUP_BY = [["group", "Blood group"], ["comp", "Component"], ["facId", "Blood bank"], ["district", "District"], ["state", "State/UT"]];
const labelOf = (dim, v) => (dim === "comp" ? compById[v].name : dim === "facId" ? facById[v].name : dim === "district" ? districtById[v].name : dim === "state" ? STATES.find((s) => s.id === v).name : v);
const AGE_BUCKETS = ["0–25%", "25–50%", "50–75%", "75–100%"];

export default function Inventory({ user, params = {}, setView, toast }) {
  const { t } = useLang();
  const model = useModel();
  const ledger = useStore((s) => s.ledger);
  const cfg = model.config;
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const [tab, setTab] = useState(params.tab || "overview");
  const [state, setState] = useState(scope.level === "state" || scope.level === "district" ? scope.state : "all");
  const [facId, setFacId] = useState(scope.facId || "all");
  const [comp, setComp] = useState(params.comp || "all");
  const [group, setGroup] = useState(params.group || "all");
  const [dim, setDim] = useState("group");
  const [risk, setRisk] = useState("near");
  const [alertType, setAlertType] = useState("all");
  const [fefoKey, setFefoKey] = useState(null);

  const facs = FACILITIES.filter((f) => where(f) && (state === "all" || f.state === state) && (facId === "all" || f.id === facId));
  const facSet = new Set(facs.map((f) => f.id));
  const inSel = (f) => facSet.has(f.id);
  const analyses = useMemo(() => analyseAll(model, { comp, group, where: inSel }), [model, comp, group, state, facId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tot = analyses.reduce((s, a) => ({ available: s.available + a.available, reserved: s.reserved + a.reserved, quarantined: s.quarantined + a.quarantined, unusable: s.unusable + a.unusable }), { available: 0, reserved: 0, quarantined: 0, unusable: 0 });

  const grouped = useMemo(() => {
    const m = new Map();
    for (const a of analyses) {
      const k = a[dim];
      const r = m.get(k) || { k, available: 0, reserved: 0, quarantined: 0, unusable: 0, mu: 0, critical: 0, surplus: 0 };
      r.available += a.available; r.reserved += a.reserved; r.quarantined += a.quarantined; r.unusable += a.unusable; r.mu += a.mu;
      if (a.status === "critical" || a.status === "low") r.critical++;
      if (a.status === "surplus") r.surplus++;
      m.set(k, r);
    }
    return [...m.values()];
  }, [analyses, dim]);

  // tx lookup for the "blockchain entry" column
  const txByUnit = useMemo(() => { const m = {}; for (const b of ledger) if (b.payload?.unitId) m[b.payload.unitId] = b.txId; return m; }, [ledger]);
  const wasteIds = useMemo(() => new Set(analyses.flatMap((a) => a.waste.map((u) => u.id))), [analyses]);

  const units = useMemo(() => analyses.flatMap((a) => model.byKey.get(a.key).units.filter((u) => u.status === "Available").slice(0, a.available)), [analyses, model]);
  const riskUnits = units.filter((u) => { const r = expiryRisk(u, cfg); return risk === "near" ? r === "critical" || r === "warning" : r === risk; }).sort((a, b) => a.expiry - b.expiry);

  const ageing = COMPONENTS.filter((c) => comp === "all" || c.id === comp).map((c) => {
    const b = [0, 0, 0, 0];
    for (const u of units) if (u.comp === c.id) b[Math.min(3, Math.floor((1 - daysLeft(u) / c.shelf) * 4))]++;
    return { c, b };
  });

  const alerts = useMemo(() => inventoryAlerts(model, inSel), [model, state, facId]); // eslint-disable-line react-hooks/exhaustive-deps
  const recs = useMemo(() => recommendTransfers(model, { group, comp, where: inSel }), [model, group, comp, state, facId]); // eslint-disable-line react-hooks/exhaustive-deps
  const optimise = analyses.filter((a) => a.status !== "low-volume" && a.status !== "ok").sort((a, b) => a.daysCover - b.daysCover);

  const fefoCell = fefoKey ? analyseCell(model, fefoKey) : null;

  return (
    <>
      <div className="panel">
        <div className="filters">
          {scope.level === "all" && <Select label="State/UT" value={state} onChange={(v) => { setState(v); setFacId("all"); }} options={OPT.states} allLabel="All States/UTs" />}
          {scope.level !== "facility" && <Select label="Blood bank" value={facId} onChange={setFacId} options={FACILITIES.filter((f) => where(f) && (state === "all" || f.state === state)).map((f) => [f.id, f.name])} allLabel="All blood banks" />}
          <Select label="Blood group" value={group} onChange={setGroup} options={OPT.groups} allLabel="All groups" />
          <Select label="Component" value={comp} onChange={setComp} options={OPT.comps} allLabel="All components" />
        </div>
        <div style={{ marginTop: 12 }}>
          <Tabs value={tab} onChange={setTab} tabs={[["overview", "Inventory overview"], ["expiry", "Expiry intelligence"], ["optimise", "Stock optimisation"], ["alerts", `Alerts (${alerts.length})`], ["recs", `Recommendations (${recs.length})`]]} />
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="grid cols-4">
            <div className="kpi"><div className="num">{tot.available.toLocaleString()}</div><div className="lbl">{t("Available")}</div></div>
            <div className="kpi"><div className="num">{tot.reserved}</div><div className="lbl">{t("Reserved (cross-matched)")}</div></div>
            <div className="kpi"><div className="num">{tot.quarantined}</div><div className="lbl">{t("Quarantined (TTI testing pending)")}</div></div>
            <div className="kpi"><div className="num">{tot.unusable}</div><div className="lbl">{t("Unusable (expired / failed)")}</div></div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <h3>{t("Inventory by {dim}", { dim: t(GROUP_BY.find((g) => g[0] === dim)[1]).toLowerCase() })}</h3>
              <div className="row-actions">
                <Tabs value={dim} onChange={setDim} tabs={GROUP_BY} />
                <button className="btn sm" onClick={() => exportCSV(`inventory-by-${dim}`, ["Segment", "Available", "Reserved", "Quarantined", "Unusable", "Days cover", "Cells low/critical", "Cells surplus"], grouped.map((r) => [labelOf(dim, r.k), r.available, r.reserved, r.quarantined, r.unusable, r.mu > 0 ? (r.available / r.mu).toFixed(1) : "", r.critical, r.surplus]), ["Simulated demonstration dataset"])}>{t("Export CSV")}</button>
              </div>
            </div>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("Segment")}</th><th>{t("Available")}</th><th>{t("Reserved")}</th><th>{t("Quarantined")}</th><th>{t("Unusable")}</th><th>{t("Days of cover")}</th><th>{t("Low / critical cells")}</th><th>{t("Surplus cells")}</th></tr></thead>
              <tbody>{grouped.map((r) => (
                <tr key={r.k}>
                  <td><strong>{labelOf(dim, r.k)}</strong></td><td>{r.available}</td><td>{r.reserved}</td><td>{r.quarantined}</td><td>{r.unusable}</td>
                  <td>{r.mu > 0 ? (r.available / r.mu).toFixed(1) : "—"}</td>
                  <td>{r.critical ? <span className="pill bad">{r.critical}</span> : 0}</td><td>{r.surplus ? <span className="pill neutral">{r.surplus}</span> : 0}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <Provenance period="Current stock snapshot" />
          </div>
          <ColdChainWatch regionFilter={state} />
        </>
      )}

      {tab === "expiry" && (
        <>
          <div className="panel">
            <div className="panel-head"><h3>{t("Expiry warning thresholds")}</h3><span className="hint">{t("Configurable by the Super Administrator in System Configuration")}</span></div>
            <div className="chip-row">{COMPONENTS.map((c) => <span key={c.id} className="chip">{c.name}: {t("critical ≤{a} d, warning ≤{b} d", { a: cfg.expiry[c.id].critical, b: cfg.expiry[c.id].warning })}</span>)}</div>
          </div>
          <div className="two-col">
            <div className="panel">
              <div className="panel-head"><h3>{t("Inventory ageing (share of shelf life used)")}</h3></div>
              <div className="table-wrap"><table className="data">
                <thead><tr><th>{t("Component")}</th>{AGE_BUCKETS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
                <tbody>{ageing.map(({ c, b }) => <tr key={c.id}><td>{c.name}</td>{b.map((v, i) => <td key={i}>{i === 3 && v ? <span className="pill warn">{v}</span> : v}</td>)}</tr>)}</tbody>
              </table></div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{t("Wastage prediction")}</h3><span className="badge demo">{t("Prediction")}</span></div>
              <div className="kpi"><div className="num">{wasteIds.size}</div><div className="lbl">{t("Available units predicted to expire before use (FEFO simulation against forecast demand)")}</div></div>
              <p className="hint" style={{ marginTop: 10, fontSize: 11.8 }}>{t("Units issued oldest-expiry-first at the forecast rate; flagged if their turn comes after expiry.")}</p>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <h3>{t("Unit-level expiry tracking")}</h3>
              <div className="row-actions">
                <Tabs value={risk} onChange={setRisk} tabs={[["near", "Near expiry"], ["critical", "Critical"], ["warning", "Warning"], ["expired", "Expired"]]} />
                <button className="btn sm" onClick={() => exportCSV("near-expiry-units", ["Unit ID", "Blood bank", "Group", "Component", "Expiry", "Days left", "Risk", "Predicted waste", "Ledger tx"], riskUnits.map((u) => [u.id, facById[u.facId].name, u.group, u.comp, new Date(u.expiry).toISOString().slice(0, 10), daysLeft(u).toFixed(1), expiryRisk(u, cfg), wasteIds.has(u.id) ? "yes" : "no", txByUnit[u.id] || ""]))}>{t("Export CSV")}</button>
              </div>
            </div>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("Unit ID")}</th><th>{t("Blood bank")}</th><th>{t("Group")}</th><th>{t("Component")}</th><th>{t("Expires")}</th><th>{t("Days left")}</th><th>{t("Risk")}</th><th>{t("Predicted waste")}</th><th>{t("Blockchain entry")}</th></tr></thead>
              <tbody>
                {riskUnits.slice(0, 120).map((u) => {
                  const r = expiryRisk(u, cfg);
                  return (
                    <tr key={u.id}>
                      <td className="mono">{u.id}</td><td>{facById[u.facId].name}</td><td>{u.group}</td><td>{compById[u.comp].name}</td>
                      <td>{fmtDay(u.expiry)}</td><td>{daysLeft(u).toFixed(1)}</td>
                      <td><span className={`pill ${r === "critical" || r === "expired" ? "bad" : r === "warning" ? "warn" : "ok"}`}>{t(r)}</span></td>
                      <td>{wasteIds.has(u.id) ? <span className="pill bad">{t("likely")}</span> : "—"}</td>
                      <td>{txByUnit[u.id] ? <button className="hash clickable" onClick={() => setView("ledger", { unitId: u.id })}>{txByUnit[u.id].slice(0, 10)}…</button> : <span className="hint">{t("not anchored")}</span>}</td>
                    </tr>
                  );
                })}
                {riskUnits.length === 0 && <tr><td colSpan={9} className="hint">{t("No units in this risk band.")}</td></tr>}
              </tbody>
            </table></div>
            {riskUnits.length > 120 && <p className="hint" style={{ marginTop: 8 }}>{t("Showing 120 of {n} — export for the full list.", { n: riskUnits.length })}</p>}
            <Provenance period="Remaining shelf life as of last refresh" />
          </div>
        </>
      )}

      {tab === "optimise" && (
        <>
          <div className="panel">
            <div className="panel-head"><h3>{t("Recommended minimum / maximum stock levels")}</h3><span className="hint">{t("Cells outside their band, most urgent first. Healthy and low-volume cells hidden.")}</span></div>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("Blood bank")}</th><th>{t("Group")}</th><th>{t("Component")}</th><th>{t("Available")}</th><th>{t("Min")}</th><th>{t("Max")}</th><th>{t("Days cover")}</th><th>{t("Status")}</th><th>{t("Suggested")}</th><th>{t("FEFO")}</th></tr></thead>
              <tbody>{optimise.slice(0, 80).map((a) => (
                <tr key={a.key}>
                  <td>{facById[a.facId].name}</td><td>{a.group}</td><td>{compById[a.comp].name}</td><td>{a.available}</td><td>{a.minLevel}</td><td>{a.maxLevel}</td>
                  <td>{Number.isFinite(a.daysCover) ? a.daysCover.toFixed(1) : "—"}</td><td><StatusPill status={a.status} /></td>
                  <td className="hint">{a.status === "surplus" ? t("release up to {n}", { n: a.releasable }) : t("replenish {n}", { n: Math.max(0, a.minLevel - a.available) })}</td>
                  <td><button className="btn sm ghost" onClick={() => setFefoKey(a.key)}>{t("Issue order")}</button></td>
                </tr>
              ))}</tbody>
            </table></div>
            <p className="hint" style={{ marginTop: 8, fontSize: 11.5 }}>{t("Min = lead-time demand + 95% safety stock. Max = demand × cover days, capped at 60% of shelf life.")}</p>
          </div>
          {fefoCell && (
            <div className="panel">
              <div className="panel-head"><h3>{t("FEFO issue order — {f}, {g} {c}", { f: facById[fefoCell.facId].name, g: fefoCell.group, c: compById[fefoCell.comp].name })}</h3><button className="btn sm ghost" onClick={() => setFefoKey(null)}>✕</button></div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12.5 }}>
                {model.byKey.get(fefoCell.key).units.filter((u) => u.status === "Available").slice(0, Math.min(12, fefoCell.available)).map((u) => (
                  <li key={u.id}><span className="mono">{u.id}</span> — {t("expires {d} ({n} d left)", { d: fmtDay(u.expiry), n: daysLeft(u).toFixed(1) })} {fefoCell.waste.some((w) => w.id === u.id) && <span className="pill bad">{t("transfer or use first")}</span>}</li>
                ))}
              </ol>
              {fefoCell.available === 0 && <Empty>{t("No available units in this cell.")}</Empty>}
            </div>
          )}
        </>
      )}

      {tab === "alerts" && (
        <div className="panel">
          <div className="panel-head">
            <h3>{t("Inventory alerts")}</h3>
            <Tabs value={alertType} onChange={setAlertType} tabs={[["all", "All"], ["Critical stock", "Critical stock"], ["Low stock", "Low stock"], ["Near expiry", "Near expiry"], ["Unusual consumption", "Unusual consumption"], ["Delayed update", "Delayed update"]]} />
          </div>
          <div className="timeline">
            {alerts.filter((a) => alertType === "all" || a.type === alertType).slice(0, 150).map((a, i) => (
              <div className="t-row" key={i}>
                <div className="t-dot" style={{ background: a.sev === "critical" ? "var(--critical)" : "var(--warning)" }} />
                <div className="t-body">
                  <div className="t-title">{t(a.type)}: {a.text}</div>
                  <div className="t-meta">{facById[a.facId].name}</div>
                </div>
              </div>
            ))}
          </div>
          <Provenance period="As of last refresh" />
        </div>
      )}

      {tab === "recs" && (
        <div className="panel">
          <div className="panel-head"><h3>{t("Stock recommendations")}</h3><span className="hint">{t("Advisory only — every action needs authorised human approval")}</span></div>
          <div className="grid cols-2">{recs.slice(0, 20).map((r) => <RecCard key={r.id} rec={r} user={user} toast={toast} setView={setView} />)}</div>
          {recs.length === 0 && <Empty>{t("No safe redistribution found for this selection.")}</Empty>}
        </div>
      )}
    </>
  );
}
