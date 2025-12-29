// src/pages/PurchaseOfferLines.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  Maximize2,
  MapPin,
  Minimize2,
  ChevronRight,
  Hash,
  FileText,
  Calendar as CalendarIcon,
  User as UserIcon,
  Truck,
  Calculator,
  SlidersHorizontal,
  Package,
  Layers,
  DollarSign,
  Percent,
  ClipboardList,
  ChevronUp,
} from "lucide-react";

import { useI18n as _useI18n } from "../helpers/i18n";
const useI18nSafe = _useI18n || (() => ({ t: null, locale: undefined }));

/* ---------------------------------------------------
   Status helpers (canonicalize + labels)  — purchase
--------------------------------------------------- */
const STATUS_CANON_MAP = {
  new: "new",
  on_hold: "on-hold",
  "on-hold": "on-hold",
  accepted: "accepted",
  approved: "approved",
  matched: "matched",
  mached: "matched",
  shipped: "shipped",
  invoiced: "invoiced",
  paid: "paid",
  canceled: "canceled",
};
const STATUS_LABELS = {
  new: "New",
  "on-hold": "On Hold",
  accepted: "Accepted",
  approved: "Approved",
  matched: "Matched",
  shipped: "Shipped",
  invoiced: "Invoiced",
  paid: "Paid (Closed)",
  canceled: "Canceled",
};
function canonStatus(s) {
  const k = String(s || "").toLowerCase();
  return STATUS_CANON_MAP[k] || k;
}
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const LINE_TYPES = [
  { id: "item", label: "Item" },
  { id: "description", label: "Description" },
];

const UOMS = ["SZT", "M2", "M3", "T", "KG"];

// Server-accepted sort keys (must match backend router)
const SERVER_SORT_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "lineNo",
  "status",
  "priority",
  "itemNo",
  "quantity",
  "unitPrice",
  "lineValue",
]);

function PurchaseOfferLineForm({
  initial,
  onCancel,
  onSaved,
  showNotice,
  docs = [],
  docsLoading = false,
  S,
  locale,
}) {
  // i18n + strings
  const { t } = useI18nSafe();
  const DEFAULT_S = {
    details: {
      core: "Core",
      amounts: "Amounts",
      parties: "Parties",
      audit: "Audit",
      params: "Parameters",
      kv: {
        lineNo: "Line No.",
        documentNo: "Document No.",
        documentId: "Document ID",
        status: "Status",
        priority: "Priority",
        type: "Type",
        itemNo: "Item No.",
        uom: "Unit of Measure",
        serviceDate: "Service / Delivery Date",
        requestedDeliveryDate: "Requested Delivery",
        promisedDeliveryDate: "Promised Delivery",
        shipmentDate: "Shipment Date",
        documentValidityDate: "Doc Validity Date",
        documentValidityHour: "Doc Validity Hour",
        unitPrice: "Unit Price",
        quantity: "Quantity",
        lineValue: "Line Value",
        tollCost: "Toll Cost",
        driverCost: "Driver Cost",
        vehicleCost: "Vehicle Cost",
        additionalCosts: "Additional Costs",
        costMarginPct: "Cost Margin %",
        transportCost: "Transport Cost",
        buyVendorNo: "Buy Vendor No.",
        payVendorNo: "Pay Vendor No.",
        locationNo: "Location No.",

        // 👇 NEW LABELS USED IN THE EXPANDED VIEW
        locationName: "Location Name",
        locationAddress: "Location Address",
        locationAddress2: "Location Address 2",
        locationPostCode: "Location Post Code",
        locationCity: "Location City",
        locationCountryCode: "Location Country / Region",

        createdBy: "Created By",
        createdAt: "Created At",
        modifiedBy: "Modified By",
        modifiedAt: "Modified At",
        param: (i) => `Param${i}`,
      },
    },

    actions: {
      cancel: "Cancel",
      saveChanges: "Save changes",
      createLine: "Create line",
    },
    form: { fixErrors: "Please correct the highlighted fields." },
    controls: {
      pickDocument: "Pick document…",
      searchItems: "Search items…",
      searchPlaceholder: "Search…",
    },
  };
  const I18N_S = t?.purchaseOfferLines || t?.lineForm || t?.lines || {};
  const SS = {
    details: {
      ...DEFAULT_S.details,
      ...(I18N_S.details || {}),
      ...(S?.details || {}),
      kv: {
        ...DEFAULT_S.details.kv,
        ...(I18N_S.details?.kv || {}),
        ...(S?.details?.kv || {}),
      },
    },
    actions: {
      ...DEFAULT_S.actions,
      ...(I18N_S.actions || {}),
      ...(S?.actions || {}),
    },
    form: { ...DEFAULT_S.form, ...(I18N_S.form || {}), ...(S?.form || {}) },
    controls: {
      ...DEFAULT_S.controls,
      ...(I18N_S.controls || {}),
      ...(S?.controls || {}),
    },
  };

  // UI state
  const isEdit = Boolean(initial?._id);
  const [tab, setTab] = React.useState("core");
  const [errors, setErrors] = React.useState({});
  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";

  // header-ish / keys
  const [documentNo, setDocumentNo] = React.useState(initial?.documentNo || "");
  const [lineNo] = React.useState(initial?.lineNo ?? null); // read-only on edit
  const [status, setStatus] = React.useState(
    canonStatus(initial?.status || "new")
  );
  const [priority, setPriority] = React.useState(
    Number.isFinite(Number(initial?.priority)) ? Number(initial.priority) : 0
  );
  const [lineType, setLineType] = React.useState(initial?.lineType || "item");

  // core
  const [itemNo, setItemNo] = React.useState(initial?.itemNo || "");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState(
    initial?.unitOfMeasure || "T"
  );
  const [unitPrice, setUnitPrice] = React.useState(initial?.unitPrice ?? 0);
  const [quantity, setQuantity] = React.useState(initial?.quantity ?? 0);

  // costs
  const [tollCost, setTollCost] = React.useState(initial?.tollCost ?? 0);
  const [driverCost, setDriverCost] = React.useState(initial?.driverCost ?? 0);
  const [vehicleCost, setVehicleCost] = React.useState(
    initial?.vehicleCost ?? 0
  );
  const [additionalCosts, setAdditionalCosts] = React.useState(
    initial?.additionalCosts ?? 0
  );
  const [costMargin, setCostMargin] = React.useState(initial?.costMargin ?? 0);

  // dates
  const [serviceDate, setServiceDate] = React.useState(
    initial?.serviceDate ? initial.serviceDate.slice(0, 10) : ""
  );
  const [requestedDeliveryDate, setRequestedDeliveryDate] = React.useState(
    initial?.requestedDeliveryDate
      ? initial.requestedDeliveryDate.slice(0, 10)
      : ""
  );
  const [promisedDeliveryDate, setPromisedDeliveryDate] = React.useState(
    initial?.promisedDeliveryDate
      ? initial.promisedDeliveryDate.slice(0, 10)
      : ""
  );
  const [shipmentDate, setShipmentDate] = React.useState(
    initial?.shipmentDate ? initial.shipmentDate.slice(0, 10) : ""
  );
  const [documentValidityDate, setDocumentValidityDate] = React.useState(
    initial?.documentValidityDate
      ? initial.documentValidityDate.slice(0, 10)
      : ""
  );
  const [documentValidityHour, setDocumentValidityHour] = React.useState(
    initial?.documentValidityHour || ""
  );

  // parties / links
  const [buyVendorNo, setBuyVendorNo] = React.useState(
    initial?.buyVendorNo || ""
  );
  const [payVendorNo, setPayVendorNo] = React.useState(
    initial?.payVendorNo || ""
  );
  const [locationNo, setLocationNo] = React.useState(initial?.locationNo || "");

  // NEW: location details (mirrors Buy)
  const [locationName, setLocationName] = React.useState(
    initial?.locationName || ""
  );
  const [locationAddress, setLocationAddress] = React.useState(
    initial?.locationAddress || ""
  );
  const [locationAddress2, setLocationAddress2] = React.useState(
    initial?.locationAddress2 || ""
  );
  const [locationPostCode, setLocationPostCode] = React.useState(
    initial?.locationPostCode || ""
  );
  const [locationCity, setLocationCity] = React.useState(
    initial?.locationCity || ""
  );
  const [locationCountryCode, setLocationCountryCode] = React.useState(
    initial?.locationCountryCode || ""
  );

  // params (1..5)
  const [p1c, setP1c] = React.useState(initial?.param1Code || "");
  const [p1v, setP1v] = React.useState(initial?.param1Value || "");
  const [p2c, setP2c] = React.useState(initial?.param2Code || "");
  const [p2v, setP2v] = React.useState(initial?.param2Value || "");
  const [p3c, setP3c] = React.useState(initial?.param3Code || "");
  const [p3v, setP3v] = React.useState(initial?.param3Value || "");
  const [p4c, setP4c] = React.useState(initial?.param4Code || "");
  const [p4v, setP4v] = React.useState(initial?.param4Value || "");
  const [p5c, setP5c] = React.useState(initial?.param5Code || "");
  const [p5v, setP5v] = React.useState(initial?.param5Value || "");

  // dynamic parameter defaults/metadata
  const [paramMeta, setParamMeta] = React.useState({});
  const [defaultParamCodes, setDefaultParamCodes] = React.useState([]);

  // computed previews
  const computedLineValue = React.useMemo(() => {
    const q = Number(quantity) || 0;
    const up = Number(unitPrice) || 0;
    return Math.round(q * up * 100) / 100;
  }, [quantity, unitPrice]);

  const computedTransport = React.useMemo(() => {
    const base =
      (Number(tollCost) || 0) +
      (Number(driverCost) || 0) +
      (Number(vehicleCost) || 0) +
      (Number(additionalCosts) || 0);
    const m = (Number(costMargin) || 0) / 100;
    return Math.round(base * (1 + m) * 100) / 100;
  }, [tollCost, driverCost, vehicleCost, additionalCosts, costMargin]);

  const TABS = [
    { id: "core", label: SS.details.core, Icon: FileText },
    { id: "dates", label: "Dates", Icon: CalendarIcon },
    { id: "costs", label: SS.details.amounts, Icon: DollarSign },
    { id: "parties", label: SS.details.parties, Icon: UserIcon },
    { id: "params", label: SS.details.params, Icon: SlidersHorizontal },
    { id: "audit", label: SS.details.audit, Icon: ClipboardList },
  ];

  const isItem = (lineType || "").toLowerCase() === "item";


  // helper
  function toInputDate(v) {
    if (!v) return "";
    try {
      return new Date(v).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  // autofill when document changes
  React.useEffect(() => {
    if (!documentNo) return;
    const header = (docs || []).find((d) => d.documentNo === documentNo);
    if (!header) return;

    setBuyVendorNo((prev) => prev || header.buyVendorNo || "");
    setPayVendorNo(
      (prev) => prev || header.payVendorNo || header.buyVendorNo || ""
    );
    setLocationNo((prev) => prev || header.locationNo || "");

    // NEW: inherit detailed location from header
  setLocationName((prev) => prev || header.locationName || "");
  setLocationAddress((prev) => prev || header.locationAddress || "");
  setLocationAddress2((prev) => prev || header.locationAddress2 || "");
  setLocationPostCode((prev) => prev || header.locationPostCode || "");
  setLocationCity((prev) => prev || header.locationCity || "");

  // 👇 take country from header.locationCountry (and fallbacks)
  const hdrCountry =
    header.locationCountryCode ||
    header.locationCountry ||        // <-- this is what you have: "POLAND"
    header.buyVendorCountry ||
    header.payVendorCountry ||
    header.countryRegionCode ||
    header.countryCode ||
    header.country ||
    header.country_region_code ||
    header.CountryRegionCode ||
    "";

  setLocationCountryCode((prev) =>
    prev || (hdrCountry ? String(hdrCountry).toUpperCase() : "")
  );

    setServiceDate((prev) => prev || toInputDate(header.serviceDate));
    setRequestedDeliveryDate(
      (prev) => prev || toInputDate(header.requestedDeliveryDate)
    );
    setPromisedDeliveryDate(
      (prev) => prev || toInputDate(header.promisedDeliveryDate)
    );
    setShipmentDate((prev) => prev || toInputDate(header.shipmentDate));
    setDocumentValidityDate(
      (prev) => prev || toInputDate(header.documentValidityDate)
    );

    setStatus((prev) => (prev ? prev : canonStatus(header.status || "new")));
  }, [documentNo, docs]);

  // Load default parameter codes for the selected item
  React.useEffect(() => {
    let abort = false;
    (async () => {
      const no = (itemNo || "").trim().toUpperCase();
      if (!no) {
        if (!abort) setDefaultParamCodes([]);
        return;
      }
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "50",
          sort: "parameterCode:1",
          itemNo: no,
        });
        const res = await fetch(
          `${API}/api/mdefault-item-parameters?${qs.toString()}`
        );
        const json = await res.json();
        const codes = Array.from(
          new Set(
            (json?.data || [])
              .map((r) => (r.parameterCode || "").toUpperCase())
              .filter(Boolean)
          )
        );
        if (!abort) setDefaultParamCodes(codes);
      } catch {
        if (!abort) setDefaultParamCodes([]);
      }
    })();
    return () => {
      abort = true;
    };
  }, [itemNo]);

  // Fetch metadata for loaded codes + prefill values
  React.useEffect(() => {
    let abort = false;
    (async () => {
      if (!defaultParamCodes?.length) {
        if (!abort) setParamMeta({});
        return;
      }

      const exact = defaultParamCodes
        .map((c) => String(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");

      const qs = new URLSearchParams({
        page: "1",
        limit: "500",
        sort: "code:1",
        query: `^(${exact})$`,
      });

      try {
        const res = await fetch(`${API}/api/params?${qs.toString()}`);
        const json = await res.json();
        const map = {};

        for (const p of json?.data || []) {
          const code = (p.code || "").toUpperCase();
          let dv = null;
          if (p.defaultValueText != null) dv = p.defaultValueText;
          else if (p.defaultValueBoolean != null) dv = p.defaultValueBoolean;
          else if (p.defaultValueDecimal != null) {
            const decRaw =
              typeof p.defaultValueDecimal === "object" &&
              p.defaultValueDecimal?.$numberDecimal != null
                ? p.defaultValueDecimal.$numberDecimal
                : p.defaultValueDecimal;
            dv = decRaw != null ? Number(decRaw) : null;
          }
          map[code] = {
            description: p.description || "",
            defaultValue: dv,
            type: p.type || "decimal",
          };
        }

        if (!abort) {
          setParamMeta(map);

          // Prefill values where empty
          const [c1, c2, c3, c4, c5] = defaultParamCodes.map((c) =>
            c?.toUpperCase()
          );
          const ensure = (dv) => (prev) =>
            prev == null || prev === "" ? dv ?? "" : prev;
          setP1v(ensure(map[c1]?.defaultValue));
          setP2v(ensure(map[c2]?.defaultValue));
          setP3v(ensure(map[c3]?.defaultValue));
          setP4v(ensure(map[c4]?.defaultValue));
          setP5v(ensure(map[c5]?.defaultValue));
        }
      } catch {
        if (!abort) setParamMeta({});
      }
    })();
    return () => {
      abort = true;
    };
  }, [defaultParamCodes]);

  // Push default codes into slots when codes change
  React.useEffect(() => {
    if (!defaultParamCodes.length) return;
    const [c1, c2, c3, c4, c5] = defaultParamCodes;
    setP1c(c1 || "");
    setP2c(c2 || "");
    setP3c(c3 || "");
    setP4c(c4 || "");
    setP5c(c5 || "");
  }, [defaultParamCodes]);

  // Save
  async function save(e) {
    e.preventDefault();

    // ----- 1) validate -----
    const errs = {};
    if (!documentNo.trim()) errs.documentNo = "Document No. *";
    if (isItem && !itemNo.trim()) errs.itemNo = "Item No. *";
    if (!isEdit && !getUserCode())
      errs.userCreated = "Missing user code (session).";
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.documentNo || errs.itemNo || errs.userCreated) setTab("core");
      return;
    }

// ----- 2) payload -----
const price = Number(unitPrice) || 0;
const qty = Number(quantity) || 0;

const payload = {
  documentNo: documentNo.trim(),
  status: canonStatus(status),
  priority: [0, 1, 2].includes(Number(priority)) ? Number(priority) : 0,
  lineType: (lineType || "item").toLowerCase(),
  lineNo: isEdit ? lineNo : undefined,

  itemNo: itemNo || null,
  unitOfMeasure: (unitOfMeasure || "T").toUpperCase(),
  unitPrice: price,
  quantity: qty,
  lineValue: +(price * qty).toFixed(2),

  tollCost: Number(tollCost) || 0,
  driverCost: Number(driverCost) || 0,
  vehicleCost: Number(vehicleCost) || 0,
  additionalCosts: Number(additionalCosts) || 0,
  costMargin: Number(costMargin) || 0,

  serviceDate,
  requestedDeliveryDate,
  promisedDeliveryDate,
  shipmentDate,
  documentValidityDate,
  documentValidityHour,

  buyVendorNo: buyVendorNo || null,
  payVendorNo: payVendorNo || null,
  locationNo: locationNo || null,

  locationName: locationName || null,
  locationAddress: locationAddress || null,
  locationAddress2: locationAddress2 || null,
  locationPostCode: locationPostCode || null,
  locationCity: locationCity || null,
  locationCountryCode: locationCountryCode || null,

  param1Code: p1c || null,
  param1Value: p1v || null,
  param2Code: p2c || null,
  param2Value: p2v || null,
  param3Code: p3c || null,
  param3Value: p3v || null,
  param4Code: p4c || null,
  param4Value: p4v || null,
  param5Code: p5c || null,
  param5Value: p5v || null,
};


    const nowIso = new Date().toISOString();
    const userCode = getUserCode();
    if (!isEdit) {
      payload.userCreated = userCode;
      payload.dateCreated = nowIso;
    } else {
      payload.userModified = userCode;
      payload.dateModified = nowIso;
    }

    // ----- 3) save line -----
    try {
      const url = isEdit
        ? `${API}/api/purchase-offer-lines/${initial._id}`
        : `${API}/api/purchase-offer-lines`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice?.("error", json?.message || "Save failed");
        return;
      }

      const saved = json || {};

      // ----- 4) (re)build PURCHASE blocks (DELETE then POST chunks only) -----
      try {
        const mustResync =
          !isEdit ||
          Number(saved.quantity) !== Number(initial?.quantity) ||
          Number(saved.unitPrice) !== Number(initial?.unitPrice) ||
          String(saved.unitOfMeasure || "").toUpperCase() !==
            String(initial?.unitOfMeasure || "").toUpperCase() ||
          Number(saved.tollCost) !== Number(initial?.tollCost) ||
          Number(saved.driverCost) !== Number(initial?.driverCost) ||
          Number(saved.vehicleCost) !== Number(initial?.vehicleCost) ||
          Number(saved.additionalCosts) !== Number(initial?.additionalCosts) ||
          Number(saved.costMargin) !== Number(initial?.costMargin) ||
          String(saved.status || "") !== String(initial?.status || "") ||
          String(saved.itemNo || "") !== String(initial?.itemNo || "");

        if (mustResync) {
          await createPurchaseBlocksForLine(saved, userCode);
        }
      } catch (e) {
        showNotice?.(
          "error",
          e?.message || "Failed to (re)create purchase blocks."
        );
        // If blocks must be atomic with line save, uncomment:
        // return;
      }

      // ----- 5) sync purchase line parameters -----
      try {
        const docNoForParams = (
          saved.documentNo ||
          payload.documentNo ||
          ""
        ).toUpperCase();
        const lineNoForParams =
          saved.lineNo != null
            ? String(saved.lineNo)
            : lineNo != null
            ? String(lineNo)
            : null;

        if (lineNoForParams) {
          const fallback = (i) => (defaultParamCodes?.[i] || "").toUpperCase();
          const paramsForSync = [
            { code: p1c || fallback(0), value: p1v },
            { code: p2c || fallback(1), value: p2v },
            { code: p3c || fallback(2), value: p3v },
            { code: p4c || fallback(3), value: p4v },
            { code: p5c || fallback(4), value: p5v },
          ].filter((p) => p.code);

          await syncPurchaseLineParams({
            documentNo: docNoForParams,
            documentLineNo: String(lineNoForParams),
            params: paramsForSync,
            removeMissing: true,
          });
        }
      } catch (e) {
        showNotice?.("error", e?.message || "Parameters sync failed.");
      }

      // ----- 6) done -----
      showNotice?.("success", isEdit ? "Line updated." : "Line created.");
      onSaved?.();
    } catch {
      showNotice?.("error", "Save failed");
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {/* sticky segmented tabs */}
      <div className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
                ].join(" ")}
              >
                <t.Icon
                  size={16}
                  className={active ? "opacity-80" : "opacity-60"}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* error banner */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {SS.form?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* CORE */}
      {tab === "core" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field
            label={SS.details.kv.documentNo}
            icon={Hash}
            error={errors.documentNo}
          >
            <DocumentPicker
              value={documentNo}
              onChange={(val) => setDocumentNo(val)}
              options={docs}
              loading={docsLoading}
              placeholder={SS.controls?.pickDocument || "Pick document…"}
            />
          </Field>

          <Field label={SS.details.kv.status} icon={ClipboardList}>
            <select
              className={INPUT_CLS}
              value={status}
              onChange={(e) => setStatus(canonStatus(e.target.value))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={SS.details.kv.priority || "Priority"} icon={SlidersHorizontal}>
            <select
              className={INPUT_CLS}
              value={String(priority)}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value="0">0 (Low)</option>
              <option value="1">1 (Normal)</option>
              <option value="2">2 (High)</option>
            </select>
          </Field>

          <Field label={SS.details.kv.type} icon={Layers}>
            <select
              className={INPUT_CLS}
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
            >
              {LINE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          {isEdit && (
            <Field label={SS.details.kv.lineNo} icon={Hash}>
              <input className={INPUT_CLS} value={lineNo ?? ""} disabled />
            </Field>
          )}

          <Field
            label={SS.details.kv.itemNo}
            icon={Package}
            error={isItem ? errors.itemNo : undefined}
          >
            {isItem ? (
              <ItemPicker
                value={itemNo}
                onPick={(it) => {
                  setItemNo(it.no || "");
                  setUnitOfMeasure(
                    (prev) => prev || it.baseUnitOfMeasure || prev
                  );
                  setUnitPrice((prev) =>
                    prev && Number(prev) > 0 ? prev : Number(it.unitPrice) || 0
                  );
                }}
                placeholder={
                  SS.controls?.searchItems ||
                  SS.controls?.searchPlaceholder ||
                  "Search items…"
                }
              />
            ) : (
              <input
                className={INPUT_CLS}
                value={itemNo}
                onChange={(e) => setItemNo(e.target.value)}
                disabled={!isItem}
              />
            )}
          </Field>

          <Field label={SS.details.kv.uom} icon={Package}>
            <select
              className={INPUT_CLS}
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            >
              {UOMS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label={SS.details.kv.unitPrice} icon={DollarSign}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              disabled={!isItem}
            />
          </Field>

          <Field label={SS.details.kv.quantity} icon={Package}>
            <input
              type="number"
              step="0.001"
              className={INPUT_CLS}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!isItem}
            />
          </Field>

          <Field label={SS.details.kv.lineValue} icon={DollarSign}>
            <input
              className={INPUT_CLS}
              value={fmtDOT(computedLineValue, 2, locale)}
              disabled
            />
          </Field>
        </div>
      )}

      {/* DATES */}
      {tab === "dates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.serviceDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </Field>
          <Field
            label={SS.details.kv.requestedDeliveryDate}
            icon={CalendarIcon}
          >
            <input
              type="date"
              className={INPUT_CLS}
              value={requestedDeliveryDate}
              onChange={(e) => setRequestedDeliveryDate(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.promisedDeliveryDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={promisedDeliveryDate}
              onChange={(e) => setPromisedDeliveryDate(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.shipmentDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={shipmentDate}
              onChange={(e) => setShipmentDate(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.documentValidityDate} icon={CalendarIcon}>
            <input
              type="date"
              className={INPUT_CLS}
              value={documentValidityDate}
              onChange={(e) => setDocumentValidityDate(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.documentValidityHour} icon={CalendarIcon}>
            <input
              type="time"
              className={INPUT_CLS}
              value={documentValidityHour}
              onChange={(e) => setDocumentValidityHour(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* COSTS */}
      {tab === "costs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.tollCost} icon={Truck}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={tollCost}
              onChange={(e) => setTollCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.driverCost} icon={UserIcon}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={driverCost}
              onChange={(e) => setDriverCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.vehicleCost} icon={Truck}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={vehicleCost}
              onChange={(e) => setVehicleCost(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.additionalCosts} icon={FileText}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.costMarginPct} icon={Percent}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLS}
              value={costMargin}
              onChange={(e) => setCostMargin(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.transportCost} icon={Truck}>
            <input
              className={INPUT_CLS}
              value={fmtDOT(computedTransport, 2, locale)}
              disabled
            />
          </Field>
        </div>
      )}

      {/* PARTIES */}
      {/* PARTIES */}
      {tab === "parties" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.buyVendorNo} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={buyVendorNo}
              onChange={(e) => setBuyVendorNo(e.target.value)}
            />
          </Field>

          <Field label={SS.details.kv.payVendorNo} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={payVendorNo}
              onChange={(e) => setPayVendorNo(e.target.value)}
            />
          </Field>

          <Field label={SS.details.kv.locationNo} icon={MapPin}>
            <LocationPicker
              value={locationNo}
              onPick={(loc) => {
                const code = loc.code || loc.no || loc.locationNo || "";
                setLocationNo(code);
                setLocationName(loc.name || loc.locationName || "");
                setLocationAddress(loc.address || loc.locationAddress || "");
                setLocationAddress2(loc.address2 || loc.locationAddress2 || "");
                setLocationPostCode(
                  loc.postCode || loc.postcode || loc.locationPostCode || ""
                );
                setLocationCity(loc.city || loc.locationCity || "");

                // 👇 more tolerant country resolution
                const country =
                  loc.countryRegionCode ||
                  loc.countryCode ||
                  loc.locationCountryCode ||
                  loc.country || // e.g. "PL"
                  loc.country_region_code || // snake_case
                  loc.CountryRegionCode || // NAV-style
                  "";

                setLocationCountryCode(
                  country ? String(country).toUpperCase() : ""
                );
              }}
              placeholder={
                SS.controls?.pickLocation ||
                SS.controls?.searchLocations ||
                "Pick location…"
              }
            />
          </Field>

          {/* NEW: read-only / editable location details (same grid row or new rows) */}
          <Field label={SS.details.kv.locationName} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationAddress} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationAddress2} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationAddress2}
              onChange={(e) => setLocationAddress2(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationPostCode} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationPostCode}
              onChange={(e) => setLocationPostCode(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationCity} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
            />
          </Field>
          <Field label={SS.details.kv.locationCountryCode} icon={MapPin}>
            <input
              className={INPUT_CLS}
              value={locationCountryCode}
              onChange={(e) =>
                setLocationCountryCode(e.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
      )}

      {/* AUDIT (read-only) */}
      {tab === "audit" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={SS.details.kv.createdBy} icon={UserIcon}>
            <input
              className={INPUT_CLS}
              value={initial?.userCreated || "—"}
              disabled
            />
          </Field>
          <Field label={SS.details.kv.createdAt} icon={CalendarIcon}>
            <input
              className={INPUT_CLS}
              value={
                initial?.dateCreated
                  ? new Date(initial.dateCreated).toLocaleString()
                  : "—"
              }
              disabled
            />
          </Field>
          <div />
          <Field label={SS.details.kv.modifiedBy} icon={UserIcon}>
            <input
              className={INPUT_CLS}
              value={initial?.userModified || "—"}
              disabled
            />
          </Field>
          <Field label={SS.details.kv.modifiedAt} icon={CalendarIcon}>
            <input
              className={INPUT_CLS}
              value={
                initial?.dateModified
                  ? new Date(initial.dateModified).toLocaleString()
                  : "—"
              }
              disabled
            />
          </Field>
          <div />
          <Field label={SS.details.kv.documentId} icon={Hash}>
            <input
              className={INPUT_CLS}
              value={initial?.documentId || "—"}
              disabled
            />
          </Field>
        </div>
      )}

      {/* PARAMS */}
      {tab === "params" && (
        <div className="space-y-2">
          {defaultParamCodes?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Loaded <b>{defaultParamCodes.length}</b> default parameter
              {defaultParamCodes.length === 1 ? "" : "s"} for item{" "}
              <span className="font-mono">{itemNo || "—"}</span>.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ParamRow
              idx="1"
              c={p1c}
              v={p1v}
              setC={setP1c}
              setV={setP1v}
              defaultCode={defaultParamCodes?.[0]}
              description={
                paramMeta[defaultParamCodes?.[0]?.toUpperCase()]?.description
              }
              defaultValue={
                paramMeta[defaultParamCodes?.[0]?.toUpperCase()]?.defaultValue
              }
              paramType={paramMeta[defaultParamCodes?.[0]?.toUpperCase()]?.type}
            />
            <ParamRow
              idx="2"
              c={p2c}
              v={p2v}
              setC={setP2c}
              setV={setP2v}
              defaultCode={defaultParamCodes?.[1]}
              description={
                paramMeta[defaultParamCodes?.[1]?.toUpperCase()]?.description
              }
              defaultValue={
                paramMeta[defaultParamCodes?.[1]?.toUpperCase()]?.defaultValue
              }
              paramType={paramMeta[defaultParamCodes?.[1]?.toUpperCase()]?.type}
            />
            <ParamRow
              idx="3"
              c={p3c}
              v={p3v}
              setC={setP3c}
              setV={setP3v}
              defaultCode={defaultParamCodes?.[2]}
              description={
                paramMeta[defaultParamCodes?.[2]?.toUpperCase()]?.description
              }
              defaultValue={
                paramMeta[defaultParamCodes?.[2]?.toUpperCase()]?.defaultValue
              }
              paramType={paramMeta[defaultParamCodes?.[2]?.toUpperCase()]?.type}
            />
            <ParamRow
              idx="4"
              c={p4c}
              v={p4v}
              setC={setP4c}
              setV={setP4v}
              defaultCode={defaultParamCodes?.[3]}
              description={
                paramMeta[defaultParamCodes?.[3]?.toUpperCase()]?.description
              }
              defaultValue={
                paramMeta[defaultParamCodes?.[3]?.toUpperCase()]?.defaultValue
              }
              paramType={paramMeta[defaultParamCodes?.[3]?.toUpperCase()]?.type}
            />
            <ParamRow
              idx="5"
              c={p5c}
              v={p5v}
              setC={setP5c}
              setV={setP5v}
              defaultCode={defaultParamCodes?.[4]}
              description={
                paramMeta[defaultParamCodes?.[4]?.toUpperCase()]?.description
              }
              defaultValue={
                paramMeta[defaultParamCodes?.[4]?.toUpperCase()]?.defaultValue
              }
              paramType={paramMeta[defaultParamCodes?.[4]?.toUpperCase()]?.type}
            />
          </div>
        </div>
      )}

      {/* footer buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {SS.actions?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit
            ? SS.actions?.saveChanges || "Save changes"
            : SS.actions?.createLine || "Create line"}
        </button>
      </div>
    </form>
  );
}

/* -----------------------
   API base (same style)
----------------------- */
const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

/* ===== session helpers ===== */
function getSession() {
  try {
    if (window.__APP_SESSION__) return window.__APP_SESSION__;
    const raw = localStorage.getItem("session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getUserCode(fallback = "web") {
  const sess = getSession();
  return (
    (window.__APP_USER__ &&
      (window.__APP_USER__.code || window.__APP_USER__.username)) ||
    (sess && (sess.code || sess.username || sess.email)) ||
    localStorage.getItem("userCode") ||
    fallback
  );
}

function docLabel(d) {
  const parts = [d.documentNo];
  // Prefer purchase-side names
  if (d.buyVendorName) parts.push(d.buyVendorName);
  else if (d.payVendorName) parts.push(d.payVendorName);
  else if (d.locationName) parts.push(d.locationName);
  else if (d.brokerName) parts.push(d.brokerName);
  if (d.documentDate) parts.push(new Date(d.documentDate).toLocaleDateString());
  return parts.filter(Boolean).join(" — ");
}

/* =========================================
   PAGE — PurchaseOfferLinesPage
========================================= */
export default function PurchaseOfferLinesPage() {
  const COL_COUNT = 16; // includes Priority column

  const { t, locale } = useI18nSafe();

  const S = (t && t.purchaseOfferLines) || {
    controls: {
      searchPlaceholder: "Search item/params…",
      searchBtn: "Search",
      addBtn: "New Line",
      filters: "Filters",
      docsLoading: "Loading documents…",
      allDocuments: "All documents",
      allStatuses: "All statuses",
      allLineTypes: "All line types",
      itemNoPlaceholder: "Item No.",
      pickDocument: "Pick document…",
      searchItems: "Search items…",
    },
    table: {
      lineNo: "Line No.",
      documentNo: "Document No.",
      status: "Status",
      priority: "Priority",
      type: "Type",
      item: "Item",
      uom: "UOM",
      unitPrice: "Unit Price",
      qty: "Qty",
      lineValue: "Line Value",
      transport: "Transport",
      created: "Created",
      updated: "Updated",
      actions: "Actions",
      loading: "Loading…",
      empty: "No lines",
    },
    a11y: { toggleDetails: "Toggle details" },
    details: {
      core: "Core",
      amounts: "Amounts",
      parties: "Parties",
      audit: "Audit",
      params: "Parameters",
      kv: {
        lineNo: "Line No.",
        documentNo: "Document No.",
        documentId: "Document ID",
        status: "Status",
        priority: "Priority",
        type: "Type",
        itemNo: "Item No.",
        uom: "Unit of Measure",
        serviceDate: "Service / Delivery Date",
        requestedDeliveryDate: "Requested Delivery",
        promisedDeliveryDate: "Promised Delivery",
        shipmentDate: "Shipment Date",
        documentValidityDate: "Doc Validity Date",
        documentValidityHour: "Doc Validity Hour",
        unitPrice: "Unit Price",
        quantity: "Quantity",
        lineValue: "Line Value",
        tollCost: "Toll Cost",
        driverCost: "Driver Cost",
        vehicleCost: "Vehicle Cost",
        additionalCosts: "Additional Costs",
        costMarginPct: "Cost Margin %",
        transportCost: "Transport Cost",
        buyVendorNo: "Buy Vendor No.",
        payVendorNo: "Pay Vendor No.",
        locationNo: "Location No.",
        locationName: "Location Name",
        locationAddress: "Location Address",
        locationAddress2: "Location Address 2",
        locationPostCode: "Location Post Code",
        locationCity: "Location City",
        locationCountryCode: "Location Country / Region",
        createdBy: "Created By",
        createdAt: "Created At",
        modifiedBy: "Modified By",
        modifiedAt: "Modified At",
        param: (i) => `Param${i}`,
      },
    },
    footer: {
      meta: (total, page, pages) =>
        `Total: ${total} • Page ${page} of ${pages || 1}`,
      perPage: (n) => `${n} / page`,
      prev: "Prev",
      next: "Next",
    },
    modal: {
      titleEdit: "Edit Purchase Offer Line",
      titleNew: "New Purchase Offer Line",
    },
    actions: {
      cancel: "Cancel",
      saveChanges: "Save changes",
      createLine: "Create line",
    },
    form: {
      fixErrors: "Please correct the highlighted fields.",
    },
  };

  // filters / paging
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [status, setStatus] = useState("");
  const [lineType, setLineType] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [itemNo, setItemNo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [documentNo, status, lineType, priorityFilter, itemNo].filter(
    Boolean
  ).length;

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const [sortBy, setSortBy] = useState("lineNo");
  const [sortDir, setSortDir] = useState("asc");
  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  // data
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  // UI
  const [expandedId, setExpandedId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // fetch documents for picker (shared header list)
  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      setDocsLoading(true);
      try {
        const res = await fetch(
          `${API}/api/purchase-offers?limit=1000&sortBy=createdAt&sortDir=desc`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const raw = Array.isArray(json?.data) ? json.data : [];
        const normalized = raw.map((d) => ({
          ...d,
          documentNo: d.documentNo || d.no || "",
        }));
        const seen = new Set();
        const available = normalized.filter((d) => {
          if (!d.documentNo) return false;
          if (seen.has(d.documentNo)) return false;
          seen.add(d.documentNo);
          return true;
        });

        if (!cancelled) setDocs(available);
      } catch (e) {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    }
    loadDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch purchase lines
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (SERVER_SORT_KEYS.has(String(sortBy))) {
        params.set("sortBy", String(sortBy));
        params.set(
          "sortDir",
          String(sortDir).toLowerCase() === "desc" ? "desc" : "asc"
        );
      }

      if (q) params.set("q", q);
      if (documentNo) params.set("documentNo", documentNo);
      if (status) params.set("status", canonStatus(status));
      if (lineType) params.set("lineType", String(lineType).toLowerCase());
      if (priorityFilter !== "") params.set("priority", String(priorityFilter));
      if (itemNo) params.set("itemNo", itemNo);

      const res = await fetch(
        `${API}/api/purchase-offer-lines?${params.toString()}`
      );
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", "Failed to load lines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, limit, status, lineType, priorityFilter, itemNo, sortBy, sortDir, documentNo]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (_id) => {
    if (!window.confirm("Delete this line?")) return;
    try {
      const res = await fetch(`${API}/api/purchase-offer-lines/${_id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        if (expandedId === _id) setExpandedId(null);
        showNotice("success", "Line deleted.");
        fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice("error", json?.message || "Request failed");
      }
    } catch {
      showNotice("error", "Request failed");
    }
  };

  const onRecalc = async (_id) => {
    try {
      const res = await fetch(`${API}/api/purchase-offer-lines/${_id}/recalc`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice("error", json?.message || "Recalc failed");
        return;
      }
      showNotice("success", "Recalculated.");
      fetchData();
    } catch {
      showNotice("error", "Recalc failed");
    }
  };

  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const k = sortBy;
    const val = (r) => {
      const v = r?.[k];
      if (
        k === "createdAt" ||
        k === "updatedAt" ||
        k === "dateCreated" ||
        k === "dateModified"
      ) {
        return v ? new Date(v).getTime() : 0;
      }
      return typeof v === "number" ? v : (v ?? "").toString().toLowerCase();
    };
    arr.sort((a, b) => {
      const av = val(a),
        bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [data.data, sortBy, sortDir]);


    // =========================
  // Bulk selection + delete (PAGE LEVEL)
  // =========================
  const [selectedIds, setSelectedIds] = useState([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;

  const currentPageIds = useMemo(() => {
    return (rows || data?.data || []).map((r) => r?._id).filter(Boolean);
  }, [rows, data?.data]);

  const allOnPageSelected = useMemo(() => {
    if (!currentPageIds.length) return false;
    for (const id of currentPageIds) if (!selectedSet.has(id)) return false;
    return true;
  }, [currentPageIds, selectedSet]);

  const toggleOne = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (allOnPageSelected) {
        for (const id of currentPageIds) s.delete(id);
      } else {
        for (const id of currentPageIds) s.add(id);
      }
      return Array.from(s);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const onBulkDelete = async () => {
    const ids = Array.from(selectedSet);
    if (!ids.length) return;

    const ok = window.confirm(`Delete ${ids.length} selected line(s)?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/purchase-offer-lines/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showNotice("error", json?.message || "Bulk delete failed");
        return;
      }

      if (expandedId && selectedSet.has(expandedId)) setExpandedId(null);

      showNotice("success", `Deleted ${json?.deleted ?? 0} line(s).`);
      clearSelection();
      fetchData();
    } catch (e) {
      showNotice("error", e?.message || "Bulk delete failed");
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
            placeholder={S.controls.searchPlaceholder}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            title={S.controls.searchBtn}
            aria-label={S.controls.searchBtn}
          >
            <Search size={14} />
          </button>
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="order-1 sm:order-none sm:ml-auto flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-900/90 px-2 py-1 font-semibold text-white">
                Selected: {selectedCount}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onBulkDelete}
            disabled={selectedCount === 0}
            className={[
              "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium shadow-sm",
              selectedCount === 0
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30",
            ].join(" ")}
            title="Delete selected"
          >
            <Trash2 size={16} />
            Delete selected
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {S.controls.addBtn}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
          aria-expanded={showFilters}
          aria-controls="pol-filters-panel"
        >
          <SlidersHorizontal size={16} className="opacity-70" />
          {S.controls.filters}
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Row */}
      <div
        id="pol-filters-panel"
        className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-5 ${
          showFilters ? "grid" : "hidden md:grid"
        }`}
      >
        <select
          value={documentNo}
          onChange={(e) => {
            setDocumentNo(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">
            {docsLoading ? S.controls.docsLoading : S.controls.allDocuments}
          </option>
          {docs.map((d) => (
            <option key={d._id} value={d.documentNo}>
              {docLabel(d)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(canonStatus(e.target.value));
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">{S.controls.allStatuses}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">All priorities</option>
          <option value="0">0 (Low)</option>
          <option value="1">1 (Normal)</option>
          <option value="2">2 (High)</option>
        </select>

        <select
          value={lineType}
          onChange={(e) => {
            setLineType(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        >
          <option value="">{S.controls.allLineTypes}</option>
          {LINE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          value={itemNo}
          onChange={(e) => {
            setItemNo(e.target.value);
            setPage(1);
          }}
          placeholder={S.controls.itemNoPlaceholder}
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
        />
        <div className="hidden md:block" />
      </div>
    </form>

    {/* Table */}
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {/* expand */}
              <Th />

              {/* selection */}
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label="Select all on this page"
                />
              </Th>

              <SortableTh id="lineNo" {...{ sortBy, sortDir, onSort }}>
                {S.table.lineNo}
              </SortableTh>
              <Th>{S.table.documentNo}</Th>
              <SortableTh id="status" {...{ sortBy, sortDir, onSort }}>
                {S.table.status}
              </SortableTh>
              <SortableTh id="priority" {...{ sortBy, sortDir, onSort }}>
                {S.table.priority || "Priority"}
              </SortableTh>
              <Th>{S.table.type}</Th>
              <SortableTh id="itemNo" {...{ sortBy, sortDir, onSort }}>
                {S.table.item}
              </SortableTh>
              <Th>{S.table.uom}</Th>
              <SortableTh
                id="unitPrice"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.unitPrice}
              </SortableTh>
              <SortableTh
                id="quantity"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.qty}
              </SortableTh>
              <SortableTh
                id="lineValue"
                {...{ sortBy, sortDir, onSort }}
                className="text-right"
              >
                {S.table.lineValue}
              </SortableTh>
              <Th className="text-right">{S.table.transport}</Th>
              <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                {S.table.created}
              </SortableTh>
              <SortableTh id="updatedAt" {...{ sortBy, sortDir, onSort }}>
                {S.table.updated}
              </SortableTh>
              <Th className="pr-3">{S.table.actions}</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                  {S.table.loading}
                </td>
              </tr>
            ) : (data.data?.length || 0) === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="p-6 text-center text-slate-500">
                  {S.table.empty}
                </td>
              </tr>
            ) : (
              (rows || data.data).map((d) => (
                <React.Fragment key={d._id}>
                  <tr className="border-t">
                    {/* expand */}
                    <Td className="w-8">
                      <button
                        className="p-1 rounded hover:bg-slate-100"
                        onClick={() =>
                          setExpandedId((id) => (id === d._id ? null : d._id))
                        }
                        aria-label={S.a11y.toggleDetails}
                        title={S.a11y.toggleDetails}
                      >
                        {expandedId === d._id ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    </Td>

                    {/* select */}
                    <Td className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(d._id)}
                        onChange={() => toggleOne(d._id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select line ${d.lineNo}`}
                      />
                    </Td>

                    <Td className="font-mono">{d.lineNo}</Td>
                    <Td className="font-mono">{d.documentNo}</Td>
                    <Td>
                      <StatusBadge value={d.status} />
                    </Td>
                    <Td className="text-center font-mono">
                      {d.priority ?? 0}
                    </Td>
                    <Td className="capitalize">{d.lineType || "—"}</Td>
                    <Td className="truncate max-w-[220px]">{d.itemNo || "—"}</Td>
                    <Td className="font-mono">{d.unitOfMeasure || "—"}</Td>
                    <Td className="text-right">{fmtDOT(d.unitPrice, 2, locale)}</Td>
                    <Td className="text-right">{fmtDOT(d.quantity, 3, locale)}</Td>
                    <Td className="text-right font-medium">
                      {fmtDOT(d.lineValue, 2, locale)}
                    </Td>
                    <Td className="text-right">
                      {fmtDOT(d.transportCost, 2, locale)}
                    </Td>
                    <Td>{formatDate(d.createdAt || d.dateCreated)}</Td>
                    <Td>{formatDate(d.updatedAt || d.dateModified)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2 pr-3">
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100"
                          onClick={() => {
                            setEditing(d);
                            setOpenForm(true);
                          }}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100"
                          onClick={() => onRecalc(d._id)}
                          title="Recalculate"
                        >
                          <Calculator size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                          onClick={() => onDelete(d._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  </tr>

                  {expandedId === d._id && (
                    <tr>
                      <td colSpan={COL_COUNT} className="bg-slate-50 border-t">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                          <Section title={S.details.core}>
                            <KV label={S.details.kv.lineNo} icon={Hash}>
                              {d.lineNo ?? "—"}
                            </KV>
                            <KV label={S.details.kv.documentNo} icon={Hash}>
                              {d.documentNo || "—"}
                            </KV>
                            <KV label={S.details.kv.documentId} icon={Hash}>
                              {d.documentId || "—"}
                            </KV>
                            <KV label={S.details.kv.status} icon={ClipboardList}>
                              <StatusBadge value={d.status} />
                            </KV>
                            <KV label={S.details.kv.priority || "Priority"} icon={SlidersHorizontal}>
                              {d.priority ?? 0}
                            </KV>
                            <KV label={S.details.kv.type} icon={Layers}>
                              {d.lineType || "—"}
                            </KV>
                            <KV label={S.details.kv.itemNo} icon={Package}>
                              {d.itemNo || "—"}
                            </KV>
                            <KV label={S.details.kv.uom} icon={Package}>
                              {d.unitOfMeasure || "—"}
                            </KV>
                            <KV label={S.details.kv.serviceDate} icon={CalendarIcon}>
                              {formatDate(d.serviceDate)}
                            </KV>
                            <KV
                              label={S.details.kv.requestedDeliveryDate}
                              icon={CalendarIcon}
                            >
                              {formatDate(d.requestedDeliveryDate)}
                            </KV>
                            <KV
                              label={S.details.kv.promisedDeliveryDate}
                              icon={CalendarIcon}
                            >
                              {formatDate(d.promisedDeliveryDate)}
                            </KV>
                            <KV label={S.details.kv.shipmentDate} icon={CalendarIcon}>
                              {formatDate(d.shipmentDate)}
                            </KV>
                            <KV
                              label={S.details.kv.documentValidityDate}
                              icon={CalendarIcon}
                            >
                              {formatDate(d.documentValidityDate)}
                            </KV>
                            <KV
                              label={S.details.kv.documentValidityHour}
                              icon={CalendarIcon}
                            >
                              {d.documentValidityHour || "—"}
                            </KV>
                          </Section>

                          <Section title={S.details.amounts}>
                            <KV label={S.details.kv.unitPrice} icon={DollarSign}>
                              {fmtDOT(d.unitPrice, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.quantity} icon={Package}>
                              {fmtDOT(d.quantity, 3, locale)}
                            </KV>
                            <KV label={S.details.kv.lineValue} icon={DollarSign}>
                              <b>{fmtDOT(d.lineValue, 2, locale)}</b>
                            </KV>
                            <KV label={S.details.kv.tollCost} icon={Truck}>
                              {fmtDOT(d.tollCost, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.driverCost} icon={UserIcon}>
                              {fmtDOT(d.driverCost, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.vehicleCost} icon={Truck}>
                              {fmtDOT(d.vehicleCost, 2, locale)}
                            </KV>
                            <KV
                              label={S.details.kv.additionalCosts}
                              icon={FileText}
                            >
                              {fmtDOT(d.additionalCosts, 2, locale)}
                            </KV>
                            <KV
                              label={S.details.kv.costMarginPct}
                              icon={Percent}
                            >
                              {fmtDOT(d.costMargin, 2, locale)}
                            </KV>
                            <KV label={S.details.kv.transportCost} icon={Truck}>
                              <b>{fmtDOT(d.transportCost, 2, locale)}</b>
                            </KV>
                          </Section>

                          <Section title={S.details.parties}>
                            <KV label={S.details.kv.buyVendorNo} icon={Hash}>
                              {d.buyVendorNo || "—"}
                            </KV>
                            <KV label={S.details.kv.payVendorNo} icon={Hash}>
                              {d.payVendorNo || "—"}
                            </KV>
                            <KV label={S.details.kv.locationNo} icon={Hash}>
                              {d.locationNo || "—"}
                            </KV>
                            <KV label={S.details.kv.locationName} icon={MapPin}>
                              {d.locationName || "—"}
                            </KV>
                            <KV
                              label={S.details.kv.locationAddress}
                              icon={MapPin}
                            >
                              {d.locationAddress || "—"}
                            </KV>
                            <KV
                              label={S.details.kv.locationAddress2}
                              icon={MapPin}
                            >
                              {d.locationAddress2 || "—"}
                            </KV>
                            <KV
                              label={S.details.kv.locationPostCode}
                              icon={MapPin}
                            >
                              {d.locationPostCode || "—"}
                            </KV>
                            <KV label={S.details.kv.locationCity} icon={MapPin}>
                              {d.locationCity || "—"}
                            </KV>
                            <KV
                              label={S.details.kv.locationCountryCode}
                              icon={MapPin}
                            >
                              {d.locationCountryCode || "—"}
                            </KV>
                          </Section>

                          <Section title={S.details.audit}>
                            <KV label={S.details.kv.createdBy} icon={UserIcon}>
                              {d.userCreated || "—"}
                            </KV>
                            <KV label={S.details.kv.createdAt} icon={CalendarIcon}>
                              {formatDate(d.dateCreated || d.createdAt)}
                            </KV>
                            <KV label={S.details.kv.modifiedBy} icon={UserIcon}>
                              {d.userModified || "—"}
                            </KV>
                            <KV label={S.details.kv.modifiedAt} icon={CalendarIcon}>
                              {formatDate(d.dateModified || d.updatedAt)}
                            </KV>
                          </Section>

                          <Section title={S.details.params}>
                            <KV label={S.details.kv.param(1)}>
                              {(d.param1Code || "—") + " : " + (d.param1Value || "—")}
                            </KV>
                            <KV label={S.details.kv.param(2)}>
                              {(d.param2Code || "—") + " : " + (d.param2Value || "—")}
                            </KV>
                            <KV label={S.details.kv.param(3)}>
                              {(d.param3Code || "—") + " : " + (d.param3Value || "—")}
                            </KV>
                            <KV label={S.details.kv.param(4)}>
                              {(d.param4Code || "—") + " : " + (d.param4Value || "—")}
                            </KV>
                            <KV label={S.details.kv.param(5)}>
                              {(d.param5Code || "—") + " : " + (d.param5Value || "—")}
                            </KV>
                          </Section>
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

      <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
        <div className="text-xs text-slate-500">
          {S.footer.meta(data.total, data.page, data.pages)}
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
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {S.footer.perPage(n)}
              </option>
            ))}
          </select>

          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
          >
            {S.footer.prev}
          </button>
          <button
            className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
            disabled={data.page >= (data.pages || 1)}
          >
            {S.footer.next}
          </button>
        </div>
      </div>
    </div>

    {/* CREATE/EDIT MODAL */}
    {openForm && (
      <Modal
        title={editing ? S.modal.titleEdit : S.modal.titleNew}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
      >
        <PurchaseOfferLineForm
          initial={editing}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpenForm(false);
            setEditing(null);
            setPage(1);
            fetchData();
          }}
          showNotice={showNotice}
          docs={docs}
          docsLoading={docsLoading}
          S={S}
          locale={locale}
        />
      </Modal>
    )}
  </div>
);

}
/* =========== small header cells (reused) =========== */
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
        <span className={`text-xs ${active ? "opacity-100" : "opacity-60"}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
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

/* =========== Modal (reused) =========== */
function Modal({ children, onClose, title }) {
  const [isFull, setIsFull] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={[
          "relative w-full rounded-2xl bg-white shadow-xl border border-slate-200",
          isFull ? "max-w-[95vw] h-[95vh]" : "max-w-5xl",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFull((v) => !v)}
              className="p-2 rounded hover:bg-slate-100"
              title={isFull ? "Minimize" : "Maximize"}
              aria-label={isFull ? "Minimize" : "Maximize"}
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className={[
            "p-4",
            isFull
              ? "h-[calc(95vh-56px)] overflow-auto"
              : "max-h-[75vh] overflow-auto",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

async function findPLP(documentNo, documentLineNo, paramCode) {
  const lineKey = Number(documentLineNo) || String(documentLineNo);
  const qs = new URLSearchParams({
    page: "1",
    limit: "1",
    documentNo,
    documentLineNo: String(lineKey),
    paramCode,
  });
  const res = await fetch(
    `${API}/api/purchase-line-parameters?${qs.toString()}`
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const row = json?.data?.[0];
  return row ? row.id || row._id : null;
}

async function upsertPLP({
  documentNo,
  documentLineNo,
  paramCode,
  paramValue,
}) {
  const lineKey = Number(documentLineNo) || String(documentLineNo);

  // 1) find existing
  const existingId = await findPLP(documentNo, lineKey, paramCode);
  const body = { documentNo, documentLineNo: lineKey, paramCode };
  if (paramValue !== "" && paramValue !== null && paramValue !== undefined) {
    body.paramValue = paramValue;
  }

  if (existingId) {
    // update
    const res = await fetch(
      `${API}/api/purchase-line-parameters/${existingId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to update parameter.");
    }
    return true;
  } else {
    // create
    const res = await fetch(`${API}/api/purchase-line-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to create parameter.");
    }
    return true;
  }
}

async function listPLPForLine(documentNo, documentLineNo) {
  const qs = new URLSearchParams({
    page: "1",
    limit: "200",
    documentNo,
    documentLineNo,
  });
  const res = await fetch(
    `${API}/api/purchase-line-parameters?${qs.toString()}`
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

async function syncPurchaseLineParams({
  documentNo,
  documentLineNo,
  params,
  removeMissing = false,
}) {
  const filtered = (params || [])
    .map((p) => ({
      code: String(p.code || "")
        .trim()
        .toUpperCase(),
      value: p.value,
    }))
    .filter((p) => p.code);

  const failures = [];
  for (const p of filtered) {
    try {
      await upsertPLP({
        documentNo,
        documentLineNo,
        paramCode: p.code,
        paramValue: p.value === "" ? undefined : p.value,
      });
    } catch (e) {
      console.warn("Param upsert failed:", p.code, e?.message || e);
      failures.push({ code: p.code, error: e?.message || "Failed" });
    }
  }

  if (removeMissing) {
    try {
      const existing = await listPLPForLine(documentNo, documentLineNo);
      const keep = new Set(filtered.map((p) => p.code));
      const toDelete = existing.filter(
        (r) => !keep.has(String(r.paramCode || "").toUpperCase())
      );
      for (const r of toDelete) {
        try {
          await fetch(`${API}/api/purchase-line-parameters/${r.id || r._id}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.warn("Param delete failed:", r.paramCode, e);
        }
      }
    } catch (e) {
      console.warn("List existing params failed:", e);
    }
  }

  if (failures.length) {
    const list = failures.map((f) => f.code).join(", ");
    throw new Error(`Some parameters failed: ${list}`);
  }
}

/* ============================================================
   Hooks & pickers shared by the Purchase form
============================================================ */
function useDebouncedValue(v, ms = 250) {
  const [d, setD] = React.useState(v);
  React.useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function useClickOutside(ref, onOutside) {
  React.useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}

/* ---- DocumentPicker (same UX as sales) ---- */
function DocumentPicker({
  value,
  onChange,
  options = [],
  loading = false,
  placeholder = "Pick document…",
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  const selected = options.find((o) => o.documentNo === value) || null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((d) => {
        const hay = [
          d.documentNo,
          d.buyVendorName,
          d.payVendorName,
          d.locationName,
          d.brokerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    : options;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          "h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm",
          "border-slate-300 focus-within:border-slate-400 focus-within:ring-0",
          "flex items-center gap-2",
        ].join(" ")}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : selected?.documentNo || ""}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No matches</div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.map((d) => {
                const isActive = d.documentNo === selected?.documentNo;
                return (
                  <li key={d._id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(d.documentNo);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div className="font-semibold tracking-tight">
                        {d.documentNo}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        {d.sellCustomerName ||
                          d.billCustomerName ||
                          d.locationName ||
                          d.brokerName ||
                          "—"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- ItemPicker (search in /api/mitems) ---- */
function ItemPicker({ value, onPick, placeholder = "Search items…" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  React.useEffect(() => {
    if (!open) return;
    let abort = false;
    async function run() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "20",
          query: debounced || "",
          active: "true",
          type: "Item",
          sort: "no:1",
        });
        const res = await fetch(`${API}/api/mitems?${params.toString()}`);
        const json = await res.json();
        if (!abort) setItems(json?.data || []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [open, debounced]);

  const filtered = items; // backend handles filtering
  const displayText = open ? query : value || "";

  return (
    <div ref={rootRef} className="relative">
      <div
        className="h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm border-slate-300 focus-within:border-slate-400 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <input
          value={displayText}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-2">
              <div className="p-2 text-sm text-slate-500">No matches</div>
              {query?.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick({ no: query.trim() });
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Use exact value:{" "}
                  <span className="font-mono">{query.trim()}</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.map((it) => {
                const isActive = it.no === value;
                return (
                  <li key={it.id || it._id || it.no}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(it);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold tracking-tight">
                        {it.no}
                      </div>
                      <div className="text-[11px] tracking-wide text-slate-500">
                        {it.description || it.description2 || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                        {it.baseUnitOfMeasure && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            UOM: {it.baseUnitOfMeasure}
                          </span>
                        )}
                        {Number.isFinite(Number(it.unitPrice)) && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            Price: {Number(it.unitPrice).toLocaleString()}
                          </span>
                        )}
                        {it.inventoryPostingGroup && (
                          <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5">
                            IPG: {it.inventoryPostingGroup}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- ParameterPicker (search /api/params) ---- */
function ParameterPicker({
  value, // current selected param code (string)
  onPick, // ({ code, description, type, minValue, maxValue, defaultValue }) => void
  placeholder = "Search parameters…",
  displayWhenClosed,
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);

  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  React.useEffect(() => {
    if (!open) return;
    let abort = false;

    async function run() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          limit: "50",
          page: "1",
          sort: "code:1",
          active: "true",
        });
        if (debounced) qs.set("query", debounced);

        const url = `${API}/api/params?${qs.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (!abort) setList([]);
          return;
        }
        const json = await res.json();
        const rows = (json?.data || []).map((p) => ({
          code: String(p.code || "").toUpperCase(),
          description: p.description || "",
          type: p.type || "decimal", // "decimal" | "text" | "boolean"
          minValue: p.minValue ?? null,
          maxValue: p.maxValue ?? null,
          defaultValue: p.defaultValue ?? null,
        }));
        if (!abort) setList(rows);
      } catch {
        if (!abort) setList([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }

    run();
    return () => {
      abort = true;
    };
  }, [open, debounced]);

  const displayText = open ? query : displayWhenClosed ?? value ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div
        className="h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm border-slate-300 focus-within:border-slate-400 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <input
          value={displayText}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
              {query?.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick({ code: query.trim().toUpperCase() });
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Use code:{" "}
                  <span className="font-mono">
                    {query.trim().toUpperCase()}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {list.map((p) => {
                const isActive = p.code === value;
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(p);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold tracking-tight">
                        {p.code}
                      </div>
                      {p.description && (
                        <div className="text-[11px] tracking-wide text-slate-500">
                          {p.description}
                        </div>
                      )}
                      {p.defaultValue != null && (
                        <div className="text-[11px] tracking-wide text-slate-500">
                          Default: {String(p.defaultValue)}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- ParamRow (enhanced) ---- */
function ParamRow({
  idx,
  c,
  v,
  setC,
  setV,
  defaultCode,
  description,
  defaultValue,
  paramType, // "decimal" | "text" | "boolean"
}) {
  const INPUT_CLS = "w-full rounded-lg border border-slate-300 px-3 py-2";
  const [range, setRange] = React.useState({ min: null, max: null, def: null });
  const [desc, setDesc] = React.useState(description || "");
  const [kind, setKind] = React.useState(paramType || "decimal");

  const hasDefault = !!defaultCode;

  React.useEffect(() => {
    if (hasDefault) setC(defaultCode);
  }, [hasDefault, defaultCode, setC]);

  React.useEffect(() => {
    setDesc(description || "");
    setRange({ min: null, max: null, def: defaultValue ?? null });
    if (paramType) setKind(paramType);
  }, [description, defaultValue, paramType]);

  const valuePlaceholder =
    range.def != null ? `Default ${range.def}` : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label={`Param${idx} Code`}>
        {hasDefault ? (
          <div>
            <input
              className={INPUT_CLS + " bg-slate-50"}
              value={`${defaultCode || ""}${desc ? " | " + desc : ""}`}
              disabled
            />
          </div>
        ) : (
          <div>
            <ParameterPicker
              value={c}
              onPick={(p) => {
                const pickedCode = (p?.code || "").toUpperCase();
                setC(pickedCode);
                setKind(p?.type || "decimal");

                if (
                  p &&
                  (p.description ||
                    p.defaultValue != null ||
                    p.minValue != null ||
                    p.maxValue != null)
                ) {
                  setDesc(p.description || "");
                  setRange({
                    min: p.minValue ?? null,
                    max: p.maxValue ?? null,
                    def: p.defaultValue ?? null,
                  });
                  if ((v == null || v === "") && p.defaultValue != null) {
                    setV(String(p.defaultValue));
                  }
                } else {
                  setDesc("");
                  setRange({ min: null, max: null, def: null });
                }
              }}
              placeholder="Search parameters…"
              displayWhenClosed={c ? `${c}${desc ? " | " + desc : ""}` : ""}
            />
            {desc && (
              <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                {desc}
              </div>
            )}
          </div>
        )}
      </Field>

      <Field label={`Param${idx} Value`}>
        {kind === "boolean" ? (
          <select
            className={INPUT_CLS}
            value={String(v ?? "")}
            onChange={(e) => setV(e.target.value === "true")}
          >
            <option value="">—</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <input
            type={kind === "decimal" ? "number" : "text"}
            step={kind === "decimal" ? "0.01" : undefined}
            className={INPUT_CLS}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={(e) => {
              if (kind !== "decimal") return;
              const n = e.target.value === "" ? null : Number(e.target.value);
              if (n == null || !Number.isFinite(n)) return;
              if (range.min != null && n < range.min) setV(String(range.min));
              if (range.max != null && n > range.max) setV(String(range.max));
            }}
            placeholder={valuePlaceholder}
          />
        )}
      </Field>
    </div>
  );
}

/* ============================================================
   After successful save in PurchaseOfferLineForm.save(), add:
============================================================ */

// ---- (anywhere below in the same file — e.g., after other helpers) ----
// PURCHASE blocks: delete + recreate (POST only, no display)
async function deleteAllPurchaseBlocks(documentNo, lineNo) {
  const qs = new URLSearchParams({
    documentNo: String(documentNo || "").trim(),
    lineNo: String(lineNo ?? ""),
  });

  const res = await fetch(
    `${API}/api/purchase-offer-lines-blocks?${qs.toString()}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.message || "Failed to delete existing purchase blocks."
    );
  }
}

async function createPurchaseBlocksForLine(savedLine, userCode) {
  const MAX_BLOCK_QTY = 25;

  // helpers
  const splitIntoBlocks = (total) => {
    const t = Math.max(0, Number(total) || 0);
    const full = Math.floor(t / MAX_BLOCK_QTY);
    const rem = t % MAX_BLOCK_QTY;
    const parts = Array(full).fill(MAX_BLOCK_QTY);
    if (rem > 0) parts.push(rem);
    if (parts.length === 0) parts.push(0); // keep a single block even if qty=0
    return parts;
  };
  const prorate = (v, share, total) => {
    const V = Number(v) || 0;
    const T = Number(total) || 0;
    if (T <= 0) return 0;
    return +(V * (share / T)).toFixed(2);
  };

  if (!savedLine?.documentNo)
    throw new Error("createPurchaseBlocksForLine: missing documentNo");
  if (savedLine?.lineNo == null)
    throw new Error("createPurchaseBlocksForLine: missing lineNo");

  const totalQty = Number(savedLine.quantity) || 0;
  const parts = splitIntoBlocks(totalQty);

  // normalised unit price (used for all blocks)
  const unitPrice = Number(savedLine.unitPrice) || 0;

  // 1) clean existing blocks
  await deleteAllPurchaseBlocks(savedLine.documentNo, savedLine.lineNo);

  // 2) recreate blocks (block numbers 1..N)
  for (let i = 0; i < parts.length; i++) {
    const q = parts[i];

    // explicit line value for this block
    const lineValue = +(unitPrice * q).toFixed(2);

    const body = {
      // identity
      documentNo: savedLine.documentNo,
      lineNo: savedLine.lineNo,
      block: i + 1,
      userCreated: userCode,

      // core
      status: savedLine.status,
      priority: [0, 1, 2].includes(Number(savedLine.priority)) ? Number(savedLine.priority) : 0,
      lineType: savedLine.lineType,
      itemNo: savedLine.itemNo,
      unitOfMeasure: savedLine.unitOfMeasure,
      unitPrice,
      quantity: q,
      lineValue,

      // dates
      serviceDate: savedLine.serviceDate || null,
      requestedDeliveryDate: savedLine.requestedDeliveryDate || null,
      promisedDeliveryDate: savedLine.promisedDeliveryDate || null,
      shipmentDate: savedLine.shipmentDate || null,
      documentValidityDate: savedLine.documentValidityDate || null,
      documentValidityHour: savedLine.documentValidityHour || null,

      // parties / location
      buyVendorNo: savedLine.buyVendorNo || null,
      payVendorNo: savedLine.payVendorNo || null,
      locationNo: savedLine.locationNo || null,
      locationName: savedLine.locationName || null,
      locationAddress: savedLine.locationAddress || null,
      locationAddress2: savedLine.locationAddress2 || null,
      locationPostCode: savedLine.locationPostCode || null,
      locationCity: savedLine.locationCity || null,
      locationCountryCode: savedLine.locationCountryCode || null,

      // costs (prorated by qty share)
      tollCost: prorate(savedLine.tollCost, q, totalQty),
      driverCost: prorate(savedLine.driverCost, q, totalQty),
      vehicleCost: prorate(savedLine.vehicleCost, q, totalQty),
      additionalCosts: prorate(savedLine.additionalCosts, q, totalQty),
      costMargin: Number(savedLine.costMargin) || 0,
    };

    const res = await fetch(`${API}/api/purchase-offer-lines-blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        json?.message || `Failed to create purchase block ${body.block}`
      );
    }
  }
}


function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}
    >
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}

/* Status styling mirrors Sales to keep a single mental model */
function StatusBadge({ value }) {
  const STATUS_CANON_MAP = {
    new: "new",
    on_hold: "on-hold",
    "on-hold": "on-hold",
    accepted: "accepted",
    approved: "approved",
    matched: "matched",
    mached: "matched",
    shipped: "shipped",
    invoiced: "invoiced",
    paid: "paid",
    canceled: "canceled",
  };
  const STATUS_LABELS = {
    new: "New",
    "on-hold": "On Hold",
    accepted: "Accepted",
    approved: "Approved",
    matched: "Matched",
    shipped: "Shipped",
    invoiced: "Invoiced",
    paid: "Paid (Closed)",
    canceled: "Canceled",
  };
  const k = String(value || "new").toLowerCase();
  const v = STATUS_CANON_MAP[k] || k;
  const label = STATUS_LABELS[v] || v;
  const cls =
    v === "new"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : v === "on-hold"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : v === "accepted"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : v === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : v === "matched"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : v === "shipped"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : v === "invoiced"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : v === "paid"
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : v === "canceled"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold border ${cls}`}>
      {label}
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
      <div className="col-span-2 font-medium">{children}</div>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-slate-600">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, icon: Icon, error, children }) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          Icon ? " pl-9" : "",
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
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
        {child}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

/* ---- LocationPicker (search /api/mlocations) ---- */
function LocationPicker({ value, onPick, placeholder = "Search locations…" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);

  const [locations, setLocations] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const rootRef = React.useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  React.useEffect(() => {
    if (!open) return;
    let abort = false;

    async function run() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "50",
          sort: "code:1",
        });
        if (debounced) qs.set("query", debounced);

        // Adjust endpoint name if your LOCATION API differs
        const res = await fetch(`${API}/api/mlocations?${qs.toString()}`);
        const json = await res.json();
        if (!abort) setLocations(json?.data || []);
      } catch {
        if (!abort) setLocations([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }

    run();
    return () => {
      abort = true;
    };
  }, [open, debounced]);

  const displayText = open ? query : value || "";

  return (
    <div ref={rootRef} className="relative">
      <div
        className="h-9 w-full cursor-text rounded-xl border bg-white px-3 text-sm border-slate-300 focus-within:border-slate-400 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <input
          value={displayText}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 flex-1 outline-none bg-transparent"
        />
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : locations.length === 0 ? (
            <div className="p-2">
              <div className="p-2 text-sm text-slate-500">No matches</div>
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {locations.map((loc) => {
                const code = loc.code || loc.no || loc.locationNo;
                const isActive = code === value;
                return (
                  <li key={loc.id || loc._id || code}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick?.(loc);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        "hover:bg-slate-50 focus:bg-slate-50",
                        isActive ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold tracking-tight">{code}</div>
                      <div className="text-[11px] tracking-wide text-slate-500">
                        {loc.name || loc.locationName || "—"}
                        {loc.city || loc.locationCity
                          ? ` • ${loc.city || loc.locationCity}`
                          : ""}
                      </div>
                      {loc.countryRegionCode || loc.countryCode ? (
                        <div className="text-[11px] tracking-wide text-slate-500">
                          {loc.countryRegionCode || loc.countryCode}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Tiny utils
============================================================ */
function formatDate(s, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(undefined) : dash;
  } catch {
    return s || dash;
  }
}
function fmtDOT(n, decimals = 2, loc) {
  const val = Number(n);
  if (!isFinite(val)) return "—";
  return val.toLocaleString(loc || "de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
}

export { PurchaseOfferLineForm };
