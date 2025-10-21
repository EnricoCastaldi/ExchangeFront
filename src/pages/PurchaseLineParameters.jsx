// src/pages/PurchaseLineParameters.jsx
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
  Calendar,
  ListOrdered,
  SlidersHorizontal,
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function PurchaseLineParameters() {
  const { t, locale, lang } = useI18n();

  // i18n namespace (mirror of salesLineParameters)
const DEFAULT_L = {
  controls: {
    searchPlaceholder: "Search purchase line parameters…",
    searchBtn: "Search",
    addBtn: "Add parameter",
  },
  table: {
    documentNo: "Document No.",
    documentLineNo: "Document Line No.",
    paramCode: "Param. Code",
    paramValue: "Param. Value",
    created: "Created",
    actions: "Actions",
    loading: "Loading…",
    empty: "No rows",
    dash: "—",
  },
  footer: {
    prev: "Previous",
    next: "Next",
    perPage: (n) => `Show ${n}/page`,
    meta: (total, page, pages) => `Total ${total} • Page ${pages ? `${page}/${pages}` : page}`,
  },
  a11y: { toggleDetails: "Toggle details" },
  details: {
    id: "ID",
    documentNo: "Document No.",
    documentLineNo: "Document Line No.",
    paramCode: "Param. Code",
    paramValue: "Param. Value",
    created: "Created",
    updated: "Updated",
  },
  modal: {
    titleNew: "Add purchase line parameter",
    titleEdit: "Edit purchase line parameter",
    required: "Document No., Document Line No. and Param. Code are required.",
    cancel: "Cancel",
    add: "Add",
    save: "Save",
    fields: {
      documentNo: "Document No.",
      documentLineNo: "Document Line No.",
      paramCode: "Param. Code",
      paramValue: "Param. Value",
    },
  },
  alerts: {
    loadFail: "Failed to load purchase line parameters.",
    requestFail: "Request failed.",
    deleteConfirm: "Delete this parameter?",
    deleted: "Deleted.",
    created: "Created.",
    updated: "Updated.",
  },
};

const L = t?.purchaseLineParameters ?? t?.salesLineParameters ?? DEFAULT_L;

  const SELECT_PARAM = lang === "pl" ? "Wybierz parametr…" : "Select parameter…";
  const EMPTY_USES_DEFAULT =
    lang === "pl" ? "Zostaw puste, aby użyć domyślnej" : "Leave empty to use default";
  const SORT_TOOLTIP = t?.customers?.a11y?.sort || (lang === "pl" ? "Sortuj" : "Sort");

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [notice, setNotice] = useState(null);

  const [paramOptions, setParamOptions] = useState([]);
  const [paramLoading, setParamLoading] = useState(false);
  const [paramError, setParamError] = useState("");

  const showNotice = (type, text, ms = 2800) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

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

      const res = await fetch(
        `${API}/api/purchase-line-parameters?${params.toString()}`
      );
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", L.alerts.loadFail);
    } finally {
      setLoading(false);
    }
  };

  const fetchParamOptions = async () => {
    setParamLoading(true);
    setParamError("");
    try {
      const params = new URLSearchParams({
        type: "decimal",
        active: "true",
        page: "1",
        limit: "200",
        sort: "code:1",
      });

      const res = await fetch(`${API}/api/params?${params.toString()}`);
      const json = await res.json();

      const list = Array.isArray(json?.data) ? json.data : [];
      setParamOptions(
        list.filter((p) => p?.type === "decimal" && p?.active === true)
      );
    } catch (e) {
      setParamError(
        t?.parameters?.alerts?.loadFail || e?.message || "Failed to load parameters."
      );
      setParamOptions([]);
    } finally {
      setParamLoading(false);
    }
  };

  useEffect(() => {
    fetchParamOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, sortBy, sortDir]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/purchase-line-parameters/${id}`, {
        method: "DELETE",
      });
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
      if (k === "paramValue") return Number(v) || 0;
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
      ? `${API}/api/purchase-line-parameters/${id}`
      : `${API}/api/purchase-line-parameters`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        return showNotice("error", json.message || L.alerts.requestFail);

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

      {/* Header + Search */}
      <form
        onSubmit={onSearch}
        className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm"
      >
        <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
              fetchParamOptions(); // refresh available params
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
                <SortableTh id="documentNo" {...{ sortBy, sortDir, onSort }} title={SORT_TOOLTIP}>
                  {L.table.documentNo}
                </SortableTh>
                <SortableTh
                  id="documentLineNo"
                  {...{ sortBy, sortDir, onSort }}
                  title={SORT_TOOLTIP}
                >
                  {L.table.documentLineNo}
                </SortableTh>
                <SortableTh id="paramCode" {...{ sortBy, sortDir, onSort }} title={SORT_TOOLTIP}>
                  {L.table.paramCode}
                </SortableTh>
                <SortableTh id="paramValue" {...{ sortBy, sortDir, onSort }} title={SORT_TOOLTIP}>
                  {L.table.paramValue}
                </SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }} title={SORT_TOOLTIP}>
                  {L.table.created}
                </SortableTh>
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
                      <Td className="font-mono">{r.documentNo}</Td>
                      <Td className="font-mono">{r.documentLineNo}</Td>
                      <Td className="font-mono">{r.paramCode}</Td>
                      <Td>{r.paramValue ?? L.table.dash}</Td>
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
                        <td colSpan={10} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={L.details.id} icon={Hash}>
                              {key}
                            </KV>
                            <KV label={L.details.documentNo} icon={Hash}>
                              {r.documentNo}
                            </KV>
                            <KV
                              label={L.details.documentLineNo}
                              icon={ListOrdered}
                            >
                              {r.documentLineNo}
                            </KV>
                            <KV
                              label={L.details.paramCode}
                              icon={SlidersHorizontal}
                            >
                              {r.paramCode}
                            </KV>
                            <KV
                              label={L.details.paramValue}
                              icon={SlidersHorizontal}
                            >
                              {r.paramValue ?? L.table.dash}
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
          <PLPForm
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            L={L}
            paramOptions={paramOptions}
            paramLoading={paramLoading}
            paramError={paramError}
            selectPlaceholder={SELECT_PARAM}
            emptyHint={EMPTY_USES_DEFAULT}
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

function SortableTh({ id, sortBy, sortDir, onSort, children, className = "", title }) {
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

function Modal({ children, onClose, title = "Edit" }) {
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

/* ---------- Form ---------- */
function PLPForm({
  initial,
  onSubmit,
  onCancel,
  L,
  paramOptions = [],
  paramLoading = false,
  paramError = "",
  selectPlaceholder = "Select…",
  emptyHint = "",
}) {
  const isEdit = Boolean(initial?.id || initial?._id);

  const [documentNo, setDocumentNo] = useState(initial?.documentNo || "");
  const [documentLineNo, setDocumentLineNo] = useState(
    initial?.documentLineNo || ""
  );
  const [paramCode, setParamCode] = useState(initial?.paramCode || "");
  const [paramValue, setParamValue] = useState(
    initial?.paramValue !== undefined && initial?.paramValue !== null
      ? String(initial.paramValue)
      : ""
  );

  // Prefill defaultValue when selecting a parameter (if input is empty)
  useEffect(() => {
    if (!paramCode || paramValue.trim() !== "") return;
    const found = (paramOptions || []).find(
      (p) => (p?.code || "").toUpperCase() === paramCode.toUpperCase()
    );
    if (found && found.defaultValue != null && found.defaultValue !== "") {
      setParamValue(String(found.defaultValue));
    }
  }, [paramCode, paramValue, paramOptions]);

  const submit = (e) => {
    e.preventDefault();
    if (!documentNo.trim() || !documentLineNo.trim() || !paramCode.trim()) {
      alert(L.modal.required);
      return;
    }
    onSubmit({
      documentNo: documentNo.trim(),
      documentLineNo: documentLineNo.trim(),
      paramCode: paramCode.trim().toUpperCase(),
      // paramValue may be empty → backend will default from Parameter
      paramValue: paramValue === "" ? undefined : Number(paramValue),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={L.modal.fields.documentNo} icon={Hash}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={documentNo}
            onChange={(e) => setDocumentNo(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.documentLineNo} icon={ListOrdered}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={documentLineNo}
            onChange={(e) => setDocumentLineNo(e.target.value)}
          />
        </Field>

        <Field label={L.modal.fields.paramCode} icon={SlidersHorizontal}>
          <select
            value={paramCode}
            onChange={(e) => setParamCode(e.target.value)}
            required
          >
            <option value="" disabled>
              {paramLoading ? L.table.loading : selectPlaceholder}
            </option>
            {(paramOptions || []).map((p) => (
              <option
                key={p.id || p._id || p.code}
                value={(p.code || "").toUpperCase()}
              >
                {(p.code || "").toUpperCase()} — {p.description || "decimal"}
              </option>
            ))}
          </select>
        </Field>

        <Field label={L.modal.fields.paramValue} icon={SlidersHorizontal}>
          <input
            type="number"
            step="any"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={paramValue}
            onChange={(e) => setParamValue(e.target.value)}
            placeholder={emptyHint}
          />
        </Field>
      </div>

      {paramError ? (
        <div className="text-xs text-red-600">{paramError}</div>
      ) : null}

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
        >
          {isEdit ? L.modal.save : L.modal.add}
        </button>
      </div>
    </form>
  );
}

// Field wrapper
function Field({ label, icon: Icon, children }) {
  const isSelect =
    React.isValidElement(children) &&
    (children.type === "select" ||
      (typeof children.type === "string" &&
        children.type.toLowerCase() === "select"));

  const baseInput =
    "w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-sm outline-none focus:border-slate-400";
  const withIconLeft = Icon ? " pl-10" : "";
  const withChevronRight = isSelect ? " pr-9 appearance-none" : "";

  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          baseInput,
          children.props.className || "",
          withIconLeft,
          withChevronRight,
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

        {isSelect && (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          >
            <path d="M5.25 7.5L10 12.25L14.75 7.5" fill="currentColor" />
          </svg>
        )}
      </div>
    </label>
  );
}
