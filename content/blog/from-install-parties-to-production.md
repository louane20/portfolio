---
title: "From install parties to production: why I build on open source"
date: 2026-11-03
category: open-source
cover: open-source
summary: >-
  What a university open-source club taught me about running production platforms: read the
  source, choose projects for their governance and not only their features, watch the licences,
  and give back at your own pace.
tags: [open-source, linux, cncf, licensing, community]
---

Before I ran production clusters, I ran install parties. From 2020 to 2023 I led the IT team of Openminds, the open-source club at USTHB in Algiers. We organised Install Party 10, took part in Hacktoberfest, and gave workshops on the tools we used every day. None of it looked like a career plan at the time. It turned out to be the best preparation I could have had.

This article is about what carried over: why the platforms I build are open source almost all the way down, what I learned to check before adopting a project, and why "open source" turned out to mean more than "free to download".

## What an install party teaches you

Anyone who has helped at an install party knows that the installer is never the hard part. The hard part is the laptop whose Wi-Fi card has no free driver, the dual-boot that must not lose a thesis, and the person in front of the machine who is deciding whether Linux is for them. You learn to read logs with someone, to explain what a partition table is without making it sound like a test, and to write down what worked so the next volunteer does not start from zero.

Hacktoberfest taught a different lesson: a first contribution is mostly social. Finding an issue, reading the contribution guide, asking a question in public and getting a review from a stranger. The code is often a few lines. The confidence it builds is not.

Those habits, reading logs patiently, writing things down, being kind to newcomers, are most of what a platform team does.

## My stack is open source, all the way down

When I draw the platforms I work on, almost every layer is open source, and most live under a neutral foundation.

```diagram
oss-stack
```

That is not ideology. It is a list of practical advantages I rely on every week.

**I can read the code.** When the documentation of an operator says one thing and the cluster does another, the controller's source settles it. With Cilium, reading how a policy is translated is often faster than guessing from symptoms.

**Nothing phones home.** Behind an air gap, a licence server that needs to reach its vendor is a project of its own. Open-source software installs from a bundle and runs offline, with no activation and no expiry date hidden in a binary.

**I can rebuild and verify it.** Source, signed releases and SBOMs make the supply chain inspectable. When a CVE lands, I can see the fix, not just a version number.

**Skills and configuration travel.** Kubernetes manifests, PostgreSQL and Prometheus queries work the same in a bank, a telecom operator or a startup. So does what I know about them.

## Open source is a licence and a governance, not a price

The diagram above has two layers in a different colour, and they are two tools I administer: HashiCorp Vault and Redis. Both changed their licence in recent years, and they were not alone.

```diagram
oss-timeline
```

The pattern repeats. A single company owns the copyright and the trademark of a successful project, decides that cloud providers profit too much from it, and moves to a licence that restricts commercial use: the Server Side Public License, the Business Source License, the Redis Source Available License. These licences let you read the code, but they are not open source in the sense of the Open Source Initiative, and they change who may build what on top.

Each time, the community answered with a fork under a permissive or copyleft licence, and all four forks in the timeline now live under the Linux Foundation: OpenSearch, OpenTofu, OpenBao and Valkey. Some stories also went the other way: Elastic added the AGPL as an option in 2024, and Redis 8 did the same in 2025.

> [!NOTE]
> Source-available is not open source. BUSL, SSPL and RSAL are not OSI-approved licences. Reading the code is allowed; running it as part of a commercial service may not be, depending on the terms.

None of this means a relicensed tool must be replaced overnight. Vault still does its job. It means the licence is part of the risk register, and that the question "who owns this project?" deserves an answer before it becomes load-bearing.

## How I choose a project now

Stars measure attention, not durability. Before a project becomes part of a platform, I go through a short list:

| Question | Where I look |
| --- | --- |
| Who owns it? | the foundation page (CNCF, Linux Foundation, Apache), the trademark, whether contributors sign a CLA |
| Is the licence open source? | the `LICENSE` file, and its history in Git |
| Is it alive? | release cadence, how fast issues get a first answer, how many companies employ maintainers |
| Is it secure? | a security policy, signed releases, SBOMs, the OpenSSF Scorecard |
| Can I leave? | standard data formats and APIs, and whether a fork would be viable |

Foundation status is a strong signal because it answers several of these at once. A CNCF project that graduates must, among other things, have committers from at least two organisations and pass a security audit. Graduated projects such as Kubernetes, containerd, Cilium, Argo and Prometheus cannot be relicensed by one company's board.

## Giving back, at production pace

Working in production leaves little time for large contributions, and that is fine. Most of what open-source projects need is not code:

- **Good bug reports.** A minimal reproduction, versions, what you expected and what happened. It is the contribution maintainers value most, and the one users skip most.
- **Documentation.** If a page made me lose an hour, a pull request that fixes it saves the next person the same hour.
- **Translations.** French and Arabic documentation opens projects to many people who learn better in their own language.
- **Answers.** Forums, issue trackers and community chats run on people who answer questions they once asked.
- **Upstream, not local forks.** A patch kept privately has to be carried through every upgrade. Upstreamed, it becomes someone else's regression test.

Many projects, Cilium and containerd among them, ask for a sign-off on each commit: a one-line statement, the Developer Certificate of Origin, that you have the right to submit the change. Git adds it for you:

```sh
git commit -s -m "docs: fix the network policy example"
# appends a trailer to the commit message:
# Signed-off-by: Your Name <you@example.com>
```

This site is a small contribution in the same spirit. Its code is under the MIT licence and its pipeline is public: anyone can read how it is built, tested, signed and deployed, and reuse whatever helps.

## What stays from the install parties

The tools changed: the laptops on the tables became clusters, and the USB sticks became signed bundles. The rest did not. Read the logs with someone. Write down what worked. Check who you depend on. Leave things a little better for the next person.

That is what open source taught me, long before it was my job.
