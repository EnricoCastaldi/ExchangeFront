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
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import background from "../assets/sfondo.jpeg";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

const T = {
  pl: {
    brand: "Exchange Platform",
    loginLabel: "Login",
    loginPlaceholder: "Wpisz login (e-mail)",
    passwordLabel: "Hasło",
    passwordPlaceholder: "Wpisz hasło",
    signIn: "Zaloguj się",
    forgot: "Zapomniałeś hasła?",
    register: "Załóż nowe konto",
    errorInvalid: "Nieprawidłowe dane logowania",
    successLogin: "Zalogowano pomyślnie. Wybierz metodę weryfikacji.",
    otpTitle: "Weryfikacja dwuetapowa",
    otpSubtitle: "Wybierz metodę weryfikacji, aby kontynuować",
    otpEmail: "Weryfikacja e-mail (OTP)",
    otpSms: "Weryfikacja SMS (OTP)",
  },
  en: {
    brand: "Exchange Platform",
    loginLabel: "Login",
    loginPlaceholder: "Enter login (email)",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    signIn: "Sign in",
    forgot: "Forgot password?",
    register: "Register new account",
    errorInvalid: "Invalid credentials",
    successLogin: "Login successful. Choose a verification method.",
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
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("login"); // 'login' | 'otp'
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [lang, setLang] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    return saved === "en" || saved === "pl" ? saved : "pl";
  });
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = useMemo(() => T[lang], [lang]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const r = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: login, password, method: "none" }),
        credentials: "include",
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("invalid");

      if (data?.token) setSessionToken(data.token);
      if (data?.user) setSessionUser(data.user);

      setSuccess(t.successLogin);
      setStep("otp");
    } catch (_err) {
      setError(t.errorInvalid);
    } finally {
      setLoading(false);
    }
  }

  const LinkBtn = ({ icon: Icon, children, title, to, onClick }) => {
    const cls =
      "inline-flex items-center gap-2 font-medium underline underline-offset-2 hover:no-underline text-[#E7EEE7] hover:text-[#0E0F0E]";
    return to ? (
      <Link to={to} title={title} className={cls}>
        <Icon size={16} />
        <span>{children}</span>
      </Link>
    ) : (
      <button type="button" onClick={onClick} title={title} className={cls}>
        <Icon size={16} />
        <span>{children}</span>
      </button>
    );
  };

  const goToApp = () => {
    if (!sessionToken) return;

    const session = {
      email: sessionUser?.userEmail || login,
      permission: sessionUser?.permissionLevel || "viewer",
      job: sessionUser?.jobTitle ?? null,
      token: sessionToken,
    };

    try {
      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("token", sessionToken);
    } catch {}

    onSuccess(sessionToken);
  };

  return (
    <div
      lang={lang}
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="w-full max-w-md">
        <div
          className="
            relative rounded-2xl border border-white/20
            bg-[#007A3A]/90 p-8 shadow-2xl backdrop-blur-sm
          "
        >
          {/* Language switch */}
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === "pl" ? "en" : "pl"))}
            className="
              absolute top-4 right-4 inline-flex items-center gap-2 rounded-full
              border border-white/25 bg-white/10 px-3 py-1.5 text-xs
              text-[#E7EEE7] hover:bg-white/15 transition
              focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/40
            "
            aria-label="Switch language"
            title="Switch language / Zmień język"
          >
            <Globe size={16} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Logo + Title */}
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="logo" className="h-28 w-28 object-contain drop-shadow" />
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {T[lang].brand}
            </h1>
            <div className="mt-2 h-1 w-24 rounded-full bg-[#00C86F]" />
          </div>

          {step === "login" ? (
            <form onSubmit={submit} className="mt-8 space-y-4">
              {/* Login */}
              <div>
                <label className="block text-sm text-[#0E0F0E]/90 mb-1">{t.loginLabel}</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder={t.loginPlaceholder}
                  className="
                    w-full rounded-xl border border-white/20
                    bg-[#E7EEE7] text-[#0E0F0E] placeholder:text-[#0E0F0E]/45
                    px-4 py-3
                    focus:outline-none focus:ring-2 focus:ring-[#00C86F]
                  "
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-[#0E0F0E]/90 mb-1">{t.passwordLabel}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="
                      w-full rounded-xl border border-white/20
                      bg-[#E7EEE7] text-[#0E0F0E] placeholder:text-[#0E0F0E]/45
                      px-4 py-3 pr-12
                      focus:outline-none focus:ring-2 focus:ring-[#00C86F]
                    "
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="
                      absolute inset-y-0 right-3 my-auto
                      text-[#007A3A] hover:text-[#00572A] transition
                      focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/40 rounded-md
                    "
                    aria-label={show ? "Hide password" : "Show password"}
                    title={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Success / Error banners */}
              {success && (
                <div
                  className="
                    flex items-start gap-3 rounded-xl
                    border border-[#74E8A0]/60 bg-[#74E8A0]/15
                    text-[#0E0F0E] px-4 py-3 text-sm
                  "
                >
                  <CheckCircle2 className="mt-0.5 text-[#9AFF6C]" size={18} />
                  <span>{success}</span>
                </div>
              )}
              {error && (
                <div
                  className="
                    flex items-start gap-3 rounded-xl
                    border border-[#E8C26A]/70 bg-[#E8C26A]/15
                    text-[#0E0F0E] px-4 py-3 text-sm
                  "
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 text-[#E8C26A]" size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  relative w-full overflow-hidden rounded-2xl
                  bg-[#00C86F] text-[#0E0F0E]
                  shadow-lg font-semibold py-3 transition
                  hover:bg-[#32D57E] active:scale-[0.99]
                  focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/50
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    {t.signIn}
                  </span>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      style={{ animation: "sheen 2s infinite" }}
                    />
                    {t.signIn}
                  </>
                )}
              </button>

              {/* Links */}
              <div className="flex items-center justify-between text-sm">
                <LinkBtn icon={KeyRound} title={t.forgot} to="/forgot">
                  {t.forgot}
                </LinkBtn>
                <LinkBtn icon={UserPlus} title={t.register} to="/register">
                  {t.register}
                </LinkBtn>
              </div>
            </form>
          ) : (
            // OTP choice step
            <div className="mt-8 space-y-6">
              <div className="text-center text-[#0E0F0E]">
                <h2 className="text-2xl font-bold">{t.otpTitle}</h2>
                <p className="text-[#0E0F0E]/85 mt-1 text-sm">{t.otpSubtitle}</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={goToApp}
                  className="
                    w-full inline-flex items-center justify-center gap-2 rounded-xl
                    bg-white/10 border border-white/25 text-[#0E0F0E] py-3 font-semibold
                    hover:bg-white/15
                    focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/40 transition
                  "
                >
                  <MailCheck size={18} className="text-[#9AFF6C]" />
                  {t.otpEmail}
                </button>

                <button
                  type="button"
                  onClick={goToApp}
                  className="
                    w-full inline-flex items-center justify-center gap-2 rounded-xl
                    bg-white/10 border border-white/25 text-[#0E0F0E] py-3 font-semibold
                    hover:bg-white/15
                    focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/40 transition
                  "
                >
                  <MessageSquare size={18} className="text-[#9AFF6C]" />
                  {t.otpSms}
                </button>

                {/* subtle warm note */}
                <div className="text-center text-xs text-[#0E0F0E]/75">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#E8C26A]" />
                    Secure access with ARVILY theme
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
