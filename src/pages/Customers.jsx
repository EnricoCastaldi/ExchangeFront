import React, { useEffect, useState, useMemo } from "react";
import { useI18n, fmtMoney } from "../helpers/i18n";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  IdCard,
  Map,
  Phone,
  Wallet,
  Image, // tab icons
  Hash,
  User,
  FileText,
  MapPin,
  Building, // field icons
  Mail,
  Globe,
  PhoneCall,
  CreditCard,
  DollarSign,
  Languages,
  Truck,
  Ship,
  Tag,
  BadgePercent,
  UserRound,
  CheckCircle2, 
  AlertTriangle ,
  SlidersHorizontal
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Customers() {
  const { t, locale } = useI18n();
  const C = t.customers || {};
  // localized helpers for filters (with safe fallbacks)
  const F = {
    searchPh:
      C?.controls?.searchPlaceholder || "Search name, email, country, city",
    countryPh:
      C?.controls?.countryPlaceholder ||
      C?.modal?.fields?.countryRegionCode ||
      "Country code",
    regionPh:
      C?.controls?.regionPlaceholder || C?.modal?.fields?.region || "Region",
    all: C?.controls?.allStatuses || "All statuses",
    blocked: {
      none: C?.blockedLabels?.none || "OK",
      ship: C?.blockedLabels?.ship || "SHIP",
      invoice: C?.blockedLabels?.invoice || "INVOICE",
      all: C?.blockedLabels?.all || "ALL",
    },
    searchBtn: C?.controls?.searchBtn || "Search",
    addBtn: C?.controls?.addBtn || "Add Customer",
  };

  const L = C?.details || {
    name2: "Name 2",
    address: "Address",
    address2: "Address 2",
    postCode: "Post code",
    region: "Region",
    nip: "NIP",
    email2: "Email 2",
    homePage: "Home page",
    billToCustomerNo: "Bill-to Customer No.",
    currencyCode: "Currency code",
    priority: "Priority",
    paymentMethodCode: "Payment method code",
    paymentTermsCode: "Payment terms code",
    languageCode: "Language code",
    customerPostingGroup: "Customer posting group",
    customerPriceGroup: "Customer price group",
    customerDiscGroup: "Customer disc. group",
    salespersonCode: "Salesperson code",
    shipmentMethodCode: "Shipment method code",
    shippingAgentCode: "Shipping agent code",
    picture: "Picture",
    noPicture: "No picture",
  };

  // filters / paging
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [blocked, setBlocked] = useState(""); // '', 'none','ship','invoice','all'
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
const activeFilterCount = [blocked, country, region].filter(Boolean).length;

const [notice, setNotice] = useState(null); // { type: 'success'|'error', text: string }
const showNotice = (type, text, ms = 3000) => {
  setNotice({ type, text });
  if (ms) setTimeout(() => setNotice(null), ms);
};

const [sortBy, setSortBy] = useState("createdAt"); // default column
const [sortDir, setSortDir] = useState("desc");    // 'asc' | 'desc'
const onSort = (by) => {
  setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
  setSortBy(by);
  setPage(1);
};


  // list data
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  // UI state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set("q", q);
    if (blocked) params.set("blocked", blocked);
    if (country) params.set("country", country);
    if (region) params.set("region", region);
  params.set("sortBy", sortBy);
params.set("sortDir", sortDir);

    const res = await fetch(`${API}/api/mcustomers?${params.toString()}`);
    const json = await res.json();
    setData(json);
  } catch {
    showNotice("error", C?.alerts?.loadFail || "Failed to load customers.");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [page, limit, blocked, country, region, sortBy, sortDir]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onAddClick = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEditClick = (row) => {
    setEditing(row);
    setOpen(true);
  };

const onDelete = async (_id) => {
  if (!window.confirm(C?.alerts?.deleteConfirm || "Delete this customer?")) return;
  try {
    const res = await fetch(`${API}/api/mcustomers/${_id}`, { method: "DELETE" });
    if (res.status === 204) {
      if (expandedId === _id) setExpandedId(null);
      showNotice("success", C?.alerts?.deleted || "Customer deleted.");
      fetchData();
    } else {
      const json = await res.json().catch(() => ({}));
      showNotice("error", json?.message || C?.alerts?.requestFail || "Request failed");
    }
  } catch {
    showNotice("error", C?.alerts?.requestFail || "Request failed");
  }
};

const rows = useMemo(() => {
  const arr = [...(data?.data || [])];
  const dir = sortDir === "asc" ? 1 : -1;

  const keyMap = {
    no: "no",
    name: "name",
    email: "email",
    phone: "phoneNo",
    country: "countryRegionCode",
    city: "city",
    blocked: "blocked",
    creditLimit: "creditLimit",
    createdAt: "createdAt",
  };
  const k = keyMap[sortBy] || sortBy;

  const val = (r) => {
    const v = r?.[k];
    if (k === "creditLimit") return Number(v) || 0;
    if (k === "createdAt")  return v ? new Date(v).getTime() : 0;
    return (v ?? "").toString().toLowerCase();
  };

  arr.sort((a, b) => {
    const av = val(a), bv = val(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
    return 0;
  });
  return arr;
}, [data.data, sortBy, sortDir]);



const handleSubmit = async (form) => {
  const isEdit = Boolean(editing?._id);
  const url = isEdit ? `${API}/api/mcustomers/${editing._id}` : `${API}/api/mcustomers`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return showNotice("error", json?.message || C?.alerts?.requestFail || "Request failed");

    showNotice("success", isEdit ? (C?.alerts?.updated || "Customer updated.") : (C?.alerts?.created || "Customer created."));
    setOpen(false);
    setEditing(null);
    setPage(1);
    fetchData();
  } catch {
    showNotice("error", C?.alerts?.requestFail || "Request failed");
  }
};


// put this near your Th/Td helpers
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
  {/* Row 1: Search + Filters toggle + Add button */}
  <div className="flex flex-wrap items-center gap-2">
    {/* Search with integrated submit icon */}
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={F.searchPh}
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
      />
      <button
        type="submit"
        title={C?.controls?.searchBtn || "Search"}
        aria-label={C?.controls?.searchBtn || "Search"}
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
      >
        <Search size={14} />
      </button>
    </div>

    {/* Filters toggle (mobile only; on desktop filters are always shown) */}
    <button
      type="button"
      onClick={() => setShowFilters((v) => !v)}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
      aria-expanded={showFilters}
      aria-controls="customer-filters-panel"
    >
      {/* same icon as Vendors or change to SlidersHorizontal if you import it */}
      <SlidersHorizontal  size={16} className="opacity-70" />
      {C?.controls?.filters || "Filters"}
      {activeFilterCount > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
          {activeFilterCount}
        </span>
      )}
    </button>

    {/* Add customer — emphasized primary button */}
    <button
      type="button"
      onClick={onAddClick}
      className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
    >
      <Plus size={16} />
      {F.addBtn}
    </button>
  </div>

  {/* Row 2: Filters row (always visible on md+, collapsible on mobile) */}
  <div
    id="customer-filters-panel"
    className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-4 ${
      showFilters ? "grid" : "hidden md:grid"
    }`}
  >
    {/* blocked */}
    <select
      value={blocked}
      onChange={(e) => { setBlocked(e.target.value); setPage(1); }}
      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
    >
      <option value="">{F.all}</option>
      <option value="none">{F.blocked.none}</option>
      <option value="ship">{F.blocked.ship}</option>
      <option value="invoice">{F.blocked.invoice}</option>
      <option value="all">{F.blocked.all}</option>
    </select>

    {/* country */}
    <div className="relative">
      <Globe className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={country}
        onChange={(e) => setCountry(e.target.value.toUpperCase())}
        placeholder={F.countryPh}
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
      />
    </div>

    {/* region */}
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        placeholder={F.regionPh}
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
      />
    </div>

    {/* (empty spacer to fill md 4th column neatly) */}
    <div className="hidden md:block" />
  </div>

  {/* Active filter chips */}
  <div className="mt-2 flex flex-wrap items-center gap-1">
    {blocked && (
      <Chip
        clearTitle={C?.modal?.cancel || "Clear"}
        onClear={() => setBlocked("")}
        label={`${C?.table?.blocked || "Blocked"}: ${F.blocked[blocked] || blocked}`}
      />
    )}
    {country && (
      <Chip
        clearTitle={C?.modal?.cancel || "Clear"}
        onClear={() => setCountry("")}
        label={`${C?.table?.country || "Country"}: ${country}`}
      />
    )}
    {region && (
      <Chip
        clearTitle={C?.modal?.cancel || "Clear"}
        onClear={() => setRegion("")}
        label={`${C?.table?.city || "City/Region"}: ${region}`}
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
          <Th />{/* expand toggle column (not sortable) */}
          <SortableTh id="no"        {...{sortBy, sortDir, onSort}}>{C?.table?.no || "No."}</SortableTh>
          <SortableTh id="name"      {...{sortBy, sortDir, onSort}}>{C?.table?.name || "Name"}</SortableTh>
          <SortableTh id="email"     {...{sortBy, sortDir, onSort}}>{C?.table?.email || "Email"}</SortableTh>
          <SortableTh id="phone"     {...{sortBy, sortDir, onSort}}>{C?.table?.phone || "Phone"}</SortableTh>
          <SortableTh id="country"   {...{sortBy, sortDir, onSort}}>{C?.table?.country || "Country"}</SortableTh>
          <SortableTh id="city"      {...{sortBy, sortDir, onSort}}>{C?.table?.city || "City"}</SortableTh>
          <SortableTh id="blocked"   {...{sortBy, sortDir, onSort}}>{C?.table?.blocked || "Blocked"}</SortableTh>
          <SortableTh id="creditLimit" className="text-right pr-4" {...{sortBy, sortDir, onSort}}>
            {C?.table?.creditLimit || "Credit limit"}
          </SortableTh>
          <SortableTh id="createdAt" {...{sortBy, sortDir, onSort}}>{C?.table?.created || "Created"}</SortableTh>
          <Th>{C?.table?.actions || ""}</Th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={11} className="p-6 text-center text-slate-500">
              {C?.table?.loading || "Loading…"}
            </td>
          </tr>
        ) : (data.data?.length || 0) === 0 ? (
          <tr>
            <td colSpan={11} className="p-6 text-center text-slate-500">
              {C?.table?.empty || "No customers"}
            </td>
          </tr>
        ) : (
          (typeof rows !== "undefined" ? rows : data.data).map((c) => (
            <React.Fragment key={c._id}>
              <tr className="border-t">
                <Td className="w-8">
                  <button
                    className="p-1 rounded hover:bg-slate-100"
                    onClick={() => setExpandedId((id) => (id === c._id ? null : c._id))}
                    aria-label="Toggle details"
                    title="Toggle details"
                  >
                    {expandedId === c._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </Td>
                <Td className="font-mono">{displayCustomerKey(c)}</Td>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-slate-600">{c.email || "—"}</Td>
                <Td className="text-slate-600">{c.phoneNo || "—"}</Td>
                <Td>{c.countryRegionCode || "—"}</Td>
                <Td>{c.city || "—"}</Td>
                <Td>{blockedChip(c.blocked, C)}</Td>
                <Td className="text-right pr-4 font-medium">
                  {fmtMoney(Number(c.creditLimit || 0), locale, c.currencyCode || "USD")}
                </Td>
                <Td>{formatDate(c.createdAt, locale, "—")}</Td>
                <Td>
                  <div className="flex justify-end gap-2 pr-3">
                    <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => onEditClick(c)}>
                      <Pencil size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(c._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Td>
              </tr>

              {expandedId === c._id && (
                <tr key={`${c._id}-details`}>
                  <td colSpan={11} className="bg-slate-50 border-t">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
<KV label={L.name2} icon={FileText}>{c.name2 || "—"}</KV>
<KV label={L.address} icon={Building}>{c.address || "—"}</KV>
<KV label={L.address2} icon={Building}>{c.address2 || "—"}</KV>
<KV label={L.postCode} icon={Hash}>{c.postCode || "—"}</KV>
<KV label={L.region} icon={MapPin}>{c.region || "—"}</KV>
<KV label={L.nip} icon={Hash}>{c.nip || "—"}</KV>
<KV label={L.email2} icon={Mail}>{c.email2 || "—"}</KV>
<KV label={L.homePage} icon={Globe}>{c.homePage || "—"}</KV>
<KV label={L.billToCustomerNo} icon={IdCard}>{c.billToCustomerNo || "—"}</KV>
<KV label={L.currencyCode} icon={DollarSign}>{c.currencyCode || "—"}</KV>
<KV label={L.priority} icon={BadgePercent}>{c.priority ?? "—"}</KV>
<KV label={L.paymentMethodCode} icon={CreditCard}>{c.paymentMethodCode || "—"}</KV>
<KV label={L.paymentTermsCode} icon={CreditCard}>{c.paymentTermsCode || "—"}</KV>
<KV label={L.languageCode} icon={Languages}>{c.languageCode || "—"}</KV>
<KV label={L.customerPostingGroup} icon={Tag}>{c.customerPostingGroup || "—"}</KV>
<KV label={L.customerPriceGroup} icon={Tag}>{c.customerPriceGroup || "—"}</KV>
<KV label={L.customerDiscGroup} icon={BadgePercent}>{c.customerDiscGroup || "—"}</KV>
<KV label={L.salespersonCode} icon={UserRound}>{c.salespersonCode || "—"}</KV>
<KV label={L.shipmentMethodCode} icon={Truck}>{c.shipmentMethodCode || "—"}</KV>
<KV label={L.shippingAgentCode} icon={Ship}>{c.shippingAgentCode || "—"}</KV>

                      {c.hasPicture ? (
                        <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                          <ImageIcon size={14} />
                          <span className="font-medium">{L.picture}:</span>
                          <img
                            src={`${API}/api/mcustomers/${c._id}/picture`}
                            alt="customer"
                            className="h-10 w-10 rounded object-cover border"
                          />
                        </div>
                      ) : (
                        <div className="col-span-1 md:col-span-3 flex items-center gap-2 text-slate-500">
                          <ImageIcon size={14} />
                          <span>{L.noPicture}</span>
                        </div>
                      )}
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

  {/* Footer / Pagination */}
  <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
    <div className="text-xs text-slate-500">
      {(C?.footer?.meta && C.footer.meta(data.total, data.page, data.pages)) ||
        `Total: ${data.total} • Page ${data.page} of ${data.pages || 1}`}
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
            {(C?.footer?.perPage && C.footer.perPage(n)) || `${n} / page`}
          </option>
        ))}
      </select>

      <button
        className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={data.page <= 1}
      >
        {C?.footer?.prev || "Prev"}
      </button>
      <button
        className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
        onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
        disabled={data.page >= (data.pages || 1)}
      >
        {C?.footer?.next || "Next"}
      </button>
    </div>
  </div>
</div>


      {/* Modal */}
      {open && (
        <Modal
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={C?.modal?.title || "Customer"}
        >
          <CustomerForm
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            C={C}
          />
        </Modal>
      )}

    </div>
  );
}

/* ---------- small helpers ---------- */

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
function displayCustomerKey(c) {
  if (c?.no) return c.no;
  if (c?.nip) return c.nip;
  return c?._id ? `…${String(c._id).slice(-6)}` : "—";
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
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
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



function formatDate(s, locale, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(locale) : dash;
  } catch {
    return s || dash;
  }
}

function blockedChip(v, C) {
  const val = String(v || "none").toLowerCase();
  const cls =
    val === "none"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : val === "ship"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : val === "invoice"
      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
      : "bg-red-50 text-red-700 border border-red-200";

  const label =
    (C?.blockedLabels && C.blockedLabels[val]) ||
    (val === "none"
      ? "OK"
      : val === "ship"
      ? "SHIP"
      : val === "invoice"
      ? "INVOICE"
      : "ALL");

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
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

/* ---------- Modal + Form ---------- */

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-slate-200">
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

function CustomerForm({ initial, onSubmit, onCancel, C }) {
  const isEdit = Boolean(initial?._id);

  // ----- tabs -----
  const TABS = [
    { id: "basics", label: C?.modal?.tabs?.basics || "Basics", Icon: IdCard },
    { id: "address", label: C?.modal?.tabs?.address || "Address", Icon: Map },
    { id: "contact", label: C?.modal?.tabs?.contact || "Contact", Icon: Phone },
    {
      id: "finance",
      label: C?.modal?.tabs?.finance || "Finance & Codes",
      Icon: Wallet,
    },
    { id: "picture", label: C?.modal?.tabs?.picture || "Picture", Icon: Image },
  ];
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState(TABS[0].id);

  const onTabsKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight"
        ? (idx + 1) % TABS.length
        : (idx - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
  };

  // ----- existing state (unchanged) -----
  const [no, setNo] = useState(initial?.no || "");
  const [name, setName] = useState(initial?.name || "");
  const [name2, setName2] = useState(initial?.name2 || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [address2, setAddress2] = useState(initial?.address2 || "");
  const [city, setCity] = useState(initial?.city || "");
  const [postCode, setPostCode] = useState(initial?.postCode || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [countryRegionCode, setCountryRegionCode] = useState(
    initial?.countryRegionCode || ""
  );
  const [phoneNo, setPhoneNo] = useState(initial?.phoneNo || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [email2, setEmail2] = useState(initial?.email2 || "");
  const [homePage, setHomePage] = useState(initial?.homePage || "");
  const [billToCustomerNo, setBillToCustomerNo] = useState(
    initial?.billToCustomerNo || ""
  );
  const [nip, setNip] = useState(initial?.nip || "");
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit ?? 0);
  const [currencyCode, setCurrencyCode] = useState(
    initial?.currencyCode || "USD"
  );
  const [customerPostingGroup, setCustomerPostingGroup] = useState(
    initial?.customerPostingGroup || ""
  );
  const [customerPriceGroup, setCustomerPriceGroup] = useState(
    initial?.customerPriceGroup || ""
  );
  const [languageCode, setLanguageCode] = useState(initial?.languageCode || "");
  const [paymentTermsCode, setPaymentTermsCode] = useState(
    initial?.paymentTermsCode || ""
  );
  const [paymentMethodCode, setPaymentMethodCode] = useState(
    initial?.paymentMethodCode || ""
  );
  const [customerDiscGroup, setCustomerDiscGroup] = useState(
    initial?.customerDiscGroup || ""
  );
  const [salespersonCode, setSalespersonCode] = useState(
    initial?.salespersonCode || ""
  );
  const [shipmentMethodCode, setShipmentMethodCode] = useState(
    initial?.shipmentMethodCode || ""
  );
  const [shippingAgentCode, setShippingAgentCode] = useState(
    initial?.shippingAgentCode || ""
  );
  const [blocked, setBlocked] = useState(initial?.blocked || "none");
  const [priority, setPriority] = useState(initial?.priority ?? 0);

  // picture state
  const [setPictureFile] = useState(null);
  const [pictureBase64, setPictureBase64] = useState(null);
  const [removePicture, setRemovePicture] = useState(false);

  const existingPicUrl = initial?.hasPicture
    ? initial?.picturePath
      ? `${API}${initial.picturePath}`
      : `${API}/api/mcustomers/${initial?._id}/picture`
    : null;

  const onPickPicture = (file) => {
    if (!file) {
      setPictureFile(null);
      setPictureBase64(null);
      return;
    }
    setRemovePicture(false);
    setPictureFile(file);
    const reader = new FileReader();
    reader.onload = () => setPictureBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};

    if (!no.trim()) errs.no = "Required";
    if (!name.trim()) errs.name = "Required";

    const emailRe = /^\S+@\S+\.\S+$/;
    if (email && !emailRe.test(email)) errs.email = "Invalid email";
    if (email2 && !emailRe.test(email2)) errs.email2 = "Invalid email";

    if (Object.keys(errs).length) {
      setErrors(errs);
      // Jump to the first relevant tab
      if (errs.no || errs.name) setTab("basics");
      else if (errs.email || errs.email2) setTab("contact");
      return;
    }
    setErrors({});

    // ... existing payload build (unchanged) ...
    const payload = {
      /* as in your code */ no: no.trim(),
      name: name.trim(),
      name2: name2.trim() || null,
      address: address.trim() || null,
      address2: address2.trim() || null,
      city: city.trim() || null,
      postCode: postCode.trim() || null,
      region: region.trim() || null,
      countryRegionCode: countryRegionCode.trim().toUpperCase() || null,
      phoneNo: phoneNo.trim() || null,
      email: email.trim() || null,
      email2: email2.trim() || null,
      homePage: homePage.trim() || null,
      billToCustomerNo: billToCustomerNo.trim() || null,
      nip: nip.trim() || null,
      creditLimit: Number(creditLimit) || 0,
      currencyCode: currencyCode.trim().toUpperCase() || "USD",
      customerPostingGroup: customerPostingGroup.trim() || null,
      customerPriceGroup: customerPriceGroup.trim() || null,
      languageCode: languageCode.trim() || null,
      paymentTermsCode: paymentTermsCode.trim() || null,
      paymentMethodCode: paymentMethodCode.trim() || null,
      customerDiscGroup: customerDiscGroup.trim() || null,
      salespersonCode: salespersonCode.trim() || null,
      shipmentMethodCode: shipmentMethodCode.trim() || null,
      shippingAgentCode: shippingAgentCode.trim() || null,
      blocked,
      priority: Number.isNaN(parseInt(priority, 10))
        ? 0
        : parseInt(priority, 10),
    };

    if (pictureBase64) payload.picture = pictureBase64;
    else if (isEdit && removePicture) payload.picture = null;

    onSubmit(payload);
  };



  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Tabs nav (sticky inside modal content) */}
      {/* Tabs nav (sticky inside modal content) */}
      <div
        role="tablist"
        aria-label="Customer tabs"
        onKeyDown={onTabsKeyDown}
        className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b"
      >
        <div className="flex items-center gap-3">
          {/* Segmented control container */}
          <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={[
                    "relative overflow-hidden",
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium",
                    "transition-all duration-200 focus:outline-none",
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
                  {/* Bottom indicator for active tab */}
                  {active && (
                    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side helper text */}
          <div className="ml-auto text-xs text-slate-500">
            {isEdit
              ? C?.modal?.save || "Save changes"
              : C?.modal?.add || "Create customer"}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {Object.keys(errors).length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {C?.alerts?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* Panels */}
      {/* BASICS */}
      <div
        role="tabpanel"
        id="panel-basics"
        aria-labelledby="tab-basics"
        hidden={tab !== "basics"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label={C?.modal?.fields?.no || "No. *"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={no}
              onChange={(e) => setNo(e.target.value)}
              required
            />
          </Field>
          <Field label={C?.modal?.fields?.name || "Name *"} icon={User}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label={C?.modal?.fields?.name2 || "Name 2"} icon={FileText}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.blocked || "Blocked"} icon={Tag}>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={blocked}
              onChange={(e) => setBlocked(e.target.value)}
            >
              <option value="none">none</option>
              <option value="ship">ship</option>
              <option value="invoice">invoice</option>
              <option value="all">all</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ADDRESS */}
      <div
        role="tabpanel"
        id="panel-address"
        aria-labelledby="tab-address"
        hidden={tab !== "address"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={C?.modal?.fields?.address || "Address"} icon={Building}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.address2 || "Address 2"}
            icon={Building}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.city || "City"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.postCode || "Post code"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.region || "Region"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.countryRegionCode || "Country/Region code"}
            icon={Globe}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={countryRegionCode}
              onChange={(e) =>
                setCountryRegionCode(e.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
      </div>

      {/* CONTACT */}
      <div
        role="tabpanel"
        id="panel-contact"
        aria-labelledby="tab-contact"
        hidden={tab !== "contact"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field
            label={C?.modal?.fields?.phoneNo || "Phone No."}
            icon={PhoneCall}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.email || "Email"} icon={Mail}>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.email2 || "Email 2"} icon={Mail}>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.homePage || "Home page"} icon={Globe}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={homePage}
              onChange={(e) => setHomePage(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.billToCustomerNo || "Bill-to Customer No."}
            icon={IdCard}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={billToCustomerNo}
              onChange={(e) => setBillToCustomerNo(e.target.value)}
            />
          </Field>
          <Field label={C?.modal?.fields?.nip || "NIP"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* FINANCE & CODES */}
      <div
        role="tabpanel"
        id="panel-finance"
        aria-labelledby="tab-finance"
        hidden={tab !== "finance"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field
            label={C?.modal?.fields?.creditLimit || "Credit limit"}
            icon={CreditCard}
          >
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.currencyCode || "Currency code"}
            icon={DollarSign}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.priority || "Priority"}
            icon={BadgePercent}
          >
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.paymentMethodCode || "Payment method code"}
            icon={CreditCard}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={paymentMethodCode}
              onChange={(e) => setPaymentMethodCode(e.target.value)}
            />
          </Field>

          <Field
            label={
              C?.modal?.fields?.customerPostingGroup || "Customer posting group"
            }
            icon={Tag}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={customerPostingGroup}
              onChange={(e) => setCustomerPostingGroup(e.target.value)}
            />
          </Field>
          <Field
            label={
              C?.modal?.fields?.customerPriceGroup || "Customer price group"
            }
            icon={Tag}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={customerPriceGroup}
              onChange={(e) => setCustomerPriceGroup(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.languageCode || "Language code"}
            icon={Languages}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.paymentTermsCode || "Payment terms code"}
            icon={CreditCard}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={paymentTermsCode}
              onChange={(e) => setPaymentTermsCode(e.target.value)}
            />
          </Field>

          <Field
            label={C?.modal?.fields?.salespersonCode || "Salesperson code"}
            icon={UserRound}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={salespersonCode}
              onChange={(e) => setSalespersonCode(e.target.value)}
            />
          </Field>
          <Field
            label={
              C?.modal?.fields?.shipmentMethodCode || "Shipment method code"
            }
            icon={Truck}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={shipmentMethodCode}
              onChange={(e) => setShipmentMethodCode(e.target.value)}
            />
          </Field>
          <Field
            label={C?.modal?.fields?.shippingAgentCode || "Shipping agent code"}
            icon={Ship}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={shippingAgentCode}
              onChange={(e) => setShippingAgentCode(e.target.value)}
            />
          </Field>
          <Field
            label={
              C?.modal?.fields?.customerDiscGroup || "Customer disc. group"
            }
            icon={BadgePercent}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={customerDiscGroup}
              onChange={(e) => setCustomerDiscGroup(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* PICTURE */}
      <div
        role="tabpanel"
        id="panel-picture"
        aria-labelledby="tab-picture"
        hidden={tab !== "picture"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={C?.modal?.fields?.picture || "Picture"} icon={Image}>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Preview */}
                <div className="shrink-0">
                  <div className="w-24 h-24 rounded-xl overflow-hidden ring-1 ring-slate-200 bg-white flex items-center justify-center">
                    {(pictureBase64 || existingPicUrl) && !removePicture ? (
                      <img
                        src={pictureBase64 || existingPicUrl}
                        alt="customer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                        <ImageIcon size={22} />
                      </div>
                    )}
                  </div>

                  {isEdit &&
                    existingPicUrl &&
                    !pictureBase64 &&
                    !removePicture && (
                      <button
                        type="button"
                        onClick={() => setRemovePicture(true)}
                        className="mt-2 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                        title="Remove current picture"
                      >
                        Remove
                      </button>
                    )}

                  {isEdit && removePicture && !pictureBase64 && (
                    <button
                      type="button"
                      onClick={() => setRemovePicture(false)}
                      className="mt-2 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                    >
                      Undo remove
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-1">
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) =>
                        onPickPicture(e.target.files?.[0] || null)
                      }
                    />
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 transition p-4 text-center">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <ImageIcon size={16} className="text-slate-500" />
                        {isEdit && (existingPicUrl || pictureBase64)
                          ? "Replace picture"
                          : "Choose picture"}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        PNG/JPG/WebP • up to ~2&nbsp;MB • square works best
                      </p>
                    </div>
                  </label>

                  {pictureBase64 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        New file selected
                      </span>
                      <button
                        type="button"
                        onClick={() => onPickPicture(null)}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {C?.modal?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit
            ? C?.modal?.save || "Save changes"
            : C?.modal?.add || "Create customer"}
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
