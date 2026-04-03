// src/pages/refund.tsx
import React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function RefundPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">CLBPrep</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Refund Policy</h1>
          <p className="mt-1 text-sm text-slate-500">Effective Date: January 1, 2025 — Last Updated: March 2026</p>
          <p className="mt-1 text-sm text-slate-500">CLBPrep, operated by Azizi Online Learning Services — Halifax, Nova Scotia, Canada</p>

          <hr className="my-6 border-slate-100" />

          {/* Warning banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>Important:</strong> Please read this policy carefully before completing your purchase.
            All sales are final.
          </div>

          <Section title="1. All Sales Are Final">
            <p>
              <strong>CLBPrep does not offer refunds.</strong> All purchases are final and non-refundable.
              By completing checkout, you confirm that you have read and agreed to this policy.
            </p>
            <p className="mt-3">
              This applies to all subscription plans — 1 Month, 2 Months, and 3 Months — purchased
              directly through the CLBPrep web app.
            </p>
          </Section>

          <Section title="2. Non-Refundable Situations">
            <p>No refund will be issued for any of the following:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Change of mind after purchase</li>
              <li>Not using the platform during your subscription period</li>
              <li>Dissatisfaction with your exam score or performance outcome</li>
              <li>Purchasing the wrong plan by mistake</li>
              <li>Technical issues caused by your own device, browser, or internet connection</li>
              <li>Forgetting your login credentials</li>
            </ul>
          </Section>

          <Section title="3. Exception: Duplicate or Unauthorized Charges">
            <p>
              If you were charged more than once for the same order, or if you believe an unauthorized
              payment was made using your account, contact us immediately. Verified duplicate or
              fraudulent charges will be refunded in full.
            </p>
            <p className="mt-3">
              To report an issue, email{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>{" "}
              within <strong>7 days</strong> of the charge with your full name, registered email,
              and a description of the issue. We will respond within 3–5 business days.
            </p>
          </Section>

          <Section title="4. Chargebacks">
            <p>
              Filing a chargeback or payment dispute with your bank or card issuer without contacting
              us first may result in immediate suspension of your account access. We encourage you to
              reach out to us directly so we can resolve any concerns quickly.
            </p>
          </Section>

          <Section title="5. Consumer Rights — Nova Scotia">
            <p>
              Nothing in this policy is intended to limit or exclude any rights you may have under the
              Nova Scotia Consumer Protection Act or other applicable consumer protection legislation.
              If you have concerns about a transaction, you may also contact the Nova Scotia Consumer
              Protection Division for guidance.
            </p>
          </Section>

          <Section title="6. Contact Us">
            <p>Questions about this policy? Contact us at:</p>
            <p className="mt-2 font-medium text-slate-800">CLBPrep</p>
            <p>Halifax, Nova Scotia, Canada</p>
            <p>
              Email:{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}
