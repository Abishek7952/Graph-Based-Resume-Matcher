import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ParseResume from "./pages/ParseResume";
import ExtractJD from "./pages/ExtractJD";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/parse_resume" element={<ParseResume />} />
        <Route path="/extract_jd_skills" element={<ExtractJD />} />
      </Routes>
    </Router>
  );
}

export default App;
