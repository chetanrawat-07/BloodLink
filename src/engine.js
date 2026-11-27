// AI / analytics engine. Pure functions over the data layer — no UI, no randomness.
// Methods are deliberately transparent (statistical, explainable) so every output can show how it was derived.
import {
  NETWORK, FACILITIES, facById, COMPONENTS, compById, GROUPS, HISTORY_DAYS, AS_OF, DAY,
  AIR_LINKS, DISTRICTS, STATES, dayDate, cellKey, districtById,
} from "./networkData.js";

export const DEFAULT_CONFIG = {
  demoMode: true,
  expiry: {
    PRBC: { critical: 3, warning: 7 }, WB: { critical: 3, warning: 7 }, PLT: { critical: 1, warning: 2 },
    FFP: { critical: 30, warning: 60 }, CRYO: { critical: 30, warning: 60 },
  },
  leadDays: { jk: 3, punjab: 2, ladakh: 5 }, // replenishment lead time used for minimum stock
  maxCoverDays: { PRBC: 14, WB: 10, PLT: 3, FFP: 60, CRYO: 60 },
  minHistoryUnits: 10, // below this many units issued in 90 days a forecast is "Insufficient Data"
  delayedUpdateHours: 24,
  interState: { "jk>ladakh": true, "ladakh>jk": true, "jk>punjab": true, "punjab>jk": true, "punjab>ladakh": true, "ladakh>punjab": true },
  includeCompatible: false, // only an authorised medical officer may enable compatible-group matching
  retentionDays: 1825,
  sessionMinutes: 30,
};

export const FORECAST_METHOD = "Weekday-adjusted level + damped 28-day trend, back-tested on the last 14 days";
export const URGENCY_SLA_H = { Critical: 2, Urgent: 6, Routine: 24 };

// Reference ABO/Rh red-cell compatibility (recipient → acceptable donor groups).
// Used ONLY when an authorised medical officer enables compatible matching in System Configuration.
export const RBC_COMPAT = {
  "O-": ["O-"], "O+": ["O+", "O-"], "A-": ["A-", "O-"], "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "AB-": ["AB-", "A-", "B-", "O-"], "AB+": GROUPS,
};

// ---------- stats helpers ----------
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
const sumRange = (s, a, b) => { let t = 0; for (let i = Math.max(0, a); i < b; i++) t += s[i]; return t; };
const wd = (i) => dayDate(i).getUTCDay();

export function sumSeries(cells, field = "demand") {
  const out = new Float64Array(HISTORY_DAYS);
  for (const c of cells) { const s = c[field]; for (let i = 0; i < HISTORY_DAYS; i++) out[i] += s[i]; }
  return out;
}

// ---------- forecasting ----------
function fit(s, end) {
  const wk = new Array(7).fill(0), cnt = new Array(7).fill(0);
  let tot = 0;
  for (let i = end - 56; i < end; i++) { wk[wd(i)] += s[i]; cnt[wd(i)]++; tot += s[i]; }
  const mean = tot / 56;
  const f = wk.map((v, w) => (mean > 0 ? 0.5 + 0.5 * (v / cnt[w] / mean) : 1));
  const y = [];
  for (let i = end - 28; i < end; i++) y.push(s[i] / f[wd(i)]);
  const level = y.slice(14).reduce((a, b) => a + b, 0) / 14;
  const xm = 13.5, ym = y.reduce((a, b) => a + b, 0) / 28;
  let num = 0, den = 0;
  y.forEach((v, x) => { num += (x - xm) * (v - ym); den += (x - xm) ** 2; });
  const slope = num / den;
  const predict = (h) => Math.max(0, (level + slope * (6.5 + h) * 0.7) * f[wd(end - 1 + h)]);
  return { predict, slope, level };
}

export function forecastSeries(s, horizon = 7, minUnits = DEFAULT_CONFIG.minHistoryUnits) {
  const n = s.length;
  const last90 = Math.round(sumRange(s, n - 90, n));
  if (last90 < minUnits) {
    return { status: "insufficient", last90, reason: `Only ${last90} units issued in the last 90 days — at least ${minUnits} are needed for a stable forecast.` };
  }
  const bt = fit(s, n - 14);
  let pSum = 0, aSum = 0, se = 0;
  for (let h = 1; h <= 14; h++) { const p = bt.predict(h), a = s[n - 15 + h]; pSum += p; aSum += a; se += (p - a) ** 2; }
  const backtestErr = Math.abs(pSum - aSum) / Math.max(aSum, 1);
  const rmse = Math.sqrt(se / 14);
  const m = fit(s, n);
  const daily = Array.from({ length: horizon }, (_, k) => m.predict(k + 1));
  const total = daily.reduce((a, b) => a + b, 0);
  const sd = Math.max(rmse * Math.sqrt(horizon), Math.sqrt(total), 0.5);
  return {
    status: "ok", horizon, daily, total, sd,
    lower: Math.max(0, total - 1.28 * sd), upper: total + 1.28 * sd, // 80% interval
    confidence: backtestErr <= 0.15 ? "High" : backtestErr <= 0.35 ? "Medium" : "Low",
    backtestErr, trendPerWeek: m.slope * 7, level: m.level, last90,
  };
}

export function demandChange(s, window = 14) {
  const n = s.length;
  const current = sumRange(s, n - window, n), previous = sumRange(s, n - 2 * window, n - window);
  return { current, previous, pct: previous > 0 ? (current - previous) / previous : null };
}

// Short spike vs the preceding 4 weeks (Poisson z-score)
export function detectAnomaly(s) {
  const n = s.length;
  const m3 = sumRange(s, n - 3, n) / 3, base = sumRange(s, n - 31, n - 3) / 28;
  const z = (m3 - base) / Math.sqrt(Math.max(base, 0.1) / 3);
  return { z, recent: m3, baseline: base, flagged: z > 3.5 && m3 >= 2 * base && m3 * 3 >= 5 };
}

export function seasonalIndex(s) {
  const months = new Array(12).fill(0), days = new Array(12).fill(0);
  for (let i = 0; i < s.length; i++) { const m = dayDate(i).getUTCMonth(); months[m] += s[i]; days[m]++; }
  const perDay = months.map((v, m) => (days[m] ? v / days[m] : 0));
  const mean = perDay.reduce((a, b) => a + b, 0) / 12 || 1;
  return perDay.map((v) => v / mean);
}

// ---------- model ----------
const STATUS_FIELD = { Available: "available", Reserved: "reserved", Quarantined: "quarantined", Unusable: "unusable" };

export function buildModel(adjust = {}, config = DEFAULT_CONFIG) {
  const cells = NETWORK.cells.map((c) => ({ ...c, available: 0, reserved: 0, quarantined: 0, unusable: 0, units: [] }));
  const byKey = new Map(cells.map((c) => [c.key, c]));
  for (const u of NETWORK.units) {
    const c = byKey.get(cellKey(u.facId, u.group, u.comp));
    c.units.push(u);
    c[STATUS_FIELD[u.status]]++;
  }
  for (const [k, d] of Object.entries(adjust)) {
    const c = byKey.get(k);
    if (c) c.available = Math.max(0, c.available + d);
  }
  for (const c of cells) c.units.sort((a, b) => a.expiry - b.expiry);
  return { cells, byKey, config, cache: new Map() };
}

export function selectCells(model, { state, district, facId, group, comp, where } = {}) {
  return model.cells.filter((c) =>
    (!state || state === "all" || c.state === state) &&
    (!district || district === "all" || c.district === district) &&
    (!facId || facId === "all" || c.facId === facId) &&
    (!group || group === "all" || c.group === group) &&
    (!comp || comp === "all" || c.comp === comp) &&
    (!where || where(facById[c.facId])));
}

export const daysLeft = (u) => (u.expiry - AS_OF) / DAY;
export function expiryRisk(u, config) {
  const d = daysLeft(u), t = config.expiry[u.comp];
  return d < 0 ? "expired" : d <= t.critical ? "critical" : d <= t.warning ? "warning" : "ok";
}

// Analysis of one facility × group × component cell
export function analyseCell(model, key, horizon = 7) {
  const ck = `${key}|${horizon}`;
  if (model.cache.has(ck)) return model.cache.get(ck);
  const c = model.byKey.get(key);
  const cfg = model.config;
  const fc = forecastSeries(c.demand, horizon, cfg.minHistoryUnits);
  const mu = fc.status === "ok" ? fc.total / horizon : sumRange(c.demand, HISTORY_DAYS - 28, HISTORY_DAYS) / 28;
  const lead = c.comp === "PLT" ? 1 : cfg.leadDays[c.state]; // platelets are prepared locally every day
  const comp = compById[c.comp];
  const minLevel = mu * lead < 0.05 ? 0 : Math.ceil(mu * lead + 1.65 * Math.sqrt(mu * lead));
  const maxCover = Math.min(cfg.maxCoverDays[c.comp], comp.shelf * 0.6);
  const maxLevel = Math.max(minLevel + 1, Math.ceil(mu * maxCover));
  const available = c.available;

  // expected replenishment = average daily collections/preparation over the last 28 days
  const supplyMu = sumRange(c.collected, HISTORY_DAYS - 28, HISTORY_DAYS) / 28;
  let shortageProb = null, depletionDay = null, projected = null;
  if (fc.status === "ok") {
    projected = available + supplyMu * horizon - fc.total;
    shortageProb = 1 - normCdf((projected + 0.5) / fc.sd);
    let cum = 0;
    for (let h = 0; h < horizon; h++) { cum += fc.daily[h] - supplyMu; if (cum > available) { depletionDay = h + 1; break; } }
  }

  // FEFO simulation: the k-th oldest available unit is used around day (k+1)/mu; if that is after its expiry it is predicted waste.
  const avail = c.units.filter((u) => u.status === "Available").slice(0, available);
  const waste = avail.filter((u, k) => daysLeft(u) >= 0 && (mu <= 0 || (k + 1) / mu > daysLeft(u)));
  const risk = { expired: 0, critical: 0, warning: 0, ok: 0 };
  for (const u of avail) risk[expiryRisk(u, cfg)]++;

  let status;
  if (fc.status !== "ok" && mu < 0.05) status = "low-volume";
  else if (available < minLevel * 0.5 || (available === 0 && mu > 0.05)) status = "critical";
  else if (available < minLevel) status = "low";
  else if (available > maxLevel) status = "surplus";
  else status = "ok";

  const keep = Math.max(maxLevel, minLevel, Math.ceil(mu * 7));
  const releasable = Math.max(Math.max(0, available - keep), Math.min(waste.length, Math.max(0, available - minLevel)));

  const out = {
    key, facId: c.facId, state: c.state, district: c.district, group: c.group, comp: c.comp,
    available, reserved: c.reserved, quarantined: c.quarantined, unusable: c.unusable,
    fc, mu, supplyMu, projected, minLevel, maxLevel, shortageProb, depletionDay, daysCover: mu > 0 ? available / mu : Infinity,
    status, waste, wasteCount: waste.length, risk, releasable,
  };
  model.cache.set(ck, out);
  return out;
}

export function analyseAll(model, filter = {}, horizon = 7) {
  return selectCells(model, filter).map((c) => analyseCell(model, c.key, horizon));
}

// Forecast for an aggregate (district / state / group / component), with shortage probability against pooled stock.
export function aggregateForecast(model, filter, horizon = 7) {
  const cells = selectCells(model, filter);
  const s = sumSeries(cells);
  const fc = forecastSeries(s, horizon, model.config.minHistoryUnits);
  const available = cells.reduce((a, c) => a + c.available, 0);
  const supplyMu = cells.reduce((a, c) => a + sumRange(c.collected, HISTORY_DAYS - 28, HISTORY_DAYS), 0) / 28;
  const projected = fc.status === "ok" ? available + supplyMu * horizon - fc.total : null;
  const shortageProb = fc.status === "ok" ? 1 - normCdf((projected + 0.5) / fc.sd) : null;
  return { series: s, fc, available, supplyMu, projected, shortageProb, cells: cells.length };
}

// ---------- routing ----------
const toRad = (d) => (d * Math.PI) / 180;
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}
const SPEED = { punjab: 50, jk: 35, ladakh: 28 };

export function routeOptions(from, to, compId, date = AS_OF) {
  const comp = compById[compId];
  const hilly = from.state !== "punjab" || to.state !== "punjab";
  const km = Math.round(haversineKm(from, to) * (hilly ? 1.55 : 1.25));
  const speed = (SPEED[from.state] + SPEED[to.state]) / 2;
  const month = new Date(date).getUTCMonth();
  const winter = month >= 10 || month <= 4; // Nov–May
  const roadNotes = [];
  let roadOk = true;
  if (winter && (from.state === "ladakh") !== (to.state === "ladakh")) {
    roadOk = false;
    roadNotes.push("Zojila La / Manali–Leh highway closed for winter (Nov–May)");
  }
  if (winter && (from.id === "LA-NUB-CHC" || to.id === "LA-NUB-CHC")) roadNotes.push("Khardung La subject to snow closure — confirm with BRO before dispatch");
  const options = [{ mode: "road", km, hours: km / speed + 0.5, feasible: roadOk, notes: roadNotes }];

  const link = AIR_LINKS[`${from.airport}-${to.airport}`] ?? AIR_LINKS[`${to.airport}-${from.airport}`];
  if (link && from.airport !== to.airport) {
    const hours = from.airKm / SPEED[from.state] + 1.0 + link + 0.75 + to.airKm / SPEED[to.state];
    options.push({ mode: "air", km: from.airKm + to.airKm, airLeg: `${from.airport}→${to.airport}`, hours, feasible: true, notes: ["Scheduled cargo slot required", "Air leg subject to weather clearance"] });
  }
  for (const o of options) {
    if (o.feasible && o.hours > comp.maxTransitH) { o.feasible = false; o.notes.push(`Exceeds ${comp.maxTransitH}h transit limit for ${comp.name}`); }
  }
  const feasible = options.filter((o) => o.feasible).sort((a, b) => a.hours - b.hours);
  return { options, best: feasible[0] || null, coldChain: comp.transport, interState: from.state !== to.state };
}

export function nearbyFacilities(facId, n = 4) {
  const f = facById[facId];
  return FACILITIES.filter((x) => x.id !== facId).map((x) => ({ fac: x, km: Math.round(haversineKm(f, x)) })).sort((a, b) => a.km - b.km).slice(0, n);
}

export const transferPermitted = (config, from, to) => from.state === to.state || config.interState[`${from.state}>${to.state}`] !== false;

export function approvalLevel(from, to) {
  if (from.state !== to.state) return "State/UT Administrator (receiving State/UT)";
  if (from.district !== to.district) return "State/UT Administrator";
  return "District Administrator";
}

// ---------- redistribution ----------
export function recommendTransfers(model, { group, comp, where } = {}) {
  const recs = [];
  const groups = group && group !== "all" ? [group] : GROUPS;
  const comps = comp && comp !== "all" ? [comp] : COMPONENTS.map((c) => c.id);
  for (const g of groups) {
    for (const cid of comps) {
      const rows = FACILITIES.map((f) => ({ fac: f, a: analyseCell(model, cellKey(f.id, g, cid)) }));
      const needs = rows
        // only act on shortages backed by a forecast; low-volume cells without one are not "evidence"
        // 20% floor: below it, expected local collections already cover the gap
        .filter((r) => (r.a.status === "critical" || r.a.status === "low") && r.a.fc.status === "ok" && r.a.shortageProb >= 0.2 && (!where || where(r.fac)))
        .map((r) => ({ ...r, need: Math.max(1, Math.ceil((r.a.minLevel + r.a.maxLevel) / 2) - r.a.available) }))
        .sort((x, y) => x.a.daysCover - y.a.daysCover);
      const sources = rows.map((r) => ({ ...r, left: r.a.releasable })).filter((s) => s.left > 0);
      for (const n of needs) {
        let best = null;
        for (const s of sources) {
          if (s.left <= 0 || s.fac.id === n.fac.id || !transferPermitted(model.config, s.fac, n.fac)) continue;
          const route = routeOptions(s.fac, n.fac, cid);
          if (!route.best) continue;
          const score = route.best.hours + (route.interState ? 3 : 0) - (s.a.wasteCount > 0 ? 4 : 0);
          if (!best || score < best.score) best = { s, route, score };
        }
        if (!best) continue;
        const qty = Math.min(n.need, best.s.left);
        best.s.left -= qty;
        recs.push(makeRec(g, cid, best.s, n, qty, best.route));
      }
    }
  }
  const rank = { Immediate: 0, High: 1, Medium: 2 };
  return recs.sort((a, b) => rank[a.priority] - rank[b.priority] || a.daysCover - b.daysCover);
}

function makeRec(group, comp, s, n, qty, route) {
  const c = compById[comp];
  const pct = (p) => (p == null ? "n/a" : `${Math.round(p * 100)}%`);
  const why = [
    `${n.fac.name} holds ${n.a.available} ${group} ${c.name} units against a recommended minimum of ${n.a.minLevel}` +
      (n.a.fc.status === "ok" ? `; forecast demand over 7 days is ${n.a.fc.total.toFixed(1)} units against expected local collections of ${(n.a.supplyMu * 7).toFixed(1)} (shortage probability ${pct(n.a.shortageProb)}).` : "."),
    `${s.fac.name} holds ${s.a.available} units against a recommended maximum of ${s.a.maxLevel}; ${s.a.releasable} can be released while keeping at least ${Math.max(s.a.minLevel, Math.ceil(s.a.mu * 7))} units (≥ 7 days cover).`,
  ];
  if (s.a.wasteCount > 0) why.push(`${s.a.wasteCount} units at the source are predicted to expire before local use (FEFO simulation) — moving them reduces wastage.`);
  const closed = route.options.find((o) => !o.feasible);
  if (closed) why.push(`${closed.mode === "road" ? "Road" : "Air"} option not usable: ${closed.notes.join("; ")}.`);
  why.push(`Selected route: ${route.best.mode}${route.best.airLeg ? ` (${route.best.airLeg})` : ""}, ~${route.best.hours.toFixed(1)} h.`);
  const p = n.a.shortageProb ?? 0;
  const priority = p >= 0.7 && n.a.status === "critical" ? "Immediate" : p >= 0.4 ? "High" : "Medium";
  return {
    id: `REC-${s.fac.code}-${n.fac.code}-${group}-${comp}`,
    group, comp, from: s.fac.id, to: n.fac.id, qty, route, priority,
    daysCover: n.a.daysCover, shortageProb: n.a.shortageProb,
    problem: `${n.a.status === "critical" ? "Critical" : "Low"} ${group} ${c.name} stock at ${n.fac.name}`,
    action: `Transfer ${qty} unit${qty === 1 ? "" : "s"} from ${s.fac.name} to ${n.fac.name}`,
    why,
    benefit: `Raises ${n.fac.name} to ${n.a.available + qty} units (≈${n.a.mu > 0 ? ((n.a.available + qty) / n.a.mu).toFixed(1) : "∞"} days cover) without taking ${s.fac.name} below its minimum.`,
    approval: approvalLevel(s.fac, n.fac),
  };
}

// ---------- emergency source identification ----------
export function findSources(model, { group, comp, qty, destFacId, requiredBy, now = AS_OF }) {
  const dest = facById[destFacId];
  const isRbc = comp === "PRBC" || comp === "WB";
  const groups = model.config.includeCompatible && isRbc ? RBC_COMPAT[group] : [group];
  const local = analyseCell(model, cellKey(destFacId, group, comp));
  const rows = [];
  for (const f of FACILITIES) {
    if (f.id === destFacId) continue;
    for (const g of groups) {
      const a = analyseCell(model, cellKey(f.id, g, comp));
      if (a.available <= 0) continue;
      const route = routeOptions(f, dest, comp);
      const releasable = Math.max(0, a.available - Math.ceil(a.minLevel * 0.5));
      rows.push({ fac: f, group: g, a, route, releasable, permitted: transferPermitted(model.config, f, dest), exact: g === group });
    }
  }
  rows.sort((x, y) =>
    (y.route.best ? 1 : 0) - (x.route.best ? 1 : 0) ||
    (y.releasable >= qty ? 1 : 0) - (x.releasable >= qty ? 1 : 0) ||
    (x.route.best?.hours ?? 1e9) - (y.route.best?.hours ?? 1e9));

  const hoursLeft = (requiredBy - now) / 3600000;
  const top = rows.find((r) => r.route.best && r.permitted && r.releasable >= qty);
  const alternatives = [];
  if (local.available >= qty) alternatives.push(`Destination already holds ${local.available} units of ${group} ${compById[comp].name} — confirm local issue first.`);
  if (!top) {
    let acc = 0; const parts = [];
    for (const r of rows) { if (!r.route.best || !r.permitted || r.releasable <= 0) continue; const take = Math.min(r.releasable, qty - acc); parts.push(`${take} from ${r.fac.name}`); acc += take; if (acc >= qty) break; }
    if (acc > 0) alternatives.push(`Split fulfilment: ${parts.join(" + ")}${acc < qty ? ` (still ${qty - acc} short)` : ""}.`);
    alternatives.push(`Initiate targeted donor recall for ${group} in ${districtById[dest.district].name} (Donor Network).`);
  }
  if (rows.some((r) => r.route.options.some((o) => o.mode === "road" && !o.feasible)) && rows.some((r) => r.route.best?.mode === "air")) {
    alternatives.push("Road access is restricted — book a scheduled air-cargo slot with a validated cold-chain box.");
  }
  let delay = null;
  if (top && top.route.best.hours > hoursLeft) delay = `Fastest viable source needs ~${top.route.best.hours.toFixed(1)} h but the requirement is due in ${Math.max(0, hoursLeft).toFixed(1)} h.`;
  if (!top) delay = "No single permitted source can cover the full quantity — fulfilment delay likely.";
  return { rows, top, local, alternatives, delay, hoursLeft, groupsConsidered: groups };
}

// ---------- alerts & insights ----------
export function inventoryAlerts(model, where) {
  const alerts = [];
  const cfg = model.config;
  for (const f of FACILITIES) {
    if (where && !where(f)) continue;
    if (f.lastUpdateH > cfg.delayedUpdateHours) alerts.push({ type: "Delayed update", sev: "warning", facId: f.id, text: `${f.name} last updated inventory ${f.lastUpdateH} h ago (threshold ${cfg.delayedUpdateHours} h).` });
    for (const g of GROUPS) for (const c of COMPONENTS) {
      const key = cellKey(f.id, g, c.id);
      const a = analyseCell(model, key);
      const label = `${g} ${c.name}`;
      if (a.status === "critical") alerts.push({ type: "Critical stock", sev: "critical", facId: f.id, key, text: `${label}: ${a.available} units vs minimum ${a.minLevel} at ${f.name}.` });
      else if (a.status === "low") alerts.push({ type: "Low stock", sev: "warning", facId: f.id, key, text: `${label}: ${a.available} units vs minimum ${a.minLevel} at ${f.name}.` });
      if (a.risk.critical > 0) alerts.push({ type: "Near expiry", sev: "warning", facId: f.id, key, text: `${a.risk.critical} ${label} units within ${cfg.expiry[c.id].critical} day(s) of expiry at ${f.name}.` });
      const an = detectAnomaly(model.byKey.get(key).demand);
      if (an.flagged) alerts.push({ type: "Unusual consumption", sev: "warning", facId: f.id, key, text: `${label} use at ${f.name} averaged ${an.recent.toFixed(1)}/day over 3 days vs ${an.baseline.toFixed(1)}/day baseline (z=${an.z.toFixed(1)}).` });
    }
  }
  const rank = { critical: 0, warning: 1 };
  return alerts.sort((a, b) => rank[a.sev] - rank[b.sev]);
}

export function generateInsights(model, where) {
  const out = [];
  const period7 = "Next 7 days from " + new Date(AS_OF).toISOString().slice(0, 10);
  const facs = FACILITIES.filter((f) => !where || where(f));
  for (const g of GROUPS) for (const c of COMPONENTS) {
    const hit = facs.map((f) => ({ f, a: analyseCell(model, cellKey(f.id, g, c.id)) })).filter((x) => x.a.fc.status === "ok" && x.a.shortageProb >= 0.6);
    if (hit.length) out.push({
      kind: "prediction", sev: hit.length >= 2 ? "critical" : "warning",
      text: `${hit.length} blood bank${hit.length > 1 ? "s are" : " is"} showing a projected shortage of ${g} ${c.name} within the next 7 days.`,
      detail: hit.map((x) => `${x.f.name} (stock ${x.a.available}, forecast ${x.a.fc.total.toFixed(1)}, P=${Math.round(x.a.shortageProb * 100)}%)`).join("; "),
      period: period7, link: { view: "forecast", params: { group: g, comp: c.id } }, score: hit.length * 10,
    });
  }
  const wasteFacs = facs.map((f) => ({ f, n: analyseAll(model, { facId: f.id }).reduce((s, a) => s + a.wasteCount, 0) })).filter((x) => x.n >= 10).sort((a, b) => b.n - a.n);
  if (wasteFacs.length) out.push({
    kind: "prediction", sev: "warning",
    text: `${wasteFacs.length} facilit${wasteFacs.length > 1 ? "ies have" : "y has"} excess inventory that may expire before it is used.`,
    detail: wasteFacs.map((x) => `${x.f.name}: ${x.n} units`).join("; "),
    period: "Remaining shelf life of current stock (FEFO simulation)", link: { view: "inventory", params: { tab: "expiry" } }, score: 15,
  });
  for (const d of DISTRICTS) {
    if (!facs.some((f) => f.district === d.id)) continue;
    for (const c of COMPONENTS) {
      const ch = demandChange(sumSeries(selectCells(model, { district: d.id, comp: c.id })));
      if (ch.pct != null && ch.pct >= 0.3 && ch.current >= 15) out.push({
        kind: "fact", sev: "info",
        text: `${c.name} demand in ${d.name} increased ${Math.round(ch.pct * 100)}% compared with the previous reporting period.`,
        detail: `${Math.round(ch.current)} units issued in the last 14 days vs ${Math.round(ch.previous)} in the 14 days before.`,
        period: "Last 14 days vs previous 14 days", link: { view: "forecast", params: { district: d.id, comp: c.id } }, score: 8,
      });
    }
  }
  for (const al of inventoryAlerts(model, where).filter((a) => a.type === "Unusual consumption" || a.type === "Delayed update")) {
    out.push({ kind: "fact", sev: "warning", text: al.text, detail: al.type, period: al.type === "Delayed update" ? "As of last refresh" : "Last 3 days vs preceding 28 days", link: { view: "inventory", params: { tab: "alerts" } }, score: 5 });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---------- network summaries ----------
export function networkSummary(model, where) {
  const facs = FACILITIES.filter((f) => !where || where(f));
  const ids = new Set(facs.map((f) => f.id));
  const cells = model.cells.filter((c) => ids.has(c.facId));
  const last = (field, days) => cells.reduce((s, c) => s + sumRange(c[field], HISTORY_DAYS - days, HISTORY_DAYS), 0);
  const analyses = cells.map((c) => analyseCell(model, c.key));
  return {
    facilities: facs.length,
    available: cells.reduce((s, c) => s + c.available, 0),
    reserved: cells.reduce((s, c) => s + c.reserved, 0),
    quarantined: cells.reduce((s, c) => s + c.quarantined, 0),
    collected30: last("collected", 30), utilised30: last("demand", 30), discarded30: last("discarded", 30),
    nearExpiry: analyses.reduce((s, a) => s + a.risk.critical + a.risk.warning, 0),
    predictedWaste: analyses.reduce((s, a) => s + a.wasteCount, 0),
    critical: analyses.filter((a) => a.status === "critical").length,
    low: analyses.filter((a) => a.status === "low").length,
    surplus: analyses.filter((a) => a.status === "surplus").length,
  };
}

export const stateName = (id) => STATES.find((s) => s.id === id)?.name || id;
export { FACILITIES, facById, COMPONENTS, compById, GROUPS, DISTRICTS, STATES, districtById, AS_OF, DAY, HISTORY_DAYS, dayDate, cellKey };
