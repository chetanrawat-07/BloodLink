import {
  IconOverview,
  IconInventory,
  IconEmergency,
  IconMap,
  IconForecast,
  IconHeart,
  IconPhone,
  IconPlan,
  IconFile,
  IconTruck,
  IconChain,
  IconChat,
  IconSpark,
  IconSync,
  IconShield,
  IconTarget,
  IconCheckCircle,
} from "./icons.jsx";
import { useLang } from "./i18n.jsx";
import { ROLE_LABELS } from "./access.js";

// Staff navigation follows the platform structure; `roles` lists who may open each view.
// Existing views are kept and renamed/extended in place (no duplicate entries).
const OPS = ["super", "state", "district", "centre", "official"];
const ADMINS = ["super", "state"];
const STAFF_NAV = [
  { group: "Dashboard", items: [
    { view: "overview", label: "Executive Overview", Icon: IconOverview, roles: OPS },
    { view: "command", label: "Command Centre", Icon: IconTarget, roles: ["super", "state", "district", "official"] },
  ]},
  { group: "AI Intelligence", items: [
    { view: "forecast", label: "AI Demand Forecasting", Icon: IconForecast, roles: OPS },
    { view: "inventory", label: "Smart Inventory Intelligence", Icon: IconInventory, roles: OPS },
    { view: "insights", label: "AI Insights", Icon: IconSpark, roles: OPS },
    { view: "assistant", label: "AI Assistant", Icon: IconChat, roles: OPS },
  ]},
  { group: "Operations", items: [
    { view: "map", label: "Supply Chain Intelligence", Icon: IconMap, roles: OPS },
    { view: "emergency", label: "Emergency Response", Icon: IconEmergency, roles: [...OPS, "hospital"] },
    { view: "transfers", label: "Transfer Management", Icon: IconTruck, roles: OPS },
    { view: "ledger", label: "Blockchain Ledger", Icon: IconChain, roles: OPS },
  ]},
  { group: "Integration", items: [
    { view: "integration", label: "e-RaktKosh Integration", Icon: IconSync, roles: [...ADMINS, "official"] },
    { view: "sync", label: "Data Synchronisation", Icon: IconSync, roles: [...ADMINS, "official"] },
    { view: "quality", label: "Data Quality Monitoring", Icon: IconCheckCircle, roles: [...ADMINS, "official"] },
  ]},
  { group: "Analytics", items: [
    { view: "reports", label: "Reports", Icon: IconFile, roles: OPS },
    { view: "performance", label: "Performance Analytics", Icon: IconOverview, roles: OPS },
    { view: "wastage", label: "Wastage Analytics", Icon: IconInventory, roles: OPS },
  ]},
  { group: "Community", items: [
    { view: "donors", label: "Donor Network & Camps", Icon: IconHeart, roles: ["super", "centre"] },
    { view: "app", label: "Donor App Preview", Icon: IconPhone, roles: ["super", "centre"] },
    { view: "centres", label: "Find Blood Centres", Icon: IconMap, roles: ["hospital"] },
  ]},
  { group: "Administration", items: [
    { view: "users", label: "User Management", Icon: IconShield, roles: ADMINS },
    { view: "roles", label: "Role Management", Icon: IconShield, roles: ["super"] },
    { view: "facilities", label: "Facility Management", Icon: IconShield, roles: ADMINS },
    { view: "config", label: "System Configuration", Icon: IconShield, roles: ["super", "state"] },
    { view: "audit", label: "Audit Logs", Icon: IconShield, roles: ADMINS },
  ]},
  { group: "Project", items: [
    { view: "plan", label: "Build Plan & Compliance", Icon: IconPlan, roles: ["super", "centre"] },
  ]},
];

const navFor = (role) => STAFF_NAV.map((g) => ({ group: g.group, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);

// Each role only ever sees its own views; Dashboard uses this as the allow-list.
export const NAV_BY_ROLE = {
  centre: navFor("centre"),
  super: navFor("super"),
  state: navFor("state"),
  district: navFor("district"),
  hospital: navFor("hospital"),
  official: navFor("official"),
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
  const roleLabel = user?.role === "centre" ? t("Blood Centre") : user?.role === "donor" || !user?.role ? t("Donor") : t(ROLE_LABELS[user.role]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🩸</div>
        <div className="brand-text">
          <strong>{t("Blood Link")}</strong>
          <span>{t("AI Supply Chain Intelligence")}</span>
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
          <span className="dot" style={{ background: "#E8B04B", boxShadow: "0 0 0 3px rgba(232,176,75,.25)" }} /> {t("e-RaktKosh: not connected (demo data)")}
        </div>
      </div>
    </aside>
  );
}
