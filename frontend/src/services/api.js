import axios from 'axios';

// Base URL for backend
const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance (like creating a session)
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,  // 10 second timeout
});

// Test backend connection
export const testConnection = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error('Backend connection failed:', error);
        throw error;
    }
};