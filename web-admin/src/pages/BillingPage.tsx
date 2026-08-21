import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { allInvoices, fmtIdr } from '../services/adminDataService'

export default function BillingPage() {
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() =>
    filter==='all' ? allInvoices : allInvoices.filter(i=>i.payment_status===filter)
  ,[filter])

  const totalPaid    = useMemo(() => allInvoices.filter(i=>i.payment_status==='paid').reduce((s,i)=>s+(i.total_amount??0),0),[])
  const totalPending = useMemo(() => allInvoices.filter(i=>i.payment_status==='pending').length,[])
  const totalFailed  = useMemo(() => allInvoices.filter(i=>i.payment_status==='failed').length,[])

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <div style={{ background:'var(--c-primary-cont)', borderRadius:'var(--radius-xl)', padding:24, color:'#fff' }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:1, opacity:0.7, marginBottom:8 }}>TOTAL REVENUE</p>
          <p style={{ fontSize:26, fontWeight:800 }}>{fmtIdr(totalPaid)}</p>
        </div>
        <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, boxShadow:'var(--shadow-card)', textAlign:'center' }}>
          <p style={{ fontSize:28, fontWeight:800, color:'var(--c-chip-green-text)' }}>{allInvoices.filter(i=>i.payment_status==='paid').length}</p>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--c-chip-green-text)', letterSpacing:0.5 }}>PAID</p>
        </div>
        <div style={{ background:'var(--c-chip-amber-bg)', borderRadius:'var(--radius-xl)', padding:24, textAlign:'center' }}>
          <p style={{ fontSize:28, fontWeight:800, color:'var(--c-chip-amber-text)' }}>{totalPending}</p>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--c-chip-amber-text)', letterSpacing:0.5 }}>PENDING</p>
        </div>
        <div style={{ background:'var(--c-chip-red-bg)', borderRadius:'var(--radius-xl)', padding:24, textAlign:'center' }}>
          <p style={{ fontSize:28, fontWeight:800, color:'var(--c-chip-red-text)' }}>{totalFailed}</p>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--c-chip-red-text)', letterSpacing:0.5 }}>FAILED</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','paid','pending','failed'].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:'7px 14px', borderRadius:'var(--radius-pill)', fontSize:13, fontWeight:600,
            background:filter===s?'var(--c-primary-cont)':'var(--c-surface)',
            color:filter===s?'#fff':'var(--c-on-surface-var)',
            border:`1px solid ${filter===s?'transparent':'var(--c-outline-var)'}`,
          }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
        ))}
      </div>

      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--c-outline-var)' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Invoices — billing-service ({filtered.length})</h2>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Invoice ID','Session','User','kWh','Tarif/kWh','Total','Metode','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,15).map((inv: any, i: number) => (
                <tr key={inv.invoice_id} style={{ background:i%2===0?'var(--c-surface)':'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{inv.invoice_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{inv.session_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{inv.user_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{inv.energy_kwh}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>Rp {(inv.tariff_per_kwh??0).toLocaleString('id-ID')}</td>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700 }}>{fmtIdr(inv.total_amount??0)}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{inv.payment_method}</td>
                  <td style={{ padding:'11px 16px' }}><StatusBadge status={inv.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
