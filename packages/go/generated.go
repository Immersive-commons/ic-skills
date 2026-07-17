// Code generated from openapi.json by scripts/generate.py; DO NOT EDIT.
// Spec version: 2026-07-16. Regenerate with: python scripts/generate.py

package ic

// APIVersion is the version of the OpenAPI spec this table derives from.
const APIVersion = "2026-07-16"

// DefaultBaseURL is the production API origin from the spec's servers[0].
const DefaultBaseURL = "https://www.immersivecommons.com"

// QueryParam describes one query parameter an operation accepts.
type QueryParam struct {
	Name     string
	Required bool
}

// Operation is one row of the spec-derived operations table.
type Operation struct {
	Method          string       // HTTP method, upper-case
	Path            string       // request path, e.g. "/api/events/rsvp"
	Query           []QueryParam // query parameters the spec declares
	Scopes          []string     // agent-token scopes the operation needs
	RequiresAuth    bool         // false = public, callable with no token
	BearerReachable bool         // reachable with an agent bearer token
	BrowserSession  bool         // Clerk-cookie-only (no bearer path)
	Idempotent      bool         // accepts an Idempotency-Key header
	HasBody         bool         // accepts an application/json request body
	Sandbox         string       // x-sandbox: "simulated", "real", or ""
	Summary         string
}

// Operations maps operationId -> its spec row. The client transport is
// table-driven off this map, so no method can describe a route the spec
// does not.
var Operations = map[string]Operation{
	"listUpcomingEvents": {
		Method:          "GET",
		Path:            "/api/events/upcoming",
		Query:           []QueryParam{{Name: "limit", Required: false}},
		Scopes:          []string{"events:read_upcoming"},
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "List upcoming Immersive Commons events",
	},
	"getEventByLumaUrl": {
		Method:          "GET",
		Path:            "/api/events/get",
		Query:           []QueryParam{{Name: "luma", Required: true}},
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Look up a single event by its Luma URL",
	},
	"batchPublicReads": {
		Method:          "POST",
		Path:            "/api/batch",
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         true,
		Sandbox:         "real",
		Summary:         "Run up to 20 public GET reads in one request",
	},
	"tailAgentEvents": {
		Method:          "GET",
		Path:            "/api/events/next",
		Query:           []QueryParam{{Name: "since", Required: false}, {Name: "types", Required: false}, {Name: "limit", Required: false}},
		RequiresAuth:    true,
		BearerReachable: false,
		BrowserSession:  true,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Cursor-tail the caller's agentic event log",
	},
	"rsvpToEvent": {
		Method:          "POST",
		Path:            "/api/events/rsvp",
		Scopes:          []string{"events:rsvp"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      true,
		HasBody:         true,
		Sandbox:         "simulated",
		Summary:         "Queue an RSVP to a Luma event",
	},
	"requestEvent": {
		Method:          "POST",
		Path:            "/api/events/request",
		Scopes:          []string{"events:request"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      true,
		HasBody:         true,
		Sandbox:         "simulated",
		Summary:         "Propose a member event (operator-approved)",
	},
	"searchDirectory": {
		Method:          "GET",
		Path:            "/api/directory/search",
		Query:           []QueryParam{{Name: "q", Required: false}, {Name: "limit", Required: false}},
		Scopes:          []string{"directory:search"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Search the member directory",
	},
	"listResources": {
		Method:          "GET",
		Path:            "/api/resources/list",
		Scopes:          []string{"resources:read"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "List bookable resources",
	},
	"bookResource": {
		Method:          "POST",
		Path:            "/api/resources/book",
		Scopes:          []string{"resources:book"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      true,
		HasBody:         true,
		Sandbox:         "simulated",
		Summary:         "Queue a resource booking",
	},
	"getMyActivity": {
		Method:          "GET",
		Path:            "/api/activity/me",
		Query:           []QueryParam{{Name: "limit", Required: false}},
		Scopes:          []string{"membership:read"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Read the caller's own activity log",
	},
	"getMyLeaderboardStatus": {
		Method:          "GET",
		Path:            "/api/leaderboard/me",
		Scopes:          []string{"leaderboard:manage"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Read the caller's commit-leaderboard state",
	},
	"setLeaderboardOptIn": {
		Method:          "POST",
		Path:            "/api/leaderboard/optin",
		Scopes:          []string{"leaderboard:manage"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         true,
		Sandbox:         "simulated",
		Summary:         "Toggle commit-leaderboard opt-in",
	},
	"askResearch": {
		Method:          "POST",
		Path:            "/api/research/ask",
		Scopes:          []string{"research:query"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         true,
		Sandbox:         "real",
		Summary:         "Query the research RAG corpus",
	},
	"submitHighlightPending": {
		Method:          "POST",
		Path:            "/api/ingest/highlights/pending",
		Scopes:          []string{"events:submit_recap"},
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      true,
		HasBody:         true,
		Sandbox:         "simulated",
		Summary:         "Submit a highlight to the moderation queue",
	},
	"submitFeedback": {
		Method:          "POST",
		Path:            "/api/agent/feedback",
		Scopes:          []string{"feedback:submit"},
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         true,
		Sandbox:         "real",
		Summary:         "File feedback, a feature request, or a breakage report",
	},
	"revokeOwnToken": {
		Method:          "POST",
		Path:            "/api/agent/token/revoke",
		RequiresAuth:    true,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Sandbox:         "real",
		Summary:         "Self-revoke the presenting token",
	},
	"setupCheck": {
		Method:          "GET",
		Path:            "/api/agent/setup-check",
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Deterministic 'am I set up?' probe",
	},
	"startSignup": {
		Method:          "POST",
		Path:            "/api/agent/signup/start",
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         true,
		Summary:         "Begin the RFC 8628 device-code token mint",
	},
	"pollSignup": {
		Method:          "GET",
		Path:            "/api/agent/signup/poll",
		Query:           []QueryParam{{Name: "device_code", Required: false}},
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Poll a device-code grant for completion",
	},
	"getDonorWall": {
		Method:          "GET",
		Path:            "/api/floor10/donations",
		Query:           []QueryParam{{Name: "limit", Required: false}},
		RequiresAuth:    false,
		BearerReachable: true,
		BrowserSession:  false,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Read the public donor wall",
	},
	"getMyTier": {
		Method:          "GET",
		Path:            "/api/tier/me",
		RequiresAuth:    true,
		BearerReachable: false,
		BrowserSession:  true,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Read the caller's membership tier",
	},
	"requestTier": {
		Method:          "POST",
		Path:            "/api/tier/request",
		RequiresAuth:    true,
		BearerReachable: false,
		BrowserSession:  true,
		Idempotent:      false,
		HasBody:         true,
		Summary:         "Request a higher membership tier",
	},
	"cancelTierRequest": {
		Method:          "DELETE",
		Path:            "/api/tier/request",
		RequiresAuth:    true,
		BearerReachable: false,
		BrowserSession:  true,
		Idempotent:      false,
		HasBody:         false,
		Summary:         "Cancel the pending tier request",
	},
}
