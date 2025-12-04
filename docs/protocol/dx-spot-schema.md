# DX Spot Schema

Last updated: **2025-12-04**  
Protocol Version: **v1-beta**

---

This document defines the official DX Spot message format used in the RCLDX MQTT Cluster.

The goal is to define a minimal, stable, easy-to-generate structure while providing unlimited extensibility through the extended block.

## 1. DX Spot Message Structure

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
      "band": "20m",
      "rst_s": "59",
      "rst_r": "54"
    }
  },
  "extended": { }
}
```

### 1.2. Optional block: extended

Holds additional optional information such as contest metadata, RBN data, satellite data, activation references, etc...

```json
"extended": {
  "contest": { ... },
  "rbn": { ... },
  "bird": { ... },
  "activations": [ ... ]
}
``` 

## 2. Specification of the spot Block
### 2.1. Main fields

| Field   | Type   | Required | Description                                                          |
| ------- | ------ | -------- | -------------------------------------------------------------------- |
| `de`    | string | Yes      | Callsign or identifier of the spotter.                               |
| `dx`    | string | Yes      | Callsign of the station being spotted.                               |
| `src`   | string | Yes      | Source of the spot: `manual`, `QLog`, `N1MM`, `rbn`, `skimmer`, etc. |
| `radio` | object | Yes      | Core RF information.                                                 |

### 2.2. Fields inside radio

| Field     | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `freq`    | float  | Yes      | Frequency in MHz (decimal required).                         |
| `mode`    | string | Yes      | Mode of operation: `CW`, `SSB`, `FT8`, `RTTY`, etc.          |
| `band`    | string | Yes      | Amateur band in the `20m`, `40m`, `6m`, `2m`, `70cm` format. |
| `comment` | string | No       | Short free-text comment.                                     |
| `rst_s`   | string | No       | Sent signal report (RST/RS).                                 |
| `rst_r`   | string | No       | Received signal report (RST/RS).                             |

## 3. The extended Block

The extended block provides namespaced optional fields for specialized use cases:

- contest – Contest metadata (CQ WW, ARRL DX, etc.)
- rbn – Reverse Beacon Network information
- bird – Satellite (“bird”) information
- activations – POTA, SOTA, IOTA, BOTA, WWFF, etc.

Any combination is allowed.

### 3.1 Extended → Contest
```json
"extended": {
  "contest": {
    "name": "CQ WW SSB",
    "xch_s": "123",
    "xch_r": "54"
  }
}
```

Fields:

- name → Contest name
- xch_s → Sent contest exchange
- xch_r → Received contest exchange

Full example:
```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "K3LR",
    "src": "N1MM Logger+",
    "radio": {
      "comment": "CQ TEST",
      "freq": 14210.0,
      "mode": "SSB",
      "band": "20m",
      "rst_s": "59",
      "rst_r": "59"
    }
  },
  "extended": {
    "contest": {
      "name": "CQ WW SSB",
      "xch_s": "14",
      "xch_r": "05"
    }
  }
}
```

### 3.2 Extended → RBN (Reverse Beacon Network)
```json
"extended": {
  "rbn": {
    "snr_db": 19,
    "grid": "IN55EM"
  }
}
```

Fields:
| Field    | Type | Description                                    |
| -------- | ---- | ---------------------------------------------- |
| `snr_db` | int  | Signal-to-noise ratio reported by the skimmer. |
| `grid`   | loc  | Maidenhead grid of the receiving skimmer.      |

Full example:
```json
{
  "spot": {
    "de": "RBN-SKIMMER-123",
    "dx": "EA1HET",
    "src": "rbn",
    "radio": {
      "comment": "",
      "freq": 14030.5,
      "mode": "CW",
      "band": "20m"
    }
  },
  "extended": {
    "rbn": {
      "snr_db": 19,
      "grid": "IN55EM"
    }
  }
}
```

### 3.3 Extended → Bird (Satellite)
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
### 3.4 Extended → Activations (POTA/SOTA/IOTA/BOTA)
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

## 4. Additional DX Spot Examples
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

### 4.2 Combined RBN + Activation
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

### 4.3 Satellite + POTA Activation
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

## 5. Validation Rules

1. If spot exists, extended must exist (empty object allowed).
1. freq must always be a decimal MHz float.
1. band must follow the "20m", "40m", "2m", "70cm" format.
1. Namespaces inside extended must not collide:  
  ❌ contest twice  
  ✔️ contest + bird + activations together
1. extended.activations must be an array.
1. Unknown namespaces in extended are allowed (forward-compatible).


## 6. Forward Compatibility

This schema is explicitly designed for future expansion:

- new digital modes,
- new spot sources (wspr, pskreporter, LoRa, MSK, OQRS),
- new activation programs,
- new propagation/telemetry extensions (e.g., atmospheric ducting, EME, meteor scatter).

A new extension simply adds another namespace under extended, without breaking existing clients.