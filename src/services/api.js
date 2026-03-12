// API Configuration
// Default to local, but can switch to VPS via environment variable
const VITE_API_URL = import.meta.env.VITE_API_URL;
export const API_BASE = VITE_API_URL || ''; // Empty = relative (localhost)
