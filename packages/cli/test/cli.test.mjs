// Offline CLI tests: the SDK client and fetch are injected, so no network and
// no live writes. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, run } from "../src/cli.mjs";

function capture() {
  const out = []; const err = [];
  return {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    out: () => out.join(""),
    err: () => err.join(""),
  };
}

/** A fake IcClient that records calls and returns canned data. */
function fakeClient(responses = {}) {
  const calls = [];
  const client = {
    listUpcomingEvents: async (q) => { calls.push(["listUpcomingEvents", q]); return responses.events ?? { ok: true, events: [] }; },
    rsvpToEvent: async (b, o) => { calls.push(["rsvpToEvent", b, o]); return responses.rsvp ?? { ok: true, queued: true }; },
    getDonorWall: async (q) => { calls.push(["getDonorWall", q]); return responses.donorWall ?? { ok: true, total_usdc: 0, donor_count: 0 }; },
    authorize: async (a) => { calls.push(["authorize", a]); a.onPrompt?.({ verifyUrl: "https://x/console", userCode: "AB-12" }); return responses.auth ?? { token: "agt_x", grantedScopes: a.scopes, sandbox: !!a.sandbox }; },
  };
  const factory = () => client;
  factory.calls = calls;
  return factory;
}

const baseIo = (extra) => ({
  env: {},
  apiVersion: "2026-07-16",
  clientFactory: fakeClient(),
  fetchImpl: async () => ({ ok: true, status: 200, text: async () => "{}" }),
  ...extra,
});

test("parseArgs handles --k v, --k=v, flags, positionals", () => {
  const o = parseArgs(["rsvp", "https://luma.com/x", "--email", "a@b.co", "--json", "--key=K1"]);
  assert.deepEqual(o._, ["rsvp", "https://luma.com/x"]);
  assert.equal(o.email, "a@b.co");
  assert.equal(o.json, true);
  assert.equal(o.key, "K1");
});

test("no args prints help, exit 0", async () => {
  const io = capture();
  const code = await run(baseIo({ argv: [], ...io }));
  assert.equal(code, 0);
  assert.match(io.out(), /Usage: ic <command>/);
});

test("--version prints API version", async () => {
  const io = capture();
  const code = await run(baseIo({ argv: ["--version"], ...io }));
  assert.equal(code, 0);
  assert.match(io.out(), /API 2026-07-16/);
});

test("events lists upcoming from the SDK", async () => {
  const io = capture();
  const factory = fakeClient({ events: { ok: true, events: [{ title: "Demo Night", start: "2026-07-20T18:00:00Z", luma_url: "https://luma.com/d" }] } });
  const code = await run(baseIo({ argv: ["events", "--limit", "5"], clientFactory: factory, ...io }));
  assert.equal(code, 0);
  assert.match(io.out(), /Demo Night/);
  assert.deepEqual(factory.calls[0], ["listUpcomingEvents", { limit: 5 }]);
});

test("signal latest parses the JSON feed via injected fetch", async () => {
  const io = capture();
  const feed = { items: [{ title: "SIGNAL — Issue 12", summary: "the week in AI", date_published: "2026-07-12T00:00:00Z", url: "https://x/newsletter/12" }] };
  const fetchImpl = async (url) => {
    assert.match(url, /\/newsletter\/feed\.json$/);
    return { ok: true, status: 200, text: async () => JSON.stringify(feed) };
  };
  const code = await run(baseIo({ argv: ["signal", "latest"], fetchImpl, ...io }));
  assert.equal(code, 0);
  assert.match(io.out(), /Issue 12/);
  assert.match(io.out(), /the week in AI/);
});

test("rsvp requires --email", async () => {
  const io = capture();
  const code = await run(baseIo({ argv: ["rsvp", "https://luma.com/x", "--token", "agt_x"], ...io }));
  assert.equal(code, 2);
  assert.match(io.err(), /--email is required/);
});

test("rsvp requires a token", async () => {
  const io = capture();
  const code = await run(baseIo({ argv: ["rsvp", "https://luma.com/x", "--email", "a@b.co"], ...io }));
  assert.equal(code, 2);
  assert.match(io.err(), /token is required/);
});

test("rsvp forwards idempotency key + body to the SDK", async () => {
  const io = capture();
  const factory = fakeClient({ rsvp: { ok: true, queued: true, was_dup: false } });
  const code = await run(baseIo({
    argv: ["rsvp", "https://luma.com/x", "--email", "a@b.co", "--key", "K9"],
    env: { IC_AGENT_TOKEN: "agt_env" },
    clientFactory: factory, ...io,
  }));
  assert.equal(code, 0);
  assert.match(io.out(), /RSVP queued/);
  const [, body, callOpts] = factory.calls[0];
  assert.deepEqual(body, { event_url: "https://luma.com/x", email: "a@b.co" });
  assert.equal(callOpts.idempotencyKey, "K9");
});

test("rsvp reports a sandbox receipt distinctly", async () => {
  const io = capture();
  const factory = fakeClient({ rsvp: { ok: true, sandbox: true, simulated: true, would_have: {} } });
  const code = await run(baseIo({
    argv: ["rsvp", "https://luma.com/x", "--email", "a@b.co", "--token", "agt_sb"],
    clientFactory: factory, ...io,
  }));
  assert.equal(code, 0);
  assert.match(io.out(), /Sandbox: RSVP well-formed/);
});

test("auth runs the device-code loop and prints the token", async () => {
  const io = capture();
  const factory = fakeClient();
  const code = await run(baseIo({ argv: ["auth", "--scopes", "events:rsvp,events:read_upcoming"], clientFactory: factory, ...io }));
  assert.equal(code, 0);
  assert.match(io.err(), /Enter code: AB-12/);
  assert.match(io.out(), /IC_AGENT_TOKEN=agt_x/);
  assert.deepEqual(factory.calls[0][1].scopes, ["events:rsvp", "events:read_upcoming"]);
});

test("donate without --dry-run refuses (never moves funds)", async () => {
  const io = capture();
  const code = await run(baseIo({ argv: ["donate"], ...io }));
  assert.equal(code, 2);
  assert.match(io.err(), /never moves funds/);
});

test("donate --dry-run shows the wall + payment shape", async () => {
  const io = capture();
  const discovery = { resources: [{ resource: "https://x/api/x402/donate", status: "dormant", metadata: { tiers: [{ usd: 5 }, { usd: 25 }] } }] };
  const fetchImpl = async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify(discovery) });
  const factory = fakeClient({ donorWall: { ok: true, total_usdc: 120, donor_count: 4 } });
  const code = await run(baseIo({ argv: ["donate", "--dry-run"], fetchImpl, clientFactory: factory, ...io }));
  assert.equal(code, 0);
  assert.match(io.out(), /120 USDC from 4 donors/);
  assert.match(io.out(), /\$5, \$25/);
  assert.match(io.out(), /no funds moved/);
});

test("API errors surface as exit 1 with a message", async () => {
  const io = capture();
  const factory = () => ({
    listUpcomingEvents: async () => { throw Object.assign(new Error("rate_limited"), { status: 429, errorKind: "rate_limit", retryAfterSeconds: 30 }); },
  });
  const code = await run(baseIo({ argv: ["events"], clientFactory: factory, ...io }));
  assert.equal(code, 1);
  assert.match(io.err(), /HTTP 429 \(rate_limit\)/);
  assert.match(io.err(), /Retry after 30s/);
});
