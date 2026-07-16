"""Thin, table-driven client for the Immersive Commons Agent REST API.

`call()` is the whole transport: it looks the operation up in the generated
OPERATIONS table, attaches auth + Idempotency-Key when the spec allows, and
sends the request. The named methods are typed facades over `call()` — they add
no routing of their own, so they cannot drift from the spec. Zero dependencies
(stdlib urllib only).
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Iterable, Mapping

from ._generated import API_VERSION, DEFAULT_BASE_URL, OPERATIONS

__all__ = ["Client", "IcApiError", "API_VERSION", "OPERATIONS"]

JSON = dict[str, Any]
# A transport returns (status_code, headers, body_text).
Transport = Callable[[str, str, Mapping[str, str], "bytes | None"], "tuple[int, Mapping[str, str], str]"]


class IcApiError(Exception):
    """Raised on a non-2xx response. Carries the parsed error body + metadata."""

    def __init__(self, status: int, operation_id: str, body: Any):
        self.status = status
        self.operation_id = operation_id
        self.body = body if isinstance(body, dict) else {}
        msg = None
        err = self.body.get("error")
        if isinstance(err, str):
            msg = err
        elif isinstance(err, dict):
            msg = ": ".join(str(x) for x in (err.get("code"), err.get("message")) if x) or None
        if not msg and isinstance(self.body.get("message"), str):
            msg = self.body["message"]
        self.error_kind = self.body.get("error_kind") if isinstance(self.body.get("error_kind"), str) else None
        ra = self.body.get("retry_after_seconds")
        self.retry_after_seconds = ra if isinstance(ra, int) else None
        super().__init__(f"{operation_id} failed (HTTP {status})" + (f": {msg}" if msg else ""))


def _default_transport(timeout: float) -> Transport:
    def send(method: str, url: str, headers: Mapping[str, str], body: bytes | None):
        req = urllib.request.Request(url, data=body, headers=dict(headers), method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, dict(resp.headers), resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:  # 4xx/5xx still carry a JSON body
            return e.code, dict(e.headers or {}), e.read().decode("utf-8")

    return send


class Client:
    def __init__(
        self,
        token: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        sandbox: bool = False,
        timeout: float = 30.0,
        transport: Transport | None = None,
        user_agent: str | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        # Documentation flag only: a sandbox token already behaves sandbox
        # server-side. This just makes authorize() request one by default.
        self.sandbox = sandbox
        self.user_agent = user_agent or f"immersivecommons-python/{API_VERSION}"
        self._send: Transport = transport or _default_transport(timeout)

    def set_token(self, token: str | None) -> None:
        self.token = token

    # ---------------------------------------------------------------- generic
    def call(
        self,
        operation_id: str,
        query: Mapping[str, Any] | None = None,
        body: Any = None,
        idempotency_key: str | None = None,
        token: str | None = None,
    ) -> Any:
        spec = OPERATIONS.get(operation_id)
        if not spec:
            raise ValueError(f"Unknown operationId: {operation_id}")

        headers: dict[str, str] = {"accept": "application/json", "user-agent": self.user_agent}
        tok = token or self.token
        if tok:
            headers["authorization"] = f"Bearer {tok}"

        data: bytes | None = None
        if spec["has_body"] and body is not None:
            headers["content-type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        if idempotency_key:
            if not spec["idempotent"]:
                raise ValueError(f"{operation_id} does not accept an Idempotency-Key")
            headers["idempotency-key"] = idempotency_key

        url = self.base_url + spec["path"] + _query_string(query)
        status, _resp_headers, text = self._send(spec["method"], url, headers, data)
        parsed: Any = None
        if text:
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None
        if not (200 <= status < 300):
            raise IcApiError(status, operation_id, parsed if parsed is not None else {"error": text})
        return parsed

    # ------------------------------------------------------------------ reads
    def list_upcoming_events(self, limit: int | None = None) -> JSON:
        return self.call("listUpcomingEvents", query={"limit": limit} if limit is not None else None)

    def get_event_by_luma_url(self, luma: str) -> JSON:
        return self.call("getEventByLumaUrl", query={"luma": luma})

    def search_directory(self, q: str | None = None, limit: int | None = None) -> JSON:
        return self.call("searchDirectory", query={"q": q, "limit": limit})

    def list_resources(self) -> JSON:
        return self.call("listResources")

    def get_my_activity(self, limit: int | None = None) -> JSON:
        return self.call("getMyActivity", query={"limit": limit} if limit is not None else None)

    def get_my_leaderboard_status(self) -> JSON:
        return self.call("getMyLeaderboardStatus")

    def get_donor_wall(self, limit: int | None = None) -> JSON:
        return self.call("getDonorWall", query={"limit": limit} if limit is not None else None)

    def setup_check(self) -> JSON:
        return self.call("setupCheck")

    # ----------------------------------------------------------------- writes
    def rsvp_to_event(self, event_url: str, email: str, name: str | None = None, idempotency_key: str | None = None) -> JSON:
        body = {"event_url": event_url, "email": email}
        if name is not None:
            body["name"] = name
        return self.call("rsvpToEvent", body=body, idempotency_key=idempotency_key)

    def request_event(self, event: Mapping[str, Any], idempotency_key: str | None = None) -> JSON:
        return self.call("requestEvent", body=dict(event), idempotency_key=idempotency_key)

    def book_resource(self, resource_id: str, start_iso: str, end_iso: str, email: str, purpose: str | None = None, idempotency_key: str | None = None) -> JSON:
        body = {"resource_id": resource_id, "start_iso": start_iso, "end_iso": end_iso, "email": email}
        if purpose is not None:
            body["purpose"] = purpose
        return self.call("bookResource", body=body, idempotency_key=idempotency_key)

    def set_leaderboard_optin(self, opt_in: bool) -> JSON:
        return self.call("setLeaderboardOptIn", body={"optIn": opt_in})

    def ask_research(self, q: str, k: int | None = None, sources: Iterable[str] | None = None, synthesize: bool | None = None, model: str | None = None) -> JSON:
        body: JSON = {"q": q}
        if k is not None:
            body["k"] = k
        if sources is not None:
            body["sources"] = list(sources)
        if synthesize is not None:
            body["synthesize"] = synthesize
        if model is not None:
            body["model"] = model
        return self.call("askResearch", body=body)

    def submit_highlight_pending(self, story: Mapping[str, Any], idempotency_key: str | None = None) -> JSON:
        return self.call("submitHighlightPending", body=dict(story), idempotency_key=idempotency_key)

    def submit_feedback(self, kind: str, message: str, **extra: Any) -> JSON:
        return self.call("submitFeedback", body={"kind": kind, "message": message, **extra})

    def revoke_own_token(self) -> JSON:
        return self.call("revokeOwnToken")

    # --------------------------------------------------------- device-code auth
    def start_signup(self, scopes: Iterable[str], client_name: str | None = None, sandbox: bool | None = None) -> JSON:
        body: JSON = {"scopes": list(scopes)}
        if client_name is not None:
            body["client_name"] = client_name
        want = self.sandbox if sandbox is None else sandbox
        if want:
            body["sandbox"] = True
        return self.call("startSignup", body=body)

    def poll_signup(self, device_code: str) -> JSON:
        return self.call("pollSignup", query={"device_code": device_code})

    def authorize(
        self,
        scopes: Iterable[str],
        client_name: str | None = "immersivecommons-python",
        sandbox: bool | None = None,
        on_prompt: Callable[[JSON], None] | None = None,
        timeout_seconds: float | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> JSON:
        """Run the full RFC 8628 device-code grant and return the minted token.

        Returns ``{"token", "granted_scopes", "tier", "sandbox"}``. Does not store
        the token on the client — call ``set_token()`` if you want to.
        """
        start = self.start_signup(scopes, client_name=client_name, sandbox=sandbox)
        if on_prompt:
            on_prompt(start)
        interval = max(1, int(start.get("interval") or 5))
        deadline = time.monotonic() + (timeout_seconds or start.get("expires_in") or 900)
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError("Device-code grant timed out before approval.")
            sleep(interval)
            poll = self.poll_signup(start["device_code"])
            status = poll.get("status")
            if status == "completed":
                if not poll.get("agent_token"):
                    raise IcApiError(500, "pollSignup", {"error": "completed without token"})
                return {
                    "token": poll["agent_token"],
                    "granted_scopes": poll.get("granted_scopes") or [],
                    "tier": poll.get("tier"),
                    "sandbox": bool(poll.get("sandbox")),
                }
            if status == "cancelled":
                raise RuntimeError(f"Device-code grant cancelled: {poll.get('reason', '')}".strip())
            # pending -> keep polling


def _query_string(query: Mapping[str, Any] | None) -> str:
    if not query:
        return ""
    pairs = [(k, v) for k, v in query.items() if v is not None]
    return ("?" + urllib.parse.urlencode(pairs)) if pairs else ""
