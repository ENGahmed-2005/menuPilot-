/* The dining session this browser opened at a table, kept for the visit
   (sessionStorage, like the cart): the guest browses the menu first and the
   session is opened only when the first order is sent (see Cart.jsx). */
const key = (tableCode) => `menupilot.table.${tableCode}`;

export function rememberTableSession(tableCode, sessionId) {
  try { if (tableCode && sessionId) sessionStorage.setItem(key(tableCode), String(sessionId)); } catch { /* private mode */ }
}

export function tableSession(tableCode) {
  try { return sessionStorage.getItem(key(tableCode)); } catch { return null; }
}

export function forgetTableSession(tableCode) {
  try { sessionStorage.removeItem(key(tableCode)); } catch { /* private mode */ }
}
