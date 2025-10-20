  import React, { useEffect, useMemo, useState } from "react";
  import { useI18n } from "../helpers/i18n";
  import { SalesOfferLineForm } from "./SalesOfferLines";
  import SalesOfferPdf from "../components/SalesOfferPdf";
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
    IdCard,
    Globe,
    MapPin,
    PhoneCall,
    Mail,
    DollarSign,
    Truck,
    Ship,
    Building,
    CheckCircle2,
    AlertTriangle,
    SlidersHorizontal,
  } from "lucide-react";

  // ---- Status helpers (canonicalize + labels) ----
  const STATUS_CANON_MAP = {
    new: "new",
    on_hold: "on-hold", // accept underscore -> send hyphen
    "on-hold": "on-hold",
    accepted: "accepted",
    approved: "approved",
    mached: "matched", // typo -> fixed
    matched: "matched",
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






  const STATUS_OPTIONS = Object.keys(STATUS_LABELS); // -> use for selects/filters

  const API =
    process.env.REACT_APP_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://api.217.154.88.40.sslip.io");

  /* ============================================
    LIST + CREATE/EDIT MODAL
  ============================================ */

  function getSession() {
    try {
      // can be set by your auth layer
      if (window.__APP_SESSION__) return window.__APP_SESSION__;
      const raw = localStorage.getItem("session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getUserCode(fallback = "web") {
    const sess = getSession();
    // prefer business code (e.g. "ADM-001"), then username/email
    return (
      (window.__APP_USER__ &&
        (window.__APP_USER__.code || window.__APP_USER__.username)) ||
      (sess && (sess.code || sess.username || sess.email)) ||
      localStorage.getItem("userCode") ||
      fallback
    );
  }

  export default function Sell() {
    const { t, locale } = useI18n();
    const T = t.sells || {};
    const COL_COUNT = 12;

    const L = {
      title: T.title || "Sales Documents",
      searchPh: T.searchPh || "Search no., customer, location, broker…",
      addBtn: T.addBtn || "New Document",
      filters: T.filters || "Filters",
      all: T.all || "All statuses",
      status: T.status || "Status",
      documentNo: T.documentNo || "Document No.",
      externalDocumentNo: T.externalDocumentNo || "External Doc. No.",
      info: T.info || "Document Info",
      documentDate: T.documentDate || "Document Date",
      dueDate: T.dueDate || "Due Date",
      currency: T.currency || "Currency",
      currencyFactor: T.currencyFactor || "Currency Factor",
      sellTo: T.sellTo || "Sell-to",
      billTo: T.billTo || "Bill-to",
      location: T.location || "Location",
      shipment: T.shipment || "Shipment",
      transport: T.transport || "Transport",
      broker: T.broker || "Broker",
      created: T.created || "Created",
      actions: T.actions || "",
      loading: T.loading || "Loading…",
      empty: T.empty || "No documents",
      requestFail: T.requestFail || "Request failed",
      deleted: T.deleted || "Document deleted.",
      deleteConfirm: T.deleteConfirm || "Delete this document?",
      kv: T.kv || {},
      statusMap: {
        ...STATUS_LABELS,
        ...(T.statusMap || {}),
      },
    };

    const LL = T.lines || {};
const LH = (LL.headers || {});
const S_lines = t.sells?.lineForm || {};

    // filters / paging
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const activeFilterCount = [status, dateFrom, dateTo].filter(Boolean).length;
    const [openPdfFor, setOpenPdfFor] = useState(null); 
    const [notice, setNotice] = useState(null);
    const showNotice = (type, text, ms = 3000) => {
      setNotice({ type, text });
      if (ms) setTimeout(() => setNotice(null), ms);
    };

    const [sortBy, setSortBy] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");
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
    const [lineCache, setLineCache] = useState({}); 


  const [openLineForm, setOpenLineForm] = useState(false);
  const [lineInitial, setLineInitial] = useState(null); // prefill for current doc


  async function ensureLines(documentNo, { force = false } = {}) {
    if (!documentNo) return;
    const cached = lineCache[documentNo];
    if (!force && (cached?.loading || cached?.rows)) return;

  setLineCache(m => ({ 
    ...m, 
    [documentNo]: { ...(cached || {}), loading: true, error: null, rows: null } 
  }));

    try {
      const params = new URLSearchParams({ page: "1", limit: "500", documentNo });
      const url = `${API}/api/sales-offer-lines?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json?.data) ? json.data : [];
      setLineCache(m => ({ ...m, [documentNo]: { loading: false, error: null, rows } }));
    } catch (e) {
      setLineCache(m => ({ ...m, [documentNo]: { loading: false, error: "Failed to load lines.", rows: [] } }));
    }
  }


  // near other state
  const [docsForPicker, setDocsForPicker] = useState([]);
  const [docsForPickerLoading, setDocsForPickerLoading] = useState(false);

  // load once, or when opening the modal
  useEffect(() => {
    if (!openLineForm) return;
    let cancelled = false;
    (async () => {
      setDocsForPickerLoading(true);
      try {
        const res = await fetch(`${API}/api/documents?limit=1000&sortBy=createdAt&sortDir=desc`);
        const json = await res.json().catch(() => ({}));
        const raw = Array.isArray(json?.data) ? json.data : [];
        const normalized = raw.map(d => ({ ...d, documentNo: d.documentNo || d.no || "" }));
        const seen = new Set();
        const unique = normalized.filter(d => {
          if (!d.documentNo || seen.has(d.documentNo)) return false;
          seen.add(d.documentNo);
          return true;
        });
        if (!cancelled) setDocsForPicker(unique);
      } catch {
        if (!cancelled) setDocsForPicker([]);
      } finally {
        if (!cancelled) setDocsForPickerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openLineForm]);


  function refreshLines(documentNo) {
    ensureLines(documentNo, { force: true });
  }

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortDir,
        });
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`${API}/api/documents?${params.toString()}`);
        const json = await res.json();
        setData(json);
      } catch {
        showNotice("error", T.loadFail || "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchData(); // eslint-disable-next-line
    }, [page, limit, status, dateFrom, dateTo, sortBy, sortDir]);

    const onSearch = (e) => {
      e.preventDefault();
      setPage(1);
      fetchData();
    };

    const onDelete = async (_id) => {
      if (!window.confirm(L.deleteConfirm)) return;
      try {
        const res = await fetch(`${API}/api/documents/${_id}`, {
          method: "DELETE",
        });
        if (res.status === 204) {
          if (expandedId === _id) setExpandedId(null);
          showNotice("success", L.deleted);
          fetchData();
        } else {
          const json = await res.json().catch(() => ({}));
          showNotice("error", json?.message || L.requestFail);
        }
      } catch {
        showNotice("error", L.requestFail);
      }
    };

    const rows = useMemo(() => {
      const arr = [...(data?.data || [])];
      const dir = sortDir === "asc" ? 1 : -1;
      const keyMap = {
        documentNo: "documentNo",
        status: "status",
        sellCustomer: "sellCustomerName",
        billCustomer: "billCustomerName",
        documentDate: "documentDate",
        dueDate: "dueDate",
        currencyCode: "currencyCode",
        createdAt: "createdAt",
      };
      const k = keyMap[sortBy] || sortBy;
      const val = (r) => {
        const v = r?.[k];
        if (k === "documentDate" || k === "dueDate" || k === "createdAt") {
          return v ? new Date(v).getTime() : 0;
        }
        return (v ?? "").toString().toLowerCase();
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

    function SortableTh({
      id,
      sortBy,
      sortDir,
      onSort,
      children,
      className = "",
    }) {
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
                placeholder={L.searchPh}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                title="Search"
                aria-label="Search"
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
              {L.addBtn}
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
              aria-expanded={showFilters}
              aria-controls="sell-filters-panel"
            >
              <SlidersHorizontal size={16} className="opacity-70" />
              {L.filters}
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters Row */}
          <div
            id="sell-filters-panel"
            className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-4 ${
              showFilters ? "grid" : "hidden md:grid"
            }`}
          >
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="">{L.all}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
                placeholder="From"
              />
            </div>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
                placeholder="To"
              />
            </div>
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
                  <SortableTh id="documentNo" {...{ sortBy, sortDir, onSort }}>
                    {L.documentNo}
                  </SortableTh>
                  <SortableTh id="status" {...{ sortBy, sortDir, onSort }}>
                    {L.status}
                  </SortableTh>
                  <SortableTh id="sellCustomer" {...{ sortBy, sortDir, onSort }}>
                    {L.sellTo}
                  </SortableTh>
                  <SortableTh id="billCustomer" {...{ sortBy, sortDir, onSort }}>
                    {L.billTo}
                  </SortableTh>
                  <SortableTh id="documentDate" {...{ sortBy, sortDir, onSort }}>
                    {L.documentDate}
                  </SortableTh>
                  <SortableTh id="dueDate" {...{ sortBy, sortDir, onSort }}>
                    {L.dueDate}
                  </SortableTh>
                  <SortableTh
                    id="currencyCode"
                    {...{ sortBy, sortDir, onSort }}
                    className="text-center"
                  >
                    {L.currency}
                  </SortableTh>

                  <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                    {L.created}
                  </SortableTh>
                  <Th className="pr-3">{L.actions}</Th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={COL_COUNT}
                      className="p-6 text-center text-slate-500"
                    >
                      {L.loading}
                    </td>
                  </tr>
                ) : (data.data?.length || 0) === 0 ? (
                  <tr>
                    <td
                      colSpan={COL_COUNT}
                      className="p-6 text-center text-slate-500"
                    >
                      {L.empty}
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
      setExpandedId((id) => {
        const next = id === d._id ? null : d._id;
        if (next) ensureLines(d.documentNo);   // <-- this line calls the loader
        return next;
      })
    }
    aria-label="Toggle details"
    title="Toggle details"
  >
    {expandedId === d._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
  </button>

                        </Td>
                        <Td className="font-mono">{d.documentNo}</Td>
                        <Td>
                          <StatusBadge value={d.status} map={L.statusMap} />
                        </Td>
                        <Td className="truncate max-w-[220px]">
                          {d.sellCustomerName || d.sellCustomerNo || "—"}
                        </Td>
                        <Td className="truncate max-w-[220px]">
                          {d.billCustomerName || d.billCustomerNo || "—"}
                        </Td>
                        <Td>{formatDate(d.documentDate, locale, "—")}</Td>
                        <Td>{formatDate(d.dueDate, locale, "—")}</Td>
                        <Td className="text-center font-medium">
                          {d.currencyCode || "—"}{" "}
                          <span className="text-slate-500">
                            {d.currencyFactor
                              ? `• ${fmtDOT(d.currencyFactor, 4)}`
                              : ""}
                          </span>
                        </Td>

                        <Td>{formatDate(d.createdAt, locale, "—")}</Td>
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
  onClick={() => setOpenPdfFor(d)}
  title="Generate PDF"
  aria-label="Generate PDF"
>
  <FileText size={16} />
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
<Section
  className="md:col-span-3"
  title={
    <div className="flex items-center justify-between">
      <span>
        {LL.title || "Lines (sum)"} {(lineCache[d.documentNo]?.rows || []).length || 0}
      </span>
      <button
        type="button"
        onClick={() => {
          setLineInitial({ documentNo: d.documentNo, status: canonStatus(d.status || "new") });
          setOpenLineForm(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700"
        title={LL.addBtn || "Add Line"}
      >
        <Plus size={14} /> {LL.addBtn || "Add Line"}
      </button>
    </div>
  }
>
  {(() => {
    const docNo = d.documentNo;
    const cache = lineCache[docNo] || { loading: false, error: null, rows: [] };

    if (cache.loading) return <div className="text-sm text-slate-500 px-1 py-1">{LL.loading || "Loading lines…"}</div>;
    if (cache.error) return <div className="text-sm text-red-600 px-1 py-1">{cache.error}</div>;
    if (!cache.rows || cache.rows.length === 0) return <div className="text-sm text-slate-500 px-1 py-1">{LL.empty || "No lines"}</div>;

    // ---- totals ----
    const sumLineValue = cache.rows.reduce((a, r) => a + (Number(r.lineValue) || 0), 0);
    const sumTransport = cache.rows.reduce((a, r) => a + (Number(r.transportCost) || 0), 0);

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
  <tr>
    <th className="text-left px-3 py-2 font-medium">{LH.lineNo || "Line No."}</th>
    <th className="text-left px-3 py-2 font-medium">{LH.status || "Status"}</th>
    <th className="text-left px-3 py-2 font-medium">{LH.type || "Type"}</th>
    <th className="text-left px-3 py-2 font-medium">{LH.item || "Item"}</th>
    <th className="text-left px-3 py-2 font-medium">{LH.uom || "UOM"}</th>
    <th className="text-right px-3 py-2 font-medium">{LH.unitPrice || "Unit Price"}</th>
    <th className="text-right px-3 py-2 font-medium">{LH.qty || "Qty"}</th>
    <th className="text-right px-3 py-2 font-medium">{LH.lineValue || "Line Value"}</th>
    <th className="text-right px-3 py-2 font-medium">{LH.transport || "Transport"}</th>
    <th className="text-left px-3 py-2 font-medium">{LH.updated || "Updated"}</th>
    <th className="text-right px-3 py-2 font-medium">{LH.actions || "Actions"}</th>
  </tr>
          </thead>

          <tbody>
            {cache.rows.map((ln) => (
              <tr key={ln._id} className="border-t">
                <td className="px-3 py-2 font-mono">{ln.lineNo ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge value={ln.status} map={L.statusMap} /></td>
                <td className="px-3 py-2 capitalize">{ln.lineType || "—"}</td>
                <td className="px-3 py-2 truncate max-w-[220px]">{ln.itemNo || "—"}</td>
                <td className="px-3 py-2 font-mono">{ln.unitOfMeasure || "—"}</td>
                <td className="px-3 py-2 text-right">{fmtDOT(ln.unitPrice, 2)}</td>
                <td className="px-3 py-2 text-right">{fmtDOT(ln.quantity, 3)}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtDOT(ln.lineValue, 2)}</td>
                <td className="px-3 py-2 text-right">{fmtDOT(ln.transportCost, 2)}</td>
                <td className="px-3 py-2">{formatDate(ln.updatedAt || ln.dateModified, locale, "—")}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100"
                      title="Edit line"
                      onClick={() => {
                        setLineInitial(ln);
                        setOpenLineForm(true);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

<tfoot className="bg-slate-50">
  <tr className="border-t">
    <td className="px-3 py-2 text-right font-semibold" colSpan={7}>
      {LL.totalsLabel || "Totals:"}
    </td>
    <td className="px-3 py-2 text-right font-semibold">{fmtDOT(sumLineValue, 2)}</td>
    <td className="px-3 py-2 text-right font-semibold">{fmtDOT(sumTransport, 2)}</td>
    <td className="px-3 py-2" colSpan={2}></td>
  </tr>
</tfoot>

        </table>
      </div>
    );
  })()}
</Section>


                              <Section title="Header">
                                <KV label={L.kv.externalDocumentNo} icon={Hash}>
                                  {d.externalDocumentNo || "—"}
                                </KV>
                                <KV label={L.kv.documentInfo} icon={FileText}>
                                  {d.documentInfo || "—"}
                                </KV>
                                <KV label={L.kv.createdBy} icon={UserIcon}>
                                  {d.userCreated || "—"}
                                </KV>
                                <KV label={L.kv.createdAt} icon={CalendarIcon}>
                                  {formatDate(d.dateCreated, locale, "—")}
                                </KV>
                                <KV label={L.kv.modifiedBy} icon={UserIcon}>
                                  {d.userModified || "—"}
                                </KV>
                                <KV label={L.kv.modifiedAt} icon={CalendarIcon}>
                                  {formatDate(d.dateModified, locale, "—")}
                                </KV>

                                <KV label={L.kv.currency} icon={DollarSign}>
                                  {d.currencyCode || "—"}{" "}
                                  {d.currencyFactor
                                    ? `(${fmtDOT(d.currencyFactor, 6)})`
                                    : ""}
                                </KV>

                                <KV label={L.kv.documentDate} icon={CalendarIcon}>
                                  {formatDate(d.documentDate, locale, "—")}
                                </KV>
                                <KV label={L.kv.serviceDate} icon={CalendarIcon}>
                                  {formatDate(d.serviceDate, locale, "—")}
                                </KV>
                                <KV
                                  label={L.kv.requestedDeliveryDate}
                                  icon={CalendarIcon}
                                >
                                  {formatDate(
                                    d.requestedDeliveryDate,
                                    locale,
                                    "—"
                                  )}
                                </KV>
                                <KV
                                  label={L.kv.promisedDeliveryDate}
                                  icon={CalendarIcon}
                                >
                                  {formatDate(
                                    d.promisedDeliveryDate,
                                    locale,
                                    "—"
                                  )}
                                </KV>
                                <KV label={L.kv.shipmentDate} icon={CalendarIcon}>
                                  {formatDate(d.shipmentDate, locale, "—")}
                                </KV>
                                <KV label={L.kv.dueDate} icon={CalendarIcon}>
                                  {formatDate(d.dueDate, locale, "—")}
                                </KV>
                              </Section>

                              <Section title={L.sellTo}>
                                <KV label={L.kv.no} icon={IdCard}>
                                  {d.sellCustomerNo || "—"}
                                </KV>
                                <KV label={L.kv.name} icon={UserIcon}>
                                  {d.sellCustomerName || "—"}
                                </KV>
                                <KV label={L.kv.name2} icon={UserIcon}>
                                  {d.sellCustomerName2 || "—"}
                                </KV>
                                <KV label={L.kv.address} icon={Building}>
                                  {d.sellCustomerAddress || "—"}
                                </KV>
                                <KV label={L.kv.address2} icon={Building}>
                                  {d.sellCustomerAddress2 || "—"}
                                </KV>
                                <KV label={L.kv.city} icon={MapPin}>
                                  {d.sellCustomerCity || "—"}
                                </KV>
                                <KV label={L.kv.region} icon={MapPin}>
                                  {d.sellCustomerRegion || "—"}
                                </KV>
                                <KV label={L.kv.postCode} icon={Hash}>
                                  {d.sellCustomerPostCode || "—"}
                                </KV>
                                <KV label={L.kv.country} icon={Globe}>
                                  {d.sellCustomerCountry || "—"}
                                </KV>
                                <KV label={L.kv.email} icon={Mail}>
                                  {d.sellCustomerEmail || "—"}
                                </KV>
                                <KV label={L.kv.phone} icon={PhoneCall}>
                                  {d.sellCustomerPhoneNo || "—"}
                                </KV>
                              </Section>

                              <Section title={L.billTo}>
                                <KV label={L.kv.no} icon={IdCard}>
                                  {d.billCustomerNo || "—"}
                                </KV>
                                <KV label={L.kv.name} icon={UserIcon}>
                                  {d.billCustomerName || "—"}
                                </KV>
                                <KV label={L.kv.name2} icon={UserIcon}>
                                  {d.billCustomerName2 || "—"}
                                </KV>
                                <KV label={L.kv.address} icon={Building}>
                                  {d.billCustomerAddress || "—"}
                                </KV>
                                <KV label={L.kv.address2} icon={Building}>
                                  {d.billCustomerAddress2 || "—"}
                                </KV>
                                <KV label={L.kv.city} icon={MapPin}>
                                  {d.billCustomerCity || "—"}
                                </KV>
                                <KV label={L.kv.region} icon={MapPin}>
                                  {d.billCustomerRegion || "—"}
                                </KV>
                                <KV label={L.kv.postCode} icon={Hash}>
                                  {d.billCustomerPostCode || "—"}
                                </KV>
                                <KV label={L.kv.country} icon={Globe}>
                                  {d.billCustomerCountry || "—"}
                                </KV>
                                <KV label={L.kv.email} icon={Mail}>
                                  {d.billCustomerEmail || "—"}
                                </KV>
                                <KV label={L.kv.phone} icon={PhoneCall}>
                                  {d.billCustomerPhoneNo || "—"}
                                </KV>
                                <KV label={L.kv.nip} icon={Hash}>
                                  {d.billCustomerNip || "—"}
                                </KV>
                              </Section>

                              <Section title={L.location}>
                                <KV label={L.kv.no} icon={IdCard}>
                                  {d.locationNo || "—"}
                                </KV>
                                <KV label={L.kv.name} icon={Building}>
                                  {d.locationName || "—"}
                                </KV>
                                <KV label={L.kv.name2} icon={Building}>
                                  {d.locationName2 || "—"}
                                </KV>
                                <KV label={L.kv.address} icon={Building}>
                                  {d.locationAddress || "—"}
                                </KV>
                                <KV label={L.kv.address2} icon={Building}>
                                  {d.locationAddress2 || "—"}
                                </KV>
                                <KV label={L.kv.city} icon={MapPin}>
                                  {d.locationCity || "—"}
                                </KV>
                                <KV label={L.kv.region} icon={MapPin}>
                                  {d.locationRegion || "—"}
                                </KV>
                                <KV label={L.kv.postCode} icon={Hash}>
                                  {d.locationPostCode || "—"}
                                </KV>
                                <KV label={L.kv.country} icon={Globe}>
                                  {d.locationCountry || "—"}
                                </KV>
                                <KV label={L.kv.email} icon={Mail}>
                                  {d.locationEmail || "—"}
                                </KV>
                                <KV label={L.kv.phone} icon={PhoneCall}>
                                  {d.locationPhoneNo || "—"}
                                </KV>
                              </Section>

                              <Section title={L.shipment}>
                                <KV label={L.kv.method} icon={Truck}>
                                  {d.shipmentMethod || "—"}
                                </KV>
                                <KV label={L.kv.agent} icon={Ship}>
                                  {d.shipmentAgent || "—"}
                                </KV>
                              </Section>

                              <Section title={L.transport}>
                                <KV label={L.kv.transportNo} icon={IdCard}>
                                  {d.transportNo || "—"}
                                </KV>
                                <KV label={L.kv.transportName} icon={UserIcon}>
                                  {d.transportName || "—"}
                                </KV>
                                <KV label={L.kv.transportId} icon={IdCard}>
                                  {d.transportId || "—"}
                                </KV>
                                <KV label={L.kv.driverName} icon={UserIcon}>
                                  {d.transportDriverName || "—"}
                                </KV>
                                <KV label={L.kv.driverId} icon={IdCard}>
                                  {d.transportDriverId || "—"}
                                </KV>
                                <KV label={L.kv.driverEmail} icon={Mail}>
                                  {d.transportDriverEmail || "—"}
                                </KV>
                                <KV label={L.kv.driverPhone} icon={PhoneCall}>
                                  {d.transportDriverPhoneNo || "—"}
                                </KV>
                              </Section>

                              <Section title={L.broker}>
                                <KV label={L.kv.brokerNo} icon={IdCard}>
                                  {d.brokerNo || "—"}
                                </KV>
                                <KV label={L.kv.name} icon={UserIcon}>
                                  {d.brokerName || "—"}
                                </KV>
                                <KV label={L.kv.name2} icon={UserIcon}>
                                  {d.brokerName2 || "—"}
                                </KV>
                                <KV label={L.kv.address} icon={Building}>
                                  {d.brokerAddress || "—"}
                                </KV>
                                <KV label={L.kv.address2} icon={Building}>
                                  {d.brokerAddress2 || "—"}
                                </KV>
                                <KV label={L.kv.city} icon={MapPin}>
                                  {d.brokerCity || "—"}
                                </KV>
                                <KV label={L.kv.region} icon={MapPin}>
                                  {d.brokerRegion || "—"}
                                </KV>
                                <KV label={L.kv.postCode} icon={Hash}>
                                  {d.brokerPostCode || "—"}
                                </KV>
                                <KV label={L.kv.country} icon={Globe}>
                                  {d.brokerCountry || "—"}
                                </KV>
                                <KV label={L.kv.email} icon={Mail}>
                                  {d.brokerEmail || "—"}
                                </KV>
                                <KV label={L.kv.phone} icon={PhoneCall}>
                                  {d.brokerPhoneNo || "—"}
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
              {T.footer?.meta
                ? T.footer.meta(data.total, data.page, data.pages)
                : `Total: ${data.total} • Page ${data.page} of ${
                    data.pages || 1
                  }`}
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
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {T.footer?.perPage ? T.footer.perPage(n) : `${n} / page`}
                  </option>
                ))}
              </select>

              <button
                className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
              >
                {T.footer?.prev || "Prev"}
              </button>
              <button
                className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
                disabled={data.page >= (data.pages || 1)}
              >
                {T.footer?.next || "Next"}
              </button>
            </div>
          </div>
        </div>


        {/* CREATE/EDIT MODAL */}
        {openForm && (
          <Modal
            title={
              editing
                ? T.modal?.titleEdit || "Edit Document"
                : T.modal?.titleNew || "New Document"
            }
            onClose={() => {
              setOpenForm(false);
              setEditing(null);
            }}
          >
            <DocForm
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
            />
          </Modal>
        )}
        {/* ▼ Add this block right after the document modal above */}
  {openLineForm && (
    <Modal
      title={lineInitial?._id ? "Edit Line" : "New Sales Offer Line"}
      onClose={() => {
        setOpenLineForm(false);
        setLineInitial(null);
      }}
    >
      <SalesOfferLineForm
      initial={lineInitial || {
        // defaults when creating from header
        documentNo: lineInitial?.documentNo || "",
        status: lineInitial?.status || "new",
      }}
        docs={docsForPicker}
        docsLoading={docsForPickerLoading}
        S={S_lines}          // translations (see section 3)
        locale={locale}
        onCancel={() => {
          setOpenLineForm(false);
          setLineInitial(null);
        }}
  onSaved={(saved) => {
    const docNo = saved?.documentNo ?? lineInitial?.documentNo;
    if (docNo) {
      // optimistic: insert/replace in cache
      setLineCache((m) => {
        const prev = m[docNo]?.rows || [];
        const rows = saved?._id
          ? [saved, ...prev.filter(r => r._id !== saved._id)]
          : prev;
        return { ...m, [docNo]: { loading: false, error: null, rows } };
      });
      // then force a clean fetch from the server
      refreshLines(docNo);
    }

    setOpenLineForm(false);
    setLineInitial(null);
  }}

        showNotice={showNotice}
      />
    </Modal>
  )}
{openPdfFor && (
  <Modal
    title={`PDF — ${openPdfFor.documentNo || ""}`}
    onClose={() => setOpenPdfFor(null)}
  >
    <SalesOfferPdf api={API} document={openPdfFor} lang="pl" />
  </Modal>
)}


      </div>
    );
  }

  /* ===================== MODAL + FORM ===================== */

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

  /** Typeahead combobox for /api/mcustomers (blocked=none) */
  function CustomerCombobox({
    valueNo,
    onPick,
    placeholder = "Type no./name…",
    excludeId,
  }) {
    const [input, setInput] = useState(valueNo ? valueNo : "");
    const [open, setOpen] = useState(false);
    const [hover, setHover] = useState(-1);
    const [opts, setOpts] = useState([]);

    useEffect(() => {
      let stop = false;
      const params = new URLSearchParams({ blocked: "none", limit: "50" });
      if (input) params.set("q", input);
      fetch(`${API}/api/mcustomers?${params.toString()}`)
        .then((r) => r.json())
        .then((json) => {
          if (stop) return;
          const rows = Array.isArray(json?.data) ? json.data : [];
          const filtered = excludeId
            ? rows.filter((r) => r._id !== excludeId)
            : rows;
          setOpts(
            filtered.map((r) => ({
              _id: r._id,
              no: r.no,
              name: r.name,
              address: r.address,
              address2: r.address2,
              city: r.city,
              region: r.region,
              postCode: r.postCode,
              country: r.countryRegionCode,
              email: r.email,
              phoneNo: r.phoneNo,
              name2: r.name2,
              nip: r.nip,
            }))
          );
        })
        .catch(() => setOpts([]));
      return () => {
        stop = true;
      };
    }, [input, excludeId]);

    return (
      <div className="relative">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
              setOpen(true);
              return;
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHover((i) => Math.min(i + 1, opts.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHover((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              const pick = hover >= 0 ? opts[hover] : opts[0];
              if (pick) {
                onPick(pick);
                setInput(`${pick.no} — ${pick.name}`);
                setOpen(false);
              }
            }
          }}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="cust-listbox"
          role="combobox"
        />
        {open && opts.length > 0 && (
          <ul
            id="cust-listbox"
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {opts.map((o, idx) => {
              const active = idx === hover;
              return (
                <li
                  key={o._id}
                  role="option"
                  aria-selected={active}
                  className={
                    "cursor-pointer px-3 py-2 text-sm " +
                    (active ? "bg-slate-100" : "hover:bg-slate-50")
                  }
                  onMouseEnter={() => setHover(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(o);
                    setInput(`${o.no} — ${o.name}`);
                    setOpen(false);
                  }}
                  title={`${o.no} — ${o.name}`}
                >
                  <div className="font-medium">{o.no}</div>
                  <div className="text-slate-500 text-xs">{o.name}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function DocForm({ initial, onCancel, onSaved, showNotice }) {
    const isEdit = Boolean(initial?._id);
    const [tab, setTab] = useState("header");
    const [errors, setErrors] = useState({});

    const { t } = useI18n();
    const S = t.sells || {};

    // maps used in the form
    const TABS_L = S.form?.tabs || {};
    const F = S.form?.fields || {};
    const M = S.modal || {};
    const ALERTS = S.alerts || {};
    const STATUS_MAP = {
      // for the status <select> labels
      ...STATUS_LABELS,
      ...(S.statusMap || {}),
    };

    // header
    const [documentNo, setDocumentNo] = useState(initial?.documentNo || "");
    const [status, setStatus] = useState(canonStatus(initial?.status || "new"));

    const [externalDocumentNo, setExternalDocumentNo] = useState(
      initial?.externalDocumentNo || ""
    );
    const [documentInfo, setDocumentInfo] = useState(initial?.documentInfo || "");
    const [currencyCode, setCurrencyCode] = useState(
      initial?.currencyCode || "USD"
    );
    const [currencyFactor, setCurrencyFactor] = useState(
      initial?.currencyFactor ?? 1
    );
    const [documentDate, setDocumentDate] = useState(
      initial?.documentDate ? initial.documentDate.slice(0, 10) : ""
    );
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
    const [validityDate, setValidityDate] = useState(
      initial?.validityDate ? initial.validityDate.slice(0, 10) : ""
    );
    const [dueDate, setDueDate] = useState(
      initial?.dueDate ? initial.dueDate.slice(0, 10) : ""
    );

    // sell-to
    const [sell, setSell] = useState({
      no: initial?.sellCustomerNo || "",
      name: initial?.sellCustomerName || "",
      name2: initial?.sellCustomerName2 || "",
      address: initial?.sellCustomerAddress || "",
      address2: initial?.sellCustomerAddress2 || "",
      city: initial?.sellCustomerCity || "",
      region: initial?.sellCustomerRegion || "",
      postCode: initial?.sellCustomerPostCode || "",
      country: initial?.sellCustomerCountry || "",
      email: initial?.sellCustomerEmail || "",
      phoneNo: initial?.sellCustomerPhoneNo || "",
    });

    // bill-to
    const [bill, setBill] = useState({
      no: initial?.billCustomerNo || "",
      name: initial?.billCustomerName || "",
      name2: initial?.billCustomerName2 || "",
      address: initial?.billCustomerAddress || "",
      address2: initial?.billCustomerAddress2 || "",
      city: initial?.billCustomerCity || "",
      region: initial?.billCustomerRegion || "",
      postCode: initial?.billCustomerPostCode || "",
      country: initial?.billCustomerCountry || "",
      email: initial?.billCustomerEmail || "",
      phoneNo: initial?.billCustomerPhoneNo || "",
      nip: initial?.billCustomerNip || "",
    });

    // location
    const [loc, setLoc] = useState({
      no: initial?.locationNo || "",
      name: initial?.locationName || "",
      name2: initial?.locationName2 || "",
      address: initial?.locationAddress || "",
      address2: initial?.locationAddress2 || "",
      city: initial?.locationCity || "",
      region: initial?.locationRegion || "",
      postCode: initial?.locationPostCode || "",
      country: initial?.locationCountry || "",
      email: initial?.locationEmail || "",
      phoneNo: initial?.locationPhoneNo || "",
    });

    // shipment
    const [shipmentMethod, setShipmentMethod] = useState(
      initial?.shipmentMethod || ""
    );
    const [shipmentAgent, setShipmentAgent] = useState(
      initial?.shipmentAgent || ""
    );

    // transport
    const [tr, setTr] = useState({
      no: initial?.transportNo || "",
      name: initial?.transportName || "",
      id: initial?.transportId || "",
      dName: initial?.transportDriverName || "",
      dId: initial?.transportDriverId || "",
      dEmail: initial?.transportDriverEmail || "",
      dPhone: initial?.transportDriverPhoneNo || "",
    });

    // broker
    const [br, setBr] = useState({
      no: initial?.brokerNo || "",
      name: initial?.brokerName || "",
      name2: initial?.brokerName2 || "",
      address: initial?.brokerAddress || "",
      address2: initial?.brokerAddress2 || "",
      city: initial?.brokerCity || "",
      region: initial?.brokerRegion || "",
      postCode: initial?.brokerPostCode || "",
      country: initial?.brokerCountry || "",
      email: initial?.brokerEmail || "",
      phoneNo: initial?.brokerPhoneNo || "",
    });

    const save = async (e) => {
      e.preventDefault();
      const errs = {};
      if (!documentNo.trim()) errs.documentNo = F.documentNo || "Document No. *";
      if (!sell.no) errs.sellNo = F.pickSell || "Pick Sell-to Customer *";
      if (!bill.no) errs.billNo = F.pickBill || "Pick Bill-to Customer *";

      if (Object.keys(errs).length) {
        setErrors(errs);
        setTab(
          errs.documentNo
            ? "header"
            : errs.sellNo
            ? "sell"
            : errs.billNo
            ? "bill"
            : "header"
        );
        return;
      }

      const payload = {
        documentNo: documentNo.trim(),
        status,
        externalDocumentNo: externalDocumentNo || null,
        documentInfo: documentInfo || null,
        currencyCode: (currencyCode || "USD").toUpperCase(),
        currencyFactor: Number(currencyFactor) || 1,
        documentDate: documentDate || null,
        serviceDate: serviceDate || null,
        requestedDeliveryDate: requestedDeliveryDate || null,
        promisedDeliveryDate: promisedDeliveryDate || null,
        shipmentDate: shipmentDate || null,
        validityDate: validityDate || null,
        dueDate: dueDate || null,

        sellCustomerNo: sell.no,
        sellCustomerName: sell.name || null,
        sellCustomerName2: sell.name2 || null,
        sellCustomerAddress: sell.address || null,
        sellCustomerAddress2: sell.address2 || null,
        sellCustomerCity: sell.city || null,
        sellCustomerRegion: sell.region || null,
        sellCustomerPostCode: sell.postCode || null,
        sellCustomerCountry: sell.country || null,
        sellCustomerEmail: sell.email || null,
        sellCustomerPhoneNo: sell.phoneNo || null,

        billCustomerNo: bill.no,
        billCustomerName: bill.name || null,
        billCustomerName2: bill.name2 || null,
        billCustomerAddress: bill.address || null,
        billCustomerAddress2: bill.address2 || null,
        billCustomerCity: bill.city || null,
        billCustomerRegion: bill.region || null,
        billCustomerPostCode: bill.postCode || null,
        billCustomerCountry: bill.country || null,
        billCustomerEmail: bill.email || null,
        billCustomerPhoneNo: bill.phoneNo || null,
        billCustomerNip: bill.nip || null,

        locationNo: loc.no || null,
        locationName: loc.name || null,
        locationName2: loc.name2 || null,
        locationAddress: loc.address || null,
        locationAddress2: loc.address2 || null,
        locationCity: loc.city || null,
        locationRegion: loc.region || null,
        locationPostCode: loc.postCode || null,
        locationCountry: loc.country || null,
        locationEmail: loc.email || null,
        locationPhoneNo: loc.phoneNo || null,

        shipmentMethod: shipmentMethod || null,
        shipmentAgent: shipmentAgent || null,

        transportNo: tr.no || null,
        transportName: tr.name || null,
        transportId: tr.id || null,
        transportDriverName: tr.dName || null,
        transportDriverId: tr.dId || null,
        transportDriverEmail: tr.dEmail || null,
        transportDriverPhoneNo: tr.dPhone || null,

        brokerNo: br.no || null,
        brokerName: br.name || null,
        brokerName2: br.name2 || null,
        brokerAddress: br.address || null,
        brokerAddress2: br.address2 || null,
        brokerCity: br.city || null,
        brokerRegion: br.region || null,
        brokerPostCode: br.postCode || null,
        brokerCountry: br.country || null,
        brokerEmail: br.email || null,
        brokerPhoneNo: br.phoneNo || null,
      };
      const nowIso = new Date().toISOString();
      const userCode = getUserCode();

      if (!isEdit) {
        payload.userCreated = userCode; // <— REQUIRED
        payload.dateCreated = nowIso; // <— optional if backend sets it
      } else {
        payload.userModified = userCode; // <— good practice
        payload.dateModified = nowIso; // <— optional if backend sets it
      }

      try {
        const url = isEdit
          ? `${API}/api/documents/${initial._id}`
          : `${API}/api/documents`;
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
        showNotice("success", isEdit ? "Document updated." : "Document created.");
        onSaved();
      } catch {
        showNotice("error", "Save failed");
      }
    };

    // tabs
    const TABS = [
      { id: "header", label: TABS_L.header || "Header", Icon: FileText },
      { id: "sell", label: TABS_L.sell || "Sell-to", Icon: UserIcon },
      { id: "bill", label: TABS_L.bill || "Bill-to", Icon: UserIcon },
      { id: "location", label: TABS_L.location || "Location", Icon: Building },
      { id: "shipment", label: TABS_L.shipment || "Shipment", Icon: Truck },
      { id: "transport", label: TABS_L.transport || "Transport", Icon: Ship },
      { id: "broker", label: TABS_L.broker || "Broker", Icon: UserIcon },
    ];

    // quick helper to copy customer to state
    const applyCustomer = (c, setter) => {
      setter((prev) => ({
        ...prev,
        no: c.no || "",
        name: c.name || "",
        name2: c.name2 || "",
        address: c.address || "",
        address2: c.address2 || "",
        city: c.city || "",
        region: c.region || "",
        postCode: c.postCode || "",
        country: c.country || "",
        email: c.email || "",
        phoneNo: c.phoneNo || "",
        nip: c.nip || prev.nip || "",
      }));
    };

    const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";

    return (
      <form onSubmit={save} className="space-y-4">
        {/* tabs */}
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
            {ALERTS.fixErrors || "Please correct the highlighted fields."}
          </div>
        )}

        {/* HEADER */}
        {tab === "header" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label={F.documentNo || "Document No."}
              icon={Hash}
              error={errors.documentNo}
            >
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
                required
              />
            </Field>

            <Field label={F.status || "Status"} icon={FileText}>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_MAP[s] || s}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={F.externalDocumentNo || "External Doc. No."}
              icon={Hash}
            >
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={externalDocumentNo}
                onChange={(e) => setExternalDocumentNo(e.target.value)}
              />
            </Field>

            <Field label={F.documentInfo || "Document Info"} icon={FileText}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={documentInfo}
                onChange={(e) => setDocumentInfo(e.target.value)}
              />
            </Field>

            <Field label={F.currencyCode || "Currency Code"} icon={DollarSign}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              />
            </Field>

            <Field
              label={F.currencyFactor || "Currency Factor"}
              icon={DollarSign}
            >
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={currencyFactor}
                onChange={(e) => setCurrencyFactor(e.target.value)}
              />
            </Field>

            <Field label={F.documentDate || "Document Date"} icon={CalendarIcon}>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </Field>
            <Field
              label={F.serviceDate || "Service/Delivery Date"}
              icon={CalendarIcon}
            >
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </Field>
            <Field
              label={F.requestedDeliveryDate || "Requested Delivery Date"}
              icon={CalendarIcon}
            >
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
              />
            </Field>
            <Field
              label={F.promisedDeliveryDate || "Promised Delivery Date"}
              icon={CalendarIcon}
            >
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={promisedDeliveryDate}
                onChange={(e) => setPromisedDeliveryDate(e.target.value)}
              />
            </Field>
            <Field label={F.shipmentDate || "Shipment Date"} icon={CalendarIcon}>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={shipmentDate}
                onChange={(e) => setShipmentDate(e.target.value)}
              />
            </Field>
            <Field
              label={F.validityDate || "Document Validity Date"}
              icon={CalendarIcon}
            >
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
              />
            </Field>
            <Field label={F.dueDate || "Due Date"} icon={CalendarIcon}>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* SELL-TO */}
        {tab === "sell" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label={F.pickSell || "Pick Sell-to Customer"}
              icon={IdCard}
              error={errors.sellNo}
            >
              <CustomerCombobox
                valueNo={sell.no}
                onPick={(c) => applyCustomer(c, setSell)}
                excludeId={null}
                placeholder={F.pickSell || "Search customer no./name…"}
              />
            </Field>
            <Field label={F.no || "No."} icon={IdCard}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.no}
                onChange={(e) => setSell({ ...sell, no: e.target.value })}
              />
            </Field>

            <Field label={F.name || "Name"} icon={UserIcon}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.name}
                onChange={(e) => setSell({ ...sell, name: e.target.value })}
              />
            </Field>
            <Field label={F.name2 || "Name 2"} icon={UserIcon}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.name2}
                onChange={(e) => setSell({ ...sell, name2: e.target.value })}
              />
            </Field>

            <Field label={F.email || "Email"} icon={Mail}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.email}
                onChange={(e) => setSell({ ...sell, email: e.target.value })}
              />
            </Field>
            <Field label={F.phone || "Phone"} icon={PhoneCall}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.phoneNo}
                onChange={(e) => setSell({ ...sell, phoneNo: e.target.value })}
              />
            </Field>

            <Field label={F.address || "Address"} icon={Building}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.address}
                onChange={(e) => setSell({ ...sell, address: e.target.value })}
              />
            </Field>
            <Field label={F.address2 || "Address 2"} icon={Building}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.address2}
                onChange={(e) => setSell({ ...sell, address2: e.target.value })}
              />
            </Field>

            <Field label={F.city || "City"} icon={MapPin}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.city}
                onChange={(e) => setSell({ ...sell, city: e.target.value })}
              />
            </Field>
            <Field label={F.region || "Region"} icon={MapPin}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.region}
                onChange={(e) => setSell({ ...sell, region: e.target.value })}
              />
            </Field>

            <Field label={F.postCode || "Post Code"} icon={Hash}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.postCode}
                onChange={(e) => setSell({ ...sell, postCode: e.target.value })}
              />
            </Field>
            <Field label={F.country || "Country"} icon={Globe}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={sell.country}
                onChange={(e) =>
                  setSell({ ...sell, country: e.target.value.toUpperCase() })
                }
              />
            </Field>
          </div>
        )}

        {/* BILL-TO */}
        {tab === "bill" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label={F.pickBill || "Pick Bill-to Customer"}
              icon={IdCard}
              error={errors.billNo}
            >
              <CustomerCombobox
                valueNo={bill.no}
                onPick={(c) => applyCustomer(c, setBill)}
                excludeId={null}
                placeholder={F.pickBill || "Search customer no./name…"}
              />
            </Field>
            <Field label={F.no || "No."} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={bill.no}
                onChange={(e) => setBill({ ...bill, no: e.target.value })}
              />
            </Field>

            <Field label={F.nip || "Tax ID"} icon={Hash}>
              <input
                className={INPUT_CLS}
                value={bill.nip}
                onChange={(e) => setBill({ ...bill, nip: e.target.value })}
              />
            </Field>
            <Field label={F.name || "Name"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={bill.name}
                onChange={(e) => setBill({ ...bill, name: e.target.value })}
              />
            </Field>

            <Field label={F.name2 || "Name 2"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={bill.name2}
                onChange={(e) => setBill({ ...bill, name2: e.target.value })}
              />
            </Field>
            <Field label={F.email || "Email"} icon={Mail}>
              <input
                className={INPUT_CLS}
                value={bill.email}
                onChange={(e) => setBill({ ...bill, email: e.target.value })}
              />
            </Field>

            <Field label={F.phone || "Phone"} icon={PhoneCall}>
              <input
                className={INPUT_CLS}
                value={bill.phoneNo}
                onChange={(e) => setBill({ ...bill, phoneNo: e.target.value })}
              />
            </Field>
            <Field label={F.address || "Address"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={bill.address}
                onChange={(e) => setBill({ ...bill, address: e.target.value })}
              />
            </Field>

            <Field label={F.address2 || "Address 2"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={bill.address2}
                onChange={(e) => setBill({ ...bill, address2: e.target.value })}
              />
            </Field>
            <Field label={F.city || "City"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={bill.city}
                onChange={(e) => setBill({ ...bill, city: e.target.value })}
              />
            </Field>

            <Field label={F.region || "Region"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={bill.region}
                onChange={(e) => setBill({ ...bill, region: e.target.value })}
              />
            </Field>
            <Field label={F.postCode || "Post Code"} icon={Hash}>
              <input
                className={INPUT_CLS}
                value={bill.postCode}
                onChange={(e) => setBill({ ...bill, postCode: e.target.value })}
              />
            </Field>

            <Field label={F.country || "Country"} icon={Globe}>
              <input
                className={INPUT_CLS}
                value={bill.country}
                onChange={(e) =>
                  setBill({ ...bill, country: e.target.value.toUpperCase() })
                }
              />
            </Field>
          </div>
        )}

        {/* LOCATION */}
        {tab === "location" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={F.locationNo || "Location No."} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={loc.no}
                onChange={(e) => setLoc({ ...loc, no: e.target.value })}
              />
            </Field>
            <Field label={F.name || "Name"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={loc.name}
                onChange={(e) => setLoc({ ...loc, name: e.target.value })}
              />
            </Field>

            <Field label={F.name2 || "Name 2"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={loc.name2}
                onChange={(e) => setLoc({ ...loc, name2: e.target.value })}
              />
            </Field>
            <Field label={F.address || "Address"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={loc.address}
                onChange={(e) => setLoc({ ...loc, address: e.target.value })}
              />
            </Field>

            <Field label={F.address2 || "Address 2"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={loc.address2}
                onChange={(e) => setLoc({ ...loc, address2: e.target.value })}
              />
            </Field>
            <Field label={F.city || "City"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={loc.city}
                onChange={(e) => setLoc({ ...loc, city: e.target.value })}
              />
            </Field>

            <Field label={F.region || "Region"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={loc.region}
                onChange={(e) => setLoc({ ...loc, region: e.target.value })}
              />
            </Field>
            <Field label={F.postCode || "Post Code"} icon={Hash}>
              <input
                className={INPUT_CLS}
                value={loc.postCode}
                onChange={(e) => setLoc({ ...loc, postCode: e.target.value })}
              />
            </Field>

            <Field label={F.country || "Country"} icon={Globe}>
              <input
                className={INPUT_CLS}
                value={loc.country}
                onChange={(e) =>
                  setLoc({ ...loc, country: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label={F.email || "Email"} icon={Mail}>
              <input
                className={INPUT_CLS}
                value={loc.email}
                onChange={(e) => setLoc({ ...loc, email: e.target.value })}
              />
            </Field>

            <Field label={F.phone || "Phone"} icon={PhoneCall}>
              <input
                className={INPUT_CLS}
                value={loc.phoneNo}
                onChange={(e) => setLoc({ ...loc, phoneNo: e.target.value })}
              />
            </Field>
          </div>
        )}

        {/* SHIPMENT */}
        {tab === "shipment" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={F.shipmentMethod || "Shipment Method"} icon={Truck}>
              <input
                className={INPUT_CLS}
                value={shipmentMethod}
                onChange={(e) => setShipmentMethod(e.target.value)}
              />
            </Field>
            <Field label={F.shipmentAgent || "Shipment Agent"} icon={Ship}>
              <input
                className={INPUT_CLS}
                value={shipmentAgent}
                onChange={(e) => setShipmentAgent(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* TRANSPORT */}
        {tab === "transport" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={F.transportNo || "Transport No."} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={tr.no}
                onChange={(e) => setTr({ ...tr, no: e.target.value })}
              />
            </Field>
            <Field label={F.transportName || "Transport Name"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={tr.name}
                onChange={(e) => setTr({ ...tr, name: e.target.value })}
              />
            </Field>

            <Field label={F.transportId || "Transport ID"} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={tr.id}
                onChange={(e) => setTr({ ...tr, id: e.target.value })}
              />
            </Field>
            <Field label={F.driverName || "Driver Name"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={tr.dName}
                onChange={(e) => setTr({ ...tr, dName: e.target.value })}
              />
            </Field>

            <Field label={F.driverId || "Driver ID"} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={tr.dId}
                onChange={(e) => setTr({ ...tr, dId: e.target.value })}
              />
            </Field>
            <Field label={F.driverEmail || "Driver Email"} icon={Mail}>
              <input
                className={INPUT_CLS}
                value={tr.dEmail}
                onChange={(e) => setTr({ ...tr, dEmail: e.target.value })}
              />
            </Field>

            <Field label={F.driverPhone || "Driver Phone"} icon={PhoneCall}>
              <input
                className={INPUT_CLS}
                value={tr.dPhone}
                onChange={(e) => setTr({ ...tr, dPhone: e.target.value })}
              />
            </Field>
          </div>
        )}

        {/* BROKER */}
        {tab === "broker" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={TABS_L.broker || "Broker"} icon={IdCard}>
              <CustomerCombobox
                valueNo={br.no}
                onPick={(c) => applyCustomer(c, setBr)}
                excludeId={null}
                placeholder={F.brokerNo || "Search broker no./name…"}
              />
            </Field>
            <div />

            <Field label={F.brokerNo || "Broker No."} icon={IdCard}>
              <input
                className={INPUT_CLS}
                value={br.no}
                onChange={(e) => setBr({ ...br, no: e.target.value })}
              />
            </Field>
            <Field label={F.name || "Name"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={br.name}
                onChange={(e) => setBr({ ...br, name: e.target.value })}
              />
            </Field>

            <Field label={F.name2 || "Name 2"} icon={UserIcon}>
              <input
                className={INPUT_CLS}
                value={br.name2}
                onChange={(e) => setBr({ ...br, name2: e.target.value })}
              />
            </Field>
            <Field label={F.address || "Address"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={br.address}
                onChange={(e) => setBr({ ...br, address: e.target.value })}
              />
            </Field>

            <Field label={F.address2 || "Address 2"} icon={Building}>
              <input
                className={INPUT_CLS}
                value={br.address2}
                onChange={(e) => setBr({ ...br, address2: e.target.value })}
              />
            </Field>
            <Field label={F.city || "City"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={br.city}
                onChange={(e) => setBr({ ...br, city: e.target.value })}
              />
            </Field>

            <Field label={F.region || "Region"} icon={MapPin}>
              <input
                className={INPUT_CLS}
                value={br.region}
                onChange={(e) => setBr({ ...br, region: e.target.value })}
              />
            </Field>
            <Field label={F.postCode || "Post Code"} icon={Hash}>
              <input
                className={INPUT_CLS}
                value={br.postCode}
                onChange={(e) => setBr({ ...br, postCode: e.target.value })}
              />
            </Field>

            <Field label={F.country || "Country"} icon={Globe}>
              <input
                className={INPUT_CLS}
                value={br.country}
                onChange={(e) =>
                  setBr({ ...br, country: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label={F.email || "Email"} icon={Mail}>
              <input
                className={INPUT_CLS}
                value={br.email}
                onChange={(e) => setBr({ ...br, email: e.target.value })}
              />
            </Field>

            <Field label={F.phone || "Phone"} icon={PhoneCall}>
              <input
                className={INPUT_CLS}
                value={br.phoneNo}
                onChange={(e) => setBr({ ...br, phoneNo: e.target.value })}
              />
            </Field>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ALERTS.fixErrors || "Please correct the highlighted fields."}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            {M.cancel || "Cancel"}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {isEdit ? M.save || "Save changes" : M.add || "Create document"}
          </button>
        </div>
      </form>
    );
  }

  /* ===================== UI helpers ===================== */

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
  function formatDate(s, locale, dash = "—") {
    try {
      return s ? new Date(s).toLocaleDateString(locale) : dash;
    } catch {
      return s || dash;
    }
  }

  function fmtDOT(n, decimals = 2) {
    const val = Number(n);
    if (!isFinite(val)) return "—";
    return val.toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
  }
  function Toast({ type = "success", children, onClose }) {
    const isSuccess = type === "success";
    const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
    const wrap = isSuccess
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}
      >
        <Icon size={16} />
        <span className="mr-auto">{children}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
          ✕
        </button>
      </div>
    );
  }
  function StatusBadge({ value, map }) {
    const v = canonStatus(value || "new"); // normalize first
    const label = (map && map[v]) || STATUS_LABELS[v] || v;
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
  function Section({ title, children, className = "" }) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
        <div className="mb-2 text-xs font-semibold text-slate-600">{title}</div>
        <div className="space-y-2">{children}</div>
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
