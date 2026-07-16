// Thin, table-driven client over the IC Agent REST API.
//
// `call()` is the whole transport: it looks the operation up in the generated
// OPERATIONS table, attaches auth + Idempotency-Key when the spec allows, and
// delegates to httpRequest. The named methods below are typed facades over
// `call()` — they add no routing of their own, so they cannot drift from the
// spec. Regenerate types + table with `npm run generate`.

import {
  OPERATIONS,
  DEFAULT_BASE_URL,
  API_VERSION,
  type OperationSpec,
} from "./generated.js";
import type {
  UpcomingEventsResponse,
  EventGetResponse,
  DirectorySearchResponse,
  ResourcesListResponse,
  ActivityResponse,
  LeaderboardMeResponse,
  DonationsResponse,
  SetupCheckResponse,
  SignupPollResponse,
  SignupStartResponse,
  QueueResponse,
  EventRequestResponse,
  LeaderboardOptInResponse,
  ResearchAskResponse,
  HighlightPendingResponse,
  TokenRevokeResponse,
  FeedbackSubmitResponse,
  RsvpRequest,
  EventRequestRequest,
  BookRequest,
  LeaderboardOptInRequest,
  ResearchAskRequest,
  HighlightPendingRequest,
  FeedbackSubmitRequest,
  SignupStartRequest,
  SandboxReceipt,
} from "./generated.js";
import { httpRequest, buildQuery, IcApiError, type FetchLike } from "./http.js";

export { IcApiError, API_VERSION, OPERATIONS };
export type { OperationSpec };

/** A write result is either the real response or a sandbox-token receipt. */
export type Sandboxable<T> = T | SandboxReceipt;

export interface IcClientOptions {
  /** agt_ bearer token. Omit for public reads / the signup flow. */
  token?: string;
  /** Override the API origin (default https://www.immersivecommons.com). */
  baseUrl?: string;
  /**
   * Documentation flag ONLY. A sandbox token already behaves sandbox
   * server-side; setting this makes `authorize()` request a sandbox token by
   * default and signals intent. It does NOT change how requests are sent.
   */
  sandbox?: boolean;
  /** Inject a fetch implementation (tests, older runtimes). */
  fetch?: FetchLike;
  /** Sent as User-Agent. */
  userAgent?: string;
}

export interface CallOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Only honored on operations whose spec marks them idempotent. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Override the instance token for this one call. */
  token?: string;
}

export interface AuthorizeOptions {
  scopes: string[];
  clientName?: string;
  sandbox?: boolean;
  /** Show the human where to approve. Called once with the verify URL + code. */
  onPrompt?: (info: { verifyUrl: string; verifyUrlComplete?: string; userCode: string }) => void;
  /** Poll ceiling in seconds (default = grant expires_in). */
  timeoutSeconds?: number;
  signal?: AbortSignal;
}

export interface AuthorizeResult {
  token: string;
  grantedScopes: string[];
  tier?: string;
  sandbox: boolean;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    }, { once: true });
  });

export class IcClient {
  readonly baseUrl: string;
  readonly sandbox: boolean;
  private token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly userAgent: string;

  constructor(opts: IcClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.token = opts.token;
    this.sandbox = !!opts.sandbox;
    this.userAgent = opts.userAgent ?? `immersivecommons-sdk/${API_VERSION}`;
    const f = opts.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!f) {
      throw new Error(
        "No fetch available. Use Node >= 20, or pass { fetch } in IcClientOptions."
      );
    }
    this.fetchImpl = f;
  }

  /** Replace the bearer token (e.g. right after authorize()). */
  setToken(token: string | undefined): void {
    this.token = token;
  }

  /** Generic, spec-driven request. Named methods below all route through this. */
  async call<T = unknown>(operationId: string, opts: CallOptions = {}): Promise<T> {
    const spec = OPERATIONS[operationId];
    if (!spec) throw new Error(`Unknown operationId: ${operationId}`);

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": this.userAgent,
    };
    const token = opts.token ?? this.token;
    if (token) headers.authorization = `Bearer ${token}`;
    if (spec.hasBody && opts.body !== undefined) headers["content-type"] = "application/json";
    if (opts.idempotencyKey) {
      if (!spec.idempotent) {
        throw new Error(`${operationId} does not accept an Idempotency-Key`);
      }
      headers["idempotency-key"] = opts.idempotencyKey;
    }

    const url = this.baseUrl + spec.path + buildQuery(opts.query);
    return httpRequest<T>({
      fetchImpl: this.fetchImpl,
      operationId,
      method: spec.method,
      url,
      headers,
      body: opts.body,
      signal: opts.signal,
    });
  }

  // ------------------------------------------------------------------ reads
  listUpcomingEvents(query: { limit?: number } = {}) {
    return this.call<UpcomingEventsResponse>("listUpcomingEvents", { query });
  }
  getEventByLumaUrl(luma: string) {
    return this.call<EventGetResponse>("getEventByLumaUrl", { query: { luma } });
  }
  searchDirectory(query: { q?: string; limit?: number } = {}) {
    return this.call<DirectorySearchResponse>("searchDirectory", { query });
  }
  listResources() {
    return this.call<ResourcesListResponse>("listResources");
  }
  getMyActivity(query: { limit?: number } = {}) {
    return this.call<ActivityResponse>("getMyActivity", { query });
  }
  getMyLeaderboardStatus() {
    return this.call<LeaderboardMeResponse>("getMyLeaderboardStatus");
  }
  getDonorWall(query: { limit?: number } = {}) {
    return this.call<DonationsResponse>("getDonorWall", { query });
  }
  setupCheck() {
    return this.call<SetupCheckResponse>("setupCheck");
  }

  // ----------------------------------------------------------------- writes
  rsvpToEvent(body: RsvpRequest, opts: { idempotencyKey?: string } = {}) {
    return this.call<Sandboxable<QueueResponse>>("rsvpToEvent", { body, idempotencyKey: opts.idempotencyKey });
  }
  requestEvent(body: EventRequestRequest, opts: { idempotencyKey?: string } = {}) {
    return this.call<Sandboxable<EventRequestResponse>>("requestEvent", { body, idempotencyKey: opts.idempotencyKey });
  }
  bookResource(body: BookRequest, opts: { idempotencyKey?: string } = {}) {
    return this.call<Sandboxable<QueueResponse>>("bookResource", { body, idempotencyKey: opts.idempotencyKey });
  }
  setLeaderboardOptIn(body: LeaderboardOptInRequest) {
    return this.call<Sandboxable<LeaderboardOptInResponse>>("setLeaderboardOptIn", { body });
  }
  askResearch(body: ResearchAskRequest) {
    // x-sandbox: "real" — a sandbox token gets real retrieval, never a receipt.
    return this.call<ResearchAskResponse>("askResearch", { body });
  }
  submitHighlightPending(body: HighlightPendingRequest, opts: { idempotencyKey?: string } = {}) {
    return this.call<Sandboxable<HighlightPendingResponse>>("submitHighlightPending", { body, idempotencyKey: opts.idempotencyKey });
  }
  submitFeedback(body: FeedbackSubmitRequest) {
    // x-sandbox: "real" — feedback is genuinely filed even from a sandbox token.
    return this.call<FeedbackSubmitResponse>("submitFeedback", { body });
  }
  revokeOwnToken() {
    // x-sandbox: "real" — self-revocation genuinely happens.
    return this.call<TokenRevokeResponse>("revokeOwnToken");
  }

  // --------------------------------------------------------- device-code auth
  startSignup(body: SignupStartRequest) {
    const withSandbox =
      this.sandbox && body.sandbox === undefined ? { ...body, sandbox: true } : body;
    return this.call<SignupStartResponse>("startSignup", { body: withSandbox });
  }
  pollSignup(deviceCode: string) {
    return this.call<SignupPollResponse>("pollSignup", { query: { device_code: deviceCode } });
  }

  /**
   * Run the full RFC 8628 device-code grant: start, surface the code to the
   * human via onPrompt, poll until approved, and return the minted token.
   * Does NOT store the token on the client — call setToken() if you want to.
   */
  async authorize(opts: AuthorizeOptions): Promise<AuthorizeResult> {
    const wantSandbox = opts.sandbox ?? this.sandbox;
    const start = await this.startSignup({
      scopes: opts.scopes,
      client_name: opts.clientName,
      ...(wantSandbox ? { sandbox: true } : {}),
    });
    opts.onPrompt?.({
      verifyUrl: start.verify_url,
      verifyUrlComplete: start.verify_url_complete,
      userCode: start.user_code,
    });

    const intervalMs = Math.max(1, start.interval ?? 5) * 1000;
    const deadline = Date.now() + (opts.timeoutSeconds ?? start.expires_in ?? 900) * 1000;

    for (;;) {
      if (Date.now() > deadline) throw new Error("Device-code grant timed out before approval.");
      await sleep(intervalMs, opts.signal);
      const poll = await this.pollSignup(start.device_code);
      if (poll.status === "completed") {
        if (!poll.agent_token) throw new Error("Grant completed but no token was surfaced.");
        return {
          token: poll.agent_token,
          grantedScopes: poll.granted_scopes ?? [],
          tier: poll.tier,
          sandbox: !!poll.sandbox,
        };
      }
      if (poll.status === "cancelled") {
        throw new Error(`Device-code grant cancelled${poll.reason ? `: ${poll.reason}` : "."}`);
      }
      // status === "pending" → keep polling.
    }
  }
}
