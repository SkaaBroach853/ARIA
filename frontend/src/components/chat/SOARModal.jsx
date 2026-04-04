import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Circle, Zap, Clock, User } from 'lucide-react'

export default function SOARModal({ playbook, onClose }) {
  const [checked, setChecked] = useState({})

  const toggle = (i) => setChecked(c => ({ ...c, [i]: !c[i] }))
  const completedCount = Object.values(checked).filter(Boolean).length
  const totalSteps = playbook?.steps?.length || 1
  const progress = completedCount / totalSteps
  const allDone = completedCount === totalSteps

  return (
    <AnimatePresence>
      {playbook && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-[#0d1221] border border-white/[0.08] rounded-2xl w-full max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                  <Zap size={15} className="text-[#ef4444]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold">Response Playbook</h3>
                  <p className="text-[11px] text-[#4b5563]">Incident response checklist</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg bg-[#111827] border border-white/[0.06] flex items-center justify-center text-[#6b7280] hover:text-[#e2e8f0] transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Playbook info */}
              <div className="mb-5">
                <div className="text-[16px] font-bold text-[#e2e8f0] mb-1">{playbook.name}</div>
                <div className="flex items-center gap-4 text-[12px] text-[#6b7280]">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#f59e0b]" />
                    SLA: {playbook.sla_minutes} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={12} className="text-[#00d4ff]" />
                    Escalate: {playbook.escalate_to}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#6b7280]">Progress</span>
                  <span className={`text-[11px] font-mono font-semibold ${allDone ? 'text-[#10b981]' : 'text-[#e2e8f0]'}`}>
                    {completedCount}/{totalSteps}
                  </span>
                </div>
                <div className="h-2 bg-[#1a2035] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-colors ${allDone ? 'bg-[#10b981]' : 'bg-[#00d4ff]'}`}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {playbook.steps?.map((step, i) => (
                  <motion.button key={i} onClick={() => toggle(i)}
                    whileHover={{ scale: 1.005 }}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      checked[i]
                        ? 'bg-[rgba(16,185,129,0.06)] border-[rgba(16,185,129,0.2)]'
                        : 'bg-[#111827] border-white/[0.06] hover:border-white/[0.12]'
                    }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {checked[i]
                        ? <CheckCircle size={16} className="text-[#10b981]" />
                        : <Circle size={16} className="text-[#374151]" />
                      }
                    </div>
                    <div className="flex items-start gap-2 flex-1">
                      <span className="font-mono text-[11px] text-[#4b5563] flex-shrink-0 mt-0.5 w-4">{i + 1}.</span>
                      <span className={`text-[13px] leading-snug ${checked[i] ? 'line-through text-[#4b5563]' : 'text-[#e2e8f0]'}`}>
                        {step}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-2">
              <button
                className={`flex-1 py-2.5 font-bold rounded-xl text-[13px] transition-all ${
                  allDone
                    ? 'bg-[#10b981] hover:bg-[#0ea572] text-white'
                    : 'bg-[#00d4ff] hover:bg-[#00c4ef] text-[#0a0e1a]'
                }`}>
                {allDone ? '✓ Create Incident Ticket' : 'Create Incident Ticket'}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 bg-[#111827] border border-white/[0.06] rounded-xl text-[13px] text-[#6b7280] hover:text-[#e2e8f0] transition-all">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
