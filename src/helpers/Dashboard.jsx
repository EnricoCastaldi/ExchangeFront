// Dashboard.jsx
import { useState } from "react";
import { Menu, ArrowLeftRight, Users, Sprout, Building2, ShoppingCart, Coins } from "lucide-react";
import Sidebar from "./Sidebar";
import Customers from "../pages/Customers";
import Items from "../pages/Items";
import Vendors from "../pages/Vendors";
import Buy from "../pages/Buy";
import Sell from "../pages/Sell";
import Exchange from "../pages/Exchange";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./i18n";

const HEADER_ICONS = {
  EXCHANGE: ArrowLeftRight,
  CUSTOMERS: Users,
  ITEM: Sprout,
  VENDORS: Building2,
  BUY: ShoppingCart,
  SELL: Coins,
};

export default function Dashboard({ onLogout }) {
  const [active, setActive] = useState("CUSTOMERS");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const Icon = HEADER_ICONS[active] || ArrowLeftRight;

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar active={active} onSelect={setActive} onLogout={onLogout} />
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
          <Sidebar
            active={active}
            onSelect={(key) => {
              setActive(key);
              setMobileOpen(false);
            }}
            onLogout={onLogout}
          />
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
            {/* Removed the demo text */}
            <LanguageSwitcher />
          </div>
        </header>

        <main className="p-4 overflow-auto">
          <SectionContent active={active} />
        </main>
      </div>
    </div>
  );
}

function SectionContent({ active }) {
  if (active === "EXCHANGE") return <Exchange />;
  if (active === "CUSTOMERS") return <Customers />;
  if (active === "ITEM") return <Items />;
  if (active === "VENDORS") return <Vendors />;
  if (active === "BUY") return <Buy />;
  if (active === "SELL") return <Sell />;

  return null;
}
