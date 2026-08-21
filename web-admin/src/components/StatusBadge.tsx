const MAP: Record<string, { bg: string; text: string; dot: string }> = {
  active:      { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  online:      { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  available:   { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  confirmed:   { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  completed:   { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  paid:        { bg:'var(--c-chip-green-bg)', text:'var(--c-chip-green-text)', dot:'var(--c-chip-green-text)' },
  offline:     { bg:'var(--c-chip-red-bg)',   text:'var(--c-chip-red-text)',   dot:'var(--c-chip-red-text)' },
  fault:       { bg:'var(--c-chip-red-bg)',   text:'var(--c-chip-red-text)',   dot:'var(--c-chip-red-text)' },
  occupied:    { bg:'var(--c-chip-red-bg)',   text:'var(--c-chip-red-text)',   dot:'var(--c-chip-red-text)' },
  cancelled:   { bg:'var(--c-chip-red-bg)',   text:'var(--c-chip-red-text)',   dot:'var(--c-chip-red-text)' },
  failed:      { bg:'var(--c-chip-red-bg)',   text:'var(--c-chip-red-text)',   dot:'var(--c-chip-red-text)' },
  maintenance: { bg:'var(--c-chip-amber-bg)', text:'var(--c-chip-amber-text)', dot:'var(--c-amber)' },
  pending:     { bg:'var(--c-chip-amber-bg)', text:'var(--c-chip-amber-text)', dot:'var(--c-amber)' },
  reserved:    { bg:'var(--c-chip-blue-bg)',  text:'var(--c-chip-blue-text)',  dot:'var(--c-chip-blue-text)' },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[status?.toLowerCase()] ?? MAP.offline;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:'var(--radius-pill)',
      background: cfg.bg, fontSize:12, fontWeight:600, color: cfg.text }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {status}
    </span>
  );
}
