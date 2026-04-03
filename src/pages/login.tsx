// src/pages/login.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ID, Query } from "appwrite";
import { X } from "lucide-react";
import SEO from "../components/SEO";

// ✅ Update this path to wherever your Appwrite client is
// Must export: account, databases, DATABASE_ID, USERS_COLLECTION_ID
import { account, databases, functions, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";

// ✅ Load the real Terms and Privacy pages directly
import TermsOfService from "./terms";
import PrivacyPolicy from "./privacy";

const VERIFY_FUNCTION_ID = "69ae41630020e6245374"; // Send Verification function

type Mode = "login" | "signup";
type ModalType = "terms" | "privacy" | null;

// ---------------------------------------------
// Modal Shell — renders the real terms.tsx / privacy.tsx pages
// ---------------------------------------------
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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center px-4"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable body — renders the real page component */}
        <div className="overflow-y-auto flex-1">
          {type === "terms" && <TermsOfService onBack={onClose} />}
          {type === "privacy" && <PrivacyPolicy onBack={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------
// Main Login Component
// ---------------------------------------------
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
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // modal
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showVerifyScreen, setShowVerifyScreen] = useState(false);
  const [isUnverifiedLogin, setIsUnverifiedLogin] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  // Store user info before session is destroyed, so resend works without a session
  const [pendingVerifyUser, setPendingVerifyUser] = useState<{userId: string; email: string; name: string} | null>(null);

  // clear inputs when switching modes
  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setErr(null);
    setAgreedToTerms(false);
    setMarketingOptIn(false);
  }, [mode]);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const destroyCurrentSession = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore if no current session exists
    }
  };
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

      // ✅ Check subscription before sending to pricing
      const e = emailForLookup.trim().toLowerCase();
      const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", e),
      ]);

      const userDoc = res.documents[0] as any;
      const isPro =
        userDoc &&
        userDoc.subscriptionStatus === "active" &&
        userDoc.subscriptionPlan !== "basic";

      if (isPro) {
        // Already a paid subscriber → skip pricing, go to dashboard
        await routeByRole(emailForLookup);
        return;
      }

      // Basic/inactive user → send to pricing as intended
      nav("/?page=pricing", { replace: true });
      return;
    }

    await routeByRole(emailForLookup);
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const me = await account.get();

        if (!me.emailVerification) {
          await destroyCurrentSession();
          return; // stay on login page if not verified
        }

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
        if (!currentUser.emailVerification) {
          try {
            await functions.createExecution(
              VERIFY_FUNCTION_ID,
              JSON.stringify({
                userId: currentUser.$id,
                email: currentUser.email,
                name: currentUser.name || "",
              }),
              false,
            );
          } catch (ex) {
            console.error("Verify email failed:", ex);
          }

          setPendingVerifyUser({ userId: currentUser.$id, email: currentUser.email, name: currentUser.name || "" });
          await destroyCurrentSession();

          setIsUnverifiedLogin(true);
          setShowVerifyScreen(true);
          return;
        }

        await ensureUserRow(enteredEmail, currentUser.name || "");
        await markUserLoggedIn(enteredEmail);
        await redirectAfterAuth(enteredEmail);
        return;
      }

      await account.deleteSession("current");
    } catch {
      // no active session
    }

    await account.createEmailPasswordSession(cleanEmail, password);

    const me = await account.get();

    if (!me.emailVerification) {
      try {
        await functions.createExecution(
          VERIFY_FUNCTION_ID,
          JSON.stringify({
            userId: me.$id,
            email: me.email,
            name: me.name || "",
          }),
          false,
        );
      } catch (verifyError) {
        console.error("Verify email failed:", verifyError);
      }

      setPendingVerifyUser({ userId: me.$id, email: me.email, name: me.name || "" });
      await destroyCurrentSession();

      setIsUnverifiedLogin(true);
      setShowVerifyScreen(true);
      return;
    }

    await ensureUserRow(cleanEmail, me.name || "");
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
    // NOTE: do NOT markUserLoggedIn — user must verify first

    // Send verification email via our Function + Resend
    const me = await account.get();
    try {
      const execResult = await functions.createExecution(
        VERIFY_FUNCTION_ID,
        JSON.stringify({ userId: me.$id, email: me.email, name: me.name || displayName }),
        false,
      );
      console.log("Verify function status:", execResult.status, execResult.responseBody);
    } catch (e) { console.error("Verify email failed:", e); }

    setPendingVerifyUser({ userId: me.$id, email: me.email, name: me.name || displayName });
    await destroyCurrentSession(); // ✅ IMPORTANT
    setIsUnverifiedLogin(false);
    setShowVerifyScreen(true);

  } catch (error: any) {
    if (error?.code === 409) {
      setErr("An account with this email already exists. Please sign in instead.");
    } else {
      setErr(error?.message ?? "Sign up failed");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <>
	
	      <SEO
        title="Login to CLBPrep"
        description="Log in to access CELPIP practice tests and track your progress."
        canonical="/login"
      />
      <PolicyModal type={openModal} onClose={() => setOpenModal(null)} />

      {showVerifyScreen ? (
        <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-b from-violet-50 via-white to-violet-50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">

            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isUnverifiedLogin ? "bg-amber-100" : "bg-violet-100"}`}>
              <span className="text-3xl">{isUnverifiedLogin ? "⚠️" : "✉️"}</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900">
              {isUnverifiedLogin ? "Email not verified" : "Check your inbox"}
            </h2>

            {isUnverifiedLogin ? (
              <>
                <p className="mt-3 text-sm text-gray-500 leading-6">
                  Your account is <span className="font-semibold text-amber-600">not activated yet</span>.
                  You must verify your email before signing in.
                </p>
                <p className="mt-2 text-sm text-gray-500 leading-6">
                  We resent a verification link to{" "}
                  <span className="font-medium text-gray-800">{cleanEmail}</span>.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-500 leading-6">
                We sent a verification link to{" "}
                <span className="font-medium text-gray-800">{cleanEmail}</span>.
                Please check your inbox and click the link to activate your account.
              </p>
            )}

            <p className="mt-2 text-xs text-gray-400">Didn't get it? Check your spam folder.</p>

            <button
              type="button"
              disabled={resendStatus === "sending" || resendStatus === "sent"}
              onClick={async () => {
                setResendStatus("sending");
                try {
                  if (!pendingVerifyUser) throw new Error("No user info available");
                  await functions.createExecution(
                    VERIFY_FUNCTION_ID,
                    JSON.stringify({ userId: pendingVerifyUser.userId, email: pendingVerifyUser.email, name: pendingVerifyUser.name }),
                    false,
                  );
                  setResendStatus("sent");
                } catch {
                  setResendStatus("error");
                }
              }}
              className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {resendStatus === "sending" ? "Sending..."
                : resendStatus === "sent" ? "✅ Email sent!"
                : resendStatus === "error" ? "❌ Failed — try again"
                : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={() => { setShowVerifyScreen(false); setIsUnverifiedLogin(false); setResendStatus("idle"); setMode("login"); }}
              className="mt-2 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
            >
              Go to Sign in
            </button>

            <p className="mt-4 text-xs text-gray-400">
              Need help? <a href="mailto:support@clbprep.com" className="text-violet-600 underline">support@clbprep.com</a>
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-b from-violet-50 via-white to-violet-50">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
                <span className="font-bold">C</span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-gray-900">CLBPrep</h1>
              <p className="mt-1 text-sm text-gray-500">
                {isLogin ? "Sign in to continue" : "Create your account in seconds"}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={["rounded-xl py-2 text-sm font-medium transition", isLogin ? "bg-violet-600 text-white shadow-sm" : "bg-gray-50 text-gray-700 hover:bg-gray-100"].join(" ")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={["rounded-xl py-2 text-sm font-medium transition", !isLogin ? "bg-violet-600 text-white shadow-sm" : "bg-gray-50 text-gray-700 hover:bg-gray-100"].join(" ")}
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
                        placeholder="e.g., John"
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
                        <button type="button" onClick={() => setOpenModal("terms")} className="font-medium text-violet-700 hover:text-violet-800 underline underline-offset-2">Terms of Service</button>
                        {" "}and{" "}
                        <button type="button" onClick={() => setOpenModal("privacy")} className="font-medium text-violet-700 hover:text-violet-800 underline underline-offset-2">Privacy Policy</button>.
                      </label>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="flex items-start gap-2.5">
                      <input
                        id="marketing-checkbox"
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 accent-violet-600"
                      />
                      <label htmlFor="marketing-checkbox" className="text-xs text-gray-500 leading-5">
                        (Optional) I agree to receive tips, updates, and promotional emails from CLBPrep.
                        You can unsubscribe at any time.
                      </label>
                    </div>
                  )}

                  {err && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
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
      )}
    </>
  );
}
