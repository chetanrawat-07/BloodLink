import { camps, regionName } from "../data.js";
import { useLang } from "../i18n.jsx";

const STATUS_CLS = { Upcoming: "neutral", Ongoing: "ok", Completed: "neutral" };

// Shared by centre staff (read-only) and donors (pass `toast` to show the Register button).
export default function Camps({ regionFilter, toast }) {
  const { t } = useLang();
  const rows = camps.filter((c) => regionFilter === "all" || c.region === regionFilter);

  return (
    <div className="panel">
      <div className="panel-head"><h3>{t("Camps & events")}</h3></div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{t("Date")}</th><th>{t("Location")}</th><th>{t("Region")}</th><th>{t("Organiser")}</th>
              <th>{t("Registered")}</th><th>{t("Status")}</th>{toast && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.date + c.location}>
                <td>{c.date}</td>
                <td>{c.location}</td>
                <td>{t(regionName(c.region))}</td>
                <td>{c.organiser}</td>
                <td>{c.registered}</td>
                <td><span className={`pill ${STATUS_CLS[c.status]}`}>{t(c.status)}</span></td>
                {toast && (
                  <td>
                    {c.status !== "Completed" && (
                      <button className="btn primary" onClick={() => toast(t("Registered for {camp}.", { camp: c.location }))}>
                        {t("Register")}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="hint">{t("No camps in this region right now.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
