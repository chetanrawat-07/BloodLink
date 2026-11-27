// e-RaktKosh integration layer (read-only). Mapping, validation and CSV parsing are real;
// the "API" side is configuration only — no live endpoint, credentials or data-sharing approval exist in the prototype.
import { FACILITIES, NETWORK, AS_OF, GROUPS } from "./networkData.js";

export const INTEGRATION_STATUS = "Not connected — awaiting API documentation, credentials and data-sharing approval";

// Source vocabulary → platform codes
export const GROUP_MAP = {
  "O+": "O+", "O+VE": "O+", "OPOS": "O+", "OPOSITIVE": "O+", "O-": "O-", "O-VE": "O-", "ONEG": "O-", "ONEGATIVE": "O-",
  "A+": "A+", "A+VE": "A+", "APOS": "A+", "APOSITIVE": "A+", "A-": "A-", "A-VE": "A-", "ANEG": "A-", "ANEGATIVE": "A-",
  "B+": "B+", "B+VE": "B+", "BPOS": "B+", "BPOSITIVE": "B+", "B-": "B-", "B-VE": "B-", "BNEG": "B-", "BNEGATIVE": "B-",
  "AB+": "AB+", "AB+VE": "AB+", "ABPOS": "AB+", "ABPOSITIVE": "AB+", "AB-": "AB-", "AB-VE": "AB-", "ABNEG": "AB-", "ABNEGATIVE": "AB-",
};
export const COMPONENT_MAP = {
  "PACKED RED BLOOD CELLS": "PRBC", "PRBC": "PRBC", "PCV": "PRBC", "PACKED CELL VOLUME": "PRBC", "RED CELLS": "PRBC", "SAGM PRBC": "PRBC",
  "WHOLE BLOOD": "WB", "WB": "WB", "CPDA-1 WHOLE BLOOD": "WB",
  "RANDOM DONOR PLATELETS": "PLT", "RDP": "PLT", "SINGLE DONOR PLATELETS": "PLT", "SDP": "PLT", "PLATELET CONCENTRATE": "PLT", "PLATELETS": "PLT",
  "FRESH FROZEN PLASMA": "FFP", "FFP": "FFP", "PLASMA": "FFP",
  "CRYOPRECIPITATE": "CRYO", "CRYO": "CRYO", "CRYO POOR PLASMA": null, // known but not tracked by this platform
};
const SRC_COMPONENT = { PRBC: "Packed Red Blood Cells", WB: "Whole Blood", PLT: "Random Donor Platelets", FFP: "Fresh Frozen Plasma", CRYO: "Cryoprecipitate" };
const SRC_GROUP = (g) => g.replace("+", " +Ve").replace("-", " -Ve");

export const FIELDS = [
  ["erk_code", "Blood bank code (e-RaktKosh)", ["erk_code", "bloodbank_code", "bb_code", "blood bank code", "facility_code"]],
  ["blood_group", "Blood group", ["blood_group", "bloodgroup", "group", "abo_rh"]],
  ["component", "Component", ["component", "component_name", "product"]],
  ["units", "Available units", ["units", "available_units", "qty", "quantity", "stock"]],
  ["updated_at", "Last updated (ISO)", ["updated_at", "last_updated", "timestamp", "as_of"]],
];

export const facilityByErk = Object.fromEntries(FACILITIES.map((f) => [f.ertk, f]));

// Representative sample in e-RaktKosh-like vocabulary, with deliberate quality issues to exercise validation.
export function sampleDataset() {
  const rows = [];
  const counts = {};
  for (const u of NETWORK.units) if (u.status === "Available") { const k = `${u.facId}|${u.group}|${u.comp}`; counts[k] = (counts[k] || 0) + 1; }
  for (const f of FACILITIES) for (const g of GROUPS) for (const c of ["PRBC", "PLT", "FFP"]) {
    rows.push({ erk_code: f.ertk, blood_group: SRC_GROUP(g), component: SRC_COMPONENT[c], units: String(counts[`${f.id}|${g}|${c}`] || 0), updated_at: new Date(AS_OF - f.lastUpdateH * 3600000).toISOString() });
  }
  rows.push({ erk_code: "ERK-JK-0999", blood_group: "O +Ve", component: "Packed Red Blood Cells", units: "12", updated_at: new Date(AS_OF).toISOString() });
  rows.push({ erk_code: "ERK-PB-0101", blood_group: "O", component: "Whole Blood", units: "4", updated_at: new Date(AS_OF).toISOString() });
  rows.push({ erk_code: "ERK-PB-0305", blood_group: "B +Ve", component: "Fresh Frozen Plasma", units: "-3", updated_at: new Date(AS_OF).toISOString() });
  rows.push({ erk_code: "ERK-JK-0204", blood_group: "A +Ve", component: "Leucoreduced Granulocytes", units: "2", updated_at: new Date(AS_OF).toISOString() });
  rows.push({ ...rows[0] }); // duplicate
  return rows;
}

export function validateRows(rows, staleHours = 24) {
  const errors = [], warnings = [], ok = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const fac = facilityByErk[(r.erk_code || "").trim()];
    const group = GROUP_MAP[(r.blood_group || "").toUpperCase().replace(/\s+/g, "")];
    const compKey = (r.component || "").toUpperCase().trim();
    const comp = COMPONENT_MAP[compKey];
    const units = Number(r.units);
    const ts = Date.parse(r.updated_at);
    const errs = [];
    if (!fac) errs.push(`unknown blood bank code "${r.erk_code}" (not in facility master)`);
    if (!group) errs.push(`invalid blood group "${r.blood_group}"`);
    if (comp === undefined) errs.push(`unmapped component "${r.component}"`);
    if (!Number.isInteger(units) || units < 0) errs.push(`invalid unit count "${r.units}"`);
    if (!Number.isFinite(ts)) errs.push(`invalid timestamp "${r.updated_at}"`);
    const key = `${r.erk_code}|${group}|${comp}`;
    if (!errs.length && seen.has(key)) errs.push("duplicate row for this blood bank / group / component");
    seen.add(key);
    if (errs.length) { errors.push({ line, row: r, errors: errs }); return; }
    if (comp === null) { warnings.push({ line, msg: `${r.component}: recognised but not tracked by this platform — skipped` }); return; }
    const ageH = (AS_OF - ts) / 3600000;
    if (ageH > staleHours) warnings.push({ line, msg: `${fac.name}: data is ${Math.round(ageH)} h old (stale > ${staleHours} h)` });
    ok.push({ facId: fac.id, group, comp, units, updatedAt: ts });
  });
  return { ok, errors, warnings };
}

// Per-facility data quality from a validated batch
export function qualityByFacility(result, staleHours = 24) {
  return FACILITIES.map((f) => {
    const rows = result.ok.filter((r) => r.facId === f.id);
    const errs = result.errors.filter((e) => e.row.erk_code === f.ertk).length;
    const newest = rows.length ? Math.max(...rows.map((r) => r.updatedAt)) : null;
    const ageH = newest ? (AS_OF - newest) / 3600000 : null;
    const expected = GROUPS.length * 3;
    return {
      fac: f, rows: rows.length, errors: errs,
      completeness: Math.min(1, rows.length / expected),
      validity: rows.length + errs ? rows.length / (rows.length + errs) : null,
      ageH, timely: ageH != null && ageH <= staleHours,
    };
  });
}

// Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF)
export function parseCSV(text) {
  const out = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) out.push(row);
  return out;
}

export function autoMap(headers) {
  const norm = (h) => h.trim().toLowerCase().replace(/^﻿/, "");
  return Object.fromEntries(FIELDS.map(([key, , syn]) => [key, headers.findIndex((h) => syn.includes(norm(h)))]));
}

export const TEMPLATE_CSV = "erk_code,blood_group,component,units,updated_at\r\nERK-LA-0101,O -Ve,Packed Red Blood Cells,3,2026-11-27T08:00:00+05:30\r\nERK-JK-0101,O -Ve,Packed Red Blood Cells,46,2026-11-27T07:30:00+05:30\r\n";

