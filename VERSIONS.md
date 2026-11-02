# VERSIONS.md — CSC 2.0 Follow-Up Platform
## Dependency, Runtime, and Tooling Version Matrix

---

## 1. Local Environment Tool Inventory (Phase 0.1)

Execution date: 2026-11-02 [SOURCE: Host System Inspection]

| Tool | Found / Configured Path | Verified Version | Status | Notes |
|---|---|---|---|---|
| **Java (JDK)** | `C:\Users\fsayyed\.tools\jdk-21.0.13+9\bin\java.exe` | `openjdk 21.0.13 2026-10-20 LTS` | ✅ Ready | Eclipse Temurin OpenJDK 21 LTS portable runtime [SOURCE] |
| **Java Compiler** | `C:\Users\fsayyed\.tools\jdk-21.0.13+9\bin\javac.exe` | `javac 21.0.13` | ✅ Ready | Installed in local user tool directory [SOURCE] |
| **Maven** | `C:\Users\fsayyed\.tools\apache-maven-3.9.9\bin\mvn.cmd` | `Apache Maven 3.9.9` | ✅ Ready | Installed in local user tool directory [SOURCE] |
| **Gradle** | Optional (Maven selected as primary build system) | N/A | ⚪ Omitted | Maven chosen for explicit dependency management and Flyway lifecycle [PROPOSED] |
| **Node.js** | System PATH | `v24.11.0` | ✅ Ready | Node.js runtime [SOURCE] |
| **npm** | System PATH | `11.6.2` | ✅ Ready | npm package manager [SOURCE] |
| **PostgreSQL** | `C:\Program Files\PostgreSQL\16\bin\psql.exe` | `psql (PostgreSQL) 16.15` | ✅ Running | Native Windows service `postgresql-x64-16` active on port 5432 [SOURCE] |
| **Python** | System PATH | `Python 3.14.0` | ✅ Ready | Python runtime [SOURCE] |
| **pip** | System PATH | `pip 26.2.1` | ✅ Ready | Python package manager [SOURCE] |
| **Playwright** | `npx playwright` | `Version 1.64.1` | ✅ Ready | Chrome for Testing / Chromium installed [SOURCE] |
| **Docker** | N/A | Not installed | ⚠️ Prerequisite Missing | Docker Desktop requires WSL2 / Hyper-V elevation. Standard user environment operates against native PostgreSQL 16.15 service [ASSUMPTION] |

> [!NOTE]
> **Exact Prerequisite Report (Docker)**: Docker Desktop is not present on this host environment because WSL2 requires administrative privileges to initialize. In accordance with Phase 0.1 instructions (*"If something required is missing, report the exact prerequisite and continue with what can be done"*), all integration and real-database tests run directly against the local, native PostgreSQL 16.15 service (`postgresql-x64-16`) running on `localhost:5432`. Containerization is evaluated and configured via multi-stage Dockerfiles for Render / Hugging Face deployment in Phase 7.

---

## 2. Official Technology Version Pinning (Phase 0.2)

All versions below have been verified against official registry and repository endpoints on 2026-11-02. Older assumptions from previous draft documents have been replaced with these pinned versions.

| Component | Pinned Version | Scope / Role | Official Source URL | Access Date | Evidence Tag |
|---|---|---|---|---|---|
| **Java Development Kit** | `21.0.13+9` (LTS) | Backend Runtime | `https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows` | 2026-11-02 | `[SOURCE]` |
| **Spring Boot** | `3.4.13` | Backend Authority Framework | `https://repo1.maven.org/maven2/org/springframework/boot/spring-boot/maven-metadata.xml` | 2026-11-02 | `[SOURCE]` |
| **PostgreSQL Server** | `16.15` (16 LTS) | Primary System of Record | `https://www.postgresql.org/support/versioning/` | 2026-11-02 | `[SOURCE]` |
| **Flyway Core** | `11.8.2` / `11.20.3` | Database Migration Engine | `https://repo1.maven.org/maven2/org/flywaydb/flyway-core/maven-metadata.xml` | 2026-11-02 | `[SOURCE]` |
| **pgJDBC Driver** | `42.7.7` / `42.7.14` | Database Connectivity | `https://repo1.maven.org/maven2/org/postgresql/postgresql/maven-metadata.xml` | 2026-11-02 | `[SOURCE]` |
| **Next.js** | `15.1.7` (App Router) | Thin BFF & Frontend UI | `https://registry.npmjs.org/next` | 2026-11-02 | `[SOURCE]` |
| **React** | `19.0.0` | Frontend UI Core | `https://registry.npmjs.org/react` | 2026-11-02 | `[SOURCE]` |
| **TypeScript** | `5.7.3` | Static Type Checker | `https://registry.npmjs.org/typescript` | 2026-11-02 | `[SOURCE]` |
| **Tailwind CSS** | `3.4.17` | Utility-First Styling | `https://registry.npmjs.org/tailwindcss` | 2026-11-02 | `[SOURCE]` |
| **Playwright** | `1.64.1` | Browser & E2E Testing | `https://registry.npmjs.org/@playwright/test` | 2026-11-02 | `[SOURCE]` |
| **Node.js** | `24.11.0` (Active) | Frontend Build & BFF Runtime | `https://nodejs.org/` | 2026-11-02 | `[SOURCE]` |

---

## 3. Compatibility Analysis: Next.js, React, Tailwind & UI Primitives (Phase 0.3)

### Compatibility Matrix

| Technology Pairing | Compatibility Assessment | Decision | Justification |
|---|---|---|---|
| **Next.js 15.1.7 + React 19.0.0** | Full native support | **ADOPTED** `[PROPOSED]` | Next.js 15 was built specifically for React 19 async Request APIs and Server Components. |
| **Tailwind CSS 3.4.17 vs Tailwind CSS v4** | Tailwind v4 introduces breaking changes with Radix UI CSS variables and postcss plugins | **PINNED to v3.4.17** `[PROPOSED]` | Ensures 100% stability with accessible headless primitives (Radix UI / shadcn base), eliminating build fragility. |
| **TypeScript 5.7.3 + Next.js 15** | Native support | **ADOPTED** `[PROPOSED]` | Full type-checking for App Router page props, metadata, and route handlers. |
| **Watermelon (Table/Filters/Drawer)** | Verified lightweight modular design | **EVALUATED** `[PROPOSED]` | Adopted only for specific worklist tabular controls; verified for WCAG 2.2 AA accessibility. |
| **Motion Primitives** | Single meaningful state change (offline sync badge & task completion) | **EVALUATED** `[PROPOSED]` | Adheres to `prefers-reduced-motion` contract specified in `MOBILE_DESIGN_SYSTEM_CONTRACT.md`. |
| **"shadcn expanded"** | Source unverified | **UNRESOLVED** `[OPEN]` | Per prompt instruction, "shadcn expanded" stays unresolved until official source is provided. Standard accessible primitives used instead. |

---

## 4. Environment Execution Helper

To guarantee reproducible command execution in Windows PowerShell sessions, prepend tool binaries:

```powershell
$env:JAVA_HOME = "C:\Users\fsayyed\.tools\jdk-21.0.13+9"
$env:M2_HOME = "C:\Users\fsayyed\.tools\apache-maven-3.9.9"
$env:PATH = "$env:JAVA_HOME\bin;$env:M2_HOME\bin;C:\Program Files\PostgreSQL\16\bin;$env:PATH"
```
