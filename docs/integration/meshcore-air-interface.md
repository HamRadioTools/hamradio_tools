# MeshCore/Meshtastic air interfaces

RCLDX can be integrated with MeshCore / Meshtastic style of RF networks.

## Concept

LoRa or other low-bitrate links can carry compact spot messages or commands between portable nodes and gateways.

## Encoding

Payloads are expected to be Base45 (or similar previously agreed encodings) to fit within small RF frames while still representing structured data.

## Gateways / Repeaters / Message Stores

Gateways translate between RF messages and MQTT topics, applying the usual filters and policies before injecting into the cluster.
