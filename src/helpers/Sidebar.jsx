// src/helpers/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  MapPin,
  Calculator,
  Truck,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  Settings as SettingsIcon, 
  BookUser,
  FileText,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useI18n } from "./i18n";

/** Flat menu registry */
const MENU_REGISTRY = {
  EXCHANGE: { key: "EXCHANGE", icon: ArrowLeftRight, to: "/app/exchange" },
  SUGGESTED_PRICE: { key: "SUGGESTED_PRICE", icon: Calculator, to: "/app/suggested-price" },
  CONTACTS: { key: "CONTACTS", icon: BookUser, to: "/app/contacts" },
  BUYERS: { key: "BUYERS", icon: Users, to: "/app/buyers" },
  VENDORS: { key: "VENDORS", icon: Building2, to: "/app/vendors" },
  USERS: { key: "USERS", icon: UserCog, to: "/app/users" },

  ITEM: { key: "ITEM", icon: Sprout, to: "/app/items" },
  LOCATIONS: { key: "LOCATIONS", icon: MapPin, to: "/app/locations" },
    TRANSPORTS: { key: "TRANSPORTS", icon: Truck, to: "/app/transports" },

  // Transports submenu
  TRANSPORTS_MAIN: {
    key: "TRANSPORTS_MAIN",
    icon: Truck,
    to: "/app/transports",
    parent: "TRANSPORTS",
  },
  DEFAULT_TRANSPORTS: {
    key: "DEFAULT_TRANSPORTS",
    icon: BadgeCheck,
    to: "/app/default-transports",
    parent: "TRANSPORTS",
  },

  // NEW: Transport Units submenu item (Środek transportu)
  TRANSPORT_UNITS: {
    key: "TRANSPORT_UNITS",
    icon: Truck,
    to: "/app/transport-units",
    parent: "TRANSPORTS",
  },

  // NEW: Drivers submenu item
  DRIVERS: {
    key: "DRIVERS",
    icon: Users,
    to: "/app/drivers",
    parent: "TRANSPORTS",
  },

  // NEW: Speditors submenu item
  SPEDITORS: {
    key: "SPEDITORS",
    icon: Truck,
    to: "/app/speditors",
    parent: "TRANSPORTS",
  },


  // Items submenu
  ITEM_MAIN: { key: "ITEM_MAIN", icon: Sprout, to: "/app/items", parent: "ITEM" },
  DEFAULT_ITEM_PARAMETERS: {
    key: "DEFAULT_ITEM_PARAMETERS",
    icon: BadgeCheck,
    to: "/app/default-item-parameters",
    parent: "ITEM",
  },

  // Locations submenu
  LOCATIONS_MAIN: {
    key: "LOCATIONS_MAIN",
    icon: MapPin,
    to: "/app/locations",
    parent: "LOCATIONS",
  },
  DEFAULT_LOCATIONS: {
    key: "DEFAULT_LOCATIONS",
    icon: BadgeCheck,
    to: "/app/default-locations",
    parent: "LOCATIONS",
  },

  // Transports submenu
  TRANSPORTS_MAIN: {
    key: "TRANSPORTS_MAIN",
    icon: Truck,
    to: "/app/transports",
    parent: "TRANSPORTS",
  },
  DEFAULT_TRANSPORTS: {
    key: "DEFAULT_TRANSPORTS",
    icon: BadgeCheck,
    to: "/app/default-transports",
    parent: "TRANSPORTS",
  },

  PARAMETERS: { key: "PARAMETERS", icon: SlidersHorizontal, to: "/app/parameters" },
  SALES_AGREEMENTS: { key: "SALES_AGREEMENTS", icon: FileText, to: "/app/agreements" },
  PURCHASE_AGREEMENTS: { key: "PURCHASE_AGREEMENTS", icon: FileText, to: "/app/purchase-agreements" },

  SETTINGS: { key: "SETTINGS", icon: SettingsIcon, to: "/app/settings" },
  // BUY
  BUY: { key: "BUY", icon: ShoppingCart, to: "/app/buy" },
  BUY_MAIN: { key: "BUY_MAIN", icon: ShoppingCart, to: "/app/buy", parent: "BUY" },
  PURCHASE_LINE_PARAMETERS: {
    key: "PURCHASE_LINE_PARAMETERS",
    icon: SlidersHorizontal,
    to: "/app/purchase-line-parameters",
    parent: "BUY",
  },
  PURCHASE_OFFER_LINES: {
    key: "PURCHASE_OFFER_LINES",
    icon: FileText,
    to: "/app/purchase-offer-lines",
    parent: "BUY",
  },
    PURCHASE_OFFER_LINE_BLOCKS: {
    key: "PURCHASE_OFFER_LINE_BLOCKS",
    icon: FileText,
    to: "/app/purchase-offer-lines-blocks",
    parent: "BUY",
  },

  // SELL
  SELL: { key: "SELL", icon: Coins, to: "/app/sell" },
  SELL_MAIN: { key: "SELL_MAIN", icon: Coins, to: "/app/sell", parent: "SELL" },
  SALES_OFFER_LINES: {
    key: "SALES_OFFER_LINES",
    icon: FileText,
    to: "/app/sales-offer-lines",
    parent: "SELL",
  },
  SALES_LINE_PARAMETERS: {
    key: "SALES_LINE_PARAMETERS",
    icon: SlidersHorizontal,
    to: "/app/sales-line-parameters",
    parent: "SELL",
  },
   SALES_OFFER_LINE_BLOCKS: {
   key: "SALES_OFFER_LINE_BLOCKS",
   icon: FileText,
   to: "/app/sales-offer-lines-blocks",
   parent: "SELL",
 },
  
};

/** Grouping order */
const GROUPS = [
  { key: "CORE", titleKey: "CORE", items: ["EXCHANGE", "SUGGESTED_PRICE"] },
  {
    key: "DATA",
    titleKey: "DATA",
    items: [
      "CONTACTS",
      "BUYERS",
      "VENDORS",

      "ITEM",
      "ITEM_MAIN",
      "DEFAULT_ITEM_PARAMETERS",

      "LOCATIONS",
      "LOCATIONS_MAIN",
      "DEFAULT_LOCATIONS",

      "TRANSPORTS",
      "TRANSPORTS_MAIN",
      "DEFAULT_TRANSPORTS",
      "TRANSPORT_UNITS",
      "DRIVERS",
      "SPEDITORS",

      "PARAMETERS",
    ],
  },
  {
    key: "TRADING",
    titleKey: "TRADING",
    items: [
      "SALES_AGREEMENTS",
      "PURCHASE_AGREEMENTS",
      "BUY",
      "BUY_MAIN",
      "PURCHASE_OFFER_LINES",
      "PURCHASE_LINE_PARAMETERS",
      "PURCHASE_OFFER_LINE_BLOCKS",

      "SELL",
      "SELL_MAIN",
      "SALES_OFFER_LINES",
      "SALES_LINE_PARAMETERS",
      "SALES_OFFER_LINE_BLOCKS",
    ],
  },
  
    { key: "ADMIN", titleKey: "ADMIN", items: ["USERS", "SETTINGS"] },

];

export default function Sidebar({ onLogout }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Compact sizing (centralized)
  const SIZES = {
    parentText: "text-sm font-medium",
    childText: "text-xs font-medium",
    sectionText: "text-[10px] font-semibold",
    parentPy: "py-2.5",
    childPy: "py-2",
    parentIcon: 18,
    childIcon: 16,
    chevron: 14,
  };

  // Collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
    // default false
  });
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);
  const toggleDesktop = () => setCollapsed((c) => !c);

  // Open submenus
  const [openMenus, setOpenMenus] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sidebarOpenMenus") || "{}");
      return typeof saved === "object" && saved ? saved : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("sidebarOpenMenus", JSON.stringify(openMenus));
  }, [openMenus]);

  // Section titles with fallbacks
  const sectionTitle = (key) =>
    t?.sidebarSections?.[key] ??
    ({ CORE: "Core", DATA: "Data", TRADING: "Trading", ADMIN: "Admin" }[key] || key);

  // Label helper
  const labelize = (k) => {
    if (k.endsWith("_MAIN")) {
      const parent = MENU_REGISTRY[k]?.parent;
      return String(t.menu?.[parent] ?? parent ?? k).replace(/_/g, " ");
    }
    return String(t.menu?.[k] ?? k).replace(/_/g, " ");
  };

  // Build hierarchy
  const groupEntries = useMemo(() => {
    return GROUPS.map((g) => {
      const all = (g.items || []).map((id) => MENU_REGISTRY[id]).filter(Boolean);
      const parents = all.filter((m) => !m.parent);
      const childrenByParent = all
        .filter((m) => m.parent)
        .reduce((acc, m) => {
          const p = m.parent;
          (acc[p] = acc[p] || []).push(m);
          return acc;
        }, {});
      return { ...g, parents, childrenByParent };
    });
  }, []);

  // Exclusive toggle
  const toggleExclusive = (key) =>
    setOpenMenus((prev) => (prev[key] ? {} : { [key]: true }));

  const openOnly = (key) =>
    setOpenMenus((prev) => (prev[key] ? prev : { [key]: true }));

  const closeAll = () => setOpenMenus({});

  // Keep relevant submenu open based on URL
  useEffect(() => {
    const child = Object.values(MENU_REGISTRY).find(
      (m) => m?.parent && location.pathname.startsWith(m.to)
    );
    if (child?.parent) {
      setOpenMenus((prev) => (prev[child.parent] ? prev : { [child.parent]: true }));
      return;
    }
    const parent = Object.values(MENU_REGISTRY).find(
      (m) => m && !m.parent && location.pathname.startsWith(m.to)
    );
    if (parent?.key) {
      setOpenMenus((prev) => (prev[parent.key] ? prev : { [parent.key]: true }));
      return;
    }
    setOpenMenus({});
  }, [location.pathname]);

  const Group = ({ group, compact = false }) => {
    const parents = group?.parents ?? [];
    const childrenByParent = group?.childrenByParent ?? {};
    if (!parents.length && !Object.keys(childrenByParent).length) return null;

    return (
      <div>
        {!compact && (
          <div
            className={`px-3 pt-3 pb-1 ${SIZES.sectionText} uppercase tracking-wide text-white/80`}
          >
            {sectionTitle(group.key)}
          </div>
        )}
        {compact && <div className="mx-2 my-2 h-px bg-white/10" aria-hidden />}

        <nav className="space-y-1">
          {parents.map(({ key, icon: Icon, to }) => {
            const kids = childrenByParent[key] || [];
            const hasChildren = kids.length > 0;
            const isOpen = !!openMenus[key];
            const parentLabel = labelize(key);

            if (hasChildren) {
              return (
                <div key={key}>
                  <div
                    className={[
                      "group relative w-full flex items-center gap-3 px-3 rounded-md transition",
                      SIZES.parentText,
                      SIZES.parentPy,
                      "hover:bg-white/10",
                      "cursor-pointer",
                      compact ? "justify-center" : "justify-start",
                    ].join(" ")}
                    onClick={() => {
  // Toggle this parent exclusively: if open -> close all, if closed -> open this one
  toggleExclusive(key);
}}
                    title={compact ? parentLabel : undefined}
                    aria-expanded={isOpen}
                  >
                    <Icon size={SIZES.parentIcon} className="shrink-0" />
                    {!compact && (
                      <>
                        <span className="truncate">{parentLabel}</span>
                        <span className="ml-auto opacity-80">
                          {isOpen ? (
                            <ChevronDown size={SIZES.chevron} />
                          ) : (
                            <ChevronRight size={SIZES.chevron} />
                          )}
                        </span>
                      </>
                    )}
                    {compact && (
                      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        {parentLabel}
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-1 space-y-1">
                      {kids.map(({ key: ckey, icon: CIcon, to: cto }) => {
                        const childLabel = labelize(ckey);
                        const parentKey = MENU_REGISTRY[ckey]?.parent;
                        return (
                          <NavLink
                            key={ckey}
                            to={cto}
                            className={({ isActive }) =>
                              [
                                "group relative w-full flex items-center gap-3 px-3 rounded-md transition",
                                SIZES.childText,
                                SIZES.childPy,
                                compact ? "justify-center" : "ml-6",
                                isActive ? "bg-white/20" : "hover:bg-white/10",
                              ].join(" ")
                            }
                            title={childLabel}
                            onClick={() => openOnly(parentKey)}
                          >
                            <CIcon size={SIZES.childIcon} className="shrink-0" />
                            {!compact && <span className="truncate">{childLabel}</span>}
                            {compact && (
                              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {childLabel}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Parent without children
            return (
              <NavLink
                key={key}
                to={to}
                className={({ isActive }) =>
                  [
                    "group relative w-full flex items-center gap-3 px-3 rounded-md transition",
                    SIZES.parentText,
                    SIZES.parentPy,
                    isActive ? "bg-white/20" : "hover:bg-white/10",
                    compact ? "justify-center" : "justify-start",
                  ].join(" ")
                }
                title={compact ? parentLabel : undefined}
                onClick={closeAll}
              >
                <Icon size={SIZES.parentIcon} className="shrink-0" />
                {!compact && <span className="truncate">{parentLabel}</span>}
                {compact && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {parentLabel}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  };

  // Single root wrapper (aside)
  return (
    <aside
      className={[
        "bg-red-700 text-white h-full flex flex-col border-r border-white/10",
        "transition-[width] duration-200 ease-in-out",
        "overflow-x-hidden relative",
        collapsed ? "w-16" : "w-56",
      ].join(" ")}
      aria-label="Sidebar"
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
          aria-expanded={!collapsed}
          aria-controls="sidebar-sections"
        >
          {collapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      {/* Groups */}
      <div id="sidebar-sections" className="flex-1 overflow-y-auto overflow-x-hidden py-2 no-scrollbar">
        {(groupEntries || []).map((g) => (
          <Group key={g.key} group={g} compact={collapsed} />
        ))}
      </div>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={onLogout}
          className={[
            "w-full flex items-center gap-2 rounded-md transition",
            collapsed
              ? "justify-center px-2 py-2 hover:bg-white/10 text-xs font-medium"
              : "px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium",
          ].join(" ")}
          title={collapsed ? (t.navbar?.logout || "Log out") : undefined}
        >
          <LogOut size={collapsed ? 16 : 18} />
          {!collapsed && <span>{t.navbar?.logout || "Log out"}</span>}
        </button>
      </div>
    </aside>
  );
}
