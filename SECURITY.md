# Security policy

This repository is a personal site, but it is built like production software: dependencies,
actions and images are pinned and scanned, images are signed, and the network policies are
tested on a real cluster. If you find a weakness anyway, I want to hear about it.

## Reporting a vulnerability

Please email **guerd.nawal@gmail.com** with "security" in the subject, or open a
[private security advisory](https://github.com/louane20/portfolio/security/advisories/new).
Do not open a public issue for an unfixed problem.

You can expect an acknowledgement within a few days. The machine-readable contact is published
at `/.well-known/security.txt` (RFC 9116) and is regenerated on every build.

## Scope

- The site and its build (`content/`, `src/`, `scripts/`)
- The container image `ghcr.io/louane20/portfolio`
- The CI/CD workflows in `.github/`
- The Kubernetes and Cilium manifests in `deploy/`
