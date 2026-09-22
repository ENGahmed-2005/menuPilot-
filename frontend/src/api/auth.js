import { api, setToken } from './client';

export async function register(payload) {
  return api.post('/auth/register', {
    restaurant_name: payload.restaurantName,
    email: payload.email,
    whatsapp_phone: payload.whatsappPhone,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
    plan: payload.plan,
  });
}

export async function login(payload) {
  const data = await api.post('/auth/login', { email: payload.email, password: payload.password });
  if (data?.token) setToken(data.token);
  return data;
}

export async function logout() {
  try { await api.post('/auth/logout'); } finally { setToken(null); }
}

export async function fetchCurrentUser() { return api.get('/auth/me'); }

export async function getVerificationStatus(email) {
  return api.get('/auth/verification-status?email=' + encodeURIComponent(email));
}

export async function sendVerification(email, channel) {
  return api.post('/auth/verification/send', { email, channel });
}

export async function verifyCode(email, channel, code) {
  const data = await api.post('/auth/verification/check', { email, channel, code });
  if (data?.token) setToken(data.token);
  return data;
}

export async function forgotPassword(payload) {
  return api.post('/auth/forgot-password', { email: payload.email });
}

export async function resetPassword(payload) {
  return api.post('/auth/reset-password', {
    token: payload.token,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
  });
}
