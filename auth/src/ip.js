/* ip.js — the visitor's IP, for rate limiting and the devices list.
   The proxies in front of this service (Vercel's rewrite, Railway's edge, the
   Railway frontend's Caddy) each append to X-Forwarded-For. The client is the
   entry AUTH_PROXY_HOPS places from the right: the part a visitor can't forge.
   The result is handed to Better Auth in one header of our own, which a
   request can't bring in from outside (server.js drops it first). */
import { isIP } from "node:net";

export const CLIENT_IP_HEADER = "x-menupilot-client-ip";

const bare = (value) => {
  const v = value.trim().replace(/^"|"$/g, "");
  if (v.startsWith("[")) return v.slice(1, v.indexOf("]")); // [v6]:port
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) return v.slice(0, v.lastIndexOf(":")); // v4:port
  return v;
};

/** The client IP or null. `socketAddress` is used only when no proxy header came (local runs). */
export function resolveClientIp(headers, { header, hops }, socketAddress) {
  const raw = headers.get(header);
  if (raw) {
    const entries = raw.split(",").map(bare).filter(Boolean);
    const candidate = entries[entries.length - hops];
    return candidate && isIP(candidate) ? candidate : null;
  }
  const own = socketAddress ? bare(socketAddress) : "";
  return isIP(own) ? own : null;
}
