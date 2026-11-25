export const regions = [
  { id: "jk", name: "Jammu & Kashmir", banks: 7, units: 2104, critical: 1, status: "ok" },
  { id: "ladakh", name: "Ladakh", banks: 3, units: 186, critical: 2, status: "critical" },
  { id: "punjab", name: "Punjab", banks: 8, units: 2522, critical: 0, status: "ok" },
];

export const groupMix = [
  { g: "O+", pct: 34 }, { g: "A+", pct: 22 }, { g: "B+", pct: 20 }, { g: "AB+", pct: 7 },
  { g: "O-", pct: 8 }, { g: "A-", pct: 4 }, { g: "B-", pct: 3 }, { g: "AB-", pct: 2 },
];

export const activity = [
  { c: "var(--success)", t: "Unit BL-PB-00231 issued to GMC Amritsar", m: "2 min ago" },
  { c: "var(--warning)", t: "Cold-chain breach auto-quarantine — plasma unit BL-JK-00117", m: "11 min ago · −15°C vs ≤−18°C threshold" },
  { c: "var(--primary)", t: "New donor registered via biometric kiosk, GMC Jammu", m: "26 min ago · UID BL-DNR-01452" },
  { c: "var(--critical)", t: "Shortage alert raised — O−, Ladakh", m: "1 hr ago · auto-notified state dashboard" },
  { c: "var(--success)", t: "Inter-district transfer approved — Patiala → Amritsar", m: "3 hrs ago" },
];

export const inventory = [
  { id: "BL-LA-00061", bank: "SNM Hospital, Leh", group: "O-", comp: "RBC", collected: "03 Nov", expiry: 4, temp: "4.2°C", status: "Available", hash: "0x9ab1…22c" },
  { id: "BL-JK-00117", bank: "SKIMS, Srinagar", group: "AB+", comp: "Plasma", collected: "18 Oct", expiry: 120, temp: "-15.4°C ⚠", status: "Quarantine", hash: "0x7e40…c81a" },
  { id: "BL-PB-00231", bank: "GMC Amritsar", group: "O+", comp: "RBC", collected: "29 Oct", expiry: 9, temp: "3.8°C", status: "Reserved", hash: "0x4e2b…9a1f" },
  { id: "BL-PB-00298", bank: "Rajindra Hospital, Patiala", group: "B+", comp: "Platelets", collected: "15 Nov", expiry: 1, temp: "22.1°C", status: "Available", hash: "0x22f0…b671" },
  { id: "BL-JK-00482", bank: "GMC Jammu", group: "O-", comp: "RBC", collected: "03 Nov", expiry: 22, temp: "4.0°C", status: "Available", hash: "0x8f3a…e92b" },
  { id: "BL-LA-00073", bank: "Kargil District Hospital", group: "B-", comp: "Whole Blood", collected: "07 Nov", expiry: 31, temp: "4.5°C", status: "Available", hash: "0x11cd…5a90" },
];

export const translations = {
  en: "Donate blood", hi: "रक्तदान करें", pa: "ਖੂਨਦਾਨ ਕਰੋ", ur: "خون کا عطیہ کریں",
};

// Supply map nodes — schematic x/y plus real lat/lng for the optional live Google Map
export const mapNodes = {
  jk: [
    { x: 120, y: 70, r: 16, s: "ok", label: "SKIMS Srinagar", lat: 34.0837, lng: 74.7973 },
    { x: 150, y: 150, r: 13, s: "ok", label: "GMC Jammu", lat: 32.7266, lng: 74.8570 },
  ],
  ladakh: [
    { x: 280, y: 40, r: 10, s: "critical", label: "SNM Hospital, Leh", lat: 34.1642, lng: 77.5848 },
    { x: 330, y: 80, r: 7, s: "warn", label: "Kargil DH", lat: 34.5539, lng: 76.1313 },
  ],
  punjab: [
    { x: 140, y: 260, r: 18, s: "ok", label: "GMC Amritsar", lat: 31.6340, lng: 74.8723 },
    { x: 230, y: 290, r: 15, s: "ok", label: "Rajindra, Patiala", lat: 30.3398, lng: 76.3869 },
  ],
};

export const demoUsers = [
  { id: "u1", name: "Imran Bhat", email: "centre@bloodlink.demo", password: "demo123", role: "centre", facility: "GMC Jammu Blood Bank" },
  { id: "u2", name: "Tenzin Dolma", email: "donor@bloodlink.demo", password: "demo123", role: "donor", facility: null },
];

export const titleMap = {
  overview: ["Network Overview", "Live posture across all three regions · synthetic prototype data"],
  inventory: ["Inventory & Cold Chain", "Unit-level stock, FIFO ordering and cold-chain status"],
  emergency: ["Emergency Request", "Live walk-through of the brief's O-negative demo story"],
  map: ["Supply Map & Routes", "Schematic view of banks, road and air routes"],
  forecast: ["Demand Forecast", "AI shortage projection, 7-day horizon"],
  donors: ["Donor Network & Camps", "Recall alerts, camps and notifications"],
  app: ["Donor App Preview", "The user-facing mobile experience"],
  plan: ["Build Plan & Compliance", "What carries over into the React / Node build"],
};

// Your Google Maps JavaScript API key. Leave as-is to always show the built-in
// schematic map, or paste a real key to attempt loading a live map (works once
// this app is deployed to a real https:// origin — see README).
export const GOOGLE_MAPS_API_KEY = "AIzaSyDm6OxbiVPJe1_wI2njkcJOkxxFmE32Fho";
