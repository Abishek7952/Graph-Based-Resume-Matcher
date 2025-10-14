import React from "react";

const ResumeDisplay = ({ data }) => {
  // Don't render anything if there's no data
  if (!data) {
    return null;
  }

  // 👇 Destructure skills AND work_experience to handle them separately
  const { skills, work_experience, ...details } = data;

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Extracted Resume Data</h3>
      
      {/* Table for basic details */}
      <table style={styles.table}>
        <tbody>
          {Object.entries(details).map(([key, value]) => (
            <tr key={key}>
              <td style={styles.keyCell}>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
              {/* Ensure the value is not an object or array before rendering */}
              <td style={styles.valueCell}>{typeof value === 'object' ? JSON.stringify(value) : value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Special section for work experience */}
      {work_experience && work_experience.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Work Experience</h4>
          {work_experience.map((job, index) => (
            <div key={index} style={styles.experienceItem}>
              <h5 style={styles.jobTitle}>{job.title || 'N/A'} at {job.company || 'N/A'}</h5>
              <p style={styles.jobDates}>{job.dates}</p>
              <p style={styles.jobDescription}>{job.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Special section for skills */}
      {skills && skills.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Skills</h4>
          <div style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <span key={index} style={styles.skillPill}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 👇 Updated styles to include formatting for work experience
const styles = {
  container: {
    marginTop: "20px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    marginBottom: "15px",
    borderBottom: "2px solid #eee",
    paddingBottom: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  keyCell: {
    fontWeight: "bold",
    padding: "10px",
    textAlign: "left",
    width: "150px",
    backgroundColor: "#efefef",
    verticalAlign: "top",
  },
  valueCell: {
    padding: "10px",
    textAlign: "left",
    borderBottom: "1px solid #eee",
  },
  section: {
    marginTop: "20px",
  },
  sectionHeader: {
    marginBottom: "10px",
    borderBottom: "1px solid #ccc",
    paddingBottom: "5px",
  },
  skillsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  skillPill: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "5px 12px",
    borderRadius: "16px",
    fontSize: "14px",
  },
  experienceItem: {
    marginBottom: "15px",
  },
  jobTitle: {
    margin: "0 0 5px 0",
    fontSize: "1.1em",
  },
  jobDates: {
    margin: "0 0 5px 0",
    color: "#666",
    fontSize: "0.9em",
  },
  jobDescription: {
    margin: "0",
    color: "#333",
  },
};

export default ResumeDisplay;