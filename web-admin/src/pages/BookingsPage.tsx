import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { allBookings } from '../services/adminDataService'

export default function BookingsPage() {
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() =>
    filter === 'all' ? allBookings : allBookings.filter(b => b.status === filter)
  , [filter])

  const counts = useMemo(() => ({
    all: allBookings.length,
    confirmed: allBookings.filter(b => b.status==='confirmed').length,
    pending:   allBookings.filter(b => b.status==='pending').length,
    completed: allBookings.filter(b => b.status==='completed').length,
    cancelled: allBookings.filter(b => b.status==='cancelled').length,
  }), [])

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {(['all','confirmed','pending','completed','cancelled'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'8px 16px', borderRadius:'var(--radius-pill)', fontSize:13, fontWeight:600,
            background: filter===s ? 'var(--c-primary-cont)' : 'var(--c-surface)',
            color: filter===s ? '#fff' : 'var(--c-on-surface-var)',
            border: `1px solid ${filter===s ? 'transparent' : 'var(--c-outline-var)'}`,
          }}>
            {s.charAt(0).toUpperCase()+s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Warning: No-show auto-release reminder */}
      <div style={{ background:'#FFF8E1', border:'1px solid var(--c-amber)', borderRadius:'var(--radius-lg)',
        padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
        ⚠️ <span><strong>Auto-Release Policy:</strong> Booking pending yang tidak check-in dalam 15 menit akan otomatis dibatalkan oleh no-show cron job.</span>
      </div>

      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--c-outline-var)' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Booking Management ({filtered.length})</h2>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Booking ID','User','Station','Slot','Mulai','Selesai','Status','Aksi'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,15).map((b: any, i: number) => (
                <tr key={b.booking_id} style={{ background: i%2===0 ? 'var(--c-surface)' : 'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{b.booking_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.user_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.station_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.slot_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(b.scheduled_start).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}
                  </td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(b.scheduled_end).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}
                  </td>
                  <td style={{ padding:'11px 16px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding:'11px 16px' }}>
                    <button style={{ padding:'4px 10px', borderRadius:'var(--radius-md)',
                      background:'var(--c-chip-red-bg)', color:'var(--c-chip-red-text)',
                      fontSize:11, fontWeight:600 }}>Cancel</button>
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
