// Agreements.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../helpers/i18n";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Hash,
  Tag,
  FileText,
  Link as LinkIcon,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Building2,
  IdCard,
  Phone,
  Mail,
  MapPin,
  BadgeDollarSign,
  Layers,
  UserCircle2,
  Lock,
  Package,
  Truck,
  Percent,
} from "lucide-react";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

const getByPath = (obj, path) =>
  path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);

const tr = (A, path, fallback) => {
  const v = path ? getByPath(A || {}, path) : undefined;
  return v == null || v === "" ? fallback : v;
};

/* ============================
  Main page
============================ */
export default function Agreements() {
  const { t, locale } = useI18n();
  const A = t.agreements || {};
  const UI = A.ui || {};
  const DETAILS = A.details || {};
  const MODAL = A.modal || {};
  const LINES = A.lines || {};

  const COL_COUNT = 11;

  // filters / paging
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [signed, setSigned] = useState(""); // '', 'true', 'false'
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const activeFilterCount = [type, signed, validFrom, validTo].filter(Boolean).length;

  // sort
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  // data & UI
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [notice, setNotice] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // agreement lines UI
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineEditing, setLineEditing] = useState(null);
  const [lineAgreement, setLineAgreement] = useState(null);

  // cache lines per agreementId
  const linesCacheRef = useRef({}); // { [agreementId]: { loading, data, total } }

  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

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
    setOpenForm(true);
  };

  const onEditClick = (row) => {
    setEditing(row);
    setOpenForm(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm(A?.alerts?.deleteConfirm || "Delete this agreement?")) return;
    try {
      const res = await fetch(`${API}/api/agreements/${id}`, { method: "DELETE" });

      if (res.status === 204) {
        if (expandedId === id) setExpandedId(null);
        showNotice("success", A?.alerts?.deleted || "Agreement deleted.");
        fetchData();
        return;
      }

      const json = await res.json().catch(() => ({}));
      showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  // client sort on current page
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;

    const keyMap = {
      no: "no",
      customerNo: "customer.no",
      customerName: "customer.name",
      type: "type",
      description: "description",
      documentDate: "documentDate",
      validityDate: "validityDate",
      signed: "signed",
      createdAt: "createdAt",
    };
    const k = keyMap[sortBy] || sortBy;

    const val = (r) => {
      const v = k.includes(".") ? getByPath(r, k) : r?.[k];
      if (k === "signed") return v ? 1 : 0;
      if (k === "documentDate" || k === "validityDate" || k === "createdAt")
        return v ? new Date(v).getTime() : 0;
      return (v ?? "").toString().toLowerCase();
    };

    arr.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return arr;
  }, [data?.data, sortBy, sortDir]);

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

      showNotice(
        "success",
        isEdit ? (A?.alerts?.updated || "Agreement updated.") : (A?.alerts?.created || "Agreement created.")
      );

      setOpenForm(false);
      setEditing(null);
      fetchData();
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  // =========================
  // Lines: fetch per agreement
  // =========================
  const setLinesCache = (agreementId, patch) => {
    linesCacheRef.current = {
      ...linesCacheRef.current,
      [agreementId]: { ...(linesCacheRef.current[agreementId] || {}), ...patch },
    };
  };

  const getLinesCache = (agreementId) =>
    linesCacheRef.current[agreementId] || { loading: false, data: [], total: 0 };

  const fetchLines = async (agreementId) => {
    setLinesCache(agreementId, { loading: true });
    try {
      const params = new URLSearchParams({
        agreementId,
        page: "1",
        limit: "200",
        sortBy: "lineNo",
        sortDir: "asc",
      });
      const res = await fetch(`${API}/api/agreement-lines?${params.toString()}`);
      const json = await res.json();
      setLinesCache(agreementId, {
        loading: false,
        data: json.data || [],
        total: json.total || 0,
      });
    } catch {
      setLinesCache(agreementId, { loading: false, data: [], total: 0 });
      showNotice("error", LINES?.alerts?.loadFail || "Failed to load lines.");
    }
  };

  const openAddLine = async (agreement) => {
    setLineAgreement(agreement);
    setLineEditing(null);
    setLineModalOpen(true);
    await fetchLines(agreement._id);
  };

  const openEditLine = async (agreement, line) => {
    setLineAgreement(agreement);
    setLineEditing(line);
    setLineModalOpen(true);
    await fetchLines(agreement._id);
  };

  const saveLine = async (agreement, payload, existingLine) => {
    const isEdit = Boolean(existingLine?.id || existingLine?._id);
    const url = isEdit
      ? `${API}/api/agreement-lines/${existingLine.id || existingLine._id}`
      : `${API}/api/agreement-lines`;
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit ? payload : { ...payload, agreementId: agreement._id };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
        return false;
      }

      showNotice(
        "success",
        isEdit ? (LINES?.alerts?.updated || "Line updated.") : (LINES?.alerts?.created || "Line added.")
      );

      await fetchLines(agreement._id);
      return true;
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
      return false;
    }
  };

  const deleteLine = async (agreementId, lineId) => {
    if (!window.confirm(LINES?.alerts?.deleteConfirm || "Delete this line?")) return;
    try {
      const res = await fetch(`${API}/api/agreement-lines/${lineId}`, { method: "DELETE" });
      if (res.status === 204) {
        showNotice("success", LINES?.alerts?.deleted || "Line deleted.");
        await fetchLines(agreementId);
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
      }
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Notice */}
      {notice && (
        <div className="mb-3">
          <Toast type={notice.type} onClose={() => setNotice(null)} A={A}>
            {notice.text}
          </Toast>
        </div>
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
              placeholder={A?.searchPh || "Search..."}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
              title={UI?.search || "Search"}
              aria-label={UI?.search || "Search"}
            >
              <Search size={14} />
            </button>
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={onAddClick}
            className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-[#00C86F] px-3 text-sm font-medium text-[#0E0F0E] shadow-sm hover:bg-[#007A3A] focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {A?.addBtn || "New agreement"}
          </button>

          {/* Mobile Filters toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="agreements-filters-panel"
          >
            <SlidersHorizontal size={16} className="opacity-70" />
            {A?.filters || "Filters"}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-[#0E0F0E]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters Row */}
        <div
          id="agreements-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-4 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{A?.allTypes || "All types"}</option>
            <option value="owz">{tr(A, "types.owz", "OWZ")}</option>
            <option value="umowa_ramowa">{tr(A, "types.umowa_ramowa", "Framework agreement")}</option>
            <option value="umowa_jednorazowa">{tr(A, "types.umowa_jednorazowa", "One-off agreement")}</option>
            <option value="umowa_cykliczna">{tr(A, "types.umowa_cykliczna", "Recurring agreement")}</option>
            <option value="fixed_term">{tr(A, "types.fixed_term", "Fixed term")}</option>
          </select>

          <select
            value={signed}
            onChange={(e) => {
              setSigned(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{A?.allSigned || "All sign states"}</option>
            <option value="true">{A?.signedYes || "Signed"}</option>
            <option value="false">{A?.signedNo || "Not signed"}</option>
          </select>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={validFrom}
              onChange={(e) => {
                setValidFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
              title={A?.validFrom || "Valid from"}
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={validTo}
              onChange={(e) => {
                setValidTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
              title={A?.validTo || "Valid to"}
            />
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <SortableTh A={A} id="no" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.no || "No."}
                </SortableTh>
                <SortableTh A={A} id="customerNo" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.customerNo || "Customer No."}
                </SortableTh>
                <SortableTh A={A} id="customerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.customerName || "Customer Name"}
                </SortableTh>
                <SortableTh A={A} id="type" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.type || "Type"}
                </SortableTh>
                <SortableTh A={A} id="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.description || "Description"}
                </SortableTh>
                <SortableTh A={A} id="documentDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.documentDate || "Document date"}
                </SortableTh>
                <SortableTh A={A} id="validityDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.validityDate || "Validity date"}
                </SortableTh>
                <SortableTh A={A} id="signed" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.signed || "Signed"}
                </SortableTh>
                <SortableTh A={A} id="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.createdAt || "Created"}
                </SortableTh>
                <th className="px-4 py-3 text-right">{A?.cols?.actions || ""}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-8 text-center text-slate-500">
                    {A?.loading || "Loading..."}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-10 text-center text-slate-500">
                    {A?.empty || "No agreements."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const open = expandedId === r._id;
                  return (
                    <React.Fragment key={r._id}>
                      <tr className="hover:bg-slate-50/40">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                            onClick={async () => {
                              setExpandedId(open ? null : r._id);
                              if (!open && r.type === "fixed_term") await fetchLines(r._id);
                            }}
                            aria-label={UI?.expand || "Expand"}
                            title={UI?.expand || "Expand"}
                          >
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>

                        <Td>
                          <NoBadge value={r.no} />
                        </Td>

                        <Td className="text-slate-700">{r?.customer?.no || "—"}</Td>
                        <Td className="text-slate-700">{r?.customer?.name || "—"}</Td>

                        <Td>{typeChip(r.type, A)}</Td>
                        <Td className="max-w-[260px] truncate" title={r.description || ""}>
                          {r.description || "—"}
                        </Td>
                        <Td>{formatDate(r.documentDate, locale)}</Td>
                        <Td>{formatDate(r.validityDate, locale)}</Td>
                        <Td>{signedChip(r.signed, A)}</Td>
                        <Td>{formatDate(r.createdAt, locale)}</Td>

                        <Td className="text-right">
                          <div className="flex justify-end gap-2 pr-3">
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100"
                              onClick={() => onEditClick(r)}
                              title={A?.edit || "Edit"}
                              aria-label={A?.edit || "Edit"}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                              onClick={() => onDelete(r._id)}
                              title={A?.delete || "Delete"}
                              aria-label={A?.delete || "Delete"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </Td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={COL_COUNT} className="bg-slate-50/40 px-4 py-4">
                            <ExpandedAgreement
                              row={r}
                              locale={locale}
                              A={A}
                              onAddLine={() => openAddLine(r)}
                              onEditLine={(line) => openEditLine(r, line)}
                              onDeleteLine={(lineId) => deleteLine(r._id, lineId)}
                              linesState={getLinesCache(r._id)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">
            {A?.footer?.meta
              ? A.footer.meta(data?.total ?? 0, data?.page ?? page, data?.pages ?? 1)
              : `Total: ${(data?.total ?? 0).toLocaleString(locale)} • Page ${data?.page ?? page} of ${
                  data?.pages || 1
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
                  {A?.footer?.perPage ? A.footer.perPage(n) : `${n} / page`}
                </option>
              ))}
            </select>

            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={(data?.page ?? page) <= 1}
              type="button"
            >
              {A?.prev || "Prev"}
            </button>

            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data?.pages || 1, p + 1))}
              disabled={(data?.page ?? page) >= (data?.pages || 1)}
              type="button"
            >
              {A?.next || "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Agreement Form Modal */}
      {openForm && (
        <Modal
          title={editing ? (MODAL?.editTitle || "Edit agreement") : (MODAL?.addTitle || "Add agreement")}
          onClose={() => setOpenForm(false)}
          A={A}
        >
          <AgreementForm
            initial={editing}
            onCancel={() => setOpenForm(false)}
            onSubmit={handleSubmit}
            A={A}
          />
        </Modal>
      )}

      {/* Line Modal */}
      {lineModalOpen && lineAgreement && (
        <Modal
          title={
            lineEditing
              ? (LINES?.modal?.editTitle || "Edit line")
              : (LINES?.modal?.addTitle || "Add line")
          }
          onClose={() => {
            setLineModalOpen(false);
            setLineEditing(null);
            setLineAgreement(null);
          }}
          fullscreen
          A={A}
        >
          <AgreementLineForm
            agreement={lineAgreement}
            initial={lineEditing}
            onCancel={() => {
              setLineModalOpen(false);
              setLineEditing(null);
              setLineAgreement(null);
            }}
            onSubmit={async (payload) => {
              const ok = await saveLine(lineAgreement, payload, lineEditing);
              if (ok) {
                setLineModalOpen(false);
                setLineEditing(null);
              }
            }}
            A={A}
            locale={locale}
          />
        </Modal>
      )}
    </div>
  );
}

/* ============================
  Expanded details
============================ */
function ExpandedAgreement({ row, locale, A, onAddLine, onEditLine, onDeleteLine, linesState }) {
  const c = row?.customer || null;

  const DETAILS = A.details || {};
  const LINES = A.lines || {};
  const UI = A.ui || {};

  const canFixedTerm = Boolean(c?.owzSigned) && Boolean(c?.umowaRamowaSigned);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Section title={DETAILS?.agreement || "Agreement"}>
        <KV label={DETAILS?.labels?.no || "No."} icon={Hash}>
          <NoBadge value={row.no} />
        </KV>
        <KV label={DETAILS?.labels?.type || "Type"} icon={Tag}>
          {typeChip(row.type, A)}
        </KV>
        <KV label={DETAILS?.labels?.description || "Description"} icon={FileText}>
          {row.description || "—"}
        </KV>
        <KV label={DETAILS?.labels?.documentDate || "Document date"} icon={Calendar}>
          {formatDate(row.documentDate, locale)}
        </KV>
        <KV label={DETAILS?.labels?.validityDate || "Validity date"} icon={Calendar}>
          {formatDate(row.validityDate, locale)}
        </KV>
        <KV label={DETAILS?.labels?.signed || "Signed"} icon={ShieldCheck}>
          {signedChip(row.signed, A)}
        </KV>
      </Section>

      <Section title={DETAILS?.documents || "Documents"}>
        <KV label={DETAILS?.labels?.documentUrl || "Document URL"} icon={LinkIcon}>
          {row.documentUrl ? (
            <a className="text-sky-700 hover:underline" href={row.documentUrl} target="_blank" rel="noreferrer">
              {DETAILS?.openLink || UI?.open || "Open"}
            </a>
          ) : (
            "—"
          )}
        </KV>
        <KV label={DETAILS?.labels?.signedDocumentUrl || "Signed document URL"} icon={LinkIcon}>
          {row.signedDocumentUrl ? (
            <a className="text-sky-700 hover:underline" href={row.signedDocumentUrl} target="_blank" rel="noreferrer">
              {DETAILS?.openLink || UI?.open || "Open"}
            </a>
          ) : (
            "—"
          )}
        </KV>
      </Section>

      <Section title={DETAILS?.customer || "Customer (snapshot)"}>
        <KV label={DETAILS?.labels?.customerNo || "Customer No."} icon={Building2}>
          {c?.no || "—"}
        </KV>
        <KV label={DETAILS?.labels?.name || "Name"} icon={UserCircle2}>
          {c?.name || "—"}
        </KV>
        <KV label={DETAILS?.labels?.nip || "NIP"} icon={IdCard}>
          {c?.nip || "—"}
        </KV>
        <KV label={DETAILS?.labels?.phone || "Phone"} icon={Phone}>
          {c?.phoneNo || "—"}
        </KV>
        <KV label={DETAILS?.labels?.email || "Email"} icon={Mail}>
          {c?.email || "—"}
        </KV>
        <KV label={DETAILS?.labels?.region || "Region"} icon={MapPin}>
          {[c?.postCode, c?.city, c?.region, c?.countryRegionCode].filter(Boolean).join(" • ") || "—"}
        </KV>

        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Lock size={14} className="text-slate-400" />
            {DETAILS?.flagsTitle || "Agreement flags"}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>{DETAILS?.flags?.owzSigned || "OWZ Signed"}</span>
              <BoolIcon value={!!c?.owzSigned} variant="danger" A={A} />
            </div>
            <div className="flex items-center justify-between">
              <span>{DETAILS?.flags?.umowaRamowaSigned || "Framework agreement signed"}</span>
              <BoolIcon value={!!c?.umowaRamowaSigned} variant="danger" A={A} />
            </div>
            <div className="pt-2 text-xs text-slate-500">
              {DETAILS?.flags?.fixedTermAvailable || "Fixed term available"}:{" "}
              <span className="font-semibold">
                {canFixedTerm ? (DETAILS?.yes || UI?.yes || "YES") : (DETAILS?.no || UI?.no || "NO")}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Lines only for fixed_term */}
      {row.type === "fixed_term" && (
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Layers size={18} />
                {LINES?.title || "Lines"}
              </div>
              <button
                type="button"
                onClick={onAddLine}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#00C86F] px-3 text-sm font-medium text-[#0E0F0E] shadow-sm hover:bg-[#007A3A]"
              >
                <Plus size={16} />
                {LINES?.addBtn || "Add line"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-slate-600">
                  <tr className="border-b">
                    <Th>{LINES?.cols?.lineNo || "Line No."}</Th>
                    <Th>{LINES?.cols?.status || "Status"}</Th>
                    <Th>{LINES?.cols?.type || "Type"}</Th>
                    <Th>{LINES?.cols?.item || "Item"}</Th>
                    <Th>{LINES?.cols?.uom || "UOM"}</Th>
                    <Th className="text-right">{LINES?.cols?.unitPrice || "Unit price"}</Th>
                    <Th className="text-right">{LINES?.cols?.qty || "Qty"}</Th>
                    <Th className="text-right">{LINES?.cols?.transport || "Transport"}</Th>
                    <Th className="text-right">{LINES?.cols?.lineValue || "Line value"}</Th>
                    <Th>{LINES?.cols?.updatedAt || "Updated"}</Th>
                    <Th className="text-right">{LINES?.cols?.actions || "Actions"}</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {linesState.loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-slate-500">
                        {LINES?.loading || "Loading lines..."}
                      </td>
                    </tr>
                  ) : (linesState.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                        {LINES?.empty || "No lines."}
                      </td>
                    </tr>
                  ) : (
                    linesState.data.map((ln) => (
                      <tr key={ln.id || ln._id} className="hover:bg-slate-50/40">
                        <Td className="font-mono">{ln.lineNo}</Td>
                        <Td>{lineStatusChip(ln.status, A)}</Td>
                        <Td>{ln.type || "—"}</Td>
                        <Td title={ln.itemDescription || ""}>
                          <div className="font-medium">{ln.itemNo || "—"}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[320px]">
                            {ln.itemDescription || "—"}
                          </div>
                        </Td>
                        <Td>{ln.uom || "—"}</Td>
                        <Td className="text-right">{fmtMoney(ln.unitPrice, locale)}</Td>
                        <Td className="text-right">{fmtNum(ln.qty, locale)}</Td>
                        <Td className="text-right">{fmtMoney(ln.transport, locale)}</Td>
                        <Td className="text-right font-semibold">{fmtMoney(ln.lineValue, locale)}</Td>
                        <Td>{formatDate(ln.updatedAt, locale)}</Td>

                        <Td className="text-right">
                          <div className="flex justify-end gap-2 pr-3">
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100"
                              onClick={() => onEditLine(ln)}
                              title={A?.edit || "Edit"}
                              aria-label={A?.edit || "Edit"}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                              onClick={() => onDeleteLine(ln.id || ln._id)}
                              title={A?.delete || "Delete"}
                              aria-label={A?.delete || "Delete"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================
  Agreement form (tabs + style)
============================ */
function AgreementForm({ initial, onSubmit, onCancel, A }) {
  const isEdit = Boolean(initial?._id);

  const FORM = A.form || {};
  const TABS_TXT = A.tabs || {};

  const TABS = [
    { id: "customer", label: TABS_TXT?.customer || "Customer", Icon: Building2 },
    { id: "basics", label: TABS_TXT?.basics || "Basics", Icon: FileText },
    { id: "dates", label: TABS_TXT?.dates || "Dates", Icon: Calendar },
    { id: "links", label: TABS_TXT?.links || "Documents", Icon: LinkIcon },
  ];

  const [tab, setTab] = useState(TABS[0].id);

  // fields
  const [no, setNo] = useState(initial?.no || "");
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [type, setType] = useState(initial?.type || "owz");
  const [description, setDescription] = useState(initial?.description || "");
  const [documentDate, setDocumentDate] = useState(
    initial?.documentDate ? String(initial.documentDate).slice(0, 10) : ""
  );
  const [validityDate, setValidityDate] = useState(
    initial?.validityDate ? String(initial.validityDate).slice(0, 10) : ""
  );
  const [documentUrl, setDocumentUrl] = useState(initial?.documentUrl || "");
  const [signedDocumentUrl, setSignedDocumentUrl] = useState(initial?.signedDocumentUrl || "");
  const [signed, setSigned] = useState(Boolean(initial?.signed));
  const [errors, setErrors] = useState({});

  const snapshot = isEdit ? initial?.customer : selectedCustomer;
  const canFixedTerm = Boolean(snapshot?.owzSigned) && Boolean(snapshot?.umowaRamowaSigned);

  useEffect(() => {
    if (type === "fixed_term" && !canFixedTerm) setType("umowa_ramowa");
    // eslint-disable-next-line
  }, [canFixedTerm]);

  const pickCustomer = (c) => {
    setCustomerId(c._id);
    setSelectedCustomer(c);
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEdit && !customerId) errs.customerId = FORM?.errors?.required || "Required";
    if (!type) errs.type = FORM?.errors?.required || "Required";

    const urlRe = /^https?:\/\/\S+/i;
    if (documentUrl && !urlRe.test(documentUrl)) errs.documentUrl = FORM?.errors?.invalidUrl || "Invalid URL";
    if (signedDocumentUrl && !urlRe.test(signedDocumentUrl))
      errs.signedDocumentUrl = FORM?.errors?.invalidUrl || "Invalid URL";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      no: no || undefined,
      customerId: isEdit ? undefined : customerId,
      type,
      description,
      documentDate: documentDate || null,
      validityDate: validityDate || null,
      documentUrl,
      signedDocumentUrl,
      signed,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
                active ? "bg-slate-900 text-[#0E0F0E] border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Customer tab */}
      {tab === "customer" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!isEdit ? (
            <>
              <Field label={FORM?.labels?.selectCustomer || "Select customer"} icon={Building2} error={errors.customerId}>
                <CustomerPicker
                  valueId={customerId}
                  onPick={pickCustomer}
                  placeholder={FORM?.placeholders?.customerSearch || "Search customer..."}
                />
              </Field>

              {selectedCustomer ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Section title={FORM?.labels?.customerSnapshotPreview || "Customer snapshot preview"} className="md:col-span-2">
                    <KV label={FORM?.labels?.customerNo || "No."} icon={Hash}>
                      <NoBadge value={selectedCustomer.no} />
                    </KV>
                    <KV label={FORM?.labels?.customerName || "Name"} icon={UserCircle2}>
                      {selectedCustomer.name || "—"}
                    </KV>
                    <KV label={FORM?.labels?.customerNip || "NIP"} icon={IdCard}>
                      {selectedCustomer.nip || "—"}
                    </KV>
                    <KV label={FORM?.labels?.customerPhone || "Phone"} icon={Phone}>
                      {selectedCustomer.phoneNo || "—"}
                    </KV>
                    <KV label={FORM?.labels?.customerEmail || "Email"} icon={Mail}>
                      {selectedCustomer.email || "—"}
                    </KV>
                    <KV label={FORM?.labels?.customerAddress || "Address"} icon={MapPin}>
                      {[selectedCustomer.address, selectedCustomer.postCode, selectedCustomer.city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </KV>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        {FORM?.labels?.flagsTitle || "Agreement flags"}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{FORM?.labels?.owzSigned || "OWZ Signed"}</span>
                        <BoolIcon value={!!selectedCustomer?.owzSigned} variant="danger" A={A} />
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm">{FORM?.labels?.umowaRamowaSigned || "Framework agreement signed"}</span>
                        <BoolIcon value={!!selectedCustomer?.umowaRamowaSigned} variant="danger" A={A} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {FORM?.labels?.fixedTermAvailable || "Fixed term available"}:{" "}
                        <span className="font-semibold">
                          {canFixedTerm ? (FORM?.yes || "YES") : (FORM?.no || "NO")}
                        </span>
                      </div>
                    </div>
                  </Section>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500">
                  {FORM?.hints?.pickCustomer || "Pick a customer to unlock agreement types."}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <Lock size={16} className="text-slate-500" />
                {FORM?.hints?.customerLocked || "Customer is locked after creation (snapshot stored in agreement)."}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Section title={FORM?.labels?.customerSnapshot || "Customer snapshot"} className="md:col-span-2">
                  <KV label={FORM?.labels?.customerNo || "No."} icon={Hash}>
                    <NoBadge value={initial?.customer?.no} />
                  </KV>
                  <KV label={FORM?.labels?.customerName || "Name"} icon={UserCircle2}>
                    {initial?.customer?.name || "—"}
                  </KV>
                  <KV label={FORM?.labels?.customerNip || "NIP"} icon={IdCard}>
                    {initial?.customer?.nip || "—"}
                  </KV>
                  <KV label={FORM?.labels?.customerPhone || "Phone"} icon={Phone}>
                    {initial?.customer?.phoneNo || "—"}
                  </KV>
                  <KV label={FORM?.labels?.customerEmail || "Email"} icon={Mail}>
                    {initial?.customer?.email || "—"}
                  </KV>
                  <KV label={FORM?.labels?.customerAddress || "Address"} icon={MapPin}>
                    {[initial?.customer?.address, initial?.customer?.postCode, initial?.customer?.city]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </KV>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      {FORM?.labels?.flagsTitle || "Agreement flags"}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{FORM?.labels?.owzSigned || "OWZ Signed"}</span>
                      <BoolIcon value={!!initial?.customer?.owzSigned} variant="danger" A={A} />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm">{FORM?.labels?.umowaRamowaSigned || "Framework agreement signed"}</span>
                      <BoolIcon value={!!initial?.customer?.umowaRamowaSigned} variant="danger" A={A} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {FORM?.labels?.fixedTermAvailable || "Fixed term available"}:{" "}
                      <span className="font-semibold">
                        {canFixedTerm ? (FORM?.yes || "YES") : (FORM?.no || "NO")}
                      </span>
                    </div>
                  </div>
                </Section>
              </div>
            </>
          )}
        </div>
      )}

      {/* Basics tab */}
      {tab === "basics" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={FORM?.labels?.no || "No."} icon={Hash}>
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder={FORM?.placeholders?.no || "AGR0000001"}
                disabled
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              />
            </Field>

            <Field label={FORM?.labels?.type || "Type"} icon={Tag} error={errors.type}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              >
                <option value="owz">{tr(A, "types.owz", "OWZ")}</option>
                <option value="umowa_ramowa">{tr(A, "types.umowa_ramowa", "Framework agreement")}</option>
                <option value="umowa_jednorazowa">{tr(A, "types.umowa_jednorazowa", "One-off agreement")}</option>
                <option value="umowa_cykliczna">{tr(A, "types.umowa_cykliczna", "Recurring agreement")}</option>
                {canFixedTerm && <option value="fixed_term">{tr(A, "types.fixed_term", "Fixed term")}</option>}
              </select>

              {!canFixedTerm && (
                <div className="mt-1 text-xs text-slate-500">
                  {FORM?.hints?.fixedTermRule ||
                    "Fixed term appears only when customer has: OWZ Signed = true and Framework agreement signed = true."}
                </div>
              )}
            </Field>
          </div>

          <Field label={FORM?.labels?.description || "Description"} icon={FileText}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              placeholder={FORM?.placeholders?.description || ""}
            />
          </Field>

          <Field label={FORM?.labels?.signed || "Signed"} icon={ShieldCheck}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={signed}
                onChange={(e) => setSigned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {signed ? (A?.signed?.yes || "Signed") : (A?.signed?.no || "Not signed")}
            </label>
          </Field>
        </div>
      )}

      {/* Dates tab */}
      {tab === "dates" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={FORM?.labels?.documentDate || "Document date"} icon={Calendar}>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              />
            </Field>

            <Field label={FORM?.labels?.validityDate || "Validity date"} icon={Calendar}>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Links tab */}
      {tab === "links" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <Field label={FORM?.labels?.documentUrl || "Document URL"} icon={LinkIcon} error={errors.documentUrl}>
            <input
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              placeholder={FORM?.placeholders?.url || "https://..."}
            />
          </Field>

          <Field
            label={FORM?.labels?.signedDocumentUrl || "Signed document URL"}
            icon={LinkIcon}
            error={errors.signedDocumentUrl}
          >
            <input
              value={signedDocumentUrl}
              onChange={(e) => setSignedDocumentUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              placeholder={FORM?.placeholders?.url || "https://..."}
            />
          </Field>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm hover:bg-slate-50"
        >
          <X size={16} />
          {FORM?.actions?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-[#0E0F0E] hover:bg-slate-800"
        >
          <CheckCircle2 size={16} />
          {isEdit ? (FORM?.actions?.save || "Save") : (FORM?.actions?.create || "Create")}
        </button>
      </div>
    </form>
  );
}

/* ============================
  Agreement Line Form
============================ */
function AgreementLineForm({ agreement, initial, onSubmit, onCancel, A, locale }) {
  const isEdit = Boolean(initial?.id || initial?._id);
  const LINES = A.lines || {};

  const [status, setStatus] = useState(initial?.status || "open");

  const [itemId, setItemId] = useState(initial?.itemId || "");
  const [itemPick, setItemPick] = useState(
    initial?.itemNo
      ? {
          id: initial.itemId,
          _id: initial.itemId,
          no: initial.itemNo,
          description: initial.itemDescription,
          baseUnitOfMeasure: initial.uom,
          unitPrice: initial.unitPrice,
          type: initial.type,
        }
      : null
  );

  const [uom, setUom] = useState(initial?.uom || "");
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? "");
  const [qty, setQty] = useState(initial?.qty ?? "");
  const [transport, setTransport] = useState(initial?.transport ?? "");

  const lineValue = useMemo(() => {
    const up = Number(unitPrice || 0);
    const q = Number(qty || 0);
    const trn = Number(transport || 0);
    const v = up * q + trn;
    return Number.isFinite(v) ? v : 0;
  }, [unitPrice, qty, transport]);

  const [errors, setErrors] = useState({});

  const pickItem = (it) => {
    const realId = it?.id || it?._id;
    setItemId(realId || "");
    setItemPick(it);

    if (!uom) setUom(it.baseUnitOfMeasure || "");
    if (unitPrice === "" || unitPrice == null) setUnitPrice(it.unitPrice ?? 0);
  };

  const submit = (e) => {
    e.preventDefault();

    const resolvedItemId = itemId || itemPick?.id || itemPick?._id || "";
    const errs = {};
    if (!resolvedItemId) errs.itemId = (LINES?.form?.errors?.required || "Required");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      status,
      itemId: resolvedItemId,
      uom,
      unitPrice: unitPrice === "" ? 0 : Number(unitPrice),
      qty: qty === "" ? 0 : Number(qty),
      transport: transport === "" ? 0 : Number(transport),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={LINES?.form?.labels?.agreement || "Agreement"} icon={Hash}>
            <input
              value={`${agreement.no} (${agreement?.customer?.no || "—"} — ${agreement?.customer?.name || "—"})`}
              disabled
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
            />
          </Field>

          <Field label={LINES?.form?.labels?.status || "Status"} icon={Tag}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="open">{LINES?.statuses?.open || "Open"}</option>
              <option value="closed">{LINES?.statuses?.closed || "Closed"}</option>
              <option value="canceled">{LINES?.statuses?.canceled || "Canceled"}</option>
            </select>
          </Field>
        </div>

        <Field label={LINES?.form?.labels?.item || "Item"} icon={Package} error={errors.itemId}>
          <ItemPicker
            valueId={itemId}
            onPick={pickItem}
            placeholder={LINES?.form?.placeholders?.itemSearch || "Search item..."}
          />
          {itemPick && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-semibold">{itemPick.no}</div>
              <div className="text-xs text-slate-600">{itemPick.description || "—"}</div>
              <div className="mt-1 text-xs text-slate-500">
                {LINES?.form?.labels?.type || "Type"}: {itemPick.type || "—"} •{" "}
                {LINES?.form?.labels?.uom || "UOM"}: {itemPick.baseUnitOfMeasure || "—"} •{" "}
                {LINES?.form?.labels?.defaultPrice || "Default price"}: {itemPick.unitPrice ?? "—"}
              </div>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label={LINES?.form?.labels?.uom || "UOM"} icon={Layers}>
            <input
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={LINES?.form?.labels?.unitPrice || "Unit price"} icon={BadgeDollarSign}>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={LINES?.form?.labels?.qty || "Qty"} icon={Percent}>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={LINES?.form?.labels?.transport || "Transport"} icon={Truck}>
            <input
              type="number"
              step="0.01"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-600 mb-1">{LINES?.form?.labels?.lineValue || "Line value"}</div>
          <div className="text-lg font-bold text-slate-900">{fmtMoney(lineValue, locale)}</div>
          <div className="text-xs text-slate-500">{LINES?.form?.hints?.lineValueRule || "unitPrice * qty + transport"}</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm hover:bg-slate-50"
        >
          <X size={16} />
          {LINES?.form?.actions?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-[#0E0F0E] hover:bg-slate-800"
        >
          <CheckCircle2 size={16} />
          {isEdit ? (LINES?.form?.actions?.save || "Save line") : (LINES?.form?.actions?.add || "Add line")}
        </button>
      </div>
    </form>
  );
}

/* ============================
  Customer Picker (typeahead)
============================ */
function CustomerPicker({ valueId, onPick, placeholder = "Search..." }) {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!valueId) setInput("");
  }, [valueId]);

  const load = async (q) => {
    try {
      const params = new URLSearchParams({ q: q || "", page: "1", limit: "10" });
      const res = await fetch(`${API}/api/mcustomers?${params.toString()}`);
      const json = await res.json();
      setOpts(Array.isArray(json.data) ? json.data : []);
    } catch {
      setOpts([]);
    }
  };

  const onChange = (v) => {
    setInput(v);
    setOpen(true);
    setHover(-1);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 200);
  };

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!opts.length) load(input);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHover((h) => Math.min(opts.length - 1, h + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHover((h) => Math.max(0, h - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const pick = hover >= 0 ? opts[hover] : opts[0];
            if (pick) {
              onPick(pick);
              setInput(`${pick.no} — ${pick.name}`);
              setOpen(false);
            }
          }
        }}
      />

      {open && opts.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {opts.map((o, idx) => {
            const active = idx === hover;
            return (
              <li
                key={o._id}
                className={"cursor-pointer px-3 py-2 text-sm " + (active ? "bg-slate-100" : "hover:bg-slate-50")}
                onMouseEnter={() => setHover(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(o);
                  setInput(`${o.no} — ${o.name}`);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{o.no}</div>
                <div className="text-xs text-slate-500">{o.name}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================
  Item Picker (typeahead)
============================ */
function ItemPicker({ valueId, onPick, placeholder = "Search..." }) {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!valueId) setInput("");
  }, [valueId]);

  const load = async (q) => {
    try {
      const params = new URLSearchParams({ query: q || "", page: "1", limit: "10" });
      const res = await fetch(`${API}/api/mitems?${params.toString()}`);
      const json = await res.json();
      setOpts(Array.isArray(json.data) ? json.data : []);
    } catch {
      setOpts([]);
    }
  };

  const onChange = (v) => {
    setInput(v);
    setOpen(true);
    setHover(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 200);
  };

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!opts.length) load(input);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHover((h) => Math.min(opts.length - 1, h + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHover((h) => Math.max(0, h - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const pick = hover >= 0 ? opts[hover] : opts[0];
            if (pick) {
              onPick(pick);
              setInput(`${pick.no} — ${pick.description || ""}`);
              setOpen(false);
            }
          }
        }}
      />

      {open && opts.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {opts.map((o, idx) => {
            const active = idx === hover;
            return (
              <li
                key={o.id || o._id}
                className={"cursor-pointer px-3 py-2 text-sm " + (active ? "bg-slate-100" : "hover:bg-slate-50")}
                onMouseEnter={() => setHover(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(o);
                  setInput(`${o.no} — ${o.description || ""}`);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{o.no}</div>
                <div className="text-xs text-slate-500">{o.description || "—"}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================
  UI helpers
============================ */
function Toast({ type = "success", children, onClose, A }) {
  const UI = (A && A.ui) || {};
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${wrap}`}>
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-700"
        aria-label={UI?.close || "Close"}
        title={UI?.close || "Close"}
      >
        ✕
      </button>
    </div>
  );
}

function Modal({ children, onClose, title, fullscreen = false, backdrop = "dim", A }) {
  const UI = (A && A.ui) || {};
  const [isFull, setIsFull] = useState(Boolean(fullscreen));

  useEffect(() => {
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
    isFull ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull ? "p-4 h-[calc(100vh-52px)] overflow-auto" : "p-4 max-h-[80vh] overflow-auto";

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
              title={isFull ? (UI?.restore || "Restore") : (UI?.expand || "Expand")}
              aria-label={isFull ? (UI?.restore || "Restore") : (UI?.expand || "Expand")}
              type="button"
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title={UI?.close || "Close"}
              aria-label={UI?.close || "Close"}
              type="button"
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

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      {children}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
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

function Th({ children, className = "" }) {
  return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function SortableTh({ id, sortBy, sortDir, onSort, children, className = "", A }) {
  const active = sortBy === id;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  const UI = (A && A.ui) || {};
  return (
    <th aria-sort={ariaSort} className={`text-left px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50"
        title={UI?.sort || "Sort"}
      >
        <span>{children}</span>
        <span className={`text-xs ${active ? "opacity-100" : "opacity-60"}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function formatDate(s, locale, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(locale) : dash;
  } catch {
    return s || dash;
  }
}

function NoBadge({ value }) {
  const v = value || "—";
  const isEmpty = v === "—";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono border",
        isEmpty ? "text-slate-400 bg-slate-50 border-slate-200" : "font-semibold text-sky-700 bg-sky-50 border-sky-200",
      ].join(" ")}
    >
      <Hash size={12} className={isEmpty ? "text-slate-300" : "text-sky-500"} />
      {v}
    </span>
  );
}

function signedChip(v, A) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold border ${
        v ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {v ? (A?.signed?.yes || "Signed") : (A?.signed?.no || "Not signed")}
    </span>
  );
}

function typeChip(v, A) {
  const map = {
    owz: { label: tr(A, "types.owz", "OWZ"), cls: "bg-slate-50 text-slate-700 border-slate-200" },
    umowa_ramowa: {
      label: tr(A, "types.umowa_ramowa", "Framework agreement"),
      cls: "bg-sky-50 text-sky-700 border-sky-200",
    },
    umowa_jednorazowa: {
      label: tr(A, "types.umowa_jednorazowa", "One-off agreement"),
      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    umowa_cykliczna: {
      label: tr(A, "types.umowa_cykliczna", "Recurring agreement"),
      cls: "bg-violet-50 text-violet-700 border-violet-200",
    },
    fixed_term: {
      label: tr(A, "types.fixed_term", "Fixed term"),
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };
  const x = map[v] || { label: v || "—", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return <span className={`px-2 py-1 rounded text-xs font-semibold border ${x.cls}`}>{x.label}</span>;
}

function BoolIcon({ value, variant = "default", A }) {
  const UI = (A && A.ui) || {};
  const base = "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs";

  if (value) {
    return (
      <span className={base + " border-emerald-200 bg-emerald-50 text-emerald-600"} title={UI?.yes || "Yes"}>
        ✓
      </span>
    );
  }

  const falseClass =
    variant === "danger"
      ? " border-red-200 bg-red-50 text-red-500"
      : " border-slate-200 bg-slate-50 text-slate-400";

  return (
    <span className={base + falseClass} title={UI?.no || "No"}>
      ✕
    </span>
  );
}

function lineStatusChip(v, A) {
  const s = String(v || "open").toLowerCase();
  const LINES = (A && A.lines) || {};
  const map = {
    open: "bg-sky-50 text-sky-700 border-sky-200",
    closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    canceled: "bg-red-50 text-red-700 border-red-200",
  };
  const labelMap = {
    open: LINES?.statuses?.open || "Open",
    closed: LINES?.statuses?.closed || "Closed",
    canceled: LINES?.statuses?.canceled || "Canceled",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold border ${map[s] || map.open}`}>
      {labelMap[s] || s}
    </span>
  );
}

function fmtMoney(n, locale) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(locale || "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n, locale) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(locale || "de-DE", { maximumFractionDigits: 2 });
}
