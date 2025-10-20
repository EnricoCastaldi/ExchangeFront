// src/pages/DefaultItemParameters.jsx
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
  Sprout, // item icon
  SlidersHorizontal, // parameter icon
  Calendar,
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function DefaultItemParameters() {
  const { t, locale } = useI18n();
  const P = t?.defaultItemParameters || {};

  const L = {
    title: P.title || "Default Item Parameters",
    controls: {
      searchPlaceholder:
        P?.controls?.searchPlaceholder ||
        "Search: item no., parameter code",
      searchBtn: P?.controls?.searchBtn || "Search",
      addBtn: P?.controls?.addBtn || "Add default item parameter",
      itemNoPh: P?.controls?.itemNoPh || "Item No. filter",
      paramCodePh:
        P?.controls?.paramCodePh || "Parameter Code filter",
      filters: P?.controls?.filters || "Filters",
    },
    table: {
      itemNo: P?.table?.itemNo || "Item No.",
      parameterCode: P?.table?.parameterCode || "Parameter Code",
      created: P?.table?.created || "Created",
      actions: P?.table?.actions || "",
      loading: P?.table?.loading || "Loading…",
      empty: P?.table?.empty || "No default item parameters",
      dash: P?.table?.dash || "—",
    },
    details: {
      id: P?.details?.id || "ID",
      itemNo: P?.details?.itemNo || "Item No.",
      parameterCode: P?.details?.parameterCode || "Parameter Code",
      created: P?.details?.created || "Created",
      updated: P?.details?.updated || "Updated",
    },
    modal: {
      titleNew: P?.modal?.titleNew || "Add default item parameter",
      titleEdit: P?.modal?.titleEdit || "Edit default item parameter",
      add: P?.modal?.add || "Add",
      save: P?.modal?.save || "Save",
      cancel: P?.modal?.cancel || "Cancel",
      fields: {
        itemNo: P?.modal?.fields?.itemNo || "Item No. *",
        parameterCode:
          P?.modal?.fields?.parameterCode || "Parameter Code *",
      },
      required: P?.modal?.required || "Please fill required fields.",
    },
    alerts: {
      loadFail:
        P?.alerts?.loadFail ||
        "Failed to load default item parameters.",
      requestFail: P?.alerts?.requestFail || "Request failed.",
      deleteConfirm:
        P?.alerts?.deleteConfirm || "Delete this record?",
      deleted: P?.alerts?.deleted || "Deleted.",
      created: P?.alerts?.created || "Created.",
      updated: P?.alerts?.updated || "Updated.",
    },
    footer: {
      meta:
        P?.footer?.meta ||
        ((total, page, pages) =>
          `Total: ${total} • Page ${page} of ${pages || 1}`),
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
  const [itemFilter, setItemFilter] = useState("");
  const [paramFilter, setParamFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState({
    data: [],
    total: 0,
    pages: 0,
    page: 1,
  });

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

  const activeFilterCount = [itemFilter, paramFilter].filter(Boolean)
    .length;



    // --- sources for selects ---
const [itemsOpt, setItemsOpt] = useState({ data: [], total: 0 });
const [paramsOpt, setParamsOpt] = useState({ data: [], total: 0 });
const [loadingSources, setLoadingSources] = useState(false);

const fetchSelectSources = async () => {
  setLoadingSources(true);
  try {
    // Items
    const itemsQS = new URLSearchParams({
      page: "1",
      limit: "1000",            // adjust if needed
      sort: "itemNo:1",         // or whatever field you sort by
    });
    const itemsRes = await fetch(`${API}/api/mitems?${itemsQS.toString()}`);
    const itemsJson = await itemsRes.json();
    setItemsOpt(itemsJson || { data: [] });

    // Parameters
    const paramsQS = new URLSearchParams({
      page: "1",
      limit: "1000",            // adjust if needed
      sort: "code:1",           // if your backend sorts by code; ok if unknown
    });
    const paramsRes = await fetch(`${API}/api/params?${paramsQS.toString()}`);
    const paramsJson = await paramsRes.json();
    setParamsOpt(paramsJson || { data: [] });
  } catch {
    // non-fatal; the modal will show disabled selects + a hint
  } finally {
    setLoadingSources(false);
  }
};

// load the droplist sources once
useEffect(() => {
  fetchSelectSources();
  // eslint-disable-next-line
}, []);


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
      if (itemFilter) params.set("itemNo", itemFilter);
      if (paramFilter) params.set("parameterCode", paramFilter);

      const res = await fetch(
        `${API}/api/mdefault-item-parameters?${params.toString()}`
      );
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
  }, [page, limit, sortBy, sortDir, itemFilter, paramFilter]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(
        `${API}/api/mdefault-item-parameters/${id}`,
        { method: "DELETE" }
      );
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
      return (v ?? "").toString().toLowerCase();
    };
    arr.sort((a, b) => {
      const av = get(a),
        bv = get(b);
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
    const url = isEdit
      ? `${API}/api/mdefault-item-parameters/${id}`
      : `${API}/api/mdefault-item-parameters`;
    const method = isEdit ? "PUT" : "POST";

    // Normalize payload to uppercase (the backend also uppercases)
    const payload = {
      itemNo: String(form.itemNo || "").trim().toUpperCase(),
      parameterCode: String(form.parameterCode || "")
        .trim()
        .toUpperCase(),
    };

    if (!payload.itemNo || !payload.parameterCode) {
      alert(L.modal.required);
      return;
    }

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
      <form
        onSubmit={onSearch}
        className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm"
      >
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

          <input
            value={itemFilter}
            onChange={(e) => {
              setItemFilter(e.target.value.trim().toUpperCase());
              setPage(1);
            }}
            placeholder={L.controls.itemNoPh}
            className="h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 font-mono"
          />

          <input
            value={paramFilter}
            onChange={(e) => {
              setParamFilter(e.target.value.trim().toUpperCase());
              setPage(1);
            }}
            placeholder={L.controls.paramCodePh}
            className="h-9 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 font-mono"
          />

          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
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
                <SortableTh id="itemNo" {...{ sortBy, sortDir, onSort }}>
                  {L.table.itemNo}
                </SortableTh>
                <SortableTh id="parameterCode" {...{ sortBy, sortDir, onSort }}>
                  {L.table.parameterCode}
                </SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                  {L.table.created}
                </SortableTh>
                <Th className="text-right">{L.table.actions}</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    {L.table.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
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
                          onClick={() =>
                            setExpandedId((id) => (id === key ? null : key))
                          }
                          aria-label={L.a11y.toggleDetails}
                          title={L.a11y.toggleDetails}
                        >
                          {expandedId === key ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </Td>
                      <Td className="font-mono">{r.itemNo}</Td>
                      <Td className="font-mono">{r.parameterCode}</Td>
                      <Td>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString(locale)
                          : L.table.dash}
                      </Td>
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
                        <td colSpan={6} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={L.details.id} icon={Hash}>
                              {key}
                            </KV>
                            <KV label={L.details.itemNo} icon={Sprout}>
                              {r.itemNo}
                            </KV>
                            <KV
                              label={L.details.parameterCode}
                              icon={SlidersHorizontal}
                            >
                              {r.parameterCode}
                            </KV>
                            <KV label={L.details.created} icon={Calendar}>
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString(locale)
                                : L.table.dash}
                            </KV>
                            <KV label={L.details.updated} icon={Calendar}>
                              {r.updatedAt
                                ? new Date(r.updatedAt).toLocaleString(locale)
                                : L.table.dash}
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
          <div className="text-xs text-slate-500">
            {L.footer.meta(data.total, data.page, data.pages)}
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
              onClick={() =>
                setPage((p) => Math.min(data.pages || 1, p + 1))
              }
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
<DefaultItemParameterForm
  initial={editing}
  onCancel={() => {
    setOpen(false);
    setEditing(null);
  }}
  onSubmit={handleSubmit}
  L={L}
  itemsOpt={itemsOpt?.data || []}
  paramsOpt={paramsOpt?.data || []}
  loadingSources={loadingSources}
/>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Tiny atoms ---------- */
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
function Modal({ children, onClose, title = "Default Item Parameter" }) {
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

/* ---------- Form ---------- */
function DefaultItemParameterForm({ initial, onSubmit, onCancel, L, itemsOpt = [], paramsOpt = [], loadingSources = false }) {
  const isEdit = Boolean(initial?.id || initial?._id);
  const [itemNo, setItemNo] = useState((initial?.itemNo || "").toString().toUpperCase());
  const [parameterCode, setParameterCode] = useState((initial?.parameterCode || "").toString().toUpperCase());

const getParamCode = (p) =>
  (p?.parameterCode || p?.code || "").toString().toUpperCase();


  const submit = (e) => {
    e.preventDefault();
    if (!itemNo.trim() || !parameterCode.trim()) {
      alert(L.modal.required);
      return;
    }
    onSubmit({
      itemNo: itemNo.trim().toUpperCase(),
      parameterCode: parameterCode.trim().toUpperCase(),
    });
  };

  const itemDisabled = loadingSources || !itemsOpt?.length;
  const paramDisabled = loadingSources || !paramsOpt?.length;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Item selector */}
<Field label={L.modal.fields.itemNo} icon={Sprout}>
  <TwoLineSelect
    value={itemNo}
    onChange={setItemNo}
    placeholder="Pick item…"
    searchable
    options={(itemsOpt || []).map(it => ({
      id: it.id || it._id || (it.itemNo || it.no || it.code),
      code: (it.itemNo || it.no || it.code || "").toString().toUpperCase(),
      description: (it.name || it.description || "").toString(), // second line
      // extra text (optional) included in search but not rendered:
      extra: [
        it.vendorName,
        it.category,
      ].filter(Boolean).join(" "),
    }))}
  />
</Field>


        {/* Parameter selector */}
<Field label={L.modal.fields.parameterCode} icon={SlidersHorizontal}>
  <TwoLineSelect
    value={parameterCode}
    onChange={setParameterCode}
    placeholder="Pick parameter…"
    searchable
    options={(paramsOpt || []).map(p => ({
      id: p.id || p._id || (p.code ?? p.parameterCode),
      code: (p.parameterCode || p.code || "").toString().toUpperCase(),
      description: (p.description || "").toString(),
      extra: (p.name || p.label || "").toString(), // searchable only
    }))}
  />
</Field>




      </div>

      {(itemDisabled || paramDisabled) && (
        <p className="text-xs text-slate-500">
          {loadingSources
            ? "Loading source lists…"
            : "No items/parameters found. You can add them in their respective modules."}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {L.modal.cancel}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          disabled={!itemNo || !parameterCode}
        >
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
        className: [children.props.className || "", Icon ? " pl-9" : ""].join(
          " "
        ),
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

/* ---------- TwoLineSelect (code-only trigger, two-line menu, searchable) ---------- */
function TwoLineSelect({
  value,
  onChange,
  options,            // [{ id, code, description, extra? }]
  placeholder = "Pick value…",
  className = "",
  searchable = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [hoverIdx, setHoverIdx] = React.useState(-1);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef(null);

  const selected = React.useMemo(
    () => options.find(o => o.code === value) || null,
    [options, value]
  );

  // close on outside click
  React.useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // open with keyboard
  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      setHoverIdx(Math.max(0, options.findIndex(o => o.code === value)));
      return;
    }
    if (!open) return;

    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx(i => Math.min(filtered.length - 1, (i < 0 ? 0 : i + 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx(i => Math.max(0, (i < 0 ? 0 : i - 1)));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[hoverIdx];
      if (opt) { onChange(opt.code); setOpen(false); }
    }
  };

  // filter logic (code + description + extra)
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => {
      const hay = [
        o.code || "",
        o.description || "",
        o.extra || "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // reset query when opening
  React.useEffect(() => {
    if (open) {
      setQuery("");
      // set initial hover to selected or first
      const idx = filtered.findIndex(o => o.code === value);
      setHoverIdx(idx >= 0 ? idx : (filtered.length ? 0 : -1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-3 pr-9 text-left outline-none focus:border-slate-400"
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-sm ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected ? selected.code : placeholder}
        </span>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Menu */}
      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
        >
          {/* Search bar */}
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-400"
                onKeyDown={(e) => {
                  // keep arrow/enter navigation working
                  if (["ArrowDown","ArrowUp","Enter","Escape"].includes(e.key)) {
                    onKeyDown(e);
                  }
                }}
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-3 text-xs text-slate-500">No options</div>
            )}
            {filtered.map((o, idx) => {
              const active = idx === hoverIdx;
              const isSelected = o.code === value;
              return (
                <div
                  key={o.id || o.code}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseDown={(e) => { e.preventDefault(); onChange(o.code); setOpen(false); }}
                  className={`px-3 py-2 cursor-pointer select-none ${active ? "bg-slate-100" : "bg-white"}`}
                >
                  <div className="text-sm font-semibold tracking-wide text-slate-800">
                    {o.code}
                  </div>
                  {o.description && (
                    <div className="text-[11px] uppercase text-slate-500 leading-tight">
                      {o.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
