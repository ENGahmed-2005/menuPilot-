/* ==========================================================================
   vite.config.js — إعدادات Vite (أداة التطوير والبناء)
   --------------------------------------------------------------------------
   Vite هو الذي:
   1) يشغّل سيرفر التطوير بأمر: npm run dev
   2) يحوّل JSX إلى JavaScript يفهمه المتصفح
   3) يبني نسخة الإنتاج في مجلد dist بأمر: npm run build
   ملاحظة: هذا الملف يعمل على Node (خارج المتصفح)، وليس جزءًا من الواجهة.
   ========================================================================== */

// defineConfig: مجرد غلاف يعطيك إكمالًا تلقائيًا واقتراحات في المحرر.
import { defineConfig } from "vite";

// الإضافة المسؤولة عن دعم React: تفهم JSX وتُفعّل التحديث الفوري
// (Fast Refresh) أي أن تعديلك يظهر في المتصفح بلا إعادة تحميل للصفحة.
import react from "@vitejs/plugin-react";

// إضافة Tailwind CSS v4 — تدمج مباشرة مع Vite بدون ملف config منفصل.
import tailwindcss from "@tailwindcss/vite";

// PWA: installable on tablets and works offline (src/sw.js, docs/offline.md).
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // plugins: قائمة الإضافات. لاحظ react() و tailwindcss() بالأقواس لأنها دوال نستدعيها.
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt", // a new version waits for a click: never reload mid-payment
      injectRegister: false, // registered in src/offline/register.js
      manifest: {
        name: "menuPilot",
        short_name: "menuPilot",
        description: "QR ordering and restaurant management — keeps working when the internet drops.",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#1f2d3d",
        theme_color: "#1f2d3d",
        icons: [
          { src: "/brand/mark-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/mark-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      injectManifest: {
        // The app and its fonts; not the big landing-page media.
        globPatterns: ["**/*.{js,css,html,woff2,svg}", "brand/mark-*.png", "favicon.svg"],
        globIgnores: ["landing/**"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],

  server: {
    // المنفذ الذي يفتح عليه سيرفر التطوير → http://localhost:5173
    port: 5173,

    // proxy (اختياري): يُستخدم لاحقًا عند ربط الواجهة بـ API الخاص بـ Laravel.
    // الفكرة: أي طلب يبدأ بـ /api يُعاد توجيهه إلى سيرفر Laravel،
    // فيظن المتصفح أن الطلب لنفس العنوان → لا تظهر مشكلة CORS.
    // أزل التعليق عن السطر التالي عند تشغيل الـ backend محليًا:
    // proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
});
