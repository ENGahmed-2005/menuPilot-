import { mockRequest } from './mockServer';
import { friendlyMessage } from '../utils/errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const TOKEN_KEY = 'menupilot_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function request(path, options = {}) {
  const token = getToken();

  if (USE_MOCKS) {
    return mockRequest(options.method || 'GET', path, options.body, token);
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    // Offline, DNS, CORS or server down: fetch rejects before any response.
    const error = new Error(friendlyMessage(0));
    error.status = 0;
    error.friendly = true;
    error.cause = cause;
    throw error;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = new Error(friendlyMessage(response.status, data?.message));
    error.status = response.status;
    error.friendly = true;
    error.serverMessage = data?.message || null;
    error.code = data?.code || null;
    error.errors = data?.errors || null;
    error.data = data; // extra context (e.g. the open session behind a 409)
    throw error;
  }

  return data && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
}

export const api = {
  get: (p) => request(p, { method: 'GET' }),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  delete: (p, b) => request(p, { method: 'DELETE', body: b }),
};
