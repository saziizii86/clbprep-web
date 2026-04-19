import React, { useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeft, CheckCircle, FileCheck,
  Loader2, PauseCircle, PlayCircle, RotateCcw, Trash2, X,
} from "lucide-react";
import ContractTemplate from "./ContractTemplate";
import {
  getAllContracts,
  approveContract,
  cancelContract,
  suspendContract,
  reactivateContract,
  deleteContract,
  parseContractFormData,
  contractStatusLabel,
  contractStatusColor,
} from "../services/contractsService";
import type { OrgContract } from "../services/contractsService";
import type { OrgContractRequestData } from "../services/contractsService";

const CLBPREP_NAME              = "Soheila Azizi";
const CLBPREP_COMPANY           = "Azizi Online Learning Services";
const CONTRACT_EMAIL_FUNCTION_ID = "69ae201700398cefccd9";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateOnly(value?: string) {
  if (!value) return "—";
  const trimmed = String(value).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = new Date(trimmed).getTime();
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "UTC" });
}

function localDateOnly() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Button({
  children, className, variant = "default", type, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "danger" | "warning" | "success";
}) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:pointer-events-none disabled:opacity-50 h-10 px-4";
  const variants = {
    default:   "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-lg hover:brightness-[1.03]",
    secondary: "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
    danger:    "bg-red-600 text-white hover:bg-red-700",
    warning:   "bg-orange-500 text-white hover:bg-orange-600",
    success:   "bg-green-600 text-white hover:bg-green-700",
  };
  return (
    <button type={type ?? "button"} className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

function ConfirmModal({
  title, message, confirmLabel, confirmVariant = "danger", onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  confirmVariant?: "danger" | "warning";
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export default function OrgContractPage({ onBack }: { onBack: () => void }) {
  const [contracts, setContracts]     = useState<OrgContract[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<OrgContract | null>(null);
  const [adminAgreed, setAdminAgreed] = useState(false);
  const [approvalPreviewDate, setApprovalPreviewDate] = useState("");
  const [approving, setApproving]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveErr, setApproveErr]   = useState("");

  // Confirm modal state
  const [confirm, setConfirm] = useState<{
    title: string; message: string; confirmLabel: string;
    confirmVariant?: "danger" | "warning";
    onConfirm: () => void;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const docs = await getAllContracts();
      setContracts(docs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendEmail = async (to: string, name: string, subject: string, body: string) => {
    try {
      const { functions } = await import("../appwrite");
      await functions.createExecution(
        CONTRACT_EMAIL_FUNCTION_ID,
        JSON.stringify({ to, name, email: "support@clbprep.com", feedbackType: subject, message: body, attachments: "None" }),
        false
      );
    } catch (e) { console.warn("Email failed:", e); }
  };

  const handleApprove = async () => {
    if (!selected || !adminAgreed) return;
    setApproving(true);
    setApproveErr("");
    try {
      const approvedAt = approvalPreviewDate || localDateOnly();

      await approveContract(
        selected.$id,
        CLBPREP_NAME,
        "Owner",
        approvedAt
      );

      const fd = parseContractFormData(selected);
      await sendEmail(
        fd.primaryAdminEmail || "",
        fd.primaryAdminName || selected.orgName,
        `CLBPrep Contract Approved — ${selected.orgName}`,
        [
          `Hello ${fd.primaryAdminName || selected.orgName},`,
          ``,
          `Your CLBPrep contract has been approved! Please log into your partner panel, go to the Contract section, and click "Proceed to Payment" to activate your ${fd.selectedPlan} seats.`,
          ``,
          `Best regards,\n${CLBPREP_NAME}\nsupport@clbprep.com`,
        ].join("\n")
      );
      await load();
      setSelected(null);
      setAdminAgreed(false);
      setApprovalPreviewDate("");
    } catch (e: any) {
      setApproveErr(e?.message || "Failed to approve.");
    } finally {
      setApproving(false);
    }
  };

  const doCancel = async (contract: OrgContract) => {
    setActionLoading(true);
    try {
      await cancelContract(contract.$id);
      const fd = parseContractFormData(contract);
      await sendEmail(
        fd.primaryAdminEmail || "",
        fd.primaryAdminName || contract.orgName,
        `CLBPrep Contract Cancelled — ${contract.orgName}`,
        `Hello ${fd.primaryAdminName || contract.orgName},\n\nYour CLBPrep contract has been cancelled.\n\nIf you believe this is an error, please contact support@clbprep.com.\n\nBest regards,\n${CLBPREP_NAME}`
      );
      await load();
      if (selected?.$id === contract.$id) { setSelected(null); setAdminAgreed(false); setApprovalPreviewDate(""); }
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const doSuspend = async (contract: OrgContract) => {
    setActionLoading(true);
    try {
      await suspendContract(contract.$id);
      const fd = parseContractFormData(contract);
      await sendEmail(
        fd.primaryAdminEmail || "",
        fd.primaryAdminName || contract.orgName,
        `CLBPrep Contract Suspended — ${contract.orgName}`,
        `Hello ${fd.primaryAdminName || contract.orgName},\n\nYour CLBPrep contract has been temporarily suspended.\n\nPlease contact support@clbprep.com to resolve any outstanding issues.\n\nBest regards,\n${CLBPREP_NAME}`
      );
      await load();
      if (selected?.$id === contract.$id) setSelected(prev => prev ? { ...prev, status: "suspended" } : null);
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const doReactivate = async (contract: OrgContract) => {
    setActionLoading(true);
    try {
      await reactivateContract(contract.$id);
      const fd = parseContractFormData(contract);
      await sendEmail(
        fd.primaryAdminEmail || "",
        fd.primaryAdminName || contract.orgName,
        `CLBPrep Contract Reactivated — ${contract.orgName}`,
        `Hello ${fd.primaryAdminName || contract.orgName},\n\nYour CLBPrep contract has been reactivated. Please log into your partner panel and proceed to payment to re-enable your seats.\n\nBest regards,\n${CLBPREP_NAME}`
      );
      await load();
      if (selected?.$id === contract.$id) setSelected(prev => prev ? { ...prev, status: "pending_payment" } : null);
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const doDelete = async (contract: OrgContract) => {
    setActionLoading(true);
    try {
      await deleteContract(contract.$id);
      await load();
      if (selected?.$id === contract.$id) { setSelected(null); setAdminAgreed(false); setApprovalPreviewDate(""); }
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const pendingCount = contracts.filter(c => c.status === "pending_admin").length;

  // Context-aware action buttons for a given contract
  const ActionButtons = ({ contract, size = "normal" }: { contract: OrgContract; size?: "normal" | "small" }) => {
    const s = size === "small";
    const cls = s ? "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition" : "";

    return (
      <div className={cn("flex flex-wrap items-center gap-2", s ? "gap-1.5" : "gap-2")} onClick={e => e.stopPropagation()}>
        {/* Pending admin: Decline */}
        {contract.status === "pending_admin" && (
          <button className={cn(cls, s ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "")}
            onClick={() => setConfirm({
              title: "Decline Contract",
              message: `Decline and cancel this contract request from ${contract.orgName}? They will be notified by email.`,
              confirmLabel: "Decline", confirmVariant: "danger",
              onConfirm: () => doCancel(contract),
            })}
          >
            {!s && <X className="h-3.5 w-3.5" />} Decline
          </button>
        )}

        {/* Pending payment or paid: Suspend */}
        {(contract.status === "pending_payment" || contract.status === "paid") && (
          <button className={cn(cls, s ? "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100" : "")}
            onClick={() => setConfirm({
              title: "Suspend Contract",
              message: `Temporarily suspend ${contract.orgName}'s contract? Their access will be paused. You can reactivate it later.`,
              confirmLabel: "Suspend", confirmVariant: "warning",
              onConfirm: () => doSuspend(contract),
            })}
          >
            {!s && <PauseCircle className="h-3.5 w-3.5" />} Suspend
          </button>
        )}

        {/* Suspended: Reactivate */}
        {contract.status === "suspended" && (
          <button className={cn(cls, s ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" : "")}
            onClick={() => setConfirm({
              title: "Reactivate Contract",
              message: `Reactivate ${contract.orgName}'s contract? They will be notified to proceed with payment.`,
              confirmLabel: "Reactivate", confirmVariant: "warning",
              onConfirm: () => doReactivate(contract),
            })}
          >
            {!s && <PlayCircle className="h-3.5 w-3.5" />} Reactivate
          </button>
        )}

        {/* All non-paid, non-cancelled: Cancel */}
        {contract.status !== "paid" && contract.status !== "cancelled" && contract.status !== "pending_admin" && (
          <button className={cn(cls, s ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "")}
            onClick={() => setConfirm({
              title: "Cancel Contract",
              message: `Cancel ${contract.orgName}'s contract? This will end the agreement. They will be notified.`,
              confirmLabel: "Cancel Contract", confirmVariant: "danger",
              onConfirm: () => doCancel(contract),
            })}
          >
            {!s && <X className="h-3.5 w-3.5" />} Cancel
          </button>
        )}

        {/* Cancelled: Delete */}
        {contract.status === "cancelled" && (
          <button className={cn(cls, s ? "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : "")}
            onClick={() => setConfirm({
              title: "Delete Contract",
              message: `Permanently delete this contract record for ${contract.orgName}? This cannot be undone.`,
              confirmLabel: "Delete Permanently", confirmVariant: "danger",
              onConfirm: () => doDelete(contract),
            })}
          >
            {!s && <Trash2 className="h-3.5 w-3.5" />} Delete
          </button>
        )}
      </div>
    );
  };

  /* ── Detail view ── */
  if (selected) {
    const fd = parseContractFormData(selected) as Partial<OrgContractRequestData>;
    const current = contracts.find(c => c.$id === selected.$id) || selected;
    const isApprovable = current.status === "pending_admin";

    const templateData = {
      organizationName: fd.organizationName || selected.orgName,
      organizationAddress: fd.organizationAddress || "",
      billingContactName: fd.billingContactName || "",
      billingEmail: fd.billingEmail || "",
      invoiceEmail: fd.invoiceEmail || "",
      primaryAdminName: fd.primaryAdminName || "",
      primaryAdminEmail: fd.primaryAdminEmail || "",
      selectedPlan: fd.selectedPlan || "25",
      selectedPlanPrice: fd.selectedPlanPrice || 179,
      startDate: fd.startDate || "",
      effectiveDate: fd.effectiveDate || "",
      initialTerm: fd.initialTerm || "Monthly",
      autoRenew: fd.autoRenew || false,
      billingMethod: fd.billingMethod || "",
      clbprepSignerName: CLBPREP_NAME,
      clbprepSignerTitle: "Owner",
      specialNotes: fd.specialNotes || "",
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <FileCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold">{selected.orgName}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  Submitted {new Date(selected.createdAt).toLocaleDateString("en-CA")}
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", contractStatusColor[current.status])}>
                    {contractStatusLabel[current.status]}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="secondary" onClick={() => { setSelected(null); setAdminAgreed(false); setApprovalPreviewDate(""); setApproveErr(""); }}>
              <ArrowLeft className="h-4 w-4" /> Back to list
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {/* Suspended banner */}
          {current.status === "suspended" && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-800 font-medium">
              <PauseCircle className="w-5 h-5 shrink-0" />
              This contract is suspended. Reactivate it to restore payment access.
              <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                onClick={() => setConfirm({
                  title: "Reactivate Contract",
                  message: `Reactivate ${selected.orgName}'s contract?`,
                  confirmLabel: "Reactivate", confirmVariant: "warning",
                  onConfirm: () => doReactivate(selected),
                })}
              >
                <PlayCircle className="h-3.5 w-3.5" /> Reactivate
              </button>
            </div>
          )}

          {/* Quick info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Organization", fd.organizationName || selected.orgName],
              ["Plan", `${fd.selectedPlan} seats — CAD $${fd.selectedPlanPrice}/mo`],
              ["Term", `${fd.months} month${(fd.months||1) > 1 ? "s" : ""} · ${fd.initialTerm}`],
              ["Start", fd.startDate || "—"],
            ].map(([label, val]) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
                <div className="text-sm font-bold text-slate-800">{val}</div>
              </div>
            ))}
          </div>

          {/* Org signature */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Signed by Org</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-slate-400 mb-0.5">Name</div><div className="font-semibold">{selected.orgSignerName}</div></div>
              <div><div className="text-xs text-slate-400 mb-0.5">Title</div><div className="font-semibold">{selected.orgSignerTitle}</div></div>
              <div><div className="text-xs text-slate-400 mb-0.5">Signature</div><div className="font-semibold italic font-serif">{selected.orgSignature}</div></div>
              <div><div className="text-xs text-slate-400 mb-0.5">Signed</div><div className="font-semibold">{formatDateOnly(selected.orgSignedAt)}</div></div>
            </div>
          </div>

          {/* Full contract */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-800">Full Service Agreement</div>
              <div className="text-xs text-slate-400 mt-0.5">Submitted by {selected.orgName} · {new Date(selected.createdAt).toLocaleDateString("en-CA")}</div>
            </div>
            <div className="p-6 max-h-[560px] overflow-y-auto border-b border-slate-100">
              <ContractTemplate
                data={templateData}
                orgSignerName={selected.orgSignerName}
                orgSignerTitle={selected.orgSignerTitle}
                orgSignature={selected.orgSignature}
                orgSignedAt={selected.orgSignedAt}
                adminSignerName={current.adminSignerName || CLBPREP_NAME}
                adminSignerTitle={current.adminSignerTitle || "Owner"}
                adminApprovedAt={current.adminApprovedAt || approvalPreviewDate}
                mode="signed"
              />
            </div>

            {/* Approve section */}
            {isApprovable && (
              <div className="p-5 space-y-4">
                <label className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all",
                  adminAgreed ? "border-green-400 bg-green-50" : "border-slate-200 bg-white hover:border-slate-300"
                )}>
                  <input
                    type="checkbox"
                    checked={adminAgreed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAdminAgreed(checked);
                      setApprovalPreviewDate(checked ? localDateOnly() : "");
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      I, {CLBPREP_NAME} of {CLBPREP_COMPANY}, have reviewed this contract and approve its terms.
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Approving notifies the org and sets status to "Awaiting Payment".
                    </div>
                    {adminAgreed && approvalPreviewDate && (
                      <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                        Approval date: {formatDateOnly(approvalPreviewDate)}
                      </div>
                    )}
                  </div>
                </label>

                {approveErr && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {approveErr}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="danger"
                    onClick={() => setConfirm({
                      title: "Decline Contract",
                      message: `Decline this contract request from ${selected.orgName}? They will be notified.`,
                      confirmLabel: "Decline", confirmVariant: "danger",
                      onConfirm: () => doCancel(selected),
                    })}
                  >
                    <X className="h-4 w-4" /> Decline
                  </Button>
                  <Button onClick={handleApprove} disabled={!adminAgreed || approving}>
                    {approving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
                      : <><CheckCircle className="h-4 w-4" /> Approve & Notify Org</>
                    }
                  </Button>
                </div>
              </div>
            )}

            {/* Status-based action bar for non-pending contracts */}
            {!isApprovable && (
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">
                    {current.status === "pending_payment" && `Approved by ${selected.adminSignerName || CLBPREP_NAME} · waiting for payment`}
                    {current.status === "paid" && "Contract active · payment confirmed"}
                    {current.status === "suspended" && "Contract is suspended"}
                    {current.status === "cancelled" && "Contract was cancelled"}
                  </div>
                  <ActionButtons contract={current} />
                </div>
              </div>
            )}
          </div>
        </main>

        {confirm && (
          <ConfirmModal
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            confirmVariant={confirm.confirmVariant}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold">Contracts</div>
              <div className="text-xs text-slate-400">
                {pendingCount > 0 ? `${pendingCount} pending approval` : "All caught up"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={load}>
              <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contract Requests</h2>
          <p className="text-sm text-slate-500 mt-1">Review, approve, suspend, or cancel org partner contracts.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading contracts…</p>
          </div>
        )}

        {!loading && contracts.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No contract requests yet</p>
            <p className="text-slate-400 text-sm mt-1">When an org submits a contract request it will appear here.</p>
          </div>
        )}

        {!loading && contracts.length > 0 && (
          <div className="grid gap-3">
            {contracts.map(contract => {
              const fd = parseContractFormData(contract);
              return (
                <div key={contract.$id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                    {/* Org info — clickable to open detail */}
                    <div className="flex items-start gap-4 cursor-pointer flex-1 min-w-0"
                      onClick={() => { setSelected(contract); setAdminAgreed(false); setApproveErr(""); }}
                    >
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {(contract.orgName || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{contract.orgName}</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {fd.selectedPlan} seats · CAD ${fd.selectedPlanPrice}/mo · {fd.months} month{(fd.months||1) > 1 ? "s" : ""}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", contractStatusColor[contract.status])}>
                            {contractStatusLabel[contract.status]}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(contract.createdAt).toLocaleDateString("en-CA")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Open / Review button */}
                      {contract.status === "pending_admin" && (
                        <button
                          onClick={() => { setSelected(contract); setAdminAgreed(false); setApproveErr(""); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 hover:bg-amber-100"
                        >
                          Review →
                        </button>
                      )}
                      {contract.status === "paid" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                          <CheckCircle className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                      {contract.status === "pending_payment" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                          <CheckCircle className="h-3.5 w-3.5" /> Approved
                        </span>
                      )}
                      {contract.status === "suspended" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                          <PauseCircle className="h-3.5 w-3.5" /> Suspended
                        </span>
                      )}

                      {/* Inline quick actions */}
                      <ActionButtons contract={contract} size="small" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmVariant={confirm.confirmVariant}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
