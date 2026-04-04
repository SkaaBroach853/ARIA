import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import LogTicker from './LogTicker'
import api from '../../api/client'

export default function Layout() {
  const [ollamaConnected, setOllamaConnected] = useState(false)
  const [threatCount, setThreatCount] = useState(0)

  useEffect(() => {
    api.get('/status').then(r => {
      setOllamaConnected(r.data.ollama?.connected)
      setThreatCount(r.data.threats_24h || 0)
    }).catch(() => {})
  }, [])

  return (
    <div className="app-shell">
      <Sidebar ollamaConnected={ollamaConnected} threatCount={threatCount} />
      <main className="app-main">
        <Outlet />
      </main>
      <LogTicker />
    </div>
  )
}
