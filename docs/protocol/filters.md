# Filtering rules

Filters decide what traffic is accepted, transformed, or rejected.

## Filter types

- Structural validation (JSON fields, data types)
- Word-based filters (banned words)
- Pattern-based filters (wildcards, simplified regex)

## Filter pipeline

1. Parse and validate JSON
2. Check blacklist of callsigns
3. Check banned words
4. Check wildcard rules
5. Decide: allow, modify, or drop

## Configuration

Filters are stored in a cache with clear naming conventions and can be modified without restarting brokers.
