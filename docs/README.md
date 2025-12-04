# RCLDX – Radio Cluster DX over MQTT

Welcome to the official documentation for **RCLDX**, the next-generation Radio Cluster DX architecture based on MQTT, designed for global scalability, resilience and openness.

## Vision

RCLDX rethinks classic ham radio clusters (DX Spider, CC Cluster, AR Cluster, CLX, Clusse, DxNet, etc...) for a modern,
Internet-scale environment.

The main goals are:

- Distribute DX spots and related data in **near real-time** worldwide.
- Allow clubs and individual hams to participate.
- Provide **strong abuse control** without central political power.
- Be **protocol-friendly**: DX spots, RBN, WSPR, POTA/SOTA, contest exchanges, etc...

## High-level features

- ✅ Two-layer architecture: **Core Layer** + **Club Layer**
- ✅ MQTT-based, horizontally scalable and technology-agnostic
- ✅ Security based on a **Grandfathering Model** (social trust graph)
- ✅ Pluggable filtering engine, blacklist rules and custom pattern language
- ✅ Optional over-the-air delivery (LoRa / MeshCore / Meshtastic / RF gateways)
- ✅ Open design: you are encouraged to extend and adapt it

## How this documentation is organized

Use the sidebar to navigate the main sections:

- **About** – roadmap, governance, contributing, FAQ, credits
- **Architecture** – global topology, core vs club, redundancy, QoS
- **Integration** – on-air transports, digital modes, Telnet bridging, REST API
- **Protocol** – message formats, topics, DX spot schema, filters
- **Security** – grandfathering model, authentication, abuse mitigation
- **User System** – callsign identity, verification, registration flows

You are welcome to fork and adapt this documentation for your own RCLDX-derived projects.
