// src/pages/terms.tsx
import React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function TermsOfService({ onBack }: { onBack: () => void }) {
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
          <p className="mt-1 text-sm text-slate-500">Effective Date: January 1, 2025 — Last Updated: March 2026</p>
          <p className="mt-1 text-sm text-slate-500">CLBPrep, operated by Azizi Online Learning Services — Halifax, Nova Scotia, Canada</p>


          <hr className="my-6 border-slate-100" />

          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account or using CLBPrep (the "Service"), you agree to be bound by these
              Terms of Service. If you do not agree, please do not use the Service.
            </p>
          </Section>

          <Section title="2. About the Service">
            <p>
              CLBPrep is an independent online study platform that provides practice materials, mock
              exams, and AI-assisted tools to help users prepare for the CELPIP test. The platform is operated by Azizi Online Learning Services, based in Halifax, Nova Scotia, Canada, and is{" "}
              <strong>not affiliated with, endorsed by, or connected to</strong> Paragon Testing
              Enterprises or any official exam body.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years of age to use the Service. By creating an account, you
              confirm that you meet this requirement.
            </p>
          </Section>

          <Section title="4. Account Responsibility">
            <ul className="list-disc space-y-1 pl-5">
              <li>Keep your login credentials confidential.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>Notify us immediately if you suspect any unauthorized use of your account.</li>
              <li>
                Accounts are for individual use only. Sharing your credentials with others violates
                these Terms.
              </li>
            </ul>
          </Section>

          <Section title="5. Subscriptions & Payment">
  <p>
    CLBPrep offers one-time and recurring subscription plans that provide access to
    platform features for the selected duration. Current pricing and plan details are
    always available on our{" "}
    <a href="#" className="text-indigo-600 hover:underline">Pricing page</a>.
  </p>
  <ul className="mt-4 list-disc space-y-1 pl-5">
    <li>One-time plans provide full access for the purchased duration with no automatic renewal.</li>
    <li>Recurring plans renew monthly and can be cancelled at any time.</li>
    <li>All prices are in Canadian dollars (CAD) and are subject to change.</li>
    <li>Payments are processed securely via Stripe. We do not store your card details.</li>
    <li>Access expires at the end of the purchased period.</li>
  </ul>
</Section>

          <Section title="6. No Refund Policy">
            <p>
              <strong>All purchases on CLBPrep are final and non-refundable.</strong> By completing
              your purchase, you acknowledge and agree that no refunds, credits, or exchanges will be
              issued under any circumstances, including but not limited to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Change of mind after purchase</li>
              <li>Unused portion of your subscription period</li>
              <li>Dissatisfaction with exam scores or outcomes</li>
              <li>Failure to use the platform during the subscription period</li>
              <li>Technical issues caused by your own device or internet connection</li>
            </ul>
            <p className="mt-3">
              The only exception is verified <strong>duplicate or unauthorized charges</strong>. If you
              believe you were charged in error, contact us at{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>{" "}
              within 7 days and we will investigate promptly.
            </p>
            <p className="mt-3">
              By proceeding to checkout, you confirm that you have read and understood this no-refund policy.
            </p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use the Service for unlawful, fraudulent, or abusive purposes</li>
              <li>Share your account or credentials with others</li>
              <li>Attempt to hack, reverse-engineer, or exploit the platform</li>
              <li>Upload malicious code or files of any kind</li>
              <li>Reproduce or redistribute platform content without written permission</li>
              <li>Use the platform to build competing products</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms, without refund.
            </p>
          </Section>

          <Section title="8. AI-Generated Content">
            <p>
              Some features use AI tools to generate feedback, scoring suggestions, and practice content.
              AI-generated outputs are provided for educational purposes only. Accuracy is not guaranteed,
              and results on this platform do not predict or guarantee performance on the actual CELPIP exam.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              All platform content, software, design, logos, and materials are owned by or licensed to
              CLBPrep. You may not copy, reproduce, or distribute them without prior written permission.
            </p>
            <p className="mt-3">
              CELPIP® is a registered trademark of Paragon Testing Enterprises. Its use on this platform
              is for identification and reference purposes only. No endorsement or official association
              is implied.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable Nova Scotia and Canadian law, CLBPrep shall
              not be liable for any indirect, incidental, or consequential damages arising from your use
              of the Service. Our total aggregate liability shall not exceed the amount you paid for your
              current subscription plan.
            </p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>
              The Service is provided on an "as is" and "as available" basis, without warranties of any
              kind. We do not warrant that the Service will be error-free or uninterrupted. Exam results
              on this platform are for practice purposes only.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by the laws of the Province of Nova Scotia and the applicable
              federal laws of Canada. Any disputes shall be resolved in the courts of Nova Scotia,
              unless otherwise agreed in writing.
            </p>
          </Section>

          <Section title="13. Marketing Communications & CASL">
            <p>
              CLBPrep complies with Canada's <strong>Anti-Spam Legislation (CASL)</strong>. By
              creating an account, you consent to receiving service-related emails such as purchase
              confirmations and account notices.
            </p>
            <p className="mt-3">
              Marketing or promotional emails will only be sent to you if you have explicitly opted
              in during registration. You may withdraw your marketing consent at any time by clicking
              the unsubscribe link in any promotional email or by contacting us at{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We may update these Terms from time to time. If changes are material, we will provide
              reasonable notice by email or in-app notice. Continued use of the Service after changes
              constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="15. Contact Us">
            <p>Questions about these Terms? Contact us at:</p>
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
