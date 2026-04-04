import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BeakerIcon, PlayIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, ChartBarIcon, ArrowPathIcon, EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const attackTypeConfig = {
  brute_force: { icon: '🔐', color: 'from-red-500 to-red-600', label: 'Brute Force' },
  credential_stuffing: { icon: '🎭', color: 'from-orange-500 to-orange-600', label: 'Credential Stuffing' },
  lateral_movement: { icon: '🔀', color: 'from-yellow-500 to-yellow-600', label: 'Lateral Movement' },
  data_exfiltration: { icon: '📤', color: 'from-purple-500 to-purple-600', label: 'Data Exfiltration' },
  apt_multistage: { icon: '🎯', color: 'from-pink-500 to-pink-600', label: 'APT Multi-Stage' },
  insider_threat: { icon: '👤', color: 'from-blue-500 to-blue-600', label: 'Insider Threat' },
  ransomware_precursor: { icon: '💀', color: 'from-gray-500 to-gray-600', label: 'Ransomware Precursor' }
}

const defaultParams = {
  brute_force: { target_username: 'admin', source_ip: '185.220.101.45', attempt_count: 50 },
  credential_stuffing: { username_list_size: 100, ip_pool_size: 20 },
  lateral_movement: { entry_host: '10.0.1.100', target_host_count: 5 },
  data_exfiltration: { source_host: '10.0.1.55', data_volume_mb: 500, destination_ip: '45.33.32.156' },
  apt_multistage: { campaign_duration_hours: 24, stealth_level: 'medium' },
  insider_threat: { user_role: 'analyst', data_type: 'financial' },
  ransomware_precursor: { target_system_count: 10, encryption_simulation: false }
}

const SimulationResult = ({ result, onClose }) => {
  const [showLogs, setShowLogs] = useState(false)
  const detected = result.detected
  const detection = result.aria_detection || {}

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 rounded-t-xl bg-gradient-to-r ${detected ? 'from-green-900/50 to-green-800/30' : 'from-red-900/50 to-red-800/30'} border-b border-gray-700`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${detected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {detected ? '✅' : '❌'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {detected ? 'THREAT DETECTED' : 'THREAT MISSED'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {result.attack_type?.replace(/_/g, ' ')} simulation • ID #{result.id}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <XCircleIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Detection Time', value: result.detection_time_ms ? `${result.detection_time_ms}ms` : 'N/A', color: 'text-cyan-400' },
              { label: 'Confidence', value: `${result.confidence}%`, color: detected ? 'text-green-400' : 'text-red-400' },
              { label: 'Logs Generated', value: result.generated_logs?.length || 0, color: 'text-blue-400' },
              { label: 'Alerts Triggered', value: detection.triggered_alerts?.length || 0, color: 'text-yellow-400' }
            ].map((m, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Detection Summary */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Detection Summary</h3>
            <p className="text-sm text-gray-200">{detection.summary || 'No summary available'}</p>
          </div>

          {/* Triggered Alerts */}
          {detection.triggered_alerts?.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Triggered Alerts</h3>
              <div className="space-y-2">
                {detection.triggered_alerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                    <span className="text-sm text-gray-200">{alert.alert_type?.replace(/_/g, ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{alert.severity}</span>
                      <span className="text-xs text-gray-400">{alert.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {detection.recommended_actions?.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recommended Actions</h3>
              <ul className="space-y-1">
                {detection.recommended_actions.map((action, i) => (
                  <li key={i} className="flex items-center space-x-2 text-sm text-gray-200">
                    <span className="text-cyan-400">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Logs Toggle */}
          {result.generated_logs?.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center space-x-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <EyeIcon className="h-4 w-4" />
                <span>{showLogs ? 'Hide' : 'Show'} Generated Logs ({result.generated_logs.length})</span>
              </button>
              {showLogs && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                  {result.generated_logs.map((log, i) => (
                    <div key={i} className="p-2 bg-gray-900 rounded text-xs font-mono text-gray-300 border border-gray-700">
                      <span className="text-gray-500">{log.timestamp}</span>
                      {' '}
                      <span className="text-cyan-400">[{log.source}]</span>
                      {' '}
                      <span className="text-gray-200">{log.event_type}</span>
                      {log.ip_address && <span className="text-yellow-400"> {log.ip_address}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const Simulation = () => {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState('brute_force')
  const [params, setParams] = useState(defaultParams.brute_force)
  const [result, setResult] = useState(null)

  const { data: typesData } = useQuery({
    queryKey: ['sim-types'],
    queryFn: () => api.request('/api/simulate/types')
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sim-history'],
    queryFn: () => api.request('/api/simulate/history?limit=20'),
    refetchInterval: 30000
  })

  const { data: statsData } = useQuery({
    queryKey: ['sim-stats'],
    queryFn: () => api.request('/api/simulate/stats/summary'),
    refetchInterval: 60000
  })

  const runMutation = useMutation({
    mutationFn: () => api.request('/api/simulate/', {
      method: 'POST',
      body: JSON.stringify({ attack_type: selectedType, parameters: params })
    }),
    onSuccess: (data) => {
      toast.success(`Simulation complete: ${data.data?.detected ? 'DETECTED' : 'NOT DETECTED'}`)
      setResult(data.data)
      queryClient.invalidateQueries(['sim-history'])
      queryClient.invalidateQueries(['sim-stats'])
    },
    onError: () => toast.error('Simulation failed')
  })

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    setParams(defaultParams[type] || {})
  }

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const simTypes = typesData?.data?.simulation_types || {}
  const history = historyData?.data?.simulations || []
  const stats = statsData?.data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Red Team Simulation</h1>
          <p className="text-gray-400 mt-1">Test ARIA's detection capabilities against simulated attacks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Simulations', value: stats.total_simulations || 0, color: 'text-cyan-400' },
          { label: 'Detection Rate', value: `${stats.overall_detection_rate || 0}%`, color: 'text-green-400' },
          { label: 'Avg Detection Time', value: stats.avg_detection_time_ms ? `${Math.round(stats.avg_detection_time_ms)}ms` : 'N/A', color: 'text-yellow-400' },
          { label: 'Performance Grade', value: stats.performance_grade || 'N/A', color: 'text-violet-400' }
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Simulation Builder */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Configure Simulation</h2>

            {/* Attack Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Attack Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {Object.entries(attackTypeConfig).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedType === type
                        ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-xl mb-1">{cfg.icon}</div>
                    <div className="text-xs font-medium text-white">{cfg.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attack Description */}
            {simTypes[selectedType] && (
              <div className="mb-6 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-300">{simTypes[selectedType].description}</p>
              </div>
            )}

            {/* Parameters */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Parameters</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(params).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    {typeof value === 'boolean' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleParamChange(key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-gray-600'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm text-gray-300">{value ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={e => handleParamChange(key, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
            >
              {runMutation.isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running Simulation...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>

          {/* Per-type Stats */}
          {stats.by_attack_type?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-base font-semibold text-white mb-4">Detection by Attack Type</h3>
              <div className="space-y-3">
                {stats.by_attack_type.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{item.attack_type?.replace(/_/g, ' ')}</span>
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span>{item.total_simulations} runs</span>
                        <span className={item.detection_rate >= 80 ? 'text-green-400' : item.detection_rate >= 60 ? 'text-yellow-400' : 'text-red-400'}>
                          {item.detection_rate}% detected
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.detection_rate >= 80 ? 'bg-green-500' : item.detection_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${item.detection_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Simulation History</h3>
            <ClockIcon className="h-4 w-4 text-gray-400" />
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <BeakerIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No simulations yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {history.map((sim, i) => {
                const cfg = attackTypeConfig[sim.attack_type] || { icon: '⚡', label: sim.attack_type }
                return (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{cfg.label}</p>
                      <p className="text-xs text-gray-400">{new Date(sim.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {sim.detected ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-400" />
                      )}
                      <p className="text-xs text-gray-400">{sim.confidence}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {result && <SimulationResult result={result} onClose={() => setResult(null)} />}
    </div>
  )
}

export default Simulation
