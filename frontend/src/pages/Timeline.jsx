import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import Badge from '../components/shared/Badge'

const PHASE_STYLES = {
  RECONNAISSANCE:       { border: 'border-[#6b7280]', text: 'text-[#9ca3af]', bg: 'bg-[rgba(107,114,128,0.08)]', dot: 'bg-[#6b7280]' },
  INITIAL_ACCESS:       { border: 'border-[#00d4ff]', text: 'text-[#00d4ff]', bg: 'bg-[rgba(0,212,255,0.08)]',   dot: 'bg-[#00d4ff]' },
  CREDENTIAL_ACCESS:    { border: 'border-[#ef4444]', text: 'text-[#ef4444]', bg: 'bg-[rgba(239,68,68,0.08)]',   dot: 'bg-[#ef4444]' },
  PRIVILEGE_ESCALATION: { border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', bg: 'bg-[rgba(245,158,11,0.08)]', dot: 'bg-[#f59e0b]' },
  PERSISTENCE:          { border: 'border-[#8b5cf6]', text: 'text-[#a78bfa]', bg: 'bg-[rgba(139,92,246,0.08)]', dot: 'bg-[#8b5cf6]' },
  DEFENSE_EVASION:      { border: 'border-[#ef4444]', text: 'text-[#ef4444]', bg: 'bg-[rgba(239,68,68,0.08)]',   dot: 'bg-[#ef4444]' },
  LATERAL_MOVEMENT:     { border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', bg: 'bg-[rgba(245,158,11,0.08)]', dot: 'bg-[#f59e0b]' },
}

const DEFAULT_STYLE = { border: 'border-white/[0.1]', text: 'text-[#9ca3af]', bg: 'bg-[rgba(255,255,255,0.03)]', dot: 'bg-[#4b5563]' }

function PhaseCard({ phase, i }) {
  const [open, setOpen] = useState(true)
  const style = PHASE_STYLES[phase.phase] || DEFAULT_STYLE

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.08 }}
      className={`bg-[#111827] border border-white/[0.06] rounded-xl border-l-[3px] ${style.border} overflow-hidden`}
    >
      <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
          <span className={`font-semibold text-[14px] ${style.text}`}>{phase.label}</span>
          <span className="text-[11px] text-[#4b5563] font-mono bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full">
            {phase.event_count} events
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#4b5563] font-mono">
            {phase.first_seen?.slice(11, 19)} → {phase.last_seen?.slice(11, 19)}
          </span>
          {open ? <ChevronUp size={14} className="text-[#4b5563]" /> : <ChevronDown size={14} className="text-[#4b5563]" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/[0.06] pt-3 space-y-2">
              {phase.events.map((ev, j) => (
                <motion.div key={j}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: j * 0.03 }}
                  className="flex items-center gap-3 text-[12px] py-1.5 border-b border-white/[0.03] last:border-0"
                >
                  <span className="font-mono text-[#4b5563] flex-shrink-0 w-16">{ev.timestamp?.slice(11, 19)}</span>
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${style.dot}`} />
                  <span className="text-[#e2e8f0] flex-1">{ev.description}</span>
                  <Badge variant={ev.severity} className="ml-auto flex-shrink-0">{ev.severity}</Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Timeline() {
  const [ip, setIp] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    if (!ip.trim()) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const r = await api.get(`/timeline/${ip.trim()}`)
      setData(r.data)
    } catch {
      setError('No timeline data found for this IP.')
    }
    setLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold">Attack Timeline</h1>
        <p className="text-[12px] text-[#4b5563] mt-0.5">Reconstruct kill chain from Windows Event Log</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-8 max-w-xl">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input value={ip} onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Enter IP address to reconstruct attack chain..."
            className="w-full bg-[#111827] border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[14px] text-[#e2e8f0] outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] font-mono placeholder-[#4b5563] transition-all" />
        </div>
        <button onClick={search} disabled={loading || !ip.trim()}
          className="px-5 py-3 bg-[#00d4ff] hover:bg-[#00b8e6] disabled:bg-[#1a2035] disabled:text-[#4b5563] text-[#0a0e1a] font-semibold rounded-xl text-[13px] transition-all flex items-center gap-2">
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" /> Scanning</>
          ) : (
            <><Search size={14} /> Reconstruct</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl text-[#ef4444] text-[13px] mb-6">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Summary */}
          <div className="mb-5 p-5 bg-[#111827] border border-white/[0.06] rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] text-[#4b5563] uppercase tracking-wider mb-1">Attack Narrative</div>
                <div className="text-[13px] text-[#e2e8f0] leading-relaxed">{data.attack_narrative}</div>
              </div>
              <div className="flex gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[24px] font-bold font-mono text-[#00d4ff]">{data.total_events}</div>
                  <div className="text-[10px] text-[#4b5563] uppercase tracking-wider">Events</div>
                </div>
                <div className="text-center">
                  <div className="text-[24px] font-bold font-mono text-[#f59e0b]">{data.phases_detected}</div>
                  <div className="text-[10px] text-[#4b5563] uppercase tracking-wider">Phases</div>
                </div>
              </div>
            </div>
          </div>

          {/* Kill chain flow */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {data.timeline.map((phase, i) => {
              const style = PHASE_STYLES[phase.phase] || DEFAULT_STYLE
              return (
                <div key={phase.phase} className="flex items-center gap-2 flex-shrink-0">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className={`px-3 py-2 border rounded-xl text-[11px] font-semibold ${style.border} ${style.text} ${style.bg}`}
                  >
                    {phase.label}
                    <span className="ml-2 opacity-60 font-mono">{phase.event_count}</span>
                  </motion.div>
                  {i < data.timeline.length - 1 && (
                    <span className="text-[#1a2235] text-[16px]">→</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Phase details */}
          <div className="space-y-3">
            {data.timeline.map((phase, i) => (
              <PhaseCard key={phase.phase} phase={phase} i={i} />
            ))}
          </div>
        </motion.div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-[#1a2235]" />
          </div>
          <div className="text-[#4b5563] text-[14px]">Enter an IP address to reconstruct its attack timeline</div>
          <div className="text-[#374151] text-[12px] mt-1">Analyzes Windows Event Log for kill chain phases</div>
        </div>
      )}
    </div>
  )
}
