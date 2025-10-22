import React, { useState } from "react";

/**
 * ResumeDisplay (improved)
 * - Properly formats personal_information and education object entries.
 * - Handles both normalized and legacy parsed outputs.
 * - Avoids rendering raw objects (no React "Objects are not valid..." error).
 */

const ResumeDisplay = ({ data = {}, theme = null }) => {
  const THEME = theme ?? {
    primary: "#0f62fe",
    muted: "#6b7280",
    surface: "#fff",
  };

  const [expanded, setExpanded] = useState(false);

  // Safe JSON parse for strings that actually contain JSON
  const safeParse = (maybe) => {
    if (typeof maybe === "string") {
      try {
        const trimmed = maybe.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
          return JSON.parse(trimmed);
        }
      } catch (e) {
        // not parseable JSON, return original string
        return maybe;
      }
    }
    return maybe;
  };

  // Consolidate personal info from many possible shapes
  const extractFromPersonalInfo = (dataObj) => {
    // priority:
    // 1) top-level normalized: name, email, phone
    // 2) personal_information object with contact_details etc
    // 3) parsed_raw fallback search
    const out = { name: "", email: "", phone: "", location: "", other: {} };

    if (!dataObj || typeof dataObj !== "object") return out;

    // Top-level
    if (dataObj.name) out.name = dataObj.name;
    if (dataObj.email) out.email = dataObj.email;
    if (dataObj.phone) out.phone = dataObj.phone;

    // personal_information block (legacy parsers)
    const personal = dataObj.personal_information || dataObj.personalInfo || dataObj.personal || null;
    if (personal && typeof personal === "object") {
      if (!out.name) out.name = personal.name || personal.full_name || personal["Name"] || out.name;
      // contact_details might be object or stringified JSON
      let contact = personal.contact_details || personal.contact || personal.contacts || null;
      contact = safeParse(contact);
      if (contact && typeof contact === "object") {
        out.email = out.email || contact.email || contact.Email || contact.mail || out.email;
        out.phone = out.phone || contact.phone || contact.mobile || contact.telephone || out.phone;
        out.location = out.location || contact.location || contact.address || out.location;
      } else if (typeof contact === "string") {
        // try to extract email/phone from plain string
        if (!out.email) {
          const emailMatch = contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
          if (emailMatch) out.email = emailMatch[0];
        }
        if (!out.phone) {
          const phoneMatch = contact.match(/(\+?\d{7,15})/);
          if (phoneMatch) out.phone = phoneMatch[0];
        }
      }
      // also personal may contain summary etc
      out.other = { ...out.other, ...personal };
    }

    // parsed_raw fallback: try to find email/phone in parsed_raw if still missing
    if ((!out.email || !out.phone) && dataObj.parsed_raw && typeof dataObj.parsed_raw === "object") {
      const stringify = JSON.stringify(dataObj.parsed_raw);
      if (!out.email) {
        const emailMatch = stringify.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) out.email = emailMatch[0];
      }
      if (!out.phone) {
        const phoneMatch = stringify.match(/(\+?\d{7,15})/);
        if (phoneMatch) out.phone = phoneMatch[0];
      }
    }

    // last resort: top-level keys that might be nested differently
    if (!out.name) {
      out.name = dataObj.full_name || dataObj["Full Name"] || "";
    }

    return out;
  };

  // Render one education item, accepting many possible shapes
  const renderEducationItem = (edu) => {
    if (!edu) return null;

    // If it's a simple string
    if (typeof edu === "string") {
      return <div style={{ color: "#333" }}>{edu}</div>;
    }

    // If it's parseable stringified JSON, parse it
    if (typeof edu === "object" && Object.keys(edu).length === 0) {
      return <div style={{ color: "#333" }}>—</div>;
    }

    // possible keys to look for
    const degree = edu.degree || edu.title || edu.qualification || edu.program || edu.course || edu['Degree'] || "";
    const institution = edu.institution || edu.school || edu.college || edu.university || edu['Institution'] || "";
    const start = edu.start || edu.start_year || edu.from || edu.year || "";
    const end = edu.end || edu.end_year || edu.to || edu.graduation_year || "";
    const grade = edu.grade || edu.percentage || edu.cgpa || edu.score || "";
    const details = edu.details || edu.description || edu.notes || edu.highlights || edu.summary || "";

    // prepare subtitle
    const period = start && end ? `${start} — ${end}` : (start || end) ? (start || end) : "";
    const subtitleParts = [];
    if (institution) subtitleParts.push(institution);
    if (period) subtitleParts.push(period);
    if (grade) subtitleParts.push(grade);

    return (
      <div>
        <div style={{ fontWeight: 700 }}>{degree || institution || "Education"}</div>
        {subtitleParts.length > 0 && (
          <div style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{subtitleParts.join(" · ")}</div>
        )}
        {details && (
          <div style={{ marginTop: 8, color: "#222", fontSize: 13 }}>
            {typeof details === "string"
              ? details
              : Array.isArray(details)
              ? details.join(". ")
              : JSON.stringify(details)}
          </div>
        )}
      </div>
    );
  };


  // Build normalized fields for UI
  const personal = extractFromPersonalInfo(data);
  const summary =
    data.summary ||
    data.career_objective ||
    (data.personal_information && (data.personal_information.summary || data.personal_information.objective)) ||
    (data.parsed_raw && data.parsed_raw.summary) ||
    "";
  // Education can be under several keys
  let education = data.education || data.education_list || (data.parsed_raw && data.parsed_raw.education) || [];
  education = Array.isArray(education) ? education : [education];

  // Projects and experience
  let projects = data.projects || (data.parsed_raw && data.parsed_raw.projects) || [];
  projects = Array.isArray(projects) ? projects : [projects];
  let experience = data.professional_experience || data.work_experience || data.experience || (data.parsed_raw && data.parsed_raw.professional_experience) || [];
  experience = Array.isArray(experience) ? experience : [experience];

  // Skills flatten
  let skills = data.skills || (data.parsed_raw && data.parsed_raw.skills) || [];
  if (!Array.isArray(skills) && typeof skills === "object") {
    // flatten object values
    const temp = [];
    Object.values(skills).forEach((v) => {
      if (Array.isArray(v)) temp.push(...v);
      else if (typeof v === "string") temp.push(...v.split(",").map((s) => s.trim()).filter(Boolean));
    });
    skills = temp;
  }
  if (typeof skills === "string") skills = skills.split(",").map((s) => s.trim()).filter(Boolean);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      alert("Copied to clipboard");
    });
  };

  return (
    <div
      style={{
        background: THEME.surface,
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 6px 18px rgba(12,20,50,0.06)",
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          {/* Header with name */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0 }}>{personal.name || "Candidate"}</h3>
              <div style={{ color: THEME.muted, fontSize: 13 }}>
                {personal.email && <span>{personal.email} · </span>}
                {personal.phone && <span>{personal.phone} · </span>}
                {personal.location && <span>{personal.location}</span>}
              </div>
            </div>
            <div>
              <button
                onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
                style={{
                  background: "transparent",
                  border: "1px solid #e6e9ee",
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
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
                {expanded ? summary : summary.length > 220 ? `${summary.slice(0, 220)}...` : summary}
                {summary.length > 220 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    style={{ marginLeft: 8, background: "transparent", border: "none", color: THEME.primary, cursor: "pointer", fontWeight: 700 }}
                  >
                    {expanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Profile details (personal_information object shown clearly) */}
          <div style={{ marginTop: 18 }}>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Profile</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ width: 140, padding: "8px 10px", background: "#fbfdff", fontWeight: 700 }}>Name</td>
                  <td style={{ padding: "8px 10px" }}>{personal.name || "—"}</td>
                </tr>
                <tr>
                  <td style={{ width: 140, padding: "8px 10px", background: "#fbfdff", fontWeight: 700 }}>Email</td>
                  <td style={{ padding: "8px 10px" }}>{personal.email || "—"}</td>
                </tr>
                <tr>
                  <td style={{ width: 140, padding: "8px 10px", background: "#fbfdff", fontWeight: 700 }}>Phone</td>
                  <td style={{ padding: "8px 10px" }}>{personal.phone || "—"}</td>
                </tr>
                {personal.location && (
                  <tr>
                    <td style={{ width: 140, padding: "8px 10px", background: "#fbfdff", fontWeight: 700 }}>Location</td>
                    <td style={{ padding: "8px 10px" }}>{personal.location}</td>
                  </tr>
                )}
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
                    {renderEducationItem(edu)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: THEME.muted, marginBottom: 8 }}>Projects</div>
              <div style={{ display: "grid", gap: 12 }}>
                {projects.map((p, idx) => {
                  const title = p.title || p.name || p.project_name || "";
                  const desc = p.description || (p.details && (Array.isArray(p.details) ? p.details.join(". ") : p.details)) || "";
                  return (
                    <div key={idx} style={{ padding: 12, borderRadius: 8, background: "#fff" }}>
                      <div style={{ fontWeight: 700 }}>{title || `Project ${idx + 1}`}</div>
                      {desc ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {String(desc)
                            .split(". ")
                            .filter(Boolean)
                            .map((point, i2) => (
                              <li key={i2}>{point.trim().endsWith(".") ? point.trim() : point.trim() + "."}</li>
                            ))}
                        </ul>
                      ) : (
                        <div style={{ color: THEME.muted }}>No description available.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Skills and Work Experience */}
        <div style={{ width: 300 }}>
          {/* Skills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(skills.length ? skills : ["No skills found"]).map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: s ? THEME.primary : "#f1f5f9",
                    color: s ? "#fff" : THEME.muted,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {typeof s === "string" ? s : JSON.stringify(s)}
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <div style={{ color: THEME.muted, marginBottom: 8 }}>Work Experience</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {experience.length === 0 ? (
                <div style={{ color: THEME.muted, fontSize: 13 }}>No work experience extracted.</div>
              ) : (
                experience.map((item, i) => {
                  // item can be string or object
                  let title = "";
                  let company = "";
                  let dates = "";
                  let desc = "";

                  if (typeof item === "string") desc = item;
                  else if (typeof item === "object") {
                    title = item.title || item.role || item.position || "";
                    company = item.company || item.employer || item.organization || "";
                    dates = item.dates || item.duration || item.period || item.timeline || "";
                    // Try to find all possible keys for descriptions or responsibilities
                    if (Array.isArray(item.responsibilities))
                      desc = item.responsibilities.join(". ");
                    else if (typeof item.responsibilities === "string")
                      desc = item.responsibilities;
                    else if (item.description)
                      desc =
                        typeof item.description === "string"
                          ? item.description
                          : Array.isArray(item.description)
                          ? item.description.join(". ")
                          : JSON.stringify(item.description);
                    else if (item.summary)
                      desc = Array.isArray(item.summary)
                        ? item.summary.join(". ")
                        : String(item.summary);
                    else if (item.achievements)
                      desc = Array.isArray(item.achievements)
                        ? item.achievements.join(". ")
                        : String(item.achievements);
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "#fff",
                        boxShadow: "0 4px 12px rgba(12,20,50,0.05)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {title || "Job Title"}
                      </div>
                      <div style={{ color: THEME.muted, fontSize: 12 }}>
                        {company || "Company"} {dates ? `· ${dates}` : ""}
                      </div>
                      {desc ? (
                        <ul
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: "#111",
                            paddingLeft: 18,
                            lineHeight: 1.5,
                          }}
                        >
                          {String(desc)
                            .split(/[.•]\s+|[\n]/)
                            .filter(Boolean)
                            .map((point, idx2) => (
                              <li key={idx2}>
                                {point.trim().endsWith(".")
                                  ? point.trim()
                                  : point.trim() + "."}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div style={{ marginTop: 8, fontSize: 13, color: THEME.muted }}>
                          No description available.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* If there are other unknown keys, show them at the bottom for debugging */}
      {data.parsed_raw && (
        <div style={{ marginTop: 18 }}>
          <div style={{ color: THEME.muted, marginBottom: 8 }}>Parsed Raw (debug)</div>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fbfdff", padding: 12, borderRadius: 8, maxHeight: 220, overflow: "auto" }}>
            {JSON.stringify(data.parsed_raw || data, null, 2)}
          </pre>
        </div>
      )}
    </div>

  );
};

export default ResumeDisplay;
