import { useEffect, useRef, useState } from "react";
import { demoUsers } from "./data.js";
import { IconOverview, IconEmergency, IconHeart, IconForecast, IconFile, IconSearch, IconTruck, IconCheckCircle } from "./icons.jsx";

const TAGLINES = [
  "Live network-wide stock visibility, minute by minute.",
  "Route an emergency request to the nearest match in minutes.",
  "Cold-chain monitored from collection to delivery.",
];

function useReveal() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function RevealSection({ className = "", children }) {
  const [ref, inView] = useReveal();
  return (
    <section ref={ref} className={`auth-section reveal${inView ? " in" : ""} ${className}`}>
      {children}
    </section>
  );
}

export default function AuthPage({ auth, toast }) {
  const [mode, setMode] = useState("login");
  const [loginTab, setLoginTab] = useState("centre");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suRole, setSuRole] = useState("centre");
  const [suFacility, setSuFacility] = useState("");
  const [signupError, setSignupError] = useState("");
  const [taglineIdx, setTaglineIdx] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  function openLogin(tab) {
    setLoginError("");
    setSignupError("");
    if (tab) setLoginTab(tab);
    setMode("login");
  }
  function openSignup() {
    setLoginError("");
    setSignupError("");
    setMode("signup");
  }

  function fillDemo() {
    const demo = loginTab === "centre" ? demoUsers[0] : demoUsers[1];
    setLoginEmail(demo.email);
    setLoginPassword(demo.password);
  }

  function handleLogin(e) {
    e.preventDefault();
    const res = auth.login(loginEmail, loginPassword, loginTab);
    if (!res.ok) {
      setLoginError(res.error);
      return;
    }
    toast(`Logged in as ${res.user.name}.`);
  }

  function handleSignup(e) {
    e.preventDefault();
    const res = auth.signup({ name: suName, email: suEmail, password: suPassword, role: suRole, facility: suFacility });
    if (!res.ok) {
      setSignupError(res.error);
      return;
    }
    toast(`Account created — logged in as ${res.user.name}.`);
  }

  function scrollToLogin() {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const demoLabel = loginTab === "centre" ? "Blood Centre staff" : "Donor";
  const demoEmail = loginTab === "centre" ? demoUsers[0].email : demoUsers[1].email;

  return (
    <div className="auth-page">
      <div className="auth-hero-wrap" ref={heroRef}>
        <div className="auth-page-inner">
          <div className="auth-brand-panel">
            <div className="auth-blob" style={{ width: 220, height: 220, background: "#fff", top: -60, right: -50 }} />
            <div className="auth-blob" style={{ width: 160, height: 160, background: "#F2D6E0", bottom: -40, left: -30 }} />
            <div className="brand-mark">🩸</div>
            <h1>Blood Link</h1>
            <p>
              Regional blood supply coordination across Jammu &amp; Kashmir, Ladakh and Punjab — one shared,
              real-time picture for every blood centre and donor.
            </p>
            <div className="auth-tagline-box">
              <p className="auth-tagline" key={taglineIdx}>
                {TAGLINES[taglineIdx]}
              </p>
            </div>
            <ul className="auth-points">
              <li>Live network-wide stock visibility</li>
              <li>Emergency request routing between banks</li>
              <li>Cold-chain monitoring from collection to delivery</li>
            </ul>
          </div>

          <div className="auth-card-panel">
            {mode === "login" ? (
              <div>
                <div className="auth-head">
                  <h2>Log in to Blood Link</h2>
                  <p>Choose the login that matches your account</p>
                </div>
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={`auth-tab${loginTab === "centre" ? " active" : ""}`}
                    onClick={() => setLoginTab("centre")}
                  >
                    Blood Centre Login
                  </button>
                  <button
                    type="button"
                    className={`auth-tab${loginTab === "donor" ? " active" : ""}`}
                    onClick={() => setLoginTab("donor")}
                  >
                    Donor Login
                  </button>
                </div>
                {loginError && <div className="auth-error">{loginError}</div>}
                <form onSubmit={handleLogin}>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@facility.org"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <button className="btn primary" type="submit" style={{ width: "100%" }}>
                    Log in
                  </button>
                </form>
                <div className="auth-demo-hint">
                  <div className="dh-label">{demoLabel} demo account (password: demo123)</div>
                  <button type="button" className="auth-demo-row" onClick={fillDemo}>
                    <span>{demoLabel}</span>
                    <span className="email">{demoEmail}</span>
                  </button>
                </div>
                <div className="auth-switch">
                  New here?{" "}
                  <a onClick={openSignup} role="button" tabIndex={0}>
                    Create an account
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div className="auth-head">
                  <h2>Create your Blood Link account</h2>
                  <p>Stored only in this browser — nothing is sent anywhere</p>
                </div>
                {signupError && <div className="auth-error">{signupError}</div>}
                <form onSubmit={handleSignup}>
                  <div className="field">
                    <label>Full name</label>
                    <input type="text" required value={suName} onChange={(e) => setSuName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="At least 4 characters"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Account type</label>
                    <select value={suRole} onChange={(e) => setSuRole(e.target.value)}>
                      <option value="centre">Blood Centre / Hospital staff</option>
                      <option value="donor">Donor</option>
                    </select>
                  </div>
                  {suRole !== "donor" && (
                    <div className="field">
                      <label>Facility / blood centre name</label>
                      <input
                        type="text"
                        placeholder="e.g. GMC Jammu Blood Bank"
                        value={suFacility}
                        onChange={(e) => setSuFacility(e.target.value)}
                      />
                    </div>
                  )}
                  <button className="btn primary" type="submit" style={{ width: "100%" }}>
                    Create account
                  </button>
                </form>
                <div className="auth-switch">
                  Already registered?{" "}
                  <a onClick={() => openLogin()} role="button" tabIndex={0}>
                    Log in
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RevealSection>
        <h2>What you can do here</h2>
        <p className="as-sub">
          Every card below is a working part of the platform once you're signed in — log in or create an account
          above to open any of them.
        </p>
        <div className="as-services">
          <div className="as-service-card" onClick={scrollToLogin}>
            <div className="as-service-icon">
              <IconOverview size={20} />
            </div>
            <h3>Network Overview</h3>
            <p>Live stock, by region and blood group, across every connected centre.</p>
          </div>
          <div className="as-service-card" onClick={scrollToLogin}>
            <div className="as-service-icon">
              <IconEmergency size={20} />
            </div>
            <h3>Emergency Request</h3>
            <p>Route an urgent request to the nearest matching source in minutes.</p>
          </div>
          <div className="as-service-card" onClick={scrollToLogin}>
            <div className="as-service-icon">
              <IconHeart size={20} />
            </div>
            <h3>Donor Network &amp; Camps</h3>
            <p>Recall eligible donors and schedule voluntary donation camps.</p>
          </div>
          <div className="as-service-card" onClick={scrollToLogin}>
            <div className="as-service-icon">
              <IconForecast size={20} />
            </div>
            <h3>Demand Forecast</h3>
            <p>A 7-day shortage projection, region by region.</p>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="auth-section-tint-wrap">
        <div className="as-donate-grid">
          <div className="as-donate-figure">
            <div className="as-figure-blob" />
            <svg width="150" height="190" viewBox="0 0 150 190" aria-hidden="true">
              <circle cx="75" cy="38" r="30" fill="var(--primary)" opacity="0.9" />
              <path d="M20 190 C20 120 40 95 75 95 C110 95 130 120 130 190 Z" fill="var(--primary)" opacity="0.9" />
              <path
                d="M75 60 C62 78 52 92 52 105 C52 118 62 128 75 128 C88 128 98 118 98 105 C98 92 88 78 75 60 Z"
                fill="#fff"
                opacity="0.92"
              />
            </svg>
          </div>
          <div>
            <h2>Who can register?</h2>
            <p className="as-sub">
              Blood centre staff, hospital teams, and individual donors across Jammu &amp; Kashmir, Ladakh and
              Punjab can all create an account. Each one sees a view built for their role — a blood bank manages
              stock and approves requests, a donor keeps a simple profile and camp reminders.
            </p>
            <ul className="auth-points" style={{ color: "var(--text)" }}>
              <li style={{ color: "var(--text)" }}>Free to register, no approval wait for this demo</li>
              <li style={{ color: "var(--text)" }}>Role-based access — see only what's relevant to you</li>
              <li style={{ color: "var(--text)" }}>All data stays local to your browser</li>
            </ul>
          </div>
        </div>
      </RevealSection>

      <RevealSection>
        <h2>How it works</h2>
        <p className="as-sub">The same flow this prototype is built to prove out, end to end.</p>
        <div className="as-steps">
          <div className="as-step">
            <div className="as-step-icon">
              <IconFile />
            </div>
            <h4>Request logged</h4>
            <p>Hospital flags a need, routine or emergency</p>
          </div>
          <div className="as-step">
            <div className="as-step-icon">
              <IconSearch />
            </div>
            <h4>Source matched</h4>
            <p>Nearest stock found by group &amp; route status</p>
          </div>
          <div className="as-step">
            <div className="as-step-icon">
              <IconTruck />
            </div>
            <h4>Dispatched</h4>
            <p>Cold-chain tracked in transit</p>
          </div>
          <div className="as-step">
            <div className="as-step-icon">
              <IconCheckCircle />
            </div>
            <h4>Delivered</h4>
            <p>Confirmed and issued to patient</p>
          </div>
        </div>
      </RevealSection>

      <div className="auth-landing-footer">
        Blood Link is an independent demo prototype — not affiliated with any government department. All data shown
        is simulated and stored locally in your browser.
      </div>
    </div>
  );
}
