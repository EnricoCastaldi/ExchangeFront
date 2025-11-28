// src/pages/PurchaseOfferLinesBlocks.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
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
  Plus,
  Pencil,
  Trash2,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { useI18n as _useI18n } from "../helpers/i18n";
const useI18nSafe = _useI18n || (() => ({ t: null, locale: undefined }));

/* ---------------------------------------------------
   Status helpers (canonicalize + labels)  — purchase
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

// Sort keys supported by backend router (see PurchaseOfferLinesBlocks.js)
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
   API base (same style)
----------------------- */
const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

/* -----------------------
   Small helpers
----------------------- */
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

function docLabel(d) {
  const parts = [d.documentNo];
  // Prefer purchase-side names
  if (d.buyVendorName) parts.push(d.buyVendorName);
  else if (d.payVendorName) parts.push(d.payVendorName);
  else if (d.locationName) parts.push(d.locationName);
  else if (d.brokerName) parts.push(d.brokerName);
  if (d.documentDate) parts.push(new Date(d.documentDate).toLocaleDateString());
  return parts.filter(Boolean).join(" — ");
}

/* ==============================
   Toast, StatusBadge, KV, etc.
============================== */
function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}>
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

/* Status styling mirrors PurchaseOfferLines */
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
    <th className={`text-left px-4 py-3 font-medium ${className}`}>
      {children}
    </th>
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
   PAGE — PurchaseOfferLinesBlocksPage
========================================= */
export default function PurchaseOfferLinesBlocksPage() {
  // +1 column for actions
  const COL_COUNT = 15;

  const { t, locale } = useI18nSafe();

  const S =
    (t && t.purchaseOfferLinesBlocks) || {
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
          buyVendorNo: "Buy Vendor No.",
          payVendorNo: "Pay Vendor No.",
          locationNo: "Location No.",
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
        titleEdit: "Edit Purchase Offer Block",
        titleNew: "New Purchase Offer Block",
      },
      actions: {
        cancel: "Cancel",
        saveChanges: "Save changes",
        createBlock: "Create block",
      },
      form: {
        fixErrors: "Please correct the highlighted fields.",
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

  // fetch documents for picker (shared header list)
  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      setDocsLoading(true);
      try {
        const res = await fetch(
          `${API}/api/purchase-offers?limit=1000&sortBy=createdAt&sortDir=desc`
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

  // fetch purchase blocks
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
        `${API}/api/purchase-offer-lines-blocks?${params.toString()}`
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
      const res = await fetch(`${API}/api/purchase-offer-lines-blocks/${_id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        if (expandedId === _id) setExpandedId(null);
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

          {/* New block */}
          <button
            type="button"
            onClick={() => {
              setEditing({
                // prefill from filters if present
                documentNo: documentNo || "",
                lineNo: lineNoFilter ? Number(lineNoFilter) : null,
                block: blockFilter ? Number(blockFilter) : null,
                status: "new",
                lineType: "item",
              });
              setOpenForm(true);
            }}
            className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {S.controls.addBtn}
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="polb-filters-panel"
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
          id="polb-filters-panel"
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
                  <td
                    colSpan={COL_COUNT}
                    className="p-6 text-center text-slate-500"
                  >
                    {S.table.loading}
                  </td>
                </tr>
              ) : (data.data?.length || 0) === 0 ? (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="p-6 text-center text-slate-500"
                  >
                    {S.table.empty}
                  </td>
                </tr>
              ) : (
                (rows || data.data).map((d) => (
                  <React.Fragment key={d._id}>
                    <tr className="border-t">
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
                      <Td>
                        <StatusBadge value={d.status} />
                      </Td>
                      <Td className="capitalize">{d.lineType || "—"}</Td>
                      <Td className="truncate max-w-[220px]">
                        {d.itemNo || "—"}
                      </Td>
                      <Td className="font-mono">{d.unitOfMeasure || "—"}</Td>
                      <Td className="text-right">
                        {fmtDOT(d.unitPrice, 2, locale)}
                      </Td>
                      <Td className="text-right">
                        {fmtDOT(d.quantity, 3, locale)}
                      </Td>
                      <Td className="text-right font-medium">
                        {fmtDOT(d.lineValue, 2, locale)}
                      </Td>
                      <Td className="text-right">
                        {fmtDOT(d.transportCost, 2, locale)}
                      </Td>
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
                        <td
                          colSpan={COL_COUNT}
                          className="bg-slate-50 border-t"
                        >
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
                              <KV
                                label={S.details.kv.status}
                                icon={ClipboardList}
                              >
                                <StatusBadge value={d.status} />
                              </KV>
                              <KV label={S.details.kv.type} icon={Layers}>
                                {d.lineType || "—"}
                              </KV>
                              <KV label={S.details.kv.itemNo} icon={Package}>
                                {d.itemNo || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.uom}
                                icon={Package}
                              >
                                {d.unitOfMeasure || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.serviceDate}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.serviceDate)}
                              </KV>
                              <KV
                                label={S.details.kv.requestedDeliveryDate}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.requestedDeliveryDate)}
                              </KV>
                              <KV
                                label={S.details.kv.promisedDeliveryDate}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.promisedDeliveryDate)}
                              </KV>
                              <KV
                                label={S.details.kv.shipmentDate}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.shipmentDate)}
                              </KV>
                              <KV
                                label={S.details.kv.documentValidityDate}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.documentValidityDate)}
                              </KV>
                              <KV
                                label={S.details.kv.documentValidityHour}
                                icon={CalendarIcon}
                              >
                                {d.documentValidityHour || "—"}
                              </KV>
                            </Section>

                            <Section title={S.details.amounts}>
                              <KV
                                label={S.details.kv.unitPrice}
                                icon={DollarSign}
                              >
                                {fmtDOT(d.unitPrice, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.quantity}
                                icon={Package}
                              >
                                {fmtDOT(d.quantity, 3, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.lineValue}
                                icon={DollarSign}
                              >
                                <b>{fmtDOT(d.lineValue, 2, locale)}</b>
                              </KV>
                              <KV
                                label={S.details.kv.tollCost}
                                icon={Truck}
                              >
                                {fmtDOT(d.tollCost, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.driverCost}
                                icon={UserIcon}
                              >
                                {fmtDOT(d.driverCost, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.vehicleCost}
                                icon={Truck}
                              >
                                {fmtDOT(d.vehicleCost, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.additionalCosts}
                                icon={FileText}
                              >
                                {fmtDOT(d.additionalCosts, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.costMarginPct}
                                icon={Percent}
                              >
                                {fmtDOT(d.costMargin, 2, locale)}
                              </KV>
                              <KV
                                label={S.details.kv.transportCost}
                                icon={Truck}
                              >
                                <b>{fmtDOT(d.transportCost, 2, locale)}</b>
                              </KV>
                            </Section>

                            <Section title={S.details.parties}>
                              <KV
                                label={S.details.kv.buyVendorNo}
                                icon={Hash}
                              >
                                {d.buyVendorNo || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.payVendorNo}
                                icon={Hash}
                              >
                                {d.payVendorNo || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.locationNo}
                                icon={Hash}
                              >
                                {d.locationNo || "—"}
                              </KV>
                            </Section>

                            <Section title={S.details.audit}>
                              <KV
                                label={S.details.kv.createdBy}
                                icon={UserIcon}
                              >
                                {d.userCreated || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.createdAt}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.dateCreated || d.createdAt)}
                              </KV>
                              <KV
                                label={S.details.kv.modifiedBy}
                                icon={UserIcon}
                              >
                                {d.userModified || "—"}
                              </KV>
                              <KV
                                label={S.details.kv.modifiedAt}
                                icon={CalendarIcon}
                              >
                                {formatDate(d.dateModified || d.updatedAt)}
                              </KV>
                            </Section>

                            <Section title={S.details.params}>
                              <KV label={S.details.kv.param(1)}>
                                {(d.param1Code || "—") +
                                  " : " +
                                  (d.param1Value || "—")}
                              </KV>
                              <KV label={S.details.kv.param(2)}>
                                {(d.param2Code || "—") +
                                  " : " +
                                  (d.param2Value || "—")}
                              </KV>
                              <KV label={S.details.kv.param(3)}>
                                {(d.param3Code || "—") +
                                  " : " +
                                  (d.param3Value || "—")}
                              </KV>
                              <KV label={S.details.kv.param(4)}>
                                {(d.param4Code || "—") +
                                  " : " +
                                  (d.param4Value || "—")}
                              </KV>
                              <KV label={S.details.kv.param(5)}>
                                {(d.param5Code || "—") +
                                  " : " +
                                  (d.param5Value || "—")}
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

      {/* CREATE/EDIT MODAL FOR BLOCKS */}
      {openForm && (
        <Modal
          title={editing ? S.modal.titleEdit : S.modal.titleNew}
          onClose={() => {
            setOpenForm(false);
            setEditing(null);
          }}
        >
          <PurchaseOfferLineBlockForm
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
            isFull
              ? "h-[calc(95vh-56px)] overflow-auto"
              : "max-h-[75vh] overflow-auto",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========== Field wrapper (label + icon + error) =========== */
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

/* =========================================
   FORM — Create/Edit single block
========================================= */
function PurchaseOfferLineBlockForm({
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
    details: {
      core: "Core",
      amounts: "Amounts",
      parties: "Parties",
      params: "Parameters",
      audit: "Audit",
      kv: { ...S.details.kv },
    },
    actions: {
      cancel: "Cancel",
      saveChanges: "Save changes",
      createBlock: "Create block",
    },
    form: {
      fixErrors: "Please correct the highlighted fields.",
    },
    controls: {
      pickDocument: "Pick document…",
    },
  };

  const I18N_S = t?.purchaseOfferLinesBlocks || {};
  const SS = {
    details: {
      ...DEFAULT_S.details,
      ...(I18N_S.details || {}),
      ...(S?.details || {}),
      kv: {
        ...DEFAULT_S.details.kv,
        ...(I18N_S.details?.kv || {}),
        ...(S?.details?.kv || {}),
      },
    },
    actions: {
      ...DEFAULT_S.actions,
      ...(I18N_S.actions || {}),
      ...(S?.actions || {}),
    },
    form: {
      ...DEFAULT_S.form,
      ...(I18N_S.form || {}),
      ...(S?.form || {}),
    },
    controls: {
      ...DEFAULT_S.controls,
      ...(I18N_S.controls || {}),
      ...(S?.controls || {}),
    },
  };

  const isEdit = Boolean(initial?._id);
  const [tab, setTab] = useState("core");
  const [errors, setErrors] = useState({});
  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";

  // header-ish / keys
  const [documentNo, setDocumentNo] = useState(initial?.documentNo || "");
  const [lineNo, setLineNo] = useState(
    initial?.lineNo != null ? initial.lineNo : initial?.lineNo ?? ""
  );
  const [block, setBlock] = useState(
    initial?.block != null ? initial.block : initial?.block ?? ""
  );
  const [status, setStatus] = useState(canonStatus(initial?.status || "new"));
  const [lineType, setLineType] = useState(initial?.lineType || "item");

  // core
  const [itemNo, setItemNo] = useState(initial?.itemNo || "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(
    initial?.unitOfMeasure || "T"
  );
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);

  // costs
  const [tollCost, setTollCost] = useState(initial?.tollCost ?? 0);
  const [driverCost, setDriverCost] = useState(initial?.driverCost ?? 0);
  const [vehicleCost, setVehicleCost] = useState(initial?.vehicleCost ?? 0);
  const [additionalCosts, setAdditionalCosts] = useState(
    initial?.additionalCosts ?? 0
  );
  const [costMargin, setCostMargin] = useState(initial?.costMargin ?? 0);

  // dates
  const toInputDate = (v) => {
    if (!v) return "";
    try {
      return new Date(v).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };
  const [serviceDate, setServiceDate] = useState(
    initial?.serviceDate ? toInputDate(initial.serviceDate) : ""
  );
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    initial?.requestedDeliveryDate
      ? toInputDate(initial.requestedDeliveryDate)
      : ""
  );
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState(
    initial?.promisedDeliveryDate
      ? toInputDate(initial.promisedDeliveryDate)
      : ""
  );
  const [shipmentDate, setShipmentDate] = useState(
    initial?.shipmentDate ? toInputDate(initial.shipmentDate) : ""
  );
  const [documentValidityDate, setDocumentValidityDate] = useState(
    initial?.documentValidityDate
      ? toInputDate(initial.documentValidityDate)
      : ""
  );
  const [documentValidityHour, setDocumentValidityHour] = useState(
    initial?.documentValidityHour || ""
  );

  // parties
  const [buyVendorNo, setBuyVendorNo] = useState(initial?.buyVendorNo || "");
  const [payVendorNo, setPayVendorNo] = useState(initial?.payVendorNo || "");
  const [locationNo, setLocationNo] = useState(initial?.locationNo || "");

  // params (simple code + value)
  const [p1c, setP1c] = useState(initial?.param1Code || "");
  const [p1v, setP1v] = useState(initial?.param1Value || "");
  const [p2c, setP2c] = useState(initial?.param2Code || "");
  const [p2v, setP2v] = useState(initial?.param2Value || "");
  const [p3c, setP3c] = useState(initial?.param3Code || "");
  const [p3v, setP3v] = useState(initial?.param3Value || "");
  const [p4c, setP4c] = useState(initial?.param4Code || "");
  const [p4v, setP4v] = useState(initial?.param4Value || "");
  const [p5c, setP5c] = useState(initial?.param5Code || "");
  const [p5v, setP5v] = useState(initial?.param5Value || "");

  const TABS = [
    { id: "core", label: SS.details.core, Icon: FileText },
    { id: "dates", label: "Dates", Icon: CalendarIcon },
    { id: "amounts", label: SS.details.amounts, Icon: DollarSign },
    { id: "parties", label: SS.details.parties, Icon: UserIcon },
    { id: "params", label: SS.details.params, Icon: SlidersHorizontal },
    { id: "audit", label: SS.details.audit, Icon: ClipboardList },
  ];

  const isItem = (lineType || "").toLowerCase() === "item";

  // computed previews
  const computedLineValue = useMemo(() => {
    const q = Number(quantity) || 0;
    const up = Number(unitPrice) || 0;
    return Math.round(q * up * 100) / 100;
  }, [quantity, unitPrice]);

  const computedTransport = useMemo(() => {
    const base =
      (Number(tollCost) || 0) +
      (Number(driverCost) || 0) +
      (Number(vehicleCost) || 0) +
      (Number(additionalCosts) || 0);
    const m = (Number(costMargin) || 0) / 100;
    return Math.round(base * (1 + m) * 100) / 100;
  }, [tollCost, driverCost, vehicleCost, additionalCosts, costMargin]);

  // Autofill parties/dates from header on document change
  useEffect(() => {
    if (!documentNo) return;
    const header = (docs || []).find((d) => d.documentNo === documentNo);
    if (!header) return;

    setBuyVendorNo((prev) => prev || header.buyVendorNo || "");
    setPayVendorNo(
      (prev) => prev || header.payVendorNo || header.buyVendorNo || ""
    );
    setLocationNo((prev) => prev || header.locationNo || "");

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

    setStatus((prev) => (prev ? prev : canonStatus(header.status || "new")));
  }, [documentNo, docs]);

  async function save(e) {
    e.preventDefault();

    const errs = {};
    if (!documentNo.trim()) errs.documentNo = "Document No. *";
    if (!lineNo && lineNo !== 0) errs.lineNo = "Line No. *";
    if (!block && block !== 0) errs.block = "Block *";
    if (isItem && !itemNo.trim()) errs.itemNo = "Item No. *";
    if (!getUserCode()) errs.userCreated = "Missing user code (session).";

    setErrors(errs);
    if (Object.keys(errs).length) {
      setTab("core");
      return;
    }

    const payload = {
      documentNo: documentNo.trim(),
      lineNo: Number(lineNo) || 0,
      block: Number(block) || 0,
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
        ? `${API}/api/purchase-offer-lines-blocks/${initial._id}`
        : `${API}/api/purchase-offer-lines-blocks`;
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

  const isReadonlyLineKeys = isEdit; // keep doc/line/block stable when editing

  return (
    <form onSubmit={save} className="space-y-4">
      {/* sticky segmented tabs */}
      <div className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
                ].join(" ")}
              >
                <t.Icon
                  size={16}
                  className={active ? "opacity-80" : "opacity-60"}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* error banner */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {SS.form.fixErrors}
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
            <select
              className={INPUT_CLS}
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              disabled={isReadonlyLineKeys}
            >
              <option value="">
                {docsLoading
                  ? SS.controls.pickDocument
                  : SS.controls.pickDocument}
              </option>
              {docs.map((d) => (
                <option key={d._id} value={d.documentNo}>
                  {docLabel(d)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={SS.details.kv.lineNo}
            icon={Hash}
            error={errors.lineNo}
          >
            <input
              className={INPUT_CLS}
              type="number"
              value={lineNo ?? ""}
              onChange={(e) => setLineNo(e.target.value)}
              disabled={isReadonlyLineKeys}
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
              value={block ?? ""}
              onChange={(e) => setBlock(e.target.value)}
              disabled={isReadonlyLineKeys}
            />
          </Field>

          <Field label={SS.details.kv.status} icon={ClipboardList}>
            <select
              className={INPUT_CLS}
              value={status}
              onChange={(e) => setStatus(canonStatus(e.target.value))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
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
              {LINE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={SS.details.kv.itemNo}
            icon={Package}
            error={isItem ? errors.itemNo : undefined}
          >
            <input
              className={INPUT_CLS}
              value={itemNo}
              onChange={(e) => setItemNo(e.target.value)}
              disabled={!isItem}
            />
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
            />
          </Field>

          <Field label={SS.details.kv.quantity} icon={Package}>
            <input
              type="number"
              step="0.001"
              className={INPUT_CLS}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
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

      {/* AMOUNTS */}
      {tab === "amounts" && (
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
        </div>
      )}

      {/* PARAMS */}
      {tab === "params" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Param1 */}
          <Field label={SS.details.kv.param(1)}>
            <input
              className={INPUT_CLS}
              placeholder="Code"
              value={p1c}
              onChange={(e) => setP1c(e.target.value)}
            />
          </Field>
          <Field label={`${SS.details.kv.param(1)} Value`}>
            <input
              className={INPUT_CLS}
              placeholder="Value"
              value={p1v}
              onChange={(e) => setP1v(e.target.value)}
            />
          </Field>

          {/* Param2 */}
          <Field label={SS.details.kv.param(2)}>
            <input
              className={INPUT_CLS}
              placeholder="Code"
              value={p2c}
              onChange={(e) => setP2c(e.target.value)}
            />
          </Field>
          <Field label={`${SS.details.kv.param(2)} Value`}>
            <input
              className={INPUT_CLS}
              placeholder="Value"
              value={p2v}
              onChange={(e) => setP2v(e.target.value)}
            />
          </Field>

          {/* Param3 */}
          <Field label={SS.details.kv.param(3)}>
            <input
              className={INPUT_CLS}
              placeholder="Code"
              value={p3c}
              onChange={(e) => setP3c(e.target.value)}
            />
          </Field>
          <Field label={`${SS.details.kv.param(3)} Value`}>
            <input
              className={INPUT_CLS}
              placeholder="Value"
              value={p3v}
              onChange={(e) => setP3v(e.target.value)}
            />
          </Field>

          {/* Param4 */}
          <Field label={SS.details.kv.param(4)}>
            <input
              className={INPUT_CLS}
              placeholder="Code"
              value={p4c}
              onChange={(e) => setP4c(e.target.value)}
            />
          </Field>
          <Field label={`${SS.details.kv.param(4)} Value`}>
            <input
              className={INPUT_CLS}
              placeholder="Value"
              value={p4v}
              onChange={(e) => setP4v(e.target.value)}
            />
          </Field>

          {/* Param5 */}
          <Field label={SS.details.kv.param(5)}>
            <input
              className={INPUT_CLS}
              placeholder="Code"
              value={p5c}
              onChange={(e) => setP5c(e.target.value)}
            />
          </Field>
          <Field label={`${SS.details.kv.param(5)} Value`}>
            <input
              className={INPUT_CLS}
              placeholder="Value"
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
          {SS.actions.cancel}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit ? SS.actions.saveChanges : SS.actions.createBlock}
        </button>
      </div>
    </form>
  );
}
