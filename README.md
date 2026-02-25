# 🛡️ Incident Command Center — Cloud SRE Dashboard

A production-grade **Incident Command Center** for managing cloud infrastructure. Built to demonstrate hands-on experience with system monitoring, incident management, troubleshooting, automation, and operational documentation — the core skills of an SRE engineer.

> **Live Demo**: [Coming soon on Vercel]

---

## 🎯 What This Demonstrates

| SRE Competency | Feature |
|---|---|
| System Monitoring | Real-time service health dashboard with CPU, memory, request rate, error rate, and P99 latency |
| Alert Management | Severity-based alert feed with filtering and acknowledgment workflow |
| Incident Response | Full incident lifecycle (create → investigate → identify → monitor → resolve → postmortem) |
| Configuration Management | Service config editor with version tracking and change history |
| Troubleshooting | Diagnostic toolkit running DNS, port, DB, memory, CPU, disk, network, and SSL checks |
| Runbooks & Docs | Operational runbook engine with step-by-step execution and terminal output |
| Automation | One-click automation scripts for restart, cache flush, log rotation, scaling, backups |
| On-Call Rotation | 24/7 on-call schedule management with primary/secondary rotation |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │Incidents │ │  Alerts  │ │ Services │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Configs  │ │ Runbooks │ │Diagnostic│ │Automation│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────┬───────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────┴───────────────────────────────┐
│                  Express.js Backend                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  8 API Route Modules + Dashboard Summary        │   │
│  │  Event Simulator (live metric fluctuation)      │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────┴──────────────────────────┐   │
│  │  SQLite (WAL mode) — 8 tables, indexed          │   │
│  │  services, incidents, alerts, configs,           │   │
│  │  runbooks, automation, on-call                   │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/revanthsonu/incident-command-center.git
cd incident-command-center

# Backend setup
cd server
npm install
npm run seed    # Seeds 12 services, 7 incidents, 15 alerts, 25 configs, 8 runbooks, 10 automation scripts
npm run dev     # Starts API on http://localhost:4000

# Frontend setup (new terminal)
cd client
npm install
npm run dev     # Starts UI on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | KPIs, active incidents, unacked alerts, service health |
| `GET` | `/api/services` | All services with status and metrics |
| `GET` | `/api/incidents` | Incidents with filtering by severity/status |
| `POST` | `/api/incidents` | Create a new incident |
| `PATCH` | `/api/incidents/:id/status` | Update incident lifecycle status |
| `GET` | `/api/alerts` | Alerts with severity/ack filters |
| `PATCH` | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| `GET` | `/api/configs/:serviceId` | Service configuration entries |
| `PUT` | `/api/configs/:serviceId` | Update config with version bump |
| `GET` | `/api/runbooks` | Runbooks by category |
| `POST` | `/api/runbooks/:id/execute` | Execute a runbook with simulated output |
| `POST` | `/api/diagnostics/run` | Run health checks (DNS, port, DB, mem, CPU, disk, network, SSL) |
| `GET` | `/api/automation` | Available automation scripts |
| `POST` | `/api/automation/:id/run` | Trigger an automation script |
| `GET` | `/api/oncall` | On-call schedule (current, upcoming, past) |

---

## 🧰 Tech Stack

- **Frontend**: React 18, Vite 6, vanilla CSS (dark glassmorphism theme)
- **Backend**: Express.js, better-sqlite3 (WAL mode)
- **Design**: JetBrains Mono (terminal), Inter (UI), custom severity color system
- **Simulation**: Background event loop generating real-time metric fluctuations and alerts

---

## 🎨 Design Decisions

1. **Dark command-center theme** — matches the operational context of an SRE dashboard
2. **Real-time data** — event simulator fluctuates service metrics every 30s, generating alerts organically
3. **Realistic domain data** — services named after UC/PTT infrastructure (PTT Gateway, SIP Proxy, Media Server)
4. **Production runbooks** — actual `kubectl`, `redis-cli`, `psql`, `openssl`, `ansible` commands
5. **Terminal-style output** — monospace fonts with color-coded success/error/warning for diagnostics and automation

---

## 📄 License

MIT
