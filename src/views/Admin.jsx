import { useState } from "react";
import { useLang } from "../i18n.jsx";
import { useStore, setConfig, resetDemo, audit } from "../store.js";
import { getUsers, saveUsers } from "../useAuth.js";
import { ROLE_LABELS, STAFF_ROLES, PERMISSIONS, can, scopeOf } from "../access.js";
import { FACILITIES, STATES, DISTRICTS, COMPONENTS, districtById, DEFAULT_CONFIG } from "../engine.js";
import { fmtDate, exportCSV, Empty } from "../ui.jsx";

const SECURITY = [
  ["Role-based access & jurisdiction filtering", true],
  ["Separation of duties (creator cannot approve own transfer)", true],
  ["Audit trail for transfers, emergencies, config, exports, assistant queries", true],
  ["Idle session timeout", true],
  ["Data minimisation (no patient names; ledger stores request IDs only)", true],
  ["Tamper-evident hash chain for unit & transfer events", true],
  ["Encryption in transit (TLS 1.2+) — requires production hosting", false],
  ["Encryption at rest (DB / backups) — requires production backend", false],
  ["Server-side authentication, password hashing, MFA — prototype stores demo accounts in the browser", false],
  ["Secure API gateway, rate limiting, mTLS to e-RaktKosh", false],
  ["Backup & recovery, retention enforcement jobs", false],
  ["STQC / CERT-In audit, hosting in NIC / State Data Centre / MeitY-empanelled cloud", false],
];

function Users({ user, toast }) {
  const { t } = useLang();
  const [users, setUsers] = useState(getUsers);
  const scope = scopeOf(user);
  const [f, setF] = useState({ name: "", email: "", role: "centre", region: scope.state || "jk", district: "", facId: "" });
  const manageable = (u) => user.role === "super" || (u.role !== "super" && u.role !== "state" && u.region === scope.state);
  const visible = users.filter((u) => user.role === "super" || u.region === scope.state);

  function persist(next, action, detail) {
    saveUsers(next); setUsers(next); audit(user, action, detail);
  }
  function add(e) {
    e.preventDefault();
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return toast(t("Name and a valid email are required."));
    if (users.some((u) => u.email.toLowerCase() === f.email.toLowerCase())) return toast(t("An account with that email already exists."));
    if (user.role !== "super" && (f.role === "super" || f.role === "state" || f.region !== scope.state)) return toast(t("State administrators can only create district, blood bank and hospital accounts in their own State/UT."));
    const fac = FACILITIES.find((x) => x.id === f.facId);
    const nu = { id: "u" + Math.random().toString(36).slice(2, 9), name: f.name.trim(), email: f.email.trim().toLowerCase(), password: "demo123", role: f.role, region: f.region, district: f.district || undefined, facId: fac?.id, facility: fac?.name || null };
    persist([...users, nu], "user.created", `${nu.email} as ${ROLE_LABELS[nu.role]}`);
    setF({ ...f, name: "", email: "" });
    toast(t("Account created with temporary password demo123 (prototype)."));
  }

  return (
    <>
      {can(user, "users.manage") && (
        <form className="panel" onSubmit={add}>
          <div className="panel-head"><h3>{t("Create staff account")}</h3><span className="hint">{t("Public sign-up is limited to donors and blood centre staff.")}</span></div>
          <div className="form-grid">
            <label>{t("Name")}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>{t("Email")}<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            <label>{t("Role")}<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{STAFF_ROLES.filter((r) => user.role === "super" || !["super", "state", "official"].includes(r)).map((r) => <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>)}</select></label>
            <label>{t("State/UT")}<select value={f.region} disabled={user.role !== "super"} onChange={(e) => setF({ ...f, region: e.target.value, district: "", facId: "" })}>{STATES.map((s) => <option key={s.id} value={s.id}>{t(s.name)}</option>)}</select></label>
            {f.role === "district" && <label>{t("District")}<select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}><option value="">—</option>{DISTRICTS.filter((d) => d.state === f.region).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
            {(f.role === "centre" || f.role === "hospital") && <label>{t("Facility")}<select value={f.facId} onChange={(e) => setF({ ...f, facId: e.target.value })}><option value="">—</option>{FACILITIES.filter((x) => x.state === f.region).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
          </div>
          <button className="btn primary sm" type="submit" style={{ marginTop: 12 }}>{t("Create account")}</button>
        </form>
      )}
      <div className="panel">
        <div className="panel-head"><h3>{t("Accounts")}</h3><span className="hint">{t("{n} accounts in your jurisdiction", { n: visible.length })}</span></div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Role")}</th><th>{t("Jurisdiction")}</th><th>{t("Status")}</th><th /></tr></thead>
          <tbody>{visible.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td className="mono">{u.email}</td><td>{t(ROLE_LABELS[u.role] || u.role)}</td>
              <td>{u.facility || (u.district ? districtById[u.district]?.name : null) || (STATES.find((s) => s.id === u.region)?.name ?? (u.region === "all" ? t("All") : u.region))}</td>
              <td>{u.disabled ? <span className="pill bad">{t("Deactivated")}</span> : <span className="pill ok">{t("Active")}</span>}</td>
              <td>{can(user, "users.manage") && manageable(u) && u.id !== user.id && (
                <button className="btn sm ghost" onClick={() => persist(users.map((x) => (x.id === u.id ? { ...x, disabled: !x.disabled } : x)), u.disabled ? "user.reactivated" : "user.deactivated", u.email)}>{u.disabled ? t("Reactivate") : t("Deactivate")}</button>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}

const ACTION_LABELS = {
  "transfer.create": "Request blood from another centre",
  "transfer.approve": "Approve a blood transfer",
  "transfer.dispatch": "Send out blood units",
  "transfer.receive": "Confirm blood units received",
  "emergency.create": "Raise an emergency blood request",
  "emergency.review": "Check emergency requests",
  "emergency.approve": "Approve emergency requests",
  "integration.run": "Sync data with e-RaktKosh",
  "integration.configure": "Set up the e-RaktKosh connection",
  "config.edit": "Change system settings",
  "users.manage": "Add or remove users",
  "reports.export": "Download reports",
  "ledger.verify": "Verify the transfer record",
};

function Roles() {
  const { t } = useLang();
  const scopeText = { super: "Everything", state: "Own State/UT", district: "Own district", centre: "Own blood bank", hospital: "Own hospital's requests", official: "All States/UTs, read-only analytics" };
  return (
    <div className="panel">
      <div className="panel-head"><h3>{t("Who can do what")}</h3><span className="hint">{t("Each role only sees and acts on its own area")}</span></div>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>{t("Task")}</th>{STAFF_ROLES.map((r) => <th key={r}>{t(ROLE_LABELS[r])}</th>)}</tr></thead>
        <tbody>
          <tr><td><strong>{t("What they can see")}</strong></td>{STAFF_ROLES.map((r) => <td key={r} className="hint">{t(scopeText[r])}</td>)}</tr>
          {Object.entries(PERMISSIONS).map(([a, roles]) => <tr key={a}><td>{t(ACTION_LABELS[a] || a)}</td>{STAFF_ROLES.map((r) => <td key={r}>{roles.includes(r) ? <span title={t("Allowed")}>✓</span> : <span title={t("Not allowed")}>—</span>}</td>)}</tr>)}
        </tbody>
      </table></div>
    </div>
  );
}

function Facilities() {
  const { t } = useLang();
  return (
    <div className="panel">
      <div className="panel-head"><h3>{t("Participating blood banks")}</h3><span className="hint">{t("Master synchronised with e-RaktKosh codes (simulated)")}</span></div>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>{t("ID")}</th><th>{t("Name")}</th><th>{t("District")}</th><th>{t("State/UT")}</th><th>{t("e-RaktKosh code")}</th><th>{t("Nearest airport")}</th><th>{t("Last inventory update")}</th></tr></thead>
        <tbody>{FACILITIES.map((f) => (
          <tr key={f.id}><td className="mono">{f.id}</td><td>{f.name}</td><td>{districtById[f.district].name}</td><td>{t(STATES.find((s) => s.id === f.state).name)}</td><td className="mono">{f.ertk}</td><td>{f.airport} ({f.airKm} km)</td><td>{f.lastUpdateH} h</td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

function Config({ user, toast }) {
  const { t } = useLang();
  const cfg = useStore((s) => s.config);
  const editable = can(user, "config.edit");
  const [draft, setDraft] = useState(cfg);
  const num = (path, v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return;
    const next = structuredClone(draft);
    let o = next; for (const k of path.slice(0, -1)) o = o[k];
    o[path.at(-1)] = n;
    setDraft(next);
  };
  function save() {
    for (const c of COMPONENTS) if (draft.expiry[c.id].critical > draft.expiry[c.id].warning) return toast(t("Critical threshold must not exceed warning threshold ({c}).", { c: c.name }));
    setConfig(draft, user);
    toast(t("Configuration saved."));
  }
  const field = (label, path, step = 1) => (
    <label key={path.join(".")}>{t(label)}<input type="number" min="0" step={step} disabled={!editable} value={path.reduce((o, k) => o[k], draft)} onChange={(e) => num(path, e.target.value)} /></label>
  );

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>{t("Demonstration mode")}</h3>{!editable && <span className="hint">{t("Read-only for your role")}</span>}</div>
        <label className="cl-item"><input type="checkbox" disabled={!editable} checked={draft.demoMode} onChange={(e) => setDraft({ ...draft, demoMode: e.target.checked })} /> {t("Show simulated data and AI outputs. When off, AI modules show “Insufficient Data”.")}</label>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Expiry warning thresholds (days)")}</h3></div>
        <div className="form-grid">{COMPONENTS.flatMap((c) => [field(`${c.name} — critical`, ["expiry", c.id, "critical"]), field(`${c.name} — warning`, ["expiry", c.id, "warning"])])}</div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Stock optimisation & forecasting rules")}</h3></div>
        <div className="form-grid">
          {STATES.map((s) => field(`Replenishment lead time, ${s.name} (days)`, ["leadDays", s.id]))}
          {COMPONENTS.map((c) => field(`Max cover days, ${c.name}`, ["maxCoverDays", c.id]))}
          {field("Minimum units in 90 days for a forecast", ["minHistoryUnits"])}
          {field("Delayed-update alert after (hours)", ["delayedUpdateHours"])}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Regional transfer permissions & clinical rules")}</h3></div>
        <div className="checklist">
          {Object.keys(DEFAULT_CONFIG.interState).map((k) => {
            const [a, b] = k.split(">");
            return <label key={k} className="cl-item"><input type="checkbox" disabled={!editable} checked={draft.interState[k] !== false} onChange={(e) => setDraft({ ...draft, interState: { ...draft.interState, [k]: e.target.checked } })} /> {t("Allow transfers {a} → {b}", { a: STATES.find((s) => s.id === a).name, b: STATES.find((s) => s.id === b).name })}</label>;
          })}
          <label className="cl-item"><input type="checkbox" disabled={!editable} checked={draft.includeCompatible} onChange={(e) => {
            if (e.target.checked && !window.confirm(t("Enable compatible-group matching? This must be authorised by a medical officer; final compatibility decisions stay with clinicians."))) return;
            setDraft({ ...draft, includeCompatible: e.target.checked });
          }} /> {t("Include ABO/Rh-compatible red-cell groups in source search (medical-officer authorised)")}</label>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Security & retention")}</h3></div>
        <div className="form-grid">
          {field("Idle session timeout (minutes)", ["sessionMinutes"])}
          {field("Audit / operational data retention (days)", ["retentionDays"])}
        </div>
        <div className="checklist" style={{ marginTop: 14 }}>
          {SECURITY.map(([l, ok]) => <div key={l} className="cl-item"><span className={`pill ${ok ? "ok" : "warn"}`}>{ok ? t("In prototype") : t("Production requirement")}</span> {t(l)}</div>)}
        </div>
      </div>
      {editable && (
        <div className="row-actions">
          <button className="btn primary" onClick={save}>{t("Save configuration")}</button>
          <button className="btn" onClick={() => setDraft(cfg)}>{t("Discard changes")}</button>
          <button className="btn danger" onClick={() => { if (window.confirm(t("Reset all demo workflows, ledger and audit log to the original seed?"))) { resetDemo(user); setDraft(DEFAULT_CONFIG); toast(t("Demo data reset.")); } }}>{t("Reset demo data")}</button>
        </div>
      )}
    </>
  );
}

function Audit({ user }) {
  const { t } = useLang();
  const log = useStore((s) => s.audit);
  const retention = useStore((s) => s.config.retentionDays);
  const [q, setQ] = useState("");
  const rows = log.filter((e) => (user.role === "super" || e.role !== "super") && (!q || `${e.user} ${e.action} ${e.detail}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{t("Audit trail")}</h3>
        <div className="row-actions">
          <input className="fsel" style={{ minWidth: 220 }} placeholder={t("Filter by user, action or detail")} value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn sm" onClick={() => exportCSV("audit-log", ["Time", "User", "Role", "Action", "Detail"], rows.map((e) => [new Date(e.ts).toISOString(), e.user, e.role, e.action, e.detail]))}>{t("Export CSV")}</button>
        </div>
      </div>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>{t("Time")}</th><th>{t("User")}</th><th>{t("Role")}</th><th>{t("Action")}</th><th>{t("Detail")}</th></tr></thead>
        <tbody>{rows.slice(0, 300).map((e, i) => <tr key={i}><td>{fmtDate(e.ts)}</td><td>{e.user}</td><td>{t(ROLE_LABELS[e.role] || e.role)}</td><td className="mono">{e.action}</td><td>{e.detail}</td></tr>)}</tbody>
      </table></div>
      {rows.length === 0 && <Empty>{t("No entries.")}</Empty>}
      <p className="hint" style={{ fontSize: 11.5, marginTop: 8 }}>{t("Retention {d} days. Stored in this browser in the prototype.", { d: retention })}</p>
    </div>
  );
}

// tab: "users" | "roles" | "facilities" | "config" | "audit"
export default function Admin({ tab, user, toast }) {
  if (tab === "roles") return <Roles />;
  if (tab === "facilities") return <Facilities />;
  if (tab === "config") return <Config user={user} toast={toast} />;
  if (tab === "audit") return <Audit user={user} />;
  return <Users user={user} toast={toast} />;
}
