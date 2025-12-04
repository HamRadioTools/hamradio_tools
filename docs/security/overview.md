# Security Overview

This section describes the overall security posture of RCLDX.

## Threat model

We assume that some participants may behave maliciously or irresponsibly. We also assume the public Internet is untrusted.

## Security layers

Security is addressed at multiple layers:

- Transport security (TLS / mTLS)
- Authentication and authorization
- Community-based trust (Grandfathering model)
- Abuse detection and filtering

## Non-goals

RCLDX is not designed to be a perfect anti-abuse fortress. The goal is to make abuse difficult, visible and reversible while keeping participation open.
