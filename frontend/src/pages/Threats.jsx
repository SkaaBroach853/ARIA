import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import api from '../api/client'
import Badge from '../components/shared/Badge'
import MitreTag from '../components/shared/MitreTag'
import SOARModal from '../components/chat/SOARModal'
import socket from '../api/socket'

function ThreatCard({ t, i, onPlaybook }) {
  const [open, setOpen] = useState(false)
  const borderColor = t.severity === 'HIGH' ? 'border-l-[#ef4444]' : t.severity === 'MEDIUM' ? 'border-l-[#f59e0b]' : 'border-l-[#10b981]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`bg-[#111827] border border-white/[0.06] rounded-xl border-l-[3px] ${borderColor} overflow-hidden card-hover`}
    >
      <div className="p-5 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={t.severity} dot>{t.severity}</Badge>
              <span className="font-semibold text-[14px]">{t.rule_name}</span>
              <MitreTag id={t.mitre_technique_id} technique={t.mitre_technique} />
            </div>
            <p className="text-[13px] text-[#9ca3af] mb-2 leading-relaxed">{t.description}</p>
            <div className="flex items-center gap-3 text-[11px] text-[#4b5563] flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#4b5563]" />
                {t.kill_chain_phase}
              </span>
              <span className="font-mono">{t.event_count} events</span>
              {t.src_ip && (
                <span className="font-mono text-[#00d4ff] bg-[rgba(0,212,255,0.08)] px-2 py-0.5 rounded">
                  {t.src_ip}
                </span>
              )}
              {t.username && (
                <span className="font-mono text-[#9ca3af]">user: {t.username}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {t.soar_playbook && (
              <button
                onClick={e => { e.stopPropagation(); onPlaybook(t) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] rounded-lg text-[12px] hover:bg-[rgba(239,68,68,0.2)] transition-all font-medium"
              >
                <Zap size={12} /> Playbook
              </button>
            )}
            <button className="p-1.5 text-[#4b5563] hover:text-[#e2e8f0] transition-colors">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/[0.06] pt-3 space-y-2">
              {t.recommendation && (
                <div className="p-3 bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.12)] rounded-lg">
                  <div className="text-[10px] text-[#00d4ff] uppercase tracking-wider font-semibold mb-1">Recommendation</div>
                  <div className="text-[12px] text-[#e2e8f0]">{t.recommendation}</div>
                </div>
              )}
              {t.mitre_technique && (
                <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                  <span className="text-[#4b5563]">MITRE Technique:</span>
                  <span>{t.mitre_technique}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                <span className="text-[#4b5563]">Threat ID:</span>
                <span className="font-mono text-[#9ca3af]">{t.threat_id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Threats() {
  const [threats, setThreats] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [soar, setSoar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liveNew, setLiveNew] = useState([])

  const fetchThreats = () => {
    setLoading(true)
    api.get('/threats?hours=24')
      .then(r => { setThreats(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchThreats()
    socket.on('threat_detected', (data) => {
      setLiveNew(prev => [data, ...prev].slice(0, 3))
      setTimeout(() => setLiveNew(prev => prev.filter(t => t !== data)), 8000)
    })
    return () => socket.off('threat_detected')
  }, [])

  const filtered = filter === 'ALL' ? threats : threats.filter(t => t.severity === filter)

  const counts = { ALL: threats.length, HIGH: 0, MEDIUM: 0, LOW: 0 }
  threats.forEach(t => { if (counts[t.severity] !== undefined) counts[t.severity]++ })

  const openPlaybook = (t) => {
    setSoar({
      name: t.rule_name,
      sla_minutes: t.severity === 'HIGH' ? 15 : 30,
      escalate_to: t.severity === 'HIGH' ? 'SOC Lead' : 'Analyst',
      steps: [
        t.recommendation || 'Investigate the threat',
        `Review ${t.event_count} related events`,
        t.src_ip ? `Block source IP: ${t.src_ip}` : 'Identify source of attack',
        'Document findings in incident ticket',
        'Notify stakeholders if HIGH severity',
      ].filter(Boolean),
    })
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold">Live Threats</h1>
          <p className="text-[12px] text-[#4b5563] mt-0.5">Detection rules running on Windows Event Log</p>
        </div>
        <button onClick={fetchThreats} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-[#111827] border border-white/[0.06] rounded-lg text-[12px] text-[#6b7280] hover:text-[#e2e8f0] hover:border-white/[0.12] transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Live new threats */}
      <AnimatePresence>
        {liveNew.map((t, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mb-3 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-xl flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-[#ef4444] rounded-full pulse-ring flex-shrink-0" />
            <span className="text-[12px] text-[#ef4444] font-semibold">⚡ New threat detected:</span>
            <span className="text-[12px] text-[#e2e8f0]">{t.rule_name || 'Unknown threat'}</span>
            {t.src_ip && <span className="font-mono text-[11px] text-[#00d4ff] ml-auto">{t.src_ip}</span>}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium border transition-all ${
              filter === f
                ? f === 'HIGH' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]'
                : f === 'MEDIUM' ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]'
                : f === 'LOW' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981] border-[rgba(16,185,129,0.3)]'
                : 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border-[rgba(0,212,255,0.3)]'
                : 'bg-[#111827] text-[#6b7280] border-white/[0.06] hover:border-white/[0.12] hover:text-[#e2e8f0]'
            }`}>
            <span>{f}</span>
            <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
              filter === f ? 'bg-white/10' : 'bg-white/[0.05]'
            }`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[#4b5563] text-[13px] py-4">
          <RefreshCw size={14} className="animate-spin" />
          Running detection rules...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="mx-auto mb-3 text-[#1a2235]" />
          <div className="text-[#4b5563] text-[14px]">No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}threats detected</div>
          <div className="text-[#374151] text-[12px] mt-1">System is monitoring continuously</div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((t, i) => (
          <ThreatCard key={t.threat_id} t={t} i={i} onPlaybook={openPlaybook} />
        ))}
      </div>

      <SOARModal playbook={soar} onClose={() => setSoar(null)} />
    </div>
  )
}
