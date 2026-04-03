"""
Attack Simulation Engine — injects synthetic SecurityEvents for demo/training.
3 scenarios: brute_force, impossible_travel, log_tampering.
"""

from datetime import datetime, timedelta
from collectors.winlog_collector import SecurityEvent

_now = datetime.now


def _ts(offset_minutes: int = 0) -> str:
    return (_now() - timedelta(minutes=offset_minutes)).strftime('%a %b %d %H:%M:%S %Y')


SCENARIOS = {
    'brute_force': {
        'name': 'Brute Force Attack',
        'description': 'Simulates 20 failed login attempts from a Tor exit node targeting the administrator account',
        'events': [
            SecurityEvent(4625, _ts(60 - i * 2), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_FAIL', 'administrator', '185.220.101.5',
                          'WORKSTATION-01', 'Network', 'Unknown user name or bad password', '', '', 'MEDIUM')
            for i in range(20)
        ] + [
            SecurityEvent(4625, _ts(10), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_FAIL', 'jsmith', '185.220.101.5',
                          'WORKSTATION-01', 'Network', 'Unknown user name or bad password', '', '', 'HIGH')
        ],
    },
    'impossible_travel': {
        'name': 'Impossible Travel',
        'description': 'Simulates same user logging in from Russia and USA within 30 minutes',
        'events': [
            SecurityEvent(4624, _ts(35), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_SUCCESS', 'ceo_user', '185.234.218.100',
                          'WORKSTATION-CEO', 'Network', '', '', '', 'INFO'),
            SecurityEvent(4624, _ts(5), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_SUCCESS', 'ceo_user', '104.21.45.67',
                          'WORKSTATION-CEO', 'Network', '', '', '', 'INFO'),
        ],
    },
    'log_tampering': {
        'name': 'Audit Log Cleared',
        'description': 'Simulates an attacker clearing the Windows Security Event Log to cover tracks',
        'events': [
            SecurityEvent(4625, _ts(90), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_FAIL', 'administrator', '45.33.32.156',
                          'SERVER-01', 'Network', 'Unknown user name or bad password', '', '', 'MEDIUM'),
            SecurityEvent(4624, _ts(60), 'Microsoft-Windows-Security-Auditing', 12544,
                          'LOGIN_SUCCESS', 'administrator', '45.33.32.156',
                          'SERVER-01', 'Network', '', '', '', 'INFO'),
            SecurityEvent(4698, _ts(45), 'Microsoft-Windows-Security-Auditing', 12804,
                          'SCHEDULED_TASK_CREATE', 'administrator', '45.33.32.156',
                          'SERVER-01', '', '', 'cmd.exe', '', 'HIGH'),
            SecurityEvent(1102, _ts(30), 'Microsoft-Windows-Security-Auditing', 104,
                          'AUDIT_LOG_CLEARED', 'administrator', '',
                          'SERVER-01', '', '', '', '', 'HIGH'),
        ],
    },
}


class AttackSimulator:
    def __init__(self):
        self._active_scenario = None
        self._injected_events = []

    def inject(self, scenario_key: str) -> dict:
        """Inject a scenario's events into the pipeline."""
        scenario = SCENARIOS.get(scenario_key)
        if not scenario:
            return {'error': f'Unknown scenario: {scenario_key}'}
        self._active_scenario = scenario_key
        self._injected_events = scenario['events']
        return {
            'scenario': scenario_key,
            'name': scenario['name'],
            'description': scenario['description'],
            'event_count': len(scenario['events']),
            'injected': True,
        }

    def get_injected_events(self) -> list:
        return self._injected_events

    def clear(self):
        self._active_scenario = None
        self._injected_events = []

    def list_scenarios(self) -> list:
        return [{'key': k, 'name': v['name'], 'description': v['description'], 'event_count': len(v['events'])}
                for k, v in SCENARIOS.items()]
