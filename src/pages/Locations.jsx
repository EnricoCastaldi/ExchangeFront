// src/pages/Locations.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Hash,
  MapPin,
  Maximize2,
  Minimize2,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  AlignLeft,
  ArrowDown01,
  ArrowUp01,
  ToggleRight,
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function Locations() {
  const { t, locale } = useI18n();
  const P = t?.locations || {};

  const L = {
    title: P.title || "Locations",
    controls: {
      searchPlaceholder:
        P?.controls?.searchPlaceholder ||
        "Search: no, name, city, region, country, email, phone",
      searchBtn: P?.controls?.searchBtn || "Search",
      filters: P?.controls?.filters || "Filters",
      addBtn: P?.controls?.addBtn || "Add location",
      allCountries: P?.controls?.allCountries || "All countries",
      allRegions: P?.controls?.allRegions || "All regions",
      allStatuses: P?.controls?.allStatuses || "All statuses",
      statuses: {
        active: P?.controls?.statuses?.active || "Active",
        inactive: P?.controls?.statuses?.inactive || "Inactive",
      },
    },
    table: {
      no: P?.table?.no || "Location No.",
      name: P?.table?.name || "Name",
      city: P?.table?.city || "City",
      region: P?.table?.region || "Region",
      country: P?.table?.country || "Country",
      minQty: P?.table?.minQty || "Min Qty",
      maxQty: P?.table?.maxQty || "Max Qty",
      status: P?.table?.status || "Status",
      created: P?.table?.created || "Created",
      actions: P?.table?.actions || "",
      loading: P?.table?.loading || "Loading…",
      empty: P?.table?.empty || "No locations",
      dash: P?.table?.dash || "—",
    },
    details: {
      id: P?.details?.id || "ID",
      no: P?.details?.no || "Location No.",
      name: P?.details?.name || "Name",
      name2: P?.details?.name2 || "Name 2",
      address: P?.details?.address || "Address",
      address2: P?.details?.address2 || "Address 2",
      city: P?.details?.city || "City",
      region: P?.details?.region || "Region",
      postCode: P?.details?.postCode || "Post Code",
      country: P?.details?.country || "Country",
      email: P?.details?.email || "Email",
      phoneNo: P?.details?.phoneNo || "Phone",
      minQty: P?.details?.minQty || "Min Qty",
      maxQty: P?.details?.maxQty || "Max Qty",
      // NEW cost labels (with fallbacks)
      additionalCost: P?.details?.additionalCost || "Additional cost",
      loadingCost: P?.details?.loadingCost || "Loading cost",
      unloadingCost: P?.details?.unloadingCost || "Unloading cost",
      active: P?.details?.active || "Active",
      created: P?.details?.created || "Created",
      updated: P?.details?.updated || "Updated",
      description: P?.details?.description || "Notes",
    },
    modal: {
      titleNew: P?.modal?.titleNew || "Add location",
      titleEdit: P?.modal?.titleEdit || "Edit location",
      add: P?.modal?.add || "Add",
      save: P?.modal?.save || "Save",
      cancel: P?.modal?.cancel || "Cancel",
      fields: {
        no: P?.modal?.fields?.no || "Location No. *",
        name: P?.modal?.fields?.name || "Location Name",
        name2: P?.modal?.fields?.name2 || "Location Name 2",
        address: P?.modal?.fields?.address || "Address",
        address2: P?.modal?.fields?.address2 || "Address 2",
        city: P?.modal?.fields?.city || "City",
        region: P?.modal?.fields?.region || "Region",
        postCode: P?.modal?.fields?.postCode || "Post Code",
        country: P?.modal?.fields?.country || "Country",
        email: P?.modal?.fields?.email || "Email",
        phoneNo: P?.modal?.fields?.phoneNo || "Phone No.",
        minQty: P?.modal?.fields?.minQty || "Min Qty (int)",
        maxQty: P?.modal?.fields?.maxQty || "Max Qty (int)",
        // NEW cost fields (with fallbacks)
        additionalCost: P?.modal?.fields?.additionalCost || "Additional Cost",
        loadingCost: P?.modal?.fields?.loadingCost || "Loading Cost",
        unloadingCost: P?.modal?.fields?.unloadingCost || "Unloading Cost",
        active: P?.modal?.fields?.active || "Active",
      },
      required: P?.modal?.required || "Please fill required fields.",
    },
    alerts: {
      loadFail: P?.alerts?.loadFail || "Failed to load locations.",
      requestFail: P?.alerts?.requestFail || "Request failed.",
      deleteConfirm: P?.alerts?.deleteConfirm || "Delete this location?",
      deleted: P?.alerts?.deleted || "Deleted.",
      created: P?.alerts?.created || "Created.",
      updated: P?.alerts?.updated || "Updated.",
    },
    footer: {
      meta:
        P?.footer?.meta ||
        ((total, page, pages) => `Total: ${total} • Page ${page} of ${pages || 1}`),
      perPage: (n) =>
        P?.footer?.perPage ? P.footer.perPage(n) : `${n} / page`,
      prev: P?.footer?.prev || "Prev",
      next: P?.footer?.next || "Next",
    },
    a11y: {
      toggleDetails: P?.a11y?.toggleDetails || "Toggle details",
    },
  };

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [active, setActive] = useState(""); // "", "true", "false"
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const activeFilterCount = [country, region, active].filter(Boolean).length;

  // ---------- Data ----------
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: `${sortBy}:${sortDir === "asc" ? 1 : -1}`,
      });
      if (q) params.set("query", q);
      if (country) params.set("country", country);
      if (region) params.set("region", region);
      if (active !== "") params.set("active", active);

      const res = await fetch(`${API}/api/mlocations?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", L.alerts.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, country, region, active, sortBy, sortDir]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/mlocations/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        showNotice("success", L.alerts.deleted);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotice("error", err.message || L.alerts.requestFail);
      }
    } catch {
      showNotice("error", L.alerts.requestFail);
    }
  };

  // client-side sort parity
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const k = sortBy;
    const get = (r) => {
      const v = r?.[k];
      if (k === "createdAt") return v ? new Date(v).getTime() : 0;
      if (k === "minQty" || k === "maxQty") return Number(v) || 0;
      if (k === "active") return r.active ? 1 : 0;
      return (v ?? "").toString().toLowerCase();
    };
    arr.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [data.data, sortBy, sortDir]);

  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?.id || editing?._id);
    const id = editing?.id || editing?._id;
    const url = isEdit ? `${API}/api/mlocations/${id}` : `${API}/api/mlocations`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return showNotice("error", json.message || L.alerts.requestFail);

      showNotice("success", isEdit ? L.alerts.updated : L.alerts.created);
      setOpen(false);
      setEditing(null);
      setPage(1);
      fetchData();
    } catch {
      showNotice("error", L.alerts.requestFail);
    }
  };

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      {notice && (
        <Toast type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Toast>
      )}

      {/* Search & Filters */}
      <form onSubmit={onSearch} className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L.controls.searchPlaceholder}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
            />
            <button
              type="submit"
              title={L.controls.searchBtn}
              aria-label={L.controls.searchBtn}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <Search size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="loc-filters-panel"
          >
            <SlidersHorizontal size={16} />
            {L.controls.filters}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {L.controls.addBtn}
          </button>
        </div>

        {/* Filters */}
        <div
          id="loc-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-3 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          <input
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            placeholder={L.controls.allCountries}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          />
          <input
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setPage(1);
            }}
            placeholder={L.controls.allRegions}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          />
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{L.controls.allStatuses}</option>
            <option value="true">{L.controls.statuses.active}</option>
            <option value="false">{L.controls.statuses.inactive}</option>
          </select>
        </div>

        {/* Filter chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {country && <Chip label={`${L.table.country}: ${country}`} onClear={() => setCountry("")} />}
          {region && <Chip label={`${L.table.region}: ${region}`} onClear={() => setRegion("")} />}
          {active !== "" && (
            <Chip
              label={`${L.table.status}: ${
                active === "true" ? L.controls.statuses.active : L.controls.statuses.inactive
              }`}
              onClear={() => setActive("")}
            />
          )}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th />
                <SortableTh id="no" {...{ sortBy, sortDir, onSort }}>{L.table.no}</SortableTh>
                <SortableTh id="name" {...{ sortBy, sortDir, onSort }}>{L.table.name}</SortableTh>
                <SortableTh id="city" {...{ sortBy, sortDir, onSort }}>{L.table.city}</SortableTh>
                <SortableTh id="region" {...{ sortBy, sortDir, onSort }}>{L.table.region}</SortableTh>
                <SortableTh id="country" {...{ sortBy, sortDir, onSort }}>{L.table.country}</SortableTh>
                <SortableTh id="minQty" {...{ sortBy, sortDir, onSort }} className="text-right">
                  {L.table.minQty}
                </SortableTh>
                <SortableTh id="maxQty" {...{ sortBy, sortDir, onSort }} className="text-right">
                  {L.table.maxQty}
                </SortableTh>
                <SortableTh id="active" {...{ sortBy, sortDir, onSort }}>{L.table.status}</SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>{L.table.created}</SortableTh>
                <Th className="text-right">{L.table.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-500">
                    {L.table.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-500">
                    {L.table.empty}
                  </td>
                </tr>
              ) : (
                rows.flatMap((r) => {
                  const key = r.id || r._id;
                  const mainRow = (
                    <tr key={key} className="border-t">
                      <Td className="w-8">
                        <button
                          className="p-1 rounded hover:bg-slate-100"
                          onClick={() => setExpandedId((id) => (id === key ? null : key))}
                          aria-label={L.a11y.toggleDetails}
                          title={L.a11y.toggleDetails}
                        >
                          {expandedId === key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </Td>
                      <Td className="font-mono">{r.no}</Td>
                      <Td className="truncate max-w-[260px]" title={r.name}>
                        {r.name || L.table.dash}
                      </Td>
                      <Td>{r.city || L.table.dash}</Td>
                      <Td>{r.region || L.table.dash}</Td>
                      <Td className="flex items-center gap-1">
                        <Globe size={14} className="text-slate-400" />
                        {r.country || L.table.dash}
                      </Td>
                      <Td className="text-right">{fmtInt(r.minQty)}</Td>
                      <Td className="text-right">{fmtInt(r.maxQty)}</Td>
                      <Td>{activeChip(r.active)}</Td>
                      <Td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : L.table.dash}</Td>
                      <Td>
                        <div className="flex justify-end gap-2 pr-3">
                          <button
                            className="p-2 rounded-lg hover:bg-slate-100"
                            onClick={() => {
                              setEditing(r);
                              setOpen(true);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                            onClick={() => onDelete(key)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );

                  const detailsRow =
                    expandedId === key ? (
                      <tr key={`${key}-details`}>
                        <td colSpan={11} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={L.details.id} icon={Hash}>{key}</KV>
                            <KV label={L.details.no} icon={Hash}>{r.no}</KV>
                            <KV label={L.details.name} icon={Building2}>{r.name || L.table.dash}</KV>
                            <KV label={L.details.name2} icon={Building2}>{r.name2 || L.table.dash}</KV>
                            <KV label={L.details.address} icon={MapPin}>{r.address || L.table.dash}</KV>
                            <KV label={L.details.address2} icon={MapPin}>{r.address2 || L.table.dash}</KV>
                            <KV label={L.details.city} icon={MapPin}>{r.city || L.table.dash}</KV>
                            <KV label={L.details.region} icon={MapPin}>{r.region || L.table.dash}</KV>
                            <KV label={L.details.postCode} icon={MapPin}>{r.postCode || L.table.dash}</KV>
                            <KV label={L.details.country} icon={Globe}>{r.country || L.table.dash}</KV>
                            <KV label={L.details.email} icon={Mail}>{r.email || L.table.dash}</KV>
                            <KV label={L.details.phoneNo} icon={Phone}>{r.phoneNo || L.table.dash}</KV>
                            <KV label={L.details.minQty} icon={ArrowDown01}>{fmtInt(r.minQty)}</KV>
                            <KV label={L.details.maxQty} icon={ArrowUp01}>{fmtInt(r.maxQty)}</KV>

                            {/* NEW: costs */}
                            <KV label={L.details.additionalCost} icon={AlignLeft}>
                              {fmtDec(r.additionalCost)}
                            </KV>
                            <KV label={L.details.loadingCost} icon={AlignLeft}>
                              {fmtDec(r.loadingCost)}
                            </KV>
                            <KV label={L.details.unloadingCost} icon={AlignLeft}>
                              {fmtDec(r.unloadingCost)}
                            </KV>

                            <KV label={L.details.active} icon={ToggleRight}>{activeChip(r.active)}</KV>
                            <KV label={L.details.created} icon={Calendar}>
                              {r.createdAt ? new Date(r.createdAt).toLocaleString(locale) : L.table.dash}
                            </KV>
                            <KV label={L.details.updated} icon={Calendar}>
                              {r.updatedAt ? new Date(r.updatedAt).toLocaleString(locale) : L.table.dash}
                            </KV>
                            <div className="md:col-span-3">
                              <KV label={L.details.description} icon={AlignLeft}>
                                {r.description || L.table.dash}
                              </KV>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null;

                  return [mainRow, detailsRow].filter(Boolean);
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">{L.footer.meta(data.total, data.page, data.pages)}</div>
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {L.footer.perPage(n)}
                </option>
              ))}
            </select>
            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              {L.footer.prev}
            </button>
            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
              disabled={data.page >= (data.pages || 1)}
            >
              {L.footer.next}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <Modal
          title={editing ? L.modal.titleEdit : L.modal.titleNew}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <LocationForm
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            L={L}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Tiny atoms ---------- */
function Th({ children, className = "" }) {
  return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
function KV({ label, icon: Icon, children }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 text-slate-500 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      <div className="col-span-2 font-medium break-words">{children}</div>
    </div>
  );
}
function SortableTh({ id, sortBy, sortDir, onSort, children, className = "" }) {
  const active = sortBy === id;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th aria-sort={ariaSort} className={`text-left px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50"
        title="Sort"
      >
        <span>{children}</span>
        <span className={`text-xs opacity-60 ${active ? "opacity-100" : ""}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
function Chip({ label, onClear, clearTitle = "Clear" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-white" title={clearTitle} aria-label={clearTitle}>
        <X size={12} className="text-slate-500" />
      </button>
    </span>
  );
}
function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap =
    isSuccess ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}>
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
    </div>
  );
}
function Modal({ children, onClose, title = "Location", fullscreen = false, backdrop = "dim" }) {
  const [isFull, setIsFull] = React.useState(Boolean(fullscreen));

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key.toLowerCase() === "f") setIsFull((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // backdrop: "dim" | "transparent" | "blur" | "none"
  let backdropNode = null;
  if (backdrop === "dim") backdropNode = <div className="absolute inset-0 bg-black/50" onClick={onClose} />;
  else if (backdrop === "transparent") backdropNode = <div className="absolute inset-0" onClick={onClose} />;
  else if (backdrop === "blur") backdropNode = <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />;

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull
    ? "p-4 h-[calc(100vh-52px)] overflow-auto"
    : "p-4 max-h-[75vh] overflow-auto";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      {backdropNode}
      <div className={containerCls}>
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur"
          onDoubleClick={() => setIsFull((v) => !v)}
        >
          <h3 className="font-semibold truncate pr-2">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFull((v) => !v)}
              className="p-2 rounded hover:bg-slate-100"
              title={isFull ? "Restore" : "Expand"}
              aria-label={isFull ? "Restore" : "Expand"}
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100" title="Close" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={bodyCls}>{children}</div>
      </div>
    </div>
  );
}


/* ---------- Helpers ---------- */
function activeChip(on, L) {
  const txt = on ? (L?.controls?.statuses?.active || "Active") : (L?.controls?.statuses?.inactive || "Inactive");
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        on ? "bg-green-50 text-green-700 border border-green-200"
           : "bg-slate-100 text-slate-700 border border-slate-200"
      }`}
    >
      {String(txt).toUpperCase()}
    </span>
  );
}
function fmtInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}
// NEW: decimal formatter with 2 fraction digits
function fmtDec(v) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/* ---------- Form ---------- */
function LocationForm({ initial, onSubmit, onCancel, L }) {
  const isEdit = Boolean(initial?.id || initial?._id);
  const [no, setNo] = useState(initial?.no || "");
  const [name, setName] = useState(initial?.name || "");
  const [name2, setName2] = useState(initial?.name2 || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [address2, setAddress2] = useState(initial?.address2 || "");
  const [city, setCity] = useState(initial?.city || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [postCode, setPostCode] = useState(initial?.postCode || "");
  const [country, setCountry] = useState(initial?.country || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phoneNo, setPhoneNo] = useState(initial?.phoneNo || "");
  const [minQty, setMinQty] = useState(initial?.minQty ?? "");
  const [maxQty, setMaxQty] = useState(initial?.maxQty ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  // NEW: costs
  const [additionalCost, setAdditionalCost] = useState(
    initial?.additionalCost ?? ""
  );
  const [loadingCost, setLoadingCost] = useState(
    initial?.loadingCost ?? ""
  );
  const [unloadingCost, setUnloadingCost] = useState(
    initial?.unloadingCost ?? ""
  );

  const submit = (e) => {
    e.preventDefault();
    if (!no.trim()) {
      alert(L.modal.required);
      return;
    }
    const payload = {
      no: no.trim(),
      name: name.trim(),
      name2: name2.trim(),
      address: address.trim(),
      address2: address2.trim(),
      city: city.trim(),
      region: region.trim(),
      postCode: postCode.trim(),
      country: country.trim(),
      email: email.trim(),
      phoneNo: phoneNo.trim(),
      minQty: minQty === "" ? null : Number(minQty),
      maxQty: maxQty === "" ? null : Number(maxQty),
      // NEW: costs -> numbers or null when empty
      additionalCost: additionalCost === "" ? null : Number(additionalCost),
      loadingCost: loadingCost === "" ? null : Number(loadingCost),
      unloadingCost: unloadingCost === "" ? null : Number(unloadingCost),
      active: Boolean(active),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={L.modal.fields.no} icon={Hash}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={no}
            onChange={(e) => setNo(e.target.value)}
          />
        </Field>
        <Field label={L.modal.fields.country} icon={Globe}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.name} icon={Building2}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={L.modal.fields.name2} icon={Building2}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={name2}
            onChange={(e) => setName2(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.address} icon={MapPin}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
        <Field label={L.modal.fields.address2} icon={MapPin}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.city} icon={MapPin}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
        <Field label={L.modal.fields.region} icon={MapPin}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.postCode} icon={MapPin}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={postCode}
            onChange={(e) => setPostCode(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.email} icon={Mail}>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.phoneNo} icon={Phone}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.minQty} icon={ArrowDown01}>
          <input
            type="number"
            step="1"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field label={L.modal.fields.maxQty} icon={ArrowUp01}>
          <input
            type="number"
            step="1"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
            placeholder="0"
          />
        </Field>

        {/* NEW: costs */}
        <Field label={L.modal.fields.additionalCost} icon={AlignLeft}>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
            value={additionalCost}
            onChange={(e) => setAdditionalCost(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label={L.modal.fields.loadingCost} icon={AlignLeft}>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
            value={loadingCost}
            onChange={(e) => setLoadingCost(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label={L.modal.fields.unloadingCost} icon={AlignLeft}>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
            value={unloadingCost}
            onChange={(e) => setUnloadingCost(e.target.value)}
            placeholder="0.00"
          />
        </Field>

        <Field label={L.modal.fields.active} icon={ToggleRight}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={String(active)}
            onChange={(e) => setActive(e.target.value === "true")}
          >
            <option value="true">{L.controls.statuses.active}</option>
            <option value="false">{L.controls.statuses.inactive}</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {L.modal.cancel}
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          {isEdit ? L.modal.save : L.modal.add}
        </button>
      </div>
    </form>
  );
}

/* Field with optional icon */
function Field({ label, icon: Icon, children }) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [children.props.className || "", Icon ? " pl-9" : ""].join(" "),
      })
    : children;

  return (
    <label className="text-sm block">
      <div className="mb-1 text-slate-600 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
        {child}
      </div>
    </label>
  );
}
