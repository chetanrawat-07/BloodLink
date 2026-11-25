import { useState } from "react";

const STEP_LABELS = ["Collected & packed", "In transit", "Delivered", "Issued to patient"];
const MESSAGES = {
  3: "Dispatch confirmed · Transit ID BL-TRX-9931.",
  4: "Unit in transit · cold-chain holding at 4.1°C.",
  5: "Delivered to SNM Hospital, Leh.",
  6: "Issued to patient · hemovigilance record opened.",
};

export default function Emergency({ user, toast }) {
  const [transitStep, setTransitStep] = useState(2);

  function handleDispatch() {
    if (user?.role !== "centre") {
      toast("You're signed in as a Donor — log in as Blood Centre staff to confirm a dispatch.");
      return;
    }
    if (transitStep >= 5) return;
    const next = transitStep + 1;
    setTransitStep(next);
    toast(MESSAGES[next] || "Status updated.");
  }

  const done = transitStep >= 5;
  const btnLabel = done ? "Dispatch complete" : "Advance to next stage";

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>Demo story: O‑negative emergency, Leh</h3>
          <span className="hint">This is the single end‑to‑end flow the prototype is built to prove out</span>
        </div>
        <div className="grid cols-3">
          <div className="kpi"><div className="num">O−</div><div className="lbl">Blood group requested</div></div>
          <div className="kpi"><div className="num">4 units</div><div className="lbl">Trauma case · SNM District Hospital, Leh</div></div>
          <div className="kpi"><div className="num">Critical</div><div className="lbl">Logged 20 Nov 2026, 06:42 IST</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>System‑matched sources</h3>
          <span className="hint">Ranked by stock match, distance and current route status</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Source</th><th>O− in stock</th><th>Route</th><th>Road / air status</th><th>ETA</th><th></th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Kargil District Hospital</td><td>2 units</td><td>Road, 234 km</td>
                <td><span className="pill warn">Insufficient stock</span></td><td>—</td><td></td>
              </tr>
              <tr>
                <td>SKIMS Srinagar</td><td>18 units</td><td>Road via NH1 / Zojila La</td>
                <td><span className="pill bad">⛔ Zojila closed (winter)</span></td><td>n/a</td><td></td>
              </tr>
              <tr style={{ background: "var(--success-soft)" }}>
                <td><strong>GMC Jammu</strong></td><td>26 units</td><td>✈️ Air transfer, Jammu–Leh</td>
                <td><span className="pill ok">Route open</span></td><td>2h 10m</td>
                <td><span className="badge success">Recommended</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>Dispatch</h3></div>
          <p style={{ color: "var(--text-muted)", marginBottom: 14 }}>
            Cold‑chain transit box reading: <strong className="mono" style={{ color: "var(--text)" }}>4.1°C</strong> (within RBC
            range) · Carrier: scheduled civil air cargo, Jammu → Leh.
          </p>
          <button className="btn accent" onClick={handleDispatch} disabled={done}>
            {btnLabel}
          </button>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Transit status</h3></div>
          <div className="stepper">
            <div className="step done"><div className="circle">✓</div><span className="lbl">Matched</span></div>
            <div className="step-line" />
            {STEP_LABELS.map((label, idx) => {
              const stepNum = idx + 2;
              const cls = stepNum < transitStep ? "done" : stepNum === transitStep ? "current" : "";
              return (
                <span key={label} style={{ display: "contents" }}>
                  <div className={`step ${cls}`}>
                    <div className="circle">{cls === "done" ? "✓" : stepNum}</div>
                    <span className="lbl">{label}</span>
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
