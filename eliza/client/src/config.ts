// API Configuration
const getBaseUrl = () => {
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';  // Direct URL to backend
    }
    
    // For Vercel deployment
    if (import.meta.env.VITE_BACKEND_URL) {
        const url = import.meta.env.VITE_BACKEND_URL;
        // Remove trailing slash if present
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    
    // Fallback to ngrok URL
    return 'https://7b71-45-238-221-26.ngrok-free.app';
};

export const API_BASE_URL = getBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
    agents: `${API_BASE_URL}/api/agents`,  // Added /api prefix
    events: `${API_BASE_URL}/api/events`,  // Added /api prefix
    messages: (agentId: string) => `${API_BASE_URL}/api/${agentId}/message`,  // Added /api prefix
    agentDetails: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}`,  // Added /api prefix
}; 