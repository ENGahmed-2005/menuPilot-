import { t } from "../i18n";
/* ==========================================================================
   maps.js — map helpers for delivery locations (no API key needed).
   OpenStreetMap embed for display, Google Maps links for navigation.
   ========================================================================== */
export function osmEmbedUrl(lat, lng, span = 0.004) {
  const b = [lng - span, lat - span * 0.6, lng + span, lat + span * 0.6].map((n) => n.toFixed(6)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${b}&layer=mapnik&marker=${lat}%2C${lng}`;
}
export const googleDirectionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const googleSearchUrl = (text) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;

/** Ask the phone for its current position (the browser shows a permission prompt). */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(t("المتصفح لا يدعم تحديد الموقع.")));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Number(p.coords.latitude.toFixed(7)), lng: Number(p.coords.longitude.toFixed(7)), accuracy: Math.round(p.coords.accuracy || 0) }),
      (e) => reject(new Error(e.code === 1 ? t("لم تسمح بالوصول إلى موقعك. فعّله من إعدادات المتصفح، أو اكتفِ بكتابة العنوان.") : t("تعذّر تحديد موقعك الآن. حاول مجددًا أو اكتب العنوان."))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
