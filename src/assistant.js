// Natural-language operational assistant. Deterministic intent + entity parsing over the analytics engine:
// every number in an answer comes from the data layer, and unknown / out-of-scope questions say so instead of guessing.
// shortcut: keyword parser, not an LLM — swap parse() for an LLM/NLU service later; keep answer builders as the data-backed tools.
import {
  analyseCell, aggregateForecast, findSources, daysLeft, expiryRisk,
  FACILITIES, DISTRICTS, STATES, GROUPS, COMPONENTS, compById, facById, districtById, cellKey, AS_OF,
} from "./engine.js";
import { buildReport, REPORTS } from "./reports.js";
import { DEMO_DATA_LABEL } from "./networkData.js";

const COMP_WORDS = [[/platelet|\bplt\b/, "PLT"], [/prbc|packed red|red cell|\brbc\b/, "PRBC"], [/\bffp\b|plasma/, "FFP"], [/cryo/, "CRYO"], [/whole blood/, "WB"]];
const STATE_WORDS = [[/j\s*&\s*k|jammu\s*(?:and|&)\s*kashmir/, "jk"], [/ladakh/, "ladakh"], [/punjab/, "punjab"]];
const FAC_ALIASES = {
  "JK-JMU-GMC": [/gmc jammu/], "JK-SXR-SKIMS": [/skims/], "JK-SXR-SMHS": [/smhs/], "JK-ANT-GMC": [/gmc anantnag/],
  "JK-KTH-DH": [/kathua (?:district )?hospital|dh kathua/], "JK-BRM-GMC": [/gmc baramulla/], "LA-LEH-SNM": [/\bsnm\b/],
  "LA-KGL-DH": [/kargil (?:district )?hospital/], "LA-NUB-CHC": [/diskit|nubra/], "PB-ASR-GMC": [/gmc amritsar/],
  "PB-LDH-DMC": [/\bdmc\b/], "PB-PTA-RH": [/rajindra/], "PB-JAL-CH": [/civil hospital jalandhar/], "PB-BTI-AIIMS": [/aiims/],
};
const NUM_WORDS = { three: 3, five: 5, seven: 7, ten: 10, fifteen: 15, thirty: 30 };
const asOf = new Date(AS_OF).toISOString().slice(0, 10);

export const EXAMPLES = [
  "Which blood banks currently have critical O-negative stock?",
  "Which districts are likely to face shortages in the next seven days?",
  "Show all blood units approaching expiry.",
  "Which facilities have surplus PRBC inventory?",
  "What is the projected demand for platelets in Jammu?",
  "Which facilities can support an emergency requirement in Leh?",
  "Generate the monthly inventory report for Punjab.",
  "Show the top five facilities with the highest wastage.",
];

export function parse(q) {
  const s = ` ${q.toLowerCase().replace(/[’']/g, "")} `;
  const ent = {};
  const g = s.match(/\b(ab|a|b|o)\s*(?:(\+\s*ve|-?\s*pos(?:itive)?|\+)|(-\s*ve|-?\s*neg(?:ative)?|-|−))(?![a-z])/);
  if (g) ent.group = g[1].toUpperCase() + (g[2] ? "+" : "-");
  for (const [re, id] of COMP_WORDS) if (re.test(s)) { ent.comp = id; break; }
  let rest = s;
  for (const [re, id] of STATE_WORDS) if (re.test(rest)) { ent.state = id; rest = rest.replace(re, " "); break; }
  for (const [id, res] of Object.entries(FAC_ALIASES)) if (res.some((re) => re.test(rest))) { ent.facId = id; break; }
  if (!ent.facId) for (const d of DISTRICTS) if (new RegExp(`\\b${d.name.toLowerCase()}\\b`).test(rest)) { ent.district = d.id; break; }
  const h = s.match(/(\d+)\s*-?\s*days?/) || s.match(/\b(seven|fifteen|thirty)\s*days?/);
  if (h) ent.horizon = Number(h[1]) || NUM_WORDS[h[1]];
  else if (/fortnight/.test(s)) ent.horizon = 15;
  else if (/\bmonth\b/.test(s) && !/report/.test(s)) ent.horizon = 30;
  else if (/\bweek\b/.test(s) && !/report/.test(s)) ent.horizon = 7;
  const top = s.match(/top\s*(\d+|three|five|ten)/);
  if (top) ent.top = Number(top[1]) || NUM_WORDS[top[1]];
  const qty = s.match(/(\d+)\s*units?/);
  if (qty) ent.qty = Number(qty[1]);
  if (/district/.test(s)) ent.byDistrict = true;

  let intent = null;
  if (/^\s*(help|what can you|how do i)/.test(s)) intent = "help";
  else if (/report/.test(s)) intent = "report";
  else if (/wast|discard/.test(s)) intent = "wastage";
  else if (/expir/.test(s)) intent = "expiry";
  else if (/surplus|excess|overstock/.test(s)) intent = "surplus";
  else if (/support|fulfil|can (send|provide|supply)|sources?\b/.test(s)) intent = "support";
  else if (/shortage|likely|run out|deplet|at risk/.test(s)) intent = "shortage";
  else if (/demand|forecast|project/.test(s)) intent = "demand";
  else if (/transfer|in transit|pending approval/.test(s)) intent = "transfers";
  else if (/critical|low stock|stock|availab|how many|units of/.test(s)) intent = "stock";
  if (/report/.test(s)) {
    ent.report = /daily/.test(s) ? "daily" : /weekly/.test(s) ? "weekly" : /monthly|supply.?demand/.test(s) ? "monthly" : /district|performance/.test(s) ? "district" : /wast/.test(s) ? "wastage" : /shortage|predict/.test(s) ? "shortage" : /supply chain|transfer/.test(s) ? "supply" : /inventory/.test(s) ? "weekly" : null;
    if (/monthly inventory/.test(s)) ent.monthlyInventoryNote = true;
  }
  return { intent, ent };
}

const placeName = (e) => (e.facId ? facById[e.facId].name : e.district ? districtById[e.district].name : e.state ? STATES.find((x) => x.id === e.state).name : null);
const placeWhere = (e) => (f) => (!e.facId || f.id === e.facId) && (!e.district || f.district === e.district) && (!e.state || f.state === e.state);
const label = (e) => [e.group, e.comp && compById[e.comp].name].filter(Boolean).join(" ") || "all groups and components";
const pct = (p) => `${Math.round(p * 100)}%`;

// ctx: { model, where (role jurisdiction), scopeLabel, transfers, emergencies, memory }
export function answer(question, ctx) {
  let { intent, ent } = parse(question);
  const mem = ctx.memory;
  if (!intent && mem && Object.keys(ent).length) { intent = mem.intent; ent = { ...mem.ent, ...ent }; } // follow-up like "what about Punjab?"
  const base = { period: null, kind: "fact", source: DEMO_DATA_LABEL, memory: intent ? { intent, ent } : mem };
  if (!intent || intent === "help") {
    return { ...base, text: intent === "help" ? "I can answer questions about stock, shortages, forecasts, expiry, surplus, wastage, emergency sourcing, transfers and reports — within your jurisdiction." : "I couldn't map that question to the data I hold. Try one of these:", suggestions: EXAMPLES };
  }

  const inPlace = placeWhere(ent);
  const where = (f) => ctx.where(f) && inPlace(f);
  const place = placeName(ent);
  if (place && !FACILITIES.some(where)) {
    return { ...base, text: FACILITIES.some(inPlace) ? `You don't have access to data for ${place}. Your jurisdiction: ${ctx.scopeLabel}.` : `No participating blood bank is registered in ${place}.` };
  }
  const facs = FACILITIES.filter(where);
  const groups = ent.group ? [ent.group] : GROUPS;
  const comps = ent.comp ? [ent.comp] : COMPONENTS.map((c) => c.id);
  const cells = () => facs.flatMap((f) => groups.flatMap((g) => comps.map((c) => analyseCell(ctx.model, cellKey(f.id, g, c), ent.horizon || 7))));
  const where$ = place ? ` in ${place}` : "";

  switch (intent) {
    case "stock": {
      const crit = cells().filter((a) => a.status === "critical" || (/low/.test(question.toLowerCase()) && a.status === "low"));
      if (!crit.length) return { ...base, period: `As of ${asOf}`, text: `No blood bank${where$} currently has critical ${label(ent)} stock.` };
      const names = [...new Set(crit.map((a) => facById[a.facId].name))];
      return { ...base, period: `As of ${asOf}`,
        text: `${names.length} blood bank${names.length > 1 ? "s" : ""}${where$} currently ha${names.length > 1 ? "ve" : "s"} critical ${label(ent)} stock (below half the recommended minimum): ${names.slice(0, 6).join(", ")}${names.length > 6 ? "…" : ""}.`,
        table: { columns: ["Blood bank", "Group", "Component", "Available", "Minimum", "Days of cover"], rows: crit.sort((a, b) => a.daysCover - b.daysCover).slice(0, 25).map((a) => [facById[a.facId].name, a.group, compById[a.comp].name, a.available, a.minLevel, Number.isFinite(a.daysCover) ? a.daysCover.toFixed(1) : "—"]) },
        followups: ["Which facilities have surplus to cover these?", "Show projected demand for the next 7 days"] };
    }
    case "shortage": {
      const h = ent.horizon || 7;
      if (ent.byDistrict || /district/.test(question.toLowerCase())) {
        const rows = DISTRICTS.filter((d) => facs.some((f) => f.district === d.id)).map((d) => ({ d, a: aggregateForecast(ctx.model, { district: d.id, group: ent.group, comp: ent.comp, where }, h) }));
        const atRisk = rows.filter((r) => r.a.fc.status === "ok" && r.a.shortageProb >= 0.5).sort((x, y) => y.a.shortageProb - x.a.shortageProb);
        const cellHits = cells().filter((a) => a.fc.status === "ok" && a.shortageProb >= 0.6);
        const byDist = {}; cellHits.forEach((a) => { byDist[a.district] = (byDist[a.district] || 0) + 1; });
        const insufficient = rows.filter((r) => r.a.fc.status !== "ok").length;
        return { ...base, kind: "prediction", period: `Next ${h} days from ${asOf}`,
          text: `Prediction: ${Object.keys(byDist).length} district${Object.keys(byDist).length === 1 ? "" : "s"}${where$} ha${Object.keys(byDist).length === 1 ? "s" : "ve"} at least one blood bank × group × component (${label(ent)}) with ≥60% shortage probability in the next ${h} days${atRisk.length ? `; ${atRisk.length} also at district-aggregate level` : ""}.${insufficient ? ` ${insufficient} district series had insufficient data.` : ""}`,
          table: { columns: ["District", "At-risk cells", "District stock", "District forecast", "District shortage prob."], rows: rows.map((r) => [r.d.name, byDist[r.d.id] || 0, r.a.available, r.a.fc.status === "ok" ? r.a.fc.total.toFixed(0) : "Insufficient Data", r.a.fc.status === "ok" ? pct(r.a.shortageProb) : "—"]).sort((a, b) => b[1] - a[1]) } };
      }
      const hits = cells().filter((a) => a.fc.status === "ok" && a.shortageProb >= 0.5).sort((a, b) => b.shortageProb - a.shortageProb);
      return { ...base, kind: "prediction", period: `Next ${h} days from ${asOf}`,
        text: hits.length ? `Prediction: ${hits.length} blood bank × group × component cell${hits.length > 1 ? "s" : ""}${where$} have ≥50% shortage probability for ${label(ent)} in the next ${h} days.` : `No ${label(ent)} shortage above 50% probability is predicted${where$} in the next ${h} days.`,
        table: hits.length ? { columns: ["Blood bank", "Group", "Component", "Stock", "Forecast", "Probability", "Confidence"], rows: hits.slice(0, 25).map((a) => [facById[a.facId].name, a.group, compById[a.comp].name, a.available, a.fc.total.toFixed(1), pct(a.shortageProb), a.fc.confidence]) } : null };
    }
    case "demand": {
      const h = ent.horizon || 7;
      const a = aggregateForecast(ctx.model, { group: ent.group, comp: ent.comp, where }, h);
      if (a.fc.status !== "ok") return { ...base, period: `Next ${h} days`, text: `Insufficient Data: ${a.fc.reason} No forecast is shown rather than an unreliable one.` };
      return { ...base, kind: "prediction", period: `Next ${h} days from ${asOf}`,
        text: `Prediction: projected demand for ${label(ent)}${where$} over the next ${h} days is ${a.fc.total.toFixed(0)} units (80% range ${a.fc.lower.toFixed(0)}–${a.fc.upper.toFixed(0)}), confidence ${a.fc.confidence}. Current stock ${a.available}; expected collections ~${(a.supplyMu * h).toFixed(0)}; shortage probability ${pct(a.shortageProb)}.`,
        bars: a.fc.daily.map((v, i) => ({ label: `Day +${i + 1}`, value: v, display: v.toFixed(1) })) };
    }
    case "expiry": {
      const units = facs.flatMap((f) => groups.flatMap((g) => comps.flatMap((c) => {
        const cell = ctx.model.byKey.get(cellKey(f.id, g, c));
        return cell.units.filter((u) => u.status === "Available").slice(0, cell.available);
      }))).filter((u) => ["critical", "warning"].includes(expiryRisk(u, ctx.model.config))).sort((a, b) => a.expiry - b.expiry);
      return { ...base, period: `Remaining shelf life as of ${asOf}`,
        text: units.length ? `${units.length} available ${label(ent)} unit${units.length > 1 ? "s are" : " is"} within the configured expiry warning window${where$}. Earliest first (FEFO):` : `No available ${label(ent)} units are within the expiry warning window${where$}.`,
        table: units.length ? { columns: ["Unit ID", "Blood bank", "Group", "Component", "Days left"], rows: units.slice(0, 40).map((u) => [u.id, facById[u.facId].name, u.group, compById[u.comp].name, daysLeft(u).toFixed(1)]) } : null };
    }
    case "surplus": {
      const s = cells().filter((a) => a.status === "surplus").sort((a, b) => b.releasable - a.releasable);
      return { ...base, period: `As of ${asOf}`,
        text: s.length ? `${new Set(s.map((a) => a.facId)).size} facilit${new Set(s.map((a) => a.facId)).size > 1 ? "ies hold" : "y holds"} ${label(ent)} above the recommended maximum${where$}.` : `No facility${where$} holds ${label(ent)} above its recommended maximum.`,
        table: s.length ? { columns: ["Blood bank", "Group", "Component", "Available", "Maximum", "Releasable"], rows: s.slice(0, 25).map((a) => [facById[a.facId].name, a.group, compById[a.comp].name, a.available, a.maxLevel, a.releasable]) } : null };
    }
    case "support": {
      if (!place) return { ...base, text: "Which facility or district needs support? For example: “Which facilities can support an emergency requirement in Leh?”" };
      const dest = facs.slice().sort((a, b) => b.scale - a.scale)[0];
      const group = ent.group || "O-", comp = ent.comp || "PRBC", qty = ent.qty || 2;
      const r = findSources(ctx.model, { group, comp, qty, destFacId: dest.id, requiredBy: AS_OF + 6 * 3600000 });
      const ok = r.rows.filter((x) => x.route.best && x.permitted && x.releasable > 0);
      return { ...base, period: `As of ${asOf}`,
        text: `${ok.length} facilit${ok.length === 1 ? "y" : "ies"} can support ${qty} × ${group} ${compById[comp].name} for ${dest.name}${ent.group ? "" : " (assumed O− PRBC — say a group/component to change)"}. ${r.delay ? `Note: ${r.delay}` : ""}`.trim(),
        table: { columns: ["Source", "Releasable", "Route", "ETA (h)", "Inter-state"], rows: ok.slice(0, 8).map((x) => [x.fac.name, x.releasable, `${x.route.best.mode}${x.route.best.airLeg ? ` ${x.route.best.airLeg}` : ""}`, x.route.best.hours.toFixed(1), x.route.interState ? "yes" : "no"]) },
        notes: [...r.alternatives, "Clinical compatibility and transfusion decisions remain with authorised medical professionals."] };
    }
    case "report": {
      const id = ent.report || "daily";
      const rep = buildReport(id, ctx.model, { where, transfers: ctx.transfers, emergencies: ctx.emergencies, scopeLabel: place || ctx.scopeLabel });
      const name = REPORTS.find((r) => r[0] === id)[1];
      return { ...base, period: rep.period, kind: id === "shortage" ? "prediction" : "fact",
        text: `${name}${where$ || ` for ${ctx.scopeLabel}`} — ${rep.rows.length} rows.${ent.monthlyInventoryNote ? " (The monthly report shows 30-day inventory flows — collected, utilised, discarded — by district. For current stock per facility ask for the weekly inventory report.)" : ""}`,
        table: { columns: rep.columns, rows: rep.rows }, report: rep, notes: rep.notes };
    }
    case "wastage": {
      const rep = buildReport("wastage", ctx.model, { where, scopeLabel: place || ctx.scopeLabel });
      const by = {}; for (const r of rep.rows) by[r[0]] = by[r[0]] || [0, 0]; for (const r of rep.rows) { by[r[0]][0] += r[3]; by[r[0]][1] += r[5]; }
      const n = ent.top || 5;
      const top = Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).slice(0, n);
      return { ...base, period: rep.period,
        text: top.length ? `Top ${top.length} facilit${top.length > 1 ? "ies" : "y"}${where$} by units discarded in the last 90 days (recorded history). Predicted waste from current stock is shown separately as an AI estimate.` : `No wastage recorded${where$}.`,
        table: { columns: ["Blood bank", "Discarded (90 d)", "Predicted waste now (AI)"], rows: top.map(([f, [d, p]]) => [f, d, p]) },
        bars: top.map(([f, [d]]) => ({ label: f, value: d })) };
    }
    case "transfers": {
      const list = ctx.transfers.filter((x) => where(facById[x.from]) || where(facById[x.to]));
      const by = {}; list.forEach((x) => { by[x.status] = (by[x.status] || 0) + 1; });
      return { ...base, period: "All recorded transfers",
        text: list.length ? `${list.length} transfer${list.length > 1 ? "s" : ""}${where$}: ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(", ")}.` : `No transfers recorded${where$}.`,
        table: list.length ? { columns: ["ID", "From", "To", "Group/Comp", "Qty", "Status"], rows: list.slice(0, 20).map((x) => [x.id, facById[x.from].name, facById[x.to].name, `${x.group} ${x.comp}`, x.qty, x.status]) } : null };
    }
    default:
      return { ...base, text: "I couldn't answer that from the available data." };
  }
}
