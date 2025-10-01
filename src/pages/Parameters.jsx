// src/pages/Parameters.jsx
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
  SlidersHorizontal, // filters toggle
  Hash,              // code
  FileText,          // description
  Tag,               // type label
  Calculator,        // decimal
  Type as TypeIcon,  // text
  ToggleRight,       // boolean
  ArrowDown01,       // min
  ArrowUp01,         // max
  Equal,             // default
  Calendar,  
} from "lucide-react";
import { useI18n } from "../helpers/i18n";



const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");


export default function Parameters() {
  const { t, locale } = useI18n();
  const P = t?.parameters || {};

  // ---------- Localized labels with sensible fallbacks ----------
  const L = {
    title: P.title || "Parameters",
    controls: {
      searchPlaceholder: P?.controls?.searchPlaceholder || "Search: code, description",
      searchBtn: P?.controls?.searchBtn || "Search",
      filters: P?.controls?.filters || "Filters",
      addBtn: P?.controls?.addBtn || "Add parameter",
      allTypes: P?.controls?.allTypes || "All types",
      allStatuses: P?.controls?.allStatuses || "All statuses",
      statuses: {
        active: P?.controls?.statuses?.active || "Active",
        inactive: P?.controls?.statuses?.inactive || "Inactive",
      },
    },
 table: {
  code: P?.table?.code || "Param. Code",
  description: P?.table?.description || "Description",
  type: P?.table?.type || "Type",
  // use either 'min' or 'minValue' from i18n
  min: P?.table?.min || P?.table?.minValue || "Min",
  max: P?.table?.max || P?.table?.maxValue || "Max",
  defaultValue: P?.table?.defaultValue || "Default",
  status: P?.table?.status || "Status",
  created: P?.table?.created || "Created",
  actions: P?.table?.actions || "",
  loading: P?.table?.loading || "Loading…",
  empty: P?.table?.empty || "No parameters",
  dash: P?.table?.dash || "—",
},
    details: {
      id: P?.details?.id || "ID",
      code: P?.details?.code || "Param. Code",
      description: P?.details?.description || "Description",
      type: P?.details?.type || "Type",
      min: P?.details?.min || "Min value",
      max: P?.details?.max || "Max value",
      defaultValue: P?.details?.defaultValue || "Default value",
      active: P?.details?.active || "Active",
      created: P?.details?.created || "Created",
      updated: P?.details?.updated || "Updated",
    },
    modal: {
      titleNew: P?.modal?.titleNew || "Add parameter",
      titleEdit: P?.modal?.titleEdit || "Edit parameter",
      add: P?.modal?.add || "Add",
      save: P?.modal?.save || "Save",
      cancel: P?.modal?.cancel || "Cancel",
      fields: {
        code: P?.modal?.fields?.code || "Param. Code *",
        description: P?.modal?.fields?.description || "Description",
        type: P?.modal?.fields?.type || "Param. Type",
        min: P?.modal?.fields?.min || "Min value (decimal)",
        max: P?.modal?.fields?.max || "Max value (decimal)",
        defaultValue: P?.modal?.fields?.defaultValue || "Default value",
        active: P?.modal?.fields?.active || "Active",
      },
      required: P?.modal?.required || "Please fill required fields.",
    },
    alerts: {
      loadFail: P?.alerts?.loadFail || "Failed to load parameters.",
      requestFail: P?.alerts?.requestFail || "Request failed.",
      deleteConfirm: P?.alerts?.deleteConfirm || "Delete this parameter?",
      deleted: P?.alerts?.deleted || "Deleted.",
      created: P?.alerts?.created || "Created.",
      updated: P?.alerts?.updated || "Updated.",
    },
    footer: {
      meta: P?.footer?.meta || ((total, page, pages) => `Total: ${total} • Page ${page} of ${pages || 1}`),
      perPage: (n) => (P?.footer?.perPage ? P.footer.perPage(n) : `${n} / page`),
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
  const [type, setType] = useState(""); // text | decimal | boolean | ""
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

  const activeFilterCount = [type, active].filter(Boolean).length;

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
      if (type) params.set("type", type);
      if (active !== "") params.set("active", active);

      const res = await fetch(`${API}/api/params?${params.toString()}`);
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
  }, [page, limit, type, active, sortBy, sortDir]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/params/${id}`, { method: "DELETE" });
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
      if (k === "defaultValue" || k === "minValue" || k === "maxValue") return Number(v) || 0;
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
    const url = isEdit ? `${API}/api/params/${id}` : `${API}/api/params`;
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
          <div className="relative flex-1 min-w-[220px]">
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
            aria-controls="params-filters-panel"
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
          id="params-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-3 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{L.controls.allTypes}</option>
            <option value="decimal">decimal</option>
            <option value="text">text</option>
            <option value="boolean">boolean</option>
          </select>

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

          <div />
        </div>

        {/* Filter chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {type && <Chip label={`${L.table.type}: ${type}`} onClear={() => setType("")} clearTitle={L.modal.cancel} />}
          {active !== "" && (
            <Chip
              label={`${L.table.status}: ${active === "true" ? L.controls.statuses.active : L.controls.statuses.inactive}`}
              onClear={() => setActive("")}
              clearTitle={L.modal.cancel}
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
                <SortableTh id="code" {...{ sortBy, sortDir, onSort }}>{L.table.code}</SortableTh>
                <SortableTh id="description" {...{ sortBy, sortDir, onSort }}>{L.table.description}</SortableTh>
                <SortableTh id="type" {...{ sortBy, sortDir, onSort }}>{L.table.type}</SortableTh>
                <SortableTh id="minValue" {...{ sortBy, sortDir, onSort }} className="text-right">{L.table.min}</SortableTh>
                <SortableTh id="maxValue" {...{ sortBy, sortDir, onSort }} className="text-right">{L.table.max}</SortableTh>
                <SortableTh id="defaultValue" {...{ sortBy, sortDir, onSort }} className="text-right">
                  {L.table.defaultValue}
                </SortableTh>
                <SortableTh id="active" {...{ sortBy, sortDir, onSort }}>{L.table.status}</SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>{L.table.created}</SortableTh>
                <Th className="text-right">{L.table.actions}</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    {L.table.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    {L.table.empty}
                  </td>
                </tr>
              ) : (
                rows.flatMap((r) => {
                  const mainRow = (
                    <tr key={r.id || r._id} className="border-t">
                      <Td className="w-8">
                        <button
                          className="p-1 rounded hover:bg-slate-100"
                          onClick={() => setExpandedId((id) => (id === (r.id || r._id) ? null : r.id || r._id))}
                          aria-label={L.a11y.toggleDetails}
                          title={L.a11y.toggleDetails}
                        >
                          {expandedId === (r.id || r._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </Td>
                      <Td className="font-mono">{r.code}</Td>
                      <Td className="truncate max-w-[360px]" title={r.description}>
                        {r.description || L.table.dash}
                      </Td>
                      <Td>{typeChip(r.type)}</Td>
                      <Td className="text-right">{r.type === "decimal" ? fmtNum(r.minValue, locale) : L.table.dash}</Td>
                      <Td className="text-right">{r.type === "decimal" ? fmtNum(r.maxValue, locale) : L.table.dash}</Td>
                      <Td className="text-right">{fmtDefault(r)}</Td>
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
                            onClick={() => onDelete(r.id || r._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );

                  const detailsRow =
                    expandedId === (r.id || r._id) ? (
                      <tr key={(r.id || r._id) + "-details"}>
                        <td colSpan={10} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
<KV label={L.details.id} icon={Hash}>{r.id || r._id}</KV>
<KV label={L.details.code} icon={Hash}>{r.code}</KV>
<KV label={L.details.type} icon={Tag}>{typeChip(r.type, L)}</KV>
<KV label={L.details.defaultValue} icon={Equal}>{fmtDefault(r)}</KV>
<KV label={L.details.active} icon={ToggleRight}>{activeChip(r.active, L)}</KV>
<KV label={L.details.created} icon={Calendar}>
  {r.createdAt ? new Date(r.createdAt).toLocaleString(locale) : L.table.dash}
</KV>
<KV label={L.details.updated} icon={Calendar}>
  {r.updatedAt ? new Date(r.updatedAt).toLocaleString(locale) : L.table.dash}
</KV>
{r.type === "decimal" && (
  <>
    <KV label={L.details.min} icon={ArrowDown01}>{fmtNum(r.minValue, locale)}</KV>
    <KV label={L.details.max} icon={ArrowUp01}>{fmtNum(r.maxValue, locale)}</KV>
  </>
)}
<div className="md:col-span-3">
  <KV label={L.details.description} icon={FileText}>{r.description || L.table.dash}</KV>
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
          <ParameterForm
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
// replace KV with icon-aware version
function KV({ label, icon: Icon, children }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 text-slate-500 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      <div className="col-span-2 font-medium">{children}</div>
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
function Modal({ children, onClose, title = "Parameter" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-[75vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function typeChip(vRaw, L) {
  const v = String(vRaw || "decimal").toLowerCase();
  const label = (L?.controls?.types && L.controls.types[v]) ? L.controls.types[v] : v;
  const cls =
    v === "text"
      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
      : v === "boolean"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-sky-50 text-sky-700 border border-sky-200";
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}
function activeChip(on, L) {
  const txt = on ? (L?.controls?.statuses?.active || "Active") 
                 : (L?.controls?.statuses?.inactive || "Inactive");
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

function fmtNum(v, locale) {
  if (v == null || v === "") return "0";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString(locale, { maximumFractionDigits: 6 }) : "0";
}
function fmtDefault(r) {
  if (r.type === "decimal") return fmtNum(r.defaultValue ?? r.defaultValueDecimal, undefined);
  if (r.type === "boolean") return r.defaultValue === true ? "true" : r.defaultValue === false ? "false" : "—";
  return r.defaultValue || r.defaultValueText || "—";
}

/* ---------- Form ---------- */
function ParameterForm({ initial, onSubmit, onCancel, L }) {
  const isEdit = Boolean(initial?.id || initial?._id);

  const [code, setCode] = useState(initial?.code || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "decimal");
  const [minValue, setMinValue] = useState(initial?.minValue ?? "");
  const [maxValue, setMaxValue] = useState(initial?.maxValue ?? "");
  const [defaultValue, setDefaultValue] = useState(
    initial?.defaultValue ??
      initial?.defaultValueDecimal ??
      initial?.defaultValueText ??
      (typeof initial?.defaultValueBoolean === "boolean" ? initial.defaultValueBoolean : "")
  );
  const [active, setActive] = useState(initial?.active ?? true);

  // Reset numeric fields when switching type
  useEffect(() => {
    if (type !== "decimal") {
      setMinValue("");
      setMaxValue("");
      if (type === "boolean") setDefaultValue(String(Boolean(defaultValue)) === "true");
      if (type === "text") setDefaultValue(typeof defaultValue === "string" ? defaultValue : "");
    } else {
      if (typeof defaultValue === "boolean") setDefaultValue(defaultValue ? "1" : "0");
    }
    // eslint-disable-next-line
  }, [type]);

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      alert(L.modal.required);
      return;
    }
    const payload = {
      code: code.trim(),
      description: description.trim(),
      type,
      active: Boolean(active),
    };

    if (type === "decimal") {
      payload.minValue = minValue === "" ? null : Number(minValue);
      payload.maxValue = maxValue === "" ? null : Number(maxValue);
      payload.defaultValue = defaultValue === "" ? null : Number(defaultValue);
    } else if (type === "boolean") {
      payload.defaultValue = Boolean(defaultValue);
    } else {
      payload.defaultValue = (defaultValue ?? "").toString();
    }

    onSubmit(payload);
  };

  // Choose icon for type selector and default field
  const typeIcon = type === "decimal" ? Calculator : type === "text" ? TypeIcon : ToggleRight;
  const defaultIcon = Equal;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<Field label={L.modal.fields.code} icon={Hash}>
  <input
    className="w-full rounded-lg border border-slate-300 px-3 py-2"
    value={code}
    onChange={(e) => setCode(e.target.value)}
  />
</Field>
        <Field label={L.modal.fields.type} icon={typeIcon}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="decimal">decimal</option>
            <option value="text">text</option>
            <option value="boolean">boolean</option>
          </select>
        </Field>

        <Field label={L.modal.fields.description} icon={FileText}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

        {/* Decimal-only fields */}
        {type === "decimal" && (
          <>
            <Field label={L.modal.fields.min} icon={ArrowDown01}>
              <input
                type="number"
                step="0.000001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="e.g. 0"
              />
            </Field>

            <Field label={L.modal.fields.max} icon={ArrowUp01}>
              <input
                type="number"
                step="0.000001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="e.g. 100"
              />
            </Field>
          </>
        )}

        {/* Default value (varies by type) */}
        <Field label={L.modal.fields.defaultValue} icon={defaultIcon}>
          {type === "decimal" ? (
            <input
              type="number"
              step="0.000001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g. 10"
            />
          ) : type === "boolean" ? (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={String(Boolean(defaultValue))}
              onChange={(e) => setDefaultValue(e.target.value === "true")}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={defaultValue ?? ""}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="text default"
            />
          )}
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

/* Upgraded Field with optional icon support */
function Field({ label, icon: Icon, children }) {
  // If the child is an input/select/textarea, add left padding when icon exists
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          Icon ? " pl-9" : "",
        ].join(" "),
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
