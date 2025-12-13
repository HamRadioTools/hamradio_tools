# QoS strategy

Choosing MQTT QoS levels is a trade-off between reliability and overhead.

## General approach

DX spots are inherently transient. If a single message is lost, the world does not end. Therefore, QoS 0 or 1 is usually sufficient.

RCLDX cluster tracks QoS usage and discards traffic not carrying the right QoS flag for the right use.

## Special situations

Administrative messages (i.e., control frames, configuration sync) MAY use QoS 2, but these are rather rare.
