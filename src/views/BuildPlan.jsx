import { useState } from "react";
import { translations } from "../data.js";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "اردو" },
];

export default function BuildPlan() {
  const [lang, setLang] = useState("en");

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Target architecture for the next build phase</h3></div>
        <div className="arch-row">
          <div className="arch-box">Frontend<small>React.js web dashboard + offline‑first PWA</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">API gateway<small>Auth, rate limiting, SMS fallback</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">Backend<small>Node.js / Express microservices</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">Data layer<small>MongoDB / PostgreSQL</small></div>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}><h3>Backend services</h3></div>
        <div className="grid cols-4">
          <div className="kpi"><div className="lbl">User / KYC &amp; UID issuance</div></div>
          <div className="kpi"><div className="lbl">Inventory &amp; cold‑chain / IoT</div></div>
          <div className="kpi"><div className="lbl">Routing &amp; forecast (ML)</div></div>
          <div className="kpi"><div className="lbl">Donor &amp; camp management</div></div>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}><h3>External integrations</h3></div>
        <div className="chip-row">
          <span className="chip">eRaktKosh (replace / integrate / AI layer — tbd)</span>
          <span className="chip">ABHA / ABDM identity</span>
          <span className="chip">SMS gateway (offline fallback)</span>
          <span className="chip">Maps / routing provider</span>
          <span className="chip">IoT cold‑chain sensors</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Compliance &amp; accessibility</h3></div>
        <div className="chip-row">
          <span className="badge info">Drugs &amp; Cosmetics Act / NBTC / NACO</span>
          <span className="badge info">Hemovigilance (HvPI)</span>
          <span className="badge info">DPDP Act 2023</span>
          <span className="badge info">STQC / CERT‑In audit</span>
          <span className="badge info">GIGW accessibility</span>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}>
          <h3>Multilingual UI</h3>
          <span className="hint">Click a language to preview one key action in that language</span>
        </div>
        <div className="translate-demo">
          <div className="lang-pills">
            {LANGS.map((l) => (
              <button
                key={l.code}
                className={`lang-pill${lang === l.code ? " active" : ""}`}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="sample">{translations[lang] || translations.en}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Decisions still needed from the client</h3>
          <span className="hint">Carried over from the pre‑development brief — unblocks the React/Node build</span>
        </div>
        <div className="checklist">
          <div className="cl-item"><div className="box" />One platform for all three regions, or a separate instance each?</div>
          <div className="cl-item"><div className="box" />Replace eRaktKosh, integrate with it, or add an AI layer on top?</div>
          <div className="cl-item"><div className="box" />Is IoT cold‑chain hardware in scope, and who supplies it?</div>
          <div className="cl-item"><div className="box" />Hosting target — NIC, State Data Centre, or MeitY‑empanelled cloud?</div>
          <div className="cl-item"><div className="box" />Which languages are mandatory for go‑live?</div>
          <div className="cl-item"><div className="box" />Is a pilot site already identified?</div>
        </div>
      </div>
    </>
  );
}
