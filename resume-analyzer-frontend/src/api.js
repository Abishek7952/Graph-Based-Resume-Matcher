import axios from "axios";

// Configure base URL for backend
const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export default API;
