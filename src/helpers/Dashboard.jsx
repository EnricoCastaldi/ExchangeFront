// src/helpers/Dashboard.jsx
import { useMemo, useState } from "react";
import {
  Menu,
  ArrowLeftRight,
  Users as UsersIcon,
  Sprout,
  Building2,
  ShoppingCart,
  Coins,
  Shield,
  Check,
} from "lucide-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Customers from "../pages/Customers";
import Items from "../pages/Items";
import Parameters from "../pages/Parameters";
import Vendors from "../pages/Vendors";
import Buy from "../pages/Buy";
import Sell from "../pages/Sell";
import Exchange from "../pages/Exchange";
import UsersPage from "../pages/Users";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./i18n";

const HEADER_ICONS = {
  EXCHANGE: ArrowLeftRight,
  CUSTOMERS: UsersIcon,
  ITEM: Sprout,
  VENDORS: Building2,
  BUY: ShoppingCart,
  SELL: Coins,
  USERS: UsersIcon,
};

const PATH_TO_KEY = {
  "/app/exchange": "EXCHANGE",
  "/app/customers": "CUSTOMERS",
  "/app/users": "USERS",
  "/app/items": "ITEM",
  "/app/vendors": "VENDORS",
  "/app/buy": "BUY",
  "/app/sell": "SELL",
};

function useActiveKey() {
  const { pathname } = useLocation();
  const match = Object.keys(PATH_TO_KEY).find((p) => pathname.startsWith(p));
  return match ? PATH_TO_KEY[match] : "EXCHANGE";
}

// read the session saved by Login.jsx
function useSession() {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem("session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
}

export default function Dashboard({ onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const active = useActiveKey();
  const Icon = HEADER_ICONS[active] || ArrowLeftRight;

  const session = useSession();
  const email = session?.email || "";
  const role = (session?.permission || "viewer").toLowerCase();

  const [copied, setCopied] = useState(false);

  const initials = useMemo(() => {
    const base = (email.split("@")[0] || "").replace(/[^a-zA-Z0-9]/g, "");
    return (base.slice(0, 2) || "U").toUpperCase();
  }, [email]);

  // modern soft colors per role (no borders)
  const roleChipClasses =
    {
      admin: "bg-amber-500/15 text-amber-800",
      manager: "bg-sky-500/15 text-sky-800",
      trader: "bg-emerald-600/15 text-emerald-800",
      viewer: "bg-slate-500/15 text-slate-800",
    }[role] || "bg-slate-500/15 text-slate-800";

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar onLogout={onLogout} />
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 bottom-0 transform transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } w-72`}
        >
          <Sidebar onLogout={onLogout} />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-slate-500" />
              <h1 className="text-lg font-semibold tracking-wide">
                {t.menu[active]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Modern user chip — ONE ROW, left of flags, no borders */}
            <div
              className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100/70 backdrop-blur px-3 py-1.5 max-w-[420px] shadow-sm hover:shadow transition"
              title={email || undefined}
            >
              {/* avatar */}
              <div className="grid place-items-center h-7 w-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[11px] font-bold shrink-0">
                {initials}
              </div>

              {/* email (mono) */}
              <button
                type="button"
                onClick={copyEmail}
                className="group min-w-0"
                title={email ? "Copy email" : undefined}
              >
                  <span className="font-mono text-xs text-slate-800/90 truncate max-w-[180px] md:max-w-[240px] group-hover:opacity-90 transition">
                    {email || "—"}
                  </span>
              </button>

       

              {/* role chip */}
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${roleChipClasses} whitespace-nowrap`}
              >
                <Shield size={12} />
                {role}
              </span>

              {/* tiny “copied” tick that fades in/out */}
              <span
                className={`inline-flex items-center gap-1 text-[11px] text-emerald-700 transition-opacity ${
                  copied ? "opacity-100" : "opacity-0"
                }`}
              >
                <Check size={12} />
                Copied
              </span>

              {/* (optional) online dot for presence vibe */}
              <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500/80 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
            </div>

            {/* Language flags on the RIGHT of the user chip */}
            <LanguageSwitcher />
          </div>
        </header>

        <main className="p-4 overflow-auto">
          <Routes>
            <Route index element={<Navigate to="exchange" replace />} />
            <Route path="exchange" element={<Exchange />} />
            <Route path="customers" element={<Customers />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="items" element={<Items />} />
            <Route path="parameters" element={<Parameters />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="buy" element={<Buy />} />
            <Route path="sell" element={<Sell />} />
            <Route path="*" element={<Navigate to="exchange" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
