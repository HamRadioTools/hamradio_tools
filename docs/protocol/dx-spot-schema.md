# DX Spot Schema

This document defines the canonical schema for DX spots in RCLDX.

## Required Fields

- `de` – callsign of the spotter
- `dx` – callsign being spotted
- `freq` – frequency in kHz, integer of 2 decimals
- `band` – normalized band (`160m`, `80m`, `40m`, ...)
- `mode` – operating mode (`SSB`, `CW`, `FT8`, etc...)

`The final list of normalized bands and modes will be provided herein.`

## Optional fields

TBD

## Validation

The filtering engine validates DX spots using a JSON Schema definition. Invalid or malformed spots are rejected and may increment abuse counters.
