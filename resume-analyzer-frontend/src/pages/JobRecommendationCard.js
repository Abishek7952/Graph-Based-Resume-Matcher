import React from "react";

const JobRecommendationCard = ({ job = {}, theme = null }) => {
  const THEME = theme ?? {
    primary: "#0f62fe",
    muted: "#6b7280",
    surface: "#fff",
  };

  // Extract all possible link fields safely
  const title = job.job_title || "Untitled Role";
  const portalLink =
    (job.company_portal_link &&
      typeof job.company_portal_link === "string" &&
      job.company_portal_link.trim() !== "" &&
      job.company_portal_link.trim()) ||
    job.url ||
    "";

  const desc = job.job_description || "";
  const skillsArray = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === "string"
    ? job.skills.split(",").map((s) => s.trim())
    : [];

  console.log("🔗 Job data received:", job);

  return (
    <div
      style={{
        background: THEME.surface,
        borderRadius: 12,
        padding: 18,
        boxShadow: "0 6px 18px rgba(8,18,60,0.04)",
        transition: "transform .16s ease, box-shadow .16s ease",
        cursor: portalLink ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onClick={() => {
        if (portalLink) window.open(portalLink, "_blank");
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 12px 28px rgba(8,18,60,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
        e.currentTarget.style.boxShadow =
          "0 6px 18px rgba(8,18,60,0.04)";
      }}
    >
      {/* Job Title */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1a202c" }}>
            {title}
          </div>
        </div>
        <div
          style={{
            background: "#f1f5ff",
            color: THEME.primary,
            padding: "6px 10px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {skillsArray.length} Skill{skillsArray.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Job Description */}
      {desc && (
        <div
          style={{
            color: THEME.muted,
            fontSize: 14,
            lineHeight: 1.4,
            marginTop: 4,
          }}
        >
          {desc.length > 200 ? `${desc.slice(0, 200)}...` : desc}
        </div>
      )}

      {/* Skills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        {skillsArray.length > 0 ? (
          skillsArray.map((s, i) => (
            <div
              key={i}
              style={{
                background: "#eef2ff",
                color: THEME.primary,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {s}
            </div>
          ))
        ) : (
          <div style={{ color: THEME.muted, fontSize: 13 }}>
            No skills listed
          </div>
        )}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 14,
          alignItems: "center",
        }}
      >
        {portalLink ? (
          <>
            <a
              href={portalLink}
              target="_blank"
              rel="noreferrer"
              style={{
                background: THEME.primary,
                color: "#fff",
                borderRadius: 10,
                padding: "8px 14px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 14px rgba(15,98,254,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              View Job
            </a>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard
                  .writeText(portalLink)
                  .then(() => alert("✅ Job link copied to clipboard!"))
                  .catch(() => alert("⚠️ Could not copy link."));
              }}
              style={{
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                color: THEME.primary,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Copy Link
            </button>
          </>
        ) : (
          <button
            disabled
            style={{
              background: "#edf2f7",
              color: THEME.muted,
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontWeight: 600,
              opacity: 0.6,
              cursor: "not-allowed",
            }}
          >
            No Link Available
          </button>
        )}
      </div>
    </div>
  );
};

export default JobRecommendationCard;
