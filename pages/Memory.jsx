import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CpuChipIcon, MagnifyingGlassIcon, ArrowPathIcon,
  FolderOpenIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, UserGroupIcon, GlobeAltIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const attackTypeColors = {
  brute_force: 'text-red-400 bg-red-500/20 border-red-500/30',
  lateral_movement: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  data_exfiltration: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  credential_stuffing: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  privilege_escalation: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
  impossible_travel: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  anomalous_access: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  unknown: 'text-gray-400 bg-gray-500/20 border-gray-500/30'
}

const CaseCard = ({ caseData, onSelect, isSelected }) => {
  const color = attackTypeColors[caseData.attack_type] || attackTypeColors.unknown

  return (
    <div
      onClick={() => onSelect(caseData)}
      className={`bg-gray-700 border rounded-lg p-4 cursor-pointer transition-all hover:border-gray-500 ${
        isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{caseData.title}</h4>
          <p className="text-xs text-gray-400 mt-0.5">Case #{caseData.id}</p>
        </div>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${color}`}>
          {caseData.attack_type?.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      <div className="flex items-center space-x-3 text-xs text-gray-400 mb-3">
        <span className={`flex items-center space-x-1 ${caseData.status === 'open' ? 'text-yellow-400' : 'text-green-400'}`}>
          {caseData.status === 'open' ? <ClockIcon className="h-3 w-3" /> : <CheckCircleIcon className="h-3 w-3" />}
          <span className="capitalize">{caseData.status}</span>
        </span>
        <span>Confidence: {caseData.confidence}%</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {caseData.affected_ips?.length > 0 && (
            <span className="flex items-center space-x-1">
              <GlobeAltIcon className="h-3 w-3" />
              <span>{caseData.affected_ips.length} IPs</span>
            </span>
          )}
          {caseData.affected_users?.length > 0 && (
            <span className="flex items-center space-x-1">
              <UserGroupIcon className="h-3 w-3" />
              <span>{caseData.affected_users.length} users</span>
            </span>
          )}
        </div>
        <span>{new Date(caseData.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

const CaseDetail = ({ caseId, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: () => api.request(`/api/memory/cases/${caseId}`)
  })

  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.request(`/api/memory/cases/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      toast.success('Case status updated')
      queryClient.invalidateQueries(['case-detail', caseId])
      queryClient.invalidateQueries(['memory-cases'])
    },
    onError: () => toast.error('Failed to update status')
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
    </div>
  )

  const caseData = data?.data?.case
  const alerts = data?.data?.related_alerts || []
  const logs = data?.data?.related_logs || []

  if (!caseData) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{caseData.title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition-colors">
          <XCircleIcon className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Case Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Attack Type', value: caseData.attack_type?.replace(/_/g, ' ') },
          { label: 'Status', value: caseData.status },
          { label: 'Confidence', value: `${caseData.confidence}%` },
          { label: 'Alerts', value: alerts.length }
        ].map((m, i) => (
          <div key={i} className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">{m.label}</p>
            <p className="text-sm font-semibold text-white capitalize">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      {caseData.summary && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Summary</h4>
          <p className="text-sm text-gray-100">{caseData.summary}</p>
        </div>
      )}

      {/* Affected Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caseData.affected_ips?.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Affected IPs ({caseData.affected_ips.length})</h4>
            <div className="flex flex-wrap gap-2">
              {caseData.affected_ips.map((ip, i) => (
                <span key={i} className="px-2 py-1 bg-gray-600 text-gray-200 rounded font-mono text-xs">{ip}</span>
              ))}
            </div>
          </div>
        )}
        {caseData.affected_users?.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Affected Users ({caseData.affected_users.length})</h4>
            <div className="flex flex-wrap gap-2">
              {caseData.affected_users.map((user, i) => (
                <span key={i} className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">{user}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Alerts */}
      {alerts.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Related Alerts ({alerts.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-0">
                <div>
                  <p className="text-xs font-medium text-white">{alert.alert_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    alert.severity === 'critical' ? 'text-red-400 bg-red-500/20' :
                    alert.severity === 'high' ? 'text-orange-400 bg-orange-500/20' :
                    'text-yellow-400 bg-yellow-500/20'
                  }`}>{alert.severity}</span>
                  <span className="text-xs text-gray-400">{alert.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {caseData.status === 'open' && (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => statusMutation.mutate({ id: caseId, status: 'closed' })}
            disabled={statusMutation.isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4" />
            <span>Close Case</span>
          </button>
        </div>
      )}
    </div>
  )
}

const Memory = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCase, setSelectedCase] = useState(null)
  const [activeTab, setActiveTab] = useState('cases')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['memory-cases', statusFilter],
    queryFn: () => api.request(`/api/memory/cases?status=${statusFilter}&limit=100`),
    refetchInterval: 60000
  })

  const { data: statsData } = useQuery({
    queryKey: ['memory-stats'],
    queryFn: () => api.request('/api/memory/stats/summary'),
    refetchInterval: 60000
  })

  const { data: patternsData } = useQuery({
    queryKey: ['attack-patterns'],
    queryFn: () => api.request('/api/memory/patterns/analysis?days=30'),
    enabled: activeTab === 'patterns'
  })

  const cases = (data?.data || []).filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.attack_type?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = statsData?.data || {}
  const patterns = patternsData?.data?.patterns || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investigation Memory</h1>
          <p className="text-gray-400 mt-1">Case management and attack pattern analysis</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: stats.total_cases || 0, color: 'text-cyan-400' },
          { label: 'Open Cases', value: stats.by_status?.open || 0, color: 'text-yellow-400' },
          { label: 'Closed Cases', value: stats.by_status?.closed || 0, color: 'text-green-400' },
          { label: 'Avg Resolution', value: `${stats.avg_resolution_hours || 0}h`, color: 'text-violet-400' }
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 border border-gray-700 rounded-lg p-1 w-fit">
        {['cases', 'patterns'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'cases' ? 'Investigation Cases' : 'Attack Patterns'}
          </button>
        ))}
      </div>

      {activeTab === 'cases' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="xl:col-span-1 space-y-4">
            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Cases */}
            <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CpuChipIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No cases found</p>
                </div>
              ) : (
                cases.map(c => (
                  <CaseCard
                    key={c.id}
                    caseData={c}
                    onSelect={setSelectedCase}
                    isSelected={selectedCase?.id === c.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Case Detail */}
          <div className="xl:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
            {selectedCase ? (
              <CaseDetail caseId={selectedCase.id} onClose={() => setSelectedCase(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FolderOpenIcon className="h-12 w-12 mb-3 opacity-40" />
                <p>Select a case to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="space-y-6">
          {patternsData?.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
            </div>
          ) : (
            <>
              {/* Attack Type Distribution */}
              {patterns.attack_type_trends && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Attack Type Distribution (30 days)</h3>
                  <div className="space-y-3">
                    {Object.entries(patterns.attack_type_trends.distribution || {}).map(([type, count]) => {
                      const total = Object.values(patterns.attack_type_trends.distribution).reduce((a, b) => a + b, 0)
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 capitalize">{type.replace(/_/g, ' ')}</span>
                            <span className="text-white font-medium">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Insights */}
              {patternsData?.data?.insights && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Insights</h3>
                  <div className="space-y-3">
                    {patternsData.data.insights.map((insight, i) => (
                      <div key={i} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                        <CpuChipIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-200">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Temporal Patterns */}
              {patterns.temporal_patterns && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-white mb-3">Temporal Patterns</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Night Attacks</span>
                        <span className="text-white">{patterns.temporal_patterns.night_attacks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weekend Attacks</span>
                        <span className="text-white">{patterns.temporal_patterns.weekend_attacks || 0}</span>
                      </div>
                      {patterns.temporal_patterns.peak_hours?.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Peak Hours</span>
                          <span className="text-white">{patterns.temporal_patterns.peak_hours.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-white mb-3">Severity Trends</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">High Confidence</span>
                        <span className="text-red-400">{patterns.severity_trends?.high_confidence_cases || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Medium Confidence</span>
                        <span className="text-yellow-400">{patterns.severity_trends?.medium_confidence_cases || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Confidence</span>
                        <span className="text-cyan-400">{Math.round(patterns.severity_trends?.average_confidence || 0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Memory
