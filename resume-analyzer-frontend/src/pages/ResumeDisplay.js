import React, { useState } from "react";

const ResumeDisplay = ({ data = {}, theme = null }) => {
  // fallback theme
  const THEME = theme ?? {
    primary: "#0f62fe",
    muted: "#6b7280",
    surface: "#fff",
  };

  const [expanded, setExpanded] = useState(false);

  // destructure safely
  const {
    name,
    email,
    phone,
    location,
    summary,
    skills = [],
    work_experience = [],
    education = [],
    ...other
  } = data;

  const shortSummary = summary && summary.length > 220 ? `${summary.slice(0, 220)}...` : summary;

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      // small visual confirmation could be added
      alert("Copied to clipboard");
    });
  };

  return (
    <div style={{
      background: THEME.surface,
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 6px 18px rgba(12,20,50,0.06)"
    }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <h3 style={{ margin: "0 0 6px 0" }}>{name ?? "Anonymous Candidate"}</h3>
              <div style={{ color: THEME.muted, fontSize: 13 }}>
                {email && <span>{email} · </span>}
                {phone && <span>{phone} · </span>}
                {location && <span>{location}</span>}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
                style={{
                  background: "transparent",
                  border: "1px solid #e6e9ee",
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13
                }}
                title="Copy parsed JSON"
              >
                Copy JSON
              </button>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: THEME.muted, marginBottom: 8 }}>Summary</div>
              <div style={{ fontSize: 14, color: "#111" }}>
                {expanded ? summary : shortSummary}
                {summary.length > 220 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                      marginLeft: 8,
                      background: "transparent",
                      border: "none",
                      color: THEME.primary,
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    {expanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Basic details table */}
          <div style={{ marginTop: 18 }}>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Profile</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {Object.entries({ email, phone, location, ...other }).filter(([_, v]) => v).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ width: 140, padding: "8px 10px", background: "#fbfdff", fontWeight: 700, textTransform: "capitalize" }}>{k.replace("_", " ")}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f1f3f6", color: "#333" }}>{Array.isArray(v) ? v.join(", ") : v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Education */}
          {education && education.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: THEME.muted, marginBottom: 8 }}>Education</div>
              <div style={{ display: "grid", gap: 10 }}>
                {education.map((edu, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 8, background: "#fbfdff" }}>
                    <div style={{ fontWeight: 700 }}>{edu.degree ?? edu.institution ?? "Education"}</div>
                    <div style={{ color: THEME.muted, fontSize: 13 }}>{edu.institution ?? edu.degree} · {edu.year ?? ""}</div>
                    {edu.details && <div style={{ marginTop: 8 }}>{edu.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Skills and timeline */}
        <div style={{ width: 260 }}>
          {/* Skills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(skills.length ? skills : ["No skills found"]).map((s, idx) => (
                <div key={idx} style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  background: s ? THEME.primary : "#f1f5f9",
                  color: s ? "#fff" : THEME.muted,
                  fontWeight: 600,
                  fontSize: 13
                }}>{s || "—"}</div>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          <div>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Work Experience</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {work_experience.length === 0 ? (
                <div style={{ color: THEME.muted, fontSize: 13 }}>No work experience extracted.</div>
              ) : (
                work_experience.map((job, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 8, background: "#fff", boxShadow: "0 4px 12px rgba(12,20,50,0.03)" }}>
                    <div style={{ fontWeight: 700 }}>{job.title ?? "Job Title"}</div>
                    <div style={{ color: THEME.muted, fontSize: 12 }}>{job.company ?? "Company"} · {job.dates ?? ""}</div>
                    {job.description && <div style={{ marginTop: 8, fontSize: 13 }}>{job.description.slice(0, 160)}{job.description.length > 160 ? "..." : ""}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeDisplay;
