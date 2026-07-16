"""Mock-transport tests for the immersivecommons client. No network, no live
writes: a stub transport records every request and returns canned spec-shaped
bodies. Run: python -m unittest discover -s tests
"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from immersivecommons import Client, IcApiError, OPERATIONS, API_VERSION  # noqa: E402


def mock_transport(handler):
    """handler(method, url, headers, body) -> (status, body_dict|str). Records calls."""
    calls = []

    def send(method, url, headers, body):
        calls.append({"method": method, "url": url, "headers": dict(headers), "body": body})
        status, out = handler(method, url, headers, body)
        text = out if isinstance(out, str) else json.dumps(out)
        return status, {}, text

    send.calls = calls
    return send


class TableTests(unittest.TestCase):
    def test_operations_surface(self):
        self.assertEqual(len(OPERATIONS), 22)
        self.assertEqual(API_VERSION, "2026-07-16")
        self.assertTrue(OPERATIONS["rsvpToEvent"]["idempotent"])
        self.assertFalse(OPERATIONS["askResearch"]["idempotent"])
        self.assertTrue(OPERATIONS["getMyTier"]["browser_session"])
        self.assertFalse(OPERATIONS["listUpcomingEvents"]["requires_auth"])


class ReadTests(unittest.TestCase):
    def test_public_read_no_auth_and_query(self):
        t = mock_transport(lambda *_: (200, {"ok": True, "events": [], "count": 0}))
        ic = Client(transport=t)
        res = ic.list_upcoming_events(limit=3)
        self.assertTrue(res["ok"])
        self.assertEqual(t.calls[0]["url"], "https://www.immersivecommons.com/api/events/upcoming?limit=3")
        self.assertNotIn("authorization", t.calls[0]["headers"])

    def test_bearer_attaches_auth(self):
        t = mock_transport(lambda *_: (200, {"ok": True, "resources": []}))
        ic = Client(token="agt_test", transport=t)
        ic.list_resources()
        self.assertEqual(t.calls[0]["headers"]["authorization"], "Bearer agt_test")

    def test_required_query_param_encoded(self):
        t = mock_transport(lambda *_: (200, {"ok": True, "event": {}}))
        ic = Client(transport=t)
        ic.get_event_by_luma_url("https://luma.com/abc")
        self.assertIn("luma=https%3A%2F%2Fluma.com%2Fabc", t.calls[0]["url"])


class WriteTests(unittest.TestCase):
    def test_idempotent_write_headers_and_body(self):
        t = mock_transport(lambda *_: (200, {"ok": True, "queued": True}))
        ic = Client(token="agt_test", transport=t)
        res = ic.rsvp_to_event("https://luma.com/x", email="a@b.co", idempotency_key="key-1")
        self.assertTrue(res["ok"])
        call = t.calls[0]
        self.assertEqual(call["method"], "POST")
        self.assertEqual(call["headers"]["idempotency-key"], "key-1")
        self.assertEqual(call["headers"]["content-type"], "application/json")
        self.assertEqual(json.loads(call["body"]), {"event_url": "https://luma.com/x", "email": "a@b.co"})

    def test_idempotency_on_non_idempotent_op_raises_before_send(self):
        t = mock_transport(lambda *_: (200, {}))
        ic = Client(token="agt_test", transport=t)
        with self.assertRaises(ValueError):
            ic.call("askResearch", body={"q": "hi"}, idempotency_key="nope")
        self.assertEqual(len(t.calls), 0)

    def test_sandbox_receipt_returned_verbatim(self):
        receipt = {"ok": True, "sandbox": True, "simulated": True,
                   "would_have": {"action": "rsvpToEvent", "scope": "events:rsvp", "args": {}}}
        t = mock_transport(lambda *_: (200, receipt))
        ic = Client(token="agt_sb", sandbox=True, transport=t)
        res = ic.rsvp_to_event("https://luma.com/x", email="a@b.co")
        self.assertTrue(res["simulated"])
        self.assertEqual(res["would_have"]["scope"], "events:rsvp")


class ErrorTests(unittest.TestCase):
    def test_typed_error_with_kind_and_retry(self):
        t = mock_transport(lambda *_: (429, {"error": "rate_limited", "error_kind": "rate_limit", "retry_after_seconds": 42}))
        ic = Client(token="agt_test", transport=t)
        with self.assertRaises(IcApiError) as cm:
            ic.rsvp_to_event("https://luma.com/x", email="a@b.co")
        self.assertEqual(cm.exception.status, 429)
        self.assertEqual(cm.exception.error_kind, "rate_limit")
        self.assertEqual(cm.exception.retry_after_seconds, 42)

    def test_nested_catchall_error_shape(self):
        t = mock_transport(lambda *_: (401, {"error": {"code": "unauthorized", "message": "no token"}}))
        ic = Client(transport=t)
        with self.assertRaises(IcApiError) as cm:
            ic.get_my_activity()
        self.assertIn("unauthorized: no token", str(cm.exception))


class AuthTests(unittest.TestCase):
    def test_device_code_loop(self):
        state = {"polls": 0}

        def handler(method, url, headers, body):
            if "/signup/start" in url:
                return 200, {"device_code": "dev_abc", "user_code": "WXYZ-1", "verify_url": "https://x/console", "expires_in": 900, "interval": 1}
            state["polls"] += 1
            if state["polls"] < 2:
                return 200, {"status": "pending"}
            return 200, {"status": "completed", "agent_token": "agt_minted", "granted_scopes": ["events:rsvp"], "tier": "ic-member", "sandbox": True}

        t = mock_transport(handler)
        ic = Client(sandbox=True, transport=t)
        prompted = {}
        res = ic.authorize(["events:rsvp"], client_name="test", on_prompt=lambda s: prompted.update(s), sleep=lambda _s: None)
        self.assertEqual(res["token"], "agt_minted")
        self.assertEqual(res["granted_scopes"], ["events:rsvp"])
        self.assertTrue(res["sandbox"])
        self.assertEqual(prompted["user_code"], "WXYZ-1")
        start_call = next(c for c in t.calls if "/signup/start" in c["url"])
        self.assertTrue(json.loads(start_call["body"])["sandbox"])


if __name__ == "__main__":
    unittest.main()
