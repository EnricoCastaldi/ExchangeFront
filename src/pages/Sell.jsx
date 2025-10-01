import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Trash2, Pencil, X } from "lucide-react";
import { useI18n } from "../helpers/i18n";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");


export default function Sell() {
  const { t, locale } = useI18n();
  const C = t.sell;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
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
      const res = await fetch(`${API}/api/sells?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [page, limit, status]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const onDelete = async (id) => {
    if (!window.confirm(C.alerts.deleteConfirm)) return;
    const res = await fetch(`${API}/api/sells/${id}`, { method: "DELETE" });
    if (res.status === 204) fetchData();
  };

  const onAddClick = () => { setEditing(null); setOpen(true); };
  const onEditClick = (row) => { setEditing(row); setOpen(true); };

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?.id);
    const url = isEdit ? `${API}/api/sells/${editing.id}` : `${API}/api/sells`;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || C.alerts.requestFailed);
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
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={C.controls.searchPlaceholder}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          />
        </div>

        <select
          value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="">{C.controls.allStatuses}</option>
          <option value="open">{C.controls.statuses.open}</option>
          <option value="approved">{C.controls.statuses.approved}</option>
          <option value="rejected">{C.controls.statuses.rejected}</option>
          <option value="closed">{C.controls.statuses.closed}</option>
        </select>

        <button type="submit" className="px-4 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50">
          {C.controls.searchBtn}
        </button>

        <button
          type="button" onClick={onAddClick}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
        >
          <Plus size={16} /> {C.controls.newBtn}
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>{C.table.id}</Th>
                <Th>{C.table.customer}</Th>
                <Th>{C.table.item}</Th>
                <Th>{C.table.type}</Th>
                <Th className="text-right">{C.table.qty}</Th>
                <Th className="text-right">{C.table.price}</Th>
                <Th>{C.table.status}</Th>
                <Th>{C.table.created}</Th>
                <Th>{C.table.description}</Th>
                <Th>{C.table.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">{C.table.loading}</td></tr>
              ) : data.data.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">{C.table.empty}</td></tr>
              ) : (
                data.data.map((r) => (
                  <tr key={r.id} className="border-t">
                    <Td>{r.id}</Td>
                    <Td className="font-medium">{r.customer_name}</Td>
                    <Td><span className="font-medium">{r.item_name}</span> <span className="text-slate-500">({r.item_sku})</span></Td>
                    <Td className="uppercase">{r.type}</Td>
                    <Td className="text-right">{fmtNum(r.quantity, locale)}</Td>
                    <Td className="text-right">{fmtMoney(r.price, locale)}</Td>
                    <Td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.status === "open" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : r.status === "approved" ? "bg-green-50 text-green-700 border border-green-200"
                        : r.status === "rejected" ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>{String(C.controls.statuses[r.status] || r.status).toUpperCase()}</span>
                    </Td>
                    <Td>{new Date(r.created_at).toLocaleDateString(locale)}</Td>
                    <Td className="max-w-[22ch] truncate" title={r.description || ""}>{r.description || "—"}</Td>
                    <Td>
                      <div className="flex justify-end gap-2 pr-3">
                        <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => onEditClick(r)}>
                          <Pencil size={16} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(r.id)}>
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
            {C.paginationMeta(data.total, data.page, data.pages)}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10,20,50,100].map(n => <option key={n} value={n}>{C.controls.perPage(n)}</option>)}
            </select>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p-1))} disabled={data.page <= 1}>{C.controls.prev}</button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.min(data.pages || 1, p+1))} disabled={data.page >= (data.pages || 1)}>{C.controls.next}</button>
          </div>
        </div>
      </div>

      {open && (
        <Modal onClose={() => { setOpen(false); setEditing(null); }} title={C.modal.title}>
          <SellForm
            initial={editing}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={handleSubmit}
            C={C}
          />
        </Modal>
      )}
    </div>
  );
}

function Th({ children, className = "" }) { return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
function fmtNum(n, locale){ return Number(n||0).toLocaleString(locale); }
function fmtMoney(n, locale){ return (Number(n)||0).toLocaleString(locale,{style:"currency",currency:"USD"}); }

/* ---------- Modal + Form ---------- */
function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function SellForm({ initial, onSubmit, onCancel, C }) {
  const isEdit = Boolean(initial?.id);

  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  const [customerId, setCustomerId] = useState(initial?.customer_id || "");
  const [itemId, setItemId] = useState(initial?.item_id || "");
  const [type, setType] = useState(initial?.type || "spot");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [status, setStatus] = useState(initial?.status || "open");
  const [description, setDescription] = useState(initial?.description || "");

  useEffect(() => {
    (async () => {
      const [cres, ires] = await Promise.all([
        fetch(`${API}/api/customers?limit=1000&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
        fetch(`${API}/api/items?limit=1000&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
      ]);
      setCustomers(cres.data || []);
      setItems(ires.data || []);
    })();
  }, []);

  const customerOptions = useMemo(() => customers.map(c => ({ id: c.id, name: c.name })), [customers]);
  const itemOptions     = useMemo(() => items.map(i => ({ id: i.id, name: `${i.name} (${i.sku})` })), [items]);

  const submit = (e) => {
    e.preventDefault();
    if (!customerId) return alert(C.alerts.selectCustomer);
    if (!itemId) return alert(C.alerts.selectItem);
    if (!type) return alert(C.alerts.typeRequired);
    onSubmit({
      customer_id: Number(customerId),
      item_id: Number(itemId),
      type,
      quantity: Number(quantity) || 0,
      price: Number(price) || 0,
      status,
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={C.modal.fields.customer}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={customerId} onChange={(e)=>setCustomerId(e.target.value)}>
            <option value="">{C.modal.fields.customer.replace(" *","")}…</option>
            {customerOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label={C.modal.fields.item}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={itemId} onChange={(e)=>setItemId(e.target.value)}>
            <option value="">{C.modal.fields.item.replace(" *","")}…</option>
            {itemOptions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>

        <Field label={C.modal.fields.type}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={type} onChange={(e)=>setType(e.target.value)}>
            <option value="spot">{C.modal.types?.spot || "spot"}</option>
            <option value="forward">{C.modal.types?.forward || "forward"}</option>
            <option value="tender">{C.modal.types?.tender || "tender"}</option>
          </select>
        </Field>

        <Field label={C.modal.fields.quantity}>
          <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={quantity} onChange={(e)=>setQuantity(e.target.value)} />
        </Field>

        <Field label={C.modal.fields.price}>
          <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={price} onChange={(e)=>setPrice(e.target.value)} />
        </Field>

        <Field label={C.modal.fields.status}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="open">{C.modal.statuses?.open || "open"}</option>
            <option value="approved">{C.modal.statuses?.approved || "approved"}</option>
            <option value="rejected">{C.modal.statuses?.rejected || "rejected"}</option>
            <option value="closed">{C.modal.statuses?.closed || "closed"}</option>
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field label={C.modal.fields.description}>
            <textarea rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={description} onChange={(e)=>setDescription(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">{C.modal.cancel}</button>
        <button type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          {isEdit ? C.modal.save : C.modal.create}
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
