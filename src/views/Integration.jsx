import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useStore, addSyncRun, addImport, now, audit } from "../store.js";
import { can } from "../access.js";
import {
  INTEGRATION_STATUS, GROUP_MAP, COMPONENT_MAP, FIELDS, sampleDataset, validateRows, qualityByFacility, parseCSV, autoMap, TEMPLATE_CSV,
} from "../integration.js";
import { FACILITIES, STATES } from "../engine.js";
import { Tabs, fmtDate, Empty, pct, exportCSV } from "../ui.jsx";

// tab: "connection" | "sync" | "quality" (separate nav entries share this view)
export default function Integration({ user, tab: initial = "connection", toast }) {
  const { t } = useLang();
  const [tab, setTab] = useState(initial);
  const runs = useStore((s) => s.syncRuns);
  const imports = useStore((s) => s.imports);
  const staleH = useStore((s) => s.config.delayedUpdateHours);
  const canRun = can(user, "integration.run");
  const canConfig = can(user, "integration.configure");
  const [cfg, setCfg] = useState({ mode: "import", endpoint: "", clientId: "", auth: "OAuth 2.0 client credentials", schedule: "Every 6 hours" });
  const [testMsg, setTestMsg] = useState(null);
  const [csv, setCsv] = useState(null); // { file, headers, body, map }

  const sample = useMemo(() => validateRows(sampleDataset(), staleH), [staleH]);
  const lastRun = runs[0];
  const quality = useMemo(() => (lastRun ? qualityByFacility(validateRows(sampleDataset(), staleH), staleH) : null), [lastRun, staleH]);

  function testConnection() {
    if (!cfg.endpoint || !cfg.clientId) setTestMsg(["bad", t("Not tested: no endpoint or credentials configured. Live integration cannot be claimed until connectivity is tested and approved.")]);
    else setTestMsg(["warn", t("Configuration saved, but live connectivity cannot be tested from this prototype (no backend / API gateway). Status remains: pending authorised testing.")]);
    audit(user, "integration.test", `Connection test attempted (${cfg.endpoint || "no endpoint"})`);
  }

  function runSampleSync() {
    const started = now();
    const res = validateRows(sampleDataset(), staleH);
    addSyncRun({
      id: `SYNC-${runs.length + 1}`, ts: started, mode: "Sample dataset (simulated)", status: res.errors.length ? "Completed with errors" : "Completed",
      ok: res.ok.length, errors: res.errors.map((e) => ({ line: e.line, code: e.row.erk_code, msg: e.errors.join("; ") })), warnings: res.warnings.map((w) => w.msg),
      entities: ["Blood bank master", "Group & component mapping", "Inventory snapshot"],
    }, user);
    toast(t("Sample sync finished: {ok} records valid, {e} errors.", { ok: res.ok.length, e: res.errors.length }));
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return toast(t("Only .csv is supported in the prototype — save Excel sheets as CSV first."));
    if (file.size > 5 * 1024 * 1024) return toast(t("File too large (max 5 MB)."));
    const rows = parseCSV(await file.text());
    if (rows.length < 2) return toast(t("The file has no data rows."));
    setCsv({ file: file.name, headers: rows[0], body: rows.slice(1, 5001), map: autoMap(rows[0]) });
  }
  const mapped = csv ? csv.body.map((r) => Object.fromEntries(FIELDS.map(([k]) => [k, csv.map[k] >= 0 ? r[csv.map[k]] : ""]))) : [];
  const csvResult = csv ? validateRows(mapped, staleH) : null;

  function stage() {
    addImport({ id: `IMP-${imports.length + 1}`, ts: now(), file: csv.file, accepted: csvResult.ok.length, rejected: csvResult.errors.length, warnings: csvResult.warnings.length, by: user.name }, user);
    toast(t("Staged {n} rows. Staged imports are kept separately and never written back to e-RaktKosh.", { n: csvResult.ok.length }));
    setCsv(null);
  }

  return (
    <>
      <div className="alert-banner" style={{ background: "var(--warning-soft)", color: "var(--warning)", borderColor: "rgba(168,96,10,.25)" }}>
        <strong>{t("e-RaktKosh status")}:</strong>&nbsp;{t(INTEGRATION_STATUS)}. {t("All data is simulated. Integration is read-only.")}
      </div>
      <div className="panel">
        <Tabs value={tab} onChange={setTab} tabs={[["connection", "Connection & mode"], ["sync", "Data synchronisation"], ["quality", "Data quality"], ["mapping", "Data mapping"], ["import", "Data import (CSV)"]]} />
      </div>

      {tab === "connection" && (
        <div className="two-col">
          <div className="panel">
            <div className="panel-head"><h3>{t("Integration mode")}</h3>{!canConfig && <span className="hint">{t("Read-only for your role")}</span>}</div>
            <div className="chip-row" style={{ marginBottom: 12 }}>
              {[["api", "API Integration Mode"], ["import", "Data Import Mode"]].map(([m, l]) => <button key={m} disabled={!canConfig} className={`chip${cfg.mode === m ? " active" : ""}`} onClick={() => setCfg({ ...cfg, mode: m })}>{t(l)}</button>)}
            </div>
            <div className="form-grid">
              <label className="full">{t("API base URL (from e-RaktKosh / NIC)")}<input disabled={!canConfig} value={cfg.endpoint} placeholder="https://… (not provided)" onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} /></label>
              <label>{t("Client ID")}<input disabled={!canConfig} value={cfg.clientId} placeholder="—" onChange={(e) => setCfg({ ...cfg, clientId: e.target.value })} /></label>
              <label>{t("Client secret")}<input disabled type="password" placeholder={t("stored in server vault — never in browser")} /></label>
              <label>{t("Authentication")}<select disabled={!canConfig} value={cfg.auth} onChange={(e) => setCfg({ ...cfg, auth: e.target.value })}><option>OAuth 2.0 client credentials</option><option>Mutual TLS + API key</option></select></label>
              <label>{t("Sync schedule")}<select disabled={!canConfig} value={cfg.schedule} onChange={(e) => setCfg({ ...cfg, schedule: e.target.value })}><option>Hourly</option><option>Every 6 hours</option><option>Daily 02:00 IST</option></select></label>
              <label>{t("Access")}<input disabled value={t("Read-only (write access not authorised)")} /></label>
            </div>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn sm" disabled={!canConfig} onClick={testConnection}>{t("Test connection")}</button>
            </div>
            {testMsg && <div className={`pill ${testMsg[0]}`} style={{ marginTop: 10, display: "block", borderRadius: 8, padding: 10 }}>{testMsg[1]}</div>}
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{t("Readiness checklist")}</h3></div>
            <div className="checklist">
              {[
                [true, "Integration architecture: read-only adapter, mapping layer, validation, sync log"],
                [true, "Facility master mapped to e-RaktKosh blood bank codes (14 facilities)"],
                [true, "Blood group & component vocabulary mapping"],
                [true, "CSV import path with validation and error report"],
                [false, "API documentation from e-RaktKosh / NIC"],
                [false, "Credentials, IP allow-listing and API gateway"],
                [false, "Data-sharing approval from the Health Departments"],
                [false, "Connectivity tested and signed off"],
              ].map(([ok, l]) => <div key={l} className="cl-item"><div className="box" style={ok ? { background: "var(--success)", borderColor: "var(--success)" } : undefined} />{t(l)}</div>)}
            </div>
          </div>
        </div>
      )}

      {tab === "sync" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h3>{t("Scheduled synchronisation")}</h3>
              {canRun ? <button className="btn primary sm" onClick={runSampleSync}>{t("Run sync with sample dataset")}</button> : <span className="hint">{t("Your role cannot run syncs.")}</span>}
            </div>
            <p className="hint" style={{ fontSize: 12 }}>{t("Validates the {n}-row sample dataset with the live-feed rules. Nothing is sent to e-RaktKosh.", { n: sample.ok.length + sample.errors.length + sample.warnings.length })}</p>
            {lastRun && lastRun.errors.length > 0 && <div className="auth-error" style={{ marginTop: 10 }}>{t("Last sync ({id}) failed for {n} record(s) — see the error log below.", { id: lastRun.id, n: lastRun.errors.length })}</div>}
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{t("Synchronisation history")}</h3></div>
            {runs.length ? (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>{t("Run")}</th><th>{t("Time")}</th><th>{t("Mode")}</th><th>{t("Status")}</th><th>{t("Valid")}</th><th>{t("Errors")}</th><th>{t("Warnings")}</th></tr></thead>
                <tbody>{runs.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td>{fmtDate(r.ts)}</td><td>{r.mode}</td><td><span className={`pill ${r.errors.length ? "warn" : "ok"}`}>{t(r.status)}</span></td><td>{r.ok}</td><td>{r.errors.length}</td><td>{r.warnings.length}</td></tr>)}</tbody>
              </table></div>
            ) : <Empty>{t("No sync has run yet.")}</Empty>}
          </div>
          {lastRun && (
            <div className="panel">
              <div className="panel-head"><h3>{t("Error log — {id}", { id: lastRun.id })}</h3><button className="btn sm" onClick={() => exportCSV(`${lastRun.id}-errors`, ["Line", "Code", "Error"], lastRun.errors.map((e) => [e.line, e.code, e.msg]))}>{t("Export CSV")}</button></div>
              <div className="table-wrap"><table className="data">
                <thead><tr><th>{t("Line")}</th><th>{t("Blood bank code")}</th><th>{t("Error")}</th></tr></thead>
                <tbody>{lastRun.errors.map((e) => <tr key={e.line}><td>{e.line}</td><td className="mono">{e.code}</td><td>{e.msg}</td></tr>)}</tbody>
              </table></div>
              {lastRun.warnings.length > 0 && <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>{lastRun.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            </div>
          )}
        </>
      )}

      {tab === "quality" && (
        <div className="panel">
          <div className="panel-head"><h3>{t("Data quality monitoring")}</h3><span className="hint">{lastRun ? t("From {id}", { id: lastRun.id }) : ""}</span></div>
          {quality ? (
            <div className="table-wrap"><table className="data">
              <thead><tr><th>{t("Blood bank")}</th><th>{t("State/UT")}</th><th>{t("Rows")}</th><th>{t("Completeness")}</th><th>{t("Validity")}</th><th>{t("Data age")}</th><th>{t("Timeliness")}</th></tr></thead>
              <tbody>{quality.map((q) => (
                <tr key={q.fac.id}>
                  <td>{q.fac.name}</td><td>{t(STATES.find((s) => s.id === q.fac.state).name)}</td><td>{q.rows}</td>
                  <td><span className={`pill ${q.completeness >= 0.95 ? "ok" : "warn"}`}>{pct(q.completeness)}</span></td>
                  <td>{q.validity == null ? "—" : <span className={`pill ${q.validity === 1 ? "ok" : "warn"}`}>{pct(q.validity)}</span>}</td>
                  <td>{q.ageH == null ? "—" : `${q.ageH.toFixed(0)} h`}</td>
                  <td>{q.timely ? <span className="pill ok">{t("on time")}</span> : <span className="pill bad">{t("stale")}</span>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>{t("Run a sync (Data synchronisation tab) to compute data quality metrics.")}</Empty>}
          <p className="hint" style={{ marginTop: 10, fontSize: 11.5 }}>{t("Completeness = rows received / expected group × component rows. Validity = rows passing validation. Timeliness = last update within {h} h.", { h: staleH })}</p>
        </div>
      )}

      {tab === "mapping" && (
        <div className="grid cols-3">
          <div className="panel"><div className="panel-head"><h3>{t("Blood bank master")}</h3></div>
            <div className="table-wrap"><table className="data"><thead><tr><th>{t("e-RaktKosh code")}</th><th>{t("Platform facility")}</th></tr></thead>
              <tbody>{FACILITIES.map((f) => <tr key={f.id}><td className="mono">{f.ertk}</td><td>{f.name}</td></tr>)}</tbody></table></div></div>
          <div className="panel"><div className="panel-head"><h3>{t("Blood group mapping")}</h3></div>
            <div className="table-wrap"><table className="data"><thead><tr><th>{t("Source value")}</th><th>{t("Platform")}</th></tr></thead>
              <tbody>{Object.entries(GROUP_MAP).filter(([k]) => /VE|NEG|POS/.test(k) && !/ITIVE|ATIVE/.test(k)).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td>{v}</td></tr>)}</tbody></table></div></div>
          <div className="panel"><div className="panel-head"><h3>{t("Component mapping")}</h3></div>
            <div className="table-wrap"><table className="data"><thead><tr><th>{t("Source value")}</th><th>{t("Platform")}</th></tr></thead>
              <tbody>{Object.entries(COMPONENT_MAP).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v || <span className="hint">{t("not tracked")}</span>}</td></tr>)}</tbody></table></div></div>
        </div>
      )}

      {tab === "import" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h3>{t("Approved structured data import")}</h3>
              <button className="btn sm" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" })); a.download = "eraktkosh-inventory-template.csv"; a.click(); }}>{t("Download CSV template")}</button>
            </div>
            {canRun ? <input type="file" accept=".csv,text/csv" onChange={onFile} /> : <p className="hint">{t("Your role cannot import data.")}</p>}
            <p className="hint" style={{ fontSize: 11.5, marginTop: 8 }}>{t("CSV only (save Excel as CSV). Valid rows are staged; nothing is overwritten.")}</p>
          </div>
          {csv && (
            <div className="panel">
              <div className="panel-head"><h3>{csv.file}: {t("{n} rows", { n: csv.body.length })}</h3></div>
              <div className="filters" style={{ marginBottom: 12 }}>
                {FIELDS.map(([k, l]) => (
                  <label key={k} className="fsel"><span>{t(l)}</span>
                    <select value={csv.map[k]} onChange={(e) => setCsv({ ...csv, map: { ...csv.map, [k]: Number(e.target.value) } })}>
                      <option value={-1}>— {t("not mapped")} —</option>
                      {csv.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="grid cols-3">
                <div className="kpi"><div className="num">{csvResult.ok.length}</div><div className="lbl">{t("Valid rows")}</div></div>
                <div className="kpi"><div className="num" style={{ color: csvResult.errors.length ? "var(--critical)" : undefined }}>{csvResult.errors.length}</div><div className="lbl">{t("Rejected rows")}</div></div>
                <div className="kpi"><div className="num">{csvResult.warnings.length}</div><div className="lbl">{t("Warnings")}</div></div>
              </div>
              {csvResult.errors.length > 0 && <ul style={{ fontSize: 12, marginTop: 10 }}>{csvResult.errors.slice(0, 20).map((e) => <li key={e.line}>{t("Line {n}", { n: e.line })}: {e.errors.join("; ")}</li>)}</ul>}
              <div className="row-actions" style={{ marginTop: 12 }}>
                <button className="btn primary sm" disabled={!csvResult.ok.length} onClick={stage}>{t("Stage {n} valid rows", { n: csvResult.ok.length })}</button>
                <button className="btn sm ghost" onClick={() => setCsv(null)}>{t("Discard")}</button>
              </div>
            </div>
          )}
          <div className="panel">
            <div className="panel-head"><h3>{t("Import history")}</h3></div>
            {imports.length ? (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>{t("ID")}</th><th>{t("Time")}</th><th>{t("File")}</th><th>{t("Accepted")}</th><th>{t("Rejected")}</th><th>{t("By")}</th></tr></thead>
                <tbody>{imports.map((b) => <tr key={b.id}><td className="mono">{b.id}</td><td>{fmtDate(b.ts)}</td><td>{b.file}</td><td>{b.accepted}</td><td>{b.rejected}</td><td>{b.by}</td></tr>)}</tbody>
              </table></div>
            ) : <Empty>{t("No imports yet.")}</Empty>}
          </div>
        </>
      )}
    </>
  );
}
