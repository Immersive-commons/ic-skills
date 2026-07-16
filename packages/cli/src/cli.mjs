// Pure CLI logic for `ic`. The SDK client + fetch + streams are injected so the
// whole surface is testable offline (see test/cli.test.mjs). bin/ic.mjs wires
// the real implementations in.

export const DEFAULT_BASE_URL = "https://www.immersivecommons.com";

const HELP = `ic — Immersive Commons agent CLI

Usage: ic <command> [options]

Commands:
  auth                 Mint an agent token via the device-code flow
  signal latest        Show the latest THE SIGNAL issue (public, no auth)
  events               List upcoming Immersive Commons events (public)
  rsvp <luma-url>      RSVP to an event (needs a token with events:rsvp)
  donate               Show the donor wall + how to give (--dry-run only)

Global options:
  --base <url>         API origin (env IC_BASE_URL, default ${DEFAULT_BASE_URL})
  --token <agt_...>    Agent bearer token (env IC_AGENT_TOKEN)
  --json               Machine-readable JSON output
  -h, --help           Show this help
  -v, --version        Show the CLI + API version

Examples:
  ic events --limit 5
  ic signal latest
  ic auth --scopes events:read_upcoming,events:rsvp
  ic rsvp https://luma.com/some-event --email me@example.com
  ic donate --dry-run
`;

/** Minimal flag parser: --k v, --k=v, --flag (boolean), and positionals. */
export function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") { opts._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) { opts[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) { opts[key] = true; }
      else { opts[key] = next; i++; }
    } else if (a === "-h") opts.help = true;
    else if (a === "-v") opts.version = true;
    else opts._.push(a);
  }
  return opts;
}

function resolveConfig(opts, env) {
  return {
    baseUrl: (opts.base ?? env.IC_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    token: opts.token ?? env.IC_AGENT_TOKEN,
    json: !!opts.json,
  };
}

/**
 * @param {object} io  { argv, env, clientFactory, fetchImpl, stdout, stderr, apiVersion }
 * @returns {Promise<number>} exit code
 */
export async function run(io) {
  const { argv, env, clientFactory, fetchImpl, stdout, stderr, apiVersion } = io;
  const opts = parseArgs(argv);
  const say = (s = "") => stdout(s + "\n");
  const warn = (s = "") => stderr(s + "\n");

  if (opts.version) { say(`ic (cli) — API ${apiVersion}`); return 0; }
  if (opts.help || opts._[0] === "help" || opts._.length === 0) { say(HELP); return 0; }

  const cfg = resolveConfig(opts, env);
  const cmd = opts._[0];
  const sub = opts._[1];

  try {
    if (cmd === "events") return await cmdEvents(opts, cfg, clientFactory, say);
    if (cmd === "signal" && sub === "latest") return await cmdSignalLatest(opts, cfg, fetchImpl, say);
    if (cmd === "signal") { warn("usage: ic signal latest"); return 2; }
    if (cmd === "rsvp") return await cmdRsvp(opts, cfg, clientFactory, say, warn);
    if (cmd === "auth") return await cmdAuth(opts, cfg, clientFactory, say, warn);
    if (cmd === "donate") return await cmdDonate(opts, cfg, clientFactory, fetchImpl, say, warn);
    warn(`Unknown command: ${cmd}. Run 'ic --help'.`);
    return 2;
  } catch (err) {
    const detail = err && typeof err === "object" && "status" in err
      ? `HTTP ${err.status}${err.errorKind ? ` (${err.errorKind})` : ""}: ${err.message}`
      : err?.message ?? String(err);
    warn(`Error: ${detail}`);
    if (err?.retryAfterSeconds) warn(`Retry after ${err.retryAfterSeconds}s.`);
    return 1;
  }
}

async function cmdEvents(opts, cfg, clientFactory, say) {
  const ic = clientFactory({ baseUrl: cfg.baseUrl, token: cfg.token, fetch: cfg.fetch });
  const limit = opts.limit ? Number(opts.limit) : undefined;
  const res = await ic.listUpcomingEvents(limit ? { limit } : {});
  const events = res.events ?? [];
  if (cfg.json) { say(JSON.stringify(res, null, 2)); return 0; }
  if (events.length === 0) { say("No upcoming events."); return 0; }
  say(`Upcoming events (${events.length}):`);
  for (const e of events) {
    say(`  • ${e.title ?? "(untitled)"}${e.start ? `  —  ${e.start}` : ""}`);
    if (e.luma_url) say(`    ${e.luma_url}`);
  }
  return 0;
}

async function cmdSignalLatest(opts, cfg, fetchImpl, say) {
  // THE SIGNAL is published as a public JSON Feed 1.1 (see llms.txt); it is not
  // a REST operation in the spec, so read the feed directly.
  const url = `${cfg.baseUrl}/newsletter/feed.json`;
  const res = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw Object.assign(new Error(`feed fetch failed`), { status: res.status });
  const feed = JSON.parse(await res.text());
  const items = feed.items ?? [];
  if (cfg.json) { say(JSON.stringify(items[0] ?? null, null, 2)); return 0; }
  if (items.length === 0) { say("No issues published yet."); return 0; }
  const it = items[0];
  say(it.title ?? "(untitled issue)");
  if (it.summary) say(it.summary);
  if (it.date_published) say(`Published: ${it.date_published}`);
  if (it.url) say(it.url);
  return 0;
}

async function cmdRsvp(opts, cfg, clientFactory, say, warn) {
  const eventUrl = opts._[1];
  if (!eventUrl) { warn("usage: ic rsvp <luma-url> --email you@example.com"); return 2; }
  if (!opts.email) { warn("--email is required (agent RSVPs have no session fallback)."); return 2; }
  if (!cfg.token) { warn("A token is required. Pass --token or set IC_AGENT_TOKEN (run 'ic auth')."); return 2; }
  const ic = clientFactory({ baseUrl: cfg.baseUrl, token: cfg.token, fetch: cfg.fetch });
  const res = await ic.rsvpToEvent(
    { event_url: eventUrl, email: opts.email, ...(opts.name ? { name: opts.name } : {}) },
    opts.key ? { idempotencyKey: opts.key } : {}
  );
  if (cfg.json) { say(JSON.stringify(res, null, 2)); return 0; }
  if (res.simulated) { say("Sandbox: RSVP well-formed + scoped (no real seat queued)."); return 0; }
  say(res.was_dup ? "Already RSVP'd (recognized as a duplicate)." : "RSVP queued.");
  return 0;
}

async function cmdAuth(opts, cfg, clientFactory, say, warn) {
  const scopes = (opts.scopes ? String(opts.scopes) : "events:read_upcoming")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const sandbox = !!opts.sandbox;
  const ic = clientFactory({ baseUrl: cfg.baseUrl, sandbox, fetch: cfg.fetch });
  const result = await ic.authorize({
    scopes,
    clientName: opts.name ? String(opts.name) : "ic-cli",
    sandbox,
    onPrompt: ({ verifyUrl, userCode }) => {
      warn(`\nApprove this agent:\n  1. Open ${verifyUrl}\n  2. Enter code: ${userCode}\nWaiting for approval…`);
    },
  });
  if (cfg.json) { say(JSON.stringify(result, null, 2)); return 0; }
  say(`\nToken minted${result.sandbox ? " (SANDBOX)" : ""}.`);
  say(`Scopes: ${result.grantedScopes.join(", ") || "(none)"}`);
  say(`\nExport it:\n  export IC_AGENT_TOKEN=${result.token}`);
  return 0;
}

async function cmdDonate(opts, cfg, clientFactory, fetchImpl, say, warn) {
  if (!opts["dry-run"]) {
    warn("Donations settle over x402 (on-chain USDC) and need a wallet-signed X-PAYMENT.");
    warn("This CLI never moves funds. Re-run with --dry-run to see the donor wall + payment shape.");
    return 2;
  }
  const disc = await fetchImpl(`${cfg.baseUrl}/discovery/resources`, { headers: { accept: "application/json" } });
  const discovery = disc.ok ? JSON.parse(await disc.text()) : null;
  const donate = discovery?.resources?.find((r) => String(r.resource).includes("/donate"));
  const ic = clientFactory({ baseUrl: cfg.baseUrl, token: cfg.token, fetch: cfg.fetch });
  let wall = null;
  try { wall = await ic.getDonorWall({ limit: 5 }); } catch { /* donor wall is best-effort */ }

  if (cfg.json) { say(JSON.stringify({ donate: donate ?? null, donor_wall: wall }, null, 2)); return 0; }
  say("Immersive Commons donations (x402 / USDC)");
  if (wall) say(`  Raised: ${wall.total_usdc ?? 0} USDC from ${wall.donor_count ?? 0} donors`);
  if (donate) {
    say(`  Resource: ${donate.resource} [${donate.status}]`);
    const tiers = donate.metadata?.tiers ?? [];
    if (tiers.length) say(`  Tiers: ${tiers.map((t) => `$${t.usd}`).join(", ")}`);
  }
  say("  Dry run: no funds moved. Live giving needs a wallet-signed X-PAYMENT (out of CLI scope).");
  return 0;
}
