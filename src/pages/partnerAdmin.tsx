// src/pages/partnerAdmin.tsx
// Partner Portal — for YMCA, libraries, settlement agencies, etc.
// Role: partner_admin in users collection
// partnerName field on their user doc identifies which partner they manage

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Query, ID } from "appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
} from "../appwrite";
import {
  Users, LogOut, Plus, Search, CheckCircle, XCircle,
  Clock, AlertCircle, Upload, Download, ChevronDown,
  LayoutDashboard, RefreshCw, Trash2, Mail, X, Building2,
  UserCheck, UserX, Timer, FileText
} from "lucide-react";

// ── Appwrite collection IDs (add these in Appwrite console) ──────────────────
const PARTNER_ELIGIBILITY_COLLECTION_ID =
  import.meta.env.VITE_PARTNER_ELIGIBILITY_COLLECTION_ID || "partner_eligibility";
const PARTNER_RENEWAL_REQUESTS_COLLECTION_ID =
  import.meta.env.VITE_PARTNER_RENEWAL_REQUESTS_COLLECTION_ID || "partner_renewal_requests";
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "eligible" | "requests";

interface EligibilityDoc {
  $id: string;
  partnerName: string;
  email: string;
  status: "approved" | "claimed" | "inactive";
  durationDays: number;
  claimedByUserId?: string;
  claimedAt?: string;
  endAt?: string;
  renewalCount: number;
  updatedAt: string;
}

interface RenewalRequest {
  $id: string;
  partnerName: string;
  email: string;
  userId: string;
  userName?: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  processedAt?: string;
  processedBy?: string;
  denyNote?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const normalizeEmail = (e: string) => e.trim().toLowerCase();

const calcNewEndAt = (currentEndAt?: string): string => {
  const base = currentEndAt ? new Date(currentEndAt) : new Date();
  const now = new Date();
  const from = base > now ? base : now;
  from.setDate(from.getDate() + 90);
  return from.toISOString();
};

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
  });
};
// ─────────────────────────────────────────────────────────────────────────────

export default function PartnerAdmin() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [partnerName, setPartnerName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [authErr, setAuthErr] = useState("");

  // data
  const [eligible, setEligible] = useState<EligibilityDoc[]>([]);
  const [requests, setRequests] = useState<RenewalRequest[]>([]);

  // eligible tab UI
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addBulk, setAddBulk] = useState("");
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // requests tab UI
  const [denyNote, setDenyNote] = useState("");
  const [denyTarget, setDenyTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const me = await account.get();
        // look up their user doc
        const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal("email", me.email.toLowerCase()),
        ]);
        if (!res.documents.length) throw new Error("User record not found");
        const doc = res.documents[0] as any;
        if (doc.role !== "partner_admin") throw new Error("Not a partner admin");
        if (!doc.partnerName) throw new Error("No partnerName assigned");
        setPartnerName(doc.partnerName);
        setAdminName(doc.name || me.name || "Admin");
        setLoading(false);
      } catch (e: any) {
        setAuthErr(e.message || "Unauthorized");
        setLoading(false);
      }
    })();
  }, []);

  // ── load data once partnerName is known ────────────────────────────────────
  useEffect(() => {
    if (!partnerName) return;
    loadEligible();
    loadRequests();
  }, [partnerName]);

  const loadEligible = async () => {
    const res = await databases.listDocuments(
      DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID,
      [Query.equal("partnerName", partnerName), Query.limit(500)]
    );
    setEligible(res.documents as any);
  };

  const loadRequests = async () => {
    const res = await databases.listDocuments(
      DATABASE_ID, PARTNER_RENEWAL_REQUESTS_COLLECTION_ID,
      [Query.equal("partnerName", partnerName), Query.orderDesc("requestedAt"), Query.limit(200)]
    );
    setRequests(res.documents as any);
  };

  // ── toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await account.deleteSession("current").catch(() => {});
    nav("/");
  };

  // ── add eligible email(s) ──────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddError("");
    setAddLoading(true);
    try {
      const emails =
        addMode === "single"
          ? [normalizeEmail(addEmail)].filter(Boolean)
          : addBulk
              .split(/[\n,;]+/)
              .map(normalizeEmail)
              .filter(Boolean);

      if (!emails.length) { setAddError("No valid emails."); setAddLoading(false); return; }

      let added = 0;
      for (const email of emails) {
        // skip duplicates
        const existing = eligible.find(e => e.email === email && e.status !== "inactive");
        if (existing) continue;
        // reactivate if previously inactive
        const inactive = eligible.find(e => e.email === email && e.status === "inactive");
if (inactive) {
          // check if user already registered
          const userRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal("email", email),
          ]);
          const existingUser = userRes.documents[0] as any;
          const now = new Date();
          const endAt = new Date(now);
          endAt.setDate(endAt.getDate() + 90);
          const endAtISO = endAt.toISOString();

          if (existingUser) {
            // user exists — reactivate as claimed and restore subscription
            await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, inactive.$id, {
              status: "claimed",
              claimedByUserId: existingUser.$id,
              claimedAt: now.toISOString(),
              endAt: endAtISO,
              updatedAt: now.toISOString(),
            });
            await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, existingUser.$id, {
              subscriptionStatus: "active",
              subscriptionPlan: "partner",
              subscriptionSource: "partner",
              proUntil: endAtISO,
              partnerName,
            });
          } else {
            // user not registered — just reactivate as approved
            await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, inactive.$id, {
              status: "approved",
              updatedAt: new Date().toISOString(),
            });
          }
} else {
          // check if user already exists in Users collection
          const userRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal("email", email),
          ]);
          const existingUser = userRes.documents[0] as any;

          const now = new Date();
          const endAt = new Date(now);
          endAt.setDate(endAt.getDate() + 90);
          const endAtISO = endAt.toISOString();

          if (existingUser) {
            // user already registered — create as claimed and activate immediately
            const docId = ID.unique();
            await databases.createDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, docId, {
              partnerName,
              email,
              status: "claimed",
              durationDays: 90,
              claimedByUserId: existingUser.$id,
              claimedAt: now.toISOString(),
              endAt: endAtISO,
              renewalCount: 0,
              updatedAt: now.toISOString(),
            });
            // activate their subscription
await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, existingUser.$id, {
              subscriptionStatus: "active",
              subscriptionPlan: "partner",
              subscriptionSource: "partner",
              proUntil: endAtISO,
              partnerName,
            });
          } else {
            // user not registered yet — create as approved
            await databases.createDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, ID.unique(), {
              partnerName,
              email,
              status: "approved",
              durationDays: 90,
              renewalCount: 0,
              updatedAt: now.toISOString(),
            });
          }
        }
        added++;
      }
      await loadEligible();
      setShowAddModal(false);
      setAddEmail(""); setAddBulk("");
      showToast(`${added} email(s) added.`);
    } catch (e: any) {
      setAddError(e.message || "Failed");
    }
    setAddLoading(false);
  };

  // ── deactivate ─────────────────────────────────────────────────────────────
const handleDeactivate = async (doc: EligibilityDoc) => {
    if (!confirm(`Deactivate ${doc.email}? Their access will be removed immediately.`)) return;
    await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, doc.$id, {
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });
    // also revoke the user's Pro access immediately
    if (doc.claimedByUserId) {
      try {
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, doc.claimedByUserId, {
          subscriptionStatus: "inactive",
          subscriptionPlan: "basic",
          subscriptionSource: null,
          proUntil: null,
        });
      } catch {}
    }
    await loadEligible();
    showToast(`${doc.email} deactivated and access removed.`);
  };
  
  const handleRemove = async (doc: EligibilityDoc) => {
    if (!confirm(`Permanently remove ${doc.email} from the ${partnerName} list? This cannot be undone.`)) return;
    await databases.deleteDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, doc.$id);
    // also revoke access if they were claimed
    if (doc.claimedByUserId) {
      try {
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, doc.claimedByUserId, {
          subscriptionStatus: "inactive",
          subscriptionPlan: "basic",
          subscriptionSource: null,
          proUntil: null,
        });
      } catch {}
    }
    await loadEligible();
    showToast(`${doc.email} removed from list.`);
  };

  // ── extend directly from eligible list ────────────────────────────────────
const handleExtend = async (doc: EligibilityDoc) => {
    const newEndAt = calcNewEndAt(doc.endAt);

    // if reactivating, check if user exists in db
    let resolvedStatus = doc.status === "inactive" ? "approved" : doc.status;
    let resolvedClaimedByUserId = doc.claimedByUserId;

    if (doc.status === "inactive") {
      const userRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", doc.email),
      ]);
      const existingUser = userRes.documents[0] as any;
      if (existingUser) {
        resolvedStatus = "claimed";
        resolvedClaimedByUserId = existingUser.$id;
        // activate subscription
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, existingUser.$id, {
          subscriptionStatus: "active",
          subscriptionPlan: "partner",
          subscriptionSource: "partner",
          proUntil: newEndAt,
          partnerName,
        });
      }
    }

    await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, doc.$id, {
      endAt: newEndAt,
      renewalCount: (doc.renewalCount || 0) + 1,
      status: resolvedStatus,
      claimedByUserId: resolvedClaimedByUserId || null,
      claimedAt: resolvedStatus === "claimed" && !doc.claimedByUserId ? new Date().toISOString() : doc.claimedAt,
      updatedAt: new Date().toISOString(),
    });

    // also update the user's proUntil if already claimed before
    if (resolvedStatus !== "inactive" && doc.claimedByUserId && doc.status !== "inactive") {
      try {
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, doc.claimedByUserId, {
          subscriptionStatus: "active",
          subscriptionPlan: "partner",
          proUntil: newEndAt,
          subscriptionSource: "partner",
          partnerName,
        });
      } catch {}
    }

    await loadEligible();
    showToast(`Extended to ${fmtDate(newEndAt)}`);
  };

  // ── approve renewal request ────────────────────────────────────────────────
  const handleApprove = async (req: RenewalRequest) => {
    setActionLoading(req.$id);
    try {
      // find eligibility record
      const eligRes = await databases.listDocuments(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, [
        Query.equal("partnerName", partnerName),
        Query.equal("email", req.email),
      ]);
      const eligDoc = eligRes.documents[0] as any;
      if (!eligDoc) throw new Error("Eligibility record not found. Add this email first.");

      const newEndAt = calcNewEndAt(eligDoc.endAt);

      // update eligibility
      await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, eligDoc.$id, {
        endAt: newEndAt,
        renewalCount: (eligDoc.renewalCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });

      // update user subscription
      await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, req.userId, {
        subscriptionStatus: "active",
        subscriptionPlan: "partner",
        proUntil: newEndAt,
        subscriptionSource: "partner",
      });

      // mark request approved
      await databases.updateDocument(DATABASE_ID, PARTNER_RENEWAL_REQUESTS_COLLECTION_ID, req.$id, {
        status: "approved",
        processedAt: new Date().toISOString(),
        processedBy: adminName,
      });

      await loadRequests();
      await loadEligible();
      showToast(`Approved — extended to ${fmtDate(newEndAt)}`);
    } catch (e: any) {
      showToast(e.message || "Failed to approve", "err");
    }
    setActionLoading(null);
  };

  // ── deny renewal request ───────────────────────────────────────────────────
  const handleDeny = async (req: RenewalRequest) => {
    setActionLoading(req.$id);
    try {
      await databases.updateDocument(DATABASE_ID, PARTNER_RENEWAL_REQUESTS_COLLECTION_ID, req.$id, {
        status: "denied",
        processedAt: new Date().toISOString(),
        processedBy: adminName,
        denyNote: denyNote || "",
      });
      await loadRequests();
      setDenyTarget(null);
      setDenyNote("");
      showToast("Request denied.");
    } catch (e: any) {
      showToast(e.message || "Failed", "err");
    }
    setActionLoading(null);
  };

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const emails = text.split(/[\n,;]+/).map(normalizeEmail).filter(e => e.includes("@"));
      setAddBulk(emails.join("\n"));
      setAddMode("bulk");
      setShowAddModal(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const stats = {
    total: eligible.filter(e => e.status !== "inactive").length,
    active: eligible.filter(e => e.status === "claimed" && (!e.endAt || daysUntil(e.endAt)! > 14)).length,
    expiringSoon: eligible.filter(e => {
      const d = daysUntil(e.endAt);
      return e.status === "claimed" && d !== null && d >= 0 && d <= 14;
    }).length,
    expired: eligible.filter(e => {
      const d = daysUntil(e.endAt);
      return e.status === "claimed" && d !== null && d < 0;
    }).length,
    pending: requests.filter(r => r.status === "pending").length,
    notRegistered: eligible.filter(e => e.status === "approved").length,
  };

  // ── filtered eligible list ─────────────────────────────────────────────────
  const filteredEligible = eligible.filter(e => {
    const matchSearch = !search || e.email.includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "approved") return e.status === "approved";
    if (statusFilter === "active") return e.status === "claimed" && (daysUntil(e.endAt) ?? 999) > 14;
    if (statusFilter === "expiring") {
      const d = daysUntil(e.endAt);
      return e.status === "claimed" && d !== null && d >= 0 && d <= 14;
    }
    if (statusFilter === "expired") return e.status === "claimed" && (daysUntil(e.endAt) ?? 999) < 0;
    if (statusFilter === "inactive") return e.status === "inactive";
    return true;
  });

  // ── status badge ───────────────────────────────────────────────────────────
  const StatusBadge = ({ doc }: { doc: EligibilityDoc }) => {
    if (doc.status === "inactive")
      return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Inactive</span>;
    if (doc.status === "approved")
      return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Not registered</span>;
    const d = daysUntil(doc.endAt);
    if (d === null)
      return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Claimed</span>;
    if (d < 0)
      return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Expired</span>;
    if (d <= 14)
      return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Expiring in {d}d</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active — {d}d left</span>;
  };

  // ── loading / auth error states ────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (authErr) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <p className="text-gray-700 font-medium">{authErr}</p>
        <button onClick={() => nav("/")} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
          Back to login
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">Partner Portal</span>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {partnerName}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {(
            [
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "eligible",  label: "Eligible users", icon: Users },
              { id: "requests",  label: "Renewal requests", icon: RefreshCw, badge: stats.pending },
            ] as const
          ).map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge ? (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <div className="text-xs text-gray-500 px-3 py-1 mb-1 truncate">{adminName}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto p-6">

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{partnerName} Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Manage sponsored access for your participants</p>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Total approved", value: stats.total, color: "blue", icon: Users },
                { label: "Active", value: stats.active, color: "green", icon: UserCheck },
                { label: "Expiring ≤14 days", value: stats.expiringSoon, color: "amber", icon: Timer },
                { label: "Expired", value: stats.expired, color: "red", icon: UserX },
                { label: "Not registered yet", value: stats.notRegistered, color: "purple", icon: Mail },
                { label: "Pending renewals", value: stats.pending, color: "orange", icon: Clock },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className={`bg-white rounded-xl p-4 border border-${color}-100`}>
                  <div className={`w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* quick actions */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setShowAddModal(true); setAddMode("single"); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add email
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" /> Import CSV
                </button>
                <button
                  onClick={() => setTab("requests")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border ${
                    stats.pending ? "border-red-300 text-red-600 bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  {stats.pending ? `${stats.pending} pending renewal${stats.pending > 1 ? "s" : ""}` : "Renewal requests"}
                </button>
              </div>
            </div>

            {/* expiring soon quick list */}
            {stats.expiringSoon > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Expiring soon
                </h2>
                <div className="space-y-2">
                  {eligible
                    .filter(e => { const d = daysUntil(e.endAt); return e.status === "claimed" && d !== null && d >= 0 && d <= 14; })
                    .map(e => (
                      <div key={e.$id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-amber-100">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.email}</p>
                          <p className="text-xs text-amber-700">Expires {fmtDate(e.endAt)} ({daysUntil(e.endAt)}d)</p>
                        </div>
                        <button
                          onClick={() => handleExtend(e)}
                          className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                        >
                          Extend +90d
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ELIGIBLE USERS TAB ── */}
        {tab === "eligible" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Eligible users</h1>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => { setShowAddModal(true); setAddMode("single"); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add email
                </button>
              </div>
            </div>

            {/* filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search email..."
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="approved">Not registered</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring soon</option>
                <option value="expired">Expired</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Expires</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Renewals</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEligible.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No records found</td></tr>
                  )}
                  {filteredEligible.map(doc => (
                    <tr key={doc.$id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{doc.email}</td>
                      <td className="px-4 py-3"><StatusBadge doc={doc} /></td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(doc.endAt)}</td>
                      <td className="px-4 py-3 text-gray-500">{doc.renewalCount || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {doc.status !== "inactive" && (
                            <button
                              onClick={() => handleExtend(doc)}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                              +90d
                            </button>
                          )}
{doc.status !== "inactive" && (
                            <button
                              onClick={() => handleDeactivate(doc)}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Deactivate
                            </button>
                          )}
                          {doc.status === "inactive" && (
                            <button
                              onClick={() => handleExtend(doc)}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(doc)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              Showing {filteredEligible.length} of {eligible.length} records
            </p>
          </div>
        )}

        {/* ── RENEWAL REQUESTS TAB ── */}
        {tab === "requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Renewal requests</h1>
              <button onClick={loadRequests} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* pending */}
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Pending ({requests.filter(r => r.status === "pending").length})
              </h2>
              {requests.filter(r => r.status === "pending").length === 0 && (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  No pending requests
                </div>
              )}
              {requests.filter(r => r.status === "pending").map(req => {
                const eligDoc = eligible.find(e => e.email === req.email);
                const isEligible = eligDoc && eligDoc.status !== "inactive";
                return (
                  <div key={req.$id} className={`bg-white rounded-xl border p-4 ${isEligible ? "" : "border-red-200"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{req.email}</p>
                        {req.userName && <p className="text-sm text-gray-500">{req.userName}</p>}
                        <p className="text-xs text-gray-400">Requested {fmtDate(req.requestedAt)}</p>
                        {eligDoc && (
                          <p className="text-xs text-gray-500">
                            Current expiry: {fmtDate(eligDoc.endAt)}
                            {eligDoc.endAt && ` (${daysUntil(eligDoc.endAt)}d)`}
                          </p>
                        )}
                        {!isEligible && (
                          <p className="text-xs text-red-600 font-medium">
                            Not on eligible list — add email first before approving
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {denyTarget === req.$id ? (
                          <div className="flex flex-col gap-2 items-end">
                            <input
                              value={denyNote}
                              onChange={e => setDenyNote(e.target.value)}
                              placeholder="Reason (optional)"
                              className="border rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-red-200"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setDenyTarget(null); setDenyNote(""); }}
                                className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeny(req)}
                                disabled={actionLoading === req.$id}
                                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm deny
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setDenyTarget(req.$id)}
                              disabled={actionLoading === req.$id}
                              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" /> Deny
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={actionLoading === req.$id || !isEligible}
                              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === req.$id
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <CheckCircle className="w-4 h-4" />}
                              Approve +90d
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* history */}
            {requests.filter(r => r.status !== "pending").length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">History</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Requested</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Decision</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Processed</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {requests.filter(r => r.status !== "pending").map(req => (
                        <tr key={req.$id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{req.email}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(req.requestedAt)}</td>
                          <td className="px-4 py-3">
                            {req.status === "approved"
                              ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Denied</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(req.processedAt)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{req.denyNote || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Add email modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-900">Add eligible email(s)</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(""); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAddMode("single")}
                  className={`flex-1 py-2 rounded-lg text-sm border ${addMode === "single" ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50"}`}
                >
                  Single
                </button>
                <button
                  onClick={() => setAddMode("bulk")}
                  className={`flex-1 py-2 rounded-lg text-sm border ${addMode === "bulk" ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50"}`}
                >
                  Bulk paste
                </button>
              </div>
              {addMode === "single" ? (
                <input
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="participant@email.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              ) : (
                <textarea
                  value={addBulk}
                  onChange={e => setAddBulk(e.target.value)}
                  placeholder={"Paste emails, one per line (or comma-separated):\nuser1@example.com\nuser2@example.com"}
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              )}
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <p className="text-xs text-gray-400">
                90 days access granted automatically when participants register with matching email.
              </p>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {addLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {addLoading ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden CSV input ── */}
      <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
