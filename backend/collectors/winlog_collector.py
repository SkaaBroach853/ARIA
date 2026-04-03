"""
Windows Event Log Collector
Reads real security events from Windows Event Log using pywin32.
Falls back to mock data gracefully if pywin32 unavailable or no admin rights.
"""

import threading
import queue
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional

# Try importing pywin32 — graceful fallback for dev on non-Windows
try:
    import win32evtlog
    import win32evtlogutil
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False

EVENT_MAP = {
    4624: ('LOGIN_SUCCESS', 'INFO'),
    4625: ('LOGIN_FAIL', 'MEDIUM'),
    4634: ('LOGOUT', 'INFO'),
    4648: ('EXPLICIT_CREDENTIALS', 'MEDIUM'),
    4672: ('PRIVILEGE_ASSIGN', 'MEDIUM'),
    4688: ('PROCESS_CREATE', 'INFO'),
    4698: ('SCHEDULED_TASK_CREATE', 'HIGH'),
    4720: ('ACCOUNT_CREATE', 'HIGH'),
    4728: ('GROUP_MEMBER_ADD', 'HIGH'),
    4732: ('LOCAL_GROUP_ADD', 'HIGH'),
    4756: ('UNIVERSAL_GROUP_ADD', 'HIGH'),
    4776: ('CREDENTIAL_VALIDATE', 'LOW'),
    4768: ('KERBEROS_REQUEST', 'INFO'),
    4769: ('KERBEROS_SERVICE', 'INFO'),
    4771: ('KERBEROS_FAIL', 'MEDIUM'),
    4946: ('FIREWALL_RULE_ADD', 'HIGH'),
    5140: ('NETWORK_SHARE_ACCESS', 'MEDIUM'),
    5156: ('NETWORK_CONN_ALLOWED', 'INFO'),
    5158: ('NETWORK_BIND', 'INFO'),
    1102: ('AUDIT_LOG_CLEARED', 'HIGH'),
    4670: ('PERMISSION_CHANGED', 'HIGH'),
}

LOGON_TYPES = {
    '2': 'Interactive', '3': 'Network', '4': 'Batch',
    '5': 'Service', '7': 'Unlock', '8': 'NetworkCleartext',
    '9': 'NewCredentials', '10': 'RemoteInteractive', '11': 'CachedInteractive',
}


@dataclass
class SecurityEvent:
    event_id: int
    timestamp: str
    source: str
    category: str
    event_type: str
    username: str
    src_ip: str
    workstation: str
    logon_type: str
    failure_reason: str
    process_name: str
    raw_message: str
    severity: str

    def to_dict(self):
        return asdict(self)


class WindowsEventLogCollector:
    def __init__(self):
        self.server = None
        self._running = False
        self._lock = threading.Lock()

    def get_recent_events(self, hours: int = 24,
                          event_ids: list = None,
                          log_name: str = 'Security') -> list:
        if not WIN32_AVAILABLE:
            return self._mock_events(hours, event_ids)
        events = []
        try:
            hand = win32evtlog.OpenEventLog(self.server, log_name)
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            cutoff = datetime.now() - timedelta(hours=hours)
            while True:
                raw_events = win32evtlog.ReadEventLog(hand, flags, 0)
                if not raw_events:
                    break
                for ev in raw_events:
                    ev_time = ev.TimeGenerated.replace(tzinfo=None)
                    if ev_time < cutoff:
                        break
                    if event_ids and (ev.EventID & 0xFFFF) not in event_ids:
                        continue
                    parsed = self._parse_event(ev)
                    if parsed:
                        events.append(parsed)
            win32evtlog.CloseEventLog(hand)
        except Exception:
            pass
        return events

    def _parse_event(self, ev) -> Optional[SecurityEvent]:
        try:
            event_id = ev.EventID & 0xFFFF
            ev_type, severity = EVENT_MAP.get(event_id, ('UNKNOWN', 'INFO'))
            msg = ''
            try:
                msg = win32evtlogutil.SafeFormatMessage(ev, ev.SourceName)
            except Exception:
                pass
            username = self._extract_field(msg, ['Account Name:', 'Subject Account Name:'])
            src_ip = self._extract_ip(msg)
            workstation = self._extract_field(msg, ['Workstation Name:', 'Source Workstation:'])
            logon_type_num = self._extract_field(msg, ['Logon Type:'])
            logon_type = LOGON_TYPES.get((logon_type_num or '').strip(), 'Unknown')
            failure_reason = self._extract_field(msg, ['Failure Reason:', 'Sub Status:'])
            process_name = self._extract_field(msg, ['Process Name:', 'New Process Name:'])
            if event_id == 4625 and 'administrator' in (username or '').lower():
                severity = 'HIGH'
            if event_id == 1102:
                severity = 'HIGH'
            return SecurityEvent(
                event_id=event_id,
                timestamp=ev.TimeGenerated.Format(),
                source=ev.SourceName,
                category=ev.EventCategory,
                event_type=ev_type,
                username=username or '',
                src_ip=src_ip or '',
                workstation=workstation or '',
                logon_type=logon_type,
                failure_reason=failure_reason or '',
                process_name=process_name or '',
                raw_message=msg[:500] if msg else '',
                severity=severity,
            )
        except Exception:
            return None

    def _extract_ip(self, msg: str) -> str:
        import re
        pattern = r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'
        ips = re.findall(pattern, msg or '')
        for ip in ips:
            if not ip.startswith(('127.', '0.', '255.')):
                return ip
        return ips[0] if ips else ''

    def _extract_field(self, msg: str, labels: list) -> str:
        if not msg:
            return ''
        for label in labels:
            if label in msg:
                idx = msg.index(label) + len(label)
                rest = msg[idx:].strip()
                value = rest.split('\n')[0].split('\r')[0].strip()
                if value and value != '-':
                    return value[:100]
        return ''

    def start_live_collection(self, callback_fn):
        """Background thread watching Security log for new events."""
        self._running = True
        def _watch():
            if not WIN32_AVAILABLE:
                return
            try:
                hand = win32evtlog.OpenEventLog(None, 'Security')
                old_count = win32evtlog.GetNumberOfEventLogRecords(hand)
                win32evtlog.CloseEventLog(hand)
                while self._running:
                    try:
                        hand = win32evtlog.OpenEventLog(None, 'Security')
                        new_count = win32evtlog.GetNumberOfEventLogRecords(hand)
                        if new_count > old_count:
                            flags = win32evtlog.EVENTLOG_FORWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
                            evs = win32evtlog.ReadEventLog(hand, flags, 0)
                            for ev in (evs or []):
                                parsed = self._parse_event(ev)
                                if parsed:
                                    callback_fn(parsed)
                            old_count = new_count
                        win32evtlog.CloseEventLog(hand)
                    except Exception:
                        pass
                    time.sleep(2)
            except Exception:
                pass
        t = threading.Thread(target=_watch, daemon=True)
        t.start()
        return t

    def get_login_failures(self, hours: int = 24) -> list:
        return self.get_recent_events(hours=hours, event_ids=[4625])

    def get_successful_logins(self, hours: int = 24) -> list:
        return self.get_recent_events(hours=hours, event_ids=[4624])

    def get_critical_events(self, hours: int = 24) -> list:
        return self.get_recent_events(hours=hours, event_ids=[1102, 4698, 4720, 4728, 4732, 4756, 4946, 4670])

    def get_all_security_events(self, hours: int = 24) -> list:
        return self.get_recent_events(hours=hours, log_name='Security')

    def get_summary_stats(self) -> dict:
        events_24h = self.get_all_security_events(hours=24)
        failures = [e for e in events_24h if e.event_id == 4625]
        successes = [e for e in events_24h if e.event_id == 4624]
        critical = [e for e in events_24h if e.severity == 'HIGH']
        fail_ips = {}
        for e in failures:
            if e.src_ip:
                fail_ips[e.src_ip] = fail_ips.get(e.src_ip, 0) + 1
        return {
            'total_events_24h': len(events_24h),
            'login_failures_24h': len(failures),
            'login_success_24h': len(successes),
            'high_severity_24h': len(critical),
            'unique_attacker_ips': len([ip for ip, cnt in fail_ips.items() if cnt >= 3]),
            'top_failing_ips': sorted(fail_ips.items(), key=lambda x: x[1], reverse=True)[:10],
        }

    # ── Mock data fallback (dev / no admin rights) ──────────────────────────

    def _mock_events(self, hours: int, event_ids: list = None) -> list:
        """Returns realistic mock events for development/demo."""
        from datetime import datetime, timedelta
        import random
        now = datetime.now()
        mock_ips = ['185.220.101.5', '45.33.32.156', '192.168.1.105', '10.0.0.22']
        mock_users = ['administrator', 'jsmith', 'svc_backup', 'guest']
        mock_raw = [
            SecurityEvent(4625, (now - timedelta(minutes=i*3)).strftime('%a %b %d %H:%M:%S %Y'),
                          'Microsoft-Windows-Security-Auditing', 12544, 'LOGIN_FAIL',
                          random.choice(mock_users), random.choice(mock_ips[:2]),
                          'WORKSTATION-01', 'Network', 'Unknown user name or bad password',
                          '', '', 'MEDIUM')
            for i in range(25)
        ] + [
            SecurityEvent(4624, (now - timedelta(hours=2)).strftime('%a %b %d %H:%M:%S %Y'),
                          'Microsoft-Windows-Security-Auditing', 12544, 'LOGIN_SUCCESS',
                          'jsmith', '192.168.1.105', 'WORKSTATION-01', 'Interactive',
                          '', '', '', 'INFO'),
            SecurityEvent(1102, (now - timedelta(hours=1)).strftime('%a %b %d %H:%M:%S %Y'),
                          'Microsoft-Windows-Security-Auditing', 104, 'AUDIT_LOG_CLEARED',
                          'administrator', '', 'WORKSTATION-01', '', '', '', '', 'HIGH'),
            SecurityEvent(4698, (now - timedelta(minutes=45)).strftime('%a %b %d %H:%M:%S %Y'),
                          'Microsoft-Windows-Security-Auditing', 12804, 'SCHEDULED_TASK_CREATE',
                          'svc_backup', '', 'WORKSTATION-01', '', '', 'svchost.exe', '', 'HIGH'),
        ]
        if event_ids:
            return [e for e in mock_raw if e.event_id in event_ids]
        return mock_raw
