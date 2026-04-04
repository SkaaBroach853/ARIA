/**
 * Live Monitor
 * ✅ Pause state is global (survives tab navigation) via monitorStore
 * ✅ WebSocket disconnects when paused, reconnects on resume
 * ✅ Generate Report button for both tabs
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  SignalIcon, MapPinIcon, GlobeAltIcon,
  PauseIcon, PlayIcon, ArrowPathIcon,
  ComputerDesktopIcon, ShieldExclamationIcon,
  MagnifyingGlassIcon, DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '../store/notificationStore'
import { useMonitorStore } from '../store/monitorStore'
import toast from 'react-hot-toast'

const SEV = {
  critical: { bar: 'border-l-red-500',     badge: 'pill-critical', dot: 'bg-red-500',     text: 'text-red-400',     label: 'Critical' },
  high:     { bar: 'border-l-orange-500',  badge: 'pill-high',     dot: 'bg-orange-500',  text: 'text-orange-400',  label: 'High' },
  medium:   { bar: 'border-l-yellow-500',  badge: 'pill-medium',   dot: 'bg-yellow-500',  text: 'text-yellow-400',  label: 'Medium' },
  low:      { bar: 'border-l-emerald-500', badge: 'pill-low',      dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Low' },
}

const WsBadge = ({ status, paused }) => (
  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
    paused
      ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
      : status === 'connected'
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : status === 'connecting'
      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      : 'bg-red-500/10 border-red-500/20 text-red-400'
  }`}>
    <div className={`w-1.5 h-1.5 rounded-full ${
      paused ? 'bg-slate-400' :
      status === 'connected' ? 'bg-emerald-400 animate-pulse' :
      status === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
    }`} />
    {paused ? 'Paused' : status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
  </div>
)

const GeoCard = ({ ip }) => {
  const isPrivate = !ip || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')
  const { data, isLoading } = useQuery({
    queryKey: ['geo', ip],
    queryFn: async () => (await fetch(`https://ipinfo.io/${ip}/json?token=48a4fbd840e569`)).json(),
    enabled: !isPrivate,
    staleTime: 3_600_000,
    retry: false,
  })
  if (isPrivate) return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <GlobeAltIcon className="w-3.5 h-3.5" /><span className="mono">{ip}</span><span className="text-slate-600">· Internal</span>
    </div>
  )
  if (isLoading) return <span className="text-xs text-slate-500 mono animate-pulse">{ip} · locating…</span>
  if (!data || data.bogon) return <span className="text-xs text-slate-400 mono">{ip}</span>
  return (
    <div className="mt-2 p-2.5 bg-[#0d1424] border border-[#1e2d45] rounded-lg">
      <div className="flex items-center gap-1.5 mb-2">
        <MapPinIcon className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-xs font-medium text-sky-400">IP Intelligence</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {[['IP', data.ip], ['Location', [data.city, data.region, data.country].filter(Boolean).join(', ')], ['ISP', data.org], ['Timezone', data.timezone]]
          .map(([k, v]) => v ? (
            <div key={k}>
              <span className="text-[10px] text-slate-600 uppercase tracking-wide block">{k}</span>
              <span className="text-slate-300 mono truncate block">{v}</span>
            </div>
          ) : null)}
      </div>
    </div>
  )
}

// ── useWebSocket — disconnects when paused ────────────────────────────────────
function useWebSocket(url, onMessage, paused) {
  const [status, setStatus] = useState('connecting')
  const wsRef = useRef(null)
  const timerRef = useRef(null)
  const onMsgRef = useRef(onMessage)
  onMsgRef.current = onMessage

  useEffect(() => {
    if (paused) {
      // Disconnect when paused
      clearTimeout(timerRef.current)
      wsRef.current?.close()
      setStatus('disconnected')
      return
    }

    const connect = () => {
      try {
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onopen    = () => setStatus('connected')
        ws.onmessage = (e) => { try { onMsgRef.current(JSON.parse(e.data)) } catch {} }
        ws.onclose   = () => {
          setStatus('disconnected')
          if (!paused) timerRef.current = setTimeout(connect, 4000)
        }
        ws.onerror = () => ws.close()
      } catch {
        setStatus('disconnected')
        timerRef.current = setTimeout(connect, 4000)
      }
    }

    connect()
    return () => { clearTimeout(timerRef.current); wsRef.current?.close() }
  }, [url, paused])

  return status
}

// ── Report download helper ────────────────────────────────────────────────────
async function downloadReport(type, hours = 168) {
  try {
    const token = (() => { try { return JSON.parse(localStorage.getItem('aria-auth'))?.state?.token } catch { return null } })()
    const url = type === 'live'
      ? `http://localhost:8000/api/report/live?hours=${hours}&fmt=markdown`
      : `http://localhost:8000/api/report/live?hours=${hours}&fmt=markdown`
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aria-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Report downloaded')
  } catch (e) {
    toast.error(`Report failed: ${e.message}`)
  }
}

// ── Alert card ────────────────────────────────────────────────────────────────
const AlertCard = ({ event }) => {
  const [expanded, setExpanded] = useState(event.isNew)
  const s = SEV[event.severity] || SEV.low
  return (
    <div className={`card border-l-4 ${s.bar} p-4 ${event.isNew ? 'animate-fade-up' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot} ${event.isNew ? 'animate-pulse' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`pill ${s.badge}`}>{s.label}</span>
              <span className="pill pill-info text-[10px]">{event.data?.alert_type?.replace(/_/g, ' ') || 'Alert'}</span>
              {event.isNew && <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Live</span>}
            </div>
            <p className="text-sm text-slate-200 leading-snug">{event.data?.description || 'Security event detected'}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              {event.data?.ip_address && <span className="mono">{event.data.ip_address}</span>}
              {event.data?.confidence !== undefined && <span>{event.data.confidence}% confidence</span>}
              <span>{new Date(event.ts).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && event.data?.ip_address && <div className="mt-3 pl-5"><GeoCard ip={event.data.ip_address} /></div>}
    </div>
  )
}

// ── Log row ───────────────────────────────────────────────────────────────────
const srcColor = { login: 'text-sky-400', network: 'text-purple-400', system: 'text-emerald-400' }

const LogRow = ({ log, isNew }) => {
  const [expanded, setExpanded] = useState(false)
  const s = SEV[log.severity] || SEV.low
  return (
    <div className={`border-b border-[#1e2d45] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer ${isNew ? 'animate-fade-up' : ''}`}
      onClick={() => setExpanded(v => !v)}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot} ${isNew ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-500 mono w-20 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
        <span className={`text-xs font-medium w-14 flex-shrink-0 capitalize ${srcColor[log.source] || 'text-slate-400'}`}>{log.source}</span>
        <span className={`pill ${s.badge} flex-shrink-0`}>{s.label}</span>
        <span className="text-sm text-slate-300 flex-1 truncate">{log.message || log.event_type || '—'}</span>
        {log.ip_address && <span className="text-xs text-slate-500 mono flex-shrink-0 hidden sm:block">{log.ip_address}</span>}
        <span className="text-slate-600 text-xs flex-shrink-0">{expanded ? '▲' : '▶'}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pl-10 space-y-2">
          {log.user_id && <div className="text-xs text-slate-400">User: <span className="text-slate-200">{log.user_id}</span></div>}
          {log.ip_address && <GeoCard ip={log.ip_address} />}
          <div className="text-xs text-slate-500 mono bg-[#0d1424] p-2 rounded border border-[#1e2d45] break-all">{log.message || '—'}</div>
        </div>
      )}
    </div>
  )
}

// ── Alert Feed tab ────────────────────────────────────────────────────────────
const AlertFeed = () => {
  const { alertsPaused, toggleAlertsPaused } = useMonitorStore()
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const { addAlert } = useNotificationStore()

  const wsStatus = useWebSocket('ws://localhost:8000/ws/live', useCallback((msg) => {
    if (msg.type === 'ping') return
    if (msg.type === 'alert' && msg.data) {
      const ev = { id: Date.now() + Math.random(), type: 'alert', data: msg.data, severity: msg.data.severity || 'low', ts: new Date().toISOString(), isNew: true }
      setEvents(prev => [ev, ...prev].slice(0, 300))
      addAlert(msg.data)
      setTimeout(() => setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, isNew: false } : e)), 5000)
    }
  }, [addAlert]), alertsPaused)

  const filtered = filter === 'all' ? events : events.filter(e => e.severity === filter)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  events.forEach(e => { if (counts[e.severity] !== undefined) counts[e.severity]++ })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <WsBadge status={wsStatus} paused={alertsPaused} />
          <span className="text-sm text-slate-400">{events.length} events this session</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadReport('live')} className="btn btn-ghost text-xs">
            <DocumentArrowDownIcon className="w-4 h-4" /> Report
          </button>
          <button onClick={toggleAlertsPaused} className={`btn ${alertsPaused ? 'btn-primary' : 'btn-ghost'}`}>
            {alertsPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
            {alertsPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setEvents([])} className="btn btn-ghost">
            <ArrowPathIcon className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {['critical','high','medium','low'].map(k => {
          const s = SEV[k]
          return (
            <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
              className={`card border p-3 text-left transition-all hover:border-[#243550] ${filter === k ? 'border-current bg-current/5' : ''}`}
              style={filter === k ? { borderColor: s.dot.replace('bg-', '') } : {}}>
              <p className="text-xs text-slate-500 mb-1 capitalize">{k}</p>
              <p className={`text-2xl font-bold ${s.text}`}>{counts[k]}</p>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-slate-500">
            <ShieldExclamationIcon className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{alertsPaused ? 'Feed paused — click Resume to continue' : wsStatus === 'connected' ? 'Waiting for alerts…' : 'Connecting…'}</p>
          </div>
        ) : filtered.map(ev => <AlertCard key={ev.id} event={ev} />)}
      </div>
    </div>
  )
}

// ── Log Stream tab ────────────────────────────────────────────────────────────
const LogStream = () => {
  const { logsPaused, toggleLogsPaused } = useMonitorStore()
  const [logs, setLogs]     = useState([])
  const [search, setSearch] = useState('')
  const [srcFilter, setSrc] = useState('all')
  const [sevFilter, setSev] = useState('all')
  const [newIds, setNewIds] = useState(new Set())

  const wsStatus = useWebSocket('ws://localhost:8000/ws/logs', useCallback((msg) => {
    if (msg.type === 'ping') return
    if (msg.type === 'log' && msg.data) {
      const id = msg.data.id || Date.now() + Math.random()
      setLogs(prev => [{ ...msg.data, _id: id }, ...prev].slice(0, 500))
      setNewIds(prev => new Set([...prev, id]))
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(id); return n }), 3000)
    }
  }, []), logsPaused)

  const filtered = logs.filter(l => {
    if (srcFilter !== 'all' && l.source !== srcFilter) return false
    if (sevFilter !== 'all' && l.severity !== sevFilter) return false
    if (search && !l.message?.toLowerCase().includes(search.toLowerCase()) && !l.ip_address?.includes(search)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <WsBadge status={wsStatus} paused={logsPaused} />
          <span className="text-sm text-slate-400">{logs.length} entries buffered</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadReport('logs')} className="btn btn-ghost text-xs">
            <DocumentArrowDownIcon className="w-4 h-4" /> Report
          </button>
          <button onClick={toggleLogsPaused} className={`btn ${logsPaused ? 'btn-primary' : 'btn-ghost'}`}>
            {logsPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
            {logsPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setLogs([])} className="btn btn-ghost">
            <ArrowPathIcon className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 text-sm" placeholder="Search message, IP, user…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-32 text-sm" value={srcFilter} onChange={e => setSrc(e.target.value)}>
          {['all','login','network','system'].map(o => <option key={o} value={o}>{o === 'all' ? 'All sources' : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
        <select className="input w-32 text-sm" value={sevFilter} onChange={e => setSev(e.target.value)}>
          {['all','critical','high','medium','low'].map(o => <option key={o} value={o}>{o === 'all' ? 'All severities' : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1e2d45] bg-[#0d1424]">
          <div className="w-1.5 flex-shrink-0" />
          {['Time','Source','Severity','Message','IP'].map(h => (
            <span key={h} className={`text-[10px] text-slate-500 uppercase tracking-wide flex-shrink-0 ${h === 'Message' ? 'flex-1' : h === 'IP' ? 'w-28 hidden sm:block' : h === 'Time' ? 'w-20' : h === 'Source' ? 'w-14' : 'w-16'}`}>{h}</span>
          ))}
        </div>
        <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ComputerDesktopIcon className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{logsPaused ? 'Feed paused' : wsStatus === 'connected' ? logs.length === 0 ? 'Waiting for system logs…' : 'No logs match filters' : 'Connecting…'}</p>
            </div>
          ) : filtered.map(log => <LogRow key={log._id} log={log} isNew={newIds.has(log._id)} />)}
        </div>
        <div className="px-4 py-2 border-t border-[#1e2d45] flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {logs.length}</span>
          <span>Refreshes every 5s · max 500 buffered</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const LiveMonitor = () => {
  const [tab, setTab] = useState('alerts')

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-bold text-white">Live Monitor</h1>
        <p className="text-sm text-slate-400 mt-0.5">Real-time threat alerts and host system log stream</p>
      </div>

      <div className="flex space-x-1 bg-[#0d1424] border border-[#1e2d45] rounded-lg p-1 w-fit">
        {[
          { id: 'alerts', label: 'Threat Alerts',     icon: ShieldExclamationIcon },
          { id: 'logs',   label: 'System Log Stream', icon: ComputerDesktopIcon },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' ? <AlertFeed /> : <LogStream />}
    </div>
  )
}

export default LiveMonitor
