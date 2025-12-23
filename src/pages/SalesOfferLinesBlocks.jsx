// src/pages/SalesOfferLinesBlocks.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Hash,
  FileText,
  Calendar as CalendarIcon,
  Package,
  DollarSign,
  Percent,
  Truck,
  User as UserIcon,
  Layers,
  ClipboardList,
  MapPin,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { useI18n as _useI18n } from "../helpers/i18n";
const useI18nSafe = _useI18n || (() => ({ t: null, locale: undefined }));

/* ---------------------------------------------------
   Status helpers (canonicalize + labels) — sales
--------------------------------------------------- */
const STATUS_CANON_MAP = {
  new: "new",
  on_hold: "on-hold",
  "on-hold": "on-hold",
  accepted: "accepted",
  approved: "approved",
  matched: "matched",
  mached: "matched",
  shipped: "shipped",
  invoiced: "invoiced",
  paid: "paid",
  canceled: "canceled",
};
const STATUS_LABELS = {
  new: "New",
  "on-hold": "On Hold",
  accepted: "Accepted",
  approved: "Approved",
  matched: "Matched",
  shipped: "Shipped",
  invoiced: "Invoiced",
  paid: "Paid (Closed)",
  canceled: "Canceled",
};
function canonStatus(s) {
  const k = String(s || "").toLowerCase();
  return STATUS_CANON_MAP[k] || k;
}
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const LINE_TYPES = [
  { id: "item", label: "Item" },
  { id: "description", label: "Description" },
];

const UOMS = ["SZT", "M2", "M3", "T", "KG"];

// Sort keys supported by backend router (see SalesOfferLinesBlocks.js)
const SERVER_SORT_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "lineNo",
  "block",
  "status",
  "itemNo",
  "quantity",
  "unitPrice",
  "lineValue",
]);

/* -----------------------
   API base (shared)
----------------------- */
const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

/* ===== session helpers ===== */
function getSession() {
  try {
    if (window.__APP_SESSION__) return window.__APP_SESSION__;
    const raw = localStorage.getItem("session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getUserCode(fallback = "web") {
  const sess = getSession();
  return (
    (window.__APP_USER__ &&
      (window.__APP_USER__.code || window.__APP_USER__.username)) ||
    (sess && (sess.code || sess.username || sess.email)) ||
    localStorage.getItem("userCode") ||
    fallback
  );
}

function formatDate(s, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(undefined) : dash;
  } catch {
    return s || dash;
  }
}
function fmtDOT(n, decimals = 2, loc) {
  const val = Number(n);
  if (!isFinite(val)) return "—";
  return val.toLocaleString(loc || "de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
}

// Prefer sales-side names for label
function docLabel(d) {
  const parts = [d.documentNo];
  if (d.sellCustomerName) parts.push(d.sellCustomerName);
  else if (d.billCustomerName) parts.push(d.billCustomerName);
  else if (d.locationName) parts.push(d.locationName);
  else if (d.brokerName) parts.push(d.brokerName);
  if (d.documentDate) parts.push(new Date(d.documentDate).toLocaleDateString());
  return parts.filter(Boolean).join(" — ");
}

/* ==============================
   Small UI bits (Toast, etc.)
=============================== */
function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}
    >
      <span className="mr-auto">{children}</span>
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-700"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

function StatusBadge({ value }) {
  const k = String(value || "new").toLowerCase();
  const v = STATUS_CANON_MAP[k] || k;
  const label = STATUS_LABELS[v] || v;
  const cls =
    v === "new"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : v === "on-hold"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : v === "accepted"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : v === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : v === "matched"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : v === "shipped"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : v === "invoiced"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : v === "paid"
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : v === "canceled"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

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

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-slate-600">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function SortableTh({ id, sortBy, sortDir, onSort, children, className = "" }) {
  const active = sortBy === id;
  const ariaSort = active
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <th
      aria-sort={ariaSort}
      className={`text-left px-4 py-3 font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50"
        title="Sort"
      >
        <span>{children}</span>
        <span className={`text-xs ${active ? "opacity-100" : "opacity-60"}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/* =========================================
   PAGE — SalesOfferLinesBlocksPage
========================================= */
export default function SalesOfferLinesBlocksPage() {
  // expander + line + block + doc + status + type + item + uom
  // + unitPrice + qty + lineValue + transport + created + updated + actions
  const COL_COUNT = 16;

  const { t, locale } = useI18nSafe();
  const S =
    (t && t.salesOfferLinesBlocks) || {
      controls: {
        searchPlaceholder: "Search item/params…",
        searchBtn: "Search",
        addBtn: "New Block",
        filters: "Filters",
        docsLoading: "Loading documents…",
        allDocuments: "All documents",
        allStatuses: "All statuses",
        allLineTypes: "All line types",
        itemNoPlaceholder: "Item No.",
        lineNoPlaceholder: "Line No.",
        blockPlaceholder: "Block No.",
      },
      table: {
        lineNo: "Line No.",
        block: "Block",
        documentNo: "Document No.",
        status: "Status",
        type: "Type",
        item: "Item",
        uom: "UOM",
        unitPrice: "Unit Price",
        qty: "Qty",
        lineValue: "Line Value",
        transport: "Transport",
        created: "Created",
        updated: "Updated",
        actions: "Actions",
        loading: "Loading…",
        empty: "No blocks",
      },
      a11y: { toggleDetails: "Toggle details" },
      details: {
        core: "Core",
        amounts: "Amounts",
        parties: "Parties",
        audit: "Audit",
        params: "Parameters",
        kv: {
          lineNo: "Line No.",
          block: "Block",
          documentNo: "Document No.",
          documentId: "Document ID",
          status: "Status",
          type: "Type",
          itemNo: "Item No.",
          uom: "Unit of Measure",
          serviceDate: "Service / Delivery Date",
          requestedDeliveryDate: "Requested Delivery",
          promisedDeliveryDate: "Promised Delivery",
          shipmentDate: "Shipment Date",
          documentValidityDate: "Doc Validity Date",
          documentValidityHour: "Doc Validity Hour",
          unitPrice: "Unit Price",
          quantity: "Quantity",
          lineValue: "Line Value",
          tollCost: "Toll Cost",
          driverCost: "Driver Cost",
          vehicleCost: "Vehicle Cost",
          additionalCosts: "Additional Costs",
          costMarginPct: "Cost Margin %",
          transportCost: "Transport Cost",
          buyVendorNo: "Buy Customer No.",
          payVendorNo: "Bill-to Customer No.",
          locationNo: "Location No.",
          locationNo: "Location No.",
          locationName: "Location Name",
          locationAddress: "Location Address",
          locationAddress2: "Location Address 2",
          locationPostCode: "Location Post Code",
          locationCity: "Location City",
          locationCountryCode: "Location Country / Region",
          createdBy: "Created By",
          createdAt: "Created At",
          modifiedBy: "Modified By",
          modifiedAt: "Modified At",
          param: (i) => `Param${i}`,
        },
      },
      footer: {
        meta: (total, page, pages) =>
          `Total: ${total} • Page ${page} of ${pages || 1}`,
        perPage: (n) => `${n} / page`,
        prev: "Prev",
        next: "Next",
      },
      modal: {
        titleEdit: "Edit Sales Offer Block",
        titleNew: "New Sales Offer Block",
      },
    };

  // filters / paging
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [status, setStatus] = useState("");
  const [lineType, setLineType] = useState("");
  const [itemNo, setItemNo] = useState("");
  const [lineNoFilter, setLineNoFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    documentNo,
    status,
    lineType,
    itemNo,
    lineNoFilter,
    blockFilter,
  ].filter(Boolean).length;

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const [sortBy, setSortBy] = useState("lineNo");
  const [sortDir, setSortDir] = useState("asc");
  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  // data
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  // UI
  const [expandedId, setExpandedId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  /* fetch documents for picker (shared header list) */
  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      setDocsLoading(true);
      try {
        const res = await fetch(
          `${API}/api/sales-offers?limit=1000&sortBy=createdAt&sortDir=desc`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const raw = Array.isArray(json?.data) ? json.data : [];
        const normalized = raw.map((d) => ({
          ...d,
          documentNo: d.documentNo || d.no || "",
        }));
        const seen = new Set();
        const available = normalized.filter((d) => {
          if (!d.documentNo) return false;
          if (seen.has(d.documentNo)) return false;
          seen.add(d.documentNo);
          return true;
        });

        if (!cancelled) setDocs(available);
      } catch (e) {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    }
    loadDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  /* fetch sales blocks */
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (SERVER_SORT_KEYS.has(String(sortBy))) {
        params.set("sortBy", String(sortBy));
        params.set(
          "sortDir",
          String(sortDir).toLowerCase() === "desc" ? "desc" : "asc"
        );
      }

      if (q) params.set("q", q);
      if (documentNo) params.set("documentNo", documentNo);
      if (status) params.set("status", canonStatus(status));
      if (lineType) params.set("lineType", String(lineType).toLowerCase());
      if (itemNo) params.set("itemNo", itemNo);
      if (lineNoFilter) params.set("lineNo", Number(lineNoFilter) || 0);
      if (blockFilter) params.set("block", Number(blockFilter) || 0);

      const res = await fetch(
        `${API}/api/sales-offer-lines-blocks?${params.toString()}`
      );
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", "Failed to load blocks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [
    page,
    limit,
    status,
    lineType,
    itemNo,
    sortBy,
    sortDir,
    documentNo,
    lineNoFilter,
    blockFilter,
  ]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

const onDelete = async (_id) => {
  if (!window.confirm("Delete this block?")) return;
  try {
    const res = await fetch(`${API}/api/sales-offer-lines-blocks/${_id}`, {
      method: "DELETE",
    });
    if (res.status === 204) {
      if (expandedId === _id) setExpandedId(null);

      // ✅ remove from selection
      setSelectedSet((prev) => {
        const next = new Set(prev);
        next.delete(_id);
        return next;
      });

      showNotice("success", "Block deleted.");
      fetchData();
    } else {
      const json = await res.json().catch(() => ({}));
      showNotice("error", json?.message || "Request failed");
    }
  } catch {
    showNotice("error", "Request failed");
  }
};

  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const k = sortBy;
    const val = (r) => {
      const v = r?.[k];
      if (
        k === "createdAt" ||
        k === "updatedAt" ||
        k === "dateCreated" ||
        k === "dateModified"
      ) {
        return v ? new Date(v).getTime() : 0;
      }
      return typeof v === "number" ? v : (v ?? "").toString().toLowerCase();
    };
    arr.sort((a, b) => {
      const av = val(a),
        bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [data.data, sortBy, sortDir]);


  const [selectedSet, setSelectedSet] = useState(() => new Set());
const selectedCount = selectedSet.size;

const currentPageIds = useMemo(
  () => (rows || []).map((r) => r?._id).filter(Boolean),
  [rows]
);

const allOnPageSelected =
  currentPageIds.length > 0 && currentPageIds.every((id) => selectedSet.has(id));

const toggleOne = (id) => {
  if (!id) return;
  setSelectedSet((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAllOnPage = () => {
  setSelectedSet((prev) => {
    const next = new Set(prev);
    const allSelected =
      currentPageIds.length > 0 && currentPageIds.every((id) => next.has(id));

    currentPageIds.forEach((id) => {
      if (allSelected) next.delete(id);
      else next.add(id);
    });

    return next;
  });
};

const clearSelection = () => setSelectedSet(new Set());

const onBulkDelete = async () => {
  if (selectedSet.size === 0) return;
  if (!window.confirm(`Delete ${selectedSet.size} selected block(s)?`)) return;

  try {
    const res = await fetch(`${API}/api/sales-offer-lines-blocks/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedSet) }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      showNotice("error", json?.message || "Bulk delete failed");
      return;
    }

    // collapse if expanded row was deleted
    if (expandedId && selectedSet.has(expandedId)) setExpandedId(null);

    showNotice("success", `Deleted ${json?.deleted || 0} block(s).`);
    clearSelection();
    fetchData();
  } catch {
    showNotice("error", "Bulk delete failed");
  }
};



return (
  <div className="space-y-4">
    {notice && (
      <Toast type={notice.type} onClose={() => setNotice(null)}>
        {notice.text}
      </Toast>
    )}

    {/* Controls */}
    <form
      onSubmit={onSearch}
      className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={S.controls.searchPlaceholder}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            title={S.controls.searchBtn}
            aria-label={S.controls.searchBtn}
          >
            <Search size={14} />
          </button>
        </div>

        {/* bulk actions */}
        {selectedCount > 0 && (
          <div className="order-1 sm:order-none sm:ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-600">
              Selected: <b>{selectedCount}</b>
            </span>

            <button
              type="button"
              onClick={onBulkDelete}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              title="Delete selected"
            >
              <Trash2 size={16} />
              Delete selected
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
              title="Clear selection"
            >
              <X size={16} />
              Clear
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
          className="order-1 sm:order-none inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
        >
          <Plus size={16} />
          {S.controls.addBtn}
        </button>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
          aria-expanded={showFilters}
          aria-controls="solb-filters-panel"
        >
          <SlidersHorizontal size={16} className="opacity-70" />
          {S.controls.filters}
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Row */}
      <div
        id="solb-filters-panel"
        className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-6 ${
          showFilters ? "grid" : "hidden md:grid"
        }`}
      >
        <select
          value={documentNo}
          onChange={(e) => {
            setDocumentNo(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">
            {docsLoading ? S.controls.docsLoading : S.controls.allDocuments}
          </option>
          {docs.map((d) => (
            <option key={d._id} value={d.documentNo}>
              {docLabel(d)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(canonStatus(e.target.value));
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">{S.controls.allStatuses}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={lineType}
          onChange={(e) => {
            setLineType(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">{S.controls.allLineTypes}</option>
          {LINE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          value={itemNo}
          onChange={(e) => {
            setItemNo(e.target.value);
            setPage(1);
          }}
          placeholder={S.controls.itemNoPlaceholder}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        />

        <input
          value={lineNoFilter}
          onChange={(e) => {
            setLineNoFilter(e.target.value);
            setPage(1);
          }}
          placeholder={S.controls.lineNoPlaceholder}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        />

        <input
          value={blockFilter}
          onChange={(e) => {
            setBlockFilter(e.target.value);
            setPage(1);
          }}
          placeholder={S.controls.blockPlaceholder}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        />
      </div>
    </form>

    {/* Table */}
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {/* selection */}
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label="Select all on page"
                />
              </Th>

              {/* expander */}
              <Th />

              <SortableTh id="lineNo" {...{ sortBy, sortDir, onSort }}>
                {S.table.lineNo}
              </SortableTh>
              <SortableTh id="block" {...{ sortBy, sortDir, onSort }}>
                {S.table.block}
              </SortableTh>
              <Th>{S.table.documentNo}</Th>
              <SortableTh id="status" {...{ sortBy, sortDir, onSort }}>
                {S.table.status}
              </SortableTh>
              <Th>{S.table.type}</Th>
              <SortableTh id="itemNo" {...{ sortBy, sortDir, onSort }}>
                {S.table.item}
              </SortableTh>
              <Th>{S.table.uom}</Th>
              <SortableTh
                id="unitPrice"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.unitPrice}
              </SortableTh>
              <SortableTh
                id="quantity"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.qty}
              </SortableTh>
              <SortableTh
                id="lineValue"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.lineValue}
              </SortableTh>
              <Th className="text-right">{S.table.transport}</Th>
              <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                {S.table.created}
              </SortableTh>
              <SortableTh id="updatedAt" {...{ sortBy, sortDir, onSort }}>
                {S.table.updated}
              </SortableTh>
              <Th className="pr-3">{S.table.actions}</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                  {S.table.loading}
                </td>
              </tr>
            ) : (data.data?.length || 0) === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                  {S.table.empty}
                </td>
              </tr>
            ) : (
              (rows || data.data).map((d) => (
                <React.Fragment key={d._id}>
                  <tr className="border-t">
                    {/* selection */}
                    <Td className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(d._id)}
                        onChange={() => toggleOne(d._id)}
                        aria-label={`Select ${d._id}`}
                      />
                    </Td>

                    {/* expander */}
                    <Td className="w-8">
                      <button
                        className="p-1 rounded hover:bg-slate-100"
                        onClick={() =>
                          setExpandedId((id) => (id === d._id ? null : d._id))
                        }
                        aria-label={S.a11y.toggleDetails}
                        title={S.a11y.toggleDetails}
                        type="button"
                      >
                        {expandedId === d._id ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    </Td>

                    <Td className="font-mono">{d.lineNo}</Td>
                    <Td className="font-mono">{d.block}</Td>
                    <Td className="font-mono">{d.documentNo}</Td>
                    <Td><StatusBadge value={d.status} /></Td>
                    <Td className="capitalize">{d.lineType || "—"}</Td>
                    <Td className="truncate max-w-[220px]">{d.itemNo || "—"}</Td>
                    <Td className="font-mono">{d.unitOfMeasure || "—"}</Td>
                    <Td className="text-right">{fmtDOT(d.unitPrice, 2, locale)}</Td>
                    <Td className="text-right">{fmtDOT(d.quantity, 3, locale)}</Td>
                    <Td className="text-right font-medium">{fmtDOT(d.lineValue, 2, locale)}</Td>
                    <Td className="text-right">{fmtDOT(d.transportCost, 2, locale)}</Td>
                    <Td>{formatDate(d.createdAt || d.dateCreated)}</Td>
                    <Td>{formatDate(d.updatedAt || d.dateModified)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2 pr-3">
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100"
                          onClick={() => {
                            setEditing(d);
                            setOpenForm(true);
                          }}
                          title="Edit"
                          type="button"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                          onClick={() => onDelete(d._id)}
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  </tr>

{expandedId === d._id && (
  <tr>
    <td colSpan={COL_COUNT} className="bg-slate-50 border-t">
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
        <Section title={S.details.core}>
          <KV label={S.details.kv.lineNo} icon={Hash}>
            {d.lineNo ?? "—"}
          </KV>
          <KV label={S.details.kv.block} icon={Hash}>
            {d.block ?? "—"}
          </KV>
          <KV label={S.details.kv.documentNo} icon={Hash}>
            {d.documentNo || "—"}
          </KV>
          <KV label={S.details.kv.documentId} icon={Hash}>
            {d.documentId || "—"}
          </KV>
          <KV label={S.details.kv.status} icon={ClipboardList}>
            <StatusBadge value={d.status} />
          </KV>
          <KV label={S.details.kv.type} icon={Layers}>
            {d.lineType || "—"}
          </KV>
          <KV label={S.details.kv.itemNo} icon={Package}>
            {d.itemNo || "—"}
          </KV>
          <KV label={S.details.kv.uom} icon={Package}>
            {d.unitOfMeasure || "—"}
          </KV>
          <KV label={S.details.kv.serviceDate} icon={CalendarIcon}>
            {formatDate(d.serviceDate)}
          </KV>
          <KV label={S.details.kv.requestedDeliveryDate} icon={CalendarIcon}>
            {formatDate(d.requestedDeliveryDate)}
          </KV>
          <KV label={S.details.kv.promisedDeliveryDate} icon={CalendarIcon}>
            {formatDate(d.promisedDeliveryDate)}
          </KV>
          <KV label={S.details.kv.shipmentDate} icon={CalendarIcon}>
            {formatDate(d.shipmentDate)}
          </KV>
          <KV label={S.details.kv.documentValidityDate} icon={CalendarIcon}>
            {formatDate(d.documentValidityDate)}
          </KV>
          <KV label={S.details.kv.documentValidityHour} icon={CalendarIcon}>
            {d.documentValidityHour || "—"}
          </KV>
        </Section>

        <Section title={S.details.amounts}>
          <KV label={S.details.kv.unitPrice} icon={DollarSign}>
            {fmtDOT(d.unitPrice, 2, locale)}
          </KV>
          <KV label={S.details.kv.quantity} icon={Package}>
            {fmtDOT(d.quantity, 3, locale)}
          </KV>
          <KV label={S.details.kv.lineValue} icon={DollarSign}>
            <b>{fmtDOT(d.lineValue, 2, locale)}</b>
          </KV>
          <KV label={S.details.kv.tollCost} icon={Truck}>
            {fmtDOT(d.tollCost, 2, locale)}
          </KV>
          <KV label={S.details.kv.driverCost} icon={UserIcon}>
            {fmtDOT(d.driverCost, 2, locale)}
          </KV>
          <KV label={S.details.kv.vehicleCost} icon={Truck}>
            {fmtDOT(d.vehicleCost, 2, locale)}
          </KV>
          <KV label={S.details.kv.additionalCosts} icon={DollarSign}>
            {fmtDOT(d.additionalCosts, 2, locale)}
          </KV>
          <KV label={S.details.kv.costMargin} icon={Percent}>
            {fmtDOT(d.costMargin, 2, locale)}%
          </KV>
          <KV label={S.details.kv.transportCost} icon={Truck}>
            {fmtDOT(d.transportCost, 2, locale)}
          </KV>
        </Section>

        <Section title={S.details.parties}>
          <KV label={S.details.kv.buyVendorNo} icon={Hash}>
            {d.buyVendorNo || "—"}
          </KV>
          <KV label={S.details.kv.payVendorNo} icon={Hash}>
            {d.payVendorNo || "—"}
          </KV>
          <KV label={S.details.kv.locationNo} icon={Hash}>
            {d.locationNo || "—"}
          </KV>
          <KV label={S.details.kv.locationName} icon={MapPin}>
            {d.locationName || "—"}
          </KV>
          <KV label={S.details.kv.locationAddress} icon={MapPin}>
            {d.locationAddress || "—"}
          </KV>
          <KV label={S.details.kv.locationAddress2} icon={MapPin}>
            {d.locationAddress2 || "—"}
          </KV>
          <KV label={S.details.kv.locationPostCode} icon={MapPin}>
            {d.locationPostCode || "—"}
          </KV>
          <KV label={S.details.kv.locationCity} icon={MapPin}>
            {d.locationCity || "—"}
          </KV>
          <KV label={S.details.kv.locationCountryCode} icon={MapPin}>
            {d.locationCountryCode || "—"}
          </KV>
        </Section>

        <Section title={S.details.audit}>
          <KV label={S.details.kv.createdBy} icon={UserIcon}>
            {d.userCreated || "—"}
          </KV>
          <KV label={S.details.kv.createdAt} icon={CalendarIcon}>
            {formatDate(d.dateCreated || d.createdAt)}
          </KV>
          <KV label={S.details.kv.modifiedBy} icon={UserIcon}>
            {d.userModified || "—"}
          </KV>
          <KV label={S.details.kv.modifiedAt} icon={CalendarIcon}>
            {formatDate(d.dateModified || d.updatedAt)}
          </KV>
        </Section>

        <Section title={S.details.params}>
          <KV label={S.details.kv.param(1)}>
            {(d.param1Code || "—") + " : " + (d.param1Value || "—")}
          </KV>
          <KV label={S.details.kv.param(2)}>
            {(d.param2Code || "—") + " : " + (d.param2Value || "—")}
          </KV>
          <KV label={S.details.kv.param(3)}>
            {(d.param3Code || "—") + " : " + (d.param3Value || "—")}
          </KV>
          <KV label={S.details.kv.param(4)}>
            {(d.param4Code || "—") + " : " + (d.param4Value || "—")}
          </KV>
          <KV label={S.details.kv.param(5)}>
            {(d.param5Code || "—") + " : " + (d.param5Value || "—")}
          </KV>
        </Section>
      </div>
    </td>
  </tr>
)}

                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* footer stays the same */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
        <div className="text-xs text-slate-500">
          {S.footer.meta(data.total, data.page, data.pages)}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {S.footer.perPage(n)}
              </option>
            ))}
          </select>

          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
            type="button"
          >
            {S.footer.prev}
          </button>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
            disabled={data.page >= (data.pages || 1)}
            type="button"
          >
            {S.footer.next}
          </button>
        </div>
      </div>
    </div>

    {openForm && (
      <Modal
        title={editing ? S.modal.titleEdit : S.modal.titleNew}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
      >
        <SalesOfferLineBlockForm
          initial={editing}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpenForm(false);
            setEditing(null);
            setPage(1);
            fetchData();
          }}
          showNotice={showNotice}
          docs={docs}
          docsLoading={docsLoading}
          S={S}
          locale={locale}
        />
      </Modal>
    )}
  </div>
);
}

/* =========== Modal (reused style) =========== */
function Modal({ children, onClose, title }) {
  const [isFull, setIsFull] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={[
          "relative w-full rounded-2xl bg-white shadow-xl border border-slate-200",
          isFull ? "max-w-[95vw] h-[95vh]" : "max-w-5xl",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFull((v) => !v)}
              className="p-2 rounded hover:bg-slate-100"
              title={isFull ? "Minimize" : "Maximize"}
              aria-label={isFull ? "Minimize" : "Maximize"}
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className={[
            "p-4",
            isFull ? "h-[calc(95vh-56px)] overflow-auto" : "max-h-[75vh] overflow-auto",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========== shared Field for the form =========== */
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
/* ============================================================
   Hooks & pickers shared by the SalesOfferLineBlockForm
============================================================ */
function useDebouncedValue(v, ms = 250) {
  const [d, setD] = React.useState(v);
  React.useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function useClickOutside(ref, onOutside) {
  React.useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}

/* ---- DocumentPicker (sales version) ---- */
function DocumentPicker({
  value,
  onChange,
  options = [],
  loading = false,
  placeholder = "Pick document…",
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  const selected = options.find((o) => o.documentNo === value) || null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((d) => {
        const hay = [
          d.documentNo,
          d.sellCustomerName,
          d.billCustomerName,
          d.locationName,
          d.brokerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    : options;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          "h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm",
          "border-slate-300 focus-within:border-slate-400 focus-within:ring-0",
          "flex items-center gap-2",
        ].join(" ")}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : selected?.documentNo || ""}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No matches</div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.map((d) => {
                const isActive = d.documentNo === selected?.documentNo;
                return (
                  <li key={d._id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(d.documentNo);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div className="font-semibold tracking-tight">
                        {d.documentNo}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        {d.sellCustomerName ||
                          d.billCustomerName ||
                          d.locationName ||
                          d.brokerName ||
                          "—"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- ItemPicker (search /api/mitems) ---- */
function ItemPicker({ value, onPick, placeholder = "Search items…" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  React.useEffect(() => {
    if (!open) return;
    let abort = false;
    async function run() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "20",
          query: debounced || "",
          active: "true",
          type: "Item",
          sort: "no:1",
        });
        const res = await fetch(`${API}/api/mitems?${params.toString()}`);
        const json = await res.json();
        if (!abort) setItems(json?.data || []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [open, debounced]);

  const filtered = items;
  const displayText = open ? query : value || "";

  return (
    <div ref={rootRef} className="relative">
      <div
        className="h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm border-slate-300 focus-within:border-slate-400 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <input
          value={displayText}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-2">
              <div className="p-2 text-sm text-slate-500">No matches</div>
              {query?.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick({ no: query.trim() });
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Use exact value:{" "}
                  <span className="font-mono">{query.trim()}</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.map((it) => {
                const isActive = it.no === value;
                return (
                  <li key={it.id || it._id || it.no}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(it);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold tracking-tight">
                        {it.no}
                      </div>
                      <div className="text-[11px] tracking-wide text-slate-500">
                        {it.description || it.description2 || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                        {it.baseUnitOfMeasure && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            UOM: {it.baseUnitOfMeasure}
                          </span>
                        )}
                        {Number.isFinite(Number(it.unitPrice)) && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            Price: {Number(it.unitPrice).toLocaleString()}
                          </span>
                        )}
                        {it.inventoryPostingGroup && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            IPG: {it.inventoryPostingGroup}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SalesOfferLineBlockForm — create / edit single block
============================================================ */
function SalesOfferLineBlockForm({
  initial,
  onCancel,
  onSaved,
  showNotice,
  docs = [],
  docsLoading = false,
  S,
  locale,
}) {
  const { t } = useI18nSafe();
  const DEFAULT_S = {
    details: S.details,
    actions: {
      cancel: "Cancel",
      saveChanges: "Save changes",
      createBlock: "Create block",
    },
    form: { fixErrors: "Please correct the highlighted fields." },
    controls: {
      pickDocument: "Pick document…",
      searchItems: "Search items…",
      searchPlaceholder: "Search…",
    },
  };
  const I18N_S = t?.salesOfferLinesBlocks || t?.lineBlockForm || {};
  const SS = {
    details: {
      ...DEFAULT_S.details,
      ...(I18N_S.details || {}),
      kv: {
        ...DEFAULT_S.details.kv,
        ...(I18N_S.details?.kv || {}),
      },
    },
    actions: { ...DEFAULT_S.actions, ...(I18N_S.actions || {}) },
    form: { ...DEFAULT_S.form, ...(I18N_S.form || {}) },
    controls: { ...DEFAULT_S.controls, ...(I18N_S.controls || {}) },
  };

  const isEdit = Boolean(initial?._id);
  const [tab, setTab] = React.useState("core");
  const [errors, setErrors] = React.useState({});
  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";

  // keys / header-ish
  const [documentNo, setDocumentNo] = React.useState(
    initial?.documentNo || ""
  );
  const [lineNo, setLineNo] = React.useState(
    initial?.lineNo != null ? String(initial.lineNo) : ""
  );
  const [block, setBlock] = React.useState(
    initial?.block != null ? String(initial.block) : "1"
  );
  const [status, setStatus] = React.useState(
    canonStatus(initial?.status || "new")
  );
  const [lineType, setLineType] = React.useState(
    initial?.lineType || "item"
  );

  // core
  const [itemNo, setItemNo] = React.useState(initial?.itemNo || "");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState(
    initial?.unitOfMeasure || "T"
  );
  const [unitPrice, setUnitPrice] = React.useState(
    initial?.unitPrice ?? 0
  );
  const [quantity, setQuantity] = React.useState(initial?.quantity ?? 0);

  // costs
  const [tollCost, setTollCost] = React.useState(initial?.tollCost ?? 0);
  const [driverCost, setDriverCost] = React.useState(
    initial?.driverCost ?? 0
  );
  const [vehicleCost, setVehicleCost] = React.useState(
    initial?.vehicleCost ?? 0
  );
  const [additionalCosts, setAdditionalCosts] = React.useState(
    initial?.additionalCosts ?? 0
  );
  const [costMargin, setCostMargin] = React.useState(
    initial?.costMargin ?? 0
  );

  // dates
  const [serviceDate, setServiceDate] = React.useState(
    initial?.serviceDate ? initial.serviceDate.slice(0, 10) : ""
  );
  const [requestedDeliveryDate, setRequestedDeliveryDate] = React.useState(
    initial?.requestedDeliveryDate
      ? initial.requestedDeliveryDate.slice(0, 10)
      : ""
  );
  const [promisedDeliveryDate, setPromisedDeliveryDate] = React.useState(
    initial?.promisedDeliveryDate
      ? initial.promisedDeliveryDate.slice(0, 10)
      : ""
  );
  const [shipmentDate, setShipmentDate] = React.useState(
    initial?.shipmentDate ? initial.shipmentDate.slice(0, 10) : ""
  );
  const [documentValidityDate, setDocumentValidityDate] = React.useState(
    initial?.documentValidityDate
      ? initial.documentValidityDate.slice(0, 10)
      : ""
  );
  const [documentValidityHour, setDocumentValidityHour] = React.useState(
    initial?.documentValidityHour || ""
  );

  // parties
  const [buyVendorNo, setBuyVendorNo] = React.useState(
    initial?.buyVendorNo || ""
  );
  const [payVendorNo, setPayVendorNo] = React.useState(
    initial?.payVendorNo || ""
  );
  const [locationNo, setLocationNo] = React.useState(
    initial?.locationNo || ""
  );
    const [locationName, setLocationName] = React.useState(
    initial?.locationName || ""
  );
  const [locationAddress, setLocationAddress] = React.useState(
    initial?.locationAddress || ""
  );
  const [locationAddress2, setLocationAddress2] = React.useState(
    initial?.locationAddress2 || ""
  );
  const [locationPostCode, setLocationPostCode] = React.useState(
    initial?.locationPostCode || ""
  );
  const [locationCity, setLocationCity] = React.useState(
    initial?.locationCity || ""
  );
  const [locationCountryCode, setLocationCountryCode] = React.useState(
    initial?.locationCountryCode || ""
  );

  // params 1..5
  const [p1c, setP1c] = React.useState(initial?.param1Code || "");
  const [p1v, setP1v] = React.useState(initial?.param1Value || "");
  const [p2c, setP2c] = React.useState(initial?.param2Code || "");
  const [p2v, setP2v] = React.useState(initial?.param2Value || "");
  const [p3c, setP3c] = React.useState(initial?.param3Code || "");
  const [p3v, setP3v] = React.useState(initial?.param3Value || "");
  const [p4c, setP4c] = React.useState(initial?.param4Code || "");
  const [p4v, setP4v] = React.useState(initial?.param4Value || "");
  const [p5c, setP5c] = React.useState(initial?.param5Code || "");
  const [p5v, setP5v] = React.useState(initial?.param5Value || "");

  const isItem = (lineType || "").toLowerCase() === "item";

  const computedLineValue = React.useMemo(() => {
    const q = Number(quantity) || 0;
    const up = Number(unitPrice) || 0;
    return Math.round(q * up * 100) / 100;
  }, [quantity, unitPrice]);

  const computedTransport = React.useMemo(() => {
    const base =
      (Number(tollCost) || 0) +
      (Number(driverCost) || 0) +
      (Number(vehicleCost) || 0) +
      (Number(additionalCosts) || 0);
    const m = (Number(costMargin) || 0) / 100;
    return Math.round(base * (1 + m) * 100) / 100;
  }, [tollCost, driverCost, vehicleCost, additionalCosts, costMargin]);

  const TABS = [
    { id: "core", label: SS.details.core, Icon: FileText },
    { id: "dates", label: "Dates", Icon: CalendarIcon },
    { id: "costs", label: SS.details.amounts, Icon: DollarSign },
    { id: "parties", label: SS.details.parties, Icon: UserIcon },
    { id: "params", label: SS.details.params, Icon: SlidersHorizontal },
    { id: "audit", label: SS.details.audit, Icon: ClipboardList },
  ];

  function toInputDate(v) {
    if (!v) return "";
    try {
      return new Date(v).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  // Autofill from document header
useEffect(() => {
  if (!documentNo) return;

  const header = (docs || []).find((d) => d.documentNo === documentNo);
  if (!header) return;

  // Parties (only fill if still empty)
  setBuyVendorNo(
    (prev) =>
      prev ||
      header.brokerNo ||
      header.billCustomerNo ||
      header.sellCustomerNo ||
      ""
  );
  setPayVendorNo(
    (prev) => prev || header.billCustomerNo || header.sellCustomerNo || ""
  );
  setLocationNo((prev) => prev || header.locationNo || "");

  // Basic location fields from header (only if still empty)
  setLocationName((prev) => prev || header.locationName || "");
  setLocationAddress((prev) => prev || header.locationAddress || "");
  setLocationAddress2((prev) => prev || header.locationAddress2 || "");
  setLocationCity((prev) => prev || header.locationCity || "");

  // Country / region – try a lot of possible fields
  const hdrCountry =
    header.locationCountryCode ||
    header.locationCountry ||
    header.sellCustomerCountry ||
    header.billCustomerCountry ||
    header.countryRegionCode ||
    header.countryCode ||
    header.country ||
    header.country_region_code ||
    header.CountryRegionCode ||
    "";

  setLocationCountryCode(
    (prev) => prev || (hdrCountry ? String(hdrCountry).toUpperCase() : "")
  );

  // Dates (only fill if still empty)
  setServiceDate((prev) => prev || toInputDate(header.serviceDate));
  setRequestedDeliveryDate(
    (prev) => prev || toInputDate(header.requestedDeliveryDate)
  );
  setPromisedDeliveryDate(
    (prev) => prev || toInputDate(header.promisedDeliveryDate)
  );
  setShipmentDate((prev) => prev || toInputDate(header.shipmentDate));
  setDocumentValidityDate(
    (prev) => prev || toInputDate(header.documentValidityDate)
  );

  // Status (fill on create / when empty)
  setStatus((prev) => (prev ? prev : canonStatus(header.status || "new")));

  // 🔴 NEW: if document has a locationNo but no locationPostCode,
  // load the location and use its post code.
  if (!header.locationPostCode && header.locationNo) {
    (async () => {
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "1",
          // depending on your API, adjust this:
          query: `^${header.locationNo}$`,
        });
        const res = await fetch(`${API}/api/mlocations?${qs.toString()}`);
        const json = await res.json().catch(() => ({}));
        const loc = json?.data?.[0];
        if (loc) {
          const postCode =
            loc.locationPostCode ||
            loc.postCode ||
            loc.post_code ||
            loc.zip ||
            loc.postalCode ||
            "";

          setLocationPostCode((prev) => prev || postCode);
        }
      } catch (e) {
        console.warn("Failed to load location for document", e);
      }
    })();
  } else {
    // fallback: if header has some postcode field
    const hdrPostCode =
      header.locationPostCode ||
      header.postCode ||
      header.post_code ||
      header.zip ||
      header.postalCode ||
      "";

    setLocationPostCode((prev) => prev || hdrPostCode);
  }
}, [documentNo, docs]);


  async function save(e) {
    e.preventDefault();
    const errs = {};
    if (!documentNo.trim()) errs.documentNo = "Document No. *";
    if (!lineNo.trim() || isNaN(Number(lineNo))) errs.lineNo = "Line No. *";
    if (!block.trim() || isNaN(Number(block))) errs.block = "Block *";
    if (!isEdit && !getUserCode()) errs.userCreated = "Missing user code.";

    if (isItem && !itemNo.trim()) errs.itemNo = "Item No. *";

    setErrors(errs);
    if (Object.keys(errs).length) {
      setTab("core");
      return;
    }

    const payload = {
      documentNo: documentNo.trim(),
      lineNo: Number(lineNo),
      block: Number(block),
      status: canonStatus(status),
      lineType: (lineType || "item").toLowerCase(),
      itemNo: itemNo || null,
      unitOfMeasure: (unitOfMeasure || "T").toUpperCase(),
      unitPrice: Number(unitPrice) || 0,
      quantity: Number(quantity) || 0,

      tollCost: Number(tollCost) || 0,
      driverCost: Number(driverCost) || 0,
      vehicleCost: Number(vehicleCost) || 0,
      additionalCosts: Number(additionalCosts) || 0,
      costMargin: Number(costMargin) || 0,

      serviceDate: serviceDate || null,
      requestedDeliveryDate: requestedDeliveryDate || null,
      promisedDeliveryDate: promisedDeliveryDate || null,
      shipmentDate: shipmentDate || null,
      documentValidityDate: documentValidityDate || null,
      documentValidityHour: documentValidityHour || null,

      buyVendorNo: buyVendorNo || null,
      payVendorNo: payVendorNo || null,
      locationNo: locationNo || null,
       locationName: locationName || null,
      locationAddress: locationAddress || null,
      locationAddress2: locationAddress2 || null,
      locationPostCode: locationPostCode || null,
      locationCity: locationCity || null,
      locationCountryCode:
        locationCountryCode ? locationCountryCode.toUpperCase() : null,

      param1Code: p1c || null,
      param1Value: p1v || null,
      param2Code: p2c || null,
      param2Value: p2v || null,
      param3Code: p3c || null,
      param3Value: p3v || null,
      param4Code: p4c || null,
      param4Value: p4v || null,
      param5Code: p5c || null,
      param5Value: p5v || null,
    };

    const nowIso = new Date().toISOString();
    const userCode = getUserCode();
    if (!isEdit) {
      payload.userCreated = userCode;
      payload.dateCreated = nowIso;
    } else {
      payload.userModified = userCode;
      payload.dateModified = nowIso;
    }

    try {
      const url = isEdit
        ? `${API}/api/sales-offer-lines-blocks/${initial._id}`
        : `${API}/api/sales-offer-lines-blocks`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice?.("error", json?.message || "Save failed");
        return;
      }

      showNotice?.(
        "success",
        isEdit ? "Block updated." : "Block created."
      );
      onSaved?.();
    } catch {
      showNotice?.("error", "Save failed");
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {/* sticky segmented tabs */}
      <div className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
          {TABS.map((tTab) => {
            const active = tab === tTab.id;
            return (
              <button
                key={tTab.id}
                type="button"
                onClick={() => setTab(tTab.id)}
                className={[
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
                ].join(" ")}
              >
                <tTab.Icon
                  size={16}
                  className={active ? "opacity-80" : "opacity-60"}
                />
                {tTab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* error banner */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {SS.form?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* CORE */}
      {tab === "core" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field
            label={SS.details.kv.documentNo}
            icon={Hash}
            error={errors.documentNo}
          >
            <DocumentPicker
              value={documentNo}
              onChange={(val) => setDocumentNo(val)}
              options={docs}
              loading={docsLoading}
              placeholder={SS.controls?.pickDocument || "Pick document…"}
            />
          </Field>

          <Field
            label={SS.details.kv.lineNo}
            icon={Hash}
            error={errors.lineNo}
          >
            <input
              className={INPUT_CLS}
              type="number"
              value={lineNo}
              onChange={(e) => setLineNo(e.target.value)}
            />
          </Field>

          <Field
            label={SS.details.kv.block}
            icon={Hash}
            error={errors.block}
          >
            <input
              className={INPUT_CLS}
              type="number"
              min={1}
              value={block}
              onChange={(e) => setBlock(e.target.value)}
            />
          </Field>

          <Field label={SS.details.kv.status} icon={ClipboardList}>
            <select
              className={INPUT_CLS}
              value={status}
              onChange={(e) => setStatus(canonStatus(e.target.value))}
            >
              {STATUS_OPTIONS.map((sVal) => (
                <option key={sVal} value={sVal}>
                  {STATUS_LABELS[sVal]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={SS.details.kv.type} icon={Layers}>
            <select
              className={INPUT_CLS}
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
            >
              {LINE_TYPES.map((tVal) => (
                <option key={tVal.id} value={tVal.id}>
                  {tVal.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={SS.details.kv.itemNo}
            icon={Package}
            error={isItem ? errors.itemNo : undefined}
          >
            {isItem ? (
              <ItemPicker
                value={itemNo}
                onPick={(it) => {
                  setItemNo(it.no || "");
                  setUnitOfMeasure(
                    (prev) => prev || it.baseUnitOfMeasure || prev
                  );
                  setUnitPrice((prev) =>
                    prev && Number(prev) > 0 ? prev : Number(it.unitPrice) || 0
                  );
                }}
                placeholder={
                  SS.controls?.searchItems ||
                  SS.controls?.searchPlaceholder ||
                  "Search items…"
                }
              />
            ) : (
              <input
                className={INPUT_CLS}
                value={itemNo}
                onChange={(e) => setItemNo(e.target.value)}
                disabled={!isItem}
              />
            )}
          </Field>

          <Field label={SS.details.kv.uom} icon={Package}>
            <select
              className={INPUT_CLS}
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            >
              {UOMS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label={SS.details.kv.unitPrice} icon={DollarSign}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              disabled={!isItem}
            />
          </Field>

          <Field label={SS.details.kv.quantity} icon={Package}>
            <input
              type="number"
              step="0.001"
              className={INPUT_CLS}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!isItem}
            />
          </Field>

          <Field label={SS.details.kv.lineValue} icon={DollarSign}>
            <input
              className={INPUT_CLS}
              value={fmtDOT(computedLineValue, 2, locale)}
              disabled
            />
          </Field>
        </div>
      )}

      {/* DATES */}
      {tab === "dates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.serviceDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </Field>
          <Field
            label={SS.details.kv.requestedDeliveryDate}
            icon={CalendarIcon}
          >
            <input
              type="date"
              className={INPUT_CLS}
              value={requestedDeliveryDate}
              onChange={(e) => setRequestedDeliveryDate(e.target.value)}
            />
          </Field>
          <Field
            label={SS.details.kv.promisedDeliveryDate}
            icon={CalendarIcon}
          >
            <input
              type="date"
              className={INPUT_CLS}
              value={promisedDeliveryDate}
              onChange={(e) => setPromisedDeliveryDate(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.shipmentDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={shipmentDate}
              onChange={(e) => setShipmentDate(e.target.value)}
            />
          </Field>
          <Field
            label={SS.details.kv.documentValidityDate}
            icon={CalendarIcon}
          >
            <input
              type="date"
              className={INPUT_CLS}
              value={documentValidityDate}
              onChange={(e) => setDocumentValidityDate(e.target.value)}
            />
          </Field>
          <Field
            label={SS.details.kv.documentValidityHour}
            icon={CalendarIcon}
          >
            <input
              type="time"
              className={INPUT_CLS}
              value={documentValidityHour}
              onChange={(e) => setDocumentValidityHour(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* COSTS */}
      {tab === "costs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.tollCost} icon={Truck}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={tollCost}
              onChange={(e) => setTollCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.driverCost} icon={UserIcon}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={driverCost}
              onChange={(e) => setDriverCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.vehicleCost} icon={Truck}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={vehicleCost}
              onChange={(e) => setVehicleCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.additionalCosts} icon={FileText}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.costMarginPct} icon={Percent}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={costMargin}
              onChange={(e) => setCostMargin(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.transportCost} icon={Truck}>
            <input
              className={INPUT_CLS}
              value={fmtDOT(computedTransport, 2, locale)}
              disabled
            />
          </Field>
        </div>
      )}

      {/* PARTIES */}
      {tab === "parties" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.buyVendorNo} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={buyVendorNo}
              onChange={(e) => setBuyVendorNo(e.target.value)}
            />
          </Field>

          <Field label={SS.details.kv.payVendorNo} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={payVendorNo}
              onChange={(e) => setPayVendorNo(e.target.value)}
            />
          </Field>

          <Field label={SS.details.kv.locationNo} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={locationNo}
              onChange={(e) => setLocationNo(e.target.value)}
            />
          </Field>

          {/* NEW: location details */}
          <Field label={SS.details.kv.locationName} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationAddress} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationAddress2} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationAddress2}
              onChange={(e) => setLocationAddress2(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationPostCode} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationPostCode}
              onChange={(e) => setLocationPostCode(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationCity} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationCountryCode} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationCountryCode}
              onChange={(e) =>
                setLocationCountryCode(e.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
      )}


      {/* PARAMS */}
      {tab === "params" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Param1 Code">
            <input
              className={INPUT_CLS}
              value={p1c}
              onChange={(e) => setP1c(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Param1 Value">
            <input
              className={INPUT_CLS}
              value={p1v}
              onChange={(e) => setP1v(e.target.value)}
            />
          </Field>

          <Field label="Param2 Code">
            <input
              className={INPUT_CLS}
              value={p2c}
              onChange={(e) => setP2c(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Param2 Value">
            <input
              className={INPUT_CLS}
              value={p2v}
              onChange={(e) => setP2v(e.target.value)}
            />
          </Field>

          <Field label="Param3 Code">
            <input
              className={INPUT_CLS}
              value={p3c}
              onChange={(e) => setP3c(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Param3 Value">
            <input
              className={INPUT_CLS}
              value={p3v}
              onChange={(e) => setP3v(e.target.value)}
            />
          </Field>

          <Field label="Param4 Code">
            <input
              className={INPUT_CLS}
              value={p4c}
              onChange={(e) => setP4c(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Param4 Value">
            <input
              className={INPUT_CLS}
              value={p4v}
              onChange={(e) => setP4v(e.target.value)}
            />
          </Field>

          <Field label="Param5 Code">
            <input
              className={INPUT_CLS}
              value={p5c}
              onChange={(e) => setP5c(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Param5 Value">
            <input
              className={INPUT_CLS}
              value={p5v}
              onChange={(e) => setP5v(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* AUDIT (read-only) */}
      {tab === "audit" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.createdBy} icon={UserIcon}>
            <input
              className={INPUT_CLS}
              value={initial?.userCreated || "—"}
              disabled
            />
          </Field>
          <Field label={SS.details.kv.createdAt} icon={CalendarIcon}>
            <input
              className={INPUT_CLS}
              value={
                initial?.dateCreated
                  ? new Date(initial.dateCreated).toLocaleString()
                  : "—"
              }
              disabled
            />
          </Field>
          <div />
          <Field label={SS.details.kv.modifiedBy} icon={UserIcon}>
            <input
              className={INPUT_CLS}
              value={initial?.userModified || "—"}
              disabled
            />
          </Field>
          <Field label={SS.details.kv.modifiedAt} icon={CalendarIcon}>
            <input
              className={INPUT_CLS}
              value={
                initial?.dateModified
                  ? new Date(initial.dateModified).toLocaleString()
                  : "—"
              }
              disabled
            />
          </Field>
          <div />
          <Field label={SS.details.kv.documentId} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={initial?.documentId || "—"}
              disabled
            />
          </Field>
        </div>
      )}

      {/* footer buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {SS.actions?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit
            ? SS.actions?.saveChanges || "Save changes"
            : SS.actions?.createBlock || "Create block"}
        </button>
      </div>
    </form>
  );
}

export { SalesOfferLineBlockForm };
