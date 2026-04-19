import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  CreditCard,
  Mail,
  Send,
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

const ORG_PLANS = [
  { key: "25", label: "25 seats", price: 179 },
  { key: "50", label: "50 seats", price: 299 },
  { key: "100", label: "100 seats", price: 549 },
  { key: "150", label: "150 seats", price: 799 },
];

export type OrganizationOrderFormData = {
  organizationName: string;
  billingContactName: string;
  billingEmail: string;
  primaryAdminName: string;
  primaryAdminEmail: string;
  billingAddress: string;
  selectedPlan: string;
  selectedPlanPrice: number;
  startDate: string;
  initialTerm: string;
  autoRenew: boolean;
  billingMethod: string;
  invoiceEmail: string;
  specialNotes: string;
  signerName: string;
  signerTitle: string;
  signerSignature: string;
  signerDate: string;
  accepted: boolean;
};

export default function OrganizationOrderFormPage({
  onBack,
  onSend,
  mode = "partner",
  initialData,
}: {
  onBack: () => void;
  onSend?: (data: OrganizationOrderFormData) => void | Promise<void>;
  mode?: "admin" | "partner";
  initialData?: Partial<OrganizationOrderFormData>;
}) {
  const [organizationName, setOrganizationName] = useState(initialData?.organizationName || "");
  const [billingContactName, setBillingContactName] = useState(
    initialData?.billingContactName || ""
  );
  const [billingEmail, setBillingEmail] = useState(initialData?.billingEmail || "");
  const [primaryAdminName, setPrimaryAdminName] = useState(
    initialData?.primaryAdminName || ""
  );
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState(
    initialData?.primaryAdminEmail || ""
  );
  const [billingAddress, setBillingAddress] = useState(initialData?.billingAddress || "");
  const [selectedPlan, setSelectedPlan] = useState(initialData?.selectedPlan || "25");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [initialTerm, setInitialTerm] = useState(initialData?.initialTerm || "Monthly");
  const [autoRenew, setAutoRenew] = useState(Boolean(initialData?.autoRenew));
  const [billingMethod, setBillingMethod] = useState(
    initialData?.billingMethod || "Stripe invoice"
  );
  const [invoiceEmail, setInvoiceEmail] = useState(initialData?.invoiceEmail || "");
  const [specialNotes, setSpecialNotes] = useState(initialData?.specialNotes || "");
  const [signerName, setSignerName] = useState(initialData?.signerName || "");
  const [signerTitle, setSignerTitle] = useState(initialData?.signerTitle || "");
  const [signerSignature, setSignerSignature] = useState(
    initialData?.signerSignature || ""
  );
  const [signerDate, setSignerDate] = useState(initialData?.signerDate || "");
  const [accepted, setAccepted] = useState(Boolean(initialData?.accepted));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlanData = useMemo(
    () => ORG_PLANS.find((plan) => plan.key === selectedPlan) || ORG_PLANS[0],
    [selectedPlan]
  );

  const payload = useMemo<OrganizationOrderFormData>(
    () => ({
      organizationName,
      billingContactName,
      billingEmail,
      primaryAdminName,
      primaryAdminEmail,
      billingAddress,
      selectedPlan,
      selectedPlanPrice: selectedPlanData.price,
      startDate,
      initialTerm,
      autoRenew,
      billingMethod,
      invoiceEmail,
      specialNotes,
      signerName,
      signerTitle,
      signerSignature,
      signerDate,
      accepted,
    }),
    [
      accepted,
      autoRenew,
      billingAddress,
      billingContactName,
      billingEmail,
      billingMethod,
      initialTerm,
      invoiceEmail,
      organizationName,
      primaryAdminEmail,
      primaryAdminName,
      selectedPlan,
      selectedPlanData.price,
      signerDate,
      signerName,
      signerSignature,
      signerTitle,
      specialNotes,
      startDate,
    ]
  );

  const isValid =
    !!organizationName &&
    !!billingContactName &&
    !!billingEmail &&
    !!primaryAdminName &&
    !!primaryAdminEmail &&
    !!invoiceEmail &&
    !!signerName &&
    !!signerTitle &&
    !!signerSignature &&
    !!signerDate &&
    accepted;

  const actionLabel = mode === "admin" ? "Send Order Form" : "Submit Order Form";

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
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">CLBPrep</div>
              <div className="text-xs text-slate-500">Organization Order Form</div>
            </div>
          </div>

          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                CLBPrep Organization Order Form
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Use this page to confirm organization details, choose the seat plan, and approve
                billing for the selected CLBPrep organization subscription.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Input
              label="Organization Name"
              value={organizationName}
              onChange={setOrganizationName}
              placeholder="Enter organization name"
              required
            />
            <Input
              label="Billing Contact Name"
              value={billingContactName}
              onChange={setBillingContactName}
              placeholder="Enter billing contact name"
              required
            />
            <Input
              label="Billing Email"
              type="email"
              value={billingEmail}
              onChange={setBillingEmail}
              placeholder="billing@organization.com"
              required
            />
            <Input
              label="Primary Admin Name"
              value={primaryAdminName}
              onChange={setPrimaryAdminName}
              placeholder="Enter primary admin name"
              required
            />
            <Input
              label="Primary Admin Email"
              type="email"
              value={primaryAdminEmail}
              onChange={setPrimaryAdminEmail}
              placeholder="admin@organization.com"
              required
            />
            <Input
              label="Invoice Email"
              type="email"
              value={invoiceEmail}
              onChange={setInvoiceEmail}
              placeholder="finance@organization.com"
              required
            />
            <div className="md:col-span-2">
              <Input
                label="Billing Address"
                value={billingAddress}
                onChange={setBillingAddress}
                placeholder="Enter billing address"
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Select Organization Plan</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ORG_PLANS.map((plan) => {
                const active = selectedPlan === plan.key;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      active
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white hover:border-indigo-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{plan.label}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          ${(plan.price / Number(plan.key)).toFixed(2)}/seat per month
                        </div>
                      </div>
                      {active && (
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-2xl font-extrabold text-slate-900">
                      CAD ${plan.price}
                      <span className="ml-1 text-sm font-medium text-slate-500">/month</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Input
              label="Subscription Start Date"
              type="date"
              value={startDate}
              onChange={setStartDate}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Initial Term</label>
              <select
                value={initialTerm}
                onChange={(e) => setInitialTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option>Monthly</option>
                <option>3 months</option>
                <option>6 months</option>
                <option>12 months</option>
                <option>Custom term</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Billing Method</label>
              <select
                value={billingMethod}
                onChange={(e) => setBillingMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option>Stripe invoice</option>
                <option>Stripe payment link</option>
                <option>Bank transfer</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Auto-renew subscription
              </label>
            </div>
            <div className="md:col-span-2">
              <TextArea
                label="Special Notes"
                value={specialNotes}
                onChange={setSpecialNotes}
                placeholder="Add partner notes, seat setup notes, billing notes, or custom requests"
                rows={4}
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Order Summary</h2>
                <p className="text-sm text-slate-500">Review before sending</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Selected plan</dt>
                <dd className="text-right font-medium text-slate-900">{selectedPlanData.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Monthly price</dt>
                <dd className="text-right font-medium text-slate-900">CAD ${selectedPlanData.price}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Billing method</dt>
                <dd className="text-right font-medium text-slate-900">{billingMethod}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Renewal</dt>
                <dd className="text-right font-medium text-slate-900">
                  {autoRenew ? "Auto-renew" : "No auto-renew"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Taxes</dt>
                <dd className="text-right font-medium text-slate-900">Added where applicable</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Authorization</h2>
                <p className="text-sm text-slate-500">Sign to approve this order form</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <Input
                label="Authorized Signer Name"
                value={signerName}
                onChange={setSignerName}
                placeholder="Enter full legal name"
                required
              />
              <Input
                label="Authorized Signer Title"
                value={signerTitle}
                onChange={setSignerTitle}
                placeholder="Program Manager / Director / etc."
                required
              />
              <Input
                label="Electronic Signature"
                value={signerSignature}
                onChange={setSignerSignature}
                placeholder="Type full legal name as signature"
                required
              />
              <Input
                label="Signature Date"
                type="date"
                value={signerDate}
                onChange={setSignerDate}
                required
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
                I confirm that I am authorized to approve this order form on behalf of the
                organization and agree to the related CLBPrep agreement terms.
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
        </div>
      </main>
    </div>
  );
}
