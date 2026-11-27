// Run: npm test  (node's built-in test runner, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../src/sha256.js";
import { buildChain, verifyChain, makeBlock } from "../src/ledger.js";
import * as E from "../src/engine.js";
import { parse, answer } from "../src/assistant.js";
import { validateRows, sampleDataset, parseCSV } from "../src/integration.js";
import { canTransfer, scopeOf, whereOf } from "../src/access.js";
import { buildReport, REPORTS } from "../src/reports.js";

const model = E.buildModel();

test("sha256 matches known vectors", () => {
  assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("ledger detects tampering and broken links", () => {
  const chain = buildChain([{ ts: 1, type: "A", org: "X", payload: { qty: 1 } }, { ts: 2, type: "B", org: "Y", payload: { qty: 2 } }], 0);
  assert.equal(verifyChain(chain).ok, true);
  const edited = chain.map((b, i) => (i === 1 ? { ...b, payload: { qty: 99 } } : b));
  assert.deepEqual(verifyChain(edited).index, 1);
  const relinked = [...chain.slice(0, 2), makeBlock({ index: 1, hash: "f".repeat(64) }, { ts: 3, type: "C", org: "Z", payload: {} })];
  assert.equal(verifyChain(relinked).ok, false);
});

test("forecast refuses low-volume series instead of guessing", () => {
  const s = new Float64Array(E.HISTORY_DAYS); s[E.HISTORY_DAYS - 1] = 3;
  assert.equal(E.forecastSeries(s, 7).status, "insufficient");
  const flat = new Float64Array(E.HISTORY_DAYS).fill(5);
  const fc = E.forecastSeries(flat, 7);
  assert.equal(fc.status, "ok");
  assert.ok(Math.abs(fc.total - 35) < 3, `flat series forecast ${fc.total}`);
  assert.equal(fc.confidence, "High");
});

test("scenario data: Leh O− shortage, Jammu O− surplus, Amritsar platelet wastage", () => {
  const leh = E.analyseCell(model, "LA-LEH-SNM|O-|PRBC");
  assert.equal(leh.status, "critical");
  assert.ok(leh.shortageProb > 0.6);
  assert.equal(E.analyseCell(model, "JK-JMU-GMC|O-|PRBC").status, "surplus");
  assert.ok(E.analyseCell(model, "PB-ASR-GMC|B+|PLT").wasteCount > 0);
});

test("redistribution never takes a source below its minimum or 7-day cover", () => {
  const recs = E.recommendTransfers(model);
  assert.ok(recs.length > 0);
  const taken = {};
  for (const r of recs) {
    const k = E.cellKey(r.from, r.group, r.comp);
    taken[k] = (taken[k] || 0) + r.qty;
    const a = E.analyseCell(model, k);
    assert.ok(taken[k] <= a.releasable, `${k} over-drawn`);
    assert.ok(a.available - taken[k] >= a.minLevel, `${k} below minimum`);
    assert.ok(r.route.best && r.route.best.feasible);
  }
});

test("winter road closure forces air route to Leh", () => {
  const r = E.routeOptions(E.facById["JK-JMU-GMC"], E.facById["LA-LEH-SNM"], "PRBC");
  assert.equal(r.options.find((o) => o.mode === "road").feasible, false);
  assert.equal(r.best.mode, "air");
});

test("AI can only draft: approvals need an authorised, different human in jurisdiction", () => {
  const t = { from: "JK-JMU-GMC", to: "LA-LEH-SNM", status: "Pending Approval", createdById: "u1" };
  assert.equal(canTransfer({ id: "u7", role: "state", region: "ladakh" }, t, "Approved"), true);
  assert.equal(canTransfer({ id: "u1", role: "centre", facId: "JK-JMU-GMC" }, t, "Approved"), false);
  assert.equal(canTransfer({ id: "u6", role: "super" }, { ...t, createdById: "u6" }, "Approved"), false);
  assert.equal(canTransfer({ id: "u10", role: "official" }, t, "Approved"), false);
  assert.equal(canTransfer({ id: "u8", role: "district", region: "jk", district: "jammu" }, t, "Approved"), false);
});

test("jurisdiction scoping", () => {
  const w = whereOf(scopeOf({ role: "district", region: "jk", district: "jammu" }));
  assert.deepEqual(E.FACILITIES.filter(w).map((f) => f.id), ["JK-JMU-GMC"]);
});

test("assistant parses entities and answers only from data", () => {
  assert.deepEqual(parse("Which blood banks currently have critical O-negative stock?").ent.group, "O-");
  assert.equal(parse("projected demand for platelets in Jammu").ent.district, "jammu");
  assert.equal(parse("Generate the monthly inventory report for Punjab").ent.state, "punjab");
  const ctx = { model, where: () => true, scopeLabel: "All", transfers: [], emergencies: [] };
  const a = answer("Which blood banks currently have critical O-negative stock?", ctx);
  assert.ok(a.table.rows.some((r) => r[0] === "SNM Hospital, Leh"));
  const denied = answer("critical stock in Punjab", { ...ctx, where: (f) => f.state === "ladakh", scopeLabel: "Ladakh" });
  assert.match(denied.text, /don't have access/);
  const follow = answer("what about Punjab?", { ...ctx, memory: a.memory });
  assert.ok(/Punjab/.test(follow.text));
  assert.match(answer("tell me a joke", ctx).text, /couldn't map/);
});

test("integration validation catches bad rows and CSV parser handles quotes", () => {
  const res = validateRows(sampleDataset());
  const msgs = res.errors.flatMap((e) => e.errors).join(" | ");
  for (const k of ["unknown blood bank", "invalid blood group", "invalid unit count", "unmapped component", "duplicate"]) assert.ok(msgs.includes(k), k);
  assert.deepEqual(parseCSV('a,"b, c","d ""q"""\r\n1,2,3\n'), [["a", "b, c", 'd "q"'], ["1", "2", "3"]]);
});

test("all reports build with rows", () => {
  for (const [id] of REPORTS) {
    const r = buildReport(id, model, {});
    assert.ok(r.columns.length && r.rows.length, id);
  }
});
