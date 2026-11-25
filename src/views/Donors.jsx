export default function Donors({ user, toast }) {
  function handleRecall() {
    if (user?.role !== "centre") {
      toast("You're signed in as a Donor — log in as Blood Centre staff to send a recall alert.");
      return;
    }
    toast("Recall sent via app push + SMS fallback to 34 matching O− donors.");
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Rare‑group recall — O−, within 15 km of Leh</h3></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Donor UID</th><th>Last donation</th><th>Eligible</th><th>Distance</th></tr></thead>
            <tbody>
              <tr><td className="mono">BL‑DNR‑00981</td><td>14 Aug 2026</td><td><span className="pill ok">Yes</span></td><td>3.2 km</td></tr>
              <tr><td className="mono">BL‑DNR‑01124</td><td>02 Jun 2026</td><td><span className="pill ok">Yes</span></td><td>6.8 km</td></tr>
              <tr><td className="mono">BL‑DNR‑00456</td><td>29 Oct 2026</td><td><span className="pill warn">In 3 wks</span></td><td>9.1 km</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={handleRecall}>Send recall alert to 34 matching donors</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Camps &amp; events</h3></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Location</th><th>Region</th><th>Organiser</th><th>Registered</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>24 Nov 2026</td><td>Patiala Blood Drive</td><td>Punjab</td><td>Rajindra Hospital</td><td>118</td><td><span className="pill neutral">Upcoming</span></td></tr>
              <tr><td>20 Nov 2026</td><td>Amarnath Yatra base camp</td><td>J&amp;K</td><td>SBTC J&amp;K</td><td>72</td><td><span className="pill ok">Ongoing</span></td></tr>
              <tr><td>12 Nov 2026</td><td>GMC Amritsar campus</td><td>Punjab</td><td>GMC Amritsar</td><td>94</td><td><span className="pill neutral">Completed</span></td></tr>
              <tr><td>08 Nov 2026</td><td>Leh winter drive</td><td>Ladakh</td><td>SNM Hospital</td><td>21</td><td><span className="pill neutral">Completed</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Notification feed, as donors &amp; hospitals see it</h3></div>
        <div className="timeline">
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--critical)" }} />
            <div className="t-body">
              <div className="t-title">"O− urgently needed at SNM Hospital, Leh"</div>
              <div className="t-meta">Push + SMS fallback · sent 2 min ago</div>
            </div>
          </div>
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--primary)" }} />
            <div className="t-body">
              <div className="t-title">"It's time to donate again — you're eligible from 24 Nov"</div>
              <div className="t-meta">Routine reminder · app notification</div>
            </div>
          </div>
          <div className="t-row">
            <div className="t-dot" style={{ background: "var(--success)" }} />
            <div className="t-body">
              <div className="t-title">"New camp near you: Patiala Blood Drive, 24 Nov"</div>
              <div className="t-meta">Camp alert with map link</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
