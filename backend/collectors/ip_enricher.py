"""
IP Intelligence Enricher — ip-api.com + SQLite cache.
"""

import requests
import sqlite3
import json
import time
import ipaddress
import dataclasses
from datetime import datetime, timedelta
from dataclasses import dataclass
from backend.config import IP_API_URL, IP_API_BATCH_URL, DATABASE_PATH

HIGH_RISK_COUNTRIES = {'CN': 'China', 'RU': 'Russia', 'KP': 'North Korea', 'IR': 'Iran', 'BY': 'Belarus', 'SY': 'Syria'}
MEDIUM_RISK_COUNTRIES = {'NG': 'Nigeria', 'BR': 'Brazil', 'RO': 'Romania', 'UA': 'Ukraine', 'IN': 'India', 'VN': 'Vietnam'}
COUNTRY_FLAGS = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CN': '🇨🇳', 'RU': '🇷🇺', 'KP': '🇰🇵',
    'IN': '🇮🇳', 'DE': '🇩🇪', 'FR': '🇫🇷', 'BR': '🇧🇷', 'AU': '🇦🇺',
    'JP': '🇯🇵', 'CA': '🇨🇦', 'IR': '🇮🇷', 'NG': '🇳🇬', 'UA': '🇺🇦',
}


@dataclass
class IPInfo:
    ip: str
    country: str
    country_code: str
    region: str
    city: str
    isp: str
    org: str
    asn: str
    lat: float
    lon: float
    timezone: str
    is_proxy: bool
    is_hosting: bool
    threat_level: str
    threat_reasons: list
    flag_emoji: str
    cached_at: str


class IPEnricher:
    def __init__(self, db_path=DATABASE_PATH):
        self.db_path = db_path
        self.cache_ttl_hours = 24
        self._rate_limit_delay = 1.5
        self._last_request = 0
        self._init_cache()

    def _init_cache(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute('''CREATE TABLE IF NOT EXISTS ip_cache (
            ip TEXT PRIMARY KEY, data TEXT, cached_at TEXT
        )''')
        conn.commit()
        conn.close()

    def enrich(self, ip: str) -> IPInfo:
        if self._is_private(ip):
            return self._private_info(ip)
        cached = self._get_cached(ip)
        if cached:
            return cached
        elapsed = time.time() - self._last_request
        if elapsed < self._rate_limit_delay:
            time.sleep(self._rate_limit_delay - elapsed)
        try:
            url = f'{IP_API_URL}/{ip}?fields=status,country,countryCode,region,city,isp,org,as,lat,lon,timezone,proxy,hosting,query'
            resp = requests.get(url, timeout=5)
            self._last_request = time.time()
            data = resp.json()
            if data.get('status') != 'success':
                
                
                
                
                return self._unknown_info(ip)
            info = self._build_info(ip, data)
            self._save_cache(ip, info)
            return info
        except Exception:
            return self._unknown_info(ip)

    def enrich_batch(self, ips: list) -> dict:
        """Enrich a list of IPs — checks cache first, batches uncached ones."""
        unique_ips = list(set(ip for ip in ips if ip and not self._is_private(ip)))
        results = {}
        uncached = []
        for ip in unique_ips:
            cached = self._get_cached(ip)
            if cached:
                results[ip] = cached
            else:
                uncached.append(ip)
        if uncached:
            try:
                resp = requests.post(
                    f'{IP_API_BATCH_URL}?fields=status,query,country,countryCode,region,city,isp,org,as,lat,lon,timezone,proxy,hosting',
                    json=[{'query': ip} for ip in uncached[:100]],
                    timeout=10,
                )
                self._last_request = time.time()
                for item in resp.json():
                    if item.get('status') == 'success':
                        ip = item.get('query', '')
                        info = self._build_info(ip, item)
                        self._save_cache(ip, info)
                        results[ip] = info
            except Exception:
                # Fallback: enrich individually
                for ip in uncached:
                    results[ip] = self.enrich(ip)
        # Add private IPs back
        for ip in ips:
            if ip and self._is_private(ip):
                results[ip] = self._private_info(ip)
        return results

    def _build_info(self, ip: str, data: dict) -> IPInfo:
        threat_reasons = []
        threat_level = 'SAFE'
        cc = data.get('countryCode', '')
        if data.get('proxy'):
            threat_reasons.append('VPN/Proxy detected')
            threat_level = 'MEDIUM'
        if data.get('hosting'):
            threat_reasons.append('Datacenter/hosting provider (attacker infrastructure)')
            threat_level = 'MEDIUM'
        if cc in HIGH_RISK_COUNTRIES:
            threat_reasons.append(f'High-risk origin: {HIGH_RISK_COUNTRIES[cc]}')
            threat_level = 'HIGH'
        elif cc in MEDIUM_RISK_COUNTRIES and threat_level == 'SAFE':
            threat_reasons.append(f'Medium-risk origin: {MEDIUM_RISK_COUNTRIES[cc]}')
            threat_level = 'MEDIUM'
        return IPInfo(
            ip=ip, country=data.get('country', 'Unknown'), country_code=cc,
            region=data.get('region', ''), city=data.get('city', 'Unknown'),
            isp=data.get('isp', 'Unknown'), org=data.get('org', ''),
            asn=data.get('as', ''), lat=data.get('lat', 0.0), lon=data.get('lon', 0.0),
            timezone=data.get('timezone', ''), is_proxy=data.get('proxy', False),
            is_hosting=data.get('hosting', False), threat_level=threat_level,
            threat_reasons=threat_reasons,
            flag_emoji=COUNTRY_FLAGS.get(cc, '🌐'),
            cached_at=datetime.now().isoformat(),
        )

    def _is_private(self, ip: str) -> bool:
        try:
            return ipaddress.ip_address(ip).is_private
        except Exception:
            return False

    def _get_cached(self, ip: str):
        try:
            conn = sqlite3.connect(self.db_path)
            row = conn.execute('SELECT data, cached_at FROM ip_cache WHERE ip=?', (ip,)).fetchone()
            conn.close()
            if row:
                cached_at = datetime.fromisoformat(row[1])
                if datetime.now() - cached_at < timedelta(hours=self.cache_ttl_hours):
                    d = json.loads(row[0])
                    return IPInfo(**d)
        except Exception:
            pass
        return None

    def _save_cache(self, ip: str, info: IPInfo):
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute('INSERT OR REPLACE INTO ip_cache VALUES (?,?,?)',
                         (ip, json.dumps(dataclasses.asdict(info)), info.cached_at))
            conn.commit()
            conn.close()
        except Exception:
            pass

    def _private_info(self, ip: str) -> IPInfo:
        return IPInfo(ip=ip, country='Private Network', country_code='LAN', region='',
                      city='Internal', isp='Local Network', org='', asn='', lat=0, lon=0,
                      timezone='', is_proxy=False, is_hosting=False, threat_level='LOW',
                      threat_reasons=['Internal IP — monitor for lateral movement'],
                      flag_emoji='🏠', cached_at=datetime.now().isoformat())

    def _unknown_info(self, ip: str) -> IPInfo:
        return IPInfo(ip=ip, country='Unknown', country_code='??', region='', city='Unknown',
                      isp='Unknown', org='', asn='', lat=0, lon=0, timezone='',
                      is_proxy=False, is_hosting=False, threat_level='MEDIUM',
                      threat_reasons=['Unable to resolve IP intelligence'],
                      flag_emoji='❓', cached_at=datetime.now().isoformat())
