// src/pages/Items.jsx
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
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Hash,
  Tag,
  FileText,
  Ruler,
  Boxes,
  DollarSign,
  Calendar,
  Globe,              // NEW
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

// helper: handle id or _id from API
const getId = (row) => row?._id || row?.id;

export default function Items() {
  const { t, locale } = useI18n();
  const I = t?.items || {};

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [ipg, setIpg] = useState(""); // inventory posting group
  const [origin, setOrigin] = useState(""); // NEW: Country of Origin filter
  const [active, setActive] = useState(""); // true/false/""
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [type, ipg, origin, active, minPrice, maxPrice].filter(Boolean).length; // NEW include origin

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const L = {
    pageTitle: I.pageTitle || "Items",
    controls: {
      searchPlaceholder: I?.controls?.searchPlaceholder || "Search by No/Description…",
      searchBtn: I?.controls?.searchBtn || "Search",
      filters: I?.controls?.filters || "Filters",
      addBtn: I?.controls?.addBtn || "Add item",
      allTypes: I?.controls?.allTypes || "All types",
      allStatuses: I?.controls?.allStatuses || "All statuses",
      allOrigins: I?.controls?.allOrigins || "All origins", // NEW
      statuses: {
        active: I?.controls?.statuses?.active || "Active",
        inactive: I?.controls?.statuses?.inactive || "Inactive",
        closed: I?.controls?.statuses?.closed || "Closed",
      },
    },
    table: {
      exp: "",
      no: I?.table?.no || "No.",
      no2: I?.table?.no2 || "No. 2",
      type: I?.table?.type || "Type",
      description: I?.table?.description || "Description",
      unit: I?.table?.unit || "Base UoM",
      ipg: I?.table?.ipg || "Inventory Posting Group",
      countryOfOrigin: I?.table?.countryOfOrigin || "Country of Origin", // NEW
      unitPrice: I?.table?.unitPrice || "Unit Price",
      status: I?.table?.status || "Status",
      created: I?.table?.created || "Created",
      actions: I?.table?.actions || "",
      loading: I?.table?.loading || "Loading…",
      empty: I?.table?.empty || "No results",
      dash: "—",
    },
    details: {
      id: I?.details?.id || "ID",
      no: I?.details?.no || "No.",
      no2: I?.details?.no2 || "No. 2",
      type: I?.details?.type || "Type",
      description: I?.details?.description || "Description",
      description2: I?.details?.description2 || "Description 2",
      baseUnitOfMeasure: I?.details?.baseUnitOfMeasure || "Base Unit of Measure",
      inventoryPostingGroup: I?.details?.inventoryPostingGroup || "Inventory Posting Group",
      countryOfOrigin: I?.details?.countryOfOrigin || "Country of Origin", // NEW
      unitPrice: I?.details?.unitPrice || "Unit Price",
      active: I?.details?.active || "Active",
      created: I?.details?.created || "Created",
      updated: I?.details?.updated || "Updated",
    },
    modal: {
      titleNew: I?.modal?.titleNew || "Add item",
      titleEdit: I?.modal?.titleEdit || "Edit item",
      add: I?.modal?.add || "Add",
      save: I?.modal?.save || "Save",
      cancel: I?.modal?.cancel || "Cancel",
      fields: {
        no: I?.modal?.fields?.no || "No.",
        no2: I?.modal?.fields?.no2 || "No. 2",
        type: I?.modal?.fields?.type || "Type",
        description: I?.modal?.fields?.description || "Description",
        description2: I?.modal?.fields?.description2 || "Description 2",
        unit: I?.modal?.fields?.unit || "Base Unit of Measure",
        ipg: I?.modal?.fields?.ipg || "Inventory Posting Group",
        countryOfOrigin: I?.modal?.fields?.countryOfOrigin || "Country of Origin", // NEW
        unitPrice: I?.modal?.fields?.unitPrice || "Unit Price",
        active: I?.modal?.fields?.active || "Active",
      },
      required: I?.modal?.required || "Please fill required fields.",
    },
    alerts: {
      requestFail: I?.alerts?.requestFail || "Request failed.",
      loadFail: I?.alerts?.loadFail || "Failed to load items.",
      deleteConfirm: I?.alerts?.deleteConfirm || "Are you sure to delete this item?",
      deleted: I?.alerts?.deleted || "Deleted.",
      created: I?.alerts?.created || "Created.",
      updated: I?.alerts?.updated || "Updated.",
    },
    footer: {
      prev: I?.footer?.prev || "Prev",
      next: I?.footer?.next || "Next",
      perPage: (n) => (I?.footer?.perPage ? I.footer.perPage(n) : `${n}/page`),
      meta:
        I?.footer?.meta ||
        ((total, page, pages) => `Total ${total.toLocaleString()} • Page ${page}/${pages || 1}`),
    },
    a11y: {
      toggleDetails: I?.a11y?.toggleDetails || "Toggle details",
    },
  };

  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

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
      if (ipg) params.set("ipg", ipg);
      if (origin) params.set("origin", origin); // NEW
      if (active !== "") params.set("active", active);
      if (minPrice !== "") params.set("minPrice", minPrice);
      if (maxPrice !== "") params.set("maxPrice", maxPrice);

      const res = await fetch(`${API}/api/mitems?${params.toString()}`);
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
  }, [page, limit, type, ipg, origin, active, minPrice, maxPrice, sortBy, sortDir]); // NEW include origin

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/mitems/${id}`, { method: "DELETE" });
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

  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;

    const keyMap = {
      no: "no",
      no2: "no2",
      type: "type",
      description: "description",
      baseUnitOfMeasure: "baseUnitOfMeasure",
      inventoryPostingGroup: "inventoryPostingGroup",
      countryOfOrigin: "countryOfOrigin", // NEW
      unitPrice: "unitPrice",
      active: "active",
      createdAt: "createdAt",
    };
    const k = keyMap[sortBy] || sortBy;

    const get = (r) => {
      const v = r?.[k];
      if (k === "unitPrice") return Number(v) || 0;
      if (k === "createdAt") return v ? new Date(v).getTime() : 0;
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

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing && getId(editing));
    const url = isEdit ? `${API}/api/mitems/${getId(editing)}` : `${API}/api/mitems`;
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

  const isEditing = Boolean(editing && getId(editing)); // for modal title

  return (
    <div className="space-y-4">
      {notice && (
        <Toast type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Toast>
      )}

      {/* Search & Filters */}
      <form onSubmit={onSearch} className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
        {/* Row 1 */}
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
            aria-controls="items-filters-panel"
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

        {/* Row 2: Filters */}
        <div
          id="items-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-3 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          {/* Type */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{L.controls.allTypes}</option>
            <option value="Item">Item</option>
            <option value="Service">Service</option>
          </select>

          {/* Inventory Posting Group */}
          <input
            value={ipg}
            onChange={(e) => {
              setIpg(e.target.value);
              setPage(1);
            }}
            placeholder={L.table.ipg}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          />

          {/* Country of Origin (NEW) */}
          <input
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setPage(1);
            }}
            placeholder={L.table.countryOfOrigin}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          />

          {/* Active */}
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 md:col-span-3"
          >
            <option value="">{L.controls.allStatuses}</option>
            <option value="true">{L.controls.statuses.active}</option>
            <option value="false">{L.controls.statuses.inactive}</option>
          </select>

          {/* Price range */}
          <div className="grid grid-cols-2 gap-2 md:col-span-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={`${L.table.unitPrice} min`}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={`${L.table.unitPrice} max`}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </div>
        </div>

        {/* Active filter chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {type && <Chip label={`${L.table.type}: ${type}`} onClear={() => setType("")} clearTitle={L.modal.cancel} />}
          {ipg && <Chip label={`${L.table.ipg}: ${ipg}`} onClear={() => setIpg("")} clearTitle={L.modal.cancel} />}
          {origin && (
            <Chip
              label={`${L.table.countryOfOrigin}: ${origin}`}
              onClear={() => setOrigin("")}
              clearTitle={L.modal.cancel}
            />
          )}
          {active !== "" && (
            <Chip
              label={`${L.table.status}: ${active === "true" ? L.controls.statuses.active : L.controls.statuses.inactive}`}
              onClear={() => setActive("")}
              clearTitle={L.modal.cancel}
            />
          )}
          {minPrice !== "" && (
            <Chip label={`${L.table.unitPrice} ≥ ${minPrice}`} onClear={() => setMinPrice("")} clearTitle={L.modal.cancel} />
          )}
          {maxPrice !== "" && (
            <Chip label={`${L.table.unitPrice} ≤ ${maxPrice}`} onClear={() => setMaxPrice("")} clearTitle={L.modal.cancel} />
          )}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
  <table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-600">
      <tr>
        {[
          <Th key="exp" />,
          <SortableTh key="no" id="no" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.no}</SortableTh>,
          <SortableTh key="no2" id="no2" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.no2}</SortableTh>,
          <SortableTh key="type" id="type" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.type}</SortableTh>,
          <SortableTh key="description" id="description" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.description}</SortableTh>,
          <SortableTh key="baseUnitOfMeasure" id="baseUnitOfMeasure" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.unit}</SortableTh>,
          <SortableTh key="inventoryPostingGroup" id="inventoryPostingGroup" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.ipg}</SortableTh>,
          <SortableTh key="countryOfOrigin" id="countryOfOrigin" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.countryOfOrigin}</SortableTh>,
          <SortableTh key="unitPrice" id="unitPrice" className="text-right" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.unitPrice}</SortableTh>,
          <SortableTh key="active" id="active" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.status}</SortableTh>,
          <SortableTh key="createdAt" id="createdAt" {...{ sortBy, sortDir, onSort }} title={L.a11y?.sort || "Sort"}>{L.table.created}</SortableTh>,
          <Th key="actions" className="text-right">{L.table.actions}</Th>,
        ]}
      </tr>
    </thead><tbody>
      {loading ? (
        <tr>
          <td colSpan={13} className="p-6 text-center text-slate-500">{L.table.loading}</td>
        </tr>
      ) : rows.length === 0 ? (
        <tr>
          <td colSpan={13} className="p-6 text-center text-slate-500">{L.table.empty}</td>
        </tr>
      ) : (
        rows.flatMap((r) => {
          const id = getId(r);
          const mainRow = (
            <tr key={id} className="border-t">
              <Td className="w-8">
                <button
                  className="p-1 rounded hover:bg-slate-100"
                  onClick={() => setExpandedId((cur) => (cur === id ? null : id))}
                  aria-label={L.a11y.toggleDetails}
                  title={L.a11y.toggleDetails}
                >
                  {expandedId === id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </Td>
              <Td className="font-mono">{r.no}</Td>
              <Td className="font-mono">{r.no2 || L.table.dash}</Td>
              <Td>{typeChip(r.type)}</Td>
              <Td className="max-w-[340px] truncate" title={r.description}>{r.description || L.table.dash}</Td>
              <Td>{r.baseUnitOfMeasure || L.table.dash}</Td>
              <Td>{r.inventoryPostingGroup || L.table.dash}</Td>
              <Td className="flex items-center gap-1"><Globe size={14} className="text-slate-400" />{r.countryOfOrigin || L.table.dash}</Td>
              <Td className="text-right">{fmtPrice(r.unitPrice)}</Td>
              <Td>{activeChip(r.active, L)}</Td>
              <Td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : L.table.dash}</Td>
              <Td>
                <div className="flex justify-end gap-2 pr-3">
                  <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => { setEditing(r); setOpen(true); }}>
                    <Pencil size={16} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </Td>
            </tr>
          );

          const detailsRow = expandedId === id ? (
            <tr key={`${id}-details`}>
              <td colSpan={13} className="bg-slate-50 border-t">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                  <KV label={L.details.id} icon={Hash}>{id || L.table.dash}</KV>
                  <KV label={L.details.no} icon={Hash}>{r.no || L.table.dash}</KV>
                  <KV label={L.details.no2} icon={Hash}>{r.no2 || L.table.dash}</KV>
                  <KV label={L.details.type} icon={Tag}>{typeChip(r.type)}</KV>
                  <KV label={L.details.baseUnitOfMeasure} icon={Ruler}>{r.baseUnitOfMeasure || L.table.dash}</KV>
                  <KV label={L.details.inventoryPostingGroup} icon={Boxes}>{r.inventoryPostingGroup || L.table.dash}</KV>
                  <KV label={L.details.countryOfOrigin} icon={Globe}>{r.countryOfOrigin || L.table.dash}</KV>
                  <KV label={L.details.unitPrice} icon={DollarSign}>{fmtPrice(r.unitPrice)}</KV>
                  <KV label={L.details.active} icon={CheckCircle2}>{activeChip(r.active, L)}</KV>
                  <div className="md:col-span-3">
                    <KV label={L.details.description} icon={FileText}>{r.description || L.table.dash}</KV>
                  </div>
                  <div className="md:col-span-3">
                    <KV label={L.details.description2} icon={FileText}>{r.description2 || L.table.dash}</KV>
                  </div>
                  <KV label={L.details.created} icon={Calendar}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString(locale) : L.table.dash}
                  </KV>
                  <KV label={L.details.updated} icon={Calendar}>
                    {r.updatedAt ? new Date(r.updatedAt).toLocaleString(locale) : L.table.dash}
                  </KV>
                </div>
              </td>
            </tr>
          ) : null;

          return [mainRow, detailsRow].filter(Boolean);
        })
      )}
    </tbody></table>
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
          title={isEditing ? L.modal.titleEdit : L.modal.titleNew}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <ItemForm
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

/* ---------- Small atoms ---------- */
function Th({ children, className = "" }) {
  return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
// icon-aware KV
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

function SortableTh({ id, sortBy, sortDir, onSort, children, className = "", title }) {
  const active = sortBy === id;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th aria-sort={ariaSort} className={`text-left px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50"
        title={title}
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
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 hover:bg-white"
        title={clearTitle}
        aria-label={clearTitle}
      >
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
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}

function Modal({ children, onClose, title = "Item", fullscreen = false, backdrop = "dim" }) {
  const [isFull, setIsFull] = React.useState(Boolean(fullscreen));

  // ESC closes, "f" toggles fullscreen
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key.toLowerCase() === "f") setIsFull((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Backdrop modes: "dim" | "transparent" | "blur" | "none"
  let backdropNode = null;
  if (backdrop === "dim") {
    backdropNode = <div className="absolute inset-0 bg-black/50" onClick={onClose} />;
  } else if (backdrop === "transparent") {
    backdropNode = <div className="absolute inset-0" onClick={onClose} />;
  } else if (backdrop === "blur") {
    backdropNode = <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />;
  }

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull ? "w-screen h-screen max-w-none rounded-none"
           : "w-full max-w-3xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull
    ? "p-4 h-[calc(100vh-52px)] overflow-auto" // ~52px top bar
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
        {/* Top bar with expand/close; double-click toggles fullscreen */}
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
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title="Close"
              aria-label="Close"
            >
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
function typeChip(typeRaw) {
  const v = String(typeRaw || "Item");
  const cls =
    v === "Service"
      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
      : "bg-sky-50 text-sky-700 border border-sky-200";
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{v}</span>;
}
function activeChip(on, L) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        on
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-slate-100 text-slate-700 border border-slate-200"
      }`}
    >
           {on ? (L?.controls?.statuses?.active ?? "Active")
          : (L?.controls?.statuses?.inactive ?? "Inactive")}
    </span>
  );
}
function fmtPrice(v) {
  const n =
    typeof v === "number"
      ? v
      : v && typeof v === "object" && v.$numberDecimal
      ? Number(v.$numberDecimal)
      : Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- Form (NEW field wired) ---------- */
function ItemForm({ initial, onSubmit, onCancel, L }) {
  const isEdit = Boolean(initial && (initial._id || initial.id));

  const [no, setNo] = useState(initial?.no || "");
  const [no2, setNo2] = useState(initial?.no2 || "");
  const [type, setType] = useState(initial?.type || "Item");
  const [description, setDescription] = useState(initial?.description || "");
  const [description2, setDescription2] = useState(initial?.description2 || "");
  const [baseUnitOfMeasure, setBaseUnitOfMeasure] = useState(initial?.baseUnitOfMeasure || "");
  const [inventoryPostingGroup, setInventoryPostingGroup] = useState(initial?.inventoryPostingGroup || "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initial?.countryOfOrigin || ""); // NEW
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0);
  const [active, setActive] = useState(initial?.active ?? true);

  const submit = (e) => {
    e.preventDefault();
    if (!no.trim()) {
      alert(L.modal.required);
      return;
    }
    const payload = {
      no: no.trim(),
      no2: no2.trim() || null,
      type,
      description: description.trim() || null,
      description2: description2.trim() || null,
      baseUnitOfMeasure: baseUnitOfMeasure.trim() || null,
      inventoryPostingGroup: inventoryPostingGroup.trim() || null,
      countryOfOrigin: countryOfOrigin.trim() || null, // NEW
      unitPrice: Number(unitPrice) || 0,
      active: Boolean(active),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={L.modal.fields.no} icon={Hash}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
            value={no}
            onChange={(e) => setNo(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.no2} icon={Hash}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
            value={no2}
            onChange={(e) => setNo2(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.type} icon={Tag}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Item">Item</option>
            <option value="Service">Service</option>
          </select>
        </Field>

        <Field label={L.modal.fields.unit} icon={Ruler}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={baseUnitOfMeasure}
            onChange={(e) => setBaseUnitOfMeasure(e.target.value)}
            placeholder="e.g., PCS, KG, TON"
          />
        </Field>

        <Field label={L.modal.fields.ipg} icon={Boxes}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={inventoryPostingGroup}
            onChange={(e) => setInventoryPostingGroup(e.target.value)}
            placeholder="e.g., RAW, FINISHED"
          />
        </Field>

        {/* NEW: Country of Origin */}
        <Field label={L.modal.fields.countryOfOrigin} icon={Globe}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={countryOfOrigin}
            onChange={(e) => setCountryOfOrigin(e.target.value)}
            placeholder="e.g., PL, DE, CN"
          />
        </Field>

        <Field label={L.modal.fields.unitPrice} icon={DollarSign}>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              $
            </span>
          </div>
        </Field>

        <Field label={L.modal.fields.active} icon={CheckCircle2}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={String(active)}
            onChange={(e) => setActive(e.target.value === "true")}
          >
            <option value="true">{L.controls.statuses.active}</option>
            <option value="false">{L.controls.statuses.inactive}</option>
          </select>
        </Field>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={L.modal.fields.description} icon={FileText}>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label={L.modal.fields.description2} icon={FileText}>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              rows={3}
              value={description2}
              onChange={(e) => setDescription2(e.target.value)}
            />
          </Field>
        </div>
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

function Field({ label, icon: Icon, error, children }) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          Icon ? " pl-9" : "",
          error ? " border-red-300 focus:border-red-400" : "",
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
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}
