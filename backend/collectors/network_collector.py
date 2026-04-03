"""
Real-time network connection monitor using psutil.
"""

import psutil
import socket
import ipaddress
from datetime import datetime
from dataclasses import dataclass, asdict

SUSPICIOUS_PORTS = {
    4444: 'Metasploit default', 1337: 'Common backdoor',
    31337: 'Elite hacker port', 6666: 'Common trojan',
    6667: 'IRC C2', 12345: 'NetBus trojan', 27374: 'Sub7 trojan',
}

KNOWN_SAFE_PROCESSES = {
    'chrome.exe', 'firefox.exe', 'msedge.exe', 'svchost.exe',
    'services.exe', 'lsass.exe', 'winlogon.exe', 'explorer.exe',
    'python.exe', 'pythonw.exe', 'node.exe',
}


@dataclass
class NetworkConnection:
    timestamp: str
    pid: int
    process_name: str
    local_ip: str
    local_port: int
    remote_ip: str
    remote_port: int
    status: str
    protocol: str
    is_external: bool
    is_suspicious: bool
    suspicion_reason: str

    def to_dict(self):
        return asdict(self)


class NetworkCollector:
    def get_live_connections(self) -> list:
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                if not conn.raddr:
                    continue
                remote_ip = conn.raddr.ip
                remote_port = conn.raddr.port
                proc_name = 'unknown'
                try:
                    proc_name = psutil.Process(conn.pid).name() if conn.pid else 'unknown'
                except Exception:
                    pass
                is_external = not self._is_private_ip(remote_ip)
                is_suspicious, reason = self._check_suspicious(remote_ip, remote_port, proc_name)
                connections.append(NetworkConnection(
                    timestamp=datetime.now().isoformat(),
                    pid=conn.pid or 0,
                    process_name=proc_name,
                    local_ip=conn.laddr.ip,
                    local_port=conn.laddr.port,
                    remote_ip=remote_ip,
                    remote_port=remote_port,
                    status=conn.status,
                    protocol='TCP' if conn.type == socket.SOCK_STREAM else 'UDP',
                    is_external=is_external,
                    is_suspicious=is_suspicious,
                    suspicion_reason=reason,
                ))
        except Exception:
            pass
        return connections

    def _is_private_ip(self, ip: str) -> bool:
        try:
            return ipaddress.ip_address(ip).is_private
        except Exception:
            return False

    def _check_suspicious(self, ip: str, port: int, proc: str) -> tuple:
        if port in SUSPICIOUS_PORTS:
            return True, f'Suspicious port: {SUSPICIOUS_PORTS[port]}'
        if port > 49000 and proc.lower() not in KNOWN_SAFE_PROCESSES:
            return True, f'High ephemeral port from untrusted process: {proc}'
        return False, ''

    def get_external_connections(self) -> list:
        return [c for c in self.get_live_connections() if c.is_external]

    def get_suspicious_connections(self) -> list:
        return [c for c in self.get_live_connections() if c.is_suspicious]

    def get_port_scan_candidates(self) -> list:
        conns = self.get_live_connections()
        ip_ports = {}
        for c in conns:
            ip_ports.setdefault(c.remote_ip, set()).add(c.local_port)
        return [(ip, ports) for ip, ports in ip_ports.items() if len(ports) >= 5]
