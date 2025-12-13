 # gRPC hooks

Last updated: **2025-12-04**  
RCLDX Protocol: **v1-beta**

---

The RCLDX cluster supports an optional gRPC hook subsystem that allows brokers to offload advanced logic to external services.

This model enables flexible validation, trust scoring, moderation, routing decisions and semantic analysis without modifying the broker itself.

gRPC hooks bring the following benefits:

- Centralizes complex decision-making.
- Allows policies to be updated without broker restarts.
- Supports dynamic trust models (grandfathering, abuse detection, scoring).
- Enables multi-language extensions (Python, Rust, Go).
- Ensures message-level intelligence while keeping brokers lightweight.

## 1. Purpose of gRPC Hooks

The goals of the gRPC hook subsystem are:

- Externalized decision logic.  
Filtering, trust evaluation or validation is performed by a dedicated service, not inside the broker.

- Dynamic runtime policy updates.  
Admins can adjust rules, trust scores or behavior without redeploying the MQTT layer.

- Cluster-wide consistency.  
All nodes can share the same logic via a shared gRPC service.

- Advanced processing
  - semantic validation of DX spots.
  - extended-field validation.
  - contest-aware scoring.
  - RBN/LoRa normalization.
  - satellite cross-validation.
  - anti-flood / rate limiting.

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
4. gRPC hooks (remote decision service)
        │
5. Filtering Rules (local)
        │
6. Forwarding / routing
```

Key distinction:

- Blacklist Engine = hard-safety, cluster protection.
- gRPC hooks = dynamic behavior, trust, semantic validation.
- Filtering Rules = routing and hygiene.

gRPC hooks never replace the blacklist engine; they operate after it.

## 3. Available hook types

RCLDX defines three hook categories, each corresponding to different points in the cluster pipeline.

`TBD`
