import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw, ChevronUp, ChevronDown } from "lucide-react";
import { ListOrdered, Scale, Banknote } from "lucide-react";
import { useI18n, fmtMoney, fmtNum } from "../helpers/i18n";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Exchange() {
  const { t, locale } = useI18n();
  const EX = t.exchange;
  const C = EX.columns;

  // Items (loaded once, used by both columns)
  const [items, setItems] = useState([]);

  // BUY filters
  const [bQuery, setBQuery] = useState("");
  const [bStatus, setBStatus] = useState("");
  const [bItemId, setBItemId] = useState("");
  const [bPage, setBPage] = useState(1);
  const [bLimit, setBLimit] = useState(10);
  const [bData, setBData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [bTotals, setBTotals] = useState({ count: 0, qty: 0, notional: 0 });
  const [bSort, setBSort] = useState({ key: "id", dir: "desc" });

  // SELL filters
  const [sQuery, setSQuery] = useState("");
  const [sStatus, setSStatus] = useState("");
  const [sItemId, setSItemId] = useState("");
  const [sPage, setSPage] = useState(1);
  const [sLimit, setSLimit] = useState(10);
  const [sData, setSData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [sTotals, setSTotals] = useState({ count: 0, qty: 0, notional: 0 });
  const [sSort, setSSort] = useState({ key: "id", dir: "desc" });

  // refresh meta
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(60);

  // load items once
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/items?limit=1000&page=1`);
      const json = await res.json().catch(() => ({ data: [] }));
      setItems(json.data || []);
    })();
  }, []);

  const itemById = (id) => items.find((i) => Number(i.id) === Number(id));

  // ---- Fetch helpers ----
  const fetchColumn = async (side) => {
    const isBuy = side === "buy";
    const params = new URLSearchParams({
      page: String(isBuy ? bPage : sPage),
      limit: String(isBuy ? bLimit : sLimit),
    });

    // if item selected, query by SKU only
    const freeQ = isBuy ? bQuery : sQuery;
    const itemId = isBuy ? bItemId : sItemId;
    const picked = itemId ? itemById(itemId) : null;
    const finalQ = picked ? (picked.sku || "") : freeQ.trim();
    if (finalQ) params.set("query", finalQ);
    const st = isBuy ? bStatus : sStatus;
    if (st) params.set("status", st);

    const url = `${API}/api/${isBuy ? "buys" : "sells"}?${params.toString()}`;
    const res = await fetch(url);
    const json = await res.json();
    if (isBuy) setBData(json);
    else setSData(json);
  };

  const fetchTotals = async (side) => {
    const isBuy = side === "buy";
    const params = new URLSearchParams({ page: "1", limit: "10000" });

    const freeQ = isBuy ? bQuery : sQuery;
    const itemId = isBuy ? bItemId : sItemId;
    const picked = itemId ? itemById(itemId) : null;
    const finalQ = picked ? (picked.sku || "") : freeQ.trim();
    if (finalQ) params.set("query", finalQ);
    const st = isBuy ? bStatus : sStatus;
    if (st) params.set("status", st);

    const url = `${API}/api/${isBuy ? "buys" : "sells"}?${params.toString()}`;
    const res = await fetch(url);
    const json = await res.json();
    const sum = sumUp(json.data || []);
    if (isBuy) setBTotals(sum);
    else setSTotals(sum);
  };

  const reloadBuy = async () => {
    await fetchColumn("buy");
    await fetchTotals("buy");
  };
  const reloadSell = async () => {
    await fetchColumn("sell");
    await fetchTotals("sell");
  };
  const reloadBoth = async () => {
    setLoading(true);
    try {
      await Promise.all([reloadBuy(), reloadSell()]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    reloadBoth();
    // eslint-disable-next-line
  }, []);

  // refetch when BUY filters change (not page/limit)
  useEffect(() => {
    setBPage(1);
    reloadBuy().then(() => setLastUpdated(new Date()));
    // eslint-disable-next-line
  }, [bQuery, bStatus, bItemId]);

  // refetch when SELL filters change (not page/limit)
  useEffect(() => {
    setSPage(1);
    reloadSell().then(() => setLastUpdated(new Date()));
    // eslint-disable-next-line
  }, [sQuery, sStatus, sItemId]);

  // paging/limit per column (leave totals unchanged)
  useEffect(() => { fetchColumn("buy"); }, [bPage, bLimit]); // eslint-disable-line
  useEffect(() => { fetchColumn("sell"); }, [sPage, sLimit]); // eslint-disable-line

  // auto refresh every second with countdown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          reloadBoth();
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const manualRefresh = () => {
    setCountdown(60);
    reloadBoth();
  };

  return (
    <div className="space-y-4">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div>
          {EX.topbar.lastUpdate}:{" "}
          <b>{lastUpdated ? lastUpdated.toLocaleTimeString(locale) : "—"}</b>
        </div>
        <div className="flex items-center gap-2">
          {EX.topbar.nextIn} <b>{countdown}s</b>
          <button
            type="button"
            onClick={manualRefresh}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            title={EX.topbar.refreshNowTitle}
          >
            <RefreshCcw size={14} /> {EX.topbar.refresh}
          </button>
          {loading && <span className="text-slate-400">{EX.topbar.loading}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BUY column */}
        <Column
          title={C.buyTitle}
          side="buy"
          items={items}
          query={bQuery}
          setQuery={setBQuery}
          status={bStatus}
          setStatus={setBStatus}
          itemId={bItemId}
          setItemId={setBItemId}
          rows={bData}
          page={bPage}
          setPage={setBPage}
          limit={bLimit}
          setLimit={setBLimit}
          totals={bTotals}
          sort={bSort}
          setSort={setBSort}
          locale={locale}
          labels={C}
          stats={EX.stats}
          onRefresh={() => { setCountdown(60); reloadBuy().then(() => setLastUpdated(new Date())); }}
        />

        {/* SELL column */}
        <Column
          title={C.sellTitle}
          side="sell"
          items={items}
          query={sQuery}
          setQuery={setSQuery}
          status={sStatus}
          setStatus={setSStatus}
          itemId={sItemId}
          setItemId={setSItemId}
          rows={sData}
          page={sPage}
          setPage={setSPage}
          limit={sLimit}
          setLimit={setSLimit}
          totals={sTotals}
          sort={sSort}
          setSort={setSSort}
          locale={locale}
          labels={C}
          stats={EX.stats}
          onRefresh={() => { setCountdown(60); reloadSell().then(() => setLastUpdated(new Date())); }}
        />
      </div>
    </div>
  );
}

/* ===================== Column component ===================== */
function Column({
  title,
  side,
  items,
  query,
  setQuery,
  status,
  setStatus,
  itemId,
  setItemId,
  rows,
  page,
  setPage,
  limit,
  setLimit,
  totals,
  sort,
  setSort,
  onRefresh,
  locale,
  labels,   // C
  stats,    // EX.stats
}) {
  const sortedData = useMemo(() => {
    const arr = [...(rows.data || [])];
    arr.sort(makeComparator(sort));
    return arr;
  }, [rows, sort]);

  const onSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <Header title={title} totals={totals} locale={locale} stats={stats} />

      {/* Column-specific filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          onRefresh();
        }}
        className="flex flex-wrap gap-2 items-center px-4 py-3 border-b bg-white"
      >
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={side === "buy" ? labels.searchPlaceholderBuy : labels.searchPlaceholderSell}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="">{labels.allStatuses}</option>
          <option value="open">{labels.statuses.open}</option>
          <option value="approved">{labels.statuses.approved}</option>
          <option value="rejected">{labels.statuses.rejected}</option>
          <option value="closed">{labels.statuses.closed}</option>
        </select>

        {/* Item filter */}
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          title={side === "buy" ? labels.headers.item : labels.headers.item}
        >
          <option value="">{labels.allItems}</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name} ({it.sku})
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50"
        >
          {labels.searchBtn}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
        >
          <RefreshCcw size={16} /> {labels.refreshBtn}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <SortableTh label={labels.headers.id} sortKey="id" sort={sort} onSort={onSort} className="w-16" />
              <SortableTh
                label={side === "buy" ? labels.headers.partyBuy : labels.headers.partySell}
                sortKey={side === "buy" ? "vendor_name" : "customer_name"}
                sort={sort}
                onSort={onSort}
              />
              <SortableTh label={labels.headers.item} sortKey="item_name" sort={sort} onSort={onSort} />
              <SortableTh label={labels.headers.type} sortKey="type" sort={sort} onSort={onSort} />
              <SortableTh label={labels.headers.qty} sortKey="quantity" sort={sort} onSort={onSort} className="text-right" />
              <SortableTh label={labels.headers.price} sortKey="price" sort={sort} onSort={onSort} className="text-right" />
              <SortableTh label={labels.headers.status} sortKey="status" sort={sort} onSort={onSort} />
              <SortableTh label={labels.headers.created} sortKey="created_at" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {sortedData.length ? (
              sortedData.map((r) => (
                <tr key={r.id} className="border-t">
                  <Td>{r.id}</Td>
                  <Td className="font-medium">{side === "buy" ? r.vendor_name : r.customer_name}</Td>
                  <Td>
                    <span className="font-medium">{r.item_name}</span>{" "}
                    <span className="text-slate-500">({r.item_sku})</span>
                  </Td>
                  <Td className="uppercase">{r.type}</Td>
                  <Td className="text-right">{fmtNum(r.quantity, locale)}</Td>
                  <Td className="text-right">{fmtMoney(r.price, locale, "USD")}</Td>
                  <Td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        r.status === "open"
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : r.status === "approved"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : r.status === "rejected"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {(labels.statuses[r.status] || r.status).toUpperCase()}
                    </span>
                  </Td>
                  <Td>{new Date(r.created_at).toLocaleDateString(locale)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
        <div className="text-xs text-slate-500">
          {labels.footer.meta(rows.total || 0, rows.page || 1, rows.pages || 1)}
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
                {labels.footer.perPage(n)}
              </option>
            ))}
          </select>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={(rows.page || 1) <= 1}
          >
            {labels.footer.prev}
          </button>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(rows.pages || 1, p + 1))}
            disabled={(rows.page || 1) >= (rows.pages || 1)}
          >
            {labels.footer.next}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== UI bits ===================== */
function Header({ title, totals, locale, stats }) {
  const { count = 0, qty = 0, notional = 0 } = totals || {};
  return (
    <div className="px-4 py-3 border-b bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>

        <div className="flex items-center gap-2">
          <StatChip icon={ListOrdered} label={stats.count} value={fmtNum(count, locale)} />
          <StatChip icon={Scale} label={stats.qty} value={fmtNum(qty, locale)} />
          <StatChip icon={Banknote} label={stats.notional} value={fmtMoney(notional, locale, "USD")} />
        </div>
      </div>
    </div>
  );
}
function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={14} className="text-slate-600" />
      </span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
function SortableTh({ label, sortKey, sort, onSort, className = "" }) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`text-left px-4 py-3 font-medium select-none cursor-pointer ${className}`}
      onClick={() => onSort(sortKey)}
      title="Click to sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : (<span className="opacity-30"><ChevronUp size={14} /></span>)}
      </span>
    </th>
  );
}
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }

/* ===================== helpers ===================== */
function sumUp(arr) {
  const count = arr.length;
  const qty = arr.reduce((a, x) => a + (Number(x.quantity) || 0), 0);
  const notional = arr.reduce((a, x) => a + (Number(x.quantity) || 0) * (Number(x.price) || 0), 0);
  return { count, qty, notional };
}
function makeComparator(sort) {
  const { key, dir } = sort || { key: "id", dir: "desc" };
  const mult = dir === "asc" ? 1 : -1;
  return (a, b) => {
    const va = getVal(a, key);
    const vb = getVal(b, key);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  };
}
function getVal(row, key) {
  switch (key) {
    case "id": return Number(row.id) || 0;
    case "vendor_name": return (row.vendor_name || "").toLowerCase();
    case "customer_name": return (row.customer_name || "").toLowerCase();
    case "item_name": return (row.item_name || "").toLowerCase();
    case "type": return (row.type || "").toLowerCase();
    case "quantity": return Number(row.quantity) || 0;
    case "price": return Number(row.price) || 0;
    case "status": return (row.status || "").toLowerCase();
    case "created_at": return new Date(row.created_at).getTime() || 0;
    default: return "";
  }
}
