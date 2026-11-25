import { useEffect, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import { titleMap } from "./data.js";
import Overview from "./views/Overview.jsx";
import Inventory from "./views/Inventory.jsx";
import Emergency from "./views/Emergency.jsx";
import SupplyMap from "./views/SupplyMap.jsx";
import Forecast from "./views/Forecast.jsx";
import Donors from "./views/Donors.jsx";
import DonorApp from "./views/DonorApp.jsx";
import BuildPlan from "./views/BuildPlan.jsx";

const REGION_CHIPS = [
  { id: "all", label: "All regions" },
  { id: "jk", label: "Jammu & Kashmir" },
  { id: "ladakh", label: "Ladakh" },
  { id: "punjab", label: "Punjab" },
];

export default function Dashboard({ user, onLogout, toast }) {
  const [displayView, setDisplayView] = useState("overview");
  const [transClass, setTransClass] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

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

  // if a non-centre user is somehow on the centre-only Build Plan view, bounce back
  useEffect(() => {
    if (displayView === "plan" && user?.role !== "centre") {
      setDisplayView("overview");
      setTransClass("");
    }
  }, [user, displayView]);

  const [title, subtitle] = titleMap[displayView] || titleMap.overview;

  return (
    <div className="app">
      <Sidebar view={displayView} setView={setView} user={user} onLogout={onLogout} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="sub">{subtitle}</div>
          </div>
          <div className="topbar-spacer" />
          <div className="chip-row">
            {REGION_CHIPS.map((r) => (
              <button
                key={r.id}
                className={`chip${regionFilter === r.id ? " active" : ""}`}
                onClick={() => setRegionFilter(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="badge demo">⚗️ Static demo · synthetic data</span>
        </div>

        <div className="content">
          <section className={`view ${transClass}`.trim()}>
            {displayView === "overview" && <Overview regionFilter={regionFilter} setView={setView} />}
            {displayView === "inventory" && <Inventory />}
            {displayView === "emergency" && <Emergency user={user} toast={toast} />}
            {displayView === "map" && <SupplyMap />}
            {displayView === "forecast" && <Forecast />}
            {displayView === "donors" && <Donors user={user} toast={toast} />}
            {displayView === "app" && <DonorApp />}
            {displayView === "plan" && user?.role === "centre" && <BuildPlan />}
          </section>
        </div>
      </main>
    </div>
  );
}
