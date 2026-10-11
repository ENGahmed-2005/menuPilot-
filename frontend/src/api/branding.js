import { api, authHeaders } from './client';
import { API_BASE_URL } from './baseUrl';

export const getBranding = () => api.get('/me/branding');

export async function saveBranding(values) {
  const form = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (value instanceof File) {
      form.append(key, value);
      return;
    }

    // Laravel's `boolean` validation does not accept the strings
    // "true" / "false" produced by String(value). Send 1/0 instead.
    if (key === 'show_menupilot_branding' && typeof value === 'boolean') {
      form.append(key, value ? '1' : '0');
      return;
    }

    // Objects (menu_style) travel as JSON text in the multipart form.
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });

  const base = API_BASE_URL;
  const response = await fetch(`${base}/me/branding`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: form,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.errors = data?.errors || null;
    throw error;
  }

  return data?.data ?? data;
}

export const resetBranding = () => api.post('/me/branding/reset');
