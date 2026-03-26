import React, { useEffect, useState } from "react";

/**
 * CLBPrep — Coming Soon Page
 * Temporary page while business registration is being finalized.
 * Replace this file with the full home.tsx once the business is registered.
 */

export default function CelpipMasterHome() {
  const [dots, setDots] = useState(".");

  // Animated ellipsis
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #312e81 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#f1f5f9",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "1.25rem",
          background: "linear-gradient(135deg, #3b82f6, #6366f1, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "2rem",
          boxShadow: "0 0 40px rgba(99,102,241,0.5)",
          fontSize: "2rem",
        }}
      >
        ✦
      </div>

      {/* Brand name */}
      <h1
        style={{
          fontSize: "clamp(2.8rem, 8vw, 5.5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          margin: 0,
          background: "linear-gradient(90deg, #93c5fd, #a5b4fc, #e9d5ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1.1,
        }}
      >
        CLBPrep
      </h1>

      {/* Tagline */}
      <p
        style={{
          marginTop: "0.75rem",
          fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
          color: "#94a3b8",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontWeight: 400,
        }}
      >
        CELPIP Exam Preparation Platform
      </p>

      {/* Divider */}
      <div
        style={{
          width: 60,
          height: 2,
          background: "linear-gradient(90deg, #3b82f6, #a855f7)",
          borderRadius: 2,
          margin: "2rem auto",
          opacity: 0.7,
        }}
      />

      {/* Coming Soon */}
      <h2
        style={{
          fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
          fontWeight: 400,
          margin: 0,
          color: "#e2e8f0",
          letterSpacing: "0.04em",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        Coming Soon
        <span style={{ color: "#6366f1", fontWeight: 700 }}>{dots}</span>
      </h2>

      <p
        style={{
          marginTop: "1.25rem",
          maxWidth: 480,
          textAlign: "center",
          fontSize: "clamp(0.9rem, 2vw, 1rem)",
          lineHeight: 1.8,
          color: "#94a3b8",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        We're putting the finishing touches on your go-to platform for
        Listening, Reading, Writing, and Speaking practice. Check back soon!
      </p>

      {/* Footer note */}
      <p
        style={{
          position: "absolute",
          bottom: "1.5rem",
          fontSize: "0.72rem",
          color: "#475569",
          textAlign: "center",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          letterSpacing: "0.04em",
          padding: "0 1rem",
        }}
      >
        © {new Date().getFullYear()} Azizi Education Online Services. All rights reserved. &nbsp;·&nbsp; CLBPrep is an
        independent study platform and is not affiliated with Paragon Testing Enterprises or CELPIP.
      </p>
    </div>
  );
}
