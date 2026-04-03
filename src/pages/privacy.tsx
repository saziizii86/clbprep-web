// src/pages/privacy.tsx
import React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-1 text-sm text-slate-500">Effective Date: January 1, 2025 — Last Updated: March 2026</p>
          <p className="mt-1 text-sm text-slate-500">CLBPrep, operated by Azizi Online Learning Services — Halifax, Nova Scotia, Canada</p>

          <hr className="my-6 border-slate-100" />

          <Section title="1. Who We Are">
            <p>
              CLBPrep is an online study platform operated by Azizi Online Learning Services, based in Halifax,
              Nova Scotia, Canada. We provide preparation tools and practice materials for the CELPIP exam.
              This Privacy Policy explains what personal information we collect, how we use it, and your
              rights regarding that information.
            </p>
            <p className="mt-3">
              CLBPrep is not affiliated with, endorsed by, or connected to Paragon Testing Enterprises
              or any other official exam body.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-medium text-slate-800">a) Information you provide directly:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Full name (optional at signup)</li>
              <li>Email address (required to create an account)</li>
              <li>Password (stored securely via Appwrite — we never see your plain-text password)</li>
              <li>Country (provided on the checkout page)</li>
            </ul>

            <p className="mt-4 font-medium text-slate-800">b) Payment information:</p>
            <p className="mt-1">
              We do not collect or store your credit card or banking details. All payments are processed
              securely by Stripe. We only receive a payment confirmation, your plan, and a Stripe customer ID.
            </p>

            <p className="mt-4 font-medium text-slate-800">c) Usage data collected automatically:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Last login date and time</li>
              <li>Last activity timestamp</li>
              <li>Presence status (online / offline)</li>
              <li>Subscription plan and status</li>
              <li>Transaction history (plan, amount, card brand and last 4 digits)</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and manage your account</li>
              <li>To provide access to the features you paid for</li>
              <li>To process your purchase via Stripe</li>
              <li>To send service-related communications (e.g., purchase confirmation)</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To improve the platform using anonymized, aggregate usage patterns</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell, rent, or trade your personal information to third parties
              for marketing purposes.
            </p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>We use the following services to operate the platform:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Appwrite</strong> — Authentication and database hosting. Your account data is
                stored on Appwrite infrastructure.
              </li>
              <li>
                <strong>Stripe</strong> — Payment processing. Card details are handled entirely by
                Stripe and never reach our servers.
              </li>
            </ul>
            <p className="mt-3">
              These services have their own privacy policies, which we encourage you to review.
            </p>
            <p className="mt-3">
              <strong>Cross-Border Data Transfer:</strong> Your data may be stored or processed in
              countries outside Canada, including the United States, where Appwrite and Stripe
              infrastructure may be hosted. By using CLBPrep, you consent to this international
              transfer of your personal information. We take reasonable steps to ensure your data
              remains protected in accordance with this Privacy Policy.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your account information for as long as your account is active. If you request
              deletion, we will remove your personal data from our active database within a reasonable
              timeframe, except where retention is required by law.
            </p>
          </Section>

          <Section title="6. Data Breach Notification">
            <p>
              In the event of a data breach that poses a real risk of significant harm to users,
              CLBPrep will, as required by Canada's <strong>Personal Information Protection and
              Electronic Documents Act (PIPEDA)</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Notify all affected users as soon as reasonably possible</li>
              <li>
                Report the breach to the{" "}
                <strong>Office of the Privacy Commissioner of Canada</strong>
              </li>
              <li>Maintain an internal record of the breach for a minimum of 24 months</li>
            </ul>
            <p className="mt-3">
              If you believe your account or personal data has been compromised, please contact us
              immediately at{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>.
            </p>
          </Section>

          <Section title="7. Your Rights — PIPEDA & Nova Scotia PIPA">
            <p>
              As a resident of Nova Scotia or anywhere in Canada, your personal information is protected
              under Canada's federal privacy law (PIPEDA) as well as applicable provincial standards.
              You have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Withdraw consent for certain uses of your data</li>
              <li>Request deletion of your account and associated data</li>
              <li>File a complaint with the Office of the Privacy Commissioner of Canada</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>.
            </p>
          </Section>

          <Section title="8. Cookies & Tracking">
            <p>
              We use session storage and browser mechanisms to maintain your login session. We do not use
              third-party advertising trackers or sell data to ad networks. Our platform does not display
              advertisements.
            </p>
          </Section>

          <Section title="9. Marketing Communications & CASL">
            <p>
              CLBPrep complies with Canada's <strong>Anti-Spam Legislation (CASL)</strong>. We will
              only send you marketing or promotional emails if you have explicitly opted in to receive
              them at the time of account registration.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>You can withdraw your consent and unsubscribe at any time via the unsubscribe link in any email we send.</li>
              <li>Withdrawing marketing consent does not affect service-related emails (e.g., purchase confirmations, account notices), which we may send as needed.</li>
              <li>We will never share your email address with third parties for marketing purposes.</li>
            </ul>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              This platform is intended for individuals 18 years of age or older. We do not knowingly
              collect personal information from minors. If you believe a minor has created an account,
              contact us at{" "}
              <a href="mailto:support@clbprep.com" className="text-indigo-600 hover:underline">
                support@clbprep.com
              </a>{" "}
              and we will promptly delete it.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. If changes are material, we will notify
              you by email or with a prominent in-app notice. Continued use of the service after changes
              constitutes your acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>Questions or concerns? Contact us at:</p>
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
