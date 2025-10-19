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
  Truck,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useI18n } from "./i18n";

/** Flat menu registry */
const MENU_REGISTRY = {
  EXCHANGE: { key: "EXCHANGE", icon: ArrowLeftRight, to: "/app/exchange" },

  CUSTOMERS: { key: "CUSTOMERS", icon: Users, to: "/app/customers" },
  VENDORS: { key: "VENDORS", icon: Building2, to: "/app/vendors" },
  USERS: { key: "USERS", icon: UserCog, to: "/app/users" },

  // Make ITEM a parent (with children below)
  ITEM: { key: "ITEM", icon: Sprout, to: "/app/items" },

  // Parents (toggle only if they have children)
  LOCATIONS: { key: "LOCATIONS", icon: MapPin, to: "/app/locations" },
  TRANSPORTS: { key: "TRANSPORTS", icon: Truck, to: "/app/transports" },

  // --- Submenu entries (main + default) for Items ---
  ITEM_MAIN: {
    key: "ITEM_MAIN",
    icon: Sprout,
    to: "/app/items",
    parent: "ITEM",
  },
  DEF_ITEM_PARAMETERS: {
    key: "DEFAULT_ITEM_PARAMETERS",
    icon: BadgeCheck,
    to: "/app/default-item-parameters",
    parent: "ITEM",
  },

  // --- Submenu entries (main + default) for Locations ---
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

  // --- Submenu entries (main + default) for Transports ---
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

  PARAMETERS: {
    key: "PARAMETERS",
    icon: SlidersHorizontal,
    to: "/app/parameters",
  },

  BUY: { key: "BUY", icon: ShoppingCart, to: "/app/buy" },

  // SELL as a parent with submenu
  SELL: { key: "SELL", icon: Coins, to: "/app/sell" },
  SELL_MAIN: {
    key: "SELL_MAIN",
    icon: Coins,
    to: "/app/sell",
    parent: "SELL",
  },
  SALES_LINE_PARAMETERS: {
    key: "SALES_LINE_PARAMETERS",
    icon: SlidersHorizontal,
    to: "/app/sales-line-parameters",
    parent: "SELL",
  },
};

/** Grouping logic (order matters) */
const GROUPS = [
  { key: "CORE", titleKey: "CORE", items: ["EXCHANGE"] },
  {
    key: "DATA",
    titleKey: "DATA",
    items: [
      "CUSTOMERS",
      "VENDORS",

      // Parent + submenu entries (ITEM)
      "ITEM",
      "ITEM_MAIN",
      "DEF_ITEM_PARAMETERS",

      // Parent + submenu entries (LOCATIONS)
      "LOCATIONS",
      "LOCATIONS_MAIN",
      "DEFAULT_LOCATIONS",

      // Parent + submenu entries (TRANSPORTS)
      "TRANSPORTS",
      "TRANSPORTS_MAIN",
      "DEFAULT_TRANSPORTS",

      "PARAMETERS",
    ],
  },
  {
    key: "TRADING",
    titleKey: "TRADING",
    items: [
      "BUY",
      // Parent + submenu entries (SELL)
      "SELL",
      "SELL_MAIN",
      "SALES_LINE_PARAMETERS",
    ],
  },
  { key: "ADMIN", titleKey: "ADMIN", items: ["USERS"] },
];

export default function Sidebar({ onLogout }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Collapsed state (persisted)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);
  const toggleDesktop = () => setCollapsed((c) => !c);

  // Open submenus (persisted)
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
    (
      {
        CORE: "Core",
        DATA: "Data",
        TRADING: "Trading",
        ADMIN: "Admin",
      }[key] || key
    );

  // Label helper (translate if available, else replace underscores)
  const labelize = (k) => {
    if (k.endsWith("_MAIN")) {
      const parent = MENU_REGISTRY[k]?.parent;
      return String(t.menu?.[parent] ?? parent ?? k).replace(/_/g, " ");
    }
    return String(t.menu?.[k] ?? k).replace(/_/g, " ");
  };

  // Build hierarchy safely
  const groupEntries = useMemo(() => {
    return GROUPS.map((g) => {
      const all = (g.items || []).map((id) => MENU_REGISTRY[id]).filter(Boolean);
      const parents = all.filter((m) => !m.parent);
      const childrenByParent = all
        .filter((m) => m.parent)
        .reduce((acc, m) => {
          const p = m.parent;
          acc[p] = acc[p] || [];
          acc[p].push(m);
          return acc;
        }, {});
      return { ...g, parents, childrenByParent };
    });
  }, []);

  // Exclusive toggle (also avoids redundant state writes)
  const toggleExclusive = (key) =>
    setOpenMenus((prev) => {
      const isOpen = !!prev[key];
      return isOpen ? {} : { [key]: true };
    });

  const openOnly = (key) =>
    setOpenMenus((prev) => (prev[key] ? prev : { [key]: true }));

  const closeAll = () => setOpenMenus({});

  // Keep the relevant submenu open based on URL
  useEffect(() => {
    // if on a child route, open its parent
    const child = Object.values(MENU_REGISTRY).find(
      (m) => m?.parent && location.pathname.startsWith(m.to)
    );
    if (child?.parent) {
      setOpenMenus((prev) =>
        prev[child.parent] ? prev : { [child.parent]: true }
      );
      return;
    }
    // if directly on a parent route, open that parent
    const parent = Object.values(MENU_REGISTRY).find(
      (m) => m && !m.parent && location.pathname.startsWith(m.to)
    );
    if (parent?.key) {
      setOpenMenus((prev) =>
        prev[parent.key] ? prev : { [parent.key]: true }
      );
      return;
    }
    // default: close all
    setOpenMenus({});
  }, [location.pathname]);

  const Group = ({ group, compact = false }) => {
    const parents = group?.parents ?? [];
    const childrenByParent = group?.childrenByParent ?? {};
    if (!parents.length && !Object.keys(childrenByParent).length) return null;

    return (
      <div>
        {!compact && (
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
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

            // PARENTS WITH CHILDREN => toggle row (first click open; second click go to MAIN)
            if (hasChildren) {
              return (
                <div key={key}>
                  <div
                    className={[
                      "group relative w-full flex items-center gap-3 px-3 py-3 rounded-md transition",
                      "text-[15px] font-semibold",
                      "hover:bg-white/10",
                      "cursor-pointer",
                      compact ? "justify-center" : "justify-start",
                    ].join(" ")}
                    onClick={() => {
                      if (!isOpen) {
                        toggleExclusive(key);
                      } else {
                        const main =
                          kids.find((m) => m.key?.endsWith?.("_MAIN")) || kids[0];
                        if (main?.to) navigate(main.to);
                      }
                    }}
                    title={compact ? parentLabel : undefined}
                    aria-expanded={isOpen}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!compact && (
                      <>
                        <span className="truncate">{parentLabel}</span>
                        <span className="ml-auto opacity-80">
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                                "group relative w-full flex items-center gap-3 px-3 py-2 rounded-md transition",
                                "text-[13px] font-semibold",
                                compact ? "justify-center" : "ml-6",
                                isActive ? "bg-white/20" : "hover:bg-white/10",
                              ].join(" ")
                            }
                            title={childLabel}
                            onClick={() => openOnly(parentKey)}
                          >
                            <CIcon size={18} className="shrink-0" />
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

            // PARENTS WITHOUT CHILDREN => direct NavLink (navigate)
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
                title={compact ? parentLabel : undefined}
                onClick={closeAll}
              >
                <Icon size={20} className="shrink-0" />
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
      <div
        id="sidebar-sections"
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 no-scrollbar"
      >
        {(groupEntries || []).map((g) => (
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
