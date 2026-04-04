import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trash2, RefreshCw, Terminal, ShieldAlert } from 'lucide-react'
import api from '../api/client'

const SCENARIOS = [
  {
    key: 'brute_force',
    label: 'Brute Force Attack',
    desc: '20 failed logins from Tor exit node',
    icon: '🔨',
    color: 'border-[rgba(239,68,68,0.3)] hover:border-[rgba(239,68,68,0.5)]',
    badge: 'HIGH',
  },
  {
    key: 'impossible_travel',
    label: 'Impossible Travel',
    desc: 'Same user from Russia + USA in 30min',
    icon: '✈️',
    color: 'border-[rgba(245,158,11,0.3)] hover:border-[rgba(245,158,11,0.5)]',
    badge: 'MEDIUM',
  },
  {
    key: 'log_tampering',
    label: 'Log Tampering',
    desc: 'Full attack chain + audit log cleared',
    icon: '🗑️',
    color: 'border-[rgba(239,68,68,0.3)] hover:border-[rgba(239,68,68,0.5)]',
    badge: 'HIGH',
  },
]

const SEV_COLORS = {
  HIGH: 'text-[#ef4444] bg-[rgba(239,68,68,0.1)]',
  MEDIUM: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]',
}

export default function Admin() {
  const [injectionLog, setInjectionLog] = useState([])
  const [simResult, setSimResult] = useState(null)
  const [running, setRunning] = useState(null)
  const [loadingLog, setLoadingLog] = useState(true)

  const fetchLog = () => {
    setLoadingLog(true)
    api.get('/admin/injection-log')
      .then(r => { setInjectionLog(r.data); setLoadingLog(false) })
      .catch(() => setLoadingLog(false))
  }

  useEffect(() => { fetchLog() }, [])

  const runSim = async (key) => {
    setRunning(key)
    setSimResult(null)
    try {
      const r = await api.post(`/simulate/${key}`)
      setSimResult({ success: true, ...r.data })
    } catch (e) {
      setSimResult({ success: false, error: e.message })
    }
    setRunning(null)
  }

  const clearSim = async () => {
    await api.post('/simulate/clear').catch(() => {})
    setSimResult(null)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold">Admin Panel</h1>
        <p className="text-[12px] text-[#4b5563] mt-0.5">Attack simulation and security monitoring</p>
      </div>

      {/* Attack Simulation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={15} className="text-[#ef4444]" />
          <span className="text-[13px] font-semibold text-[#e2e8f0]">Attack Simulation Engine</span>
          <span className="text-[10px] text-[#4b5563] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Controlled Environment
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {SCENARIOS.map(s => (
            <motion.div key={s.key} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
              className={`bg-[#111827] border rounded-xl p-5 transition-all ${s.color}`}>
              <div className="text-[24px] mb-3">{s.icon}</div>
              <div className="font-semibold text-[13px] mb-1">{s.label}</div>
              <div className="text-[12px] text-[#6b7280] mb-4 leading-relaxed">{s.desc}</div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${SEV_COLORS[s.badge]}`}>
                  {s.badge}
                </span>
                <button onClick={() => runSim(s.key)} disabled={running !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] rounded-lg text-[12px] hover:bg-[rgba(239,68,68,0.2)] transition-all font-medium disabled:opacity-50">
                  {running === s.key
                    ? <><RefreshCw size={11} className="animate-spin" /> Running</>
                    : <><Zap size={11} /> Inject</>
                  }
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {simResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                simResult.success
                  ? 'bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)]'
                  : 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]'
              }`}
            >
              <div className={`text-[13px] font-medium ${simResult.success ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {simResult.success
                  ? `✓ Injected "${simResult.name}" — ${simResult.event_count} events emitted via SocketIO`
                  : `✗ Error: ${simResult.error}`
                }
              </div>
              <button onClick={clearSim}
                className="flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-[#e2e8f0] transition-colors">
                <Trash2 size={12} /> Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Injection Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-[#f59e0b]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Prompt Injection Log</span>
          </div>
          <button onClick={fetchLog}
            className="flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-[#e2e8f0] transition-colors">
            <RefreshCw size={12} className={loadingLog ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          {injectionLog.length === 0 ? (
            <div className="text-center text-[#4b5563] text-[13px] py-10">
              <Terminal size={24} className="mx-auto mb-2 opacity-20" />
              No injection attempts logged
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[rgba(255,255,255,0.02)]">
                  {['Timestamp', 'Threat Type', 'Query'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[#6b7280] font-semibold text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {injectionLog.map((log, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-[#1a2235] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[#4b5563] text-[11px]">{log.timestamp?.slice(0, 19)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[#ef4444] bg-[rgba(239,68,68,0.08)] px-2 py-0.5 rounded text-[11px] font-semibold">
                        {log.threat_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] truncate max-w-xs">{log.query}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
