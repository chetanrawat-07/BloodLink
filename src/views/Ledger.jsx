import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useStore, tamperLedgerForDemo, restoreLedgerFromPeer, audit } from "../store.js";
import { can } from "../access.js";
import { verifyChain, unitHistory, LEDGER_LABEL, CHANNEL, CHAINCODE } from "../ledger.js";
import { NETWORK } from "../networkData.js";
import { facById, compById, daysLeft } from "../engine.js";
import { fmtDate, fmtDay, Empty } from "../ui.jsx";

const TYPES = ["all", "UNIT_COLLECTED", "UNIT_TESTED", "UNIT_STORED", "UNIT_DISCARDED", "TRANSFER_APPROVED", "TRANSFER_DISPATCHED", "TRANSFER_RECEIVED", "EMERGENCY_FULFILLED"];
const unitById = new Map(NETWORK.units.map((u) => [u.id, u]));

export default function Ledger({ user, params = {}, toast }) {
  const { t } = useLang();
  const chain = useStore((s) => s.ledger);
  const backup = useStore((s) => s.ledgerBackup);
  const [result, setResult] = useState(null);
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(null);
  const firstUnit = chain.find((b) => b.payload?.unitId)?.payload.unitId || "";
  const [unitId, setUnitId] = useState(params.unitId || firstUnit);
  const [query, setQuery] = useState(params.unitId || firstUnit);

  const blocks = useMemo(() => [...chain].reverse().filter((b) => type === "all" || b.type === type), [chain, type]);
  const trace = unitHistory(chain, unitId);
  const unit = unitById.get(unitId);
  const last = chain[chain.length - 1];
  const orgs = new Set(chain.map((b) => b.org));

  function verify() {
    const r = verifyChain(chain);
    setResult(r);
    audit(user, "ledger.verify", r.ok ? `Chain verified (${r.count} blocks)` : r.reason);
  }

  function tamper() {
    const idx = chain.findIndex((b) => b.type === "TRANSFER_RECEIVED" || b.type === "TRANSFER_DISPATCHED");
    tamperLedgerForDemo(idx > 0 ? idx : Math.floor(chain.length / 2));
    setResult(null);
    audit(user, "ledger.tamper_test", `Tamper test: edited block #${idx} without re-hashing`);
    toast(t("A stored block was edited without re-hashing. Now run “Verify chain integrity”."));
  }

  return (
    <>
      <div className="alert-banner" style={{ background: "var(--primary-soft)", color: "var(--primary)", borderColor: "transparent" }}>
        {t(LEDGER_LABEL)}. {t("Production target per proposal: Hyperledger Fabric v2.x permissioned network with CouchDB state database.")}
      </div>

      <div className="grid cols-4">
        <div className="kpi"><div className="num">{chain.length}</div><div className="lbl">{t("Blocks (1 transaction each)")}</div></div>
        <div className="kpi"><div className="num">{orgs.size}</div><div className="lbl">{t("Organisations (MSPs) that wrote entries")}</div></div>
        <div className="kpi"><div className="num mono" style={{ fontSize: 15 }}>{last.hash.slice(0, 16)}…</div><div className="lbl">{t("Latest block hash (SHA-256)")}</div></div>
        <div className="kpi"><div className="num" style={{ fontSize: 15 }}>{CHANNEL}</div><div className="lbl">{CHAINCODE}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Chain integrity")}</h3>
          <div className="row-actions">
            {can(user, "ledger.verify") && <button className="btn primary sm" onClick={verify}>{t("Verify chain integrity")}</button>}
            {user.role === "super" && !backup && <button className="btn sm danger" onClick={tamper}>{t("Tamper test (demo)")}</button>}
            {backup && <button className="btn sm" onClick={() => { restoreLedgerFromPeer(user); setResult(null); toast(t("Ledger restored from peer copy.")); }}>{t("Restore from peer copy")}</button>}
          </div>
        </div>
        {result && (result.ok
          ? <div className="pill ok" style={{ display: "block", borderRadius: 8, padding: 10 }}>{t("All {n} blocks verified: every hash recomputes and every previous-hash link matches.", { n: result.count })}</div>
          : <div className="pill bad" style={{ display: "block", borderRadius: 8, padding: 10 }}>{t("Integrity check failed")}: {result.reason}</div>)}
        <p className="hint" style={{ fontSize: 11.5, marginTop: 8 }}>{t("Each block hashes its contents and the previous block, so any edit breaks the chain. No patient identifiers are stored.")}</p>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>{t("Blood unit traceability")}</h3></div>
          <form className="chat-input" style={{ marginTop: 0, marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); setUnitId(query.trim()); }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BL-JMU1-PRBC-00001" aria-label={t("Unit ID")} />
            <button className="btn primary" type="submit">{t("Trace")}</button>
          </form>
          {unit ? (
            <>
              <div className="rec-grid">
                <div><b>{t("Unit")}</b><span className="mono">{unit.id}</span></div>
                <div><b>{t("Blood bank")}</b>{facById[unit.facId].name}</div>
                <div><b>{t("Group / component")}</b>{unit.group} · {compById[unit.comp].name}</div>
                <div><b>{t("Status")}</b>{t(unit.status)} · TTI {unit.tti}</div>
                <div><b>{t("Collected")}</b>{fmtDay(unit.collected)}</div>
                <div><b>{t("Expiry")}</b>{fmtDay(unit.expiry)} ({daysLeft(unit).toFixed(1)} d)</div>
                <div><b>{t("e-RaktKosh ref")}</b><span className="mono">{unit.ertk}</span></div>
              </div>
              <details style={{ marginTop: 10, fontSize: 12 }}>
                <summary>{t("QR label payload")}</summary>
                <pre className="block" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify({ id: unit.id, g: unit.group, c: unit.comp, exp: new Date(unit.expiry).toISOString().slice(0, 10), tx: trace[0]?.txId || null })}</pre>
              </details>
              <h4 style={{ fontSize: 12.5, margin: "12px 0 6px" }}>{t("On-chain lifecycle")}</h4>
              {trace.length ? (
                <div className="timeline">{trace.map((b) => (
                  <div className="t-row" key={b.index}><div className="t-dot" style={{ background: "var(--success)" }} /><div className="t-body"><div className="t-title">{b.type.replace(/_/g, " ")}</div><div className="t-meta">{fmtDate(b.ts)} · {b.org} · tx {b.txId}</div></div></div>
                ))}</div>
              ) : <Empty>{t("Not anchored on the ledger (the demo anchors a sample of units).")}</Empty>}
            </>
          ) : <Empty>{t("No unit with this ID in the dataset.")}</Empty>}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Block explorer")}</h3>
            <select value={type} onChange={(e) => setType(e.target.value)} className="fsel" style={{ minWidth: 0 }} aria-label={t("Filter by type")}>{TYPES.map((x) => <option key={x} value={x}>{x === "all" ? t("All types") : x}</option>)}</select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflowY: "auto" }}>
            {blocks.slice(0, 80).map((b) => {
              const bad = result && !result.ok && b.index >= result.index;
              return (
                <div key={b.index} className={`block clickable${bad ? " bad" : ""}`} onClick={() => setOpen(open === b.index ? null : b.index)}>
                  <div><b>#{b.index}</b> {b.type} · {b.org} · {fmtDate(b.ts)}</div>
                  <div>hash {b.hash.slice(0, 24)}… · prev {b.prevHash.slice(0, 12)}…</div>
                  {open === b.index && <pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{JSON.stringify({ txId: b.txId, payload: b.payload }, null, 2)}</pre>}
                  {b.payload?.unitId && <button className="btn sm ghost" style={{ justifySelf: "start" }} onClick={(e) => { e.stopPropagation(); setQuery(b.payload.unitId); setUnitId(b.payload.unitId); }}>{t("Trace unit")}</button>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
