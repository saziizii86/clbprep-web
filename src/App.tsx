// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/login";
import UserHome from "./pages/userHome";
import Admin from "./pages/admin";
import VerifyPage from "./pages/verify";
import ProtectedRoute from "./components/ProtectedRoute";   // ← ADD
import AdminRoute from "./components/AdminRoute";           // ← ADD

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/userhome" element={<ProtectedRoute><UserHome /></ProtectedRoute>} />   {/* ← CHANGED */}
        <Route path="/admin"    element={<AdminRoute><Admin /></AdminRoute>} />              {/* ← CHANGED */}
        
        {/* Email verification */}
        <Route path="/verify" element={<VerifyPage />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;