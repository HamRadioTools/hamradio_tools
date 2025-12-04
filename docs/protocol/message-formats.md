# Message formats

Last updated: **2025-03**  
Protocol Version: **v1-beta**

---

The RCLDX Cluster uses a unified, minimal, and extensible JSON message model designed for high-speed radio-related data over MQTT.

This document describes the general message structures used in the system, while specialized structures (such as DX Spots) are documented in their respective sections.

Each message type contains:

- a root object defining the message type (spot, chat, wx, etc.),
- optional extensions that provide additional context or data,
- a strict, minimal set of required fields for compatibility across clients.

This section describes all message families used inside the cluster.

## 1. Overview of Message Families

The system currently defines the following message types:

| Type          | Description                                                |
| ------------- | ---------------------------------------------------------- |
| **DX Spot**   | Standard amateur-radio DX spot messages (core + extended). |
| **Chat**      | Human chat messages (1:1, band-wide, global).              |
| **Weather**   | Space-weather and ground-weather broadcasts.               |
| **Satellite** | Satellite telemetry and TLE broadcast messages.            |
| **System**    | Cluster-internal system announcements.                     |

DX Spots are by far the most common message and have a dedicated full specification in DX Spot Schema.

## 2. General Message Structure

Every message has the same envelope pattern:

```json
{
  "<type>": { ... },
  "extended": { ... }       // optional
}
```

The <type> key defines the root object:

- "spot" for DX spots
- "chat" for chat messages
- "wx" for weather messages
- "satellite" for satellite/TLE messages
- "system" for system events

The extended block:
- must exist (empty object allowed)
- may contain one or more namespaced sub-blocks
- preserves forward compatibility for future programs and initiatives

## 3. Spot Messages (DX Spots)

DX Spots are the core message type of the cluster.
Only the high-level shape is shown here — the full specification is in DX Spot Schema.

High-level shape
```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "DL0XYZ",
    "src": "manual",
    "radio": {
      "comment": "CQ DX",
      "freq": 14205.0,
      "mode": "CW",
      "band": "20m",
      "rst_s": "59",
      "rst_r": "54"
    }
  },
  "extended": { }
}
```

The extended block may include:

- contest
- rbn
- bird
- activations

(future namespaces: wspr, lora, telemetry, etc.)

See: DX Spot Schema for full details, field definitions, and examples.

## 4. Chat Messages

Chat messages allow clusters, clubs, and users to communicate in real time.

They support three scopes:

| Scope    | Meaning                                                |
| -------- | ------------------------------------------------------ |
| **1to1** | Direct message between two callsigns.                  |
| **band** | Message broadcast to users monitoring a specific band. |
| **all**  | Message broadcast globally.                            |

## 4.1. 1-to-1 Chat
```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "DL0XXX",
    "scope": "1to1",  // 1to1 | all | any radio band
    "msg": {
      "comment": "Fancy a coffe?"
    }
  }
}

```

## 4.2. Global Chat
```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "all",
    "scope": "all",  // all | 1to1 | any radio band
    "msg": {
      "comment": "Seeking sched for 160m tomorrow."
    }
  }
}

```

## 4.3. Band-wide Chat
```json
{
  "chat": {
    "de": "EA1HET",
    "dx": "BAND",
    "scope": "20m",  // any radio band | 1to1 | all 
    "msg": {
      "comment": "Impressive opening North-South to AF"
    }
  }
}

```
The extended block exists but is normally unused for chat.

## 5, Weather Messages

Weather messages (key: wx) provide space weather and/or local weather from stations or networks.

Both blocks (solar and ground) are optional and may appear together.

Example: combined space & ground weather
```json
{
  "wx": {
    "de": "W5MMW",
    "dx": "ALL",

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
      "auroralat_pct": 60.7,
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
    "de": "EA1HET-WX",
    "dx": "ALL",
    "ground": {
      "gridloc": "IN73dm",
      "temp_c": 21.4,
      "wind_kts": 5,
      "pressure_hpa": 1015,
      "humidity_pct": 72
    }
  },
  "extended": { }
}
````

## 6. Satellite Messages

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

This message type does not represent QSOs via satellites (those are DX Spots with `extended.bird`).

## 7. System Messages

System messages (key: system) broadcast cluster-internal announcements.

Examples:

- scheduled maintenance
- server restarts
- cluster routing changes
- operational warnings

Example: system broadcast
```json
{
  "system": {
    "de": "SYSTEM",
    "dx": "ALL",
    "comment": "Server restart scheduled at 15:00 UTC"
  }
}
```

The extended block may contain optional metadata depending on cluster needs.

## 8. Extended Block Rules

The extended object is only needed for Spots and next rules apply:

- MUST exist (empty {} allowed).
- MAY contain one or multiple namespaced structures (e.g., contest, rbn, bird, activations).
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

## 9. Forward Compatibility

The message model is intentionally designed for growth:

- New digital reporting formats (WSPR, PSKReporter, FT4 auto-decoding)
- LoRa / meshed spot injection
- Meteor scatter, EME, or other propagation-driven spot systems
- AI-assisted decoders
- Club-level custom metadata

Any new functionality fits cleanly under extended.

## 10. Summary

- All message types follow the same envelope:
root object + extended block
- DX Spots use a minimal spot block and an extensible extended block.
- Chat, Weather, Satellite, and System messages follow similar patterns.
- The model is intentionally simple to generate and highly extensible.

For specialized details about DX spots, see the companion document [DX Spot Schema](dx-spot-schema.md)