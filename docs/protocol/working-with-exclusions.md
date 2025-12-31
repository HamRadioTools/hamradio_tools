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
spot/filter/{src_region}/{dst_region}/{band}/{mode_norm}/{submode}
```

Example topic:

```txt
spot/filter/eu/na/20m/ssb/lsb
```

This path is useful for broad, inclusive filters like:

- "Only EU to NA"
- "Only 20m FT8"
- "Only CW on any band"

It is not suitable for exclusions like "all regions except EU".

## 3. spot/route topics (client-side filtering)

Topic structure:

```txt
spot/route/#
```

Example spot payload (with `route` block):

```json
{
  "route": {
    "ts_ingest": 1734871532,
    "t_bucket_10m": 1734871200,
    "freq_bucket_hz": 14005000,
    "de_cont": "na",
    "dx_cont": "eu",
    "band": "20m",
    "mode": "digi",
    "submode": "ft8"
  }
}
```

Recommended client-side filter examples:

- Exclude a source region:
  - drop if `route.de_cont == "eu"`
- Exclude a destination region:
  - drop if `route.dx_cont == "eu"`
- Multiple exclusions:
  - drop if `route.de_cont in {"eu", "as"}`
- Keep only a band/mode:
  - keep if `route.band == "20m"` and `route.mode == "digi"`

## 4. Recommendation

As a general rule:

- Use `spot/filter/...` for simple, inclusive broker-side filters.
- Use `spot/route/...` for any exclusion or complex filtering logic.

This approach keeps the broker neutral (no user preference data required) while still enabling very specific, per-user filtering in client applications.
