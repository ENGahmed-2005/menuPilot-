/* ==========================================================================
   storage.js — what the app keeps on the device for offline use: the
   signed-in user (so a reload offline is not a sign-out) and the service
   worker's saved API answers. Both go on sign-out or when the server says
   the login is no longer valid. Who is signed in also decides whose queued
   changes the outbox shows and sends, so it hears about every change.
   ========================================================================== */
export const USER_KEY = "menupilot_user";
export const API_CACHE = "menupilot-api-v1";
export const USER_CHANGED = "menupilot:user-changed";

const announce = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(USER_CHANGED)); };

export function saveUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* private mode */ }
  announce();
}

export function savedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function clearOfflineData() {
  try { localStorage.removeItem(USER_KEY); } catch { /* private mode */ }
  if (typeof caches !== "undefined") caches.delete(API_CACHE).catch(() => {});
  announce();
}
