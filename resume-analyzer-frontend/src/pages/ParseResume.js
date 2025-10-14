import React, { useState } from "react";
import API from "../api";
import ResumeDisplay from "./ResumeDisplay"; 
import JobRecommendationCard from "./JobRecommendationCard"; // 👈 1. IMPORT THE NEW COMPONENT

const ParseResume = () => {
  // ... (your existing state and handleSubmit function remain the same)
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please upload your resume (PDF).");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/parse_resume/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResumeData(res.data.data);
      setRecommendations(res.data.recommendations || []);
    } catch {
      alert("Error uploading or parsing resume");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>User Dashboard – Upload Resume</h2>
      {/* ... (your form remains the same) ... */}
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload & Get Jobs</button>
      </form>
      
      {resumeData && <ResumeDisplay data={resumeData} />}
      
      {/* ▼▼▼ 2. REPLACE THE OLD RECOMMENDATIONS LIST WITH THIS ▼▼▼ */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3>🎯 Recommended Jobs</h3>
          <div>
            {recommendations.map((job, idx) => (
              <JobRecommendationCard key={idx} job={job} />
            ))}
          </div>
        </div>
      )}
      {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}
    </div>
  );
};

export default ParseResume;