/* What the app keeps on the device for offline use: the signed-in user and the
   service worker's saved API answers. Both are removed on sign-out. */
export const USER_KEY = "menupilot_user";
export const API_CACHE = "menupilot-api-v1";

export function saveUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* private mode */ }
}

export function savedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function clearOfflineData() {
  try { localStorage.removeItem(USER_KEY); } catch { /* private mode */ }
  if (typeof caches !== "undefined") caches.delete(API_CACHE).catch(() => {});
}
