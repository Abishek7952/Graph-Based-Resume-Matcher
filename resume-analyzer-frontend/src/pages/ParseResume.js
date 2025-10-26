import React, { useState, useRef, useEffect } from "react";
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
  
  // 🚀 NEW: State for scoring mode toggle
  const [scoreMode, setScoreMode] = useState("expanded"); // 'expanded' or 'direct'
  const [recLoading, setRecLoading] = useState(false); // Separate loading for recs

  // 🚀 MODIFIED: This function can now be called to fetch/re-fetch recs
  const fetchRecommendations = async (resumeId, mode) => {
    if (!resumeId) return;
    setRecLoading(true);
    try {
      const recRes = await API.get("/recommend_jobs/", {
        params: { resume_id: resumeId, mode: mode },
      });
      const recs = recRes?.data?.recommendations ?? recRes?.data ?? [];
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (err) {
      console.warn("Could not fetch recommendations:", err);
    } finally {
      setRecLoading(false);
    }
  };

  // Fetch saved resume on mount if username exists in localStorage
  useEffect(() => {
    const fetchSaved = async () => {
      const username = localStorage.getItem("username");
      if (!username) return;

      try {
        // Fetch saved resume for this username
        const res = await API.get("/my_resume/", { params: { username } });
        if (res.data && res.data.found) {
          const data = res.data.data;
          setResumeData(data);
          // Fetch initial recommendations using the default scoreMode
          if (data && data._id) {
            fetchRecommendations(data._id, scoreMode);
          }
        }
      } catch (err) {
        console.error("Error fetching saved resume:", err);
      }
    };

    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

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

      // Attach username if available so backend can save the resume for that user
      const username = localStorage.getItem("username");
      if (username) formData.append("username", username);

      const res = await API.post("/parse_resume/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // /parse_resume/ ALWAYS returns expanded recommendations by default
      const parsed = res?.data?.data ?? res?.data ?? null;
      const recs = res?.data?.recommendations ?? res?.recommendations ?? [];

      setResumeData(parsed);
      setRecommendations(Array.isArray(recs) ? recs : []);
      // After upload, set mode to 'expanded'
      setScoreMode("expanded");
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

  // Delete saved resume from server for current user
  const deleteSavedResume = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      return alert("No username stored. Please login again.");
    }

    const ok = window.confirm("Are you sure you want to delete your saved resume from the server?");
    if (!ok) return;

    try {
      const res = await API.delete("/my_resume/", { params: { username } });
      if (res.data && res.data.status === "success") {
        alert("Saved resume deleted.");
        clearAll();
      } else {
        alert(res.data?.message || "Delete failed.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed. Check console.");
    }
  };

  // Logout handler
  const handleLogout = () => {
    // Keep UX simple - clear storage and redirect to login
    localStorage.clear();
    sessionStorage.clear();
    navigate("/"); // redirect to login
  };

  // 🚀 NEW: Handler for changing the score mode
  const handleScoreModeChange = (newMode) => {
    if (newMode === scoreMode) return; // No change
    setScoreMode(newMode);
    if (resumeData && resumeData._id) {
      fetchRecommendations(resumeData._id, newMode);
    }
  };

  // 🚀 NEW: Styles for the toggle buttons
  const toggleButtonStyle = (mode) => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #e6e9ee",
    background: scoreMode === mode ? THEME.primary : THEME.surface,
    color: scoreMode === mode ? THEME.surface : THEME.muted,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 12,
  });

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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
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

                {/* Delete saved resume button */}
                <button
                  type="button"
                  onClick={deleteSavedResume}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ffd6d6",
                    background: "#fff",
                    color: "#d12b2b",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Delete Saved Resume
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
            {/* 🚀 MODIFIED: Title/Toggle row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>🎯 Job Recommendations</h4>
              
              {/* 🚀 NEW LINK TO DEBUGGER */}
              <a href="/explore" target="_blank" rel="noopener noreferrer" style={{fontSize: 12}}>
                Skill Explorer
              </a>
              {/* 🚀 END NEW LINK */}
              
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  style={toggleButtonStyle('expanded')} 
                  onClick={() => handleScoreModeChange('expanded')}
                  disabled={recLoading}
                >
                  Expanded
                </button>
                <button 
                  style={toggleButtonStyle('direct')} 
                  onClick={() => handleScoreModeChange('direct')}
                  disabled={recLoading}
                >
                  Direct
                </button>
              </div>
            </div>
            <div style={{ color: THEME.muted, fontSize: 13, marginTop: 10 }}>
              {scoreMode === 'expanded'
                ? 'Showing expanded score (direct + related skills).'
                : 'Showing direct skill matches only.'}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {/* 🚀 NEW: Loading state for recommendations */}
            {recLoading ? (
              <div style={{
                background: THEME.surface,
                padding: 18,
                borderRadius: 12,
                textAlign: "center",
                color: THEME.muted
              }}>
                Loading recommendations...
              </div>
            ) : recommendations.length === 0 ? (
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
                <JobRecommendationCard 
                  key={`${scoreMode}-${job.job_id}`} // Use scoreMode and job_id in key to force re-render
                  job={job} 
                  theme={THEME} 
                  resume_id={resumeData?._id} 
                />
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ParseResume;