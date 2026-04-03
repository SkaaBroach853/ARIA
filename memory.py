"""
Investigation Memory — SQLite case builder.
Persists findings across sessions for brownie point: Investigation Memory.
"""

import sqlite3
import json
import uuid
from datetime import datetime
from config import DATABASE_PATH


class InvestigationMemory:
    def __init__(self, db_path=DATABASE_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute('''CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            created_at TEXT,
            updated_at TEXT,
            analyst TEXT,
            query TEXT,
            finding TEXT,
            evidence TEXT,
            threats TEXT,
            status TEXT DEFAULT 'open',
            tags TEXT
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS injection_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            query TEXT,
            threat_type TEXT,
            pattern TEXT
        )''')
        conn.commit()
        conn.close()

    def save_finding(self, query: str, finding: str, evidence: dict,
                     threats: list, analyst: str = 'system') -> str:
        case_id = str(uuid.uuid4())[:8].upper()
        now = datetime.now().isoformat()
        # Extract tags from threats
        tags = list(set(t.get('mitre_technique_id', '') for t in threats if t.get('mitre_technique_id')))
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            'INSERT INTO cases VALUES (?,?,?,?,?,?,?,?,?,?)',
            (case_id, now, now, analyst, query, finding,
             json.dumps(evidence), json.dumps(threats), 'open', json.dumps(tags))
        )
        conn.commit()
        conn.close()
        return case_id

    def save_finding_auto(self, query: str, finding: str, evidence: dict, threats: list) -> str:
        return self.save_finding(query, finding, evidence, threats, analyst='auto')

    def get_open_cases(self) -> list:
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            'SELECT case_id, created_at, analyst, query, finding, threats, status, tags FROM cases ORDER BY created_at DESC LIMIT 50'
        ).fetchall()
        conn.close()
        return [
            {
                'case_id': r[0], 'created_at': r[1], 'analyst': r[2],
                'query': r[3], 'finding': r[4][:200],
                'threats': json.loads(r[5] or '[]'),
                'status': r[6], 'tags': json.loads(r[7] or '[]'),
            }
            for r in rows
        ]

    def build_case_context(self, ip: str = None, username: str = None) -> list:
        """Return past findings relevant to an IP or username for context injection."""
        conn = sqlite3.connect(self.db_path)
        if ip:
            rows = conn.execute(
                "SELECT case_id, created_at, finding FROM cases WHERE evidence LIKE ? ORDER BY created_at DESC LIMIT 3",
                (f'%{ip}%',)
            ).fetchall()
        elif username:
            rows = conn.execute(
                "SELECT case_id, created_at, finding FROM cases WHERE evidence LIKE ? ORDER BY created_at DESC LIMIT 3",
                (f'%{username}%',)
            ).fetchall()
        else:
            rows = []
        conn.close()
        return [{'case_id': r[0], 'date': r[1], 'summary': r[2][:150]} for r in rows]

    def log_injection(self, query: str, threat_type: str, pattern: str):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            'INSERT INTO injection_log (timestamp, query, threat_type, pattern) VALUES (?,?,?,?)',
            (datetime.now().isoformat(), query[:200], threat_type, pattern)
        )
        conn.commit()
        conn.close()

    def get_injection_log(self) -> list:
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            'SELECT timestamp, query, threat_type FROM injection_log ORDER BY timestamp DESC LIMIT 100'
        ).fetchall()
        conn.close()
        return [{'timestamp': r[0], 'query': r[1], 'threat_type': r[2]} for r in rows]

    def update_case_status(self, case_id: str, status: str):
        conn = sqlite3.connect(self.db_path)
        conn.execute('UPDATE cases SET status=?, updated_at=? WHERE case_id=?',
                     (status, datetime.now().isoformat(), case_id))
        conn.commit()
        conn.close()
