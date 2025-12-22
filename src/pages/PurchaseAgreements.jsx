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

export default function PurchaseAgreements() {
  const { t, locale } = useI18n();

  // Primary translations for this page
  // fallback to t.agreements so UI still works even if keys missing
  const A = t.purchaseAgreements || t.agreements || {};
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

  // lines UI
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

      const res = await fetch(`${API}/api/purchase-agreements?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", A?.alerts?.loadFail || "Failed to load purchase agreements.");
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
    if (!window.confirm(A?.alerts?.deleteConfirm || "Delete this purchase agreement?")) return;
    try {
      const res = await fetch(`${API}/api/purchase-agreements/${id}`, { method: "DELETE" });

      if (res.status === 204) {
        if (expandedId === id) setExpandedId(null);
        showNotice("success", A?.alerts?.deleted || "Purchase agreement deleted.");
        fetchData();
        return;
      }

      const json = await res.json().catch(() => ({}));
      showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  const getByPath = (obj, path) => {
    if (!path) return undefined;
    return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
  };

  // client sort on current page
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;

    const keyMap = {
      no: "no",
      vendorNo: "vendor.no",
      vendorName: "vendor.name",
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
    const url = isEdit
      ? `${API}/api/purchase-agreements/${editing._id}`
      : `${API}/api/purchase-agreements`;
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
        isEdit ? (A?.alerts?.updated || "Updated.") : (A?.alerts?.created || "Created.")
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
      const res = await fetch(`${API}/api/purchase-agreement-lines?${params.toString()}`);
      const json = await res.json();
      setLinesCache(agreementId, {
        loading: false,
        data: json.data || [],
        total: json.total || 0,
      });
    } catch {
      setLinesCache(agreementId, { loading: false, data: [], total: 0 });
      showNotice("error", A?.lines?.loadFail || "Failed to load lines");
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
      ? `${API}/api/purchase-agreement-lines/${existingLine.id || existingLine._id}`
      : `${API}/api/purchase-agreement-lines`;
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
        isEdit
          ? (A?.lines?.toastUpdated || "Line updated")
          : (A?.lines?.toastAdded || "Line added")
      );

      await fetchLines(agreement._id);
      return true;
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
      return false;
    }
  };

  const deleteLine = async (agreementId, lineId) => {
    if (!window.confirm(A?.lines?.confirmDelete || "Delete this line?")) return;
    try {
      const res = await fetch(`${API}/api/purchase-agreement-lines/${lineId}`, { method: "DELETE" });
      if (res.status === 204) {
        showNotice("success", A?.lines?.toastDeleted || "Line deleted");
        await fetchLines(agreementId);
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice("error", json?.message || A?.alerts?.requestFail || "Request failed");
      }
    } catch {
      showNotice("error", A?.alerts?.requestFail || "Request failed");
    }
  };

  const typeLabel = (key) => {
    const map = A?.types || {};
    return map?.[key] || key;
  };

  return (
    <div className="p-4 md:p-6">
      {notice && (
        <div className="mb-3">
          <Toast type={notice.type} onClose={() => setNotice(null)}>
            {notice.text}
          </Toast>
        </div>
      )}

      {/* Controls */}
      <form onSubmit={onSearch} className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
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
              title={A?.labels?.search || "Search"}
              aria-label={A?.labels?.search || "Search"}
            >
              <Search size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            <Plus size={16} />
            {A?.addBtn || "New agreement"}
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="purchase-agreements-filters-panel"
          >
            <SlidersHorizontal size={16} className="opacity-70" />
            {A?.filters || "Filters"}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          id="purchase-agreements-filters-panel"
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
            <option value="owz">{typeLabel("owz")}</option>
            <option value="framework_agreement">{typeLabel("framework_agreement")}</option>
            <option value="fixed_term">{typeLabel("fixed_term")}</option>
          </select>

          <select
            value={signed}
            onChange={(e) => {
              setSigned(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{A?.allSigned || "All"}</option>
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
                <SortableTh A={A} id="vendorNo" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.vendorNo || "Vendor No."}
                </SortableTh>
                <SortableTh A={A} id="vendorName" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.vendorName || "Vendor Name"}
                </SortableTh>
                <SortableTh A={A} id="type" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.type || "Type"}
                </SortableTh>
                <SortableTh A={A} id="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.description || "Description"}
                </SortableTh>
                <SortableTh A={A} id="documentDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.documentDate || "Document Date"}
                </SortableTh>
                <SortableTh A={A} id="validityDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.validityDate || "Validity Date"}
                </SortableTh>
                <SortableTh A={A} id="signed" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.signed || "Signed"}
                </SortableTh>
                <SortableTh A={A} id="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
                  {A?.cols?.createdAt || "Created"}
                </SortableTh>
                <th className="px-4 py-3 text-right">{A?.cols?.actions || "Actions"}</th>
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
                    {A?.empty || "No purchase agreements."}
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
                            aria-label={A?.labels?.expand || "Expand"}
                            title={A?.labels?.expand || "Expand"}
                          >
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>

                        <Td>
                          <NoBadge value={r.no} />
                        </Td>

                        <Td className="text-slate-700">{r?.vendor?.no || "—"}</Td>
                        <Td className="text-slate-700">{r?.vendor?.name || "—"}</Td>

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
                            <ExpandedPurchaseAgreement
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
            {`Total: ${(data?.total ?? 0).toLocaleString(locale)} • Page ${data?.page ?? page} of ${
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
                  {`${n} / page`}
                </option>
              ))}
            </select>

            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={(data?.page ?? page) <= 1}
            >
              {A?.prev || "Prev"}
            </button>

            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data?.pages || 1, p + 1))}
              disabled={(data?.page ?? page) >= (data?.pages || 1)}
            >
              {A?.next || "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Agreement Form Modal */}
      {openForm && (
        <Modal
          A={A}
          title={
            editing
              ? (A?.modals?.edit || "Edit Purchase Agreement")
              : (A?.modals?.add || "Add Purchase Agreement")
          }
          onClose={() => setOpenForm(false)}
        >
          <PurchaseAgreementForm
            A={A}
            initial={editing}
            onCancel={() => setOpenForm(false)}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {/* Line Modal */}
      {lineModalOpen && lineAgreement && (
        <Modal
          A={A}
          title={
            lineEditing
              ? (A?.lines?.modalEdit || "Edit Line")
              : (A?.lines?.modalAdd || "Add Line")
          }
          onClose={() => {
            setLineModalOpen(false);
            setLineEditing(null);
            setLineAgreement(null);
          }}
          fullscreen
        >
          <PurchaseAgreementLineForm
            A={A}
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
          />
        </Modal>
      )}
    </div>
  );
}

/* ============================
  Expanded details
============================ */
function ExpandedPurchaseAgreement({ row, locale, A, onAddLine, onEditLine, onDeleteLine, linesState }) {
  const v = row?.vendor || null;
  const canFixedTerm = Boolean(v?.owzSigned) && Boolean(v?.frameworkAgreementSigned);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Section title={A?.sections?.agreement || "Purchase Agreement"}>
        <KV label={A?.labels?.no || "No."} icon={Hash}>
          <NoBadge value={row.no} />
        </KV>
        <KV label={A?.labels?.type || "Type"} icon={Tag}>
          {typeChip(row.type, A)}
        </KV>
        <KV label={A?.labels?.description || "Description"} icon={FileText}>
          {row.description || "—"}
        </KV>
        <KV label={A?.labels?.documentDate || "Document Date"} icon={Calendar}>
          {formatDate(row.documentDate, locale)}
        </KV>
        <KV label={A?.labels?.validityDate || "Validity Date"} icon={Calendar}>
          {formatDate(row.validityDate, locale)}
        </KV>
        <KV label={A?.labels?.signed || "Signed"} icon={ShieldCheck}>
          {signedChip(row.signed, A)}
        </KV>
      </Section>

      <Section title={A?.sections?.documents || "Documents"}>
        <KV label={A?.labels?.documentUrl || "Document URL"} icon={LinkIcon}>
          {row.documentUrl ? (
            <a className="text-sky-700 hover:underline" href={row.documentUrl} target="_blank" rel="noreferrer">
              {A?.labels?.open || "Open"}
            </a>
          ) : (
            "—"
          )}
        </KV>
        <KV label={A?.labels?.signedDocumentUrl || "Signed Doc URL"} icon={LinkIcon}>
          {row.signedDocumentUrl ? (
            <a className="text-sky-700 hover:underline" href={row.signedDocumentUrl} target="_blank" rel="noreferrer">
              {A?.labels?.open || "Open"}
            </a>
          ) : (
            "—"
          )}
        </KV>
      </Section>

      <Section title={A?.sections?.vendorSnapshot || "Vendor (snapshot)"}>
        <KV label={A?.cols?.vendorNo || "Vendor No."} icon={Building2}>
          {v?.no || "—"}
        </KV>
        <KV label={A?.cols?.vendorName || "Vendor Name"} icon={UserCircle2}>
          {v?.name || "—"}
        </KV>
        <KV label="NIP" icon={IdCard}>
          {v?.nip || "—"}
        </KV>
        <KV label={A?.labels?.phone || "Phone"} icon={Phone}>
          {v?.phoneNo || "—"}
        </KV>
        <KV label={A?.labels?.email || "Email"} icon={Mail}>
          {v?.email || "—"}
        </KV>
        <KV label={A?.labels?.region || "Region"} icon={MapPin}>
          {[v?.postCode, v?.city, v?.region, v?.countryRegionCode].filter(Boolean).join(" • ") || "—"}
        </KV>

        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Lock size={14} className="text-slate-400" />
            {A?.sections?.flags || "Agreement flags"}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>{A?.labels?.owzSigned || "OWZ Signed"}</span>
              <BoolIcon value={!!v?.owzSigned} variant="danger" yesText={A?.labels?.yes} noText={A?.labels?.no} />
            </div>

            <div className="flex items-center justify-between">
              <span>{A?.labels?.frameworkAgreementSigned || "Framework Agreement Signed"}</span>
              <BoolIcon
                value={!!v?.frameworkAgreementSigned}
                variant="danger"
                yesText={A?.labels?.yes}
                noText={A?.labels?.no}
              />
            </div>

            <div className="pt-2 text-xs text-slate-500">
              {A?.labels?.fixedTermAvailable || "Fixed Term available"}:{" "}
              <span className="font-semibold">
                {canFixedTerm ? (A?.labels?.yes || "YES") : (A?.labels?.no || "NO")}
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
                {A?.sections?.lines || "Lines"}
              </div>

              <button
                type="button"
                onClick={onAddLine}
                className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <Plus size={16} />
                {A?.lines?.addLine || "Add line"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-slate-600">
                  <tr className="border-b">
                    <Th>{A?.lines?.headers?.lineNo || "Line No."}</Th>
                    <Th>{A?.lines?.headers?.status || "Status"}</Th>
                    <Th>{A?.lines?.headers?.type || "Type"}</Th>
                    <Th>{A?.lines?.headers?.item || "Item"}</Th>
                    <Th>{A?.lines?.headers?.uom || "UOM"}</Th>
                    <Th className="text-right">{A?.lines?.headers?.unitPrice || "Unit Price"}</Th>
                    <Th className="text-right">{A?.lines?.headers?.qty || "Qty"}</Th>
                    <Th className="text-right">{A?.lines?.headers?.transport || "Transport"}</Th>
                    <Th className="text-right">{A?.lines?.headers?.lineValue || "Line Value"}</Th>
                    <Th>{A?.lines?.headers?.updatedAt || "Updated"}</Th>
                    <Th className="text-right">{A?.lines?.headers?.actions || "Actions"}</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {linesState.loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-slate-500">
                        {A?.lines?.loading || "Loading lines..."}
                      </td>
                    </tr>
                  ) : (linesState.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                        {A?.lines?.empty || "No lines."}
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
  Agreement form
============================ */
function PurchaseAgreementForm({ A, initial, onSubmit, onCancel }) {
  const isEdit = Boolean(initial?._id);
  const [tab, setTab] = useState("vendor");

  const [no, setNo] = useState(initial?.no || "");
  const [vendorId, setVendorId] = useState(initial?.vendorId || "");
  const [selectedVendor, setSelectedVendor] = useState(null);

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

  const snapshot = isEdit ? initial?.vendor : selectedVendor;
  const canFixedTerm = Boolean(snapshot?.owzSigned) && Boolean(snapshot?.frameworkAgreementSigned);

  useEffect(() => {
    if (type === "fixed_term" && !canFixedTerm) setType("framework_agreement");
    // eslint-disable-next-line
  }, [canFixedTerm]);

  const pickVendor = (v) => {
    setVendorId(v._id);
    setSelectedVendor(v);
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEdit && !vendorId) errs.vendorId = A?.labels?.required || "Required";
    if (!type) errs.type = A?.labels?.required || "Required";

    const urlRe = /^https?:\/\/\S+/i;
    if (documentUrl && !urlRe.test(documentUrl)) errs.documentUrl = A?.labels?.invalidUrl || "Invalid URL";
    if (signedDocumentUrl && !urlRe.test(signedDocumentUrl))
      errs.signedDocumentUrl = A?.labels?.invalidUrl || "Invalid URL";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      no: no || undefined,
      vendorId: isEdit ? undefined : vendorId,
      type,
      description,
      documentDate: documentDate || null,
      validityDate: validityDate || null,
      documentUrl,
      signedDocumentUrl,
      signed,
    });
  };

  const typeLabel = (key) => (A?.types?.[key] || key);

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("vendor")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
            tab === "vendor"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          <Building2 size={16} />
          {A?.labels?.tabVendor || "Vendor"}
        </button>

        <button
          type="button"
          onClick={() => setTab("basics")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
            tab === "basics"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          <FileText size={16} />
          {A?.labels?.tabBasics || "Basics"}
        </button>

        <button
          type="button"
          onClick={() => setTab("dates")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
            tab === "dates"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          <Calendar size={16} />
          {A?.labels?.tabDates || "Dates"}
        </button>

        <button
          type="button"
          onClick={() => setTab("links")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
            tab === "links"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          <LinkIcon size={16} />
          {A?.labels?.tabDocuments || "Documents"}
        </button>
      </div>

      {/* Vendor tab */}
      {tab === "vendor" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!isEdit ? (
            <>
              <Field label={A?.labels?.selectVendor || "Select vendor"} icon={Building2} error={errors.vendorId}>
                <VendorPicker
                  valueId={vendorId}
                  onPick={pickVendor}
                  placeholder={A?.labels?.vendorSearchPh || "Search vendor..."}
                />
              </Field>

              {selectedVendor ? (
                <div className="mt-3">
                  <Section title={A?.sections?.vendorPreview || "Vendor snapshot preview"}>
                    <KV label={A?.labels?.no || "No."} icon={Hash}>
                      <NoBadge value={selectedVendor.no} />
                    </KV>
                    <KV label={A?.cols?.vendorName || "Name"} icon={UserCircle2}>
                      {selectedVendor.name || "—"}
                    </KV>
                    <KV label="NIP" icon={IdCard}>
                      {selectedVendor.nip || "—"}
                    </KV>
                    <KV label={A?.labels?.phone || "Phone"} icon={Phone}>
                      {selectedVendor.phoneNo || "—"}
                    </KV>
                    <KV label={A?.labels?.email || "Email"} icon={Mail}>
                      {selectedVendor.email || "—"}
                    </KV>
                    <KV label={A?.labels?.address || "Address"} icon={MapPin}>
                      {[selectedVendor.address, selectedVendor.postCode, selectedVendor.city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </KV>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        {A?.sections?.flags || "Agreement flags"}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{A?.labels?.owzSigned || "OWZ Signed"}</span>
                        <BoolIcon value={!!selectedVendor?.owzSigned} variant="danger" yesText={A?.labels?.yes} noText={A?.labels?.no} />
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm">{A?.labels?.frameworkAgreementSigned || "Framework Agreement Signed"}</span>
                        <BoolIcon value={!!selectedVendor?.frameworkAgreementSigned} variant="danger" yesText={A?.labels?.yes} noText={A?.labels?.no} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {A?.labels?.fixedTermAvailable || "Fixed Term available"}:{" "}
                        <span className="font-semibold">
                          {canFixedTerm ? (A?.labels?.yes || "YES") : (A?.labels?.no || "NO")}
                        </span>
                      </div>
                    </div>
                  </Section>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500">
                  {A?.labels?.pickVendorHint || "Pick a vendor to unlock agreement types."}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <Lock size={16} className="text-slate-500" />
                {A?.labels?.vendorLocked || "Vendor is locked after creation (snapshot stored in agreement)."}
              </div>

              <Section title={A?.sections?.vendorSnapshot || "Vendor snapshot"}>
                <KV label={A?.labels?.no || "No."} icon={Hash}>
                  <NoBadge value={initial?.vendor?.no} />
                </KV>
                <KV label={A?.cols?.vendorName || "Name"} icon={UserCircle2}>
                  {initial?.vendor?.name || "—"}
                </KV>
                <KV label="NIP" icon={IdCard}>
                  {initial?.vendor?.nip || "—"}
                </KV>
                <KV label={A?.labels?.phone || "Phone"} icon={Phone}>
                  {initial?.vendor?.phoneNo || "—"}
                </KV>
                <KV label={A?.labels?.email || "Email"} icon={Mail}>
                  {initial?.vendor?.email || "—"}
                </KV>
                <KV label={A?.labels?.address || "Address"} icon={MapPin}>
                  {[initial?.vendor?.address, initial?.vendor?.postCode, initial?.vendor?.city]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </KV>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">{A?.sections?.flags || "Agreement flags"}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{A?.labels?.owzSigned || "OWZ Signed"}</span>
                    <BoolIcon value={!!initial?.vendor?.owzSigned} variant="danger" yesText={A?.labels?.yes} noText={A?.labels?.no} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm">{A?.labels?.frameworkAgreementSigned || "Framework Agreement Signed"}</span>
                    <BoolIcon value={!!initial?.vendor?.frameworkAgreementSigned} variant="danger" yesText={A?.labels?.yes} noText={A?.labels?.no} />
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
      )}

      {/* Basics tab */}
      {tab === "basics" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={A?.labels?.no || "No."} icon={Hash}>
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder="PAGR0000001"
                disabled
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              />
            </Field>

            <Field label={A?.labels?.type || "Type"} icon={Tag} error={errors.type}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              >
                <option value="owz">{typeLabel("owz")}</option>
                <option value="framework_agreement">{typeLabel("framework_agreement")}</option>
                {canFixedTerm && <option value="fixed_term">{typeLabel("fixed_term")}</option>}
              </select>

              {!canFixedTerm && (
                <div className="mt-1 text-xs text-slate-500">
                  {A?.labels?.fixedTermHint ||
                    "Fixed Term appears only when vendor has: OWZ Signed = true and Framework Agreement Signed = true."}
                </div>
              )}
            </Field>
          </div>

          <Field label={A?.labels?.description || "Description"} icon={FileText}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              placeholder={A?.labels?.optional || "Optional"}
            />
          </Field>

          <Field label={A?.labels?.signed || "Signed"} icon={ShieldCheck}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={signed}
                onChange={(e) => setSigned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {signed ? (A?.signedYes || "Signed") : (A?.signedNo || "Not signed")}
            </label>
          </Field>
        </div>
      )}

      {/* Dates tab */}
      {tab === "dates" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={A?.labels?.documentDate || "Document Date"} icon={Calendar}>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              />
            </Field>

            <Field label={A?.labels?.validityDate || "Validity Date"} icon={Calendar}>
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
          <Field label={A?.labels?.documentUrl || "Document URL"} icon={LinkIcon} error={errors.documentUrl}>
            <input
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              placeholder="https://..."
            />
          </Field>

          <Field label={A?.labels?.signedDocumentUrl || "Signed Document URL"} icon={LinkIcon} error={errors.signedDocumentUrl}>
            <input
              value={signedDocumentUrl}
              onChange={(e) => setSignedDocumentUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              placeholder="https://..."
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
          {A?.labels?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
        >
          <CheckCircle2 size={16} />
          {isEdit ? (A?.labels?.save || "Save") : (A?.labels?.create || "Create")}
        </button>
      </div>
    </form>
  );
}

/* ============================
  Line Form
============================ */
function PurchaseAgreementLineForm({ A, agreement, initial, onSubmit, onCancel }) {
  const isEdit = Boolean(initial?.id || initial?._id);

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
    const tr = Number(transport || 0);
    const v = up * q + tr;
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
    if (!resolvedItemId) errs.itemId = A?.labels?.required || "Required";
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

  const statusLabels = A?.lines?.statusLabels || {};
  const optLabel = (k, fallback) => statusLabels?.[k] || fallback;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={A?.lines?.labels?.agreement || A?.labels?.agreement || "Agreement"} icon={Hash}>
            <input
              value={`${agreement.no} (${agreement?.vendor?.no || "—"} — ${agreement?.vendor?.name || "—"})`}
              disabled
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
            />
          </Field>

          <Field label={A?.lines?.headers?.status || "Status"} icon={Tag}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="open">{optLabel("open", "Open")}</option>
              <option value="closed">{optLabel("closed", "Closed")}</option>
              <option value="canceled">{optLabel("canceled", "Canceled")}</option>
            </select>
          </Field>
        </div>

        <Field label={A?.lines?.headers?.item || A?.labels?.item || "Item"} icon={Package} error={errors.itemId}>
          <ItemPicker
            valueId={itemId}
            onPick={pickItem}
            placeholder={A?.lines?.itemSearchPh || A?.labels?.itemSearchPh || "Search item..."}
          />
          {itemPick && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-semibold">{itemPick.no}</div>
              <div className="text-xs text-slate-600">{itemPick.description || "—"}</div>
              <div className="mt-1 text-xs text-slate-500">
                {A?.lines?.labels?.itemMetaPrefix || "Type"}: {itemPick.type || "—"} •{" "}
                {A?.lines?.headers?.uom || "UOM"}: {itemPick.baseUnitOfMeasure || "—"} •{" "}
                {A?.lines?.labels?.defaultPrice || "Default price"}: {itemPick.unitPrice ?? "—"}
              </div>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label={A?.lines?.headers?.uom || "UOM"} icon={Layers}>
            <input
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={A?.lines?.headers?.unitPrice || "Unit Price"} icon={BadgeDollarSign}>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={A?.lines?.headers?.qty || "Qty"} icon={Percent}>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            />
          </Field>

          <Field label={A?.lines?.headers?.transport || "Transport"} icon={Truck}>
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
          <div className="text-xs font-semibold text-slate-600 mb-1">
            {A?.lines?.headers?.lineValue || "Line Value"}
          </div>
          <div className="text-lg font-bold text-slate-900">{lineValue.toFixed(2)}</div>
          <div className="text-xs text-slate-500">
            {A?.lines?.labels?.lineValueHint || "unitPrice * qty + transport"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm hover:bg-slate-50"
        >
          <X size={16} />
          {A?.labels?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
        >
          <CheckCircle2 size={16} />
          {isEdit ? (A?.lines?.saveLine || "Save line") : (A?.lines?.addLine || "Add line")}
        </button>
      </div>
    </form>
  );
}

/* ============================
  Vendor Picker (typeahead)
============================ */
function VendorPicker({ valueId, onPick, placeholder = "Search..." }) {
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
      const res = await fetch(`${API}/api/mvendors?${params.toString()}`);
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
function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${wrap}`}>
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}

function Modal({ A, children, onClose, title, fullscreen = false, backdrop = "dim" }) {
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

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull ? "p-4 h-[calc(100vh-52px)] overflow-auto" : "p-4 max-h-[80vh] overflow-auto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {backdropNode}
      <div className={containerCls}>
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur">
          <h3 className="font-semibold truncate pr-2">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFull((v) => !v)}
              className="p-2 rounded hover:bg-slate-100"
              title={isFull ? (A?.labels?.restore || "Restore") : (A?.labels?.expand || "Expand")}
              aria-label={isFull ? (A?.labels?.restore || "Restore") : (A?.labels?.expand || "Expand")}
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title={A?.labels?.close || "Close"}
              aria-label={A?.labels?.close || "Close"}
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

function SortableTh({ A, id, sortBy, sortDir, onSort, children, className = "" }) {
  const active = sortBy === id;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th aria-sort={ariaSort} className={`text-left px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-slate-50"
        title={A?.labels?.sort || "Sort"}
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
  const yes = A?.signedYes || "Signed";
  const no = A?.signedNo || "Not signed";
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold border ${
        v ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {v ? yes : no}
    </span>
  );
}

function typeChip(v, A) {
  const types = A?.types || {};
  const map = {
    owz: { label: types.owz || "OWZ", cls: "bg-slate-50 text-slate-700 border-slate-200" },
    framework_agreement: {
      label: types.framework_agreement || "Framework Agreement",
      cls: "bg-sky-50 text-sky-700 border-sky-200",
    },
    fixed_term: { label: types.fixed_term || "Fixed Term", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const x = map[v] || { label: v || "—", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return <span className={`px-2 py-1 rounded text-xs font-semibold border ${x.cls}`}>{x.label}</span>;
}

function BoolIcon({ value, variant = "default", yesText = "Yes", noText = "No" }) {
  const base = "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs";

  if (value) {
    return (
      <span className={base + " border-emerald-200 bg-emerald-50 text-emerald-600"} title={yesText || "Yes"}>
        ✓
      </span>
    );
  }

  const falseClass =
    variant === "danger"
      ? " border-red-200 bg-red-50 text-red-500"
      : " border-slate-200 bg-slate-50 text-slate-400";

  return (
    <span className={base + falseClass} title={noText || "No"}>
      ✕
    </span>
  );
}

function lineStatusChip(v, A) {
  const s = String(v || "open").toLowerCase();
  const labels = A?.lines?.statusLabels || {};
  const text = labels[s] || s;

  const map = {
    open: "bg-sky-50 text-sky-700 border-sky-200",
    closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    canceled: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold border ${map[s] || map.open}`}>{text}</span>;
}

function fmtMoney(n, locale) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(locale || "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n, locale) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(locale || "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
