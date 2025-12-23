# Filtering and blacklist

Last updated: **2025-12-22**  
Protocol Version: **v1-beta**

---

This document defines how the RCLDX cluster processes, validates, filters, accepts, rejects or routes incoming MQTT messages.

It covers two tightly related components:

- Blacklist Engine – Hard rejection of abusive, forbidden or malicious content.
- Filtering Rules (the outing) and logic-based decisions about where messages are allowed to flow.

These two layers form the core safety and message-hygiene system of the RCLDX cluster.

## 1. Message processing pipeline

### 1.1 Inbound flow

All inbound messages pass through the following ordered pipeline:

```txt
Inbound MQTT Message
       │
       ▼
1. Basic JSON validation  
       │
2. Message normalization
       │
3. Blacklist Engine  ← Hard drop (no forwarding)
       │
4. Filtering Rules   ← Routing decisions
       │
5. Forwarding to output/{spot,chat,wx,system}
```

### 1.2 Key principle(s)

The blacklist engine always runs before the filtering rules. If the blacklist blocks the message:

- It is discarded immediately.
- It is never forwarded.
- It does not reach the core broker topics.

A metric counter is incremented for observability.

## 2. Blacklist engine

The blacklist engine enforces cluster-wide safety, preventing:

- abuse.
- impersonation.
- profanity.
- spam.
- malicious actors.
- bots hiding behind user identities.

It uses three independent cache-backed blacklist types, all evaluated at runtime.

### 2.1. Blacklist types

#### 2.1.1 Callsign blacklist

Stored in:

```txt
blacklist:callsigns
```

Characteristics:

- Exact match only.
- Case-insensitive.
- Matches against:
  - `spot.identity.de`.
  - `spot.identity.dx`.
  - `chat.de`.
  - `wx.de`.
  - any other message with a `de` field.

Behavior: if a callsign appears in a message → drop immediately + log incident.

#### 2.1.2 Forbidden words blacklist

Stored in:

```txt
blacklist:word(s)
```

Characteristics:

- Exact word match only.
- No regex.
- Extracted from common profanity or cluster-defined prohibited terms.
- Matches against all human text fields:
  - `spot.extended.qso.comment`.
  - `chat.msg`.
  - `system.msg`.
  - `wx.*`.
- Example matches:
  - "idiot".
  - "hate".
  - "racist".

If found → drop.

#### 2.1.3 Pattern blacklist (wildcard syntax)

Stored in:

```txt
blacklist:patterns
```

This engine uses a custom wildcard language defined at RCLDX project level.

Supported:

- \* → matches any number of characters.
- ? → matches exactly one character.

Boundaries:

- Only matches whole tokens, not inside words.
- Tokens are separated by whitespace.

Examples:  

| Pattern     | Matches                   | Does Not Match |
| ----------- | ------------------------- | -------------- |
| `EA?HET`    | EA1HET                    | EA10HET        |
| `*cluster*` | cluster-hf, rcldx-cluster | superclustered |
| `CQ*TEST`   | CQ TEST, CQ WW TEST       | myCQ123TEST    |

A match results in:

- message dropped.
- metrics incremented.
- optional, trust score reduction.

### 2.2. Advanced Behavior

#### 2.2.1 Permanent bans

Node operators may permanently block:

- callsigns
- full prefixes (via patterns)
- repeated offenders

#### 2.2.2 Abuse detection

If a regular user attempts to masquerade as a broker using regular user credentials, the cluster will:

- set trust-level to 0 (the grandfathering)
- temporarily or permanently disable login rights.
- notify the Core team.

#### 2.2.3 Grandfathering

By default, users enter RCLDX wit no grandfathers, allowing read-only operation. In orer to post spot and become fulluy active each user should grab 2 granfather votes. Grandfathers act like community validators. If validators revoke trust, the user:

- may still read spots ...
- ... but cannot send spots.

Blacklist engine integrates with such trust logic.

## 3. Filtering rules

Filtering rules do not deal with abuse; they decide where messages may flow.

Examples of filtering logic:

- drop spots outside amateur radio bands.
- drop invalid modes or frequencies.
- block weather broadcasts from untrusted and/or unknown nodes.
- avoid forwarding private club data to the global core.

Filtering Rules are implemented as routing logic at core layer only. Clubs are open to implement similar control mechanism and if clubs require support RCLDX Core team will support the clubs. These filters ensure network hygiene and reduce noise.

### 3.1. Structural filters

#### 3.1.1 Message type Filters

Both clubs and/or core nodes may allow/deny:

- spot
- chat
- wx
- system

Example:

```txt
Chat messages allowed:
  input/chat → output/chat

Chat messages not forwarded to:
  output/data
```

#### 3.1.2 Band and frequency filters

The cluster may enforce:

- amateur radio ITU band boundaries
- exclusion of 27 MHz (CB), PMR, GMRS, FRS, etc...
- ignoring “junk” scanner data

Example rule:

```python
if `spot.radio.freq` < 1.8 MHz or > 148 MHz:
    drop
```

#### 3.1.3 Mode filters

Example allowed list:

```txt
CW, SSB, FM, AM, FT8, FT4, RTTY
```

Everything else is ignored unless whitelisted.

### 3.2. Source filters

Examples:

- Only allow weather from:

```txt
TRUSTED_WEATHER_NODES = [ "NOAA", "W5MMW" ]
```

- Only allow contest spots from trusted contest loggers.
- Only allow TLE broadcasts from official nodes.

This prevents rogue nodes from injecting fake meteor data or bogus TLE packets.

### 3.3. Topic-based routing

Filtering rules determine where the message ends up. An example routing matrix follows:

| Input topic    | Designated output topics     |
| -------------- | ---------------------------- |
| `spot/input`   | `spot/output`, `spot/data`   |
| `chat/input`   | `chat/output`                |
| `wx/input`     | `wx/output`                  |
| `sat/input`    | `sat/output`                 |
| `sys/input`.   | `sys/output`                 |

Filtering rules implement this logic.

## 4. Combined example: End-to-End flow

Consider the following spot:

```json
{
  "id7": "019b45eb-97dd-777a-bfbf-581b8fc92c80",
  "hid": "f2b2b2f8...",
  "sid": "b8b4f9a1...",
  "event_type": "spot_add",
  "spot": {
    "identity": {
      "de": "ea1het",
      "dx": "dl1abc",
      "src": "manual"
    },
    "radio": {
      "freq": 14250.0,
      "split": null,
      "mode": "ssb",
      "de_grid": "in73dm"
    },
    "extended": {
      "qso": {
        "comment": "cq dx"
      }
    }
  }
}
```

Pipeline:

- JSON valid? Yes
- Normalized? Yes
- Blacklist check
  - Callsign not blacklisted
  - Comment clean
  - No pattern matches
- Filtering rules
  - Frequency in valid band
  - Mode allowed
  - Type=spot supported
Forward
  - spot/output
  - output/data

Everything passes.

## 5. Why the systems operate that way?

Although the blacklist engine and filtering rules are distinct:

- The blacklist engine protects the cluster from abusive content.
- Filtering rules protect the cluster from irrelevant or low-quality content.

Having them in the base design makes sense because:

- They form a single coherent ingress processing pipeline.
- Implementations reference one another.
- Users and developers should think of them together.
