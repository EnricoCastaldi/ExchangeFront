// src/helpers/Sidebar.jsx
import {
  Users,
  Sprout,
  Building2,
  ShoppingCart,
  Coins,
  LogOut,
  UserCog,
  ArrowLeftRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import { useI18n } from "./i18n";

const MENU = [
  { key: "EXCHANGE", icon: ArrowLeftRight, to: "/app/exchange" },
  { key: "CUSTOMERS", icon: Users, to: "/app/customers" },
    { key: "VENDORS", icon: Building2, to: "/app/vendors" },
  { key: "USERS", icon: UserCog, to: "/app/users" },
  { key: "ITEM", icon: Sprout, to: "/app/items" },
  { key: "BUY", icon: ShoppingCart, to: "/app/buy" },
  { key: "SELL", icon: Coins, to: "/app/sell" },
];

export default function Sidebar({ onLogout }) {
  const { t } = useI18n();

  return (
    <aside className="bg-red-700 text-white h-full w-56 flex flex-col border-r border-white/10">
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-white/10">
        <img
          src={logo}
          alt="logo"
          className="h-14 md:h-[72px] w-auto object-contain drop-shadow-sm"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 py-2 space-y-1">
        {MENU.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold tracking-wide rounded-md transition ${
                isActive ? "bg-white/20" : "hover:bg-white/10"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{t.menu[key]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
        >
          <LogOut size={18} />
          <span>{t.navbar.logout}</span>
        </button>
      </div>
    </aside>
  );
}
