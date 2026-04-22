# Sovereign Observer | InsureShield

**Sovereign Observer** is a premium catastrophe intelligence platform designed for insurance operations. it provides real-time monitoring, portfolio impact analysis, and automated response coordination for global catastrophe events.

---

## 🏛 Architecture

The application is built using a modular microservices architecture:

*   **`services/frontend`**: A high-end Next.js 15+ (TypeScript) dashboard using Tailwind CSS 4.0. It features the "Sovereign Observer" design system with tonal depth and glassmorphism.
*   **`services/backend`**: A FastAPI (Python) backend providing RESTful endpoints for dashboard data, event management, and alert generation. It uses `aiosqlite` for asynchronous database operations.
*   **`services/extraction_normalization`**: A specialized Python pipeline that ingests data from global sources (GDACS, USGS, EONET, Conflict Feed), normalizes it into a canonical schema, and performs deduplication.
*   **`data/`**: Centrally managed SQLite database (`insureshield.db`) and artifacts.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+
*   Python 3.11+
*   `npm` or `yarn`

### 1. Setup the Backend
Navigate to the backend directory and install dependencies:
```bash
cd services/backend
pip install -e .
```
Start the backend server (on port 8001):
```bash
PYTHONPATH=src uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

### 2. Setup the Frontend
Navigate to the frontend directory and install dependencies:
```bash
cd services/frontend
npm install
```
Start the development server:
```bash
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

### 3. Setup the Extraction Pipeline
Navigate to the extraction directory and install dependencies:
```bash
cd services/extraction_normalization
pip install -e .
```

---

## 🛠 Core Features

### 1. Global Event Theater (Dashboard)
A high-level situational awareness center displaying:
*   **Severity Summary**: Real-time breakdown of Critical, High, Medium, and Low alerts.
*   **Priority Incidents**: A curated queue of the most significant active threats.
*   **Response Protocols**: Automated directives for executive coordination.

### 2. Portfolio Impact Analysis
Deep-dive workspace for specific events:
*   **Live Path Tracking**: Interactive map focus with impact zone overlays.
*   **Exposure Framing**: Real-time matching of events against insured policies and locations.
*   **Claim Trajectory**: Predictive modeling of claim volumes and reserve pressure over a 72-hour window.

### 3. Operational Readiness
Resource management tool to ensure system capacity:
*   **Readiness Score**: A dynamic gauge of total operational capacity.
*   **Tactical Reallocation**: Direct controls for pulling reserves or adding overtime to specific staffing pools.

### 4. Data Pipeline Oversight
Administrator panel for system health:
*   **Source Monitoring**: Status and lag tracking for all global data feeds.
*   **Routing Controls**: Configuration of notification channels (Slack, Queue, Email).

---

## 🛡 Design System

The platform uses the **Sovereign Observer** design system, defined by:
*   **"No-Line" Philosophy**: Structure implied through tonal surface transitions rather than borders.
*   **Glassmorphism**: Sophisticated layering for floating components and overlays.
*   **Metallic CTAs**: High-contrast, premium finishes for primary action buttons.
*   **Typography**: Inter-based hierarchy with editorial-grade tracking and weight distribution.

---

## 📄 License
Internal Hackathon Project — Confidential.
