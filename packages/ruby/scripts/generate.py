#!/usr/bin/env python3
"""Regenerate lib/immersivecommons/generated.rb from the vendored openapi.json.

Same "derives from the spec" mechanism as the TS SDK / Python / Go clients:
the operations table (path / method / auth / scopes / idempotency / sandbox)
is read straight out of openapi.json. The hand-written client (client.rb)
only adds typed facades over the generic transport; it invents no routes.
The generator is Python (not Ruby) so a spec bump can be regenerated on any
machine in this repo without a Ruby toolchain — the shipped gem contains only
.rb files. Re-run after a spec bump:

    python scripts/generate.py
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "lib" / "immersivecommons" / "openapi.json").read_text(encoding="utf-8"))

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
                "sandbox": op.get("x-sandbox"),
            }
    return ops


def rb(v) -> str:
    """Render a Python value as a Ruby literal."""
    if v is None:
        return "nil"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, str):
        return json.dumps(v)  # JSON string escaping is valid Ruby double-quote escaping here
    raise TypeError(f"unhandled: {v!r}")


def main() -> None:
    ops = build_operations()
    version = SPEC.get("info", {}).get("version", "")
    server = ((SPEC.get("servers") or [{}])[0]).get("url", "https://www.immersivecommons.com")

    lines: list[str] = []
    a = lines.append
    a("# frozen_string_literal: true")
    a("")
    a("# AUTO-GENERATED from openapi.json by scripts/generate.py — DO NOT EDIT.")
    a(f"# Spec version: {version}. Regenerate with: python scripts/generate.py")
    a("")
    a("module ImmersiveCommons")
    a(f"  API_VERSION = {rb(version)}")
    a(f"  DEFAULT_BASE_URL = {rb(server)}")
    a("")
    a("  # operationId => operation spec (method, path, query, scopes, auth,")
    a("  # idempotency, sandbox). The client transport is table-driven off this")
    a("  # hash, so no method can describe a route the spec does not.")
    a("  OPERATIONS = {")
    for oid, s in ops.items():
        a(f"    {rb(oid)} => {{")
        a(f"      method: {rb(s['method'])},")
        a(f"      path: {rb(s['path'])},")
        q = ", ".join(
            f"{{ name: {rb(p['name'])}, required: {rb(p['required'])} }}"
            for p in s["query"]
        )
        a(f"      query: [{q}],")
        sc = ", ".join(rb(x) for x in s["scopes"])
        a(f"      scopes: [{sc}],")
        a(f"      requires_auth: {rb(s['requires_auth'])},")
        a(f"      bearer_reachable: {rb(s['bearer_reachable'])},")
        a(f"      browser_session: {rb(s['browser_session'])},")
        a(f"      idempotent: {rb(s['idempotent'])},")
        a(f"      has_body: {rb(s['has_body'])},")
        a(f"      sandbox: {rb(s['sandbox'])}")
        a("    }.freeze,")
    a("  }.freeze")
    a("end")
    a("")

    out = ROOT / "lib" / "immersivecommons" / "generated.rb"
    out.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"generated.rb: {len(ops)} operations")


if __name__ == "__main__":
    main()
