# Architecture overview

This page provides a high-level overview of the global RCLDX architecture.

## Goals

The architecture must be globally reachable, resilient against abuse and easy for users and clubs to join without heavy infrastructure.

## Design principles

- Loose coupling between components
- Clear separation of concerns
- Prefer stateless services when possible
- Allow incremental rollout and migration from legacy clusters

## Two-layer model

RCLDX understands and separates responsibilities between a **Core layer** of globally connected MQTT brokers and a **Club layer** that connects local communities to the core.

**Clients can connect directly to Core servers and in most cases that will be the default behavior**.

Nonetheless, there are specific use cases where club MQTT servers or project MQTT servers might desire to capture spot data to work on the spots before forwarding this traffic to core. That might be the use cases of initiatives like Parks on the Air (POTA), Bunkera on the Air (BOTA), Summits on the Air (SOTA), World Wide Flora & Fauna (WWFF), Lighthouses on the Air (LOTA) and similar initiatives. In their use case, capturing spot data before send it to the global cluster is useful for the activations to be well planed in advance.
