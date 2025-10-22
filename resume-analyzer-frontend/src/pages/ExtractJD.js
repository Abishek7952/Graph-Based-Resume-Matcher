import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

// Helper component for SVG Icons to keep the main component clean
const Icon = ({ path, color = "currentColor", size = "24px" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d={path} />
  </svg>
);

const Icons = {
  briefcase: "M10 2a2 2 0 00-2 2v2H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2h-4zM8 6h8v2H8V6zm2 4v2h4v-2h-4z",
  skills: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  candidates: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  email: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.02.74-.25 1.02l-2.2 2.2z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
};

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
    if (!jobDescription.trim()) return;

    setLoading(true);
    setSkills([]);
    setApplicants([]);

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    formData.append("job_title", jobTitle);
    formData.append("company_portal_link", companyLink);
    

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

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/"); // redirect to login
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <Icon path={Icons.briefcase} color="#fff" />
          <h1>TalentGraph</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <p style={styles.tagline}>Intelligent Resume Matching</p>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #fff",
              backgroundColor: "transparent",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.mainContent}>
          {/* Left Column: Form */}
          <div style={styles.formContainer}>
            <div style={styles.subtitleWrapper}>
              <Icon path={Icons.briefcase} color="#4A5568" />
              <h3 style={styles.subtitle}>Post Job Description</h3>
            </div>
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
                required
              />

              <textarea
                style={styles.textarea}
                rows="12"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />

              <button style={styles.button} type="submit" disabled={loading}>
                {loading ? "Analyzing..." : (
                  <>
                    <Icon path={Icons.search} color="#fff" size="20px" />
                    <span>Find Top Candidates</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Results */}
          <div style={styles.resultsContainer}>
            {loading && (
              <div style={styles.placeholder}>
                <div style={styles.spinner}></div>
                <p>Scanning candidates...</p>
              </div>
            )}

            {!loading && skills.length === 0 && applicants.length === 0 && (
              <div style={styles.placeholder}>
                <p style={styles.placeholderText}>Your matched candidates will appear here.</p>
              </div>
            )}

            {skills.length > 0 && (
              <div style={styles.section}>
                <div style={styles.subtitleWrapper}>
                  <Icon path={Icons.skills} color="#4A5568" />
                  <h3 style={styles.subtitle}>Key Skills Identified</h3>
                </div>
                <div style={styles.skillsContainer}>
                  {skills.map((s, i) => (
                    <span key={i} style={styles.skillPill}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {applicants.length > 0 && (
              <div style={styles.section}>
                <div style={styles.subtitleWrapper}>
                  <Icon path={Icons.candidates} color="#4A5568" />
                  <h3 style={styles.subtitle}>Top Matched Applicants</h3>
                </div>
                <div>
                  {applicants.map((r, i) => (
                    <div key={i} style={styles.applicantCard}>
                      <div style={styles.applicantHeader}>
                        <b style={styles.applicantName}>{r.resume_name || "Unnamed Candidate"}</b>
                        <a 
                          href={`${API.defaults.baseURL}/download_resume/${r.file_id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.downloadButton}
                        >
                          <Icon path={Icons.download} color="#fff" size="18px" />
                          <span>Resume</span>
                        </a>
                      </div>
                      <div style={styles.contactInfo}>
                        <span><Icon path={Icons.email} size="16px" color="#555" /> {r.email || 'N/A'}</span>
                        <span><Icon path={Icons.phone} size="16px" color="#555" /> {r.phone || 'N/A'}</span>
                      </div>
                      <p style={styles.summary}>
                        {(r.summary || 'No summary provided.').substring(0, 250)}
                        {r.summary && r.summary.length > 250 ? '...' : ''}
                      </p>
                      <div style={styles.matchPill}>
                        ✨ {r.matchedSkills} Skills Matched
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};





// Professional & Aesthetic Styles
const styles = {
    page: {
        backgroundColor: '#F7F8FC',
        minHeight: '100vh',
        fontFamily: "'Poppins', sans-serif", // A modern, friendly font
    },
    header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    tagline: {
        margin: 0,
        fontSize: '1.1em',
        opacity: 0.8,
    },
    container: {
        maxWidth: '1400px',
        margin: '40px auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        padding: '40px',
    },
    mainContent: {
        display: 'flex',
        gap: '40px',
    },
    formContainer: {
        flex: 1.5,
    },
    resultsContainer: {
        flex: 2,
        borderLeft: '1px solid #E2E8F0',
        paddingLeft: '40px',
        minHeight: '400px',
    },
    subtitleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#4A5568',
        marginBottom: '20px',
    },
    subtitle: {
        fontSize: '1.5em',
        margin: 0,
    },
    textarea: {
        width: '100%',
        padding: '15px',
        border: '1px solid #CBD5E0',
        borderRadius: '8px',
        fontSize: '16px',
        fontFamily: 'inherit',
        resize: 'vertical',
        marginBottom: '20px',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '15px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    section: {
        marginBottom: '30px',
    },
    skillsContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
    },
    skillPill: {
        background: 'linear-gradient(135deg, #EDF2F7, #E2E8F0)',
        color: '#4A5568',
        padding: '6px 14px',
        borderRadius: '16px',
        fontSize: '14px',
        fontWeight: '500',
    },
    applicantCard: {
        padding: '20px',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        marginBottom: '15px',
        backgroundColor: '#fff',
        transition: 'transform 0.3s, box-shadow 0.3s',
    },
    applicantHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    applicantName: {
        fontSize: '1.3em',
        fontWeight: '600',
        color: '#2D3748',
    },
    contactInfo: {
        display: 'flex',
        gap: '25px',
        color: '#718096',
        marginBottom: '12px',
        alignItems: 'center',
    },
    summary: {
        margin: '0 0 15px 0',
        color: '#4A5568',
        fontSize: '0.95em',
        lineHeight: '1.6',
        borderLeft: '3px solid #667eea',
        paddingLeft: '12px',
    },
    matchPill: {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #C6F6D5, #B2F5EA)',
        color: '#2F855A',
        padding: '6px 12px',
        borderRadius: '16px',
        fontWeight: 'bold',
        fontSize: '13px',
    },
    downloadButton: {
        textDecoration: 'none',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #48BB78, #38A169)',
        color: 'white',
        borderRadius: '8px',
        fontWeight: 'bold',
        transition: 'transform 0.2s, box-shadow 0.2s',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    placeholder: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A0AEC0',
        fontSize: '1.2em',
        backgroundColor: '#F7F8FC',
        borderRadius: '12px',
        textAlign: 'center',
    },
    spinner: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        borderLeftColor: '#667eea',
        animation: 'spin 1s ease infinite',
        marginBottom: '15px',
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      border: "1px solid #CBD5E0",
      borderRadius: "8px",
      fontSize: "16px",
      marginBottom: "15px",
      fontFamily: "inherit",
      transition: "border-color 0.3s, box-shadow 0.3s",
      boxSizing: "border-box",
    },
    
};

export default ExtractJD;