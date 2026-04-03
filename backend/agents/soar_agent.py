"""
SOAR Agent — Response playbooks for each threat type.
"""

PLAYBOOKS = {
    'brute_force': {
        'name': 'Brute Force Response',
        'sla_minutes': 15,
        'escalate_to': 'SOC Lead / Network Team',
        'steps': [
            'Block source IP at Windows Firewall: netsh advfirewall firewall add rule name="Block Attacker" dir=in action=block remoteip=<IP>',
            'Check if any attempt succeeded — search Event ID 4624 from same IP in same timeframe',
            'Enable account lockout policy: 5 attempts, 30-minute lockout window',
            'Alert targeted account owner via out-of-band channel (phone/SMS)',
            'Preserve event log export before any system changes',
            'Escalate to SOC Lead if admin account was targeted',
        ],
    },
    'account_lockout': {
        'name': 'Account Lockout / Password Spray Response',
        'sla_minutes': 30,
        'escalate_to': 'Identity & Access Management Team',
        'steps': [
            'Reset credentials for affected account immediately',
            'Verify with account owner via secondary channel — confirm no legitimate access',
            'Check for insider threat indicators — review recent activity from this account',
            'Audit all accounts targeted in the spray — check for successful logins',
            'Enable MFA for all targeted accounts',
        ],
    },
    'geo_anomaly': {
        'name': 'Geographic Anomaly Response',
        'sla_minutes': 20,
        'escalate_to': 'SOC Analyst / Account Owner',
        'steps': [
            'Force MFA re-authentication for the affected account',
            'Notify account owner via out-of-band channel — confirm if travel is legitimate',
            'Review all session activity from the foreign IP in the last 48 hours',
            'If unconfirmed — disable account and preserve session logs',
            'Block the foreign IP range at perimeter firewall if confirmed malicious',
        ],
    },
    'impossible_travel': {
        'name': 'Impossible Travel — CRITICAL Response',
        'sla_minutes': 10,
        'escalate_to': 'CISO / Incident Response Team',
        'steps': [
            'IMMEDIATE: Disable the affected account — do not wait for confirmation',
            'Preserve memory dump and all session logs from both login locations',
            'Escalate to IR team — this is a confirmed account compromise indicator',
            'Identify all actions taken during both sessions — check for data exfiltration',
            'Notify account owner and HR — initiate credential reset across all systems',
            'Review for lateral movement from both source IPs',
        ],
    },
    'log_tampering': {
        'name': 'Audit Log Cleared — CRITICAL Response',
        'sla_minutes': 5,
        'escalate_to': 'CISO / DFIR Team',
        'steps': [
            'CRITICAL: Immediately isolate the affected system from the network',
            'Preserve memory dump before any changes — attacker may still be active',
            'Escalate to DFIR team — log clearing indicates active intrusion cover-up',
            'Retrieve backup logs from SIEM or remote log server if available',
            'Identify who cleared the log (Event 1102 contains the account)',
            'Initiate full forensic investigation — assume full system compromise',
        ],
    },
    'privilege_escalation': {
        'name': 'Privilege Escalation Response',
        'sla_minutes': 20,
        'escalate_to': 'SOC Lead / IT Admin',
        'steps': [
            'Review the newly created account — verify with HR/IT if legitimate',
            'Remove elevated privileges immediately if unauthorized',
            'Audit all group membership changes in the last 24 hours',
            'Check for persistence mechanisms — scheduled tasks, registry run keys',
            'Disable the account pending investigation',
        ],
    },
    'persistence': {
        'name': 'Persistence Mechanism Response',
        'sla_minutes': 30,
        'escalate_to': 'SOC Analyst',
        'steps': [
            'Review the scheduled task details — identify the command/script it runs',
            'Verify with system owner if the task is legitimate',
            'Delete the task if unauthorized: schtasks /delete /tn "<TaskName>" /f',
            'Check for other persistence: registry run keys, startup folder, services',
            'Scan the system with AV/EDR for associated malware',
        ],
    },
    'mass_account_ops': {
        'name': 'Mass Account Operations Response',
        'sla_minutes': 15,
        'escalate_to': 'IT Admin / HR',
        'steps': [
            'Audit all recently created/modified accounts — cross-reference with HR records',
            'Disable all unauthorized accounts immediately',
            'Identify the source account performing the operations',
            'Check for insider threat indicators — review the operator\'s recent activity',
            'Escalate to HR if an employee account is involved',
        ],
    },
}


class SOARAgent:
    def get_playbook(self, playbook_key: str) -> dict:
        return PLAYBOOKS.get(playbook_key, {})

    def get_response_plan_dict(self, playbook_key: str) -> dict:
        return self.get_playbook(playbook_key)

    def list_playbooks(self) -> list:
        return [{'key': k, 'name': v['name'], 'sla_minutes': v['sla_minutes']} for k, v in PLAYBOOKS.items()]
