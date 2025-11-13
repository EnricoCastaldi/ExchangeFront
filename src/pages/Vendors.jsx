import React, { useEffect, useMemo, useState } from "react";
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
  Maximize2,
  Minimize2,
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
  AlertTriangle,
  SlidersHorizontal,
  Filter,
  Eraser,
} from "lucide-react";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function Vendors() {
  const { t, locale } = useI18n();
  const V = t.vendors || {};
  // localized helpers for filters (safe fallbacks)
  const F = {
    searchPh:
      V?.controls?.searchPlaceholder || "Search no, name, email, city, region",
    countryPh:
      V?.controls?.countryPlaceholder ||
      V?.modal?.fields?.countryRegionCode ||
      "Country code",
    regionPh:
      V?.controls?.regionPlaceholder || V?.modal?.fields?.region || "Region",
    all: V?.controls?.allStatuses || "All statuses",
    blocked: {
      none: V?.blockedLabels?.none || "OK",
      ship: V?.blockedLabels?.ship || "SHIP",
      invoice: V?.blockedLabels?.invoice || "INVOICE",
      all: V?.blockedLabels?.all || "ALL",
    },
    rrAll: V?.controls?.rrAll || "All vendors",
    rrOnly: V?.controls?.rrOnly || "RR only",
    rrExclude: V?.controls?.rrExclude || "Without RR",
    searchBtn: V?.controls?.searchBtn || "Search",
    addBtn: V?.controls?.addBtn || "Add Vendor",
  };

  const L = V?.details || {
    name2: "Name 2",
    address: "Address",
    address2: "Address 2",
    postCode: "Post code",
    region: "Region",
    nip: "NIP",
    email2: "Email 2",
    homePage: "Home page",
    currencyCode: "Currency code",
    priority: "Priority",
    owzSigned: "OWZ signed",
    frameworkAgreementSigned: "Framework agreement",
    paymentMethodCode: "Payment method code",
    paymentTermsCode: "Payment terms code",
    languageCode: "Language code",
    vendorPostingGroup: "Vendor posting group",
    vendorPriceGroup: "Vendor price group",
    vendorDiscGroup: "Vendor disc. group",
    purchaserCode: "Purchaser code",
    shipmentMethodCode: "Shipment method code",
    shippingAgentCode: "Shipping agent code",
    rr: "RR",
    picture: "Picture",
    noPicture: "No picture",
  };

  // filters / paging
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [blocked, setBlocked] = useState(""); // '', 'none','ship','invoice','all'
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [rrFilter, setRrFilter] = useState(""); // '', 'true', 'false'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [notice, setNotice] = useState(null); // { type: 'success'|'error', text }
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [blocked, country, region, rrFilter].filter(
    Boolean
  ).length;

  const clearAllFilters = () => {
    setBlocked("");
    setCountry("");
    setRegion("");
    setRrFilter("");
    setPage(1);
  };

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q) params.set("q", q);
      if (blocked) params.set("blocked", blocked);
      if (country) params.set("country", country);
      if (region) params.set("region", region);
      if (rrFilter) params.set("rr", rrFilter);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      const res = await fetch(`${API}/api/mvendors?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", V?.alerts?.loadFail || "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, limit, blocked, country, region, rrFilter, sortBy, sortDir]);

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
    if (!window.confirm(V?.alerts?.deleteConfirm || "Delete this vendor?"))
      return;
    try {
      const res = await fetch(`${API}/api/mvendors/${_id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        if (expandedId === _id) setExpandedId(null);
        showNotice("success", V?.alerts?.deleted || "Vendor deleted.");
        fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice(
          "error",
          json?.message || V?.alerts?.requestFail || "Request failed"
        );
      }
    } catch {
      showNotice("error", V?.alerts?.requestFail || "Request failed");
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
      owzSigned: "owzSigned",
      frameworkAgreementSigned: "frameworkAgreementSigned",
      creditLimit: "creditLimit",
      createdAt: "createdAt",
    };
    const k = keyMap[sortBy] || sortBy;

    const val = (r) => {
      const v = r?.[k];
      if (k === "creditLimit") return Number(v) || 0;
      if (k === "createdAt") return v ? new Date(v).getTime() : 0;
      if (k === "owzSigned" || k === "frameworkAgreementSigned")
        return v ? 1 : 0;
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

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?._id);
    const url = isEdit
      ? `${API}/api/mvendors/${editing._id}`
      : `${API}/api/mvendors`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        return showNotice(
          "error",
          json?.message || V?.alerts?.requestFail || "Request failed"
        );

      showNotice(
        "success",
        isEdit
          ? V?.alerts?.updated || "Vendor updated."
          : V?.alerts?.created || "Vendor created."
      );
      setOpen(false);
      setEditing(null);
      setPage(1);
      fetchData();
    } catch {
      showNotice("error", V?.alerts?.requestFail || "Request failed");
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <Toast type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Toast>
      )}

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
              title={V?.controls?.searchBtn || "Search"}
              aria-label={V?.controls?.searchBtn || "Search"}
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
            aria-controls="vendor-filters-panel"
          >
            <SlidersHorizontal size={16} />
            {V?.controls?.filters || "Filters"}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Add vendor — emphasized primary button */}
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
          id="vendor-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-4 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          {/* blocked */}
          <select
            value={blocked}
            onChange={(e) => {
              setBlocked(e.target.value);
              setPage(1);
            }}
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

          {/* RR filter */}
          <select
            value={rrFilter}
            onChange={(e) => {
              setRrFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            title="RR filter"
          >
            <option value="">{F.rrAll}</option>
            <option value="true">{F.rrOnly}</option>
            <option value="false">{F.rrExclude}</option>
          </select>
        </div>

        {/* Active filter chips (optional) */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {blocked && (
            <Chip
              clearTitle={V?.modal?.cancel || "Clear"}
              onClear={() => setBlocked("")}
              label={`${V?.table?.blocked || "Blocked"}: ${
                F.blocked[blocked] || blocked
              }`}
            />
          )}
          {country && (
            <Chip
              clearTitle={V?.modal?.cancel || "Clear"}
              onClear={() => setCountry("")}
              label={`${V?.table?.country || "Country"}: ${country}`}
            />
          )}
          {region && (
            <Chip
              clearTitle={V?.modal?.cancel || "Clear"}
              onClear={() => setRegion("")}
              label={`${V?.table?.city || "City/Region"}: ${region}`}
            />
          )}
          {rrFilter && (
            <Chip
              clearTitle={V?.modal?.cancel || "Clear"}
              onClear={() => setRrFilter("")}
              label={
                rrFilter === "true"
                  ? V?.chips?.rrOnly || "RR only"
                  : V?.chips?.rrExclude || "Without RR"
              }
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
                {/* expand toggle */}
                <SortableTh id="no" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.no || "No."}
                </SortableTh>
                <SortableTh id="name" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.name || "Name"}
                </SortableTh>
                <SortableTh id="email" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.email || "Email"}
                </SortableTh>
                <SortableTh id="phone" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.phone || "Phone"}
                </SortableTh>
                <SortableTh id="country" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.country || "Country"}
                </SortableTh>
                <SortableTh id="city" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.city || "City"}
                </SortableTh>
                <SortableTh id="blocked" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.blocked || "Blocked"}
                </SortableTh>
                <SortableTh id="owzSigned" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.owzSigned || "OWZ"}
                </SortableTh>
                <SortableTh
                  id="frameworkAgreementSigned"
                  {...{ sortBy, sortDir, onSort }}
                >
                  {V?.table?.frameworkAgreementSigned || "Framework"}
                </SortableTh>
                <SortableTh
                  id="creditLimit"
                  className="text-right pr-4"
                  {...{ sortBy, sortDir, onSort }}
                >
                  {V?.table?.creditLimit || "Credit limit"}
                </SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                  {V?.table?.created || "Created"}
                </SortableTh>
                <Th>{V?.table?.actions || ""}</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-slate-500">
                    {V?.table?.loading || "Loading…"}
                  </td>
                </tr>
              ) : (data.data?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-slate-500">
                    {V?.table?.empty || "No vendors"}
                  </td>
                </tr>
              ) : (
                (typeof rows !== "undefined" ? rows : data.data).map((v) => (
                  <React.Fragment key={v._id}>
                    <tr className="border-t">
                      <Td className="w-8">
                        <button
                          className="p-1 rounded hover:bg-slate-100"
                          onClick={() =>
                            setExpandedId((id) => (id === v._id ? null : v._id))
                          }
                          aria-label="Toggle details"
                          title="Toggle details"
                        >
                          {expandedId === v._id ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </Td>
                      <Td>
                        <NoBadge value={displayVendorKey(v)} />
                      </Td>

                      <Td className="font-medium">{v.name}</Td>
                      <Td className="text-slate-600">{v.email || "—"}</Td>
                      <Td className="text-slate-600">{v.phoneNo || "—"}</Td>
                      <Td>{v.countryRegionCode || "—"}</Td>
                      <Td>{v.city || "—"}</Td>
                      <Td>{blockedChip(v.blocked, V)}</Td>
                      <Td className="text-center">
                        <BoolIcon value={!!v.owzSigned} variant="danger" />
                      </Td>
                      <Td className="text-center">
                        <BoolIcon
                          value={!!v.frameworkAgreementSigned}
                          variant="danger"
                        />
                      </Td>
                      <Td className="text-right pr-4 font-medium">
                        {fmtMoney(
                          Number(v.creditLimit || 0),
                          locale,
                          v.currencyCode || "USD"
                        )}
                      </Td>
                      <Td>{formatDate(v.createdAt, locale, "—")}</Td>

                      <Td>
                        <div className="flex justify-end gap-2 pr-3">
                          <button
                            className="p-2 rounded-lg hover:bg-slate-100"
                            onClick={() => onEditClick(v)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                            onClick={() => onDelete(v._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>

                    {expandedId === v._id && (
                      <tr key={`${v._id}-details`}>
                        <td colSpan={13} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={L.name2} icon={FileText}>
                              {v.name2 || "—"}
                            </KV>
                            <KV label={L.address} icon={Building}>
                              {v.address || "—"}
                            </KV>
                            <KV label={L.address2} icon={Building}>
                              {v.address2 || "—"}
                            </KV>
                            <KV label={L.postCode} icon={Hash}>
                              {v.postCode || "—"}
                            </KV>
                            <KV label={L.region} icon={MapPin}>
                              {v.region || "—"}
                            </KV>
                            <KV label={L.nip} icon={Hash}>
                              {v.nip || "—"}
                            </KV>
                            <KV label={L.email2} icon={Mail}>
                              {v.email2 || "—"}
                            </KV>
                            <KV label={L.homePage} icon={Globe}>
                              {v.homePage || "—"}
                            </KV>

                            <KV label={L.currencyCode} icon={DollarSign}>
                              {v.currencyCode || "—"}
                            </KV>
                            <KV label={L.priority} icon={BadgePercent}>
                              {v.priority ?? "—"}
                            </KV>
                            <KV label={L.owzSigned} icon={CheckCircle2}>
                              <BoolIcon
                                value={!!v.owzSigned}
                                variant="danger"
                              />
                            </KV>
                            <KV
                              label={L.frameworkAgreementSigned}
                              icon={CheckCircle2}
                            >
                              <BoolIcon
                                value={!!v.frameworkAgreementSigned}
                                variant="danger"
                              />
                            </KV>

                            <KV label={L.paymentMethodCode} icon={CreditCard}>
                              {v.paymentMethodCode || "—"}
                            </KV>
                            <KV label={L.paymentTermsCode} icon={CreditCard}>
                              {v.paymentTermsCode || "—"}
                            </KV>

                            <KV label={L.vendorPostingGroup} icon={Tag}>
                              {v.vendorPostingGroup || "—"}
                            </KV>
                            <KV label={L.vendorPriceGroup} icon={Tag}>
                              {v.vendorPriceGroup || "—"}
                            </KV>
                            <KV label={L.vendorDiscGroup} icon={Tag}>
                              {v.vendorDiscGroup || "—"}
                            </KV>
                            <KV label={L.purchaserCode} icon={UserRound}>
                              {v.purchaserCode || "—"}
                            </KV>

                            <KV label={L.shipmentMethodCode} icon={Truck}>
                              {v.shipmentMethodCode || "—"}
                            </KV>
                            <KV label={L.shippingAgentCode} icon={Ship}>
                              {v.shippingAgentCode || "—"}
                            </KV>
                            <KV label={L.rr} icon={BadgePercent}>
                              {v.rr
                                ? V?.labels?.yes || "Yes"
                                : V?.labels?.no || "No"}
                            </KV>

                            {v.hasPicture ? (
                              <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                                <ImageIcon size={14} />
                                <span className="font-medium">
                                  {L.picture}:
                                </span>
                                <img
                                  src={`${API}/api/mvendors/${v._id}/picture`}
                                  alt="vendor"
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
            {(V?.footer?.meta &&
              V.footer.meta(data.total, data.page, data.pages)) ||
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
                  {(V?.footer?.perPage && V.footer.perPage(n)) || `${n} / page`}
                </option>
              ))}
            </select>

            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              {V?.footer?.prev || "Prev"}
            </button>
            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
              disabled={data.page >= (data.pages || 1)}
            >
              {V?.footer?.next || "Next"}
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
          title={V?.modal?.title || "Vendor"}
        >
          <VendorForm
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            V={V}
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
function displayVendorKey(v) {
  if (v?.no) return v.no;
  if (v?.nip) return v.nip;
  return v?._id ? `…${String(v._id).slice(-6)}` : "—";
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

function formatDate(s, locale, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(locale) : dash;
  } catch {
    return s || dash;
  }
}

function blockedChip(v, V) {
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
    (V?.blockedLabels && V.blockedLabels[val]) ||
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

function Modal({ children, onClose, title, fullscreen = false }) {
  const [isFull, setIsFull] = React.useState(Boolean(fullscreen));

  React.useEffect(() => {
    const onKey = (e) => {
      const key = (e.key || "").toString().toLowerCase();

      if (key === "escape" || key === "esc") {
        onClose?.();
        return;
      }

      if (key === "f") {
        setIsFull((v) => !v);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull
      ? "w-screen h-screen max-w-none rounded-none"
      : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull
    ? "p-4 h-[calc(100vh-52px)] overflow-auto" // ~52px header
    : "p-4 max-h-[75vh] overflow-auto";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      {/* keep black backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={containerCls}>
        {/* Top bar with expand/close */}
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

function VendorForm({ initial, onSubmit, onCancel, V }) {
  const isEdit = Boolean(initial?._id);

  // ----- tabs -----
  const TABS = [
    { id: "basics", label: V?.modal?.tabs?.basics || "Basics", Icon: IdCard },
    { id: "address", label: V?.modal?.tabs?.address || "Address", Icon: Map },
    { id: "contact", label: V?.modal?.tabs?.contact || "Contact", Icon: Phone },
    {
      id: "finance",
      label: V?.modal?.tabs?.finance || "Finance & Codes",
      Icon: Wallet,
    },
    { id: "picture", label: V?.modal?.tabs?.picture || "Picture", Icon: Image },
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

  // ----- state -----
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

  const [nip, setNip] = useState(initial?.nip || "");
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit ?? 0);
  const [currencyCode, setCurrencyCode] = useState(
    initial?.currencyCode || "USD"
  );
  const [vendorPostingGroup, setVendorPostingGroup] = useState(
    initial?.vendorPostingGroup || ""
  );
  const [vendorPriceGroup, setVendorPriceGroup] = useState(
    initial?.vendorPriceGroup || ""
  );
  const [languageCode, setLanguageCode] = useState(initial?.languageCode || "");
  const [paymentTermsCode, setPaymentTermsCode] = useState(
    initial?.paymentTermsCode || ""
  );
  const [paymentMethodCode, setPaymentMethodCode] = useState(
    initial?.paymentMethodCode || ""
  );
  const [vendorDiscGroup, setVendorDiscGroup] = useState(
    initial?.vendorDiscGroup || ""
  );
  const [purchaserCode, setPurchaserCode] = useState(
    initial?.purchaserCode || ""
  );
  const [shipmentMethodCode, setShipmentMethodCode] = useState(
    initial?.shipmentMethodCode || ""
  );
  const [shippingAgentCode, setShippingAgentCode] = useState(
    initial?.shippingAgentCode || ""
  );
  const [blocked, setBlocked] = useState(initial?.blocked || "none");
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [owzSigned, setOwzSigned] = useState(
    typeof initial?.owzSigned === "boolean" ? initial.owzSigned : false
  );
  const [frameworkAgreementSigned, setFrameworkAgreementSigned] = useState(
    typeof initial?.frameworkAgreementSigned === "boolean"
      ? initial.frameworkAgreementSigned
      : false
  );
  const [rr, setRr] = useState(Boolean(initial?.rr));

  // picture state
  const [, setPictureFile] = useState(null);
  const [pictureBase64, setPictureBase64] = useState(null);
  const [removePicture, setRemovePicture] = useState(false);

  const existingPicUrl = initial?.hasPicture
    ? initial?.picturePath
      ? `${API}${initial.picturePath}`
      : `${API}/api/mvendors/${initial?._id}/picture`
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
      if (errs.no || errs.name) setTab("basics");
      else if (errs.email || errs.email2) setTab("contact");
      return;
    }
    setErrors({});

    const payload = {
      no: no.trim(),
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

      nip: nip.trim() || null,
      creditLimit: Number(creditLimit) || 0,
      currencyCode: (currencyCode || "USD").trim().toUpperCase(),

      vendorPostingGroup: vendorPostingGroup.trim() || null,
      vendorPriceGroup: vendorPriceGroup.trim() || null,
      vendorDiscGroup: vendorDiscGroup.trim() || null,

      languageCode: languageCode.trim() || null,
      paymentTermsCode: paymentTermsCode.trim() || null,
      paymentMethodCode: paymentMethodCode.trim() || null,

      purchaserCode: purchaserCode.trim() || null,
      shipmentMethodCode: shipmentMethodCode.trim() || null,
      shippingAgentCode: shippingAgentCode.trim() || null,

      blocked,
      priority: Number.isNaN(parseInt(priority, 10))
        ? 0
        : parseInt(priority, 10),
      owzSigned: Boolean(owzSigned),
      frameworkAgreementSigned: Boolean(frameworkAgreementSigned),
      rr: Boolean(rr),
    };

    if (pictureBase64) payload.picture = pictureBase64;
    else if (isEdit && removePicture) payload.picture = null;

    onSubmit(payload);
  };

  // Auto-assign next D0000001... when creating a new vendor
  useEffect(() => {
    if (isEdit) return; // only when adding
    let stop = false;

    (async () => {
      try {
        // zero-padded -> lexicographic sort works
        const res = await fetch(
          `${API}/api/mvendors?limit=1&sortBy=no&sortDir=desc`
        );
        const json = await res.json();
        const last = json?.data?.[0]?.no || null;
        const next = nextVendorNoFrom(last);
        if (!stop) setNo(next);
      } catch {
        if (!stop) setNo(nextVendorNoFrom(null)); // fallback to D0000001
      }
    })();

    return () => {
      stop = true;
    };
  }, [isEdit, setNo]);

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Tabs nav */}
      <div
        role="tablist"
        aria-label="Vendor tabs"
        onKeyDown={onTabsKeyDown}
        className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b"
      >
        <div className="flex items-center gap-3">
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
                  {active && (
                    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="ml-auto text-xs text-slate-500">
            {isEdit
              ? V?.modal?.save || "Save changes"
              : V?.modal?.add || "Create vendor"}
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
          {V?.alerts?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* BASICS */}
      <div
        role="tabpanel"
        id="panel-basics"
        aria-labelledby="tab-basics"
        hidden={tab !== "basics"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Field
            label={V?.modal?.fields?.no || "No."}
            icon={Hash}
            error={errors.no}
            help={V?.modal?.autoNumberHelp || ""}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 text-slate-700"
              value={no}
              readOnly
              aria-readonly="true"
              placeholder="Auto"
              title="Automatically assigned"
              required
            />
          </Field>

          <Field
            label={V?.modal?.fields?.name || "Name *"}
            icon={User}
            error={errors.name}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label={V?.modal?.fields?.name2 || "Name 2"} icon={FileText}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.blocked || "Blocked"} icon={Tag}>
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
          <Field label={V?.modal?.fields?.rr || "RR"} icon={BadgePercent}>
            <div className="flex items-center gap-2">
              <input
                id="rr"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={rr}
                onChange={(e) => setRr(e.target.checked)}
              />
              <label
                htmlFor="rr"
                className="text-sm text-slate-700 select-none"
              >
                {rr ? V?.labels?.yes || "Yes" : V?.labels?.no || "No"}
              </label>
            </div>
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
          <Field label={V?.modal?.fields?.address || "Address"} icon={Building}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.address2 || "Address 2"}
            icon={Building}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.city || "City"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.postCode || "Post code"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.region || "Region"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.countryRegionCode || "Country/Region code"}
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
            label={V?.modal?.fields?.phoneNo || "Phone No."}
            icon={PhoneCall}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.email || "Email"}
            icon={Mail}
            error={errors.email}
          >
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.email2 || "Email 2"}
            icon={Mail}
            error={errors.email2}
          >
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.homePage || "Home page"} icon={Globe}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={homePage}
              onChange={(e) => setHomePage(e.target.value)}
            />
          </Field>
          <Field label={V?.modal?.fields?.nip || "NIP"} icon={Hash}>
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
            label={V?.modal?.fields?.creditLimit || "Credit limit"}
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
            label={V?.modal?.fields?.currencyCode || "Currency code"}
            icon={DollarSign}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.priority || "Priority"}
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
            label={V?.modal?.fields?.owzSigned || "OWZ signed"}
            icon={CheckCircle2}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={owzSigned ? "yes" : "no"}
              onChange={(e) => setOwzSigned(e.target.value === "yes")}
            >
              <option value="yes">{V?.labels?.yes || "Yes"}</option>
              <option value="no">{V?.labels?.no || "No"}</option>
            </select>
          </Field>

          <Field
            label={
              V?.modal?.fields?.frameworkAgreementSigned ||
              "Framework agreement signed"
            }
            icon={CheckCircle2}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={frameworkAgreementSigned ? "yes" : "no"}
              onChange={(e) =>
                setFrameworkAgreementSigned(e.target.value === "yes")
              }
            >
              <option value="yes">{V?.labels?.yes || "Yes"}</option>
              <option value="no">{V?.labels?.no || "No"}</option>
            </select>
          </Field>
          <Field
            label={V?.modal?.fields?.paymentMethodCode || "Payment method code"}
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
              V?.modal?.fields?.vendorPostingGroup || "Vendor posting group"
            }
            icon={Tag}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={vendorPostingGroup}
              onChange={(e) => setVendorPostingGroup(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.vendorPriceGroup || "Vendor price group"}
            icon={Tag}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={vendorPriceGroup}
              onChange={(e) => setVendorPriceGroup(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.languageCode || "Language code"}
            icon={Languages}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.paymentTermsCode || "Payment terms code"}
            icon={CreditCard}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={paymentTermsCode}
              onChange={(e) => setPaymentTermsCode(e.target.value)}
            />
          </Field>

          <Field
            label={V?.modal?.fields?.purchaserCode || "Purchaser code"}
            icon={UserRound}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={purchaserCode}
              onChange={(e) => setPurchaserCode(e.target.value)}
            />
          </Field>
          <Field
            label={
              V?.modal?.fields?.shipmentMethodCode || "Shipment method code"
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
            label={V?.modal?.fields?.shippingAgentCode || "Shipping agent code"}
            icon={Ship}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={shippingAgentCode}
              onChange={(e) => setShippingAgentCode(e.target.value)}
            />
          </Field>
          <Field
            label={V?.modal?.fields?.vendorDiscGroup || "Vendor disc. group"}
            icon={BadgePercent}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={vendorDiscGroup}
              onChange={(e) => setVendorDiscGroup(e.target.value)}
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
          <Field
            label={V?.modal?.fields?.picture || "Picture"} // or C/T accordingly
            icon={Image}
            iconInside={false} // <- hide the tiny inside icon
            autoHeight={true} // <- keep dropzone natural height
          >
            <PictureDrop
              title={V?.modal?.choosePicture || "Choose picture"}
              replaceTitle={V?.modal?.replacePicture || "Replace picture"}
              help={
                V?.modal?.pictureHelp ||
                "PNG/JPG/WebP • up to ~2 MB • square works best"
              }
              previewSrc={
                !removePicture ? pictureBase64 || existingPicUrl : null
              }
              onPickFile={(file) => onPickPicture(file)}
              canRemove={isEdit && !!existingPicUrl}
              removing={removePicture}
              onToggleRemove={() => setRemovePicture((v) => !v)}
              hasNewSelection={Boolean(pictureBase64)}
              onClearSelection={() => onPickPicture(null)}
            />
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
          {V?.modal?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit
            ? V?.modal?.save || "Save changes"
            : V?.modal?.add || "Create vendor"}
        </button>
      </div>
    </form>
  );
}

// --- AUTO "No." helpers (Vendors use D + 7 digits) ---
function nextVendorNoFrom(lastNo) {
  const m = String(lastNo || "").match(/^D(\d{1,})$/i);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `D${String(n).padStart(7, "0")}`;
}

// Small chip for No. column (bold + light blue)
function NoBadge({ value }) {
  const v = value || "—";
  const isEmpty = v === "—";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono border",
        isEmpty
          ? "text-slate-400 bg-slate-50 border-slate-200"
          : "font-semibold text-sky-700 bg-sky-50 border-sky-200",
      ].join(" ")}
    >
      <Hash size={12} className={isEmpty ? "text-slate-300" : "text-sky-500"} />
      {v}
    </span>
  );
}

function BoolIcon({ value, variant = "default" }) {
  const base =
    "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs";

  if (value) {
    return (
      <span
        className={base + " border-emerald-200 bg-emerald-50 text-emerald-600"}
        title="Yes"
      >
        ✓
      </span>
    );
  }

  const falseClass =
    variant === "danger"
      ? " border-red-200 bg-red-50 text-red-500" // light red ✕
      : " border-slate-200 bg-slate-50 text-slate-400"; // default grey ✕

  return (
    <span className={base + falseClass} title="No">
      ✕
    </span>
  );
}

function PictureDrop({
  title = "Choose picture",
  replaceTitle = "Replace picture",
  help = "PNG/JPG/WebP • up to ~2 MB • square works best",
  previewSrc, // string | null  (existingPicUrl or pictureBase64)
  onPickFile, // (File|null) => void
  canRemove = false, // show remove/undo for existing server image
  removing = false, // toggle "remove" state
  onToggleRemove, // () => void
  hasNewSelection = false, // pictureBase64 present
  onClearSelection, // () => void
}) {
  // make file input accessible & trigger-able
  const inputId = React.useId();

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="shrink-0">
          <div className="w-24 h-24 rounded-xl overflow-hidden ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center">
            {previewSrc && !removing ? (
              <img
                src={previewSrc}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                <ImageIcon size={22} />
              </div>
            )}
          </div>

          {/* Remove / Undo */}
          {canRemove && !hasNewSelection && (
            <button
              type="button"
              onClick={onToggleRemove}
              className="mt-2 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              title={removing ? "Undo remove" : "Remove"}
            >
              {removing ? "Undo remove" : "Remove"}
            </button>
          )}
        </div>

        {/* Drop area */}
        <div className="flex-1">
          <label
            htmlFor={inputId}
            className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 transition p-4 text-center"
          >
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <ImageIcon size={16} className="text-slate-500" />
              {previewSrc && !removing ? replaceTitle : title}
            </div>
            <p className="mt-1 text-xs text-slate-500">{help}</p>
          </label>

          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />

          {/* New selection chip + clear */}
          {hasNewSelection && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                New file selected
              </span>
              <button
                type="button"
                onClick={onClearSelection}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small Field helper (icon on the left + error styles) */
function Field({
  label,
  icon: Icon,
  error,
  help,
  children,
  iconInside = true, // NEW: draw icon inside the input? (default true)
  autoHeight = false, // NEW: skip the fixed h-10 height? (default false)
}) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          iconInside && Icon ? " pl-9" : "",
          !autoHeight ? " h-10" : "", // only force height for real inputs
          error ? " border-red-300 focus:border-red-400" : "",
        ].join(" "),
      })
    : children;

  return (
    <label className="text-sm block">
      {/* label line (keep the small icon here) */}
      <div className="mb-1 text-slate-600 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>

      {/* input wrapper; only inject inside icon when requested */}
      <div className="relative">
        {iconInside && Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
        {child}
      </div>

      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}
