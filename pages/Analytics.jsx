import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { api } from '../services/api'

// ── Chart primitives ─────────────────────────────────────────────────────────

const NoData = () => (
  <div className="flex items-center justify-center h-24 text-slate-500 text-sm">No data yet</div>
)

const BarChart = ({ data = [], xKey, yKeys = [], colors = [], height = 120 }) => {
  if (!data.length) return <NoData />
  const max = Math.max(...data.flatMap(d => yKeys.map(k => d[k] || 0)), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-px" style={{ height: height - 18 }}>
            {yKeys.map((k, ki) => (
              <div key={k} className="flex-1 rounded-t transition-all duration-500"
                style={{ height: `${((d[k] || 0) / max) * 100}%`, background: colors[ki] || '#38bdf8', minHeight: d[k] > 0 ? 2 : 0 }}
                title={`${k}: ${d[k]}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-500 truncate w-full text-center">{d[xKey]}</span>
        </div>
      ))}
    </div>
  )
}

const LineChart = ({ data = [], yKey, color = '#38bdf8', height = 80, anomalyKey }) => {
  if (!data.length) return <NoData />
  const vals = data.map(d => d[yKey] || 0)
  const max = Math.max(...vals, 1)
  const W = 400, H = height
  const pts = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * W},${H - (v / max) * (H - 6)}`).join(' ')
  const fill = `0,${H} ${pts} ${W},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`fill-${yKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#fill-${yKey})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {data.map((d, i) => d[anomalyKey] ? (
        <circle key={i} cx={(i / Math.max(vals.length - 1, 1)) * W}
          cy={H - (vals[i] / max) * (H - 6)} r="3" fill="#f87171" />
      ) : null)}
    </svg>
  )
}

const DonutChart = ({ data = [] }) => {
  const total = data.reduce((s, d) => s + (d.count || 0), 0)
  if (!total) return <NoData />
  const r = 40, cx = 56, cy = 56, sw = 14, circ = 2 * Math.PI * r
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
              <span className="text-sm text-slate-300 capitalize">{seg.severity || seg.status}</span>
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

const Heatmap = ({ data = [] }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  if (!data.length) return <NoData />
  const getCell = (day, h) => data.find(d => d.day === fullDays[days.indexOf(day)] && d.hour === h)
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex mb-1 ml-8">
          {hours.map(h => (
            <div key={h} className="w-5 text-center text-[9px] text-slate-600">{h % 6 === 0 ? h : ''}</div>
          ))}
        </div>
        {days.map(day => (
          <div key={day} className="flex items-center mb-0.5">
            <div className="w-8 text-[10px] text-slate-500 text-right pr-2">{day}</div>
            {hours.map(h => {
              const cell = getCell(day, h)
              const intensity = cell?.intensity || 0
              return (
                <div key={h} className="w-5 h-4 mx-px rounded-sm"
                  style={{ background: intensity > 0 ? `rgba(56,189,248,${Math.max(0.08, intensity)})` : '#141d2e' }}
                  title={`${day} ${h}:00 — ${cell?.activity_count || 0} events`}
                />
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="text-[10px] text-slate-500">Low</span>
          {[0.08, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} className="w-4 h-3 rounded-sm" style={{ background: `rgba(56,189,248,${v})` }} />
          ))}
          <span className="text-[10px] text-slate-500">High</span>
        </div>
      </div>
    </div>
  )
}

const Panel = ({ title, children, className = '' }) => (
  <div className={`card p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
    {children}
  </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────
const Analytics = () => {
  const [hours, setHours] = useState(168)  // default 7 days to show real data

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['analytics', hours],
    queryFn: () => api.request(`/api/analytics/?hours=${hours}`),
    refetchInterval: 60000
  })

  const a = data?.data || {}

  const loginData = (a.login_attempts?.data || []).slice(-12).map(d => ({
    time: new Date(d.time).getHours() + ':00',
    successful: d.successful || 0,
    failed: d.failed || 0
  }))

  const sevData = (a.threat_severity?.data || []).map(d => ({
    ...d,
    color: { Critical: '#f87171', High: '#fb923c', Medium: '#fbbf24', Low: '#34d399' }[d.severity] || '#64748b'
  }))

  const attackData = a.attack_types?.data || []
  const netData = (a.network_anomaly?.data || []).slice(-60)
  const heatData = a.user_activity_heatmap?.data || []
  const resData = (a.alert_resolution?.data || []).map(d => ({
    ...d,
    color: { Resolved: '#34d399', Investigating: '#fbbf24', Open: '#f87171' }[d.status] || '#64748b'
  }))
  const topIPs = (a.top_ips?.data || []).slice(0, 8)
  const ingestion = a.log_ingestion?.data || []

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Security metrics and trends'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 card p-1 rounded-lg">
            {[{ v: 6, l: '6h' }, { v: 24, l: '24h' }, { v: 48, l: '2d' }, { v: 168, l: '7d' }].map(({ v, l }) => (
              <button key={v} onClick={() => setHours(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  hours === v ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} className="btn btn-ghost p-2">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 h-48 skeleton" />)}
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Panel title="Login Attempts">
                <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Successful</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Failed</span>
                </div>
                <BarChart data={loginData} xKey="time" yKeys={['successful', 'failed']} colors={['#34d399', '#f87171']} height={130} />
              </Panel>
            </div>
            <Panel title="Threat Severity">
              <DonutChart data={sevData} />
            </Panel>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Attack Types">
              {!attackData.length ? <NoData /> : (
                <div className="space-y-3">
                  {attackData.map((item, i) => {
                    const max = attackData[0]?.count || 1
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 capitalize">{item.attack_type?.replace(/_/g, ' ')}</span>
                          <span className="text-slate-500">{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-[#1e2d45] rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${(item.count / max) * 100}%`, background: item.color || '#38bdf8' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Top Suspicious IPs">
              {!topIPs.length ? <NoData /> : (
                <div className="space-y-2.5">
                  {topIPs.map((item, i) => {
                    const max = topIPs[0]?.threat_score || 1
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                        <span className="text-xs mono text-slate-300 w-32 flex-shrink-0">{item.ip_address}</span>
                        <div className="flex-1 bg-[#1e2d45] rounded-full h-1.5">
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${(item.threat_score / max) * 100}%`, background: 'linear-gradient(to right, #fb923c, #f87171)' }} />
                        </div>
                        <span className="text-xs text-slate-500 w-16 text-right">{item.alert_count} alerts</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* Network anomaly */}
          <Panel title="Network Traffic Anomalies">
            <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 rounded-sm bg-sky-400 inline-block" />Traffic</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Anomaly</span>
            </div>
            <LineChart data={netData} yKey="bytes_per_minute" anomalyKey="is_anomaly" color="#38bdf8" height={100} />
          </Panel>

          {/* Heatmap + Resolution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Panel title="User Activity Heatmap">
                <Heatmap data={heatData} />
              </Panel>
            </div>
            <Panel title="Alert Resolution">
              {!resData.length ? <NoData /> : (
                <div className="space-y-4">
                  {resData.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300">{item.status}</span>
                        <span className="font-medium" style={{ color: item.color }}>{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#1e2d45] rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${item.percentage}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 pt-2 border-t border-[#1e2d45]">
                    {resData.reduce((s, d) => s + d.count, 0)} total alerts
                  </p>
                </div>
              )}
            </Panel>
          </div>

          {/* Log ingestion */}
          <Panel title="Log Ingestion Rate">
            {!ingestion.length ? <NoData /> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ingestion.map((src, i) => {
                  const max = Math.max(...(src.sparkline_data || [1]), 1)
                  const colors = ['#38bdf8', '#34d399', '#a78bfa']
                  const c = colors[i] || '#38bdf8'
                  const trendUp = src.trend === 'up'
                  return (
                    <div key={i} className="bg-[#0d1424] rounded-lg p-4 border border-[#1e2d45]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-300 capitalize">{src.source}</span>
                        <span className={`text-xs font-medium ${trendUp ? 'text-red-400' : 'text-emerald-400'}`}>
                          {src.trend === 'up' ? '↑' : src.trend === 'down' ? '↓' : '→'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-0.5">{src.total_count?.toLocaleString()}</div>
                      <div className="text-xs text-slate-500 mb-3">{src.logs_per_minute}/min avg</div>
                      <svg viewBox={`0 0 ${(src.sparkline_data || []).slice(-30).length * 8} 32`} className="w-full" style={{ height: 32 }}>
                        {(src.sparkline_data || []).slice(-30).map((v, j) => {
                          const h = Math.max(2, (v / max) * 28)
                          return <rect key={j} x={j * 8 + 1} y={30 - h} width={6} height={h} fill={c} opacity={0.7} rx={1} />
                        })}
                      </svg>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

export default Analytics
