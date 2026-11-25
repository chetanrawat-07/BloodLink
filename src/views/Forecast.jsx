import { useLang } from "../i18n.jsx";

const DAYS = ["Today", "+1d", "+2d", "+3d", "+4d", "+5d", "+6d"];
const STOCK = [18, 15, 13, 10, 8, 5, 3];
const THRESHOLD = 9;
const W = 480, H = 200, PAD_L = 34, PAD_B = 26, PAD_T = 14, PAD_R = 10;
const INNER_W = W - PAD_L - PAD_R, INNER_H = H - PAD_T - PAD_B;
const MAX_V = 20;

function X(i) {
  return PAD_L + (INNER_W / (STOCK.length - 1)) * i;
}
function Y(v) {
  return PAD_T + INNER_H - (v / MAX_V) * INNER_H;
}

function ForecastChart() {
  const { t } = useLang();
  const pathD = STOCK.map((v, i) => `${i === 0 ? "M" : "L"}${X(i)},${Y(v)}`).join(" ");
  const areaD = `${pathD} L${X(STOCK.length - 1)},${Y(0)} L${X(0)},${Y(0)} Z`;
  const threshY = Y(THRESHOLD);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" role="img" aria-label={t("7 day stock forecast")}>
      <line x1={PAD_L} y1={Y(0)} x2={W - PAD_R} y2={Y(0)} stroke="var(--border)" strokeWidth="1" />
      <rect x={PAD_L} y={PAD_T} width={INNER_W} height={threshY - PAD_T} fill="var(--critical-soft)" opacity="0.6" />
      <line x1={PAD_L} y1={threshY} x2={W - PAD_R} y2={threshY} stroke="var(--critical)" strokeDasharray="4 3" strokeWidth="1.2" />
      <text x={W - PAD_R} y={threshY - 5} textAnchor="end" fontSize="10" fill="var(--critical)">
        {t("reorder level ({n})", { n: THRESHOLD })}
      </text>
      <path d={areaD} fill="var(--primary-soft)" opacity="0.7" />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.4" />
      {STOCK.map((v, i) => {
        const below = v < THRESHOLD;
        return (
          <g key={i}>
            <circle cx={X(i)} cy={Y(v)} r="4" fill={below ? "var(--critical)" : "var(--primary)"} />
            <text x={X(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{t(DAYS[i])}</text>
            <text x={X(i)} y={Y(v) - 9} textAnchor="middle" fontSize="10" fill="var(--text)">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Forecast() {
  const { t } = useLang();
  return (
    <>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("7‑day shortage forecast — O−, Ladakh")}</h3>
            <span className="hint">{t("AI projection")}</span>
          </div>
          <ForecastChart />
          <p className="hint" style={{ marginTop: 10 }}>
            {t("Forecasts here run on synthetic data for the demo. Production forecasting needs 2–3 years of real donation / issue history, as flagged in the brief.")}
          </p>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t("Active alerts")}</h3></div>
          <div className="timeline">
            <div className="t-row">
              <div className="t-dot" style={{ background: "var(--critical)" }} />
              <div className="t-body">
                <div className="t-title">{t("Shortage predicted — O−, Ladakh, in ~5 days")}</div>
                <div className="t-meta">{t("Recommend donor recall now · see Donor Network")}</div>
              </div>
            </div>
            <div className="t-row">
              <div className="t-dot" style={{ background: "var(--warning)" }} />
              <div className="t-body">
                <div className="t-title">{t("Platelet surplus nearing expiry — GMC Amritsar")}</div>
                <div className="t-meta">{t("Recommend inter‑district transfer to Patiala (approval required)")}</div>
              </div>
            </div>
            <div className="t-row">
              <div className="t-dot" style={{ background: "var(--primary)" }} />
              <div className="t-body">
                <div className="t-title">{t("Seasonal demand uptick expected — Amarnath Yatra corridor")}</div>
                <div className="t-meta">{t("Historical pattern from synthetic baseline, J&K region")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
