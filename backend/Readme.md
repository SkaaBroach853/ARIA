# ARIA— AI-Driven SOC Co-Pilot

CyberGuard is an intelligent Security Operations Center (SOC) assistant that helps analysts detect, investigate, and respond to cyber threats in real time.

It combines log analysis, threat detection, and AI-based explanation into a single unified platform.

---

##  Features

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

##  Tech Stack

Backend:

* Python 3.11
* Flask + Flask-SocketIO

Frontend:

* Jinja2 + Vanilla JS


AI:

* Ollama (llama3 model, fully offline)

Database:

* SQLite (case memory)

Data:

* Pandas (CSV-based logs)

---

## ⚡ Quick Start

### 1. Install Ollama

```
ollama pull llama3
ollama serve
```

### 2. Install dependencies

```
pip install -r requirements.txt
```

### 3. Generate sample data

```
python generate_data.py
```

### 4. Run the app

```
python app.py
```

### 5. Open in browser

http://localhost:5000

---

## 🔐 Demo Credentials

| Role    | Username | Password    |
| ------- | -------- | ----------- |
| Admin   | admin    | Admin@123   |
| Analyst | analyst  | Analyst@123 |
| Manager | manager  | Manager@123 |
| Viewer  | viewer   | Viewer@123  |

---

## 🎯 Demo Flow (For Judges)

1. Login as analyst
2. Open dashboard → show threat stats
3. Ask: "Who is attacking us?"
4. Show AI response + evidence
5. Open Threat Feed → click any threat
6. View Timeline reconstruction
7. Generate Incident Report
8. Use Attack Simulator (Admin panel)

---

## 🧠 Architecture Highlights

* Fully offline AI (no data leaves system)
* Multi-agent architecture (query, threat, timeline, soar)
* Evidence-based AI (no hallucination design)
* Real-time log streaming
* Case memory for investigations
* MITRE ATT&CK integrated

---

## 📁 Project Structure

```
cyberguard/
├── app.py
├── orchestrator.py
├── agents/
├── data/
├── templates/
├── static/
├── requirements.txt
└── README.md
```

---

## 🏁 Goal

Designed for hackathons and real-world SOC simulation to demonstrate how AI can assist cybersecurity teams in faster and more accurate threat response.
