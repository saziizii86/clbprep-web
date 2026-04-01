import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { account } from "../appwrite";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "deny">("checking");

  useEffect(() => {
    account.get()
      .then((me) => {
        if (!me.emailVerification) {
          account.deleteSession("current").catch(() => {});
          setStatus("deny");
        } else {
          setStatus("ok");
        }
      })
      .catch(() => setStatus("deny"));
  }, []);

  if (status === "checking") return <Spinner />;
  if (status === "deny") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f8f9fc" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #e2e8f0", borderTopColor:"#6366f1", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}