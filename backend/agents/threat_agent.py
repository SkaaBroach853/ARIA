"""
Threat Detection Engine — 9 rules + MITRE ATT&CK mapping.
IP enrichment is batched ONCE per run_all_rules call (no per-event HTTP calls).
"""

import uuid
import dataclasses
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
from collectors.winlog_collector import WindowsEventLogCollector
from collectors.ip_enricher import IPEnricher


@dataclass
class ThreatEvent:
    threat_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    rule_name: str = ''
    severity: str = 'MEDIUM'
    src_ip: str = ''
    username: str = ''
    description: str = ''
    evidence: list = field(default_factory=list)
    mitre_tactic: str = ''
    mitre_technique: str = ''
    mitre_technique_id: str = ''
    mitre_url: str = ''
    kill_chain_phase: str = ''
    recommendation: str = ''
    soar_playbook: str = ''
    detected_at: str = field(default_factory=lambda: datetime.now().isoformat())
    event_count: int = 0
    ip_info: dict = field(default_factory=dict)


class ThreatDetectionEngine:
    def __init__(self):
        self.collector = WindowsEventLogCollector()
        self.enricher = IPEnricher()

    def run_all_rules(self, hours: int = 24) -> list:
        events = self.collector.get_all_security_events(hours=hours)
        failures = [e for e in events if e.event_id == 4625]
        successes = [e for e in events if e.event_id == 4624]

        threats = []
        threats.extend(self._rule_brute_force(failures))
        threats.extend(self._rule_account_lockout(failures))
        threats.extend(self._rule_off_hours_login(successes))
        threats.extend(self._rule_privilege_escalation(events))
        threats.extend(self._rule_log_tampering(events))
        threats.extend(self._rule_scheduled_task(events))
        threats.extend(self._rule_mass_account_ops(events))

        # Batch enrich ALL IPs at once — single HTTP call
        all_ips = list(set(t.src_ip for t in threats if t.src_ip))
        if all_ips:
            ip_data = self.enricher.enrich_batch(all_ips)
            for t in threats:
                if t.src_ip in ip_data:
                    t.ip_info = dataclasses.asdict(ip_data[t.src_ip])

        # Geo rules need enriched data — run after batch
        threats.extend(self._rule_geo_anomaly(successes, self.enricher.enrich_batch(
            list(set(e.src_ip for e in successes if e.src_ip))
        )))
        threats.extend(self._rule_impossible_travel(successes, self.enricher.enrich_batch(
            list(set(e.src_ip for e in successes if e.src_ip))
        )))

        return sorted(threats, key=lambda x: {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}.get(x.severity, 3))

    # ── Rule 1: Brute Force ──────────────────────────────────────────────────
    def _rule_brute_force(self, failures: list) -> list:
        threats = []
        ip_attempts = defaultdict(list)
        for e in failures:
            if e.src_ip:
                ip_attempts[e.src_ip].append(e)
        for ip, attempts in ip_attempts.items():
            attempts.sort(key=lambda x: x.timestamp)
            for i, start_ev in enumerate(attempts):
                window = [a for a in attempts[i:] if self._diff_minutes(start_ev.timestamp, a.timestamp) <= 120]
                if len(window) >= 5:
                    users = list(set(a.username for a in window))
                    threats.append(ThreatEvent(
                        rule_name='Brute Force Attack', severity='HIGH', src_ip=ip,
                        username=', '.join(users[:3]),
                        description=f'{len(window)} failed login attempts from {ip} targeting {", ".join(users[:3])} within 2 hours',
                        evidence=[e.to_dict() for e in window[:10]],
                        mitre_tactic='TA0006 Credential Access', mitre_technique='Password Guessing',
                        mitre_technique_id='T1110.001', mitre_url='https://attack.mitre.org/techniques/T1110/001/',
                        kill_chain_phase='Exploitation',
                        recommendation='Block IP at firewall, enable account lockout, alert account owner, check for successful login from same IP',
                        soar_playbook='brute_force', event_count=len(window),
                    ))
                    break
        return threats

    # ── Rule 2: Account Lockout ──────────────────────────────────────────────
    def _rule_account_lockout(self, failures: list) -> list:
        user_fails = defaultdict(list)
        for e in failures:
            if e.username:
                user_fails[e.username].append(e)
        threats = []
        for user, evs in user_fails.items():
            if len(evs) >= 10:
                ips = list(set(e.src_ip for e in evs if e.src_ip))
                threats.append(ThreatEvent(
                    rule_name='Account Lockout Attack', severity='MEDIUM', src_ip=ips[0] if ips else '',
                    username=user,
                    description=f'Account "{user}" had {len(evs)} failed logins from {len(ips)} IPs',
                    evidence=[e.to_dict() for e in evs[:5]],
                    mitre_tactic='TA0006 Credential Access', mitre_technique='Password Spraying',
                    mitre_technique_id='T1110.003', mitre_url='https://attack.mitre.org/techniques/T1110/003/',
                    kill_chain_phase='Exploitation',
                    recommendation='Reset credentials, verify with user, check for insider threat',
                    soar_playbook='account_lockout', event_count=len(evs),
                ))
        return threats

    # ── Rule 3: Off-Hours Login ──────────────────────────────────────────────
    def _rule_off_hours_login(self, successes: list) -> list:
        threats = []
        for e in successes:
            try:
                ts = self._parse_ts(e.timestamp)
                if ts and (ts.hour >= 23 or ts.hour <= 5):
                    threats.append(ThreatEvent(
                        rule_name='Off-Hours Login', severity='MEDIUM', src_ip=e.src_ip, username=e.username,
                        description=f'Successful login by "{e.username}" at {ts.strftime("%H:%M")} from {e.src_ip or "local"}',
                        evidence=[e.to_dict()],
                        mitre_tactic='TA0001 Initial Access', mitre_technique='Valid Accounts',
                        mitre_technique_id='T1078', mitre_url='https://attack.mitre.org/techniques/T1078/',
                        kill_chain_phase='Initial Access',
                        recommendation='Alert security team, verify with user via secondary channel, review session activity',
                        soar_playbook='geo_anomaly', event_count=1,
                    ))
            except Exception:
                pass
        return threats[:5]

    # ── Rule 4: Geo Anomaly (uses pre-fetched ip_map) ────────────────────────
    def _rule_geo_anomaly(self, successes: list, ip_map: dict) -> list:
        threats = []
        for e in successes:
            if not e.src_ip or e.src_ip not in ip_map:
                continue
            info = ip_map[e.src_ip]
            if info.threat_level in ('HIGH', 'MEDIUM') and info.country_code not in ('LAN', '??'):
                threats.append(ThreatEvent(
                    rule_name='Geographic Anomaly',
                    severity='HIGH' if info.threat_level == 'HIGH' else 'MEDIUM',
                    src_ip=e.src_ip, username=e.username,
                    description=f'Login by "{e.username}" from {info.flag_emoji} {info.country} ({info.city}) — {", ".join(info.threat_reasons)}',
                    evidence=[e.to_dict()],
                    mitre_tactic='TA0001 Initial Access', mitre_technique='Valid Accounts',
                    mitre_technique_id='T1078', mitre_url='https://attack.mitre.org/techniques/T1078/',
                    kill_chain_phase='Initial Access',
                    recommendation='Force MFA re-auth, notify account owner, review session activity',
                    soar_playbook='geo_anomaly', event_count=1,
                    ip_info=dataclasses.asdict(info),
                ))
        return threats[:3]

    # ── Rule 5: Impossible Travel (uses pre-fetched ip_map) ─────────────────
    def _rule_impossible_travel(self, successes: list, ip_map: dict) -> list:
        user_logins = defaultdict(list)
        for e in successes:
            if e.username and e.src_ip and e.src_ip in ip_map:
                user_logins[e.username].append(e)
        threats = []
        for user, logins in user_logins.items():
            if len(logins) < 2:
                continue
            for i in range(len(logins)):
                for j in range(i + 1, len(logins)):
                    if self._diff_minutes(logins[i].timestamp, logins[j].timestamp) <= 120:
                        info_i = ip_map.get(logins[i].src_ip)
                        info_j = ip_map.get(logins[j].src_ip)
                        if (info_i and info_j and
                                info_i.country_code != info_j.country_code and
                                info_i.country_code not in ('LAN', '??') and
                                info_j.country_code not in ('LAN', '??')):
                            threats.append(ThreatEvent(
                                rule_name='Impossible Travel', severity='HIGH',
                                src_ip=logins[j].src_ip, username=user,
                                description=f'"{user}" logged in from {info_i.flag_emoji} {info_i.country} and {info_j.flag_emoji} {info_j.country} within 2 hours',
                                evidence=[logins[i].to_dict(), logins[j].to_dict()],
                                mitre_tactic='TA0001 Initial Access', mitre_technique='Valid Accounts',
                                mitre_technique_id='T1078', mitre_url='https://attack.mitre.org/techniques/T1078/',
                                kill_chain_phase='Initial Access',
                                recommendation='IMMEDIATE: Disable account, escalate to IR team, preserve all session logs',
                                soar_playbook='impossible_travel', event_count=2,
                            ))
        return threats

    # ── Rule 6: Privilege Escalation ─────────────────────────────────────────
    def _rule_privilege_escalation(self, events: list) -> list:
        priv_events = [e for e in events if e.event_id in (4672, 4728, 4732)]
        new_accounts = {e.username for e in events if e.event_id == 4720}
        threats = []
        for e in priv_events:
            if e.username in new_accounts:
                threats.append(ThreatEvent(
                    rule_name='Privilege Escalation', severity='HIGH', src_ip=e.src_ip, username=e.username,
                    description=f'Newly created account "{e.username}" assigned elevated privileges (Event {e.event_id})',
                    evidence=[e.to_dict()],
                    mitre_tactic='TA0004 Privilege Escalation', mitre_technique='Valid Accounts: Local Accounts',
                    mitre_technique_id='T1078.003', mitre_url='https://attack.mitre.org/techniques/T1078/003/',
                    kill_chain_phase='Privilege Escalation',
                    recommendation='Review account creation, verify with HR/IT, disable if unauthorized',
                    soar_playbook='privilege_escalation', event_count=1,
                ))
        return threats[:3]

    # ── Rule 7: Log Tampering ────────────────────────────────────────────────
    def _rule_log_tampering(self, events: list) -> list:
        return [
            ThreatEvent(
                rule_name='Audit Log Cleared', severity='HIGH', src_ip=e.src_ip, username=e.username,
                description=f'Windows Security Audit Log CLEARED by "{e.username}" — potential evidence tampering',
                evidence=[e.to_dict()],
                mitre_tactic='TA0005 Defense Evasion', mitre_technique='Indicator Removal: Clear Windows Event Logs',
                mitre_technique_id='T1070.001', mitre_url='https://attack.mitre.org/techniques/T1070/001/',
                kill_chain_phase='Defense Evasion',
                recommendation='CRITICAL: Isolate system, preserve memory dump, escalate to DFIR team',
                soar_playbook='log_tampering', event_count=1,
            )
            for e in events if e.event_id == 1102
        ]

    # ── Rule 8: Scheduled Task ───────────────────────────────────────────────
    def _rule_scheduled_task(self, events: list) -> list:
        return [
            ThreatEvent(
                rule_name='Suspicious Scheduled Task', severity='MEDIUM', src_ip=e.src_ip, username=e.username,
                description=f'New scheduled task created by "{e.username}" — potential persistence mechanism',
                evidence=[e.to_dict()],
                mitre_tactic='TA0003 Persistence', mitre_technique='Scheduled Task/Job',
                mitre_technique_id='T1053.005', mitre_url='https://attack.mitre.org/techniques/T1053/005/',
                kill_chain_phase='Persistence',
                recommendation='Review task details, verify with system owner, delete if unauthorized',
                soar_playbook='persistence', event_count=1,
            )
            for e in events if e.event_id == 4698
        ][:5]

    # ── Rule 9: Mass Account Ops ─────────────────────────────────────────────
    def _rule_mass_account_ops(self, events: list) -> list:
        ops = [e for e in events if e.event_id in (4720, 4728, 4732, 4756)]
        if len(ops) >= 5:
            return [ThreatEvent(
                rule_name='Mass Account Operations', severity='HIGH',
                src_ip=ops[0].src_ip, username=ops[0].username,
                description=f'{len(ops)} account creation/modification events — possible account takeover or insider threat',
                evidence=[e.to_dict() for e in ops[:5]],
                mitre_tactic='TA0003 Persistence', mitre_technique='Create Account: Local Account',
                mitre_technique_id='T1136.001', mitre_url='https://attack.mitre.org/techniques/T1136/001/',
                kill_chain_phase='Persistence',
                recommendation='Audit all recently modified accounts, verify with IT, disable suspicious accounts',
                soar_playbook='mass_account_ops', event_count=len(ops),
            )]
        return []

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _parse_ts(self, ts: str):
        for fmt in ['%a %b %d %H:%M:%S %Y', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S']:
            try:
                return datetime.strptime(ts[:24], fmt)
            except Exception:
                pass
        return None

    def _diff_minutes(self, ts1: str, ts2: str) -> float:
        t1, t2 = self._parse_ts(ts1), self._parse_ts(ts2)
        if t1 and t2:
            return abs((t2 - t1).total_seconds() / 60)
        return 9999
