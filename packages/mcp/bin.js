#!/usr/bin/env node
/**
 * @immersivecommons/mcp — stdio bridge to the hosted Immersive Commons MCP
 * server (Streamable HTTP). Lets stdio-only MCP clients (Claude Desktop,
 * Cursor, Windsurf, ...) connect with one command:
 *
 *   npx -y @immersivecommons/mcp
 *
 * Auth is optional: 10 tools are public; everything else needs a per-user
 * `agt_` bearer token (human-approved device-code flow — an agent cannot
 * self-mint; see https://www.immersivecommons.com/auth.md). Pass it via:
 *
 *   IC_AGENT_TOKEN=agt_...  npx -y @immersivecommons/mcp
 *
 * Delegates the actual protocol bridging to mcp-remote (the standard
 * stdio<->Streamable-HTTP proxy), pinned to a major version.
 */
"use strict";
const { spawnSync } = require("node:child_process");

const SERVER_URL = "https://www.immersivecommons.com/api/mcp";

const args = ["-y", "mcp-remote@0", SERVER_URL];
const token = process.env.IC_AGENT_TOKEN;
if (token) {
  args.push("--header", `Authorization: Bearer ${token}`);
}
// Pass through any extra user flags (e.g. --transport http-only).
args.push(...process.argv.slice(2));

const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status === null ? 1 : r.status);
