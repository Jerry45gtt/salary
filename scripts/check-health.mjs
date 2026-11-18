import assert from "node:assert/strict";
const response = await fetch("http://localhost:3000/api/health");
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "no-store");
assert.deepEqual(await response.json(), { status: "ok" });
console.log("Local health endpoint passed.");
