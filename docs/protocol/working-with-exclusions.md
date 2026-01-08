# Working with exclusions

Last updated: **2025-12-31**  
Protocol Version: **v1-beta**

---

This document explains how to handle exclusion-style filtering (for example, "everything except EU") without requiring the broker to know client preferences.

MQTT topic filters are inclusive only (`+` and `#`). There is no NOT operator, so exclusions must be handled by the client application using fields in the message payload.

## 1. Overview

RCLDX publishes spot messages on two parallel topic families:

- `spot/filter/...` for simple, broker-side topic filtering.
- `spot/route/...` for client-side filtering using the enriched `route` block.

The payloads are the same spot message. The `spot/route` stream includes a fully populated `route` block that app developers can use for precise filters.

## 2. spot/filter topics (inclusive filtering)

Topic structure:

```txt
spot/filter/{src_region}/{dst_region}/{band}/{type}/{mode}
```

Example topic:

```txt
spot/filter/eu/na/20m/ssb/lsb
```

This path is useful for broad, **inclusive** filters like:

- "Only EU to NA"
- "Only 20m FT8"
- "Only CW on any band"

It is **not suitable for exclusions** like "all regions except EU". This is not a limitation of RCLDX, but the protocol beneath, MQTT. So this exclusion should be worked out at the client side.

For the client side to be intelligent enough to work on exclusions, an encriched `route` block is added upon spot arrival and router to a specific topic structure.

## 3. `spot/route` topics (client-side filtering)

Topic structure:

```txt
spot/route/#
```

Example spot payload (with `route` block):

```json
{

  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  
  "event_type": "spot_add",

  "spot": {

    "route": {
      "ts_ingest": 1734871532,
      "t_bucket_10m": 1734871200,
      "freq_bucket_hz": 14005000,
      "de_cont": "na",
      "dx_cont": "eu",
      "band": "20m",
      "type": "digi",
      "mode": "ft8"
    },

    "identity": {
      "de": "ea1het",
      "dx": "dl0xxx",
      "src": "fldigi"
    },
    
    "radio": {
      "freq": 14074.3,
      "split": null,
      "mode": "ft8",
      "de_grid": "in73dm"
    },
    
    "extended": { 
      "qso": {
      "rst_s": 599,
      "rst_r": 599,
      "msg": "CQ Europe"
      }
    }
  
  }  // spot end

}. // topic end
```

Recommended client-side filter examples:

- Exclude a source region:
  - drop if `route.de_cont == "eu"`
- Exclude a destination region:
  - drop if `route.dx_cont == "eu"`
- Multiple exclusions:
  - drop if `route.de_cont in {"eu", "as"}`
- Keep only a band/type:
  - keep if `route.band == "20m"` and `route.type == "digi"`

## 4. Recommendation

As a general rule:

- Use `spot/filter/...` for simple, inclusive broker-side filters.
- Use `spot/route/...` for any exclusion or complex filtering logic.

This approach keeps the broker neutral (no user preference data required) while still enabling very specific, per-user filtering in client applications.
