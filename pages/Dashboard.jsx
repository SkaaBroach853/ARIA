import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldExclamationIcon, DocumentTextIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

// ── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline = ({ data = [], color = '#38bdf8', height = 36 }) => {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const w = data.length * 6
  const pts = data.map((v, i) => `${i * 6 + 3},${height - 2 - ((v / max) * (height - 6))}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, spark = [], trend }) => {
  const colors = {
    red:   { icon: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    spark: '#f87171' },
    sky:   { icon: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    spark: '#38bdf8' },
    green: { icon: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',spark: '#34d399' },
    amber: { icon: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  spark: '#fbbf24' },
  }
  const c = colors[color] || colors.sky

  return (
    <div className={`card p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {trend >= 0 ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      {spark.length > 0 && <Sparkline data={spark} color={c.spark} />}
    </div>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ data = [] }) => {
  const total = data.reduce((s, d) => s + (d.count || 0), 0)
  if (!total) return (
    <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data yet</div>
  )
  const r = 40, cx = 56, cy = 56, sw = 14
  const circ = 2 * Math.PI * r
  let cum = 0
  return (
    <div className="flex items-center gap-6">
      <svg width={112} height={112} viewBox="0 0 112 112" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth={sw} />
        {data.map((seg, i) => {
          const pct = seg.count / total
          const dash = pct * circ
          const off = -(cum * circ)
          cum += pct
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={off}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          )
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Inter">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">total</text>
      </svg>
      <div className="space-y-2 flex-1">
        {data.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
              <span className="text-sm text-slate-300 capitalize">{seg.severity || seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{seg.count}</span>
              <span className="text-xs text-slate-500">{Math.round((seg.count / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bar chart ────────────────────────────────────────────────────────────────
const BarChart = ({ data = [], xKey, yKeys = [], colors = [], height = 120 }) => {
  if (!data.length) return (
    <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>No data yet</div>
  )
  const maxVal = Math.max(...data.flatMap(d => yKeys.map(k => d[k] || 0)), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-px" style={{ height: height - 18 }}>
            {yKeys.map((k, ki) => {
              const pct = ((d[k] || 0) / maxVal) * 100
              return (
                <div key={k} className="flex-1 rounded-t transition-all duration-500"
                  style={{ height: `${pct}%`, background: colors[ki] || '#38bdf8', minHeight: d[k] > 0 ? 2 : 0 }}
                  title={`${k}: ${d[k]}`}
                />
              )
            })}
          </div>
          <span className="text-[10px] text-slate-500 truncate w-full text-center">{d[xKey]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Recent alerts ────────────────────────────────────────────────────────────
const RecentAlerts = ({ alerts = [], isLoading }) => {
  const sevColor = {
    critical: { pill: 'pill-critical', dot: 'bg-red-400' },
    high:     { pill: 'pill-high',     dot: 'bg-orange-400' },
    medium:   { pill: 'pill-medium',   dot: 'bg-yellow-400' },
    low:      { pill: 'pill-low',      dot: 'bg-emerald-400' },
  }

  return (
    <div className="card flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#1e2d45] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
        <span className="text-xs text-slate-500">{alerts.length} shown</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e2d45]">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="skeleton w-16 h-5" />
              <div className="skeleton flex-1 h-4" />
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <CheckCircleIcon className="w-8 h-8 mb-2 text-emerald-500/50" />
            <p className="text-sm">No alerts right now</p>
          </div>
        ) : alerts.map((a, i) => {
          const sc = sevColor[a.severity] || sevColor.low
          return (
            <div key={a.id || i} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sc.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 clamp-2">{a.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`pill ${sc.pill}`}>{a.severity}</span>
                  {a.ip_address && <span className="text-xs text-slate-500 mono">{a.ip_address}</span>}
                  <span className="text-xs text-slate-500">
                    {new Date(a.timestamp || a.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Agent status ─────────────────────────────────────────────────────────────
const AgentStatus = () => {
  const { data } = useQuery({
    queryKey: ['agent-status'],
    queryFn: () => api.request('/api/agents/status'),
    refetchInterval: 15000
  })

  const agents = [
    { name: 'Orchestrator', key: 'orchestrator' },
    { name: 'Triage',       key: 'triage' },
    { name: 'Correlation',  key: 'correlation' },
    { name: 'SOAR',         key: 'soar' },
    { name: 'Explainer',    key: 'explainer' },
    { name: 'Red Team',     key: 'redteam' },
  ]

  const statuses = data?.data || {}

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white mb-4">AI Agents</h3>
      <div className="space-y-3">
        {agents.map(a => {
          const st = statuses[`${a.key}_agent`]?.status || statuses[a.key] || 'idle'
          const isActive = ['active', 'running', 'idle'].includes(st)
          return (
            <div key={a.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{a.name}</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs font-medium capitalize ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {st}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 168],
    queryFn: () => api.request('/api/analytics/?hours=168'),
    refetchInterval: 30000
  })

  const { data: threatsData } = useQuery({
    queryKey: ['threats-summary'],
    queryFn: () => api.request('/api/threats/stats/summary?hours=168'),
    refetchInterval: 30000
  })

  const { data: logsData } = useQuery({
    queryKey: ['logs-summary'],
    queryFn: () => api.request('/api/logs/stats/summary?hours=168'),
    refetchInterval: 30000
  })

  const { data: recentAlertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => api.request('/api/threats/?limit=15&page=1'),
    refetchInterval: 15000
  })

  const analytics = analyticsData?.data || {}
  const threats = threatsData?.data || {}
  const logs = logsData?.data || {}

  const loginSpark = (analytics.login_attempts?.data || [])
    .slice(-12).map(d => (d.successful || 0) + (d.failed || 0))

  const sevData = (analytics.threat_severity?.data || []).map(d => ({
    ...d,
    color: { Critical: '#f87171', High: '#fb923c', Medium: '#fbbf24', Low: '#34d399' }[d.severity] || '#64748b'
  }))

  const loginChartData = (analytics.login_attempts?.data || []).slice(-12).map(d => ({
    time: new Date(d.time).getHours() + ':00',
    successful: d.successful || 0,
    failed: d.failed || 0
  }))

  const attackBars = (analytics.attack_types?.data || []).slice(0, 6)
  const ingestion = analytics.log_ingestion?.data || []

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time overview · Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldExclamationIcon}
          label="Active Threats"
          value={threats.total_alerts ?? '—'}
          sub={`Threat level: ${threats.threat_level || 'Low'}`}
          color="red"
          spark={loginSpark}
          trend={12}
        />
        <StatCard
          icon={DocumentTextIcon}
          label="Logs Ingested"
          value={(logs.total_logs || 0).toLocaleString()}
          sub={`${(logs.ingestion_rate?.logs_per_hour || 0).toFixed(0)} per hour`}
          color="sky"
          spark={ingestion.map(d => d.total_count || 0)}
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Critical Alerts"
          value={threats.by_severity?.critical ?? '—'}
          sub="Needs immediate attention"
          color="amber"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Resolved"
          value={threats.by_status?.resolved ?? '—'}
          sub={`${(threats.detection_rate?.resolution_rate || 0).toFixed(0)}% resolution rate`}
          color="green"
          trend={-5}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Login attempts chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Login Attempts (last 12h)</h3>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-400" />
                Successful
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-400" />
                Failed
              </span>
            </div>
          </div>
          <BarChart
            data={loginChartData}
            xKey="time"
            yKeys={['successful', 'failed']}
            colors={['#34d399', '#f87171']}
            height={130}
          />
        </div>

        {/* Severity donut */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Threat Severity</h3>
          {analyticsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-5 w-full" />)}
            </div>
          ) : (
            <DonutChart data={sevData} />
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent alerts */}
        <div className="lg:col-span-2" style={{ minHeight: 320 }}>
          <RecentAlerts alerts={recentAlertsData?.data?.slice(0, 12) || []} isLoading={alertsLoading} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AgentStatus />

          {/* Attack types */}
          {attackBars.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top Attack Types</h3>
              <div className="space-y-3">
                {attackBars.map((item, i) => {
                  const max = attackBars[0]?.count || 1
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 capitalize">{item.attack_type?.replace(/_/g, ' ')}</span>
                        <span className="text-slate-500">{item.count}</span>
                      </div>
                      <div className="w-full bg-[#1e2d45] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${(item.count / max) * 100}%`, background: item.color || '#38bdf8' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
