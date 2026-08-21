import { allAudit } from '../services/adminDataService'

export default function AuditPage() {
  return (
    <div>
      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--c-outline-var)' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Audit History — All Services ({allAudit.length} entries)</h2>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Audit ID','Entity Type','Entity ID','Old Status','New Status','Changed By','Timestamp'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allAudit.map((a: any, i: number) => (
                <tr key={a.audit_id} style={{ background:i%2===0?'var(--c-surface)':'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{a.audit_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{a.entity_type}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{a.entity_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>{a.old_status}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600 }}>{a.new_status}</td>
                  <td style={{ padding:'11px 16px', fontSize:12 }}>{a.changed_by}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(a.changed_at).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
