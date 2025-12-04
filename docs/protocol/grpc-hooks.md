 # gRPC hooks

Last updated: **2025-12-04**  
RCLDX Protocol: **v1-beta**


---


The RCLDX Cluster supports an optional gRPC Hooks subsystem that allows Club and Core brokers to offload advanced logic to external services.

This model enables flexible validation, trust scoring, moderation, routing decisions, and semantic analysis without modifying the broker itself.

gRPC Hooks bring the following benefits:

- Centralizes complex decision-making
- Allows policies to be updated without broker restarts
- Supports dynamic trust models (grandfathering, abuse detection, scoring)
- Enables multi-language extensions (Python, Rust, Go)
- Ensures message-level intelligence while keeping brokers lightweight

This section describes the available hooks, their purpose, and how messages interact with hook services.

## 1. Purpose of gRPC Hooks

The goals of the gRPC Hooks subsystem are:

- Externalized decision logic  
Filtering, trust evaluation, or validation is performed by a dedicated service, not inside the broker.

- Dynamic runtime policy updates  
Admins can adjust rules, trust scores, or behavior without redeploying the MQTT layer.

- Cluster-wide consistency  
All club nodes and core nodes can share the same logic via a shared gRPC service.

- Advanced processing
    - semantic validation of DX spots
    - extended-field validation
    - contest-aware scoring
    - RBN/LoRa normalization
    - satellite cross-validation
    - anti-flood / rate limiting

## 2. Message Processing Flow With Hooks

When hooks are enabled, a message flows through the following sequence:

```txt
Inbound MQTT Message
        │
        ▼
1. Basic JSON validation (local broker)
        │
2. Normalization / extraction
        │
3. Blacklist Engine (local)
        │
4. gRPC Hooks (remote decision service)
        │
5. Filtering Rules (local)
        │
6. Forwarding / routing
```

Key distinction:

- Blacklist Engine = hard-safety, cluster protection
- gRPC Hooks = dynamic behavior, trust, semantic validation
- Filtering Rules = routing and hygiene

gRPC Hooks never replace the Blacklist Engine; they operate after it

## 3. Available Hook Types

RCLDX defines three hook categories, each corresponding to different points in the cluster pipeline.

### 3.1. PrePublish Hook

Executed by Club Nodes

Triggered when a message enters the club’s input/* hierarchy.

Purpose:

- Validate message structure beyond basic JSON
- Validate semantic correctness (e.g. freq inside band)
- Verify user trust score (grandfathering)
- Apply content policy (e.g. no contests outside contest periods)
- Normalize/clean extended fields
- Check fast rate-limiting for specific clients

Hook decision can be:

- Allowed: Message continues to Filtering Rules.
- Modified (optional): The hook may modify the payload and return a rewritten version.
- Rejected: Message is dropped with a reason.
- Escalated: Message is forwarded but marked with hook.flags = ["warning"].

PrePublish hook payload example:
```json
{
  "type": "spot",
  "de": "EA1HET",
  "dx": "DL0XYZ",
  "src": "manual",
  "radio": {
    "freq": 14205.0,
    "band": "20m",
    "mode": "CW",
    "comment": "CQ DX"
  },
  "extended": {
    "activations": [
      { "program": "POTA", "ref": "EA-1234" }
    ]
  }
}
```

### 3.2. PreForward Hook

Executed by Club Nodes AND Core Nodes

Triggered before forwarding a message:

- Upstream (Club → Core)
- Downstream (Core → Clubs)
- Between clubs if direct interconnect is used

Purpose:

- Apply routing policies based on:
    - message type
    - regional rules
    - prime-time/day-night rules
    - contest modes
    - operator trust
- Enforce participation rules for global contests
- Block clusters that exceed rate limits

Example decisions:
- “Forward only 20m spots between 06:00–22:00 UTC”
- “Do not forward WX messages from unknown stations”
- “Downrank or delay messages from low-trust sources”

The hook receives:
- the message
- the club UUID or core region
- time-of-day
- trust context

### 3.3. PostProcess Hook

Executed only by the Core

Triggered after a message is accepted and processed.

Purpose:
- Write enriched data to:
    - Postgres
    - BigQuery
    - historical Spot Archives
- Trigger analytics pipelines
- Trigger AI post-processing (future)
- Trigger federation to 3rd-party systems
- Optionally publish summarized metrics

Not a filtering hook; it never rejects messages.

## 4. Hook API Specification (Simplified)
General RPC Structure
```protobuf
service RCLDXHooks {
  rpc PrePublishHook(HookRequest) returns (HookReply);
  rpc PreForwardHook(HookRequest) returns (HookReply);
  rpc PostProcessHook(HookRequest) returns (HookReply);
}
````

HookRequest
```protobuf
message HookRequest {
  string hook_type = 1;          // "prepublish", "preforward", "postprocess"
  string node_id = 2;            // club UUID or core-region ID
  string timestamp = 3;          // ISO 8601
  map<string,string> context = 4;// band, mode, src, trust, region

  bytes payload = 5;             // raw JSON message
}
```

HookReply
```protobuf
message HookReply {
  string action = 1;             // "allow", "reject", "modify", "escalate"
  string reason = 2;             // human-readable explanation
  bytes new_payload = 3;         // only used when action="modify"
  repeated string flags = 4;     // ["warn.spot.too_fast", "trust.low"]
}
```

## 5. Typical Use Cases
### 5.1. Trust / Grandfathering Enforcement

Hook checks:
    - User trust score
    - Sponsor (grandparent) count
    - Recent abuse flags
    - Rate limits
    - Node reputation

Example decision:

“EA1HET has only one active sponsor. Allow read-only, reject transmissions.”

### 5.2. Semantic Spot Validation

Examples:

- invalid band/mode
- invalid POTA/SOTA/IOTA reference
- unrealistic satellite grids
- contest exchange out of contest window
- malformed extended block

### 5.3. Adaptive Routing

Examples:

- regional spot suppression
- dynamic downlink rules based on load
- bandwidth conservation in weak countries
- contest weekend adjustments

### 5.4. Federation

The hook may:
- forward to LoRa/TTN
- forward to a second cluster
- log via external logging tools
- store structured data in databases

## 6. Error Handling and Timeouts

The gRPC system is designed to fail safe:

- If the gRPC server is unreachable:
    - PrePublish defaults to allow
    - PreForward defaults to allow
    - PostProcess defaults to skip

- If a hook returns malformed data:
    - The message is allowed OR
    - The broker may optionally fail-closed depending on configuration

- Timeout default:
    - 50–150 ms depending on deployment

Configurable per node

7. Security Model

To prevent abuse:

- Hooks must run over TLS
- Only brokers may initiate connections
- Authentication:
    - mTLS
    - Shared cluster certificates
- Hook services may not publish messages
- Hooks cannot inject new messages into the system
- Hooks operate statelessly, but can query:
    - Redis
    - Postgres
    - BigQuery
    - local trust cache