// Contacts.jsx — PART 1/3
import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "../helpers/i18n";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  IdCard,
  Maximize2,
  Minimize2,
  Map,
  Phone,
  Image,
  Hash,
  User,
  FileText,
  MapPin,
  Building,
  Mail,
  Globe,
  PhoneCall,
  Tag,
  BadgePercent,
  UserRound,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Briefcase,
  Building2,
  NotebookPen,
} from "lucide-react";

const API =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api.217.154.88.40.sslip.io");

// --- tiny UI helpers (same look as Customers) ---
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
function Chip({ label, onClear, clearTitle = "Clear" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 hover:bg-white"
        title={clearTitle}
        aria-label={clearTitle}
      >
        <X size={12} className="text-slate-500" />
      </button>
    </span>
  );
}
function Toast({ type = "success", children, onClose }) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const wrap = isSuccess
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${wrap}`}
    >
      <Icon size={16} />
      <span className="mr-auto">{children}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
        ✕
      </button>
    </div>
  );
}
function formatDate(s, locale, dash = "—") {
  try {
    return s ? new Date(s).toLocaleDateString(locale) : dash;
  } catch {
    return s || dash;
  }
}
function Field({
  label,
  icon: Icon,
  error,
  help,
  children,
  iconInside = true,
  autoHeight = false,
}) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: [
          children.props.className || "",
          iconInside && Icon ? " pl-9" : "",
          !autoHeight ? " h-10" : "",
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
        {iconInside && Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
        {child}
      </div>
      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function KV({ label, icon: Icon, children }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 text-slate-500 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />} {label}
      </div>
      <div className="col-span-2 font-medium">{children}</div>
    </div>
  );
}
function NoBadge({ value, emptyLabel = "—" }) {
  const v = value || emptyLabel;
  const isEmpty = v === emptyLabel;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono",
        "border",
        isEmpty
          ? "text-slate-400 bg-slate-50 border-slate-200"
          : "font-semibold text-sky-700 bg-sky-50 border-sky-200",
      ].join(" ")}
    >
      <Hash size={12} className={isEmpty ? "text-slate-300" : "text-sky-500"} />
      {v}
    </span>
  );
}

function BoolIcon({ value, variant = "default" }) {
  const base =
    "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs";

  if (value) {
    return (
      <span
        className={base + " border-emerald-200 bg-emerald-50 text-emerald-600"}
        title="Yes"
      >
        ✓
      </span>
    );
  }

  const falseClass =
    variant === "danger"
      ? " border-red-200 bg-red-50 text-red-500"
      : " border-slate-200 bg-slate-50 text-slate-400";

  return (
    <span className={base + falseClass} title="No">
      ✕
    </span>
  );
}

function displayContactKey(c) {
  if (c?.no) return c.no;
  return c?._id ? `…${String(c._id).slice(-6)}` : "—";
}
// KON + 7 digits
function nextContactNoFrom(lastNo) {
  const m = String(lastNo || "").match(/^KON(\d{1,})$/i);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `KON${String(n).padStart(7, "0")}`;
}

// ---------- MAIN ----------
export default function Contacts() {
  const { t, locale } = useI18n();
  const T = t.contacts || {};
  const COL_COUNT = 17; // expanded columns (added Type/Blocked/Potential)

  // filters / paging / sort
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // '', 'nowy_kontakt','aktywny','archiwalny'
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [blocked, setBlocked] = useState(""); // '', 'none', 'all'
  const [potential, setPotential] = useState(""); // '', 'yes', 'no'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    status,
    country,
    region,
    blocked,
    potential,
  ].filter(Boolean).length;

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const onSort = (by) => {
    setSortDir(sortBy === by ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortBy(by);
    setPage(1);
  };

  // notifications
  const [notice, setNotice] = useState(null);
  const showNotice = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  // data & ui
  const [data, setData] = useState({ data: [], total: 0, pages: 0, page: 1 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // posting contact -> buyers (mcustomers)
  const [postContact, setPostContact] = useState(null);
  const [postingBuyer, setPostingBuyer] = useState(false);

  const onPostAsBuyerClick = (contact) => {
    if (!contact || contact.customerId) return; // already linked, ignore just in case
    setPostContact(contact);
  };

  const confirmPostAsBuyer = async () => {
    if (!postContact) return;
    setPostingBuyer(true);
    try {
      const c = postContact;

      // map common fields Contact -> Customer
      const buyerPayload = {
        name: c.name, // required
        name2: c.name2 || undefined,

        address: c.address || undefined,
        address2: c.address2 || undefined,
        city: c.city || undefined,
        postCode: c.postCode || undefined,

        phoneNo: c.phoneNo || undefined,

        email: c.email || undefined,
        email2: c.email2 || undefined,
        homePage: c.homePage || undefined,

        nip: c.nip || undefined,

        countryRegionCode: c.countryRegionCode || undefined,
        region: c.region || undefined,

        salespersonCode: c.salespersonCode || undefined,
        priority: typeof c.priority === "number" ? c.priority : 0,

        // contact.blocked is "none" / "all" → map into Customer.blocked enum
        blocked: c.blocked === "all" ? "all" : "none",

        // leave other Customer fields at defaults (creditLimit, customerType, etc.)
      };

      const res = await fetch(`${API}/api/mcustomers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buyerPayload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend already returns "Customer No. already exists" for duplicates
        showNotice(
          "error",
          json?.message || T?.alerts?.requestFail || "Failed to create buyer."
        );
        return;
      }

      // link contact -> buyer so the button disappears next time
      try {
        await fetch(`${API}/api/contacts/${c._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: json._id }),
        });
      } catch (err) {
        console.error("Failed to update contact with customerId", err);
        // non-fatal: user will still get a buyer; button may reappear until reload
      }

      showNotice(
        "success",
        T?.alerts?.postedToBuyers || "Contact posted as buyer."
      );
      setPostContact(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotice("error", T?.alerts?.requestFail || "Failed to create buyer.");
    } finally {
      setPostingBuyer(false);
    }
  };

  // posting contact -> sellers (mvendors)
  const [postVendorContact, setPostVendorContact] = useState(null);
  const [postingVendor, setPostingVendor] = useState(false);

  const onPostAsVendorClick = (contact) => {
    if (!contact || contact.vendorId) return; // already linked
    setPostVendorContact(contact);
  };

  const confirmPostAsVendor = async () => {
    if (!postVendorContact) return;
    setPostingVendor(true);

    try {
      const c = postVendorContact;

      // map common fields Contact -> Vendor
      const vendorPayload = {
        // no: omitted → backend will auto-generate D000000x
        name: c.name,
        name2: c.name2 || undefined,

        address: c.address || undefined,
        address2: c.address2 || undefined,
        city: c.city || undefined,
        postCode: c.postCode || undefined,
        region: c.region || undefined,
        countryRegionCode: c.countryRegionCode || undefined,

        phoneNo: c.phoneNo || undefined,
        email: c.email || undefined,
        email2: c.email2 || undefined,
        homePage: c.homePage || undefined,

        nip: c.nip || undefined,

        // use contact priority & blocked flags
        priority: typeof c.priority === "number" ? c.priority : 0,
        blocked: c.blocked === "all" ? "all" : "none",

        // optional mapping: salespersonCode -> purchaserCode
        purchaserCode: c.salespersonCode || undefined,
      };

      const res = await fetch(`${API}/api/mvendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorPayload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showNotice(
          "error",
          json?.message || T?.alerts?.requestFail || "Failed to create vendor."
        );
        return;
      }

      // link contact -> vendor so the button disappears next time
      try {
        await fetch(`${API}/api/contacts/${c._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId: json._id }),
        });
      } catch (err) {
        console.error("Failed to update contact with vendorId", err);
      }

      showNotice(
        "success",
        T?.alerts?.postedToVendors || "Contact posted as vendor."
      );
      setPostVendorContact(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotice("error", T?.alerts?.requestFail || "Failed to create vendor.");
    } finally {
      setPostingVendor(false);
    }
  };

  // posting contact -> both (buyer + vendor)
  const [postBothContact, setPostBothContact] = useState(null);
  const [postingBoth, setPostingBoth] = useState(false);

  const onPostAsBuyerAndVendorClick = (contact) => {
    // only if at least one side is missing
    if (!contact || (contact.customerId && contact.vendorId)) return;
    setPostBothContact(contact);
  };

  const confirmPostAsBuyerAndVendor = async () => {
    if (!postBothContact) return;
    setPostingBoth(true);

    try {
      const c = postBothContact;

      // ---- map Contact -> Customer (same as in confirmPostAsBuyer) ----
      const buyerPayload = {
        name: c.name,
        name2: c.name2 || undefined,
        address: c.address || undefined,
        address2: c.address2 || undefined,
        city: c.city || undefined,
        postCode: c.postCode || undefined,
        phoneNo: c.phoneNo || undefined,
        email: c.email || undefined,
        email2: c.email2 || undefined,
        homePage: c.homePage || undefined,
        nip: c.nip || undefined,
        countryRegionCode: c.countryRegionCode || undefined,
        region: c.region || undefined,
        salespersonCode: c.salespersonCode || undefined,
        priority: typeof c.priority === "number" ? c.priority : 0,
        blocked: c.blocked === "all" ? "all" : "none",
      };

      // ---- map Contact -> Vendor (same as in confirmPostAsVendor) ----
      const vendorPayload = {
        name: c.name,
        name2: c.name2 || undefined,
        address: c.address || undefined,
        address2: c.address2 || undefined,
        city: c.city || undefined,
        postCode: c.postCode || undefined,
        region: c.region || undefined,
        countryRegionCode: c.countryRegionCode || undefined,
        phoneNo: c.phoneNo || undefined,
        email: c.email || undefined,
        email2: c.email2 || undefined,
        homePage: c.homePage || undefined,
        nip: c.nip || undefined,
        priority: typeof c.priority === "number" ? c.priority : 0,
        blocked: c.blocked === "all" ? "all" : "none",
        purchaserCode: c.salespersonCode || undefined,
      };

      let customerId = c.customerId || null;
      let vendorId = c.vendorId || null;
      let buyerError = null;
      let vendorError = null;

      // create buyer if missing
      if (!customerId) {
        const resB = await fetch(`${API}/api/mcustomers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buyerPayload),
        });
        const jsonB = await resB.json().catch(() => ({}));
        if (resB.ok) {
          customerId = jsonB._id;
        } else {
          buyerError =
            jsonB?.message ||
            T?.alerts?.requestFail ||
            "Failed to create buyer.";
        }
      }

      // create vendor if missing
      if (!vendorId) {
        const resV = await fetch(`${API}/api/mvendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vendorPayload),
        });
        const jsonV = await resV.json().catch(() => ({}));
        if (resV.ok) {
          vendorId = jsonV._id;
        } else {
          vendorError =
            jsonV?.message ||
            T?.alerts?.requestFail ||
            "Failed to create vendor.";
        }
      }

      // if both failed – nothing to link
      if (!customerId && !vendorId) {
        showNotice(
          "error",
          buyerError || vendorError || "Failed to create buyer and vendor."
        );
        return;
      }

      // link whatever we managed to create back to contact
      const updateBody = {};
      if (customerId) updateBody.customerId = customerId;
      if (vendorId) updateBody.vendorId = vendorId;

      try {
        await fetch(`${API}/api/contacts/${c._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });
      } catch (err) {
        console.error("Failed to update contact with customerId/vendorId", err);
      }

      if (customerId && vendorId && !buyerError && !vendorError) {
        showNotice(
          "success",
          T?.alerts?.postedToBoth || "Contact posted as buyer and vendor."
        );
      } else if (customerId && !vendorId) {
        showNotice(
          "error",
          vendorError ||
            "Buyer created, but vendor creation failed. Check vendor list."
        );
      } else if (!customerId && vendorId) {
        showNotice(
          "error",
          buyerError ||
            "Vendor created, but buyer creation failed. Check buyers list."
        );
      }

      setPostBothContact(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotice(
        "error",
        T?.alerts?.requestFail || "Failed to create buyer and vendor."
      );
    } finally {
      setPostingBoth(false);
    }
  };

  // fetch list
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (country) params.set("country", country);
      if (region) params.set("region", region);
      if (blocked) params.set("blocked", blocked);
      if (potential)
        params.set("potentialClient", potential === "yes" ? "true" : "false");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      const res = await fetch(`${API}/api/contacts?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      showNotice("error", T?.alerts?.loadFail || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [
    page,
    limit,
    status,
    country,
    region,
    blocked,
    potential,
    sortBy,
    sortDir,
  ]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };
  const onAddClick = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEditClick = (row) => {
    setEditing(row);
    setOpen(true);
  };
  const onDelete = async (_id) => {
    if (!window.confirm(T?.alerts?.deleteConfirm || "Delete this contact?"))
      return;
    try {
      const res = await fetch(`${API}/api/contacts/${_id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        if (expandedId === _id) setExpandedId(null);
        showNotice("success", T?.alerts?.deleted || "Contact deleted.");
        fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        showNotice(
          "error",
          json?.message || T?.alerts?.requestFail || "Request failed"
        );
      }
    } catch {
      showNotice("error", T?.alerts?.requestFail || "Request failed");
    }
  };

  // client-side sort
  const rows = useMemo(() => {
    const arr = [...(data?.data || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    const keyMap = {
      no: "no",
      name: "name",
      company: "company",
      jobTitle: "jobTitle",
      email: "email",
      phone: "phoneNo",
      country: "countryRegionCode",
      city: "city",
      contactType: "contactType",
      blocked: "blocked",
      potentialClient: "potentialClient",
      owzSigned: "owzSigned",
      umowaRamowaSigned: "umowaRamowaSigned",
      status: "status",
      createdAt: "createdAt",
    };

    const k = keyMap[sortBy] || sortBy;
    const val = (r) => {
      const v = r?.[k];
      if (k === "createdAt") return v ? new Date(v).getTime() : 0;
      if (
        k === "potentialClient" ||
        k === "owzSigned" ||
        k === "umowaRamowaSigned"
      )
        return v ? 1 : 0;
      return (v ?? "").toString().toLowerCase();
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

  // labels
  const F = {
    searchPh:
      T?.controls?.searchPlaceholder || "Search: name, email, company, city",
    countryPh: T?.controls?.countryPlaceholder || "Country code",
    regionPh: T?.controls?.regionPlaceholder || "Region",
    allStatuses: T?.controls?.allStatuses || "All statuses",
    allBlocked: T?.controls?.allBlocked || "All blocked",
    allPotential: T?.controls?.allPotential || "All potential",
    searchBtn: T?.controls?.searchBtn || "Search",
    addBtn: T?.controls?.addBtn || "Add Contact",
    filters: T?.controls?.filters || "Filters",
  };

  return (
    <>
      <ContactsView
        {...{
          T,
          F,
          locale,
          loading,
          notice,
          setNotice,
          q,
          setQ,
          status,
          setStatus,
          country,
          setCountry,
          region,
          setRegion,
          blocked,
          setBlocked,
          potential,
          setPotential,
          showFilters,
          setShowFilters,
          activeFilterCount,
          onSearch,
          onAddClick,
          data,
          rows,
          sortBy,
          sortDir,
          onSort,
          setPage,
          limit,
          setLimit,
          expandedId,
          setExpandedId,
          onEditClick,
          onDelete,
          onPostAsBuyerClick,
          onPostAsVendorClick,
          onPostAsBuyerAndVendorClick,
          COL_COUNT,
          open,
          setOpen,
          setEditing,
          editing,
          handleSubmit: async (form) => {
            const isEdit = Boolean(editing?._id);
            const url = isEdit
              ? `${API}/api/contacts/${editing._id}`
              : `${API}/api/contacts`;
            const method = isEdit ? "PUT" : "POST";
            try {
              const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) {
                showNotice(
                  "error",
                  json?.message || T?.alerts?.requestFail || "Request failed"
                );
                return;
              }
              showNotice(
                "success",
                isEdit
                  ? T?.alerts?.updated || "Contact updated."
                  : T?.alerts?.created || "Contact created."
              );
              setOpen(false);
              setEditing(null);
              setPage(1);
              fetchData();
            } catch {
              showNotice("error", T?.alerts?.requestFail || "Request failed");
            }
          },
        }}
      />

      {/* NEW: Confirm POST → buyers modal */}
      {postContact && (
        <Modal
          onClose={() => (!postingBuyer ? setPostContact(null) : null)}
          title={T?.modal?.postAsBuyerTitle || "Post contact to buyers"}
          fullscreen={false}
          backdrop="dim"
        >
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              {T?.modal?.postAsBuyerQuestion ||
                "Do you want to create a buyer (customer) record from this contact?"}
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div>
                <span className="font-semibold">No.:</span>{" "}
                {postContact.no || "—"}
              </div>
              <div>
                <span className="font-semibold">Name:</span> {postContact.name}
              </div>
              <div>
                <span className="font-semibold">City:</span>{" "}
                {postContact.city || "—"}
              </div>
              <div>
                <span className="font-semibold">NIP:</span>{" "}
                {postContact.nip || "—"}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostContact(null)}
                disabled={postingBuyer}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                {T?.modal?.cancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmPostAsBuyer}
                disabled={postingBuyer}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {postingBuyer && (
                  <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-transparent" />
                )}
                {T?.modal?.postAsBuyerConfirm || "Yes, create buyer"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {postVendorContact && (
        <Modal
          onClose={() => (!postingVendor ? setPostVendorContact(null) : null)}
          title={T?.modal?.postAsVendorTitle || "Post contact to vendors"}
          fullscreen={false}
          backdrop="dim"
        >
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              {T?.modal?.postAsVendorQuestion ||
                "Do you want to create a vendor (seller) record from this contact?"}
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs space-y-1">
              <div>
                <span className="font-semibold">No.:</span>{" "}
                {postVendorContact.no || "—"}
              </div>
              <div>
                <span className="font-semibold">Name:</span>{" "}
                {postVendorContact.name}
              </div>
              <div>
                <span className="font-semibold">City:</span>{" "}
                {postVendorContact.city || "—"}
              </div>
              <div>
                <span className="font-semibold">NIP:</span>{" "}
                {postVendorContact.nip || "—"}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostVendorContact(null)}
                disabled={postingVendor}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                {T?.modal?.cancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmPostAsVendor}
                disabled={postingVendor}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {postingVendor && (
                  <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-transparent" />
                )}
                {T?.modal?.postAsVendorConfirm || "Yes, create vendor"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {postBothContact && (
        <Modal
          onClose={() => (!postingBoth ? setPostBothContact(null) : null)}
          title={
            T?.modal?.postAsBothTitle || "Post contact to buyers & vendors"
          }
          fullscreen={false}
          backdrop="dim"
        >
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              {T?.modal?.postAsBothQuestion ||
                "Do you want to create both a buyer (customer) and a vendor (seller) record from this contact?"}
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs space-y-1">
              <div>
                <span className="font-semibold">No.:</span>{" "}
                {postBothContact.no || "—"}
              </div>
              <div>
                <span className="font-semibold">Name:</span>{" "}
                {postBothContact.name}
              </div>
              <div>
                <span className="font-semibold">City:</span>{" "}
                {postBothContact.city || "—"}
              </div>
              <div>
                <span className="font-semibold">NIP:</span>{" "}
                {postBothContact.nip || "—"}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostBothContact(null)}
                disabled={postingBoth}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                {T?.modal?.cancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmPostAsBuyerAndVendor}
                disabled={postingBoth}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {postingBoth && (
                  <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-transparent" />
                )}
                {T?.modal?.postAsBothConfirm || "Yes, create both"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ContactsView(props) {
  const {
    T,
    F,
    locale,
    loading,
    notice,
    setNotice,
    q,
    setQ,
    status,
    setStatus,
    country,
    setCountry,
    region,
    setRegion,
    blocked,
    setBlocked,
    potential,
    setPotential,
    showFilters,
    setShowFilters,
    activeFilterCount,
    onSearch,
    onAddClick,
    data,
    rows,
    sortBy,
    sortDir,
    onSort,
    setPage,
    limit,
    setLimit,
    expandedId,
    setExpandedId,
    onEditClick,
    onDelete,
    onPostAsBuyerClick,
    onPostAsVendorClick,
    onPostAsBuyerAndVendorClick,
    COL_COUNT,
    open,
    setOpen,
    setEditing,
    editing,
    handleSubmit,
  } = props;

  const statusLabel = (s) =>
    (T?.statusLabels && T.statusLabels[s]) ||
    (s === "aktywny"
      ? "Active"
      : s === "archiwalny"
      ? "Archived"
      : "New contact");

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
              placeholder={F.searchPh}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none focus:border-slate-300"
            />
            <button
              type="submit"
              title={F.searchBtn}
              aria-label={F.searchBtn}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <Search size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 md:hidden"
            aria-expanded={showFilters}
            aria-controls="contact-filters-panel"
          >
            <SlidersHorizontal size={16} className="opacity-70" />
            {F.filters}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onAddClick}
            className="order-1 sm:order-none sm:ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus size={16} />
            {F.addBtn}
          </button>
        </div>

        {/* filters row */}
        <div
          id="contact-filters-panel"
          className={`mt-2 grid grid-cols-1 gap-2 transition-all md:grid-cols-5 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          {/* Status (schema: nowy_kontakt, aktywny, archiwalny) */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{F.allStatuses}</option>
            <option value="nowy_kontakt">{statusLabel("nowy_kontakt")}</option>
            <option value="aktywny">{statusLabel("aktywny")}</option>
            <option value="archiwalny">{statusLabel("archiwalny")}</option>
          </select>

          {/* Blocked */}
          <select
            value={blocked}
            onChange={(e) => {
              setBlocked(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{F.allBlocked}</option>
            <option value="none">
              {(T?.blockedLabels && T.blockedLabels.none) || "OK"}
            </option>
            <option value="all">
              {(T?.blockedLabels && T.blockedLabels.all) || "ALL"}
            </option>
          </select>

          {/* Potential */}
          <select
            value={potential}
            onChange={(e) => {
              setPotential(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">{F.allPotential}</option>
            <option value="yes">{T?.labels?.yes || "Yes"}</option>
            <option value="no">{T?.labels?.no || "No"}</option>
          </select>

          {/* Country */}
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder={F.countryPh}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
            />
          </div>

          {/* Region */}
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={F.regionPh}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-300"
            />
          </div>
        </div>

        {/* active chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {status && (
            <Chip
              clearTitle={T?.modal?.cancel || "Clear"}
              onClear={() => setStatus("")}
              label={`${T?.table?.status || "Status"}: ${statusLabel(status)}`}
            />
          )}
          {blocked && (
            <Chip
              clearTitle={T?.modal?.cancel || "Clear"}
              onClear={() => setBlocked("")}
              label={`${T?.table?.blocked || "Blocked"}: ${
                (T?.blockedLabels && T.blockedLabels[blocked]) ||
                blocked.toUpperCase()
              }`}
            />
          )}
          {potential && (
            <Chip
              clearTitle={T?.modal?.cancel || "Clear"}
              onClear={() => setPotential("")}
              label={`${T?.table?.potentialClient || "Potential"}: ${
                potential === "yes"
                  ? T?.labels?.yes || "Yes"
                  : T?.labels?.no || "No"
              }`}
            />
          )}
          {country && (
            <Chip
              clearTitle={T?.modal?.cancel || "Clear"}
              onClear={() => setCountry("")}
              label={`${T?.table?.country || "Country"}: ${country}`}
            />
          )}
          {region && (
            <Chip
              clearTitle={T?.modal?.cancel || "Clear"}
              onClear={() => setRegion("")}
              label={`${T?.table?.city || "City/Region"}: ${region}`}
            />
          )}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th />
                <SortableTh id="no" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.no || "No."}
                </SortableTh>
                <SortableTh id="name" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.name || "Name"}
                </SortableTh>
                <SortableTh id="company" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.company || "Company"}
                </SortableTh>
                <SortableTh id="jobTitle" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.jobTitle || "Job Title"}
                </SortableTh>
                <SortableTh id="email" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.email || "Email"}
                </SortableTh>
                <SortableTh id="phone" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.phone || "Phone"}
                </SortableTh>
                <SortableTh id="country" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.country || "Country"}
                </SortableTh>
                <SortableTh id="city" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.city || "City"}
                </SortableTh>
                <SortableTh id="contactType" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.contactType || "Type"}
                </SortableTh>
                <SortableTh id="blocked" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.blocked || "Blocked"}
                </SortableTh>
                <SortableTh
                  id="potentialClient"
                  {...{ sortBy, sortDir, onSort }}
                >
                  {T?.table?.potentialClient || "Potential"}
                </SortableTh>

                {/* NEW: OWZ signed */}
                <SortableTh id="owzSigned" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.owzSigned || "OWZ"}
                </SortableTh>

                {/* NEW: Umowa ramowa signed */}
                <SortableTh
                  id="umowaRamowaSigned"
                  {...{ sortBy, sortDir, onSort }}
                >
                  {T?.table?.umowaRamowaSigned || "Framework"}
                </SortableTh>

                <SortableTh id="status" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.status || "Status"}
                </SortableTh>
                <SortableTh id="createdAt" {...{ sortBy, sortDir, onSort }}>
                  {T?.table?.created || "Created"}
                </SortableTh>
                <Th>{T?.table?.actions || ""}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="p-6 text-center text-slate-500"
                  >
                    {T?.table?.loading || "Loading…"}
                  </td>
                </tr>
              ) : (data.data?.length || 0) === 0 ? (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="p-6 text-center text-slate-500"
                  >
                    {T?.table?.empty || "No contacts"}
                  </td>
                </tr>
              ) : (
                (rows || data.data).map((c) => (
                  <React.Fragment key={c._id}>
                    <tr className="border-t">
                      <Td className="w-8">
                        <button
                          className="p-1 rounded hover:bg-slate-100"
                          onClick={() =>
                            setExpandedId((id) => (id === c._id ? null : c._id))
                          }
                          aria-label={
                            T?.a11y?.toggleDetails || "Toggle details"
                          }
                          title={T?.a11y?.toggleDetails || "Toggle details"}
                        >
                          {expandedId === c._id ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </Td>
                      <Td>
                        <NoBadge value={displayContactKey(c)} />
                      </Td>
                      <Td className="font-medium">{c.name}</Td>
                      <Td className="text-slate-600">{c.company || "—"}</Td>
                      <Td className="text-slate-600">{c.jobTitle || "—"}</Td>
                      <Td className="text-slate-600">{c.email || "—"}</Td>
                      <Td className="text-slate-600">{c.phoneNo || "—"}</Td>
                      <Td>{c.countryRegionCode || "—"}</Td>
                      <Td>{c.city || "—"}</Td>
                      <Td>
                        {(T?.contactTypeLabels &&
                          T.contactTypeLabels[c.contactType]) ||
                          c.contactType ||
                          "—"}
                      </Td>
                      <Td>
                        <span
                          className={
                            "px-2 py-1 rounded text-xs font-semibold border " +
                            (String(c.blocked || "none") === "none"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200")
                          }
                        >
                          {(T?.blockedLabels &&
                            T.blockedLabels[String(c.blocked || "none")]) ||
                            String(c.blocked || "none").toUpperCase()}
                        </span>
                      </Td>

                      <Td>
                        <span
                          className={
                            "px-2 py-1 rounded text-xs font-semibold border " +
                            (c.potentialClient
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-300")
                          }
                        >
                          {c.potentialClient
                            ? T?.labels?.yes || "Yes"
                            : T?.labels?.no || "No"}
                        </span>
                      </Td>

                      {/* NEW: OWZ signed icon */}
                      <Td className="text-center">
                        <BoolIcon value={!!c.owzSigned} variant="danger" />
                      </Td>

                      {/* NEW: Umowa ramowa signed icon */}
                      <Td className="text-center">
                        <BoolIcon
                          value={!!c.umowaRamowaSigned}
                          variant="danger"
                        />
                      </Td>

                      <Td>
                        {(() => {
                          const s = String(
                            c.status || "nowy_kontakt"
                          ).toLowerCase();
                          const label =
                            (T?.statusLabels && T.statusLabels[s]) ||
                            (s === "aktywny"
                              ? "Active"
                              : s === "archiwalny"
                              ? "Archived"
                              : "New contact");

                          const cls =
                            s === "aktywny"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : s === "archiwalny"
                              ? "bg-slate-100 text-slate-600 border-slate-300"
                              : "bg-amber-50 text-amber-700 border-amber-200";

                          return (
                            <span
                              className={
                                "inline-flex items-center rounded px-2 py-1 text-xs font-semibold border " +
                                cls
                              }
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </Td>

                      <Td>{formatDate(c.createdAt, locale, "—")}</Td>
                      <Td>
                        <div className="flex justify-end gap-2 pr-3">
                          {/* Post as buyer (customer) */}
                          {!c.customerId && (
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100 text-emerald-600"
                              onClick={() => onPostAsBuyerClick?.(c)}
                              title={T?.table?.postAsBuyer || "Post as buyer"}
                              aria-label={
                                T?.table?.postAsBuyer || "Post as buyer"
                              }
                            >
                              <Briefcase size={16} />
                            </button>
                          )}

                          {/* Post as vendor (seller) */}
                          {!c.vendorId && (
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100 text-sky-600"
                              onClick={() => onPostAsVendorClick?.(c)}
                              title={T?.table?.postAsVendor || "Post as vendor"}
                              aria-label={
                                T?.table?.postAsVendor || "Post as vendor"
                              }
                            >
                              <Building size={16} />
                            </button>
                          )}

                          {/* NEW: post as BOTH buyer + vendor */}
                          {!c.customerId && !c.vendorId && (
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-slate-100 text-purple-600"
                              onClick={() => onPostAsBuyerAndVendorClick?.(c)}
                              title={
                                T?.table?.postAsBoth || "Post as buyer & vendor"
                              }
                              aria-label={
                                T?.table?.postAsBoth || "Post as buyer & vendor"
                              }
                            >
                              <UserRound size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-slate-100"
                            onClick={() => onEditClick(c)}
                            title={T?.table?.edit || "Edit"}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                            onClick={() => onDelete(c._id)}
                            title={T?.table?.delete || "Delete"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>

                    {expandedId === c._id && (
                      <tr key={`${c._id}-details`}>
                        <td
                          colSpan={COL_COUNT}
                          className="bg-slate-50 border-t"
                        >
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            {/* identity */}
                            <KV
                              label={T?.details?.name2 || "Name 2"}
                              icon={FileText}
                            >
                              {c.name2 || "—"}
                            </KV>
                            <KV
                              label={T?.details?.company || "Company"}
                              icon={Building2}
                            >
                              {c.company || "—"}
                            </KV>
                            <KV
                              label={T?.details?.jobTitle || "Job Title"}
                              icon={Briefcase}
                            >
                              {c.jobTitle || "—"}
                            </KV>
                            <KV
                              label={T?.table?.contactType || "Type"}
                              icon={IdCard}
                            >
                              {(T?.contactTypeLabels &&
                                T.contactTypeLabels[c.contactType]) ||
                                c.contactType ||
                                "—"}
                            </KV>

                            {/* address */}
                            <KV
                              label={T?.details?.address || "Address"}
                              icon={Building}
                            >
                              {c.address || "—"}
                            </KV>
                            <KV
                              label={T?.details?.address2 || "Address 2"}
                              icon={Building}
                            >
                              {c.address2 || "—"}
                            </KV>
                            <KV
                              label={T?.details?.postCode || "Post code"}
                              icon={Hash}
                            >
                              {c.postCode || "—"}
                            </KV>
                            <KV
                              label={T?.details?.city || "City"}
                              icon={MapPin}
                            >
                              {c.city || "—"}
                            </KV>
                            <KV
                              label={T?.details?.region || "Region"}
                              icon={MapPin}
                            >
                              {c.region || "—"}
                            </KV>
                            <KV
                              label={T?.details?.country || "Country"}
                              icon={Globe}
                            >
                              {c.countryRegionCode || "—"}
                            </KV>

                            {/* comms */}
                            <KV
                              label={T?.modal?.fields?.phoneNo || "Phone No."}
                              icon={PhoneCall}
                            >
                              {c.phoneNo || "—"}
                            </KV>
                            <KV
                              label={
                                T?.modal?.fields?.phoneNo2 || "Phone No. 2"
                              }
                              icon={PhoneCall}
                            >
                              {c.phoneNo2 || "—"}
                            </KV>
                            <KV
                              label={T?.details?.email2 || "Email 2"}
                              icon={Mail}
                            >
                              {c.email2 || "—"}
                            </KV>
                            <KV
                              label={T?.details?.homePage || "Home page"}
                              icon={Globe}
                            >
                              {c.homePage || "—"}
                            </KV>
                            <KV
                              label={T?.details?.linkedinUrl || "LinkedIn"}
                              icon={UserRound}
                            >
                              {c.linkedinUrl || "—"}
                            </KV>

                            {/* business/ownership */}
                            <KV label={T?.details?.nip || "Tax ID"} icon={Hash}>
                              {c.nip || "—"}
                            </KV>
                            <KV
                              label={T?.details?.ownerUserId || "Owner"}
                              icon={UserRound}
                            >
                              {c.ownerUserId || "—"}
                            </KV>
                            <KV
                              label={
                                T?.details?.salespersonCode || "Salesperson"
                              }
                              icon={UserRound}
                            >
                              {c.salespersonCode || "—"}
                            </KV>

                            {/* flags */}
                            {/* flags */}
                            <KV label={T?.table?.status || "Status"} icon={Tag}>
                              {statusLabel(String(c.status || "nowy_kontakt"))}
                            </KV>
                            <KV
                              label={T?.table?.blocked || "Blocked"}
                              icon={Tag}
                            >
                              {(T?.blockedLabels &&
                                T.blockedLabels[String(c.blocked || "none")]) ||
                                String(c.blocked || "none").toUpperCase()}
                            </KV>
                            <KV
                              label={T?.details?.priority || "Priority"}
                              icon={BadgePercent}
                            >
                              {c.priority ?? "—"}
                            </KV>
                            <KV
                              label={T?.table?.potentialClient || "Potential"}
                              icon={Tag}
                            >
                              {c.potentialClient
                                ? T?.labels?.yes || "Yes"
                                : T?.labels?.no || "No"}
                            </KV>

                            {/* NEW: OWZ signed */}
                            <KV
                              label={T?.details?.owzSigned || "OWZ signed"}
                              icon={CheckCircle2}
                            >
                              <BoolIcon
                                value={!!c.owzSigned}
                                variant="danger"
                              />
                            </KV>

                            {/* NEW: Framework agreement signed */}
                            <KV
                              label={
                                T?.details?.umowaRamowaSigned ||
                                "Framework agreement"
                              }
                              icon={CheckCircle2}
                            >
                              <BoolIcon
                                value={!!c.umowaRamowaSigned}
                                variant="danger"
                              />
                            </KV>

                            {/* tags */}
                            <KV label={T?.details?.tags || "Tags"} icon={Tag}>
                              {Array.isArray(c.tags) && c.tags.length > 0
                                ? c.tags.join(", ")
                                : "—"}
                            </KV>

                            {/* notes */}
                            <KV
                              label={T?.details?.notes || "Notes"}
                              icon={NotebookPen}
                            >
                              {c.notes || "—"}
                            </KV>

                            {/* picture */}
                            {c.hasPicture ? (
                              <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                                <ImageIcon size={14} />
                                <span className="font-medium">
                                  {T?.details?.picture || "Picture"}:
                                </span>
                                <img
                                  src={`${API}/api/contacts/${c._id}/picture`}
                                  alt="contact"
                                  className="h-10 w-10 rounded object-cover border"
                                />
                              </div>
                            ) : (
                              <div className="col-span-1 md:col-span-3 flex items-center gap-2 text-slate-500">
                                <ImageIcon size={14} />
                                <span>
                                  {T?.details?.noPicture || "No picture"}
                                </span>
                              </div>
                            )}
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

        {/* footer / paging */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="text-xs text-slate-500">
            {(T?.footer?.meta &&
              T.footer.meta(data.total, data.page, data.pages)) ||
              `Total: ${data.total} • Page ${data.page} of ${data.pages || 1}`}
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
                  {(T?.footer?.perPage && T.footer.perPage(n)) || `${n} / page`}
                </option>
              ))}
            </select>
            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              {T?.footer?.prev || "Prev"}
            </button>
            <button
              className="px-3 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
              disabled={data.page >= (data.pages || 1)}
            >
              {T?.footer?.next || "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <Modal
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={T?.modal?.title || "Contact"}
        >
          <ContactForm
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            T={T}
          />
        </Modal>
      )}
    </div>
  );
}

/* light modal container (same as Customers) */
function Modal({
  children,
  onClose,
  title,
  fullscreen = false,
  backdrop = "dim",
}) {
  // backdrop: "dim" | "transparent" | "blur" | "none"
  const [isFull, setIsFull] = React.useState(Boolean(fullscreen));

  React.useEffect(() => {
    const onKey = (e) => {
      const key = (e.key || "").toString().toLowerCase();

      if (key === "escape" || key === "esc") {
        onClose?.();
        return;
      }

      if (key === "f") {
        setIsFull((v) => !v);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const containerCls = [
    "relative bg-white shadow-xl border border-slate-200",
    isFull
      ? "w-screen h-screen max-w-none rounded-none"
      : "w-full max-w-4xl rounded-2xl",
  ].join(" ");

  const bodyCls = isFull
    ? "p-4 h-[calc(100vh-52px)] sm:h-[calc(100vh-52px)] overflow-auto"
    : "p-4 max-h-[75vh] overflow-auto";

  // Choose backdrop node
  let backdropNode = null;
  if (backdrop === "dim") {
    backdropNode = (
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    );
  } else if (backdrop === "transparent") {
    // click-catcher with no color (keeps outside-click-to-close)
    backdropNode = <div className="absolute inset-0" onClick={onClose} />;
  } else if (backdrop === "blur") {
    backdropNode = (
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />
    );
  } // "none" => no overlay at all

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      {backdropNode}
      <div className={containerCls}>
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white/80 backdrop-blur"
          onDoubleClick={() => setIsFull((v) => !v)}
        >
          <h3 className="font-semibold truncate pr-2">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFull((v) => !v)}
              className="p-2 rounded hover:bg-slate-100"
              title={isFull ? "Restore" : "Expand"}
              aria-label={isFull ? "Restore" : "Expand"}
            >
              {isFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100"
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={bodyCls}>{children}</div>
      </div>
    </div>
  );
}

// Contacts.jsx — PART 3/3
function ContactForm({ initial, onSubmit, onCancel, T }) {
  const isEdit = Boolean(initial?._id);

  const TABS = [
    { id: "basics", label: T?.modal?.tabs?.basics || "Basics", Icon: IdCard },
    { id: "address", label: T?.modal?.tabs?.address || "Address", Icon: Map },
    { id: "contact", label: T?.modal?.tabs?.contact || "Contact", Icon: Phone },
    { id: "extra", label: T?.modal?.tabs?.extra || "Extra", Icon: UserRound },
    { id: "picture", label: T?.modal?.tabs?.picture || "Picture", Icon: Image },
    { id: "notes", label: T?.modal?.tabs?.notes || "Notes", Icon: NotebookPen },
  ];
  const [tab, setTab] = useState(TABS[0].id);
  const onTabsKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight"
        ? (idx + 1) % TABS.length
        : (idx - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
  };

  // fields
  const [no, setNo] = useState(initial?.no || "");
  const [name, setName] = useState(initial?.name || "");
  const [name2, setName2] = useState(initial?.name2 || "");
  const [contactType, setContactType] = useState(
    initial?.contactType || "person"
  );
  const [company, setCompany] = useState(initial?.company || "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || "");
  const [status, setStatus] = useState(initial?.status || "nowy_kontakt");
  const [potentialClient, setPotentialClient] = useState(
    typeof initial?.potentialClient === "boolean"
      ? initial.potentialClient
      : true
  );

  const [owzSigned, setOwzSigned] = useState(
    typeof initial?.owzSigned === "boolean" ? initial.owzSigned : false
  );
  const [umowaRamowaSigned, setUmowaRamowaSigned] = useState(
    typeof initial?.umowaRamowaSigned === "boolean"
      ? initial.umowaRamowaSigned
      : false
  );

  const [address, setAddress] = useState(initial?.address || "");
  const [address2, setAddress2] = useState(initial?.address2 || "");
  const [city, setCity] = useState(initial?.city || "");
  const [postCode, setPostCode] = useState(initial?.postCode || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [countryRegionCode, setCountryRegionCode] = useState(
    initial?.countryRegionCode || ""
  );

  const [phoneNo, setPhoneNo] = useState(initial?.phoneNo || "");
  const [phoneNo2, setPhoneNo2] = useState(initial?.phoneNo2 || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [email2, setEmail2] = useState(initial?.email2 || "");
  const [homePage, setHomePage] = useState(initial?.homePage || "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl || "");

  const [nip, setNip] = useState(initial?.nip || "");
  const [ownerUserId, setOwnerUserId] = useState(initial?.ownerUserId || "");
  const [salespersonCode, setSalespersonCode] = useState(
    initial?.salespersonCode || ""
  );
  const [priority, setPriority] = useState(
    Number.isFinite(initial?.priority) ? initial.priority : 0
  );
  const [blocked, setBlocked] = useState(initial?.blocked || "none");
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(initial?.tags) ? initial.tags.join(", ") : ""
  );

  const [notes, setNotes] = useState(initial?.notes || "");

  const [errors, setErrors] = useState({});
  // picture
  const [pictureBase64, setPictureBase64] = useState(null);
  const [removePicture, setRemovePicture] = useState(false);
  const existingPicUrl = initial?.hasPicture
    ? initial?.picturePath
      ? `${API}${initial.picturePath}`
      : `${API}/api/contacts/${initial?._id}/picture`
    : null;
  const onPickPicture = (file) => {
    if (!file) {
      setPictureBase64(null);
      return;
    }
    setRemovePicture(false);
    const reader = new FileReader();
    reader.onload = () => setPictureBase64(reader.result);
    reader.readAsDataURL(file);
  };

  // auto No. for new records
  useEffect(() => {
    if (isEdit) return;
    let stop = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/contacts?limit=1&sortBy=no&sortDir=desc`
        );
        const json = await res.json();
        const last = json?.data?.[0]?.no || null;
        const next = nextContactNoFrom(last);
        if (!stop) setNo(next);
      } catch {
        if (!stop) setNo(nextContactNoFrom(null));
      }
    })();
    return () => {
      stop = true;
    };
  }, [isEdit]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = "Required";

    const emailRe = /^\S+@\S+\.\S+$/;
    if (email && !emailRe.test(email)) errs.email = "Invalid email";
    if (email2 && !emailRe.test(email2)) errs.email2 = "Invalid email";

    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.name) setTab("basics");
      else if (errs.email || errs.email2) setTab("contact");
      return;
    }
    setErrors({});

    const payload = {
      no: (no || "").trim() || null,

      name: name.trim(),
      name2: name2.trim() || null,
      contactType,
      company: company.trim() || null,
      jobTitle: jobTitle.trim() || null,

      status: (status || "nowy_kontakt").trim().toLowerCase(),
      potentialClient,

      address: address.trim() || null,
      address2: address2.trim() || null,
      city: city.trim() || null,
      postCode: postCode.trim() || null,
      region: region.trim() || null,
      countryRegionCode: countryRegionCode.trim().toUpperCase() || null,

      phoneNo: phoneNo.trim() || null,
      phoneNo2: phoneNo2.trim() || null,
      email: email.trim() || null,
      email2: email2.trim() || null,
      homePage: homePage.trim() || null,
      linkedinUrl: linkedinUrl.trim() || null,

      nip: nip.trim() || null,
      ownerUserId: ownerUserId.trim() || null,
      salespersonCode: salespersonCode.trim() || null,

      priority: Number.isFinite(priority) ? priority : 0,
      blocked: (blocked || "none").trim().toLowerCase(),

      tags: tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      owzSigned,
      umowaRamowaSigned,
      notes: notes.trim() || null,
    };

    if (pictureBase64) payload.picture = pictureBase64;
    else if (isEdit && removePicture) payload.picture = null;

    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* tabs */}
      <div
        role="tablist"
        aria-label="Contact tabs"
        onKeyDown={onTabsKeyDown}
        className="sticky top-0 z-10 -mt-2 pt-2 pb-3 bg-white/80 backdrop-blur border-b"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex gap-1 p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-inner">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={[
                    "relative overflow-hidden",
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium",
                    "transition-all duration-200 focus:outline-none",
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
                  {active && (
                    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {isEdit
              ? T?.modal?.save || "Save changes"
              : T?.modal?.add || "Create contact"}
          </div>
        </div>
      </div>

      {/* errors banner */}
      {Object.keys(errors).length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {T?.alerts?.fixErrors || "Please correct the highlighted fields."}
        </div>
      )}

      {/* BASICS */}
      <div
        role="tabpanel"
        id="panel-basics"
        aria-labelledby="tab-basics"
        hidden={tab !== "basics"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field
            label={T?.modal?.fields?.no || "No."}
            icon={Hash}
            help={T?.modal?.autoNumberHelp || ""}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 text-slate-700"
              value={no}
              readOnly
              placeholder="Auto"
            />
          </Field>

          <Field
            label={T?.modal?.fields?.contactType || "Contact type"}
            icon={IdCard}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
            >
              <option value="person">
                {(T?.contactTypeLabels && T.contactTypeLabels.person) ||
                  "Person"}
              </option>
              <option value="company">
                {(T?.contactTypeLabels && T.contactTypeLabels.company) ||
                  "Company"}
              </option>
            </select>
          </Field>

          <Field
            label={T?.modal?.fields?.name || "Name *"}
            icon={User}
            error={errors.name}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label={T?.modal?.fields?.name2 || "Name 2"} icon={FileText}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
            />
          </Field>

          <Field
            label={T?.modal?.fields?.company || "Company"}
            icon={Building2}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Field>

          <Field
            label={T?.modal?.fields?.jobTitle || "Job Title"}
            icon={Briefcase}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Field>

          <Field label={T?.modal?.fields?.status || "Status"} icon={Tag}>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="nowy_kontakt">
                {(T?.statusLabels && T.statusLabels.nowy_kontakt) ||
                  "New contact"}
              </option>
              <option value="aktywny">
                {(T?.statusLabels && T.statusLabels.aktywny) || "Active"}
              </option>
              <option value="archiwalny">
                {(T?.statusLabels && T.statusLabels.archiwalny) || "Archived"}
              </option>
            </select>
          </Field>

          <Field
            label={T?.modal?.fields?.potentialClient || "Potential client"}
            icon={Tag}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={potentialClient ? "yes" : "no"}
              onChange={(e) => setPotentialClient(e.target.value === "yes")}
            >
              <option value="yes">{T?.labels?.yes || "Yes"}</option>
              <option value="no">{T?.labels?.no || "No"}</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ADDRESS */}
      <div
        role="tabpanel"
        id="panel-address"
        aria-labelledby="tab-address"
        hidden={tab !== "address"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={T?.modal?.fields?.address || "Address"} icon={Building}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.address2 || "Address 2"}
            icon={Building}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
          </Field>
          <Field label={T?.modal?.fields?.city || "City"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Field>
          <Field label={T?.modal?.fields?.postCode || "Post code"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
            />
          </Field>
          <Field label={T?.modal?.fields?.region || "Region"} icon={MapPin}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.countryRegionCode || "Country/Region code"}
            icon={Globe}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={countryRegionCode}
              onChange={(e) =>
                setCountryRegionCode(e.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
      </div>

      {/* CONTACT */}
      <div
        role="tabpanel"
        id="panel-contact"
        aria-labelledby="tab-contact"
        hidden={tab !== "contact"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field
            label={T?.modal?.fields?.phoneNo || "Phone No."}
            icon={PhoneCall}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.phoneNo2 || "Phone No. 2"}
            icon={PhoneCall}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={phoneNo2}
              onChange={(e) => setPhoneNo2(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.email || "Email"}
            icon={Mail}
            error={errors.email}
          >
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.email2 || "Email 2"}
            icon={Mail}
            error={errors.email2}
          >
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
            />
          </Field>
          <Field label={T?.modal?.fields?.homePage || "Home page"} icon={Globe}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={homePage}
              onChange={(e) => setHomePage(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.linkedinUrl || "LinkedIn URL"}
            icon={UserRound}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* EXTRA */}
      <div
        role="tabpanel"
        id="panel-extra"
        aria-labelledby="tab-extra"
        hidden={tab !== "extra"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={T?.modal?.fields?.nip || "Tax ID"} icon={Hash}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.ownerUserId || "Owner (user id)"}
            icon={UserRound}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
            />
          </Field>
          <Field
            label={T?.modal?.fields?.salespersonCode || "Salesperson"}
            icon={UserRound}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={salespersonCode}
              onChange={(e) => setSalespersonCode(e.target.value)}
            />
          </Field>

          <Field
            label={T?.modal?.fields?.priority || "Priority"}
            icon={BadgePercent}
          >
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value || "0", 10))}
            />
          </Field>

          <Field label={T?.modal?.fields?.blocked || "Blocked"} icon={Tag}>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={blocked}
              onChange={(e) => setBlocked(e.target.value)}
            >
              <option value="none">
                {(T?.blockedLabels && T.blockedLabels.none) || "OK"}
              </option>
              <option value="all">
                {(T?.blockedLabels && T.blockedLabels.all) || "ALL"}
              </option>
            </select>
          </Field>

          <Field
            label={T?.modal?.fields?.owzSigned || "OWZ signed"}
            icon={CheckCircle2}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={owzSigned ? "yes" : "no"}
              onChange={(e) => setOwzSigned(e.target.value === "yes")}
            >
              <option value="yes">{T?.labels?.yes || "Yes"}</option>
              <option value="no">{T?.labels?.no || "No"}</option>
            </select>
          </Field>

          {/* NEW: Framework agreement signed */}
          <Field
            label={
              T?.modal?.fields?.umowaRamowaSigned ||
              "Framework agreement signed"
            }
            icon={CheckCircle2}
          >
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={umowaRamowaSigned ? "yes" : "no"}
              onChange={(e) => setUmowaRamowaSigned(e.target.value === "yes")}
            >
              <option value="yes">{T?.labels?.yes || "Yes"}</option>
              <option value="no">{T?.labels?.no || "No"}</option>
            </select>
          </Field>

          <Field
            label={T?.modal?.fields?.tags || "Tags (comma-separated)"}
            icon={Tag}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. lead, priority, expo"
            />
          </Field>
        </div>
      </div>

      {/* PICTURE */}
      <div
        role="tabpanel"
        id="panel-picture"
        aria-labelledby="tab-picture"
        hidden={tab !== "picture"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label={T?.modal?.fields?.picture || "Picture"}
            icon={Image}
            iconInside={false}
            autoHeight
          >
            <PictureDrop
              title={T?.modal?.choosePicture || "Choose picture"}
              replaceTitle={T?.modal?.replacePicture || "Replace picture"}
              help={
                T?.modal?.pictureHelp ||
                "PNG/JPG/WebP • up to ~2 MB • square works best"
              }
              previewSrc={
                !removePicture ? pictureBase64 || existingPicUrl : null
              }
              onPickFile={(file) => onPickPicture(file)}
              canRemove={isEdit && !!existingPicUrl}
              removing={removePicture}
              onToggleRemove={() => setRemovePicture((v) => !v)}
              hasNewSelection={Boolean(pictureBase64)}
              onClearSelection={() => onPickPicture(null)}
            />
          </Field>
        </div>
      </div>

      {/* NOTES */}
      <div
        role="tabpanel"
        id="panel-notes"
        aria-labelledby="tab-notes"
        hidden={tab !== "notes"}
        className="space-y-2"
      >
        <Field label={T?.modal?.fields?.notes || "Notes"} icon={NotebookPen}>
          <textarea
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {T?.modal?.cancel || "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {isEdit
            ? T?.modal?.save || "Save changes"
            : T?.modal?.add || "Create contact"}
        </button>
      </div>
    </form>
  );
}

function PictureDrop({
  title = "Choose picture",
  replaceTitle = "Replace picture",
  help = "PNG/JPG/WebP • up to ~2 MB • square works best",
  previewSrc,
  onPickFile,
  canRemove = false,
  removing = false,
  onToggleRemove,
  hasNewSelection = false,
  onClearSelection,
}) {
  const inputId = React.useId();

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="shrink-0">
          <div className="w-24 h-24 rounded-xl overflow-hidden ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center">
            {previewSrc && !removing ? (
              <img
                src={previewSrc}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                <ImageIcon size={22} />
              </div>
            )}
          </div>

          {canRemove && !hasNewSelection && (
            <button
              type="button"
              onClick={onToggleRemove}
              className="mt-2 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              title={removing ? "Undo remove" : "Remove"}
            >
              {removing ? "Undo remove" : "Remove"}
            </button>
          )}
        </div>

        {/* Drop area */}
        <div className="flex-1">
          <label
            htmlFor={inputId}
            className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 transition p-4 text-center"
          >
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <ImageIcon size={16} className="text-slate-500" />
              {previewSrc && !removing ? replaceTitle : title}
            </div>
            <p className="mt-1 text-xs text-slate-500">{help}</p>
          </label>

          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />

          {hasNewSelection && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {/* i18n if you want */} New file selected
              </span>
              <button
                type="button"
                onClick={onClearSelection}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
