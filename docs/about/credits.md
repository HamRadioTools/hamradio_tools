# Credits

Acknowledgements for the [Radio Club Lugones](https://www.radioclublugones.es/) that inspired and contributed to RCLDX since day one.

## Ham Radio community

Thanks to all operators who provided feedback, shared ideas, and tested early prototypes. Your devotion is its own reward. Thank you.

### Clubs

- [Radioclub Foronda](https://www.ea2rcf.org/), for their support on document review and working as beta testers.
- [RadioMAD EA4RCM](https://www.radiomad.es/), for their support on document review and working as beta testers.
- THC dev team, for their collaboration and support on discussing the grandfathering security model and the sport processing techniques.

### Individuals

- KI2D, Sebastián Delmont, for his support, contacts sharing and ideas regarding spot classification, split operation, verified accounts and shadown ban techniques.

### Amaterur Radio projects & services

- **The Reverse Beacon Network**, a global network of automated receiver stations that monitor amateur radio bands for Morse code (CW) and digital signals like FT8, RTTY, and PSK. Instead of transmitting like traditional beacons, RBN nodes listen continuously and report what they receive, such as call signs, signal strength, frequency, and location, via a central database. This data is displayed in near-real time on a map at [https://www.reversebeacon.net](https://www.reversebeacon.net), allowing operators to see where their signals are being heard and analyze propagation conditions. The network is valuable for testing antennas, comparing signal performance, and monitoring band openings during contests or activations.
- **VE7CC**, a popular DX-cluster client software developed by Lee Sawkins (VE7CC) for radio amateurs, enabling real-time communication and spot sharing across global DX clusters. It supports Telnet, DDE, and RS-232 interfaces for integration with logging and contest programs, and offers advanced filtering, spot display customization, and features like automatic reconnection and missed spot retrieval.

## Open Source projects

RCLDX builds on the shoulders of giants across the modern distributed-system ecosystem. Its foundation includes:

- Python and Rust for high-performance backend services, async I/O pipelines and protocol handlers.
- PostgreSQL/TimescaleDB for relational storage, transactional integrity and structured query workloads (SQL) plus the addition of hypertables for time series storage.
- Redis/DragonflyDB for ultra-low-latency caching, ephemeral data structures, pub/sub messaging and rate-limiting primitives.
- NATS/MQTT for lightweight, high-speed message distribution and cluster-to-cluster communication.
- OpenTelemetry (OTLP) for vendor-neutral instrumentation, distributed traces, structured logs and metrics export.
- Prometheus for pull-based metrics collection and time-series storage (PromQL).
- Loki for log aggregation using the Prometheus-style label model (LogQL).
- Grafana for visualization dashboards of metrics, traces and event flows across the cluster.
- Traefik, for edge routing, TLS termination and service discovery.
- NGINX, for web services and API ingress.
- gRPC, ProtoBuf, HTTP/REST and WebSocket interfaces, for internal and external service communication.
- Docker/Nomad, for container scheduling, service orchestration and auto-scaling.
- Consul, for service discovery, distributed key/value coordination and health checks.
- Vault, for secure secret management, dynamic credentials encryption-as-a-service and zero-trust identity workflows.

Together, these components form a resilient, observable and high-performance platform inspired by best practices from modern telemetry systems, distributed brokers and large-scale real-time data networks.

## Authors

Core Team:

- EA1HET, Jonathan González
- EA1GIY, Hugo Meré

Admin Team:

- EA1ITM, José Molina
- EA1nnnnFD, Rafael García
- EA4ETJ, Eduardo Olmo
- EA4HPS, Daniel García
