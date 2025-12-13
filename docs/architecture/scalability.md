# Scalability model

RCLDX cluster is inspired by modern large-scale architectures but adapted to the specific ham radio context.

## Horizontal scaling

We scale primarily by adding more brokers and by sharding topics or clubs across them.

## Hot Paths vs Cold Paths

We keep the hot path minimal and offload cold tasks:

- Hot path: validating and distributing live spots.
- Cold path: analytics, statistics, historical queries.

## Bottlenecks and limits

Potential bottlenecks include:

- Core broker throughput
- Network bandwidth between regions
- Cache operations

We mitigate these by using efficient topic design, batching and doing careful QoS choices in addition to implementing eventual consistency.
