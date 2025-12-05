import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, ChevronUp, ChevronDown, Search } from "lucide-react";
import { ListOrdered, Scale, Banknote, ArrowLeftRight } from "lucide-react";
import { useI18n, fmtMoney, fmtNum } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

/* ---------- helpers: HTTP ---------- */
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
    throw new Error(`${res.status} ${res.statusText} @ ${url} · ${body.slice(0, 120)}`);
  }
  if (!ct.includes("application/json")) {
    const body = await readBodyAsText(res);
    throw new Error(
      `Expected JSON, got ${ct || "unknown"} @ ${url} · status ${res.status} · first 120: ${body.slice(0, 120)}`
    );
  }
  return res.json();
}

/**
 * Normalize purchase/sales *block* rows into a common shape.
 * Includes `block` and a best-effort `region` used for transport costs.
 */
function normalizeBlockRow(r, side) {
  const partyBuy =
    r.buyVendorName ||
    r.payVendorName ||
    r.locationName ||
    r.vendor_name ||
    r.party ||
    r.documentNo ||
    "—";

  const partySell =
    r.sellCustomerName ||
    r.billCustomerName ||
    r.locationName ||
    r.customer_name ||
    r.party ||
    r.documentNo ||
    "—";

  const blockVal = r.block != null ? Number(r.block) : null;

  // Location fields (best-effort, from both block + joined location)
  const locName =
    r.locationName ||
    r.location_name ||
    r.location ||
    "";

  const locCity =
    r.locationCity ||
    r.city ||
    "";

  const locPostCode =
    r.locationPostCode ||
    r.postCode ||
    r.post_code ||
    r.zip ||
    r.postalCode ||
    "";

  const locCountry =
    r.locationCountryCode ||
    r.countryRegionCode ||
    r.countryCode ||
    r.country ||
    "";

  // Human-friendly label used everywhere in UI
  const locationLabel =
    [locPostCode, locCity].filter(Boolean).join(" ") ||
    locName ||
    "—";

  // Coordinates (if your backend joins them from Locations)
  const rawLat =
    r.locationLat ??
    r.locationLatitude ??
    r.lat ??
    r.latitude ??
    null;

  const rawLon =
    r.locationLon ??
    r.locationLongitude ??
    r.lon ??
    r.longitude ??
    null;

  const locLat =
    rawLat === null || rawLat === undefined || rawLat === ""
      ? null
      : Number(rawLat);

  const locLon =
    rawLon === null || rawLon === undefined || rawLon === ""
      ? null
      : Number(rawLon);

  // 🔎 DEBUG: see what we got per row (you can keep or remove later)
  console.log("[normalizeBlockRow]", {
    side,
    documentNo: r.documentNo,
    locationLabel,
    rawLat,
    rawLon,
    locLat,
    locLon,
  });

  const region =
    r.locationRegion ||
    r.buyVendorRegion ||
    r.sellCustomerRegion ||
    r.vendorRegion ||
    r.customerRegion ||
    r.region ||
    null;

  const qty = Number(r.quantity) || 0;

  const transportTotal =
    Number(
      r.transportCost ??
      r.transport_cost ??
      r.transport_total ??
      0
    ) || 0;

  const transportPerUnit = qty > 0 ? transportTotal / qty : 0;

  return {
    lineNo: Number(
      r.lineNo ??
      r.documentLineNo ??
      r.line_no ??
      r.line_number ??
      r.id ??
      0
    ),

    vendor_name: side === "buy" ? partyBuy : undefined,
    customer_name: side === "sell" ? partySell : undefined,

    item_name: r.itemNo || r.item || r.item_name || "—",

    item_sku:
      r.unitOfMeasure ||
      r.uom ||
      r.item_sku ||
      (blockVal != null ? `#${blockVal}` : ""),

    block: Number.isFinite(blockVal) ? blockVal : null,

    locationName: locName || null,
    locationCity: locCity || null,
    locationPostCode: locPostCode || null,
    locationCountryCode: locCountry || null,
    locationLabel,
    locationLat: Number.isFinite(locLat) ? locLat : null,
    locationLon: Number.isFinite(locLon) ? locLon : null,

    region,

    type: (r.lineType || r.type || "item").toString().toLowerCase(),
    quantity: qty,
    price: Number(r.unitPrice ?? r.price) || 0,

    transportTotal,
    transportPerUnit,

    status: (r.status || "new").toString().toLowerCase(),
    created_at: r.createdAt || r.dateCreated || r.created_at || null,
    documentNo: r.documentNo || r.doc_no || "—",
  };
}


/**
 * Compute unit profit between a buy block and a sell block.
 * Formula:
 *   profit_per_t = sellPrice - buyPrice - (matrixCost + manualBase + sellBlockTransport)
 *
 * - manualBase      = baseTransportPerUnit (global input in Exchange)
 * - sellBlockTransport = s.transportPerUnit (already normalized from block)
 * - matrixCost      = optional region→region cost from matrix (if used)
 */
function computeProfitParts(b, s, opts = {}) {
  const { transportMatrix, baseTransportPerUnit = 0 } = opts;

  const buyPrice = Number(b.price) || 0;
  const sellPrice = Number(s.price) || 0;

  // Regions from normalized rows (best-effort)
  const fromRegion =
    b.region ||
    b.buyVendorRegion ||
    b.locationRegion ||
    b.vendor_region ||
    null;

  const toRegion =
    s.region ||
    s.sellCustomerRegion ||
    s.locationRegion ||
    s.customer_region ||
    null;

  // Default example matrix (you can ignore by not passing transportMatrix)
  const defaultTransportMatrix = {
    A: { A: 10, B: 25, C: 30 },
    B: { A: 20, B: 10, C: 35 },
  };

  const matrix = transportMatrix || defaultTransportMatrix;
  let matrixCost = 0;
  if (fromRegion && toRegion && matrix[fromRegion] && matrix[fromRegion][toRegion] != null) {
    matrixCost = Number(matrix[fromRegion][toRegion]) || 0;
  }

  // 🔴 SELL BLOCK transport / t (comes from normalizeBlockRow → transportPerUnit)
  const sellBlockTransport = Number(s.transportPerUnit) || 0;

  // 🔴 TOTAL transport / t used in matching:
  // matrix (optional) + manual base + sell block transport
  const transportCost = matrixCost + baseTransportPerUnit + sellBlockTransport;

  const profit = sellPrice - buyPrice - transportCost;
  return { profit, transportCost, fromRegion, toRegion };
}


// Endpoints
const ENDPOINT = {
  buy: "purchase-offer-lines-blocks",
  sell: "sales-offer-lines-blocks",
  items: "mitems",
};

export default function Exchange() {
  const { t, locale } = useI18n();
  const EX = t.exchange;
  const C = EX.columns;
  

  // Optional: items catalog (not used for filtering now)
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [settings, setSettings] = useState({ transportCostPerKm: 0 });

  // BUY state
  const [bItemKey, setBItemKey] = useState(""); // itemNo (e.g., "ITEM-00001")
  const [bPage, setBPage] = useState(1);
  const [bLimit, setBLimit] = useState(8);
  const [bData, setBData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [bTotals, setBTotals] = useState({ count: 0, qty: 0, notional: 0 });
  const [bSort, setBSort] = useState({ key: "lineNo", dir: "desc" });
  const [bFacets, setBFacets] = useState({ items: [] });

  // SELL state
  const [sItemKey, setSItemKey] = useState("");
  const [sPage, setSPage] = useState(1);
  const [sLimit, setSLimit] = useState(8);
  const [sData, setSData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [sTotals, setSTotals] = useState({ count: 0, qty: 0, notional: 0 });
  const [sSort, setSSort] = useState({ key: "lineNo", dir: "desc" });
  const [sFacets, setSFacets] = useState({ items: [] });

  // refresh meta
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const [bAllRows, setBAllRows] = useState([]);
  const [sAllRows, setSAllRows] = useState([]);

  // Load catalog once (optional)
  useEffect(() => {
    (async () => {
      try {
        const url = `${API}/api/${ENDPOINT.items}?limit=1000&page=1&active=true&sort=no:1`;
        const res = await fetch(url);
        const json = await safeJson(res, url);
        setItemsCatalog(json.data || []);
      } catch (e) {
        console.error(e);
        setItemsCatalog([]);
      }
    })();
  }, []);

    // Load catalog once (optional)
  useEffect(() => {
    (async () => {
      try {
        const url = `${API}/api/${ENDPOINT.items}?limit=1000&page=1&active=true&sort=no:1`;
        const res = await safeJson(await fetch(url), url);
        setItemsCatalog(res.data || []);
      } catch (e) {
        console.error(e);
        setItemsCatalog([]);
      }
    })();
  }, []);

  // 🔹 NEW: load transportCostPerKm from settings
  useEffect(() => {
    (async () => {
      try {
        const url = `${API}/api/settings`;
        const res = await fetch(url);
        const json = await safeJson(res, url);
        setSettings(json || { transportCostPerKm: 0 });
      } catch (e) {
        console.error("Failed to load settings", e);
        setSettings({ transportCostPerKm: 0 });
      }
    })();
  }, []);


  // ---- Fetch helpers: ONLY itemNo filter is used ----
  const buildParams = (side) => {
    const isBuy = side === "buy";
    const params = new URLSearchParams({
      page: String(isBuy ? bPage : sPage),
      limit: String(isBuy ? bLimit : sLimit),
    });

    const itemKey = isBuy ? bItemKey : sItemKey; // this is itemNo
    if (itemKey) {
      // Send the param your backend expects. Keep both if unsure; extra params are usually ignored.
      params.set("itemNo", String(itemKey));
      params.set("query", String(itemKey));
    }

    return params;
  };

  const fetchColumn = async (side) => {
    setErrMsg("");
    const isBuy = side === "buy";
    const ep = isBuy ? ENDPOINT.buy : ENDPOINT.sell;
    const url = `${API}/api/${ep}?${buildParams(side).toString()}`;

    try {
      const res = await fetch(url);
      const json = await safeJson(res, url);
      const rows = (json?.data || []).map((r) => normalizeBlockRow(r, side));
      const payload = { ...json, data: rows };
      if (isBuy) setBData(payload);
      else setSData(payload);
    } catch (e) {
      console.error(e);
      setErrMsg(`Failed to load ${isBuy ? "purchase" : "sales"} blocks: ${e.message}`);
      if (isBuy) setBData({ data: [], total: 0, pages: 0, page: 1 });
      else setSData({ data: [], total: 0, pages: 0, page: 1 });
    }
  };

  const fetchTotalsAndFacets = async (side) => {
    const isBuy = side === "buy";
    const params = buildParams(side);
    params.set("page", "1");
    params.set("limit", "10000"); // load BIG page for 'all rows' cache used by matcher

    const ep = isBuy ? ENDPOINT.buy : ENDPOINT.sell;
    const url = `${API}/api/${ep}?${params.toString()}`;

    try {
      const res = await fetch(url);
      const json = await safeJson(res, url);
      const norm = (json?.data || []).map((r) => normalizeBlockRow(r, side));

      // cache ALL rows for the matcher
      if (isBuy) setBAllRows(norm);
      else setSAllRows(norm);

      // totals
      const sum = sumUp(norm);
      if (isBuy) setBTotals(sum);
      else setSTotals(sum);

      // facets: list of itemNo values present in current dataset
      const itemSet = new Set();
      for (const x of norm) {
        const name = String(x.item_name || "").trim();
        if (name) itemSet.add(name);
      }
      const facetItems = Array.from(itemSet)
        .sort()
        .map((name) => ({ key: name, name }));

      if (isBuy) setBFacets({ items: facetItems });
      else setSFacets({ items: facetItems });
    } catch (e) {
      console.error(e);
      if (isBuy) {
        setBTotals({ count: 0, qty: 0, notional: 0 });
        setBFacets({ items: [] });
        setBAllRows([]);
      } else {
        setSTotals({ count: 0, qty: 0, notional: 0 });
        setSFacets({ items: [] });
        setSAllRows([]);
      }
    }
  };

  const reloadBuy = async () => {
    await fetchColumn("buy");
    await fetchTotalsAndFacets("buy");
  };
  const reloadSell = async () => {
    await fetchColumn("sell");
    await fetchTotalsAndFacets("sell");
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

  // refetch when only ITEM filter changes
  useEffect(() => {
    setBPage(1);
    reloadBuy().then(() => setLastUpdated(new Date()));
    // eslint-disable-next-line
  }, [bItemKey]);
  useEffect(() => {
    setSPage(1);
    reloadSell().then(() => setLastUpdated(new Date()));
    // eslint-disable-next-line
  }, [sItemKey]);

  // paging/limit per column (leave totals unchanged)
  useEffect(() => {
    fetchColumn("buy");
    // eslint-disable-next-line
  }, [bPage, bLimit]);
  useEffect(() => {
    fetchColumn("sell");
    // eslint-disable-next-line
  }, [sPage, sLimit]);



const manualRefresh = () => {
  reloadBoth();
};

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {errMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errMsg}
        </div>
      ) : null}

      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div>
          {EX.topbar.lastUpdate}: <b>{lastUpdated ? lastUpdated.toLocaleTimeString(locale) : "—"}</b>
        </div>

<div className="flex items-center gap-3">
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


      {/* Matches: Buy ↔ Sell (Hungarian-based) */}
       <div className="mt-4">
<MatchesTable
  buyAllRows={bAllRows}
  sellAllRows={sAllRows}
  itemKey={bItemKey || sItemKey}
  labels={C}
  locale={locale}
  stats={EX.stats}
  transportCostPerKm={settings.transportCostPerKm ?? 0} 
/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BUY column */}
        <Column
          title={C.buyTitle}
          side="buy"
          itemKey={bItemKey}
          setItemKey={setBItemKey}
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
          facetsItems={bFacets.items}
          onRefresh={() => {
            reloadBuy().then(() => setLastUpdated(new Date()));
          }}
        />

        {/* SELL column */}
        <Column
          title={C.sellTitle}
          side="sell"
          itemKey={sItemKey}
          setItemKey={setSItemKey}
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
          facetsItems={sFacets.items}
          onRefresh={() => {
            reloadSell().then(() => setLastUpdated(new Date()));
          }}
        />
      </div>
    </div>
  );
}

/* ===================== Column component ===================== */
function Column({
  title,
  side,
  itemKey, // itemNo
  setItemKey,
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
  labels, // C
  stats, // EX.stats
  facetsItems = [],
}) {
  // Filter by selected item (matches normalized `item_name`, which comes from itemNo)
  const filteredData = useMemo(() => {
    const arr = rows?.data || [];
    return itemKey ? arr.filter((r) => String(r.item_name) === String(itemKey)) : arr;
  }, [rows, itemKey]);

  // Sort after filtering
  const sortedData = useMemo(() => {
    const arr = [...filteredData];
    arr.sort(makeComparator(sort));
    return arr;
  }, [filteredData, sort]);

  // Stable row tinting by lineNo
  const colorMap = useMemo(() => {
    const map = new Map();
    for (const r of sortedData) {
      const key = r.lineNo ?? "__none__";
      if (!map.has(key)) {
        map.set(key, paletteColorForKey(key));
      }
    }
    return map;
  }, [sortedData]);

  // Totals for what’s visible (filtered)
  const viewTotals = useMemo(() => sumUp(filteredData), [filteredData]);

  // keep table at least N rows tall (also respects current limit)
  const MIN_ROWS = 8;
  const targetRows = Math.max(limit, MIN_ROWS);
  const padCount = Math.max(0, targetRows - (sortedData?.length || 0));
  // visible columns (vendor/customer removed): 7
  const COLS = 8;

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
      {/* Use viewTotals so chips reflect filtered rows */}
      <Header title={title} totals={viewTotals} locale={locale} stats={stats} />

      {/* Column-specific filters: ONLY ITEM (itemNo) */}
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
          <select
            value={itemKey}
            onChange={(e) => {
              setItemKey(e.target.value); // e.g., "ITEM-00001"
              setPage(1);
              onRefresh();
            }}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm min-w-[16rem]"
            title={labels.headers.item}
          >
            <option value="">{labels.allItems}</option>
            {facetsItems.map((it) => (
              <option key={it.key} value={it.key}>
                {it.name}
              </option>
            ))}
          </select>
        </div>

        {itemKey && (
          <button
            type="button"
            onClick={() => {
              setItemKey("");
              setPage(1);
              onRefresh();
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50"
          >
            {labels.clearItem || "Clear item"}
          </button>
        )}

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
    <SortableTh
      label={labels.headers.lineNo || labels.headers.id}
      sortKey="lineNo"
      sort={sort}
      onSort={onSort}
      className="w-24"
    />
    <SortableTh
      label={labels.headers.item}
      sortKey="item_name"
      sort={sort}
      onSort={onSort}
    />
    {/* NEW: location column */}
    <SortableTh
      label={labels.headers.location || "Location"}
      sortKey="locationLabel"
      sort={sort}
      onSort={onSort}
    />
    <SortableTh
      label={labels.headers.type}
      sortKey="type"
      sort={sort}
      onSort={onSort}
    />
    <SortableTh
      label={labels.headers.qty}
      sortKey="quantity"
      sort={sort}
      onSort={onSort}
      className="text-right"
    />
    <SortableTh
      label={labels.headers.price}
      sortKey="price"
      sort={sort}
      onSort={onSort}
      className="text-right"
    />
    <SortableTh
      label={labels.headers.status}
      sortKey="status"
      sort={sort}
      onSort={onSort}
    />
    <SortableTh
      label={labels.headers.created}
      sortKey="created_at"
      sort={sort}
      onSort={onSort}
    />
  </tr>
</thead>


<tbody>
  {sortedData.length ? (
    sortedData.map((r, idx) => (
      <tr
        key={`${r.lineNo}-${idx}`}
        className={`border-t ${colorMap.get(r.lineNo) ?? ""}`}
      >
        <Td className="font-mono">{r.lineNo || "—"}</Td>
        <Td className="truncate">
          <span className="font-medium">{r.item_name}</span>{" "}
          {r.item_sku ? (
            <span className="text-slate-500">({r.item_sku})</span>
          ) : null}
          <span className="text-slate-400 ml-2">{r.documentNo}</span>
        </Td>

        {/* NEW: location cell */}
        <Td className="truncate">
          <span className="font-medium">
            {r.locationLabel || "—"}
          </span>
        </Td>

        <Td className="uppercase">{r.type}</Td>
        <Td className="text-right">{fmtNum(r.quantity, locale)}</Td>
        <Td className="text-right font-semibold tabular-nums">
          {fmtMoney(r.price, locale, "PLN")}
        </Td>
        <Td>
          {/* status badge as before */}
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
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
        <Td>
          {r.created_at
            ? new Date(r.created_at).toLocaleDateString(locale)
            : "—"}
        </Td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={COLS} className="p-6 text-center text-slate-500">
        {labels.empty}
      </td>
    </tr>
  )}

  {/* padding rows – colSpan already uses COLS, so no change needed here */}
  {Array.from({ length: padCount }).map((_, i) => (
    <tr key={`pad-${i}`} className="border-t">
      <td colSpan={COLS} className="px-4 py-3">
        &nbsp;
      </td>
    </tr>
  ))}
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
            {[8, 20, 50, 100].map((n) => (
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
          <StatChip icon={Banknote} label={stats.notional} value={fmtMoney(notional, locale, "PLN")} />
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
        {active ? (
          sort.dir === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <span className="opacity-30">
            <ChevronUp size={14} />
          </span>
        )}
      </span>
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

/* ===================== sort & sum helpers ===================== */
function sumUp(arr) {
  const count = arr.length;
  const qty = arr.reduce((a, x) => a + (Number(x.quantity) || 0), 0);
  const notional = arr.reduce((a, x) => a + (Number(x.quantity) || 0) * (Number(x.price) || 0), 0);
  return { count, qty, notional };
}
function makeComparator(sort) {
  const { key, dir } = sort || { key: "lineNo", dir: "desc" };
  const mult = dir === "asc" ? 1 : -1;
  return (a, b) => {
    const va = getVal(a, key);
    const vb = getVal(b, key);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  };
}

function paletteColorForKey(key) {
  const palette = [
    "bg-emerald-50",
    "bg-sky-50",
    "bg-amber-50",
    "bg-purple-50",
    "bg-pink-50",
    "bg-cyan-50",
    "bg-lime-50",
    "bg-rose-50",
  ];
  const s = String(key ?? "__none__");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0; // simple stable hash
  }
  return palette[h % palette.length];
}

function getVal(row, key) {
  switch (key) {
    case "lineNo":
      return Number(row.lineNo) || 0;
    case "vendor_name":
      return (row.vendor_name || "").toLowerCase();
    case "customer_name":
      return (row.customer_name || "").toLowerCase();
    case "item_name":
      return (row.item_name || "").toLowerCase(); // itemNo
    case "locationLabel":
      return (row.locationLabel || "").toLowerCase();
    case "type":
      return (row.type || "").toLowerCase();
    case "quantity":
      return Number(row.quantity) || 0;
    case "price":
      return Number(row.price) || 0;
    case "status":
      return (row.status || "").toLowerCase();
    case "created_at":
      return row.created_at ? new Date(row.created_at).getTime() : 0;
    default:
      return "";
  }
}





/**
 * Hungarian algorithm (minimization) for a square cost matrix.
 * Returns array `assignment` where assignment[i] = j (column index) or -1.
 */
function hungarian(costMatrix) {
  const nRows = costMatrix.length;
  if (!nRows) return [];
  const nCols = costMatrix[0].length;
  const n = Math.max(nRows, nCols);

  // Make matrix square with padding
  let maxCost = 0;
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      if (costMatrix[i][j] > maxCost) maxCost = costMatrix[i][j];
    }
  }
  if (!Number.isFinite(maxCost)) maxCost = 0;
  const padCost = maxCost + 1;

  const cost = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i < nRows && j < nCols ? costMatrix[i][j] : padCost
    )
  );

  const u = Array(n + 1).fill(0);
  const v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0);
  const way = Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    const minv = Array(n + 1).fill(Infinity);
    const used = Array(n + 1).fill(false);
    let j0 = 0;

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  // Build assignment for original matrix
  const assignment = Array(nRows).fill(-1);
  for (let j = 1; j <= n; j++) {
    const i = p[j];
    if (i > 0 && i <= nRows && j <= nCols) {
      assignment[i - 1] = j - 1;
    }
  }
  return assignment;
}

/**
 * Hungarian-based global matcher.
 * - Runs per item_name group (so items are not mixed).
 * - Builds profit matrix from all buy/sell blocks for that item.
 * - Converts to cost matrix (maxProfit - profit) for Hungarian.
 * - Keeps only matches with positive profit and positive quantity.
 */
function buildMatchesHungarian(
  buyRows = [],
  sellRows = [],
  options = {}
) {
  const {
    itemKey = "",
    transportMatrix,
    baseTransportPerUnit = 0,
  } = options;

  // 1) Filter: only rows for selected item (if any)
  const buysAll = (buyRows || []).filter((b) =>
    itemKey ? String(b.item_name) === String(itemKey) : true
  );
  const sellsAll = (sellRows || []).filter((s) =>
    itemKey ? String(s.item_name) === String(itemKey) : true
  );

  if (!buysAll.length || !sellsAll.length) return [];

  // 2) Group by item_name, so we never match different items together
  const groupedBuys = new Map();
  for (const b of buysAll) {
    const key = String(b.item_name || "—");
    if (!groupedBuys.has(key)) groupedBuys.set(key, []);
    groupedBuys.get(key).push(b);
  }

  const groupedSells = new Map();
  for (const s of sellsAll) {
    const key = String(s.item_name || "—");
    if (!groupedSells.has(key)) groupedSells.set(key, []);
    groupedSells.get(key).push(s);
  }

  const matches = [];

  for (const [itemName, itemBuys] of groupedBuys.entries()) {
    const itemSells = groupedSells.get(itemName) || [];
    if (!itemSells.length) continue;

    const m = itemBuys.length;
    const n = itemSells.length;
    if (!m || !n) continue;

    // 3) BUILD PROFIT MATRIX
    const profitMatrix = Array.from({ length: m }, () => Array(n).fill(0));
    let maxProfit = -Infinity;

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const { profit } = computeProfitParts(itemBuys[i], itemSells[j], {
          transportMatrix,
          baseTransportPerUnit,
        });
        profitMatrix[i][j] = profit;
        if (profit > maxProfit) maxProfit = profit;
      }
    }

    // If all pairs are strictly loss-making, skip this item
    if (!Number.isFinite(maxProfit) || maxProfit < 0) continue;

    // 4) CONVERT TO COST MATRIX (Hungarian minimizes cost)
    // cost = maxProfit - max(profit, 0)
    const costMatrix = Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const p = profitMatrix[i][j];
        const nonNegProfit = p > 0 ? p : 0;
        return maxProfit - nonNegProfit;
      })
    );

    // 5) RUN HUNGARIAN
    const assignment = hungarian(costMatrix);

    // 6) BUILD MATCH OBJECTS
    for (let i = 0; i < m; i++) {
      const j = assignment[i];
      if (j == null || j < 0 || j >= n) continue;

      const b = itemBuys[i];
      const s = itemSells[j];

      const unitProfit = profitMatrix[i][j];
      if (unitProfit < 0) continue; // allow 0, skip only negative (loss)

      const bQty = Number(b.quantity) || 0;
      const sQty = Number(s.quantity) || 0;
      const matchedQty = Math.min(bQty, sQty);
      if (!matchedQty) continue;

      const buyPrice = Number(b.price) || 0;
      const sellPrice = Number(s.price) || 0;

      const { transportCost, fromRegion, toRegion } = computeProfitParts(b, s, {
        transportMatrix,
        baseTransportPerUnit,
      });

      const spread = unitProfit; // profit per t after transport
      const spreadNotional = matchedQty * spread;

      matches.push({
        item_name: itemName,
        matchedQty,

        buy_price: buyPrice,
        sell_price: sellPrice,
        spread,
        spreadNotional,

        transportCost,
        fromRegion,
        toRegion,

        buy_lineNo: b.lineNo,
        buy_documentNo: b.documentNo,
        buy_status: b.status,
        buy_created_at: b.created_at,
        buy_block: b.block ?? null,

        sell_lineNo: s.lineNo,
        sell_documentNo: s.documentNo,
        sell_status: s.status,
        sell_created_at: s.created_at,
        sell_block: s.block ?? null,

        // locations (labels)
        buy_location: b.locationLabel || null,
        sell_location: s.locationLabel || null,

        // NEW: coordinates (used for distance)
        buy_lat: b.locationLat ?? null,
        buy_lon: b.locationLon ?? null,
        sell_lat: s.locationLat ?? null,
        sell_lon: s.locationLon ?? null,
      });


    }
  }

  return matches;
}


/* ---------- small helpers for MatchesTable ---------- */
function fmtBlock(v) {
  return v === 0 || v ? String(v) : "—";
}

function fmtPct(v, locale) {
  return `${fmtNum(v, locale, { maximumFractionDigits: 2 })}%`;
}

function matchKey(m) {
  return `${m.item_name || ""}::${m.buy_lineNo || ""}::${m.sell_lineNo || ""}`;
}


/* ===================== MatchesTable ===================== */

function MatchesTable({
  buyAllRows,
  sellAllRows,
  itemKey,
  labels,
  locale,
  stats,
  transportCostPerKm, 
}) {
  const [sort, setSort] = useState({ key: "spread", dir: "asc" });
  const [limit, setLimit] = useState(5);
  const [page, setPage] = useState(1);

  // distance cache: { [geoKey]: km }
  const [distanceMap, setDistanceMap] = useState({});

  const allMatchesRaw = useMemo(
    () =>
      buildMatchesHungarian(buyAllRows || [], sellAllRows || [], {
        itemKey,
        // baseTransportPerUnit, transportMatrix can still be passed here if you use them
      }),
    [buyAllRows, sellAllRows, itemKey]
  );

const allMatches = useMemo(() => {
  const rate = Number(transportCostPerKm) || 0;

  return (allMatchesRaw || [])
    .map((m) => {
      const rowKey = `${m.item_name}|${m.buy_lineNo}|${m.sell_lineNo}`;

      const sell = Number(m.sell_price) || 0;
      const buy = Number(m.buy_price) || 0;
      const qty  = Number(m.matchedQty) || 0;

      const hasCoords =
        Number.isFinite(m.buy_lat) &&
        Number.isFinite(m.buy_lon) &&
        Number.isFinite(m.sell_lat) &&
        Number.isFinite(m.sell_lon) &&
        (m.buy_lat !== 0 || m.buy_lon !== 0) &&
        (m.sell_lat !== 0 || m.sell_lon !== 0);

      const geoKey = hasCoords
        ? `${m.buy_lat},${m.buy_lon}|${m.sell_lat},${m.sell_lon}`
        : null;

      const distanceKm =
        geoKey && typeof distanceMap[geoKey] === "number"
          ? distanceMap[geoKey]
          : null;

      // TOTAL transport cost for the whole route (PLN)
      const totalTransportCost =
        Number.isFinite(distanceKm) && rate > 0
          ? distanceKm * rate
          : 0;

      // PER TON (or per unit of quantity)
      const transportCostPerTon =
        qty > 0 ? totalTransportCost / qty : 0;

      const spread = sell - buy - transportCostPerTon;
      const spreadPct = sell ? (spread / sell) * 100 : 0;
      const spreadNotional = qty * spread;

      return {
        ...m,
        rowKey,
        geoKey,
        distanceKm,
        totalTransportCost,           // PLN (total)
        transportCost: transportCostPerTon, // PLN / t
        spread,
        spreadPct,
        spreadNotional,
      };
    })
    .filter((m) => m.spread >= 0);
}, [allMatchesRaw, distanceMap, transportCostPerKm]);


  // Fetch route distance (km) for new coordinate pairs
  useEffect(() => {
    let cancelled = false;

    const toFetch = [];
    for (const m of allMatches) {
      if (!m.geoKey) continue;
      if (distanceMap[m.geoKey] === undefined) {
        console.log("[Distance] New pair", {
          geoKey: m.geoKey,
          fromLat: m.buy_lat,
          fromLon: m.buy_lon,
          toLat: m.sell_lat,
          toLon: m.sell_lon,
        });
        toFetch.push({
          geoKey: m.geoKey,
          fromLat: m.buy_lat,
          fromLon: m.buy_lon,
          toLat: m.sell_lat,
          toLon: m.sell_lon,
        });
      }
    }

    if (!toFetch.length) return;

    (async () => {
      for (const pair of toFetch) {
        try {
          const params = new URLSearchParams({
            fromLat: String(pair.fromLat),
            fromLon: String(pair.fromLon),
            toLat: String(pair.toLat),
            toLon: String(pair.toLon),
          });

          const url = `${API}/api/maps/distance?${params.toString()}`;
          console.log("[Distance] Fetching", url);

          const res = await fetch(url);
          const json = await res.json().catch(() => ({}));

          if (cancelled) return;
          const km =
            json && typeof json.distanceInMeters === "number"
              ? json.distanceInMeters / 1000
              : null;

          setDistanceMap((prev) => ({
            ...prev,
            [pair.geoKey]: Number.isFinite(km) ? km : null,
          }));
        } catch (err) {
          console.error("[Distance] Error for", pair.geoKey, err);
          if (cancelled) return;
          setDistanceMap((prev) => ({
            ...prev,
            [pair.geoKey]: null,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allMatches, distanceMap]);

  const sorted = useMemo(() => {
    const arr = [...allMatches];
    const mult = sort.dir === "asc" ? 1 : -1;

    const get = (r, k) => {
      switch (k) {
        case "item_name":
          return (r.item_name || "").toLowerCase();
        case "matchedQty":
          return Number(r.matchedQty) || 0;
        case "buy_price":
          return Number(r.buy_price) || 0;
        case "sell_price":
          return Number(r.sell_price) || 0;
        case "spread":
          return Number(r.spread) || 0;
        case "spreadNotional":
          return Number(r.spreadNotional) || 0;
        case "spreadPct":
          return Number(r.spreadPct) || 0;
        case "totalTransportCost":
        return Number(r.totalTransportCost ?? 0);
        case "transportCost":
          return Number(r.transportCost ?? 0);
        case "buy_lineNo":
          return Number(r.buy_lineNo) || 0;
        case "sell_lineNo":
          return Number(r.sell_lineNo) || 0;
        case "buy_block":
          return r.buy_block ?? -Infinity;
        case "sell_block":
          return r.sell_block ?? -Infinity;
        case "buy_location":
          return (r.buy_location || "").toLowerCase();
        case "sell_location":
          return (r.sell_location || "").toLowerCase();
        case "distanceKm":
          return Number.isFinite(r.distanceKm) ? Number(r.distanceKm) : Infinity;
        default:
          return "";
      }
    };

    arr.sort((a, b) => {
      const va = get(a, sort.key);
      const vb = get(b, sort.key);
      if (va < vb) return -1 * mult;
      if (va > vb) return 1 * mult;
      return 0;
    });
    return arr;
  }, [allMatches, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / limit));
  const curPage = Math.min(page, pages);
  const start = (curPage - 1) * limit;
  const pageRows = sorted.slice(start, start + limit);

  const totalMatches = allMatches.length;
  const totalQty = allMatches.reduce(
    (a, x) => a + (Number(x.matchedQty) || 0),
    0
  );
  const totalSpreadNotional = allMatches.reduce(
    (a, x) => a + (Number(x.spreadNotional) || 0),
    0
  );

  const onSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  };

  const Th = ({ label, k, className = "" }) => (
    <th
      className={`text-left px-4 py-3 font-medium select-none cursor-pointer ${className}`}
      onClick={() => onSort(k)}
      title="Click to sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === k ? (
          sort.dir === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <span className="opacity-30">
            <ChevronUp size={14} />
          </span>
        )}
      </span>
    </th>
  );

  const spreadClass = (spread) =>
    spread > 0
      ? "bg-green-50 text-green-700 border border-green-200"
      : spread < 0
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-slate-100 text-slate-700 border border-slate-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
              <ArrowLeftRight size={14} className="text-slate-600" />
            </span>
            Buy / Sell Matches
          </h3>
          <div className="flex items-center gap-2">
            <StatChip
              icon={ListOrdered}
              label="Pairs"
              value={fmtNum(totalMatches, locale)}
            />
            <StatChip
              icon={Scale}
              label="Matched Qty"
              value={fmtNum(totalQty, locale)}
            />
            <StatChip
              icon={Banknote}
              label="Spread PLN"
              value={fmtMoney(totalSpreadNotional, locale, "PLN")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
<thead className="bg-slate-50 text-slate-600">
  <tr>
    <Th label={labels.headers.item} k="item_name" />
    <Th label="Buy Location" k="buy_location" />
    <Th label="Sell Location" k="sell_location" />
    <Th
      label="Distance"
      k="distanceKm"
      className="text-right"
    />
    {/* NEW: total + per-ton */}
    <Th
      label="Transport"
      k="totalTransportCost"
      className="text-right"
    />
    <Th
      label="Transport / t"
      k="transportCost"
      className="text-right"
    />
    <Th
      label=" Quantity"
      k="matchedQty"
      className="text-right"
    />
    <Th
      label={`Buy ${labels.headers.price}`}
      k="buy_price"
      className="text-right"
    />
    <Th
      label={`Sell ${labels.headers.price}`}
      k="sell_price"
      className="text-right"
    />
    <Th label="Spread" k="spread" className="text-right" />
    <Th label="Spread %" k="spreadPct" className="text-right" />
    <Th
      label="Spread × Qty"
      k="spreadNotional"
      className="text-right"
    />
    <Th
      label={`Buy ${labels.headers.lineNo || labels.headers.id}`}
      k="buy_lineNo"
    />
    <Th
      label={`Sell ${labels.headers.lineNo || labels.headers.id}`}
      k="sell_lineNo"
    />
  </tr>
</thead>


          <tbody>
            {pageRows.length ? (
              pageRows.map((r, i) => (
                <tr key={`${r.rowKey}-${i}`} className="border-t">
                  <Td className="truncate">
                    <span className="font-medium">{r.item_name}</span>
                    <span className="text-slate-400 ml-2">
                      B:{r.buy_documentNo} · S:{r.sell_documentNo}
                    </span>
                  </Td>

                  <Td className="truncate">{r.buy_location || "—"}</Td>
                  <Td className="truncate">{r.sell_location || "—"}</Td>
                     <Td className="text-right">
                    {r.geoKey
                      ? r.distanceKm == null
                        ? "…"
                        : `${fmtNum(r.distanceKm, locale, {
                            maximumFractionDigits: 1,
                          })} km`
                      : "n/a"}
                  </Td>
{/* NEW: total transport (PLN) */}
<Td className="text-right tabular-nums">
  {fmtMoney(r.totalTransportCost ?? 0, locale, "PLN")}
</Td>

{/* per ton (PLN/t) */}
<Td className="text-right tabular-nums">
  {fmtMoney(r.transportCost ?? 0, locale, "PLN")}
</Td>

                  <Td className="text-right">
                    {fmtNum(r.matchedQty, locale)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {fmtMoney(r.buy_price, locale, "PLN")}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {fmtMoney(r.sell_price, locale, "PLN")}
                  </Td>

                  <Td className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${spreadClass(
                        r.spread
                      )}`}
                    >
                      {fmtMoney(r.spread, locale, "PLN")}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${spreadClass(
                        r.spread
                      )}`}
                    >
                      {fmtPct(r.spreadPct, locale)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${spreadClass(
                        r.spread
                      )}`}
                    >
                      {fmtMoney(r.spreadNotional, locale, "PLN")}
                    </span>
                  </Td>
                  <Td className="font-mono">{r.buy_lineNo}</Td>
                  <Td className="font-mono">{r.sell_lineNo}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="p-6 text-center text-slate-500">
                  No matches for current data/filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
        <div className="text-xs text-slate-500">
          Showing {fmtNum(pageRows.length, locale)} of{" "}
          {fmtNum(sorted.length, locale)} pairs
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
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{`Per page: ${n}`}</option>
            ))}
          </select>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={curPage <= 1}
          >
            Prev
          </button>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={curPage >= pages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}