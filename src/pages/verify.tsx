// src/pages/verify.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { functions } from "../appwrite";

const VERIFY_FUNCTION_ID = "69ae41630020e6245374";

export default function VerifyPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get("userId") ?? "";

        if (!userId) {
          setDetail("Missing userId in URL");
          setStatus("error");
          return;
        }

        // Call the function with action=confirm — it uses server API key
        // to call users.updateEmailVerification(userId, true) directly
        const result = await functions.createExecution(
          VERIFY_FUNCTION_ID,
          JSON.stringify({ action: "confirm", userId }),
          false,
        );

        const body = JSON.parse(result.responseBody || "{}");
        if (result.responseStatusCode === 200 && body.ok) {
          setStatus("success");
        } else {
          setDetail(body.error || "Verification failed");
          setStatus("error");
        }
      } catch (e: any) {
        setDetail(e?.message ?? "Unknown error");
        setStatus("error");
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 via-white to-violet-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">

        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="text-sm text-gray-500">Verifying your email&hellip;</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 text-5xl">✅</div>
            <h2 className="text-xl font-semibold text-gray-900">Email verified!</h2>
            <p className="mt-2 text-sm text-gray-500">Your account is now active. Please sign in.</p>
            <button
              onClick={() => nav("/login", { replace: true })}
              className="mt-6 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
            >
              Go to Sign in
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 text-5xl">❌</div>
            <h2 className="text-xl font-semibold text-gray-900">Verification failed</h2>
            <p className="mt-2 text-sm text-gray-500">Something went wrong. Please try signing in to resend.</p>
            {detail ? <p className="mt-2 text-xs text-red-400 break-words">{detail}</p> : null}
            <button
              onClick={() => nav("/login", { replace: true })}
              className="mt-6 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
            >
              Back to Sign in
            </button>
          </>
        )}

      </div>
    </div>
  );
}
