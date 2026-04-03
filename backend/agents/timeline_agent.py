"""
Timeline Agent — Reconstructs attack kill chain from events.
"""

from datetime import datetime
from collections import defaultdict

KILL_CHAIN_PHASES = {
    'RECONNAISSANCE':    [5156, 5158],
    'INITIAL_ACCESS':    [4624, 4648],
    'CREDENTIAL_ACCESS': [4625, 4771, 4776],
    'PRIVILEGE_ESCALATION': [4672, 4728, 4732, 4756, 4720],
    'PERSISTENCE':       [4698],
    'DEFENSE_EVASION':   [1102, 4670],
    'LATERAL_MOVEMENT':  [4624, 5140],
}

PHASE_LABELS = {
    'RECONNAISSANCE':       'Reconnaissance',
    'INITIAL_ACCESS':       'Initial Access',
    'CREDENTIAL_ACCESS':    'Credential Access',
    'PRIVILEGE_ESCALATION': 'Privilege Escalation',
    'PERSISTENCE':          'Persistence',
    'DEFENSE_EVASION':      'Defense Evasion',
    'LATERAL_MOVEMENT':     'Lateral Movement',
}


class TimelineAgent:
    def reconstruct(self, ip: str, winlog_collector) -> dict:
        """Build a kill chain timeline for a given IP."""
        events = winlog_collector.get_all_security_events(hours=48)
        ip_events = [e for e in events if e.src_ip == ip or not ip]

        phases = defaultdict(list)
        for ev in ip_events:
            for phase, event_ids in KILL_CHAIN_PHASES.items():
                if ev.event_id in event_ids:
                    phases[phase].append({
                        'event_id': ev.event_id,
                        'timestamp': ev.timestamp,
                        'event_type': ev.event_type,
                        'username': ev.username,
                        'src_ip': ev.src_ip,
                        'severity': ev.severity,
                        'description': self._describe(ev),
                    })

        # Build ordered phase list
        phase_order = list(KILL_CHAIN_PHASES.keys())
        timeline = []
        for phase in phase_order:
            if phase in phases:
                evs = sorted(phases[phase], key=lambda x: x['timestamp'])
                timeline.append({
                    'phase': phase,
                    'label': PHASE_LABELS[phase],
                    'event_count': len(evs),
                    'first_seen': evs[0]['timestamp'] if evs else '',
                    'last_seen': evs[-1]['timestamp'] if evs else '',
                    'events': evs[:10],
                })

        return {
            'ip': ip,
            'total_events': len(ip_events),
            'phases_detected': len(timeline),
            'timeline': timeline,
            'attack_narrative': self._build_narrative(timeline, ip),
        }

    def _describe(self, ev) -> str:
        descriptions = {
            4624: f'Successful login by {ev.username or "unknown"} ({ev.logon_type})',
            4625: f'Failed login attempt targeting {ev.username or "unknown"}',
            4648: f'Explicit credential use by {ev.username or "unknown"}',
            4672: f'Special privileges assigned to {ev.username or "unknown"}',
            4698: f'Scheduled task created by {ev.username or "unknown"}',
            4720: f'New account created: {ev.username or "unknown"}',
            1102: f'Security audit log CLEARED by {ev.username or "unknown"}',
            4670: f'Permissions changed by {ev.username or "unknown"}',
            5140: f'Network share accessed by {ev.username or "unknown"}',
        }
        return descriptions.get(ev.event_id, f'Event {ev.event_id} — {ev.event_type}')

    def _build_narrative(self, timeline: list, ip: str) -> str:
        if not timeline:
            return f'No attack phases detected for IP {ip} in the last 48 hours.'
        phases = [t['label'] for t in timeline]
        first_time = timeline[0]['first_seen']
        last_time = timeline[-1]['last_seen']
        return (
            f'Attack chain detected from {ip}. '
            f'Activity began at {first_time} and progressed through {len(phases)} phases: '
            f'{" → ".join(phases)}. '
            f'Last activity recorded at {last_time}.'
        )
