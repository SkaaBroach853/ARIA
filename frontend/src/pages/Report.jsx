import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../api/client'
import Badge from '../components/shared/Badge'

const REPORT_TYPES = [
  { key: 'ciso', label: 'CISO Executive Summary', desc: 'High-level overview for leadership', icon: '📊', color: 'text-[#00d4ff]' },
  { key: 'incident', label: 'Incident Report', desc: 'Detailed technical incident analysis', icon: '🔍', color: 'text-[#ef4444]' },
  { key: 'compliance', label: 'Compliance Report', desc: 'Audit-ready security posture report', icon: '✅', color: 'text-[#10b981]' },
]

export default function Report() {
  const [loading, setLoading] = useState(false)
  const [cases, setCases] = useState([])
  const [result, setResult] = useState(null)
  const [selectedType, setSelectedType] = useState('ciso')

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data || [])).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const r = await api.post('/cases', {
        query: `Generate ${selectedType.toUpperCase()} report for last 24 hours`,
        finding: 'Auto-generated report',
        evidence: {},
        threats: [],
      })
      setResult({ success: true, caseId: r.data.case_id })
    } catch {
      setResult({ success: false })
    }
    setLoading(false)
  }

  const updateCase = async (id, status) => {
    await api.patch(`/cases/${id}`, { status })
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold">Incident Reports</h1>
        <p className="text-[12px] text-[#4b5563] mt-0.5">Generate and manage security reports</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Generator */}
        <div>
          <div className="text-[11px] text-[#4b5563] uppercase tracking-wider font-semibold mb-3">Report Type</div>
          <div className="space-y-2 mb-5">
            {REPORT_TYPES.map(rt => (
              <button key={rt.key} onClick={() => setSelectedType(rt.key)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  selectedType === rt.key
                    ? 'bg-[rgba(0,212,255,0.06)] border-[rgba(0,212,255,0.2)]'
                    : 'bg-[#111827] border-white/[0.06] hover:border-white/[0.12]'
                }`}>
                <span className="text-[20px]">{rt.icon}</span>
                <div className="flex-1">
                  <div className={`text-[13px] font-semibold ${selectedType === rt.key ? rt.color : 'text-[#e2e8f0]'}`}>
                    {rt.label}
                  </div>
                  <div className="text-[11px] text-[#4b5563]">{rt.desc}</div>
                </div>
                {selectedType === rt.key && (
                  <div className="w-4 h-4 rounded-full bg-[#00d4ff] flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0a0e1a]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#00d4ff] hover:bg-[#00b8e6] disabled:bg-[#1a2035] disabled:text-[#4b5563] text-[#0a0e1a] font-bold rounded-xl text-[14px] transition-all">
            {loading ? (
              <><RefreshCw size={15} className="animate-spin" /> Generating...</>
            ) : (
              <><FileText size={15} /> Generate Report</>
            )}
          </button>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-3 p-4 rounded-xl border flex items-start gap-3 ${
                  result.success
                    ? 'bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)]'
                    : 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]'
                }`}
              >
                {result.success
                  ? <CheckCircle size={16} className="text-[#10b981] flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={16} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
                }
                <div>
                  <div className={`text-[13px] font-semibold ${result.success ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {result.success ? 'Report generated' : 'Generation failed'}
                  </div>
                  {result.success && (
                    <div className="text-[12px] text-[#6b7280] mt-0.5">
                      Saved as Case <span className="font-mono text-[#00d4ff]">{result.caseId}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] text-[#4b5563] uppercase tracking-wider font-semibold">Open Cases</div>
            <span className="text-[11px] font-mono text-[#4b5563]">{cases.length} total</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {cases.length === 0 ? (
              <div className="text-center py-10 text-[#4b5563] text-[13px]">
                <FileText size={24} className="mx-auto mb-2 opacity-30" />
                No cases yet
              </div>
            ) : cases.map((c, i) => (
              <motion.div key={c.id || i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#111827] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-mono text-[11px] text-[#00d4ff]">#{c.id}</div>
                  <Badge variant={c.status === 'open' ? 'amber' : 'green'}>
                    {c.status || 'open'}
                  </Badge>
                </div>
                <div className="text-[12px] text-[#e2e8f0] mb-1 line-clamp-2">{c.query || c.finding}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-[#4b5563]">
                    <Clock size={11} />
                    {c.timestamp?.slice(0, 16) || 'Unknown'}
                  </div>
                  {c.status === 'open' && (
                    <button onClick={() => updateCase(c.id, 'closed')}
                      className="text-[11px] text-[#10b981] hover:text-[#34d399] transition-colors">
                      Close case
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
