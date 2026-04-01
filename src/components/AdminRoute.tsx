import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";
import { Query } from "appwrite";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "deny" | "noauth">("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const me = await account.get();

        if (!me.emailVerification) {
          account.deleteSession("current").catch(() => {});
          setStatus("noauth");
          return;
        }

        const email = (me.email || "").trim().toLowerCase();
        const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal("email", email),
        ]);

        const role = res.documents.length ? (res.documents[0] as any).role : "user";

        if (role === "admin") {
          setStatus("ok");
        } else {
          setStatus("deny"); // logged in but not admin → send to dashboard
        }
      } catch {
        setStatus("noauth"); // no session at all → send to login
      }
    };
    check();
  }, []);

  if (status === "checking") return <Spinner />;
  if (status === "noauth") return <Navigate to="/login" replace />;
  if (status === "deny")   return <Navigate to="/userhome" replace />;
  return <>{children}</>;
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f8f9fc" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #e2e8f0", borderTopColor:"#7c3aed", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}