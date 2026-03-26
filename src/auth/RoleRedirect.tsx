import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

export default function RoleRedirect() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          nav("/login", { replace: true });
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? (snap.data().role as string) : "user";

        if (role === "admin") nav("/admin", { replace: true });
        else nav("/user", { replace: true });
      } catch (e) {
        // if something goes wrong, send to login
        nav("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [nav]);

  if (loading) return <div style={{ padding: 24 }}>Checking account…</div>;
  return null;
}
