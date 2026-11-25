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

const NAV_ITEMS = [
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
];

export default function Sidebar({ view, setView, user, onLogout }) {
  const isCentre = user?.role === "centre";
  const roleLabel = user?.role === "centre" ? "Blood Centre" : "Donor";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🩸</div>
        <div className="brand-text">
          <strong>Blood Link</strong>
          <span>Supply Chain Platform</span>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.group}>
            <div className="nav-label">{section.group}</div>
            {section.items.map(({ view: v, label, Icon }) => (
              <button
                key={v}
                className={`nav-btn${view === v ? " active" : ""}`}
                onClick={() => setView(v)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
        {isCentre && (
          <div>
            <div className="nav-label">Project</div>
            <button
              className={`nav-btn${view === "plan" ? " active" : ""}`}
              onClick={() => setView("plan")}
            >
              <IconPlan />
              <span>Build Plan &amp; Compliance</span>
            </button>
          </div>
        )}
      </nav>
      <div className="sidebar-foot">
        <div>
          <div className="auth-user-chip">
            <span className="dot" />
            {user?.name} · {roleLabel}
          </div>
          <div className="auth-btn-row">
            <button onClick={onLogout}>Log out</button>
          </div>
        </div>
        <div className="sync-row">
          <span className="dot" /> Offline-first sync: OK
        </div>
        <div className="sync-row">🕑 Last synced just now</div>
      </div>
    </aside>
  );
}
