import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await API.post("/signup/", formData, { validateStatus: () => true });

      if (res.status === 200) {
        alert("✅ Signup successful! You can now log in.");
        navigate("/");
      } else {
        alert(res.data?.message || "❌ Signup failed. Try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("❌ Signup failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ marginBottom: "20px" }}>Signup</h2>
      <form onSubmit={handleSignup} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Choose a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Signup"}
        </button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Already have an account?{" "}
        <a href="/" style={{ color: "#007bff", textDecoration: "none" }}>
          Login
        </a>
      </p>
    </div>
  );
};

// Inline styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#f7f7f7",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "300px",
  },
  input: {
    margin: "10px 0",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
};

export default Signup;
