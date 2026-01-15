import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calculator, MapPin, Package, RefreshCcw, Search } from "lucide-react";
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
    throw new Error(`${res.status} ${res.statusText} @ ${url} · ${body.slice(0, 160)}`);
  }
  if (!ct.includes("application/json")) {
    const body = await readBodyAsText(res);
    throw new Error(`Expected JSON, got ${ct || "unknown"} @ ${url} · ${body.slice(0, 160)}`);
  }
  return res.json();
}

function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * ✅ Nearest-rank percentile:
 * k = ceil(p*N), return sorted[k-1] (real observed value, no interpolation)
 */
function percentileNearestRank(sortedAsc, p01) {
  if (!sortedAsc?.length) return null;
  const n = sortedAsc.length;
  const p = Math.max(0.01, Math.min(0.99, Number(p01) || 0.7));
  const k = Math.ceil(p * n); // 1..n
  const idx = Math.min(n - 1, Math.max(0, k - 1));
  return sortedAsc[idx];
}

/* ---------- helpers: distance + costs (ported from Exchange) ---------- */
const ROAD_DISTANCE_CACHE = new Map(); // key -> number|null

function makePairKey(aLat, aLon, bLat, bLon) {
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return null;
  return `${aLat.toFixed(6)},${aLon.toFixed(6)}|${bLat.toFixed(6)},${bLon.toFixed(6)}`;
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
  const R = 6371;
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

async function fetchRoadDistanceKm(fromLat, fromLon, toLat, toLon) {
  const params = new URLSearchParams({
    fromLat: String(fromLat),
    fromLon: String(fromLon),
    toLat: String(toLat),
    toLon: String(toLon),
  });
  const url = `${API}/api/maps/distance?${params.toString()}`;
  const res = await fetch(url, { credentials: "include" });
  const json = await safeJson(res, url);

  const km =
    Number(json.distanceKm) ||
    (Number.isFinite(Number(json.distanceInMeters))
      ? Number(json.distanceInMeters) / 1000
      : NaN);

  return Number.isFinite(km) ? km : null;
}

// Small concurrency helper (avoid spamming backend)
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

function daysUntil(dateLike) {
  if (!dateLike) return 0;
  const due = new Date(dateLike);
  if (Number.isNaN(due.getTime())) return 0;
  const ms = due.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
}

function pickNumber(obj, keys, fallback = NaN) {
  for (const k of keys) {
    const v = Number(obj?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return fallback;
}

function getLatLon(obj) {
  const lat = pickNumber(obj, ["lat", "latitude", "geoLat", "locationLat", "location_lat"]);
  const lon = pickNumber(obj, ["lon", "lng", "longitude", "geoLon", "locationLon", "location_lon"]);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

/* ---------- session ---------- */
function getSessionEmail() {
  try {
    const raw = localStorage.getItem("session");
    const s = raw ? JSON.parse(raw) : null;
    return (s?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/* ---------- history API ---------- */
async function postHistory(payload) {
  const url = `${API}/api/suggested-price-history`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return safeJson(res, url);
}

async function fetchHistory(params) {
  const qs = new URLSearchParams(params);
  const url = `${API}/api/suggested-price-history?${qs.toString()}`;
  const res = await fetch(url, { credentials: "include" });
  return safeJson(res, url);
}

/* ===================== UI bits ===================== */
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

/**
 * ✅ Portal dropdown (not clipped by Dashboard overflow-auto)
 */
function LookupInput({
  icon: Icon,
  label,
  placeholder,
  valueLabel,
  query,
  setQuery,
  open,
  setOpen,
  loading,
  rows,
  onPick,
  onClear,
  i18n, // { typeToSearch, close, clear, loading, noResults }
}) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [direction, setDirection] = useState("down");
  const [maxH, setMaxH] = useState(360);

  const measure = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const viewportH = window.innerHeight;

    const spaceBelow = viewportH - r.bottom - 12;
    const spaceAbove = r.top - 12;

    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    setDirection(openUp ? "up" : "down");

    const available = Math.max(200, Math.min(0.6 * viewportH, openUp ? spaceAbove : spaceBelow));
    setMaxH(Math.floor(available));
    setRect(r);
  };

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows.length]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => measure();
    const onScroll = () => measure();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const onDown = (e) => {
      const p = panelRef.current;
      const b = btnRef.current;
      if (!p || !b) return;
      if (p.contains(e.target) || b.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setOpen]);

  const panel =
    open && rect
      ? createPortal(
          <div
            ref={panelRef}
            className="z-[9999] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
              width: Math.min(rect.width, window.innerWidth - 24),
              top: direction === "down" ? rect.bottom + 8 : undefined,
              bottom: direction === "up" ? window.innerHeight - rect.top + 8 : undefined,
            }}
          >
            <div className="p-3 border-b bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={i18n?.typeToSearch || "Type to search…"}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {i18n?.close || "Close"}
                </button>
                {onClear && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50"
                    onClick={() => {
                      onClear();
                      setOpen(false);
                    }}
                  >
                    {i18n?.clear || "Clear"}
                  </button>
                )}
                {loading ? <span className="text-xs text-slate-400">{i18n?.loading || "Loading…"}</span> : null}
              </div>
            </div>

            <div style={{ maxHeight: maxH }} className="overflow-auto">
              {!loading && rows.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">{i18n?.noResults || "No results"}</div>
              ) : null}

              {rows.map((r) => (
                <button
                  type="button"
                  key={r.id || r._id || r.no}
                  className="w-full text-left px-4 py-3 border-t hover:bg-slate-50"
                  onClick={() => {
                    onPick(r);
                    setOpen(false);
                  }}
                >
                  <div className="text-sm font-medium text-slate-900">{r.__label}</div>
                  <div className="text-xs text-slate-500">{r.__sub || ""}</div>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <div className="text-xs text-slate-600 mb-1">{label}</div>

      <button
        ref={btnRef}
        type="button"
        className="w-full inline-flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
        onClick={() => setOpen(true)}
        title={label}
      >
        <Icon size={16} className="text-slate-500" />
        <span className={`flex-1 text-left ${valueLabel ? "text-slate-900" : "text-slate-400"}`}>
          {valueLabel || placeholder}
        </span>
        <Search size={16} className="text-slate-400" />
      </button>

      {panel}
    </div>
  );
}


/* ===================== Calculation overlay ===================== */
function CalculationOverlay({ open, title, subtitle, steps = [] }) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[50] flex items-center justify-center">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <div className="relative w-[92%] max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="h-1 w-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/3 bg-slate-300 animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
            </div>

            <div className="flex-1">
              <div className="text-base font-semibold text-slate-900">{title || "Calculating…"}</div>
              <div className="text-sm text-slate-600 mt-0.5">
                {subtitle || "Please wait while we compute suggested price and costs."}
              </div>

              {steps?.length ? (
                <div className="mt-4 space-y-2">
                  {steps.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-[pulse_1.4s_ease-in-out_infinite]" />
                      <div className="text-sm text-slate-700">{s}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 text-xs text-slate-500">
                This can take longer for large datasets or when distances must be fetched.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== main page ===================== */
export default function SuggestedPriceByLocationAndItem() {
  const { t, locale } = useI18n();
  const SP = t?.suggestedPrice || {};

  // local i18n fallbacks (so page never breaks even if a key missing)
  const TXT = {
    pageTitle: SP.pageTitle || "Suggested Price",
    cardTitle: SP.cardTitle || "Suggested Purchase Price (P70)",
    note:
      SP.note ||
      "Note: Location is used as pickup (origin) to calculate per-block costs (transport, location, factoring, admin). SalesOfferLinesBlocks are not filtered by location.",
    lastUpdate: SP.lastUpdate || "Last update",
    calculate: SP.calculate || "Calculate",
    calculating: SP.calculating || "Calculating…",
    reset: SP.reset || "Reset",
    selectItemHint: SP.selectItemHint || "Select an Item to calculate.",
    noResultYet: SP.noResultYet || "No result yet. Pick Item and click Calculate.",
    location: SP.location || "Location",
    pickLocation: SP.pickLocation || "Pick location",
    item: SP.item || "Item",
    pickItem: SP.pickItem || "Pick item",
    metric: SP.metric || "Metric",
    costMode: SP.costMode || "Cost adjustment",
    costModePlus: SP.costModePlus || "Price + costs",
    costModeMinus: SP.costModeMinus || "Price − costs",
    percentile: SP.percentile || "Percentile",
    statusOptional: SP.statusOptional || "Status (optional)",
    statusPlaceholder: SP.statusPlaceholder || 'e.g. "accepted"',
    maxRows: SP.maxRows || "Max rows (cap)",

    suggestedPrice: SP.suggestedPrice || "Suggested price",
    rowsUsed: SP.rowsUsed || "Rows used",
    method: SP.method || "Method",
    nearestRank: SP.nearestRank || "Nearest Rank",

    min: SP.min || "MIN",
    avg: SP.avg || "AVG",
    p50: SP.p50 || "P50",
    p70: SP.p70 || "P70",
    p90: SP.p90 || "P90",
    max: SP.max || "MAX",

    recordsUsed: SP.recordsUsed || "Records used",
    history: SP.history || "History",

    searchRecords: SP.searchRecords || "Search records…",
    searchHistory: SP.searchHistory || "Search history…",

    onlyMine: SP.onlyMine || "Only mine",
    allPercentiles: SP.allPercentiles || "All %",

    refresh: SP.refresh || "Refresh",
    prev: SP.prev || "Prev",
    next: SP.next || "Next",
    loading: SP.loading || "Loading…",
    noRows: SP.noRows || "No data",

    thDate: SP.thDate || "Date",
    thDocument: SP.thDocument || "Document",
    thLine: SP.thLine || "Line",
    thBlock: SP.thBlock || "Block",
    thStatus: SP.thStatus || "Status",
    thValueUsed: SP.thValueUsed || "Value used",
    thUnitPrice: SP.thUnitPrice || "Unit price",
    thQty: SP.thQty || "Qty",
    thLineValue: SP.thLineValue || "Line value",
    thLocation: SP.thLocation || "Location",
    thCity: SP.thCity || "City",
    thDistanceKm: SP.thDistanceKm || "Distance (km)",
    thCostPerTon: SP.thCostPerTon || "Cost / t",
    thTotalCost: SP.thTotalCost || "Total cost",

    thUser: SP.thUser || "User",
    thDestination: SP.thDestination || "Destination",
    thSuggested: SP.thSuggested || "Suggested",
    thSamples: SP.thSamples || "Samples",

    // dropdown internal
    typeToSearch: SP.typeToSearch || "Type to search…",
    close: SP.close || "Close",
    clear: SP.clear || "Clear",
    noResults: SP.noResults || "No results",
  };

  const [location, setLocation] = useState(null); // destination (saved in history)
  const [item, setItem] = useState(null);

  // costs/settings (shared with Exchange)
  const [settings, setSettings] = useState({
    transportCostPerKm: 0,
    factoringFeePercent: 0,
    administrativeFee: 0,
  });
  const [costMode, setCostMode] = useState("plus"); // plus | minus

  // lookups
  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locRows, setLocRows] = useState([]);

  const [itemOpen, setItemOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [itemRows, setItemRows] = useState([]);

  // calc settings
  const [metric, setMetric] = useState("unitPrice"); // unitPrice | lineValuePerUnit | lineValue
  const [pct, setPct] = useState(0.7);
  const [status, setStatus] = useState(""); // optional
  const [cap, setCap] = useState(10000);

  // result + used records
  const [calculating, setCalculating] = useState(false);
  const [calcStage, setCalcStage] = useState(""); // ✅ user-visible stage text
  const [errMsg, setErrMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [result, setResult] = useState(null);
  const [usedRows, setUsedRows] = useState([]);

  // record table filters
  const [rowsSearch, setRowsSearch] = useState("");
  const [rowsLimit, setRowsLimit] = useState(50);

  // history
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histPages, setHistPages] = useState(1);
  const [histLimit, setHistLimit] = useState(25);
  const [histQ, setHistQ] = useState("");
  const [histOnlyMine, setHistOnlyMine] = useState(true);
  const [histPercentile, setHistPercentile] = useState("");

  const debouncedLocSearch = useMemo(
    () =>
      debounce(async (q) => {
        setLocLoading(true);
        try {
          // ✅ backend expects "query"
          const url = `${API}/api/mlocations?query=${encodeURIComponent(q)}&page=1&limit=10`;
          const res = await fetch(url, { credentials: "include" });
          const json = await safeJson(res, url);
          const rows = (json.data || []).map((r) => ({
            ...r,
            __label: `${r.no}${r.name ? ` · ${r.name}` : ""}`,
            __sub: [r.postCode, r.city, r.country].filter(Boolean).join(" · "),
          }));
          setLocRows(rows);
        } catch {
          setLocRows([]);
        } finally {
          setLocLoading(false);
        }
      }, 250),
    []
  );

  const debouncedItemSearch = useMemo(
    () =>
      debounce(async (q) => {
        setItemLoading(true);
        try {
          // ✅ (recommended) backend typically expects "query"
          const url = `${API}/api/mitems?query=${encodeURIComponent(q)}&page=1&limit=10`;
          const res = await fetch(url, { credentials: "include" });
          const json = await safeJson(res, url);
          const rows = (json.data || []).map((r) => ({
            ...r,
            __label: `${r.no}${r.description ? ` · ${r.description}` : ""}`,
            __sub: r.inventoryPostingGroup ? `Group: ${r.inventoryPostingGroup}` : "",
          }));
          setItemRows(rows);
        } catch {
          setItemRows([]);
        } finally {
          setItemLoading(false);
        }
      }, 250),
    []
  );

  useEffect(() => {
    if (locOpen) debouncedLocSearch(locQuery.trim());
  }, [locOpen, locQuery, debouncedLocSearch]);

  useEffect(() => {
    if (itemOpen) debouncedItemSearch(itemQuery.trim());
  }, [itemOpen, itemQuery, debouncedItemSearch]);

  // Load transport/factoring/admin settings (same endpoint as Exchange)
  useEffect(() => {
    (async () => {
      try {
        const url = `${API}/api/settings`;
        const res = await fetch(url, { credentials: "include" });
        const json = await safeJson(res, url);
        setSettings({
          transportCostPerKm: Number(json?.transportCostPerKm ?? 0) || 0,
          factoringFeePercent: Number(json?.factoringFeePercent ?? 0) || 0,
          administrativeFee: Number(json?.administrativeFee ?? 0) || 0,
        });
      } catch (e) {
        console.warn("Failed to load settings", e);
        setSettings({ transportCostPerKm: 0, factoringFeePercent: 0, administrativeFee: 0 });
      }
    })();
  }, []);

  async function fetchAllBlocksByItem(itemNo) {
    const limit = 200;
    let page = 1;
    let all = [];

    while (true) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        itemNo: String(itemNo),
      });
      if (status) params.set("status", String(status));

      const url = `${API}/api/sales-offer-lines-blocks?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await safeJson(res, url);

      const rows = Array.isArray(json.data) ? json.data : [];
      all = all.concat(rows);

      const pages = Number(json.pages) || 1;

      if (all.length >= cap) break;
      if (page >= pages) break;
      if (rows.length < limit) break;

      page += 1;
    }

    return all.slice(0, cap);
  }

  async function buildUsedRows(blocks) {
    const pickup = location || null;
    const pickupLatLon = pickup ? getLatLon(pickup) : { lat: null, lon: null };

    // pickup-side costs (best effort from mlocations record)
    const pickupLoadingCost = pickup
      ? pickNumber(pickup, ["loadingCost", "loading_cost", "locationLoadingCost"], 0)
      : 0;
    const pickupLoadingRisk = pickup
      ? pickNumber(pickup, ["loadingCostRisk", "loading_cost_risk", "locationLoadingCostRisk"], 0)
      : 0;

    const baseRows = (blocks || [])
      .filter((b) => (b?.lineType || "").toLowerCase() === "item")
      .map((b) => {
        const up = Number(b.unitPrice) || 0;
        const qty = Number(b.quantity) || 0;
        const lv = Number(b.lineValue) || up * qty;

        const createdAt = b.createdAt || b.dateCreated || b.updatedAt;

        // sell-side unloading costs (stored on block row)
        const sellUnloadingCost = pickNumber(b, ["locationUnloadingCost", "unloadingCost", "unloading_cost"], 0);
        const sellUnloadingRisk = pickNumber(
          b,
          ["locationUnloadingCostRisk", "unloadingCostRisk", "unloading_cost_risk"],
          0
        );

        const { lat: sellLat, lon: sellLon } = getLatLon(b);

        return {
          ...b,
          __unitPrice: up,
          __qty: qty,
          __lineValue: lv,
          __createdAt: createdAt,

          __sellLat: sellLat,
          __sellLon: sellLon,

          __pickupLat: pickupLatLon.lat,
          __pickupLon: pickupLatLon.lon,

          __pickupLoadingCost: pickupLoadingCost,
          __pickupLoadingRisk: pickupLoadingRisk,

          __sellUnloadingCost: sellUnloadingCost,
          __sellUnloadingRisk: sellUnloadingRisk,
        };
      });

    // Distance (road distance via backend; fallback to geo distance)
    const rowsWithDistance = await mapLimit(baseRows, 4, async (r) => {
      const aLat = Number(r.__pickupLat);
      const aLon = Number(r.__pickupLon);
      const bLat = Number(r.__sellLat);
      const bLon = Number(r.__sellLon);

      const key = makePairKey(aLat, aLon, bLat, bLon);
      if (!key) return { ...r, __distanceKm: null };

      if (ROAD_DISTANCE_CACHE.has(key)) {
        return { ...r, __distanceKm: ROAD_DISTANCE_CACHE.get(key) };
      }

      let km = null;
      try {
        km = await fetchRoadDistanceKm(aLat, aLon, bLat, bLon);
      } catch {
        km = geoDistanceKm(aLat, aLon, bLat, bLon);
      }
      ROAD_DISTANCE_CACHE.set(key, km);
      return { ...r, __distanceKm: km };
    });

    const transportCostPerKm = Number(settings?.transportCostPerKm ?? 0) || 0;
    const factoringFeePercent = Number(settings?.factoringFeePercent ?? 0) || 0;
    const administrativeFee = Number(settings?.administrativeFee ?? 0) || 0;

    const feePct = factoringFeePercent / 100;

    const enriched = rowsWithDistance
      .map((r) => {
        const qty = Number(r.__qty) || 0;

        // distance transport is absolute cost, later converted to /t
        const distanceTransportCost =
          Number.isFinite(r.__distanceKm) && transportCostPerKm > 0
            ? (Number(r.__distanceKm) || 0) * transportCostPerKm
            : 0;

        const locationBaseCost = (Number(r.__pickupLoadingCost) || 0) + (Number(r.__sellUnloadingCost) || 0);
        const locationRiskCost = (Number(r.__pickupLoadingRisk) || 0) + (Number(r.__sellUnloadingRisk) || 0);

        const factoringDaysToDue = daysUntil(r.dueDate || r.due_date || null);
        const factoringCost = (Number(r.__lineValue) || 0) * feePct * factoringDaysToDue;

        const totalCostAbs =
          (Number(distanceTransportCost) || 0) +
          (Number(locationBaseCost) || 0) +
          (Number(locationRiskCost) || 0) +
          (Number(administrativeFee) || 0) +
          (Number(factoringCost) || 0);

        const costPerTon = qty > 0 ? totalCostAbs / qty : 0;

        // Base metric value
        let baseValue = 0;
        let costAdj = 0;

        if (metric === "lineValue") {
          baseValue = Number(r.__lineValue) || 0;
          costAdj = totalCostAbs;
        } else if (metric === "lineValuePerUnit") {
          baseValue = qty > 0 ? (Number(r.__lineValue) || 0) / qty : 0;
          costAdj = costPerTon;
        } else {
          baseValue = Number(r.__unitPrice) || 0;
          costAdj = costPerTon;
        }

        const valueUsed = costMode === "minus" ? baseValue - costAdj : baseValue + costAdj;

        return {
          ...r,

          __distanceTransportCost: distanceTransportCost,
          __locationBaseCost: locationBaseCost,
          __locationRiskCost: locationRiskCost,
          __administrativeFee: administrativeFee,
          __factoringCost: factoringCost,
          __factoringDaysToDue: factoringDaysToDue,

          __totalCostAbs: totalCostAbs,
          __costPerTon: costPerTon,
          __valueUsed: valueUsed,
        };
      })
      .filter((r) => Number.isFinite(r.__valueUsed) && r.__valueUsed > 0);

    enriched.sort((a, b) => {
      const da = a.__createdAt ? new Date(a.__createdAt).getTime() : 0;
      const db = b.__createdAt ? new Date(b.__createdAt).getTime() : 0;
      return db - da;
    });

    return enriched;
  }

  function computeSuggestedFromUsed(used) {
    const values = used
      .map((r) => Number(r.__valueUsed))
      .filter((x) => Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);

    if (!values.length) return null;

    const n = values.length;
    const min = values[0];
    const max = values[n - 1];
    const avg = values.reduce((a, b) => a + b, 0) / n;

    const p50 = percentileNearestRank(values, 0.5);
    const p70 = percentileNearestRank(values, pct);
    const p90 = percentileNearestRank(values, 0.9);

    return {
      count: n,
      suggested: round2(p70),
      stats: {
        min: round2(min),
        avg: round2(avg),
        p50: round2(p50),
        p70: round2(p70),
        p90: round2(p90),
        max: round2(max),
      },
    };
  }

  const filteredTableRows = useMemo(() => {
    const q = rowsSearch.trim().toLowerCase();
    const base = usedRows || [];
    const sliced = (arr) => arr.slice(0, rowsLimit);

    if (!q) return sliced(base);

    const hits = base.filter((r) => {
      const hay = [
        r.documentNo,
        r.status,
        r.itemNo,
        r.locationNo,
        r.locationCity,
        r.locationName,
        String(r.lineNo ?? ""),
        String(r.block ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    return sliced(hits);
  }, [usedRows, rowsSearch, rowsLimit]);

  async function loadHistory(nextPage = 1) {
    setHistLoading(true);
    try {
      const email = getSessionEmail();

      const resp = await fetchHistory({
        page: String(nextPage),
        limit: String(histLimit),
        q: histQ,
        itemNo: item?.no || "",
        locationNo: location?.no || "",
        userEmail: histOnlyMine ? email : "",
        percentile: histPercentile,
        sortDir: "desc",
      });

      setHistory(resp.data || []);
      setHistPage(resp.page || nextPage);
      setHistPages(resp.pages || 1);
    } catch (e) {
      console.warn("history load failed", e);
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.no, location?.no, histLimit, histOnlyMine, histPercentile]);

  // Stored in history so we can distinguish variants without changing backend schema
  const metricKeyForHistory = `${metric}_${costMode}`;

  async function onCalculate() {
    if (calculating) return; // ✅ prevent double-clicks

    setErrMsg("");
    setResult(null);
    setUsedRows([]);

    if (!item?.no) {
      setErrMsg(SP.selectItemFirst || "Select Item first.");
      return;
    }
    if (!location?.no) {
      setErrMsg(SP.selectLocationFirst || "Select pickup Location first.");
      return;
    }

    setCalculating(true);
    setCalcStage(SP.calculatingStageStart || "Starting calculation…");

    try {
      setCalcStage(SP.calculatingStageBlocks || "Loading offer blocks…");
      const blocks = await fetchAllBlocksByItem(item.no);

      setCalcStage(SP.calculatingStageCosts || "Computing distances and costs…");
      const used = await buildUsedRows(blocks);
      setUsedRows(used);

      setCalcStage(SP.calculatingStageStats || "Computing percentile statistics…");
      const r = computeSuggestedFromUsed(used);

      setResult({
        itemNo: item.no,
        locationNo: location?.no || "",
        metric: metricKeyForHistory,
        percentile: pct,
        ...(r || { count: 0, suggested: null, stats: null }),
      });

      setLastUpdated(new Date());

      // ✅ save history
      if (r?.suggested != null) {
        setCalcStage(SP.calculatingStageSave || "Saving history…");
        const email = getSessionEmail();
        if (email) {
          try {
            await postHistory({
              userEmail: email,
              itemNo: item.no,
              locationNo: location?.no || "",
              suggestedPrice: r.suggested,
              percentile: pct,
              metric: metricKeyForHistory,
              statusFilter: status || "",
              sampleCount: r.count || 0,
              stats: r.stats || undefined,
            });
            loadHistory(1);
          } catch (e) {
            console.warn("history save failed", e);
          }
        }
      }

      setCalcStage(SP.calculatingStageDone || "Done.");
    } catch (e) {
      setErrMsg(e?.message || (SP.calculationFailed || "Calculation failed"));
    } finally {
      // allow overlay to show "Done." briefly (optional)
      setTimeout(() => {
        setCalcStage("");
        setCalculating(false);
      }, 250);
    }
  }

  const metricLabelBase =
    {
      unitPrice: SP.metricUnitPrice || "Unit Price",
      lineValuePerUnit: SP.metricLineValuePerUnit || "Line Value / Qty",
      lineValue: SP.metricLineValue || "Line Value",
    }[metric] || metric;

  const costModeLabel = costMode === "minus" ? SP.costModeMinus || "Price − costs" : SP.costModePlus || "Price + costs";
  const metricLabel = `${metricLabelBase} (${costModeLabel})`;

  return (
    <div className="w-full h-full min-h-0 max-w-none flex flex-col gap-4">
      {errMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errMsg}</div>
      ) : null}

      {/* topbar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div>
          {TXT.lastUpdate}: <b>{lastUpdated ? lastUpdated.toLocaleTimeString(locale) : "—"}</b>
        </div>
        <div className="flex items-center gap-3">
          {/* smaller topbar calculate (still available) */}
          <button
            type="button"
            onClick={onCalculate}
            disabled={calculating || !item?.no || !location?.no}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <Calculator size={14} /> {calculating ? TXT.calculating : TXT.calculate}
          </button>

          <button
            type="button"
            onClick={() => {
              setLocation(null);
              setItem(null);
              setResult(null);
              setUsedRows([]);
              setErrMsg("");
              setLastUpdated(null);
              setRowsSearch("");
              setHistQ("");
              loadHistory(1);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <RefreshCcw size={14} /> {TXT.reset}
          </button>
        </div>
      </div>

      {/* main card fills space */}
      <div className="relative w-full flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-visible flex flex-col">
        {/* ✅ overlay while calculating */}
        <CalculationOverlay
          open={calculating}
          title={SP.calculatingTitle || "Calculating suggested price"}
          subtitle={calcStage || (SP.calculatingSubtitle || "Fetching blocks, computing costs and percentiles…")}
          steps={[
            SP.calculatingStep1 || "Loading offer blocks for selected item",
            SP.calculatingStep2 || "Computing distances and cost adjustments",
            SP.calculatingStep3 || "Calculating percentile statistics and suggested price",
            SP.calculatingStep4 || "Saving history entry (if enabled)",
          ]}
        />

        {/* header */}
        <div className="px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                <Calculator size={14} className="text-slate-600" />
              </span>
              {TXT.cardTitle}
            </h3>

            <div className="flex items-center gap-2">
              <StatChip icon={Package} label={TXT.item.toUpperCase()} value={item?.no || "—"} />
              <StatChip icon={MapPin} label={TXT.location.toUpperCase()} value={location?.no || "—"} />
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-500">{TXT.note}</div>
        </div>

        {/* filters */}
        <div className="px-4 py-3 border-b bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LookupInput
              icon={MapPin}
              label={TXT.location}
              placeholder={TXT.pickLocation}
              valueLabel={location ? `${location.no}${location.name ? ` · ${location.name}` : ""}` : ""}
              query={locQuery}
              setQuery={setLocQuery}
              open={locOpen}
              setOpen={setLocOpen}
              loading={locLoading}
              rows={locRows}
              onPick={(r) => setLocation(r)}
              onClear={() => setLocation(null)}
              i18n={{
                typeToSearch: TXT.typeToSearch,
                close: TXT.close,
                clear: TXT.clear,
                loading: TXT.loading,
                noResults: TXT.noResults,
              }}
            />

            <LookupInput
              icon={Package}
              label={TXT.item}
              placeholder={TXT.pickItem}
              valueLabel={item ? `${item.no}${item.description ? ` · ${item.description}` : ""}` : ""}
              query={itemQuery}
              setQuery={setItemQuery}
              open={itemOpen}
              setOpen={setItemOpen}
              loading={itemLoading}
              rows={itemRows}
              onPick={(r) => setItem(r)}
              onClear={() => setItem(null)}
              i18n={{
                typeToSearch: TXT.typeToSearch,
                close: TXT.close,
                clear: TXT.clear,
                loading: TXT.loading,
                noResults: TXT.noResults,
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-3">
            <div>
              <div className="text-xs text-slate-600 mb-1">{TXT.metric}</div>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="unitPrice">{SP.metricUnitPrice || "Unit Price"}</option>
                <option value="lineValuePerUnit">{SP.metricLineValuePerUnit || "Line Value / Qty"}</option>
                <option value="lineValue">{SP.metricLineValue || "Line Value"}</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">{TXT.costMode}</div>
              <select
                value={costMode}
                onChange={(e) => setCostMode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="plus">{TXT.costModePlus}</option>
                <option value="minus">{TXT.costModeMinus}</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">{TXT.percentile}</div>
              <select
                value={String(pct)}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value={0.5}>P50</option>
                <option value={0.7}>P70</option>
                <option value={0.8}>P80</option>
                <option value={0.9}>P90</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">{TXT.statusOptional}</div>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder={TXT.statusPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
              />
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">{TXT.maxRows}</div>
              <input
                type="number"
                min={500}
                step={500}
                value={cap}
                onChange={(e) => setCap(Math.max(500, Number(e.target.value) || 10000))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
              />
            </div>
          </div>

          {/* ✅ Primary CTA row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onCalculate}
              disabled={calculating || !item?.no || !location?.no}
              className={[
                "inline-flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-xl",
                "text-sm font-semibold",
                "border shadow-sm",
                "transition-all",
                calculating ? "cursor-wait" : "",
                (calculating || !item?.no || !location?.no)
                  ? "bg-slate-200 text-slate-500 border-slate-200 opacity-70"
                  : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:shadow-md active:scale-[0.99]",
              ].join(" ")}
            >
              <Calculator size={18} className={calculating ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""} />
              {calculating ? TXT.calculating : TXT.calculate}
            </button>

            {!item?.no || !location?.no ? (
              <span className="text-xs text-slate-500">
                {!item?.no ? TXT.selectItemHint : SP.selectLocationHint || "Select Location to calculate costs."}
              </span>
            ) : calculating ? (
              <span className="text-xs text-slate-500">{calcStage || "Working…"}</span>
            ) : null}
          </div>
        </div>

        {/* content area fills remaining height, no page scroll */}
        <div className="px-4 py-3 bg-white flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          {/* result */}
          {!result ? (
            <div className="text-sm text-slate-500">{TXT.noResultYet}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  {TXT.suggestedPrice}:{" "}
                  <span className="font-semibold text-slate-900">
                    {result.suggested == null ? "—" : fmtMoney(result.suggested, locale, "PLN")}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {TXT.rowsUsed}: <b>{fmtNum(result.count || 0, locale)}</b> · {TXT.metric}: <b>{metricLabel}</b> ·{" "}
                  {TXT.percentile}: <b>{Math.round(result.percentile * 100)}%</b> · {TXT.method}: <b>{TXT.nearestRank}</b>
                </div>
              </div>

              {result.stats ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {[
                    [TXT.min, result.stats.min],
                    [TXT.avg, result.stats.avg],
                    [TXT.p50, result.stats.p50],
                    ["P" + Math.round(pct * 100), result.stats.p70],
                    [TXT.p90, result.stats.p90],
                    [TXT.max, result.stats.max],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
                      <div className="text-sm font-semibold text-slate-900">{fmtMoney(v, locale, "PLN")}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">{SP.noUsableValues || "No usable values found."}</div>
              )}
            </div>
          )}

          {/* two panels side-by-side on wide screens: Records used + History */}
          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
            {/* Records used */}
            <div className="flex flex-col min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm font-semibold text-slate-900">{TXT.recordsUsed}</div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={rowsSearch}
                      onChange={(e) => setRowsSearch(e.target.value)}
                      placeholder={TXT.searchRecords}
                      className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                    />
                  </div>
                  <select
                    value={rowsLimit}
                    onChange={(e) => setRowsLimit(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                        <th>{TXT.thDate}</th>
                        <th>{TXT.thDocument}</th>
                        <th>{TXT.thLine}</th>
                        <th>{TXT.thBlock}</th>
                        <th>{TXT.thStatus}</th>
                        <th className="text-right">{TXT.thValueUsed}</th>
                        <th className="text-right">{TXT.thUnitPrice}</th>
                        <th className="text-right">{TXT.thQty}</th>
                        <th className="text-right">{TXT.thLineValue}</th>
                        <th>{TXT.thLocation}</th>
                        <th>{TXT.thCity}</th>
                        <th className="text-right">{TXT.thDistanceKm}</th>
                        <th className="text-right">{TXT.thCostPerTon}</th>
                        <th className="text-right">{TXT.thTotalCost}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {filteredTableRows.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={14}>
                            {TXT.noRows}
                          </td>
                        </tr>
                      ) : (
                        filteredTableRows.map((r) => (
                          <tr key={r.id || r._id || `${r.documentNo}-${r.lineNo}-${r.block}`} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                              {r.__createdAt ? new Date(r.__createdAt).toLocaleString(locale) : "—"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.documentNo || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.lineNo ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.block ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.status || "—"}</td>

                            <td className="px-3 py-2 text-right font-semibold">
                              {fmtMoney(round2(r.__valueUsed), locale, "PLN")}
                            </td>
                            <td className="px-3 py-2 text-right">{fmtMoney(round2(r.__unitPrice), locale, "PLN")}</td>
                            <td className="px-3 py-2 text-right">{fmtNum(r.__qty, locale)}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(round2(r.__lineValue), locale, "PLN")}</td>

                            <td className="px-3 py-2 whitespace-nowrap">{r.locationNo || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.locationCity || "—"}</td>

                            <td className="px-3 py-2 text-right">
                              {Number.isFinite(r.__distanceKm) ? fmtNum(round2(r.__distanceKm), locale) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right">{fmtMoney(round2(r.__costPerTon || 0), locale, "PLN")}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(round2(r.__totalCostAbs || 0), locale, "PLN")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-3 py-2 bg-white border-t text-xs text-slate-500 flex flex-wrap justify-between gap-2">
                  <div>
                    {(SP.showing || "Showing")} <b>{filteredTableRows.length}</b> {(SP.of || "of")} <b>{usedRows.length}</b>{" "}
                    {(SP.usedRows || "used rows")}
                  </div>
                  <div>
                    {(SP.filters || "Filters")}: itemNo=<b>{item?.no || "—"}</b>
                    {status ? (
                      <>
                        , status=<b>{status}</b>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="flex flex-col min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm font-semibold text-slate-900">{TXT.history}</div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="accent-slate-700"
                      checked={histOnlyMine}
                      onChange={(e) => setHistOnlyMine(e.target.checked)}
                    />
                    {TXT.onlyMine}
                  </label>

                  <select
                    value={histPercentile}
                    onChange={(e) => setHistPercentile(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                  >
                    <option value="">{TXT.allPercentiles}</option>
                    <option value="0.5">P50</option>
                    <option value="0.7">P70</option>
                    <option value="0.8">P80</option>
                    <option value="0.9">P90</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={histQ}
                      onChange={(e) => setHistQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadHistory(1)}
                      placeholder={TXT.searchHistory}
                      className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => loadHistory(1)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                  >
                    {TXT.refresh}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                        <th>{TXT.thDate}</th>
                        <th>{TXT.thUser}</th>
                        <th>{TXT.item}</th>
                        <th>{TXT.thDestination}</th>
                        <th className="text-right">{TXT.thSuggested}</th>
                        <th>{TXT.percentile}</th>
                        <th>{TXT.metric}</th>
                        <th className="text-right">{TXT.thSamples}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {histLoading ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-3 text-slate-500">
                            {TXT.loading}
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-3 text-slate-500">
                            {SP.noHistory || "No history"}
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h._id} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                              {h.createdAt ? new Date(h.createdAt).toLocaleString(locale) : "—"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{h.userEmail || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{h.itemNo || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{h.locationNo || "—"}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {fmtMoney(Number(h.suggestedPrice || 0), locale, "PLN")}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {h.percentile != null ? `P${Math.round(Number(h.percentile) * 100)}` : "—"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{h.metric || "—"}</td>
                            <td className="px-3 py-2 text-right">{fmtNum(Number(h.sampleCount || 0), locale)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-3 py-2 bg-white border-t text-xs text-slate-500 flex flex-wrap justify-between gap-2">
                  <div>
                    {(SP.page || "Page")} <b>{histPage}</b> / <b>{histPages}</b>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={histLimit}
                      onChange={(e) => setHistLimit(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => loadHistory(Math.max(1, histPage - 1))}
                      disabled={histPage <= 1}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs disabled:opacity-50"
                    >
                      {TXT.prev}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadHistory(Math.min(histPages, histPage + 1))}
                      disabled={histPage >= histPages}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs disabled:opacity-50"
                    >
                      {TXT.next}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end two panels */}
        </div>
      </div>
    </div>
  );
}
