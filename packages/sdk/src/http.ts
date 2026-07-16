// Generic transport core. No route knowledge lives here — callers pass a fully
// resolved method + url + headers. Uses the platform `fetch` (Node >= 20 has it
// global); an alternate implementation can be injected for tests or older hosts.

import type { Error as ApiError } from "./generated.js";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class IcApiError extends Error {
  readonly status: number;
  readonly operationId: string;
  /** The parsed JSON error body, when the response was JSON. */
  readonly body: ApiError | Record<string, unknown> | undefined;
  readonly errorKind: string | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(args: {
    status: number;
    operationId: string;
    body: unknown;
    retryAfterHeader?: string | null;
  }) {
    const body = (args.body ?? undefined) as Record<string, unknown> | undefined;
    // The live surface uses either { error: "..." } or, on the /api catch-all,
    // { error: { code, message } }. Pull a human string out of either shape.
    let msg: string | undefined;
    const err = body?.error as unknown;
    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") {
      const code = (err as Record<string, unknown>).code;
      const m = (err as Record<string, unknown>).message;
      msg = [code, m].filter(Boolean).join(": ") || undefined;
    }
    if (!msg && typeof body?.message === "string") msg = body.message as string;
    super(`${args.operationId} failed (HTTP ${args.status})${msg ? `: ${msg}` : ""}`);
    this.name = "IcApiError";
    this.status = args.status;
    this.operationId = args.operationId;
    this.body = body;
    this.errorKind = typeof body?.error_kind === "string" ? (body.error_kind as string) : undefined;
    const ra = body?.retry_after_seconds ?? (args.retryAfterHeader ? Number(args.retryAfterHeader) : undefined);
    this.retryAfterSeconds = typeof ra === "number" && !Number.isNaN(ra) ? ra : undefined;
  }
}

export interface HttpRequestArgs {
  fetchImpl: FetchLike;
  operationId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function httpRequest<T>(args: HttpRequestArgs): Promise<T> {
  const init: RequestInit = { method: args.method, headers: args.headers };
  if (args.body !== undefined) {
    init.body = typeof args.body === "string" ? args.body : JSON.stringify(args.body);
  }
  if (args.signal) init.signal = args.signal;

  const res = await args.fetchImpl(args.url, init);
  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }

  if (!res.ok) {
    throw new IcApiError({
      status: res.status,
      operationId: args.operationId,
      body: json ?? (text ? { error: text } : undefined),
      retryAfterHeader: res.headers.get("retry-after"),
    });
  }
  return json as T;
}

export function buildQuery(
  query: Record<string, string | number | boolean | undefined | null> | undefined
): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
