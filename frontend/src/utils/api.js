// Central API client for AssetFlow.
// Every page must call the backend through this module only —
// do not call fetch() directly from a page file.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'af_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function redirectToLogin() {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/**
 * Core request function. Auto-injects Authorization header when a token
 * exists, parses JSON, and redirects to /login on 401.
 *
 * @param {string} path - API path, e.g. '/dashboard'
 * @param {object} options - fetch options (method, body, headers...)
 * @returns {Promise<any>} parsed JSON body
 * @throws {ApiError} on non-2xx responses (status 401 triggers redirect instead)
 */
export async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new ApiError('Network error — could not reach the server.', 0, null);
  }

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError('Session expired. Please log in again.', 401, null);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    // 409 (conflict) is handled by callers directly, since screens 5 & 6
    // need the conflict payload to render inline banners, not a thrown error UI.
    throw new ApiError(body?.message || `Request failed (${response.status})`, response.status, body);
  }

  return body;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const api = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, data) => apiRequest(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => apiRequest(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(data) }),
  del: (path) => apiRequest(path, { method: 'DELETE' }),
};