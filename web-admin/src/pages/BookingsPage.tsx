
import { useMemo, useState, useCallback } from 'react'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { allBookings } from '../services/adminDataService'
import { api } from '../services/apiClient'

export default function BookingsPage() {
  const [bookings, setBookings] = useState(() => [...allBookings])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState<string|null>(null)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg,type})

  const filtered = useMemo(() =>
    filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  , [bookings, filter])

  const counts = useMemo(() => ({
    all: bookings.length,
    confirmed: bookings.filter(b => b.status==='confirmed').length,
    pending:   bookings.filter(b => b.status==='pending').length,
    completed: bookings.filter(b => b.status==='completed').length,
    cancelled: bookings.filter(b => b.status==='cancelled').length,
  }), [bookings])

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm(`Batalkan booking ${id}?`)) return
    setLoading(id)
    try {
      await api.cancelBooking(id)
      setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'cancelled' } : b))
      showToast(`Booking ${id} berhasil dibatalkan`)
    } catch(e: any) {
      showToast(e.message || 'Gagal membatalkan booking', 'error')
    } finally { setLoading(null) }
  }, [])

  const handleComplete = useCallback(async (id: string) => {
    setLoading(id)
    try {
      await api.updateBookingStatus(id, 'completed')
      setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'completed' } : b))
      showToast(`Booking ${id} ditandai selesai`)
    } catch(e: any) {
      showToast(e.message || 'Gagal update', 'error')
    } finally { setLoading(null) }
  }, [])

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {(['all','confirmed','pending','completed','cancelled'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'8px 16px', borderRadius:'var(--radius-pill)', fontSize:13, fontWeight:600, cursor:'pointer',
            background: filter===s ? 'var(--c-primary-cont)' : 'var(--c-surface)',
            color: filter===s ? '#fff' : 'var(--c-on-surface-var)',
            border: `1px solid ${filter===s ? 'transparent' : 'var(--c-outline-var)'}`,
          }}>
            {s.charAt(0).toUpperCase()+s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      <div style={{ background:'#FFF8E1', border:'1px solid var(--c-amber)', borderRadius:'var(--radius-lg)',
        padding:'12px 16px', marginBottom:20, fontSize:13 }}>
        ⚠️ <strong>Auto-Release Policy:</strong> Booking pending yang tidak check-in dalam 15 menit akan otomatis dibatalkan.
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
              {filtered.slice(0,20).map((b: any, i: number) => (
                <tr key={b.booking_id} style={{ background: i%2===0 ? 'var(--c-surface)' : 'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{b.booking_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.user_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.station_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{b.slot_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(b.scheduled_start).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, color:'var(--c-on-surface-var)' }}>
                    {new Date(b.scheduled_end).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{ padding:'11px 16px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding:'11px 16px', display:'flex', gap:5, flexWrap:'wrap' }}>
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button onClick={() => handleCancel(b.booking_id)} disabled={loading === b.booking_id}
                        style={{ padding:'4px 10px', borderRadius:'var(--radius-md)',
                        background:'var(--c-chip-red-bg)', color:'var(--c-chip-red-text)',
                        fontSize:11, fontWeight:600, cursor:'pointer' }}>
                        {loading === b.booking_id ? '...' : 'Cancel'}
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => handleComplete(b.booking_id)} disabled={loading === b.booking_id}
                        style={{ padding:'4px 10px', borderRadius:'var(--radius-md)',
                        background:'var(--c-chip-green-bg)', color:'var(--c-chip-green-text)',
                        fontSize:11, fontWeight:600, cursor:'pointer' }}>Selesai</button>
                    )}
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
