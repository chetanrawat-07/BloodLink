import {
  IconOverview,
  IconInventory,
  IconEmergency,
  IconMap,
  IconForecast,
  IconHeart,
  IconPhone,
  IconPlan,
} from "./icons.jsx";
import { useLang } from "./i18n.jsx";

// Each role only ever sees its own views; Dashboard uses this as the allow-list.
export const NAV_BY_ROLE = {
  centre: [
    { group: "Operations", items: [
      { view: "overview", label: "Network Overview", Icon: IconOverview },
      { view: "inventory", label: "Inventory & Cold Chain", Icon: IconInventory },
      { view: "emergency", label: "Emergency Request", Icon: IconEmergency },
      { view: "map", label: "Supply Map & Routes", Icon: IconMap },
      { view: "forecast", label: "Demand Forecast", Icon: IconForecast },
    ]},
    { group: "Community", items: [
      { view: "donors", label: "Donor Network & Camps", Icon: IconHeart },
      { view: "app", label: "Donor App Preview", Icon: IconPhone },
    ]},
    { group: "Project", items: [
      { view: "plan", label: "Build Plan & Compliance", Icon: IconPlan },
    ]},
  ],
  donor: [
    { group: "My Account", items: [
      { view: "myDash", label: "My Dashboard", Icon: IconOverview },
      { view: "camps", label: "Camps & Events", Icon: IconHeart },
      { view: "centres", label: "Find Blood Centres", Icon: IconMap },
    ]},
  ],
};

export default function Sidebar({ view, setView, user, onLogout }) {
  const { t } = useLang();
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.donor;
  const roleLabel = user?.role === "centre" ? t("Blood Centre") : t("Donor");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🩸</div>
        <div className="brand-text">
          <strong>{t("Blood Link")}</strong>
          <span>{t("Supply Chain Platform")}</span>
        </div>
      </div>
      <nav className="nav">
        {nav.map((section) => (
          <div key={section.group}>
            <div className="nav-label">{t(section.group)}</div>
            {section.items.map(({ view: v, label, Icon }) => (
              <button
                key={v}
                className={`nav-btn${view === v ? " active" : ""}`}
                onClick={() => setView(v)}
              >
                <Icon />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div>
          <div className="auth-user-chip">
            <span className="dot" />
            {user?.name} · {roleLabel}
          </div>
          {user?.facility && <div className="sync-row">🏥 {user.facility}</div>}
          <div className="auth-btn-row">
            <button onClick={onLogout}>{t("Log out")}</button>
          </div>
        </div>
        <div className="sync-row">
          <span className="dot" /> {t("Offline-first sync: OK")}
        </div>
        <div className="sync-row">🕑 {t("Last synced just now")}</div>
      </div>
    </aside>
  );
}
