import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: "admin" | "user";
}) {
  const [state, setState] = useState<"loading" | "guest" | "ok" | "forbidden">("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState("guest");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? (snap.data().role as string) : "user";

      if (role === requiredRole) setState("ok");
      else setState("forbidden");
    });

    return () => unsub();
  }, [requiredRole]);

  if (state === "loading") return <div style={{ padding: 24 }}>Loading…</div>;
  if (state === "guest") return <Navigate to="/login" replace />;
  if (state === "forbidden") return <Navigate to="/" replace />;
  return <>{children}</>;
}
