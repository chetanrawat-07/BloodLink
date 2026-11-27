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
import CommandCentre from "./views/CommandCentre.jsx";
import Insights from "./views/Insights.jsx";
import Assistant from "./views/Assistant.jsx";
import Transfers from "./views/Transfers.jsx";
import Ledger from "./views/Ledger.jsx";
import Integration from "./views/Integration.jsx";
import Reports from "./views/Reports.jsx";
import Admin from "./views/Admin.jsx";
import { useStore } from "./store.js";
import { InsufficientData } from "./ui.jsx";

// Views that show simulated data / AI output; hidden behind "Insufficient Data" when demo mode is off.
const DATA_VIEWS = ["command", "forecast", "inventory", "insights", "assistant", "map", "reports", "performance", "wastage"];

export default function Dashboard({ user, onLogout, toast }) {
  const { t } = useLang();
  const isDonor = user?.role === "donor";
  const allowed = (NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.donor).flatMap((s) => s.items.map((i) => i.view));
  const [displayView, setDisplayView] = useState(allowed[0]);
  const [params, setParams] = useState({});
  const demoMode = useStore((st) => st.config.demoMode);
  const [transClass, setTransClass] = useState("");
  // donors start scoped to their own state; centre staff see the whole network
  const [regionFilter, setRegionFilter] = useState(isDonor && user?.region ? user.region : "all");

  // params let one module open another pre-filtered (e.g. an insight → its forecast)
  function setView(name, p = {}) {
    setParams(p);
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
  const showRegions = ["overview", "donors", "camps", "centres"].includes(view);

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
            <label className="fsel">
              <select aria-label={t("All regions")} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                {[{ id: "all", name: "All regions" }, ...regions].map((r) => (
                  <option key={r.id} value={r.id}>{t(r.name)}</option>
                ))}
              </select>
            </label>
          )}
          <LangSwitcher />
        </div>

        <div className="content">
          <section className={`view ${transClass}`.trim()}>
            {!demoMode && DATA_VIEWS.includes(view) ? (
              <div className="panel">
                <InsufficientData
                  reason="Demonstration mode is off and no live data source is connected, so no predictions or analytics are shown."
                  requirement="To enable real intelligence: an approved e-RaktKosh feed (or validated imports) with at least 12 months of daily issue, collection and stock history per blood bank, group and component, plus the facility master. A Super Administrator can re-enable demonstration mode in System Configuration."
                />
              </div>
            ) : (
              <>
            {view === "overview" && <Overview regionFilter={regionFilter} setView={setView} />}
            {view === "inventory" && <Inventory key={JSON.stringify(params)} user={user} params={params} setView={setView} toast={toast} />}
            {view === "emergency" && <Emergency key={JSON.stringify(params)} user={user} params={params} toast={toast} />}
            {view === "map" && <SupplyMap key={JSON.stringify(params)} user={user} params={params} setView={setView} toast={toast} />}
            {view === "forecast" && <Forecast key={JSON.stringify(params)} user={user} params={params} setView={setView} toast={toast} />}
            {view === "command" && <CommandCentre user={user} setView={setView} />}
            {view === "insights" && <Insights user={user} setView={setView} />}
            {view === "assistant" && <Assistant user={user} />}
            {view === "transfers" && <Transfers key={JSON.stringify(params)} user={user} params={params} toast={toast} />}
            {view === "ledger" && <Ledger key={JSON.stringify(params)} user={user} params={params} toast={toast} />}
            {view === "integration" && <Integration user={user} tab="connection" toast={toast} />}
            {view === "sync" && <Integration user={user} tab="sync" toast={toast} />}
            {view === "quality" && <Integration user={user} tab="quality" toast={toast} />}
            {view === "reports" && <Reports user={user} tab="reports" params={params} toast={toast} />}
            {view === "performance" && <Reports user={user} tab="performance" toast={toast} />}
            {view === "wastage" && <Reports user={user} tab="wastage" toast={toast} />}
            {["users", "roles", "facilities", "config", "audit"].includes(view) && <Admin key={view} tab={view} user={user} toast={toast} />}
              </>
            )}
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
