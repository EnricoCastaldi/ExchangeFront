// src/helpers/Sidebar.jsx
import React, { useEffect, useState } from "react";
import {
  Users,
  Sprout,
  Building2,
  ShoppingCart,
  Coins,
  LogOut,
  UserCog,
  ArrowLeftRight,
  PanelLeft,
  PanelRight,
  SlidersHorizontal,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import { useI18n } from "./i18n";

/** Flat menu registry (for reuse inside groups) */
const MENU_REGISTRY = {
  EXCHANGE: { key: "EXCHANGE", icon: ArrowLeftRight, to: "/app/exchange" },
  CUSTOMERS: { key: "CUSTOMERS", icon: Users, to: "/app/customers" },
  VENDORS: { key: "VENDORS", icon: Building2, to: "/app/vendors" },
  USERS: { key: "USERS", icon: UserCog, to: "/app/users" },
  ITEM: { key: "ITEM", icon: Sprout, to: "/app/items" },
  PARAMETERS: { key: "PARAMETERS", icon: SlidersHorizontal, to: "/app/parameters" },
  BUY: { key: "BUY", icon: ShoppingCart, to: "/app/buy" },
  SELL: { key: "SELL", icon: Coins, to: "/app/sell" },
};

/** Grouping logic (order matters) */
const GROUPS = [
  {
    key: "CORE",
    titleKey: "CORE",
    items: ["EXCHANGE"],
  },
  {
    key: "DATA",
    titleKey: "DATA",
    items: ["CUSTOMERS", "VENDORS", "ITEM", "PARAMETERS"],
  },
  {
    key: "TRADING",
    titleKey: "TRADING",
    items: ["BUY", "SELL"],
  },
  {
    key: "ADMIN",
    titleKey: "ADMIN",
    items: ["USERS"],
  },
];

export default function Sidebar({ onLogout }) {
  const { t } = useI18n();

  // Desktop collapsed state (persisted in localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);
  const toggleDesktop = () => setCollapsed((c) => !c);

  // Provide localized section titles with fallbacks
  const sectionTitle = (key) =>
    t?.sidebarSections?.[key] ??
    ({
      CORE: "Core",
      DATA: "Data",
      TRADING: "Trading",
      ADMIN: "Admin",
    }[key] || key);

  // Render one group (header + links)
  const Group = ({ group, compact = false }) => {
    const items = group.items.map((id) => MENU_REGISTRY[id]).filter(Boolean);
    if (!items.length) return null;

    return (
      <div>
        {/* Header (only when expanded) */}
        {!compact && (
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
            {sectionTitle(group.key)}
          </div>
        )}
        {/* small separator for compact mode */}
        {compact && <div className="mx-2 my-2 h-px bg-white/10" aria-hidden />}

        {/* Links */}
        <nav className="space-y-1">
          {items.map(({ key, icon: Icon, to }) => {
            const label = t.menu?.[key] ?? key; // safe fallback
            return (
              <NavLink
                key={key}
                to={to}
                className={({ isActive }) =>
                  [
                    "group relative w-full flex items-center gap-3 px-3 py-3 rounded-md transition",
                    "text-[15px] font-semibold",
                    isActive ? "bg-white/20" : "hover:bg-white/10",
                    compact ? "justify-center" : "justify-start",
                  ].join(" ")
                }
                title={compact ? label : undefined}
              >
                <Icon size={20} className="shrink-0" />
                {!compact && <span className="truncate">{label}</span>}
                {compact && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <aside
      className={[
        // prevent horizontal overflow and position tooltips safely
        "bg-red-700 text-white h-full flex flex-col border-r border-white/10",
        "transition-[width] duration-200 ease-in-out",
        "overflow-x-hidden relative",
        collapsed ? "w-16" : "w-56",
      ].join(" ")}
      aria-label="Sidebar"
      aria-expanded={!collapsed}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-3 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center overflow-hidden">
            <img src={logo} alt="logo" className="h-8 w-auto object-contain drop-shadow-sm" />
          </div>
        )}
        <button
          onClick={toggleDesktop}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-700 shadow hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30"
          title={collapsed ? (t?.a11y?.expand || "Expand sidebar") : (t?.a11y?.collapse || "Collapse sidebar")}
          aria-label={collapsed ? (t?.a11y?.expand || "Expand sidebar") : (t?.a11y?.collapse || "Collapse sidebar")}
        >
          {collapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      {/* Groups: vertical scroll container (no horizontal overflow) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 no-scrollbar">
        {GROUPS.map((g) => (
          <Group key={g.key} group={g} compact={collapsed} />
        ))}
      </div>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={onLogout}
          className={[
            "w-full flex items-center gap-2 rounded-md text-sm font-semibold transition",
            collapsed ? "justify-center px-2 py-2 hover:bg-white/10" : "px-3 py-2 bg-white/10 hover:bg-white/20",
          ].join(" ")}
          title={collapsed ? (t.navbar.logout || "Log out") : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>{t.navbar.logout}</span>}
        </button>
      </div>
    </aside>
  );
}
