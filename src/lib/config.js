// Configuration for API endpoints and environment-specific settings
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// API Base URL configuration
export const API_BASE_URL = isDevelopment
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
  : "https://ra-ja-ticketing-system.vercel.app";

// API Endpoints
export const API_ENDPOINTS = {
  createAdmin: `${API_BASE_URL}/api/create-proper-admin`,
  deleteUser: `${API_BASE_URL}/api/delete-user`,
  participants: (eventId) =>
    `${API_BASE_URL}/api/event/${eventId}/participants`,
  checkInStats: (eventId) =>
    `${API_BASE_URL}/api/event/${eventId}/check-in-stats`,
  checkInVerify: `${API_BASE_URL}/api/check-in/verify`,
  participantQR: (eventId, userId) =>
    `${API_BASE_URL}/api/event/${eventId}/participant/${userId}/qr`,
};

// Environment info
export const ENV = {
  isDevelopment,
  isProduction,
  apiBaseUrl: API_BASE_URL,
};

// Debug logging (only in development)
if (isDevelopment) {
  console.log("🔧 Environment Configuration:", ENV);
  console.log("🌐 API Endpoints:", API_ENDPOINTS);
}
