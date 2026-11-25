import { centres, regionName } from "../data.js";
import { useLang } from "../i18n.jsx";

const STATUS_PILL = { ok: ["ok", "Sufficient stock"], low: ["warn", "Low stock"], critical: ["bad", "Critical — donors needed"] };

export default function Centres({ regionFilter }) {
  const { t } = useLang();
  const rows = centres.filter((c) => regionFilter === "all" || c.region === regionFilter);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{t("Blood centres near you")}</h3>
        <span className="hint">{t("Centres marked critical need donors most urgently")}</span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{t("Blood centre")}</th><th>{t("City")}</th><th>{t("Region")}</th><th>{t("Phone")}</th>
              <th>{t("Hours")}</th><th>{t("Stock status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const [cls, label] = STATUS_PILL[c.status];
              return (
                <tr key={c.name}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.city}</td>
                  <td>{t(regionName(c.region))}</td>
                  <td className="mono"><a href={`tel:${c.phone}`}>{c.phone}</a></td>
                  <td>{c.open24 ? t("Open 24×7") : t("9 AM – 5 PM")}</td>
                  <td><span className={`pill ${cls}`}>{t(label)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
