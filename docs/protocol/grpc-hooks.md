# gRPC hooks

The filtering engine is an internal separated component that exposes a gRPC endpoint so that brokers call it as a policy oracle.

## Motivation

Keeping policy logic outside the broker allows more flexible deployments and versioning without touching broker configs.

## API shape

The core RPC is something like `CheckMessage(request) -> decision`, where `decision` includes allow/deny flags and optional transformations.

## Performance considerations

gRPC calls are low-latency; RCLDX employs local caches for decisions and fallback modes when the policy service is unreachable.
