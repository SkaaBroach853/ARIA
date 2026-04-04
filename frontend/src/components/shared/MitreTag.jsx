export default function MitreTag({ id, technique }) {
  if (!id) return null
  return (
    <a
      href={`https://attack.mitre.org/techniques/${id.replace('.', '/')}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border border-[rgba(139,92,246,0.3)] rounded text-[11px] font-mono font-medium hover:bg-[rgba(139,92,246,0.25)] transition-colors"
      title={technique}
    >
      {id}
    </a>
  )
}
