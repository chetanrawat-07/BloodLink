// Shared building blocks for the intelligence modules (reuses the existing design tokens / classes).
import { AS_OF, DEMO_DATA_LABEL, COMPONENTS, GROUPS, STATES, DISTRICTS, FACILITIES, dayDate, HISTORY_DAYS } from "./networkData.js";
import { useLang } from "./i18n.jsx";

export const fmtDate = (ts) => new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
export const fmtDay = (ts) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
export const fmtH = (h) => (h == null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`);
export const pct = (p) => (p == null ? "—" : `${Math.round(p * 100)}%`);
export const units = (n) => `${n} unit${n === 1 ? "" : "s"}`;

export const STATUS_PILL = { critical: "bad", low: "warn", surplus: "neutral", ok: "ok", "low-volume": "neutral" };
export const STATUS_LABEL = { critical: "Critical", low: "Low", surplus: "Surplus", ok: "Healthy", "low-volume": "Low volume" };
export function StatusPill({ status }) {
  const { t } = useLang();
  return <span className={`pill ${STATUS_PILL[status]}`}>{t(STATUS_LABEL[status])}</span>;
}

export function Provenance({ period, confidence, source = DEMO_DATA_LABEL, refreshed = AS_OF, method }) {
  const { t } = useLang();
  return (
    <div className="prov">
      {period && <span><b>{t("Period")}:</b> {t(period)}</span>}
      <span><b>{t("Last data refresh")}:</b> {fmtDate(refreshed)}</span>
      {confidence && <span><b>{t("Confidence")}:</b> {t(confidence)}</span>}
      <span><b>{t("Source")}:</b> {t(source)}</span>
      {method && <span><b>{t("Method")}:</b> {t(method)}</span>}
    </div>
  );
}

export function KindTag({ kind }) {
  const { t } = useLang();
  return kind === "prediction"
    ? <span className="badge demo">{t("Prediction")}</span>
    : <span className="badge neutral">{t("Recorded")}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  const { t } = useLang();
  return (
    <div className="chip-row" role="tablist" style={{ marginBottom: 4 }}>
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={`chip${value === id ? " active" : ""}`} onClick={() => onChange(id)}>{t(label)}</button>
      ))}
    </div>
  );
}

export function Select({ label, value, onChange, options, allLabel }) {
  const { t } = useLang();
  return (
    <label className="fsel">
      <span>{t(label)}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value="all">{t(allLabel)}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
      </select>
    </label>
  );
}

export const OPT = {
  states: STATES.map((s) => [s.id, s.name]),
  groups: GROUPS.map((g) => [g, g]),
  comps: COMPONENTS.map((c) => [c.id, c.name]),
  districts: (state) => DISTRICTS.filter((d) => !state || state === "all" || d.state === state).map((d) => [d.id, d.name]),
  facilities: (where) => FACILITIES.filter((f) => !where || where(f)).map((f) => [f.id, f.name]),
};

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function InsufficientData({ reason, requirement }) {
  const { t } = useLang();
  return (
    <div className="empty">
      <strong>{t("Insufficient Data")}</strong>
      <div>{t(reason)}</div>
      {requirement && <div className="hint">{t(requirement)}</div>}
    </div>
  );
}

// ---------- export ----------
const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function exportCSV(filename, columns, rows, meta = []) {
  const lines = [...meta.map((m) => csvCell(m)), ...(meta.length ? [""] : []), columns.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); // BOM so Excel reads UTF-8
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function printPDF(title, meta, columns, rows, notes = []) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;color:#2B1114;margin:28px;font-size:12px}h1{font-size:18px;margin:0 0 4px;color:#8B1538}
.meta{color:#6B585B;margin-bottom:14px}.demo{display:inline-block;background:#FDF1DC;color:#A8600A;padding:3px 8px;border-radius:6px;font-weight:600;margin-bottom:12px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #E7DCDD;padding:5px 7px;text-align:left}th{background:#F5EEEC;font-size:11px;text-transform:uppercase}
ul{color:#6B585B}</style></head><body>
<h1>${esc(title)}</h1><div class="demo">${esc(DEMO_DATA_LABEL)}</div>
<div class="meta">${meta.map(esc).join("<br>")}</div>
<table><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
${notes.length ? `<ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

// ---------- charts ----------
// Historical (solid) vs predicted (dashed + 80% band). Native <title> tooltips on every point.
export function ForecastChart({ series, fc, days = 42, height = 220 }) {
  const { t } = useLang();
  const hist = Array.from(series.slice(HISTORY_DAYS - days));
  const pred = fc?.status === "ok" ? fc.daily : [];
  const n = hist.length + pred.length;
  const bandHalf = pred.length ? (fc.upper - fc.total) / Math.sqrt(pred.length) : 0; // per-day band approximation
  const maxV = Math.max(1, ...hist, ...pred.map((v) => v + bandHalf)) * 1.1;
  const W = 640, H = height, L = 34, R = 10, T = 12, B = 26;
  const x = (i) => L + ((W - L - R) * i) / Math.max(1, n - 1);
  const y = (v) => T + (H - T - B) * (1 - v / maxV);
  const histD = hist.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const p0 = hist.length - 1;
  const predD = [`M${x(p0)},${y(hist[p0])}`, ...pred.map((v, k) => `L${x(p0 + k + 1)},${y(v)}`)].join(" ");
  const band = pred.length
    ? [...pred.map((v, k) => `${k ? "L" : "M"}${x(p0 + k + 1)},${y(v + bandHalf)}`), ...pred.map((v, k) => `L${x(p0 + pred.length - k)},${y(Math.max(0, pred[pred.length - 1 - k] - bandHalf))}`), "Z"].join(" ")
    : "";
  const ticks = [0, Math.round(maxV / 2), Math.round(maxV)];
  const dateOf = (i) => fmtDay(dayDate(HISTORY_DAYS - days + i));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" aria-label={t("Historical versus predicted demand")}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 3} fontSize="10" textAnchor="end" fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        {pred.length > 0 && <line x1={x(p0)} x2={x(p0)} y1={T} y2={H - B} stroke="var(--text-muted)" strokeDasharray="3 3" />}
        {pred.length > 0 && <text x={x(p0) + 4} y={T + 9} fontSize="10" fill="var(--text-muted)">{t("today")}</text>}
        {band && <path d={band} fill="var(--accent-soft)" opacity="0.8" />}
        <path d={histD} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
        {pred.length > 0 && <path d={predD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 4" />}
        {[...hist, ...pred].map((v, i) => (
          <rect key={i} x={x(i) - 5} y={T} width="10" height={H - T - B} fill="transparent">
            <title>{`${dateOf(i)} · ${i < hist.length ? t("actual") : t("forecast")}: ${v.toFixed(1)}`}</title>
          </rect>
        ))}
        {[0, Math.floor(hist.length / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} fontSize="10" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fill="var(--text-muted)">{dateOf(i)}</text>
        ))}
      </svg>
      <div className="legend">
        <span><i className="lg-line" style={{ background: "var(--primary)" }} /> {t("Historical (actual units issued)")}</span>
        {pred.length > 0 && <span><i className="lg-line dashed" /> {t("AI forecast")}</span>}
        {pred.length > 0 && <span><i className="dotlg" style={{ background: "var(--accent-soft)" }} /> {t("80% interval")}</span>}
      </div>
    </div>
  );
}

// Horizontal bars; rows: [{ label, value, display?, tone? }]
export function Bars({ rows, max, unit = "" }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bars-row" title={`${r.label}: ${r.display ?? r.value}${unit}`}>
          <span className="bars-label">{r.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(100 * Math.max(0, r.value)) / m}%`, background: r.tone || "var(--primary)" }} /></div>
          <span className="bars-val mono">{r.display ?? r.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// Risk heatmap: values 0..1 (probability), null = insufficient data. Each cell is labelled, so colour is never the only cue.
export function Heatmap({ rows, cols, cell, onPick }) {
  const { t } = useLang();
  const tone = (p) => (p == null ? "hm-na" : p >= 0.6 ? "hm-bad" : p >= 0.3 ? "hm-warn" : "hm-ok");
  return (
    <div className="table-wrap">
      <table className="heatmap">
        <thead><tr><th />{cols.map(([id, l]) => <th key={id}>{l}</th>)}</tr></thead>
        <tbody>
          {rows.map(([rid, rl]) => (
            <tr key={rid}>
              <th>{t(rl)}</th>
              {cols.map(([cid, cl]) => {
                const p = cell(rid, cid);
                return (
                  <td key={cid} className={tone(p)} onClick={onPick ? () => onPick(rid, cid) : undefined} style={{ cursor: onPick ? "pointer" : "default" }} title={`${rl} · ${cl}: ${p == null ? t("insufficient data") : pct(p)}`}>
                    {p == null ? "n/a" : pct(p)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend">
        <span><i className="dotlg hm-ok" /> {t("< 30% shortage risk")}</span>
        <span><i className="dotlg hm-warn" /> {t("30–60%")}</span>
        <span><i className="dotlg hm-bad" /> {t("≥ 60%")}</span>
        <span><i className="dotlg hm-na" /> {t("n/a = insufficient data")}</span>
      </div>
    </div>
  );
}

export function Stepper({ steps, current }) {
  const { t } = useLang();
  const idx = steps.indexOf(current);
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <span key={s} style={{ display: "contents" }}>
          <div className={`step ${i < idx || (i === idx && i === steps.length - 1) ? "done" : i === idx ? "current" : ""}`}>
            <div className="circle">{i < idx ? "✓" : i + 1}</div>
            <span className="lbl">{t(s)}</span>
          </div>
          {i < steps.length - 1 && <div className="step-line" />}
        </span>
      ))}
    </div>
  );
}
