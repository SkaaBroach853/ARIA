"""
Query Agent — NL intent classification + entity extraction.
"""

import re


class QueryAgent:
    INTENT_MAP = {
        'ip_investigation': [r'\b(\d{1,3}\.){3}\d{1,3}\b'],
        'threat_lookup':    ['attack', 'threat', 'malicious', 'brute', 'hack', 'suspicious', 'compromise', 'intrusion'],
        'login_analysis':   ['login', 'logon', 'password', 'credential', 'sign in', 'authentication', 'failed', 'failure'],
        'network_analysis': ['network', 'connection', 'port', 'traffic', 'firewall', 'socket'],
        'timeline':         ['timeline', 'when', 'sequence', 'history', 'trace', 'chain'],
        'stats':            ['how many', 'count', 'total', 'summary', 'overview', 'status', 'statistics'],
    }

    def classify_intent(self, query: str) -> str:
        q = query.lower()
        for intent, patterns in self.INTENT_MAP.items():
            for p in patterns:
                if re.search(p, q):
                    return intent
        return 'general'

    def extract_entities(self, query: str) -> dict:
        entities = {}
        ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', query)
        if ips:
            entities['ips'] = ips
        hours_match = re.search(r'last (\d+) hours?', query, re.I)
        if hours_match:
            entities['hours'] = int(hours_match.group(1))
        days_match = re.search(r'last (\d+) days?', query, re.I)
        if days_match:
            entities['hours'] = int(days_match.group(1)) * 24
        user_match = re.search(r'(?:user|account|username)[:\s]+(\w+)', query, re.I)
        if user_match:
            entities['username'] = user_match.group(1)
        return entities
