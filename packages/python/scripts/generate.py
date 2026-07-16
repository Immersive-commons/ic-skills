#!/usr/bin/env python3
"""Regenerate immersivecommons/_generated.py from the vendored openapi.json.

Same "derives from the spec" mechanism as the TS SDK: the operations table
(path / method / auth / scopes / idempotency / sandbox) is read straight out of
openapi.json. The hand-written client (client.py) only adds typed facades over
the generic transport; it invents no routes. Re-run after a spec bump:

    python scripts/generate.py
"""
from __future__ import annotations

import json
import pathlib
import pprint

ROOT = pathlib.Path(__file__).resolve().parent.parent
PKG = ROOT / "immersivecommons"
SPEC = json.loads((PKG / "openapi.json").read_text(encoding="utf-8"))

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
                "operation_id": oid,
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
                "tags": op.get("tags") or [],
                "summary": op.get("summary", ""),
            }
    return ops


def main() -> None:
    ops = build_operations()
    server = ((SPEC.get("servers") or [{}])[0]).get("url", "https://www.immersivecommons.com")
    header = (
        '"""AUTO-GENERATED from openapi.json by scripts/generate.py — DO NOT EDIT.\n\n'
        f'Spec version: {SPEC.get("info", {}).get("version")}. '
        'Regenerate with: python scripts/generate.py\n"""\n\n'
        "from __future__ import annotations\n\n"
        f"API_VERSION = {json.dumps(SPEC.get('info', {}).get('version'))}\n"
        f"DEFAULT_BASE_URL = {json.dumps(server)}\n\n"
        "# operationId -> operation spec (method, path, query, scopes, auth, idempotency, sandbox)\n"
        "OPERATIONS = "
    )
    # pformat emits valid Python literals (True/False/None), unlike json.dumps.
    body = pprint.pformat(ops, indent=1, width=100, sort_dicts=False)
    (PKG / "_generated.py").write_text(header + body + "\n", encoding="utf-8")
    print(f"_generated.py: {len(ops)} operations")


if __name__ == "__main__":
    main()
