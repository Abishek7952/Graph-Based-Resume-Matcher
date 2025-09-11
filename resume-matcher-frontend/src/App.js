import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import JobSeeker from './pages/JobSeeker';
import Recruiter from './pages/Recruiter';

function App() {
  return (
    <div>
      <nav style={{ padding: '1rem', backgroundColor: '#f5f5f5' }}>
        <Link to="/" style={{ marginRight: '20px' }}>Job Seeker</Link>
        <Link to="/recruiter">Recruiter</Link>
      </nav>

      <Routes>
        <Route path="/" element={<JobSeeker />} />
        <Route path="/recruiter" element={<Recruiter />} />
      </Routes>
    </div>
  );
}

export default App;
