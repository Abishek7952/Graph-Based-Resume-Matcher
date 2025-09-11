import React, { useState } from 'react';
import axios from 'axios';

function JobSeeker() {
  const [file, setFile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please upload a resume file");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      // Replace with your backend API endpoint
      const res = await axios.post("http://localhost:5000/upload_resume", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error(err);
      alert("Error uploading resume");
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Job Seeker Portal</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginLeft: '10px' }}>Upload & Get Recommendations</button>

      <h3 style={{ marginTop: '2rem' }}>Recommended Jobs</h3>
      <ul>
        {recommendations.map((job, idx) => (
          <li key={idx}>
            <b>{job.job_title}</b> — {job.matchedSkills} skill(s) matched
          </li>
        ))}
      </ul>
    </div>
  );
}

export default JobSeeker;
