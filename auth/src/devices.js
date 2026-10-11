/* devices.js — a small Better Auth plugin for the Security page's devices list.
   Session tokens stay in the httpOnly cookie only: they are removed from every
   JSON answer (get-session, list-sessions, sign-in…), the list marks the
   current device instead, and a device is signed out by its session id. */
import { APIError, createAuthEndpoint, createAuthMiddleware, isAPIError, sensitiveSessionMiddleware } from "better-auth/api";

const withoutToken = ({ token: _token, ...rest }) => rest;

async function currentToken(ctx) {
  const value = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
  return typeof value === "string" ? value : null;
}

export const devices = () => ({
  id: "menupilot-devices",
  endpoints: {
    /** POST /api/auth/revoke-device {id}: signs one of your devices out. */
    revokeDevice: createAuthEndpoint("/revoke-device", { method: "POST", use: [sensitiveSessionMiddleware], requireHeaders: true }, async (ctx) => {
      const id = typeof ctx.body?.id === "string" ? ctx.body.id : "";
      if (!id) throw APIError.from("BAD_REQUEST", { code: "INVALID_DEVICE", message: "Missing device id" });
      const sessions = await ctx.context.internalAdapter.listSessions(ctx.context.session.user.id);
      const target = sessions.find((s) => s.id === id);
      if (target) await ctx.context.internalAdapter.deleteSession(target.token);
      return ctx.json({ status: true });
    }),
  },
  hooks: {
    after: [{
      matcher: () => true,
      handler: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        if (!returned || typeof returned !== "object" || isAPIError(returned) || returned instanceof Response) return;

        if (ctx.path === "/list-sessions" && Array.isArray(returned)) {
          const current = await currentToken(ctx);
          return ctx.json(returned.map((s) => ({ ...withoutToken(s), current: s.token === current })));
        }
        if (typeof returned.token === "string" || typeof returned.session?.token === "string") {
          const out = typeof returned.token === "string" ? withoutToken(returned) : { ...returned };
          if (out.session && typeof out.session === "object") out.session = withoutToken(out.session);
          return ctx.json(out);
        }
      }),
    }],
  },
});
