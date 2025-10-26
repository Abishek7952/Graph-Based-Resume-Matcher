import React, { useState } from 'react';
import API from '../api'; // Adjust the path if necessary

const THEME = {
  primary: "#0f62fe",
  surface: "#ffffff",
  muted: "#6b7280",
  bg: "#f4f6fb",
};

const SkillGraphExplorer = () => {
  const [skill, setSkill] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!skill.trim()) {
      setError("Please enter a skill to explore.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await API.get("/ontology/explore", {
        params: { skill: skill.trim() },
      });
      setResults(res.data);
    } catch (err) {
      console.error("Explore error:", err);
      setError("Failed to fetch skill relations. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  const getRelationStyle = (type) => ({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 600,
    background: type === 'IS_A' ? '#e0e7ff' : '#e0f2f1',
    color: type === 'IS_A' ? '#4338ca' : '#00796b',
    marginRight: '10px',
  });

  return (
    <div style={{ padding: 40, background: THEME.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, Arial" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: THEME.surface, padding: 24, borderRadius: 12, boxShadow: "0 6px 20px rgba(15,26,57,0.06)" }}>
        <h2 style={{ margin: "0 0 20px 0" }}>🕵️‍♂️ Skill Graph Explorer</h2>
        <p style={{ color: THEME.muted, fontSize: 14, margin: "0 0 20px 0" }}>
          Type a skill (e.g., "Python", "Flask", "React.js") to see its connections in the Neo4j database. 
          This tool helps verify that the skill ontology is being built correctly.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Enter skill name (e.g., Python)"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #e6e9ee',
              fontSize: 16,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: THEME.primary,
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Searching..." : "Explore"}
          </button>
        </form>

        {error && <div style={{ color: "#b00020", fontWeight: 600, marginBottom: 20 }}>{error}</div>}

        {results && (
          <div>
            <h3 style={{ borderBottom: '1px solid #e6e9ee', paddingBottom: 8 }}>
              Relations for: <span style={{ color: THEME.primary }}>{results.skill}</span>
            </h3>
            {results.relations.length === 0 ? (
              <div style={{ color: THEME.muted }}>No relations found. This skill may not be processed yet or has no connections.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {results.relations.map((rel, i) => (
                  <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f4f6fb', display: 'flex', alignItems: 'center' }}>
                    <span style={getRelationStyle(rel.type)}>{rel.type.replace('_', ' ')}</span>
                    <span style={{ fontSize: 16, fontWeight: 500 }}>{rel.skill}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillGraphExplorer;