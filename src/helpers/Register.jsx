// src/helpers/Register.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import background from "../assets/sfondo.jpeg";

const T = {
  pl: {
    brand: "Exchange Platform",
    regTitle: "Rejestracja",
    regSubtitle: "Podaj email, telefon i hasło",
    fields: {
      email: "Email *",
      confirmEmail: "Potwierdź email *",
      phone: "Telefon *",
      password: "Hasło *",
      confirmPassword: "Potwierdź hasło *",
    },
    submit: "Utwórz konto",
    cancel: "Wróć do logowania",
    success: "Konto utworzone. Możesz się zalogować.",
    errors: {
      required:
        "Wymagane pola: Email, Potwierdź email, Telefon, Hasło, Potwierdź hasło",
      email: "Nieprawidłowy adres email",
      emailsMatch: "Adresy email muszą się zgadzać",
      passLen: "Hasło musi mieć co najmniej 6 znaków",
      passMatch: "Hasła muszą się zgadzać",
    },
  },
  en: {
    brand: "Exchange Platform",
    regTitle: "Register",
    regSubtitle: "Provide email, phone and password",
    fields: {
      email: "Email *",
      confirmEmail: "Confirm email *",
      phone: "Phone *",
      password: "Password *",
      confirmPassword: "Confirm password *",
    },
    submit: "Create account",
    cancel: "Back to sign in",
    success: "Account created. You can sign in now.",
    errors: {
      required:
        "Required fields: Email, Confirm email, Phone, Password, Confirm password",
      email: "Invalid email address",
      emailsMatch: "Emails must match",
      passLen: "Password must be at least 6 characters",
      passMatch: "Passwords must match",
    },
  },
};

export default function Register({ onCancel, onSuccess }) {
  const navigate = useNavigate();

  const [lang, setLang] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    return saved === "en" || saved === "pl" ? saved : "pl";
  });
  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);
  const t = useMemo(() => T[lang], [lang]);
  const F = t.fields;

  const [userEmail, setUserEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notice, setNotice] = useState(null); // {type:'success'|'error', text:string}

  const validate = () => {
    if (
      !userEmail.trim() ||
      !confirmEmail.trim() ||
      !userPhone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setNotice({ type: "error", text: t.errors.required });
      return false;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail);
    if (!emailOk) {
      setNotice({ type: "error", text: t.errors.email });
      return false;
    }
    if (userEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setNotice({ type: "error", text: t.errors.emailsMatch });
      return false;
    }
    if (password.length < 6) {
      setNotice({ type: "error", text: t.errors.passLen });
      return false;
    }
    if (password !== confirmPassword) {
      setNotice({ type: "error", text: t.errors.passMatch });
      return false;
    }
    return true;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // FRONT-END ONLY (no POST yet)
    const payload = {
      userEmail: userEmail.trim().toLowerCase(),
      userPhone: userPhone.trim(),
      password,
    };
    console.log("[REGISTER FRONT-ONLY] →", payload);

    setNotice({ type: "success", text: t.success });

    setTimeout(() => {
      if (typeof onSuccess === "function") onSuccess();
      else navigate("/");
    }, 800);
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") onCancel();
    else navigate("/");
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
            onClick={() => setLang((prev) => (prev === "pl" ? "en" : "pl"))}
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
            <p className="text-white mt-2 text-lg font-semibold">{t.regTitle}</p>
            <p className="text-white/90 text-sm">{t.regSubtitle}</p>
          </div>

          {/* Notice */}
          {notice && <Notice type={notice.type}>{notice.text}</Notice>}

          {/* Form */}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={F.email} icon={Mail}>
              <input
                type="email"
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label={F.confirmEmail} icon={Mail}>
              <input
                type="email"
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label={F.phone} icon={Phone}>
              <input
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="+48 600 000 000"
                required
              />
            </Field>

            <Field label={F.password} icon={Lock}>
              <input
                type="password"
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <Field label={F.confirmPassword} icon={Lock}>
              <input
                type="password"
                className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-white py-2.5 font-semibold hover:bg-white/15 transition"
              >
                <ArrowLeft size={16} />
                {t.cancel}
              </button>

              <button
                type="submit"
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white font-semibold py-2.5 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30 transition"
              >
                <UserPlus size={16} />
                {t.submit}
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
