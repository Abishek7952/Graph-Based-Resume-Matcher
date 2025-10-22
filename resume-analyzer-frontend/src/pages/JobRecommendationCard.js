import React from "react";

const JobRecommendationCard = ({ job = {}, theme = null }) => {
  const THEME = theme ?? {
    primary: "#2563eb",
    muted: "#6b7280",
    surface: "#ffffff",
  };

  const {
    job_title,
    company_portal_link,
    skills = [],
    matchedSkills = 0,
  } = job;

  const title = job_title || "Unknown Job";
  const portalLink = company_portal_link || "";

  // Copy link handler
  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (portalLink) {
      navigator.clipboard.writeText(portalLink);
      alert("✅ Job link copied to clipboard!");
    } else {
      alert("⚠️ No link available to copy.");
    }
  };

  // Open job link handler
  const handleViewJob = (e) => {
    e.stopPropagation();
    if (portalLink) {
      window.open(portalLink, "_blank", "noopener,noreferrer");
    } else {
      alert("⚠️ No link available to open.");
    }
  };

  return (
    <div
      style={{
        backgroundColor: THEME.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
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
          alignItems: "center",
          marginBottom: 10,
        }}
      >
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
        <div
          style={{
            background: "#e0e7ff",
            color: THEME.primary,
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {matchedSkills} matches
        </div>
      </div>

      {/* Skills List */}
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
      </div>
    </div>
  );
};

export default JobRecommendationCard;
