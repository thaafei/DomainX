import { apiUrl } from '../config/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(apiUrl(endpoint), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshResponse = await fetch(apiUrl('/refresh-token/'), {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      return fetch(apiUrl(endpoint), {
        ...options,
        credentials: 'include',
      });
    } else {
      window.location.href = '/login';
    }
  }

  return response;
};