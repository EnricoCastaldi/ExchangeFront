// src/pages/DefaultLocations.jsx
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
  Hash,
  MapPin,
  Building2,
  Users,
  ToggleRight,
  Calendar,
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function DefaultLocations() {
  const { t, locale } = useI18n();
  const P = t?.defaultLocations || {};

  const L = {
    title: P.title || "Default Locations",
    controls: {
      searchPlaceholder:
        P?.controls?.searchPlaceholder ||
        "Search: location no., vendor/customer no.",
      searchBtn: P?.controls?.searchBtn || "Search",
      addBtn: P?.controls?.addBtn || "Add default location",
      allTypes: P?.controls?.allTypes || "All types",
      allDefaults: P?.controls?.allDefaults || "All",
      typeVendor: P?.controls?.typeVendor || "Vendor",
      typeCustomer: P?.controls?.typeCustomer || "Customer",
      defaultOnly: P?.controls?.defaultOnly || "Default only",
      nonDefaultOnly: P?.controls?.nonDefaultOnly || "Non-default only",
      filters: P?.controls?.filters || "Filters",
    },
    table: {
      locationType: P?.table?.locationType || "Type",
      partyNo: P?.table?.partyNo || "Vendor/Customer No.",
      locationNo: P?.table?.locationNo || "Location No.",
      isDefault: P?.table?.isDefault || "Default",
      created: P?.table?.created || "Created",
      actions: P?.table?.actions || "",
      loading: P?.table?.loading || "Loading…",
      empty: P?.table?.empty || "No default locations",
      dash: P?.table?.dash || "—",
    },
    details: {
      id: P?.details?.id || "ID",
      locationType: P?.details?.locationType || "Location Type",
      partyNo: P?.details?.partyNo || "Vendor/Customer No.",
      locationNo: P?.details?.locationNo || "Location No.",
      isDefault: P?.details?.isDefault || "Default",
      created: P?.details?.created || "Created",
      updated: P?.details?.updated || "Updated",
    },
    modal: {
      titleNew: P?.modal?.titleNew || "Add default location",
      titleEdit: P?.modal?.titleEdit || "Edit default location",
      add: P?.modal?.add || "Add",
      save: P?.modal?.save || "Save",
      cancel: P?.modal?.cancel || "Cancel",
      fields: {
        locationType: P?.modal?.fields?.locationType || "Location Type *",
        partyNo: P?.modal?.fields?.partyNo || "Vendor/Customer No. *",
        locationNo: P?.modal?.fields?.locationNo || "Location No. *",
        defaultLocation: P?.modal?.fields?.defaultLocation || "Default location",
      },
      required: P?.modal?.required || "Please fill required fields.",
    },
    alerts: {
      loadFail: P?.alerts?.loadFail || "Failed to load default locations.",
      requestFail: P?.alerts?.requestFail || "Request failed.",
      deleteConfirm: P?.alerts?.deleteConfirm || "Delete this record?",
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
    a11y: { toggleDetails: P?.a11y?.toggleDetails || "Toggle details" },
  };

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState(""); // "", "vendor", "customer"
  const [onlyDefault, setOnlyDefault] = useState(""); // "", "true", "false"

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

  const activeFilterCount = [type, onlyDefault].filter(Boolean).length;

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
      if (type) params.set("locationType", type); // backend: vendor|customer
      if (onlyDefault !== "") params.set("isDefault", onlyDefault); // backend: isDefault

      // backend mount: /api/mdefault-locations
      const res = await fetch(`${API}/api/mdefault-locations?${params.toString()}`);
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
  }, [page, limit, type, onlyDefault, sortBy, sortDir]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/mdefault-locations/${id}`, { method: "DELETE" });
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
      if (k === "isDefault") return r.isDefault ? 1 : 0;
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
    const url = isEdit ? `${API}/api/mdefault-locations/${id}` : `${API}/api/mdefault-locations`;
    const method = isEdit ? "PUT" : "POST";

    // adapt payload to backend expectations
    const payload = {
      locationType: String(form.locationType || "").toLowerCase(), // vendor|customer
      partyNo: form.partyNo,
      locationNo: form.locationNo,
      isDefault: Boolean(form.defaultLocation ?? form.isDefault ?? true),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{L.controls.allTypes}</option>
            <option value="vendor">{L.controls.typeVendor}</option>
            <option value="customer">{L.controls.typeCustomer}</option>
          </select>

          <select
            value={onlyDefault}
            onChange={(e) => { setOnlyDefault(e.target.value); setPage(1); }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{L.controls.allDefaults}</option>
            <option value="true">{L.controls.defaultOnly}</option>
            <option value="false">{L.controls.nonDefaultOnly}</option>
          </select>

          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => { setEditing(null); setOpen(true); }}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {L.controls.addBtn}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th />
                <SortableTh id="locationType" {...{ sortBy, sortDir, onSort }}>{L.table.locationType}</SortableTh>
                <SortableTh id="partyNo" {...{ sortBy, sortDir, onSort }}>{L.table.partyNo}</SortableTh>
                <SortableTh id="locationNo" {...{ sortBy, sortDir, onSort }}>{L.table.locationNo}</SortableTh>
                <SortableTh id="isDefault" {...{ sortBy, sortDir, onSort }}>{L.table.isDefault}</SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>{L.table.created}</SortableTh>
                <Th className="text-right">{L.table.actions}</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    {L.table.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
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
                      <Td className="flex items-center gap-2">
                        {r.locationType === "vendor" ? <Building2 size={14} /> : <Users size={14} />}
                        <span className="font-medium">{(r.locationType || L.table.dash).toUpperCase()}</span>
                      </Td>
                      <Td className="font-mono">{r.partyNo}</Td>
                      <Td className="font-mono">{r.locationNo}</Td>
                      <Td>{defaultChip(Boolean(r.isDefault))}</Td>
                      <Td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : L.table.dash}</Td>
                      <Td>
                        <div className="flex justify-end gap-2 pr-3">
                          <button
                            className="p-2 rounded-lg hover:bg-slate-100"
                            onClick={() => { setEditing(r); setOpen(true); }}
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
                        <td colSpan={7} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={L.details.id}>{key}</KV>
                            <KV label={L.details.locationType}>
                              {(r.locationType || "").toUpperCase()}
                            </KV>
                            <KV label={L.details.partyNo}>{r.partyNo}</KV>
                            <KV label={L.details.locationNo} icon={MapPin}>{r.locationNo}</KV>
                            <KV label={L.details.isDefault} icon={ToggleRight}>
                              {defaultChip(Boolean(r.isDefault))}
                            </KV>
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
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
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
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <DefaultLocationForm
            initial={editing}
            onCancel={() => { setOpen(false); setEditing(null); }}
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
function Modal({ children, onClose, title = "Default Location" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200">
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

function defaultChip(on) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        on ? "bg-green-50 text-green-700 border border-green-200"
           : "bg-slate-100 text-slate-700 border border-slate-200"
      }`}
    >
      {on ? "DEFAULT" : "—"}
    </span>
  );
}

/* ---------- Form ---------- */
function DefaultLocationForm({ initial, onSubmit, onCancel, L }) {
  const isEdit = Boolean(initial?.id || initial?._id);
  const [locationType, setLocationType] = useState(
    (initial?.locationType || "vendor").toString().toLowerCase()
  ); // vendor | customer
  const [partyNo, setPartyNo] = useState(initial?.partyNo || "");
  const [locationNo, setLocationNo] = useState(initial?.locationNo || "");
  const [defaultLocation, setDefaultLocation] = useState(
    initial?.isDefault ?? true
  );

  const submit = (e) => {
    e.preventDefault();
    if (!locationType || !partyNo.trim() || !locationNo.trim()) {
      alert(L.modal.required);
      return;
    }
    const payload = {
      locationType, // lowercase; backend expects vendor|customer
      partyNo: partyNo.trim(),
      locationNo: locationNo.trim().toUpperCase(),
      defaultLocation: Boolean(defaultLocation),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={L.modal.fields.locationType} icon={MapPin}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
          >
            <option value="vendor">Vendor</option>
            <option value="customer">Customer</option>
          </select>
        </Field>

        <Field label={L.modal.fields.partyNo || "Vendor/Customer No. *"} icon={locationType === "vendor" ? Building2 : Users}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={partyNo}
            onChange={(e) => setPartyNo(e.target.value)}
            placeholder={locationType === "vendor" ? "Vendor No." : "Customer No."}
          />
        </Field>

        <Field label={L.modal.fields.locationNo} icon={Hash}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={locationNo}
            onChange={(e) => setLocationNo(e.target.value)}
          />
        </Field>

        <label className="text-sm flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            checked={Boolean(defaultLocation)}
            onChange={(e) => setDefaultLocation(e.target.checked)}
            className="h-4 w-4"
          />
          {L.modal.fields.defaultLocation}
        </label>
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
