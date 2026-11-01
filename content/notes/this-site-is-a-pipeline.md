---
title: This portfolio is a pipeline
date: 2026-11-01
category: platform
summary: >-
  How a static portfolio became a small production platform: content as code, tests and
  budgets, a signed container image, and a kind cluster where Cilium has to prove the
  network policies on every change.
tags: [platform, github-actions, supply-chain, cilium, kind]
---

A résumé says "Kubernetes, GitOps, Zero Trust". Anyone can type that. So this site doesn't ask
to be believed: every claim it makes about its own build is checked by a pipeline you can open
and rerun.

## Content is code

Everything you read on the site, in English and in French, comes from one YAML file. A JSON
Schema validates it before anything is built, and a second pass checks the cross-references:
a skill that cites a job that doesn't exist fails the build, exactly like a broken import.

The generator is a few hundred lines of Node with four dependencies. It writes the two language
versions, the field notes, an Atom feed, a sitemap, a `security.txt` that is regenerated on
every build so it never expires, and the page you are reading as a real roff man page:

```sh
curl -sL https://louane20.github.io/portfolio/guerd.1 | man -l -
```

## What runs on every push

| Stage | What it proves |
| --- | --- |
| Lint | ESLint, Stylelint, the content schema, actionlint on the workflows, hadolint on the Dockerfile, yamllint, ShellCheck, kubeconform on the manifests |
| Build | the site builds reproducibly; assets are fingerprinted |
| Test | Playwright drives the real pages in Chromium; axe finds no accessibility violation; HTML is valid; no internal link is broken; `mandoc -T lint` accepts the man page |
| Lighthouse | performance, accessibility, best practices and SEO stay above their budgets |
| Audit | Trivy finds no known vulnerability, secret or misconfiguration worth stopping for |
| Deploy | GitHub Pages, only from `main`, only if everything above passed |

Two more workflows run in parallel. The first builds the multi-architecture container image,
scans it with Trivy, attaches an SBOM, signs it keylessly with cosign and records SLSA build
provenance. The second is the one I like most.

## A cluster that has to say no

The Zero Trust workflow starts a kind cluster with Cilium as the CNI, loads the freshly built
image and deploys the site with the manifests from `deploy/k8s`. The namespace starts from a
default-deny policy, and a `CiliumNetworkPolicy` allows exactly one thing: pods labelled as
the gateway may send `GET` and `HEAD` requests on port 8080.

```yaml
ingress:
  - fromEndpoints:
      - matchLabels:
          k8s:io.kubernetes.pod.namespace: edge
          app.kubernetes.io/name: gateway
    toPorts:
      - ports:
          - port: "8080"
            protocol: TCP
        rules:
          http:
            - method: GET
            - method: HEAD
```

Then the job tries to break in, and fails the build if any attempt succeeds:

| Attempt | Expected |
| --- | --- |
| gateway, `GET /` | 200 |
| gateway, `POST /` | 403, from Cilium's L7 proxy |
| pod in the same namespace as the gateway, without its label | timeout |
| pod in another namespace | timeout |
| the site's own pod calling the internet | timeout |

Only after that does k6 put some load on the service. The drops recorded by Hubble during the
run end up in the job summary, so the evidence sits next to the green check mark.

## Supply chain, taken seriously

Every third-party action is pinned to a full commit SHA, not a tag. This is not paranoia: in
March 2026 almost every version tag of a widely used scanning action was force-pushed to
malicious commits (CVE-2026-33634), and pipelines that referenced tags ran the attacker's code
with their secrets. A SHA cannot be moved. Dependabot keeps the pins up to date, and the
OpenSSF Scorecard keeps me honest about the rest.

Workflows start with read-only permissions and each job asks only for what it needs. The tools
downloaded during the jobs are pinned too, and their checksums are verified before they run.

## Why bother

Because this is the job. The site is small, but the habits are the ones a production platform
needs: declare the intent, verify it automatically, and leave evidence anyone can check. If
you want to see it fail, open a pull request that breaks something.
