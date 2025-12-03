# RCLDX – Radio Cluster over MQTT

Welcome to the official documentation for **RCLDX**, the next-generation DX Cluster
architecture based on MQTT, designed for global scalability, resilience, and openness.

## Vision

RCLDX rethinks classic ham radio clusters (DX Spider, CC Cluster, etc.) for a modern,
Internet-scale environment. The main goals are:

- Distribute DX spots and related data in **near real-time** worldwide.
- Allow clubs and individual hams to participate without centralized gatekeepers.
- Provide **strong abuse control** without central political power.
- Be **protocol-friendly**: DX spots, RBN, WSPR, POTA/SOTA, contest exchanges, etc.

## High-Level Features

- ✅ Two-layer architecture: **Core Layer** + **Club Layer**
- ✅ MQTT-based, horizontally scalable and technology-agnostic
- ✅ Security based on a **Grandfathering Model** (social trust graph)
- ✅ Pluggable filtering engine, blacklist rules, and custom pattern language
- ✅ Optional over-the-air delivery (LoRa / MeshCore / RF gateways)
- ✅ Open design: you are encouraged to extend and adapt it

## How This Documentation Is Organized

Use the sidebar to navigate the main sections:

- **Architecture** – global topology, core vs club, redundancy, QoS
- **Security** – grandfathering model, authentication, abuse mitigation
- **Protocol** – message formats, topics, DX spot schema, filters
- **Components** – EMQX core, Mosquitto clubs, Redis backend, dashboards
- **User System** – callsign identity, verification, registration flows
- **Integration** – on-air transports, digital modes, Telnet bridging, REST API
- **Operations** – monitoring, OpenTelemetry, deployment, backups, troubleshooting
- **About** – roadmap, governance, contributing, FAQ, credits

You are welcome to fork and adapt this documentation for your own RCLDX-derived projects.
