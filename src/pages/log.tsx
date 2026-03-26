// src/pages/login.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ID, Query } from "appwrite";
import { X } from "lucide-react";

// ✅ Update this path to wherever your Appwrite client is
// Must export: account, databases, DATABASE_ID, USERS_COLLECTION_ID
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";

type Mode = "login" | "signup";
type ModalType = "terms" | "privacy" | null;

// ─────────────────────────────────────────────
// Modal content
// ─────────────────────────────────────────────
function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-gray-600">{children}</div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-sm text-gray-500">Effective Date: January 1, 2025 — CLBPrep (operated by Soheila Azizi), Halifax, Nova Scotia, Canada</p>

      <ModalSection title="1. Acceptance of Terms">
        <p>By creating an account or using CLBPrep, you agree to be bound by these Terms. If you do not agree, please do not use the Service.</p>
      </ModalSection>

      <ModalSection title="2. About the Service">
        <p>CLBPrep is an independent online study platform providing practice materials and AI-assisted tools for CELPIP preparation. It is operated by Soheila Azizi as a sole proprietorship in Halifax, Nova Scotia, and is <strong>not affiliated with or endorsed by</strong> Paragon Testing Enterprises or any official exam body.</p>
      </ModalSection>

      <ModalSection title="3. Eligibility">
        <p>You must be at least 18 years of age to use the Service.</p>
      </ModalSection>

      <ModalSection title="4. Account Responsibility">
        <ul className="list-disc space-y-1 pl-4">
          <li>Keep your login credentials confidential</li>
          <li>You are responsible for all activity under your account</li>
          <li>Accounts are for individual use only — sharing credentials violates these Terms</li>
          <li>Notify us immediately if you suspect unauthorized access</li>
        </ul>
      </ModalSection>

      <ModalSection title="5. Subscriptions & Payment">
        <p>CLBPrep offers one-time subscription plans (no automatic renewal):</p>
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 text-xs">
          <table className="w-full">
            <thead className="bg-gray-50 text-left font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-3 py-2">1 Month</td><td className="px-3 py-2">30 days</td><td className="px-3 py-2">$19.99 CAD</td></tr>
              <tr><td className="px-3 py-2">2 Months</td><td className="px-3 py-2">60 days</td><td className="px-3 py-2">$29.99 CAD</td></tr>
              <tr><td className="px-3 py-2">3 Months</td><td className="px-3 py-2">90 days</td><td className="px-3 py-2">$39.99 CAD</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2">Payments are processed by Stripe. We do not store your card details.</p>
      </ModalSection>

      <ModalSection title="6. No Refund Policy">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-3">
          <strong>Important:</strong> All sales are final. Please read carefully before purchasing.
        </div>
        <p><strong>CLBPrep does not offer refunds.</strong> All purchases are final and non-refundable. This applies to all plans — 1 Month, 2 Months, and 3 Months.</p>
        <p className="mt-2">No refund will be issued for any of the following:</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Change of mind after purchase</li>
          <li>Not using the platform during your subscription period</li>
          <li>Dissatisfaction with your exam score or performance outcome</li>
          <li>Purchasing the wrong plan by mistake</li>
          <li>Technical issues caused by your own device, browser, or internet connection</li>
          <li>Forgetting your login credentials</li>
        </ul>
        <p className="mt-2"><strong>Exception — Duplicate or Unauthorized Charges:</strong> If you were charged more than once for the same order, or believe an unauthorized payment was made, email <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a> within <strong>7 days</strong>. Verified cases will be refunded in full. We respond within 3-5 business days.</p>
        <p className="mt-2"><strong>Chargebacks:</strong> Filing a chargeback without contacting us first may result in immediate suspension of your account. Please reach out to us directly first.</p>
        <p className="mt-2">Nothing in this policy limits any rights you may have under the Nova Scotia Consumer Protection Act or other applicable consumer protection legislation.</p>
      </ModalSection>

      <ModalSection title="7. Acceptable Use">
        <p>You agree not to share your account, hack or reverse-engineer the platform, upload malicious code, reproduce content without permission, or use the platform to build competing products. Violations may result in account termination without refund.</p>
      </ModalSection>

      <ModalSection title="8. AI-Generated Content">
        <p>Some features use AI for feedback and scoring. Outputs are for educational purposes only and do not predict or guarantee actual CELPIP exam results.</p>
      </ModalSection>

      <ModalSection title="9. Intellectual Property">
        <p>All content, software, and design belong to CLBPrep. CELPIP® is a trademark of Paragon Testing Enterprises — used here for reference only, no affiliation implied.</p>
      </ModalSection>

      <ModalSection title="10. Governing Law">
        <p>These Terms are governed by the laws of Nova Scotia and applicable federal laws of Canada.</p>
      </ModalSection>

      <ModalSection title="11. Contact">
        <p>CLBPrep — Halifax, Nova Scotia, Canada<br />Email: <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a></p>
      </ModalSection>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-sm text-gray-500">Effective Date: January 1, 2025 — CLBPrep (operated by Soheila Azizi), Halifax, Nova Scotia, Canada</p>

      <ModalSection title="1. Who We Are">
        <p>CLBPrep is an online study platform operated by Soheila Azizi as a sole proprietorship in Halifax, Nova Scotia, Canada. We are not affiliated with Paragon Testing Enterprises or any official exam body.</p>
      </ModalSection>

      <ModalSection title="2. Information We Collect">
        <p><strong>You provide directly:</strong> name (optional), email, password (encrypted), country.</p>
        <p className="mt-2"><strong>Payment:</strong> We never store card details. Stripe handles all payments and shares only a confirmation and customer ID with us.</p>
        <p className="mt-2"><strong>Automatically:</strong> Last login time, activity timestamp, presence status, subscription plan/status, and transaction history (plan, amount, card brand, last 4 digits).</p>
      </ModalSection>

      <ModalSection title="3. How We Use Your Information">
        <ul className="list-disc space-y-1 pl-4">
          <li>To create and manage your account</li>
          <li>To provide access to features you paid for</li>
          <li>To process payments via Stripe</li>
          <li>To send service-related communications</li>
          <li>To detect and prevent fraud or abuse</li>
        </ul>
        <p className="mt-2">We do <strong>not</strong> sell, rent, or trade your personal information.</p>
      </ModalSection>

      <ModalSection title="4. Third-Party Services">
        <p><strong>Appwrite</strong> — authentication and database hosting.<br /><strong>Stripe</strong> — payment processing. Card details never reach our servers.</p>
      </ModalSection>

      <ModalSection title="5. Your Rights (PIPEDA — Canada)">
        <p>You have the right to access, correct, or request deletion of your personal data. You may also withdraw consent or file a complaint with the Office of the Privacy Commissioner of Canada. To exercise these rights, email <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a>.</p>
      </ModalSection>

      <ModalSection title="6. Cookies & Tracking">
        <p>We use browser session mechanisms for login only. No advertising trackers. No ads.</p>
      </ModalSection>

      <ModalSection title="7. Children's Privacy">
        <p>This platform is for users 18 and older. If you believe a minor has an account, contact us at <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a>.</p>
      </ModalSection>

      <ModalSection title="8. Contact">
        <p>CLBPrep — Halifax, Nova Scotia, Canada<br />Email: <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a></p>
      </ModalSection>
    </>
  );
}



// ─────────────────────────────────────────────
// Reusable Modal Shell
// ─────────────────────────────────────────────
function PolicyModal({
  type,
  onClose,
}: {
  type: ModalType;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!type) return null;

  const titles: Record<NonNullable<ModalType>, string> = {
    terms: "Terms of Service",
    privacy: "Privacy Policy",
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center px-4"
    >
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{titles[type]}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          {type === "terms" && <TermsContent />}
          {type === "privacy" && <PrivacyContent />}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Login Component
// ─────────────────────────────────────────────
export default function Login() {
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const isLogin = mode === "login";

  // signup-only (NOT used to login)
  const [name, setName] = useState("");

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // modal
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showVerifyScreen, setShowVerifyScreen] = useState(false);

  // clear inputs when switching modes
  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setErr(null);
    setAgreedToTerms(false);
  }, [mode]);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  // ✅ Ensure user row exists in DB Users table
  const ensureUserRow = async (emailForDb: string, fallbackName = "") => {
    const e = emailForDb.trim().toLowerCase();

    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", e),
    ]);

    if (res.documents.length > 0) return;

    const me = await account.get();

    await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, me.$id, {
      email: e,
      name: fallbackName || "",
      role: "user",
      subscriptionPlan: "basic",
      subscriptionStatus: "inactive",
      presenceStatus: "offline",
      accountStatus: "active",
    });
  };

  const markUserLoggedIn = async (emailForDb: string) => {
    const e = emailForDb.trim().toLowerCase();

    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", e),
    ]);

    if (!res.documents.length) return;

    const userDoc: any = res.documents[0];
    const nowIso = new Date().toISOString();

    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, userDoc.$id, {
      presenceStatus: "online",
      lastLoginAt: nowIso,
      lastActivityAt: nowIso,
      lastSeenAt: nowIso,
    });
  };

  // ✅ route based on role in DB
  const routeByRole = async (emailForLookup: string) => {
    const e = emailForLookup.trim().toLowerCase();

    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", e),
    ]);

    const role = res.documents.length ? (res.documents[0] as any).role : "user";
    nav(role === "admin" ? "/admin" : "/userhome", { replace: true });
  };

  const redirectAfterAuth = async (emailForLookup: string) => {
    const pendingRedirect = sessionStorage.getItem("postLoginRedirect");

    if (pendingRedirect === "pricing") {
      sessionStorage.removeItem("postLoginRedirect");
      nav("/?page=pricing", { replace: true });
      return;
    }

    await routeByRole(emailForLookup);
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const me = await account.get();
        await redirectAfterAuth(me.email);
      } catch {
        // no active session -> remain on login page
      }
    };

    checkExistingSession();
  }, []);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      try {
        const currentUser = await account.get();
        const activeEmail = (currentUser.email || "").trim().toLowerCase();
        const enteredEmail = cleanEmail.trim().toLowerCase();

        if (activeEmail === enteredEmail) {
          await ensureUserRow(enteredEmail, currentUser.name || "");
          await redirectAfterAuth(enteredEmail);
          return;
        }

        await account.deleteSession("current");
      } catch {
        // no active session
      }

      await account.createEmailPasswordSession(cleanEmail, password);
      await ensureUserRow(cleanEmail, "");
      await markUserLoggedIn(cleanEmail);
      await redirectAfterAuth(cleanEmail);
    } catch (error: any) {
      setErr(error?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

const onSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setErr(null);
  setLoading(true);

  const displayName = name.trim();

  try {
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    if (!agreedToTerms) {
      setErr("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    await account.create(ID.unique(), cleanEmail, password, displayName || undefined);
    await account.createEmailPasswordSession(cleanEmail, password);
    await ensureUserRow(cleanEmail, displayName);
    await markUserLoggedIn(cleanEmail);

    // Send verification email — no redirect URL needed, just show the screen
    await account.createVerification(`${window.location.origin}/login`);
    setShowVerifyScreen(true);

  } catch (error: any) {
    if (error?.code === 409) {
      setErr("This email is already registered. Please sign in.");
      setMode("login");
    } else {
      setErr(error?.message ?? "Sign up failed");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      {/* Policy Modal */}
      <PolicyModal type={openModal} onClose={() => setOpenModal(null)} />
	  
	  {/* ── Email Verification Screen ── */}
{showVerifyScreen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
        <span className="text-3xl">✉️</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Verify your email</h2>
      <p className="mt-3 text-sm text-gray-500 leading-6">
        We sent a verification link to{" "}
        <span className="font-medium text-gray-800">{cleanEmail}</span>.
        Please check your inbox and click the link to activate your account.
      </p>
      <p className="mt-2 text-xs text-gray-400">Didn't get it? Check your spam folder.</p>

      <button
        type="button"
        onClick={async () => {
          try {
            await account.createVerification(`${window.location.origin}/login`);
            alert("Verification email resent!");
          } catch {
            alert("Could not resend. Please try again.");
          }
        }}
        className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
      >
        Resend email
      </button>

      <button
        type="button"
        onClick={() => { setShowVerifyScreen(false); setMode("login"); }}
        className="mt-2 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
      >
        Go to Sign in
      </button>
    </div>
  </div>
)}

      <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-b from-violet-50 via-white to-violet-50">
        <div className="w-full max-w-md">
          {/* top brand/header */}
          <div className="mb-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <span className="font-bold">C</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-gray-900">CLBPrep</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isLogin ? "Sign in to continue" : "Create your account in seconds"}
            </p>
          </div>

          {/* card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* tabs */}
            <div className="grid grid-cols-2 gap-2 p-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={[
                  "rounded-xl py-2 text-sm font-medium transition",
                  isLogin
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={[
                  "rounded-xl py-2 text-sm font-medium transition",
                  !isLogin
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                Sign up
              </button>
            </div>

            <div className="px-6 pb-6 pt-4">
              <form onSubmit={isLogin ? onLogin : onSignup} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name (optional)</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="e.g., Mohsen"
                      type="text"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="you@example.com"
                    type="email"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                  {!isLogin && (
                    <p className="mt-1 text-xs text-gray-500">Use at least 8 characters.</p>
                  )}
                </div>

                {/* ── Terms checkbox — signup only ── */}
                {!isLogin && (
                  <div className="flex items-start gap-2.5">
                    <input
                      id="terms-checkbox"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 accent-violet-600"
                    />
                    <label htmlFor="terms-checkbox" className="text-xs text-gray-500 leading-5">
                       I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setOpenModal("terms")}
                        className="font-medium text-violet-700 hover:text-violet-800 underline underline-offset-2"
                      >
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        onClick={() => setOpenModal("privacy")}
                        className="font-medium text-violet-700 hover:text-violet-800 underline underline-offset-2"
                      >
                        Privacy Policy
                      </button>
                      .
                    </label>
                  </div>
                )}

                {err && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {err}
                  </div>
                )}

                <button
                  disabled={loading || (!isLogin && !agreedToTerms)}
                  className="w-full rounded-xl bg-violet-600 py-2.5 text-white font-medium shadow-sm hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  type="submit"
                >
                  {loading
                    ? isLogin ? "Signing in..." : "Creating account..."
                    : isLogin ? "Sign in" : "Create account"}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setMode(isLogin ? "signup" : "login")}
                  className="text-violet-700 hover:text-violet-800 font-medium"
                >
                  {isLogin ? "New here? Create account" : "Already have an account? Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => nav("/", { replace: true })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            By continuing, you agree to use this platform responsibly.
          </p>
        </div>
      </div>
    </>
  );
}
