import React, { useState } from "react";
import API from "../api";

const ParseResume = () => {
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
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload & Get Jobs</button>
      </form>

      {resumeData && (
        <div style={{ marginTop: "20px" }}>
          <h3>Extracted Resume Data:</h3>
          <pre>{JSON.stringify(resumeData, null, 2)}</pre>
        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3>🎯 Recommended Jobs</h3>
          <ul>
            {recommendations.map((job, idx) => (
              <li key={idx}>
                <b>{job.job_title || "Untitled Job"}</b> — {job.matchedSkills} matched skills
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ParseResume;
