import { useState } from "react";
import { useStore, useModel, now, createTransfer, transitionTransfer, TRANSFER_STEPS, TRANSFER_FLOW } from "../store.js";
import { scopeOf, whereOf, canTransfer, can } from "../access.js";
import { analyseCell, routeOptions, FACILITIES, facById, compById, cellKey } from "../engine.js";
import { useLang } from "../i18n.jsx";
import { Stepper, Tabs, OPT, fmtDate, fmtH, Empty, exportCSV } from "../ui.jsx";

const STATUS_CLS = { Draft: "neutral", "Pending Approval": "warn", Approved: "ok", Dispatched: "ok", "In Transit": "ok", Received: "ok", Closed: "neutral", Rejected: "bad", Cancelled: "neutral" };
const ACTION_LABEL = { "Pending Approval": "Submit for approval", Cancelled: "Cancel draft", Approved: "Approve", Rejected: "Reject", Dispatched: "Record dispatch", "In Transit": "Mark in transit", Received: "Record receipt & verify", Closed: "Close" };

function isDelayed(tr, clock) {
  return (tr.status === "Dispatched" || tr.status === "In Transit") && tr.dispatch?.eta && clock > tr.dispatch.eta;
}

export default function Transfers({ user, params = {}, toast }) {
  const { t } = useLang();
  const transfers = useStore((s) => s.transfers);
  const model = useModel();
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const clock = now();
  const [filter, setFilter] = useState("open");
  const [openId, setOpenId] = useState(params.id || null);
  const [form, setForm] = useState(null); // inputs for the pending action
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ from: "", to: scope.facId || "", group: "O-", comp: "PRBC", qty: 1, reason: "" });

  const mine = transfers.filter((tr) => where(facById[tr.from]) || where(facById[tr.to]));
  const shown = mine.filter((tr) =>
    filter === "all" ? true :
    filter === "open" ? !["Closed", "Rejected", "Cancelled"].includes(tr.status) :
    filter === "delayed" ? isDelayed(tr, clock) : tr.status === filter);
  const cur = transfers.find((x) => x.id === openId);

  const closed = mine.filter((x) => x.status === "Closed" || x.status === "Received");
  const durations = (a, b) => closed.map((x) => { const ta = x.history.find((h) => h[0] === a)?.[1], tb = x.history.find((h) => h[0] === b)?.[1]; return ta && tb ? (tb - ta) / 3600000 : null; }).filter((v) => v != null);
  const avg = (arr) => (arr.length ? arr.reduce((p, q) => p + q, 0) / arr.length : null);

  function act(to) {
    const extra = {};
    if (to === "Rejected" || to === "Approved") { if (to === "Rejected" && !form?.note) return toast(t("A rejection reason is required.")); extra.note = form?.note || ""; }
    if (to === "Dispatched") {
      if (!form?.vehicle || !form?.temp) return toast(t("Vehicle and dispatch temperature are required."));
      const r = routeOptions(facById[cur.from], facById[cur.to], cur.comp);
      extra.dispatch = { vehicle: form.vehicle, carrier: form.carrier || "", temp: form.temp, eta: now() + (r.best?.hours || 6) * 3600000 };
    }
    if (to === "Received") {
      const q = Number(form?.qty ?? cur.qty);
      if (!form?.temp || !Number.isFinite(q) || q < 0 || q > cur.qty) return toast(t("Enter received quantity (0–{n}) and arrival temperature.", { n: cur.qty }));
      extra.receipt = { qty: q, temp: form.temp, verifiedBy: user.name, note: form.note || "" };
      if (q < cur.qty) extra.note = `Short receipt: ${q}/${cur.qty}`;
    }
    try {
      transitionTransfer(cur.id, to, user, extra);
      setForm(null);
      toast(t("{id} → {s}", { id: cur.id, s: t(to) }));
    } catch (e) { toast(e.message); }
  }

  function create() {
    const q = Number(nf.qty);
    if (!nf.from || !nf.to || nf.from === nf.to || !(q > 0)) return toast(t("Choose two different facilities and a quantity above zero."));
    const tr = createTransfer({ from: nf.from, to: nf.to, group: nf.group, comp: nf.comp, qty: q, mode: routeOptions(facById[nf.from], facById[nf.to], nf.comp).best?.mode || "road", reason: nf.reason || "Manual request" }, user);
    setCreating(false); setOpenId(tr.id);
    toast(t("Draft {id} created.", { id: tr.id }));
  }
  const src = nf.from ? analyseCell(model, cellKey(nf.from, nf.group, nf.comp)) : null;

  return (
    <>
      <div className="grid cols-5">
        <div className="kpi"><div className="num">{mine.filter((x) => x.status === "Pending Approval").length}</div><div className="lbl">{t("Pending approval")}</div></div>
        <div className="kpi"><div className="num">{mine.filter((x) => ["Approved", "Dispatched", "In Transit"].includes(x.status)).length}</div><div className="lbl">{t("Active transfers")}</div></div>
        <div className="kpi"><div className="num">{mine.filter((x) => x.status === "In Transit").length}</div><div className="lbl">{t("In transit")}</div></div>
        <div className="kpi"><div className="num" style={{ color: mine.some((x) => isDelayed(x, clock)) ? "var(--critical)" : undefined }}>{mine.filter((x) => isDelayed(x, clock)).length}</div><div className="lbl">{t("Delayed (past ETA)")}</div></div>
        <div className="kpi"><div className="num">{avg(durations("Pending Approval", "Received")) == null ? "—" : fmtH(avg(durations("Pending Approval", "Received")))}</div><div className="lbl">{t("Avg submission → receipt ({n} completed)", { n: closed.length })}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Inter-facility transfers")}</h3>
          <div className="row-actions">
            <Tabs value={filter} onChange={setFilter} tabs={[["open", "Open"], ["Draft", "Draft"], ["Pending Approval", "Pending approval"], ["In Transit", "In transit"], ["delayed", "Delayed"], ["Closed", "Closed"], ["all", "All"]]} />
            {can(user, "transfer.create") && <button className="btn primary sm" onClick={() => setCreating((v) => !v)}>+ {t("New transfer request")}</button>}
            <button className="btn sm" onClick={() => exportCSV("transfers", ["ID", "From", "To", "Group", "Component", "Qty", "Status", "Created", "Created by", "Approved by"], shown.map((x) => [x.id, facById[x.from].name, facById[x.to].name, x.group, x.comp, x.qty, x.status, new Date(x.createdAt).toISOString(), x.createdBy, x.approvedBy || ""]))}>{t("Export CSV")}</button>
          </div>
        </div>

        {creating && (
          <div className="rec-card" style={{ marginBottom: 14 }}>
            <div className="form-grid">
              <label>{t("From (source)")}<select value={nf.from} onChange={(e) => setNf({ ...nf, from: e.target.value })}><option value="">—</option>{FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
              <label>{t("To (destination)")}<select value={nf.to} onChange={(e) => setNf({ ...nf, to: e.target.value })}><option value="">—</option>{OPT.facilities(scope.level === "all" ? null : where).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label>{t("Quantity")}<input type="number" min="1" value={nf.qty} onChange={(e) => setNf({ ...nf, qty: e.target.value })} /></label>
              <label>{t("Blood group")}<select value={nf.group} onChange={(e) => setNf({ ...nf, group: e.target.value })}>{OPT.groups.map(([v]) => <option key={v}>{v}</option>)}</select></label>
              <label>{t("Component")}<select value={nf.comp} onChange={(e) => setNf({ ...nf, comp: e.target.value })}>{OPT.comps.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label>{t("Reason")}<input value={nf.reason} maxLength={140} onChange={(e) => setNf({ ...nf, reason: e.target.value })} /></label>
            </div>
            {src && Number(nf.qty) > src.releasable && <div className="auth-error" style={{ margin: 0 }}>{t("Source has only {n} releasable units; this would take it below its minimum ({m}).", { n: src.releasable, m: src.minLevel })}</div>}
            <div className="row-actions"><button className="btn primary sm" onClick={create}>{t("Save as draft")}</button><button className="btn sm ghost" onClick={() => setCreating(false)}>{t("Cancel")}</button></div>
          </div>
        )}

        <div className="table-wrap"><table className="data">
          <thead><tr><th>{t("ID")}</th><th>{t("From → To")}</th><th>{t("Group / component")}</th><th>{t("Qty")}</th><th>{t("Status")}</th><th>{t("Last update")}</th></tr></thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.id} className={`clickable${openId === x.id ? " sel" : ""}`} onClick={() => { setOpenId(x.id); setForm(null); }}>
                <td className="mono">{x.id}{x.recId && <span className="badge demo" style={{ marginLeft: 6 }}>AI</span>}</td>
                <td>{facById[x.from].name} → {facById[x.to].name}</td>
                <td>{x.group} · {compById[x.comp].name}</td><td>{x.qty}</td>
                <td><span className={`pill ${STATUS_CLS[x.status]}`}>{t(x.status)}</span>{isDelayed(x, clock) && <span className="pill bad" style={{ marginLeft: 4 }}>{t("Delayed")}</span>}</td>
                <td>{fmtDate(x.history[x.history.length - 1][1])}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6}><Empty>{t("No transfers in this view.")}</Empty></td></tr>}
          </tbody>
        </table></div>
      </div>

      {cur && (
        <div className="panel">
          <div className="panel-head"><h3>{cur.id}: {cur.qty} × {cur.group} {compById[cur.comp].name}</h3><button className="btn sm ghost" onClick={() => setOpenId(null)}>✕</button></div>
          <Stepper steps={TRANSFER_STEPS} current={cur.status} />
          {["Rejected", "Cancelled"].includes(cur.status) && <div className="auth-error" style={{ marginTop: 10 }}>{t(cur.status)}{cur.note ? `: ${cur.note}` : ""}</div>}
          <div className="two-col" style={{ marginTop: 14 }}>
            <div>
              <div className="rec-grid">
                <div><b>{t("From")}</b>{facById[cur.from].name}</div>
                <div><b>{t("To")}</b>{facById[cur.to].name}</div>
                <div><b>{t("Mode")}</b>{cur.mode}</div>
                <div><b>{t("Reason")}</b>{cur.reason || "—"}</div>
                <div><b>{t("Created by")}</b>{cur.createdBy}</div>
                <div><b>{t("Approved by")}</b>{cur.approvedBy || "—"}</div>
                {cur.dispatch && <div><b>{t("Dispatch")}</b>{cur.dispatch.vehicle} · {cur.dispatch.carrier} · {cur.dispatch.temp} · ETA {fmtDate(cur.dispatch.eta)}</div>}
                {cur.receipt && <div><b>{t("Receipt")}</b>{cur.receipt.qty} {t("units")} · {cur.receipt.temp} · {t("verified by")} {cur.receipt.verifiedBy}</div>}
              </div>
              {cur.aiRationale && (
                <details style={{ marginTop: 10, fontSize: 12.3 }}>
                  <summary>{t("AI rationale attached to this draft")}</summary>
                  <ul>{cur.aiRationale.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
              <div className="row-actions" style={{ marginTop: 14 }}>
                {(TRANSFER_FLOW[cur.status] || []).map((to) => canTransfer(user, cur, to) ? (
                  <button key={to} className={`btn sm ${to === "Rejected" || to === "Cancelled" ? "danger" : "primary"}`} onClick={() => (["Dispatched", "Received", "Rejected", "Approved"].includes(to) && form?.to !== to ? setForm({ to }) : act(to))}>{t(ACTION_LABEL[to])}</button>
                ) : (
                  <span key={to} className="hint" style={{ fontSize: 11.5 }}>{t("Next: {a} — not permitted for your role/jurisdiction", { a: t(ACTION_LABEL[to]) })}{to === "Approved" && cur.createdById === user.id ? ` (${t("creator cannot approve own request")})` : ""}</span>
                ))}
              </div>
              {form?.to && (
                <div className="rec-card" style={{ marginTop: 10 }}>
                  <div className="form-grid">
                    {form.to === "Dispatched" && <>
                      <label>{t("Vehicle / flight no.")}<input value={form.vehicle || ""} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label>
                      <label>{t("Carrier")}<input value={form.carrier || ""} onChange={(e) => setForm({ ...form, carrier: e.target.value })} /></label>
                      <label>{t("Box temperature at dispatch")}<input placeholder="4.0°C" value={form.temp || ""} onChange={(e) => setForm({ ...form, temp: e.target.value })} /></label>
                    </>}
                    {form.to === "Received" && <>
                      <label>{t("Units received")}<input type="number" min="0" max={cur.qty} value={form.qty ?? cur.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></label>
                      <label>{t("Temperature on arrival")}<input placeholder="4.2°C" value={form.temp || ""} onChange={(e) => setForm({ ...form, temp: e.target.value })} /></label>
                    </>}
                    <label className="full">{form.to === "Rejected" ? t("Reason for rejection (required)") : t("Note")}<input value={form.note || ""} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value, qty: form.qty ?? cur.qty })} /></label>
                  </div>
                  <div className="row-actions"><button className="btn primary sm" onClick={() => act(form.to)}>{t("Confirm: {a}", { a: t(ACTION_LABEL[form.to]) })}</button><button className="btn sm ghost" onClick={() => setForm(null)}>{t("Cancel")}</button></div>
                </div>
              )}
              <p className="hint" style={{ fontSize: 11.3, marginTop: 10 }}>{t("Approval, dispatch and receipt are logged to the audit trail and ledger.")}</p>
            </div>
            <div>
              <h4 style={{ fontSize: 12.5, marginBottom: 6 }}>{t("Transaction history")}</h4>
              <div className="timeline">
                {[...cur.history].reverse().map(([s, ts, by, note], i) => (
                  <div className="t-row" key={i}><div className="t-dot" style={{ background: "var(--primary)" }} /><div className="t-body"><div className="t-title">{t(s)}</div><div className="t-meta">{fmtDate(ts)}{by ? ` · ${by}` : ""}{note ? ` · ${note}` : ""}</div></div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
