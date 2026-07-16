// @immersivecommons/sdk — thin, spec-derived client for the Immersive Commons
// Agent REST API. See README.md for a quickstart.

export {
  IcClient,
  IcApiError,
  API_VERSION,
  OPERATIONS,
  type IcClientOptions,
  type CallOptions,
  type AuthorizeOptions,
  type AuthorizeResult,
  type Sandboxable,
  type OperationSpec,
} from "./client.js";

export * from "./generated.js";
