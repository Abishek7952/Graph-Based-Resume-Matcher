import React, { useState } from 'react';
import axios from 'axios';

function Recruiter() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [candidates, setCandidates] = useState([]);

  const handleSubmit = async () => {
    if (!title || !description) return alert("Please fill job title and description");

    try {
      // Replace with your backend API endpoint
      const res = await axios.post("http://localhost:5000/add_job", {
        title,
        description
      });
      setCandidates(res.data.recommended_candidates);
    } catch (err) {
      console.error(err);
      alert("Error submitting job");
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Recruiter Portal</h2>
      <div>
        <label>Job Title</label><br/>
        <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '300px' }}/>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label>Job Description</label><br/>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} style={{ width: '300px' }} />
      </div>
      <button onClick={handleSubmit} style={{ marginTop: '1rem' }}>Submit & Get Candidate Recommendations</button>

      <h3 style={{ marginTop: '2rem' }}>Recommended Candidates</h3>
      <ul>
        {candidates.map((c, idx) => (
          <li key={idx}>
            <b>{c.name}</b> — {c.matchedSkills} skill(s) matched
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Recruiter;
