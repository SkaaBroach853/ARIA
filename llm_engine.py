"""
Ollama LLM Engine — streaming + 4 prompt modes.
Mac M3 Pro runs: OLLAMA_HOST=0.0.0.0 ollama serve
"""

import requests
import json
from config import OLLAMA_HOST, OLLAMA_MODEL

SYSTEM_PROMPTS = {
    'briefing': """You are CyberGuard, an AI security assistant for executives and managers.
Speak in plain English. No jargon. Keep answers to 3-5 sentences. Always end with ONE clear action step.
CRITICAL: Only reference events from the EVIDENCE DATA section. If evidence is empty, say: "No matching events found in the last 24 hours." Never invent IPs, usernames, or events.""",

    'senior': """You are CyberGuard Senior SOC Analyst. Audience: experienced security engineers.
Use MITRE ATT&CK technique IDs. Reference exact timestamps and event IDs from evidence. Include IOCs.

Structure your response as:
[THREAT SUMMARY] 1-2 sentences
[TECHNICAL DETAILS] 3-5 bullet points
[IOCs] List of indicators
[MITRE MAPPING] Tactic → Technique → Sub-technique
[RECOMMENDED ACTIONS] Numbered steps

CRITICAL: Every claim must reference specific events from EVIDENCE DATA. Never fabricate log entries or IPs.""",

    'explain': """You are CyberGuard Explainability Engine. Show your reasoning step by step.
Format EXACTLY as:
Step 1 — Data collected: [what events/sources were found]
Step 2 — Pattern detected: [what anomaly or rule matched]
Step 3 — MITRE mapping: [tactic and technique]
Step 4 — Confidence: [HIGH/MEDIUM/LOW and why]
Step 5 — Recommended action: [one specific step]

CRITICAL: Every step must reference actual data from EVIDENCE DATA. No assumptions.""",

    'report': """You are writing a CISO-level incident report. Tone: formal, concise, factual.
Sections: Executive Summary | What Happened | Timeline | Business Impact | Recommendations | Next Steps.
Each section: 2-3 sentences max. Total: under 400 words.
Base ALL claims only on the INCIDENT DATA provided. No assumptions.""",
}


def check_connection() -> dict:
    try:
        resp = requests.get(f'{OLLAMA_HOST}/api/tags', timeout=5)
        models = [m['name'] for m in resp.json().get('models', [])]
        return {'connected': True, 'models': models, 'base_url': OLLAMA_HOST}
    except Exception as e:
        return {'connected': False, 'error': str(e), 'base_url': OLLAMA_HOST}


def build_prompt(system: str, user_query: str, evidence: dict) -> str:
    evidence_text = ''

    if evidence.get('events'):
        evidence_text += f'\n\nEVIDENCE DATA ({len(evidence["events"])} events):\n' + '=' * 50 + '\n'
        for ev in evidence['events'][:20]:
            evidence_text += (
                f"• [{ev.get('timestamp','?')}] EventID:{ev.get('event_id','?')} "
                f"User:{ev.get('username','?')} IP:{ev.get('src_ip','?')} "
                f"Type:{ev.get('event_type','?')} Severity:{ev.get('severity','?')}\n"
            )
        evidence_text += '=' * 50

    if evidence.get('threats'):
        evidence_text += '\n\nDETECTED THREATS:\n'
        for t in evidence['threats']:
            evidence_text += (
                f"• [{t.get('severity','?')}] {t.get('rule_name','?')}: {t.get('description','?')}\n"
                f"  MITRE: {t.get('mitre_technique_id','?')} {t.get('mitre_technique','?')}\n"
            )

    if evidence.get('ip_info'):
        ip = evidence['ip_info']
        evidence_text += (
            f"\n\nIP INTELLIGENCE for {ip.get('ip','?')}:\n"
            f"• Location: {ip.get('flag_emoji','')} {ip.get('city','?')}, {ip.get('country','?')}\n"
            f"• ISP: {ip.get('isp','?')} | Org: {ip.get('org','?')}\n"
            f"• VPN/Proxy: {ip.get('is_proxy','?')} | Hosting/DC: {ip.get('is_hosting','?')}\n"
            f"• Threat Level: {ip.get('threat_level','?')}\n"
        )
        if ip.get('threat_reasons'):
            evidence_text += f"• Reasons: {', '.join(ip['threat_reasons'])}\n"

    if evidence.get('past_investigations'):
        evidence_text += '\n\nPAST INVESTIGATION CONTEXT:\n'
        for c in evidence['past_investigations']:
            evidence_text += f"• Case {c['case_id']} ({c['date'][:10]}): {c['summary']}\n"

    if not evidence_text:
        evidence_text = '\n\nEVIDENCE DATA: No matching events found.'

    return f"{system}\n{evidence_text}\n\nANALYST QUERY: {user_query}\n\nRESPONSE:"


def stream_response(query: str, evidence: dict, mode: str = 'senior'):
    """Generator: yields text chunks from Ollama."""
    system = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS['senior'])
    prompt = build_prompt(system, query, evidence)
    try:
        resp = requests.post(
            f'{OLLAMA_HOST}/api/generate',
            json={
                'model': OLLAMA_MODEL,
                'prompt': prompt,
                'stream': True,
                'options': {'temperature': 0.1, 'top_k': 20, 'top_p': 0.9, 'num_ctx': 8192},
            },
            stream=True,
            timeout=120,
        )
        for line in resp.iter_lines():
            if line:
                chunk = json.loads(line)
                if chunk.get('response'):
                    yield chunk['response']
                if chunk.get('done'):
                    break
    except requests.exceptions.ConnectionError:
        yield f'\n\n[ERROR] Cannot reach Ollama at {OLLAMA_HOST}. Ensure Mac has Ollama running with OLLAMA_HOST=0.0.0.0'
    except Exception as e:
        yield f'\n\n[ERROR] LLM engine error: {str(e)}'


def get_full_response(query: str, evidence: dict, mode: str = 'senior') -> str:
    return ''.join(stream_response(query, evidence, mode))
