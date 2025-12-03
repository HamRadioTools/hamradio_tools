# FAQ

Frequently asked questions about RCLDX.

## 1. Is RCLDX a replacement for classic DX clusters?

It is an alternative architecture. Some deployments may coexist or bridge to legacy systems for some time.

## 2. Do I need to be an expert in MQTT?

No, but understanding MQTT helps. Clubs can rely on reference configs and tooling already provided by RCLDX.

## 3. Can I run my own private RCLDX instance?

Yes. The architecture is designed to be fully forkable and adaptable, so you are welcome to run your own private or experimental RCLDX deployment.

However, participation in the global RCLDX network is only possible through club brokers, not individual stations.
If your node is not registered as a club broker, you will still be able to receive spots and other publicly distributed data, but you will not be able to inject data into the global system.

RCLDX carefully tracks how data is injected into the network. We maintain a strict distinction between a regular user and a broker, and we actively monitor for any attempt to use regular user credentials to disguise broker-level activity.
Such behavior is treated as a severe violation of trust: it will result in a permanent ban, and the grandfathering score of those responsible will be reduced to zero.

Connections to the core brokers are reserved for recognized clubs, and the approval of any club-to-core linkage is determined by the project leadership to ensure the proper evolution, stability, maintenance, and security of the global network.
