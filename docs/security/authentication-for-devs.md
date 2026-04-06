# Authentication for Devs

This page explains how to integrate with RCLDX authentication services as an application developer.

This guide provides practical integration details for building compatible clients across the RCLDX authentication flows.

## Integration model at a glance

Use two different auth paths:

1. **Web path (user-facing management)**
2. **MQTT path (runtime connectivity and publish authorization)**

Do not mix these responsibilities.

## 1) Web path

Use this path for account/session operations and token lifecycle.

Typical flow:

1. `POST /users` to register user
2. `POST /authn/otp/request`
3. `POST /authn/otp/verify`
4. Use `X-Session-Key` for authenticated web actions
5. `POST /authn/tokens` to generate MQTT token

## 2) MQTT path

Use this path for connection auth and publish authorization.

Relevant endpoints:

- `POST /authn/mqtt/login` (broker-side login decision)
- `POST /authn/mqtt/nonces` (nonce refill)
- `DELETE /authn/mqtt/nonces` (developer-driven immediate cleanup)
- `POST /authn/mqtt/publish` (transitional helper, optional)

Preferred runtime topic path:

- `clubs/<club_id>/spot/input` (ingress with `{auth, spot}` envelope)
- classifier forwards valid `spot` to `spot/input`

## Important: three different checks

In this model, these are intentionally different operations:

1. **Login authentication** (`/authn/mqtt/login`)
2. **Being authorized to publish in general** (scope and account checks)
3. **Being authorized for one concrete publish action** (classifier validates envelope nonce/signature)

### 1) Login authentication

Login proves the client has valid MQTT credentials and can establish a trusted identity context.
It does not automatically approve every future publish message.

### 2) General publish authorization

Authorization policy decides whether that identity is allowed to publish in one or more topic scopes.
This is where account state and scope rules are enforced.

### 3) Per-publish authorization with nonce

Each publish action needs a one-time nonce plus HMAC proof.
In the preferred runtime, this proof is validated and consumed atomically by classifier on club ingress.

Why this split exists:

- It reduces replay risk by making each publish proof one-time.
- It prevents “logged in once, publish forever” behavior.
- It allows controlled refill (`+10`) only when remaining availability is low (`<= 3`).
- It gives clients real-time feedback (`nonces_available`) to refill predictably.
- It keeps server state minimal and short-lived (TTL-based nonce pool), without full long-lived sessions for publish traffic.

## Developer-controlled nonce cleanup

Nonce pools can be deleted at developer will.

Use:

- `DELETE /authn/mqtt/nonces`

This allows software to proactively clear issued nonces (for example on logout, station profile change, suspected leak, or app shutdown) instead of waiting for TTL expiry.

## Club server risk model (accepted and bounded)

A club-operated server may aggregate many user identities, and club infrastructure may not always be under direct RCLDX operational control.

Accepted inherent risk:

- A club server can carry mixed traffic from multiple users and systems.
- Transporting traffic through a club server does not automatically grant publish rights into RCLDX core.

Bounded by RCLDX controls:

- A user connected to a club server still needs valid RCLDX identity validation.
- Publish is not accepted unless RCLDX Identity service issues nonces first.
- Each publish requires a valid nonce + signature and passes scope/account checks.

Result:

- Club infrastructure can interoperate with the core model,
- while RCLDX keeps the final decision for publish acceptance at identity-service level.

### Minimal publish lifecycle (preferred runtime)

1. Authenticate connection with MQTT token.
2. Request nonce refill when `nonces_available <= 3`.
3. Build envelope with `auth` + `spot`.
4. Publish envelope to `clubs/<club_id>/spot/input`.
5. Classifier validates nonce/signature/scope.
6. If valid, classifier re-publishes `spot` to `spot/input`.

### Envelope shape

```json
{
  "auth": {
    "alg": "RCLDX1-HMAC-SHA256",
    "club_id": "EA1ABC",
    "kid": "15stfo68zo",
    "nonce": "7kqxwzde1qf1k6h7x7zphkac",
    "sig": "c5f8f95d1bc79876d1f4fe4f4f3e0965b1dc8f7c6e3d0a97fd9c3164c0de7e24"
  },
  "spot": {
    "...": "..."
  }
}
```

Canonical signing material:

- sign `spot` object only
- UTF-8
- minified JSON (no extra spaces/newlines)
- sorted keys (deterministic order)

## Request/response examples

### Refill nonces

```http
POST /authn/mqtt/nonces
Content-Type: application/json

{
  "username": "EA1HET",
  "password": "rcldx_<kid>_<secret>",
  "topic_scopes": ["clubs/EA1HET/#"]
}
```

Success:

```json
{
  "status": "ok",
  "nonces": ["<nonce1>", "<nonce2>", "..."],
  "nonces_available": 12,
  "expires_at": 1763651200
}
```

Conflict when too many are still available:

```json
{
  "error": "NONCES_STILL_AVAILABLE",
  "message": "Outstanding nonces must be <= 3 before requesting refill",
  "nonces_available": 7
}
```

### Transitional helper: authorize one publish (optional)

```http
POST /authn/mqtt/publish
Content-Type: application/json

{
  "username": "EA1HET",
  "password": "rcldx_<kid>_<secret>",
  "topic": "clubs/EA1HET/spot/input",
  "qos": 1,
  "retain": false,
  "payload": "{\"dx\":\"K1ABC\"}",
  "nonce": "<nonce>",
  "signature": "<hmac_hex>"
}
```

Success:

```json
{
  "result": "allow",
  "nonces_available": 3
}
```

## Safe implementation guidance

- Keep credentials and nonces in memory whenever possible.
- Do not log raw tokens, OTP values, or signatures.
- Use short retry chains with backoff on `429` and transient `5xx`.
- Handle `409` and `410` as normal lifecycle events (used/expired nonce).
- Rotate MQTT tokens periodically and on any suspected leak.

## Recommended architecture for web apps

For browser-based applications, prefer a BFF/relay model so sensitive material is not directly managed in browser storage.

## Protocol status guidance

Use standard HTTP handling first:

- `400` malformed request
- `401` invalid credentials/signature
- `403` scope or account denied
- `409` conflict (nonce state / refill policy)
- `410` expired nonce
- `429` rate-limited
- `5xx` server/dependency errors

## Cross references

- [Authentication](security/authentication.md)
- [Authorization](security/authorization.md)
- [Message formats](protocol/message-formats.md)
