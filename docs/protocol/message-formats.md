# Message formats

Last updated: **2025-12-04**  
Protocol Version: **v1-beta**

---

The RCLDX cluster uses a unified, minimal and extensible JSON message model designed for high-speed radio-related data over MQTT.

This document describes the general message structures used in the system, while specialized structures (such as DX Spots) are documented in their respective sections.

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
| **Weather**   | Space-weather and ground-weather                           |
| **System**    | Cluster-internal system announcements.                     |

DX Spots are by far the most common message and have a dedicated full specification in DX Spot Schema.

## 2. General message structure

Every message has the same envelope pattern:

```json
{
  "<type>": { ... },
  "extended": { ... }  // optional
}
```

The `<type>` key defines the root object:

- "spot" for DX spots.
- "chat" for chat messages.
- "wx" for weather messages.
- "system" for system events.

The `extended` block:

- may exist (empty object allowed).
- may contain one or more namespaced sub-blocks.
- preserves forward compatibility for future programs and initiatives.

## 3. Spot messages (DX spots)

DX spots are the most important message type on the RCLDX cluster. See [DX spot Schema](dx-spot-schema.md) for the full specification details, field definitions and examples.

## 4. Chat messages

Chat messages allow clusters, clubs and users to communicate in near real time.

They support three scopes:

| Scope    | Meaning                                                |
| -------- | ------------------------------------------------------ |
| **1to1** | Direct message between two callsigns.                  |
| **band** | Message broadcast to users monitoring a specific band. |
| **all**  | Message broadcast globally.                            |

### 4.1. 1-to-1 chat

```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "DL0XXX",
    "scope": "1to1",  // 1to1 | all | band
    "msg": {
      "comment": "Fancy a coffe?"
    }
  }
}
```

### 4.2. Global chat

```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "all",
    "scope": "all",  // all | band | 1to1
    "msg": {
      "comment": "Seeking sched for 160m tomorrow."
    }
  }
}
```

### 4.3. Band-wide chat

```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "20m",
    "scope": "band",  // band | 1to1 | all  
    "msg": {
      "comment": "Impressive opening North-South to AF"
    }
  }
}
```

The `extended` block may be present, but it's normally unused for chat.

## 5. Weather messages

Weather messages (key: wx) provide space weather and/or local weather from ham radio well-known services, individual stations or networks.

Both blocks (solar and ground) are optional and may appear together.

Example: combined space & ground weather
```json
{
  "wx": {
    "de": "W5MMW",
    "dx": "all",

    "solar": {    
      "sfi": 200,
      "sn": 200,
      "a": 9,
      "k": 3,
      "xray": "C2.8",
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
      "gridloc": "IN55el",
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
    "de": "EA1HET",
    "dx": "all",
    "ground": {
      "gridloc": "IN43im",
      "temp_c": 21.4,
      "wind_kts": 5,
      "pressure_hpa": 1015,
      "humidity_pct": 72
    }
  },
}
````

## 6. Satellite messages

Satellite messages provide satellite (“bird”) metadata, TLE information and cluster-wide satellite bulletins.

Example: Broadcasting a TLE

```json
{
  "satellite": {
    "de": "ARRL",
    "dx": "ALL",
    "bird":  {
      "name": "AO-7",
      "tle": [
        "7530U 74089B 25336.28342912 -.00000021 00000-0 15963-3 0 9994",
        "7530 101.9969 342.4412 0012315 146.2919 283.3011 12.53693888335840"
      ]
    }
  }
}
```

This message type does not represent QSOs via satellites; those are DX spots with `extended`.`bird` clauses.

## 7. System messages

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
    "de": "SYSTEM",
    "dx": "all",
    "comment": "Server restart scheduled at 15:00 UTC"
  }
}
```

The `extended` block may contain optional metadata depending on cluster needs.

## 8. Extended block rules

The `extended` object is only needed for Spots and next rules apply:

- MAY exist (empty {} allowed).
- MAY contain one or multiple namespaced structures (i.e., qso, contest, rbn, bird, activations).
- MUST NOT contain duplicate namespaces.
- MAY contain vendor-specific or experimental namespaces without breaking compatibility.

Example with multiple namespaces:

```json
"extended": {
  "contest": { "name": "CQ WW SSB" },
  "bird": { "name": "AO-91" },
  "activations": [
    { "program": "POTA", "ref": "EA-5678" }
  ]
}
```

## 9. Forward compatibility

The message model is intentionally designed for growth:

- New digital reporting formats (WSPR, PSKReporter, Digi auto-decoding)
- LoRa / meshed spot injection
- Meteor scatter, EME, or other propagation-driven spot systems
- AI-assisted decoders
- Club-level custom metadata

Any new functionality fits cleanly under `extended`.

## 10. Summary

- All message types follow the same envelope:
root object + extended block
- DX Spots use a minimal spot block and an extensible extended block.
- Chat, Weather, Satellite, and System messages follow similar patterns.
- The model is intentionally simple to generate and highly extensible.

For specialized details about DX spots, see the companion document [DX Spot Schema](dx-spot-schema.md)
