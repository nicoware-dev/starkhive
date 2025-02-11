// API Configuration
const getBaseUrl = () => {
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api';  // Use the proxy from vite.config.ts
    }
    // For production (ngrok URL)
    return 'https://7b71-45-238-221-26.ngrok-free.app';
};

export const API_BASE_URL = getBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
    agents: `${API_BASE_URL}/agents`,
    events: `${API_BASE_URL}/events`,
    messages: (agentId: string) => `${API_BASE_URL}/agents/${agentId}/message`,
    agentDetails: (agentId: string) => `${API_BASE_URL}/agents/${agentId}`,
}; 