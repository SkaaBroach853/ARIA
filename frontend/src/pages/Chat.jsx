import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ChevronDown, ChevronRight, Shield, Zap, Eye, Sparkles, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import EvidencePanel from '../components/chat/EvidencePanel'
import SOARModal from '../components/chat/SOARModal'
import Badge from '../components/shared/Badge'
import MitreTag from '../components/shared/MitreTag'

const QUICK_QUERIES = [
  'What threats are active right now?',
  'Show failed login attempts in the last hour',
  'Are there any brute force attacks?',
  'Who logged in after midnight?',
  'Give me a 24-hour security summary',
  'Show live network connections',
]

const MODES = [
  { key: 'briefing', label: 'Briefing', icon: Eye,     desc: 'Plain English for managers' },
  { key: 'senior',   label: 'Senior',   icon: Zap,     desc: 'Technical SOC analyst mode' },
  { key: 'explain',  label: 'Explain',  icon: Shield,  desc: 'Step-by-step reasoning chain' },
]

function renderText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#e2e8f0] font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono bg-[#1a2035] px-1.5 py-0.5 rounded text-[#a5f3fc] text-[12px] border border-white/[0.06]">$1</code>')
    .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g,
      '<span class="font-mono text-[#00d4ff] cursor-pointer hover:underline hover:text-[#00b8e6] transition-colors ip-link" data-ip="$1">$1</span>')
    .replace(/\b(T\d{4}(?:\.\d{3})?)\b/g,
      '<a href="https://attack.mitre.org/techniques/$1" target="_blank" class="font-mono text-[#a78bfa] hover:text-[#c4b5fd] hover:underline text-[12px] transition-colors">$1</a>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>')
}

function AgentTrace({ trace }) {
  const [open, setOpen] = useState(false)
  if (!trace?.length) return null
  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-[#9ca3af] transition-colors">
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Sparkles size={11} />
        Agent Collaboration ({trace.length} agents)
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-1.5 pl-2 border-l border-white/[0.06]">
              {trace.map((step, i) => (
                <motion.div key={i} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-[#00d4ff] flex-shrink-0 w-28 truncate">{step.agent}</span>
                  <span className="text-[#4b5563]">→</span>
                  <span className="text-[#6b7280] flex-1 truncate">{step.action}</span>
                  <span className={`flex-shrink-0 text-[10px] font-semibold ${
                    step.status === 'done' ? 'text-[#10b981]' : step.status === 'blocked' ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                  }`}>
                    {step.status === 'done' ? '✓' : step.status === 'blocked' ? '✗' : '⟳'}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1 text-[#4b5563] hover:text-[#9ca3af] transition-colors rounded">
      {copied ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
    </button>
  )
}

function AIMessage({ msg, onInvestigateIP, onShowEvidence, onShowSoar }) {
  const contentRef = useRef(null)

  useEffect(() => {
    if (!contentRef.current) return
    const handler = (e) => {
      const ip = e.target.dataset?.ip
      if (ip) onInvestigateIP(ip)
    }
    contentRef.current.addEventListener('click', handler)
    return () => contentRef.current?.removeEventListener('click', handler)
  }, [onInvestigateIP])

  const conf = msg.metadata?.confidence || 'LOW'
  const confVariant = conf === 'HIGH' ? 'green' : conf === 'MEDIUM' ? 'amber' : 'red'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start group">
      <div className="w-8 h-8 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center text-[11px] font-bold text-[#00d4ff] flex-shrink-0 mt-0.5">
        CG
      </div>
      <div className="flex-1 max-w-[78%]">
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3.5 relative">
          {msg.loading ? (
            <div className="flex gap-1.5 py-1 items-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-[#4b5563] rounded-full typing-dot" style={{ animationDelay: `${i*0.2}s` }} />
              ))}
              <span className="text-[12px] text-[#4b5563] ml-1">Analyzing...</span>
            </div>
          ) : (
            <>
              <div ref={contentRef} className="text-[14px] leading-7 text-[#d1d5db]"
                dangerouslySetInnerHTML={{ __html: `<p>${renderText(msg.text || '')}</p>` }} />

              {msg.metadata && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={confVariant}>Confidence: {conf}</Badge>
                    {msg.metadata.sources?.map(s => (
                      <span key={s} className="text-[11px] text-[#4b5563] bg-[#1a2035] px-2 py-0.5 rounded-full border border-white/[0.04]">{s}</span>
                    ))}
                    {msg.metadata.threats?.slice(0, 2).map(t => (
                      <MitreTag key={t.threat_id} id={t.mitre_technique_id} technique={t.mitre_technique} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {(msg.metadata.evidence?.events?.length > 0 || msg.metadata.threats?.length > 0) && (
                      <button onClick={() => onShowEvidence(msg.metadata)}
                        className="text-[12px] px-3 py-1.5 bg-[#1a2035] border border-white/[0.06] rounded-lg hover:border-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all text-[#6b7280] font-medium">
                        View Evidence ({(msg.metadata.evidence?.events?.length || 0) + (msg.metadata.threats?.length || 0)})
                      </button>
                    )}
                    {msg.metadata.soar_playbook && (
                      <button onClick={() => onShowSoar(msg.metadata.soar_playbook)}
                        className="text-[12px] px-3 py-1.5 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg hover:bg-[rgba(239,68,68,0.15)] text-[#ef4444] transition-all font-medium flex items-center gap-1.5">
                        <Zap size={11} /> Response Playbook
                      </button>
                    )}
                  </div>
                  <AgentTrace trace={msg.metadata.agent_trace} />
                </div>
              )}
            </>
          )}
        </div>
        {!msg.loading && msg.text && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={msg.text} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState(() => localStorage.getItem('cg_mode') || 'briefing')
  const [streaming, setStreaming] = useState(false)
  const [evidenceData, setEvidenceData] = useState(null)
  const [soarData, setSoarData] = useState(null)
  const [clock, setClock] = useState(new Date().toLocaleTimeString())
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const setModeAndSave = (m) => {
    setMode(m)
    localStorage.setItem('cg_mode', m)
  }

  const sendMessage = useCallback(async (queryOverride) => {
    const query = (queryOverride || input).trim()
    if (!query || streaming) return

    // Generate unique IDs
    const userId = `user-${Date.now()}-${Math.random()}`
    const aiId = `ai-${Date.now()}-${Math.random()}`

    // Add user message
    setMessages(prev => [...prev, { id: userId, type: 'user', text: query }])
    
    // Clear input
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Add AI placeholder
    setMessages(prev => [...prev, { id: aiId, type: 'ai', text: '', loading: true, metadata: null }])
    setStreaming(true)

    let metadata = null
    let fullText = ''

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, mode }),
      })

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'metadata') {
              metadata = data
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, metadata } : m))
            } else if (data.type === 'chunk') {
              fullText += data.text
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: fullText, loading: false } : m))
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false } : m))
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === aiId
        ? { ...m, text: `Connection error: ${e.message}`, loading: false }
        : m))
    }
    setStreaming(false)
  }, [input, mode, streaming])

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const investigateIP = useCallback((ip) => {
    setInput(`Investigate IP ${ip} — show all activity and threat intel`)
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#0a0e1a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold">AI Security Analyst</h1>
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-full text-[10px] text-[#10b981] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full live-blink" /> Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-[#111827] border border-white/[0.06] rounded-xl p-0.5">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setModeAndSave(key)}
                title={MODES.find(m => m.key === key)?.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all ${
                  mode === key
                    ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff] font-semibold'
                    : 'text-[#4b5563] hover:text-[#9ca3af]'
                }`}>
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] text-[#374151]">{clock}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-3xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center mb-6 relative"
            >
              <Shield size={36} className="text-[#00d4ff]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#10b981] rounded-full border-2 border-[#0a0e1a] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-[24px] font-bold mb-2">CyberGuard SOC Co-Pilot</motion.h2>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-[#4b5563] text-[14px] mb-8 leading-relaxed">
              Ask me anything about your security events.<br />Analyzing Windows Event Log in real time.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="grid grid-cols-2 gap-2 w-full">
              {QUICK_QUERIES.map((q, i) => (
                <motion.button key={q}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 bg-[#111827] border border-white/[0.06] rounded-xl text-[13px] text-[#6b7280] hover:border-[rgba(0,212,255,0.25)] hover:text-[#e2e8f0] hover:bg-[rgba(0,212,255,0.04)] transition-all leading-snug">
                  {q}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {messages.map(msg => msg.type === 'user' ? (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-end gap-3">
            <div className="max-w-[70%] bg-[#1e2d4a] border border-[rgba(0,212,255,0.1)] rounded-2xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed text-[#e2e8f0]">
              {msg.text}
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#1a2035] border border-white/[0.06] flex items-center justify-center text-[12px] font-bold text-[#9ca3af] flex-shrink-0 mt-0.5">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </motion.div>
        ) : (
          <AIMessage key={msg.id} msg={msg}
            onInvestigateIP={investigateIP}
            onShowEvidence={setEvidenceData}
            onShowSoar={setSoarData} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0a0e1a] flex-shrink-0">
        <div className={`flex gap-3 items-end bg-[#111827] border rounded-2xl px-4 py-3 transition-all ${
          streaming ? 'border-white/[0.06]' : 'border-white/[0.06] focus-within:border-[rgba(0,212,255,0.3)] focus-within:shadow-[0_0_0_3px_rgba(0,212,255,0.08)]'
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e) }}
            onKeyDown={handleKeydown}
            placeholder="Ask about threats, logins, IPs, network activity..."
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#e2e8f0] placeholder-[#374151] resize-none leading-relaxed max-h-48 font-sans disabled:opacity-60"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || streaming}
            className="w-9 h-9 bg-[#00d4ff] hover:bg-[#00c4ef] active:bg-[#00b0d8] disabled:bg-[#1a2035] disabled:text-[#374151] rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed">
            {streaming
              ? <div className="w-3.5 h-3.5 border-2 border-[#374151] border-t-[#6b7280] rounded-full animate-spin" />
              : <Send size={14} className="text-[#0a0e1a]" />
            }
          </button>
        </div>
        <p className="text-[11px] text-[#374151] mt-2 text-center">
          Enter to send · Shift+Enter for new line · Sources: Windows Event Log · Network · IP Intel
        </p>
      </div>

      <EvidencePanel data={evidenceData} onClose={() => setEvidenceData(null)} onInvestigateIP={investigateIP} />
      <SOARModal playbook={soarData} onClose={() => setSoarData(null)} />
    </div>
  )
}
