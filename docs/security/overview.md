# Security Overview

This section describes the overall security posture of RCLDX.

## Threat model

We assume that some participants may behave maliciously or irresponsibly. We also assume the public Internet is untrusted.

## Security layers

Security is addressed at multiple layers:

- Transport security (TLS / mTLS).
- Data being protected at rest.
- Authentication and authorization.
- Community-based trust ([grandfathering model](security/grandfathering-model.md)).
- Abuse detection and filtering.
- Automation as the source of incident response mechanism.
- Observability.

## During incidents

It would be a paradox thinking incidents will never hapen. When they do happen, the leadership, composed by the Core team and the Admins team, will coordinate internally and externally with clubs operators to minimize the impact and revert back the sooner the posible to normal operations.

## Post-incident actions

RCLDX cluster Core team would be in charge of the RCA (Root Cause Analysis) and reports will be written and timely published for full transparency.

Attribution is the most complex characteristic while studying an attack. However, if attaibution would be feasible, actors will be exposed for the community knowledge.

## Non-goals

RCLDX is not designed to be a perfect anti-abuse fortress. The goal is to make abuse difficult, visible and reversible while keeping participation open.
