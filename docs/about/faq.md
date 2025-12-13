# FAQ

Frequently asked questions about RCLDX.

## 1. Is RCLDX a replacement for classic DX clusters?

Yes, it's an alternative architecture based on a different base  communication protocol. Current deployments coexist or bridge to legacy systems, for some time.

## 2. Do I need to be an expert in MQTT?

No, but understanding MQTT helps.

Clubs can rely on reference configs and tooling already provided by RCLDX cluster team.

Application developers will be required to integrate JSON data format and MQTT protocol in their applications wich, by the way, will provide them a lot of simplicity compared to managing raw telnet sessions.

End users should see no change in the way the operate the tools they use. At most, they should have an enrichful experience by being able to send and recive more data among amateur radio stations in live, like having the 1-to-1, band and general chat, among other features.

## 3. Can I run my own private RCLDX instance?

Yes, with some clarifications.

The architecture is designed to be fully forkable and adaptable, so you are welcome to run your own private or experimental RCLDX deployment. Learning is essential to evolution.

However, participation in the global RCLDX network is only possible through club brokers, not individual stations. If your node is not registered as a club broker, you will still be able to receive spots and other publicly distributed data, but you will not be able to inject data for third-parties into the global system.

RCLDX carefully tracks how data is injected into the network. We maintain a strict distinction between a regular user and a broker, and we actively monitor for any attempt to use regular user credentials to disguise broker-like activity. Such demanor is treated as a severe violation of trust: it will result in a temporal or permanent ban, and the grandfathering score of those responsible will be reduced to zero.

Connections to the core brokers are reserved for recognized clubs, and the approval of any club-to-core linkage is determined by the project leadership (Core team and Admins team) to ensure the proper evolution, stability, maintenance and security of the global network.
