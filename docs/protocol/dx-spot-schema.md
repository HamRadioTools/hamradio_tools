# DX spot schema

Last updated: **2025-12-12**  
Protocol Version: **v1-beta**

---

This document defines the official DX Spot message format used in the RCLDX MQTT Cluster.

The goal is to define a minimal, stable, easy-to-generate structure while providing unlimited extensibility through the extended block.

## 1. DX Spot message structure

A DX spot message always consists of two blocks:

### 1.1. Required block: spot

Contains all core radio information required to describe a DX spot:

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "DL0XXX",
    "src": "manual",
    "radio": {
      "comment": "CQ DX",
      "freq": 14205.0,
      "mode": "CW",
      "band": "20m"
    }
  },
  "extended": { }
}
```

### 1.2. Optional block: `extended`

Holds additional optional information such as contest metadata, RBN data, satellite data, activation references, etc...

```json
"extended": {
  "qso": { ... },
  "contest": { ... },
  "rbn": { ... },
  "bird": { ... },
  "activations": [ ... ]
}
```

The concept, which is yet pending to be put against the cords with  everyday practice, is to introduce an extended data block that can carry additional information beyond the standard spot data.
This extended block would serve two main purposes:

- Allow the RCLDX cluster to automatically recognize common, recurring block types (e.g., `contest`, `rbn`, `bird` for satellite QSOs, `activations` for POTA/SOTA/BOTA/WWFF/Lighthouses, etc...).

- Remain open for third-party use, primarily by logbook developers, so their software can include extra data that is useful specifically for their own programs.

**NOTE**:  
When RCLDX archives historical spot data, it will permanently store the officially recognized blocks (like those listed above), but it will not preserve the custom additional blocks added by third-party logbook software.

In this way, the extended block becomes a simple, standardized “pipe” through the cluster that allows different logging programs to exchange useful extra information between their users without requiring complex individual integrations.Not saving this data is essential for making it ephemeral, which is meant to be a strategic decision.

## 2. Specification of the spot Block

### 2.1. Main fields

| Field   | Type   | Required | Description                                                          |
| ------- | ------ | -------- | -------------------------------------------------------------------- |
| `de`    | string | Yes      | Callsign or identifier of the spotter.                               |
| `dx`    | string | Yes      | Callsign of the station being spotted.                               |
| `src`   | string | Yes      | Source of the spot: `manual`, `QLog`, `N1MM`, `rbn`, `skimmer`, etc. |
| `radio` | object | Yes      | Core RF information.                                                 |

### 2.2. Fields inside radio

| Field     | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `comment` | string | No       | Short free-text comment.                                     |
| `freq`    | float  | Yes      | Frequency in MHz (decimal required).                         |
| `mode`    | string | Yes      | Mode of operation: `CW`, `SSB`, `FT8`, `RTTY`, etc.          |
| `band`    | string | Yes      | Amateur band in the `20m`, `40m`, `6m`, `2m`, `70cm` format. |

## 3. The `extended` block

The extended block provides namespaced optional fields for specialized use cases:

- QSO: typical data exchanged in a traditional QSO.
- Contest: contest-specific metadata (CQ WW, ARRL DX, others).
- RBN: Reverse Beacon Network information.
- Bird: Satellite (“bird”) information.
- Activations: POTA, SOTA, IOTA, BOTA, WWFF, etc...

Any combination of this extended and recognized by RCLDX cluster data blocks are allowed. Other blocks are allowed as well, but should be injected by the logbook deelopers and RCLDX won't tamper with them, just will forward them ephemerally.

### 3.1 Extended → QSO

The block `qso` is meant to carry on the typical exchanges in SSB, CW or Digi. It is controlled the type of data the carry out (integers) but it's not enforced the length to provide space for developers to adapt their software to real life exchanges. In that sense, RCLDX cluster is aware certain activations require a specific exchange, thus why the `activations` block has been defined apart of this one. See more details in `activations` block below.

```json
"extended": {
  "qso": {
    "rst_s": 59,
    "rst_r": 59
  }
}
```

Fields:

| Field    | Type   | Required | Description                         |
| -------- | ------ | ---------| ----------------------------------- |
| `rst_s`  | int    | No       | RST (radio, signal, tone) sent.     |
| `rst_r`  | int    | No       | RST (radio, signal, tone) received. |

Full example:

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "K3LR",
    "src": "SmartLogger",
    "radio": {
      "comment": "Calling CQ Europe",
      "freq": 14210.0,
      "mode": "SSB",
      "band": "20m",
    }
  },
  "extended": {
    "qso": {
      "rst_s": 59,
      "rst_r": 59
    }
  }
}
```

### 3.2 Extended → CONTEST

The `contest` block is defined with the specific purpose to carry out contest related data. RST reports are separated from exchange reports, being the formers integers in nature, while the later strings in nature.

That strategy provides the necessary flexibility to individuals and software developers to carry out information via cluster without mixing the fields they should use.

```json
"extended": {
  "contest": {
    "name": "CQ WW SSB",
    "rst_s": 59,
    "rst_r": 59,
    "xch_s": "123",
    "xch_r": "54"
  }
}
```

Fields:

| Field    | Type   | Required | Description                         |
| -------- | ------ | ---------| ----------------------------------- |
| `name`   | string | Yes(*)   | ADIF-normalized(**) contest name.       |
| `rst_s`  | int    | No       | RST (radio, signal, tone) sent.     |
| `rst_r`  | int    | No       | RST (radio, signal, tone) received. |
| `xch_s`  | string | No       | Context exchange sent.              |
| `xch_r`  | string | No       | Context exchange received.          |

(*) *If the block is to be used, the name becomes compulsory.*.  
(**) ADIF contest names are regularly checked to ensure compliance.

Full example:

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "K3LR",
    "src": "N1MM",
    "radio": {
      "comment": "CQ TEST K3LR TEST",
      "freq": 14010.0,
      "mode": "CW",
      "band": "20m",
    }
  },
  "extended": {
    "contest": {
      "name": "CQ WW CW",
      "rst_s": 59,
      "rst_r": 59,
      "xch_s": "14",
      "xch_r": "54"
    }
  }
}
```

### 3.3 Extended → RBN (Reverse Beacon Network)

The Reverse Beacon Network is an independent project in charge of the decodification and publishing of remote stations that operate on CW, RTTY, FT4 and FT8 globally. Is is composed of hundreds of listening stations that contribute their time doing SWL in radio to report stations heard all over the globe, server as empiric listeners of the radio operations worldwide.

Fortunately or unfortunately, the project is based upon operational modes that can be analyzed and interpreted, leaving SSB aside.

Depending on the operational mode (CW, RTTY, FT4 or FT8) the potential spot might incorporate more or less information, and for that reaon the fields in this block are flexible. In that sense, it is necesary to mention that RCLDX cluster understands that if at some point some data it's not properly populated it's due to a problem with the data source, not a RCLDX glitch.

```json
"extended": {
  "rbn": {
    "snr_db": 12,
    "rst_s": null,
    "rst_r": null,
    "wpm": 21,
    "bps": null,
    "grid": "IN55EM"
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
  "spot": {
    "de": "RBN-SKIMMER-123",
    "dx": "EA1HET",
    "src": "rbn",
    "radio": {
      "comment": "",
      "freq": 14074.67,
      "mode": "RTTY",
      "band": "20m"
    }
  },
  "extended": {
    "rbn": {
      "snr_db": 19,
      "rst_s": null,
      "rst_r": null,
      "wpm": null,
      "bps": 45,
      "grid": "IN55EM"
    }
  }
}
```

### 3.4 Extended → BIRD (satellite)

```json
"extended": {
  "bird": {
    "name": "AO-7",
    "grid_s": "IN55",
    "grid_r": "IN89"
  }
}
```

Fields:  

| Field    | Description                       |
| -------- | --------------------------------- |
| `name`   | Satellite (“bird”) name.          |
| `grid_s` | Grid of the transmitting station. |
| `grid_r` | Grid of the receiving station.    |

Full example:

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "DL3XYZ",
    "src": "manual",
    "radio": {
      "comment": "QSO via AO-7",
      "freq": 145950.0,
      "mode": "SSB",
      "band": "2m",
      "rst_s": "59",
      "rst_r": "59"
    }
  },
  "extended": {
    "bird": {
      "name": "AO-7",
      "grid_s": "IN73",
      "grid_r": "JO31"
    }
  }
}
```

### 3.5 Extended → ACTIVATIONS (POTA/SOTA/IOTA/BOTA)

```json
"extended": {
  "activations": [
    { "program": "POTA", "ref": "EU-123" },
    { "program": "SOTA", "ref": "EA1/AT-001" },
    { "program": "IOTA", "ref": "AF-001" },
    { "program": "BOTA", "ref": "B/EA-0001" }
  ]
}
```

Fields:  

| Field     | Description                                         |
| --------- | --------------------------------------------------- |
| `program` | Activation program (POTA, SOTA, IOTA, BOTA, WWFF…). |
| `ref`     | Official program reference.                         |

Full example:

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "F4ABC",
    "src": "manual",
    "radio": {
      "comment": "Portable activation",
      "freq": 14244.0,
      "mode": "SSB",
      "band": "20m"
    }
  },
  "extended": {
    "activations": [
      { "program": "POTA", "ref": "EA-1234" }
    ]
  }
}
```

## 4. Additional DX spot examples

### 4.1 Simple spot (no extensions)

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "DL0XYZ",
    "src": "manual",
    "radio": {
      "comment": "Good signal",
      "freq": 7144.0,
      "mode": "SSB",
      "band": "40m"
    }
  },
  "extended": { }
}
```

### 4.2 Combined RBN + activation

```json
{
  "spot": {
    "de": "RBN-SKIMMER-55",
    "dx": "EA1HET",
    "src": "rbn",
    "radio": {
      "freq": 14018.0,
      "mode": "CW",
      "band": "20m"
    }
  },
  "extended": {
    "rbn": { "snr_db": 32, "grid": "IO91" },
    "activations": [
      { "program": "SOTA", "ref": "EA1/CR-001" }
    ]
  }
}
```

### 4.3 Satellite + POTA activation

```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "K2ABC",
    "src": "manual",
    "radio": {
      "comment": "AO-91 + POTA activation",
      "freq": 435250.0,
      "mode": "FM",
      "band": "70cm"
    }
  },
  "extended": {
    "bird": { "name": "AO-91" },
    "activations": [
      { "program": "POTA", "ref": "EA-5678" }
    ]
  }
}
```

## 5. Validation rules

1. If spot exists, extended must exist (empty object allowed).
1. freq must always be a decimal MHz float.
1. band must follow the "20m", "40m", "2m", "70cm" format.
1. Namespaces inside extended must not collide:  

   - contest twice
   - contest + bird + activations together

1. extended.activations must be an array.
1. Unknown namespaces in extended are allowed (forward-compatible).

## 6. Forward compatibility

This schema is explicitly designed for future expansion:

- new digital modes,
- new spot sources (wspr, pskreporter, LoRa, MSK, OQRS),
- new activation programs,
- new propagation/telemetry extensions (e.g., atmospheric ducting, EME, meteor scatter).

A new extension simply adds another namespace under extended, without breaking existing clients.
