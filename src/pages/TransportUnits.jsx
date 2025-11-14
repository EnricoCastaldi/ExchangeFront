// src/pages/TransportUnits.jsx
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
  Truck,
  ListFilter,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

const TYPES = ["wanna", "naczepa", "naczepa cert", "wanna cert"];

// TAB + 7 digits  → TAB0000001, TAB0000002, ...
function nextTransportNoFrom(lastNo) {
  const m = String(lastNo || "").match(/^TAB(\d{1,})$/i);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `TAB${String(n).padStart(7, "0")}`;
}


export default function TransportUnits() {
  const { t, locale } = useI18n();
  const P = t?.transportUnits || {};

  const L = {
    title: P.title || "Transport units (Środki transportu)",
    controls: {
      searchPlaceholder:
        P?.controls?.searchPlaceholder ||
        "Search: No., registration no, type",
      searchBtn: P?.controls?.searchBtn || "Search",
      addBtn: P?.controls?.addBtn || "Add transport unit",
      allTypes: P?.controls?.allTypes || "All types",
      typeLabel: P?.controls?.typeLabel || "Type",
    },
    table: {
      no: P?.table?.no || "No.",
      registrationNo: P?.table?.registrationNo || "Registration No.",
      type: P?.table?.type || "Type",
      created: P?.table?.created || "Created",
      actions: P?.table?.actions || "",
      loading: P?.table?.loading || "Loading…",
      empty: P?.table?.empty || "No transport units",
      dash: P?.table?.dash || "—",
    },
    details: {
      id: P?.details?.id || "ID",
      no: P?.details?.no || "No.",
      registrationNo: P?.details?.registrationNo || "Registration No.",
      type: P?.details?.type || "Type",
      created: P?.details?.created || "Created",
      updated: P?.details?.updated || "Updated",
    },
modal: {
  titleNew: P?.modal?.titleNew || "Add transport unit",
  titleEdit: P?.modal?.titleEdit || "Edit transport unit",
  add: P?.modal?.add || "Add",
  save: P?.modal?.save || "Save",
  cancel: P?.modal?.cancel || "Cancel",
  fields: {
    no: P?.modal?.fields?.no || "No. (auto)",
    registrationNo:
      P?.modal?.fields?.registrationNo ||
      "Registration No. (6–8 chars, no spaces) *",
    type: P?.modal?.fields?.type || "Type *",
  },
  required: P?.modal?.required || "Please fill required fields.",
  invalidReg:
    P?.modal?.invalidReg ||
    "Registration number must be 6–8 characters with no spaces.",
  noHelp:
    P?.modal?.noHelp ||
    "Number is assigned automatically when saving.",
},

    alerts: {
      loadFail: P?.alerts?.loadFail || "Failed to load transport units.",
      requestFail: P?.alerts?.requestFail || "Request failed.",
      deleteConfirm:
        P?.alerts?.deleteConfirm || "Delete this transport unit?",
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
    a11y: {
      toggleDetails: P?.a11y?.toggleDetails || "Toggle details",
    },
  };

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
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

  // ---------- Data ----------
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q) params.set("q", q);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`${API}/api/transport-units?${params.toString()}`);

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
  }, [page, limit, typeFilter]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(L.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/transport-units/${id}`, {
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

  // client-side sorting
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const k = sortBy;
    const get = (r) => {
      const v = r?.[k];
      if (k === "createdAt") return v ? new Date(v).getTime() : 0;
      if (k === "no") return r.no ?? 0;
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
    const isEdit = Boolean(editing?._id || editing?.id);
    const id = editing?._id || editing?.id;
    const url = isEdit
      ? `${API}/api/transport-units/${id}`
  : `${API}/api/transport-units`;
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

      {/* Controls: search + type filter + add */}
      <form
        onSubmit={onSearch}
        className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex items-center gap-1">
            <ListFilter size={16} className="text-slate-500" />
            <select
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{L.controls.allTypes}</option>
              {TYPES.map((tVal) => (
                <option key={tVal} value={tVal}>
                  {tVal}
                </option>
              ))}
            </select>
          </div>

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
                <SortableTh
                  id="no"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                >
                  {L.table.no}
                </SortableTh>
                <SortableTh
                  id="registrationNo"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                >
                  {L.table.registrationNo}
                </SortableTh>
                <SortableTh
                  id="type"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                >
                  {L.table.type}
                </SortableTh>
                <SortableTh
                  id="createdAt"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                >
                  {L.table.created}
                </SortableTh>
                <Th className="text-right">{L.table.actions}</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500"
                  >
                    {L.table.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500"
                  >
                    {L.table.empty}
                  </td>
                </tr>
              ) : (
                rows.flatMap((r) => {
                  const key = r._id || r.id;
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
  <Td>
    <NoBadge value={r.no} emptyLabel={L.table.dash} />
  </Td>

                      <Td className="font-mono">
                        {r.registrationNo || L.table.dash}
                      </Td>
                      <Td className="capitalize">{r.type || L.table.dash}</Td>
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
                            <KV label={L.details.no} icon={Hash}>
                              {r.no ?? L.table.dash}
                            </KV>
                            <KV
                              label={L.details.registrationNo}
                              icon={Truck}
                            >
                              {r.registrationNo || L.table.dash}
                            </KV>
                            <KV label={L.details.type} icon={Truck}>
                              {r.type || L.table.dash}
                            </KV>
                            <KV label={L.details.created}>
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString(locale)
                                : L.table.dash}
                            </KV>
                            <KV label={L.details.updated}>
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
          <TransportUnitForm
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

function NoBadge({ value, emptyLabel = "—" }) {
  const v = value || emptyLabel;
  const isEmpty = v === emptyLabel;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
        "font-mono text-xs border",
        isEmpty
          ? "text-slate-400 bg-slate-50 border-slate-200"
          : "font-semibold text-sky-700 bg-sky-50 border-sky-200",
      ].join(" ")}
    >
      <Hash
        size={12}
        className={isEmpty ? "text-slate-300" : "text-sky-500"}
      />
      {v}
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
        <span
          className={`text-xs opacity-60 ${active ? "opacity-100" : ""}`}
        >
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
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-700"
      >
        ✕
      </button>
    </div>
  );
}
function Modal({
  children,
  onClose,
  title = "Transport unit",
  fullscreen = false,
  backdrop = "dim",
}) {
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

  // backdrop: "dim" | "transparent" | "blur" | "none"
  let backdropNode = null;
  if (backdrop === "dim") {
    backdropNode = (
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    );
  } else if (backdrop === "transparent") {
    backdropNode = <div className="absolute inset-0" onClick={onClose} />;
  } else if (backdrop === "blur") {
    backdropNode = (
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
    );
  }

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull
      ? "w-screen h-screen max-w-none rounded-none"
      : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull
    ? "p-4 h-[calc(100vh-52px)] sm:h-[calc(100vh-52px)] overflow-auto"
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



/* ---------- Form ---------- */
function TransportUnitForm({ initial, onSubmit, onCancel, L }) {
  const isEdit = Boolean(initial?._id || initial?.id);

  // NEW: internal "no" state so we can show TAB000001 etc.
  const [no, setNo] = useState(initial?.no || "");

  const [registrationNo, setRegistrationNo] = useState(
    initial?.registrationNo || ""
  );
  const [type, setType] = useState(initial?.type || "");

  // NEW: auto-generate No. for NEW records
  useEffect(() => {
    if (isEdit) return; // on edit we just show existing number

    let stop = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/transport-units?limit=1`);
        const json = await res.json().catch(() => ({}));
        const last = json?.data?.[0]?.no || null;
        const next = nextTransportNoFrom(last);
        if (!stop) setNo(next);
      } catch {
        if (!stop) setNo(nextTransportNoFrom(null)); // TAB000001
      }
    })();

    return () => {
      stop = true;
    };
  }, [isEdit]);

  const submit = (e) => {
    e.preventDefault();
    const reg = registrationNo.trim().toUpperCase().replace(/\s+/g, "");
    if (!reg || !type) {
      alert(L.modal.required);
      return;
    }
    if (!/^\S{6,8}$/.test(reg)) {
      alert(L.modal.invalidReg);
      return;
    }

    const payload = {
      // NEW: send number too (TAB000001 etc.)
      no: (no || "").trim() || null,
      registrationNo: reg,
      type: type.toLowerCase(),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {/* Auto number (read-only) */}
        <Field
          label={L.modal.fields.no}
          icon={Hash}
          help={L.modal.noHelp}
        >
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 text-slate-700 font-mono"
            value={no}
            readOnly
            placeholder="Auto"
          />
        </Field>

        <Field label={L.modal.fields.registrationNo} icon={Truck}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
            value={registrationNo}
            onChange={(e) =>
              setRegistrationNo(
                e.target.value.toUpperCase().replace(/\s+/g, "")
              )
            }
          />
        </Field>

        <Field label={L.modal.fields.type} icon={ListFilter}>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{L.controls.typeLabel}</option>
            {TYPES.map((tVal) => (
              <option key={tVal} value={tVal}>
                {tVal}
              </option>
            ))}
          </select>
        </Field>
      </div>

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


function Field({ label, icon: Icon, children, help }) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          Icon ? " pl-9" : "",
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
      {help && (
        <p className="mt-1 text-xs text-slate-500">
          {help}
        </p>
      )}
    </label>
  );
}
