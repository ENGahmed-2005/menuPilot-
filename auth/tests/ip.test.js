import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveClientIp } from "../src/ip.js";

const h = (obj) => new Headers(obj);

describe("client IP", () => {
  it("takes the entry that many hops from the right of the first header present", () => {
    const config = { header: "x-vercel-forwarded-for,x-forwarded-for", hops: 1 };
    assert.equal(resolveClientIp(h({ "x-vercel-forwarded-for": "203.0.113.5", "x-forwarded-for": "10.0.0.1" }), config), "203.0.113.5");
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "198.51.100.1, 203.0.113.9" }), config), "203.0.113.9");
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "198.51.100.1, 203.0.113.9" }), { header: "x-forwarded-for", hops: 2 }), "198.51.100.1");
  });

  it("reads ports and IPv6, and refuses what isn't an address", () => {
    const config = { header: "x-forwarded-for", hops: 1 };
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "203.0.113.5:4431" }), config), "203.0.113.5");
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "[2001:db8::1]:443" }), config), "2001:db8::1");
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "not-an-ip" }), config), null);
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "203.0.113.5" }), { header: "x-forwarded-for", hops: 3 }), null);
  });

  it("uses the connection only when no proxy header came", () => {
    const config = { header: "x-forwarded-for", hops: 1 };
    assert.equal(resolveClientIp(h({}), config, "::ffff:127.0.0.1"), "::ffff:127.0.0.1");
    assert.equal(resolveClientIp(h({}), config, undefined), null);
  });
});
