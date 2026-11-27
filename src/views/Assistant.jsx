import { useRef, useState, useEffect } from "react";
import { useLang } from "../i18n.jsx";
import { useModel, useStore, audit } from "../store.js";
import { scopeOf, whereOf, can } from "../access.js";
import { answer, EXAMPLES } from "../assistant.js";
import { Bars, KindTag, exportCSV, printPDF, fmtDate } from "../ui.jsx";
import { AS_OF } from "../engine.js";

function Reply({ m, user }) {
  const { t } = useLang();
  const r = m.res;
  return (
    <div className="msg bot">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><KindTag kind={r.kind} /></div>
      <div>{r.text}</div>
      {r.suggestions && <ul style={{ margin: 0, paddingLeft: 18 }}>{r.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>}
      {r.bars && <Bars rows={r.bars} />}
      {r.table && (
        <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="data"><thead><tr>{r.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{r.table.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      {r.notes?.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.8, color: "var(--text-muted)" }}>{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {r.period && <>{t("Period")}: {r.period} · </>}{t("Source")}: {r.source} · {t("Data as of")} {fmtDate(AS_OF)}
      </div>
      {r.table && can(user, "reports.export") && (
        <div className="row-actions">
          <button className="btn sm" onClick={() => { exportCSV("assistant-answer", r.table.columns, r.table.rows, [m.q, r.text, r.source]); audit(user, "assistant.export", m.q); }}>{t("Export CSV")}</button>
          {r.report && <button className="btn sm" onClick={() => printPDF(r.report.title, [r.report.period, ...r.report.meta], r.report.columns, r.report.rows, r.report.notes)}>{t("Export PDF")}</button>}
        </div>
      )}
      {r.followups && <div className="chip-row">{r.followups.map((f) => <span key={f} className="chip">{f}</span>)}</div>}
    </div>
  );
}

export default function Assistant({ user }) {
  const { t } = useLang();
  const model = useModel();
  const transfers = useStore((s) => s.transfers);
  const emergencies = useStore((s) => s.emergencies);
  const scope = scopeOf(user);
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const memory = useRef(null);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]); // block body: newer browsers return a Promise here

  function ask(text) {
    const question = text.trim();
    if (!question) return;
    const res = answer(question, { model, where: whereOf(scope), scopeLabel: scope.label, transfers, emergencies, memory: memory.current });
    memory.current = res.memory;
    audit(user, "assistant.query", question.slice(0, 200)); // data access logging
    setMsgs((m) => [...m, { q: question, res }]);
    setQ("");
  }

  return (
    <div className="two-col">
      <div className="panel">
        <div className="panel-head"><h3>{t("AI Operational Assistant")}</h3><span className="hint">{t("Answers only from platform data within your jurisdiction: {s}", { s: scope.label })}</span></div>
        <div className="chat">
          {msgs.length === 0 && <div className="msg bot">{t("Ask about stock, shortages, forecasts, expiry, surplus, wastage, sourcing, transfers or reports.")}</div>}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "contents" }}>
              <div className="msg user">{m.q}</div>
              <Reply m={m} user={user} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ask a question…")} aria-label={t("Ask a question")} maxLength={300} />
          <button className="btn primary" type="submit">{t("Ask")}</button>
        </form>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>{t("Try asking")}</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {EXAMPLES.map((e) => <button key={e} className="auth-demo-row" onClick={() => ask(e)}>{e}</button>)}
        </div>
        <p className="hint" style={{ marginTop: 12, fontSize: 11.5 }}>{t("Answers come only from platform data; missing data is reported as such. Queries are audit-logged.")}</p>
      </div>
    </div>
  );
}
