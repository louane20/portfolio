# Nawal Guerd, DevOps Engineer

[![CI/CD](https://github.com/louane20/portfolio/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/louane20/portfolio/actions/workflows/ci-cd.yml)
[![Container image](https://github.com/louane20/portfolio/actions/workflows/container.yml/badge.svg)](https://github.com/louane20/portfolio/actions/workflows/container.yml)
[![Zero Trust e2e](https://github.com/louane20/portfolio/actions/workflows/zero-trust-e2e.yml/badge.svg)](https://github.com/louane20/portfolio/actions/workflows/zero-trust-e2e.yml)
[![CodeQL](https://github.com/louane20/portfolio/actions/workflows/codeql.yml/badge.svg)](https://github.com/louane20/portfolio/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/louane20/portfolio/badge)](https://scorecard.dev/viewer/?uri=github.com/louane20/portfolio)

My portfolio: production Kubernetes, GitOps delivery and Zero Trust network security.
The site is simple to read; the repository behind it is built and shipped like production software.

**Live:** https://louane20.github.io/portfolio/ &nbsp;·&nbsp; **Français :** https://louane20.github.io/portfolio/fr/

## What is in it

- **A professional one-page portfolio** in English and French: profile, expertise (with the tools
  I run in production marked as such), experience, research, projects, education, certifications
  and contact, with a one-click CV download.
- **A research diagram** that explains my IEEE WCNC 2025 paper in three steps: a flat network,
  network policies with Cilium, then a service mesh with Istio, each stopping the attack it can see.
- **Live delivery status.** The featured project reads the latest run of this repository's
  pipeline from the GitHub API.
- Light and dark themes, works without JavaScript, no tracker and no third-party request,
  WCAG 2.2 AA (axe), Lighthouse 100 on performance, accessibility, best practices and SEO.
- For terminal lovers, the same profile as a real man page:
  `curl -sL https://louane20.github.io/portfolio/guerd.1 | man -l -`

## The pipeline

```mermaid
flowchart LR
  push([push / PR]) --> lint[Lint]
  push --> build[Build]
  push --> audit[Audit<br/>Trivy, npm audit]
  build --> test[Test<br/>Playwright + axe<br/>desktop and mobile]
  build --> lh[Lighthouse<br/>budgets]
  lint & test & lh & audit --> deploy[[Deploy<br/>GitHub Pages]]
  push --> image[Container image<br/>scan, smoke test] --> sign[cosign signature<br/>SBOM, SLSA provenance] --> ghcr[(ghcr.io)]
  push --> zt[Zero Trust e2e<br/>kind + Cilium + k6]
  push --> codeql[CodeQL<br/>JS + workflows]
```

| Workflow | What it proves |
| --- | --- |
| [`ci-cd.yml`](.github/workflows/ci-cd.yml) | Content schema, ESLint, Stylelint, actionlint (with ShellCheck), hadolint, yamllint, kubeconform with CRDs; a reproducible build; HTML validation, internal links and fragments, `mandoc -T lint`; Playwright end-to-end and axe accessibility tests on desktop and mobile; Lighthouse budgets; Trivy (dependencies, secrets, misconfigurations) to code scanning. Deploys to Pages only from `main`, only if all of it passed. |
| [`container.yml`](.github/workflows/container.yml) | Multi-arch image (amd64, arm64) without emulation, smoke-tested read-only and non-root, Trivy-scanned, pushed to GHCR, signed keylessly with cosign, with an SPDX SBOM attestation and SLSA build provenance. |
| [`zero-trust-e2e.yml`](.github/workflows/zero-trust-e2e.yml) | A kind cluster with Cilium. The site is deployed behind default-deny and a `CiliumNetworkPolicy`; the job checks that only the gateway gets through, that the L7 proxy answers 403 to anything but `GET`/`HEAD`, that other pods are dropped and that the site cannot reach the internet. Then k6, then the Hubble drops in the job summary. Weekly as well, to catch drift. |
| [`codeql.yml`](.github/workflows/codeql.yml) | CodeQL on the JavaScript and on the workflows. |
| [`scorecard.yml`](.github/workflows/scorecard.yml) | OpenSSF Scorecard, published for the badge above. |

Supply-chain rules that hold everywhere: every action is pinned to a commit SHA (see
[CVE-2026-33634](https://nvd.nist.gov/vuln/detail/CVE-2026-33634), when the tags of a popular
scanning action were force-pushed to malicious commits); every downloaded tool is checked
against a SHA-256 ([`install-tools.sh`](scripts/ci/install-tools.sh)); workflows start with no
permissions; `npm ci --ignore-scripts`; Dependabot keeps all of it current.

### Verify it yourself

```sh
cosign verify ghcr.io/louane20/portfolio:latest \
  --certificate-identity "https://github.com/louane20/portfolio/.github/workflows/container.yml@refs/heads/main" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

gh attestation verify oci://ghcr.io/louane20/portfolio:latest --owner louane20
```

## Run it

```sh
npm ci --ignore-scripts
npm run dev          # http://127.0.0.1:4173/ (rebuilds on change)
make help            # every other task: lint, test, lighthouse, image, run, zero-trust, man...
```

Node 24 (see `.nvmrc`). `make zero-trust` needs Docker, and installs nothing behind your back:
`make tools` puts the pinned CLIs in `~/.local/bin`.

## Edit the content

Everything you read on the site lives in [`content/profile.yaml`](content/profile.yaml), in
English and French, validated by [`content/schema.json`](content/schema.json). Field notes
are Markdown files in [`content/notes/`](content/notes/) (`draft: true` keeps one out of the
build). Push to `main` and the pipeline does the rest.

## Layout

```
content/            profile.yaml (EN + FR), schema.json, notes/*.md
src/templates/      page sections and the research diagram, rendered at build time
src/scripts/        theme, menu, copy buttons, local time, live pipeline status
src/styles/         design tokens (light and dark), layout, components
scripts/            build.mjs, serve.mjs, check-links.mjs, ci/*.sh
tests/              Playwright + axe (e2e/), k6 (load/)
deploy/             nginx config, kustomize base and overlays, kind, Argo CD
.github/            workflows, composite action, Dependabot
```

## Credits

Typeset in [Red Hat Display, Text and Mono](https://github.com/RedHatOfficial/RedHatFont)
(SIL Open Font License). Built on the shoulders of Kubernetes, Cilium, Istio, Argo CD, kind,
Sigstore, Trivy, Playwright, axe and Lighthouse.

Code: MIT. Content and résumé: © Nawal Guerd.
