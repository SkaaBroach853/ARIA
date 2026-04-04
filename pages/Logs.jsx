import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MagnifyingGlassIcon, ArrowPathIcon, CloudArrowUpIcon,
  ComputerDesktopIcon, ChevronRightIcon, ChevronDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const sevPill = { critical: 'pill-critical', high: 'pill-high', medium: 'pill-medium', low: 'pill-low' }
const srcColor = { login: 'text-sky-400', network: 'text-purple-400', system: 'text-emerald-400' }

const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false)
  const raw = (() => { try { return JSON.parse(log.raw_data) } catch { return { message: log.raw_data } } })()
  const message = raw.message || raw.eventMessage || raw.line || log.event_type || '—'

  return (
    <>
      <tr
        className="border-b border-[#1e2d45] hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 text-xs text-slate-500 mono whitespace-nowrap">
          {new Date(log.timestamp).toLocaleTimeString()}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium capitalize ${srcColor[log.source] || 'text-slate-400'}`}>
            {log.source}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`pill ${sevPill[log.severity] || 'pill-info'}`}>{log.severity}</span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-300 max-w-xs">
          <span className="clamp-1">{message}</span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 mono">{log.ip_address || '—'}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{log.user_id || '—'}</td>
        <td className="px-4 py-3 text-slate-600">
          {open ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-[#0d1424]">
          <td colSpan={7} className="px-4 py-3">
            <pre className="text-xs text-slate-400 overflow-x-auto max-h-40 leading-relaxed mono">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

const Logs = () => {
  const qc = useQueryClient()
  // Default to showing only security-relevant logs (medium+), not filesystem noise
  const [filters, setFilters] = useState({ source: 'all', severity: 'all', search: '' })
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', filters, page, showAll],
    queryFn: () => {
      // By default show only security-relevant logs (login + network + high/medium system)
      // showAll = true shows everything including filesystem noise
      const sev = !showAll && filters.severity === 'all' ? '' : filters.severity
      const src = !showAll && filters.source === 'all' ? '' : filters.source
      let url = `/api/logs/?page=${page}&limit=50`
      if (src) url += `&source=${src}`
      if (sev) url += `&severity=${sev}`
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`
      return api.request(url)
    },
    refetchInterval: 10000  // refresh every 10s for real-time feel
  })

  const collectMutation = useMutation({
    mutationFn: () => api.request('/api/system-logs/collect?minutes=5', { method: 'POST' }),
    onSuccess: (d) => {
      toast.success(`Collected ${d.data?.inserted || 0} device logs`)
      qc.invalidateQueries(['logs'])
    },
    onError: () => toast.error('Device log collection failed')
  })

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData(); fd.append('file', file)
      return api.request('/api/upload/', { method: 'POST', body: fd })
    },
    onSuccess: (d) => {
      toast.success(`Uploaded ${d.data?.logs_inserted || 0} log entries`)
      qc.invalidateQueries(['logs'])
    },
    onError: () => toast.error('Upload failed')
  })

  const logs = data?.data || []
  const total = data?.total || 0
  const pages = data?.pages || 1

  const setFilter = (k, v) => { setFilters(p => ({ ...p, [k]: v })); setPage(1) }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Security Logs</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {total.toLocaleString()} events · <span className="text-emerald-400">Live from your system</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => collectMutation.mutate()}
            disabled={collectMutation.isPending}
            className="btn btn-success"
          >
            <ComputerDesktopIcon className="w-4 h-4" />
            {collectMutation.isPending ? 'Collecting...' : 'Collect Device Logs'}
          </button>
          <label className="btn btn-ghost cursor-pointer">
            <CloudArrowUpIcon className="w-4 h-4" />
            Upload File
            <input type="file" className="hidden" accept=".txt,.log,.csv,.json"
              onChange={e => { if (e.target.files[0]) uploadMutation.mutate(e.target.files[0]) }} />
          </label>
          <button onClick={() => refetch()} className="btn btn-ghost">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by message, IP, or user..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <select className="input w-36" value={filters.source} onChange={e => setFilter('source', e.target.value)}>
          {['all', 'login', 'network', 'system'].map(o => (
            <option key={o} value={o}>{o === 'all' ? 'All sources' : o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
        <select className="input w-36" value={filters.severity} onChange={e => setFilter('severity', e.target.value)}>
          {['all', 'critical', 'high', 'medium', 'low'].map(o => (
            <option key={o} value={o}>{o === 'all' ? 'All severities' : o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
        {/* Toggle to show/hide filesystem noise */}
        <button
          onClick={() => { setShowAll(v => !v); setPage(1) }}
          className={`btn text-xs ${showAll ? 'btn-ghost' : 'btn-primary'}`}
          title="Toggle between security events only and all system logs"
        >
          {showAll ? 'Security Events Only' : 'Showing: Security Events'}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                {['Time', 'Source', 'Severity', 'Message', 'IP Address', 'User', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-[#1e2d45]">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    No logs found matching your filters
                  </td>
                </tr>
              ) : logs.map(log => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2d45]">
            <span className="text-sm text-slate-500">Page {page} of {pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-ghost">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs
