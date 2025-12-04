# Filtering and blacklist

Last updated: **2025-12-04**  
RCLDX Protocol: **v1-beta**

---

This document defines how the RCLDX Cluster processes, validates, filters, accepts, rejects, or routes incoming MQTT messages.

It covers two tightly related components:

- Blacklist Engine – Hard rejection of abusive, forbidden, or malicious content.
- Filtering Rules – Routing- and logic-based decisions about where messages are allowed to flow.

These two layers form the core safety and message-hygiene system of the RCLDX Cluster.

## 1. Message Processing Pipeline

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
5. Forwarding to output/{spot,chat,wx,data,sat,system}
```

Key principle

The Blacklist Engine always runs before the Filtering Rules.

- If the blacklist blocks the message:
- It is discarded immediately
- It is never forwarded
- It does not reach the Core

A metric counter is incremented for observability.


## 2. Blacklist engine

The Blacklist Engine enforces cluster-wide safety, preventing:

- abuse,
- impersonation,
- profanity,
- spam,
- malicious actors,
- bots hiding behind user identities.

It uses three independent Redis-backed blacklist types, all evaluated at runtime.

### 2.1. Blacklist types
#### 2.1.1 Callsign blacklist

Stored in:
```txt
blacklist:callsigns
```

Characteristics:

- Exact match only
- Case-insensitive
- Matches against:
    - spot.de
    - spot.dx
    - chat.de
    - wx.de
    - satellite.de
    - any other message with a de field

Behavior:
If a callsign appears in a message → drop immediately + log incident.

#### 2.1.2 Forbidden words blacklist

Stored in:
```txt
blacklist:words
```

Characteristics:

- Exact word match only
- No regex
- Extracted from common profanity or cluster-defined prohibited terms
- Matches against all human text fields:
    - radio.comment
    - chat.msg.comment
    - system.comment
    - wx.ground.* free-text
    - extended.*.info
- Example matches:
    - "idiot"
    - "hate"
    - "racist"

If found → drop.

#### 2.1.3 Pattern blacklist (wildcard syntax)

Stored in:
```txt
blacklist:patterns
```

This engine uses a custom wildcard language defined at RCLDX project level.

Supported:

- * → matches any number of characters
- ? → matches exactly one character

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

- message dropped,
- metrics incremented,
- optional trust score reduction (if enabled).


### 2.2. Advanced Behavior
#### 2.2.1 Permanent bans

Node operators may permanently block:

- callsigns,
- full prefixes (via patterns),
- repeated offenders.

#### 2.2.2 Abuse detection

If a regular user attempts to masquerade as a broker using user credentials, the system can:

- set trust-level to 0,
- permanently disable injection rights,
- notify the Core.

#### 2.2.3 Grandfathering

A future extension allows:
- Each user to require two “grandparents” (community validators).
- If validators revoke trust, the user:
    - may still read spots,
    - but cannot send spots.

Blacklist Engine integrates with such trust logic.


## 3. Filtering rules

Filtering Rules do not deal with abuse; they decide where messages may flow.

Examples of filtering logic:

- drop spots outside amateur radio bands
- drop invalid modes or frequencies
- block weather broadcasts from untrusted nodes
- avoid forwarding private club data to the global Core
- only forward satellites to specific topics

Filtering Rules are implemented as routing logic at both:

- Club Layer
- Core Layer

These filters ensure network hygiene and reduce noise.

### 3.1. Structural filters
#### 3.1.1 Message type Filters

Club or core nodes may allow/deny:

- spot
- chat
- wx
- satellite
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

- amateur radio ITU band boundaries,
- exclusion of 27 MHz (CB), PMR, GMRS, FRS,
- ignoring “junk” scanner data.

Example rule:
```python
If spot.radio.freq < 1.8 MHz or > 148 MHz:
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

Filtering Rules determine where the message ends up:

Routing Matrix Example
| Input Topic    | Allowed Output Topics        |
| -------------- | ---------------------------- |
| `input/spot`   | `output/spot`, `output/data` |
| `input/chat`   | `output/chat`                |
| `input/wx`     | `output/wx`, `output/data`   |
| `input/sat`    | `output/sat`, `output/data`  |
| `input/system` | `output/system`              |

Filtering Rules implement this logic.

## 4. Combined example: End-to-End flow

Consider the following spot:
```json
{
  "spot": {
    "de": "EA1HET",
    "dx": "DL1ABC",
    "src": "manual",
    "radio": {
      "freq": 14250.0,
      "mode": "SSB",
      "band": "20m",
      "comment": "CQ DX"
    }
  },
  "extended": {}
}
```

Pipeline:

- JSON valid? Yes
- Normalized? Yes
- Blacklist check
    - Callsign not blacklisted
    - Comment clean
    - No pattern matches
- Filtering Rules
    - Frequency in valid band
    - Mode allowed
    - Type=spot supported
Forward
    - output/spot
    - output/data

Everything passes.

## 5. Why the systems are s but combined in documentation

Although the Blacklist Engine and Filtering Rules are distinct:

- The Blacklist Engine protects the cluster from abusive content.
- Filtering Rules protect the cluster from irrelevant or low-quality content.

Having them in the same article makes sense because:

- They form a single coherent ingress processing pipeline.
- Implementations reference one another.
- Users and developers should think of them together.