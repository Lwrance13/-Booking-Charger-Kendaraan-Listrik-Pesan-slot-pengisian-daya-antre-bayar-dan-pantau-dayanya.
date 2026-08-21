import { useState, useEffect } from 'react'
import { allSessions } from '../services/adminDataService'
import { api } from '../services/apiClient'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>(() => allSessions)
  useEffect(() => {
    api.getAdminSessions().then((rows: any[]) => {
      if (rows && rows.length > 0) setSessions(rows)
    }).catch(() => {})
  }, [])

  const totalKwh = sessions.reduce((s:number,r:any)=>s+(r.energy_kwh??0),0).toFixed(1)
  const avgDur   = sessions.length > 0 ? (sessions.reduce((s:number,r:any)=>s+(r.duration_min??0),0)/sessions.length).toFixed(0) : '0'

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Sesi', value: sessions.length, color:'var(--c-primary-cont)' },
          { label:'Total Energi', value:`${Number(totalKwh).toLocaleString()} kWh`, color:'var(--c-amber)' },
          { label:'Durasi Rata-rata', value:`${avgDur} menit`, color:'var(--c-chip-blue-text)' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)',
            padding:24, boxShadow:'var(--shadow-card)', borderLeft:`4px solid ${k.color}` }}>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:'var(--c-on-surface-var)', marginBottom:8 }}>{k.label}</p>
            <p style={{ fontSize:28, fontWeight:700 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--c-outline-var)' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Charging Sessions (session-service)</h2>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Session ID','Booking','Station','Slot','Start','End','Durasi','kWh','Max kW'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0,15).map((s: any, i: number) => (
                <tr key={s.session_id} style={{ background: i%2===0?'var(--c-surface)':'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{s.session_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{s.booking_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{s.station_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{s.slot_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(s.start_time).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(s.end_time).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{s.duration_min} min</td>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:'var(--c-primary-cont)' }}>{s.energy_kwh}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{s.max_power_kw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
