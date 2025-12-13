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

**Clients can connect directly to core servers and in most cases that will be the default behavior**.

However, there are certain scenarios where dedicated club or project-specific MQTT brokers may be preferable. These can capture spot data locally, process or act on the spots, and then forward them to the global MQTT network. This approach is particularly relevant for programs such as Parks on the Air (POTA), Bunkers on the Air (BOTA), Summits on the Air (SOTA), World Wide Flora & Fauna (WWFF), Lighthouses on the Air (LOTA), and similar initiatives.

In these cases, intercepting spot data, performing actions based on it (such as filtering, enrichment, or local notification), and subsequently forwarding the spots to the global network is a smart and effective strategy. It enables activators to better plan their activations in advance and improves overall coordination within the program.
