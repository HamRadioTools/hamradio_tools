# Message formats

RCLDX messages are primarily JSON payloads transported over MQTT.

## Common envelope

Every message SHOULD include a small common envelope with fields such as:

- `type` – message type (`spot`, `system`, `heartbeat`, ...)
- `timestamp` – ISO8601 UTC timestamp
- `source` – club ID or gateway ID
- `schema` – version of the payload schema

## DX Spot example

```json
{
  "type": "spot",
  "mode": "FT8",
  "band": "20m",
  "de": "EA1HET",
  "dx": "K1ABC",
  "freq": 14074.50,
  "msg": "CQ POTA IN24DG",
  "timestamp": "2025-01-01T12:34:56Z",
  "source": "club-uuid-1234",
  "schema": "dxspot:v1"
}
```

## Extensibility

New message types (e.g. `rbn-spot`, `wspr-spot`, `pota-activation`) can be defined by adding new schemas under a controlled namespace.
