import { useMemo, useRef, useState } from "react";
import { useModel, createTransfer } from "../store.js";
import { scopeOf, whereOf, can } from "../access.js";
import {
  analyseCell, findSources, recommendTransfers, routeOptions, nearbyFacilities, daysLeft, transferPermitted,
  FACILITIES, STATES, compById, facById, districtById, cellKey, AS_OF,
} from "../engine.js";
import { useLang } from "../i18n.jsx";
import { Select, OPT, StatusPill, Provenance, fmtH, Tabs, Empty } from "../ui.jsx";
import RecCard from "./RecCard.jsx";

const W = 560, H = 470;
const BOUNDS = { latMax: 35.1, latMin: 29.8, lngMin: 73.8, lngMax: 78.2 };
// Web-Mercator world pixels at zoom Z, so facility dots line up with the basemap tiles.
const Z = 7, TS = 256, WORLD = TS * 2 ** Z;
const mx = (lng) => ((lng + 180) / 360) * WORLD;
const my = (lat) => { const s = Math.sin((lat * Math.PI) / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD; };
const X0 = mx(BOUNDS.lngMin), Y0 = my(BOUNDS.latMax);
const K = Math.min((W - 40) / (mx(BOUNDS.lngMax) - X0), (H - 40) / (my(BOUNDS.latMin) - Y0));
const OX = (W - (mx(BOUNDS.lngMax) - X0) * K) / 2, OY = (H - (my(BOUNDS.latMin) - Y0) * K) / 2;
const px = (f) => ({ x: OX + (mx(f.lng) - X0) * K, y: OY + (my(f.lat) - Y0) * K });
const TILES = [];
for (let tx = Math.floor((X0 - OX / K) / TS); tx <= Math.floor((X0 + (W - OX) / K) / TS); tx++)
  for (let ty = Math.floor((Y0 - OY / K) / TS); ty <= Math.floor((Y0 + (H - OY) / K) / TS); ty++)
    TILES.push({ tx, ty, x: OX + (tx * TS - X0) * K, y: OY + (ty * TS - Y0) * K });
const FILL = { critical: "var(--critical)", low: "var(--warning)", ok: "var(--success)", surplus: "var(--primary)", "low-volume": "var(--text-muted)" };
const short = (name) => name.replace(" Blood Bank", "").replace(/, .*/, "").replace("Hospital", "Hosp.");

function NetworkMap({ model, group, comp, focus, selected, onSelect, route }) {
  const { t } = useLang();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t("Blood bank network map")} style={{ maxHeight: 470 }}>
      {TILES.map((tl) => <image key={`${tl.tx}-${tl.ty}`} href={`https://tile.openstreetmap.org/${Z}/${tl.tx}/${tl.ty}.png`} x={tl.x} y={tl.y} width={TS * K + 0.5} height={TS * K + 0.5} opacity="0.75" />)}
      <text x={W - 6} y={H - 6} fontSize="8" textAnchor="end" fill="var(--text-muted)">© OpenStreetMap contributors</text>
      {route && (() => {
        const a = px(facById[route.from]), b = px(facById[route.to]);
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth="2.5" strokeDasharray={route.mode === "air" ? "3 5" : "0"} markerEnd="url(#arrow)" />;
      })()}
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" /></marker></defs>
      {FACILITIES.map((f) => {
        const a = analyseCell(model, cellKey(f.id, group, comp));
        const p = px(f);
        const dim = focus && !focus(f);
        const r = 5 + Math.min(14, Math.sqrt(a.available) * 1.6);
        return (
          <g key={f.id} className="clickable" onClick={() => onSelect(f.id)} opacity={dim ? 0.25 : 1}>
            <circle cx={p.x} cy={p.y} r={r} fill={FILL[a.status]} opacity="0.85" stroke={selected === f.id ? "var(--ink)" : "var(--surface)"} strokeWidth={selected === f.id ? 3 : 2} />
            <text x={p.x + r + 3} y={p.y + 3} fontSize="10" fill="#222" stroke="#fff" strokeWidth="3" paintOrder="stroke">{short(f.name)} · {a.available}</text>
            <title>{`${f.name}\n${group} ${compById[comp].name}: ${a.available} available (min ${a.minLevel}, max ${a.maxLevel})\n${t(a.status)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function SupplyChainPanels({ user, params = {}, setView, toast }) {
  const { t } = useLang();
  const model = useModel();
  const scope = scopeOf(user);
  const where = whereOf(scope);
  const [state, setState] = useState(scope.level === "state" || scope.level === "district" ? scope.state : "all");
  const [district, setDistrict] = useState(scope.district || "all");
  const [group, setGroup] = useState(params.group && params.group !== "all" ? params.group : "O-");
  const [comp, setComp] = useState(params.comp && params.comp !== "all" ? params.comp : "PRBC");
  const [selected, setSelected] = useState(params.facId || scope.facId || "LA-LEH-SNM");
  const [dest, setDest] = useState(params.facId || scope.facId || "LA-LEH-SNM");
  const [qty, setQty] = useState(4);
  const [pickedSource, setPickedSource] = useState(null);
  const [mapRoute, setMapRoute] = useState(null);
  const [prio, setPrio] = useState("all");
  const sourcesRef = useRef(null);

  const focus = (f) => (state === "all" || f.state === state) && (district === "all" || f.district === district);
  const sel = analyseCell(model, cellKey(selected, group, comp));
  const selFac = facById[selected];

  const sources = useMemo(() => findSources(model, { group, comp, qty: Number(qty) || 1, destFacId: dest, requiredBy: AS_OF + 6 * 3600000 }), [model, group, comp, qty, dest]);
  const picked = pickedSource ? sources.rows.find((r) => r.fac.id === pickedSource.fac && r.group === pickedSource.group) : null;

  // a blood bank / district sees recommendations that touch its jurisdiction
  const recs = useMemo(() => recommendTransfers(model).filter((r) => where(facById[r.to]) || where(facById[r.from])), [model]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownRecs = recs.filter((r) => (prio === "all" || r.priority === prio) && (focus(facById[r.to]) || focus(facById[r.from])));

  function draftFromSource() {
    const n = Math.min(Number(qty) || 1, picked.releasable);
    const tr = createTransfer({ from: picked.fac.id, to: dest, group: picked.group, comp, qty: n, mode: picked.route.best.mode, reason: `Source identification for ${facById[dest].name}` }, user);
    toast(t("Draft {id} created — submit it for approval in Transfer Management.", { id: tr.id }));
  }

  const destOptions = FACILITIES.filter((f) => scope.level === "all" || where(f)).map((f) => [f.id, f.name]);

  return (
    <>
      <div className="panel">
        <div className="filters">
          {scope.level === "all" && <Select label="State/UT" value={state} onChange={(v) => { setState(v); setDistrict("all"); }} options={OPT.states} allLabel="All States/UTs" />}
          {scope.level !== "facility" && scope.level !== "district" && <Select label="District" value={district} onChange={setDistrict} options={OPT.districts(state)} allLabel="All districts" />}
          <Select label="Blood group" value={group} onChange={setGroup} options={OPT.groups} />
          <Select label="Component" value={comp} onChange={setComp} options={OPT.comps} />
        </div>
        <p className="hint" style={{ marginTop: 8, fontSize: 11.5 }}>{t("Releasable stock is shown network-wide for coordination.")}</p>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>{t("Blood bank network — {g} {c}", { g: group, c: compById[comp].name })}</h3><span className="hint">{t("Geographic positions · size = available units · click a facility")}</span></div>
          <div className="map-wrap"><NetworkMap model={model} group={group} comp={comp} focus={focus} selected={selected} onSelect={setSelected} route={mapRoute} /></div>
          <div className="legend">
            {Object.entries({ critical: "Critical / shortage", low: "Low", ok: "Healthy", surplus: "Surplus", "low-volume": "Low volume" }).map(([k, l]) => <span key={k}><i className="dotlg" style={{ background: FILL[k] }} /> {t(l)}</span>)}
            <span>— {t("road")} ┄ {t("air")}</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{selFac.name}</h3><StatusPill status={sel.status} /></div>
          <div className="grid cols-2">
            <div className="kpi"><div className="num">{sel.available}</div><div className="lbl">{t("Available {g} {c}", { g: group, c: comp })}</div></div>
            <div className="kpi"><div className="num">{sel.minLevel}–{sel.maxLevel}</div><div className="lbl">{t("Recommended min–max")}</div></div>
            <div className="kpi"><div className="num">{Number.isFinite(sel.daysCover) ? sel.daysCover.toFixed(1) : "—"}</div><div className="lbl">{t("Days of cover")}</div></div>
            <div className="kpi"><div className="num">{sel.releasable}</div><div className="lbl">{t("Releasable without creating a shortage")}</div></div>
          </div>
          <p className="hint" style={{ margin: "10px 0", fontSize: 12 }}>
            {districtById[selFac.district].name}, {t(STATES.find((s) => s.id === selFac.state).name)} · {t("inventory updated {n} h ago", { n: selFac.lastUpdateH })}
            {selFac.lastUpdateH > model.config.delayedUpdateHours && <span className="pill warn" style={{ marginLeft: 6 }}>{t("Delayed update")}</span>}
          </p>
          <h4 style={{ fontSize: 12.5, marginBottom: 6 }}>{t("Nearby facilities")}</h4>
          <div className="table-wrap"><table className="data">
            <tbody>{nearbyFacilities(selected).map(({ fac, km }) => {
              const a = analyseCell(model, cellKey(fac.id, group, comp));
              const r = routeOptions(fac, selFac, comp);
              return <tr key={fac.id} className="clickable" onClick={() => setSelected(fac.id)}><td>{fac.name}</td><td>{km} km</td><td>{a.available}</td><td>{r.best ? `${r.best.mode} ~${fmtH(r.best.hours)}` : <span className="pill bad">{t("no route")}</span>}</td></tr>;
            })}</tbody>
          </table></div>
          <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => { setDest(selected); setPickedSource(null); setMapRoute(null); sourcesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{t("Find supporting sources for this facility")}</button>
        </div>
      </div>

      <div className="panel" ref={sourcesRef}>
        <div className="panel-head">
          <h3>{t("Intelligent source identification")}</h3>
          <span className="hint">{t("Ranks sources by route feasibility, releasable stock and travel time")}</span>
        </div>
        <div className="filters" style={{ marginBottom: 12 }}>
          <Select label="Facility reporting shortage" value={dest} onChange={(v) => { setDest(v); setPickedSource(null); }} options={destOptions} />
          <label className="fsel"><span>{t("Quantity (units)")}</span><input type="number" min="1" max="200" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <span className="badge neutral">{model.config.includeCompatible ? t("Compatible groups enabled by medical officer: {g}", { g: sources.groupsConsidered.join(", ") }) : t("Exact group match only (clinical compatibility rules off)")}</span>
        </div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>{t("Source")}</th><th>{t("Group")}</th><th>{t("Available")}</th><th>{t("Releasable")}</th><th>{t("Shortest shelf life left")}</th><th>{t("Best route")}</th><th>{t("ETA")}</th><th>{t("Transfer permission")}</th><th /></tr></thead>
          <tbody>
            {sources.rows.slice(0, 10).map((r) => {
              const oldest = model.byKey.get(cellKey(r.fac.id, r.group, comp)).units.find((u) => u.status === "Available");
              const isPicked = picked && picked.fac.id === r.fac.id && picked.group === r.group;
              return (
                <tr key={r.fac.id + r.group} className={`clickable${isPicked ? " sel" : ""}`} onClick={() => { setPickedSource({ fac: r.fac.id, group: r.group }); if (r.route.best) setMapRoute({ from: r.fac.id, to: dest, mode: r.route.best.mode }); }}>
                  <td>{r.fac.name} {r === sources.top && <span className="badge success">{t("Best match")}</span>}</td>
                  <td>{r.group}{!r.exact && " *"}</td><td>{r.a.available}</td>
                  <td>{r.releasable >= Number(qty) ? <span className="pill ok">{r.releasable}</span> : <span className="pill warn">{r.releasable}</span>}</td>
                  <td>{oldest ? `${daysLeft(oldest).toFixed(1)} d` : "—"}</td>
                  <td>{r.route.best ? (r.route.best.mode === "air" ? `${t("Air")} ${r.route.best.airLeg}` : t("Road")) : <span className="pill bad">{t("not feasible")}</span>}</td>
                  <td>{r.route.best ? fmtH(r.route.best.hours) : "—"}</td>
                  <td>{r.permitted ? (r.route.interState ? <span className="pill warn">{t("inter-state")}</span> : <span className="pill ok">{t("allowed")}</span>) : <span className="pill bad">{t("not permitted")}</span>}</td>
                  <td>{t("compare →")}</td>
                </tr>
              );
            })}
            {sources.rows.length === 0 && <tr><td colSpan={9}><Empty>{t("No facility holds this group and component.")}</Empty></td></tr>}
          </tbody>
        </table></div>
        {sources.alternatives.length > 0 && <ul style={{ fontSize: 12.3, color: "var(--text-muted)", marginTop: 10 }}>{sources.alternatives.map((a, i) => <li key={i}>{a}</li>)}</ul>}
        <p className="hint" style={{ fontSize: 11.3, marginTop: 6 }}>{t("Clinical compatibility and transfusion decisions remain with authorised medical professionals.")}</p>
      </div>

      {picked && (
        <div className="panel">
          <div className="panel-head"><h3>{t("Route optimisation: {a} → {b}", { a: picked.fac.name, b: facById[dest].name })}</h3><span className="hint">{t("Cold chain")}: {picked.route.coldChain}</span></div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>{t("Mode")}</th><th>{t("Distance")}</th><th>{t("Est. duration")}</th><th>{t("Feasible")}</th><th>{t("Restrictions & notes")}</th></tr></thead>
            <tbody>{picked.route.options.map((o) => (
              <tr key={o.mode} style={o === picked.route.best ? { background: "var(--success-soft)" } : undefined}>
                <td>{o.mode === "air" ? `${t("Air")} ${o.airLeg}` : t("Road")}</td><td>{o.km} km{o.mode === "air" ? ` ${t("(road legs)")}` : ""}</td><td>{fmtH(o.hours)}</td>
                <td>{o.feasible ? <span className="pill ok">{t("yes")}</span> : <span className="pill bad">{t("no")}</span>}</td>
                <td className="hint">{o.notes.join("; ") || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            {picked.route.best && picked.permitted && picked.releasable > 0 && can(user, "transfer.create") ? (
              <button className="btn primary sm" onClick={draftFromSource}>{t("Create transfer draft ({n} units)", { n: Math.min(Number(qty) || 1, picked.releasable) })}</button>
            ) : <span className="hint">{!transferPermitted(model.config, picked.fac, facById[dest]) ? t("Regional transfer permission is off for this pair.") : picked.releasable <= 0 ? t("Source has no releasable stock.") : t("Your role cannot create transfers.")}</span>}
            <span className="hint" style={{ fontSize: 11.3 }}>{t("Estimated times; confirm with transport before dispatch.")}</span>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>{t("AI redistribution engine")}</h3>
          <Tabs value={prio} onChange={setPrio} tabs={[["all", `All (${recs.length})`], ["Immediate", "Immediate"], ["High", "High"], ["Medium", "Medium"]]} />
        </div>
        <p className="hint" style={{ marginBottom: 12, fontSize: 12 }}>{t("Proposals only. Sources are never taken below their minimum; every transfer needs human approval.")}</p>
        <div className="grid cols-2">
          {shownRecs.slice(0, 12).map((r) => (
            <div key={r.id} onMouseEnter={() => setMapRoute({ from: r.from, to: r.to, mode: r.route.best.mode })}>
              <RecCard rec={r} user={user} toast={toast} setView={setView} />
            </div>
          ))}
        </div>
        {shownRecs.length === 0 && <Empty>{t("No redistribution opportunities for this filter.")}</Empty>}
        <Provenance period="Next 7 days" />
      </div>
    </>
  );
}
