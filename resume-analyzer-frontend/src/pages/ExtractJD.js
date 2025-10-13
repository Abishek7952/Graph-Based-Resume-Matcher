import React, { useState } from "react";
import API from "../api";

const ExtractJD = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [skills, setSkills] = useState([]);
  const [applicants, setApplicants] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return alert("Enter a job description.");

    const formData = new FormData();
    formData.append("job_description", jobDescription);

    try {
      const res = await API.post("/extract_jd_skills/", formData);
      setSkills(res.data.data.skills || []);
      setApplicants(res.data.applicants || []);
    } catch {
      alert("Error extracting JD or fetching applicants");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Recruiter Dashboard – Post JD</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          rows="6"
          cols="60"
          placeholder="Paste job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          required
        ></textarea>
        <br />
        <button type="submit">Extract Skills & Find Applicants</button>
      </form>

      {skills.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Extracted Skills</h3>
          <ul>
            {skills.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {applicants.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3>✅ Eligible Applicants</h3>
          <ul>
            {applicants.map((r, i) => (
              <li key={i}>
                <b>{r.resume_name || "Unnamed Candidate"}</b> — {r.matchedSkills} matched skills
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExtractJD;
