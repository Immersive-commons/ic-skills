#!/usr/bin/env node
// Regenerate src/generated.ts from the vendored openapi.json.
//
// This is the whole "derives from the spec" mechanism: the operations table
// (path / method / auth / scopes / idempotency / sandbox) and every request and
// response type are read straight out of openapi.json. The hand-written client
// (src/client.ts) only adds ergonomic typed facades over the generic transport;
// it invents no routes. Re-run after the spec changes: `npm run generate`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const spec = JSON.parse(readFileSync(join(root, "openapi.json"), "utf8"));

const refName = (ref) => ref.split("/").pop();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isIdent = (k) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);
const safeKey = (k) => (isIdent(k) ? k : JSON.stringify(k));
const wrapUnion = (t) => (t.includes(" | ") ? `(${t})` : t);

// JSON Schema (the subset this spec uses) -> TypeScript type expression.
function tsType(schema) {
  if (!schema || typeof schema !== "object") return "unknown";
  if (schema.$ref) return refName(schema.$ref);
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  const t = schema.type;
  if (Array.isArray(t)) {
    return t.map((one) => tsType({ ...schema, type: one, enum: undefined })).join(" | ");
  }
  switch (t) {
    case "string":
      return schema.format === "date-time" ? "string" : "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return `${wrapUnion(tsType(schema.items))}[]`;
    case "object": {
      const props = schema.properties || {};
      const keys = Object.keys(props);
      const req = new Set(schema.required || []);
      const addl = schema.additionalProperties;
      if (keys.length === 0) {
        return addl === false ? "Record<string, never>" : "Record<string, unknown>";
      }
      const fields = keys.map((k) => {
        const opt = req.has(k) ? "" : "?";
        return `${safeKey(k)}${opt}: ${tsType(props[k])}`;
      });
      const idx = addl && addl !== false ? "; [k: string]: unknown" : "";
      return `{ ${fields.join("; ")}${idx} }`;
    }
    default:
      if (schema.properties || schema.additionalProperties) {
        return tsType({ ...schema, type: "object" });
      }
      return "unknown";
  }
}

// ---- Component schema type aliases ----
const schemaNames = new Set(Object.keys(spec.components?.schemas || {}));
const schemaLines = [];
for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
  const doc = schema.description ? `/** ${schema.description.replace(/\*\//g, "*\\/")} */\n` : "";
  schemaLines.push(`${doc}export type ${name} = ${tsType(schema)};`);
}

// The sandbox WRITE receipt shape (root x-sandbox.write_response_shape). A
// sandbox token's write verbs return THIS instead of the real response.
const sb = spec["x-sandbox"]?.write_response_shape;
if (sb) {
  schemaLines.push(
    `/** Simulated write receipt returned by a sandbox token (root x-sandbox extension). A green receipt means well-formed + scoped, NOT guaranteed to pass in production. */\n` +
      `export interface SandboxReceipt {\n` +
      `  ok: true;\n  sandbox: true;\n  simulated: true;\n` +
      `  would_have: { action: string; scope: string; args: Record<string, unknown> };\n` +
      `  note?: string;\n}`
  );
}

// ---- Operations table ----
const METHODS = ["get", "post", "put", "delete", "patch"];
const ops = {};
const opAliases = [];
for (const [path, item] of Object.entries(spec.paths || {})) {
  for (const method of METHODS) {
    const op = item[method];
    if (!op || !op.operationId) continue;
    const id = op.operationId;

    const params = op.parameters || [];
    const query = params
      .filter((p) => p.in === "query")
      .map((p) => ({ name: p.name, required: !!p.required }));
    const idempotent = params.some((p) => p.in === "header" && p.name === "Idempotency-Key");

    const sec = op.security ?? spec.security ?? [];
    let isPublic = false;
    let browserSession = false;
    const scopes = new Set();
    for (const req of sec) {
      const keys = Object.keys(req);
      if (keys.length === 0) isPublic = true;
      if (keys.includes("agentBearer")) for (const s of req.agentBearer) scopes.add(s);
      if (keys.includes("clerkSession")) browserSession = true;
    }
    // Bearer-reachable = at least one requirement is public or agentBearer.
    const bearerReachable = isPublic || [...sec].some((r) => "agentBearer" in r);

    // 2xx response body schema (first of 200/201/202).
    let respSchema = null;
    for (const code of ["200", "201", "202"]) {
      const s = op.responses?.[code]?.content?.["application/json"]?.schema;
      if (s) { respSchema = s; break; }
    }
    const bodySchema = op.requestBody?.content?.["application/json"]?.schema || null;

    ops[id] = {
      operationId: id,
      method: method.toUpperCase(),
      path,
      query,
      scopes: [...scopes],
      requiresAuth: !isPublic,
      bearerReachable,
      browserSession,
      idempotent,
      hasBody: !!bodySchema,
      sandbox: op["x-sandbox"] ?? null,
      tags: op.tags || [],
      summary: op.summary || "",
    };

    // Skip an alias whose name would shadow a component schema of the same
    // name (e.g. setupCheck -> SetupCheckResponse). The component schema
    // already provides that type; a self-referential alias is a TS error.
    const C = cap(id);
    if (!schemaNames.has(`${C}Response`)) {
      opAliases.push(`export type ${C}Response = ${respSchema ? tsType(respSchema) : "unknown"};`);
    }
    if (bodySchema && !schemaNames.has(`${C}Body`)) {
      opAliases.push(`export type ${C}Body = ${tsType(bodySchema)};`);
    }
  }
}

const server = spec.servers?.[0]?.url || "https://www.immersivecommons.com";

const out = `// AUTO-GENERATED from openapi.json by scripts/generate.mjs — DO NOT EDIT BY HAND.
// Spec version: ${spec.info?.version}. Regenerate with: npm run generate
/* eslint-disable */

export const API_VERSION = ${JSON.stringify(spec.info?.version)} as const;
export const DEFAULT_BASE_URL = ${JSON.stringify(server)} as const;

export interface OperationSpec {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query: { name: string; required: boolean }[];
  /** IC scopes an agentBearer requirement asks for (union across requirements). */
  scopes: string[];
  /** true when no anonymous (empty {}) security requirement exists. */
  requiresAuth: boolean;
  /** true when the op is reachable with a public call or an agt_ bearer. */
  bearerReachable: boolean;
  /** true when the op is Clerk-cookie only (agents use the MCP equivalent). */
  browserSession: boolean;
  /** true when the op accepts an Idempotency-Key request header. */
  idempotent: boolean;
  hasBody: boolean;
  /** "simulated" | "real" | null — sandbox-token behaviour for this write. */
  sandbox: "simulated" | "real" | null;
  tags: string[];
  summary: string;
}

export const OPERATIONS: Record<string, OperationSpec> = ${JSON.stringify(ops, null, 2)};

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------
${schemaLines.join("\n\n")}

// ---------------------------------------------------------------------------
// Per-operation request/response aliases
// ---------------------------------------------------------------------------
${opAliases.join("\n")}
`;

writeFileSync(join(root, "src", "generated.ts"), out);
const opCount = Object.keys(ops).length;
console.log(`generated.ts: ${opCount} operations, ${Object.keys(spec.components?.schemas || {}).length} schemas`);
