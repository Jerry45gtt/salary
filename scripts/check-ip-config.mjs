import assert from "node:assert/strict";
import { getIpHeaders } from "../src/lib/ip-config.ts";

assert.deepEqual(getIpHeaders(true), []);
assert.deepEqual(getIpHeaders(false), ["x-forwarded-for"]);
assert.deepEqual(getIpHeaders(true, " CF-Connecting-IP "), ["cf-connecting-ip"]);
for (const input of ["x-forwarded-for", "Forwarded", "bad header", "header\nother"]) assert.throws(() => getIpHeaders(true, input));
console.log("IP header configuration defaults and validation passed.");
