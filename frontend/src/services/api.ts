import axios from 'axios';

// In development, use relative paths to leverage Vite proxy
// In production, use the full API URL
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta as any).env.VITE_API_URL || 'http://localhost:8080'
  : '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
