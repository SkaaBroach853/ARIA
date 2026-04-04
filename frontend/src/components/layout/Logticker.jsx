import { useEffect, useState } from 'react'
import socket from '../../api/socket'

const SEV_COLOR = {
  HIGH:   '#ef4444',
  MEDIUM: '#f59e0b',
  LOW:    '#10b981',
  INFO:   '#6b7280',
}

export default function LogTicker() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    socket.on('live_event', (ev) => {
      const entry = {
        id: Date.now(),
        time: ev.timestamp?.slice(11, 19) || new Date().toLocaleTimeString(),
        type: ev.event_type,
        desc: ev.description?.slice(0, 80) || '',
        severity: ev.severity || 'INFO',
        ip: ev.src_ip || '',
      }
      setEvents(prev => [entry, ...prev].slice(0, 20))
    })
    return () => socket.off('live_event')
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 220, right: 0, height: 28,
      background: 'rgba(10,14,26,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', zIndex: 10,
      backdropFilter: 'blur(8px)', overflow: 'hidden',
    }}>
      {/* LIVE badge */}
      <div style={{
        flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center',
        gap: 6, borderRight: '1px solid rgba(255,255,255,0.06)', height: '100%',
      }}>
        <span className="live-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
      </div>

      {/* Scrolling content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {events.length === 0 ? (
          <span style={{ paddingLeft: 16, fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>
            Connecting to event stream...
          </span>
        ) : (
          <div className="ticker-track" style={{ display: 'flex', alignItems: 'center', gap: 32, paddingLeft: 16, whiteSpace: 'nowrap' }}>
            {[...events, ...events].map((ev, i) => (
              <span key={`${ev.id}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'monospace' }}>
                <span style={{ color: '#4b5563' }}>{ev.time}</span>
                <span style={{ color: SEV_COLOR[ev.severity] || '#6b7280', fontWeight: 600 }}>{ev.type}</span>
                {ev.ip && <span style={{ color: '#00d4ff' }}>{ev.ip}</span>}
                <span style={{ color: '#6b7280' }}>{ev.desc}</span>
                <span style={{ color: '#1a2235' }}>·</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      {events.length > 0 && (
        <div style={{ flexShrink: 0, padding: '0 12px', borderLeft: '1px solid rgba(255,255,255,0.06)', height: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>{events.length} events</span>
        </div>
      )}
    </div>
  )
}
