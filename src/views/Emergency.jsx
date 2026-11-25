import { useState } from "react";
import { useLang } from "../i18n.jsx";

const STEP_LABELS = ["Collected & packed", "In transit", "Delivered", "Issued to patient"];
const MESSAGES = {
  3: "Dispatch confirmed · Transit ID BL-TRX-9931.",
  4: "Unit in transit · cold-chain holding at 4.1°C.",
  5: "Delivered to SNM Hospital, Leh.",
  6: "Issued to patient · hemovigilance record opened.",
};

export default function Emergency({ toast }) {
  const { t } = useLang();
  const [transitStep, setTransitStep] = useState(2);

  function handleDispatch() {
    if (transitStep >= 5) return;
    const next = transitStep + 1;
    setTransitStep(next);
    toast(t(MESSAGES[next] || "Status updated."));
  }

  const done = transitStep >= 5;
  const btnLabel = done ? t("Dispatch complete") : t("Advance to next stage");

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>{t("Demo story: O‑negative emergency, Leh")}</h3>
          <span className="hint">{t("This is the single end‑to‑end flow the prototype is built to prove out")}</span>
        </div>
        <div className="grid cols-3">
          <div className="kpi"><div className="num">O−</div><div className="lbl">{t("Blood group requested")}</div></div>
          <div className="kpi"><div className="num">{t("{n} units", { n: 4 })}</div><div className="lbl">{t("Trauma case · SNM District Hospital, Leh")}</div></div>
          <div className="kpi"><div className="num">{t("Critical")}</div><div className="lbl">{t("Logged 20 Nov 2026, 06:42 IST")}</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("System‑matched sources")}</h3>
          <span className="hint">{t("Ranked by stock match, distance and current route status")}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>{t("Source")}</th><th>{t("O− in stock")}</th><th>{t("Route")}</th><th>{t("Road / air status")}</th><th>{t("ETA")}</th><th></th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Kargil District Hospital</td><td>{t("{n} units", { n: 2 })}</td><td>{t("Road, 234 km")}</td>
                <td><span className="pill warn">{t("Insufficient stock")}</span></td><td>—</td><td></td>
              </tr>
              <tr>
                <td>SKIMS Srinagar</td><td>{t("{n} units", { n: 18 })}</td><td>{t("Road via NH1 / Zojila La")}</td>
                <td><span className="pill bad">⛔ {t("Zojila closed (winter)")}</span></td><td>n/a</td><td></td>
              </tr>
              <tr style={{ background: "var(--success-soft)" }}>
                <td><strong>GMC Jammu</strong></td><td>{t("{n} units", { n: 26 })}</td><td>✈️ {t("Air transfer, Jammu–Leh")}</td>
                <td><span className="pill ok">{t("Route open")}</span></td><td>2h 10m</td>
                <td><span className="badge success">{t("Recommended")}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>{t("Dispatch")}</h3></div>
          <p style={{ color: "var(--text-muted)", marginBottom: 14 }}>
            {t("Cold‑chain transit box reading:")} <strong className="mono" style={{ color: "var(--text)" }}>4.1°C</strong>{" "}
            {t("(within RBC range) · Carrier: scheduled civil air cargo, Jammu → Leh.")}
          </p>
          <button className="btn accent" onClick={handleDispatch} disabled={done}>
            {btnLabel}
          </button>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Transit status")}</h3></div>
          <div className="stepper">
            <div className="step done"><div className="circle">✓</div><span className="lbl">{t("Matched")}</span></div>
            <div className="step-line" />
            {STEP_LABELS.map((label, idx) => {
              const stepNum = idx + 2;
              const cls = stepNum < transitStep ? "done" : stepNum === transitStep ? "current" : "";
              return (
                <span key={label} style={{ display: "contents" }}>
                  <div className={`step ${cls}`}>
                    <div className="circle">{cls === "done" ? "✓" : stepNum}</div>
                    <span className="lbl">{t(label)}</span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && <div className="step-line" />}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
