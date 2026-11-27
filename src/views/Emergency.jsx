import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useStore, useModel, now, createEmergency, transitionEmergency, EMERGENCY_STEPS, EMERGENCY_FLOW } from "../store.js";
import { scopeOf, whereOf, canEmergency, can } from "../access.js";
import { findSources, URGENCY_SLA_H, FACILITIES, facById, compById, districtById, GROUPS } from "../engine.js";
import { Stepper, Tabs, OPT, fmtDate, fmtH, Empty, Bars, exportCSV } from "../ui.jsx";

const URGENCY_RANK = { Critical: 0, Urgent: 1, Routine: 2 };
const OPEN = (r) => !["Fulfilled", "Closed", "Rejected"].includes(r.status);
const STATUS_CLS = { Submitted: "warn", "Under Review": "warn", "Source Identified": "warn", "Approval Pending": "warn", Approved: "ok", Processing: "ok", Fulfilled: "ok", Closed: "neutral", Rejected: "bad" };
const PATIENT_REF = /^[A-Za-z0-9/-]{3,24}$/;

// Time-based escalation: share of the urgency SLA already elapsed since submission
function escalation(r, clock) {
  if (!OPEN(r)) return null;
  const used = (clock - r.createdAt) / 3600000 / URGENCY_SLA_H[r.urgency];
  if (used >= 1.5) return { level: 3, label: "L3 · State/UT Administrator", cls: "bad" };
  if (used >= 1) return { level: 2, label: "L2 · District Administrator", cls: "bad" };
  if (used >= 0.5) return { level: 1, label: "L1 · Blood bank officer", cls: "warn" };
  return { level: 0, label: "Within SLA", cls: "ok" };
}

function NewRequest({ user, toast, onCreated }) {
  const { t } = useLang();
  const scope = scopeOf(user);
  const fac = scope.facId ? facById[scope.facId] : null;
  const [f, setF] = useState({
    destFacId: fac?.id || "", department: "", patientRef: "", group: "O-", comp: "PRBC", qty: 1, urgency: "Critical",
    requiredBy: new Date(now() + 2 * 3600000 + 5.5 * 3600000).toISOString().slice(0, 16), location: "", contact: "",
  });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    if (!f.destFacId || !f.department.trim() || !f.contact.trim() || !f.location.trim()) return setErr(t("Hospital, department, delivery location and contact are required."));
    if (!PATIENT_REF.test(f.patientRef)) return setErr(t("Patient reference must be the hospital reference number only (3–24 letters, digits, - or /). Do not enter patient names."));
    const qty = Number(f.qty);
    if (!(qty >= 1 && qty <= 50)) return setErr(t("Quantity must be between 1 and 50 units."));
    const requiredBy = Date.parse(f.requiredBy + ":00+05:30");
    if (!Number.isFinite(requiredBy)) return setErr(t("Enter a valid required date and time."));
    setErr("");
    const r = createEmergency({ ...f, qty, requiredBy, hospital: facById[f.destFacId].name, department: f.department.trim(), contact: f.contact.trim(), location: f.location.trim() }, user);
    toast(t("Emergency request {id} submitted.", { id: r.id }));
    onCreated(r.id);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-head"><h3>{t("Register emergency blood requirement")}</h3><span className="hint">{t("Minimum necessary personal information only")}</span></div>
      {err && <div className="auth-error">{err}</div>}
      <div className="form-grid">
        <label>{t("Hospital")}<select value={f.destFacId} onChange={set("destFacId")} disabled={!!fac}><option value="">—</option>{FACILITIES.filter((x) => scope.level === "all" || whereOf(scope)(x)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>{t("Requesting department")}<input value={f.department} maxLength={60} onChange={set("department")} placeholder="Trauma & Emergency" /></label>
        <label>{t("Patient / reference ID (no names)")}<input value={f.patientRef} maxLength={24} onChange={set("patientRef")} placeholder="LEH-TR-88214" /></label>
        <label>{t("Blood group")}<select value={f.group} onChange={set("group")}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label>{t("Component")}<select value={f.comp} onChange={set("comp")}>{OPT.comps.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>{t("Quantity (units)")}<input type="number" min="1" max="50" value={f.qty} onChange={set("qty")} /></label>
        <label>{t("Urgency")}<select value={f.urgency} onChange={set("urgency")}>{Object.keys(URGENCY_SLA_H).map((u) => <option key={u} value={u}>{t(u)} ({t("SLA {n} h", { n: URGENCY_SLA_H[u] })})</option>)}</select></label>
        <label>{t("Required by (IST)")}<input type="datetime-local" value={f.requiredBy} onChange={set("requiredBy")} /></label>
        <label>{t("Delivery location")}<input value={f.location} maxLength={80} onChange={set("location")} placeholder="Emergency OT, Block B" /></label>
        <label className="full">{t("Authorised requesting personnel — name, designation, phone")}<input value={f.contact} maxLength={100} onChange={set("contact")} placeholder="Dr. … (Duty MO), 01982-…" /></label>
      </div>
      <div className="row-actions" style={{ marginTop: 12 }}>
        <button className="btn accent" type="submit">{t("Submit emergency request")}</button>
        <span className="hint" style={{ fontSize: 11.5 }}>{t("Clinical compatibility, eligibility and transfusion decisions remain with authorised medical professionals.")}</span>
      </div>
    </form>
  );
}

function Detail({ r, user, toast, model }) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [src, setSrc] = useState(r.source || "");
  const s = useMemo(() => findSources(model, { group: r.group, comp: r.comp, qty: r.qty, destFacId: r.destFacId, requiredBy: r.requiredBy, now: now() }), [model, r]);
  const esc = escalation(r, now());

  function go(to) {
    const extra = { note };
    if (to === "Source Identified") { if (!src) return toast(t("Select a supply source first.")); extra.source = src; }
    if (to === "Rejected" && !note.trim()) return toast(t("A rejection reason is required."));
    try { transitionEmergency(r.id, to, user, extra); setNote(""); toast(t("{id} → {s}", { id: r.id, s: t(to) })); } catch (e) { toast(e.message); }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{r.id}: {r.qty} × {r.group} {compById[r.comp].name} — {r.hospital}</h3>
        <span className={`pill ${r.urgency === "Critical" ? "bad" : r.urgency === "Urgent" ? "warn" : "neutral"}`}>{t(r.urgency)}</span>
      </div>
      <Stepper steps={EMERGENCY_STEPS} current={r.status} />
      <div className="two-col" style={{ marginTop: 14 }}>
        <div>
          <div className="rec-grid">
            <div><b>{t("Department")}</b>{r.department}</div>
            <div><b>{t("Reference")}</b><span className="mono">{r.patientRef}</span></div>
            <div><b>{t("Required by")}</b>{fmtDate(r.requiredBy)}</div>
            <div><b>{t("Delivery location")}</b>{r.location}</div>
            <div><b>{t("Contact")}</b>{r.contact}</div>
            <div><b>{t("Escalation")}</b>{esc ? <span className={`pill ${esc.cls}`}>{t(esc.label)}</span> : "—"}</div>
            {r.source && <div><b>{t("Assigned source")}</b>{facById[r.source].name}</div>}
          </div>

          {OPEN(r) && (
            <div className="rec-card" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="badge demo">{t("Prediction")}</span><strong style={{ fontSize: 13 }}>{t("Potential fulfilment sources")}</strong></div>
              {s.delay && <div className="auth-error" style={{ margin: 0 }}>{t("Predicted delay")}: {s.delay}</div>}
              <div className="table-wrap"><table className="data">
                <thead><tr><th /><th>{t("Source")}</th><th>{t("Group")}</th><th>{t("Releasable")}</th><th>{t("Route")}</th><th>{t("ETA")}</th></tr></thead>
                <tbody>{s.rows.filter((x) => x.route.best && x.permitted).slice(0, 5).map((x) => (
                  <tr key={x.fac.id + x.group}>
                    <td><input type="radio" name={`src-${r.id}`} checked={src === x.fac.id} onChange={() => setSrc(x.fac.id)} aria-label={x.fac.name} disabled={r.status !== "Under Review"} /></td>
                    <td>{x.fac.name}{x === s.top && <span className="badge success" style={{ marginLeft: 6 }}>{t("Recommended")}</span>}</td>
                    <td>{x.group}</td><td>{x.releasable >= r.qty ? <span className="pill ok">{x.releasable}</span> : <span className="pill warn">{x.releasable}</span>}</td>
                    <td>{x.route.best.mode === "air" ? `${t("Air")} ${x.route.best.airLeg}` : t("Road")}</td><td>{fmtH(x.route.best.hours)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              {s.alternatives.length > 0 && <ul>{s.alternatives.map((a, i) => <li key={i}>{a}</li>)}</ul>}
              <span className="hint" style={{ fontSize: 11 }}>{s.groupsConsidered.length > 1 ? t("Includes compatible groups enabled by the medical officer.") : t("Exact group match only.")} {t("Source stock is never drawn below 50% of its minimum level.")}</span>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 12 }}><label className="full">{t("Note / reason")}<input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></label></div>
          <div className="row-actions" style={{ marginTop: 10 }}>
            {(EMERGENCY_FLOW[r.status] || []).map((to) => canEmergency(user, r, to)
              ? <button key={to} className={`btn sm ${to === "Rejected" ? "danger" : "primary"}`} onClick={() => go(to)}>{t(to === "Source Identified" ? "Confirm selected source" : to === "Approval Pending" ? "Submit for approval" : to)}</button>
              : <span key={to} className="hint" style={{ fontSize: 11.5 }}>{t("Next: {a} — not permitted for your role/jurisdiction", { a: t(to) })}</span>)}
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: 12.5, marginBottom: 6 }}>{t("Tracking history")}</h4>
          <div className="timeline">
            {[...r.history].reverse().map(([st, ts, by, n], i) => (
              <div className="t-row" key={i}><div className="t-dot" style={{ background: "var(--primary)" }} /><div className="t-body"><div className="t-title">{t(st)}</div><div className="t-meta">{fmtDate(ts)}{by ? ` · ${by}` : ""}{n ? ` · ${n}` : ""}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Emergency({ user, params = {}, toast }) {
  const { t } = useLang();
  const model = useModel();
  const all = useStore((s) => s.emergencies);
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const clock = now();
  const [tab, setTab] = useState(params.tab || "queue");
  const [openId, setOpenId] = useState(params.id || null);
  const [qf, setQf] = useState("open");

  // hospitals and blood banks see requests to/from their facility; officials see their jurisdiction
  const mine = all.filter((r) => where(facById[r.destFacId]) || (r.source && scope.facId === r.source));
  const queue = mine
    .filter((r) => (qf === "open" ? OPEN(r) : qf === "overdue" ? OPEN(r) && clock > r.requiredBy : qf === "all" ? true : r.urgency === qf))
    .sort((a, b) => (OPEN(b) - OPEN(a)) || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.requiredBy - b.requiredBy);
  const overdue = mine.filter((r) => OPEN(r) && clock > r.requiredBy);
  const cur = all.find((r) => r.id === openId);

  const fulfilled = mine.filter((r) => r.history.some((h) => h[0] === "Fulfilled"));
  const fillTimes = fulfilled.map((r) => (r.history.find((h) => h[0] === "Fulfilled")[1] - r.createdAt) / 3600000);
  const avgFill = fillTimes.length ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : null;
  const countBy = (fn) => Object.entries(mine.reduce((m, r) => ((m[fn(r)] = (m[fn(r)] || 0) + r.qty), m), {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      {overdue.length > 0 && (
        <div className="alert-banner"><strong>{t("{n} unfulfilled request(s) past their required time", { n: overdue.length })}</strong>&nbsp;— {overdue.map((r) => r.id).join(", ")}
          <button onClick={() => { setTab("queue"); setQf("overdue"); }}>{t("Show →")}</button>
        </div>
      )}
      <div className="panel">
        <Tabs value={tab} onChange={setTab} tabs={[["queue", `Operational queue (${mine.filter(OPEN).length})`], ...(can(user, "emergency.create") ? [["new", "New request"]] : []), ["analytics", "Analytics"]]} />
      </div>

      {tab === "new" && <NewRequest user={user} toast={toast} onCreated={(id) => { setOpenId(id); setTab("queue"); }} />}

      {tab === "queue" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h3>{t("Urgency-based queue")}</h3>
              <Tabs value={qf} onChange={setQf} tabs={[["open", "Open"], ["Critical", "Critical"], ["Urgent", "Urgent"], ["Routine", "Routine"], ["overdue", "Overdue"], ["all", "All"]]} />
            </div>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("ID")}</th><th>{t("Hospital")}</th><th>{t("Requirement")}</th><th>{t("Urgency")}</th><th>{t("Required by")}</th><th>{t("Time left")}</th><th>{t("Escalation")}</th><th>{t("Status")}</th></tr></thead>
              <tbody>
                {queue.map((r) => {
                  const left = (r.requiredBy - clock) / 3600000;
                  const e = escalation(r, clock);
                  return (
                    <tr key={r.id} className={`clickable${openId === r.id ? " sel" : ""}`} onClick={() => setOpenId(r.id)}>
                      <td className="mono">{r.id}</td><td>{r.hospital}</td><td>{r.qty} × {r.group} {r.comp}</td>
                      <td><span className={`pill ${r.urgency === "Critical" ? "bad" : r.urgency === "Urgent" ? "warn" : "neutral"}`}>{t(r.urgency)}</span></td>
                      <td>{fmtDate(r.requiredBy)}</td>
                      <td>{OPEN(r) ? (left < 0 ? <span className="pill bad">{t("overdue {h}", { h: fmtH(-left) })}</span> : fmtH(left)) : "—"}</td>
                      <td>{e ? <span className={`pill ${e.cls}`}>{t(e.label)}</span> : "—"}</td>
                      <td><span className={`pill ${STATUS_CLS[r.status]}`}>{t(r.status)}</span></td>
                    </tr>
                  );
                })}
                {queue.length === 0 && <tr><td colSpan={8}><Empty>{t("No requests in this queue.")}</Empty></td></tr>}
              </tbody>
            </table></div>
          </div>
          {cur && <Detail key={cur.id + cur.status} r={cur} user={user} toast={toast} model={model} />}
        </>
      )}

      {tab === "analytics" && (
        <>
          <div className="grid cols-4">
            <div className="kpi"><div className="num">{avgFill == null ? "—" : fmtH(avgFill)}</div><div className="lbl">{t("Average fulfilment time ({n} fulfilled)", { n: fillTimes.length })}</div></div>
            <div className="kpi"><div className="num">{mine.filter(OPEN).length}</div><div className="lbl">{t("Pending emergency requests")}</div></div>
            <div className="kpi"><div className="num">{overdue.length}</div><div className="lbl">{t("Unfulfilled past required time")}</div></div>
            <div className="kpi"><div className="num">{mine.filter((r) => r.status === "Rejected").length}</div><div className="lbl">{t("Rejected")}</div></div>
          </div>
          <div className="two-col">
            <div className="panel"><div className="panel-head"><h3>{t("Emergency demand by district (units)")}</h3></div><Bars rows={countBy((r) => districtById[facById[r.destFacId].district].name)} /></div>
            <div className="panel"><div className="panel-head"><h3>{t("Emergency demand by blood group (units)")}</h3></div><Bars rows={countBy((r) => r.group)} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{t("Unfulfilled request analysis")}</h3>
              <button className="btn sm" onClick={() => exportCSV("emergency-requests", ["ID", "Hospital", "Group", "Component", "Qty", "Urgency", "Status", "Created", "Required by"], mine.map((r) => [r.id, r.hospital, r.group, r.comp, r.qty, r.urgency, r.status, new Date(r.createdAt).toISOString(), new Date(r.requiredBy).toISOString()]))}>{t("Export CSV")}</button>
            </div>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("ID")}</th><th>{t("Requirement")}</th><th>{t("Status")}</th><th>{t("Likely cause (AI)")}</th></tr></thead>
              <tbody>{mine.filter((r) => OPEN(r) || r.status === "Rejected").map((r) => {
                const s = findSources(model, { group: r.group, comp: r.comp, qty: r.qty, destFacId: r.destFacId, requiredBy: r.requiredBy, now: clock });
                return <tr key={r.id}><td className="mono">{r.id}</td><td>{r.qty} × {r.group} {r.comp} → {r.hospital}</td><td>{t(r.status)}</td><td className="hint">{s.delay || (r.status === "Rejected" ? r.history.at(-1)[3] || t("Rejected by approver") : t("Awaiting workflow action"))}</td></tr>;
              })}</tbody>
            </table></div>
          </div>
        </>
      )}
    </>
  );
}
