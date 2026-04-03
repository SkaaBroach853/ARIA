"""
SOC Co-Pilot Orchestrator — routes queries to agents, assembles grounded evidence.
Returns agent_trace for visible multi-agent collaboration in the UI.
"""

import dataclasses
from collectors.winlog_collector import WindowsEventLogCollector
from collectors.network_collector import NetworkCollector
from collectors.ip_enricher import IPEnricher
from agents.threat_agent import ThreatDetectionEngine
from agents.timeline_agent import TimelineAgent
from agents.soar_agent import SOARAgent
from agents.query_agent import QueryAgent
from backend.memory import InvestigationMemory
from backend.safety import SafetyLayer


class SOCOrchestrator:
    def __init__(self):
        self.winlog = WindowsEventLogCollector()
        self.netcol = NetworkCollector()
        self.enricher = IPEnricher()
        self.threat_engine = ThreatDetectionEngine()
        self.timeline = TimelineAgent()
        self.soar = SOARAgent()
        self.query = QueryAgent()
        self.memory = InvestigationMemory()
        self.safety = SafetyLayer()

    def process(self, user_query: str, mode: str = 'senior', session_id: str = '') -> dict:
        agent_trace = []

        # 1. Safety check
        safety = self.safety.check_injection(user_query)
        if not safety['safe']:
            return {
                'safe': False, 'response': safety['response'],
                'evidence': {}, 'intent': 'blocked',
                'sources': [], 'threats': [], 'confidence': 'N/A',
                'agent_trace': [{'agent': 'SafetyLayer', 'action': f'Query blocked: {safety["threat_type"]}', 'status': 'blocked'}],
            }

        clean_query = self.safety.sanitize_query(user_query)

        # 2. Intent + entity extraction
        intent = self.query.classify_intent(clean_query)
        entities = self.query.extract_entities(clean_query)
        agent_trace.append({'agent': 'QueryAgent', 'action': f'Intent: {intent} | Entities: {entities}', 'status': 'done'})

        # 3. Route to agents
        evidence = {'events': [], 'threats': [], 'ip_info': None, 'network': []}
        sources = []

        if intent == 'ip_investigation' and entities.get('ips'):
            ip = entities['ips'][0]
            agent_trace.append({'agent': 'WinlogCollector', 'action': f'Querying 48h events for IP {ip}', 'status': 'running'})
            evidence['events'] = [e.to_dict() for e in self.winlog.get_all_security_events(hours=48) if e.src_ip == ip]
            evidence['ip_info'] = dataclasses.asdict(self.enricher.enrich(ip))
            evidence['threats'] = [dataclasses.asdict(t) for t in self.threat_engine.run_all_rules(48) if t.src_ip == ip]
            sources = ['Windows Security Log', 'IP Intelligence (ip-api.com)']
            agent_trace.append({'agent': 'IPEnricher', 'action': f'Enriched {ip}: {evidence["ip_info"].get("country","?")} | Threat: {evidence["ip_info"].get("threat_level","?")}', 'status': 'done'})
            agent_trace.append({'agent': 'ThreatAgent', 'action': f'Found {len(evidence["threats"])} threats for {ip}', 'status': 'done'})

        elif intent == 'threat_lookup':
            agent_trace.append({'agent': 'ThreatAgent', 'action': 'Running all 9 detection rules', 'status': 'running'})
            threats = self.threat_engine.run_all_rules(hours=entities.get('hours', 24))
            evidence['threats'] = [dataclasses.asdict(t) for t in threats]
            evidence['events'] = [e.to_dict() for e in self.winlog.get_login_failures(hours=24)][:20]
            sources = ['Windows Security Log', 'Threat Detection Engine']
            agent_trace.append({'agent': 'ThreatAgent', 'action': f'Matched {len(threats)} threats across 9 rules', 'status': 'done'})

        elif intent == 'login_analysis':
            hours = entities.get('hours', 24)
            agent_trace.append({'agent': 'WinlogCollector', 'action': f'Querying login events for last {hours}h', 'status': 'running'})
            failures = self.winlog.get_login_failures(hours=hours)
            successes = self.winlog.get_successful_logins(hours=hours)
            evidence['events'] = [e.to_dict() for e in (failures + successes)[:30]]
            sources = ['Windows Security Log (Event ID 4624, 4625)']
            agent_trace.append({'agent': 'WinlogCollector', 'action': f'Found {len(failures)} failures, {len(successes)} successes', 'status': 'done'})

        elif intent == 'network_analysis':
            agent_trace.append({'agent': 'NetworkCollector', 'action': 'Reading live network connections via psutil', 'status': 'running'})
            conns = self.netcol.get_live_connections()
            evidence['network'] = [dataclasses.asdict(c) for c in conns[:30]]
            evidence['events'] = [e.to_dict() for e in self.winlog.get_recent_events(hours=1, event_ids=[5156, 5158])]
            sources = ['Live Network Connections (psutil)', 'Windows Firewall Log']
            agent_trace.append({'agent': 'NetworkCollector', 'action': f'Found {len(conns)} active connections', 'status': 'done'})

        elif intent == 'stats':
            stats = self.winlog.get_summary_stats()
            evidence['stats'] = stats
            evidence['events'] = [e.to_dict() for e in self.winlog.get_all_security_events(hours=24)][:10]
            sources = ['Windows Security Log']
            agent_trace.append({'agent': 'WinlogCollector', 'action': f'Stats: {stats.get("total_events_24h",0)} events, {stats.get("login_failures_24h",0)} failures', 'status': 'done'})

        elif intent == 'timeline':
            ip = entities.get('ips', [''])[0] if entities.get('ips') else ''
            agent_trace.append({'agent': 'TimelineAgent', 'action': f'Reconstructing kill chain for {ip or "all IPs"}', 'status': 'running'})
            tl = self.timeline.reconstruct(ip, self.winlog)
            evidence['timeline'] = tl
            evidence['events'] = [e.to_dict() for e in self.winlog.get_all_security_events(hours=48)][:20]
            sources = ['Windows Security Log', 'Timeline Agent']
            agent_trace.append({'agent': 'TimelineAgent', 'action': f'Detected {tl["phases_detected"]} kill chain phases', 'status': 'done'})

        else:
            evidence['events'] = [e.to_dict() for e in self.winlog.get_all_security_events(hours=24)][:20]
            evidence['threats'] = [dataclasses.asdict(t) for t in self.threat_engine.run_all_rules(24)][:5]
            sources = ['Windows Security Log', 'Threat Detection Engine']
            agent_trace.append({'agent': 'ThreatAgent', 'action': 'General query — ran full threat scan', 'status': 'done'})

        # 4. Past investigation context
        ip_for_memory = entities.get('ips', [''])[0] if entities.get('ips') else None
        memory_ctx = self.memory.build_case_context(ip=ip_for_memory)
        if memory_ctx:
            evidence['past_investigations'] = memory_ctx
            agent_trace.append({'agent': 'MemoryAgent', 'action': f'Found {len(memory_ctx)} past investigation(s) for context', 'status': 'done'})

        # 5. SOAR playbook
        soar_plan = None
        if evidence.get('threats'):
            top = evidence['threats'][0]
            soar_plan = self.soar.get_response_plan_dict(top.get('soar_playbook', ''))
            if soar_plan:
                agent_trace.append({'agent': 'SOARAgent', 'action': f'Selected playbook: {soar_plan["name"]} (SLA: {soar_plan["sla_minutes"]}min)', 'status': 'done'})

        return {
            'safe': True,
            'evidence': evidence,
            'intent': intent,
            'sources': sources,
            'threats': evidence.get('threats', []),
            'soar_playbook': soar_plan,
            'confidence': 'HIGH' if (evidence['events'] or evidence.get('threats')) else 'LOW',
            'agent_trace': agent_trace,
        }
