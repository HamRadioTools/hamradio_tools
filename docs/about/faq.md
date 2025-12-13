# FAQ

Frequently asked questions about RCLDX.

## 1. Is RCLDX a replacement for classic DX clusters?

Yes, it's an alternative architecture based on a different base communication protocol. Current deployments coexist or bridge to legacy systems, but ideally that will only happen for some time.

## 2. Do I need to be an expert in MQTT?

No, but understanding MQTT helps.

Clubs can rely on reference configs and tooling already provided by RCLDX cluster team.

Application developers will be required to integrate JSON data format and MQTT protocol in their applications wich, by the way, will provide them a lot of simplicity compared to managing raw telnet sessions.

End users should see no change in the way the operate the tools they use. At most, they should have an enrichful experience by being able to send and recive more data among amateur radio stations in live, like having the 1-to-1, band and general chat, among other features.

## 3. Can I run my own private RCLDX instance?

Yes, with some clarifications.

The architecture is designed to be fully forkable and adaptable, so you are welcome to run your own private or experimental RCLDX deployment. Learning is essential to evolution.

However, participation in the global RCLDX network is only possible through club brokers, not individual stations. If your node is not registered as a club broker, you will still be able to receive spots and other publicly distributed data, but you will not be able to inject data for third-parties into the global system.

RCLDX carefully tracks how data is injected into the network. We maintain a strict distinction between a regular user and a broker, and we actively monitor for any attempt to use regular user credentials to disguise broker-like activity. Such demanor is treated as a severe violation of trust: it will result in a temporal or permanent ban, and the grandfathering score of those responsible will be reduced to zero.

Connections to the core brokers are reserved for recognized clubs, and the approval of any club-to-core linkage is determined by the project leadership (Core team and Admins team) to ensure the proper evolution, stability, maintenance and security of the global network.

## 4. What happens if the JSON data we’re sending/receiving becomes too large?

In general, JSON (JavaScript Object Notation) is a human-readable, text-based format that’s extremely easy to work with and widely supported, which makes it ideal for many APIs and tools. However, as the volume and complexity of the data grows, JSON becomes less efficient:

- It can take up significantly more space than optimized binary formats because field names and structure are repeated as text.
- Parsing and serialization/deserialization can be slower, especially with large or deeply nested structures.

For very large datasets or high-performance systems, binary serialization formats such as Protocol Buffers (ProtoBuf) and Apache Avro are often used instead. These formats are schema-based and encoded in a compact binary form, which results in smaller message size and faster processing.

### Protocol Buffers (ProtoBuf)

Developed by Google, ProtoBuf uses a defined schema (.proto files) to describe the structure of data.

Messages are serialized in a compact binary form that omits human-readable field names, which reduces overall size and speeds up encoding/decoding.

### Apache Avro

Avro also uses a schema, but it keeps the schema together with or alongside the data to enable flexible schema evolution and compatibility.

It’s widely used in big-data and distributed systems (i.e., Kafka).

### Why might RCLDX cluster transitions from JSON to ProtoBuf or Avro?

If the amount of information carried in JSON grows enough that...

- ... bandwidth, storage, or performance become constrained, and...
- ... a binary, schema-based format provides clear operational benefits in terms of size, speed, and maintainability, ...

... then shifting to a binary serialization format like ProtoBuf or Avro can make data exchange and storage more efficient with minimal loss of interoperability (assuming the client ecosystem supports it).

The transition wouldn't be automatic, but it is a standard architectural evolution when scaling beyond simple text-based data interchange.

## 5. What payload size should be used for fast and efficient cluster communication?

For fast, scalable, and reliable operation of the [hamradio.tools](https://hamradio.tools) MQTT cluster, messages should be kept small, predictable and fan-out friendly. As a reference, a realistic DX/contest spot payload expressed in compact (minified) JSON typically occupies **~250–300 bytes**, even when including extended contest information.

Recommended guidelines:

- Typical payload size: 200–800 bytes
- Preferred soft limit: ≤ 1 KB per message
- Strongly discouraged: payloads larger than 4 KB (potentiall being blocked)

Keeping payloads small:

- Reduces broker CPU and memory usage
- Improves fan-out performance to many subscribers
- Minimizes latency on bridges and low-bandwidth links
- Makes clustering and federation more resilient

### About the extended section

The extended section is intentionally designed to be extensible and may grow as logging software and ham radio developers add optional metadata (contest exchanges, awards, scoring hints, etc.).

Developers are encouraged to:

- Add only relevant, short fields.
- Avoid verbose text, blobs, or historical data.
- Prefer identifiers or codes over long strings.

### Future evolution

If, at some point, the amount of data carried per message grows to a level where JSON becomes inefficient (due to size, repetition or parsing cost), the cluster may transition to a binary, schema-based format such as Protocol Buffers (ProtoBuf) or Apache Avro.

This would allow:

- Smaller payloads.
- Faster serialization/deserialization.
- Better long-term schema evolution.

Such a transition would be transparent, versioned and documented, and only considered if clear scalability or performance benefits justify it.
