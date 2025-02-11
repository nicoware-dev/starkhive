// API Configuration
export const API_BASE_URL = "https://7b71-45-238-221-26.ngrok-free.app";

// API Endpoints
export const API_ENDPOINTS = {
    agents: `${API_BASE_URL}/agents`,
    events: `${API_BASE_URL}/events`,
    messages: (agentId: string) => `${API_BASE_URL}/agents/${agentId}/message`,
    agentDetails: (agentId: string) => `${API_BASE_URL}/agents/${agentId}`,
}; 