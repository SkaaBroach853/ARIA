import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CogIcon, PlayIcon, XMarkIcon, CheckCircleIcon,
  ClockIcon, ExclamationTriangleIcon, ArrowPathIcon,
  FunnelIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const priorityColors = {
  critical: 'text-red-400 bg-red-500/20 border-red-500/40',
  high: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
  medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
  low: 'text-green-400 bg-green-500/20 border-green-500/40'
}

const statusColors = {
  pending: 'text-yellow-400 bg-yellow-500/20',
  executed: 'text-green-400 bg-green-500/20',
  dismissed: 'text-gray-400 bg-gray-500/20'
}

const actionTypeLabels = {
  block_ip: 'Block IP',
  disable_account: 'Disable Account',
  alert_admin: 'Alert Admin',
  isolate_host: 'Isolate Host',
  reset_password: 'Reset Password',
  revoke_session: 'Revoke Session',
  quarantine_file: 'Quarantine File',
  update_firewall: 'Update Firewall'
}

const PlaybookTemplates = () => {
  const templates = [
    { id: 'brute_force', name: 'Brute Force Response', icon: '🔐', steps: ['Block IP', 'Lock Account', 'Audit Sessions', 'Update Policy'] },
    { id: 'lateral_movement', name: 'Lateral Movement', icon: '🔀', steps: ['Isolate Systems', 'Disable Accounts', 'Audit Traffic', 'Reset Credentials'] },
    { id: 'data_exfiltration', name: 'Data Exfiltration', icon: '📤', steps: ['Block Transfers', 'Isolate Systems', 'Identify Data', 'Notify Parties'] },
    { id: 'malware', name: 'Malware Response', icon: '🦠', steps: ['Isolate Host', 'Stop Processes', 'Scan Systems', 'Remove Malware'] }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {templates.map(t => (
        <div key={t.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-cyan-500/50 transition-colors cursor-pointer group">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{t.icon}</span>
            <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{t.name}</h4>
          </div>
          <div className="space-y-1">
            {t.steps.map((step, i) => (
              <div key={i} className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 flex-shrink-0">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const ActionCard = ({ action, onExecute, onDismiss, isExecuting, isDismissing }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[action.priority] || priorityColors.medium}`}>
              {(action.priority || 'medium').toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[action.status] || statusColors.pending}`}>
              {(action.status || 'pending').toUpperCase()}
            </span>
            {action.automated && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-cyan-400 bg-cyan-500/20">AUTO</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white">
            {actionTypeLabels[action.action_type] || action.action_type}
          </h4>
          <p className="text-xs text-gray-400 mt-1">Target: <span className="text-gray-200 font-mono">{action.target}</span></p>
        </div>
        <div className="text-xs text-gray-500 ml-4 text-right">
          <div>#{action.id}</div>
          {action.case_id && <div>Case #{action.case_id}</div>}
        </div>
      </div>

      {/* Playbook Steps */}
      {action.playbook_steps && action.playbook_steps.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {expanded ? '▼' : '▶'} {action.playbook_steps.length} playbook steps
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {action.playbook_steps.map((step, i) => (
                <div key={i} className="flex items-start space-x-2 text-xs text-gray-300">
                  <span className="text-cyan-400 flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execution result */}
      {action.result && (
        <div className="mb-3 p-2 bg-gray-800 rounded text-xs text-gray-300 border border-gray-600">
          <span className="text-gray-400">Result: </span>{action.result}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>Created: {new Date(action.created_at).toLocaleString()}</span>
        {action.executed_at && <span>Executed: {new Date(action.executed_at).toLocaleString()}</span>}
      </div>

      {/* Actions */}
      {action.status === 'pending' && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onExecute(action.id)}
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {isExecuting ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlayIcon className="h-3 w-3" />
            )}
            <span>Execute</span>
          </button>
          <button
            onClick={() => onDismiss(action.id)}
            disabled={isDismissing}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            <XMarkIcon className="h-3 w-3" />
            <span>Dismiss</span>
          </button>
        </div>
      )}
      {action.status === 'executed' && (
        <div className="flex items-center space-x-1 text-xs text-green-400">
          <CheckCircleIcon className="h-4 w-4" />
          <span>Executed by {action.executed_by || 'system'}</span>
        </div>
      )}
    </div>
  )
}

const SOAR = () => {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ status: 'all', priority: 'all' })
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('actions')
  const [executingId, setExecutingId] = useState(null)
  const [dismissingId, setDismissingId] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['soar-actions', filters],
    queryFn: () => api.request(`/api/soar/?status=${filters.status}&priority=${filters.priority}&limit=100`),
    refetchInterval: 30000
  })

  const { data: stats } = useQuery({
    queryKey: ['soar-stats'],
    queryFn: () => api.request('/api/soar/stats/summary'),
    refetchInterval: 60000
  })

  const executeMutation = useMutation({
    mutationFn: (actionId) => api.request(`/api/soar/${actionId}/execute`, { method: 'POST', body: JSON.stringify({ executed_by: 'analyst' }) }),
    onSuccess: () => {
      toast.success('Action executed successfully')
      queryClient.invalidateQueries(['soar-actions'])
      queryClient.invalidateQueries(['soar-stats'])
      setExecutingId(null)
    },
    onError: () => { toast.error('Failed to execute action'); setExecutingId(null) }
  })

  const dismissMutation = useMutation({
    mutationFn: (actionId) => api.request(`/api/soar/${actionId}/dismiss`, { method: 'POST', body: JSON.stringify({ dismissed_by: 'analyst' }) }),
    onSuccess: () => {
      toast.success('Action dismissed')
      queryClient.invalidateQueries(['soar-actions'])
      queryClient.invalidateQueries(['soar-stats'])
      setDismissingId(null)
    },
    onError: () => { toast.error('Failed to dismiss action'); setDismissingId(null) }
  })

  const handleExecute = (id) => { setExecutingId(id); executeMutation.mutate(id) }
  const handleDismiss = (id) => { setDismissingId(id); dismissMutation.mutate(id) }

  const actions = (data?.data || []).filter(a =>
    !search || a.target?.toLowerCase().includes(search.toLowerCase()) ||
    a.action_type?.toLowerCase().includes(search.toLowerCase())
  )

  const statsData = stats?.data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SOAR Playbooks</h1>
          <p className="text-gray-400 mt-1">Security Orchestration, Automation and Response</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Actions', value: statsData.pending_actions || 0, color: 'text-yellow-400', bg: 'bg-yellow-500' },
          { label: 'Executed', value: statsData.by_status?.executed || 0, color: 'text-green-400', bg: 'bg-green-500' },
          { label: 'Automation Rate', value: `${statsData.automation_rate || 0}%`, color: 'text-cyan-400', bg: 'bg-cyan-500' },
          { label: 'Total Actions', value: statsData.total_actions || 0, color: 'text-violet-400', bg: 'bg-violet-500' }
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className={`w-8 h-8 ${s.bg} rounded-lg opacity-80`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 border border-gray-700 rounded-lg p-1 w-fit">
        {['actions', 'playbooks'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'actions' ? 'Response Actions' : 'Playbook Templates'}
          </button>
        ))}
      </div>

      {activeTab === 'actions' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-48 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by target or action type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {['all', 'pending', 'executed', 'dismissed'].map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {['all', 'critical', 'high', 'medium', 'low'].map(p => (
                <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Actions Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CogIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No SOAR actions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {actions.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onExecute={handleExecute}
                  onDismiss={handleDismiss}
                  isExecuting={executingId === action.id}
                  isDismissing={dismissingId === action.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'playbooks' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Pre-built response playbooks for common attack scenarios</p>
          <PlaybookTemplates />
        </div>
      )}
    </div>
  )
}

export default SOAR
