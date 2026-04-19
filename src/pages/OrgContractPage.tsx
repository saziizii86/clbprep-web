import React, { useMemo } from 'react';

type ContractStatus =
  | 'active'
  | 'scheduled'
  | 'pending_payment'
  | 'expired'
  | 'draft'
  | 'cancelled';

export interface ContractRecord {
  id: string;
  seats: number;
  amountCad: number;
  title?: string;
  termLabel?: string;
  submittedAt?: string;
  approvedBy?: string;
  signedBy?: string;
  contractStartDate?: string;
  effectiveDate?: string;
  expiresAt?: string;
  carryoverDays?: number;
  pdfUrl?: string;
  downloadUrl?: string;
  status: ContractStatus;
}

interface OrgPartnerContractPageProps {
  organizationName: string;
  contracts: ContractRecord[];
  onRefresh?: () => void;
  onRequestNewContract?: () => void;
  onViewContract?: (contract: ContractRecord) => void;
  onDownloadContract?: (contract: ContractRecord) => void;
}

function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function daysRemaining(endDate?: string): number | null {
  if (!endDate) return null;

  const today = new Date();
  const end = new Date(endDate);

  if (Number.isNaN(end.getTime())) return null;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = endStart.getTime() - todayStart.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function currency(amountCad: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amountCad);
}

function sortContracts(contracts: ContractRecord[]): ContractRecord[] {
  const priority: Record<ContractStatus, number> = {
    active: 0,
    pending_payment: 1,
    scheduled: 2,
    draft: 3,
    expired: 4,
    cancelled: 5,
  };

  return [...contracts].sort((a, b) => {
    const aPriority = priority[a.status] ?? 99;
    const bPriority = priority[b.status] ?? 99;

    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDate = new Date(a.effectiveDate || a.contractStartDate || a.submittedAt || 0).getTime();
    const bDate = new Date(b.effectiveDate || b.contractStartDate || b.submittedAt || 0).getTime();

    return bDate - aDate;
  });
}

function getBadgeStyle(status: ContractStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'pending_payment':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'expired':
      return 'bg-slate-100 text-slate-600 border border-slate-200';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    default:
      return 'bg-violet-100 text-violet-700 border border-violet-200';
  }
}

function getBadgeText(status: ContractStatus): string {
  switch (status) {
    case 'pending_payment':
      return 'Payment Required';
    case 'expired':
      return 'Frozen';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:min-w-[180px]">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2';

  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400';

  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export default function OrgPartnerContractPage({
  organizationName,
  contracts,
  onRefresh,
  onRequestNewContract,
  onViewContract,
  onDownloadContract,
}: OrgPartnerContractPageProps) {
  const orderedContracts = useMemo(() => sortContracts(contracts), [contracts]);

  const currentContract = useMemo(
    () => orderedContracts.find((contract) => contract.status === 'active') ?? null,
    [orderedContracts],
  );

  const scheduledContract = useMemo(
    () => orderedContracts.find((contract) => contract.status === 'scheduled') ?? null,
    [orderedContracts],
  );

  const pendingPaymentContract = useMemo(
    () => orderedContracts.find((contract) => contract.status === 'pending_payment') ?? null,
    [orderedContracts],
  );

  const checkoutSuccess = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('checkout') === 'success';
  }, []);

  const currentDaysRemaining = daysRemaining(currentContract?.expiresAt);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Organization Contract</h1>
            <p className="mt-1 text-sm text-slate-600">Manage contracts for {organizationName}.</p>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton onClick={onRequestNewContract} variant="primary">
              Request New Contract
            </ActionButton>
            <ActionButton onClick={onRefresh}>Refresh</ActionButton>
          </div>
        </div>

        {checkoutSuccess && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            <span className="font-semibold">Payment successful.</span>{' '}
            Your payment was received and your contract status has been updated.
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {currentContract ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                    Contract Active
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {currentContract.title || `${currentContract.seats} seats — ${currency(currentContract.amountCad)}`}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    This top card is status-only. PDF actions are available below in the contract list.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center md:min-w-[180px]">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Days remaining</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {currentDaysRemaining !== null ? currentDaysRemaining : '—'}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryRow label="Approved by" value={currentContract.approvedBy || '—'} />
                <SummaryRow label="Signed by" value={currentContract.signedBy || '—'} />
                <SummaryRow label="Contract start" value={formatDate(currentContract.contractStartDate)} />
                <SummaryRow label="Effective date" value={formatDate(currentContract.effectiveDate)} />
                <SummaryRow label="Expiry date" value={formatDate(currentContract.expiresAt)} />
                <SummaryRow label="Carryover days" value={currentContract.carryoverDays ?? 0} />
                <SummaryRow label="Seats" value={currentContract.seats} />
                <SummaryRow label="Amount" value={currency(currentContract.amountCad)} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <h2 className="text-lg font-bold text-slate-900">No active contract</h2>
              <p className="mt-2 text-sm text-slate-600">
                You do not have an active contract right now. You can request a new contract below.
              </p>
            </div>
          )}
        </section>

        {pendingPaymentContract && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-emerald-900">New contract approved — payment required</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Your new contract has been approved. Complete payment to activate the new seats.
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
                {pendingPaymentContract.seats} seats — {currency(pendingPaymentContract.amountCad)}
              </div>
            </div>
          </section>
        )}

        {scheduledContract && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-blue-900">Next contract scheduled</h3>
            <p className="mt-1 text-sm text-blue-800">
              Your current contract stays active until {formatDate(currentContract?.expiresAt)}. The next contract becomes
              effective on {formatDate(scheduledContract.effectiveDate)} and runs until {formatDate(scheduledContract.expiresAt)}.
            </p>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Need more seats or a new term?</h3>
              <p className="mt-1 text-sm text-slate-600">
                You can always request a new contract. Previous contracts stay frozen and read-only.
              </p>
              {scheduledContract && (
                <p className="mt-2 text-sm text-amber-700">
                  Note: you already have a scheduled contract. If you request another one, your admin team can review and
                  decide whether to replace the scheduled contract or create a later term.
                </p>
              )}
            </div>

            <ActionButton onClick={onRequestNewContract} variant="primary">
              Request New Contract
            </ActionButton>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-xl font-bold text-slate-900">All Contracts</h3>
            <p className="mt-1 text-sm text-slate-600">Previous contracts are frozen. View and download actions are available here only.</p>
          </div>

          <div className="divide-y divide-slate-200">
            {orderedContracts.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">No contracts found.</div>
            ) : (
              orderedContracts.map((contract) => {
                const frozen = contract.status === 'expired' || contract.status === 'cancelled';
                const rowMuted = frozen ? 'bg-slate-50 opacity-80' : 'bg-white';

                return (
                  <div key={contract.id} className={`px-6 py-5 ${rowMuted}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-base font-bold text-slate-900">
                            {contract.title || `${contract.seats} seats — ${currency(contract.amountCad)}`}
                          </h4>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyle(contract.status)}`}>
                            {getBadgeText(contract.status)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span>Seats: {contract.seats}</span>
                          <span>Submitted: {formatDate(contract.submittedAt)}</span>
                          <span>Start: {formatDate(contract.contractStartDate)}</span>
                          <span>Effective: {formatDate(contract.effectiveDate)}</span>
                          <span>Expires: {formatDate(contract.expiresAt)}</span>
                          <span>Carryover: {contract.carryoverDays ?? 0} days</span>
                          {contract.termLabel && <span>Term: {contract.termLabel}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <ActionButton onClick={() => onViewContract?.(contract)}>View</ActionButton>
                        <ActionButton onClick={() => onDownloadContract?.(contract)}>Download</ActionButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
