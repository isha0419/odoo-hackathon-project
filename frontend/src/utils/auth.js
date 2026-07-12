import { getToken, clearToken } from './api';

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  clearToken();
  window.location.href = '/login';
}

// Decodes the JWT payload without verifying signature (verification is the
// backend's job) — used only to read role/name for UI display.
export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}