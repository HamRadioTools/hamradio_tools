# Club nodes

Club brokers are the second main entry point for regular users and local gateways.

## Role of club nodes

Clubs are fully sovereign in deciding whether they wish to participate in data capture and distribution.

If they choose to collaborate with the RCLDX cluster initiative, they may operate one or more MQTT brokers to better support their community of users, LoRa (mesh-type) gateways, Telnet bridges and any additional custom tooling they find valuable.

Operating an MQTT broker is entirely optional. However, if a club elects to run one, it implicitly accepts the shared responsibility of maintaining reliable service for both its own users and the core brokers.

RCLDX’s role is that of a facilitator, ensuring that communication and data exchange between core and club servers can occur smoothly and effectively.

Clubs that operate a local broker will need to rely on the RCLDX security and trust mechanisms. This includes accepting that user validation is performed centrally. Because this process is essential to the integrity of the system, it is considered a core function and will not be delegated.

## Upstream relationship

Club nodes maintain persistent connections to one or more core nodes, and only a carefully selected subset of topics is forwarded upstream. This is not a limitation imposed on clubs, but a deliberate design feature of the system.

To avoid any misunderstanding: this selective forwarding is not intended to restrict or interfere with club data. Instead, it ensures the core functionality of RCLDX cluster operates safely, efficiently and predictably across all participating nodes while providing the clubs the freedom to handle additional data in topics that shouln't reach the ham radio community  service.

A good example of this is the potential use of RCLDX cluster to forward mesh related information from LoRa-based deployments, like Meshtastic or MeshCore.

## Local policies

Clubs can implement their own local policies (i.e., local filters, language rules) as long as they still respect global rules when forwarding to the core.
