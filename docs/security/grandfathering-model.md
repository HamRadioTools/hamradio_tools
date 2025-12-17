# Grandfathering security model

RCLDX uses a social trust model inspired by the idea of 'grandfathering' in tight communities.

## Concept

Every active user with the ability to publish spots must be 'sponsored' by at least two existing and well trusted users (their grandparents).

## Rules

- A user becomes fully active once they have **2 valid sponsors**.
- Sponsors can withdraw their support at any time.
- If a user falls below 2 sponsors, they are automatically downgraded to **read-only**.
- Users that have emited 2 votes will later receive a third one.

Read the [complete architectural design](security/grandfathering-maths.md) of the **Grandfathering Model** in its individual space, [in this article](security/grandfathering-maths.md).

## Benefits

This design:

- Encourages local social control instead of central authority.
- Makes abuse harder to sustain over time.
- Distributes responsibility across the community.
