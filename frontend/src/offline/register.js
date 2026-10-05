/* Registers the service worker (production builds only) and reports when a
   new version is waiting, so ConnectionBanner can offer «تحديث الآن». */
let updateSW = null;
const waiting = new Set();
let isWaiting = false;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  import("virtual:pwa-register").then(({ registerSW }) => {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { isWaiting = true; waiting.forEach((fn) => fn(true)); },
    });
  }).catch(() => { /* the app works without it */ });
}

export const applyUpdate = () => updateSW?.(true);
export const updateWaiting = () => isWaiting;
export function onUpdateWaiting(fn) { waiting.add(fn); return () => waiting.delete(fn); }
