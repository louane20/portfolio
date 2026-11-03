---
title: Zero Trust microsegmentation for cloud-native 5G networks
date: 2025-03-24
category: research
summary: >-
  What Zero Trust means once a 5G core runs as pods, and why the CNI and the service mesh
  have to enforce it together. The idea behind THAALOUB, our IEEE WCNC 2025 paper.
tags: [research, zero-trust, 5g, cilium, istio]
---

A 5G core is no longer a rack of appliances. Since 3GPP Release 15 it is a *service-based
architecture*: the AMF, SMF, AUSF, UDM, NRF and their friends are network functions that call
each other over HTTP/2 APIs. Operators now run them as containers on Kubernetes, next to the
platform tooling that comes with it.

That move brings the agility of cloud-native software, and it also brings its threat model.
Inside a flat cluster network, every pod can open a connection to every other pod. One
compromised network function is enough to start querying subscriber data, registering fake
functions with the NRF, or exfiltrating whatever it can reach.

## Never trust the network, verify every request

Zero Trust, as NIST describes it in SP 800-207, drops the idea of a trusted inside. Every
request is authenticated, authorized and logged on its own merits, using the identity of the
workload rather than its IP address, and with the least privilege that still lets the system
work.

For a 5G core, least privilege has an unusually precise definition: the 3GPP specifications
already say which network function consumes which service operation. The UDM's subscriber data
management service, for example, gives the AMF access and mobility data and gives the SMF
session management data. An SMF that asks for access and mobility data is not doing its job.
It is doing someone else's.

## Why one layer is not enough

Kubernetes offers two natural enforcement points, and each one has blind spots.

**The CNI** sees every packet. With Cilium, policies follow workload identities instead of IPs
and are enforced in eBPF, in the kernel, before a connection is established. It covers every
protocol a 5G core speaks, including the ones that are not HTTP: SCTP between the gNB and the
AMF on N2, or PFCP over UDP between the SMF and the UPF on N4. But a rule that allows the SMF
to reach the UDM on port 443 cannot tell which API operation the SMF calls.

**The service mesh** understands requests. With Istio, every call is wrapped in mutual TLS,
each side proves a cryptographic identity, and authorization rules can match the HTTP method
and path. But the mesh only governs the traffic that goes through its proxies, and it has
nothing to say about UDP or SCTP.

Put together, they cover each other's gaps: the CNI enforces who may open a connection at all,
for every protocol, and the mesh decides which requests are allowed on the connections that
remain.

| Layer | Enforced by | Decides on | Covers |
| --- | --- | --- | --- |
| L3/L4 | Cilium (eBPF) | workload identity, port, protocol | all traffic, including SCTP and UDP |
| L7 | Istio (Envoy) | mTLS identity, HTTP method and path | HTTP/2 service-based interfaces |

## What THAALOUB does

THAALOUB is the framework we proposed at IEEE WCNC 2025. It brings Zero Trust to cloud-native
5G and beyond networks end to end and stays compliant with 3GPP. It combines the service mesh
and the CNI into multi-layered microsegmentation, and it uses **intent-based access control**:
instead of writing hundreds of rules by hand, operators declare which network functions must
talk to which, and the policies for both layers are derived from those intents.

The diagram in the [Research section](../../#figure) of the home page shows the idea on a small
example: a compromised worker and an over-curious frontend, each stopped by the layer that can
see what they are doing.

For the SMF and UDM example above, the two layers look like this:

```yaml
# Layer 1: who may connect to the UDM at all (Cilium, L3/L4)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: udm
  namespace: core5g
spec:
  endpointSelector:
    matchLabels:
      app: udm
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: smf
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
---
# Layer 2: what the SMF may ask the UDM (Istio, mTLS identity + L7)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: udm
  namespace: core5g
spec:
  selector:
    matchLabels:
      app: udm
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/core5g/sa/smf"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["*/sm-data"]
```

In the paper's experiments, this multi-layer approach clearly improved the security posture
while adding minimal latency and resource overhead. The measurements and the full design are
in the paper, which is open access.

## What carries over to any platform

You don't need a 5G core to use these ideas. They are what I apply to ordinary production
clusters too:

1. **Default deny, then allow by identity.** Start every namespace with a policy that selects
   all pods and allows nothing. Never write rules against pod IPs.
2. **Layer the controls.** Let the CNI handle connectivity for every protocol and let the mesh
   or the application handle request-level authorization.
3. **Generate policy from intent.** A list of who must talk to whom is easier to review than a
   pile of YAML, and it can be versioned and tested like code.
4. **Observe the verdicts.** `hubble observe --verdict DROPPED` shows what your policies stop,
   and tells you quickly when they stop something they shouldn't.

*A Multi-Layered Zero Trust Microsegmentation Solution for Cloud-Native 5G & Beyond Networks*,
C. Benzaïd, N. Guerd, N. E. H. Rehouma, K. Zeraoulia and T. Taleb, IEEE WCNC 2025, Milan.
[Read it on Zenodo](https://zenodo.org/records/14699793) or via
[DOI 10.1109/WCNC61545.2025.10978671](https://doi.org/10.1109/WCNC61545.2025.10978671).
