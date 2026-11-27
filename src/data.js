export const regions = [
  { id: "jk", name: "Jammu & Kashmir", banks: 7, units: 2104, critical: 1, status: "ok" },
  { id: "ladakh", name: "Ladakh", banks: 3, units: 186, critical: 2, status: "critical" },
  { id: "punjab", name: "Punjab", banks: 8, units: 2522, critical: 0, status: "ok" },
  { id: "hp", name: "Himachal Pradesh", banks: 5, units: 1240, critical: 1, status: "low" },
  { id: "haryana", name: "Haryana", banks: 6, units: 1875, critical: 0, status: "ok" },
];

export const regionName = (id) => regions.find((r) => r.id === id)?.name || id;

// Featured blood centres, used by the donor "Find blood centres" view
export const centres = [
  { name: "GMC Jammu Blood Bank", region: "jk", city: "Jammu", phone: "0191-2584290", units: 412, status: "ok", open24: true },
  { name: "SKIMS Srinagar", region: "jk", city: "Srinagar", phone: "0194-2401013", units: 385, status: "ok", open24: true },
  { name: "SMHS Hospital", region: "jk", city: "Srinagar", phone: "0194-2452013", units: 210, status: "ok", open24: true },
  { name: "GMC Anantnag", region: "jk", city: "Anantnag", phone: "01932-222354", units: 96, status: "low", open24: false },
  { name: "District Hospital Kathua", region: "jk", city: "Kathua", phone: "01922-234105", units: 74, status: "ok", open24: false },
  { name: "SNM Hospital, Leh", region: "ladakh", city: "Leh", phone: "01982-252014", units: 38, status: "critical", open24: true },
  { name: "Kargil District Hospital", region: "ladakh", city: "Kargil", phone: "01985-232216", units: 41, status: "low", open24: true },
  { name: "CHC Diskit, Nubra", region: "ladakh", city: "Nubra", phone: "01980-220011", units: 12, status: "critical", open24: false },
  { name: "GMC Amritsar", region: "punjab", city: "Amritsar", phone: "0183-2426918", units: 520, status: "ok", open24: true },
  { name: "Rajindra Hospital, Patiala", region: "punjab", city: "Patiala", phone: "0175-2212018", units: 448, status: "ok", open24: true },
  { name: "DMC Ludhiana", region: "punjab", city: "Ludhiana", phone: "0161-4687555", units: 610, status: "ok", open24: true },
  { name: "Civil Hospital Jalandhar", region: "punjab", city: "Jalandhar", phone: "0181-2224845", units: 188, status: "ok", open24: false },
  { name: "AIIMS Bathinda", region: "punjab", city: "Bathinda", phone: "0164-2867100", units: 236, status: "ok", open24: true },
  { name: "IGMC Shimla", region: "hp", city: "Shimla", phone: "0177-2654713", units: 402, status: "ok", open24: true },
  { name: "Dr RPGMC Tanda", region: "hp", city: "Kangra", phone: "01892-267115", units: 318, status: "ok", open24: true },
  { name: "Zonal Hospital Mandi", region: "hp", city: "Mandi", phone: "01905-222103", units: 88, status: "low", open24: false },
  { name: "PGIMS Rohtak", region: "haryana", city: "Rohtak", phone: "01262-211307", units: 655, status: "ok", open24: true },
  { name: "Civil Hospital Ambala", region: "haryana", city: "Ambala", phone: "0171-2530118", units: 214, status: "ok", open24: false },
  { name: "KCGMC Karnal", region: "haryana", city: "Karnal", phone: "0184-2973200", units: 301, status: "ok", open24: true },
];

// Registered donors, as seen by blood centre staff
export const donors = [
  { uid: "BL-DNR-00981", name: "Tenzin Dolma", group: "O-", region: "ladakh", city: "Leh", last: "14 Aug 2026", eligible: "yes", donations: 6 },
  { uid: "BL-DNR-01124", name: "Stanzin Norboo", group: "O-", region: "ladakh", city: "Leh", last: "02 Jun 2026", eligible: "yes", donations: 3 },
  { uid: "BL-DNR-00456", name: "Rigzin Angmo", group: "O-", region: "ladakh", city: "Kargil", last: "29 Oct 2026", eligible: "soon", donations: 2 },
  { uid: "BL-DNR-01452", name: "Aamir Shah", group: "A+", region: "jk", city: "Jammu", last: "—", eligible: "yes", donations: 0 },
  { uid: "BL-DNR-00733", name: "Mehnaz Bhat", group: "B+", region: "jk", city: "Srinagar", last: "11 Sep 2026", eligible: "yes", donations: 9 },
  { uid: "BL-DNR-00802", name: "Rohit Gupta", group: "AB-", region: "jk", city: "Kathua", last: "05 Nov 2026", eligible: "no", donations: 4 },
  { uid: "BL-DNR-01310", name: "Gurpreet Singh", group: "B+", region: "punjab", city: "Amritsar", last: "20 Jul 2026", eligible: "yes", donations: 12 },
  { uid: "BL-DNR-01277", name: "Simran Kaur", group: "O+", region: "punjab", city: "Ludhiana", last: "18 Oct 2026", eligible: "soon", donations: 5 },
  { uid: "BL-DNR-00655", name: "Harjit Sandhu", group: "A-", region: "punjab", city: "Patiala", last: "01 Aug 2026", eligible: "yes", donations: 7 },
  { uid: "BL-DNR-01388", name: "Anjali Sharma", group: "A+", region: "hp", city: "Shimla", last: "09 Sep 2026", eligible: "yes", donations: 4 },
  { uid: "BL-DNR-01402", name: "Vikram Thakur", group: "O+", region: "hp", city: "Mandi", last: "12 Nov 2026", eligible: "no", donations: 8 },
  { uid: "BL-DNR-01519", name: "Pooja Rana", group: "B-", region: "hp", city: "Kangra", last: "27 Jun 2026", eligible: "yes", donations: 2 },
  { uid: "BL-DNR-01233", name: "Sandeep Yadav", group: "O+", region: "haryana", city: "Rohtak", last: "30 Aug 2026", eligible: "yes", donations: 15 },
  { uid: "BL-DNR-01560", name: "Neha Malik", group: "AB+", region: "haryana", city: "Karnal", last: "03 Oct 2026", eligible: "soon", donations: 3 },
];

export const camps = [
  { date: "05 Dec 2026", location: "Mall Road community hall", region: "hp", organiser: "IGMC Shimla", registered: 64, status: "Upcoming" },
  { date: "02 Dec 2026", location: "Rohtak University campus", region: "haryana", organiser: "PGIMS Rohtak", registered: 152, status: "Upcoming" },
  { date: "28 Nov 2026", location: "Ludhiana Gurudwara camp", region: "punjab", organiser: "DMC Ludhiana", registered: 203, status: "Upcoming" },
  { date: "26 Nov 2026", location: "Srinagar Lal Chowk drive", region: "jk", organiser: "SMHS Hospital", registered: 58, status: "Upcoming" },
  { date: "24 Nov 2026", location: "Patiala Blood Drive", region: "punjab", organiser: "Rajindra Hospital", registered: 118, status: "Ongoing" },
  { date: "22 Nov 2026", location: "Karnal industrial area", region: "haryana", organiser: "KCGMC Karnal", registered: 87, status: "Ongoing" },
  { date: "20 Nov 2026", location: "Amarnath Yatra base camp", region: "jk", organiser: "SBTC J&K", registered: 72, status: "Ongoing" },
  { date: "15 Nov 2026", location: "Dharamshala college camp", region: "hp", organiser: "Dr RPGMC Tanda", registered: 49, status: "Completed" },
  { date: "12 Nov 2026", location: "GMC Amritsar campus", region: "punjab", organiser: "GMC Amritsar", registered: 94, status: "Completed" },
  { date: "08 Nov 2026", location: "Leh winter drive", region: "ladakh", organiser: "SNM Hospital", registered: 21, status: "Completed" },
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
  { c: "var(--warning)", t: "Low stock warning — A−, Zonal Hospital Mandi", m: "2 hrs ago · Himachal Pradesh" },
  { c: "var(--success)", t: "Inter-district transfer approved — Patiala → Amritsar", m: "3 hrs ago" },
  { c: "var(--primary)", t: "Camp registrations opened — Rohtak University campus", m: "5 hrs ago · Haryana" },
];

export const inventory = [
  { id: "BL-HR-00144", bank: "PGIMS Rohtak", region: "haryana", group: "A+", comp: "Platelets", collected: "23 Nov", expiry: 2, temp: "21.8°C", status: "Available", hash: "0x5c19…ad07" },
  { id: "BL-HP-00052", bank: "IGMC Shimla", region: "hp", group: "O+", comp: "RBC", collected: "10 Nov", expiry: 7, temp: "4.4°C", status: "Reserved", hash: "0x3b77…f210" },
  { id: "BL-PB-00305", bank: "DMC Ludhiana", region: "punjab", group: "A-", comp: "Cryo", collected: "01 Oct", expiry: 300, temp: "-26.0°C", status: "Available", hash: "0x6d02…1e4c" },
  { id: "BL-HP-00061", bank: "Dr RPGMC Tanda", region: "hp", group: "AB-", comp: "Plasma", collected: "12 Sep", expiry: 290, temp: "-24.7°C", status: "Available", hash: "0x90ee…4b3d" },
  { id: "BL-LA-00061", bank: "SNM Hospital, Leh", region: "ladakh", group: "O-", comp: "RBC", collected: "03 Nov", expiry: 4, temp: "4.2°C", status: "Available", hash: "0x9ab1…22c" },
  { id: "BL-JK-00117", bank: "SKIMS, Srinagar", region: "jk", group: "AB+", comp: "Plasma", collected: "18 Oct", expiry: 120, temp: "-15.4°C ⚠", status: "Quarantine", hash: "0x7e40…c81a" },
  { id: "BL-PB-00231", bank: "GMC Amritsar", region: "punjab", group: "O+", comp: "RBC", collected: "29 Oct", expiry: 9, temp: "3.8°C", status: "Reserved", hash: "0x4e2b…9a1f" },
  { id: "BL-PB-00298", bank: "Rajindra Hospital, Patiala", region: "punjab", group: "B+", comp: "Platelets", collected: "15 Nov", expiry: 1, temp: "22.1°C", status: "Available", hash: "0x22f0…b671" },
  { id: "BL-JK-00482", bank: "GMC Jammu", region: "jk", group: "O-", comp: "RBC", collected: "03 Nov", expiry: 22, temp: "4.0°C", status: "Available", hash: "0x8f3a…e92b" },
  { id: "BL-HR-00210", bank: "Civil Hospital Ambala", region: "haryana", group: "B+", comp: "Whole Blood", collected: "12 Nov", expiry: 23, temp: "3.9°C", status: "Available", hash: "0xa4c8…77e1" },
  { id: "BL-LA-00073", bank: "Kargil District Hospital", region: "ladakh", group: "B-", comp: "Whole Blood", collected: "07 Nov", expiry: 31, temp: "4.5°C", status: "Available", hash: "0x11cd…5a90" },
];

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
  hp: [
    { x: 300, y: 200, r: 12, s: "ok", label: "RPGMC Tanda", lat: 32.1009, lng: 76.2780 },
    { x: 360, y: 255, r: 13, s: "ok", label: "IGMC Shimla", lat: 31.1048, lng: 77.1734 },
    { x: 380, y: 190, r: 7, s: "warn", label: "Mandi ZH", lat: 31.7087, lng: 76.9320 },
  ],
  haryana: [
    { x: 300, y: 335, r: 10, s: "ok", label: "CH Ambala", lat: 30.3782, lng: 76.7767 },
    { x: 220, y: 390, r: 17, s: "ok", label: "PGIMS Rohtak", lat: 28.8955, lng: 76.6066 },
  ],
};

export const demoUsers = [
  { id: "u1", name: "Imran Bhat", email: "centre@bloodlink.demo", password: "demo123", role: "centre", facility: "GMC Jammu Blood Bank", facId: "JK-JMU-GMC", region: "jk" },
  { id: "u2", name: "Tenzin Dolma", email: "donor@bloodlink.demo", password: "demo123", role: "donor", facility: null,
    region: "ladakh", bloodGroup: "O-", uid: "BL-DNR-00981", nextEligible: "13 Nov 2026",
    history: [
      { date: "14 Aug 2026", centre: "SNM Hospital, Leh", comp: "Whole Blood", status: "Completed" },
      { date: "02 Apr 2026", centre: "SNM Hospital, Leh", comp: "Whole Blood", status: "Completed" },
      { date: "11 Nov 2025", centre: "Leh winter drive", comp: "Whole Blood", status: "Completed" },
      { date: "20 Jun 2025", centre: "Kargil District Hospital", comp: "Platelets", status: "Completed" },
    ] },
  { id: "u3", name: "Harpreet Kaur", email: "centre2@bloodlink.demo", password: "demo123", role: "centre", facility: "GMC Amritsar", facId: "PB-ASR-GMC", region: "punjab" },
  { id: "u4", name: "Gurpreet Singh", email: "donor2@bloodlink.demo", password: "demo123", role: "donor", facility: null,
    region: "punjab", bloodGroup: "B+", uid: "BL-DNR-01310", nextEligible: "18 Oct 2026",
    history: [
      { date: "20 Jul 2026", centre: "GMC Amritsar", comp: "Whole Blood", status: "Completed" },
      { date: "12 Mar 2026", centre: "GMC Amritsar campus", comp: "Whole Blood", status: "Completed" },
      { date: "30 Nov 2025", centre: "DMC Ludhiana", comp: "Plasma", status: "Completed" },
    ] },
  { id: "u5", name: "Anjali Sharma", email: "donor3@bloodlink.demo", password: "demo123", role: "donor", facility: null,
    region: "hp", bloodGroup: "A+", uid: "BL-DNR-01388", nextEligible: "08 Dec 2026",
    history: [
      { date: "09 Sep 2026", centre: "IGMC Shimla", comp: "Whole Blood", status: "Completed" },
    ] },
  // ---- official roles (intelligence platform) ----
  { id: "u6", name: "Dr. Neelam Gupta", email: "super@bloodlink.demo", password: "demo123", role: "super", facility: null, region: "all" },
  { id: "u7", name: "Tsewang Dorjey", email: "ladakh.admin@bloodlink.demo", password: "demo123", role: "state", facility: null, region: "ladakh" },
  { id: "u8", name: "Rakesh Sharma", email: "jammu.district@bloodlink.demo", password: "demo123", role: "district", facility: null, region: "jk", district: "jammu" },
  { id: "u9", name: "Dr. Sonam Angmo", email: "hospital@bloodlink.demo", password: "demo123", role: "hospital", facility: "SNM Hospital, Leh", facId: "LA-LEH-SNM", region: "ladakh" },
  { id: "u10", name: "Arvind Kumar", email: "official@bloodlink.demo", password: "demo123", role: "official", facility: null, region: "all" },
  { id: "u11", name: "Padma Lhamo", email: "leh.bank@bloodlink.demo", password: "demo123", role: "centre", facility: "SNM Hospital, Leh", facId: "LA-LEH-SNM", region: "ladakh" },
];

export const titleMap = {
  overview: ["Executive Overview", "Live posture across all regions · synthetic prototype data"],
  inventory: ["Smart Inventory Intelligence", "Stock status, expiry intelligence, min/max optimisation and FEFO"],
  emergency: ["Emergency Response", "Register, prioritise, source and track urgent blood requirements"],
  map: ["Supply Chain Intelligence", "Network map, source identification, redistribution and routes"],
  forecast: ["AI Demand Forecasting", "Group, component, district and blood bank demand for 7 / 15 / 30 days"],
  command: ["Command Centre", "State/UT-wide inventory, predicted shortages, wastage and supply chain performance"],
  insights: ["AI Insights", "Data-backed statements — predictions kept separate from historical facts"],
  assistant: ["AI Assistant", "Ask operational questions in plain language"],
  transfers: ["Transfer Management", "Draft → approval → dispatch → transit → receipt → closure"],
  ledger: ["Blockchain Ledger", "Tamper-evident record of blood unit and transfer events"],
  integration: ["e-RaktKosh Integration", "Read-only integration readiness, mapping and imports"],
  sync: ["Data Synchronisation", "Scheduled sync runs, history and error log"],
  quality: ["Data Quality Monitoring", "Completeness, validity and timeliness per blood bank"],
  reports: ["Reports", "Operational, inventory, supply-demand and prediction reports · PDF / Excel"],
  performance: ["Performance Analytics", "District and supply chain performance"],
  wastage: ["Wastage Analytics", "Recorded wastage and predicted wastage risk"],
  users: ["User Management", "Accounts, roles and jurisdictions"],
  roles: ["Role Management", "What each role can see and do"],
  facilities: ["Facility Management", "Participating blood bank master"],
  config: ["System Configuration", "Thresholds, rules, demo mode and security settings"],
  audit: ["Audit Logs", "Critical operations and data access"],
  donors: ["Donor Network & Camps", "Recall alerts, camps and notifications"],
  app: ["Donor App Preview", "The user-facing mobile experience"],
  plan: ["Build Plan & Compliance", "What carries over into the React / Node build"],
  myDash: ["My Dashboard", "Your donor profile, donations and alerts"],
  camps: ["Camps & Events", "Donation camps you can join near you"],
  centres: ["Find Blood Centres", "Blood centres and their current stock status"],
};

// Your Google Maps JavaScript API key. Leave as-is to always show the built-in
// schematic map, or paste a real key to attempt loading a live map (works once
// this app is deployed to a real https:// origin — see README).
export const GOOGLE_MAPS_API_KEY = "AIzaSyDm6OxbiVPJe1_wI2njkcJOkxxFmE32Fho";
