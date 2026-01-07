import React, { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw, ChevronDown, ChevronRight, Undo2, Trash2 } from "lucide-react";
import { useI18n as _useI18n, fmtMoney, fmtNum } from "../helpers/i18n";

const useI18nSafe = _useI18n || (() => ({ t: null, locale: undefined }));

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

function getSessionEmail() {
  try {
    const raw = localStorage.getItem("session");
    const s = raw ? JSON.parse(raw) : null;
    const email = s?.email;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  } catch {
    return null;
  }
}

async function readBodyAsText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
async function safeJson(res, url) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = await readBodyAsText(res);
    throw new Error(
      `${res.status} ${res.statusText} @ ${url} · ${body.slice(0, 200)}`
    );
  }
  if (!ct.includes("application/json")) {
    const body = await readBodyAsText(res);
    throw new Error(
      `Expected JSON, got ${ct || "unknown"} @ ${url} · status ${
        res.status
      } · first 200: ${body.slice(0, 200)}`
    );
  }
  return res.json();
}

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function kv(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
}

function pickSnapshot(rec) {
  return rec?.snapshot || rec?.match || rec?.data || {};
}

function guessItemName(s) {
  return (
    kv(s, "item_name") ||
    kv(s, "itemName") ||
    kv(s, "item") ||
    kv(s, "itemNo") ||
    kv(s, "item_no") ||
    "—"
  );
}
function guessQty(s) {
  const v =
    kv(s, "qty") ??
    kv(s, "quantity") ??
    kv(s, "buy_qty") ??
    kv(s, "sell_qty");
  return v == null ? null : Number(v);
}
function guessPrice(s) {
  const v =
    kv(s, "price") ??
    kv(s, "unitPrice") ??
    kv(s, "unit_price") ??
    kv(s, "buy_price") ??
    kv(s, "sell_price");
  return v == null ? null : Number(v);
}
function guessFrom(s) {
  return (
    kv(s, "fromLabel") ||
    kv(s, "from_location") ||
    kv(s, "buy_location") ||
    kv(s, "from") ||
    "—"
  );
}
function guessTo(s) {
  return (
    kv(s, "toLabel") ||
    kv(s, "to_location") ||
    kv(s, "sell_location") ||
    kv(s, "to") ||
    "—"
  );
}

function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  const cls = map[tone] || map.slate;
  return (
    <span className={cn("px-2 py-1 rounded text-xs font-semibold border", cls)}>
      {children}
    </span>
  );
}

export default function MatchedRecordsPage() {
  const { t, locale } = useI18nSafe();
  const MR = (t && (t.matchedRecords || t.matched_records)) || {
    title: "Matched records",
    controls: {
      searchPlaceholder: "Search…",
      refresh: "Refresh",
      onlyActive: "Only not reverted",
    },
    table: {
      pickedAt: "Picked At",
      item: "Item",
      qty: "Qty",
      price: "Price",
      from: "From",
      to: "To",
      buy: "Buy block",
      sell: "Sell block",
      pickedBy: "Picked by",
      status: "Status",
      empty: "No matched records",
      loading: "Loading…",
      details: "Details",
      actions: "Actions",
      revert: "Revert",
      delete: "Delete",
      reasonPlaceholder: "Reason (optional)…",
    },
    toast: {
      reverted: "Reverted",
      deleted: "Deleted",
    },
  };

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [actionErr, setActionErr] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1600);
  };

  const fetchRows = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = `${API}/api/matched-records`;
      const res = await fetch(url);
      const json = await safeJson(res, url);
      const list = Array.isArray(json?.rows) ? json.rows : [];
      setRows(list);
    } catch (e) {
      setRows([]);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(); // eslint-disable-next-line
  }, []);

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (onlyActive && r?.revertedAt) return false;
      if (!qq) return true;

      const snap = pickSnapshot(r);
      const hay = [
        r?._id,
        r?.pickedBy,
        r?.revertedBy,
        r?.buy?.documentNo,
        r?.sell?.documentNo,
        r?.buy?.lineNo,
        r?.sell?.lineNo,
        r?.buy?.block,
        r?.sell?.block,
        guessItemName(snap),
        guessFrom(snap),
        guessTo(snap),
        JSON.stringify(snap || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, q, onlyActive]);

  const revertRecord = async (rec) => {
    if (!rec?._id) return;

    const email = getSessionEmail();
    const reason = window.prompt(MR.table.reasonPlaceholder) ?? "";

    if (!window.confirm("Revert this match and set blocks back to 'new'?")) return;

    setBusyId(rec._id);
    setActionErr("");
    try {
      const url = `${API}/api/matched-records/${rec._id}/revert`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revertedBy: email,
          reason: typeof reason === "string" ? reason : "",
        }),
      });
      await safeJson(res, url);
      showToast(MR.toast.reverted);
      await fetchRows();
    } catch (e) {
      setActionErr(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const deleteRecord = async (rec) => {
    if (!rec?._id) return;

    if (!rec?.revertedAt) {
      alert("Please revert first (record is still active).");
      return;
    }

    if (!window.confirm("Delete this matched record permanently?")) return;

    setBusyId(rec._id);
    setActionErr("");
    try {
      const url = `${API}/api/matched-records/${rec._id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await readBodyAsText(res);
        throw new Error(`${res.status} ${res.statusText} @ ${url} · ${body.slice(0, 200)}`);
      }
      showToast(MR.toast.deleted);
      await fetchRows();
    } catch (e) {
      setActionErr(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-slate-900">{MR.title}</div>
            {loading ? <Badge tone="amber">{MR.table.loading}</Badge> : null}
            {err ? <Badge tone="red">{err}</Badge> : null}
            {actionErr ? <Badge tone="red">{actionErr}</Badge> : null}
            {toast ? <Badge tone="blue">{toast}</Badge> : null}
            <Badge tone="slate">{filtered.length}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={MR.controls.searchPlaceholder}
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm min-w-[16rem]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-600 px-2 py-2">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              {MR.controls.onlyActive}
            </label>

            <button
              type="button"
              onClick={fetchRows}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
            >
              <RefreshCcw size={16} /> {MR.controls.refresh}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left w-10" />
                <th className="px-4 py-2 text-left whitespace-nowrap">
                  {MR.table.pickedAt}
                </th>
                <th className="px-4 py-2 text-left">{MR.table.item}</th>
                <th className="px-4 py-2 text-right">{MR.table.qty}</th>
                <th className="px-4 py-2 text-right">{MR.table.price}</th>
                <th className="px-4 py-2 text-left">{MR.table.from}</th>
                <th className="px-4 py-2 text-left">{MR.table.to}</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">
                  {MR.table.buy}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap">
                  {MR.table.sell}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap">
                  {MR.table.pickedBy}
                </th>
                <th className="px-4 py-2 text-left">{MR.table.status}</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">
                  {MR.table.actions}
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ? (
                filtered.map((r) => {
                  const snap = pickSnapshot(r);
                  const isOpen = expandedId === r._id;
                  const qty = guessQty(snap);
                  const price = guessPrice(snap);
                  const isBusy = busyId === r._id;

                  return (
                    <React.Fragment key={r._id}>
                      <tr className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((prev) => (prev === r._id ? null : r._id))
                            }
                            className="p-1 rounded hover:bg-slate-100"
                            title={MR.table.details}
                          >
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>

                        <td className="px-4 py-2 whitespace-nowrap">
                          {r?.pickedAt
                            ? new Date(r.pickedAt).toLocaleString(locale)
                            : r?.createdAt
                            ? new Date(r.createdAt).toLocaleString(locale)
                            : "—"}
                        </td>

                        <td className="px-4 py-2">
                          <span className="font-medium">{guessItemName(snap)}</span>
                        </td>

                        <td className="px-4 py-2 text-right tabular-nums">
                          {qty == null ? "—" : fmtNum(qty, locale)}
                        </td>

                        <td className="px-4 py-2 text-right tabular-nums font-semibold">
                          {price == null ? "—" : fmtMoney(price, locale, "PLN")}
                        </td>

                        <td className="px-4 py-2">{guessFrom(snap)}</td>
                        <td className="px-4 py-2">{guessTo(snap)}</td>

                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                          {r?.buy ? `${r.buy.documentNo}/${r.buy.lineNo}/${r.buy.block}` : "—"}
                        </td>

                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                          {r?.sell ? `${r.sell.documentNo}/${r.sell.lineNo}/${r.sell.block}` : "—"}
                        </td>

                        <td className="px-4 py-2 whitespace-nowrap">{r?.pickedBy || "—"}</td>

                        <td className="px-4 py-2">
                          {r?.revertedAt ? <Badge tone="red">reverted</Badge> : <Badge tone="green">active</Badge>}
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy || !!r?.revertedAt}
                              onClick={() => revertRecord(r)}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-50"
                              title="Revert blocks back to new"
                            >
                              <Undo2 size={14} /> {MR.table.revert}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy || !r?.revertedAt}
                              onClick={() => deleteRecord(r)}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-50"
                              title="Delete matched record (reverted only)"
                            >
                              <Trash2 size={14} /> {MR.table.delete}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr className="border-t bg-white">
                          <td colSpan={12} className="px-4 py-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-slate-200 p-3">
                                <div className="text-xs font-semibold text-slate-700 mb-2">
                                  Blocks
                                </div>
                                <div className="text-xs text-slate-700 space-y-1">
                                  <div>
                                    <span className="font-semibold">BUY:</span>{" "}
                                    <span className="font-mono">
                                      {r?.buy ? JSON.stringify(r.buy) : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-semibold">SELL:</span>{" "}
                                    <span className="font-mono">
                                      {r?.sell ? JSON.stringify(r.sell) : "—"}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <span className="font-semibold">Meta:</span>{" "}
                                    <span className="font-mono">
                                      {JSON.stringify(
                                        {
                                          pickedAt: r?.pickedAt || null,
                                          pickedBy: r?.pickedBy || null,
                                          revertedAt: r?.revertedAt || null,
                                          revertedBy: r?.revertedBy || null,
                                          revertReason: r?.revertReason || null,
                                        },
                                        null,
                                        0
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 p-3">
                                <div className="text-xs font-semibold text-slate-700 mb-2">
                                  Snapshot
                                </div>
                                <pre className="text-xs text-slate-700 overflow-auto max-h-[280px] bg-slate-50 border border-slate-200 rounded-lg p-2">
{JSON.stringify(snap || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-slate-500">
                    {MR.table.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 text-xs text-slate-500">
          Endpoint: <span className="font-mono">GET /api/matched-records</span>{" "}
          (showing up to 50 latest) · Revert: <span className="font-mono">POST /api/matched-records/:id/revert</span> · Delete:{" "}
          <span className="font-mono">DELETE /api/matched-records/:id</span>
        </div>
      </div>
    </div>
  );
}
