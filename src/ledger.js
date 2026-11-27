// Simulated permissioned ledger (Hyperledger Fabric-style) running in the browser.
// Hashing is real SHA-256 and the chain can be verified/tamper-checked, but there is no
// distributed network, endorsement policy or consensus here — that is the production Fabric deployment.
import { sha256 } from "./sha256.js";

export const LEDGER_LABEL = "Simulated permissioned ledger (Hyperledger Fabric-style, single browser node) — not a live blockchain network";
export const CHANNEL = "bloodlink-channel";
export const CHAINCODE = "bloodunit-cc v0.1 (simulated)";

export function blockHash(b) {
  return sha256(JSON.stringify([b.index, b.ts, b.type, b.org, b.txId, b.payload, b.prevHash]));
}

export function makeBlock(prev, { ts, type, org, payload }) {
  const b = { index: prev ? prev.index + 1 : 0, ts, type, org, payload, prevHash: prev ? prev.hash : "0".repeat(64) };
  b.txId = sha256(`${type}|${ts}|${b.index}|${JSON.stringify(payload)}`).slice(0, 20);
  b.hash = blockHash(b);
  return b;
}

export function buildChain(events, genesisTs) {
  const chain = [makeBlock(null, { ts: genesisTs, type: "GENESIS", org: "OrdererMSP", payload: { channel: CHANNEL, chaincode: CHAINCODE } })];
  for (const e of events) chain.push(makeBlock(chain[chain.length - 1], e));
  return chain;
}

// Recomputes every hash and link. Any edited block breaks its own hash and every link after it.
export function verifyChain(chain) {
  for (let i = 0; i < chain.length; i++) {
    const b = chain[i];
    if (blockHash(b) !== b.hash) return { ok: false, index: i, reason: `Block #${i}: contents do not match its hash (record altered)` };
    if (i > 0 && b.prevHash !== chain[i - 1].hash) return { ok: false, index: i, reason: `Block #${i}: previous-hash link broken` };
  }
  return { ok: true, count: chain.length };
}

export const unitHistory = (chain, unitId) => chain.filter((b) => b.payload?.unitId === unitId || b.payload?.unitIds?.includes(unitId));
