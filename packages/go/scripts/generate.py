#!/usr/bin/env python3
"""Regenerate generated.go from the vendored openapi.json.

Same "derives from the spec" mechanism as the TS SDK and Python client: the
operations table (path / method / auth / scopes / idempotency / sandbox) is
read straight out of openapi.json. The hand-written client (client.go) only
adds typed facades over the generic transport; it invents no routes. The
generator is Python (not Go) so a spec bump can be regenerated on any machine
in this repo without a Go toolchain — the published module ships only .go
files. Re-run after a spec bump:

    python scripts/generate.py
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "openapi.json").read_text(encoding="utf-8"))

METHODS = ("get", "post", "put", "delete", "patch")


def build_operations() -> dict:
    ops: dict[str, dict] = {}
    for path, item in (SPEC.get("paths") or {}).items():
        for method in METHODS:
            op = item.get(method)
            if not op or not op.get("operationId"):
                continue
            oid = op["operationId"]
            params = op.get("parameters") or []
            query = [
                {"name": p["name"], "required": bool(p.get("required"))}
                for p in params
                if p.get("in") == "query"
            ]
            idempotent = any(
                p.get("in") == "header" and p.get("name") == "Idempotency-Key"
                for p in params
            )
            sec = op.get("security", SPEC.get("security", []))
            is_public = False
            browser_session = False
            scopes: list[str] = []
            for req in sec:
                keys = list(req.keys())
                if not keys:
                    is_public = True
                if "agentBearer" in req:
                    for s in req["agentBearer"]:
                        if s not in scopes:
                            scopes.append(s)
                if "clerkSession" in keys:
                    browser_session = True
            bearer_reachable = is_public or any("agentBearer" in r for r in sec)
            has_body = bool(
                ((op.get("requestBody") or {}).get("content") or {}).get("application/json")
            )
            ops[oid] = {
                "method": method.upper(),
                "path": path,
                "query": query,
                "scopes": scopes,
                "requires_auth": not is_public,
                "bearer_reachable": bearer_reachable,
                "browser_session": browser_session,
                "idempotent": idempotent,
                "has_body": has_body,
                "sandbox": op.get("x-sandbox") or "",
                "summary": op.get("summary", ""),
            }
    return ops


def gostr(s: str) -> str:
    return json.dumps(s)  # JSON string escaping is valid Go string escaping here


def gobool(b: bool) -> str:
    return "true" if b else "false"


def main() -> None:
    ops = build_operations()
    version = SPEC.get("info", {}).get("version", "")
    server = ((SPEC.get("servers") or [{}])[0]).get("url", "https://www.immersivecommons.com")

    lines: list[str] = []
    a = lines.append
    a("// Code generated from openapi.json by scripts/generate.py; DO NOT EDIT.")
    a(f"// Spec version: {version}. Regenerate with: python scripts/generate.py")
    a("")
    a("package ic")
    a("")
    a("// APIVersion is the version of the OpenAPI spec this table derives from.")
    a(f"const APIVersion = {gostr(version)}")
    a("")
    a("// DefaultBaseURL is the production API origin from the spec's servers[0].")
    a(f"const DefaultBaseURL = {gostr(server)}")
    a("")
    a("// QueryParam describes one query parameter an operation accepts.")
    a("type QueryParam struct {")
    a("\tName     string")
    a("\tRequired bool")
    a("}")
    a("")
    a("// Operation is one row of the spec-derived operations table.")
    a("type Operation struct {")
    a("\tMethod          string       // HTTP method, upper-case")
    a("\tPath            string       // request path, e.g. \"/api/events/rsvp\"")
    a("\tQuery           []QueryParam // query parameters the spec declares")
    a("\tScopes          []string     // agent-token scopes the operation needs")
    a("\tRequiresAuth    bool         // false = public, callable with no token")
    a("\tBearerReachable bool         // reachable with an agent bearer token")
    a("\tBrowserSession  bool         // Clerk-cookie-only (no bearer path)")
    a("\tIdempotent      bool         // accepts an Idempotency-Key header")
    a("\tHasBody         bool         // accepts an application/json request body")
    a("\tSandbox         string       // x-sandbox: \"simulated\", \"real\", or \"\"")
    a("\tSummary         string")
    a("}")
    a("")
    a("// Operations maps operationId -> its spec row. The client transport is")
    a("// table-driven off this map, so no method can describe a route the spec")
    a("// does not.")
    a("var Operations = map[string]Operation{")
    for oid, s in ops.items():
        a(f"\t{gostr(oid)}: {{")
        a(f"\t\tMethod:          {gostr(s['method'])},")
        a(f"\t\tPath:            {gostr(s['path'])},")
        if s["query"]:
            q = ", ".join(
                f"{{Name: {gostr(p['name'])}, Required: {gobool(p['required'])}}}"
                for p in s["query"]
            )
            a(f"\t\tQuery:           []QueryParam{{{q}}},")
        if s["scopes"]:
            sc = ", ".join(gostr(x) for x in s["scopes"])
            a(f"\t\tScopes:          []string{{{sc}}},")
        a(f"\t\tRequiresAuth:    {gobool(s['requires_auth'])},")
        a(f"\t\tBearerReachable: {gobool(s['bearer_reachable'])},")
        a(f"\t\tBrowserSession:  {gobool(s['browser_session'])},")
        a(f"\t\tIdempotent:      {gobool(s['idempotent'])},")
        a(f"\t\tHasBody:         {gobool(s['has_body'])},")
        if s["sandbox"]:
            a(f"\t\tSandbox:         {gostr(s['sandbox'])},")
        if s["summary"]:
            a(f"\t\tSummary:         {gostr(s['summary'])},")
        a("\t},")
    a("}")
    a("")

    (ROOT / "generated.go").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"generated.go: {len(ops)} operations")


if __name__ == "__main__":
    main()
