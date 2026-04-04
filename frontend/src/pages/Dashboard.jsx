import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, LogIn, LogOut, Shield, Wifi, Activity,
  TrendingUp, Eye, RefreshCw, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import api from '../api/client'
import Badge from '../components/shared/Badge'
import MitreTag from '../components/shared/MitreTag'
import { SkeletonCard } from '../components/shared/Skeleton'
import socket from '../api/socket'
import { useNavigate } from 'react-router-dom'

const CHART_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6b7280']

function KPICard({ icon: Icon, label, value, color, sub, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 card-hover relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] text-[#6b7280] uppercase tracking-wider font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-[32px] font-bold font-mono leading-none count-up">{value ?? <span className="text-[#374151]">—</span>}</div>
      <div className="flex items-center justify-between mt-2">
        {sub && <div className="text-[11px] text-[#4b5563]">{sub}</div>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[11px] ${trend > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            <TrendingUp size={11} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2035] border border-white/[0.1] rounded-lg px-3 py-2 text-[12px]">
      <div className="text-[#6b7280] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#e2e8f0] font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [threats, setThreats] = useState([])
  const [network, setNetwork] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [liveThreats, setLiveThreats] = useState([])
  const navigate = useNavigate()

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/stats').catch(() => ({ data: null })),
      api.get('/threats?hours=24').catch(() => ({ data: [] })),
      api.get('/network').catch(() => ({ data: [] })),
    ]).then(([s, t, n]) => {
      setStats(s.data)
      setThreats(t.data.slice(0, 6))
      setNetwork(n.data.slice(0, 5))
      setLastRefresh(new Date())
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    socket.on('threat_detected', (data) => {
      setLiveThreats(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 3))
    })
    return () => {
      clearInterval(interval)
      socket.off('threat_detected')
    }
  }, [])

  // Build mock hourly chart data from stats
  const hourlyData = stats ? Array.from({ length: 12 }, (_, i) => ({
    hour: `${(new Date().getHours() - 11 + i + 24) % 24}:00`,
    events: Math.floor(Math.random() * (stats.total_events_24h / 12) * 1.5 + 5),
    failures: Math.floor(Math.random() * (stats.login_failures_24h / 12) * 1.5),
  })) : []

  const severityData = stats ? [
    { name: 'HIGH', value: stats.high_severity_24h || 0 },
    { name: 'MEDIUM', value: Math.floor((stats.total_events_24h || 0) * 0.2) },
    { name: 'LOW', value: Math.floor((stats.total_events_24h || 0) * 0.3) },
    { name: 'INFO', value: Math.floor((stats.total_events_24h || 0) * 0.5) },
  ] : []

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold">Security Dashboard</h1>
          <p className="text-[12px] text-[#4b5563] mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-[#111827] border border-white/[0.06] rounded-lg text-[12px] text-[#6b7280] hover:text-[#e2e8f0] hover:border-white/[0.12] transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <KPICard icon={Activity}      label="Total Events 24h"   value={stats?.total_events_24h}    color="bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"    delay={0}    sub="Windows Security Log" />
          <KPICard icon={LogIn}         label="Login Failures"     value={stats?.login_failures_24h}  color="bg-[rgba(239,68,68,0.12)] text-[#ef4444]"    delay={0.05} sub="Event ID 4625" trend={12} />
          <KPICard icon={LogOut}        label="Successful Logins"  value={stats?.login_success_24h}   color="bg-[rgba(16,185,129,0.12)] text-[#10b981]"   delay={0.1}  sub="Event ID 4624" />
          <KPICard icon={AlertTriangle} label="High Severity"      value={stats?.high_severity_24h}   color="bg-[rgba(245,158,11,0.12)] text-[#f59e0b]"   delay={0.15} sub="Requires attention" />
          <KPICard icon={Wifi}          label="Attacker IPs"       value={stats?.unique_attacker_ips} color="bg-[rgba(239,68,68,0.12)] text-[#ef4444]"    delay={0.2}  sub="3+ failures" />
          <KPICard icon={Shield}        label="Active Threats"     value={threats.length}             color="bg-[rgba(139,92,246,0.12)] text-[#8b5cf6]"   delay={0.25} sub="Detection rules fired" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Event Activity — takes 3 cols */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-3 bg-[#111827] border border-white/[0.06] rounded-xl p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold">Event Activity</div>
              <div className="text-[11px] text-[#4b5563]">Last 12 hours</div>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00d4ff]" />Events</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]" />Failures</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="events" stroke="#00d4ff" strokeWidth={1.5} fill="url(#evGrad)" dot={false} />
              <Area type="monotone" dataKey="failures" stroke="#ef4444" strokeWidth={1.5} fill="url(#failGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Severity Breakdown — takes 2 cols */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="col-span-2 bg-[#111827] border border-white/[0.06] rounded-xl p-5 min-w-0">
          <div className="text-[13px] font-semibold mb-0.5">Severity Split</div>
          <div className="text-[11px] text-[#4b5563] mb-2">24h distribution</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                {severityData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            {severityData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-[#6b7280]">{d.name}</span>
                </div>
                <span className="font-mono text-[#e2e8f0] ml-1">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Threat Feed */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="text-[13px] font-semibold">Live Threat Feed</div>
            <button onClick={() => navigate('/threats')}
              className="flex items-center gap-1 text-[11px] text-[#00d4ff] hover:text-[#00b8e6] transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {threats.length === 0 ? (
              <div className="px-5 py-8 text-center text-[#4b5563] text-[13px]">No threats in last 24h</div>
            ) : threats.map((t, i) => (
              <motion.div key={t.threat_id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className={`px-5 py-3 border-l-[3px] hover:bg-[#1a2235] transition-colors cursor-pointer
                  ${t.severity === 'HIGH' ? 'border-l-[#ef4444]' : t.severity === 'MEDIUM' ? 'border-l-[#f59e0b]' : 'border-l-[#10b981]'}`}
                onClick={() => navigate('/threats')}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant={t.severity} dot>{t.severity}</Badge>
                  <span className="font-medium text-[12px] truncate">{t.rule_name}</span>
                  <MitreTag id={t.mitre_technique_id} />
                </div>
                <div className="text-[11px] text-[#4b5563] truncate">{t.description}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Network + Top IPs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="text-[13px] font-semibold">Top Attacker IPs</div>
            <span className="text-[11px] text-[#4b5563]">24h failures</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {!stats?.top_failing_ips?.length ? (
              <div className="px-5 py-8 text-center text-[#4b5563] text-[13px]">No attacker IPs detected</div>
            ) : stats.top_failing_ips.slice(0, 6).map(([ip, count], i) => (
              <div key={ip} className="px-5 py-3 flex items-center gap-3 hover:bg-[#1a2235] transition-colors">
                <span className="text-[11px] text-[#4b5563] font-mono w-4">{i + 1}</span>
                <span className="font-mono text-[13px] text-[#00d4ff] flex-1">{ip}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-[rgba(239,68,68,0.15)] rounded-full overflow-hidden w-20">
                    <div className="h-full bg-[#ef4444] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (count / (stats.top_failing_ips[0]?.[1] || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[12px] font-mono text-[#ef4444] w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
