# Message formats

Last updated: **2025-12-22**  
Protocol Version: **v1-beta**

---

The RCLDX cluster uses a unified, minimal and extensible JSON message model designed for high-speed radio-related data over MQTT.

This document describes the general message structures used in the system, while specialized structures (such as DX Spots) are documented in their respective individual sections.

Each message type contains:

- A root object defining the message type (spot, chat, wx, etc...).
- Optional extensions that provide additional context or data.
- A strict, minimal set of required fields for compatibility across clients.

This section describes all message families used inside the cluster.

## 1. Overview of message families

The system currently defines the following message types:

| Type          | Description                                                |
| ------------- | ---------------------------------------------------------- |
| **Spot**      | Standard amateur-radio DX spot messages (core + extended). |
| **Chat**      | Human chat messages (1:1, band-wide, global).              |
| **Weather**   | Space / ground weather                                     |
| **System**    | Cluster-internal system announcements.                     |

**DX Spots** are, by far, the most common message, and have a dedicated full specification in the [DX spot schema](protocol/dx-spot-schema.md) section.

---

## 2. General message structure

Message envelopes are type-specific. Most message families use a single root key (`chat`, `wx`, `system`), while DX spots include a transport envelope with identifiers plus a `spot` object.

Spot envelope (normalized, as they're seen by subscribed clients):

```json
{

  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  
  "event_type": "spot_add",
  
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "dl0xxx",
      "src": "manual"
    },

    "radio": {
      "freq": 14205.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },

    "extended": {}

  }  // spot end

}  // message end
```

Notes:

- `event_type` is always lowercase and defines what type of spot is this.
- `id7`, `hid`, `sid`, `event_type` are added by the cluster once a raw spot enters `spot/input`.
- The `spot` object carries identity, radio, and extended data (see DX spot schema).
- All string values in spot payloads should be lowercase; the cluster may normalize or reject mixed-case values.

---

## 3. Spot routing topics

This section explains the routing model as a fixed contract between producers, the cluster and consumers. The contract is designed for speed and predictability: routing is decided by the topic string alone, with no payload inspection required by clients.

The cluster accepts raw spots on `spot/input`, enriches and normalizes them, then publishes to three outputs:

1. `spot/output` (global firehose, normalized)
2. `spot/filter/{src_region}/{dst_region}/{band}/{type}/{mode}` (curated routing topics)
3. `spot/route/#` (global firehose with the enriched `route` block)

### 3.1 Why three outputs exist?

There is a clear split in output data that keeps the system open to advanced use while remaining friendly to lightweight clients:

- The firehose `spot/output` is the simplest path: specialists can consume everything and apply their own filtering at will.

- The curated routing topics exist for everyone else, providing a stable and compact routing matrix where wildcards can express common filters without custom parsing logic.

- The `spot/route` stream exists for clients that need exclusion or complex filtering logic. It keeps the broker neutral while giving applications the data they need to filter locally.

### 3.2 Topic format and meaning

Final topic format:

```mqtt
spot/filter/{src_region}/{dst_region}/{band}/{type}/{mode}
```

Example:

```mqtt
spot/filter/na/eu/20m/digi/ft8
```

This means a spot originating in North America is pointing out to Europe, on 20 meters, commumnication type digital, mode FT8. The topic string is the routing index. It is designed to be deterministic and human-readable while remaining easy for MQTT brokers and clients to match.

### 3.3 Locked vocabularies

- Region vocabulary (lowercase, bounded): `eu` `na` `sa` `as` `af` `oc` `unk`
- Band vocabulary (lowercase, canonical):
  - HF: `160m` `80m` `60m` `40m` `30m` `20m` `17m` `15m` `12m` `10m`  
  - VHF/UHF: `6m` `4m` `2m` `70cm` `23cm`
  - SHF: `13cm` `9cm` `6cm` `3cm` `1.25cm` `6mm` `4mm` `2.5mm` `2mm` `1mm`
- Type (routing layer, lowercase only): `cw` `ssb` `am` `fm` `digi`
- Mode (lowercase ADIF-like terms): `cw` `lsb` `usb` `am` `fm` `ft8` `ft4` `rtty` `psk` `jt65` `js8` ...

Rules:

- If mode is known, use the exact token.
- If mode is unknown, use `any`.

Valid example:

```mqtt
spot/filter/eu/na/40m/digi/any
```

### 3.4 Subscription patterns

The topic format is built for wildcard subscriptions:

- All EU → NA propagation: `spot/filter/eu/na/#`
- EU → NA, CW on any band: `spot/filter/eu/na/+/cw/+`
- Any → EU, 20 m DIGI: `spot/filter/+/eu/20m/digi/+`
- Global FT8 only: `spot/filter/+/+/+/digi/ft8`

Clients can choose narrow or broad subscriptions without inspecting JSON payloads.

### 3.5 Region derivation (locked)

Routing regions are derived deterministically:

```bash
src_region =
  if spot.radio.de_grid exists → derived from grid
  else if spot.identity.de exists → derived from callsign prefix
  else → "unk"
```

The same rule applies to `dst_region` using the DX callsign (callsign prefix fallback, else `unk`).

This rule is auditable and repeatable, which is important for analytics and long-term consistency.

### 3.6 Payload is still the source of truth

Topics provide the fast path, but the payload is the authoritative record. It must include:

- original frequency
- exact ADIF mode
- grids (when present)
- `id7`, `hid`, `sid`

This enables corrections, audits, analytics and reclassification later without breaking the routing contract.

### 3.7 Exclusions and the route block

MQTT topic filters are inclusive only. There is no NOT operator, so exclusions (for example, "everything except EU") must be done by clients.

The `spot/route` stream provides an enriched `route` block in the payload with normalized fields like `de_cont`, `dx_cont`, `band`, `type`, and `mode`. Clients should use those fields to apply their own exclusion logic without broker-side preference data.

For more detail and examples, see [Working with exclusions](protocol/working-with-exclusions.md).

---

## 4. Spot messages (DX spots)

DX spots are the most important message type on the RCLDX cluster. See [DX spot schema](protocol/dx-spot-schema.md) for the full specification details, field definitions and examples.

---

## 5. Chat messages

Chat messages allow clusters, clubs and users to communicate in near real time.

They support three scopes:

| Scope    | Meaning                                                |
| -------- | ------------------------------------------------------ |
| **1to1**  | Direct message between two callsigns.                  |
| **band**  | Message broadcast to users monitoring a specific band. |
| **world** | Message broadcast globally.                            |

### 5.1. 1-to-1 chat

```json
{
  "chat": {
    "de": "ea1het",
    "dx": "dl0xxx",
    "scope": "1to1",  // 1to1 | world | band
    "msg": "fancy a coffe?"
  }
}
```

### 5.2. Global chat

```json
{
  "chat": {
    "de": "ea1het",
    "dx": "world",
    "scope": "world",  // world | band | 1to1
    "msg": "seeking sched for 160m tomorrow."
  }
}
```

### 5.3. Band-wide chat

```json
{
  "chat": {
    "de": "ea1het",
    "dx": "20m",
    "scope": "band",  // band | 1to1 | world  
    "msg": "impressive opening north-south to af"
  }
}
```

---

## 6. Weather messages

Weather messages (key: wx) provide space weather and/or local weather from ham radio well-known services, individual stations or networks.

Both blocks (solar and ground) are optional and may appear together.

Example: combined space & ground weather

```json
{
  "wx": {

    "identity": {
      "de": "w5mmw",
      "dx": "all"
    },  

    "solar": {    
      "sfi": 200,
      "sn": 200,
      "a": 9,
      "k": 3,
      "xray": "c2.8",
      "304a": 144.0,
      "pf": 26,
      "ef": 2550,
      "aurora": 1.99,
      "aurora_lat": 60.7,
      "bz": -10.7,
      "sw": 307.6,
      "solar_flare": 65,
      "muf": 15350.0
    },

    "ground": {
      "gridloc": "in55el",
      "temp_c": 7.5,
      "wind_kts": 12,
      "pressure_hpa": 1012,
      "humidity_pct": 72
    }

  }  
}
````

Example: ground-weather only (personal station)

```json
{
  "wx": {

    "identity": {
      "de": "w5mmw",
      "dx": "all"
    },  

    "ground": {
      "gridloc": "in43im",
      "temp_c": 21.4,
      "wind_kts": 5,
      "pressure_hpa": 1015,
      "humidity_pct": 72
    }

  },
}
```

---

## 7. Satellite messages

Satellite messages provide satellite (“bird”) metadata, TLE information and cluster-wide satellite bulletins.

Example: Broadcasting a TLE

```json
{
  "satellite": {

    "identity": {
      "de": "arrl",
      "dx": "world"
    },  

    "bird":  {
      "name": "ao-7",
      "tle": [
        "7530u 74089b 25336.28342912 -.00000021 00000-0 15963-3 0 9994",
        "7530 101.9969 342.4412 0012315 146.2919 283.3011 12.53693888335840"
      ]
    }

  }
}
```

This message type does not represent QSOs via satellites; those are DX spots with `extended`.`bird` clauses.

---

## 8. System messages

System messages (key: system) broadcast cluster-internal announcements.

Examples:

- scheduled maintenance.
- server restarts.
- cluster routing changes.
- operational warnings.

Example: system broadcast

```json
{
  "system": {
    "de": "system",
    "dx": "all",
    "msg": "server restart scheduled at 15:00 utc"
  }
}
```

---

## 8. spot.extended rules

The `spot.extended` object is only needed for Spots and the next rules apply:

- MUST exist (empty {} allowed).
- MAY contain one or multiple namespaced structures (i.e., qso, contest, rbn, bird, activations).
- MUST NOT contain duplicate namespaces.
- MAY contain vendor-specific or experimental namespaces without breaking compatibility.

Example with multiple namespaces:

```json
{

  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  
  "event_type": "spot_add",
  
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "dl0xxx",
      "src": "manual"
    },
    
    "radio": {
      "freq": 14025.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },
    
    "extended": {
      "contest": { "name": "cq ww ssb" },
      "bird": { "name": "ao-91" },
      "activations": [
        { "program": "iota", "ref": "ea-0001", "msg": "on air from iota via ao-91" }
      ]
    }

  }  // spot end

}  // message end
```

---

## 9. Forward compatibility

The message model is intentionally designed for growth:

- New digital reporting formats (WSPR, PSKReporter, Digi auto-decoding)
- LoRa / meshed spot injection
- Meteor scatter, EME, or other propagation-driven spot systems
- AI-assisted decoders
- Club-level custom metadata

Any new functionality fits cleanly under `spot.extended`.

---

## 10. Summary

- All message types follow a stable envelope per type.
- DX Spots use a minimal spot object and an extensible spot.extended block.
- Chat, Weather, Satellite, and System messages follow similar patterns.
- The model is intentionally simple to generate and highly extensible.

For specialized details about DX spots, see the companion document [DX spot schema](protocol/dx-spot-schema.md)
