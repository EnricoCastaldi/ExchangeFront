// LanguageSwitcher.jsx
import "flag-icons/css/flag-icons.min.css";
import { useI18n } from "./i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  const btnBase =
    "p-1.5 rounded-full border inline-flex items-center justify-center transition";
  const active = "bg-slate-100 border-green-500 ring-2 ring-green-500";
  const idle = "bg-white border-slate-200 hover:bg-slate-50";

  return (
    <div className="flex items-center gap-2">
      {/* Polish */}
      <button
        type="button"
        onClick={() => setLang("pl")}
        className={`${btnBase} ${lang === "pl" ? active : idle}`}
        title="Polski"
      >
        <span className="fi fi-pl rounded-full w-6 h-6" />
      </button>

      {/* English (GB) */}
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`${btnBase} ${lang === "en" ? active : idle}`}
        title="English"
      >
        <span className="fi fi-gb rounded-full w-6 h-6" />
      </button>
    </div>
  );
}
