// src/pages/Users.jsx
import { useEffect, useState } from "react";
import { Search, Plus, Trash2, Pencil, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useI18n } from "../helpers/i18n"; // <-- important

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Users() {
  const { t } = useI18n();
  const U = t.users;

  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const res = await fetch(`${API}/api/users?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", U.alerts.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, limit, status]);

  const onSearch = (e) => { e.preventDefault(); setPage(1); fetchData(); };

  const onDelete = async (id) => {
    if (!window.confirm(U.alerts.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/users/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        showNotice("success", U.alerts.deleted);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotice("error", err.message || U.alerts.requestFail);
      }
    } catch {
      showNotice("error", U.alerts.requestFail);
    }
  };

  const handleSubmit = async (form) => {
    const isEdit = Boolean(editing?._id);
    const url = isEdit ? `${API}/api/users/${editing._id}` : `${API}/api/users`;
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return showNotice("error", json.message || U.alerts.requestFail);
      showNotice("success", isEdit ? U.alerts.updated : U.alerts.created);
      setOpen(false); setEditing(null); setPage(1); fetchData();
    } catch {
      showNotice("error", U.alerts.requestFail);
    }
  };

  return (
    <div className="space-y-4">
      {notice && <Toast type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Toast>}

      <form onSubmit={onSearch} className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={U.controls.searchPlaceholder}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          />
        </div>

        <select
          value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="">{U.controls.allStatuses}</option>
          <option value="active">{U.controls.statuses.active}</option>
          <option value="suspended">{U.controls.statuses.suspended}</option>
          <option value="closed">{U.controls.statuses.closed}</option>
        </select>

        <button type="submit" className="px-4 py-2 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50">
          {U.controls.searchBtn}
        </button>

        <button
          type="button" onClick={() => { setEditing(null); setOpen(true); }}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
        >
          <Plus size={16} /> {U.controls.addBtn}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>{U.table.code}</Th><Th>{U.table.name}</Th><Th>{U.table.email}</Th><Th>{U.table.phone}</Th>
                <Th>{U.table.region}</Th><Th>{U.table.jobTitle}</Th><Th>{U.table.permission}</Th>
                <Th className="text-right">{U.table.commission}</Th>
                <Th>{U.table.status}</Th><Th>{U.table.created}</Th><Th>{U.table.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-6 text-center text-slate-500">{U.table.loading}</td></tr>
              ) : data.data.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-slate-500">{U.table.empty}</td></tr>
              ) : data.data.map((r) => (
                <tr key={r._id} className="border-t">
                  <Td className="font-mono">{r.code}</Td>
                  <Td className="font-medium">{r.name}</Td>
                  <Td>{r.userEmail}</Td>
                  <Td>{r.userPhone || U.table.dash}</Td>
                  <Td>{r.region || U.table.dash}</Td>
                  <Td>{r.jobTitle || U.table.dash}</Td>
                  <Td>{permChip(r.permissionLevel)}</Td>
                  <Td className="text-right">{fmtPercent(r.commission)}</Td>
                  <Td>
                    <span className={`px-2 py-1 rounded text-xs ${
                      r.status === "active" ? "bg-green-50 text-green-700 border border-green-200"
                      : r.status === "suspended" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>{String(r.status || "").toUpperCase() || U.table.dash}</span>
                  </Td>
                  <Td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : U.table.dash}</Td>
                  <Td>
                    <div className="flex justify-end gap-2 pr-3">
                      <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => { setEditing(r); setOpen(true); }}>
                        <Pencil size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" onClick={() => onDelete(r._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">
            {U.footer.meta(data.total, data.page, data.pages)}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10,20,50,100].map(n => <option key={n} value={n}>{U.footer.perPage(n)}</option>)}
            </select>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p-1))} disabled={data.page <= 1}>{U.footer.prev}</button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage(p => Math.min(data.pages || 1, p+1))} disabled={data.page >= (data.pages || 1)}>{U.footer.next}</button>
          </div>
        </div>
      </div>

      {open && (
        <Modal onClose={() => { setOpen(false); setEditing(null); }}>
          <UserForm
            initial={editing}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={handleSubmit}
            U={U}
          />
        </Modal>
      )}
    </div>
  );
}

function Th({ children, className="" }) { return <th className={`text-left px-4 py-3 font-medium ${className}`}>{children}</th>; }
function Td({ children, className="" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }

function fmtPercent(v) {
  const n = Number(v) || 0;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function permChip(levelRaw) {
  const level = String(levelRaw || "viewer").toLowerCase();
  const map = {
    admin:   "bg-red-50 text-red-700 border border-red-200",
    manager: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    trader:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    viewer:  "bg-slate-100 text-slate-700 border border-slate-200",
  };
  const cls = map[level] || map.viewer;
  return <span className={`px-2 py-1 rounded text-xs uppercase ${cls}`}>{level}</span>;
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">User</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function UserForm({ initial, onSubmit, onCancel, U }) {
  const isEdit = Boolean(initial?._id);
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [userEmail, setUserEmail] = useState(initial?.userEmail || "");
  const [password, setPassword] = useState("");
  const [userPhone, setUserPhone] = useState(initial?.userPhone || "");
  const [commission, setCommission] = useState(initial?.commission ?? 0);
  const [region, setRegion] = useState(initial?.region || "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || "");
  const [permissionLevel, setPermissionLevel] = useState(initial?.permissionLevel || "viewer");
  const [status, setStatus] = useState(initial?.status || "active");

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !userEmail.trim() || (!isEdit && !password.trim())) {
      alert(U.alerts.required);
      return;
    }
    const payload = {
      code: code.trim(),
      name: name.trim(),
      userEmail: userEmail.trim().toLowerCase(),
      userPhone: userPhone.trim() || null,
      commission: Number(commission) || 0,
      region: region.trim() || null,
      jobTitle: jobTitle.trim() || null,
      permissionLevel,
      status,
    };
    if (!isEdit || password.trim()) payload.password = password;
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={U.modal.fields.code}><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={code} onChange={(e)=>setCode(e.target.value)} /></Field>
        <Field label={U.modal.fields.name}><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} /></Field>
        <Field label={U.modal.fields.email}><input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={userEmail} onChange={(e)=>setUserEmail(e.target.value)} /></Field>
        <Field label={isEdit ? U.modal.fields.newPassword : U.modal.fields.password}><input type="password" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} /></Field>
        <Field label={U.modal.fields.phone}><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={userPhone} onChange={(e)=>setUserPhone(e.target.value)} /></Field>
        <Field label={U.modal.fields.commission}>
          <div className="relative">
            <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10" value={commission} onChange={(e)=>setCommission(e.target.value)} />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
          </div>
        </Field>
        <Field label={U.modal.fields.region}><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={region} onChange={(e)=>setRegion(e.target.value)} /></Field>
        <Field label={U.modal.fields.jobTitle}><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} /></Field>
        <Field label={U.modal.fields.permission}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={permissionLevel} onChange={(e)=>setPermissionLevel(e.target.value)}>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="trader">trader</option>
            <option value="viewer">viewer</option>
          </select>
        </Field>
        <Field label={U.modal.fields.status}>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="active">{U.controls.statuses.active}</option>
            <option value="suspended">{U.controls.statuses.suspended}</option>
            <option value="closed">{U.controls.statuses.closed}</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">{U.modal.cancel}</button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          {isEdit ? U.modal.save : U.modal.add}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return <label className="text-sm"><div className="mb-1 text-slate-600">{label}</div>{children}</label>;
}

function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}>
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
    </div>
  );
}
