// src/helpers/ResetPassword.jsx
import { useEffect, useMemo, useState } from "react";
import { Globe, Mail, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import logo from "../assets/logo.png";
import background from "../assets/sfondo.jpeg";

const T = {
  pl: {
    brand: "Exchange Platform",
    title: "Reset hasła",
    subtitle: "Podaj adres email, aby otrzymać link resetujący",
    fields: { email: "Email *" },
    actions: { sendLink: "Wyślij link resetujący", back: "Wróć do logowania" },
    success: { request: "Jeśli konto istnieje, wysłaliśmy link resetujący." },
    errors: { emailReq: "Podaj poprawny adres email" },
  },
  en: {
    brand: "Exchange Platform",
    title: "Password reset",
    subtitle: "Enter your email to receive a reset link",
    fields: { email: "Email *" },
    actions: { sendLink: "Send reset link", back: "Back to sign in" },
    success: { request: "If the account exists, we’ve sent a reset link." },
    errors: { emailReq: "Please enter a valid email address" },
  },
};

export default function ResetPassword({ onCancel, onSuccess }) {
  // language
  const [lang, setLang] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    return saved === "en" || saved === "pl" ? saved : "pl";
  });
  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);
  const t = useMemo(() => T[lang], [lang]);

  // form
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState(null); // {type:'success'|'error', text:string}

  const validate = () => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) { setNotice({ type: "error", text: t.errors.emailReq }); return false; }
    return true;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // FRONT-END ONLY
    console.log("[RESET REQUEST FRONT-ONLY] →", { email: email.trim() });
    setNotice({ type: "success", text: t.success.request });

    // Optionally navigate back after a moment
    setTimeout(() => onSuccess?.(), 900);
  };

  return (
    <div
      lang={lang}
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="w-full max-w-md">
        <div className="relative rounded-2xl border border-white/30 bg-red-700/90 p-8 shadow-2xl backdrop-blur-sm">
          {/* Language switch */}
          <button
            type="button"
            onClick={() => setLang((p) => (p === "pl" ? "en" : "pl"))}
            className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20 transition"
            aria-label="Switch language"
            title="Switch language / Zmień język"
          >
            <Globe size={16} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Logo + Title */}
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="logo" className="h-24 w-24 object-contain drop-shadow" />
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {t.brand}
            </h1>
            <p className="text-white mt-2 text-lg font-semibold">{t.title}</p>
            <p className="text-white/90 text-sm">{t.subtitle}</p>
          </div>

          {/* Notice */}
          {notice && <Notice type={notice.type}>{notice.text}</Notice>}

          {/* Form */}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={t.fields.email} icon={Mail}>
              <input
                type="email"
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onCancel?.()}
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-white py-2.5 font-semibold hover:bg-white/15 transition"
              >
                <ArrowLeft size={16} />
                {t.actions.back}
              </button>
              <button
                type="submit"
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white font-semibold py-2.5 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30 transition"
              >
                <Mail size={16} />
                {t.actions.sendLink}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* UI bits */
function Field({ label, icon: Icon, children }) {
  return (
    <label className="text-sm text-white block">
      <div className="mb-1">{label}</div>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600">
            <Icon size={18} />
          </span>
        )}
        {children}
      </div>
    </label>
  );
}

function Notice({ type = "success", children }) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}
