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
import { NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { useI18n } from "./i18n";

/** Flat menu registry */
const MENU_REGISTRY = {
  EXCHANGE: { key: "EXCHANGE", icon: ArrowLeftRight, to: "/app/exchange" },
  MATCHED_RECORDS: { key: "MATCHED_RECORDS", icon: FileText, to: "/app/matched-records" },
  SUGGESTED_PRICE: { key: "SUGGESTED_PRICE", icon: Calculator, to: "/app/suggested-price" },

  CONTACTS: { key: "CONTACTS", icon: BookUser, to: "/app/contacts" },
  BUYERS: { key: "BUYERS", icon: Users, to: "/app/buyers" },
  VENDORS: { key: "VENDORS", icon: Building2, to: "/app/vendors" },
  USERS: { key: "USERS", icon: UserCog, to: "/app/users" },

  ITEM: { key: "ITEM", icon: Sprout, to: "/app/items" },
  ITEM_MAIN: { key: "ITEM_MAIN", icon: Sprout, to: "/app/items", parent: "ITEM" },
  DEFAULT_ITEM_PARAMETERS: {
    key: "DEFAULT_ITEM_PARAMETERS",
    icon: BadgeCheck,
    to: "/app/default-item-parameters",
    parent: "ITEM",
  },

  LOCATIONS: { key: "LOCATIONS", icon: MapPin, to: "/app/locations" },
  LOCATIONS_MAIN: { key: "LOCATIONS_MAIN", icon: MapPin, to: "/app/locations", parent: "LOCATIONS" },
  DEFAULT_LOCATIONS: {
    key: "DEFAULT_LOCATIONS",
    icon: BadgeCheck,
    to: "/app/default-locations",
    parent: "LOCATIONS",
  },

  TRANSPORTS: { key: "TRANSPORTS", icon: Truck, to: "/app/transports" },
  TRANSPORTS_MAIN: { key: "TRANSPORTS_MAIN", icon: Truck, to: "/app/transports", parent: "TRANSPORTS" },
  DEFAULT_TRANSPORTS: {
    key: "DEFAULT_TRANSPORTS",
    icon: BadgeCheck,
    to: "/app/default-transports",
    parent: "TRANSPORTS",
  },
  TRANSPORT_UNITS: { key: "TRANSPORT_UNITS", icon: Truck, to: "/app/transport-units", parent: "TRANSPORTS" },
  DRIVERS: { key: "DRIVERS", icon: Users, to: "/app/drivers", parent: "TRANSPORTS" },
  SPEDITORS: { key: "SPEDITORS", icon: Truck, to: "/app/speditors", parent: "TRANSPORTS" },

  PARAMETERS: { key: "PARAMETERS", icon: SlidersHorizontal, to: "/app/parameters" },

  SALES_AGREEMENTS: { key: "SALES_AGREEMENTS", icon: FileText, to: "/app/agreements" },
  PURCHASE_AGREEMENTS: { key: "PURCHASE_AGREEMENTS", icon: FileText, to: "/app/purchase-agreements" },

  SETTINGS: { key: "SETTINGS", icon: SettingsIcon, to: "/app/settings" },

  BUY: { key: "BUY", icon: ShoppingCart, to: "/app/buy" },
  BUY_MAIN: { key: "BUY_MAIN", icon: ShoppingCart, to: "/app/buy", parent: "BUY" },
  PURCHASE_LINE_PARAMETERS: {
    key: "PURCHASE_LINE_PARAMETERS",
    icon: SlidersHorizontal,
    to: "/app/purchase-line-parameters",
    parent: "BUY",
  },
  PURCHASE_OFFER_LINES: { key: "PURCHASE_OFFER_LINES", icon: FileText, to: "/app/purchase-offer-lines", parent: "BUY" },
  PURCHASE_OFFER_LINE_BLOCKS: {
    key: "PURCHASE_OFFER_LINE_BLOCKS",
    icon: FileText,
    to: "/app/purchase-offer-lines-blocks",
    parent: "BUY",
  },

  SELL: { key: "SELL", icon: Coins, to: "/app/sell" },
  SELL_MAIN: { key: "SELL_MAIN", icon: Coins, to: "/app/sell", parent: "SELL" },
  SALES_OFFER_LINES: { key: "SALES_OFFER_LINES", icon: FileText, to: "/app/sales-offer-lines", parent: "SELL" },
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
  { key: "CORE", titleKey: "CORE", items: ["EXCHANGE", "MATCHED_RECORDS", "SUGGESTED_PRICE"] },
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

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => localStorage.setItem("sidebarCollapsed", String(collapsed)), [collapsed]);
  const toggleDesktop = () => setCollapsed((c) => !c);

  const [openMenus, setOpenMenus] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sidebarOpenMenus") || "{}");
      return typeof saved === "object" && saved ? saved : {};
    } catch {
      return {};
    }
  });
  useEffect(() => localStorage.setItem("sidebarOpenMenus", JSON.stringify(openMenus)), [openMenus]);

  const sectionTitle = (key) =>
    t?.sidebarSections?.[key] ??
    ({ CORE: "Core", DATA: "Data", TRADING: "Trading", ADMIN: "Admin" }[key] || key);

  const labelize = (k) => {
    if (k.endsWith("_MAIN")) {
      const parent = MENU_REGISTRY[k]?.parent;
      return String(t.menu?.[parent] ?? parent ?? k).replace(/_/g, " ");
    }
    return String(t.menu?.[k] ?? k).replace(/_/g, " ");
  };

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

  const toggleExclusive = (key) => setOpenMenus((prev) => (prev[key] ? {} : { [key]: true }));
  const openOnly = (key) => setOpenMenus((prev) => (prev[key] ? prev : { [key]: true }));
  const closeAll = () => setOpenMenus({});

  useEffect(() => {
    const child = Object.values(MENU_REGISTRY).find((m) => m?.parent && location.pathname.startsWith(m.to));
    if (child?.parent) {
      setOpenMenus((prev) => (prev[child.parent] ? prev : { [child.parent]: true }));
      return;
    }
    const parent = Object.values(MENU_REGISTRY).find((m) => m && !m.parent && location.pathname.startsWith(m.to));
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
          <div className={`px-3 pt-3 pb-1 ${SIZES.sectionText} uppercase tracking-wide text-[#74E8A0]`}>
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

            // shared tooltip (collapsed)
            const Tooltip = ({ text }) =>
              compact ? (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-[#0E0F0E]/90 px-2 py-1 text-xs text-[#E7EEE7] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {text}
                </span>
              ) : null;

            if (hasChildren) {
              return (
                <div key={key}>
                  <div
                    className={[
                      // ✅ transition-colors (prevents weird "blink" from other transitions)
                      "group relative w-full flex items-center gap-3 px-3 rounded-md cursor-pointer transition-colors duration-150",
                      SIZES.parentText,
                      SIZES.parentPy,
                      compact ? "justify-center" : "justify-start",
                      "text-[#E7EEE7]",
                      // ✅ visible hover on green sidebar
                      "hover:bg-white/15 hover:text-white",
                      isOpen ? "bg-white/10" : "",
                    ].join(" ")}
                    onClick={() => toggleExclusive(key)}
                    title={compact ? parentLabel : undefined}
                    aria-expanded={isOpen}
                  >
                    {/* ✅ icon follows text color */}
                    <Icon size={SIZES.parentIcon} className="shrink-0 text-current opacity-95 transition-colors" />

                    {!compact && (
                      <>
                        <span className="truncate">{parentLabel}</span>
                        <span className="ml-auto opacity-90 text-current transition-colors">
                          {isOpen ? <ChevronDown size={SIZES.chevron} /> : <ChevronRight size={SIZES.chevron} />}
                        </span>
                      </>
                    )}

                    <Tooltip text={parentLabel} />
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
                                "group relative w-full flex items-center gap-3 px-3 rounded-md transition-colors duration-150",
                                SIZES.childText,
                                SIZES.childPy,
                                compact ? "justify-center" : "ml-6",
                                isActive
                                  ? "bg-[#00C86F] text-[#0E0F0E] shadow-sm"
                                  : "text-[#E7EEE7] hover:bg-white/15 hover:text-white",
                              ].join(" ")
                            }
                            title={childLabel}
                            onClick={() => openOnly(parentKey)}
                          >
                            {/* ✅ icon follows text color */}
                            <CIcon size={SIZES.childIcon} className="shrink-0 text-current opacity-95 transition-colors" />
                            {!compact && <span className="truncate">{childLabel}</span>}
                            <Tooltip text={childLabel} />
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
                    "group relative w-full flex items-center gap-3 px-3 rounded-md transition-colors duration-150",
                    SIZES.parentText,
                    SIZES.parentPy,
                    compact ? "justify-center" : "justify-start",
                    isActive
                      ? "bg-[#00C86F] text-[#0E0F0E] shadow-sm"
                      : "text-[#E7EEE7] hover:bg-white/15 hover:text-white",
                  ].join(" ")
                }
                title={compact ? parentLabel : undefined}
                onClick={closeAll}
              >
                <Icon size={SIZES.parentIcon} className="shrink-0 text-current opacity-95 transition-colors" />
                {!compact && <span className="truncate">{parentLabel}</span>}
                {compact && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-[#0E0F0E]/90 px-2 py-1 text-xs text-[#E7EEE7] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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

  return (
    <aside
      className={[
        "h-full flex flex-col overflow-x-hidden relative",
        "transition-[width] duration-200 ease-in-out",
        "bg-[#007A3A] text-[#0E0F0E] border-r border-[#00572A]/40",
        collapsed ? "w-16" : "w-56",
      ].join(" ")}
      aria-label="Sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-3 border-b border-[#00572A]/40">
        {!collapsed && (
          <div className="flex items-center overflow-hidden">
            <img src={logo} alt="logo" className="h-10 w-auto object-contain drop-shadow-sm" />
          </div>
        )}

        <button
          onClick={toggleDesktop}
          className="
            ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full
            bg-[#E7EEE7] text-[#0E0F0E] shadow
            hover:bg-white
            focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/45
          "
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
      <div className="px-2 py-3 border-t border-[#00572A]/40">
        <button
          onClick={onLogout}
          className={[
            "w-full flex items-center gap-2 rounded-md transition-colors duration-150",
            "focus:outline-none focus:ring-4 focus:ring-[#74E8A0]/40",
            collapsed
              ? "justify-center px-2 py-2 hover:bg-white/15 text-xs font-medium text-[#E7EEE7]"
              : "px-3 py-2 bg-white/10 hover:bg-white/15 text-sm font-medium text-[#E7EEE7]",
          ].join(" ")}
          title={collapsed ? (t.navbar?.logout || "Log out") : undefined}
        >
          <LogOut size={collapsed ? 16 : 18} className="text-[#E8C26A]" />
          {!collapsed && <span className="text-[#0E0F0E]">{t.navbar?.logout || "Log out"}</span>}
        </button>
      </div>
    </aside>
  );
}
