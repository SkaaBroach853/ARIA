# ARIA SOC Co-Pilot

Autonomous Response and Intelligent Agent (ARIA) is a full-stack Security Operations Center (SOC) assistant with multi-agent analysis, threat detection, SOAR actions, simulation tooling, timeline/case workflows, and an AI chat interface.

## Features

- Multi-agent security workflow: triage, correlation, explainer, SOAR, red-team simulation
- Security log ingestion and parsing (upload + API)
- Threat detection and correlation pipelines
- Case memory, timeline reconstruction, and analytics
- Chat and file analysis endpoints for analyst workflows
- Authentication + role-based access control (admin / manager / employee)
- React dashboard with real-time SOC views

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite, APScheduler
- AI/LLM: Ollama-compatible endpoint (`llama3` by default)
- Frontend: React 18, Vite, Tailwind CSS, React Query, Zustand

## Repository Structure

```text
.
├── backend/
│   ├── agents/            # ARIA agent implementations
│   ├── engines/           # Detection/correlation/timeline/memory logic
│   ├── routers/           # API routes
│   ├── utils/             # LLM, parsing, queue, IP helpers
│   ├── main.py            # FastAPI app entrypoint
│   ├── models.py          # ORM models
│   ├── database.py        # DB engine/session setup
│   ├── config.py          # Runtime + default settings
│   └── requirements.txt
├── frontend/
│   ├── src/components/
│   ├── src/pages/
│   ├── src/services/api.js
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- Ollama (or another compatible endpoint) reachable from backend

## Backend Setup

Run from project root:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs will be available at:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend default dev URL: `http://localhost:5173`

## Environment Configuration

Important runtime values currently come from `backend/config.py` and environment variables (when set):

- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `DATABASE_URL`
- `DEBUG`

Frontend API base URL:

- `VITE_API_URL` (defaults to `http://localhost:8000`)

Example:

```bash
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="llama3"
export DATABASE_URL="sqlite:///./aria_soc.db"
export DEBUG="false"
```

## Default Login Accounts

Seeded on backend startup if absent:

- `admin / Admin@1234`
- `analyst / Analyst@1234`

Change these immediately in non-local environments.

## Key API Routes

Base API prefix: `/api`

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/logs/`
- `POST /api/upload/`
- `GET /api/threats/`
- `GET /api/memory/cases`
- `GET /api/timeline/events/recent`
- `POST /api/simulate/`
- `GET /api/analytics/`
- `POST /api/chat/`
- `POST /api/analyze/file`
- `POST /api/system-logs/collect`
- `GET /health`

Use interactive docs for full schema and parameters: `http://localhost:8000/docs`

## Development Notes

- Database auto-initializes at startup.
- Sample data can be generated automatically when no logs exist.
- A background scheduler runs correlation analysis periodically.

## Security Notes

- Do not commit real secrets, tokens, or public tunnel URLs.
- Move sensitive values from `backend/config.py` into environment variables for shared/staging/production deployments.
- Restrict CORS origins before production release.

## Made By Team Acers :
- Shreyash Gawande
- Aaditya Devdiga
- Nahush Jadhav
- Trishant Jawale

