import { api, getToken } from './client';

export const getBranding = () => api.get('/me/branding');

export async function saveBranding(values) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (value instanceof File) form.append(key, value);
      else form.append(key, String(value));
    }
  });
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const response = await fetch(`${base}/me/branding`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
  return data?.data ?? data;
}

export const resetBranding = () => api.post('/me/branding/reset');
