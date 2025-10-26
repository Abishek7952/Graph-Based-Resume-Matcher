import React, { useState } from "react";
import API from "../api"; // 🚀 NEW: Import API helper

const JobRecommendationCard = ({
  job = {},
  resume_id = null, // 🚀 NEW: Need resume_id for explainability
  theme = null,
}) => {
  const THEME = theme ?? {
    primary: "#2563eb",
    muted: "#6b7280",
    surface: "#ffffff",
  };

  const [isExplaining, setIsExplaining] = useState(false); // 🚀 NEW: State for loading explanation

  const {
    job_id, // 🚀 NEW: Get job_id for API call
    job_title,
    company_portal_link,
    skills = [],
    weightedScore = 0, // 🚀 NEW: Use new weighted score
    directScore = 0, // 🚀 NEW: Use new direct score
    relatedScore = 0, // 🚀 NEW: Use new related score
  } = job;

  const title = job_title || "Unknown Job";
  const portalLink = company_portal_link || "";

  // Copy link handler (unchanged)
  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (portalLink) {
      navigator.clipboard.writeText(portalLink);
      alert("✅ Job link copied to clipboard!");
    } else {
      alert("⚠️ No link available to copy.");
    }
  };

  // Open job link handler (unchanged)
  const handleViewJob = (e) => {
    e.stopPropagation();
    if (portalLink) {
      window.open(portalLink, "_blank", "noopener,noreferrer");
    } else {
      alert("⚠️ No link available to open.");
    }
  };

  // 🚀 NEW: Handler for the "Why am I a match?" button
  const handleExplain = async (e) => {
    e.stopPropagation();
    if (!resume_id || !job_id) {
      alert("⚠️ Cannot explain match: Missing resume_id or job_id.");
      return;
    }
    setIsExplaining(true);
    try {
      const res = await API.get("/explain_match/", {
        params: { resume_id, job_id },
      });

      const explanations = res.data?.explanations || [];
      if (explanations.length > 0) {
        // Format explanations for a clean alert (strips markdown)
        const explanationText =
          "✨ Why you're a match:\n\n• " +
          explanations
            .map((exp) => exp.replace(/\*\*/g, "")) // Remove markdown
            .join("\n• ");
        alert(explanationText);
      } else {
        alert("ℹ️ No specific skill connection paths found.");
      }
    } catch (err) {
      console.error("Explain error:", err);
      alert("❌ Could not fetch match explanation.");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: THEME.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20, // This is handled by grid gap in parent, but keeping it
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
      }}
    >
      {/* Title and Matches */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start", // Align to top
          marginBottom: 10,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h3>
          {/* 🚀 NEW: Score breakdown */}
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            ({directScore} direct, {relatedScore} related)
          </div>
        </div>
        <div
          style={{
            background: "#e0e7ff",
            color: THEME.primary,
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "13px",
            fontWeight: "600",
            flexShrink: 0, // Prevent shrinking
          }}
        >
          {/* 🚀 NEW: Display weighted score */}
          {weightedScore.toFixed(1)} Score
        </div>
      </div>

      {/* Skills List (unchanged) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 15,
        }}
      >
        {skills && skills.length > 0 ? (
          skills.map((s, i) => (
            <span
              key={i}
              style={{
                backgroundColor: "#eff6ff",
                color: THEME.primary,
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {s}
            </span>
          ))
        ) : (
          <p style={{ color: THEME.muted, fontSize: "13px", margin: 0 }}>
            No listed skills
          </p>
        )}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap", // Allow wrapping on small screens
          gap: 10,
          marginTop: 10,
          alignItems: "center",
        }}
      >
        <button
          onClick={handleViewJob}
          style={{
            backgroundColor: portalLink ? THEME.primary : "#e5e7eb",
            color: portalLink ? "#fff" : THEME.muted,
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: portalLink ? "pointer" : "not-allowed",
            transition: "0.2s",
          }}
          disabled={!portalLink}
        >
          View Job
        </button>

        <button
          onClick={handleCopyLink}
          style={{
            backgroundColor: "#fff",
            color: THEME.primary,
            border: "1px solid #d1d5db",
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          Copy Link
        </button>

        {/* 🚀 NEW: "Why am I a match?" Button */}
        <button
          onClick={handleExplain}
          style={{
            backgroundColor: "#fff",
            color: "#374151",
            border: "1px solid #d1d5db",
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
            opacity: isExplaining || !resume_id ? 0.6 : 1,
          }}
          disabled={isExplaining || !resume_id}
        >
          {isExplaining ? "Loading..." : "Why am I a match?"}
        </button>
      </div>
    </div>
  );
};

export default JobRecommendationCard;