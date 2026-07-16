// Mock-server tests for @immersivecommons/sdk. No network, no live writes:
// every request is served by an in-process fetch stub that records what the
// client sent and returns canned spec-shaped bodies. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { IcClient, IcApiError, OPERATIONS, API_VERSION } from "../dist/index.js";

/**
 * Build a fetch stub. `handler(url, init) => { status?, json?, headers? }`.
 * Records every call on `.calls`.
 */
function mockFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const r = handler(url, init) ?? {};
    const status = r.status ?? 200;
    const bodyText = r.text ?? JSON.stringify(r.json ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (h) => (r.headers ?? {})[h.toLowerCase()] ?? null },
      text: async () => bodyText,
    };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test("OPERATIONS table matches the spec surface (22 ops)", () => {
  assert.equal(Object.keys(OPERATIONS).length, 22);
  assert.equal(API_VERSION, "2026-07-16");
  assert.equal(OPERATIONS.rsvpToEvent.idempotent, true);
  assert.equal(OPERATIONS.rsvpToEvent.method, "POST");
  assert.equal(OPERATIONS.askResearch.idempotent, false);
  assert.equal(OPERATIONS.getMyTier.browserSession, true);
  assert.equal(OPERATIONS.listUpcomingEvents.requiresAuth, false); // public read
});

test("public read: no Authorization header, query string built", async () => {
  const fetchImpl = mockFetch(() => ({ json: { ok: true, events: [], count: 0, age_min: 1 } }));
  const c = new IcClient({ fetch: fetchImpl });
  const res = await c.listUpcomingEvents({ limit: 3 });
  assert.equal(res.ok, true);
  const { url, init } = fetchImpl.calls[0];
  assert.equal(url, "https://www.immersivecommons.com/api/events/upcoming?limit=3");
  assert.equal(init.method, "GET");
  assert.equal(init.headers.authorization, undefined);
});

test("bearer token attaches Authorization on authed reads", async () => {
  const fetchImpl = mockFetch(() => ({ json: { ok: true, resources: [] } }));
  const c = new IcClient({ token: "agt_test", fetch: fetchImpl });
  await c.listResources();
  assert.equal(fetchImpl.calls[0].init.headers.authorization, "Bearer agt_test");
});

test("idempotent write forwards Idempotency-Key + JSON body", async () => {
  const fetchImpl = mockFetch(() => ({ json: { ok: true, queued: true } }));
  const c = new IcClient({ token: "agt_test", fetch: fetchImpl });
  const res = await c.rsvpToEvent(
    { event_url: "https://luma.com/x", email: "a@b.co" },
    { idempotencyKey: "key-123" }
  );
  assert.equal(res.ok, true);
  const { url, init } = fetchImpl.calls[0];
  assert.equal(url, "https://www.immersivecommons.com/api/events/rsvp");
  assert.equal(init.method, "POST");
  assert.equal(init.headers["idempotency-key"], "key-123");
  assert.equal(init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), { event_url: "https://luma.com/x", email: "a@b.co" });
});

test("Idempotency-Key on a non-idempotent op throws before any request", async () => {
  const fetchImpl = mockFetch(() => ({ json: {} }));
  const c = new IcClient({ token: "agt_test", fetch: fetchImpl });
  await assert.rejects(
    () => c.call("askResearch", { body: { q: "hi" }, idempotencyKey: "nope" }),
    /does not accept an Idempotency-Key/
  );
  assert.equal(fetchImpl.calls.length, 0);
});

test("sandbox receipt is returned verbatim from a write", async () => {
  const receipt = {
    ok: true,
    sandbox: true,
    simulated: true,
    would_have: { action: "rsvpToEvent", scope: "events:rsvp", args: {} },
    note: "scope checked; no production state changed",
  };
  const fetchImpl = mockFetch(() => ({ json: receipt }));
  const c = new IcClient({ token: "agt_sandbox", sandbox: true, fetch: fetchImpl });
  const res = await c.rsvpToEvent({ event_url: "https://luma.com/x", email: "a@b.co" });
  assert.equal(res.simulated, true);
  assert.equal(res.would_have.scope, "events:rsvp");
});

test("error response raises a typed IcApiError with kind + retry-after", async () => {
  const fetchImpl = mockFetch(() => ({
    status: 429,
    json: { error: "rate_limited", error_kind: "rate_limit", retry_after_seconds: 42 },
  }));
  const c = new IcClient({ token: "agt_test", fetch: fetchImpl });
  await assert.rejects(
    () => c.rsvpToEvent({ event_url: "https://luma.com/x", email: "a@b.co" }),
    (err) => {
      assert.ok(err instanceof IcApiError);
      assert.equal(err.status, 429);
      assert.equal(err.errorKind, "rate_limit");
      assert.equal(err.retryAfterSeconds, 42);
      return true;
    }
  );
});

test("catch-all nested error shape { error: { code, message } } is parsed", async () => {
  const fetchImpl = mockFetch(() => ({
    status: 401,
    json: { error: { code: "unauthorized", message: "no token" } },
  }));
  const c = new IcClient({ fetch: fetchImpl });
  await assert.rejects(
    () => c.getMyActivity(),
    (err) => {
      assert.ok(err instanceof IcApiError);
      assert.match(err.message, /unauthorized: no token/);
      return true;
    }
  );
});

test("authorize() runs the device-code loop and returns the minted token", async () => {
  let polls = 0;
  const fetchImpl = mockFetch((url) => {
    if (url.includes("/signup/start")) {
      return {
        json: {
          device_code: "dev_abc",
          user_code: "WXYZ-1234",
          verify_url: "https://www.immersivecommons.com/floor10/agent-console",
          expires_in: 900,
          interval: 0, // 0s poll → fast test
        },
      };
    }
    // /signup/poll
    polls += 1;
    if (polls < 2) return { json: { status: "pending" } };
    return { json: { status: "completed", agent_token: "agt_minted", granted_scopes: ["events:rsvp"], tier: "ic-member", sandbox: true } };
  });
  const c = new IcClient({ sandbox: true, fetch: fetchImpl });
  let prompted = null;
  const res = await c.authorize({
    scopes: ["events:rsvp"],
    clientName: "test-agent",
    onPrompt: (info) => { prompted = info; },
  });
  assert.equal(res.token, "agt_minted");
  assert.deepEqual(res.grantedScopes, ["events:rsvp"]);
  assert.equal(res.sandbox, true);
  assert.equal(prompted.userCode, "WXYZ-1234");
  // start body carried sandbox:true because the client is in sandbox mode.
  const startCall = fetchImpl.calls.find((c) => c.url.includes("/signup/start"));
  assert.equal(JSON.parse(startCall.init.body).sandbox, true);
});

test("required-path query param is sent (getEventByLumaUrl)", async () => {
  const fetchImpl = mockFetch(() => ({ json: { ok: true, event: {} } }));
  const c = new IcClient({ fetch: fetchImpl });
  await c.getEventByLumaUrl("https://luma.com/abc");
  assert.equal(
    fetchImpl.calls[0].url,
    "https://www.immersivecommons.com/api/events/get?luma=https%3A%2F%2Fluma.com%2Fabc"
  );
});
