// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import {
  Save,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  GaugeCircle,
  Percent,
  CalendarDays,
  Clock3,
} from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

export default function Settings() {
  const { t } = useI18n();
  const L = {
    title: t?.settings?.title || "General setup",

    transportCostPerKm:
      t?.settings?.transportCostPerKm ||
      "Domyślna stawka kosztu transportu za 1 km (PLN)",

    administrativeFee:
      t?.settings?.administrativeFee || "Opłata administracyjna (PLN)",

    defaultLoadingCost:
      t?.settings?.defaultLoadingCost || "Default loading cost (PLN)",
    defaultUnloadingCost:
      t?.settings?.defaultUnloadingCost || "Default unloading cost (PLN)",

    // ✅ NEW
    defaultDeliveryDays:
      t?.settings?.defaultDeliveryDays || "Default number of delivery days",
    defaultEndOfDayTime:
      t?.settings?.defaultEndOfDayTime || "Default end of day time",

    factoringFeePercent:
      t?.settings?.factoringFeePercent || "% opłaty factoringowej (%)",

    placeholderPln: t?.settings?.placeholderPln || "np. 15.00",
    placeholderKm: t?.settings?.placeholderKm || "np. 1.75",
    placeholderPct: t?.settings?.placeholderPct || "np. 0.00001",

    save:
      t?.settings?.save ||
      t?.common?.save ||
      (t?.locale === "pl-PL" ? "Zapisz" : "Save"),

    loading: t?.common?.loading || "Loading…",
    updated: t?.settings?.updated || "Zapisano ustawienia.",
    failed: t?.settings?.failed || "Nie udało się zapisać.",
    validation:
      t?.settings?.validation || "Wprowadź poprawną, nieujemną wartość.",
    loadFail: t?.settings?.loadFail || "Błąd ładowania ustawień.",
    validationInt:
      t?.settings?.validationInt || "Enter a valid non-negative integer.",
    validationTime:
      t?.settings?.validationTime || "Enter time in HH:mm (e.g. 17:00).",
  };

  const [loading, setLoading] = useState(true);

  // Separate saving states (per-field)
  const [savingKm, setSavingKm] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingDefLoad, setSavingDefLoad] = useState(false);
  const [savingDefUnload, setSavingDefUnload] = useState(false);
  const [savingDeliveryDays, setSavingDeliveryDays] = useState(false);
  const [savingEodTime, setSavingEodTime] = useState(false);
  const [savingFact, setSavingFact] = useState(false);

  const [notice, setNotice] = useState(null);

  const [transportCostPerKm, setTransportCostPerKm] = useState("");
  const [administrativeFee, setAdministrativeFee] = useState("");
  const [defaultLoadingCost, setDefaultLoadingCost] = useState("");
  const [defaultUnloadingCost, setDefaultUnloadingCost] = useState("");
  const [defaultDeliveryDays, setDefaultDeliveryDays] = useState("");
  const [defaultEndOfDayTime, setDefaultEndOfDayTime] = useState("17:00");
  const [factoringFeePercent, setFactoringFeePercent] = useState("");

  // Factoring fee needs higher precision (e.g. 0.00001)
  const FACT_DECIMALS = 5;
  const FACT_STEP = "0.00001";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        const json = await res.json();
        if (!mounted) return;

        const v1 = Number(json?.transportCostPerKm ?? 0);
        const v2 = Number(json?.administrativeFee ?? 0);
        const v3 = Number(json?.defaultLoadingCost ?? 0);
        const v4 = Number(json?.defaultUnloadingCost ?? 0);
        const v5 = Number(json?.defaultDeliveryDays ?? 0);
        const v6 = String(json?.defaultEndOfDayTime ?? "17:00");
        const v7 = Number(json?.factoringFeePercent ?? 0);

        setTransportCostPerKm(String(v1.toFixed(2)));
        setAdministrativeFee(String(v2.toFixed(2)));
        setDefaultLoadingCost(String(v3.toFixed(2)));
        setDefaultUnloadingCost(String(v4.toFixed(2)));
        setDefaultDeliveryDays(String(Number.isFinite(v5) ? v5 : 0));
        setDefaultEndOfDayTime(v6 || "17:00");
        setFactoringFeePercent(String(v7.toFixed(FACT_DECIMALS)));
      } catch {
        setNotice({ type: "error", text: L.loadFail });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Auto-hide toast after 2.5s
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  const isValidHHMM = (s) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(s || ""));

  const savePartial = async (partial, setSaving) => {
    setSaving(true);
    try {
      // ✅ build payload from current UI state (NOT from server)
      const payload = {
        transportCostPerKm: Number(transportCostPerKm),
        administrativeFee: Number(administrativeFee),
        defaultLoadingCost: Number(defaultLoadingCost),
        defaultUnloadingCost: Number(defaultUnloadingCost),
        defaultDeliveryDays: Number(defaultDeliveryDays),
        defaultEndOfDayTime: String(defaultEndOfDayTime || "").trim(),
        factoringFeePercent: Number(factoringFeePercent),
        ...partial,
      };

      // validate numeric non-negative
      for (const k of [
        "transportCostPerKm",
        "administrativeFee",
        "defaultLoadingCost",
        "defaultUnloadingCost",
        "factoringFeePercent",
      ]) {
        const n = Number(payload[k]);
        if (!Number.isFinite(n) || n < 0) throw new Error(L.validation);
        payload[k] = n;
      }

      // validate delivery days int >= 0
      if (
        payload.defaultDeliveryDays == null ||
        !Number.isFinite(Number(payload.defaultDeliveryDays)) ||
        Number(payload.defaultDeliveryDays) < 0 ||
        !Number.isInteger(Number(payload.defaultDeliveryDays))
      ) {
        throw new Error(L.validationInt);
      }

      // validate time HH:mm
      if (!isValidHHMM(payload.defaultEndOfDayTime)) {
        throw new Error(L.validationTime);
      }

      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }

      const json = await res.json();

      // ✅ refresh UI from server response
      setTransportCostPerKm(
        String(Number(json.transportCostPerKm ?? payload.transportCostPerKm).toFixed(2))
      );
      setAdministrativeFee(
        String(Number(json.administrativeFee ?? payload.administrativeFee).toFixed(2))
      );
      setDefaultLoadingCost(
        String(Number(json.defaultLoadingCost ?? payload.defaultLoadingCost).toFixed(2))
      );
      setDefaultUnloadingCost(
        String(Number(json.defaultUnloadingCost ?? payload.defaultUnloadingCost).toFixed(2))
      );
      setDefaultDeliveryDays(String(Number(json.defaultDeliveryDays ?? payload.defaultDeliveryDays)));
      setDefaultEndOfDayTime(String(json.defaultEndOfDayTime ?? payload.defaultEndOfDayTime));
      setFactoringFeePercent(
        String(Number(json.factoringFeePercent ?? payload.factoringFeePercent).toFixed(FACT_DECIMALS))
      );

      setNotice({ type: "success", text: L.updated });
    } catch (e) {
      setNotice({ type: "error", text: e?.message || L.failed });
    } finally {
      setSaving(false);
    }
  };

  const onSaveKm = async (e) => {
    e.preventDefault();
    const n = Number(transportCostPerKm);
    if (!Number.isFinite(n) || n < 0) return setNotice({ type: "error", text: L.validation });
    await savePartial({ transportCostPerKm: n }, setSavingKm);
  };

  const onSaveAdmin = async (e) => {
    e.preventDefault();
    const n = Number(administrativeFee);
    if (!Number.isFinite(n) || n < 0) return setNotice({ type: "error", text: L.validation });
    await savePartial({ administrativeFee: n }, setSavingAdmin);
  };

  const onSaveDefaultLoading = async (e) => {
    e.preventDefault();
    const n = Number(defaultLoadingCost);
    if (!Number.isFinite(n) || n < 0) return setNotice({ type: "error", text: L.validation });
    await savePartial({ defaultLoadingCost: n }, setSavingDefLoad);
  };

  const onSaveDefaultUnloading = async (e) => {
    e.preventDefault();
    const n = Number(defaultUnloadingCost);
    if (!Number.isFinite(n) || n < 0) return setNotice({ type: "error", text: L.validation });
    await savePartial({ defaultUnloadingCost: n }, setSavingDefUnload);
  };

  const onSaveDeliveryDays = async (e) => {
    e.preventDefault();
    const n = Number(defaultDeliveryDays);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setNotice({ type: "error", text: L.validationInt });
      return;
    }
    await savePartial({ defaultDeliveryDays: n }, setSavingDeliveryDays);
  };

  const onSaveEndOfDayTime = async (e) => {
    e.preventDefault();
    const s = String(defaultEndOfDayTime || "").trim();
    if (!isValidHHMM(s)) {
      setNotice({ type: "error", text: L.validationTime });
      return;
    }
    await savePartial({ defaultEndOfDayTime: s }, setSavingEodTime);
  };

  const onSaveFact = async (e) => {
    e.preventDefault();
    const n = Number(factoringFeePercent);
    if (!Number.isFinite(n) || n < 0) return setNotice({ type: "error", text: L.validation });
    await savePartial({ factoringFeePercent: n }, setSavingFact);
  };

  return (
    <div className="max-w-xl">
      {notice && (
        <Toast type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Toast>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold mb-3">{L.title}</h2>

        {loading ? (
          <p className="text-sm text-slate-500">{L.loading}</p>
        ) : (
          <div className="space-y-4">
            {/* Transport cost per km */}
            <form onSubmit={onSaveKm} className="space-y-2">
              <Field label={L.transportCostPerKm} icon={GaugeCircle}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transportCostPerKm}
                      onChange={(e) => {
                        setTransportCostPerKm(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder={L.placeholderKm}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      <DollarSign size={14} />
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingKm}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingKm ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>

            {/* Administrative fee */}
            <form onSubmit={onSaveAdmin} className="space-y-2">
              <Field label={L.administrativeFee} icon={DollarSign}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={administrativeFee}
                      onChange={(e) => {
                        setAdministrativeFee(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder={L.placeholderPln}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      <DollarSign size={14} />
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingAdmin ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>

            {/* Default loading cost */}
            <form onSubmit={onSaveDefaultLoading} className="space-y-2">
              <Field label={L.defaultLoadingCost} icon={DollarSign}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultLoadingCost}
                      onChange={(e) => {
                        setDefaultLoadingCost(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder={L.placeholderPln}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      <DollarSign size={14} />
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingDefLoad}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingDefLoad ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>

            {/* Default unloading cost */}
            <form onSubmit={onSaveDefaultUnloading} className="space-y-2">
              <Field label={L.defaultUnloadingCost} icon={DollarSign}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultUnloadingCost}
                      onChange={(e) => {
                        setDefaultUnloadingCost(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder={L.placeholderPln}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      <DollarSign size={14} />
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingDefUnload}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingDefUnload ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>

            {/* ✅ NEW: Default delivery days */}
            <form onSubmit={onSaveDeliveryDays} className="space-y-2">
              <Field label={L.defaultDeliveryDays} icon={CalendarDays}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={defaultDeliveryDays}
                      onChange={(e) => {
                        setDefaultDeliveryDays(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingDeliveryDays}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">
                      {savingDeliveryDays ? "…" : L.save}
                    </span>
                  </button>
                </div>
              </Field>
            </form>

            {/* ✅ NEW: Default end-of-day time */}
            <form onSubmit={onSaveEndOfDayTime} className="space-y-2">
              <Field label={L.defaultEndOfDayTime} icon={Clock3}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={defaultEndOfDayTime}
                      onChange={(e) => {
                        setDefaultEndOfDayTime(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingEodTime}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingEodTime ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>

            {/* Factoring fee percent */}
            <form onSubmit={onSaveFact} className="space-y-2">
              <Field label={L.factoringFeePercent} icon={Percent}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step={FACT_STEP}
                      value={factoringFeePercent}
                      onChange={(e) => {
                        setFactoringFeePercent(e.target.value);
                        if (notice) setNotice(null);
                      }}
                      placeholder={L.placeholderPct}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      <Percent size={14} />
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingFact}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#00C86F] px-4 py-2 text-[#0E0F0E] hover:bg-[#007A3A] disabled:opacity-60"
                    title={L.save}
                    aria-label={L.save}
                  >
                    <Save size={20} />
                    <span className="hidden sm:inline">{savingFact ? "…" : L.save}</span>
                  </button>
                </div>
              </Field>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----- tiny atoms reused ----- */
function Field({ label, icon: Icon, children }) {
  return (
    <label className="text-sm block">
      <div className="mb-1 text-slate-600 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      {children}
    </label>
  );
}

function Toast({ type = "success", children, onClose }) {
  const Icon = type === "success" ? CheckCircle2 : AlertTriangle;
  const wrap =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
  return (
    <div
      className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}
    >
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}
