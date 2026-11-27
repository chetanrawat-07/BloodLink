import { useMemo, useState } from "react";
import { useLang } from "../i18n.jsx";
import { useModel } from "../store.js";
import { scopeOf, whereOf } from "../access.js";
import { generateInsights } from "../engine.js";
import { KindTag, Tabs, Provenance, Empty } from "../ui.jsx";

export default function Insights({ user, setView }) {
  const { t } = useLang();
  const model = useModel();
  const where = whereOf(scopeOf(user));
  const all = useMemo(() => generateInsights(model, where), [model]); // eslint-disable-line react-hooks/exhaustive-deps
  const [kind, setKind] = useState("all");
  const shown = all.filter((i) => kind === "all" || i.kind === kind);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{t("AI insights")}</h3>
        <Tabs value={kind} onChange={setKind} tabs={[["all", `All (${all.length})`], ["prediction", "Predictions"], ["fact", "Recorded"]]} />
      </div>
      <p className="hint" style={{ fontSize: 12, marginBottom: 12 }}>{t("Predictions are model outputs and can be wrong. Recorded items are counts from the data.")}</p>
      <div className="timeline">
        {shown.map((i, k) => (
          <div className="t-row" key={k}>
            <div className="t-dot" style={{ background: i.sev === "critical" ? "var(--critical)" : i.sev === "warning" ? "var(--warning)" : "var(--primary)" }} />
            <div className="t-body" style={{ flex: 1 }}>
              <div className="t-title"><KindTag kind={i.kind} /> {i.text}</div>
              <div className="t-meta">{i.detail}</div>
              <div className="t-meta">{t("Period")}: {t(i.period)}</div>
            </div>
            {i.link && <button className="btn sm ghost" onClick={() => setView(i.link.view, i.link.params)}>{t("Investigate →")}</button>}
          </div>
        ))}
      </div>
      {shown.length === 0 && <Empty>{t("No insights for your jurisdiction right now.")}</Empty>}
      <Provenance />
    </div>
  );
}
