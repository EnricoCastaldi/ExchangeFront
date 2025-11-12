// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { Save, AlertTriangle, CheckCircle2, DollarSign, GaugeCircle } from "lucide-react";
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
    fieldLabel:
      t?.settings?.transportCostPerKm || "Domyślna stawka kosztu transportu za 1 km (PLN)",
    placeholder: t?.settings?.placeholder || "np. 1.75",
    // Prefer settings.save, then common.save, then a sensible default
    save: t?.settings?.save || t?.common?.save || (t?.locale === "pl-PL" ? "Zapisz" : "Save"),
    loading: t?.common?.loading || "Loading…",
    updated: t?.settings?.updated || "Zapisano ustawienia.",
    failed: t?.settings?.failed || "Nie udało się zapisać.",
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        const json = await res.json();
        if (!mounted) return;
        const v = json?.transportCostPerKm ?? 0;
        setValue(String(Number(v).toFixed(2)));
      } catch {
        setNotice({ type: "error", text: t?.settings?.loadFail || "Błąd ładowania ustawień." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  // Auto-hide toast after 2.5s
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  const onSave = async (e) => {
    e.preventDefault();
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      setNotice({
        type: "error",
        text: t?.settings?.validation || "Wprowadź poprawną, nieujemną kwotę.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transportCostPerKm: num }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }
      const json = await res.json();
      setValue(String(Number(json.transportCostPerKm ?? num).toFixed(2)));
      setNotice({ type: "success", text: L.updated });
    } catch (err) {
      setNotice({ type: "error", text: L.failed });
    } finally {
      setSaving(false);
    }
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
          <form onSubmit={onSave} className="space-y-4">
            <Field label={L.fieldLabel} icon={GaugeCircle}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (notice) setNotice(null);
                    }}
                    placeholder={L.placeholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    <DollarSign size={14} />
                  </span>
                </div>

                {/* Save on the same line */}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                  title={L.save}
                  aria-label={L.save}
                >
                  <Save size={20} />
                  <span className="hidden sm:inline">{L.save}</span>
                </button>
              </div>
            </Field>
          </form>
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
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap =
    isSuccess ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}>
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}
