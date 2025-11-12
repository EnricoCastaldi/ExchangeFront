// --- Agreements.jsx (Part 1/2) ---
import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "../helpers/i18n";
import {
  Search, Plus, Trash2, Pencil, X, ChevronDown, ChevronRight,
  Hash, Tag, FileText, Link as LinkIcon, Calendar, ShieldCheck,
  CheckCircle2, AlertTriangle, SlidersHorizontal,  Maximize2,
  Minimize2,
} from "lucide-react";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function Agreements() {
  const { t, locale } = useI18n();
  const A = t.agreements || {};
  const COL_COUNT = 9;

  // -------- filters / paging
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [signed, setSigned] = useState(""); // '', 'true', 'false'
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const activeFilterCount = [type, signed, validFrom, validTo].filter(Boolean).length;

  // -------- sort
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  // -------- data & ui
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [notice, setNotice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  // -------- fetch
  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortDir,
      });
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      if (signed) params.set("signed", signed);
      if (validFrom) params.set("validFrom", validFrom);
      if (validTo) params.set("validTo", validTo);

      const res = await fetch(`${API}/api/agreements?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", A?.alerts?.loadFail || "Failed to load agreements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, limit, type, signed, validFrom, validTo, sortBy, sortDir]);

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

  const onDelete = async (id) => {
    if (!window.confirm(A?.alerts?.deleteConfirm || "Delete this agreement?")) return;
    try {
      const res = await fetch(`${API}/api/agreements/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        if (expandedId === id) setExpandedId(null);
        showNotice("success", A?.alerts?.deleted || "Agreement deleted.");
        fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
      }
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  // client sort for current page slice
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const keyMap = {
      no: "no",
      type: "type",
      description: "description",
      documentDate: "documentDate",
      validityDate: "validityDate",
      signed: "signed",
      createdAt: "createdAt",
    };
    const k = keyMap[sortBy] || sortBy;
    const val = (r) => {
      const v = r?.[k];
      if (k === "signed") return v ? 1 : 0;
      if (k === "documentDate" || k === "validityDate" || k === "createdAt")
        return v ? new Date(v).getTime() : 0;
      return (v ?? "").toString().toLowerCase();
    };
    arr.sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [data.data, sortBy, sortDir]);

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?._id);
    const url = isEdit ? `${API}/api/agreements/${editing._id}` : `${API}/api/agreements`;
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
        return;
      }
      showNotice("success", isEdit ? (A?.alerts?.updated || "Updated.") : (A?.alerts?.created || "Created."));
      setOpen(false);
      setEditing(null);
      setPage(1);
      fetchData();
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
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
      <form onSubmit={onSearch} className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={A?.controls?.searchPlaceholder || "Search no./description…"}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
            />
            <button
              type="submit"
              title={A?.controls?.searchBtn || "Search"}
              aria-label={A?.controls?.searchBtn || "Search"}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <Search size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="agreements-filters-panel"
          >
            <SlidersHorizontal size={16} className="opacity-70" />
            {A?.controls?.filters || "Filters"}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onAddClick}
            className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {A?.controls?.addBtn || "New agreement"}
          </button>
        </div>

        <div
          id="agreements-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-5 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{A?.controls?.allTypes || "All types"}</option>
            <option value="owz">{A?.types?.owz || "OWZ"}</option>
            <option value="umowa_ramowa">{A?.types?.umowa_ramowa || "Umowa ramowa"}</option>
            <option value="umowa_jednorazowa">{A?.types?.umowa_jednorazowa || "Umowa jednorazowa"}</option>
            <option value="umowa_cykliczna">{A?.types?.umowa_cykliczna || "Umowa cykliczna"}</option>
          </select>

          <select
            value={signed}
            onChange={(e) => { setSigned(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{A?.controls?.allSigned || "All sign states"}</option>
            <option value="true">{A?.signed?.yes || "Signed"}</option>
            <option value="false">{A?.signed?.no || "Not signed"}</option>
          </select>

          <input
            type="date"
            value={validFrom}
            onChange={(e) => { setValidFrom(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            placeholder="Valid from"
            aria-label="Valid from"
          />
          <input
            type="date"
            value={validTo}
            onChange={(e) => { setValidTo(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            placeholder="Valid to"
            aria-label="Valid to"
          />
          <div className="hidden md:block" />
        </div>

        {/* active chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {type && <Chip label={`${A?.table?.type || "Type"}: ${prettyType(type, A)}`} onClear={() => setType("")} />}
          {signed && (
            <Chip
              label={`${A?.table?.signed || "Signed"}: ${signed === "true" ? (A?.signed?.yes || "Signed") : (A?.signed?.no || "Not signed")}`}
              onClear={() => setSigned("")}
            />
          )}
          {validFrom && <Chip label={`${A?.filters?.validFrom || "Valid from"}: ${validFrom}`} onClear={() => setValidFrom("")} />}
          {validTo && <Chip label={`${A?.filters?.validTo || "Valid to"}: ${validTo}`} onClear={() => setValidTo("")} />}
        </div>
      </form>
      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th />
                <SortableTh id="no" {...{ sortBy, sortDir, onSort }}>{A?.table?.no || "No."}</SortableTh>
                <SortableTh id="type" {...{ sortBy, sortDir, onSort }}>{A?.table?.type || "Type"}</SortableTh>
                <SortableTh id="description" {...{ sortBy, sortDir, onSort }}>{A?.table?.description || "Description"}</SortableTh>
                <SortableTh id="documentDate" {...{ sortBy, sortDir, onSort }}>{A?.table?.documentDate || "Document date"}</SortableTh>
                <SortableTh id="validityDate" {...{ sortBy, sortDir, onSort }}>{A?.table?.validityDate || "Validity date"}</SortableTh>
                <SortableTh id="signed" {...{ sortBy, sortDir, onSort }}>{A?.table?.signed || "Signed"}</SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>{A?.table?.created || "Created"}</SortableTh>
                <Th className="text-right pr-4">{A?.table?.actions || ""}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                    {A?.table?.loading || "Loading…"}
                  </td>
                </tr>
              ) : (data.data?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                    {A?.table?.empty || "No agreements"}
                  </td>
                </tr>
              ) : (
                (rows || data.data).map((r) => (
                  <React.Fragment key={r._id}>
                    <tr className="border-t">
                      <Td className="w-8">
                        <button
                          className="p-1 rounded hover:bg-slate-100"
                          onClick={() => setExpandedId((id) => (id === r._id ? null : r._id))}
                          aria-label="Toggle details"
                          title="Toggle details"
                        >
                          {expandedId === r._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </Td>
                      <Td><NoBadge value={r.no} /></Td>
                      <Td>{typeChip(r.type, A)}</Td>
                      <Td className="text-slate-700">{r.description || "—"}</Td>
                      <Td>{formatDate(r.documentDate, locale, "—")}</Td>
                      <Td>{formatDate(r.validityDate, locale, "—")}</Td>
                      <Td>{signedChip(Boolean(r.signed), A)}</Td>
                      <Td>{formatDate(r.createdAt, locale, "—")}</Td>
                      <Td>
                        <div className="flex justify-end gap-2 pr-3">
                          <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => onEditClick(r)}>
                            <Pencil size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(r._id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>

                    {expandedId === r._id && (
                      <tr>
                        <td colSpan={COL_COUNT} className="bg-slate-50 border-t">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <KV label={A?.details?.no || "No."} icon={Hash}>{r.no || "—"}</KV>
                            <KV label={A?.details?.type || "Type"} icon={Tag}>{typeChip(r.type, A)}</KV>
                            <KV label={A?.details?.signed || "Signed"} icon={ShieldCheck}>{signedChip(Boolean(r.signed), A)}</KV>
                            <KV label={A?.details?.documentDate || "Document date"} icon={Calendar}>{formatDate(r.documentDate, locale, "—")}</KV>
                            <KV label={A?.details?.validityDate || "Validity date"} icon={Calendar}>{formatDate(r.validityDate, locale, "—")}</KV>
                            <KV label={A?.details?.documentUrl || "Document URL"} icon={LinkIcon}>
                              {r.documentUrl ? <a className="text-sky-700 underline" href={r.documentUrl} target="_blank" rel="noreferrer">{r.documentUrl}</a> : "—"}
                            </KV>
                            <KV label={A?.details?.signedDocumentUrl || "Signed document URL"} icon={LinkIcon}>
                              {r.signedDocumentUrl ? <a className="text-sky-700 underline" href={r.signedDocumentUrl} target="_blank" rel="noreferrer">{r.signedDocumentUrl}</a> : "—"}
                            </KV>
                            <div className="md:col-span-3">
                              <KV label={A?.details?.description || "Description"} icon={FileText}>
                                <div className="whitespace-pre-wrap">{r.description || "—"}</div>
                              </KV>
                            </div>
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

        {/* footer / pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">
            {(A?.footer?.meta && A.footer.meta(data.total, data.page, data.pages)) ||
              `Total: ${data.total} • Page ${data.page} of ${data.pages || 1}`}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {(A?.footer?.perPage && A.footer.perPage(n)) || `${n} / page`}
                </option>
              ))}
            </select>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>
              {A?.footer?.prev || "Prev"}
            </button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))} disabled={data.page >= (data.pages || 1)}>
              {A?.footer?.next || "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* modal */}
      {open && (
        <Modal onClose={() => { setOpen(false); setEditing(null); }} title={A?.modal?.title || "Agreement"}>
          <AgreementForm
            initial={editing}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={handleSubmit}
            A={A}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- small helpers & subcomponents (same file) ---------- */
function Th({ children, className = "" }) {
  return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
function SortableTh({ id, sortBy, sortDir, onSort, children, className = "" }) {
  const active = sortBy === id;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th aria-sort={ariaSort} className={`text-left px-4 py-3 font-medium ${className}`}>
      <button type="button" onClick={() => onSort(id)} className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50" title="Sort">
        <span>{children}</span>
        <span className={`text-xs ${active ? "opacity-100" : "opacity-60"}`}>{active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
function Chip({ label, onClear, clearTitle = "Clear" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-white" title={clearTitle} aria-label={clearTitle}>
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
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
    </div>
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
function formatDate(s, locale, dash = "—") {
  try { return s ? new Date(s).toLocaleDateString(locale) : dash; }
  catch { return s || dash; }
}
function NoBadge({ value }) {
  const v = value || "—";
  const isEmpty = v === "—";
  return (
    <span className={["inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono","border",
      isEmpty ? "text-slate-400 bg-slate-50 border-slate-200" : "font-semibold text-sky-700 bg-sky-50 border-sky-200"].join(" ")}>
      <Hash size={12} className={isEmpty ? "text-slate-300" : "text-sky-500"} />
      {v}
    </span>
  );
}
function typeChip(v, A) {
  const map = {
    owz: { label: A?.types?.owz || "OWZ", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    umowa_ramowa: { label: A?.types?.umowa_ramowa || "Framework", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    umowa_jednorazowa: { label: A?.types?.umowa_jednorazowa || "One-off", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    umowa_cykliczna: { label: A?.types?.umowa_cykliczna || "Recurring", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  };
  const k = String(v || "").toLowerCase();
  const info = map[k] || { label: v || "—", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return <span className={`px-2 py-1 rounded text-xs font-semibold border ${info.cls}`}>{info.label}</span>;
}
function prettyType(v, A) {
  return (v && { owz: A?.types?.owz || "OWZ",
    umowa_ramowa: A?.types?.umowa_ramowa || "Framework agreement",
    umowa_jednorazowa: A?.types?.umowa_jednorazowa || "One-off agreement",
    umowa_cykliczna: A?.types?.umowa_cykliczna || "Recurring agreement" }[v]) || v || "—";
}
function signedChip(v, A) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold border ${
      v ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
    }`}>
      {v ? (A?.signed?.yes || "Signed") : (A?.signed?.no || "Not signed")}
    </span>
  );
}
function Modal({ children, onClose, title, fullscreen = false, backdrop = "dim" }) {
  const [isFull, setIsFull] = React.useState(Boolean(fullscreen));

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key.toLowerCase() === "f") setIsFull((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  let backdropNode = null;
  if (backdrop === "dim") backdropNode = <div className="absolute inset-0 bg-black/50" onClick={onClose} />;
  else if (backdrop === "transparent") backdropNode = <div className="absolute inset-0" onClick={onClose} />;
  else if (backdrop === "blur") backdropNode = <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />;

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-3xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull ? "p-4 h-[calc(100vh-52px)] overflow-auto" : "p-4 max-h-[75vh] overflow-auto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title || "Modal"}>
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
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100" title="Close" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={bodyCls}>{children}</div>
      </div>
    </div>
  );
}


/* ---------- Embedded AgreementForm (respects your schema) ---------- */
function AgreementForm({ initial, onSubmit, onCancel, A }) {
  const isEdit = Boolean(initial?._id);

  const TABS = [
    { id: "basics", label: A?.tabs?.basics || "Basics" },
    { id: "dates", label: A?.tabs?.dates || "Dates" },
    { id: "links", label: A?.tabs?.links || "Documents" },
  ];
  const [tab, setTab] = useState(TABS[0].id);
  const onTabsKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
  };

  // fields per schema
  const [no, setNo] = useState(initial?.no || "");
  const [type, setType] = useState(initial?.type || "owz");
  const [description, setDescription] = useState(initial?.description || "");
  const [documentDate, setDocumentDate] = useState(initial?.documentDate ? initial.documentDate.slice(0,10) : "");
  const [validityDate, setValidityDate] = useState(initial?.validityDate ? initial.validityDate.slice(0,10) : "");
  const [documentUrl, setDocumentUrl] = useState(initial?.documentUrl || "");
  const [signedDocumentUrl, setSignedDocumentUrl] = useState(initial?.signedDocumentUrl || "");
  const [signed, setSigned] = useState(Boolean(initial?.signed));

  const [errors, setErrors] = useState({});

  // preview next AGR number (server still assigns real one)
  useEffect(() => {
    if (isEdit) return;
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/agreements?limit=1&sortBy=no&sortDir=desc`);
        const json = await res.json();
        const last = json?.data?.[0]?.no || null;
        const next = nextAgreementNoFrom(last);
        if (!stop) setNo(next);
      } catch {
        if (!stop) setNo(nextAgreementNoFrom(null));
      }
    })();
    return () => { stop = true; };
  }, [isEdit]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!type) errs.type = "Required";
    const urlRe = /^https?:\/\/\S+$/i;
    if (documentUrl && !urlRe.test(documentUrl)) errs.documentUrl = "Invalid URL";
    if (signedDocumentUrl && !urlRe.test(signedDocumentUrl)) errs.signedDocumentUrl = "Invalid URL";
    if (documentDate && isNaN(Date.parse(documentDate))) errs.documentDate = "Invalid";
    if (validityDate && isNaN(Date.parse(validityDate))) errs.validityDate = "Invalid";

    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.type || errs.documentUrl || errs.signedDocumentUrl) setTab("basics");
      else if (errs.documentDate || errs.validityDate) setTab("dates");
      return;
    }
    setErrors({});

    const payload = {
      ...(isEdit ? { no } : {}), // usually backend keeps no immutable
      type,
      description: description.trim() || null,
      documentDate: documentDate || null,
      validityDate: validityDate || null,
      documentUrl: documentUrl.trim() || null,
      signedDocumentUrl: signedDocumentUrl.trim() || null,
      signed: Boolean(signed),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div role="tablist" aria-label="Agreement tabs" onKeyDown={onTabsKeyDown}
        className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  role="tab" aria-selected={active} aria-controls={`panel-${t.id}`} id={`tab-${t.id}`}
                  className={[
                    "relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                    active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
                  ].join(" ")}
                >
                  {t.label}
                  {active && <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-slate-300 rounded-full" />}
                </button>
              );
            })}
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {isEdit ? (A?.modal?.save || "Save changes") : (A?.modal?.add || "Create agreement")}
          </div>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" aria-live="polite">
          {A?.alerts?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* BASICS */}
      <div role="tabpanel" id="panel-basics" aria-labelledby="tab-basics" hidden={tab !== "basics"} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={A?.form?.fields?.no || "No."} icon={Hash} help={A?.form?.autoNumberHelp || ""}>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50" value={no} readOnly aria-readonly="true" placeholder="Auto" />
          </Field>

          <Field label={A?.form?.fields?.type || "Type"} icon={Tag} error={errors.type}>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="owz">{A?.types?.owz || "OWZ"}</option>
              <option value="umowa_ramowa">{A?.types?.umowa_ramowa || "Umowa ramowa"}</option>
              <option value="umowa_jednorazowa">{A?.types?.umowa_jednorazowa || "Umowa jednorazowa"}</option>
              <option value="umowa_cykliczna">{A?.types?.umowa_cykliczna || "Umowa cykliczna"}</option>
            </select>
          </Field>

          <Field label={A?.form?.fields?.signed || "Signed"} icon={ShieldCheck}>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={signed ? "true" : "false"} onChange={(e) => setSigned(e.target.value === "true")}>
              <option value="false">{A?.signed?.no || "Not signed"}</option>
              <option value="true">{A?.signed?.yes || "Signed"}</option>
            </select>
          </Field>

          <div className="md:col-span-3">
            <Field label={A?.form?.fields?.description || "Description"} icon={FileText}>
              <textarea rows={5} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* DATES */}
      <div role="tabpanel" id="panel-dates" aria-labelledby="tab-dates" hidden={tab !== "dates"} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={A?.form?.fields?.documentDate || "Document date"} icon={Calendar} error={errors.documentDate}>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </Field>
          <Field label={A?.form?.fields?.validityDate || "Validity date"} icon={Calendar} error={errors.validityDate}>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* LINKS */}
      <div role="tabpanel" id="panel-links" aria-labelledby="tab-links" hidden={tab !== "links"} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={A?.form?.fields?.documentUrl || "Document URL"} icon={LinkIcon} error={errors.documentUrl}>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label={A?.form?.fields?.signedDocumentUrl || "Signed document URL"} icon={LinkIcon} error={errors.signedDocumentUrl}>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={signedDocumentUrl} onChange={(e) => setSignedDocumentUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </div>

      {/* actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          {A?.modal?.cancel || "Cancel"}
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          {isEdit ? (A?.modal?.save || "Save changes") : (A?.modal?.add || "Create agreement")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, icon: Icon, error, help, children }) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          Icon ? " pl-9" : "",
          " h-10",
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
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        {child}
      </div>
      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

// local preview only; backend assigns real number in pre-validate hook
function nextAgreementNoFrom(lastNo) {
  const m = String(lastNo || "").match(/^AGR(\d{1,})$/i);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `AGR${String(n).padStart(7, "0")}`;
}
