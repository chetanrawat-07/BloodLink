import { useLang } from "../i18n.jsx";

export default function BuildPlan() {
  const { t } = useLang();

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>{t("Target architecture for the next build phase")}</h3></div>
        <div className="arch-row">
          <div className="arch-box">{t("Frontend")}<small>{t("React.js web dashboard + offline‑first PWA")}</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">{t("API gateway")}<small>{t("Auth, rate limiting, SMS fallback")}</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">{t("Backend")}<small>{t("Node.js / Express microservices")}</small></div>
          <div className="arch-arrow">→</div>
          <div className="arch-box">{t("Data layer")}<small>MongoDB / PostgreSQL</small></div>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}><h3>{t("Backend services")}</h3></div>
        <div className="grid cols-4">
          <div className="kpi"><div className="lbl">{t("User / KYC & UID issuance")}</div></div>
          <div className="kpi"><div className="lbl">{t("Inventory & cold‑chain / IoT")}</div></div>
          <div className="kpi"><div className="lbl">{t("Routing & forecast (ML)")}</div></div>
          <div className="kpi"><div className="lbl">{t("Donor & camp management")}</div></div>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}><h3>{t("External integrations")}</h3></div>
        <div className="chip-row">
          <span className="chip">{t("eRaktKosh (replace / integrate / AI layer — tbd)")}</span>
          <span className="chip">{t("ABHA / ABDM identity")}</span>
          <span className="chip">{t("SMS gateway (offline fallback)")}</span>
          <span className="chip">{t("Maps / routing provider")}</span>
          <span className="chip">{t("IoT cold‑chain sensors")}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("Compliance & accessibility")}</h3></div>
        <div className="chip-row">
          <span className="badge info">Drugs &amp; Cosmetics Act / NBTC / NACO</span>
          <span className="badge info">Hemovigilance (HvPI)</span>
          <span className="badge info">DPDP Act 2023</span>
          <span className="badge info">STQC / CERT‑In audit</span>
          <span className="badge info">{t("GIGW accessibility")}</span>
        </div>
        <div className="panel-head" style={{ marginTop: 16 }}>
          <h3>{t("Multilingual UI")}</h3>
        </div>
        <p className="hint">{t("The whole app is available in English, Punjabi and Hindi — use the language bar at the top right.")}</p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Decisions still needed from the client")}</h3>
          <span className="hint">{t("Carried over from the pre‑development brief — unblocks the React/Node build")}</span>
        </div>
        <div className="checklist">
          <div className="cl-item"><div className="box" />{t("One platform for all regions, or a separate instance each?")}</div>
          <div className="cl-item"><div className="box" />{t("Replace eRaktKosh, integrate with it, or add an AI layer on top?")}</div>
          <div className="cl-item"><div className="box" />{t("Is IoT cold‑chain hardware in scope, and who supplies it?")}</div>
          <div className="cl-item"><div className="box" />{t("Hosting target — NIC, State Data Centre, or MeitY‑empanelled cloud?")}</div>
          <div className="cl-item"><div className="box" />{t("Which languages are mandatory for go‑live?")}</div>
          <div className="cl-item"><div className="box" />{t("Is a pilot site already identified?")}</div>
        </div>
      </div>
    </>
  );
}
