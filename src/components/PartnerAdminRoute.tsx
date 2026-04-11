// src/components/PartnerAdminRoute.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";
import { Query } from "appwrite";

export default function PartnerAdminRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    (async () => {
      try {
        const me = await account.get();
        const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal("email", me.email.toLowerCase()),
        ]);
        const role = (res.documents[0] as any)?.role;
        setStatus(role === "partner_admin" ? "ok" : "deny");
      } catch {
        setStatus("deny");
      }
    })();
  }, []);

  if (status === "loading") return null;
  if (status === "deny") return <Navigate to="/" replace />;
  return <>{children}</>;
}