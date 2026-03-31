import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ShieldCheck, CreditCard, Lock } from "lucide-react";
import { account } from "../appwrite";
import type { PlanKey } from "./pricing";

type PurchasePageProps = {
  selectedPlanKey: PlanKey;
  onBackPricing: () => void;
};

type Plan = {
  key: PlanKey;
  name: string;
  duration: string;
  originalPrice: number;
  salePrice: number;
  badge: string;
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:pointer-events-none disabled:opacity-50 h-11 px-4";

const primaryButton =
  "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-lg hover:brightness-[1.03] active:brightness-95";

const secondaryButton =
  "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 hover:shadow-sm";

const plans: Plan[] = [
  {
    key: "monthly",
    name: "1 Month",
    duration: "30 Days Full Access",
    originalPrice: 39,
    salePrice: 19.99,
    badge: "49% OFF",
  },
  {
    key: "bimonthly",
    name: "2 Months",
    duration: "60 Days Full Access",
    originalPrice: 59,
    salePrice: 29.99,
    badge: "49% OFF",
  },
  {
    key: "quarterly",
    name: "3 Months",
    duration: "90 Days Full Access",
    originalPrice: 79,
    salePrice: 39.99,
    badge: "49% OFF",
  },
  // ✅ ADD THIS:
  {
    key: "ai-monthly",
    name: "AI Builder",
    duration: "Monthly Subscription",
    originalPrice: 9.99,
    salePrice: 9.99,
    badge: "AI Only",
  },
];

const API_BASE_URL =
  import.meta.env.VITE_STRIPE_SERVER_URL || "http://localhost:4242";

export default function PurchasePage({ selectedPlanKey, onBackPricing }: PurchasePageProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "Canada",
    appwriteUserId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await account.get();
        setForm((prev) => ({
          ...prev,
          name: me.name || "",
          email: me.email || "",
          appwriteUserId: me.$id || "",
        }));
      } catch {
        // not logged in
      }
    };

    loadMe();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.key === selectedPlanKey) ?? plans[1],
    [selectedPlanKey]
  );

  const savings = selectedPlan.originalPrice - selectedPlan.salePrice;

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planKey: selectedPlan.key,
          email: form.email,
          name: form.name,
          appwriteUserId: form.appwriteUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create Stripe Checkout session.");
      }

      if (!data?.url) {
        throw new Error("Stripe Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error: any) {
      alert(error?.message || "Failed to start checkout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <button type="button" onClick={onBackPricing} className={`${buttonBase} ${secondaryButton}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Pricing
        </button>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold md:text-3xl">Continue to Secure Checkout</h1>
                <p className="mt-1 text-sm text-slate-500">
                  You’ll be redirected to Stripe to complete your subscription safely.
                </p>
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full Name">
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500"
                    placeholder="John Smith"
                  />
                </Field>

                <Field label="Email Address">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500"
                    placeholder="name@example.com"
                  />
                </Field>
              </div>

              <Field label="Country">
                <input
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500"
                  placeholder="Canada"
                />
              </Field>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Card entry happens on Stripe Checkout, not on this page.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`${buttonBase} ${primaryButton} w-full`}
              >
                {isSubmitting ? "Redirecting..." : `Continue to pay $${selectedPlan.salePrice}`}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8 lg:h-fit">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Order Summary</div>
                <div className="mt-1 text-sm text-slate-500">Premium subscription access</div>
              </div>
              <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">{selectedPlan.badge}</span>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{selectedPlan.name}</div>
                  <div className="text-sm text-slate-500">{selectedPlan.duration}</div>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Original price</span>
                  <span className="text-slate-400 line-through">${selectedPlan.originalPrice}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Discounted price</span>
                  <span className="font-semibold text-emerald-700">${selectedPlan.salePrice}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">You save</span>
                  <span className="font-semibold text-rose-600">${savings}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                "Full access to all materials",
                "All practice tests and mock exams",
                "AI feedback and premium tools",
                "Same features in every plan",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}