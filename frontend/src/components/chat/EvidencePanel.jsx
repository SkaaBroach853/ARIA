import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, Shield, List, ExternalLink } from 'lucide-react'
import Badge from '../shared/Badge'
import MitreTag from '../shared/MitreTag'

function Section({ title, icon: Icon, count, children, color = 'text-[#6b7280]' }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={13} className={color} />
        <span className="text-[11px] text-[#6b7280] uppercase tracking-wider font-semibold">{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-[10px] font-mono text-[#4b5563] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

export default function EvidencePanel({ data, onClose, onInvestigateIP }) {
  return (
    <AnimatePresence>
      {data && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-10" onClick={onClose} />

          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-7 w-[380px] bg-[#0d1221] border-l border-white/[0.06] overflow-y-auto z-20 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0 bg-[#0d1221] sticky top-0 z-10">
              <div>
                <h3 className="text-[14px] font-semibold">Evidence</h3>
                <p className="text-[11px] text-[#4b5563] mt-0.5">
                  {(data.evidence?.events?.length || 0) + (data.threats?.length || 0)} items
                </p>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg bg-[#111827] border border-white/[0.06] flex items-center justify-center text-[#6b7280] hover:text-[#e2e8f0] transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* IP Intelligence */}
              {data.evidence?.ip_info && (() => {
                const ip = data.evidence.ip_info
                return (
                  <Section title="IP Intelligence" icon={Globe} color="text-[#00d4ff]">
                    <div className="bg-[#111827] border border-white/[0.06] border-l-[3px] border-l-[#00d4ff] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-[18px] text-[#00d4ff] font-bold">{ip.flag_emoji} {ip.ip}</div>
                        <button onClick={() => onInvestigateIP(ip.ip)}
                          className="flex items-center gap-1 text-[11px] text-[#4b5563] hover:text-[#00d4ff] transition-colors">
                          <ExternalLink size={11} /> Investigate
                        </button>
                      </div>
                      <div className="text-[12px] text-[#9ca3af]">{ip.city}, {ip.country}</div>
                      <div className="text-[12px] text-[#6b7280]">ISP: {ip.isp}</div>
                      {ip.org && <div className="text-[12px] text-[#6b7280]">Org: {ip.org}</div>}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {ip.is_proxy && <span className="text-[11px] bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)] px-2 py-0.5 rounded-full">VPN/Proxy</span>}
                        {ip.is_hosting && <span className="text-[11px] bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)] px-2 py-0.5 rounded-full">Datacenter</span>}
                        <Badge variant={ip.threat_level} dot>Threat: {ip.threat_level}</Badge>
                      </div>
                      {ip.threat_reasons?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {ip.threat_reasons.map((r, i) => (
                            <div key={i} className="text-[11px] bg-[rgba(245,158,11,0.06)] text-[#f59e0b] border border-[rgba(245,158,11,0.15)] px-2 py-1.5 rounded-lg">
                              ⚠ {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>
                )
              })()}

              {/* Threats */}
              {data.threats?.length > 0 && (
                <Section title="Detected Threats" icon={Shield} count={data.threats.length} color="text-[#ef4444]">
                  <div className="space-y-2">
                    {data.threats.map(t => (
                      <div key={t.threat_id}
                        className={`bg-[#111827] border border-white/[0.06] rounded-xl p-3.5 border-l-[3px] ${
                          t.severity === 'HIGH' ? 'border-l-[#ef4444]' : t.severity === 'MEDIUM' ? 'border-l-[#f59e0b]' : 'border-l-[#10b981]'
                        }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant={t.severity} dot>{t.severity}</Badge>
                          <span className="text-[12px] font-semibold truncate">{t.rule_name}</span>
                        </div>
                        <div className="text-[11px] text-[#6b7280] mb-2 leading-relaxed">{t.description}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <MitreTag id={t.mitre_technique_id} technique={t.mitre_technique} />
                          <span className="text-[10px] text-[#4b5563]">{t.kill_chain_phase}</span>
                          <span className="text-[10px] font-mono text-[#00d4ff] ml-auto">{t.event_count} events</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Event Log */}
              {data.evidence?.events?.length > 0 && (
                <Section title="Event Log" icon={List} count={data.evidence.events.length} color="text-[#10b981]">
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-[rgba(255,255,255,0.02)]">
                          {['Time', 'Event', 'User', 'IP', 'Sev'].map(h => (
                            <th key={h} className="px-2.5 py-2 text-left text-[#4b5563] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.evidence.events.slice(0, 30).map((ev, i) => (
                          <tr key={i} className={`border-b border-white/[0.04] hover:bg-[#1a2235] transition-colors ${
                            ev.severity === 'HIGH' ? 'border-l-2 border-l-[#ef4444]' : ev.severity === 'MEDIUM' ? 'border-l-2 border-l-[#f59e0b]' : ''
                          }`}>
                            <td className="px-2.5 py-2 font-mono text-[#4b5563]">{ev.timestamp?.slice(11, 19) || '?'}</td>
                            <td className="px-2.5 py-2 text-[#e2e8f0] max-w-[80px] truncate">{ev.event_type || ev.event_id}</td>
                            <td className="px-2.5 py-2 font-mono text-[#6b7280] max-w-[60px] truncate">{ev.username || '—'}</td>
                            <td className="px-2.5 py-2 font-mono text-[#00d4ff] cursor-pointer hover:underline"
                              onClick={() => ev.src_ip && onInvestigateIP(ev.src_ip)}>
                              {ev.src_ip || '—'}
                            </td>
                            <td className="px-2.5 py-2">
                              <Badge variant={ev.severity}>{ev.severity?.slice(0, 1)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.evidence.events.length > 30 && (
                      <div className="px-3 py-2 text-center text-[11px] text-[#4b5563] border-t border-white/[0.04]">
                        +{data.evidence.events.length - 30} more events
                      </div>
                    )}
                  </div>
                </Section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
