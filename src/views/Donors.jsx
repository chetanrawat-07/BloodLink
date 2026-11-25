import { donors, regionName } from "../data.js";
import { useLang } from "../i18n.jsx";
import Camps from "./Camps.jsx";

const ELIGIBLE = { yes: ["ok", "Yes"], soon: ["warn", "In 3 wks"], no: ["bad", "No"] };

export default function Donors({ regionFilter, toast }) {
  const { t } = useLang();
  const recall = donors.filter((d) => d.group === "O-" && d.region === "ladakh");
  const registry = donors.filter((d) => regionFilter === "all" || d.region === regionFilter);

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>{t("Rare‑group recall — O−, within 15 km of Leh")}</h3></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>{t("Donor UID")}</th><th>{t("Last donation")}</th><th>{t("Eligible")}</th><th>{t("City")}</th></tr></thead>
            <tbody>
              {recall.map((d) => {
                const [cls, label] = ELIGIBLE[d.eligible];
                return (
                  <tr key={d.uid}>
                    <td className="mono">{d.uid}</td><td>{d.last}</td>
                    <td><span className={`pill ${cls}`}>{t(label)}</span></td><td>{d.city}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => toast(t("Recall sent via app push + SMS fallback to 34 matching O− donors."))}>
            {t("Send recall alert to 34 matching donors")}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("Registered donors")}</h3>
          <span className="hint">{t("{n} donors shown", { n: registry.length })}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("Donor UID")}</th><th>{t("Name")}</th><th>{t("Group")}</th><th>{t("Region")}</th>
                <th>{t("City")}</th><th>{t("Last donation")}</th><th>{t("Donations")}</th><th>{t("Eligible")}</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((d) => {
                const [cls, label] = ELIGIBLE[d.eligible];
                return (
                  <tr key={d.uid}>
                    <td className="mono">{d.uid}</td><td>{d.name}</td><td>{d.group}</td><td>{t(regionName(d.region))}</td>
                    <td>{d.city}</td><td>{d.last}</td><td>{d.donations}</td>
                    <td><span className={`pill ${cls}`}>{t(label)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Camps regionFilter={regionFilter} />

      <div className="panel">
        <div className="panel-head"><h3>{t("Notification feed, as donors & hospitals see it")}</h3></div>
        <div className="timeline">
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--critical)" }} />
            <div className="t-body">
              <div className="t-title">"{t("O− urgently needed at SNM Hospital, Leh")}"</div>
              <div className="t-meta">{t("Push + SMS fallback · sent 2 min ago")}</div>
            </div>
          </div>
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--primary)" }} />
            <div className="t-body">
              <div className="t-title">"{t("It's time to donate again — you're eligible from 24 Nov")}"</div>
              <div className="t-meta">{t("Routine reminder · app notification")}</div>
            </div>
          </div>
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--success)" }} />
            <div className="t-body">
              <div className="t-title">"{t("New camp near you: Patiala Blood Drive, 24 Nov")}"</div>
              <div className="t-meta">{t("Camp alert with map link")}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
