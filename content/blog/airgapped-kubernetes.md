---
title: Running Kubernetes behind an air gap
date: 2026-11-03
category: platform
cover: airgap
featured: true
summary: >-
  What changes when production clusters have no route to the internet: a transfer zone, images
  pulled by digest and re-signed, containerd mirrors, GitOps that stays inside, and the chores
  nobody warns you about.
tags: [kubernetes, air-gapped, supply-chain, containerd, gitops]
---

Most Kubernetes documentation starts with `helm repo add` or `kubectl apply -f https://…`. In an air-gapped environment, neither works. The production network has no route to the internet, so every image, chart, binary and package that runs inside came through a door you built, on purpose, and can account for.

That sounds like a constraint, and it is. It is also the best supply-chain discipline I know: when nothing can be fetched at the last minute, everything has to be declared, checked and versioned in advance. This article is how I think about it, from the shape of the network to the chores that only show up a year later.

> [!NOTE]
> "Air-gapped" covers a range. At one end, a physically disconnected network fed by removable media or a data diode. At the other, a production network whose only exit is a tightly filtered proxy. What follows assumes the strict version: no route out, and one controlled way in.

## Three zones, one direction

It helps to draw the network as three zones, with traffic that only ever moves to the right.

```diagram
airgap-zones
```

The **internet** holds what you depend on: public registries such as `registry.k8s.io` and `quay.io`, Helm charts, OS packages, and the vulnerability databases your scanners need.

The **transfer zone** is the only place that talks to the internet. It pulls, checks and packages. Its connection to the inside is one way, whatever its form: removable media, a data diode, or a push that the inside never answers.

The **air-gapped zone** runs production: an internal registry, a Git server, Argo CD, the clusters, and mirrors for OS packages and vulnerability data. None of it can open a connection to the outside. When a pod tries, the packet goes nowhere, and that is the point.

The unit that crosses the gap is a **bundle**: a versioned, reviewed set of images, charts, binaries and checksums for one release of the platform. Thinking in bundles, not in individual images, is what makes the rest manageable.

## Start from a bill of materials

You cannot carry across what you have not listed. So the first artifact of an air-gapped platform is a plain file that names every image the platform needs, with exact versions. kubeadm will print its own share:

```sh
kubeadm config images list --kubernetes-version v1.36.6
```

The rest comes from your charts and manifests: the CNI, the operators, the observability stack, the applications. I keep it as a `skopeo sync` source file, so the list and the tool that executes it are the same thing:

```yaml title="images.yaml"
# One release of the platform. Reviewed in a merge request like any other change.
registry.k8s.io:
  images:
    kube-apiserver: ["v1.36.6"]
    kube-controller-manager: ["v1.36.6"]
    kube-scheduler: ["v1.36.6"]
    # + etcd, coredns and pause: use the exact tags kubeadm prints
quay.io:
  images:
    cilium/cilium: ["v1.19.10"]
    cilium/operator-generic: ["v1.19.10"]
ghcr.io:
  images:
    cloudnative-pg/cloudnative-pg: ["1.30.1"]
```

Images are only part of the bill. The same bundle carries the kubeadm, kubelet and kubectl packages, containerd and its CNI plugins, Helm charts, CLIs such as `helm` and `cilium`, and a snapshot of the vulnerability database. Anything that is not in the bundle does not exist on the inside.

## Pull by digest, verify, re-sign

In the transfer zone, the bundle is assembled with tools that copy images without a container runtime. `skopeo sync` copies every image of the list, for every architecture, into a directory, and records the digests it wrote:

```sh
# Transfer zone: copy the images, all architectures, digests unchanged
skopeo sync --all --preserve-digests --scoped \
  --src yaml --dest dir \
  --digestfile /srv/bundle/digests.txt \
  images.yaml /srv/bundle/images

# Checksums for everything in the bundle, verified again on the other side
cd /srv/bundle && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
```

Three checks happen before anything leaves the transfer zone.

**The digest is the identity.** A tag is a pointer that someone can move; a digest is the hash of the content. Everything downstream, from signatures to the manifests Argo CD applies, refers to digests. Tags that were quietly moved are not a theoretical risk: in March 2026, attackers force-pushed most version tags of a widely used CI scanning action to malicious commits, and every pipeline that referenced a tag ran their code.

**Scan with a fresh database.** The transfer zone has internet access, so its scanner always has today's vulnerability data. A copy of that database also crosses the gap, so the inside can rescan what is already running when new CVEs are published.

**Verify upstream signatures where you can.** Kubernetes signs its release images with Sigstore. Checking a keyless signature relies on Sigstore's public trust material and transparency log, which the transfer zone can reach:

```sh
cosign verify registry.k8s.io/kube-apiserver-amd64:v1.36.6 \
  --certificate-identity krel-trust@k8s-releng-prod.iam.gserviceaccount.com \
  --certificate-oidc-issuer https://accounts.google.com
```

Rather than replicating that trust material inside, the import job signs each verified and scanned digest again with a key of our own. The key exists only in the transfer zone; the clusters trust its public half.

> [!IMPORTANT]
> Verify at the border, enforce inside. Upstream signatures are checked where the internet is reachable. Inside, an admission policy only admits images signed by the import key, so an image that skipped the transfer zone does not run, wherever it came from.

On the inside, the bundle is checked again before anything is pushed:

```sh
sha256sum --check --quiet SHA256SUMS
skopeo sync --all --preserve-digests --src dir --dest docker \
  /srv/bundle/images/registry.k8s.io registry.internal/k8s
```

## Point the nodes at the mirror

There are two ways to make clusters use the internal registry. The first is to rewrite every image reference: kubeadm's `imageRepository`, Helm values, Kustomize image overrides. It works, until an operator starts a pod from an image name compiled into its own code.

The second is to leave manifests alone and teach the container runtime where the bytes really are. containerd reads per-registry configuration from a directory:

```diagram
airgap-pull
```

```toml title="/etc/containerd/config.toml"
version = 3

[plugins."io.containerd.cri.v1.images".registry]
  config_path = "/etc/containerd/certs.d"
```

```toml title="/etc/containerd/certs.d/registry.k8s.io/hosts.toml"
# The internal mirror is the server, so the upstream registry is never contacted.
server = "https://registry.internal/v2/k8s"
override_path = true
capabilities = ["pull", "resolve"]
ca = "/etc/pki/internal/ca.crt"
```

One file per upstream registry, all of them deployed by Ansible with the rest of the node configuration. Setting the mirror as the `server`, rather than as an extra host, matters: with an extra host, containerd falls back to the upstream when the mirror fails, and in an air gap that fallback is a thirty-second timeout per pull instead of a clear error.

> [!TIP]
> Mirroring under the upstream names means the same manifests work in a connected lab and in production. The difference lives in node configuration, where it belongs.

## GitOps without the internet

GitOps fits an air gap naturally, as long as the whole loop stays inside. Argo CD runs in the air-gapped zone and reads from the internal Git server. Helm charts are pulled in the transfer zone and pushed to the internal registry as OCI artifacts, which Argo CD can read like any Helm repository.

What breaks is the assumption that something, somewhere, can be fetched on the fly: a chart dependency that points to a public repository, a sidecar image injected by a webhook, an init container that downloads a binary at start. Those surface at the worst moment, during a rollout. So the merge request does the check instead. Every chart is rendered in CI, and the list of images it produces is compared with the bill of materials:

```sh
# Every image a chart will run, as the cluster will see it
helm template platform charts/platform -f values-production.yaml \
  | grep -E '^\s+image:' | awk '{print $2}' | tr -d '"' | sort -u
```

An image that is not in the bundle fails the pipeline, not the rollout at 2 a.m.

## The chores nobody warns you about

Some problems only appear because nothing outside can quietly fix them for you.

**Time.** There is no public NTP. Run internal time servers and point every node at them: TLS, tokens and logs all depend on clocks that agree.

**Certificates.** Client certificates generated by kubeadm expire after one year. kubeadm renews them during a control plane upgrade, which means a cluster that is never upgraded stops working on its first birthday. Watch the dates:

```sh
kubeadm certs check-expiration
```

> [!WARNING]
> Air-gapped clusters are upgraded less often, precisely because every upgrade is a bundle to carry across. That is exactly when a one-year certificate catches you. Alert on expiry months ahead, not days.

**Vulnerability data ages.** A scanner with a database from three months ago reports a clean image with total confidence. Refresh the mirrored database on a schedule, and alert when it gets old.

**Staging must be as disconnected as production.** A staging cluster that can reach the internet will happily pull the one image you forgot to mirror, and the rollout that passed in staging fails in production. Isolate staging the same way.

**Observability stays home.** No SaaS monitoring, no hosted error tracking. Prometheus, Grafana and Loki run inside, and so do the alerts and their destinations.

## What I would tell myself on day one

1. **Treat the bundle as a release.** Versioned, reviewed in a merge request, reproducible from its bill of materials.
2. **Pull by digest, mirror by digest, deploy by digest.** Tags are for humans.
3. **Verify at the border, enforce inside.** The admission policy is the last line, and the only one that cannot be skipped.
4. **Make staging as isolated as production.** Otherwise it tests a different system.
5. **Monitor what ages.** Certificates, vulnerability data, and how old the newest bundle is.

None of this is specific to air gaps. A connected cluster benefits from every item on that list; an air-gapped one simply does not let you skip any of them.
