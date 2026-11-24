// export const BACKEND_API_URL = 'http://localhost:8080';
export const BACKEND_API_URL = 'https://osonmarket-backend.onrender.com';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  BACKEND_API_URL;
