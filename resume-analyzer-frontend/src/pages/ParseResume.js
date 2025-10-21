import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import ResumeDisplay from "./ResumeDisplay";
import JobRecommendationCard from "./JobRecommendationCard";

const THEME = {
  primary: "#0f62fe",
  surface: "#ffffff",
  muted: "#6b7280",
  bg: "#f4f6fb",
};

const ParseResume = () => {
  const navigate = useNavigate(); // for redirect
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  const onFileChange = (f) => {
    setErrorMsg("");
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== "application/pdf") {
      setErrorMsg("Only PDF resumes are accepted. Please upload a PDF file.");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    onFileChange(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!file) return setErrorMsg("Please upload your resume (PDF) first.");

    setLoading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await API.post("/parse_resume/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res?.data?.data ?? res?.data ?? null;
      const recs = res?.data?.recommendations ?? res?.recommendations ?? [];

      setResumeData(parsed);
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (err) {
      console.error("Upload/parse error:", err);
      setErrorMsg(
        err?.response?.data?.detail ??
          "Error uploading or parsing resume. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setResumeData(null);
    setRecommendations([]);
    setErrorMsg("");
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/"); // redirect to login
  };

  return (
    <div style={{ padding: 28, background: THEME.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, Arial", position: "relative" }}>
      
      {/* Logout button top-right */}
      <div style={{ position: "absolute", top: 20, right: 28 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #e6e9ee",
            background: "#fff",
            color: THEME.primary,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 420px", gap: 24 }}>
        
        {/* LEFT: Upload + Resume */}
        <div>
          <div style={{
            background: THEME.surface,
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(15,26,57,0.06)",
            marginBottom: 18
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Upload Resume</h2>
              <div style={{ color: THEME.muted, fontSize: 13 }}>Supported: PDF only</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  border: `2px dashed ${file ? THEME.primary : "#e6e9ee"}`,
                  borderRadius: 10,
                  padding: 22,
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "border-color .18s ease",
                }}
                onClick={() => inputRef.current?.click()}
                aria-label="Drop PDF here or click to upload"
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 8,
                  background: "linear-gradient(180deg, rgba(15,98,254,0.12), rgba(15,98,254,0.06))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, color: THEME.primary, fontSize: 18
                }}>
                  📄
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Drag & drop your PDF resume here</div>
                  <div style={{ color: THEME.muted, fontSize: 13, marginTop: 6 }}>
                    Or click to browse — we’ll extract skills, experience and suggest jobs.
                  </div>
                  {file && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>{file.name}</div>
                      <div style={{ color: THEME.muted, fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
                      <button type="button" onClick={() => onFileChange(null)} style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: "none",
                        color: THEME.primary,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}>Change</button>
                    </div>
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => onFileChange(e.target.files[0])}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: THEME.primary,
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(15,98,254,0.12)",
                  }}
                >
                  {loading ? "Parsing..." : "Upload & Parse"}
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #e6e9ee",
                    background: "#fff",
                    color: THEME.muted,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>

                <div style={{ marginLeft: "auto", color: THEME.muted, alignSelf: "center", fontSize: 13 }}>
                  Tip: keep CV concise — we match keywords to jobs.
                </div>
              </div>

              {errorMsg && <div style={{ marginTop: 12, color: "#b00020", fontWeight: 600 }}>{errorMsg}</div>}
            </form>
          </div>

          {/* Resume Display */}
          <div>
            {resumeData ? (
              <ResumeDisplay data={resumeData} theme={THEME} />
            ) : (
              <div style={{
                background: THEME.surface,
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 6px 20px rgba(15,26,57,0.04)",
                color: THEME.muted
              }}>
                <h3 style={{ marginTop: 0 }}>Resume Preview</h3>
                <div style={{ fontSize: 14 }}>
                  Upload and parse a resume to see extracted details, skills and work experience here.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Recommendations */}
        <aside>
          <div style={{
            background: THEME.surface,
            padding: 18,
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(15,26,57,0.04)",
            marginBottom: 16
          }}>
            <h4 style={{ margin: 0 }}>🎯 Job Recommendations</h4>
            <div style={{ color: THEME.muted, fontSize: 13, marginTop: 6 }}>
              Matches are scored from keywords in your resume. Click Apply to open job link.
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {recommendations.length === 0 ? (
              <div style={{
                background: THEME.surface,
                padding: 18,
                borderRadius: 12,
                textAlign: "center",
                color: THEME.muted
              }}>
                No recommendations yet. Upload a resume to receive matched jobs.
              </div>
            ) : (
              recommendations.map((job, i) => (
                <JobRecommendationCard key={i} job={job} theme={THEME} />
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ParseResume;
