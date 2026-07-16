// AUTO-GENERATED from openapi.json by scripts/generate.mjs — DO NOT EDIT BY HAND.
// Spec version: 2026-07-16. Regenerate with: npm run generate
/* eslint-disable */

export const API_VERSION = "2026-07-16" as const;
export const DEFAULT_BASE_URL = "https://www.immersivecommons.com" as const;

export interface OperationSpec {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query: { name: string; required: boolean }[];
  /** IC scopes an agentBearer requirement asks for (union across requirements). */
  scopes: string[];
  /** true when no anonymous (empty {}) security requirement exists. */
  requiresAuth: boolean;
  /** true when the op is reachable with a public call or an agt_ bearer. */
  bearerReachable: boolean;
  /** true when the op is Clerk-cookie only (agents use the MCP equivalent). */
  browserSession: boolean;
  /** true when the op accepts an Idempotency-Key request header. */
  idempotent: boolean;
  hasBody: boolean;
  /** "simulated" | "real" | null — sandbox-token behaviour for this write. */
  sandbox: "simulated" | "real" | null;
  tags: string[];
  summary: string;
}

export const OPERATIONS: Record<string, OperationSpec> = {
  "listUpcomingEvents": {
    "operationId": "listUpcomingEvents",
    "method": "GET",
    "path": "/api/events/upcoming",
    "query": [
      {
        "name": "limit",
        "required": false
      }
    ],
    "scopes": [
      "events:read_upcoming"
    ],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "events"
    ],
    "summary": "List upcoming Immersive Commons events"
  },
  "getEventByLumaUrl": {
    "operationId": "getEventByLumaUrl",
    "method": "GET",
    "path": "/api/events/get",
    "query": [
      {
        "name": "luma",
        "required": true
      }
    ],
    "scopes": [],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "events"
    ],
    "summary": "Look up a single event by its Luma URL"
  },
  "tailAgentEvents": {
    "operationId": "tailAgentEvents",
    "method": "GET",
    "path": "/api/events/next",
    "query": [
      {
        "name": "since",
        "required": false
      },
      {
        "name": "types",
        "required": false
      },
      {
        "name": "limit",
        "required": false
      }
    ],
    "scopes": [],
    "requiresAuth": true,
    "bearerReachable": false,
    "browserSession": true,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "events",
      "browser-session"
    ],
    "summary": "Cursor-tail the caller's agentic event log"
  },
  "rsvpToEvent": {
    "operationId": "rsvpToEvent",
    "method": "POST",
    "path": "/api/events/rsvp",
    "query": [],
    "scopes": [
      "events:rsvp"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": true,
    "hasBody": true,
    "sandbox": "simulated",
    "tags": [
      "events"
    ],
    "summary": "Queue an RSVP to a Luma event"
  },
  "requestEvent": {
    "operationId": "requestEvent",
    "method": "POST",
    "path": "/api/events/request",
    "query": [],
    "scopes": [
      "events:request"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": true,
    "hasBody": true,
    "sandbox": "simulated",
    "tags": [
      "events"
    ],
    "summary": "Propose a member event (operator-approved)"
  },
  "searchDirectory": {
    "operationId": "searchDirectory",
    "method": "GET",
    "path": "/api/directory/search",
    "query": [
      {
        "name": "q",
        "required": false
      },
      {
        "name": "limit",
        "required": false
      }
    ],
    "scopes": [
      "directory:search"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "directory"
    ],
    "summary": "Search the member directory"
  },
  "listResources": {
    "operationId": "listResources",
    "method": "GET",
    "path": "/api/resources/list",
    "query": [],
    "scopes": [
      "resources:read"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "resources"
    ],
    "summary": "List bookable resources"
  },
  "bookResource": {
    "operationId": "bookResource",
    "method": "POST",
    "path": "/api/resources/book",
    "query": [],
    "scopes": [
      "resources:book"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": true,
    "hasBody": true,
    "sandbox": "simulated",
    "tags": [
      "resources"
    ],
    "summary": "Queue a resource booking"
  },
  "getMyActivity": {
    "operationId": "getMyActivity",
    "method": "GET",
    "path": "/api/activity/me",
    "query": [
      {
        "name": "limit",
        "required": false
      }
    ],
    "scopes": [
      "membership:read"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "account"
    ],
    "summary": "Read the caller's own activity log"
  },
  "getMyLeaderboardStatus": {
    "operationId": "getMyLeaderboardStatus",
    "method": "GET",
    "path": "/api/leaderboard/me",
    "query": [],
    "scopes": [
      "leaderboard:manage"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "leaderboard"
    ],
    "summary": "Read the caller's commit-leaderboard state"
  },
  "setLeaderboardOptIn": {
    "operationId": "setLeaderboardOptIn",
    "method": "POST",
    "path": "/api/leaderboard/optin",
    "query": [],
    "scopes": [
      "leaderboard:manage"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": true,
    "sandbox": "simulated",
    "tags": [
      "leaderboard"
    ],
    "summary": "Toggle commit-leaderboard opt-in"
  },
  "askResearch": {
    "operationId": "askResearch",
    "method": "POST",
    "path": "/api/research/ask",
    "query": [],
    "scopes": [
      "research:query"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": true,
    "sandbox": "real",
    "tags": [
      "research"
    ],
    "summary": "Query the research RAG corpus"
  },
  "submitHighlightPending": {
    "operationId": "submitHighlightPending",
    "method": "POST",
    "path": "/api/ingest/highlights/pending",
    "query": [],
    "scopes": [
      "events:submit_recap"
    ],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": true,
    "hasBody": true,
    "sandbox": "simulated",
    "tags": [
      "highlights"
    ],
    "summary": "Submit a highlight to the moderation queue"
  },
  "submitFeedback": {
    "operationId": "submitFeedback",
    "method": "POST",
    "path": "/api/agent/feedback",
    "query": [],
    "scopes": [
      "feedback:submit"
    ],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": true,
    "sandbox": "real",
    "tags": [
      "feedback"
    ],
    "summary": "File feedback, a feature request, or a breakage report"
  },
  "revokeOwnToken": {
    "operationId": "revokeOwnToken",
    "method": "POST",
    "path": "/api/agent/token/revoke",
    "query": [],
    "scopes": [],
    "requiresAuth": true,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": "real",
    "tags": [
      "auth"
    ],
    "summary": "Self-revoke the presenting token"
  },
  "setupCheck": {
    "operationId": "setupCheck",
    "method": "GET",
    "path": "/api/agent/setup-check",
    "query": [],
    "scopes": [],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "auth"
    ],
    "summary": "Deterministic 'am I set up?' probe"
  },
  "startSignup": {
    "operationId": "startSignup",
    "method": "POST",
    "path": "/api/agent/signup/start",
    "query": [],
    "scopes": [],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": true,
    "sandbox": null,
    "tags": [
      "auth"
    ],
    "summary": "Begin the RFC 8628 device-code token mint"
  },
  "pollSignup": {
    "operationId": "pollSignup",
    "method": "GET",
    "path": "/api/agent/signup/poll",
    "query": [
      {
        "name": "device_code",
        "required": false
      }
    ],
    "scopes": [],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "auth"
    ],
    "summary": "Poll a device-code grant for completion"
  },
  "getDonorWall": {
    "operationId": "getDonorWall",
    "method": "GET",
    "path": "/api/floor10/donations",
    "query": [
      {
        "name": "limit",
        "required": false
      }
    ],
    "scopes": [],
    "requiresAuth": false,
    "bearerReachable": true,
    "browserSession": false,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "payments"
    ],
    "summary": "Read the public donor wall"
  },
  "getMyTier": {
    "operationId": "getMyTier",
    "method": "GET",
    "path": "/api/tier/me",
    "query": [],
    "scopes": [],
    "requiresAuth": true,
    "bearerReachable": false,
    "browserSession": true,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "membership",
      "browser-session"
    ],
    "summary": "Read the caller's membership tier"
  },
  "requestTier": {
    "operationId": "requestTier",
    "method": "POST",
    "path": "/api/tier/request",
    "query": [],
    "scopes": [],
    "requiresAuth": true,
    "bearerReachable": false,
    "browserSession": true,
    "idempotent": false,
    "hasBody": true,
    "sandbox": null,
    "tags": [
      "membership",
      "browser-session"
    ],
    "summary": "Request a higher membership tier"
  },
  "cancelTierRequest": {
    "operationId": "cancelTierRequest",
    "method": "DELETE",
    "path": "/api/tier/request",
    "query": [],
    "scopes": [],
    "requiresAuth": true,
    "bearerReachable": false,
    "browserSession": true,
    "idempotent": false,
    "hasBody": false,
    "sandbox": null,
    "tags": [
      "membership",
      "browser-session"
    ],
    "summary": "Cancel the pending tier request"
  }
};

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------
/** Structured JSON error. `error` is an error code or a human-readable message (both are strings on the live surface). `ok:false` is present on bearer auth-gate rejections. The other fields appear on the endpoints that emit them. (The /api catch-all floor for unmatched paths uses a nested { error: { code, message } } instead — see info.description.) */
export type Error = { error: string; ok?: false; error_kind?: string; message?: string; rate?: RateInfo; retry_after_seconds?: number };

/** Per-token rate-limit snapshot returned by write endpoints. */
export type RateInfo = { current?: number; remaining?: number; limit?: number };

/** One cached upcoming event. Passthrough of lib/events-ops shape; extra fields may appear. */
export type EventSummary = { luma_url?: string; title?: string; start?: string; end?: string; location?: string; cover_url?: string; [k: string]: unknown };

export type UpcomingEventsResponse = { ok: boolean; events?: EventSummary[]; count?: number; age_min?: number; [k: string]: unknown };

export type EventGetResponse = { ok: boolean; event: EventSummary };

/** Cursor-paginated page of agentic events. */
export type AgentEventsNextResponse = { events: Record<string, unknown>[]; cursor?: number; has_more?: boolean; as_of?: string; [k: string]: unknown };

export type RsvpRequest = { event_url: string; email?: string; name?: string };

/** Luma-shaped event proposal (EventRequestDetails). */
export type EventRequestRequest = { title: string; start: string; end?: string; location?: string; description?: string; cover_url?: string; capacity?: number; visibility?: "public" | "members"; host?: string; contact?: string; slideshow_url?: string };

export type EventRequestResponse = { ok: boolean; id: string; status: "pending"; via?: "clerk" | "agent" };

/** Shared shape for the queue-and-forget writes (rsvp, book). */
export type QueueResponse = { ok: boolean; queued: boolean; was_dup?: boolean; rate?: RateInfo; via?: "clerk" | "agent"; note?: string };

/** Privacy-graded results; the fields per member depend on the caller's tier. */
export type DirectorySearchResponse = { results?: Record<string, unknown>[]; count?: number; query?: string; [k: string]: unknown };

export type ResourcesListResponse = { ok: boolean; resources?: Record<string, unknown>[]; via?: "clerk" | "agent"; [k: string]: unknown };

export type BookRequest = { resource_id: string; start_iso: string; end_iso: string; purpose?: string; email?: string };

export type ActivityResponse = { ok: boolean; count?: number; limit?: number; events: Record<string, unknown>[]; via?: "clerk" | "agent" };

export type LeaderboardMeResponse = { ok: boolean; optIn?: boolean; github_username?: string; github_link_source?: "oauth" | "agent_pat"; github_verified_at?: string; this_week?: { count?: number; rank?: number; total?: number; generated_at?: string }; [k: string]: unknown };

export type LeaderboardOptInRequest = { optIn: boolean };

export type LeaderboardOptInResponse = { ok: boolean; optIn: boolean; github_username?: string; via?: "clerk" | "agent" };

export type ResearchAskRequest = { q: string; k?: number; sources?: ("paper" | "book")[]; synthesize?: boolean; model?: "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-7" };

/** Passthrough from the RAG funnel. `/search` returns { results, via }; `/synthesize` returns { q, k, model, answer, citations, retrieval_results, usage, via }. */
export type ResearchAskResponse = { results?: Record<string, unknown>[]; answer?: string; citations?: Record<string, unknown>[]; via?: string; [k: string]: unknown };

/** A HighlightStory, or an object wrapping one under `story`. Validated by lib/highlights-pending.ts. */
export type HighlightPendingRequest = { id?: string; story?: Record<string, unknown>; [k: string]: unknown };

export type HighlightPendingResponse = { ok: boolean; id: string; status: "pending"; rate?: RateInfo; expires_at?: string };

export type FeedbackSubmitRequest = { kind: "broken_url" | "schema_mismatch" | "stale_doc" | "endpoint_404" | "bug_report" | "other" | "feature_request" | "praise" | "complaint" | "question" | "suggestion"; message: string; url?: string; expected?: string; got?: string; priority?: "low" | "normal" | "high"; category?: string; agent_id?: string; contact?: string };

export type FeedbackSubmitResponse = { ok: boolean; ticket_id: string; received_at?: string; authenticated?: boolean; message?: string; warnings?: string[] };

export type TokenRevokeResponse = { ok: boolean; revoked: boolean; prefix?: string; already_revoked?: boolean };

/** ready:true carries checks{scopes,member_id,...}+mcp; ready:false carries missing[]+next_actions[]+mcp. */
export type SetupCheckResponse = { ready: boolean; checks?: Record<string, unknown>; missing?: string[]; next_actions?: Record<string, unknown>[]; mcp?: Record<string, unknown>; [k: string]: unknown };

export type SignupStartRequest = { scopes: string[]; client_name?: string; sandbox?: boolean };

export type SignupStartResponse = { device_code: string; user_code: string; verify_url: string; verify_url_complete?: string; expires_in: number; interval: number };

/** One of pending / completed / cancelled. `completed` surfaces the agent_token exactly once. */
export type SignupPollResponse = { status: "pending" | "completed" | "cancelled"; user_id?: string; agent_token?: string; tier?: string; pending_tier?: string; granted_scopes?: string[]; sandbox?: boolean; reason?: string; next_steps?: Record<string, unknown>; [k: string]: unknown };

export type DonationsResponse = { ok: boolean; total_usdc?: number; donor_count?: number; recent?: Record<string, unknown>[]; [k: string]: unknown };

export type TierMeResponse = { ok: boolean; tier: string; pending?: Record<string, unknown> | null; history?: Record<string, unknown>[]; email?: string; display_name?: string };

export type TierRequestRequest = { tier: string; note?: string };

export type TierRequestResponse = { ok: boolean; current_tier: string; requested_tier: string; submitted_at?: string; kv_warning?: string };

export type TierRequestCancelResponse = { ok: boolean; was_pending: boolean };

/** Simulated write receipt returned by a sandbox token (root x-sandbox extension). A green receipt means well-formed + scoped, NOT guaranteed to pass in production. */
export interface SandboxReceipt {
  ok: true;
  sandbox: true;
  simulated: true;
  would_have: { action: string; scope: string; args: Record<string, unknown> };
  note?: string;
}

// ---------------------------------------------------------------------------
// Per-operation request/response aliases
// ---------------------------------------------------------------------------
export type ListUpcomingEventsResponse = UpcomingEventsResponse;
export type GetEventByLumaUrlResponse = EventGetResponse;
export type TailAgentEventsResponse = AgentEventsNextResponse;
export type RsvpToEventResponse = QueueResponse;
export type RsvpToEventBody = RsvpRequest;
export type RequestEventResponse = EventRequestResponse;
export type RequestEventBody = EventRequestRequest;
export type SearchDirectoryResponse = DirectorySearchResponse;
export type ListResourcesResponse = ResourcesListResponse;
export type BookResourceResponse = QueueResponse;
export type BookResourceBody = BookRequest;
export type GetMyActivityResponse = ActivityResponse;
export type GetMyLeaderboardStatusResponse = LeaderboardMeResponse;
export type SetLeaderboardOptInResponse = LeaderboardOptInResponse;
export type SetLeaderboardOptInBody = LeaderboardOptInRequest;
export type AskResearchResponse = ResearchAskResponse;
export type AskResearchBody = ResearchAskRequest;
export type SubmitHighlightPendingResponse = HighlightPendingResponse;
export type SubmitHighlightPendingBody = HighlightPendingRequest;
export type SubmitFeedbackResponse = FeedbackSubmitResponse;
export type SubmitFeedbackBody = FeedbackSubmitRequest;
export type RevokeOwnTokenResponse = TokenRevokeResponse;
export type StartSignupResponse = SignupStartResponse;
export type StartSignupBody = SignupStartRequest;
export type PollSignupResponse = SignupPollResponse;
export type GetDonorWallResponse = DonationsResponse;
export type GetMyTierResponse = TierMeResponse;
export type RequestTierResponse = TierRequestResponse;
export type RequestTierBody = TierRequestRequest;
export type CancelTierRequestResponse = TierRequestCancelResponse;
