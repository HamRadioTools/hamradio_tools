# Redundancy & failover

RCLDX cluster aims for graceful degradation rather than hard real-time guarantees.

## Core redundancy

At least two independent core regions are always deployed and operational to guarantee resilience and continuity of service. Clubs connect to the network through DNS-based upstream configuration rather than hard-coded IPs.

A dedicated global DNS entry, `cluster.hamradio.tools` (also available as `rcldx.hamradio.tools`), automatically selects the most appropriate core region based on geographical proximity, latency and current cluster load. This provides seamless failover and optimal routing without any manual intervention.

For more fine-grained control or regional debugging, RCLDX clusters also exposes regional DNS names:

- `emea.hamradio.tools` (Europe / Middle East / Africa)
- `amer.hamradio.tools` (North / Central / South America)
- `apac.hamradio.tools` (Asia / Pacific)

We strongly discourage connecting directly via IP addresses as they may eventually change. Core nodes may be rotated, replaced or relocated over time, and DNS is the only supported mechanism that guarantees stable and correct routing to the core infrastructure.

## Club redundancy

Large clubs may choose to run multiple MQTT broker instances behind a load balancer or to split traffic by functional domains (HF vs VHF, contest vs everyday). This is upt o the club decision. Rest of the mechanics to connect the core yet apply.

## Failure modes

In case of partial failures:

- If a core region is down, clubs keep operating locally.
- If a club broker fails, clients may reconnect to a backup broker.
- If backend components or filters are degraded, the system may fall back to a safe mode where only a subset of traffic is accepted.

>**NOTE**:  
RCLDX cluster is working on building an status page will be soon put into service indicating the live status of each MQTT broker node, club brokers included.
