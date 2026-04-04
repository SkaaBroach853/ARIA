const VARIANTS = {
  HIGH:   'bg-[rgba(239,68,68,0.12)] text-[#ef4444] border-[rgba(239,68,68,0.25)]',
  MEDIUM: 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]',
  LOW:    'bg-[rgba(16,185,129,0.12)] text-[#10b981] border-[rgba(16,185,129,0.25)]',
  INFO:   'bg-[rgba(107,114,128,0.12)] text-[#9ca3af] border-[rgba(107,114,128,0.2)]',
  green:  'bg-[rgba(16,185,129,0.12)] text-[#10b981] border-[rgba(16,185,129,0.25)]',
  amber:  'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]',
  red:    'bg-[rgba(239,68,68,0.12)] text-[#ef4444] border-[rgba(239,68,68,0.25)]',
  purple: 'bg-[rgba(139,92,246,0.12)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]',
  cyan:   'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border-[rgba(0,212,255,0.25)]',
  blue:   'bg-[rgba(59,130,246,0.12)] text-[#60a5fa] border-[rgba(59,130,246,0.25)]',
}

const DOTS = { HIGH: 'bg-[#ef4444]', MEDIUM: 'bg-[#f59e0b]', LOW: 'bg-[#10b981]', INFO: 'bg-[#6b7280]' }

export default function Badge({ variant = 'INFO', children, className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide ${VARIANTS[variant] || VARIANTS.INFO} ${className}`}>
      {dot && DOTS[variant] && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOTS[variant]}`} />}
      {children}
    </span>
  )
}
