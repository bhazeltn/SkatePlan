import { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from './api';

/**
 * A custom hook to simplify API requests with loading and error handling.
 * @param {string} endpoint The API endpoint (e.g., '/roster/')
 * @param {string} method The HTTP method (e.g., 'GET')
 * @returns [ (data) => Promise<any>, { data, loading, error } ]
 */
export function useApi(endpoint, method) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (body = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest(endpoint, method, body, token);
      setData(result);
      return result; // Return for promise chaining
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      throw err; // Re-throw for component-level handling
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, token]);

  return [execute, { data, loading, error }];
}