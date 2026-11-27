// Static demonstration dataset for the intelligence modules (J&K, Ladakh, Punjab).
// Everything here is SIMULATED. It is generated from a fixed seed, so every load produces the same numbers;
// nothing is random at runtime and nothing comes from e-RaktKosh or any live system.

export const DEMO_DATA_LABEL = "Simulated demonstration dataset (fixed seed) — not live e-RaktKosh data";
export const AS_OF = Date.parse("2026-11-27T09:00:00+05:30"); // last data refresh of the demo snapshot
export const DAY = 86400000;
export const HISTORY_DAYS = 365; // daily history ending yesterday

export const STATES = [
  { id: "jk", name: "Jammu & Kashmir" },
  { id: "ladakh", name: "Ladakh" },
  { id: "punjab", name: "Punjab" },
];

export const GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];
const GROUP_SHARE = { "O+": 0.32, "A+": 0.22, "B+": 0.25, "AB+": 0.07, "O-": 0.06, "A-": 0.03, "B-": 0.04, "AB-": 0.01 };

// Shelf life & handling rules per component (NBTC / DGHS guidance, simplified for the demo).
export const COMPONENTS = [
  { id: "PRBC", name: "PRBC (Packed Red Cells)", share: 0.55, shelf: 42, storage: "2–6°C", transport: "Validated insulated box with conditioned ice packs, 2–10°C", maxTransitH: 24, coverDays: 10 },
  { id: "WB", name: "Whole Blood", share: 0.08, shelf: 35, storage: "2–6°C", transport: "Validated insulated box, 2–10°C", maxTransitH: 24, coverDays: 7 },
  { id: "PLT", name: "Platelets", share: 0.17, shelf: 5, storage: "20–24°C with continuous agitation", transport: "Insulated box at 20–24°C, no refrigeration, ≤24h without agitation", maxTransitH: 24, coverDays: 2.2 },
  { id: "FFP", name: "FFP (Fresh Frozen Plasma)", share: 0.17, shelf: 365, storage: "≤ −18°C (−30°C preferred)", transport: "Frozen shipper / dry ice, keep ≤ −18°C", maxTransitH: 48, coverDays: 45 },
  { id: "CRYO", name: "Cryoprecipitate", share: 0.03, shelf: 365, storage: "≤ −18°C", transport: "Frozen shipper / dry ice, keep ≤ −18°C", maxTransitH: 48, coverDays: 45 },
];
export const compById = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]));

export const DISTRICTS = [
  { id: "jammu", name: "Jammu", state: "jk" },
  { id: "srinagar", name: "Srinagar", state: "jk" },
  { id: "anantnag", name: "Anantnag", state: "jk" },
  { id: "kathua", name: "Kathua", state: "jk" },
  { id: "baramulla", name: "Baramulla", state: "jk" },
  { id: "leh", name: "Leh", state: "ladakh" },
  { id: "kargil", name: "Kargil", state: "ladakh" },
  { id: "amritsar", name: "Amritsar", state: "punjab" },
  { id: "ludhiana", name: "Ludhiana", state: "punjab" },
  { id: "patiala", name: "Patiala", state: "punjab" },
  { id: "jalandhar", name: "Jalandhar", state: "punjab" },
  { id: "bathinda", name: "Bathinda", state: "punjab" },
];
export const districtById = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

// scale = average units issued per day across all components (simulated)
// airport / airKm = nearest airport used for air transfers and road distance to it
// lastUpdateH = hours since the facility last pushed an inventory update
export const FACILITIES = [
  { id: "JK-JMU-GMC", code: "JMU1", name: "GMC Jammu Blood Bank", state: "jk", district: "jammu", lat: 32.7266, lng: 74.857, scale: 34, airport: "JMU", airKm: 6, ertk: "ERK-JK-0101", lastUpdateH: 1.5 },
  { id: "JK-SXR-SKIMS", code: "SXR1", name: "SKIMS Srinagar", state: "jk", district: "srinagar", lat: 34.1365, lng: 74.8353, scale: 30, airport: "SXR", airKm: 22, ertk: "ERK-JK-0204", lastUpdateH: 2 },
  { id: "JK-SXR-SMHS", code: "SXR2", name: "SMHS Hospital Srinagar", state: "jk", district: "srinagar", lat: 34.075, lng: 74.807, scale: 22, airport: "SXR", airKm: 14, ertk: "ERK-JK-0207", lastUpdateH: 3 },
  { id: "JK-ANT-GMC", code: "ANT1", name: "GMC Anantnag", state: "jk", district: "anantnag", lat: 33.7311, lng: 75.1487, scale: 9, airport: "SXR", airKm: 60, ertk: "ERK-JK-0311", lastUpdateH: 5 },
  { id: "JK-KTH-DH", code: "KTH1", name: "District Hospital Kathua", state: "jk", district: "kathua", lat: 32.3863, lng: 75.5173, scale: 6, airport: "JMU", airKm: 85, ertk: "ERK-JK-0415", lastUpdateH: 4 },
  { id: "JK-BRM-GMC", code: "BRM1", name: "GMC Baramulla", state: "jk", district: "baramulla", lat: 34.198, lng: 74.3636, scale: 7, airport: "SXR", airKm: 60, ertk: "ERK-JK-0522", lastUpdateH: 6 },
  { id: "LA-LEH-SNM", code: "LEH1", name: "SNM Hospital, Leh", state: "ladakh", district: "leh", lat: 34.1642, lng: 77.5848, scale: 6, airport: "IXL", airKm: 5, ertk: "ERK-LA-0101", lastUpdateH: 1 },
  { id: "LA-KGL-DH", code: "KGL1", name: "Kargil District Hospital", state: "ladakh", district: "kargil", lat: 34.5539, lng: 76.1313, scale: 4, airport: "IXL", airKm: 215, ertk: "ERK-LA-0203", lastUpdateH: 8 },
  { id: "LA-NUB-CHC", code: "NUB1", name: "CHC Diskit, Nubra", state: "ladakh", district: "leh", lat: 34.542, lng: 77.558, scale: 1.2, airport: "IXL", airKm: 120, ertk: "ERK-LA-0108", lastUpdateH: 52 },
  { id: "PB-ASR-GMC", code: "ASR1", name: "GMC Amritsar", state: "punjab", district: "amritsar", lat: 31.634, lng: 74.8723, scale: 32, airport: "ATQ", airKm: 12, ertk: "ERK-PB-0101", lastUpdateH: 2 },
  { id: "PB-LDH-DMC", code: "LDH1", name: "DMC Ludhiana", state: "punjab", district: "ludhiana", lat: 30.901, lng: 75.8573, scale: 40, airport: "IXC", airKm: 105, ertk: "ERK-PB-0305", lastUpdateH: 1 },
  { id: "PB-PTA-RH", code: "PTA1", name: "Rajindra Hospital, Patiala", state: "punjab", district: "patiala", lat: 30.3398, lng: 76.3869, scale: 30, airport: "IXC", airKm: 70, ertk: "ERK-PB-0402", lastUpdateH: 3 },
  { id: "PB-JAL-CH", code: "JAL1", name: "Civil Hospital Jalandhar", state: "punjab", district: "jalandhar", lat: 31.326, lng: 75.5762, scale: 12, airport: "ATQ", airKm: 90, ertk: "ERK-PB-0509", lastUpdateH: 7 },
  { id: "PB-BTI-AIIMS", code: "BTI1", name: "AIIMS Bathinda", state: "punjab", district: "bathinda", lat: 30.211, lng: 74.9455, scale: 14, airport: "ATQ", airKm: 190, ertk: "ERK-PB-0611", lastUpdateH: 31 },
];
export const facById = Object.fromEntries(FACILITIES.map((f) => [f.id, f]));

// Scheduled cargo links between airports, flight hours (simulated)
export const AIR_LINKS = { "JMU-IXL": 1.1, "SXR-IXL": 0.8, "IXC-IXL": 1.2, "JMU-SXR": 0.8, "ATQ-SXR": 1.0, "IXC-SXR": 1.2 };

// ---------- deterministic generator ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261127);
function poisson(lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

const WEEKDAY = [0.75, 1.06, 1.06, 1.05, 1.05, 1.04, 0.9]; // Sun..Sat
const WASTE_RATE = { PRBC: 0.02, WB: 0.03, PLT: 0.12, FFP: 0.01, CRYO: 0.02 };
const startDay = Math.floor(AS_OF / DAY) * DAY - HISTORY_DAYS * DAY;
export const dayDate = (i) => new Date(startDay + i * DAY); // i = 0 … HISTORY_DAYS-1 (last = yesterday)

function baseRate(fac, group, comp) {
  const groupBoost = fac.state === "ladakh" && group === "O-" ? 2.5 : 1;
  return fac.scale * GROUP_SHARE[group] * compById[comp].share * groupBoost;
}

// Demand pattern multipliers — these encode the demonstration scenarios.
function demandMult(fac, group, comp, i, date) {
  const month = date.getUTCMonth();
  const doy = Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY);
  let m = WEEKDAY[date.getUTCDay()];
  if (fac.state === "jk" && (month === 6 || month === 7)) m *= 1.3; // Amarnath Yatra season
  if (fac.state === "punjab" && comp === "PLT") m *= 1 + 1.4 * Math.exp(-((doy - 288) ** 2) / 800); // dengue season peak mid-Oct
  if (fac.id === "PB-PTA-RH" && comp === "PLT" && i >= HISTORY_DAYS - 10) m *= 1.9; // late dengue cluster, Patiala
  if (fac.id === "PB-ASR-GMC" && comp === "PLT" && i >= HISTORY_DAYS - 25) m *= 0.55; // falling demand → near-expiry surplus
  if (fac.state === "ladakh" && group === "O-" && i >= HISTORY_DAYS - 21) m *= 1.8; // rising O− use in Ladakh
  if (fac.id === "JK-SXR-SKIMS" && group === "A+" && comp === "PRBC" && i >= HISTORY_DAYS - 3) m *= 3.2; // unusual spike
  return m;
}

// Stock overrides that set up the scenarios: [available units, age mode]
const STOCK_OVERRIDES = {
  "LA-LEH-SNM|O-|PRBC": [3], "LA-KGL-DH|O-|PRBC": [1], "LA-NUB-CHC|O-|PRBC": [0], "JK-ANT-GMC|O-|PRBC": [1],
  "JK-JMU-GMC|O-|PRBC": [46], "JK-SXR-SKIMS|O-|PRBC": [24],
  "PB-ASR-GMC|B+|PLT": [14, "old"], "PB-ASR-GMC|O+|PLT": [16, "old"], "PB-ASR-GMC|A+|PLT": [10, "old"],
  "PB-PTA-RH|B+|PLT": [2], "PB-PTA-RH|O+|PLT": [3], "PB-PTA-RH|A+|PLT": [1],
  "PB-BTI-AIIMS|B+|FFP": [140],
};

export const cellKey = (facId, group, comp) => `${facId}|${group}|${comp}`;

function generate() {
  const cells = [];
  const units = [];
  const seq = {};
  for (const fac of FACILITIES) {
    seq[fac.id] = 0;
    for (const group of GROUPS) {
      for (const c of COMPONENTS) {
        const comp = c.id;
        const base = baseRate(fac, group, comp);
        const demand = new Uint16Array(HISTORY_DAYS);
        const collected = new Uint16Array(HISTORY_DAYS);
        const discarded = new Uint16Array(HISTORY_DAYS);
        const wasteRate = WASTE_RATE[comp] * (fac.id === "PB-ASR-GMC" && comp === "PLT" ? 2.2 : 1);
        for (let i = 0; i < HISTORY_DAYS; i++) {
          const d = dayDate(i);
          const month = d.getUTCMonth();
          const winter = fac.state === "ladakh" && (month >= 10 || month <= 2);
          demand[i] = poisson(base * demandMult(fac, group, comp, i, d));
          collected[i] = poisson(base * 1.06 * WEEKDAY[d.getUTCDay()] * (winter ? 0.5 : 1));
          discarded[i] = poisson(base * wasteRate);
        }
        const key = cellKey(fac.id, group, comp);
        cells.push({ key, facId: fac.id, state: fac.state, district: fac.district, group, comp, demand, collected, discarded });

        // ---- unit-level stock snapshot ----
        let recent = 0;
        for (let i = HISTORY_DAYS - 14; i < HISTORY_DAYS; i++) recent += demand[i];
        recent /= 14;
        const [ovr, ageMode] = STOCK_OVERRIDES[key] || [];
        const avail = ovr ?? Math.round(Math.max(recent, base) * c.coverDays * (0.75 + rand() * 0.95));
        const mk = (status, daysLeft, tti = "Non-reactive") => {
          const n = ++seq[fac.id];
          const expiry = AS_OF + daysLeft * DAY;
          units.push({
            id: `BL-${fac.code}-${comp}-${String(n).padStart(5, "0")}`,
            facId: fac.id, group, comp, status, tti,
            collected: expiry - c.shelf * DAY, expiry,
            ertk: `${fac.ertk}-${String(n).padStart(6, "0")}`,
          });
        };
        for (let k = 0; k < avail; k++) {
          const left = ageMode === "old" ? 1 + rand() * 1.2 : c.shelf * (0.08 + rand() * 0.88);
          mk("Available", left);
        }
        for (let k = 0; k < Math.round(avail * 0.08); k++) mk("Reserved", c.shelf * (0.3 + rand() * 0.6));
        for (let k = 0; k < Math.round(base); k++) mk("Quarantined", c.shelf - 0.5 - rand(), "Pending");
        if (rand() < 0.12) mk("Unusable", -rand() * 2, "Non-reactive");
      }
    }
  }
  return { cells, units };
}

export const NETWORK = generate();

// ---------- seeded workflow records (simulated) ----------
const h = (hours) => AS_OF - hours * 3600000;

export const SEED_TRANSFERS = [
  { id: "TR-2026-0141", from: "PB-PTA-RH", to: "PB-ASR-GMC", group: "O+", comp: "PRBC", qty: 10, status: "Closed", mode: "road", createdBy: "Harpreet Kaur", createdAt: h(170), history: [["Draft", h(170)], ["Pending Approval", h(169)], ["Approved", h(166)], ["Dispatched", h(160)], ["In Transit", h(159)], ["Received", h(156)], ["Closed", h(150)]], receipt: { qty: 10, temp: "4.3°C", verifiedBy: "Harpreet Kaur" }, reason: "Planned rebalancing (historical record)" },
  { id: "TR-2026-0148", from: "JK-SXR-SKIMS", to: "JK-BRM-GMC", group: "B+", comp: "PRBC", qty: 6, status: "In Transit", mode: "road", createdBy: "System seed", createdAt: h(9), history: [["Draft", h(9)], ["Pending Approval", h(8.8)], ["Approved", h(8)], ["Dispatched", h(7.5)], ["In Transit", h(7.4)]], dispatch: { vehicle: "JK01-AB-4471", carrier: "Govt blood van", temp: "4.0°C", eta: h(5.5) }, reason: "Low stock at Baramulla" },
  { id: "TR-2026-0150", from: "PB-LDH-DMC", to: "PB-BTI-AIIMS", group: "O+", comp: "PLT", qty: 4, status: "Pending Approval", mode: "road", createdBy: "System seed", createdAt: h(3), history: [["Draft", h(3.2)], ["Pending Approval", h(3)]], reason: "Platelet demand rising at Bathinda" },
  { id: "TR-2026-0146", from: "JK-JMU-GMC", to: "JK-KTH-DH", group: "A+", comp: "PRBC", qty: 5, status: "Dispatched", mode: "road", createdBy: "Imran Bhat", createdAt: h(30), history: [["Draft", h(30)], ["Pending Approval", h(29.5)], ["Approved", h(28)], ["Dispatched", h(26)]], dispatch: { vehicle: "JK02-C-1190", carrier: "Govt blood van", temp: "4.2°C", eta: h(23) }, reason: "Low stock at Kathua" },
];

export const SEED_EMERGENCIES = [
  { id: "EM-2026-0311", hospital: "SNM Hospital, Leh", destFacId: "LA-LEH-SNM", department: "Trauma & Emergency", patientRef: "LEH-TR-88213", group: "O-", comp: "PRBC", qty: 4, urgency: "Critical", requiredBy: h(-2), location: "SNM Hospital, Leh — Emergency OT", contact: "Dr. S. Angmo (Duty MO), 01982-252014", status: "Submitted", createdAt: h(0.4), history: [["Submitted", h(0.4)]] },
  { id: "EM-2026-0307", hospital: "Rajindra Hospital, Patiala", destFacId: "PB-PTA-RH", department: "Medicine (Dengue ward)", patientRef: "PTA-MED-55102", group: "B+", comp: "PLT", qty: 3, urgency: "Urgent", requiredBy: h(-3), location: "Rajindra Hospital — Ward 7", contact: "Dr. R. Gill (Duty MO), 0175-2212018", status: "Source Identified", createdAt: h(4), history: [["Submitted", h(4)], ["Under Review", h(3.6)], ["Source Identified", h(3.1)]] },
  { id: "EM-2026-0301", hospital: "GMC Anantnag", destFacId: "JK-ANT-GMC", department: "Obstetrics", patientRef: "ANT-OBG-21987", group: "O-", comp: "PRBC", qty: 2, urgency: "Critical", requiredBy: h(10), location: "GMC Anantnag — Labour room", contact: "Dr. F. Mir, 01932-222354", status: "Fulfilled", createdAt: h(14), history: [["Submitted", h(14)], ["Under Review", h(13.8)], ["Source Identified", h(13.6)], ["Approval Pending", h(13.5)], ["Approved", h(13.2)], ["Processing", h(13)], ["Fulfilled", h(11.2)]], source: "JK-SXR-SKIMS" },
  { id: "EM-2026-0296", hospital: "AIIMS Bathinda", destFacId: "PB-BTI-AIIMS", department: "Surgery", patientRef: "BTI-SUR-10422", group: "A+", comp: "PRBC", qty: 2, urgency: "Routine", requiredBy: h(30), location: "AIIMS Bathinda — OT complex", contact: "Dr. P. Brar, 0164-2867100", status: "Closed", createdAt: h(52), history: [["Submitted", h(52)], ["Under Review", h(51)], ["Source Identified", h(50)], ["Approval Pending", h(49.5)], ["Approved", h(49)], ["Processing", h(48)], ["Fulfilled", h(40)], ["Closed", h(38)]], source: "PB-LDH-DMC" },
  { id: "EM-2026-0309", hospital: "Kargil District Hospital", destFacId: "LA-KGL-DH", department: "Surgery", patientRef: "KGL-SUR-30071", group: "O-", comp: "PRBC", qty: 2, urgency: "Urgent", requiredBy: h(1), location: "Kargil DH — Surgical ward", contact: "Dr. A. Hussain, 01985-232216", status: "Under Review", createdAt: h(7), history: [["Submitted", h(7)], ["Under Review", h(6.5)]] },
];

// Sample lifecycle events for a handful of real unit IDs, used to seed the ledger
export function seedLedgerEvents() {
  const pick = NETWORK.units.filter((u) => u.status !== "Quarantined").filter((_, i) => i % 97 === 0).slice(0, 36);
  const ev = [];
  for (const u of pick) {
    const fac = facById[u.facId];
    ev.push({ ts: u.collected, type: "UNIT_COLLECTED", org: fac.code, payload: { unitId: u.id, facId: u.facId, group: u.group, comp: u.comp } });
    ev.push({ ts: u.collected + 0.4 * DAY, type: "UNIT_TESTED", org: fac.code, payload: { unitId: u.id, tti: "Non-reactive", grouping: "Confirmed" } });
    ev.push({ ts: u.collected + 0.5 * DAY, type: u.status === "Unusable" ? "UNIT_DISCARDED" : "UNIT_STORED", org: fac.code, payload: { unitId: u.id, facId: u.facId, expiry: new Date(u.expiry).toISOString().slice(0, 10) } });
  }
  return ev.sort((a, b) => a.ts - b.ts);
}
