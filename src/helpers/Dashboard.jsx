// src/helpers/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import {
  Menu,
  ArrowLeftRight,
  Users as UsersIcon,
  Sprout,
  Building2,
  ShoppingCart,
  Coins,
  Shield,
  Truck,
  MapPin,
  Mail,
  Bell,
  FileText,
  Settings as SettingsIcon,
  SlidersHorizontal,
  BadgeCheck,
} from "lucide-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Customers from "../pages/Customers";
import Items from "../pages/Items";
import Parameters from "../pages/Parameters";
import Vendors from "../pages/Vendors";
import Contacts from "../pages/Contacts";
import Buy from "../pages/Buy";
import Sell from "../pages/Sell";
import Exchange from "../pages/Exchange";
import UsersPage from "../pages/Users";
import LanguageSwitcher from "./LanguageSwitcher";
import Locations from "../pages/Locations";
import Transports from "../pages/Transports";
import DefaultTransports from "../pages/DefaultTransports";

import DefaultLocations from "../pages/DefaultLocations";
import DefaultItemParameters from "../pages/DefaultItemParameters";
import SalesLineParameters from "../pages/SalesLineParameters";
import SalesOfferLines from "../pages/SalesOfferLines";
import PurchaseLineParameters from "../pages/PurchaseLineParameters";
import PurchaseOfferLines from "../pages/PurchaseOfferLines";
import Agreements from "../pages/Agreements";
import { useI18n } from "./i18n";
import Settings from "../pages/Settings";
import TransportUnits from "../pages/TransportUnits";
import Drivers from "../pages/Drivers";
import Speditors from "../pages/Speditors";
import PurchaseOfferLinesBlocks from "../pages/PurchaseOfferLinesBlocks";
import SalesOfferLinesBlocks from "../pages/SalesOfferLinesBlocks";

// Helper: title-case fallback labels and strip underscores
const toTitle = (s) =>
  s
    .toLocaleLowerCase()
    .replace(/(^|[\s_-])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase());

const labelize = (t, key) => {
  const raw = t?.menu?.[key];
  if (raw) return raw; // ← trust your i18n text
  return toTitle(String(key).replace(/_/g, " "));
};

const HEADER_ICONS = {
  EXCHANGE: ArrowLeftRight,
  CONTACTS: UsersIcon,
  BUYERS: UsersIcon,
  ITEM: Sprout,
  VENDORS: Building2,
  AGREEMENTS: FileText,
  BUY: ShoppingCart,
  PURCHASE_LINE_PARAMETERS: SlidersHorizontal,
  PURCHASE_OFFER_LINES: FileText,
  SELL: Coins,
  SALES_OFFER_LINES: FileText,
  USERS: UsersIcon,
  SETTINGS: SettingsIcon,
  LOCATIONS: MapPin,
  DEFAULT_ITEM_PARAMETERS: BadgeCheck,
  TRANSPORTS: Truck,
  TRANSPORT_UNITS: Truck,
  DRIVERS: UsersIcon,
  SPEDITORS: Truck,
  PARAMETERS: SlidersHorizontal,
  DEFAULT_TRANSPORTS: BadgeCheck,
  DEFAULT_LOCATIONS: BadgeCheck,
  SALES_LINE_PARAMETERS: SlidersHorizontal,
  PURCHASE_OFFER_LINE_BLOCKS: FileText,
  SALES_OFFER_LINE_BLOCKS: FileText,
};

const PATH_TO_KEY = {
  "/app/exchange": "EXCHANGE",
  "/app/contacts": "CONTACTS",
  "/app/buyers": "BUYERS",
  "/app/users": "USERS",
  "/app/settings": "SETTINGS",
  "/app/items": "ITEM",
  "/app/default-item": "DEFAULT_ITEM_PARAMETERS",
  "/app/vendors": "VENDORS",
  "/app/agreements": "AGREEMENTS",
  "/app/buy": "BUY",
  "/app/purchase-line-parameters": "PURCHASE_LINE_PARAMETERS",
  "/app/purchase-offer-lines-blocks": "PURCHASE_OFFER_LINE_BLOCKS",
  "/app/purchase-offer-lines": "PURCHASE_OFFER_LINES",
  "/app/sell": "SELL",
  "/app/sales-offer-lines": "SALES_OFFER_LINES",
  "/app/sales-offer-lines-blocks": "SALES_OFFER_LINE_BLOCKS",
  "/app/locations": "LOCATIONS",
  "/app/transports": "TRANSPORTS",
  "/app/transport-units": "TRANSPORT_UNITS",
  "/app/drivers": "DRIVERS",
  "/app/speditors": "SPEDITORS",
  "/app/parameters": "PARAMETERS",
  "/app/default-transports": "DEFAULT_TRANSPORTS",
  "/app/default-locations": "DEFAULT_LOCATIONS",
  "/app/sales-line-parameters": "SALES_LINE_PARAMETERS",
};

function useActiveKey() {
  const { pathname } = useLocation();

  const match = Object.keys(PATH_TO_KEY)
    .sort((a, b) => b.length - a.length) // more specific (longer) paths first
    .find((p) => pathname.startsWith(p));

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

  const roleChipClasses =
    {
      admin: "bg-amber-500/15 text-amber-800",
      manager: "bg-sky-500/15 text-sky-800",
      trader: "bg-emerald-600/15 text-emerald-800",
      viewer: "bg-slate-500/15 text-slate-800",
    }[role] || "bg-slate-500/15 text-slate-800";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
                {labelize(t, active)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100/70 backdrop-blur px-3 py-1.5 max-w-[520px] shadow-sm hover:shadow transition">
              <div className="grid place-items-center h-7 w-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[11px] font-bold shrink-0">
                {initials}
              </div>
              <span
                className={`inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-full ${roleChipClasses} whitespace-nowrap`}
              >
                <Shield size={12} />
                {role}
                <span className="font-mono font-bold text-slate-700 ml-1">
                  {now.toLocaleDateString()} {now.toLocaleTimeString()}
                </span>
              </span>
              <Mail
                size={16}
                className="text-slate-600 cursor-pointer hover:text-slate-800 transition"
                onClick={copyEmail}
                title={copied ? "Copied!" : "Copy email"}
              />
              <Bell
                size={16}
                className="text-slate-600 cursor-pointer hover:text-slate-800 transition"
              />
              <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500/80 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="p-4 overflow-auto">
          <Routes>
            <Route index element={<Navigate to="exchange" replace />} />
            <Route path="exchange" element={<Exchange />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="buyers" element={<Customers />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="items" element={<Items />} />
            <Route
              path="default-item-parameters"
              element={<DefaultItemParameters />}
            />
            <Route path="locations" element={<Locations />} />
            <Route path="parameters" element={<Parameters />} />
            <Route path="transports" element={<Transports />} />
            <Route path="default-transports" element={<DefaultTransports />} />
            <Route path="transport-units" element={<TransportUnits />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="speditors" element={<Speditors />} />
            <Route path="default-locations" element={<DefaultLocations />} />
            <Route path="agreements" element={<Agreements />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="buy" element={<Buy />} />
            <Route
              path="purchase-line-parameters"
              element={<PurchaseLineParameters />}
            />
            <Route
              path="purchase-offer-lines"
              element={<PurchaseOfferLines />}
            />
            <Route
              path="purchase-offer-lines"
              element={<PurchaseOfferLines />}
            />

            <Route
              path="purchase-offer-lines"
              element={<PurchaseOfferLines />}
            />
            <Route
              path="purchase-offer-lines-blocks"
              element={<PurchaseOfferLinesBlocks />}
            />

            <Route path="sell" element={<Sell />} />
            <Route path="sales-offer-lines" element={<SalesOfferLines />} />
            <Route
              path="sales-line-parameters"
              element={<SalesLineParameters />}
            />
              <Route
             path="sales-offer-lines-blocks"
             element={<SalesOfferLinesBlocks />}
           />
            <Route path="*" element={<Navigate to="exchange" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
