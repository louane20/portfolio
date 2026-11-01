---
title: Operating Kubernetes behind an air gap
date: 2025-01-15
category: platform
draft: true
summary: >-
  Lessons from running production clusters with no direct internet access: image mirroring,
  GitOps without a live registry, and the DMZ patterns that make it work.
tags: [platform, kubernetes, air-gapped]
---

Draft: not published (draft: true). Remove that line once the article is written.

## Outline

- Why air-gapped, and what "no direct internet access" really means day to day
- Getting images in: mirroring, signing and promotion through the DMZ
- GitOps without a live registry: what Argo CD needs, and what it must never reach
- Upgrades with kubeadm when every binary has to be carried across
- Observability that stays inside the perimeter
- What I would do differently
