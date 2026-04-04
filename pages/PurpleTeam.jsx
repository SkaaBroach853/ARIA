import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BeakerIcon, PlayIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const sevPill = { critical: 'pill-critical', high: 'pill-high', medium: 'pill-medium', low: 'pill-low' }

const PurpleTeam = () => {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ source_ip: '185.220.101.45', target_user: 'jsmith', notes: '' })
  const [lastResult, setLastResult] = useState(null)

  const { data: scenariosData } = useQuery({
    queryKey: ['purple-scenarios'],
    queryFn: () => api.getPurpleScenarios(),
  })

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['purple-history'],
    queryFn: () => api.getPurpleHistory(),
    refetchInterval: 30000,
  })

  const runMutation = useMutation({
    mutationFn: (data) => api.runPurpleScenario(data),
    onSuccess: (res) => {
      setLastResult(res.data)
      toast.success(`Scenario executed — ${res.data.logs_generated} events injected`)
      qc.invalidateQueries(['purple-history'])
      qc.invalidateQueries(['logs'])
      qc.invalidateQueries(['recent-alerts'])
    },
    onError: (e) => toast.error(`Scenario failed: ${e.message}`),
  })

  const scenarios = scenariosData?.data || {}
  const history = historyData?.data || []

  const handleRun = () => {
    if (!selected) return toast.error('Select a scenario first')
    runMutation.mutate({ scenario_id: selected, ...form })
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BeakerIcon className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold text-white">Purple Team Testing</h1>
        </div>
        <p className="text-sm text-slate-400">
          Simulate controlled security events to validate detection and alerting pipelines.
          All simulated events are clearly tagged and can be filtered out of production views.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          These simulations inject real log entries and alerts into the system. Use only in controlled environments.
          All injected events are tagged with <code className="mono text-amber-200">simulation: true</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scenario selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Select Scenario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(scenarios).map(([id, sc]) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selected === id
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-[#1e2d45] hover:border-[#243550] bg-[#0d1424]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-white">{sc.name}</span>
                    <span className={`pill ${sevPill[sc.severity]} flex-shrink-0`}>{sc.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
                  <p className="text-xs text-slate-500 mt-2">{sc.count} events generated</p>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Simulation Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Source IP</label>
                <input className="input mono" value={form.source_ip}
                  onChange={e => setForm(f => ({ ...f, source_ip: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Target User</label>
                <input className="input" value={form.target_user}
                  onChange={e => setForm(f => ({ ...f, target_user: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes (optional)</label>
                <input className="input" placeholder="e.g. Q2 detection validation test"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleRun}
                disabled={!selected || runMutation.isPending}
                className="btn btn-primary"
              >
                {runMutation.isPending ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                ) : (
                  <><PlayIcon className="w-4 h-4" />Run Scenario</>
                )}
              </button>
            </div>
          </div>

          {/* Last result */}
          {lastResult && (
            <div className="card p-5 border-emerald-500/20 bg-emerald-500/5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">Scenario Executed Successfully</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {[
                  ['Scenario', lastResult.scenario?.name],
                  ['Events Injected', lastResult.logs_generated],
                  ['Alert ID', `#${lastResult.alert_id}`],
                  ['Run By', lastResult.run_by],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                    <div className="text-slate-200 font-medium">{v}</div>
                  </div>
                ))}
              </div>
              {lastResult.notes && (
                <p className="text-xs text-slate-400 mt-3 border-t border-[#1e2d45] pt-3">
                  Notes: {lastResult.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* History */}
        <div className="card flex flex-col">
          <div className="px-5 py-4 border-b border-[#1e2d45] flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Run History</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e2d45]">
            {histLoading ? (
              <div className="p-5 text-center text-slate-500 text-sm">Loading...</div>
            ) : history.length === 0 ? (
              <div className="p-5 text-center text-slate-500 text-sm">No runs yet</div>
            ) : history.map(run => (
              <div key={run.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-200 capitalize">{run.scenario?.replace(/_/g, ' ')}</span>
                  <span className={`pill ${sevPill[run.severity]}`}>{run.severity}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{new Date(run.timestamp).toLocaleString()}</span>
                  <span>{run.logs_count} events</span>
                  <span className={run.status === 'open' ? 'text-amber-400' : 'text-emerald-400'}>
                    {run.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurpleTeam
