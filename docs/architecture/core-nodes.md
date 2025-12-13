# Core nodes

Core brokers form the backbone of RCLDX cluster. They are designed to be few, stable and well-managed.

## Responsibilities

- Aggregate and redistribute validated DX spots, chats and other types of messages.
- Enforce global filtering policies.
- Provide a stable point for inter-club/inter-user communication

## Connectivity

Core brokers operate high-performance MQTT services. Clubs connecting to the core do so using mutually agreed connection mechanisms and a deliberately restricted set of topics.

## Failure model

The core brokers are designed to tolerate the loss of a core node without causing a global outage.

Clubs that choose to operate a broker should be prepared to fail over to a secondary core broker when necessary. Running a broker is a responsibility that requires continuity and proper maintenance over time.
