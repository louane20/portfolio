---
title: "Kubernetes operators in production: CloudNativePG and Strimzi"
date: 2026-11-03
category: platform
cover: operators
summary: >-
  What an operator really is, how CloudNativePG runs PostgreSQL and Strimzi runs Kafka on
  Kubernetes, and the drills I run before trusting an operator with data.
tags: [kubernetes, operators, postgresql, cloudnative-pg, kafka, strimzi]
---

For years, the advice about stateful services on Kubernetes was short: don't. Databases and message brokers need careful failovers, ordered upgrades and tested backups, and a Deployment knows none of that. Operators changed the answer. They put the runbook of a database administrator or a Kafka engineer into a controller that runs it, every time, the same way.

They also put a piece of software between you and your data, with wide permissions and opinions about failure. So it is worth understanding what an operator does before handing it a production database. This article covers the idea, two operators I care about, CloudNativePG for PostgreSQL and Strimzi for Kafka, and the checks I make before trusting either.

## An operator is a control loop that knows the application

Kubernetes itself is a set of control loops. A Deployment controller compares the number of pods you asked for with the number that exist, and fixes the difference. An operator does the same for an application: it adds a resource type to the API, a *custom resource*, and a controller that knows what that resource means.

```diagram
operator-loop
```

You declare the desired state in `spec`: three PostgreSQL instances, 20 GiB each. The operator watches that resource, creates and updates ordinary Kubernetes objects to match it, reacts to their events, and writes what it observes back into `status`. It never runs a script once and forgets; it reconciles, again and again, so a deleted pod or a failed node is just another difference to fix.

The difference with a Helm chart is when the knowledge applies. A chart knows how to install PostgreSQL. An operator knows what to do on a Tuesday night when the primary's node disappears.

## Not every operator earns its place

The Operator Framework describes five capability levels, and they are a good way to read an operator's documentation.

```diagram
operator-levels
```

Levels 1 and 2 are what a chart and a careful upgrade procedure already give you. The value starts at level 3, with backup, restore and failover handled by the operator, and continues with metrics and alerts that describe the application rather than the pods. An operator that stops at level 2 adds a component to maintain without removing any work.

## PostgreSQL with CloudNativePG

CloudNativePG was created at EDB, is licensed under Apache 2.0, and has been a CNCF Sandbox project since January 2025. Its design choices are the reason I like it.

It does not use a StatefulSet. The operator manages the pods and their volumes directly, so it can choose which instance to restart, which to replace and which to promote, instead of following a StatefulSet's fixed order. Inside each pod, an *instance manager* runs as PID 1, starts PostgreSQL and reports its state. Replication is PostgreSQL's own streaming replication: there is no extra layer between the database and its replicas.

```diagram
cnpg-cluster
```

Applications never talk to a pod. CloudNativePG creates services for each cluster: `orders-db-rw` always points to the primary, `orders-db-ro` to the replicas, and `orders-db-r` to any instance. When the primary fails, the operator promotes the most aligned replica and moves the `-rw` service to it. Clients reconnect to the same name.

A complete cluster, with continuous backups to object storage, is three resources:

```yaml title="orders-db.yaml"
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: orders-db
  namespace: orders
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised
  storage:
    size: 20Gi
  walStorage:
    size: 10Gi
  postgresql:
    parameters:
      max_connections: "200"
  plugins:
    - name: barman-cloud.cloudnative-pg.io
      isWALArchiver: true
      parameters:
        barmanObjectName: orders-backups
---
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: orders-backups
  namespace: orders
spec:
  retentionPolicy: "30d"
  configuration:
    destinationPath: s3://pg-backups/orders-db
    endpointURL: https://s3.internal
    s3Credentials:
      accessKeyId:
        name: backup-credentials
        key: ACCESS_KEY_ID
      secretAccessKey:
        name: backup-credentials
        key: ACCESS_SECRET_KEY
    wal:
      compression: gzip
---
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: orders-db-nightly
  namespace: orders
spec:
  schedule: "0 0 2 * * *" # six fields, seconds first: every day at 02:00
  cluster:
    name: orders-db
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
```

Backups go through the **Barman Cloud plugin**: WAL files are archived continuously and base backups are taken on schedule, which together allow point-in-time recovery. The plugin replaced the backup support built into the operator, which is deprecated, and it needs cert-manager in the cluster. WAL gets its own volume (`walStorage`), so a burst of writes cannot fill the data volume.

Upgrades follow the same logic as failover. When the image or the configuration changes, CloudNativePG updates the replicas first, one at a time, then deals with the primary, either by restarting it or by switching over to an already updated replica. With `primaryUpdateStrategy: unsupervised` it does all of this alone; set it to `supervised` and it waits for you before touching the primary.

> [!TIP]
> Test the restore, not the backup. A backup that has never been restored is a hope. Once a week, a job creates a throwaway cluster from the object store, runs a few queries against it, and deletes it.

```yaml title="restore-drill.yaml"
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: orders-db-drill
  namespace: orders
spec:
  instances: 1
  storage:
    size: 20Gi
  bootstrap:
    recovery:
      source: orders-db
  externalClusters:
    - name: orders-db
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: orders-backups
          serverName: orders-db
```

> [!WARNING]
> The operator is part of the control plane. If it is down, PostgreSQL keeps serving queries, but nobody promotes a replica when the primary fails. Run the operator with more than one replica, alert when it is not ready, and upgrade it with the same care as the database.

## Kafka with Strimzi

Strimzi runs Apache Kafka on Kubernetes. It is licensed under Apache 2.0 and has been a CNCF Incubating project since February 2024. Two recent changes shape how it looks today: Kafka 4 removed ZooKeeper, so Strimzi clusters run in KRaft mode only, and Strimzi 1.0 moved every resource to the stable `kafka.strimzi.io/v1` API.

```diagram
strimzi-kraft
```

In KRaft mode, the cluster's metadata lives in a quorum of **controllers** instead of ZooKeeper. Strimzi describes controllers and brokers as separate *node pools*, each with its own replica count, storage and resources:

```yaml title="events-kafka.yaml"
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: controller
  labels:
    strimzi.io/cluster: events
spec:
  replicas: 3
  roles: [controller]
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 20Gi
        kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: broker
  labels:
    strimzi.io/cluster: events
spec:
  replicas: 3
  roles: [broker]
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 200Gi
        kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: events
spec:
  kafka:
    version: 4.3.1
    metadataVersion: 4.3-IV0
    listeners:
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
    authorization:
      type: simple
    config:
      default.replication.factor: 3
      min.insync.replicas: 2
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

The **Cluster Operator** turns these resources into pods, certificates and services. When something changes, it restarts brokers one at a time and checks first that a restart will not leave a partition without enough in-sync replicas. The **Entity Operator** brings the rest of Kafka into the same model: topics and users are Kubernetes resources too.

```yaml title="orders-topic-and-user.yaml"
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: orders
  labels:
    strimzi.io/cluster: events
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000 # 7 days
    min.insync.replicas: 2
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaUser
metadata:
  name: orders-service
  labels:
    strimzi.io/cluster: events
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations: [Describe, Read, Write]
      - resource:
          type: group
          name: orders-service
          patternType: literal
        operations: [Read]
```

This is where an operator pays off beyond automation. Every topic and every permission is a file in Git, reviewed in a merge request and applied by Argo CD. Each client authenticates with its own certificate, which the User Operator issues into a Secret, and can only touch what its ACLs allow. That is Zero Trust applied to a message bus: identity per workload and least privilege, declared and versioned.

> [!NOTE]
> Coming from an older Strimzi version, resources must be migrated to the `v1` API before upgrading to Strimzi 1.0 or later. Plan it as its own change, with the upgrade notes open.

## And everything else

PostgreSQL and Kafka are the operators people notice, because they guard data. A typical platform runs several more, often without anyone calling them operators:

| Operator | What it manages | Project status |
| --- | --- | --- |
| cert-manager | TLS certificates from an internal CA or ACME | CNCF Graduated |
| Prometheus Operator | Prometheus, Alertmanager, scrape targets and alerting rules | community project |
| External Secrets Operator | Kubernetes Secrets synchronised from Vault and other stores | CNCF Sandbox |
| Rook | Ceph storage for block, file and object volumes | CNCF Graduated |
| Argo CD | applications declared in Git, kept in sync with the cluster | CNCF Graduated |

They all follow the same pattern: a custom resource for intent, a controller for reconciliation, and a `status` that tells you whether reality agrees.

## Before I trust an operator with data

Reading the documentation is not enough. These are the drills I run in a staging cluster before an operator gets near production data:

1. **Restore to an empty namespace.** From object storage only, as if the original cluster were gone. Time it: that number is your real recovery time.
2. **Break things on purpose.** Delete the primary pod, drain its node, cut a broker off the network. Watch what the operator does, how long it takes, and what the applications see.
3. **Rehearse both upgrades.** Upgrading the operator and upgrading what it runs are separate events: a new CloudNativePG release is not a new PostgreSQL version, and a new Kafka version comes with a `metadataVersion` step of its own.
4. **Read its permissions.** Know which ClusterRoles it installs, and whether it can watch only the namespaces it needs.
5. **Check what it tells you.** Metrics, events and `status` fields should be enough to know, without logging into a pod, whether the cluster is healthy.
6. **Look at the project, not only the code.** Release cadence, how security issues are handled, who maintains it. A foundation and maintainers from several companies are worth more than a large star count.
7. **Know your exit.** CloudNativePG runs vanilla PostgreSQL and Strimzi runs upstream Apache Kafka. If I ever leave either operator, the data and the clients come with me.

An operator does not remove the need to understand PostgreSQL or Kafka. It removes the need to repeat, by hand and at night, what you already understand. That is a trade I am happy to make, after the drills.
