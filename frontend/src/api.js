// This is our API helper

// Get the backend URL from the .env file
// We will set this up in vite.config.js
const API_URL = import.meta.env.VITE_API_URL || 'https://api.skateplan.bradnet.net/api';

/**
 * A helper function for making API requests.
 * @param {string} endpoint The API endpoint (e.g., '/auth/login/')
 * @param {string} method The HTTP method (e.g., 'POST')
 * @param {object} body The data to send
 * @param {string} token The auth token
 * @returns {Promise<object>} The JSON response
 */
export async function apiRequest(endpoint, method, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const config = {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      // If the server returns a non-200 status, try to parse the error
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}