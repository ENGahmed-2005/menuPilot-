/* ==========================================================================
   sessionToken.js — the customer's dining-session secret.
   The API issues it when the QR session opens; every public session call
   must send it (X-Session-Token), so guessing another table's session id
   is useless. Stored per session id in localStorage on the customer phone.
   ========================================================================== */
const KEY = (id) => `menupilot_session_token_${id}`;

export function saveSessionToken(sessionId, token) {
  if (!sessionId || !token) return;
  try { localStorage.setItem(KEY(sessionId), token); } catch { /* private mode: keep going */ }
}

export function getSessionToken(sessionId) {
  try { return sessionId ? localStorage.getItem(KEY(sessionId)) : null; } catch { return null; }
}

/** Session id from a public session path ("/public/sessions/12/orders", "/sessions/12/request-bill"). */
export function sessionIdFromPath(path) {
  const m = /^\/(?:public\/sessions\/(\d+)|sessions\/(\d+)\/(?:orders|call-waiter|request-bill))/.exec(path);
  return m ? m[1] || m[2] : null;
}

/** Headers for a public session request (empty when no token is stored). */
export function sessionHeaders(sessionId) {
  const token = getSessionToken(sessionId);
  return token ? { "X-Session-Token": token } : {};
}
