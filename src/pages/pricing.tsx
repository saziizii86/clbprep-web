const PRICING_ACTIVE = false; // 👈 Set to true when Stripe is ready
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { account } from "../appwrite";

export type PlanKey = "monthly" | "bimonthly" | "quarterly";

type PricingPageProps = {
  onBackHome: () => void;
  onSelectPlan: (plan: PlanKey) => void;
};

type Plan = {
  key: PlanKey;
  name: string;
  duration: string;
  originalPrice: number;
  salePrice: number;
  badge: string;
  note: string;
  highlight?: boolean;
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
    note: "Good for learners who need short-term access before the exam.",
  },
  {
    key: "bimonthly",
    name: "2 Months",
    duration: "60 Days Full Access",
    originalPrice: 59,
    salePrice: 29.99,
    badge: "49% OFF",
    note: "Best balance for regular study, mock tests, and practice review.",
  },
  {
    key: "quarterly",
    name: "3 Months",
    duration: "90 Days Full Access",
    originalPrice: 79,
    salePrice: 39.99,
    badge: "49% OFF",
    note: "Best value for users who want longer preparation and repeated practice.",
  },
];

export default function PricingPage({ onBackHome, onSelectPlan }: PricingPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewerLabel, setViewerLabel] = useState("");

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const me = await account.get();
        setIsLoggedIn(true);
        setViewerLabel((me.name || me.email || "User").trim());
      } catch {
        setIsLoggedIn(false);
        setViewerLabel("");
      }
    };

    loadCurrentUser();
  }, []);

  const viewerInitial = (viewerLabel?.charAt(0) || "U").toUpperCase();

  const sharedFeatures = useMemo(
    () => [
      "Full access to all materials",
      "All practice tests and mock exams",
      "Listening, Reading, Writing, and Speaking",
      "AI feedback and corrections",
      "Progress tracking and premium tools",
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
       <div className="flex items-center justify-between gap-3">
  <button type="button" onClick={onBackHome} className={`${buttonBase} ${secondaryButton}`}>
    <ArrowLeft className="h-4 w-4" />
    {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
  </button>

  {isLoggedIn && (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">
        {viewerInitial}
      </div>

      <div className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
        {viewerLabel}
      </div>
    </div>
  )}
</div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            All plans include the same premium materials
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Choose Your Right Plan</h1>



        </div>

{PRICING_ACTIVE ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">{plan.badge}</span>
                  </div>
                </div>
                <div className="mt-5">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{plan.duration}</p>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-xl text-slate-400 line-through">${plan.originalPrice}</span>
                  <span className="text-4xl font-bold tracking-tight">${plan.salePrice}</span>
                </div>
                <p className="mt-2 min-h-[40px] text-sm leading-6 text-slate-600">{plan.note}</p>
                <div className="mt-4 space-y-2.5">
                  {sharedFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.key)}
                  className={`${buttonBase} ${primaryButton} mt-5 w-full`}
                >
                  Select Plan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-white px-8 py-16 text-center shadow-sm">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-800">Payments Coming Soon</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              We're currently setting up our payment system. Plans will be available shortly — check back soon!
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100">
              <Sparkles className="h-4 w-4" />
              Launching very soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
