# HOSTING_EVALUATION.md — Infrastructure Hosting Evaluation & Sizing Guide

## Document Metadata

| Field | Value | Evidence Tag |
|---|---|---|
| **Document ID** | `DOC-HOST` | `[PROPOSED]` |
| **Milestone** | CSC-VS1 Foundation & Operational Readiness | `[SOURCE]` |
| **Target Runtime** | Java 21 (Eclipse Temurin) + Spring Boot 3.4.1 + PostgreSQL 16 LTS + Next.js 15 | `[SOURCE]` |
| **Author** | System Architecture & DevOps Lead | `[PROPOSED]` |
| **Date** | 2026-11-02 | `[SOURCE]` |

---

## 1. Executive Summary & Core Constraints

CSC 2.0 Follow-Up Platform is a clinical and operational follow-up system for Care & Support Centres. Key hosting requirements:
1. **JVM Memory Footprint**: Java 21 + Spring Boot 3.4 + Hibernate 6 + HikariCP requires minimum **384 MB – 512 MB RAM** under normal load, and up to **1 GB RAM** during database migration and outbox batch bursts.
2. **Idle Sleep vs Immediate Response**: Care outreach workers use the system intermittently throughout field visits. Platforms that spin down containers to zero after 15 minutes of inactivity (such as Render Free Tier) incur a **30–50 second cold-start penalty**, which completely degrades field worker workflow and causes request timeouts on mobile networks.
3. **Data Residency & Network Latency**: Because the beneficiary population is located in India, geographic proximity to Indian cloud regions (e.g., AWS Mumbai `ap-south-1` or Indian data centers) is critical to maintain sub-100ms API response times.
4. **Isolated PostgreSQL**: The primary database must have restricted network access (no open public ports), explicit migration vs application role privilege separation, and automated daily snapshots.

---

## 2. Platform Comparison Matrix

| Platform & Tier | Memory / CPU | Cold-Start / Sleep Behavior | Managed PostgreSQL Included | Estimated Monthly Cost | India Region Available | Verdict |
|---|---|---|---|---|---|---|
| **Render (Free Tier)** | 512 MB RAM, 0.1 CPU | Spindown after 15 min idle; **30–50s cold start**; spin-down drops WebSocket / SSE | Free DB expires after 30 days; 1 GB cap | \$0 | No (US/EU/Singapore only) | ❌ **UNSUITABLE**: Cold-start latency breaks field mobile experience; free DB auto-deletes. |
| **Render (Starter Web Service)** | 512 MB RAM, 0.5 CPU | Always-on (no sleep); zero cold-start delay | Starter DB ($7/mo, 10 GB SSD) | **\$14 / mo** (\$7 app + \$7 db) | No (nearest Singapore) | ⚠️ **ACCEPTABLE FOR STAGING**: Good for preview environments, but 512 MB is tight for JVM heap spikes. |
| **Render (Standard Web Service)** | 2 GB RAM, 1.0 CPU | Always-on; high burst headroom | Standard DB ($20/mo, 20 GB SSD) | **\$45 / mo** (\$25 app + \$20 db) | No | ⚠️ **VIABLE BUT EXPENSIVE**: Meets memory specs, but lacks native Mumbai region. |
| **Railway** | 8 GB max shared, pay-per-use | Always-on; instant deploys; sleep optional | Integrated PostgreSQL (pay-per-usage) | **\$10 – \$18 / mo** (typical VS1 load) | No (US West, US East, EU) | ⚠️ **GOOD FOR CI/PREVIEWS**: Excellent DX and PR preview environments. |
| **Fly.io** | 1 GB – 2 GB Dedicated RAM | Micro-VM architecture; instant resume (< 2s) | Fly Postgres (lite cluster) | **\$12 – \$25 / mo** | Yes (`bom` Mumbai region available!) | ✅ **STRONG RUNNER-UP**: Low latency in Mumbai (`bom`), fast micro-VM restarts. |
| **Self-Hosted VPS (Hetzner Cloud CX22)** | 4 GB RAM, 2 vCPU, 40 GB NVMe | Always-on; zero cold start; 100% dedicated resources | Self-hosted PostgreSQL 16 container | **€3.79 / mo (~$4.10)** | No (Falkenstein/Helsinki; Ashburn US) | ⚠️ **HIGH PERFORMANCE, EU ONLY**: Maximum cost-efficiency, but higher latency to India. |
| **DigitalOcean Droplet (Basic / Mumbai)** | 2 GB RAM, 1 vCPU, 50 GB NVMe | Always-on; zero cold start; dedicated OS | Self-hosted or Managed DB ($15/mo) | **\$12 – \$27 / mo** | Yes (`blr1` Bangalore region!) | 🏆 **RECOMMENDED FOR PRODUCTION**: Local Indian data residency, 2 GB RAM headroom, predictable billing. |

---

## 3. Production Recommendation & Strategy

### Tier 1: Production Deployment (Long-Term Authority)
- **Primary Host**: **DigitalOcean Bangalore (`blr1`)** or **AWS Mumbai (`ap-south-1`) via Render / ECS**.
- **Specs**: 2 GB RAM, 1–2 vCPUs, 50 GB NVMe SSD.
- **Rationale**:
  - Eliminates container sleep cycles and eliminates all cold-start delays.
  - Sub-50ms roundtrip latency from field centers in Delhi, Mumbai, and regional states.
  - JVM configured with `-XX:MaxRAMPercentage=75.0` has ~1.5 GB heap space, comfortably handling concurrent report exports and outbox polling.

### Tier 2: Staging & PR Preview Deployment (Current Phase)
- **Frontend BFF**: **Vercel Preview Deployments** (using `VERCEL_TOKEN`, deployed from branch `feat/csc-vs1`).
- **Backend API**: **Render Starter Web Service** or internal isolated test container.
- **Database**: Dedicated PostgreSQL 16 instance running on Render or isolated development server.

---

## 4. Container & JVM Tuning Specifications

The backend Dockerfile adopts the following optimized multi-stage design:
1. **Multi-Stage Build**:
   - Builder: `eclipse-temurin:21-jdk-alpine` compiles sources and generates optimized Spring Boot JAR.
   - Runner: `eclipse-temurin:21-jre-alpine` contains only the minimal JRE runtime (image size < 240 MB).
2. **Security & Non-Root Execution**:
   - Dedicated unprivileged system user `appuser:appgroup` (UID 10001).
   - Container root filesystem is read-only except for temporary directories.
3. **Memory Limits & Garbage Collection**:
   - `-XX:MaxRAMPercentage=75.0`: Automatically scales JVM heap to 75% of container memory cgroup limit.
   - `-XX:+ExitOnOutOfMemoryError`: Immediately terminates container on OOM, allowing orchestrator (Docker/Render/Kube) to perform clean instant restart rather than hanging in a deadlocked state.
   - `-XX:+UseG1GC`: Low-pause garbage collector optimal for multi-threaded Web servers.
4. **Health Check Probes**:
   - `curl -f http://localhost:8080/actuator/health || exit 1` configured with 30s interval, 5s timeout, 30s startup grace period.
