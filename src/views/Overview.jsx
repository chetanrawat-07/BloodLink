import { regions, groupMix, activity } from "../data.js";

export default function Overview({ regionFilter, setView }) {
  const filteredRegions = regions.filter((r) => regionFilter === "all" || regionFilter === r.id);

  return (
    <>
      <div className="alert-banner">
        🔴 <strong>Critical:</strong>&nbsp;O‑negative stock in Ladakh is 2 units against a 15‑unit reorder level.
        <button onClick={() => setView("emergency")}>View emergency request →</button>
      </div>

      <div className="grid cols-5">
        <div className="kpi">
          <div className="num">4,812</div>
          <div className="lbl">Units in stock, network‑wide</div>
          <div className="delta up">▲ 3.1% vs last week</div>
        </div>
        <div className="kpi">
          <div className="num">18</div>
          <div className="lbl">Connected blood banks</div>
          <div className="delta">3 states · 1 shared instance</div>
        </div>
        <div className="kpi">
          <div className="num">3</div>
          <div className="lbl">Critical shortage alerts</div>
          <div className="delta down">▲ since yesterday</div>
        </div>
        <div className="kpi">
          <div className="num">46</div>
          <div className="lbl">Units expiring in 72h</div>
          <div className="delta down">FIFO redistribution pending</div>
        </div>
        <div className="kpi">
          <div className="num">12</div>
          <div className="lbl">Camps running this month</div>
          <div className="delta up">incl. Amarnath Yatra route</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3>Stock by region</h3>
            <span className="hint">Tap a region chip above to filter every screen</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Region</th><th>Blood banks</th><th>Units in stock</th><th>Critical alerts</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredRegions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.banks}</td>
                    <td>{r.units.toLocaleString()}</td>
                    <td>{r.critical}</td>
                    <td>
                      {r.status === "critical" ? (
                        <span className="pill bad">Critical</span>
                      ) : (
                        <span className="pill ok">Healthy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Blood group mix, network‑wide</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groupMix.map((g) => (
              <div key={g.g}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{g.g}</span>
                  <span className="mono" style={{ color: "var(--text-muted)" }}>{g.pct}%</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${g.pct * 2.6}%`, background: g.g.includes("-") ? "var(--accent)" : "var(--primary)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Recent activity</h3>
          <span className="hint">Latest actions synced across the network</span>
        </div>
        <div className="timeline">
          {activity.map((a, i) => (
            <div className="t-row" key={i}>
              <div className="t-dot" style={{ background: a.c }} />
              <div className="t-body">
                <div className="t-title">{a.t}</div>
                <div className="t-meta">{a.m}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
