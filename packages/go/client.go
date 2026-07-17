// Package ic is a thin, spec-derived Go client for the Immersive Commons
// Agent REST API (https://www.immersivecommons.com/developers).
//
// Call is the whole transport: it looks the operation up in the generated
// Operations table, attaches auth + Idempotency-Key when the spec allows, and
// sends the request. The named methods are typed facades over Call — they add
// no routing of their own, so they cannot drift from the spec. Zero
// dependencies (stdlib net/http only).
package ic

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// JSON is the parsed body of an API response.
type JSON = map[string]any

// APIError is returned on a non-2xx response. It carries the parsed error
// body plus the typed fields the API's error envelope declares.
type APIError struct {
	Status            int
	OperationID       string
	Body              JSON
	ErrorKind         string // e.g. "rate_limit", "no_token" — "" when absent
	RetryAfterSeconds int    // 0 when absent
}

func (e *APIError) Error() string {
	msg := ""
	switch v := e.Body["error"].(type) {
	case string:
		msg = v
	case map[string]any:
		parts := []string{}
		if c, ok := v["code"].(string); ok && c != "" {
			parts = append(parts, c)
		}
		if m, ok := v["message"].(string); ok && m != "" {
			parts = append(parts, m)
		}
		msg = strings.Join(parts, ": ")
	}
	if msg == "" {
		if m, ok := e.Body["message"].(string); ok {
			msg = m
		}
	}
	s := fmt.Sprintf("%s failed (HTTP %d)", e.OperationID, e.Status)
	if msg != "" {
		s += ": " + msg
	}
	return s
}

func newAPIError(status int, operationID string, body JSON) *APIError {
	if body == nil {
		body = JSON{}
	}
	e := &APIError{Status: status, OperationID: operationID, Body: body}
	if k, ok := body["error_kind"].(string); ok {
		e.ErrorKind = k
	}
	if ra, ok := body["retry_after_seconds"].(float64); ok {
		e.RetryAfterSeconds = int(ra)
	}
	return e
}

// Config configures a Client. The zero value is usable: production base URL,
// no token, 30s timeout.
type Config struct {
	// Token is the agent bearer token (agt_...). Empty = unauthenticated;
	// public operations still work.
	Token string
	// BaseURL overrides DefaultBaseURL (useful for previews/tests).
	BaseURL string
	// Sandbox is a documentation flag only: a sandbox token already behaves
	// sandbox server-side. It just makes Authorize request one by default.
	Sandbox bool
	// UserAgent overrides the default "ic-go/<APIVersion>".
	UserAgent string
	// HTTPClient overrides the default &http.Client{Timeout: 30s}.
	HTTPClient *http.Client
}

// Client talks to the Immersive Commons Agent REST API.
type Client struct {
	BaseURL   string
	Token     string
	Sandbox   bool
	UserAgent string
	http      *http.Client
}

// New returns a Client for the given Config.
func New(cfg Config) *Client {
	base := cfg.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	ua := cfg.UserAgent
	if ua == "" {
		ua = "ic-go/" + APIVersion
	}
	hc := cfg.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: 30 * time.Second}
	}
	return &Client{
		BaseURL:   strings.TrimRight(base, "/"),
		Token:     cfg.Token,
		Sandbox:   cfg.Sandbox,
		UserAgent: ua,
		http:      hc,
	}
}

// CallOptions are the per-request options for Call.
type CallOptions struct {
	Query          url.Values
	Body           any    // JSON-encoded when the operation accepts a body
	IdempotencyKey string // rejected client-side unless the spec marks the op idempotent
	Token          string // per-call token override
}

// Call performs one operation from the generated Operations table.
func (c *Client) Call(ctx context.Context, operationID string, opts CallOptions) (JSON, error) {
	spec, ok := Operations[operationID]
	if !ok {
		return nil, fmt.Errorf("unknown operationId: %s", operationID)
	}

	var bodyReader io.Reader
	hasBody := false
	if spec.HasBody && opts.Body != nil {
		raw, err := json.Marshal(opts.Body)
		if err != nil {
			return nil, fmt.Errorf("%s: encoding body: %w", operationID, err)
		}
		bodyReader = bytes.NewReader(raw)
		hasBody = true
	}

	if opts.IdempotencyKey != "" && !spec.Idempotent {
		return nil, fmt.Errorf("%s does not accept an Idempotency-Key", operationID)
	}

	u := c.BaseURL + spec.Path
	if enc := opts.Query.Encode(); enc != "" {
		u += "?" + enc
	}

	req, err := http.NewRequestWithContext(ctx, spec.Method, u, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.UserAgent)
	tok := opts.Token
	if tok == "" {
		tok = c.Token
	}
	if tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	if hasBody {
		req.Header.Set("Content-Type", "application/json")
	}
	if opts.IdempotencyKey != "" {
		req.Header.Set("Idempotency-Key", opts.IdempotencyKey)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	text, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var parsed JSON
	if len(text) > 0 {
		_ = json.Unmarshal(text, &parsed) // non-JSON bodies fall through to the error path
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if parsed == nil {
			parsed = JSON{"error": string(text)}
		}
		return nil, newAPIError(resp.StatusCode, operationID, parsed)
	}
	return parsed, nil
}

func intQuery(name string, v int) url.Values {
	q := url.Values{}
	if v > 0 {
		q.Set(name, strconv.Itoa(v))
	}
	return q
}

// ---------------------------------------------------------------------- reads

// ListUpcomingEvents lists upcoming Floor 10 events. limit <= 0 means server default.
func (c *Client) ListUpcomingEvents(ctx context.Context, limit int) (JSON, error) {
	return c.Call(ctx, "listUpcomingEvents", CallOptions{Query: intQuery("limit", limit)})
}

// GetEventByLumaUrl resolves one event by its Luma URL.
func (c *Client) GetEventByLumaUrl(ctx context.Context, luma string) (JSON, error) {
	q := url.Values{}
	q.Set("luma", luma)
	return c.Call(ctx, "getEventByLumaUrl", CallOptions{Query: q})
}

// SearchDirectory searches the members directory. Empty q / limit <= 0 are omitted.
func (c *Client) SearchDirectory(ctx context.Context, q string, limit int) (JSON, error) {
	qv := intQuery("limit", limit)
	if q != "" {
		qv.Set("q", q)
	}
	return c.Call(ctx, "searchDirectory", CallOptions{Query: qv})
}

// ListResources lists bookable floor resources.
func (c *Client) ListResources(ctx context.Context) (JSON, error) {
	return c.Call(ctx, "listResources", CallOptions{})
}

// GetMyActivity returns the caller's recent activity. limit <= 0 means server default.
func (c *Client) GetMyActivity(ctx context.Context, limit int) (JSON, error) {
	return c.Call(ctx, "getMyActivity", CallOptions{Query: intQuery("limit", limit)})
}

// GetMyLeaderboardStatus returns the caller's commits-leaderboard status.
func (c *Client) GetMyLeaderboardStatus(ctx context.Context) (JSON, error) {
	return c.Call(ctx, "getMyLeaderboardStatus", CallOptions{})
}

// GetDonorWall returns the public donor wall. limit <= 0 means server default.
func (c *Client) GetDonorWall(ctx context.Context, limit int) (JSON, error) {
	return c.Call(ctx, "getDonorWall", CallOptions{Query: intQuery("limit", limit)})
}

// SetupCheck validates the current token and reports its scopes/tier.
func (c *Client) SetupCheck(ctx context.Context) (JSON, error) {
	return c.Call(ctx, "setupCheck", CallOptions{})
}

// --------------------------------------------------------------------- writes

// RsvpToEvent RSVPs to an event. name and idempotencyKey are optional ("" = omit).
func (c *Client) RsvpToEvent(ctx context.Context, eventURL, email, name, idempotencyKey string) (JSON, error) {
	body := JSON{"event_url": eventURL, "email": email}
	if name != "" {
		body["name"] = name
	}
	return c.Call(ctx, "rsvpToEvent", CallOptions{Body: body, IdempotencyKey: idempotencyKey})
}

// RequestEvent submits a member event request.
func (c *Client) RequestEvent(ctx context.Context, event JSON, idempotencyKey string) (JSON, error) {
	return c.Call(ctx, "requestEvent", CallOptions{Body: event, IdempotencyKey: idempotencyKey})
}

// BookResource books a floor resource. purpose and idempotencyKey are optional ("" = omit).
func (c *Client) BookResource(ctx context.Context, resourceID, startISO, endISO, email, purpose, idempotencyKey string) (JSON, error) {
	body := JSON{"resource_id": resourceID, "start_iso": startISO, "end_iso": endISO, "email": email}
	if purpose != "" {
		body["purpose"] = purpose
	}
	return c.Call(ctx, "bookResource", CallOptions{Body: body, IdempotencyKey: idempotencyKey})
}

// SetLeaderboardOptIn sets the caller's commits-leaderboard opt-in.
func (c *Client) SetLeaderboardOptIn(ctx context.Context, optIn bool) (JSON, error) {
	return c.Call(ctx, "setLeaderboardOptIn", CallOptions{Body: JSON{"optIn": optIn}})
}

// AskResearch queries the research corpus. extra merges additional body fields
// (k, sources, synthesize, model); nil is fine.
func (c *Client) AskResearch(ctx context.Context, q string, extra JSON) (JSON, error) {
	body := JSON{"q": q}
	for k, v := range extra {
		body[k] = v
	}
	return c.Call(ctx, "askResearch", CallOptions{Body: body})
}

// SubmitHighlightPending submits a MEMBERS WIRE highlight for review.
func (c *Client) SubmitHighlightPending(ctx context.Context, story JSON, idempotencyKey string) (JSON, error) {
	return c.Call(ctx, "submitHighlightPending", CallOptions{Body: story, IdempotencyKey: idempotencyKey})
}

// SubmitFeedback submits feedback. extra merges additional body fields; nil is fine.
func (c *Client) SubmitFeedback(ctx context.Context, kind, message string, extra JSON) (JSON, error) {
	body := JSON{"kind": kind, "message": message}
	for k, v := range extra {
		body[k] = v
	}
	return c.Call(ctx, "submitFeedback", CallOptions{Body: body})
}

// RevokeOwnToken revokes the token making the call.
func (c *Client) RevokeOwnToken(ctx context.Context) (JSON, error) {
	return c.Call(ctx, "revokeOwnToken", CallOptions{})
}

// ---------------------------------------------------------- device-code auth

// StartSignup starts an RFC 8628 device-code signup. sandbox nil = follow
// the client's Sandbox flag.
func (c *Client) StartSignup(ctx context.Context, scopes []string, clientName string, sandbox *bool) (JSON, error) {
	body := JSON{"scopes": scopes}
	if clientName != "" {
		body["client_name"] = clientName
	}
	want := c.Sandbox
	if sandbox != nil {
		want = *sandbox
	}
	if want {
		body["sandbox"] = true
	}
	return c.Call(ctx, "startSignup", CallOptions{Body: body})
}

// PollSignup polls one device-code grant.
func (c *Client) PollSignup(ctx context.Context, deviceCode string) (JSON, error) {
	q := url.Values{}
	q.Set("device_code", deviceCode)
	return c.Call(ctx, "pollSignup", CallOptions{Query: q})
}

// AuthResult is the outcome of a completed device-code grant.
type AuthResult struct {
	Token         string
	GrantedScopes []string
	Tier          string
	Sandbox       bool
}

// AuthorizeOptions tune Authorize. The zero value is fine.
type AuthorizeOptions struct {
	ClientName string       // default "ic-go"
	Sandbox    *bool        // nil = follow the client's Sandbox flag
	OnPrompt   func(JSON)   // receives the start response (user_code, verify_url)
	Timeout    time.Duration // overall deadline; default = server expires_in (or 15m)
	Sleep      func(time.Duration) // injectable for tests; default time.Sleep
}

// Authorize runs the full RFC 8628 device-code grant and returns the minted
// token. It does not store the token on the client — set c.Token yourself if
// you want to.
func (c *Client) Authorize(ctx context.Context, scopes []string, opts AuthorizeOptions) (AuthResult, error) {
	clientName := opts.ClientName
	if clientName == "" {
		clientName = "ic-go"
	}
	sleep := opts.Sleep
	if sleep == nil {
		sleep = time.Sleep
	}

	start, err := c.StartSignup(ctx, scopes, clientName, opts.Sandbox)
	if err != nil {
		return AuthResult{}, err
	}
	if opts.OnPrompt != nil {
		opts.OnPrompt(start)
	}
	deviceCode, _ := start["device_code"].(string)
	if deviceCode == "" {
		return AuthResult{}, errors.New("signup/start returned no device_code")
	}
	interval := time.Duration(5) * time.Second
	if v, ok := start["interval"].(float64); ok && v >= 1 {
		interval = time.Duration(v) * time.Second
	}
	timeout := opts.Timeout
	if timeout == 0 {
		timeout = 15 * time.Minute
		if v, ok := start["expires_in"].(float64); ok && v > 0 {
			timeout = time.Duration(v) * time.Second
		}
	}
	deadline := time.Now().Add(timeout)

	for {
		if time.Now().After(deadline) {
			return AuthResult{}, errors.New("device-code grant timed out before approval")
		}
		if err := ctx.Err(); err != nil {
			return AuthResult{}, err
		}
		sleep(interval)
		poll, err := c.PollSignup(ctx, deviceCode)
		if err != nil {
			return AuthResult{}, err
		}
		switch poll["status"] {
		case "completed":
			tok, _ := poll["agent_token"].(string)
			if tok == "" {
				return AuthResult{}, newAPIError(500, "pollSignup", JSON{"error": "completed without token"})
			}
			res := AuthResult{Token: tok}
			if raw, ok := poll["granted_scopes"].([]any); ok {
				for _, s := range raw {
					if str, ok := s.(string); ok {
						res.GrantedScopes = append(res.GrantedScopes, str)
					}
				}
			}
			res.Tier, _ = poll["tier"].(string)
			res.Sandbox, _ = poll["sandbox"].(bool)
			return res, nil
		case "cancelled":
			reason, _ := poll["reason"].(string)
			return AuthResult{}, fmt.Errorf("device-code grant cancelled: %s", reason)
		}
		// pending -> keep polling
	}
}
