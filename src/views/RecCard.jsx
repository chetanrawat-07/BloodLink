import { facById, compById } from "../networkData.js";
import { can } from "../access.js";
import { createTransfer, useStore } from "../store.js";
import { useLang } from "../i18n.jsx";
import { fmtH, pct, units } from "../ui.jsx";

// Advisory recommendation. The button only creates a Draft; a human submits it and an authorised approver decides.
export default function RecCard({ rec, user, toast, setView }) {
  const { t } = useLang();
  const existing = useStore((s) => s.transfers.find((x) => x.recId === rec.id && !["Closed", "Rejected", "Cancelled"].includes(x.status)));
  const from = facById[rec.from], to = facById[rec.to];
  const prio = { Immediate: "bad", High: "warn", Medium: "neutral" }[rec.priority];
  const r = rec.route.best;

  function draft() {
    const tr = createTransfer({ from: rec.from, to: rec.to, group: rec.group, comp: rec.comp, qty: rec.qty, mode: r.mode, recId: rec.id, reason: rec.problem, aiRationale: rec.why }, user);
    toast(t("Draft {id} created — submit it for approval in Transfer Management.", { id: tr.id }));
  }

  return (
    <div className="rec-card">
      <div className="rec-head">
        <span className={`pill ${prio}`}>{t(rec.priority)}</span>
        <strong>{rec.group} {compById[rec.comp].name} · {to.name}</strong>
      </div>
      <div className="rec-line">
        {t("Move {q} from {a}", { q: units(rec.qty), a: from.name })} · {t(r.mode === "air" ? "Air" : "Road")}{r.airLeg ? ` ${r.airLeg}` : ""} · ~{fmtH(r.hours)}
      </div>
      <div className="rec-meta">
        {rec.shortageProb != null && <span>{t("Shortage risk")} {pct(rec.shortageProb)}</span>}
        <span>{t("Approver")}: {rec.approval}</span>
      </div>
      <details>
        <summary>{t("Why")}</summary>
        <ul>{rec.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        <p>{rec.benefit}</p>
        <p>{t("Cold chain")}: {rec.route.coldChain}</p>
      </details>
      <div className="row-actions">
        {existing ? (
          <button className="btn sm" onClick={() => setView("transfers", { id: existing.id })}>{t("Open {id}", { id: existing.id })} · {t(existing.status)}</button>
        ) : can(user, "transfer.create") ? (
          <button className="btn primary sm" onClick={draft}>{t("Create draft")}</button>
        ) : null}
      </div>
    </div>
  );
}
