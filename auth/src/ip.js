/* ip.js — the visitor's IP, for rate limiting and the devices list.
   AUTH_CLIENT_IP_HEADER names the header(s) to read, first one present wins
   (e.g. "x-vercel-forwarded-for,x-forwarded-for": Vercel's rewrite sends the
   first, the Railway frontend's Caddy the second). Proxies append to such a
   list; the client is the entry AUTH_PROXY_HOPS places from the right.
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
  const name = String(header).split(",").map((h) => h.trim()).find((h) => h && headers.get(h));
  const raw = name ? headers.get(name) : null;
  if (raw) {
    const entries = raw.split(",").map(bare).filter(Boolean);
    const candidate = entries[entries.length - hops];
    return candidate && isIP(candidate) ? candidate : null;
  }
  const own = socketAddress ? bare(socketAddress) : "";
  return isIP(own) ? own : null;
}
