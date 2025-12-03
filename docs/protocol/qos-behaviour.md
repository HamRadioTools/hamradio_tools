# MQTT QoS behaviour

This document complements the QoS Strategy by describing expected runtime behaviour.

## Loss tolerance

Users must understand that not every spot is guaranteed to reach every subscriber. The system optimizes for useful throughput over absolute reliability.

## Operator guidelines

Operators should monitor message loss metrics and only increase QoS for specific topics when truly necessary.

## Client guidelines

Clients should be coded defensively: they must handle duplicates, out-of-order messages, and the occasional gap in the stream.

