import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dict } from "./translations.js";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "hi", label: "हिन्दी" },
];

const LANG_KEY = "bloodlink_lang";
const LangContext = createContext({ lang: "en", setLang: () => {}, t: (s) => s });
const warned = new Set();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* private mode: language just won't persist */
    }
  }, [lang]);

  // English text is the key; a missing translation falls back to English.
  const t = useCallback(
    (s, vars) => {
      let out = s;
      if (lang !== "en") {
        out = dict[s]?.[lang];
        if (!out) {
          if (import.meta.env.DEV && !warned.has(s)) {
            warned.add(s);
            console.warn(`[i18n] missing "${lang}" translation:`, s);
          }
          out = s;
        }
      }
      return vars ? out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : out;
    },
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function LangSwitcher() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="lang-pills lang-switcher" role="group" aria-label={t("Language")}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={lang === l.code}
          className={`lang-pill${lang === l.code ? " active" : ""}`}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
