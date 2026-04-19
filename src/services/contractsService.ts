// src/services/contractsService.ts
import { databases, DATABASE_ID } from "../appwrite";
import { ID, Query } from "appwrite";

const CONTRACTS_COLLECTION_ID = "org_contracts";

// Full lifecycle:
// pending_admin  → org submitted, waiting for owner to approve
// pending_payment → owner approved, waiting for org to pay
// paid           → Stripe confirmed, seats active
// cancelled      → cancelled by either party
export type ContractStatus =
  | "pending_admin"
  | "pending_payment"
  | "paid"
  | "suspended"
  | "cancelled";

export interface OrgContract {
  $id: string;
  orgId: string;
  orgName: string;
  status: ContractStatus;
  formData: string;          // JSON.stringify(OrgContractRequestData)
  // Org signature (filled when org submits)
  orgSignerName: string;
  orgSignerTitle: string;
  orgSignature: string;
  orgSignedAt: string;
  // Admin approval (filled when owner approves)
  adminSignerName?: string;
  adminSignerTitle?: string;
  adminApprovedAt?: string;
  // Stripe
  stripeSessionId?: string;
  createdAt: string;
}

// The data the org fills out when submitting their contract request
export interface OrgContractRequestData {
  // Quote
  selectedPlan: string;        // "25" | "50" | "100" | "150"
  selectedPlanPrice: number;
  months: number;              // 1 | 3 | 6 | 12
  totalPrice: number;
  // Org info
  organizationName: string;
  organizationAddress: string;
  billingContactName: string;
  billingEmail: string;
  invoiceEmail: string;
  primaryAdminName: string;
  primaryAdminEmail: string;
  // Terms
  startDate: string;
  effectiveDate: string;
  initialTerm: string;
  autoRenew: boolean;
  billingMethod: string;
  specialNotes: string;
  orgSignedAt?: string;
}

function localDateOnly(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeDateOnly(value?: string): string {
  if (!value) return localDateOnly();
  const trimmed = String(value).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = new Date(trimmed).getTime();
  if (!Number.isFinite(t)) return localDateOnly();
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "UTC" });
}

/* ─── Create contract request (org submits) ────────────────────── */
export const createContractRequest = async (
  orgId: string,
  orgName: string,
  formData: OrgContractRequestData,
  signerName: string,
  signerTitle: string,
  signature: string,
  signerDate?: string
): Promise<OrgContract> => {
  const doc = await databases.createDocument(
    DATABASE_ID,
    CONTRACTS_COLLECTION_ID,
    ID.unique(),
    {
      orgId,
      orgName,
      status: "pending_admin",
      formData: JSON.stringify(formData),
      orgSignerName: signerName,
      orgSignerTitle: signerTitle,
      orgSignature: signature,
      orgSignedAt: normalizeDateOnly(signerDate || formData.orgSignedAt),
      createdAt: new Date().toISOString(),
    }
  );
  return doc as unknown as OrgContract;
};

/* ─── Get contract for a specific org ──────────────────────────── */
export const getContractByOrgId = async (
  orgId: string
): Promise<OrgContract | null> => {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      CONTRACTS_COLLECTION_ID,
      [
        Query.equal("orgId", orgId),
        Query.orderDesc("createdAt"),
        Query.limit(1),
      ]
    );
    if (res.documents.length === 0) return null;
    return res.documents[0] as unknown as OrgContract;
  } catch {
    return null;
  }
};

/* ─── Get all contracts (admin view) ───────────────────────────── */
export const getAllContracts = async (): Promise<OrgContract[]> => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    CONTRACTS_COLLECTION_ID,
    [Query.orderDesc("createdAt"), Query.limit(100)]
  );
  return res.documents as unknown as OrgContract[];
};

/* ─── Owner approves contract ──────────────────────────────────── */
export const approveContract = async (
  contractId: string,
  adminName: string,
  adminTitle: string,
  approvedAt?: string
): Promise<OrgContract> => {
  const finalApprovedAt = normalizeDateOnly(approvedAt);
  const doc = await databases.updateDocument(
    DATABASE_ID,
    CONTRACTS_COLLECTION_ID,
    contractId,
    {
      adminSignerName: adminName,
      adminSignerTitle: adminTitle,
      adminApprovedAt: finalApprovedAt,
      status: "pending_payment",
    }
  );
  return doc as unknown as OrgContract;
};

/* ─── Mark as paid (Stripe webhook) ───────────────────────────── */
export const markContractPaid = async (
  contractId: string,
  stripeSessionId: string
): Promise<OrgContract> => {
  const doc = await databases.updateDocument(
    DATABASE_ID,
    CONTRACTS_COLLECTION_ID,
    contractId,
    { stripeSessionId, status: "paid" }
  );
  return doc as unknown as OrgContract;
};

/* ─── Cancel contract ──────────────────────────────────────────── */
export const cancelContract = async (contractId: string): Promise<void> => {
  await databases.updateDocument(
    DATABASE_ID, CONTRACTS_COLLECTION_ID, contractId,
    { status: "cancelled" }
  );
};

/* ─── Suspend contract (pauses access without terminating) ────── */
export const suspendContract = async (contractId: string): Promise<OrgContract> => {
  const doc = await databases.updateDocument(
    DATABASE_ID, CONTRACTS_COLLECTION_ID, contractId,
    { status: "suspended" }
  );
  return doc as unknown as OrgContract;
};

/* ─── Reactivate a suspended contract back to pending_payment ─── */
export const reactivateContract = async (contractId: string): Promise<OrgContract> => {
  const doc = await databases.updateDocument(
    DATABASE_ID, CONTRACTS_COLLECTION_ID, contractId,
    { status: "pending_payment" }
  );
  return doc as unknown as OrgContract;
};

/* ─── Permanently delete a contract ───────────────────────────── */
export const deleteContract = async (contractId: string): Promise<void> => {
  await databases.deleteDocument(
    DATABASE_ID, CONTRACTS_COLLECTION_ID, contractId
  );
};

/* ─── Parse formData safely ────────────────────────────────────── */
export const parseContractFormData = (
  contract: OrgContract
): Partial<OrgContractRequestData> => {
  try { return JSON.parse(contract.formData); }
  catch { return {}; }
};

/* ─── Status display helpers ───────────────────────────────────── */
export const contractStatusLabel: Record<ContractStatus, string> = {
  pending_admin:   "Pending Owner Approval",
  pending_payment: "Approved — Awaiting Payment",
  paid:            "Active",
  suspended:       "Suspended",
  cancelled:       "Cancelled",
};

export const contractStatusColor: Record<ContractStatus, string> = {
  pending_admin:   "bg-amber-100 text-amber-700",
  pending_payment: "bg-blue-100 text-blue-700",
  paid:            "bg-green-100 text-green-700",
  suspended:       "bg-orange-100 text-orange-700",
  cancelled:       "bg-red-100 text-red-700",
};
