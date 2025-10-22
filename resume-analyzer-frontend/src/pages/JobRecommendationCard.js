import React from "react";

const JobRecommendationCard = ({ job = {}, theme = null }) => {
  const THEME = theme ?? {
    primary: "#0f62fe",
    muted: "#6b7280",
    surface: "#fff",
  };

  const {
    job_title,
    company_name,
    description,
    matchedSkills,
    url
  } = job;

  // parse a compact role/company if job_title contains bracketed company, fallback to props
  const parsedCompany = company_name || (job_title && (job_title.match(/\[(.*?)\]/)?.[1])) || "Company";
  // role is a cleaned title
  const parsedRole = (job_title || "").replace(/\[.*?\]/, "").trim() || "Role";

  // matchedSkills may be a string or array or number — normalize to array
  let skillsArray = [];
  if (Array.isArray(matchedSkills)) skillsArray = matchedSkills;
  else if (typeof matchedSkills === "string") skillsArray = matchedSkills.split(",").map(s => s.trim()).filter(Boolean);
  else if (typeof matchedSkills === "number") skillsArray = [`${matchedSkills} matched`];

  return (
    <div style={{
      background: THEME.surface,
      borderRadius: 12,
      padding: 14,
      boxShadow: "0 6px 18px rgba(8,18,60,0.04)",
      transition: "transform .16s ease, box-shadow .16s ease",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      cursor: url ? "pointer" : "default"
    }}
      onClick={() => { if (url) window.open(url, "_blank"); }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(8,18,60,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(8,18,60,0.04)"; }}
    >
      {/* Logo / avatar */}
      <div style={{
        minWidth: 52,
        height: 52,
        borderRadius: 10,
        background: "linear-gradient(180deg, rgba(15,98,254,0.12), rgba(15,98,254,0.04))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        color: THEME.primary,
        fontSize: 18
      }}>
        {parsedCompany?.charAt(0) ?? "C"}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800 }}>{parsedRole}</div>
            <div style={{ color: THEME.muted, fontSize: 13 }}>{parsedCompany}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            {/* matched count */}
            <div style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f1f5ff",
              color: THEME.primary,
              fontWeight: 700,
              fontSize: 13
            }}>
              {skillsArray.length} match{skillsArray.length !== 1 ? "es" : ""}
            </div>
          </div>
        </div>

        {description && <div style={{ marginTop: 8, color: "#222", fontSize: 13, lineHeight: 1.3 }}>{description.length > 160 ? `${description.slice(0, 160)}...` : description}</div>}

        {/* skills */}
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {skillsArray.length ? skillsArray.map((s, idx) => (
            <div key={idx} style={{
              padding: "6px 8px",
              borderRadius: 999,
              background: "#f7f9ff",
              color: THEME.primary,
              fontWeight: 700,
              fontSize: 12
            }}>{s}</div>
          )) : <div style={{ color: THEME.muted, fontSize: 13 }}>No matched skills</div>}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              style={{
                padding: "8px 12px",
                background: THEME.primary,
                color: "#fff",
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 8px 20px rgba(15,98,254,0.12)"
              }}>
              Apply
            </a>
          ) : (
            <button disabled style={{
              padding: "8px 12px",
              background: "#eef2ff",
              color: THEME.primary,
              borderRadius: 10,
              fontWeight: 700,
              border: "none"
            }}>No link</button>
          )}

          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(url ?? ""); alert("Job link copied"); }}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #eef2ff",
              background: "#fff",
              color: THEME.primary,
              fontWeight: 700,
              cursor: "pointer"
            }}>
            Copy Link
          </button>

          <div style={{ marginLeft: "auto", color: "#8892a6", fontSize: 12 }}>
            {job.posted_date ? job.posted_date : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobRecommendationCard;
