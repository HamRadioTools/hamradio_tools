# Blacklist engine

The blacklist engine is a central component of RCLDX abuse prevention.

## Blacklist types

- Callsign blacklist (exact match)
- Word blacklist (offensive or forbidden words)
- Pattern blacklist (simple wildcard expressions)

## Runtime behaviour

On each message, the engine checks all relevant blacklists. If a rule matches, the message is either dropped or rewritten (i.e., comment redacted).

## Governance

Blacklists are curated directly by the Core Team.  
The ability to appeal exists.
