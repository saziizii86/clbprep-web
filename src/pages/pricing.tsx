const PRICING_ACTIVE = false; // 👈 Set to true when Stripe is ready

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Building2,
  Check,
  Mail,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { account } from "../appwrite";

// ─── Plan key types ───────────────────────────────────────────
export type PlanKey = "monthly" | "bimonthly" | "quarterly" | "ai-monthly";

type PricingPageProps = {
  onBackHome: () => void;
  onSelectPlan: (plan: PlanKey) => void;
  currentPlan?: string;
  currentStatus?: string;
  subscriptionEndAt?: string | null;
  onContactOrg?: () => void; // optional — falls back to mailto if not provided
};

// ─── Button helpers ───────────────────────────────────────────
const btn =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none disabled:pointer-events-none disabled:opacity-50 h-11 px-5";
const secondary =
  "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 hover:shadow-sm";
const aiBtn =
  "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md hover:shadow-lg hover:brightness-[1.04] active:brightness-95";

// ─── Data ─────────────────────────────────────────────────────
type PrepPlan = {
  key: PlanKey;
  name: string;
  duration: string;
  originalPrice: number;
  salePrice: number;
  badge?: string;
  highlight?: boolean;
  note: string;
};

type OrgTier = {
  seats: number;
  price: number;
  featured?: boolean;
};

const prepPlans: PrepPlan[] = [
  {
    key: "monthly",
    name: "1 Month",
    duration: "30 days full access",
    originalPrice: 39,
    salePrice: 19.99,
    badge: "49% OFF",
    note: "Good for learners who need short-term access before the exam.",
  },
  {
    key: "bimonthly",
    name: "2 Months",
    duration: "60 days full access",
    originalPrice: 59,
    salePrice: 29.99,
    badge: "49% OFF",
    highlight: true,
    note: "Best balance for regular study, mock tests, and practice review.",
  },
  {
    key: "quarterly",
    name: "3 Months",
    duration: "90 days full access",
    originalPrice: 79,
    salePrice: 39.99,
    badge: "49% OFF",
    note: "Best value for users who want longer preparation and repeated practice.",
  },
];

const prepFeatures = [
  "Full access to all study materials",
  "All practice tests and mock exams",
  "Listening, Reading, Writing & Speaking",
  "AI Skill Builders included",
];

const aiFeatures = [
  "Basic access to CELPIP exam materials",
  "Live AI feedback on every answer",
  "Unlimited daily practice sessions",
  "Cancel anytime — no commitment",
];

const orgTiers: OrgTier[] = [
  { seats: 20,  price: 240 },
  { seats: 50,  price: 525 },
  { seats: 75,  price: 750 },
  { seats: 100, price: 999, featured: true },
];

const orgFeatures = [
  "All study materials & AI tools",
  "Flexible plans from 20 to 100+ seats",
  "Seat dashboard, reporting & invoicing",
  "Priority partner support",
];

// ─── Component ────────────────────────────────────────────────
export default function PricingPage({
  onBackHome,
  onSelectPlan,
  currentPlan,
  currentStatus,
  subscriptionEndAt,
  onContactOrg,
}: PricingPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewerLabel, setViewerLabel] = useState("");

  useEffect(() => {
    account
      .get()
      .then((me) => {
        setIsLoggedIn(true);
        setViewerLabel((me.name || me.email || "User").trim());
      })
      .catch(() => {
        setIsLoggedIn(false);
        setViewerLabel("");
      });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const viewerInitial = (viewerLabel?.charAt(0) || "U").toUpperCase();

  const isActiveAIOnly =
    currentPlan === "ai-monthly" &&
    (currentStatus === "active" || currentStatus === "cancelling") &&
    (!subscriptionEndAt || new Date(subscriptionEndAt).getTime() > Date.now());

  const upgradePrices: Record<string, number> = {
    monthly: Math.round((19.99 - 9.99) * 100) / 100,
    bimonthly: Math.round((29.99 - 9.99) * 100) / 100,
    quarterly: Math.round((39.99 - 9.99) * 100) / 100,
  };

  const handleOrgContact =
    onContactOrg ??
    (() => {
      const subject = encodeURIComponent("Organization Plan Inquiry - CLBPrep");
      const body = encodeURIComponent(
        "Hello,\n\nI'm interested in CLBPrep organization pricing. Please share the best option for our organization.\n"
      );
      window.location.href = `mailto:info@clbprep.com?subject=${subject}&body=${body}`;
    });

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      {/* ── Mesh background ───────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-[420px] w-[420px] rounded-full bg-blue-100/60 blur-[90px]" />
        <div className="absolute top-10 right-0 h-[340px] w-[340px] rounded-full bg-indigo-100/50 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-[260px] w-[520px] -translate-x-1/2 rounded-full bg-violet-100/40 blur-[70px]" />
      </div>

      <div className="mx-auto max-w-[1650px] px-4 pb-10 pt-3 sm:px-6 lg:px-8 xl:px-10">
        {/* ── Top bar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBackHome} className={`${btn} ${secondary}`}>
            <ArrowLeft className="h-4 w-4" />
            {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
          </button>

          {isLoggedIn && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                {viewerInitial}
              </div>
              <span className="max-w-[140px] truncate text-sm font-semibold text-slate-900 sm:max-w-[180px]">
                {viewerLabel}
              </span>
            </div>
          )}
        </div>

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="mx-auto mt-5 max-w-3xl text-center sm:mt-6 lg:mt-7">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl xl:text-5xl">
            Choose your path
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-3 sm:text-base">
            Prepare for the CELPIP exam with full access plans, or sharpen your English
            skills anytime with the AI Skill Builder.
          </p>
        </div>

        {/* ── Plans ─────────────────────────────────────────── */}
        <section className="mt-6 sm:mt-8 lg:mt-10">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <AIBuilderCard
              features={aiFeatures}
              onSelect={onSelectPlan}
              isCurrentPlan={currentPlan === "ai-monthly"}
            />

            {prepPlans.map((plan) => (
              <PrepPlanCard
                key={plan.key}
                plan={plan}
                features={prepFeatures}
                onSelect={onSelectPlan}
                isCurrentPlan={currentPlan === plan.key}
                upgradePrice={isActiveAIOnly ? upgradePrices[plan.key] : undefined}
              />
            ))}

            <OrgPlanCard features={orgFeatures} tiers={orgTiers} onContact={handleOrgContact} />
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Prep Plan Card ───────────────────────────────────────────
function PrepPlanCard({
  plan,
  features,
  onSelect,
  isCurrentPlan = false,
  upgradePrice,
}: {
  plan: PrepPlan;
  features: string[];
  onSelect: (k: PlanKey) => void;
  isCurrentPlan?: boolean;
  upgradePrice?: number;
}) {
  const savings = (plan.originalPrice - plan.salePrice).toFixed(2);
  const displayPrice = upgradePrice !== undefined ? upgradePrice : plan.salePrice;

  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl border-2 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl xl:p-6 ${
        plan.highlight
          ? "border-amber-400 ring-2 ring-amber-100"
          : "border-slate-300 hover:border-amber-300"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-1 text-xs font-bold text-white shadow">
          Most Popular
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Full Access</p>
          <h3 className="mt-1 text-[2rem] font-bold leading-none text-slate-900">{plan.name}</h3>
          <p className="mt-2 text-sm text-slate-500">{plan.duration}</p>
        </div>
        {plan.badge && (
          <span className="shrink-0 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
            {plan.badge}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">${displayPrice}</span>
        <div className="mb-1 flex flex-col items-start">
          {upgradePrice !== undefined ? (
            <>
              <span className="text-sm text-slate-400 line-through">${plan.salePrice}</span>
              <span className="text-xs font-semibold text-violet-600">Upgrade price</span>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400 line-through">${plan.originalPrice}</span>
              <span className="text-xs font-semibold text-emerald-600">Save ${savings}</span>
            </>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {upgradePrice !== undefined ? "Upgrade · CAD · Pay difference only" : "One-time · CAD · No renewal"}
      </p>

      <p className="mt-4 text-sm leading-7 text-slate-500">{plan.note}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button
          type="button"
          disabled
          className={`${btn} mt-6 w-full cursor-not-allowed bg-slate-100 text-slate-400`}
        >
          Current Plan
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(plan.key)}
          className={`${btn} mt-6 w-full ${
            upgradePrice !== undefined
              ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md hover:brightness-105"
              : plan.highlight
              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md hover:brightness-105"
              : `${secondary} hover:ring-slate-300`
          }`}
        >
          {upgradePrice !== undefined ? "Upgrade Plan" : "Select Plan"}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── AI Builder Card ──────────────────────────────────────────
function AIBuilderCard({
  features,
  onSelect,
  isCurrentPlan = false,
}: {
  features: string[];
  onSelect: (k: PlanKey) => void;
  isCurrentPlan?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col rounded-3xl border-2 border-violet-300 bg-white p-5 shadow-sm ring-2 ring-violet-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl xl:p-6">
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-1 text-xs font-bold text-white shadow">
        AI Only
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Standalone</p>
          <h3 className="mt-1 text-[2rem] font-bold leading-none text-slate-900">AI Builder</h3>
          <p className="mt-2 text-sm text-slate-500">Monthly subscription</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">$9.99</span>
        <div className="mb-1 flex flex-col items-start">
          <span className="text-sm font-medium text-slate-500">/ month</span>
          <span className="text-xs text-slate-400">CAD</span>
        </div>
      </div>
      <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600">
        <RefreshCw className="h-3 w-3" />
        Renews monthly · cancel anytime
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-500">
        Practice with mock exams and real-life scenarios across 4 core skills —
        Listening, Reading, Writing, and Speaking — with live AI feedback.
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100">
              <Check className="h-2.5 w-2.5 text-violet-700" />
            </div>
            {f}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button
          type="button"
          disabled
          className={`${btn} mt-6 w-full cursor-not-allowed bg-slate-100 text-slate-400`}
        >
          Current Plan
        </button>
      ) : (
        <button type="button" onClick={() => onSelect("ai-monthly")} className={`${btn} ${aiBtn} mt-6 w-full`}>
          <Zap className="h-4 w-4" />
          Subscribe
        </button>
      )}
    </div>
  );
}

// ─── Org Plan Card ────────────────────────────────────────────
function OrgPlanCard({
  features,
  tiers,
  onContact,
}: {
  features: string[];
  tiers: OrgTier[];
  onContact: () => void;
}) {
  const [showTiersModal, setShowTiersModal] = useState(false);
  const minPrice = Math.min(...tiers.map((tier) => tier.price));
  const minPerSeat = Math.min(...tiers.map((tier) => tier.price / tier.seats));

  useEffect(() => {
    if (!showTiersModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowTiersModal(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showTiersModal]);

  return (
    <>
      <div className="relative flex h-full flex-col rounded-3xl border-2 border-indigo-400 bg-white p-5 shadow-sm ring-2 ring-indigo-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl xl:p-6">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-1 text-xs font-bold text-white shadow">
          For Organizations
        </div>

        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Bulk Access</p>
            <h3 className="mt-1 text-[2rem] font-bold leading-none text-slate-900">Organization</h3>
            <p className="mt-2 text-sm text-slate-500">20 to 100+ seats available</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Starting at</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">${minPrice}</span>
            <div className="mb-1 flex flex-col items-start">
              <span className="text-sm font-medium text-slate-500">/ month</span>
              <span className="text-xs text-slate-400">CAD</span>
            </div>
          </div>
        </div>

        <p className="mt-1 text-xs text-slate-400">Invoice billing available</p>
        <div className="mt-2 inline-flex w-fit items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          As low as ${minPerSeat.toFixed(2)}/seat
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-500">
          For settlement agencies, ESL programs, and employers sponsoring newcomers to Canada.
        </p>

        <button
          type="button"
          onClick={() => setShowTiersModal(true)}
          className="mt-3 inline-flex w-fit items-center rounded-lg px-0 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          View seat tiers
        </button>

        <ul className="mt-5 flex-1 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <Check className="h-2.5 w-2.5 text-indigo-700" />
              </div>
              {f}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onContact}
          className={`${btn} mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:brightness-[1.04] active:brightness-95`}
        >
          <Mail className="h-4 w-4" />
          Contact Us
        </button>
      </div>

      {showTiersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setShowTiersModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                  Organization pricing
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">Seat tiers</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Flexible monthly pricing for schools, agencies, and employers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTiersModal(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close organization pricing modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tiers.map((tier) => (
                <div
                  key={tier.seats}
                  className={`rounded-2xl border p-4 ${
                    tier.featured
                      ? "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{tier.seats} seats</p>
                      <p className="mt-1 text-sm text-slate-500">
                        ${(tier.price / tier.seats).toFixed(2)}/seat per month
                      </p>
                    </div>
                    {tier.featured && (
                      <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">
                        Best value
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-2xl font-extrabold text-slate-900">${tier.price}<span className="ml-1 text-sm font-medium text-slate-500">/month</span></p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Need more than 100 seats? Contact us for a custom quote.
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowTiersModal(false)} className={`${btn} ${secondary}`}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTiersModal(false);
                  onContact();
                }}
                className={`${btn} bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:brightness-[1.04] active:brightness-95`}
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
