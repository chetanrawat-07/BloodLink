import { useState } from "react";
import Sidebar, { NAV_BY_ROLE } from "./Sidebar.jsx";
import { titleMap, regions } from "./data.js";
import { useLang, LangSwitcher } from "./i18n.jsx";
import Overview from "./views/Overview.jsx";
import Inventory from "./views/Inventory.jsx";
import Emergency from "./views/Emergency.jsx";
import SupplyMap from "./views/SupplyMap.jsx";
import Forecast from "./views/Forecast.jsx";
import Donors from "./views/Donors.jsx";
import DonorApp from "./views/DonorApp.jsx";
import BuildPlan from "./views/BuildPlan.jsx";
import DonorHome from "./views/DonorHome.jsx";
import Camps from "./views/Camps.jsx";
import Centres from "./views/Centres.jsx";

export default function Dashboard({ user, onLogout, toast }) {
  const { t } = useLang();
  const isDonor = user?.role !== "centre";
  const allowed = (NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.donor).flatMap((s) => s.items.map((i) => i.view));
  const [displayView, setDisplayView] = useState(allowed[0]);
  const [transClass, setTransClass] = useState("");
  // donors start scoped to their own state; centre staff see the whole network
  const [regionFilter, setRegionFilter] = useState(isDonor && user?.region ? user.region : "all");

  function setView(name) {
    if (name === displayView) return;
    setTransClass("view-leaving");
    setTimeout(() => {
      setDisplayView(name);
      setTransClass("view-entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransClass(""));
      });
    }, 150);
  }

  // never render a view that doesn't belong to this role
  const view = allowed.includes(displayView) ? displayView : allowed[0];
  const [title, subtitle] = titleMap[view];
  const showRegions = ["overview", "inventory", "donors", "camps", "centres"].includes(view);

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} user={user} onLogout={onLogout} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{t(title)}</h1>
            <div className="sub">{t(subtitle)}</div>
          </div>
          <div className="topbar-spacer" />
          {showRegions && (
            <div className="chip-row">
              {[{ id: "all", name: "All regions" }, ...regions].map((r) => (
                <button
                  key={r.id}
                  className={`chip${regionFilter === r.id ? " active" : ""}`}
                  onClick={() => setRegionFilter(r.id)}
                >
                  {t(r.name)}
                </button>
              ))}
            </div>
          )}
          <span className="badge demo">⚗️ {t("Static demo · synthetic data")}</span>
          <LangSwitcher />
        </div>

        <div className="content">
          <section className={`view ${transClass}`.trim()}>
            {view === "overview" && <Overview regionFilter={regionFilter} setView={setView} />}
            {view === "inventory" && <Inventory regionFilter={regionFilter} />}
            {view === "emergency" && <Emergency toast={toast} />}
            {view === "map" && <SupplyMap />}
            {view === "forecast" && <Forecast />}
            {view === "donors" && <Donors regionFilter={regionFilter} toast={toast} />}
            {view === "app" && <DonorApp />}
            {view === "plan" && <BuildPlan />}
            {view === "myDash" && <DonorHome user={user} setView={setView} />}
            {view === "camps" && <Camps regionFilter={regionFilter} toast={toast} />}
            {view === "centres" && <Centres regionFilter={regionFilter} />}
          </section>
        </div>
      </main>
    </div>
  );
}
