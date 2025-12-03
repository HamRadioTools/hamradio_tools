# Authorization

Authorization decides *what* an authenticated entity is allowed to do.

## Principles

We apply a least-privilege model: each user or client can only publish or subscribe to a restricted subset of topics.

## Topic-based ACLs

MQTT ACLs are enforced at the broker level. For example:

TBD

## Dynamic policy

Some authorization decisions may depend on runtime context (i.e., current contest, role of the user, abuse flags). A Policy Decision Point (PDP) is used via gRPC or HTTP to support dynamic policing.
