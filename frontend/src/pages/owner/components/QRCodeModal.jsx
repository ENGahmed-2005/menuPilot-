import { useState } from "react";
import { ExternalLink, Printer, QrCode, X, Download } from "lucide-react";

export default function QRCodeModal({ table, onClose }) {
  const [downloading, setDownloading] = useState(false);
  if (!table) return null;

  const code = table.table_code || table.code;
  const scanUrl = new URL(`/t/${code}`, window.location.origin).href;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=16&data=${encodeURIComponent(scanUrl)}`;

  async function downloadQr() {
    setDownloading(true);
    try {
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menuPilot-${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrImage, "_blank", "noopener,noreferrer");
    } finally { setDownloading(false); }
  }

  function printQr() {
    const popup = window.open("", "_blank", "width=520,height=700");
    if (!popup) return;
    popup.document.write(`<html dir="rtl"><head><title>QR - ${table.label}</title></head><body style="font-family:Arial;text-align:center;padding:32px"><h2>${table.label}</h2><img src="${qrImage}" width="420" height="420"/><p>${scanUrl}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div dir="rtl" className="w-full max-w-md rounded-[2rem] bg-paper p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-copper/10 px-3 py-1 text-xs font-black text-copper"><QrCode size={14}/> رمز QR</span><h2 className="mt-3 text-2xl font-black">{table.label}</h2><p className="mt-1 text-xs text-ink-soft/55">يستخدم لفتح جلسة الطاولة من داخل المطعم.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-soft hover:bg-ink/5" aria-label="إغلاق"><X size={18}/></button>
        </div>
        <div className="mx-auto mt-6 w-fit rounded-3xl border border-ink/8 bg-white p-4 shadow-sm"><img src={qrImage} alt={`رمز QR لـ ${table.label}`} width="280" height="280" /></div>
        <div className="mt-5 rounded-2xl bg-paper-2 p-3 text-center text-xs break-all text-ink-soft/65">{scanUrl}</div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <a href={scanUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-xl border border-ink/12 px-2 py-3 text-xs font-black text-ink"><ExternalLink size={14}/> فتح</a>
          <button type="button" onClick={downloadQr} disabled={downloading} className="flex items-center justify-center gap-1 rounded-xl border border-ink/12 px-2 py-3 text-xs font-black text-ink disabled:opacity-50"><Download size={14}/> {downloading ? "..." : "تنزيل"}</button>
          <button type="button" onClick={printQr} className="flex items-center justify-center gap-1 rounded-xl bg-copper px-2 py-3 text-xs font-black text-ink"><Printer size={14}/> طباعة</button>
        </div>
      </div>
    </div>
  );
}
