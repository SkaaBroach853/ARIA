import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, LayoutDashboard, AlertTriangle, Clock,
  List, FileText, Settings, Shield, LogOut, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import socket from '../../api/socket'

const NAV = [
  { to: '/chat',      icon: MessageSquare,   label: 'AI Analyst',   perm: 'chat',      activeColor: '#00d4ff' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    perm: 'dashboard', activeColor: '#8b5cf6' },
  { to: '/threats',   icon: AlertTriangle,   label: 'Live Threats', perm: 'threats',   activeColor: '#ef4444' },
  { to: '/timeline',  icon: Clock,           label: 'Timeline',     perm: 'timeline',  activeColor: '#f59e0b' },
  { to: '/logs',      icon: List,            label: 'Event Logs',   perm: 'logs',      activeColor: '#10b981' },
  { to: '/report',    icon: FileText,        label: 'Reports',      perm: 'report',    activeColor: '#00d4ff' },
  { to: '/admin',     icon: Settings,        label: 'Admin',        perm: 'admin',     activeColor: '#f59e0b' },
]

const ROLE_STYLE = {
  admin:   { color: '#c084fc', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' },
  analyst: { color: '#00d4ff', background: 'rgba(0,212,255,0.12)',  border: '1px solid rgba(0,212,255,0.25)' },
  manager: { color: '#fbbf24', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' },
  viewer:  { color: '#9ca3af', background: 'rgba(107,114,128,0.15)',border: '1px solid rgba(107,114,128,0.3)' },
}

const s = {
  sidebar: {
    width: '220px', minWidth: '220px', maxWidth: '220px',
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0d1221', borderRight: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0, position: 'relative', overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
  },
  logoWrap: { padding: '20px 20px 12px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  onlineDot: {
    position: 'absolute', top: -3, right: -3,
    width: 8, height: 8, borderRadius: '50%',
    background: '#10b981', border: '2px solid #0d1221',
  },
  logoTitle: { fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' },
  logoSub: { fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 1 },
  divider: { margin: '0 16px 8px', height: 1, background: 'rgba(255,255,255,0.04)' },
  nav: { flex: 1, overflowY: 'auto', padding: '0 8px' },
  navLink: (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 8, marginBottom: 2,
    fontSize: 13, cursor: 'pointer', position: 'relative',
    textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
    background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
    color: isActive ? '#e2e8f0' : '#6b7280',
    fontWeight: isActive ? 500 : 400,
  }),
  activeBar: {
    position: 'absolute', left: 0, top: 4, bottom: 4,
    width: 2, borderRadius: '0 2px 2px 0', background: '#00d4ff',
  },
  threatToast: {
    margin: '0 10px 8px', padding: '10px 12px',
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8,
  },
  threatToastLabel: { fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 },
  threatToastText: { fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pulse: {
    margin: '0 10px 8px', padding: '10px 12px',
    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
  },
  pulseDot: { width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 },
  pulseLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' },
  pulseValue: { fontSize: 12, color: '#ef4444', fontWeight: 500, fontFamily: 'monospace' },
  statusWrap: { padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: (on) => ({ width: 6, height: 6, borderRadius: '50%', background: on ? '#10b981' : '#ef4444' }),
  statusLabel: { fontSize: 11, color: '#4b5563' },
  statusVal: (on) => ({ fontSize: 10, fontFamily: 'monospace', color: on ? '#10b981' : '#ef4444' }),
  userWrap: { padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#00d4ff', flexShrink: 0,
  },
  userName: { fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: (role) => ({
    fontSize: 10, padding: '1px 6px', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
    display: 'inline-block', marginTop: 2,
    ...(ROLE_STYLE[role] || ROLE_STYLE.viewer),
  }),
  logoutBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4, borderRadius: 4, flexShrink: 0 },
  badge: {
    marginLeft: 'auto', background: '#ef4444', color: '#fff',
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
    fontFamily: 'monospace', minWidth: 18, textAlign: 'center',
  },
}

export default function Sidebar({ ollamaConnected, threatCount }) {
  const { user, hasPermission, logout } = useAuth()
  const [liveCount, setLiveCount] = useState(threatCount || 0)
  const [recentThreat, setRecentThreat] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    socket.on('threat_detected', (data) => {
      setLiveCount(c => c + 1)
      setRecentThreat(data)
      setTimeout(() => setRecentThreat(null), 4000)
    })
    return () => socket.off('threat_detected')
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.topGlow} />

      {/* Logo */}
      <div style={s.logoWrap}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <Shield size={16} color="#00d4ff" />
            <div style={s.onlineDot} />
          </div>
          <div>
            <div style={s.logoTitle}>CyberGuard</div>
            <div style={s.logoSub}>SOC Co-Pilot</div>
          </div>
        </div>
      </div>

      <div style={s.divider} />

      {/* Nav */}
      <nav style={s.nav}>
        {NAV.filter(n => hasPermission(n.perm)).map(({ to, icon: Icon, label, activeColor }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={s.navLink(isActive)}>
                {isActive && <div style={s.activeBar} />}
                <Icon size={14} color={isActive ? activeColor : '#4b5563'} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {label === 'Live Threats' && liveCount > 0 && (
                  <motion.span key={liveCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }} style={s.badge}>
                    {liveCount}
                  </motion.span>
                )}
                {isActive && <ChevronRight size={12} color="#00d4ff" style={{ opacity: 0.5 }} />}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Live threat toast */}
      <AnimatePresence>
        {recentThreat && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={s.threatToast}
          >
            <div style={s.threatToastLabel}>⚡ New Threat</div>
            <div style={s.threatToastText}>{recentThreat.rule_name || 'Threat detected'}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Threat Pulse */}
      <div style={s.pulse}>
        <div style={s.pulseDot} className="pulse-ring" />
        <div>
          <div style={s.pulseLabel}>Threat Pulse</div>
          <div style={s.pulseValue}>{liveCount > 0 ? `${liveCount} active` : 'Scanning...'}</div>
        </div>
      </div>

      {/* System Status */}
      <div style={s.statusWrap}>
        <div style={s.statusRow}>
          <div style={s.statusLeft}>
            <div style={s.statusDot(ollamaConnected)} className="glow-pulse" />
            <span style={s.statusLabel}>Ollama LLM</span>
          </div>
          <span style={s.statusVal(ollamaConnected)}>{ollamaConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <div style={s.statusRow}>
          <div style={s.statusLeft}>
            <div style={s.statusDot(true)} className="glow-pulse" />
            <span style={s.statusLabel}>Event Log</span>
          </div>
          <span style={s.statusVal(true)}>LIVE</span>
        </div>
      </div>

      {/* User */}
      {user && (
        <div style={s.userWrap}>
          <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>{user.name}</div>
            <span style={s.roleBadge(user.role)}>{user.role}</span>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} title="Sign out">
            <LogOut size={13} color="#4b5563" />
          </button>
        </div>
      )}
    </aside>
  )
}
