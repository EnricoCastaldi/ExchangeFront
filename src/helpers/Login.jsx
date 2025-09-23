// Login.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  UserPlus,
  MailCheck,
  MessageSquare,
} from "lucide-react";
import logo from "../assets/logo.png";
import background from "../assets/sfondo.jpeg";

const T = {
  pl: {
    brand: "Exchange Platform",
    loginLabel: "Login",
    loginPlaceholder: "Wpisz login",
    passwordLabel: "Hasło",
    passwordPlaceholder: "Wpisz hasło",
    signIn: "Zaloguj się",
    forgot: "Zapomniałeś hasła?",
    register: "Załóż nowe konto",
    errorInvalid: "Nieprawidłowe dane (podpowiedź: 123 / 123)",
    otpTitle: "Weryfikacja dwuetapowa",
    otpSubtitle: "Wybierz metodę weryfikacji, aby kontynuować",
    otpEmail: "Weryfikacja e-mail (OTP)",
    otpSms: "Weryfikacja SMS (OTP)",
  },
  en: {
    brand: "Exchange Platform",
    loginLabel: "Login",
    loginPlaceholder: "Enter login",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    signIn: "Sign in",
    forgot: "Forgot password?",
    register: "Register new account",
    errorInvalid: "Invalid credentials (hint: 123 / 123)",
    otpTitle: "Two-step verification",
    otpSubtitle: "Choose a verification method to continue",
    otpEmail: "Email verification (OTP)",
    otpSms: "SMS verification (OTP)",
  },
};

export default function Login({ onSuccess }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  // step: 'login' | 'otp'
  const [step, setStep] = useState("login");

  // Language: default PL, persist
  const [lang, setLang] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    return saved === "en" || saved === "pl" ? saved : "pl";
  });
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = useMemo(() => T[lang], [lang]);

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (login === "123" && password === "123") {
      // proceed to the OTP choice screen first
      setStep("otp");
    } else {
      setError(t.errorInvalid);
    }
  };

  const LinkBtn = ({ icon: Icon, children, onClick, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-2 font-medium underline underline-offset-2 hover:no-underline"
    >
      <Icon size={16} />
      <span>{children}</span>
    </button>
  );

  const goToApp = () => onSuccess("demo-token-123");

  return (
    <div
      lang={lang}
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="w-full max-w-md">
        <div className="relative rounded-2xl border border-white/30 bg-red-700/90 p-8 shadow-2xl backdrop-blur-sm">
          {/* Language switch - top-right corner */}
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
              {T[lang].brand}
            </h1>
          </div>

          {step === "login" ? (
            <form onSubmit={submit} className="mt-8 space-y-4">
              {/* Login */}
              <div>
                <label className="block text-sm text-white mb-1">{t.loginLabel}</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder={t.loginPlaceholder}
                  className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-white mb-1">{t.passwordLabel}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full rounded-xl border border-red-300/70 bg-white text-red-700 placeholder:text-red-400 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute inset-y-0 right-3 my-auto text-red-600 hover:text-red-800 transition"
                    aria-label={show ? "Hide password" : "Show password"}
                    title={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl border border-white/40 bg-white/20 text-white px-4 py-3 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="relative w-full overflow-hidden rounded-2xl bg-white/10 border border-white/30 backdrop-blur-md shadow-lg text-white font-semibold py-3 transition hover:bg-white/15 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-white/40"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ animation: "sheen 2s infinite" }}
                />
                {t.signIn}
              </button>

              {/* Secondary links with icons */}
              <div className="flex items-center justify-between text-sm text-white/90">
                <LinkBtn icon={KeyRound} title={t.forgot} onClick={() => {}}>
                  {t.forgot}
                </LinkBtn>
                <LinkBtn icon={UserPlus} title={t.register} onClick={() => {}}>
                  {t.register}
                </LinkBtn>
              </div>
            </form>
          ) : (
            // OTP choice step
            <div className="mt-8 space-y-6">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold">{t.otpTitle}</h2>
                <p className="text-white/90 mt-1 text-sm">{t.otpSubtitle}</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={goToApp}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white py-3 font-semibold hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30 transition"
                >
                  <MailCheck size={18} />
                  {t.otpEmail}
                </button>

                <button
                  type="button"
                  onClick={goToApp}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/30 text-white py-3 font-semibold hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30 transition"
                >
                  <MessageSquare size={18} />
                  {t.otpSms}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tiny CSS for the sheen animation */}
      <style>
        {`
          @keyframes sheen {
            0% { transform: translateX(-100%); }
            60% { transform: translateX(200%); }
            100% { transform: translateX(200%); }
          }
        `}
      </style>
    </div>
  );
}
