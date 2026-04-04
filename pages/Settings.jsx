/**
 * Settings — Ollama AI engine, Telegram bot, AI queue, system info.
 * Accessible to all logged-in users; write actions require admin.
 */
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CpuChipIcon, ServerIcon, ArrowPathIcon,
  CheckCircleIcon, XCircleIcon, WrenchScrewdriverIcon,
  PaperAirplaneIcon, BellAlertIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, accent = 'text-sky-400' }) => (
  <div className="card p-5">
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1e2d45]">
      <Icon className={`w-4 h-4 ${accent}`} />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    {children}
  </div>
)

const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
)

const StatusBadge = ({ ok, label }) => (
  <div className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
    {ok
      ? <CheckCircleIcon className="w-4 h-4" />
      : <XCircleIcon className="w-4 h-4" />
    }
    {label}
  </div>
)

// ── Ollama section ────────────────────────────────────────────────────────────
const OllamaSection = ({ isAdmin }) => {
  const qc = useQueryClient()
  const [form, setForm] = useState({ url: '', model: '', timeout: 60 })
  const [init, setInit] = useState(false)

  const { data } = useQuery({
    queryKey: ['ollama-settings'],
    queryFn: () => api.request('/api/settings/ollama'),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (data?.data && !init) {
      setForm({ url: data.data.url || '', model: data.data.model || '', timeout: data.data.timeout || 60 })
      setInit(true)
    }
  }, [data, init])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.request('/api/settings/ollama', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success('Ollama settings saved'); qc.invalidateQueries(['ollama-settings']) },
    onError: (e) => toast.error(e.message),
  })

  const testMutation = useMutation({
    mutationFn: () => api.request('/api/settings/ollama/test', { method: 'POST' }),
    onSuccess: (res) => {
      const d = res.data
      d.status === 'connected'
        ? toast.success(`Connected · ${d.available_models?.length || 0} model(s)`)
        : toast.error(`Cannot connect: ${d.error}`)
      qc.invalidateQueries(['ollama-settings'])
    },
    onError: () => toast.error('Connection test failed'),
  })

  const conn = data?.data?.connection || {}

  const handleSave = (e) => {
    e.preventDefault()
    const d = data?.data || {}
    const payload = {}
    if (form.url !== d.url) payload.url = form.url
    if (form.model !== d.model) payload.model = form.model
    if (Number(form.timeout) !== d.timeout) payload.timeout = Number(form.timeout)
    if (!Object.keys(payload).length) return toast('No changes to save')
    saveMutation.mutate(payload)
  }

  return (
    <Section title="Local AI Engine (Ollama)" icon={CpuChipIcon}>
      {/* Status bar */}
      <div className={`flex items-center justify-between p-3 rounded-lg mb-5 border ${
        conn.status === 'connected' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div>
          <StatusBadge ok={conn.status === 'connected'} label={conn.status === 'connected' ? 'Connected' : 'Disconnected'} />
          {conn.status === 'connected' && conn.available_models?.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">Models: {conn.available_models.join(', ')}</p>
          )}
          {conn.error && <p className="text-xs text-red-400 mt-1">{conn.error}</p>}
        </div>
        <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="btn btn-ghost text-xs">
          {testMutation.isPending
            ? <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            : <ArrowPathIcon className="w-3.5 h-3.5" />}
          Test
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Ollama Server URL" hint="Direct URL to your local Ollama instance — no cloud, all inference stays on your machine.">
          <input className="input mono" value={form.url} disabled={!isAdmin}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="http://172.20.10.8:11434" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Active Model">
            <input className="input" value={form.model} disabled={!isAdmin}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="llama3" />
          </Field>
          <Field label="Timeout (seconds)">
            <input className="input" type="number" min={10} max={300} value={form.timeout} disabled={!isAdmin}
              onChange={e => setForm(f => ({ ...f, timeout: e.target.value }))} />
          </Field>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <p className="text-xs text-slate-500">Changes apply immediately — no restart needed.</p>
          </div>
        )}
      </form>
    </Section>
  )
}

// ── Telegram section ──────────────────────────────────────────────────────────
const TelegramSection = ({ isAdmin }) => {
  const qc = useQueryClient()
  const [form, setForm] = useState({ bot_token: '', chat_id: '', min_severity: 'high' })
  const [showToken, setShowToken] = useState(false)
  const [init, setInit] = useState(false)

  const { data } = useQuery({
    queryKey: ['telegram-settings'],
    queryFn: () => api.request('/api/settings/telegram'),
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (data?.data && !init) {
      setForm({
        bot_token:    data.data.bot_token    || '',
        chat_id:      data.data.chat_id      || '',
        min_severity: data.data.min_severity || 'high',
      })
      setInit(true)
    }
  }, [data, init])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.request('/api/settings/telegram', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success('Telegram settings saved'); qc.invalidateQueries(['telegram-settings']) },
    onError: (e) => toast.error(e.message),
  })

  const testMutation = useMutation({
    mutationFn: () => api.request('/api/settings/telegram/test', { method: 'POST' }),
    onSuccess: (res) => res.success ? toast.success(res.message) : toast.error(res.message),
    onError: (e) => toast.error(e.message),
  })

  const botStatus = data?.data?.bot_status || {}
  const configured = data?.data?.configured

  const handleSave = (e) => {
    e.preventDefault()
    saveMutation.mutate({
      bot_token:    form.bot_token,
      chat_id:      form.chat_id,
      min_severity: form.min_severity,
    })
  }

  return (
    <Section title="Telegram Bot — ARIACyberGuardbot" icon={PaperAirplaneIcon} accent="text-sky-400">
      {/* Bot status */}
      <div className={`flex items-center justify-between p-3 rounded-lg mb-5 border ${
        configured && botStatus.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-500/5 border-slate-500/20'
      }`}>
        <div>
          <StatusBadge
            ok={configured && botStatus.ok}
            label={configured && botStatus.ok
              ? `@${botStatus.username} is active`
              : configured ? 'Token invalid or bot unreachable' : 'Not configured'}
          />
          {configured && botStatus.ok && (
            <p className="text-xs text-slate-400 mt-1">
              Sending <span className="text-white font-medium">{form.min_severity}+</span> alerts to chat {form.chat_id}
            </p>
          )}
        </div>
        {configured && (
          <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="btn btn-ghost text-xs">
            {testMutation.isPending
              ? <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <PaperAirplaneIcon className="w-3.5 h-3.5" />}
            Send Test
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Field
          label="Bot Token"
          hint="Get this from @BotFather on Telegram. Keep it secret."
        >
          <div className="relative">
            <input
              className="input mono pr-16"
              type={showToken ? 'text' : 'password'}
              value={form.bot_token}
              disabled={!isAdmin}
              onChange={e => setForm(f => ({ ...f, bot_token: e.target.value }))}
              placeholder="1234567890:AAF..."
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        <Field
          label="Your Telegram Chat ID"
          hint="Your personal Telegram user ID. Send /start to @userinfobot to find it."
        >
          <input
            className="input mono"
            value={form.chat_id}
            disabled={!isAdmin}
            onChange={e => setForm(f => ({ ...f, chat_id: e.target.value }))}
            placeholder="5864243940"
          />
        </Field>

        <Field label="Minimum Alert Severity" hint="Only alerts at this level or above will be sent to Telegram.">
          <select
            className="input"
            value={form.min_severity}
            disabled={!isAdmin}
            onChange={e => setForm(f => ({ ...f, min_severity: e.target.value }))}
          >
            {['low', 'medium', 'high', 'critical'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        {isAdmin && (
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? 'Saving…' : 'Save Telegram Settings'}
            </button>
          </div>
        )}
      </form>

      {/* How it works */}
      <div className="mt-5 pt-4 border-t border-[#1e2d45]">
        <p className="text-xs font-medium text-slate-400 mb-2">Bot commands (send from Telegram)</p>
        <div className="space-y-1">
          {[
            ['/start', 'Welcome message and command list'],
            ['/status', 'Current system health and monitoring status'],
            ['/alerts', 'Last 5 security alerts'],
          ].map(([cmd, desc]) => (
            <div key={cmd} className="flex items-center gap-3 text-xs">
              <span className="mono text-sky-400 w-16 flex-shrink-0">{cmd}</span>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Queue section ─────────────────────────────────────────────────────────────
const QueueSection = () => {
  const { data } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => api.request('/api/settings/queue'),
    refetchInterval: 3000,
  })
  const q = data?.data || {}

  return (
    <Section title="AI Analysis Queue" icon={ServerIcon}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Queued',     value: q.queue_depth ?? '—', color: q.queue_depth > 5 ? 'text-amber-400' : 'text-white' },
          { label: 'Processing', value: q.processing  ?? '—', color: q.processing > 0 ? 'text-sky-400' : 'text-white' },
          { label: 'Completed',  value: q.done        ?? '—', color: 'text-emerald-400' },
          { label: 'Failed',     value: q.failed      ?? '—', color: q.failed > 0 ? 'text-red-400' : 'text-white' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1424] rounded-lg p-3 border border-[#1e2d45]">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Jobs are processed one at a time to prevent flooding the local Ollama instance.
        Workers: {q.workers ?? 1}
      </p>
    </Section>
  )
}

// ── System info section ───────────────────────────────────────────────────────
const SystemSection = () => {
  const { data } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => api.request('/api/settings/system'),
    refetchInterval: 60000,
  })
  const s = data?.data || {}

  return (
    <Section title="System Information" icon={WrenchScrewdriverIcon}>
      <div className="divide-y divide-[#1e2d45]">
        {[
          ['Operating System', s.os],
          ['Hostname',         s.hostname],
          ['Python',           s.python?.split(' ')[0]],
          ['Ollama URL',       s.ollama_url],
          ['Active Model',     s.ollama_model],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2.5">
            <span className="text-xs text-slate-500">{k}</span>
            <span className="text-sm text-slate-200 mono">{v || '—'}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Settings = () => {
  const { isAdmin } = useAuthStore()
  const admin = isAdmin()

  return (
    <div className="space-y-5 animate-fade-up max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configure AI engine, Telegram alerts, and view system status.
          {!admin && <span className="text-amber-400"> (Read-only — contact admin to make changes)</span>}
        </p>
      </div>

      <OllamaSection isAdmin={admin} />
      <TelegramSection isAdmin={admin} />
      <QueueSection />
      <SystemSection />
    </div>
  )
}

export default Settings
