#!/usr/bin/env node
// `ic` entry point — wires the real SDK client + platform fetch into the pure
// CLI logic in ../src/cli.mjs.
import { IcClient, API_VERSION } from "@immersivecommons/sdk";
import { run } from "../src/cli.mjs";

const code = await run({
  argv: process.argv.slice(2),
  env: process.env,
  clientFactory: (o) => new IcClient(o),
  fetchImpl: (url, init) => fetch(url, init),
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  apiVersion: API_VERSION,
});
process.exit(code);
