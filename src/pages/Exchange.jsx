  import { useEffect, useMemo, useRef, useState } from "react";
  import { RefreshCcw, ChevronUp, ChevronDown, Search } from "lucide-react";
  import { useI18n, fmtMoney, fmtNum } from "../helpers/i18n";
  import {
    ListOrdered,
    Scale,
    Banknote,
    ArrowLeftRight,
    Info,
  } from "lucide-react";

  const API =
    process.env.REACT_APP_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://api.217.154.88.40.sslip.io");

  /* ---------- helpers: priority ---------- */
  const PRIORITY_META = {
    0: {
      label: "0",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
    },
    1: {
      label: "1",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    2: {
      label: "2",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
  };

  function PriorityBadge({ value }) {
    const n = Number(value);
    const meta = PRIORITY_META[Number.isFinite(n) ? n : 0] || PRIORITY_META[0];
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold border ${meta.cls}`}>
        {meta.label}
      </span>
    );
  }

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
      throw new Error(
        `${res.status} ${res.statusText} @ ${url} · ${body.slice(0, 120)}`
      );
    }
    if (!ct.includes("application/json")) {
      const body = await readBodyAsText(res);
      throw new Error(
        `Expected JSON, got ${ct || "unknown"} @ ${url} · status ${
          res.status
        } · first 120: ${body.slice(0, 120)}`
      );
    }
    return res.json();
  }

  /* ---------- helpers: road distance (Azure Maps via backend) ---------- */
  async function fetchRoadDistanceKm(fromLat, fromLon, toLat, toLon) {
    const params = new URLSearchParams({
      fromLat: String(fromLat),
      fromLon: String(fromLon),
      toLat: String(toLat),
      toLon: String(toLon),
    });

    const url = `${API}/api/maps/distance?${params.toString()}`;
    const res = await fetch(url);
    const json = await safeJson(res, url);

    // backend returns distanceInMeters (and we also accept distanceKm if present)
    const km =
      Number(json.distanceKm) ||
      (Number.isFinite(Number(json.distanceInMeters))
        ? Number(json.distanceInMeters) / 1000
        : NaN);

    return Number.isFinite(km) ? km : null;
  }

  const ROAD_DISTANCE_CACHE = new Map(); // key -> number|null

  function makePairKey(aLat, aLon, bLat, bLon) {
    if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return null;
    return `${aLat.toFixed(6)},${aLon.toFixed(6)}|${bLat.toFixed(6)},${bLon.toFixed(6)}`;
  }

  // Small concurrency helper to avoid spamming the API
  async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    }

    const workers = Array.from({ length: Math.max(1, limit) }, worker);
    await Promise.all(workers);
    return results;
  }


  /**
   * Normalize purchase/sales *block* rows into a common shape.
   * Includes `block` and a best-effort `region` used for transport costs.
   */
  function normalizeBlockRow(r, side = "sell") {
    const qty = Number(r.quantity ?? r.qty ?? 0) || 0;

    const blockVal =
      r.block != null
        ? Number(r.block)
        : r.blockNo != null
        ? Number(r.blockNo)
        : r.block_no != null
        ? Number(r.block_no)
        : null;

    const locName = r.locationName || r.location_name || r.locName || null;

    const locCity = r.locationCity || r.location_city || r.city || null;

    const locPostCode =
      r.locationPostCode ||
      r.location_post_code ||
      r.postCode ||
      r.post_code ||
      null;

    const locCountry =
      r.locationCountryCode ||
      r.location_country_code ||
      r.countryCode ||
      r.country ||
      null;

    const locationLabel = [locPostCode, locCity, locCountry]
      .filter(Boolean)
      .join(" · ");

    const locLat = Number(r.locationLat ?? r.location_lat ?? r.lat ?? null);
    const locLon = Number(r.locationLon ?? r.location_lon ?? r.lon ?? null);

    const region =
      r.locationRegion ||
      r.region ||
      (side === "buy"
        ? r.buyVendorRegion || r.vendorRegion
        : r.sellCustomerRegion || r.customerRegion) ||
      null;

    // lineValue + dueDate (needed for factoring)
    const lineValue = Number(r.lineValue ?? r.line_value ?? 0) || 0;
    const dueDate = r.dueDate || r.due_date || null;

    // location costs (for additionalLocationCost)
    const loadingCost =
      Number(r.locationLoadingCost ?? r.loadingCost ?? r.loading_cost ?? 0) || 0;
    const unloadingCost =
      Number(
        r.locationUnloadingCost ?? r.unloadingCost ?? r.unloading_cost ?? 0
      ) || 0;
    const loadingCostRisk =
      Number(
        r.locationLoadingCostRisk ?? r.loadingCostRisk ?? r.loading_cost_risk ?? 0
      ) || 0;
    const unloadingCostRisk =
      Number(
        r.locationUnloadingCostRisk ??
          r.unloadingCostRisk ??
          r.unloading_cost_risk ??
          0
      ) || 0;

    // user/commission (used for sales commission AND purchase commission)
    const userCreated =
      (r.userCreated || r.user_created || r.createdBy || "")
        .toString()
        .toLowerCase() || null;
    const userCommissionPercent =
      Number(
        r.userCommissionPercent ??
          r.user_commission_percent ??
          r.commissionPercent ??
          0
      ) || 0;
    const userName = r.userName || r.user_name || null;
    const priority = Number(r.priority ?? r.prio ?? r.priorityNo ?? 0) || 0;


    // transport fields (kept as before)
    const transportTotal =
      Number(r.transportTotal ?? r.transportCost ?? r.transport_total ?? 0) || 0;
    const transportPerUnit =
      Number(r.transportPerUnit ?? r.transport_per_unit ?? 0) || 0;

    const partyBuy = r.vendor_name || r.buyVendorName || r.vendorName || null;

    const partySell =
      r.customer_name || r.sellCustomerName || r.customerName || null;

    return {
      lineNo: Number(
        r.lineNo ?? r.documentLineNo ?? r.line_no ?? r.line_number ?? r.id ?? 0
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

      // ✅ needed for factoring + commissions
      lineValue,
      dueDate,

      // ✅ needed for additionalLocationCost tooltip
      loadingCost,
      unloadingCost,
      loadingCostRisk,
      unloadingCostRisk,

      // ✅ needed for sales commission (sell) + purchase commission (buy)
      userCreated,
      userCommissionPercent,
      userName,

      priority,

      status: (r.status || "new").toString().toLowerCase(),
      created_at: r.createdAt || r.dateCreated || r.created_at || null,
      documentNo: r.documentNo || r.doc_no || "—",
    };
  }

  function geoDistanceKm(lat1, lon1, lat2, lon2) {
    if (
      !Number.isFinite(lat1) ||
      !Number.isFinite(lon1) ||
      !Number.isFinite(lat2) ||
      !Number.isFinite(lon2)
    ) {
      return null;
    }

    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Compute unit profit between a buy block and a sell block.
   * NOTE: Transport here is still the per-ton transport used by your matching logic.
   * IMPORTANT: We are NOT adding location costs to transportCost/profit (per your request).
   */
  function computeProfitParts(b, s, opts = {}) {
    const {
      transportMatrix,
      baseTransportPerUnit = 0,
      costPerKm = 0, // PLN per km
      distanceKmOverride,
    } = opts;

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

    // Optional region→region matrix
    const defaultTransportMatrix = {
      A: { A: 10, B: 25, C: 30 },
      B: { A: 20, B: 10, C: 35 },
    };
    const matrix = transportMatrix || defaultTransportMatrix;

    let matrixCost = 0;
    if (
      fromRegion &&
      toRegion &&
      matrix[fromRegion] &&
      matrix[fromRegion][toRegion] != null
    ) {
      matrixCost = Number(matrix[fromRegion][toRegion]) || 0;
    }

    // SELL BLOCK transport / t (normalized from block)
    const sellBlockTransport = Number(s.transportPerUnit) || 0;

    // Base + matrix + block transport (per ton)
    let transportCost = matrixCost + baseTransportPerUnit + sellBlockTransport;

    // distance-based cost / t (this is what you already had)
    let distanceKm = null;
    if (costPerKm > 0) {
      distanceKm = Number.isFinite(distanceKmOverride)
        ? distanceKmOverride
        : geoDistanceKm(
            b.locationLat,
            b.locationLon,
            s.locationLat,
            s.locationLon
          );
      if (Number.isFinite(distanceKm)) {
        const bQty = Number(b.quantity) || 0;
        const sQty = Number(s.quantity) || 0;
        const qty = Math.min(bQty, sQty) || 1;

        const totalDistanceCost = distanceKm * costPerKm; // PLN total
        const distanceCostPerTon = totalDistanceCost / qty; // PLN/t

        transportCost += distanceCostPerTon;
      }
    }

    const profit = sellPrice - buyPrice - transportCost;

    return { profit, transportCost, fromRegion, toRegion, distanceKm };
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

    const [itemsCatalog, setItemsCatalog] = useState([]);
    const [settings, setSettings] = useState({ transportCostPerKm: 0 });

    // BUY state
    const [bItemKey, setBItemKey] = useState("");
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

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [errMsg, setErrMsg] = useState("");

    const [bAllRows, setBAllRows] = useState([]);
    const [sAllRows, setSAllRows] = useState([]);
    const PCT_5 = { minimumFractionDigits: 5, maximumFractionDigits: 5 };

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

    // Duplicate catalog load (kept as in your file)
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

    // Load transportCostPerKm from settings
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

    const buildParams = (side) => {
      const isBuy = side === "buy";
      const params = new URLSearchParams({
        page: String(isBuy ? bPage : sPage),
        limit: String(isBuy ? bLimit : sLimit),
      });

      const itemKey = isBuy ? bItemKey : sItemKey;
      if (itemKey) {
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
        setErrMsg(
          `Failed to load ${isBuy ? "purchase" : "sales"} blocks: ${e.message}`
        );
        if (isBuy) setBData({ data: [], total: 0, pages: 0, page: 1 });
        else setSData({ data: [], total: 0, pages: 0, page: 1 });
      }
    };

    const fetchTotalsAndFacets = async (side) => {
      const isBuy = side === "buy";
      const params = buildParams(side);
      params.set("page", "1");
      params.set("limit", "10000");

      const ep = isBuy ? ENDPOINT.buy : ENDPOINT.sell;
      const url = `${API}/api/${ep}?${params.toString()}`;

      try {
        const res = await fetch(url);
        const json = await safeJson(res, url);
        const norm = (json?.data || []).map((r) => normalizeBlockRow(r, side));

        if (isBuy) setBAllRows(norm);
        else setSAllRows(norm);

        const sum = sumUp(norm);
        if (isBuy) setBTotals(sum);
        else setSTotals(sum);

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

    useEffect(() => {
      reloadBoth();
      // eslint-disable-next-line
    }, []);

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
        {errMsg ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errMsg}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
          <div>
            {EX.topbar.lastUpdate}:{" "}
            <b>{lastUpdated ? lastUpdated.toLocaleTimeString(locale) : "—"}</b>
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
            {loading && (
              <span className="text-slate-400">{EX.topbar.loading}</span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <MatchesTable
            buyAllRows={bAllRows}
            sellAllRows={sAllRows}
            itemKey={bItemKey || sItemKey}
            labels={C}
            locale={locale}
            stats={EX.stats}
            transportCostPerKm={settings.transportCostPerKm ?? 0}
            factoringFeePercent={settings.factoringFeePercent ?? 0}
            administrativeFee={settings.administrativeFee ?? 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
    itemKey,
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
    labels,
    stats,
    facetsItems = [],
  }) {
    const filteredData = useMemo(() => {
      const arr = rows?.data || [];
      return itemKey
        ? arr.filter((r) => String(r.item_name) === String(itemKey))
        : arr;
    }, [rows, itemKey]);

    const sortedData = useMemo(() => {
      const arr = [...filteredData];
      arr.sort(makeComparator(sort));
      return arr;
    }, [filteredData, sort]);

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

    const viewTotals = useMemo(() => sumUp(filteredData), [filteredData]);

    const MIN_ROWS = 8;
    const targetRows = Math.max(limit, MIN_ROWS);
    const padCount = Math.max(0, targetRows - (sortedData?.length || 0));
    const COLS = 9;

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
        <Header title={title} totals={viewTotals} locale={locale} stats={stats} />

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
                setItemKey(e.target.value);
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
                  label={labels.headers.priority || "Priority"}
                  sortKey="priority"
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
                      <PriorityBadge value={r.priority} />
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
  function Header({ title, totals, locale, stats, isMatching = false, matchError = null }) {
    const { count = 0, qty = 0, notional = 0 } = totals || {};
    return (
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{title}</h3>

          <div className="flex items-center gap-2">
            <StatChip
              icon={ListOrdered}
              label={stats.count}
              value={fmtNum(count, locale)}
            />
            <StatChip
              icon={Scale}
              label={stats.qty}
              value={fmtNum(qty, locale)}
            />
            <StatChip
              icon={Banknote}
              label={stats.notional}
              value={fmtMoney(notional, locale, "PLN")}
            />
          </div>
  {(isMatching || matchError) && (
    <div className="mt-2 text-xs">
      {isMatching ? (
        <span className="text-slate-600">
          Calculating road distance and recalculating costs…
        </span>
      ) : (
        <span className="text-red-600">{matchError}</span>
      )}
    </div>
  )}

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
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            {label}
          </div>
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
    const notional = arr.reduce(
      (a, x) => a + (Number(x.quantity) || 0) * (Number(x.price) || 0),
      0
    );
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
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
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
        return (row.item_name || "").toLowerCase();
      case "locationLabel":
        return (row.locationLabel || "").toLowerCase();
      case "type":
        return (row.type || "").toLowerCase();
      case "quantity":
        return Number(row.quantity) || 0;
      case "price":
        return Number(row.price) || 0;

      case "priority":
        return Number(row.priority) || 0;

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

    const assignment = Array(nRows).fill(-1);
    for (let j = 1; j <= n; j++) {
      const i = p[j];
      if (i > 0 && i <= nRows && j <= nCols) {
        assignment[i - 1] = j - 1;
      }
    }
    return assignment;
  }

  function daysUntil(dateLike) {
    if (!dateLike) return 0;
    const due = new Date(dateLike);
    if (Number.isNaN(due.getTime())) return 0;
    const ms = due.getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0; // clamp at 0
  }

  /**
   * Hungarian-based global matcher.
   */
  async function buildMatchesHungarian(buyRows = [], sellRows = [], options = {}) {
    const {
      itemKey = "",
      transportMatrix,
      baseTransportPerUnit = 0,
      costPerKm = 0,
      factoringFeePercent = 0,
      administrativeFee = 0, // from settings
    } = options;

    const debugExclusions = [];

    const buysAll = (buyRows || []).filter((b) =>
      itemKey ? String(b.item_name) === String(itemKey) : true
    );
    const sellsAll = (sellRows || []).filter((s) =>
      itemKey ? String(s.item_name) === String(itemKey) : true
    );

    if (!buysAll.length || !sellsAll.length) {
      debugExclusions.push({
        reason: "no_buys_or_sells_after_filter",
        itemKey: itemKey || null,
        buyCount: buysAll.length,
        sellCount: sellsAll.length,
      });

      if (debugExclusions.length) {
        console.groupCollapsed("[Exchange.match] Excluded matches");
        debugExclusions.forEach((row, idx) => console.log(idx + 1, row));
        console.groupEnd();
      }

      return [];
    }

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
      if (!itemSells.length) {
        debugExclusions.push({
          reason: "no_sells_for_item",
          itemName,
          buyCount: itemBuys.length,
          sellCount: 0,
        });
        continue;
      }

      const m = itemBuys.length;
      const n = itemSells.length;
      if (!m || !n) continue;
  // Prefetch road distances for this item group (so we compute correct costs from the start)
  if (costPerKm > 0) {
    const uniquePairs = new Map(); // key -> coords

    for (let i = 0; i < m; i++) {
      const b = itemBuys[i];
      const aLat = Number(b.locationLat);
      const aLon = Number(b.locationLon);

      for (let j = 0; j < n; j++) {
        const s = itemSells[j];
        const bLat = Number(s.locationLat);
        const bLon = Number(s.locationLon);

        const key = makePairKey(aLat, aLon, bLat, bLon);
        if (!key) continue;

        if (ROAD_DISTANCE_CACHE.has(key)) continue;
        if (uniquePairs.has(key)) continue;

        uniquePairs.set(key, { key, aLat, aLon, bLat, bLon });
      }
    }

    const pending = Array.from(uniquePairs.values());
    if (pending.length) {
      await mapLimit(pending, 6, async (p) => {
        try {
          const km = await fetchRoadDistanceKm(p.aLat, p.aLon, p.bLat, p.bLon);
          ROAD_DISTANCE_CACHE.set(p.key, km);
        } catch (e) {
          // store null to avoid endless retries
          ROAD_DISTANCE_CACHE.set(p.key, null);
        }
      });
    }
  }


      const profitMatrix = Array.from({ length: m }, () => Array(n).fill(0));
      let maxProfit = -Infinity;

      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          const b = itemBuys[i];
  const s = itemSells[j];

  const key = makePairKey(
    Number(b.locationLat),
    Number(b.locationLon),
    Number(s.locationLat),
    Number(s.locationLon)
  );
  const distanceKmOverride =
    costPerKm > 0 && key ? ROAD_DISTANCE_CACHE.get(key) : undefined;

  const { profit } = computeProfitParts(b, s, {
    transportMatrix,
    baseTransportPerUnit,
    costPerKm,
    distanceKmOverride,
  });
          profitMatrix[i][j] = profit;
          if (profit > maxProfit) maxProfit = profit;
        }
      }

      if (!Number.isFinite(maxProfit) || maxProfit < 0) {
        debugExclusions.push({
          reason: "all_pairs_loss_making_for_item",
          itemName,
          maxProfit,
        });
        continue;
      }

      const costMatrix = Array.from({ length: m }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
          const p = profitMatrix[i][j];
          const nonNegProfit = p > 0 ? p : 0;
          return maxProfit - nonNegProfit;
        })
      );

      const assignment = hungarian(costMatrix);

      for (let i = 0; i < m; i++) {
        const j = assignment[i];
        const b = itemBuys[i];
        const s = j != null && j >= 0 && j < n ? itemSells[j] : null;
        if (!s) continue;

        const unitProfit = profitMatrix[i][j];
        if (unitProfit < 0) continue;

        const bQty = Number(b.quantity) || 0;
        const sQty = Number(s.quantity) || 0;
        const matchedQty = Math.min(bQty, sQty);
        if (!matchedQty) continue;

        const buyPrice = Number(b.price) || 0;
        const sellPrice = Number(s.price) || 0;

        const key = makePairKey(
    Number(b.locationLat),
    Number(b.locationLon),
    Number(s.locationLat),
    Number(s.locationLon)
  );
  const distanceKmOverride = key ? ROAD_DISTANCE_CACHE.get(key) : undefined;

  const { transportCost, fromRegion, toRegion, distanceKm } =
    computeProfitParts(b, s, {
      transportMatrix,
      baseTransportPerUnit,
      costPerKm,
      distanceKmOverride,
    });

  // =========================================================
        // LOCATION COSTS RULE
        // =========================================================
        const buyLocExtra =
          (Number(b.loadingCost) || 0) + (Number(b.loadingCostRisk) || 0);

        const sellLocExtra =
          (Number(s.unloadingCost) || 0) + (Number(s.unloadingCostRisk) || 0);

        const additionalLocationCost = buyLocExtra + sellLocExtra;

        // -------------------------
        // FACTORING
        // -------------------------
        const daysToDue = daysUntil(s.dueDate);

        const sellLineValueTotal = Number(s.lineValue) || 0;
        const sellQtyTotal = Number(s.quantity) || 0;
        const matchedLineValue =
          sellQtyTotal > 0 ? (sellLineValueTotal * matchedQty) / sellQtyTotal : 0;

        const feePercent = Number(factoringFeePercent) || 0;
        const feePct = feePercent / 100;

        const factoringCost = matchedLineValue * feePct * daysToDue;

        const salesMatchedValue = matchedLineValue;

        const buyLineValueTotal = Number(b.lineValue) || 0;
        const buyQtyTotal = Number(b.quantity) || 0;
        const buyMatchedValue =
          buyQtyTotal > 0 ? (buyLineValueTotal * matchedQty) / buyQtyTotal : 0;

        // =========================
        // ADMIN FEE
        // =========================
        const adminFee = Number(administrativeFee) || 0;

        const distanceTransportCost = Number.isFinite(distanceKm)
          ? (Number(distanceKm) || 0) * (Number(costPerKm) || 0)
          : 0;

        // ✅ Additional cost column = location extras + admin fee
        const additionalCost =
          (Number(additionalLocationCost) || 0) + (Number(adminFee) || 0);

        // ✅ FIX: Main cost must start from Additional cost (NOT location-only)
        // mainCost = additionalCost + factoring + transport
        const mainCost =
          (Number(additionalCost) || 0) +
          (Number(factoringCost) || 0) +
          (Number(distanceTransportCost) || 0);

        // ✅ FIX: do NOT add admin fee again (already inside mainCost)
        const commissionBase =
          (Number(salesMatchedValue) || 0) -
          (Number(buyMatchedValue) || 0) -
          (Number(mainCost) || 0);

        const salesCommissionPercent = Number(s.userCommissionPercent ?? 0) || 0;
        const salesCommission = commissionBase * (salesCommissionPercent / 100);

        const purchaseCommissionPercent =
          Number(b.userCommissionPercent ?? 0) || 0;
        const purchaseCommission =
          commissionBase * (purchaseCommissionPercent / 100);

        // ✅ FIX: Total cost = mainCost + commissions (admin already included)
        const totalCost =
          (Number(mainCost) || 0) +
          (Number(salesCommission) || 0) +
          (Number(purchaseCommission) || 0);

        const costPerTon = matchedQty ? (Number(totalCost) || 0) / matchedQty : 0;

        const spread =
          (Number(sellPrice) || 0) - (Number(buyPrice) || 0) - costPerTon;

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
          distanceKm,

          additionalLocationCost,
          additionalCost,

          distanceTransportCost,

          additionalLocationCostDetails: {
            buy: {
              loadingCost: Number(b.loadingCost) || 0,
              unloadingCost: Number(b.unloadingCost) || 0,
              loadingCostRisk: Number(b.loadingCostRisk) || 0,
              unloadingCostRisk: Number(b.unloadingCostRisk) || 0,
              total: buyLocExtra,
            },
            sell: {
              loadingCost: Number(s.loadingCost) || 0,
              unloadingCost: Number(s.unloadingCost) || 0,
              loadingCostRisk: Number(s.loadingCostRisk) || 0,
              unloadingCostRisk: Number(s.unloadingCostRisk) || 0,
              total: sellLocExtra,
            },
            total: additionalLocationCost,
          },

          factoringCost,
          factoringFeePercentUsed: feePercent,
          factoringDaysToDue: daysToDue,
          factoringDueDate: s.dueDate ?? null,
          factoringSellLineValueTotal: sellLineValueTotal,
          factoringSellQtyTotal: sellQtyTotal,
          factoringMatchedLineValue: matchedLineValue,

          administrativeFeeUsed: adminFee,
          mainCost,

          buy_lineNo: b.lineNo,
          buy_documentNo: b.documentNo,
          buy_status: b.status,
          buy_created_at: b.created_at,
          buy_block: b.block ?? null,

          buy_priority: b.priority ?? 0,

                  sell_lineNo: s.lineNo,
          sell_documentNo: s.documentNo,
          sell_status: s.status,
          sell_created_at: s.created_at,
          sell_block: s.block ?? null,

          sell_priority: s.priority ?? 0,

                  buy_location: b.locationLabel || null,
          sell_location: s.locationLabel || null,

          buy_lat: b.locationLat ?? null,
          buy_lon: b.locationLon ?? null,
          sell_lat: s.locationLat ?? null,
          sell_lon: s.locationLon ?? null,

          salesCommission,
          commissionPercentUsed: salesCommissionPercent,
          commissionBase,
          salesMatchedValue,
          buyMatchedValue,
          commissionUserEmail: s.userCreated ?? null,
          commissionUserName: s.userName ?? null,

          purchaseCommission,
          purchaseCommissionPercentUsed: purchaseCommissionPercent,
          purchaseCommissionUserEmail: b.userCreated ?? null,
          purchaseCommissionUserName: b.userName ?? null,

          totalCost,
        });
      }
    }

    if (debugExclusions.length) {
      console.groupCollapsed(
        "[Exchange.match] Excluded matches (reason + context)"
      );
      debugExclusions.forEach((row, idx) => console.log(idx + 1, row));
      console.groupEnd();
    }

    return matches;
  }

  /**
 * Apply priority logic ON TOP of already-computed Hungarian matches.
 * No cost/spread recalculation here — we only select/reorder.
 *
 * Strategy (per item):
 * 1) pick matches with SELL priority 2 then 1 (best profit first)
 * 2) then pick matches with BUY priority 2 then 1 (best profit first)
 * 3) (optional) include prio=0 matches if includeZero=true
 *
 * Uniqueness is enforced by blocks (fallback to lineNo if block missing).
 */


  /* ---------- small helpers for MatchesTable ---------- */
  function fmtPct(v, locale) {
    return `${fmtNum(v, locale, { maximumFractionDigits: 2 })}%`;
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
    factoringFeePercent,
    administrativeFee,
  }) {
    const [sort, setSort] = useState({ key: "spread", dir: "asc" });
    const [limit, setLimit] = useState(5);
    const [page, setPage] = useState(1);

    const [allMatchesRaw, setAllMatchesRaw] = useState([]);
    const [isMatching, setIsMatching] = useState(false);
    const [matchError, setMatchError] = useState(null);

    // ✅ NEW: priority overlay on top of Hungarian (no recalculation)
    const [mode, setMode] = useState("hungarian"); // "hungarian" | "priority"
    const [prioMatchesRaw, setPrioMatchesRaw] = useState([]);

function applyPriorityOnHungarianMatches(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const profitable = rows.filter((m) => Number(m?.spread) >= 0);

  // ✅ composite unique keys (schema identity)
  const buyKeyOf = (m) =>
    `${m.buy_documentNo}|${m.buy_lineNo}|${m.buy_block}`;
  const sellKeyOf = (m) =>
    `${m.sell_documentNo}|${m.sell_lineNo}|${m.sell_block}`;

  // Group by item_name (don’t mix products)
  const byItem = new Map();
  for (const m of profitable) {
    const item = String(m.item_name || "—");
    if (!byItem.has(item)) byItem.set(item, []);
    byItem.get(item).push(m);
  }

  const out = [];

  for (const [, itemMatches] of byItem.entries()) {
    // 1) dedupe by (buyKey + sellKey) so we never keep duplicates
    const byPair = new Map();
    for (const m of itemMatches) {
      if (m.buy_block == null || m.sell_block == null) continue;

      const qty = Number(m.matchedQty) || 0;
      const spread = Number(m.spread) || 0;
      const metric = Number(m.spreadNotional) || qty * spread || 0;

      const pairKey = `${buyKeyOf(m)}||${sellKeyOf(m)}`;
      const prev = byPair.get(pairKey);
      if (!prev || metric > prev.__metric) {
        byPair.set(pairKey, { ...m, __metric: metric });
      }
    }

    const candidates = Array.from(byPair.values());

    // 2) OPTIONAL strict filter: if you want to hide any side with priority=0
    //    (uncomment if that’s your rule)
    // const filteredCandidates = candidates.filter(
    //   (m) => Number(m.buy_priority || 0) > 0 && Number(m.sell_priority || 0) > 0
    // );
    // const pool = filteredCandidates;

    const pool = candidates.filter(
  (m) => Number(m.buy_priority || 0) > 0 && Number(m.sell_priority || 0) > 0
);

    // 3) Priority “matrix” ordering:
    //    sort by priority-combo first, then by profit
    pool.sort((a, b) => {
      const aBuy = Number(a.buy_priority || 0);
      const aSell = Number(a.sell_priority || 0);
      const bBuy = Number(b.buy_priority || 0);
      const bSell = Number(b.sell_priority || 0);

      // highest min(prio) first (so (2,1) > (2,0))
      const aMin = Math.min(aBuy, aSell);
      const bMin = Math.min(bBuy, bSell);
      if (bMin !== aMin) return bMin - aMin;

      // then highest max(prio)
      const aMax = Math.max(aBuy, aSell);
      const bMax = Math.max(bBuy, bSell);
      if (bMax !== aMax) return bMax - aMax;

      // then best profit
      return (b.__metric || 0) - (a.__metric || 0);
    });

    // 4) enforce uniqueness by composite buy/sell keys
    const usedBuy = new Set();
    const usedSell = new Set();

    for (const m of pool) {
      const bk = buyKeyOf(m);
      const sk = sellKeyOf(m);
      if (usedBuy.has(bk) || usedSell.has(sk)) continue;
      usedBuy.add(bk);
      usedSell.add(sk);
      out.push(m);
    }
  }

  return out.map((m, i) => ({ ...m, prioOrder: i + 1 }));
}


    const applyPrio = () => {
      const filtered = applyPriorityOnHungarianMatches(allMatchesRaw);
      setPrioMatchesRaw(filtered);
      setMode("priority");
      setPage(1);
      setSort({ key: "prioOrder", dir: "asc" });
    };

    const showHungarian = () => {
      setMode("hungarian");
      setPage(1);
      setSort((prev) => (prev.key === "prioOrder" ? { key: "spread", dir: "asc" } : prev));
    };

    useEffect(() => {
      let cancelled = false;

      (async () => {
        try {
          setIsMatching(true);
          setAllMatchesRaw([]);
          setMatchError(null);

          const res = await buildMatchesHungarian(buyAllRows || [], sellAllRows || [], {
            itemKey,
            costPerKm: transportCostPerKm,
            factoringFeePercent,
            administrativeFee,
          });

          if (cancelled) return;
          setAllMatchesRaw(Array.isArray(res) ? res : []);
        } catch (e) {
          if (cancelled) return;
          setAllMatchesRaw([]);
          setMatchError(e?.message || "Failed to build matches");
        } finally {
          if (cancelled) return;
          setIsMatching(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      buyAllRows,
      sellAllRows,
      itemKey,
      transportCostPerKm,
      factoringFeePercent,
      administrativeFee,
    ]);

    // ✅ Reset priority overlay whenever Hungarian results change
    useEffect(() => {
      setMode("hungarian");
      setPrioMatchesRaw([]);
      setPage(1);
      setSort({ key: "spread", dir: "asc" });
    }, [allMatchesRaw]);

    const activeRaw = mode === "priority" ? prioMatchesRaw : allMatchesRaw;

    const allMatches = useMemo(() => {
      return activeRaw
        .map((m) => {
          const rowKey = `${m.item_name}|${m.buy_lineNo}|${m.sell_lineNo}`;
          const sell = Number(m.sell_price) || 0;
          const qty = Number(m.matchedQty) || 0;
          const spread = Number(m.spread) || 0;
          const spreadPct = sell ? (spread / sell) * 100 : 0;
          const spreadNotional = qty * spread;

          return { ...m, rowKey, spreadPct, spreadNotional };
        })
        .filter((m) => m.spread >= 0);
    }, [activeRaw]);

    const sorted = useMemo(() => {
      const arr = [...allMatches];
      const mult = sort.dir === "asc" ? 1 : -1;

      const get = (r, k) => {
        switch (k) {
          case "prioOrder":
            return Number(r.prioOrder ?? Infinity);

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

          // Transport (TOTAL) = km * 1kmCost (distance only)
          case "totalTransportCost":
            return Number(
              r.distanceKm && transportCostPerKm
                ? r.distanceKm * transportCostPerKm
                : 0
            );
          case "mainCost":
            return Number(r.mainCost ?? 0);

          case "factoringCost":
            return Number(r.factoringCost ?? 0);

          // ✅ separate column sorting
          case "additionalCost":
            return Number(r.additionalCost ?? 0);
          case "additionalLocationCost":
            return Number(r.additionalLocationCost ?? 0);

          case "salesCommission":
            return Number(r.salesCommission ?? 0);

          case "purchaseCommission":
            return Number(r.purchaseCommission ?? 0);

          case "totalCost":
            return Number(r.totalCost ?? 0);

          case "transportCost":
            return Number(r.transportCost ?? 0);
          case "distanceKm":
            return Number.isFinite(r.distanceKm)
              ? Number(r.distanceKm)
              : Infinity;
          case "buy_lineNo":
            return Number(r.buy_lineNo) || 0;
          case "sell_lineNo":
            return Number(r.sell_lineNo) || 0;
          case "buy_block":
            return r.buy_block ?? -Infinity;
          case "sell_block":
            return r.sell_block ?? -Infinity;
          case "buy_priority":
            return Number(r.buy_priority ?? 0);
          case "sell_priority":
            return Number(r.sell_priority ?? 0);

          case "buy_location":
            return (r.buy_location || "").toLowerCase();
          case "sell_location":
            return (r.sell_location || "").toLowerCase();
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
    }, [allMatches, sort, transportCostPerKm]);

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

    // ✅ Correct col count for empty row colSpan
    const COLS = 22;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold inline-flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                  <ArrowLeftRight size={14} className="text-slate-600" />
                </span>
                Buy / Sell Matches
              </h3>

              <span
                className={`text-xs px-2 py-1 rounded border ${
                  mode === "priority"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {mode === "priority" ? "PRIO (overlay)" : "HUNGARIAN"}
              </span>

              {isMatching ? (
                <span className="text-xs text-slate-500">Calculating…</span>
              ) : null}
              {matchError ? (
                <span className="text-xs text-red-600">{matchError}</span>
              ) : null}
            </div>

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

          {/* ✅ NEW: buttons (do NOT recalc; just overlay filter/order) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={showHungarian}
              className={`px-3 py-2 rounded-lg border text-sm ${
                mode === "hungarian"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 hover:bg-slate-100"
              }`}
            >
              Hungarian
            </button>

            <button
              type="button"
              onClick={applyPrio}
              disabled={isMatching || !allMatchesRaw.length}
              className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-50 ${
                mode === "priority"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white border-slate-200 hover:bg-slate-100"
              }`}
              title="Apply priority logic on top of Hungarian matches (no recalculation)"
            >
              Apply prio
            </button>

            <span className="text-xs text-slate-500">
              Priority view hides prio=0 matches and enforces unique blocks (buy_block / sell_block).
            </span>
          </div>
        </div>

        {/* ✅ horizontal scroll wrapper */}
        <div
          className="max-w-full overflow-x-auto overflow-y-hidden pb-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* ✅ force table to be wider than container so it scrolls */}
          <table className="w-max min-w-max text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th
                  label={labels.headers.item}
                  k="item_name"
                  className="whitespace-nowrap"
                />
                <Th
                  label="Buy Location"
                  k="buy_location"
                  className="whitespace-nowrap"
                />
                <Th
                  label="Sell Location"
                  k="sell_location"
                  className="whitespace-nowrap"
                />
                <Th
                  label="Distance"
                  k="distanceKm"
                  className="text-right whitespace-nowrap"
                />

                {/* Transport (distance only) */}
                <Th
                  label="Transport"
                  k="totalTransportCost"
                  className="text-right whitespace-nowrap"
                />
                {/* per ton transport cost = what Hungarian used */}
                <Th
                  label="Transport / t"
                  k="transportCost"
                  className="text-right whitespace-nowrap"
                />

                <Th
                  label="Additional cost"
                  k="additionalCost"
                  className="text-right whitespace-nowrap"
                />

                <Th
                  label="Koszt factoringu"
                  k="factoringCost"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Main cost"
                  k="mainCost"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Prowizja sprzedaży"
                  k="salesCommission"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Prowizja zakupu"
                  k="purchaseCommission"
                  className="text-right"
                />
                <Th
                  label="Total cost"
                  k="totalCost"
                  className="text-right whitespace-nowrap"
                />

                <Th
                  label="Quantity"
                  k="matchedQty"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label={`Buy ${labels.headers.price}`}
                  k="buy_price"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label={`Sell ${labels.headers.price}`}
                  k="sell_price"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Spread"
                  k="spread"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Spread %"
                  k="spreadPct"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label="Spread × Qty"
                  k="spreadNotional"
                  className="text-right whitespace-nowrap"
                />
                <Th
                  label={`Buy ${labels.headers.lineNo || labels.headers.id}`}
                  k="buy_lineNo"
                  className="whitespace-nowrap"
                />
                <Th
                  label={`Sell ${labels.headers.lineNo || labels.headers.id}`}
                  k="sell_lineNo"
                  className="whitespace-nowrap"
                />
                <Th
                  label="Buy Priority"
                  k="buy_priority"
                  className="whitespace-nowrap"
                />
                <Th
                  label="Sell Priority"
                  k="sell_priority"
                  className="whitespace-nowrap"
                />
              </tr>
            </thead>

            <tbody>
              {pageRows.length ? (
                pageRows.map((r, i) => (
                  <tr key={`${r.rowKey}-${i}`} className="border-t">
                    <Td className="whitespace-nowrap">
                      <span className="font-medium">{r.item_name}</span>
                      <span className="text-slate-400 ml-2">
                        B:{r.buy_documentNo} · S:{r.sell_documentNo}
                      </span>
                    </Td>

                    <Td className="whitespace-nowrap">{r.buy_location || "—"}</Td>
                    <Td className="whitespace-nowrap">
                      {r.sell_location || "—"}
                    </Td>

                    <Td className="text-right whitespace-nowrap">
                      {Number.isFinite(r.distanceKm)
                        ? `${fmtNum(r.distanceKm, locale, { maximumFractionDigits: 1 })} km`
                        : "n/a"}
                    </Td>

                    {/* Transport = distance only */}
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {fmtMoney(
                        Number.isFinite(r.distanceKm)
                          ? r.distanceKm * transportCostPerKm
                          : 0,
                        locale,
                        "PLN"
                      )}
                    </Td>

                    {/* per ton transport cost */}
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {fmtMoney(r.transportCost ?? 0, locale, "PLN")}
                    </Td>

                    {/* ✅ Additional cost (TOTAL PLN) */}
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        {fmtMoney(r.additionalCost ?? 0, locale, "PLN")}

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[28rem] rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Additional cost – szczegóły
                            </div>

                            {(() => {
                              const d = r.additionalLocationCostDetails || null;
                              const buy = d?.buy || {};
                              const sell = d?.sell || {};
                              const buyTotal = Number(buy.total ?? 0) || 0;
                              const sellTotal = Number(sell.total ?? 0) || 0;
                              const total =
                                Number(
                                  d?.total ?? r.additionalLocationCost ?? 0
                                ) || 0;

                              const Row = ({ label, value }) => (
                                <div className="flex justify-between gap-3">
                                  <span className="text-slate-500">{label}</span>
                                  <span className="tabular-nums">
                                    {fmtMoney(value ?? 0, locale, "PLN")}
                                  </span>
                                </div>
                              );

                              return (
                                <div className="space-y-2">
                                  {/* BUY */}
                                  <div className="rounded-lg border border-slate-100 p-2">
                                    <div className="font-medium text-slate-600 mb-1">
                                      Buy location
                                    </div>

                                    <div className="space-y-1">
                                      <Row
                                        label="Loading cost (included):"
                                        value={buy.loadingCost}
                                      />
                                      <Row
                                        label="Loading risk (included):"
                                        value={buy.loadingCostRisk}
                                      />

                                      <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                        <span className="font-medium text-slate-600">
                                          Buy total:
                                        </span>
                                        <span className="font-medium tabular-nums">
                                          {fmtMoney(buyTotal, locale, "PLN")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* SELL */}
                                  <div className="rounded-lg border border-slate-100 p-2">
                                    <div className="font-medium text-slate-600 mb-1">
                                      Sell location
                                    </div>

                                    <div className="space-y-1">
                                      <Row
                                        label="Unloading cost (included):"
                                        value={sell.unloadingCost}
                                      />
                                      <Row
                                        label="Unloading risk (included):"
                                        value={sell.unloadingCostRisk}
                                      />

                                      <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                        <span className="font-medium text-slate-600">
                                          Sell total:
                                        </span>
                                        <span className="font-medium tabular-nums">
                                          {fmtMoney(sellTotal, locale, "PLN")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* LOCATION EXTRAS TOTAL */}
                                  <div className="mt-1 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                    <span className="font-semibold">
                                      Location extras (total)
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {fmtMoney(total, locale, "PLN")}
                                    </span>
                                  </div>

                                  {/* ADMIN FEE + GRAND TOTAL */}
                                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                                    <div className="flex justify-between gap-3">
                                      <span className="text-slate-500">
                                        Opłata administracyjna:
                                      </span>
                                      <span className="tabular-nums">
                                        {fmtMoney(
                                          r.administrativeFeeUsed ?? 0,
                                          locale,
                                          "PLN"
                                        )}
                                      </span>
                                    </div>

                                    <div className="flex justify-between gap-3">
                                      <span className="font-semibold">
                                        Additional cost (total)
                                      </span>
                                      <span className="font-semibold tabular-nums">
                                        {fmtMoney(r.additionalCost ?? 0, locale, "PLN")}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                    <div className="font-medium mb-1">Wzór:</div>
                                    <div className="font-mono space-y-1">
                                      <div>(buy: load + loadRisk)</div>
                                      <div>+ (sell: unload + unloadRisk)</div>
                                    </div>
                                  </div>

                                  {/* legacy duplicated block kept as-is */}
                                  <div className="rounded-lg border border-slate-100 p-2">
                                    <div className="font-medium text-slate-600 mb-1">
                                      Sell location
                                    </div>
                                    <div className="space-y-1">
                                      <Row label="Loading cost:" value={sell.loadingCost} />
                                      <Row label="Unloading cost:" value={sell.unloadingCost} />
                                      <Row label="Loading risk:" value={sell.loadingCostRisk} />
                                      <Row label="Unloading risk:" value={sell.unloadingCostRisk} />

                                      <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                        <span className="font-medium text-slate-600">
                                          Sell total:
                                        </span>
                                        <span className="font-medium tabular-nums">
                                          {fmtMoney(sellTotal, locale, "PLN")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-1 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                    <span className="font-semibold">
                                      Additional cost (total)
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {fmtMoney(total, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="font-mono space-y-1">
                                    <div>buy + sell</div>
                                    <div>(load + unload + riskLoad + riskUnload)</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        {fmtMoney(r.factoringCost ?? 0, locale, "PLN")}

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          {/* Tooltip */}
                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Koszt factoringu – szczegóły
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość linii (sell):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.factoringSellLineValueTotal ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Ilość (sell):
                                </span>
                                <span className="tabular-nums">
                                  {fmtNum(r.factoringSellQtyTotal ?? 0, locale)}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Ilość (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtNum(r.matchedQty ?? 0, locale)}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.factoringMatchedLineValue ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Opłata factoringowa:
                                </span>
                                <span className="tabular-nums">
                                  {fmtNum(
                                    r.factoringFeePercentUsed ?? 0,
                                    locale,
                                    {
                                      minimumFractionDigits: 5,
                                      maximumFractionDigits: 5,
                                    }
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Dni do terminu:
                                </span>
                                <span className="tabular-nums">
                                  {r.factoringDaysToDue ?? 0}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Due date:</span>
                                <span className="tabular-nums">
                                  {r.factoringDueDate
                                    ? new Date(r.factoringDueDate).toLocaleDateString(locale)
                                    : "—"}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                <div className="font-medium mb-1">Wzór:</div>
                                <div className="font-mono">
                                  matchedValue × (fee% / 100) × days
                                </div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="font-semibold text-orange-600">
                          {fmtMoney(r.mainCost ?? 0, locale, "PLN")}
                        </span>

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Main cost – details
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Additional cost:</span>
                                <span className="tabular-nums">
                                  {fmtMoney(r.additionalCost ?? 0, locale, "PLN")}
                                </span>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Koszt factoringu:
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(r.factoringCost ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Transport (km × stawka):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.distanceTransportCost ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                <span className="font-semibold">Total</span>
                                <span className="font-semibold text-orange-600 tabular-nums">
                                  {fmtMoney(r.mainCost ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                <div className="font-medium mb-1">Wzór:</div>
                                <div className="font-mono">
                                  additional cost + factoring + transport
                                </div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        {fmtMoney(r.salesCommission ?? 0, locale, "PLN")}

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Prowizja sprzedaży – szczegóły
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość sprzedaży (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.salesMatchedValue ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość zakupu (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.buyMatchedValue ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Main cost:</span>
                                <span className="tabular-nums">
                                  {fmtMoney(r.mainCost ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                <span className="font-medium text-slate-600">
                                  Podstawa prowizji:
                                </span>
                                <span className="font-medium tabular-nums">
                                  {fmtMoney(r.commissionBase ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Prowizja % (User):
                                </span>
                                <span className="tabular-nums">
                                  {fmtNum(r.commissionPercentUsed ?? 0, locale, {
                                    maximumFractionDigits: 4,
                                  })}
                                  %
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  User (sales):
                                </span>
                                <span className="tabular-nums">
                                  {r.commissionUserName
                                    ? `${r.commissionUserName} · `
                                    : ""}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                <span className="font-semibold">
                                  Prowizja (PLN)
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {fmtMoney(
                                    r.salesCommission ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                <div className="font-medium mb-1">Wzór:</div>
                                <div className="font-mono">
                                  (sprzedaż − zakup − mainCost) × (prow% / 100)
                                </div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        {fmtMoney(r.purchaseCommission ?? 0, locale, "PLN")}

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Prowizja zakupu – szczegóły
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość sprzedaży (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.salesMatchedValue ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Wartość zakupu (matched):
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.buyMatchedValue ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Main cost:</span>
                                <span className="tabular-nums">
                                  {fmtMoney(r.mainCost ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                <span className="font-medium text-slate-600">
                                  Podstawa prowizji:
                                </span>
                                <span className="font-medium tabular-nums">
                                  {fmtMoney(r.commissionBase ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Prowizja % (buy):
                                </span>
                                <span className="tabular-nums">
                                  {fmtNum(
                                    r.purchaseCommissionPercentUsed ?? 0,
                                    locale,
                                    { maximumFractionDigits: 4 }
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  User (buy):
                                </span>
                                <span className="tabular-nums">
                                  {r.purchaseCommissionUserName
                                    ? `${r.purchaseCommissionUserName} · `
                                    : ""}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                <span className="font-semibold">
                                  Prowizja (PLN)
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {fmtMoney(
                                    r.purchaseCommission ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                <div className="font-medium mb-1">Wzór:</div>
                                <div className="font-mono">
                                  (sprzedaż − zakup − mainCost) × (prow% / 100)
                                </div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="font-semibold text-red-600">
                          {fmtMoney(r.totalCost ?? 0, locale, "PLN")}
                        </span>

                        <span className="relative group">
                          <Info
                            size={14}
                            className="text-slate-400 hover:text-slate-700 cursor-help"
                          />

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                            <div className="font-semibold mb-2">
                              Total cost – szczegóły
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Main cost:</span>
                                <span className="tabular-nums">
                                  {fmtMoney(r.mainCost ?? 0, locale, "PLN")}
                                </span>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Prowizja sprzedaży:
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.salesCommission ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="text-slate-500">
                                  Prowizja zakupu:
                                </span>
                                <span className="tabular-nums">
                                  {fmtMoney(
                                    r.purchaseCommission ?? 0,
                                    locale,
                                    "PLN"
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                <span className="font-semibold">Total</span>
                                <span className="font-semibold text-red-600 tabular-nums">
                                  {fmtMoney(r.totalCost ?? 0, locale, "PLN")}
                                </span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                <div className="font-medium mb-1">Wzór:</div>
                                <div className="font-mono">
                                  mainCost + prowizjaSprzedazy + prowizjaZakupu
                                </div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </Td>

                    <Td className="text-right whitespace-nowrap">
                      {fmtNum(r.matchedQty, locale)}
                    </Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {fmtMoney(r.buy_price, locale, "PLN")}
                    </Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {fmtMoney(r.sell_price, locale, "PLN")}
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {(() => {
                        const qty = Number(r.matchedQty) || 0;
                        const sell = Number(r.sell_price) || 0;
                        const buy = Number(r.buy_price) || 0;
                        const totalCost = Number(r.totalCost) || 0;

                        const costPerTon = qty ? totalCost / qty : 0;
                        const spread = Number(r.spread) || 0;

                        return (
                          <span className="inline-flex items-center justify-end gap-2">
                            <span
                              className={`px-2 py-1 rounded-lg text-xs ${spreadClass(
                                spread
                              )}`}
                            >
                              {fmtMoney(spread, locale, "PLN")}
                            </span>

                            <span className="relative group">
                              <Info
                                size={14}
                                className="text-slate-400 hover:text-slate-700 cursor-help"
                              />

                              <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                                <div className="font-semibold mb-2">
                                  Spread – kalkulacja
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                      Sell price (PLN/t):
                                    </span>
                                    <span className="tabular-nums">
                                      {fmtMoney(sell, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                      Buy price (PLN/t):
                                    </span>
                                    <span className="tabular-nums">
                                      {fmtMoney(buy, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                      Matched qty:
                                    </span>
                                    <span className="tabular-nums">
                                      {fmtNum(qty, locale)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                      Total cost (PLN):
                                    </span>
                                    <span className="tabular-nums">
                                      {fmtMoney(totalCost, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-3">
                                    <span className="font-medium text-slate-600">
                                      Cost / t:
                                    </span>
                                    <span className="font-medium tabular-nums">
                                      {fmtMoney(costPerTon, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between gap-3">
                                    <span className="font-semibold">
                                      Spread (PLN/t)
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {fmtMoney(spread, locale, "PLN")}
                                    </span>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                                    <div className="font-medium mb-1">Wzór:</div>
                                    <div className="font-mono">
                                      sell − buy − (totalCost / qty)
                                    </div>
                                    <div className="font-mono mt-1">
                                      {fmtMoney(sell, locale, "PLN")} −{" "}
                                      {fmtMoney(buy, locale, "PLN")} − (
                                      {fmtMoney(totalCost, locale, "PLN")} /{" "}
                                      {fmtNum(qty, locale)})
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </span>
                          </span>
                        );
                      })()}
                    </Td>

                    <Td className="text-right whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${spreadClass(
                          r.spread
                        )}`}
                      >
                        {fmtPct(r.spreadPct, locale)}
                      </span>
                    </Td>

                    <Td className="text-right whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${spreadClass(
                          r.spread
                        )}`}
                      >
                        {fmtMoney(r.spreadNotional, locale, "PLN")}
                      </span>
                    </Td>

                    <Td className="font-mono whitespace-nowrap">
                      {r.buy_lineNo}
                    </Td>
                    <Td className="font-mono whitespace-nowrap">
                      {r.sell_lineNo}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <PriorityBadge value={r.buy_priority} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      <PriorityBadge value={r.sell_priority} />
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={COLS} className="p-6 text-center text-slate-500">
                    {mode === "priority"
                      ? "No priority matches (prio 1/2) for current data."
                      : "No matches for current data/filters."}
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



