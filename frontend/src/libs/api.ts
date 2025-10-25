import axios from 'axios';

// Create axios instance with proper configuration for session-based auth
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // Important: sends session cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store for auth state handler (will be set by the auth store)
let unauthorizedHandler: (() => void) | null = null;

// Function to set the unauthorized handler from outside
export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle 401 Unauthorized - user is not authenticated
      console.warn('Unauthorized request detected - clearing auth state');
      
      // Call the handler if it's set (will clear auth state and redirect)
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
