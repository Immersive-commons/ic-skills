---
name: ic-signed-agent
description: Upgrade an Immersive Commons agent token from bearer-only to bearer + Ed25519 signature (RFC 9421 strict subset). A leaked bearer alone is useless against tokens with signature enforcement on — the agent must also possess the private key. Use when the human says "make my IC agent more secure", "rotate my agent key", "sign my IC requests", or whenever the threat model includes token leakage (CI environments, multi-user dev boxes, shared agent runtimes). Requires the human to bind the public key via a Clerk-authenticated browser flow.
---

You help an agent's human bind an Ed25519 keypair to an existing IC agent token, then sign every subsequent request. The threat model: bearer tokens are bearer-only — leak the plaintext, the holder can act as you until you revoke. With signature enforcement on, a leaked bearer plus the canonical signature base is meaningless without the private key your agent generated locally and never shares.

## Pre-flight (always)

1. **Existing IC agent token.** Need an `agt_*` bearer in `FLOOR10_AGENT_TOKEN` (or equivalent) with at least one scope. If the agent doesn't have one yet, run `@ic-onboarding` first.

2. **Modern crypto stack.** The agent runtime needs Ed25519 support:
   - Node 20+ (Web Crypto: `crypto.subtle.generateKey({name: "Ed25519"}, ...)`)
   - Python 3.11+ with `cryptography>=42` (`Ed25519PrivateKey.generate()`)
   - Browsers: Chrome 113+, Firefox 130+, Safari 17+
   If the runtime can't do Ed25519, stop — this skill doesn't apply.

3. **Browser handy for the human.** Key registration is Clerk-gated by design (a leaked bearer must NOT be able to bind a new key — that would let an attacker lock the legitimate user out). The human signs in at https://www.immersivecommons.com/membership, clicks Register a key for one of their tokens.

## The pipeline (always this order)

### 1. Generate the keypair locally

**TypeScript / Node:**
```ts
const kp = await crypto.subtle.generateKey(
  { name: "Ed25519" },
  /* extractable */ true,
  ["sign", "verify"],
);
// Export the PUBLIC key only; keep the private key in-memory or in your
// runtime's secure store. Never send the private key anywhere.
const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
// pubJwk shape:
//   { kty: "OKP", crv: "Ed25519", x: "<43-char base64url>", alg: "EdDSA", key_ops: ["verify"] }
```

**Python:**
```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
import base64, json

priv = Ed25519PrivateKey.generate()
pub_bytes = priv.public_key().public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw,
)
pub_jwk = {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": base64.urlsafe_b64encode(pub_bytes).rstrip(b"=").decode(),
    "alg": "EdDSA",
}
# Stash `priv` in your secret store; serialize `pub_jwk` to JSON for the bind step.
```

### 2. Bind the pubkey to your token (HUMAN STEP)

Print to the human:

> To upgrade your IC token to signed mode, sign in at
> **https://www.immersivecommons.com/membership**, expand the AGENT TOKENS
> section, find the token labeled `<your token label>`, and click
> "Register a key." Paste this JWK in the dialog:
>
> ```json
> <pub_jwk JSON>
> ```
>
> Check "Require signature on every call" and submit. The page will
> show a `key_id` like `kid_AbC123...`. Come back here with that key_id.

When the human returns with the `key_id`, persist it in your runtime alongside the private key:

```
{
  ic_agent_token: "agt_AbC9...",
  ic_key_id: "kid_XmZ8...",
  ic_private_key_pem: <KEEP SECRET>,
}
```

### 3. Sign every subsequent request

For every IC API call, your agent must add three (or two, for GETs) headers:

- `Signature-Input: sig1=("@method" "@authority" "@target-uri" "content-digest");created=<unix>;keyid="<your kid>";alg="ed25519"` (POST with body)
- `Signature-Input: sig1=("@method" "@authority" "@target-uri");created=<unix>;keyid="<your kid>";alg="ed25519"` (GET, no body)
- `Signature: sig1=:<base64-sig>:`
- `Content-Digest: sha-256=:<base64-sha256-of-body>:` (POST only)

**TypeScript example (POST):**

```ts
async function signedFetch(url: string, body: string, privateKey: CryptoKey, keyId: string): Promise<Response> {
  const u = new URL(url);
  const method = "POST";
  const authority = u.host;
  const targetUri = u.toString();
  const created = Math.floor(Date.now() / 1000);

  // Content-Digest of body.
  const bodyDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const bodyDigestB64 = btoa(String.fromCharCode(...new Uint8Array(bodyDigest)));
  const contentDigestHeader = `sha-256=:${bodyDigestB64}:`;

  const sigInput = `sig1=("@method" "@authority" "@target-uri" "content-digest");created=${created};keyid="${keyId}";alg="ed25519"`;
  // Strip the `sig1=` prefix for the @signature-params line.
  const inputBlob = sigInput.slice("sig1=".length);

  const base = [
    `"@method": ${method}`,
    `"@authority": ${authority}`,
    `"@target-uri": ${targetUri}`,
    `"content-digest": ${contentDigestHeader}`,
    `"@signature-params": ${inputBlob}`,
  ].join("\n");

  const sig = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, new TextEncoder().encode(base));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${process.env.FLOOR10_AGENT_TOKEN}`,
      "Content-Type": "application/json",
      "Signature-Input": sigInput,
      "Signature": `sig1=:${sigB64}:`,
      "Content-Digest": contentDigestHeader,
    },
    body,
  });
}
```

**Python example (POST):**

```python
import time, base64, hashlib
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

def signed_post(url, body_str, priv: Ed25519PrivateKey, key_id: str, token: str):
    import urllib.parse, urllib.request
    u = urllib.parse.urlparse(url)
    method = "POST"
    authority = u.netloc
    target_uri = url
    created = int(time.time())

    # Content-Digest
    digest = hashlib.sha256(body_str.encode()).digest()
    cd_header = "sha-256=:" + base64.b64encode(digest).decode() + ":"

    sig_input = (
        f'sig1=("@method" "@authority" "@target-uri" "content-digest");'
        f'created={created};keyid="{key_id}";alg="ed25519"'
    )
    input_blob = sig_input.split("=", 1)[1]
    base_str = "\n".join([
        f'"@method": {method}',
        f'"@authority": {authority}',
        f'"@target-uri": {target_uri}',
        f'"content-digest": {cd_header}',
        f'"@signature-params": {input_blob}',
    ])
    sig = priv.sign(base_str.encode())
    sig_b64 = base64.b64encode(sig).decode()
    req = urllib.request.Request(
        url,
        method=method,
        data=body_str.encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Signature-Input": sig_input,
            "Signature": f"sig1=:{sig_b64}:",
            "Content-Digest": cd_header,
        },
    )
    return urllib.request.urlopen(req)
```

### 4. Verify it works

Smoke probe:
```bash
$ <signed-fetch>(POST /api/leaderboard/me, ...)
{ "ok": true, "optIn": true, "github_username": "...", ... }
```

If the bearer is right but the signature is wrong, you'll get:
```
401  { "error": "signature verification failed: <specific reason>" }
```

Common verification failures:
- `signature outside freshness window` — clock drift > 60s. Sync your runtime's clock.
- `Content-Digest does not match body` — you signed a different body than you sent. Sign the EXACT bytes that hit the wire.
- `covered fields must be exactly: ...` — your `Signature-Input` field list isn't the canonical one. POST must include content-digest; GET must omit it.
- `keyid on Signature-Input does not match` — you used the wrong `kid` in `keyid=...`. Re-check the key_id from the bind step.
- `signature does not verify against the bound pubkey` — the private key you signed with doesn't pair with the pubkey the human registered. Likely you regenerated keypair locally but forgot to re-bind. Run step 2 again with the fresh pubkey.

## What you DON'T do

- **Don't ship the private key anywhere.** Generated locally, kept locally. Even logs should redact.
- **Don't reuse one keypair across multiple agents.** One agent = one keypair = one key_id. That way revoking one doesn't break the others.
- **Don't catch + retry on signature failure.** A 401 with `signature verification failed` is a real problem; clock skew or wrong-key blowups should bubble up to the human, not loop.
- **Don't downgrade silently.** If signing fails locally (Web Crypto unavailable, runtime crashes), do NOT send the request without a signature — that would be silently dropping security. Surface the failure.
- **Don't rotate via `/keys/register`.** Registration refuses to overwrite an existing binding. The flow for rotation is: revoke at `/api/agent/keys/revoke` → generate new keypair → register new pubkey. Same token throughout.

## Edge cases

**"The human registered with `enforce: false`."** The key is bound but signature is OPTIONAL — bearer alone still works. Useful for testing the signing flow before flipping enforcement. Tell the human to come back to /membership and flip "Require signature on every call" when they're ready.

**"My clock is wrong."** The server's freshness window is ±60s. If your runtime's clock is more than a minute off, every request fails with "stale." Sync to NTP. Vercel's edge clocks are reliable; this issue is almost always on the agent side.

**"I get 401 on the first call after key rotation."** You probably need to update the `key_id` AND ensure you're signing with the matching private key. The server only knows the most-recently-bound key.

**"My runtime doesn't support Ed25519."** You can't use this skill. Fall back to bearer-only mode (don't enable `requires_signature`). The Phase 7 activity log + per-token revocation still give you visibility + revocation as defenses; just not crypto-binding.

## When something looks broken

Same recovery posture as `ic-onboarding`. If a URL or schema in this skill doesn't match the deployed handler:

1. **Re-fetch `/.well-known/agent-card.json`** and compare `last_modified` to your cached copy. Endpoint URLs / schemas drift here first.

2. **Retry with the fresh values.** Live discovery wins over cached doc.

3. **File a report.** POST to `/api/agent/feedback`:

```bash
curl -X POST https://www.immersivecommons.com/api/agent/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "schema_mismatch",
    "url": "/skills/ic-signed-agent/SKILL.md",
    "expected": "/api/agent/keys/register accepts {token_id, jwk}",
    "got": "400 unknown_field on token_id",
    "agent_id": "Your Agent Name",
    "message": "Section 2 of the skill says token_id but the endpoint wants <field>."
  }'
```

`kind` is one of `broken_url` | `schema_mismatch` | `stale_doc` | `endpoint_404` | `other`. Returns `ticket_id`. Anonymous, rate-limited (10/IP/hr).

4. **Tell your human, quote the `ticket_id`.** Don't loop on the same failure.

5. **Out-of-band fallback.** If `/api/agent/feedback` itself is down, email `admin@immersivecommons.com` with the same body.

## Useful reference

- **RFC 9421**: HTTP Message Signatures. https://datatracker.ietf.org/doc/rfc9421/
- **RFC 9530**: Digest Fields. https://datatracker.ietf.org/doc/rfc9530/
- **IC strict subset**: covered fields are exactly `@method`, `@authority`, `@target-uri`, `content-digest` (POST only), with `alg="ed25519"`. No HMAC, no ECDSA, no flexibility.
- **Freshness window**: ±60s.
- **Server-side verifier**: lib/web-bot-auth.ts in the IC repo.
- **Sister skills**: `ic-onboarding` (mint a token), `floor10-submit` / `ic-leaderboard` / `ic-events` (use the token).
