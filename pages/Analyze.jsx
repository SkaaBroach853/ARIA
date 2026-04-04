import React, { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  CloudArrowUpIcon, DocumentMagnifyingGlassIcon,
  MapPinIcon, GlobeAltIcon, UserIcon, ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { api } from '../services/api'

const sevPill = { critical: 'pill-critical', high: 'pill-high', medium: 'pill-medium', low: 'pill-low', unknown: 'pill-info' }

const GeoTable = ({ geo = {} }) => {
  const entries = Object.entries(geo).filter(([, v]) => !v.private && !v.error)
  if (!entries.length) return null
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e2d45] flex items-center gap-2">
        <MapPinIcon className="w-4 h-4 text-sky-400" />
        <h4 className="text-sm font-semibold text-white">IP Geolocation (via IPinfo)</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              {['IP Address', 'City', 'Region', 'Country', 'ISP / Org', 'Timezone'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([ip, info]) => (
              <tr key={ip}>
                <td className="px-4 py-3 mono text-sky-400 font-medium">{ip}</td>
                <td className="px-4 py-3 text-slate-300">{info.city || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{info.region || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{info.country || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{info.org || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{info.timezone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ForensicsCard = ({ forensics = {}, classification = {} }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* IPs */}
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <GlobeAltIcon className="w-4 h-4 text-sky-400" />
        <h4 className="text-sm font-semibold text-white">Extracted IP Addresses</h4>
      </div>
      <div className="space-y-2">
        {forensics.external_ips?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">External ({forensics.external_ips.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {forensics.external_ips.map(ip => (
                <span key={ip} className="mono text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">{ip}</span>
              ))}
            </div>
          </div>
        )}
        {forensics.internal_ips?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Internal ({forensics.internal_ips.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {forensics.internal_ips.map(ip => (
                <span key={ip} className="mono text-xs bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded">{ip}</span>
              ))}
            </div>
          </div>
        )}
        {!forensics.external_ips?.length && !forensics.internal_ips?.length && (
          <p className="text-sm text-slate-500">No IP addresses found</p>
        )}
      </div>
    </div>

    {/* Threat classification + MACs */}
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldExclamationIcon className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Threat Classification</h4>
      </div>
      <div className="space-y-2 mb-4">
        {[
          { label: 'External Attacker', active: classification.external_attacker, color: 'text-red-400' },
          { label: 'Insider Threat', active: classification.insider_threat, color: 'text-amber-400' },
          { label: 'Mixed / Both', active: classification.mixed, color: 'text-purple-400' },
        ].map(({ label, active, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{label}</span>
            <span className={`text-sm font-medium ${active ? color : 'text-slate-600'}`}>
              {active ? '● Detected' : '○ Not detected'}
            </span>
          </div>
        ))}
      </div>
      {forensics.mac_addresses?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">MAC Addresses ({forensics.mac_addresses.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {forensics.mac_addresses.map(mac => (
              <span key={mac} className="mono text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{mac}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)

const Analyze = () => {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const mutation = useMutation({
    mutationFn: (f) => api.analyzeFile(f),
    onSuccess: (data) => { setResult(data.data); toast.success('Analysis complete') },
    onError: (e) => toast.error(`Analysis failed: ${e.message}`),
  })

  const handleFile = (f) => { if (!f) return; setFile(f); setResult(null) }
  const analysis = result?.ai_analysis || {}
  const sev = analysis.severity || 'unknown'

  return (
    <div className="space-y-5 animate-fade-up max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">File Analysis</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Upload a log file for AI-powered threat analysis with automatic IP geolocation and forensic extraction.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`card rounded-xl p-10 text-center cursor-pointer transition-all border-2 border-dashed ${
          dragging ? 'border-sky-500 bg-sky-500/5' : 'border-[#1e2d45] hover:border-[#243550]'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden"
          accept=".txt,.log,.csv,.json,.syslog"
          onChange={e => handleFile(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
            <p className="text-base font-medium text-white">{file.name}</p>
            <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudArrowUpIcon className="w-10 h-10 text-slate-500" />
            <p className="text-base font-medium text-slate-300">Drop your log file here</p>
            <p className="text-sm text-slate-500">or click to browse · .txt .log .csv .json · max 5 MB</p>
          </div>
        )}
      </div>

      <button
        onClick={() => file && mutation.mutate(file)}
        disabled={!file || mutation.isPending}
        className="btn btn-primary py-2.5"
      >
        {mutation.isPending ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</>
        ) : (
          <><DocumentMagnifyingGlassIcon className="w-4 h-4" />Run AI Analysis</>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-up">
          {/* Summary */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-base font-semibold text-white">Analysis Result</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`pill ${sevPill[sev]}`}>{sev}</span>
                <span className="text-xs text-slate-500">{result.analysis_time_ms}ms</span>
                <span className="text-xs text-slate-500">{result.lines_analyzed} lines</span>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
            {analysis.why_suspicious && (
              <div className="mt-3 border-l-2 border-slate-600 pl-3">
                <p className="text-xs text-slate-500 mb-1">Why it's suspicious</p>
                <p className="text-sm text-slate-300">{analysis.why_suspicious}</p>
              </div>
            )}
          </div>

          {/* Forensics */}
          <ForensicsCard forensics={result.forensics || {}} classification={result.threat_classification || {}} />

          {/* Geolocation table */}
          <GeoTable geo={result.geolocation || {}} />

          {/* Recommended actions */}
          {analysis.recommended_actions?.length > 0 && (
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Recommended Actions</h4>
              <ol className="space-y-2">
                {analysis.recommended_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-slate-300">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {analysis.error && (
            <div className="card p-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-400">⚠ AI offline — rule-based fallback: {analysis.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Analyze
