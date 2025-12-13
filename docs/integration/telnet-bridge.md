# Telnet bridge

A Telnet bridge allows legacy DX cluster clients to use RCLDX without modification.

## Role

The bridge emulates a classic DX cluster server on a Telnet port, translating between legacy text commands and RCLDX MQTT messages.

## Mapping

Spots read from MQTT are rendered as traditional DX cluster lines; user inputs in JSON format are parsed and turned into Telnet spot messages.

## Limitations

Some RCLDX features (e.g., rich metadata) may not fit into traditional text formats and are therefore omitted or simplified.
