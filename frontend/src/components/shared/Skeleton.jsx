export function SkeletonLine({ w = 'w-full', h = 'h-4' }) {
  return <div className={`skeleton ${w} ${h}`} />
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 space-y-3">
      <SkeletonLine w="w-1/3" h="h-3" />
      <SkeletonLine w="w-1/2" h="h-8" />
      {rows > 2 && <SkeletonLine w="w-2/3" h="h-3" />}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`skeleton h-3 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-white/[0.04] px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`skeleton h-3 ${j === 0 ? 'w-32' : j === cols - 1 ? 'w-16' : 'w-24'}`} style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
