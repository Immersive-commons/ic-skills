# frozen_string_literal: true

# AUTO-GENERATED from openapi.json by scripts/generate.py — DO NOT EDIT.
# Spec version: 2026-07-16. Regenerate with: python scripts/generate.py

module ImmersiveCommons
  API_VERSION = "2026-07-16"
  DEFAULT_BASE_URL = "https://www.immersivecommons.com"

  # operationId => operation spec (method, path, query, scopes, auth,
  # idempotency, sandbox). The client transport is table-driven off this
  # hash, so no method can describe a route the spec does not.
  OPERATIONS = {
    "listUpcomingEvents" => {
      method: "GET",
      path: "/api/events/upcoming",
      query: [{ name: "limit", required: false }],
      scopes: ["events:read_upcoming"],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "getEventByLumaUrl" => {
      method: "GET",
      path: "/api/events/get",
      query: [{ name: "luma", required: true }],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "batchPublicReads" => {
      method: "POST",
      path: "/api/batch",
      query: [],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: true,
      sandbox: "real"
    }.freeze,
    "tailAgentEvents" => {
      method: "GET",
      path: "/api/events/next",
      query: [{ name: "since", required: false }, { name: "types", required: false }, { name: "limit", required: false }],
      scopes: [],
      requires_auth: true,
      bearer_reachable: false,
      browser_session: true,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "rsvpToEvent" => {
      method: "POST",
      path: "/api/events/rsvp",
      query: [],
      scopes: ["events:rsvp"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: true,
      has_body: true,
      sandbox: "simulated"
    }.freeze,
    "requestEvent" => {
      method: "POST",
      path: "/api/events/request",
      query: [],
      scopes: ["events:request"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: true,
      has_body: true,
      sandbox: "simulated"
    }.freeze,
    "searchDirectory" => {
      method: "GET",
      path: "/api/directory/search",
      query: [{ name: "q", required: false }, { name: "limit", required: false }],
      scopes: ["directory:search"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "listResources" => {
      method: "GET",
      path: "/api/resources/list",
      query: [],
      scopes: ["resources:read"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "bookResource" => {
      method: "POST",
      path: "/api/resources/book",
      query: [],
      scopes: ["resources:book"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: true,
      has_body: true,
      sandbox: "simulated"
    }.freeze,
    "getMyActivity" => {
      method: "GET",
      path: "/api/activity/me",
      query: [{ name: "limit", required: false }],
      scopes: ["membership:read"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "getMyLeaderboardStatus" => {
      method: "GET",
      path: "/api/leaderboard/me",
      query: [],
      scopes: ["leaderboard:manage"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "setLeaderboardOptIn" => {
      method: "POST",
      path: "/api/leaderboard/optin",
      query: [],
      scopes: ["leaderboard:manage"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: true,
      sandbox: "simulated"
    }.freeze,
    "askResearch" => {
      method: "POST",
      path: "/api/research/ask",
      query: [],
      scopes: ["research:query"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: true,
      sandbox: "real"
    }.freeze,
    "submitHighlightPending" => {
      method: "POST",
      path: "/api/ingest/highlights/pending",
      query: [],
      scopes: ["events:submit_recap"],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: true,
      has_body: true,
      sandbox: "simulated"
    }.freeze,
    "submitFeedback" => {
      method: "POST",
      path: "/api/agent/feedback",
      query: [],
      scopes: ["feedback:submit"],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: true,
      sandbox: "real"
    }.freeze,
    "revokeOwnToken" => {
      method: "POST",
      path: "/api/agent/token/revoke",
      query: [],
      scopes: [],
      requires_auth: true,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: "real"
    }.freeze,
    "setupCheck" => {
      method: "GET",
      path: "/api/agent/setup-check",
      query: [],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "startSignup" => {
      method: "POST",
      path: "/api/agent/signup/start",
      query: [],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: true,
      sandbox: nil
    }.freeze,
    "pollSignup" => {
      method: "GET",
      path: "/api/agent/signup/poll",
      query: [{ name: "device_code", required: false }],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "getDonorWall" => {
      method: "GET",
      path: "/api/floor10/donations",
      query: [{ name: "limit", required: false }],
      scopes: [],
      requires_auth: false,
      bearer_reachable: true,
      browser_session: false,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "getMyTier" => {
      method: "GET",
      path: "/api/tier/me",
      query: [],
      scopes: [],
      requires_auth: true,
      bearer_reachable: false,
      browser_session: true,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
    "requestTier" => {
      method: "POST",
      path: "/api/tier/request",
      query: [],
      scopes: [],
      requires_auth: true,
      bearer_reachable: false,
      browser_session: true,
      idempotent: false,
      has_body: true,
      sandbox: nil
    }.freeze,
    "cancelTierRequest" => {
      method: "DELETE",
      path: "/api/tier/request",
      query: [],
      scopes: [],
      requires_auth: true,
      bearer_reachable: false,
      browser_session: true,
      idempotent: false,
      has_body: false,
      sandbox: nil
    }.freeze,
  }.freeze
end
