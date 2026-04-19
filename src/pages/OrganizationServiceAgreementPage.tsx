import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  FileText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "default" | "secondary" | "ghost";

function Button({
  children,
  className,
  variant = "default",
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:pointer-events-none disabled:opacity-50 h-11 px-5";
  const variants: Record<ButtonVariant, string> = {
    default:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-lg hover:brightness-[1.03] active:brightness-95",
    secondary:
      "bg-white/70 text-slate-900 ring-1 ring-slate-200 hover:bg-white hover:shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-white/60",
  };

  return (
    <button
      type={type ?? "button"}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export type OrganizationServiceAgreementData = {
  effectiveDate: string;
  organizationLegalName: string;
  organizationAddress: string;
  organizationContactName: string;
  organizationContactEmail: string;
  selectedPlanLabel: string;
  seats: string;
  monthlyPrice: string;
  startDate: string;
  termLabel: string;
  clbprepSignerName: string;
  clbprepSignerTitle: string;
  customerSignerName: string;
  customerSignerTitle: string;
  customerSignature: string;
  customerSignedAt: string;
  additionalNotes: string;
  accepted: boolean;
};

export default function OrganizationServiceAgreementPage({
  onBack,
  onSend,
  mode = "partner",
  initialData,
}: {
  onBack: () => void;
  onSend?: (data: OrganizationServiceAgreementData) => void | Promise<void>;
  mode?: "admin" | "partner";
  initialData?: Partial<OrganizationServiceAgreementData>;
}) {
  const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate || "");
  const [organizationLegalName, setOrganizationLegalName] = useState(
    initialData?.organizationLegalName || ""
  );
  const [organizationAddress, setOrganizationAddress] = useState(
    initialData?.organizationAddress || ""
  );
  const [organizationContactName, setOrganizationContactName] = useState(
    initialData?.organizationContactName || ""
  );
  const [organizationContactEmail, setOrganizationContactEmail] = useState(
    initialData?.organizationContactEmail || ""
  );
  const [selectedPlanLabel, setSelectedPlanLabel] = useState(
    initialData?.selectedPlanLabel || "Organization Plan"
  );
  const [seats, setSeats] = useState(initialData?.seats || "25");
  const [monthlyPrice, setMonthlyPrice] = useState(initialData?.monthlyPrice || "179");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [termLabel, setTermLabel] = useState(initialData?.termLabel || "Monthly");
  const [clbprepSignerName, setClbprepSignerName] = useState(
    initialData?.clbprepSignerName || ""
  );
  const [clbprepSignerTitle, setClbprepSignerTitle] = useState(
    initialData?.clbprepSignerTitle || ""
  );
  const [customerSignerName, setCustomerSignerName] = useState(
    initialData?.customerSignerName || ""
  );
  const [customerSignerTitle, setCustomerSignerTitle] = useState(
    initialData?.customerSignerTitle || ""
  );
  const [customerSignature, setCustomerSignature] = useState(
    initialData?.customerSignature || ""
  );
  const [customerSignedAt, setCustomerSignedAt] = useState(
    initialData?.customerSignedAt || ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialData?.additionalNotes || ""
  );
  const [accepted, setAccepted] = useState(Boolean(initialData?.accepted));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payload = useMemo<OrganizationServiceAgreementData>(
    () => ({
      effectiveDate,
      organizationLegalName,
      organizationAddress,
      organizationContactName,
      organizationContactEmail,
      selectedPlanLabel,
      seats,
      monthlyPrice,
      startDate,
      termLabel,
      clbprepSignerName,
      clbprepSignerTitle,
      customerSignerName,
      customerSignerTitle,
      customerSignature,
      customerSignedAt,
      additionalNotes,
      accepted,
    }),
    [
      accepted,
      additionalNotes,
      clbprepSignerName,
      clbprepSignerTitle,
      customerSignature,
      customerSignedAt,
      customerSignerName,
      customerSignerTitle,
      effectiveDate,
      monthlyPrice,
      organizationAddress,
      organizationContactEmail,
      organizationContactName,
      organizationLegalName,
      seats,
      selectedPlanLabel,
      startDate,
      termLabel,
    ]
  );

  const isValid =
    !!effectiveDate &&
    !!organizationLegalName &&
    !!organizationContactName &&
    !!organizationContactEmail &&
    !!selectedPlanLabel &&
    !!seats &&
    !!monthlyPrice &&
    !!customerSignerName &&
    !!customerSignerTitle &&
    !!customerSignature &&
    !!customerSignedAt &&
    accepted;

  const actionLabel = mode === "admin" ? "Send Agreement" : "Submit Signed Agreement";

  const handleSubmit = async () => {
    if (!onSend || !isValid) return;
    try {
      setIsSubmitting(true);
      await onSend(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">CLBPrep</div>
              <div className="text-xs text-slate-500">Organization Service Agreement</div>
            </div>
          </div>

          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                CLBPrep Organization Service Agreement
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                This page is designed for partner organizations to review and electronically sign
                the CLBPrep organization agreement.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Input
              label="Effective Date"
              type="date"
              value={effectiveDate}
              onChange={setEffectiveDate}
              required
            />
            <Input
              label="Subscription Start Date"
              type="date"
              value={startDate}
              onChange={setStartDate}
            />
            <Input
              label="Organization Legal Name"
              value={organizationLegalName}
              onChange={setOrganizationLegalName}
              placeholder="Enter organization legal name"
              required
            />
            <Input
              label="Organization Contact Name"
              value={organizationContactName}
              onChange={setOrganizationContactName}
              placeholder="Enter contact name"
              required
            />
            <Input
              label="Organization Contact Email"
              type="email"
              value={organizationContactEmail}
              onChange={setOrganizationContactEmail}
              placeholder="name@organization.com"
              required
            />
            <Input
              label="Organization Address"
              value={organizationAddress}
              onChange={setOrganizationAddress}
              placeholder="Enter organization address"
            />
            <Input
              label="Selected Plan"
              value={selectedPlanLabel}
              onChange={setSelectedPlanLabel}
              placeholder="Organization Plan"
              required
            />
            <Input
              label="Subscription Term"
              value={termLabel}
              onChange={setTermLabel}
              placeholder="Monthly / 3 months / 6 months"
            />
            <Input
              label="Number of Seats"
              value={seats}
              onChange={setSeats}
              placeholder="25"
              required
            />
            <Input
              label="Monthly Price (CAD)"
              value={monthlyPrice}
              onChange={setMonthlyPrice}
              placeholder="179"
              required
            />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Agreement Terms</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <p>
                <strong>1. Service.</strong> CLBPrep will provide the Customer with organization
                access to the CLBPrep platform, including the agreed number of seats, access to
                study materials and AI tools, seat management features, progress reporting, and
                related support according to the selected plan.
              </p>
              <p>
                <strong>2. Seats and Plan.</strong> Seats are for Customer-authorized learners only
                and may not be resold, sublicensed, or shared outside the Customer’s organization.
              </p>
              <p>
                <strong>3. Term.</strong> This Agreement begins on the effective date and continues
                for the subscription term stated on this page, unless ended earlier under this
                Agreement.
              </p>
              <p>
                <strong>4. Fees and Payment.</strong> Customer will pay the fees listed on this page
                in Canadian dollars (CAD), plus applicable taxes. Payments may be processed through
                Stripe or another approved payment method.
              </p>
              <p>
                <strong>5. Refunds.</strong> Except for verified duplicate or unauthorized charges,
                payments are final and non-refundable, subject to any non-waivable legal rights.
              </p>
              <p>
                <strong>6. Customer Responsibilities.</strong> Customer will provide accurate
                organization and billing information, ensure its users comply with CLBPrep’s terms,
                keep admin credentials secure, and use the platform only for lawful internal
                educational or training purposes.
              </p>
              <p>
                <strong>7. Privacy and Data.</strong> CLBPrep uses third-party providers including
                Stripe for payment processing and Appwrite for authentication/database services.
              </p>
              <p>
                <strong>8. Educational Purpose.</strong> CLBPrep is an independent study platform
                for educational purposes only. Most or all content may be generated, assisted, or
                enhanced by artificial intelligence tools. No exam score or outcome is guaranteed.
              </p>
              <p>
                <strong>9. Governing Law.</strong> This Agreement is governed by the laws of Nova
                Scotia and the applicable federal laws of Canada.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Electronic Signature</h2>
                <p className="text-sm text-slate-500">Complete this section to sign the agreement.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <Input
                label="CLBPrep Signer Name"
                value={clbprepSignerName}
                onChange={setClbprepSignerName}
                placeholder="Enter CLBPrep signer name"
              />
              <Input
                label="CLBPrep Signer Title"
                value={clbprepSignerTitle}
                onChange={setClbprepSignerTitle}
                placeholder="Enter CLBPrep signer title"
              />
              <Input
                label="Customer Signer Name"
                value={customerSignerName}
                onChange={setCustomerSignerName}
                placeholder="Enter full legal name"
                required
              />
              <Input
                label="Customer Signer Title"
                value={customerSignerTitle}
                onChange={setCustomerSignerTitle}
                placeholder="Program Manager / Director / etc."
                required
              />
              <Input
                label="Electronic Signature"
                value={customerSignature}
                onChange={setCustomerSignature}
                placeholder="Type full legal name as signature"
                required
              />
              <Input
                label="Signature Date"
                type="date"
                value={customerSignedAt}
                onChange={setCustomerSignedAt}
                required
              />
              <TextArea
                label="Additional Notes"
                value={additionalNotes}
                onChange={setAdditionalNotes}
                placeholder="Optional internal note or partner note"
                rows={4}
              />
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                I confirm that I am authorized to sign on behalf of the organization and agree to
                the terms of this Agreement.
              </span>
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={onBack}>
                Cancel
              </Button>
              <Button
                className="w-full sm:flex-1"
                onClick={handleSubmit}
                disabled={!onSend || !isValid || isSubmitting}
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending..." : actionLabel}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Summary</h2>
                <p className="text-sm text-slate-500">Quick agreement overview</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Organization</dt>
                <dd className="text-right font-medium text-slate-900">
                  {organizationLegalName || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Plan</dt>
                <dd className="text-right font-medium text-slate-900">{selectedPlanLabel || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Seats</dt>
                <dd className="text-right font-medium text-slate-900">{seats || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Monthly Price</dt>
                <dd className="text-right font-medium text-slate-900">
                  {monthlyPrice ? `CAD $${monthlyPrice}` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Term</dt>
                <dd className="text-right font-medium text-slate-900">{termLabel || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-right font-medium text-slate-900">
                  {accepted ? "Ready to submit" : "Waiting for acceptance"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </main>
    </div>
  );
}
