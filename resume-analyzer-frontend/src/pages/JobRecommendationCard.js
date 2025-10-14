import React from "react";

// Updated function to also parse a one-line description
const parseJobDetails = (description) => {
  let role = "";
  let company = "A Dynamic Company";
  let oneLiner = "Seeking a candidate to design, develop, and deploy innovative software solutions."; // A good default

  // Find Role
  const roleMatch = description.match(/seeking a skilled (.*?)\s/i);
  if (roleMatch && roleMatch[1]) {
    role = roleMatch[1];
  }

  // Find Company
  const companyMatch = description.match(/\[(.*?)\]/);
  if (companyMatch && companyMatch[1]) {
    company = companyMatch[1].replace("Your Company Name", "Stealth Startup");
  }

  // Find the first sentence of the actual description
  const oneLinerMatch = description.match(/is seeking.*?\./i);
  if (oneLinerMatch) {
    oneLiner = oneLinerMatch[0];
  }

  return { role, company, oneLiner };
};

const JobRecommendationCard = ({ job }) => {
  // Use the updated parsing function
  const { role, company, oneLiner } = parseJobDetails(job.job_title);

  return (
    // The new JSX structure with key-value pairs
    <div style={styles.card}>
      <div style={styles.detailRow}>
        <span style={styles.label}>Company Name:</span>
        <span style={styles.value}>{company}</span>
      </div>
      <div style={styles.detailRow}>
        <span style={styles.label}>Job Title:</span>
        <span style={styles.value}>{role}</span>
      </div>
      <div style={styles.detailRow}>
        <span style={styles.label}>Description:</span>
        <span style={styles.value}>{oneLiner}</span>
      </div>
      <div style={styles.detailRow}>
        <span style={styles.label}>Skills Matched:</span>
        <span style={styles.matchPill}>✅ {job.matchedSkills}</span>
      </div>
    </div>
  );
};

// Updated styles for the new layout
const styles = {
  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "10px", // Space between each row
  },
  detailRow: {
    display: "flex",
    alignItems: "flex-start",
  },
  label: {
    fontWeight: "bold",
    color: "#333",
    width: "150px", // Fixed width for alignment
    flexShrink: 0,
  },
  value: {
    color: "#555",
  },
  matchPill: {
    backgroundColor: "#e7f3ff",
    color: "#007bff",
    padding: "4px 10px",
    borderRadius: "16px",
    fontWeight: "bold",
    fontSize: "14px",
  },
};

export default JobRecommendationCard;