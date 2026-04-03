# ARIA— AI-Driven SOC Co-Pilot

CyberGuard is an intelligent Security Operations Center (SOC) assistant that helps analysts detect, investigate, and respond to cyber threats in real time.

It combines log analysis, threat detection, and AI-based explanation into a single unified platform.

---

 🚀 Features

* AI-powered security analyst (local LLM via Ollama)
* Multi-source log correlation (network, login, alerts)
* Real-time threat detection using rule engine
* MITRE ATT&CK mapping for every threat
* Attack timeline reconstruction
* Automated response playbooks (SOAR)
* Investigation memory (SQLite case tracking)
* Live SOC simulation using streaming logs
* Role-based access system (Admin, Analyst, Manager, Viewer)

---

## 🛠 Tech Stack

Backend:

* Python 3.11
* Flask + Flask-SocketIO

Frontend:

* Jinja2 + Vanilla JS
* Chart.js

AI:

* Ollama (llama3 model, fully offline)

Database:

* SQLite (case memory)

Data:

* Pandas (CSV-based logs)

---