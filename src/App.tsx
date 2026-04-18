// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/login";
import UserHome from "./pages/userHome";
import Admin from "./pages/admin";
import PartnerAdmin from "./pages/partnerAdmin";              // ← ADD
import VerifyPage from "./pages/verify";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PartnerAdminRoute from "./components/PartnerAdminRoute"; // ← ADD
import OrgPartnerAdmin from "./pages/OrgPartnerAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/userhome" element={<ProtectedRoute><UserHome /></ProtectedRoute>} />
        <Route path="/admin"    element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/partner-admin" element={<PartnerAdminRoute><PartnerAdmin /></PartnerAdminRoute>} /> {/* ← ADD */}
		<Route path="/org-partner-admin" element={<ProtectedRoute><OrgPartnerAdmin /></ProtectedRoute>} />
        
        {/* Email verification */}
        <Route path="/verify" element={<VerifyPage />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;