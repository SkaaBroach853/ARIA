"""
AI Safety Layer — injection detection + hallucination validation.
"""

import re
from datetime import datetime

INJECTION_PATTERNS = [
    (r'ignore (previous|all|above|your) instructions', 'instruction_override'),
    (r'you are now (a|an)', 'persona_hijack'),
    (r'new system prompt', 'system_prompt_injection'),
    (r'disregard (your|all)', 'instruction_override'),
    (r'pretend (you are|to be)', 'persona_hijack'),
    (r'forget (your|all) (rules|instructions)', 'instruction_wipe'),
    (r'act as (if )?["\']?(DAN|jailbreak|unlimited|uncensored)', 'jailbreak'),
    (r'override (safety|content|system)', 'safety_bypass'),
    (r'\]\s*ignore', 'prompt_injection'),
    (r'system:\s*you are', 'system_prompt_injection'),
    (r'<!--.*?-->', 'html_comment_injection'),
    (r'\{.*?system.*?\}', 'template_injection'),
]


class SafetyLayer:
    def __init__(self):
        self._injection_log = []

    def check_injection(self, query: str) -> dict:
        lower = query.lower()
        for pattern, threat_type in INJECTION_PATTERNS:
            if re.search(pattern, lower):
                entry = {
                    'query': query[:100],
                    'threat_type': threat_type,
                    'pattern': pattern,
                    'timestamp': datetime.now().isoformat(),
                }
                self._injection_log.append(entry)
                return {
                    'safe': False,
                    'threat_type': threat_type,
                    'response': 'This query has been flagged as a potential prompt injection attempt and has been logged.',
                }
        return {'safe': True}

    def validate_output(self, llm_response: str, evidence: dict) -> dict:
        """Cross-check IPs mentioned in LLM response against evidence."""
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        response_ips = set(re.findall(ip_pattern, llm_response))

        evidence_ips = set()
        for ev in evidence.get('events', []):
            if ev.get('src_ip'):
                evidence_ips.add(ev['src_ip'])
        if evidence.get('ip_info'):
            evidence_ips.add(evidence['ip_info'].get('ip', ''))
        for t in evidence.get('threats', []):
            if t.get('src_ip'):
                evidence_ips.add(t['src_ip'])

        hallucinated = response_ips - evidence_ips - {'127.0.0.1', '0.0.0.0'}
        confidence = 'HIGH' if not hallucinated else ('MEDIUM' if len(hallucinated) <= 1 else 'LOW')
        disclaimer = ''
        if hallucinated:
            disclaimer = f'\n\n⚠️ Confidence: {confidence} — {len(hallucinated)} IP(s) could not be verified against evidence: {", ".join(hallucinated)}'

        return {
            'validated': len(hallucinated) == 0,
            'hallucinated_entities': list(hallucinated),
            'confidence': confidence,
            'disclaimer': disclaimer,
        }

    def sanitize_query(self, query: str) -> str:
        query = re.sub(r'(DROP|DELETE|INSERT|UPDATE|SELECT|EXEC|UNION)\s+', '', query, flags=re.IGNORECASE)
        query = re.sub(r'[;&|`$]', '', query)
        return query[:500]

    @property
    def injection_log(self):
        return self._injection_log
