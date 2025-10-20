import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Hash,
  FileText,
  Calendar as CalendarIcon,
  User as UserIcon,
  Truck,
  Calculator,
  SlidersHorizontal,
  Package,
  Layers,
  DollarSign,
  Percent,
  ClipboardList,
} from "lucide-react";

import { useI18n as _useI18n } from "../helpers/i18n";
const useI18nSafe = _useI18n || (() => ({ t: null, locale: undefined }));

// ---- Status helpers (canonicalize + labels) ----
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

// Server-accepted sort keys (must match backend router)
const SERVER_SORT_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "lineNo",
  "status",
  "itemNo",
  "quantity",
  "unitPrice",
  "lineValue",
]);



const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

/* ===== session helpers (same pattern you use) ===== */
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

function docLabel(d) {
  const parts = [d.documentNo];
  if (d.sellCustomerName) parts.push(d.sellCustomerName);
  else if (d.billCustomerName) parts.push(d.billCustomerName);
  if (d.documentDate) parts.push(new Date(d.documentDate).toLocaleDateString());
  return parts.filter(Boolean).join(" — ");
}


/* =========================================
   PAGE
========================================= */
export default function SalesOfferLinesPage() {
  const COL_COUNT = 14; // increased because we add UOM column


  const { t, locale } = useI18nSafe();

  const S =
    (t && t.salesOfferLines) || {
      controls: {
        searchPlaceholder: "Search item/params…",
        searchBtn: "Search",
        addBtn: "New Line",
        filters: "Filters",
        docsLoading: "Loading documents…",
        allDocuments: "All documents",
        allStatuses: "All statuses",
        allLineTypes: "All line types",
        itemNoPlaceholder: "Item No.",
      },
      table: {
        lineNo: "Line No.",
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
        empty: "No lines",
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
          documentNo: "Document No.",
          documentId: "Document ID",
          status: "Status",
          type: "Type",
          itemNo: "Item No.",
          uom: "Unit of Measure",
          serviceDate: "Service Date",
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
          costMargin: "Cost Margin %",
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
        meta: (total, page, pages) => `Total: ${total} • Page ${page} of ${pages || 1}`,
        perPage: (n) => `${n} / page`,
        prev: "Prev",
        next: "Next",
      },
      modal: {
        titleEdit: "Edit Sales Offer Line",
        titleNew: "New Sales Offer Line",
      },
    };


  // filters / paging
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [status, setStatus] = useState("");
  const [lineType, setLineType] = useState("");
  const [itemNo, setItemNo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [documentNo, status, lineType, itemNo].filter(
    Boolean
  ).length;

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


  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      // Only forward sort params the backend accepts
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

      const res = await fetch(
        `${API}/api/sales-offer-lines?${params.toString()}`
      );
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", "Failed to load lines.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  let cancelled = false;

  async function loadDocs() {
    setDocsLoading(true);
    try {
      const res = await fetch(
        `${API}/api/documents?limit=1000&sortBy=createdAt&sortDir=desc`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Normalize and (optionally) de-duplicate by documentNo
      const raw = Array.isArray(json?.data) ? json.data : [];
      const normalized = raw.map(d => ({
        ...d,
        documentNo: d.documentNo || d.no || "", // ensure picker has this field
      }));
      const seen = new Set();
      const available = normalized.filter(d => {
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
  return () => { cancelled = true; };
}, []);



  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, limit, status, lineType, itemNo, sortBy, sortDir, documentNo]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (_id) => {
    if (!window.confirm("Delete this line?")) return;
    try {
      const res = await fetch(`${API}/api/sales-offer-lines/${_id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        if (expandedId === _id) setExpandedId(null);
        showNotice("success", "Line deleted.");
        fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice("error", json?.message || "Request failed");
      }
    } catch {
      showNotice("error", "Request failed");
    }
  };

  const onRecalc = async (_id) => {
    try {
      const res = await fetch(`${API}/api/sales-offer-lines/${_id}/recalc`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice("error", json?.message || "Recalc failed");
        return;
      }
      showNotice("success", "Recalculated.");
      fetchData();
    } catch {
      showNotice("error", "Recalc failed");
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

        <button
          type="button"
          onClick={() => {
            setEditing(null);
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
          aria-controls="sol-filters-panel"
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
        id="sol-filters-panel"
        className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-5 ${
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
          <option value="">{docsLoading ? S.controls.docsLoading : S.controls.allDocuments}</option>
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
        <div className="hidden md:block" />
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
                      >
                        {expandedId === d._id ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    </Td>
                    <Td className="font-mono">{d.lineNo}</Td>
                    <Td className="font-mono">{d.documentNo}</Td>
                    <Td>
                      <StatusBadge value={d.status} />
                    </Td>
                    <Td className="capitalize">{d.lineType || "—"}</Td>
                    <Td className="truncate max-w-[220px]">
                      {d.itemNo || "—"}
                    </Td>
                    <Td className="font-mono">{d.unitOfMeasure || "—"}</Td>
                    <Td className="text-right">{fmtDOT(d.unitPrice, 2, locale)}</Td>
                    <Td className="text-right">{fmtDOT(d.quantity, 3, locale)}</Td>
                    <Td className="text-right font-medium">
                      {fmtDOT(d.lineValue, 2, locale)}
                    </Td>
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
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100"
                          onClick={() => onRecalc(d._id)}
                          title="Recalculate"
                        >
                          <Calculator size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                          onClick={() => onDelete(d._id)}
                          title="Delete"
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
                            <KV label={S.details.kv.additionalCosts} icon={FileText}>
                              {fmtDOT(d.additionalCosts, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.costMarginPct} icon={Percent}>
                              {fmtDOT(d.costMargin, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.transportCost} icon={Truck}>
                              <b>{fmtDOT(d.transportCost, 2, locale)}</b>
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
              <option key={n} value={n}>{S.footer.perPage(n)}</option>
            ))}
          </select>

          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
          >
            {S.footer.prev}
          </button>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
            disabled={data.page >= (data.pages || 1)}
          >
            {S.footer.next}
          </button>
        </div>
      </div>
    </div>

    {/* CREATE/EDIT MODAL */}
{openForm && (
  <Modal
    title={editing ? S.modal.titleEdit : S.modal.titleNew}
    onClose={() => { setOpenForm(false); setEditing(null); }}
  >
    <SalesOfferLineForm
      initial={editing}
      onCancel={() => { setOpenForm(false); setEditing(null); }}
      onSaved={() => { setOpenForm(false); setEditing(null); setPage(1); fetchData(); }}
      showNotice={showNotice}
      docs={docs}
      docsLoading={docsLoading}
      S={S}                 // <-- pass translations
      locale={locale}       // <-- pass locale for numbers/dates
    />
  </Modal>
)}
  </div>
);

}

/* =========== small header cells =========== */
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

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-xl border border-slate-200">
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

function SalesOfferLineForm({
  initial,
  onCancel,
  onSaved,
  showNotice,
  docs = [],
  docsLoading = false,
  S,                 // <-- receive translations
  locale,            // <-- receive locale
}) {

  const isEdit = Boolean(initial?._id);
  const [tab, setTab] = useState("core");
  const [errors, setErrors] = useState({});

  // header-ish / keys
  const [documentNo, setDocumentNo] = useState(initial?.documentNo || "");
  const [lineNo] = useState(initial?.lineNo ?? null); // read-only on edit
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
  const [serviceDate, setServiceDate] = useState(
    initial?.serviceDate ? initial.serviceDate.slice(0, 10) : ""
  );
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    initial?.requestedDeliveryDate
      ? initial.requestedDeliveryDate.slice(0, 10)
      : ""
  );
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState(
    initial?.promisedDeliveryDate
      ? initial.promisedDeliveryDate.slice(0, 10)
      : ""
  );
  const [shipmentDate, setShipmentDate] = useState(
    initial?.shipmentDate ? initial.shipmentDate.slice(0, 10) : ""
  );
  const [documentValidityDate, setDocumentValidityDate] = useState(
    initial?.documentValidityDate
      ? initial.documentValidityDate.slice(0, 10)
      : ""
  );
  const [documentValidityHour, setDocumentValidityHour] = useState(
    initial?.documentValidityHour || ""
  );

  // parties / links
  const [buyVendorNo, setBuyVendorNo] = useState(initial?.buyVendorNo || "");
  const [payVendorNo, setPayVendorNo] = useState(initial?.payVendorNo || "");
  const [locationNo, setLocationNo] = useState(initial?.locationNo || "");
const [paramMeta, setParamMeta] = useState({});
  // params 1..5
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


  // compute preview (client-side)
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

  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";

const TABS = [
  { id: "core",   label: S.details.core,   Icon: FileText },
  { id: "dates",  label: S.details.kv.serviceDate ? S.details.kv.serviceDate.split(" ")[0] : "Dates", Icon: CalendarIcon }, // or keep "Dates" if you don't have a key
  { id: "costs",  label: S.details.amounts, Icon: DollarSign },
  { id: "parties",label: S.details.parties, Icon: UserIcon },
  { id: "params", label: S.details.params,  Icon: SlidersHorizontal },
  { id: "audit",  label: S.details.audit,   Icon: ClipboardList },
];

// --- Sales Line Parameters sync helpers ---
async function findSLP(documentNo, documentLineNo, paramCode) {
  const lineKey = Number(documentLineNo) || String(documentLineNo);
  const qs = new URLSearchParams({
    page: "1",
    limit: "1",
    documentNo,
    documentLineNo: String(lineKey), // queries are strings anyway
    paramCode,
  });
  const res = await fetch(`${API}/api/sales-line-parameters?${qs.toString()}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const row = json?.data?.[0];
  return row ? (row.id || row._id) : null;
}


async function upsertSLP({ documentNo, documentLineNo, paramCode, paramValue }) {
  // normalize the line key (some backends store lineNo as a number)
  const lineKey = Number(documentLineNo) || String(documentLineNo);

  // 1) find existing
  const existingId = await findSLP(documentNo, lineKey, paramCode);
  const body = { documentNo, documentLineNo: lineKey, paramCode };
  if (paramValue !== "" && paramValue !== null && paramValue !== undefined) {
    body.paramValue = paramValue; // let backend coerce type
  }

  if (existingId) {
    // 2a) update
    const res = await fetch(`${API}/api/sales-line-parameters/${existingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to update parameter.");
    }
    return true;
  } else {
    // 2b) create
    const res = await fetch(`${API}/api/sales-line-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to create parameter.");
    }
    return true;
  }
}

async function syncLineParams({ documentNo, documentLineNo, params, removeMissing = false }) {
  const filtered = params
    .map((p) => ({
      code: String(p.code || "").trim().toUpperCase(),
      value: p.value,
    }))
    .filter((p) => p.code);

  const failures = [];

  for (const p of filtered) {
    try {
      await upsertSLP({
        documentNo,
        documentLineNo,
        paramCode: p.code,
        paramValue: p.value === "" ? undefined : p.value,
      });
    } catch (e) {
      console.warn("Param upsert failed:", p.code, e?.message || e);
      failures.push({ code: p.code, error: e?.message || "Failed" });
    }
  }

  if (removeMissing) {
    try {
      const existing = await listSLPForLine(documentNo, documentLineNo);
      const keep = new Set(filtered.map((p) => p.code));
      const toDelete = existing.filter(
        (r) => !keep.has(String(r.paramCode || "").toUpperCase())
      );
      for (const r of toDelete) {
        try {
          await fetch(`${API}/api/sales-line-parameters/${r.id || r._id}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.warn("Param delete failed:", r.paramCode, e);
        }
      }
    } catch (e) {
      console.warn("List existing params failed:", e);
    }
  }

  if (failures.length) {
    const list = failures.map((f) => f.code).join(", ");
    throw new Error(`Some parameters failed: ${list}`);
  }
}


async function listSLPForLine(documentNo, documentLineNo) {
  const qs = new URLSearchParams({
    page: "1",
    limit: "200",
    documentNo,
    documentLineNo,
  });
  const res = await fetch(`${API}/api/sales-line-parameters?${qs.toString()}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}



  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    const lt = (lineType || "").toLowerCase();
    const isItem = lt === "item";

    if (!documentNo.trim()) errs.documentNo = "Document No. *";
    if (isItem && !itemNo.trim()) errs.itemNo = "Item No. *";
    if (!isEdit && !getUserCode())
      errs.userCreated = "Missing user code (session).";

    if (Object.keys(errs).length) {
      setErrors(errs);
      // smart focus to the tab with the first error
      if (errs.documentNo || errs.itemNo || errs.userCreated) setTab("core");
      return;
    }

    const payload = {
      documentNo: documentNo.trim(),
      status: canonStatus(status),
      lineType: (lineType || "item").toLowerCase(),
      lineNo: isEdit ? lineNo : undefined, // server auto-assigns when missing
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
    ? `${API}/api/sales-offer-lines/${initial._id}`
    : `${API}/api/sales-offer-lines`;
  const method = isEdit ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    showNotice("error", json?.message || "Save failed");
    return;
  }

  // figure out documentNo + lineNo to bind parameters to
  const saved = json || {};
  const docNoForParams = (saved.documentNo || payload.documentNo || "").toUpperCase();
  const lineNoForParams =
    saved.lineNo != null
      ? String(saved.lineNo)
      : lineNo != null
      ? String(lineNo)
      : null;

  if (!lineNoForParams) {
    // cannot bind parameters without line number
    showNotice("success", isEdit ? "Line updated." : "Line created.");
    onSaved();
    return;
  }

const fallback = (i) => (defaultParamCodes?.[i] || "").toUpperCase();

const paramsForSync = [
  { code: (p1c || fallback(0)), value: p1v },
  { code: (p2c || fallback(1)), value: p2v },
  { code: (p3c || fallback(2)), value: p3v },
  { code: (p4c || fallback(3)), value: p4v },
  { code: (p5c || fallback(4)), value: p5v },
];

  // run the sync (set removeMissing=true if you want to delete absent ones)
  try {
    await syncLineParams({
      documentNo: docNoForParams,
      documentLineNo: String(lineNoForParams),
      params: paramsForSync,
      removeMissing: true, // set to false if you prefer not to delete extras
    });
  } catch (e) {
    // don't block the main save, but notify
    showNotice("error", e?.message || "Parameters sync failed.");
  }

  showNotice("success", isEdit ? "Line updated." : "Line created.");
  onSaved();
} catch {
  showNotice("error", "Save failed");
}

  };

  const isItem = (lineType || "").toLowerCase() === "item";


  function toInputDate(v) {
  if (!v) return "";
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

useEffect(() => {
  if (!documentNo) return;
  const header = (docs || []).find(d => d.documentNo === documentNo);
  if (!header) return;

  // Parties (only fill if still empty)
  setBuyVendorNo(prev =>
    prev || header.brokerNo || header.billCustomerNo || header.sellCustomerNo || ""
  );
  setPayVendorNo(prev =>
    prev || header.billCustomerNo || header.sellCustomerNo || ""
  );
  setLocationNo(prev => prev || header.locationNo || "");

  // Dates (only fill if still empty)
  setServiceDate(prev => prev || toInputDate(header.serviceDate));
  setRequestedDeliveryDate(prev => prev || toInputDate(header.requestedDeliveryDate));
  setPromisedDeliveryDate(prev => prev || toInputDate(header.promisedDeliveryDate));
  setShipmentDate(prev => prev || toInputDate(header.shipmentDate));
  setDocumentValidityDate(prev => prev || toInputDate(header.documentValidityDate));

  // Status (fill on create / when empty)
  setStatus(prev => (prev ? prev : canonStatus(header.status || "new")));
}, [documentNo, docs]);




// Default param codes for the current item
const [defaultParamCodes, setDefaultParamCodes] = useState([]);

// Load default codes when item changes
useEffect(() => {
  let abort = false;
  (async () => {
    const no = (itemNo || "").trim().toUpperCase();
    if (!no) { if (!abort) setDefaultParamCodes([]); return; }
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "50",
        sort: "parameterCode:1",
        itemNo: no, // backend does a prefix match; we pass exact
      });
      const res = await fetch(`${API}/api/mdefault-item-parameters?${qs.toString()}`);
      const json = await res.json();
      const codes = Array.from(
        new Set((json?.data || [])
          .map(r => (r.parameterCode || "").toUpperCase())
          .filter(Boolean))
      );
      if (!abort) setDefaultParamCodes(codes);
    } catch {
      if (!abort) setDefaultParamCodes([]);
    }
  })();
  return () => { abort = true; };
}, [itemNo]);

// { CODE -> { description, defaultValue } }


const strOrEmpty = (v) => (v == null ? "" : String(v));

useEffect(() => {
  let abort = false;
  (async () => {
    if (!defaultParamCodes?.length) { if (!abort) setParamMeta({}); return; }

    const exact = defaultParamCodes
      .map(c => String(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const qs = new URLSearchParams({
      page: "1",
      limit: "500",
      sort: "code:1",
      query: `^(${exact})$`,
    });

    try {
      const res = await fetch(`${API}/api/params?${qs.toString()}`);
      const json = await res.json();
      const map = {};
      for (const p of json?.data || []) {
        const code = (p.code || "").toUpperCase();

        let dv = null;
        if (p.defaultValueText != null) dv = p.defaultValueText;
        else if (p.defaultValueBoolean != null) dv = p.defaultValueBoolean;
        else if (p.defaultValueDecimal != null) {
          const decRaw =
            typeof p.defaultValueDecimal === "object" &&
            p.defaultValueDecimal?.$numberDecimal != null
              ? p.defaultValueDecimal.$numberDecimal
              : p.defaultValueDecimal;
          dv = decRaw != null ? Number(decRaw) : null;
        }

        map[code] = {
          description: p.description || "",
          defaultValue: dv,
          type: p.type || "decimal",
        };
      }
      if (abort) return;
      setParamMeta(map);

      // Prefill values if still empty — without reading p1v..p5v
      const [c1, c2, c3, c4, c5] = defaultParamCodes.map(c => c?.toUpperCase());

      const ensure = (dv) => (prev) =>
        prev == null || prev === "" ? strOrEmpty(dv) : prev;

      setP1v(ensure(map[c1]?.defaultValue));
      setP2v(ensure(map[c2]?.defaultValue));
      setP3v(ensure(map[c3]?.defaultValue));
      setP4v(ensure(map[c4]?.defaultValue));
      setP5v(ensure(map[c5]?.defaultValue));
    } catch {
      if (!abort) setParamMeta({});
    }
  })();
  return () => { abort = true; };
}, [defaultParamCodes]);



// Push defaults into Param1..5 slots whenever defaults change
useEffect(() => {
  if (!defaultParamCodes.length) return;

  // First 5 only
  const [c1, c2, c3, c4, c5] = defaultParamCodes;

  setP1c(c1 || ""); if (p1v === undefined) setP1v("");
  setP2c(c2 || ""); if (p2v === undefined) setP2v("");
  setP3c(c3 || ""); if (p3v === undefined) setP3v("");
  setP4c(c4 || ""); if (p4v === undefined) setP4v("");
  setP5c(c5 || ""); if (p5v === undefined) setP5v("");
  // values remain as user-editable; backend model doesn’t carry default numeric values
  // If you want to CLEAR values on item change, do it here instead.
  // setP1v(""); setP2v(""); setP3v(""); setP4v(""); setP5v("");
}, [defaultParamCodes]); // eslint-disable-line


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
              <t.Icon size={16} className={active ? "opacity-80" : "opacity-60"} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* error banner */}
    {Object.keys(errors).length > 0 && (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {S.form?.fixErrors || "Please correct the highlighted fields."}
      </div>
    )}

    {/* CORE */}
    {tab === "core" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label={S.details.kv.documentNo} icon={Hash} error={errors.documentNo}>
          <DocumentPicker
            value={documentNo}
            onChange={(val) => setDocumentNo(val)}
            options={docs}
            loading={docsLoading}
            placeholder={S.controls?.pickDocument || "Pick document…"}
          />
        </Field>

        <Field label={S.details.kv.status} icon={ClipboardList}>
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

        <Field label={S.details.kv.type} icon={Layers}>
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

        {isEdit && (
          <Field label={S.details.kv.lineNo} icon={Hash}>
            <input className={INPUT_CLS} value={lineNo ?? ""} disabled />
          </Field>
        )}

        <Field
          label={S.details.kv.itemNo}
          icon={Package}
          error={isItem ? errors.itemNo : undefined}
        >
          {isItem ? (
            <ItemPicker
              value={itemNo}
              onPick={(it) => {
                setItemNo(it.no || "");
                setUnitOfMeasure((prev) => prev || it.baseUnitOfMeasure || prev);
                setUnitPrice((prev) => (prev && Number(prev) > 0 ? prev : Number(it.unitPrice) || 0));
              }}
              placeholder={S.controls?.searchItems || S.controls?.searchPlaceholder || "Search items…"}
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

        <Field label={S.details.kv.uom} icon={Package}>
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

        <Field label={S.details.kv.unitPrice} icon={DollarSign}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            disabled={!isItem}
          />
        </Field>

        <Field label={S.details.kv.quantity} icon={Package}>
          <input
            type="number"
            step="0.001"
            className={INPUT_CLS}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={!isItem}
          />
        </Field>

        <Field label={S.details.kv.lineValue} icon={DollarSign}>
          <input className={INPUT_CLS} value={fmtDOT(computedLineValue, 2, locale)} disabled />
        </Field>
      </div>
    )}

    {/* DATES */}
    {tab === "dates" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label={S.details.kv.serviceDate} icon={CalendarIcon}>
          <input
            type="date"
            className={INPUT_CLS}
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.requestedDeliveryDate} icon={CalendarIcon}>
          <input
            type="date"
            className={INPUT_CLS}
            value={requestedDeliveryDate}
            onChange={(e) => setRequestedDeliveryDate(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.promisedDeliveryDate} icon={CalendarIcon}>
          <input
            type="date"
            className={INPUT_CLS}
            value={promisedDeliveryDate}
            onChange={(e) => setPromisedDeliveryDate(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.shipmentDate} icon={CalendarIcon}>
          <input
            type="date"
            className={INPUT_CLS}
            value={shipmentDate}
            onChange={(e) => setShipmentDate(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.documentValidityDate} icon={CalendarIcon}>
          <input
            type="date"
            className={INPUT_CLS}
            value={documentValidityDate}
            onChange={(e) => setDocumentValidityDate(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.documentValidityHour} icon={CalendarIcon}>
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
        <Field label={S.details.kv.tollCost} icon={Truck}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={tollCost}
            onChange={(e) => setTollCost(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.driverCost} icon={UserIcon}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={driverCost}
            onChange={(e) => setDriverCost(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.vehicleCost} icon={Truck}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={vehicleCost}
            onChange={(e) => setVehicleCost(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.additionalCosts} icon={FileText}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={additionalCosts}
            onChange={(e) => setAdditionalCosts(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.costMarginPct} icon={Percent}>
          <input
            type="number"
            step="0.01"
            className={INPUT_CLS}
            value={costMargin}
            onChange={(e) => setCostMargin(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.transportCost} icon={Truck}>
          <input className={INPUT_CLS} value={fmtDOT(computedTransport, 2, locale)} disabled />
        </Field>
      </div>
    )}

    {/* PARTIES */}
    {tab === "parties" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label={S.details.kv.buyVendorNo} icon={Hash}>
          <input
            className={INPUT_CLS}
            value={buyVendorNo}
            onChange={(e) => setBuyVendorNo(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.payVendorNo} icon={Hash}>
          <input
            className={INPUT_CLS}
            value={payVendorNo}
            onChange={(e) => setPayVendorNo(e.target.value)}
          />
        </Field>
        <Field label={S.details.kv.locationNo} icon={Hash}>
          <input
            className={INPUT_CLS}
            value={locationNo}
            onChange={(e) => setLocationNo(e.target.value)}
          />
        </Field>
      </div>
    )}

    {/* AUDIT (read-only) */}
    {tab === "audit" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label={S.details.kv.createdBy} icon={UserIcon}>
          <input className={INPUT_CLS} value={initial?.userCreated || "—"} disabled />
        </Field>
        <Field label={S.details.kv.createdAt} icon={CalendarIcon}>
          <input
            className={INPUT_CLS}
            value={initial?.dateCreated ? new Date(initial.dateCreated).toLocaleString() : "—"}
            disabled
          />
        </Field>
        <div />
        <Field label={S.details.kv.modifiedBy} icon={UserIcon}>
          <input className={INPUT_CLS} value={initial?.userModified || "—"} disabled />
        </Field>
        <Field label={S.details.kv.modifiedAt} icon={CalendarIcon}>
          <input
            className={INPUT_CLS}
            value={initial?.dateModified ? new Date(initial.dateModified).toLocaleString() : "—"}
            disabled
          />
        </Field>
        <div />
        <Field label={S.details.kv.documentId} icon={Hash}>
          <input className={INPUT_CLS} value={initial?.documentId || "—"} disabled />
        </Field>
      </div>
    )}

    {/* PARAMS */}
{tab === "params" && (
  <div className="space-y-2">
    {defaultParamCodes.length > 0 && (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Loaded <b>{defaultParamCodes.length}</b> default parameter
        {defaultParamCodes.length === 1 ? "" : "s"} for item <span className="font-mono">{itemNo || "—"}</span>.
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<ParamRow
  idx="1" c={p1c} v={p1v} setC={setP1c} setV={setP1v}
  defaultCode={defaultParamCodes[0]}
  description={paramMeta[defaultParamCodes[0]?.toUpperCase()]?.description}
  defaultValue={paramMeta[defaultParamCodes[0]?.toUpperCase()]?.defaultValue}
  paramType={paramMeta[defaultParamCodes[0]?.toUpperCase()]?.type}
/>
<ParamRow
  idx="2" c={p2c} v={p2v} setC={setP2c} setV={setP2v}
  defaultCode={defaultParamCodes[1]}
  description={paramMeta[defaultParamCodes[1]?.toUpperCase()]?.description}
  defaultValue={paramMeta[defaultParamCodes[1]?.toUpperCase()]?.defaultValue}
  paramType={paramMeta[defaultParamCodes[1]?.toUpperCase()]?.type}
/>
<ParamRow
  idx="3" c={p3c} v={p3v} setC={setP3c} setV={setP3v}
  defaultCode={defaultParamCodes[2]}
  description={paramMeta[defaultParamCodes[2]?.toUpperCase()]?.description}
  defaultValue={paramMeta[defaultParamCodes[2]?.toUpperCase()]?.defaultValue}
  paramType={paramMeta[defaultParamCodes[2]?.toUpperCase()]?.type}
/>
<ParamRow
  idx="4" c={p4c} v={p4v} setC={setP4c} setV={setP4v}
  defaultCode={defaultParamCodes[3]}
  description={paramMeta[defaultParamCodes[3]?.toUpperCase()]?.description}
  defaultValue={paramMeta[defaultParamCodes[3]?.toUpperCase()]?.defaultValue}
  paramType={paramMeta[defaultParamCodes[3]?.toUpperCase()]?.type}
/>
<ParamRow
  idx="5" c={p5c} v={p5v} setC={setP5c} setV={setP5v}
  defaultCode={defaultParamCodes[4]}
  description={paramMeta[defaultParamCodes[4]?.toUpperCase()]?.description}
  defaultValue={paramMeta[defaultParamCodes[4]?.toUpperCase()]?.defaultValue}
  paramType={paramMeta[defaultParamCodes[4]?.toUpperCase()]?.type}
/>

    </div>
  </div>
)}



    {/* footer buttons */}
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
      >
        {S.actions?.cancel || "Cancel"}
      </button>
      <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
        {isEdit ? (S.actions?.saveChanges || "Save changes") : (S.actions?.createLine || "Create line")}
      </button>
    </div>
  </form>
);

}

function ParamRow({
  idx,
  c,
  v,
  setC,
  setV,
  defaultCode,
  description,
  defaultValue,
  paramType, // "decimal" | "text" | "boolean"
}) {
  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";
  const [range, setRange] = useState({ min: null, max: null, def: null });
  const [desc, setDesc] = useState(description || "");
  const [kind, setKind] = useState(paramType || "decimal"); // UI control type

  const hasDefault = !!defaultCode;

  useEffect(() => {
    if (hasDefault) setC(defaultCode);
  }, [hasDefault, defaultCode, setC]);

  useEffect(() => {
    setDesc(description || "");
    setRange({
      min: null,
      max: null,
      def: defaultValue ?? null,
    });
    if (paramType) setKind(paramType);
  }, [description, defaultValue, paramType]);

  const valuePlaceholder =
    range.def != null ? `Default ${range.def}` : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label={`Param${idx} Code`}>
        {hasDefault ? (
          <div>
            <input
              className={INPUT_CLS + " bg-slate-50"}
              value={`${defaultCode || ""}${desc ? " | " + desc : ""}`}
              disabled
            />
          </div>
        ) : (
          <div>
            <ParameterPicker
              value={c}
              onPick={(p) => {
                const pickedCode = (p?.code || "").toUpperCase();
                setC(pickedCode);
                setKind(p?.type || "decimal");

                if (
                  p &&
                  (p.description ||
                    p.defaultValue != null ||
                    p.minValue != null ||
                    p.maxValue != null)
                ) {
                  setDesc(p.description || "");
                  setRange({
                    min: p.minValue ?? null,
                    max: p.maxValue ?? null,
                    def: p.defaultValue ?? null,
                  });
                  if ((v == null || v === "") && p.defaultValue != null) {
                    setV(String(p.defaultValue));
                  }
                } else {
                  setDesc("");
                  setRange({ min: null, max: null, def: null });
                }
              }}
              placeholder="Search parameters…"
              displayWhenClosed={c ? `${c}${desc ? " | " + desc : ""}` : ""}
            />
            {desc && (
              <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                {desc}
              </div>
            )}
          </div>
        )}
      </Field>

      <Field label={`Param${idx} Value`}>
        {kind === "boolean" ? (
          <select
            className={INPUT_CLS}
            value={String(v ?? "")}
            onChange={(e) => setV(e.target.value === "true")}
          >
            <option value="">—</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <input
            type={kind === "decimal" ? "number" : "text"}
            step={kind === "decimal" ? "0.01" : undefined}
            className={INPUT_CLS}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={(e) => {
              if (kind !== "decimal") return;
              const n = e.target.value === "" ? null : Number(e.target.value);
              if (n == null || !Number.isFinite(n)) return;
              if (range.min != null && n < range.min) setV(String(range.min));
              if (range.max != null && n > range.max) setV(String(range.max));
            }}
            placeholder={valuePlaceholder}
          />
        )}
      </Field>
    </div>
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
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}
function StatusBadge({ value }) {
  const v = canonStatus(value || "new");
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

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}

function DocumentPicker({ value, onChange, options = [], loading = false, placeholder = "Pick document…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  // find currently selected doc
  const selected = options.find(o => o.documentNo === value) || null;

  // filter by documentNo, customer names, location, broker
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(d => {
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

  function primary(d) {
    return d.documentNo;
  }
  function secondary(d) {
    return (
      d.sellCustomerName ||
      d.billCustomerName ||
      d.locationName ||
      d.brokerName ||
      ""
    );
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Input / button */}
      <div
        className={[
          "h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm",
          "border-slate-300 focus-within:border-slate-400 focus-within:ring-0",
          "flex items-center gap-2",
        ].join(" ")}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : (selected?.documentNo || "")}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {/* Panel */}
      {open && (
  <div
    className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg"
    role="listbox"
    onMouseDown={(e) => e.stopPropagation()} // <- prevent outside handler
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
  onMouseDown={(e) => {                 // <- use mousedown
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
                        {primary(d)}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        {secondary(d) || "—"}
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


function useDebouncedValue(v, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function ItemPicker({
  value,                // current selected item no
  onPick,              // (item) => void
  placeholder = "Search items…",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  // Fetch items on open + query change
  useEffect(() => {
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
    return () => { abort = true; };
  }, [open, debounced]);

  // helpers for rendering
  const filtered = items; // backend handles filtering
  const displayText = open ? query : (value || "");

  return (
    <div ref={rootRef} className="relative">
      {/* input */}
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

      {/* panel */}
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
                  onClick={() => {
                    onPick({ no: query.trim() });
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Use exact value: <span className="font-mono">{query.trim()}</span>
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
  onMouseDown={(e) => {                     // <-- use mousedown
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
                      <div className="font-semibold tracking-tight">{it.no}</div>
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

function ParameterPicker({
  value,                    // current selected param code (string)
  onPick,                   // ({ code, description, type, minValue, maxValue, defaultValue }) => void
  placeholder = "Search parameters…",
   displayWhenClosed,    
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let abort = false;

    async function run() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          limit: "50",
          page: "1",
          sort: "code:1",
          active: "true",
        });
        if (debounced) qs.set("query", debounced);

        const url = `${API}/api/params?${qs.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (!abort) setList([]);
          return;
        }
        const json = await res.json();
        const rows = (json?.data || []).map((p) => ({
          code: String(p.code || "").toUpperCase(),
          description: p.description || "",
          type: p.type || "decimal",
          minValue: p.minValue ?? null,
          maxValue: p.maxValue ?? null,
          defaultValue: p.defaultValue ?? null,
        }));
        if (!abort) setList(rows);
      } catch {
        if (!abort) setList([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }

    run();
    return () => { abort = true; };
  }, [open, debounced]);

 const displayText = open ? query : (displayWhenClosed ?? value ?? "");

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
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
              {query?.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick({ code: query.trim().toUpperCase() });
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Use code: <span className="font-mono">{query.trim().toUpperCase()}</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {list.map((p) => {
                const isActive = p.code === value;
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(p); // { code, description, type, minValue, maxValue, defaultValue }
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold tracking-tight">{p.code}</div>
                      {p.description && (
                        <div className="text-[11px] tracking-wide text-slate-500">
                          {p.description}
                        </div>
                      )}
                      {p.defaultValue != null && (
                        <div className="text-[11px] tracking-wide text-slate-500">
                          Default: {p.defaultValue}
                        </div>
                      )}
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
export { SalesOfferLineForm };