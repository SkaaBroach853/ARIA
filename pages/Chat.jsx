/**
 * AI Analyst Chat
 * ✅ State persists across tab navigation (Zustand + localStorage)
 * ✅ Last 3 sessions accessible via history dropdown
 * ✅ Markdown rendering (**bold**, *italic*, `code`, lists)
 * ✅ SSE streaming from Ollama
 * ✅ File upload (.json, .csv, .txt, .log, .pcap)
 * ✅ Stop generation button
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  PaperAirplaneIcon, PaperClipIcon, XMarkIcon,
  DocumentTextIcon, ClockIcon, PlusIcon, ChevronDownIcon
} from '@heroicons/react/24/outline'
import { CpuChipIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { useChatStore } from '../store/chatStore'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AGENTS = [
  { id: 'stream',       label: 'Direct AI',   color: '#38bdf8', desc: 'Stream directly from Ollama' },
  { id: 'orchestrator', label: 'Orchestrator', color: '#a78bfa', desc: 'Multi-agent routing' },
  { id: 'triage',       label: 'Triage',       color: '#34d399', desc: 'Incident prioritisation' },
  { id: 'explainer',    label: 'Explainer',    color: '#fb923c', desc: 'Threat explanation' },
]

const SUGGESTIONS = [
  'Show me all failed logins in the last hour',
  'Any suspicious IP activity today?',
  'What is the highest severity threat right now?',
  'Summarise all critical alerts from the past 24 hours',
  'Generate an incident response playbook for the latest alert',
  'Correlate events around the most recent brute force attempt',
]

const FILE_ACCEPT = '.json,.csv,.txt,.log,.pcap,.syslog'

// ── Markdown renderer ─────────────────────────────────────────────────────────
// Handles **bold**, *italic*, `code`, ```blocks```, - lists, numbered lists
const Markdown = ({ text, streaming }) => {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-[#0d1424] border border-[#1e2d45] rounded-lg p-3 overflow-x-auto my-2">
          <code className="text-xs text-slate-300 mono">{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{inlineFormat(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-white mt-3 mb-1">{inlineFormat(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{inlineFormat(line.slice(2))}</h1>)
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="border-[#1e2d45] my-2" />)
    }
    // Unordered list
    else if (line.match(/^[-*+] /)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm text-slate-200 leading-relaxed">
          <span className="text-sky-400 mt-0.5 flex-shrink-0">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      )
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1]
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm text-slate-200 leading-relaxed">
          <span className="text-sky-400 font-medium flex-shrink-0 w-4">{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\. /, ''))}</span>
        </div>
      )
    }
    // Empty line → spacing
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-slate-200 leading-relaxed">
          {inlineFormat(line)}
        </p>
      )
    }
    i++
  }

  return (
    <div className="space-y-0.5">
      {elements}
      {streaming && (
        <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  )
}

// Inline formatting: **bold**, *italic*, `code`
function inlineFormat(text) {
  if (!text) return text
  const parts = []
  // Split on **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let match
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-white">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*')) {
      parts.push(<em key={key++} className="italic text-slate-300">{token.slice(1, -1)}</em>)
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={key++} className="bg-sky-500/10 text-sky-300 px-1 py-0.5 rounded text-xs mono">
          {token.slice(1, -1)}
        </code>
      )
    }
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

// ── Render message content ────────────────────────────────────────────────────
const renderContent = (content, streaming) => {
  if (typeof content === 'string') {
    return <Markdown text={content} streaming={streaming} />
  }
  if (typeof content === 'object' && content !== null) {
    return (
      <div className="space-y-3">
        {content.summary && <Markdown text={content.summary} />}
        {content.threat_type && content.threat_type !== 'unknown' && (
          <div className="flex flex-wrap gap-2">
            <span className="pill pill-info">{content.threat_type.replace(/_/g, ' ')}</span>
            {content.severity && <span className={`pill pill-${content.severity}`}>{content.severity}</span>}
            {content.confidence !== undefined && <span className="pill pill-info">{content.confidence}% confidence</span>}
          </div>
        )}
        {content.why_suspicious && (
          <div className="border-l-2 border-slate-600 pl-3">
            <p className="text-xs text-slate-400 mb-1 font-medium">Why it's suspicious</p>
            <p className="text-sm text-slate-300">{content.why_suspicious}</p>
          </div>
        )}
        {content.recommended_actions?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Recommended actions</p>
            <ol className="space-y-1">
              {content.recommended_actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-sky-400 font-medium flex-shrink-0">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {content.error && <p className="text-sm text-orange-400">⚠ {content.error}</p>}
      </div>
    )
  }
  return null
}

// ── Message bubble ────────────────────────────────────────────────────────────
const Message = ({ msg }) => {
  const isUser = msg.role === 'user'
  const agent  = AGENTS.find(a => a.id === msg.agent) || AGENTS[0]

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
        isUser ? 'bg-slate-600' : 'bg-gradient-to-br from-sky-500 to-blue-600'
      }`}>
        {isUser ? 'You' : <CpuChipIcon className="w-4 h-4" />}
      </div>

      <div className={`max-w-[82%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{isUser ? 'You' : agent.label}</span>
          <span className="text-xs text-slate-600">{new Date(msg.ts).toLocaleTimeString()}</span>
        </div>

        {msg.file && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e2d45] rounded-lg text-xs text-slate-400 mb-1">
            <DocumentTextIcon className="w-3.5 h-3.5 text-sky-400" />
            <span className="mono">{msg.file}</span>
          </div>
        )}

        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-sky-600/20 border border-sky-500/20 rounded-tr-sm'
            : 'bg-[#141d2e] border border-[#1e2d45] rounded-tl-sm'
        }`}>
          {isUser
            ? <p className="text-sm text-slate-200">{msg.content}</p>
            : renderContent(msg.content, msg.streaming)
          }
        </div>
      </div>
    </div>
  )
}

// ── History dropdown ──────────────────────────────────────────────────────────
const HistoryDropdown = ({ sessions, activeId, onSelect, onNew }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn btn-ghost text-xs flex items-center gap-1.5"
        title="Chat history"
      >
        <ClockIcon className="w-3.5 h-3.5" />
        History
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-[#141d2e] border border-[#1e2d45] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-up">
          <div className="px-3 py-2 border-b border-[#1e2d45] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Recent Sessions</span>
            <button
              onClick={() => { onNew(); setOpen(false) }}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              <PlusIcon className="w-3 h-3" /> New
            </button>
          </div>
          <div className="divide-y divide-[#1e2d45]">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelect(s.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors ${
                  s.id === activeId ? 'bg-sky-500/10' : ''
                }`}
              >
                <p className={`text-sm truncate ${s.id === activeId ? 'text-sky-400' : 'text-slate-200'}`}>
                  {s.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.messages.length - 1} message{s.messages.length !== 2 ? 's' : ''} ·{' '}
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const Chat = () => {
  const {
    sessions, activeSessionId,
    getMessages, getActive,
    setActiveSession, newSession: storeNewSession,
    addMessage, updateMessage, clearSession,
  } = useChatStore()

  const messages   = getMessages()
  const activeId   = getActive()?.id

  const [input, setInput]   = useState('')
  const [agent, setAgent]   = useState('stream')
  const [file, setFile]     = useState(null)
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef()
  const fileRef   = useRef()
  const inputRef  = useRef()
  const abortRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast.error('File too large — max 10 MB'); return }
    setFile({ name: f.name, raw: f })
    toast.success(`Attached: ${f.name}`)
    e.target.value = ''
  }

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    abortRef.current?.abort()
    setInput('')
    setLoading(true)

    const userMsg = { id: Date.now(), role: 'user', content: msg, file: file?.name, ts: Date.now() }
    addMessage(userMsg)

    const assistantId = Date.now() + 1
    addMessage({ id: assistantId, role: 'assistant', agent, content: '', streaming: true, ts: Date.now() })

    const setContent = (content, streaming) => updateMessage(assistantId, { content, streaming })

    try {
      if (file) {
        await _streamWithFile(msg, file.raw, setContent)
        setFile(null)
      } else if (agent === 'stream') {
        await _streamDirect(msg, setContent)
      } else {
        await _callOrchestrator(msg, agent, setContent)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setContent(`⚠ Error: ${err.message}`, false)
        toast.error('Request failed')
      }
    } finally {
      setLoading(false)
    }
  }, [input, loading, agent, file, addMessage, updateMessage])

  const _readSSE = async (response, setContent) => {
    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { setContent(full, false); return }
        full += data.replace(/\\n/g, '\n')
        setContent(full, true)
      }
    }
    setContent(full, false)
  }

  const _getToken = () => {
    try { return JSON.parse(localStorage.getItem('aria-auth'))?.state?.token || null } catch { return null }
  }

  const _streamDirect = async (msg, setContent) => {
    const ctrl = new AbortController(); abortRef.current = ctrl
    const res = await fetch(`${BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(_getToken() ? { Authorization: `Bearer ${_getToken()}` } : {}) },
      body: JSON.stringify({ message: msg }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await _readSSE(res, setContent)
  }

  const _streamWithFile = async (msg, rawFile, setContent) => {
    const ctrl = new AbortController(); abortRef.current = ctrl
    const fd = new FormData(); fd.append('message', msg); fd.append('agent', agent); fd.append('file', rawFile)
    const res = await fetch(`${BASE}/api/chat/with-file`, {
      method: 'POST',
      headers: _getToken() ? { Authorization: `Bearer ${_getToken()}` } : {},
      body: fd, signal: ctrl.signal,
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
    await _readSSE(res, setContent)
  }

  const _callOrchestrator = async (msg, agentId, setContent) => {
    const res = await fetch(`${BASE}/api/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(_getToken() ? { Authorization: `Bearer ${_getToken()}` } : {}) },
      body: JSON.stringify({ message: msg, agent: agentId }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const data = json?.data || json
    setContent(data?.response ?? data?.summary ?? JSON.stringify(data), false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI Analyst</h1>
          <p className="text-sm text-slate-400 mt-0.5">Powered by Ollama · llama3</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Agent selector */}
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => setAgent(a.id)} title={a.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                agent === a.id ? 'border-current bg-current/10' : 'border-[#1e2d45] text-slate-400 hover:text-slate-200'
              }`}
              style={agent === a.id ? { color: a.color, borderColor: a.color } : {}}
            >{a.label}</button>
          ))}
          {/* History */}
          <HistoryDropdown
            sessions={sessions}
            activeId={activeId}
            onSelect={setActiveSession}
            onNew={storeNewSession}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 card overflow-y-auto p-5 space-y-5">
        {messages.map(m => <Message key={m.id} msg={m} />)}

        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3 pl-11">
            <div className="bg-[#141d2e] border border-[#1e2d45] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <span>Analyzing{file ? ` ${file.name}` : ''}…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-left p-3 card card-hover rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#141d2e] border border-[#1e2d45] rounded-lg">
          <DocumentTextIcon className="w-4 h-4 text-sky-400" />
          <span className="text-xs text-slate-300 mono flex-1 truncate">{file.name}</span>
          <span className="text-xs text-slate-500">{(file.raw.size / 1024).toFixed(1)} KB</span>
          <button onClick={() => setFile(null)} className="p-0.5 text-slate-500 hover:text-red-400 transition-colors">
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="mt-2 flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden" accept={FILE_ACCEPT} onChange={handleFileSelect} />
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className={`btn btn-ghost p-2.5 flex-shrink-0 ${file ? 'text-sky-400 border-sky-500/30' : ''}`}>
          <PaperClipIcon className="w-4 h-4" />
        </button>
        <input ref={inputRef} className="input flex-1"
          placeholder={file ? `Ask about ${file.name}…` : `Ask the ${AGENTS.find(a => a.id === agent)?.label} agent…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={loading}
        />
        {loading ? (
          <button onClick={() => { abortRef.current?.abort(); setLoading(false) }}
            className="btn btn-danger p-2.5 flex-shrink-0" title="Stop">
            <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          </button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim() && !file}
            className="btn btn-primary p-2.5 flex-shrink-0">
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Chat
