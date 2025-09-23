import { useEffect, useState } from "react";
import { Search, Upload, Plus, Trash2, Pencil, X } from "lucide-react";
import { useI18n, fmtMoney, fmtNum } from "../helpers/i18n";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Items() {
  const { t, locale } = useI18n();
  const C = t.items;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (query) params.set("query", query);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const res = await fetch(`${API}/api/items?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, status, category]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(C.alerts.deleteConfirm)) return;
    const res = await fetch(`${API}/api/items/${id}`, { method: "DELETE" });
    if (res.status === 204) fetchData();
  };

  const onAddClick = () => { setEditing(null); setOpen(true); };
  const onEditClick = (it) => { setEditing(it); setOpen(true); };

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?.id);
    const url = isEdit ? `${API}/api/items/${editing.id}` : `${API}/api/items`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Request failed");
      return;
    }
    setOpen(false); setEditing(null); setPage(1); fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <form onSubmit={onSearch} className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={C.controls.searchPlaceholder}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          />
        </div>

        <select
          value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="">{C.controls.allStatuses}</option>
          <option value="active">{C.controls.statuses.active}</option>
          <option value="inactive">{C.controls.statuses.inactive}</option>
          <option value="archived">{C.controls.statuses.archived}</option>
        </select>

        <input
          value={category} onChange={(e) => setCategory(e.target.value)}
          placeholder={C.controls.categoryPlaceholder}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        />

        <button type="submit" className="px-4 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50">
          {C.controls.searchBtn}
        </button>



        <button
          type="button" onClick={onAddClick}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
        >
          <Plus size={16} /> {C.controls.addBtn}
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>{C.table.id}</Th>
                <Th>{C.table.sku}</Th>
                <Th>{C.table.name}</Th>
                <Th>{C.table.category}</Th>
                <Th>{C.table.vendor}</Th>
                <Th className="text-right">{C.table.price}</Th>
                <Th className="text-right">{C.table.qty}</Th>
                <Th>{C.table.status}</Th>
                <Th>{C.table.created}</Th>
                <Th>{C.table.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">{C.table.loading}</td></tr>
              ) : data.data.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">{C.table.empty}</td></tr>
              ) : (
                data.data.map((it) => (
                  <tr key={it.id} className="border-t">
                    <Td>{it.id}</Td>
                    <Td className="font-mono">{it.sku}</Td>
                    <Td className="font-medium">{it.name}</Td>
                    <Td>{it.category || C.table.dash}</Td>
                    <Td>{it.vendor || C.table.dash}</Td>
                    <Td className="text-right">{fmtMoney(it.price, locale, "USD")}</Td>
                    <Td className="text-right">{fmtNum(it.quantity, locale)}</Td>
                    <Td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        it.status === "active" ? "bg-green-50 text-green-700 border border-green-200"
                        : it.status === "archived" ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {(C.controls.statuses[it.status] || it.status).toUpperCase()}
                      </span>
                    </Td>
                    <Td>{formatDate(it.created_at, locale, C.table.dash)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2 pr-3">
                        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => onEditClick(it)}>
                          <Pencil size={16} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(it.id)}>
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

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">
            {C.footer.meta(data.total, data.page, data.pages)}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{C.footer.perPage(n)}</option>)}
            </select>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={data.page <= 1}>{C.footer.prev}</button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.min(data.pages || 1, p + 1))}
              disabled={data.page >= (data.pages || 1)}>{C.footer.next}</button>
          </div>
        </div>
      </div>

      {open && (
        <Modal onClose={() => { setOpen(false); setEditing(null); }} title={C.modal.title}>
          <ItemForm
            initial={editing}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={handleSubmit}
            C={C}
            locale={locale}
          />
        </Modal>
      )}
    </div>
  );
}

function Th({ children, className = "" }) { return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
function formatDate(s, locale, dash="—") { try { return s ? new Date(s).toLocaleDateString(locale) : dash; } catch { return s || dash; } }

/* Modal + Form */
function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ItemForm({ initial, onSubmit, onCancel, C, locale }) {
  const [sku, setSku] = useState(initial?.sku || "");
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "Grain");
  const [vendor, setVendor] = useState(initial?.vendor || "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [status, setStatus] = useState(initial?.status || "active");
  const [createdAt, setCreatedAt] = useState(formatForInput(initial?.created_at));

  const isEdit = Boolean(initial?.id);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) { alert(C.alerts.skuNameRequired); return; }
    onSubmit({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim() || "Grain",
      vendor: vendor.trim() || null,
      price: Number(price) || 0,
      quantity: Number(quantity) || 0,
      status: status || "active",
      created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={C.modal.fields.sku}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={sku} onChange={(e) => setSku(e.target.value)} required />
        </Field>
        <Field label={C.modal.fields.name}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label={C.modal.fields.category}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Grain, Cereal, Pulse..." />
        </Field>
        <Field label={C.modal.fields.vendor}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>
        <Field label={C.modal.fields.price}>
          <input type="number" step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={C.modal.fields.quantity}>
          <input type="number" step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label={C.modal.fields.status}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">{C.controls.statuses.active}</option>
            <option value="inactive">{C.controls.statuses.inactive}</option>
            <option value="archived">{C.controls.statuses.archived}</option>
          </select>
        </Field>
        <Field label={C.modal.fields.createdAt}>
          <input type="datetime-local"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">{C.modal.cancel}</button>
        <button type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          {isEdit ? C.modal.save : C.modal.add}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-slate-600">{label}</div>
      {children}
    </label>
  );
}

function formatForInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
