import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const ExtractJD = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState("");
  const [companyLink, setCompanyLink] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skills, setSkills] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim() || !jobTitle.trim()) return;

    setLoading(true);
    setSkills([]);
    setApplicants([]);

    const formData = new FormData();
    formData.append("job_title", jobTitle);
    formData.append("company_portal_link", companyLink);
    formData.append("job_description", jobDescription);

    try {
      const res = await API.post("/extract_jd_skills/", formData);
      setSkills(res.data.data.skills || []);
      setApplicants(res.data.applicants || []);
    } catch {
      alert("An error occurred. Please check the backend connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>TalentGraph</h1>
        <button onClick={handleLogout} style={styles.logout}>Logout</button>
      </header>

      <div style={styles.container}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter Job Title"
            style={styles.input}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Enter Company Portal Link"
            style={styles.input}
            value={companyLink}
            onChange={(e) => setCompanyLink(e.target.value)}
          />
          <textarea
            style={styles.textarea}
            rows="10"
            placeholder="Paste Job Description..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Find Top Candidates"}
          </button>
        </form>

        {skills.length > 0 && (
          <div>
            <h3>Extracted Skills</h3>
            {skills.map((s, i) => (
              <span key={i} style={styles.skillPill}>{s}</span>
            ))}
          </div>
        )}

        {applicants.length > 0 && (
          <div>
            <h3>Top Matched Applicants</h3>
            {applicants.map((r, i) => (
              <div key={i} style={styles.applicantCard}>
                <b>{r.resume_name}</b>
                <p>{r.email}</p>
                <p>{r.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { fontFamily: "Poppins, sans-serif", background: "#F7F8FC", minHeight: "100vh", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" },
  logout: { background: "#e53e3e", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer" },
  container: { background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #CBD5E0", marginBottom: "15px" },
  textarea: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #CBD5E0", marginBottom: "15px" },
  button: { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%" },
  skillPill: { background: "#EDF2F7", color: "#4A5568", padding: "6px 12px", borderRadius: "12px", margin: "5px", display: "inline-block" },
  applicantCard: { border: "1px solid #E2E8F0", padding: "15px", borderRadius: "10px", marginBottom: "10px" }
};

export default ExtractJD;
