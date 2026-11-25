export default function DonorApp() {
  return (
    <>
      <div className="two-col">
        <div className="panel" style={{ display: "flex", justifyContent: "center" }}>
          <div className="phone">
            <div className="phone-screen">
              <div className="phone-notch" />
              <div className="phone-head">
                <div className="row">
                  <strong>Namaste, Tenzin</strong>
                  <span className="pill ok" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>O−</span>
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.9 }}>Next eligible donation: 24 Nov 2026 · Flagged: No</div>
              </div>
              <div className="phone-body">
                <div className="phone-grid">
                  <div className="phone-tile">🩸<span>Donate blood</span></div>
                  <div className="phone-tile">🔎<span>Look for blood</span></div>
                  <div className="phone-tile">⛺<span>Camps &amp; events</span></div>
                  <div className="phone-tile">📄<span>Reports</span></div>
                  <div className="phone-tile">📈<span>Activity</span></div>
                  <div className="phone-tile">💬<span>Support</span></div>
                </div>
                <div className="panel" style={{ padding: "10px 12px", boxShadow: "none" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600 }}>Upcoming camp reminder</div>
                  <div className="hint">Amarnath Yatra base camp · today · directions on map</div>
                </div>
              </div>
              <div className="phone-nav">
                <div className="on">🏠<span>Home</span></div>
                <div>⛺<span>Camps</span></div>
                <div>📈<span>Activity</span></div>
                <div>👤<span>Profile</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>User panel — mobile feature recap</h3></div>
          <div className="checklist">
            <div className="cl-item"><div className="box" />Registration via mobile app or biometric, Aadhaar‑linked UID</div>
            <div className="cl-item"><div className="box" />Donate via nearby camps or open hospitals, with directions</div>
            <div className="cl-item"><div className="box" />Need‑blood requests, with option to authorise someone else to collect</div>
            <div className="cl-item"><div className="box" />Profile with blood group, flagged status, next donation due date</div>
            <div className="cl-item"><div className="box" />Donation / reception activity history and downloadable reports</div>
            <div className="cl-item"><div className="box" />Support ticket + FAQ, answered from the admin panel</div>
            <div className="cl-item"><div className="box" />Automated alerts: donation reminders, nearby need, announcements</div>
          </div>
        </div>
      </div>
    </>
  );
}
