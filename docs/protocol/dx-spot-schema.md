# DX spot schema

Last updated: **2025-12-22**  
Protocol Version: **v1-beta**

---

This document defines the official DX spot message format used in the RCLDX MQTT Cluster.

The goal is to define a minimal, stable, easy-to-generate structure while providing unlimited extensibility through the spot.extended block.

---

## 0. Cluster identifiers and event type

These fields are added by the cluster after a spot enters on `spot/input`. They do not come from client software.

| Field        | Description                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id7`        | Event identifier (UUIDv7). Unique per reception. Used for ordering, tracing and auditability across the entire pipeline.                                                             |
| `hid`        | Hash identifier. Cryptographic hash of the normalized payload, used for integrity verification and anti-tamper checks between trusted services.                                      |
| `sid`        | Spot identity signature. Deterministic identifier that groups multiple receptions referring to the same underlying spot. Used for de-duplication, corrections and deletion semantics.|
| `event_type` | Event lifecycle indicator. Defines how this message must be interpreted by consumers. Allowed values are: spot_add, spot_patch, spot_dele(te), always lowercase.                     |

### Semantic rules and guarantees

#### `id7` — event identity
  
- Generated once per received spot.
- Immutable for the lifetime of the message.
- Uniquely identifies this specific reception, even if the spot is a duplicate.
- Enables strict event ordering, replay and forensic auditing.

#### `hid` — payload integrity

- Derived from a canonical, normalized representation of the payload.
- Allows trusted components to verify message integrity, detect tampering, confirm payload equivalence across pipeline stages.
- May be recalculated internally by trusted services, but never altered by clients.

#### `sid` — spot identity and evolution key

- Represents the conceptual spot, not a single reception.
- Multiple `id7` events may legitimately share the same `sid`.
- All operations that deduplicate, amend, or delete a spot are keyed by `sid`.
- `sid` is the anchor that allows a spot to evolve over time without mutating past events.

#### event_type — lifecycle semantics

Defines how consumers must apply this event:

- `spot_add`: Introduces a new spot or an additional reception of an existing one.
- `spot_patch`: Modifies or corrects the current canonical representation of a spot identified by `sid` (e.g. wrong frequency, mode, grid or metadata).
- `spot_dele(te)`: Explicitly retracts a spot identified by `sid` from the active cluster view.

> **NOTE:**  
> Event streams are append-only in nature; corrections and deletions are expressed as new events,
never by altering previously published messages.

### Design intent (or, why this exists?)

This identifier model allows the cluster to:

- Preserve a pure event stream (MQTT remains append-only).
- Eliminate duplicates without losing provenance.
- Apply corrections and deletions deterministically.
- Support both:
  - live streaming consumers (MQTT subscribers),
  - state-based consumers (WebSocket/UI clients using materialized views).
- Maintain auditability, traceability and trust across distributed systems.

---

## 1. DX spot message structure

**Case rules**: All string values in spot messages should be lowercase. If a client sends mixed-case values, the cluster will either normalize them to lowercase or reject the message due to case sensitivity.

A DX spot message enters the cluster as a `spot` object on `spot/input`. The cluster then enriches it with envelope fields and publishes to `spot/output` and the `spot/filter/...` topics described in [Message formats](protocol/message-formats.md).

Ingress example (published to `spot/input`):

```json
{
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "dl0xxx",
      "src": "manual"
    },
    
    "radio": {
      "freq": 14005.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },
    
    "extended": { }
  
  }
}
```

Normalized example (published to `spot/output` and `spot/filter/...`):

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
      "freq": 14005.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },
    
    "extended": { }
  
  }
}
```

The `spot.extended` object holds optional information such as contest metadata, RBN data, satellite data and activation references among others. This is flexible solution to envision future usages.

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
      "freq": 14005.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },
  
    "extended": {
      "qso": { ... },
      "contest": { ... },
      "rbn": { ... },
      "bird": { ... },
      "activations": [ ... ]
      ...
    }

  }
}
```

The concept, which is yet pending to be put against the cords with  everyday practice, is to introduce a spot.extended data block that can carry additional information beyond the standard spot data.
This spot.extended block would serve two main purposes:

- Allow the RCLDX cluster to automatically recognize common, recurring block types (e.g., `contest`, `rbn`, `bird` for satellite QSOs, `activations` for POTA/SOTA/BOTA/WWFF/Lighthouses, etc...).

- Remain open for third-party use, primarily by logbook developers, so their software can include extra data that is useful specifically for their own programs.

**NOTE**:  
When RCLDX archives historical spot data, it will permanently store the officially recognized blocks (like those listed above), but it will not preserve the custom additional blocks added by third-party logbook software.

In this way, the spot.extended block becomes a simple, standardized “pipe” through the cluster that allows different logging programs to exchange useful extra information between their users without requiring complex individual integrations. Not saving this data is essential for making it ephemeral, which is meant to be a strategic decision.

## 2. Specification of the spot message

### 2.1. Envelope fields

| Field        | Type   | Required | Description                                                |
| ------------ | ------ | -------- | ---------------------------------------------------------- |
| `id7`        | string | Yes      | UUIDv7 assigned by the cluster on ingress.                 |
| `hid`        | string | Yes      | Hash id assigned by the cluster on ingress.                |
| `sid`        | string | Yes      | Spot identity signature for dedupe and corrections.        |
| `event_type` | string | Yes      | Event type (`spot_add`, `spot_patch`, `spot_dele`).        |
| `spot`       | object | Yes      | Spot payload (identity, radio, extended).                  |

### 2.2. Fields inside spot

| Field      | Type   | Required | Description                                       |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `identity` | object | Yes      | Communication endpoints and source metadata.      |
| `radio`    | object | Yes      | Core RF information.                              |
| `extended` | object | Yes      | Optional namespaces (empty object allowed).       |

### 2.3. Fields inside spot.identity

| Field | Type   | Required | Description                                                          |
| ----- | ------ | -------- | -------------------------------------------------------------------- |
| `de`  | string | Yes      | Callsign or identifier of the spotter.                               |
| `dx`  | string | Yes      | Callsign of the station being spotted.                               |
| `src` | string | Yes      | Source of the spot: `manual`, `ham2k`, `n1mm`, `rbn`, `skimmer`, ... |

### 2.4. Fields inside spot.radio

| Field     | Type   | Required | Description                                   |
| --------- | ------ | -------- | --------------------------------------------- |
| `freq`    | float  | Yes      | Frequency in MHz (decimal required).          |
| `split`   | float  | No       | Split frequency in MHz (nullable).            |
| `mode`    | string | Yes      | Mode of operation: `CW`, `SSB`, `FT8`, etc.   |
| `de_grid` | loc    | Yes      | Maidenhead grid of the DE station (nullable). |

## 3. The `spot.extended` block

The `spot.extended` object provides namespaced optional fields for specialized use cases:

- QSO: typical data exchanged in a traditional QSO.
- Contest: contest-specific metadata (CQ WW, ARRL DX, others).
- RBN: Reverse Beacon Network information.
- Bird: Satellite (“bird”) information.
- Activations: POTA, SOTA, IOTA, BOTA, WWFF, etc...

Any combination of these recognized blocks is allowed. Other blocks are allowed as well, but should be injected by logbook developers. RCLDX will not tamper with them, and will only forward them ephemerally.

### 3.1 Extended → QSO

The block `qso` is meant to carry on the typical exchanges in SSB, CW or Digi. It is controlled the type of data the carry out (integers) but it's not enforced the length to provide space for developers to adapt their software to real life exchanges. In that sense, RCLDX cluster is aware certain activations require a specific exchange, thus why the `activations` block has been defined apart of this one. See more details in `activations` block below.

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
      "freq": 14005.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },

    "extended": {
      "qso": {
        "rst_s": 59,
        "rst_r": 59,
        "msg": "thanks for qso. 73"
      }
    }

  }
}
```

Fields:

| Field     | Type   | Required | Description                         |
| --------- | ------ | ---------| ----------------------------------- |
| `rst_s`   | int    | No       | RST (radio, signal, tone) sent.     |
| `rst_r`   | int    | No       | RST (radio, signal, tone) received. |
| `msg`     | string | No       | Short free-text message (nullable). |

Full example:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
    
    "identity": {
      "de": "ea1het",
      "dx": "k3lr",
      "src": "ham2k"
    },
    
    "radio": {
      "freq": 14210.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },

    "extended": {
      "qso": {
        "rst_s": 59,
        "rst_r": 59,
        "msg": "calling cq europe"
      }
    }

  }
}
```

### 3.2 Extended → CONTEST

The `contest` block is defined with the specific purpose to carry out contest related data. RST reports are separated from exchange reports, being the formers integers in nature, while the later strings in nature.

That strategy provides the necessary flexibility to individuals and software developers to carry out information via cluster without mixing the fields they should use.

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
      "mode": "ssb",
      "de_grid": "in73dm"
    },

    "extended": {
      "contest": {
        "name": "cq ww ssb",
        "rst_s": 59,
        "rst_r": 59,
        "xch_s": "123",
        "xch_r": "54",
        "msg": "thank you, 73s"
      }
    }

  }
}
```

Fields:

| Field   | Type   | Required | Description                         |
| ------- | ------ | ---------| ----------------------------------- |
| `name`  | string | Yes(*)   | ADIF-normalized(**) contest name.   |
| `rst_s` | int    | No       | RST (radio, signal, tone) sent.     |
| `rst_r` | int    | No       | RST (radio, signal, tone) received. |
| `xch_s` | string | No       | Context exchange sent.              |
| `xch_r` | string | No       | Context exchange received.          |
| `msg`   | string | No       | Short free-text message (nullable). |

(*) *If the block is to be used, the name becomes compulsory.*.  
(**) ADIF contest names are regularly checked to ensure compliance.

Full example:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "k3lr",
      "src": "ham2k"
    },
    
    "radio": {
      "freq": 14010.0,
      "split": null,
      "mode": "cw",
      "de_grid": "in73dm"
    },
    
    "extended": {
      "contest": {
        "name": "cq ww cw",
        "rst_s": 59,
        "rst_r": 59,
        "xch_s": "14",
        "xch_r": "54",
        "msg": null
      }
    }

  }
}
```

**NOTE**:  
Many contest stations are reluctant to share full contest exchange data because it is considered strategic for multiplier hunting and rate optimization. Making this data public can reveal operating tactics that teams want to keep private during the contest.

In the future, this block can be offered with masked data visible only to the contest team (and potentially the contest organizer), similar in spirit to how some LoTW data is protected. This preserves collaboration within a multi-operator effort while limiting broader disclosure.

### 3.3 Extended → RBN (Reverse Beacon Network)

The Reverse Beacon Network is an independent project in charge of the decodification and publishing of remote stations that operate on CW, RTTY, FT4 and FT8 globally. Is is composed of hundreds of listening stations that contribute their time doing SWL in radio to report stations heard all over the globe, server as empiric listeners of the radio operations worldwide.

Fortunately or unfortunately, the project is based upon operational modes that can be analyzed and interpreted, leaving SSB aside.

Depending on the operational mode (CW, RTTY, FT4 or FT8) the potential spot might incorporate more or less information, and for that reaon the fields in this block are flexible. In that sense, it is necesary to mention that RCLDX cluster understands that if at some point some data it's not properly populated it's due to a problem with the data source, not a RCLDX glitch.

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {

    "identity": {
      "de": "rbn-skimmer-123",
      "dx": "ea1het",
      "src": "rbn"
    },
    
    "radio": {
      "freq": 14074.67,
      "split": null,
      "mode": "rtty",
      "de_grid": null
    },
    
    "extended": {
      "rbn": {
        "snr_db": 12,
        "rst_s": null,
        "rst_r": null,
        "wpm": 21,
        "bps": null,
        "grid": "in55em"
      }
    }

  }
}
```

Fields:

| Field    | Type | Required | Description                                    |
| -------- | ---- | ---------|----------------------------------------------- |
| `snr_db` | int  | No       | Signal-to-noise ratio reported by the skimmer. |
| `rst_s`  | int  | No       | RST (radio, signal, tone) sent.                |
| `rst_r`  | int  | No       | RST (radio, signal, tone) received.            |
| `wpm`    | int  | No       | CW words per minute of speed.                  |
| `bps`    | int  | No       | RTTY bits per second.                          |
| `grid`   | loc  | No       | Maidenhead grid of the receiving skimmer.      |

Full example:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {

    "identity": {
      "de": "rbn-skimmer-123",
      "dx": "ea1het",
      "src": "rbn"
    },
    
    "radio": {
      "freq": 14074.67,
      "split": null,
      "mode": "rtty",
      "de_grid": null
    },

    "extended": {
      "rbn": {
        "snr_db": 19,
        "rst_s": null,
        "rst_r": null,
        "wpm": null,
        "bps": 45,
        "grid": "in55em"
      }
    }

  }
}
```

### 3.4 Extended → BIRD (satellite)

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "dl3xyz",
      "src": "manual"
    },

    "radio": {
      "freq": 145950.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },
    
    "extended": {
      "bird": {
        "name": "ao-7",
        "grid_s": "in55",
        "grid_r": "in89"
      }
    }
  
  }
}
```

Fields:  

| Field     | Description                         |
| --------- | ----------------------------------- |
| `name`    | Satellite (“bird”) name.            |
| `grid_s`  | Grid of the transmitting station.   |
| `grid_r`  | Grid of the receiving station.      |
| `msg`     | Short free-text message (nullable). |

Full example:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
  
    "identity": {
      "de": "ea1het",
      "dx": "dl3xyz",
      "src": "manual"
    },
    
    "radio": {
      "freq": 145950.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },

    "extended": {
      "bird": {
        "name": "ao-7",
        "grid_s": "in73",
        "grid_r": "jo31",
        "msg": "qso via ao-7"
      }
    }

  }
}
```

### 3.5 Extended → ACTIVATIONS (POTA/SOTA/IOTA/BOTA)

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {

    "identity": {
      "de": "ea1het",
      "dx": "f4abc",
      "src": "manual"
    },

    "radio": {
      "freq": 14244.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },

    "extended": {
      "activations": [
        { "program": "pota", "ref": "eu-123" },
        { "program": "sota", "ref": "ea1/at-001" },
        { "program": "iota", "ref": "af-001" },
        { "program": "bota", "ref": "b/ea-0001" }
      ]
    }

  }
}
```

Fields:  

| Field     | Description                                         |
| --------- | --------------------------------------------------- |
| `program` | Activation program (POTA, SOTA, IOTA, BOTA, WWFF…). |
| `ref`     | Official program reference.                         |
| `msg`     | Short free-text message (nullable).                 |

Full example:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
    
    "identity": {
      "de": "ea1het",
      "dx": "f4abc",
      "src": "manual"
    },
    
    "radio": {
      "freq": 14244.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },
    
    "extended": {
      "activations": [
        { "program": "pota", "ref": "ea-1234", "msg": "portable activation" }
      ]
    }
  
  }
}
```

## 4. Additional DX spot examples

### 4.1 Simple spot (no extensions)

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
  
    "identity": {
      "de": "ea1het",
      "dx": "dl0xyz",
      "src": "manual"
    },
  
    "radio": {
      "freq": 7144.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },
  
    "extended": { }
  
  }
}
```

### 4.2 Combined RBN + activation

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
  
    "identity": {
      "de": "rbn-skimmer-55",
      "dx": "ea1het",
      "src": "rbn"
    },
  
    "radio": {
      "freq": 14018.0,
      "split": null,
      "mode": "cw",
      "de_grid": null
    },
  
    "extended": {
      "rbn": { "snr_db": 32, "grid": "io91" },
      "activations": [
        { "program": "sota", "ref": "ea1/cr-001" }
      ]
    }
  
  }
}
```

### 4.3 Satellite + POTA activation

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
  
    "identity": {
      "de": "ea1het",
      "dx": "k2abc",
      "src": "manual"
    },
  
    "radio": {
      "freq": 435250.0,
      "split": null,
      "mode": "fm",
      "de_grid": "in73dm"
    },
  
    "extended": {
      "bird": { "name": "ao-91", "msg": "ao-91 pass" },
      "activations": [
        { "program": "pota", "ref": "ea-5678", "msg": "ao-91 + pota activation" }
      ]
    }
  
  }
}
```

## 5. Validation rules

1. `id7`, `hid`, `sid` and `event_type` must exist at the top level on normalized outputs. They are introduced by the system, not the developers.
1. `event_type` must be one of: `spot_add`, `spot_patch`, `spot_dele`.
1. `spot.extended` must exist (empty object allowed).
1. `spot.radio.de_grid` must always be present (nullable).
1. `spot.radio.freq` must always be a decimal MHz float.
1. Namespaces inside `spot`.`extended` must not collide in name.
1. `spot.extended.activations` must be an array.
1. Unknown namespaces in `spot.extended` are allowed (forward-compatible).

## 6. Forward compatibility

This schema is explicitly designed for future expansion:

- new digital modes,
- new spot sources (wspr, pskreporter, LoRa, MSK, OQRS),
- new activation programs,
- new propagation/telemetry extensions (e.g., atmospheric ducting, EME, meteor scatter).

Any new extension simply adds another namespace under `spot.extended`, without breaking existing clients.
