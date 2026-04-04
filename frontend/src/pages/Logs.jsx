import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, RefreshCw, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import api from '../api/client'
import Badge from '../components/shared/Badge'
import { SkeletonTable } from '../components/shared/Skeleton'
import socket from '../api/socket'

const PAGE_SIZE = 25

export default function Logs() {
  const [events, setEvents] = useState([])
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [liveEvents, setLiveEvents] = useState([])
  const [expanded, setExpanded] = useState(null)

  const fetchEvents = () => {
    setLoading(true)
    api.get(`/events?hours=${hours}`)
      .then(r => { setEvents(r.data); setLoading(false); setPage(1) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [hours])

  useEffect(() => {
    socket.on('live_event', (ev) => {
      setLiveEvents(prev => [ev, ...prev].slice(0, 5))
    })
    return () => socket.off('live_event')
  }, [])

  const eventTypes = useMemo(() => {
    const types = [...new Set(events.map(e => e.event_type).filter(Boolean))]
    return types.sort()
  }, [events])

  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (severityFilter !== 'ALL' && ev.severity !== severityFilter) return false
      if (typeFilter !== 'ALL' && ev.event_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          ev.event_type?.toLowerCase().includes(q) ||
          ev.username?.toLowerCase().includes(q) ||
          ev.src_ip?.includes(q) ||
          String(ev.event_id).includes(q)
        )
      }
      return true
    })
  }, [events, severityFilter, typeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const exportCSV = () => {
    const header = 'Timestamp,Event ID,Type,Username,Source IP,Severity\n'
    const rows = filtered.map(e =>
      `"${e.timestamp}",${e.event_id},"${e.event_type}","${e.username || ''}","${e.src_ip || ''}",${e.severity}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `events-${hours}h.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const SEV_COUNTS = useMemo(() => {
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
    events.forEach(e => { if (c[e.severity] !== undefined) c[e.severity]++ })
    return c
  }, [events])

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold">Event Logs</h1>
          <p className="text-[12px] text-[#4b5563] mt-0.5">{events.length} events loaded</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            className="bg-[#111827] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none hover:border-white/[0.12] transition-colors cursor-pointer">
            {[1,6,12,24,48,168].map(h => <option key={h} value={h}>Last {h}h</option>)}
          </select>
          <button onClick={fetchEvents} disabled={loading}
            className="p-2 bg-[#111827] border border-white/[0.06] rounded-lg text-[#6b7280] hover:text-[#e2e8f0] hover:border-white/[0.12] transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] border border-white/[0.06] rounded-lg text-[12px] text-[#6b7280] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.3)] transition-all">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Severity summary pills */}
      <div className="flex items-center gap-2 mb-4">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => (
          <button key={s} onClick={() => { setSeverityFilter(s); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
              severityFilter === s
                ? s === 'HIGH' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]'
                : s === 'MEDIUM' ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]'
                : s === 'LOW' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981] border-[rgba(16,185,129,0.3)]'
                : s === 'INFO' ? 'bg-[rgba(107,114,128,0.15)] text-[#9ca3af] border-[rgba(107,114,128,0.3)]'
                : 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border-[rgba(0,212,255,0.3)]'
                : 'bg-[#111827] text-[#6b7280] border-white/[0.06] hover:border-white/[0.12] hover:text-[#e2e8f0]'
            }`}>
            {s !== 'ALL' && <span className="font-mono">{SEV_COUNTS[s] ?? 0}</span>}
            {s}
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by type, user, IP, event ID..."
            className="w-full bg-[#111827] border border-white/[0.06] rounded-lg pl-8 pr-8 py-2 text-[13px] text-[#e2e8f0] outline-none focus:border-[#00d4ff] transition-colors placeholder-[#4b5563]" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#e2e8f0]">
              <X size={12} />
            </button>
          )}
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="bg-[#111827] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none hover:border-white/[0.12] transition-colors cursor-pointer">
          <option value="ALL">All Types</option>
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || severityFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <button onClick={() => { setSearch(''); setSeverityFilter('ALL'); setTypeFilter('ALL'); setPage(1) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[12px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.15)] transition-all">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Live events banner */}
      <AnimatePresence>
        {liveEvents.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full live-blink" />
              <span className="text-[11px] text-[#10b981] font-semibold uppercase tracking-wider">Live Events</span>
            </div>
            <div className="space-y-1">
              {liveEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-[#4b5563]">{ev.timestamp?.slice(11, 19)}</span>
                  <span className="text-[#e2e8f0]">{ev.event_type}</span>
                  {ev.src_ip && <span className="text-[#00d4ff]">{ev.src_ip}</span>}
                  <Badge variant={ev.severity}>{ev.severity}</Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? <SkeletonTable rows={8} cols={6} /> : (
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[rgba(255,255,255,0.02)]">
                {['Timestamp', 'Event ID', 'Type', 'Username', 'Source IP', 'Severity'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[#6b7280] font-semibold text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {paginated.map((ev, i) => (
                  <motion.tr
                    key={`${ev.event_id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className={`border-b border-white/[0.04] hover:bg-[#1a2235] transition-colors cursor-pointer
                      ${ev.severity === 'HIGH' ? 'row-high' : ev.severity === 'MEDIUM' ? 'row-medium' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-[#6b7280] text-[11px]">{ev.timestamp?.slice(0, 19)}</td>
                    <td className="px-4 py-2.5 font-mono text-[#00d4ff] font-semibold">{ev.event_id}</td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{ev.event_type}</td>
                    <td className="px-4 py-2.5 font-mono text-[#9ca3af]">{ev.username || <span className="text-[#4b5563]">—</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-[#00d4ff]">{ev.src_ip || <span className="text-[#4b5563]">—</span>}</td>
                    <td className="px-4 py-2.5"><Badge variant={ev.severity} dot>{ev.severity}</Badge></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center text-[#4b5563] text-[13px] py-12">
              <Filter size={24} className="mx-auto mb-2 opacity-30" />
              No events match your filters.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-[#4b5563]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg bg-[#111827] border border-white/[0.06] text-[#6b7280] hover:text-[#e2e8f0] disabled:opacity-30 transition-all">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[12px] font-mono transition-all ${p === page ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]' : 'bg-[#111827] border border-white/[0.06] text-[#6b7280] hover:text-[#e2e8f0]'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-[#111827] border border-white/[0.06] text-[#6b7280] hover:text-[#e2e8f0] disabled:opacity-30 transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
