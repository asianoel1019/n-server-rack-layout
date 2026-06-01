# 🚀 Next-Gen DCIM Platform

A comprehensive Data Center Infrastructure Management (DCIM) solution designed for modern IT operations. This platform integrates physical rack layout visualization, real-time device monitoring, IP Address Management (IPAM), and DNS orchestration into a single, intuitive interface.

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![Status](https://img.shields.io/badge/status-Production--Ready-success)

---

## 🌟 Core Modules

### 1. Visual Rack Management
*   **Intuitive 2D Layout**: Drag-and-drop interface for managing physical server placements.
*   **Multi-U Support**: Handles devices from 1U to 4U with accurate grid occupancy.
*   **Data Center Hierarchy**: Manage multiple data centers and rooms in a structured view.

### 2. IPAM (IP Address Management)
*   **Dual-View Inventory**: Switch between high-density **Table View** and visual **Grid Heatmap**.
*   **Subnet Grouping**: Automatically organize subnets by Environment (Production, UAT, Dev) with collapsible sections.
*   **Utilization Insight**: Real-time monitoring of IP capacity with visual health bars (Green/Yellow/Red).
*   **Guided Assignment**: A 5-step "IP Assign" workflow with smart "Next Available IP" recommendations.

### 3. DNS / FQDN Manager
*   **Hierarchical Tree View**: Navigate complex domain structures with collapsible FQDN folders.
*   **Smart Record Creation**: Contextual record adding (only input the host prefix, domain is appended automatically).
*   **Diagnostic Tools**: Built-in **DNS Resolve Tester** for verifying resolution speed, TTL, and PTR matches.
*   **IPAM-DNS Sync**: Fully automated synchronization. Assigning an IP with an FQDN automatically creates/updates DNS A-records.

### 4. Device Monitoring
*   **Live Status Polling**: Real-time heartbeat monitoring for all registered infrastructure.
*   **Visual Indicators**: Instant status updates (Online/Offline/Warning) across the entire dashboard.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Vanilla CSS (Modern Design System).
- **Backend**: Node.js, Express, WebSocket (for real-time updates).
- **Storage**: JSON-based persistent storage (DCIM-as-Code ready).
- **Infrastructure**: Docker & Docker Compose.

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed.

### Installation
1. Clone the repository.
2. Configure environment variables in `backend/.env`.
3. Launch the platform:
   ```bash
   docker-compose up -d --build
   ```
4. Access the UI at `http://localhost:3080`.

### Data Persistence
Data is stored in `backend/src/data`. Ensure this directory has write permissions.
For host-side data management, use the bind mount configuration in `docker-compose.yml`:
```yaml
volumes:
  - ./backend/src/data:/app/src/data
```

---

## 🔐 Security
- **JWT-Based Authentication**: Secure access to all API endpoints.
- **Role-Based Access**: (Planned) Modular permissions for IPAM and DNS operations.

---

## 📝 License
Proprietary / Internal Use Only.
Designed with ❤️ for Enterprise Infrastructure Operations.
