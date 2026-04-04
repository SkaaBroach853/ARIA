import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

const DEMO_USERS = [
  { u: 'admin',   p: 'Admin@123',   role: 'admin',   color: 'text-purple-400' },
  { u: 'analyst', p: 'Analyst@123', role: 'analyst', color: 'text-[#00d4ff]' },
  { u: 'manager', p: 'Manager@123', role: 'manager', color: 'text-yellow-400' },
  { u: 'viewer',  p: 'Viewer@123',  role: 'viewer',  color: 'text-gray-400' },
]

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/chat')
    } catch {
      setError('Invalid credentials. Try a demo account below.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center overflow-auto relative">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-100" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d4ff] rounded-full opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8b5cf6] rounded-full opacity-[0.03] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] mb-4 relative"
          >
            <Shield size={30} className="text-[#00d4ff]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10b981] rounded-full border-2 border-[#0a0e1a]" />
          </motion.div>
          <h1 className="text-[26px] font-bold tracking-tight">CyberGuard</h1>
          <p className="text-[#4b5563] text-[13px] mt-1">AI-Driven SOC Co-Pilot</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[#6b7280] uppercase tracking-wider mb-1.5 font-semibold">Username</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full bg-[#1a2035] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-[#e2e8f0] outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] transition-all placeholder-[#374151]"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#6b7280] uppercase tracking-wider mb-1.5 font-semibold">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-[#1a2035] border border-white/[0.06] rounded-xl pl-9 pr-10 py-2.5 text-[14px] text-[#e2e8f0] outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] transition-all placeholder-[#374151]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#9ca3af] transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-[#ef4444] text-[12px] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl px-3 py-2.5">
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#00d4ff] hover:bg-[#00c4ef] active:bg-[#00b0d8] disabled:bg-[#1a2035] disabled:text-[#4b5563] text-[#0a0e1a] font-bold py-3 rounded-xl transition-all text-[14px] mt-1 flex items-center justify-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <p className="text-[10px] text-[#4b5563] uppercase tracking-wider mb-2.5 font-semibold">Quick Access</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_USERS.map(({ u, p, role, color }) => (
                <button key={u} onClick={() => setForm({ username: u, password: p })}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a2035] hover:bg-[#1e2d4a] rounded-lg text-left transition-all group border border-transparent hover:border-white/[0.06]">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.replace('text-', 'bg-')}`} />
                  <div>
                    <div className={`text-[12px] font-mono font-semibold ${color}`}>{u}</div>
                    <div className="text-[10px] text-[#374151] capitalize">{role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#374151] mt-4">
          CyberGuard SOC Platform · Secure Access
        </p>
      </motion.div>
    </div>
  )
}
