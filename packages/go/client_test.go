// Mock-transport tests for the ic client. No network, no live writes: an
// httptest-free RoundTripper stub records every request and returns canned
// spec-shaped bodies. Run: go test ./...
package ic

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type recordedCall struct {
	Method string
	URL    string
	Header http.Header
	Body   string
}

type stubTransport struct {
	handler func(call recordedCall) (int, any)
	calls   []recordedCall
}

func (s *stubTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	body := ""
	if req.Body != nil {
		raw, _ := io.ReadAll(req.Body)
		body = string(raw)
	}
	call := recordedCall{Method: req.Method, URL: req.URL.String(), Header: req.Header.Clone(), Body: body}
	s.calls = append(s.calls, call)
	status, out := s.handler(call)
	var text string
	if str, ok := out.(string); ok {
		text = str
	} else {
		raw, _ := json.Marshal(out)
		text = string(raw)
	}
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(text)),
		Request:    req,
	}, nil
}

func newTestClient(token string, handler func(call recordedCall) (int, any)) (*Client, *stubTransport) {
	st := &stubTransport{handler: handler}
	c := New(Config{Token: token, HTTPClient: &http.Client{Transport: st}})
	return c, st
}

func TestOperationsSurface(t *testing.T) {
	if len(Operations) != 23 {
		t.Fatalf("Operations = %d, want 23", len(Operations))
	}
	if APIVersion != "2026-07-16" {
		t.Fatalf("APIVersion = %q", APIVersion)
	}
	if !Operations["rsvpToEvent"].Idempotent {
		t.Error("rsvpToEvent should be idempotent")
	}
	if Operations["askResearch"].Idempotent {
		t.Error("askResearch should not be idempotent")
	}
	if !Operations["getMyTier"].BrowserSession {
		t.Error("getMyTier should be browser-session-only")
	}
	if Operations["listUpcomingEvents"].RequiresAuth {
		t.Error("listUpcomingEvents should be public")
	}
	if Operations["batchPublicReads"].RequiresAuth {
		t.Error("batchPublicReads should be public")
	}
}

func TestPublicReadNoAuthAndQuery(t *testing.T) {
	c, st := newTestClient("", func(recordedCall) (int, any) {
		return 200, JSON{"ok": true, "events": []any{}, "count": 0}
	})
	res, err := c.ListUpcomingEvents(context.Background(), 3)
	if err != nil {
		t.Fatal(err)
	}
	if res["ok"] != true {
		t.Fatalf("res = %v", res)
	}
	call := st.calls[0]
	if call.URL != "https://www.immersivecommons.com/api/events/upcoming?limit=3" {
		t.Fatalf("url = %s", call.URL)
	}
	if call.Header.Get("Authorization") != "" {
		t.Fatal("no-token client must not send Authorization")
	}
}

func TestBearerAttachesAuth(t *testing.T) {
	c, st := newTestClient("agt_test", func(recordedCall) (int, any) {
		return 200, JSON{"ok": true, "resources": []any{}}
	})
	if _, err := c.ListResources(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := st.calls[0].Header.Get("Authorization"); got != "Bearer agt_test" {
		t.Fatalf("Authorization = %q", got)
	}
}

func TestRequiredQueryParamEncoded(t *testing.T) {
	c, st := newTestClient("", func(recordedCall) (int, any) {
		return 200, JSON{"ok": true, "event": JSON{}}
	})
	if _, err := c.GetEventByLumaUrl(context.Background(), "https://luma.com/abc"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(st.calls[0].URL, "luma=https%3A%2F%2Fluma.com%2Fabc") {
		t.Fatalf("url = %s", st.calls[0].URL)
	}
}

func TestIdempotentWriteHeadersAndBody(t *testing.T) {
	c, st := newTestClient("agt_test", func(recordedCall) (int, any) {
		return 200, JSON{"ok": true, "queued": true}
	})
	res, err := c.RsvpToEvent(context.Background(), "https://luma.com/x", "a@b.co", "", "key-1")
	if err != nil {
		t.Fatal(err)
	}
	if res["ok"] != true {
		t.Fatalf("res = %v", res)
	}
	call := st.calls[0]
	if call.Method != "POST" {
		t.Fatalf("method = %s", call.Method)
	}
	if call.Header.Get("Idempotency-Key") != "key-1" {
		t.Fatal("missing Idempotency-Key")
	}
	if call.Header.Get("Content-Type") != "application/json" {
		t.Fatal("missing Content-Type")
	}
	var body JSON
	if err := json.Unmarshal([]byte(call.Body), &body); err != nil {
		t.Fatal(err)
	}
	if body["event_url"] != "https://luma.com/x" || body["email"] != "a@b.co" {
		t.Fatalf("body = %v", body)
	}
	if _, present := body["name"]; present {
		t.Fatal("empty name must be omitted")
	}
}

func TestIdempotencyKeyOnNonIdempotentOpFailsBeforeSend(t *testing.T) {
	c, st := newTestClient("agt_test", func(recordedCall) (int, any) {
		return 200, JSON{}
	})
	_, err := c.Call(context.Background(), "askResearch", CallOptions{
		Body: JSON{"q": "hi"}, IdempotencyKey: "nope",
	})
	if err == nil || !strings.Contains(err.Error(), "does not accept an Idempotency-Key") {
		t.Fatalf("err = %v", err)
	}
	if len(st.calls) != 0 {
		t.Fatal("request must not be sent")
	}
}

func TestSandboxReceiptReturnedVerbatim(t *testing.T) {
	receipt := JSON{
		"ok": true, "sandbox": true, "simulated": true,
		"would_have": JSON{"action": "rsvpToEvent", "scope": "events:rsvp", "args": JSON{}},
	}
	c, _ := newTestClient("agt_sb", func(recordedCall) (int, any) { return 200, receipt })
	c.Sandbox = true
	res, err := c.RsvpToEvent(context.Background(), "https://luma.com/x", "a@b.co", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if res["simulated"] != true {
		t.Fatalf("res = %v", res)
	}
	wh, _ := res["would_have"].(map[string]any)
	if wh["scope"] != "events:rsvp" {
		t.Fatalf("would_have = %v", wh)
	}
}

func TestTypedErrorWithKindAndRetry(t *testing.T) {
	c, _ := newTestClient("agt_test", func(recordedCall) (int, any) {
		return 429, JSON{"error": "rate_limited", "error_kind": "rate_limit", "retry_after_seconds": 42}
	})
	_, err := c.RsvpToEvent(context.Background(), "https://luma.com/x", "a@b.co", "", "")
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %v", err)
	}
	if apiErr.Status != 429 || apiErr.ErrorKind != "rate_limit" || apiErr.RetryAfterSeconds != 42 {
		t.Fatalf("apiErr = %+v", apiErr)
	}
}

func TestNestedCatchallErrorShape(t *testing.T) {
	c, _ := newTestClient("", func(recordedCall) (int, any) {
		return 401, JSON{"error": JSON{"code": "unauthorized", "message": "no token"}}
	})
	_, err := c.GetMyActivity(context.Background(), 0)
	if err == nil || !strings.Contains(err.Error(), "unauthorized: no token") {
		t.Fatalf("err = %v", err)
	}
}

func TestDeviceCodeLoop(t *testing.T) {
	polls := 0
	c, st := newTestClient("", func(call recordedCall) (int, any) {
		if strings.Contains(call.URL, "/signup/start") {
			return 200, JSON{
				"device_code": "dev_abc", "user_code": "WXYZ-1",
				"verify_url": "https://x/console", "expires_in": 900, "interval": 1,
			}
		}
		polls++
		if polls < 2 {
			return 200, JSON{"status": "pending"}
		}
		return 200, JSON{
			"status": "completed", "agent_token": "agt_minted",
			"granted_scopes": []any{"events:rsvp"}, "tier": "ic-member", "sandbox": true,
		}
	})
	c.Sandbox = true
	var prompted JSON
	res, err := c.Authorize(context.Background(), []string{"events:rsvp"}, AuthorizeOptions{
		ClientName: "test",
		OnPrompt:   func(s JSON) { prompted = s },
		Sleep:      func(time.Duration) {},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Token != "agt_minted" || res.Tier != "ic-member" || !res.Sandbox {
		t.Fatalf("res = %+v", res)
	}
	if len(res.GrantedScopes) != 1 || res.GrantedScopes[0] != "events:rsvp" {
		t.Fatalf("scopes = %v", res.GrantedScopes)
	}
	if prompted["user_code"] != "WXYZ-1" {
		t.Fatalf("prompted = %v", prompted)
	}
	var startBody JSON
	for _, call := range st.calls {
		if strings.Contains(call.URL, "/signup/start") {
			if err := json.Unmarshal([]byte(call.Body), &startBody); err != nil {
				t.Fatal(err)
			}
		}
	}
	if startBody["sandbox"] != true {
		t.Fatalf("start body = %v", startBody)
	}
}
