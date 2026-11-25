import { camps, centres, regionName } from "../data.js";
import { useLang } from "../i18n.jsx";

export default function DonorHome({ user, setView }) {
  const { t } = useLang();
  const history = user.history || [];
  const nearbyCamps = camps.filter((c) => c.region === user.region && c.status !== "Completed");
  const needyCentres = centres.filter((c) => c.region === user.region && c.status !== "ok");

  return (
    <>
      <div className="grid cols-4">
        <div className="kpi">
          <div className="num">{user.bloodGroup || "—"}</div>
          <div className="lbl">{t("Your blood group")}</div>
        </div>
        <div className="kpi">
          <div className="num">{history.length}</div>
          <div className="lbl">{t("Donations made")}</div>
          {history.length > 0 && <div className="delta up">{t("~{n} lives helped", { n: history.length * 3 })}</div>}
        </div>
        <div className="kpi">
          <div className="num" style={{ fontSize: 18 }}>{user.nextEligible || t("Now")}</div>
          <div className="lbl">{t("Next eligible donation")}</div>
        </div>
        <div className="kpi">
          <div className="num" style={{ fontSize: 18 }}>{user.region ? t(regionName(user.region)) : "—"}</div>
          <div className="lbl">{t("Your state / UT")}</div>
          {user.uid && <div className="delta mono">{user.uid}</div>}
        </div>
      </div>

      {needyCentres.length > 0 && (
        <div className="alert-banner">
          🔴 <strong>{t("Donors needed:")}</strong>&nbsp;
          {needyCentres.map((c) => c.name).join(", ")}
          <button onClick={() => setView("centres")}>{t("Find blood centres →")}</button>
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>{t("My donation history")}</h3></div>
          {history.length === 0 ? (
            <p className="hint">{t("No donations recorded yet — join a camp below to make your first one.")}</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>{t("Date")}</th><th>{t("Blood centre")}</th><th>{t("Component")}</th><th>{t("Status")}</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.date}>
                      <td>{h.date}</td><td>{h.centre}</td><td>{t(h.comp)}</td>
                      <td><span className="pill ok">{t(h.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3>{t("Camps near you")}</h3>
            <button className="btn" onClick={() => setView("camps")}>{t("See all camps")}</button>
          </div>
          {nearbyCamps.length === 0 ? (
            <p className="hint">{t("No camps in this region right now.")}</p>
          ) : (
            <div className="timeline">
              {nearbyCamps.map((c) => (
                <div className="t-row" key={c.date + c.location}>
                  <div className="t-dot" style={{ background: c.status === "Ongoing" ? "var(--success)" : "var(--primary)" }} />
                  <div className="t-body">
                    <div className="t-title">{c.location}</div>
                    <div className="t-meta">{c.date} · {c.organiser} · {t(c.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t("My notifications")}</h3></div>
        <div className="timeline">
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--primary)" }} />
            <div className="t-body">
              <div className="t-title">{t("Thank you for donating! Your donation report is ready.")}</div>
              <div className="t-meta">{t("App notification")}</div>
            </div>
          </div>
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--success)" }} />
            <div className="t-body">
              <div className="t-title">{t("Remember to drink water and rest well before your next donation.")}</div>
              <div className="t-meta">{t("Health tip")}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
