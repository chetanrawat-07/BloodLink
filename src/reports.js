// Report builders. Each returns plain rows so the same output feeds the screen, CSV (Excel) and PDF.
import {
  analyseCell, aggregateForecast, selectCells, FACILITIES, DISTRICTS, COMPONENTS, GROUPS, facById, cellKey, HISTORY_DAYS, AS_OF,
} from "./engine.js";
import { DEMO_DATA_LABEL } from "./networkData.js";

export const REPORTS = [
  ["daily", "Daily operational report"],
  ["weekly", "Weekly inventory report"],
  ["monthly", "Monthly supply-demand report"],
  ["district", "District performance report"],
  ["wastage", "Wastage analysis"],
  ["shortage", "Shortage prediction report"],
  ["supply", "Supply chain performance report"],
];

const lastN = (cells, field, n, offset = 0) => cells.reduce((s, c) => { let t = 0; for (let i = HISTORY_DAYS - n - offset; i < HISTORY_DAYS - offset; i++) t += c[field][i]; return s + t; }, 0);
const day = (ts) => new Date(ts).toISOString().slice(0, 10);
const hrs = (a, b) => (a && b ? (b - a) / 3600000 : null);
const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—"; };
const pctS = (p) => (p == null ? "—" : `${Math.round(p * 100)}%`);

export function buildReport(id, model, { where = () => true, transfers = [], emergencies = [], scopeLabel = "All participating States/UTs" } = {}) {
  const facs = FACILITIES.filter(where);
  const cellsOf = (filter) => selectCells(model, { ...filter, where });
  const asOf = day(AS_OF);
  const base = { meta: [`Jurisdiction: ${scopeLabel}`, `Data as of: ${new Date(AS_OF).toISOString().replace("T", " ").slice(0, 16)} UTC`, `Source: ${DEMO_DATA_LABEL}`], notes: [] };

  switch (id) {
    case "daily": {
      const rows = facs.map((f) => {
        const cs = cellsOf({ facId: f.id });
        const as = cs.map((c) => analyseCell(model, c.key));
        return [f.name, cs.reduce((s, c) => s + c.available, 0), cs.reduce((s, c) => s + c.reserved, 0), cs.reduce((s, c) => s + c.quarantined, 0),
          lastN(cs, "collected", 1), lastN(cs, "demand", 1), as.filter((a) => a.status === "critical").length, as.reduce((s, a) => s + a.risk.critical, 0), `${f.lastUpdateH} h`];
      });
      return { ...base, title: "Daily operational report", period: `Day ending ${asOf}`, columns: ["Blood bank", "Available", "Reserved", "Quarantined", "Collected (yesterday)", "Issued (yesterday)", "Critical cells", "Units ≤ critical expiry", "Last update"], rows };
    }
    case "weekly": {
      const rows = facs.map((f) => [f.name, ...COMPONENTS.map((c) => cellsOf({ facId: f.id, comp: c.id }).reduce((s, x) => s + x.available, 0)),
        COMPONENTS.reduce((s, c) => s + cellsOf({ facId: f.id, comp: c.id }).reduce((t, x) => t + analyseCell(model, x.key).risk.warning + analyseCell(model, x.key).risk.critical, 0), 0),
        lastN(cellsOf({ facId: f.id }), "demand", 7)]);
      return { ...base, title: "Weekly inventory report", period: `7 days ending ${asOf}`, columns: ["Blood bank", ...COMPONENTS.map((c) => c.name), "Near expiry", "Issued (7 d)"], rows };
    }
    case "monthly": {
      const rows = DISTRICTS.filter((d) => facs.some((f) => f.district === d.id)).map((d) => {
        const cs = cellsOf({ district: d.id });
        const col = lastN(cs, "collected", 30), use = lastN(cs, "demand", 30), disc = lastN(cs, "discarded", 30);
        const fc = aggregateForecast(model, { district: d.id, where }, 30).fc;
        return [d.name, col, use, col - use, disc, fc.status === "ok" ? fc.total.toFixed(0) : "Insufficient Data", fc.status === "ok" ? fc.confidence : "—"];
      });
      base.notes.push("Next-30-day forecast is an AI prediction; all other columns are recorded history.");
      return { ...base, title: "Monthly supply-demand report", period: `30 days ending ${asOf}`, columns: ["District", "Collected", "Utilised", "Net balance", "Discarded", "Forecast next 30 d", "Forecast confidence"], rows };
    }
    case "district": {
      const rows = DISTRICTS.filter((d) => facs.some((f) => f.district === d.id)).map((d) => {
        const cs = cellsOf({ district: d.id });
        const as = cs.map((c) => analyseCell(model, c.key));
        const use = lastN(cs, "demand", 30), disc = lastN(cs, "discarded", 30);
        const prbc = as.filter((a) => a.comp === "PRBC");
        const mu = prbc.reduce((s, a) => s + a.mu, 0);
        const em = emergencies.filter((r) => facById[r.destFacId].district === d.id);
        const fil = em.filter((r) => r.history.some((h) => h[0] === "Fulfilled"));
        return [d.name, as.reduce((s, a) => s + a.available, 0), mu > 0 ? (prbc.reduce((s, a) => s + a.available, 0) / mu).toFixed(1) : "—",
          as.filter((a) => a.status === "critical").length, `${((100 * disc) / Math.max(1, use + disc)).toFixed(1)}%`, em.length, fil.length,
          avg(fil.map((r) => hrs(r.createdAt, r.history.find((h) => h[0] === "Fulfilled")[1])))];
      });
      return { ...base, title: "District performance report", period: `30 days ending ${asOf}`, columns: ["District", "Available", "PRBC days of cover", "Critical cells", "Wastage rate", "Emergency requests", "Fulfilled", "Avg fulfilment (h)"], rows };
    }
    case "wastage": {
      const rows = [];
      for (const f of facs) for (const c of COMPONENTS) {
        const cs = cellsOf({ facId: f.id, comp: c.id });
        const d30 = lastN(cs, "discarded", 30), d90 = lastN(cs, "discarded", 90), u90 = lastN(cs, "demand", 90);
        const pred = cs.reduce((s, x) => s + analyseCell(model, x.key).wasteCount, 0);
        if (d90 || pred) rows.push([f.name, c.name, d30, d90, `${((100 * d90) / Math.max(1, u90 + d90)).toFixed(1)}%`, pred]);
      }
      rows.sort((a, b) => b[3] - a[3]);
      base.notes.push("“Predicted waste now” is an AI prediction (FEFO simulation); discard counts are recorded history.");
      return { ...base, title: "Wastage analysis", period: `90 days ending ${asOf}`, columns: ["Blood bank", "Component", "Discarded 30 d", "Discarded 90 d", "Wastage rate (90 d)", "Predicted waste now"], rows };
    }
    case "shortage": {
      const rows = [];
      for (const f of facs) for (const g of GROUPS) for (const c of COMPONENTS) {
        const a = analyseCell(model, cellKey(f.id, g, c.id));
        if (a.fc.status === "ok" && a.shortageProb >= 0.3) rows.push([f.name, g, c.name, a.available, a.fc.total.toFixed(1), (a.supplyMu * 7).toFixed(1), pctS(a.shortageProb), a.depletionDay ? `day ${a.depletionDay}` : "—", a.fc.confidence]);
      }
      rows.sort((x, y) => parseInt(y[6]) - parseInt(x[6]));
      base.notes.push("All rows are AI predictions. Cells with too little history are excluded (Insufficient Data), not assumed safe.");
      return { ...base, title: "Shortage prediction report", period: `Next 7 days from ${asOf}`, columns: ["Blood bank", "Group", "Component", "Stock", "Forecast demand", "Expected collections", "Shortage probability", "Depletes by", "Confidence"], rows };
    }
    case "supply": {
      const inScope = transfers.filter((x) => where(facById[x.from]) || where(facById[x.to]));
      const at = (x, s) => x.history.find((h) => h[0] === s)?.[1];
      const statuses = ["Draft", "Pending Approval", "Approved", "Dispatched", "In Transit", "Received", "Closed", "Rejected", "Cancelled"];
      const rows = statuses.map((s) => [s, inScope.filter((x) => x.status === s).length, inScope.filter((x) => x.status === s).reduce((t, x) => t + x.qty, 0)]);
      rows.push(["Avg approval time (h)", avg(inScope.map((x) => hrs(at(x, "Pending Approval"), at(x, "Approved")))), ""]);
      rows.push(["Avg transit time (h)", avg(inScope.map((x) => hrs(at(x, "Dispatched"), at(x, "Received")))), ""]);
      rows.push(["Short receipts", inScope.filter((x) => x.receipt && x.receipt.qty < x.qty).length, ""]);
      return { ...base, title: "Supply chain performance report", period: `All recorded transfers up to ${asOf}`, columns: ["Status / metric", "Transfers", "Units"], rows };
    }
    default:
      return null;
  }
}
