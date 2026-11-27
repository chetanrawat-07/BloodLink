// Shared app state for the intelligence modules: workflows, ledger, audit trail and configuration.
// Persisted in this browser's localStorage only (no server in the prototype).
import { useMemo, useSyncExternalStore } from "react";
import { AS_OF, DAY, SEED_TRANSFERS, SEED_EMERGENCIES, seedLedgerEvents, facById, cellKey } from "./networkData.js";
import { DEFAULT_CONFIG, buildModel } from "./engine.js";
import { buildChain, makeBlock } from "./ledger.js";

const KEY = "bloodlink_intel_v1";
const VERSION = 1;
const listeners = new Set();
const loadedAt = Date.now();

function seed() {
  const ledgerEvents = seedLedgerEvents().filter((e) => e.ts <= AS_OF);
  for (const t of SEED_TRANSFERS) {
    for (const [st, ts] of t.history) {
      if (["Approved", "Dispatched", "Received"].includes(st)) {
        ledgerEvents.push({ ts, type: `TRANSFER_${st.toUpperCase()}`, org: facById[st === "Received" ? t.to : t.from].code, payload: { transferId: t.id, from: t.from, to: t.to, group: t.group, comp: t.comp, qty: t.qty } });
      }
    }
  }
  ledgerEvents.sort((a, b) => a.ts - b.ts);
  return {
    version: VERSION,
    clock: AS_OF,
    config: DEFAULT_CONFIG,
    adjust: {},
    transfers: SEED_TRANSFERS,
    emergencies: SEED_EMERGENCIES,
    ledger: buildChain(ledgerEvents, AS_OF - 400 * DAY),
    audit: [
      { ts: AS_OF - 3 * 3600000, user: "System seed", role: "system", action: "transfer.submitted", detail: "TR-2026-0150 submitted for approval" },
      { ts: AS_OF - 8 * 3600000, user: "System seed", role: "system", action: "transfer.approved", detail: "TR-2026-0148 approved" },
      { ts: AS_OF - 26 * 3600000, user: "Imran Bhat", role: "centre", action: "transfer.dispatched", detail: "TR-2026-0146 dispatched (vehicle JK02-C-1190)" },
    ],
    syncRuns: [],
    imports: [],
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.version === VERSION) return { ...s, config: { ...DEFAULT_CONFIG, ...s.config } };
  } catch { /* corrupted or unavailable storage → fresh seed */ }
  return seed();
}

let state = load();

function commit(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota/private mode: keep in memory */ }
  listeners.forEach((l) => l());
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getState = () => state;
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// Model = static network + stock movements recorded by workflows + current configuration
export function useModel() {
  const adjust = useStore((s) => s.adjust);
  const config = useStore((s) => s.config);
  return useMemo(() => buildModel(adjust, config), [adjust, config]);
}

// Demo clock: starts at the snapshot time and moves forward in real time; never goes backwards.
export function now() {
  return Math.max(AS_OF + (Date.now() - loadedAt), state.clock);
}

const who = (user) => ({ user: user?.name || "System", role: user?.role || "system", userId: user?.id });

export function audit(user, action, detail, extra = {}) {
  const entry = { ts: now(), ...who(user), action, detail, ...extra };
  commit({ audit: [entry, ...state.audit].slice(0, 2000), clock: entry.ts });
}

function ledger(type, org, payload) {
  const chain = state.ledger;
  return [...chain, makeBlock(chain[chain.length - 1], { ts: now(), type, org, payload })];
}

function move(adjust, facId, group, comp, delta) {
  const k = cellKey(facId, group, comp);
  return { ...adjust, [k]: (adjust[k] || 0) + delta };
}

// ---------- transfers ----------
export const TRANSFER_FLOW = {
  Draft: ["Pending Approval", "Cancelled"],
  "Pending Approval": ["Approved", "Rejected"],
  Approved: ["Dispatched"],
  Dispatched: ["In Transit"],
  "In Transit": ["Received"],
  Received: ["Closed"],
};
export const TRANSFER_STEPS = ["Draft", "Pending Approval", "Approved", "Dispatched", "In Transit", "Received", "Closed"];

export function createTransfer(fields, user) {
  const n = state.transfers.length + 150;
  const t = {
    id: `TR-2026-${String(n).padStart(4, "0")}`, status: "Draft", createdBy: user.name, createdById: user.id, createdAt: now(),
    history: [["Draft", now(), user.name]], ...fields,
  };
  commit({ transfers: [t, ...state.transfers] });
  audit(user, "transfer.created", `${t.id}: ${t.qty} × ${t.group} ${t.comp}, ${facById[t.from].name} → ${facById[t.to].name}${t.recId ? " (from AI recommendation, human-created)" : ""}`);
  return t;
}

export function transitionTransfer(id, to, user, extra = {}) {
  const t = state.transfers.find((x) => x.id === id);
  if (!t || !(TRANSFER_FLOW[t.status] || []).includes(to)) throw new Error(`Invalid transition ${t?.status} → ${to}`);
  const next = { ...t, ...extra, status: to, history: [...t.history, [to, now(), user.name, extra.note || ""]] };
  if (to === "Approved") next.approvedBy = user.name;
  let { adjust, ledger: chain } = state;
  const payload = { transferId: t.id, from: t.from, to: t.to, group: t.group, comp: t.comp, qty: t.qty };
  if (to === "Approved") chain = ledger("TRANSFER_APPROVED", facById[t.to].code, { ...payload, approvedBy: user.role });
  if (to === "Dispatched") {
    adjust = move(adjust, t.from, t.group, t.comp, -t.qty);
    chain = ledger("TRANSFER_DISPATCHED", facById[t.from].code, { ...payload, temp: extra.dispatch?.temp });
  }
  if (to === "Received") {
    const got = extra.receipt?.qty ?? t.qty;
    adjust = move(adjust, t.to, t.group, t.comp, got);
    chain = ledger("TRANSFER_RECEIVED", facById[t.to].code, { ...payload, qtyReceived: got, temp: extra.receipt?.temp });
  }
  commit({ transfers: state.transfers.map((x) => (x.id === id ? next : x)), adjust, ledger: chain });
  audit(user, `transfer.${to.toLowerCase().replace(/ /g, "_")}`, `${id} → ${to}${extra.note ? ` (${extra.note})` : ""}`);
}

// ---------- emergency requests ----------
export const EMERGENCY_FLOW = {
  Submitted: ["Under Review"],
  "Under Review": ["Source Identified"],
  "Source Identified": ["Approval Pending"],
  "Approval Pending": ["Approved", "Rejected"],
  Approved: ["Processing"],
  Processing: ["Fulfilled"],
  Fulfilled: ["Closed"],
};
export const EMERGENCY_STEPS = ["Submitted", "Under Review", "Source Identified", "Approval Pending", "Approved", "Processing", "Fulfilled", "Closed"];

export function createEmergency(fields, user) {
  const n = state.emergencies.length + 308;
  const r = { id: `EM-2026-${String(n).padStart(4, "0")}`, status: "Submitted", createdAt: now(), createdBy: user.name, history: [["Submitted", now(), user.name]], ...fields };
  commit({ emergencies: [r, ...state.emergencies] });
  audit(user, "emergency.submitted", `${r.id}: ${r.qty} × ${r.group} ${r.comp} for ${r.hospital} (${r.urgency})`);
  return r;
}

export function transitionEmergency(id, to, user, extra = {}) {
  const r = state.emergencies.find((x) => x.id === id);
  if (!r || !(EMERGENCY_FLOW[r.status] || []).includes(to)) throw new Error(`Invalid transition ${r?.status} → ${to}`);
  const next = { ...r, ...extra, status: to, history: [...r.history, [to, now(), user.name, extra.note || ""]] };
  let { adjust, ledger: chain } = state;
  if (to === "Fulfilled" && next.source) {
    adjust = move(adjust, next.source, r.group, r.comp, -r.qty);
    // ledger carries the request ID only — no patient reference
    chain = ledger("EMERGENCY_FULFILLED", facById[next.source].code, { requestId: r.id, source: next.source, dest: r.destFacId, group: r.group, comp: r.comp, qty: r.qty });
  }
  commit({ emergencies: state.emergencies.map((x) => (x.id === id ? next : x)), adjust, ledger: chain });
  audit(user, `emergency.${to.toLowerCase().replace(/ /g, "_")}`, `${id} → ${to}${extra.note ? ` (${extra.note})` : ""}`);
}

// ---------- config, integration, demo ----------
export function setConfig(patch, user) {
  commit({ config: { ...state.config, ...patch } });
  audit(user, "config.updated", Object.keys(patch).join(", "));
}

export function addSyncRun(run, user) {
  commit({ syncRuns: [run, ...state.syncRuns].slice(0, 200) });
  audit(user, "integration.sync", `${run.mode} sync ${run.status}: ${run.ok} records OK, ${run.errors.length} errors`);
}

export function addImport(batch, user) {
  commit({ imports: [batch, ...state.imports].slice(0, 50) });
  audit(user, "integration.import", `${batch.file}: ${batch.accepted} rows staged, ${batch.rejected} rejected`);
}

export function tamperLedgerForDemo(index) {
  // Only used by the "tamper test" button: edits a stored block WITHOUT re-hashing so verification can catch it.
  const chain = state.ledger.map((b, i) => (i === index ? { ...b, payload: { ...b.payload, qty: (b.payload.qty || 0) + 5, tampered: true } } : b));
  commit({ ledger: chain, ledgerBackup: state.ledgerBackup || state.ledger });
}

// Simulates re-syncing the ledger from an untampered peer copy.
export function restoreLedgerFromPeer(user) {
  if (!state.ledgerBackup) return;
  commit({ ledger: state.ledgerBackup, ledgerBackup: null });
  audit(user, "ledger.restored", "Ledger restored from peer copy after tamper test");
}

export function resetDemo(user) {
  state = seed();
  commit({});
  audit(user, "demo.reset", "Demonstration data reset to the original seed");
}
