const PRICING_ACTIVE = false; // 👈 Set to true when Stripe is ready

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Brain, Check,
  RefreshCw, Zap,
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
};

// ─── Button helpers ───────────────────────────────────────────
const btn =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none disabled:pointer-events-none disabled:opacity-50 h-11 px-5";
const primary =
  "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:brightness-[1.04] active:brightness-95";
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

// ─── Component ────────────────────────────────────────────────
export default function PricingPage({ onBackHome, onSelectPlan, currentPlan, currentStatus, subscriptionEndAt }: PricingPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewerLabel, setViewerLabel] = useState("");

  useEffect(() => {
    account.get()
      .then((me) => { setIsLoggedIn(true); setViewerLabel((me.name || me.email || "User").trim()); })
      .catch(() => { setIsLoggedIn(false); setViewerLabel(""); });
  }, []);
  
  useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}, []);

  const viewerInitial = (viewerLabel?.charAt(0) || "U").toUpperCase();
  
  const isActiveAIOnly =
  currentPlan === "ai-monthly" &&
  (currentStatus === "active" || currentStatus === "cancelling") &&
  (!subscriptionEndAt || new Date(subscriptionEndAt).getTime() > Date.now());

// Upgrade prices: full price minus $9.99 AI Builder price
const upgradePrices: Record<string, number> = {
  monthly: Math.round((19.99 - 9.99) * 100) / 100,   // $10.00
  bimonthly: Math.round((29.99 - 9.99) * 100) / 100, // $20.00
  quarterly: Math.round((39.99 - 9.99) * 100) / 100, // $30.00
};

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">

      {/* ── Mesh background ───────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-100/60 blur-[100px]" />
        <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-indigo-100/50 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-100/40 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-6">

        {/* ── Top bar ───────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBackHome} className={`${btn} ${secondary}`}>
            <ArrowLeft className="h-4 w-4" />
            {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
          </button>

          {isLoggedIn && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                {viewerInitial}
              </div>
              <span className="max-w-[160px] truncate text-sm font-semibold text-slate-900">{viewerLabel}</span>
            </div>
          )}
        </div>

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="mt-10 text-center">
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Choose your path
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            Prepare for the CELPIP exam with full access plans, or sharpen your
            English skills anytime with the AI Skill Builder.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════
            ALL PLANS — single 4-column row
        ════════════════════════════════════════════════════ */}
        <section className="mt-14 mb-16">

          {PRICING_ACTIVE ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {/* AI Skill Builder card — first/left */}
              <AIBuilderCard
  features={aiFeatures}
  onSelect={onSelectPlan}
  isCurrentPlan={currentPlan === "ai-monthly"}
/>
              {/* 3 prep plan cards */}
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
            </div>
          ) : (
            /* Coming soon: show all 4 placeholder slots */
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
          )}

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
      className={`relative flex flex-col rounded-3xl border-2 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl
        ${plan.highlight
          ? "border-amber-400 ring-2 ring-amber-100"
          : "border-slate-300 hover:border-amber-300"
        }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-1 text-xs font-bold text-white shadow">
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Full Access</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{plan.name}</h3>
          <p className="text-sm text-slate-500">{plan.duration}</p>
        </div>
        {plan.badge && (
          <span className="shrink-0 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
            {plan.badge}
          </span>
        )}
      </div>

      {/* Price */}
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

      <p className="mt-4 min-h-[36px] text-sm leading-relaxed text-slate-500">{plan.note}</p>

      {/* Features */}
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
    className={`${btn} bg-slate-100 text-slate-400 cursor-not-allowed mt-6 w-full`}
  >
    Current Plan
  </button>
) : (
  <button
    type="button"
    onClick={() => onSelect(plan.key)}
    className={`${btn} ${upgradePrice !== undefined
      ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md hover:brightness-105"
      : plan.highlight
      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md hover:brightness-105"
      : `${secondary} hover:ring-slate-300`
    } mt-6 w-full`}
  >
    {upgradePrice !== undefined ? "Upgrade Plan" : "Select Plan"}
    <ArrowRight className="h-4 w-4" />
  </button>
)}
    </div>
  );
}

// ─── AI Builder Card (vertical, matches prep plan card height) ─
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
    <div className="relative flex flex-col rounded-3xl border-2 border-violet-300 bg-white p-6 shadow-sm ring-2 ring-violet-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">

      {/* "AI Only" badge at top — mirrors "Most Popular" */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-1 text-xs font-bold text-white shadow">
        AI Only
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Standalone</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">AI Builder</h3>
          <p className="text-sm text-slate-500">Monthly subscription</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">$9.99</span>
        <div className="mb-1 flex flex-col items-start">
          <span className="text-sm text-slate-500 font-medium">/ month</span>
          <span className="text-xs text-slate-400">CAD</span>
        </div>
      </div>
      <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600">
        <RefreshCw className="h-3 w-3" />
        Renews monthly · cancel anytime
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-500">
        Practice with mock exams and real-life scenarios across 4 core skills — Listening, Reading, Writing, and Speaking — with live AI feedback.
      </p>

      {/* Features */}
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
    className={`${btn} bg-slate-100 text-slate-400 cursor-not-allowed mt-6 w-full`}
  >
    Current Plan
  </button>
) : (
  <button
    type="button"
    onClick={() => onSelect("ai-monthly")}
    className={`${btn} ${aiBtn} mt-6 w-full`}
  >
    <Zap className="h-4 w-4" />
    Subscribe
  </button>
)}
    </div>
  );
}


