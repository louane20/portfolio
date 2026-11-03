---
title: GitOps across multiple datacenters with Argo CD
date: 2024-12-10
category: delivery
cover: gitops
draft: true
summary: >-
  Patterns for keeping several clusters, several datacenters and one source of truth in
  agreement, without a 2 a.m. reconciliation surprise.
tags: [delivery, gitops, argo-cd]
---

Draft: not published (draft: true). Remove that line once the article is written.

## Outline

- One repository, several clusters: how the configuration is laid out
- ApplicationSets and per-datacenter overlays
- Promotion between environments, and who is allowed to merge
- Sync waves, health checks and the order things must come up in
- Handling drift and manual hot fixes
- What the dashboards should show after a failover
