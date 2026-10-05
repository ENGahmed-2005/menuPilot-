/* ==========================================================================
   accounting.js — accounting settings and Excel exports.
   Exports are binary (.xlsx), so they bypass the JSON client and download
   through fetch + Blob, keeping the same auth header and friendly errors.
   ========================================================================== */
import { api, getToken } from "./client";
import { friendlyMessage } from "../utils/errors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const getAccountingSettings = () => api.get("/accounting/settings");
export const saveAccountingSettings = (payload) => api.put("/accounting/settings", payload);

/** Download /reports/export/{type}?… as a file. Resolves to { rows, filename }. */
export async function downloadExport(type, params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)).toString();
  let response;
  try {
    response = await fetch(`${BASE_URL}/reports/export/${type}${qs ? `?${qs}` : ""}`, {
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json", Authorization: `Bearer ${getToken()}` },
    });
  } catch {
    const error = new Error(friendlyMessage(0)); error.friendly = true; throw error;
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(friendlyMessage(response.status, data?.message)); error.status = response.status; error.friendly = true; throw error;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filename = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] || `menuPilot-${type}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = decodeURIComponent(filename);
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { rows: Number(response.headers.get("X-Export-Rows") || 0), filename };
}
