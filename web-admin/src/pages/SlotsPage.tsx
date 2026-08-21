import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { allSlots, allMeter } from '../services/adminDataService'

export default function SlotsPage() {
  const [enabled, setEnabled] = useState<Record<string,boolean>>(
    Object.fromEntries(allSlots.map(s => [s.slot_id, s.slot_status !== 'maintenance']))
  )

  const slots = useMemo(() => allSlots.map(slot => {
    const meter = allMeter.find(m => m.slot_id === slot.slot_id)
    return { ...slot, powerKw: Math.abs(meter?.power_kw ?? 0), online: meter?.connection_status === 'online' }
  }), [])

  const counts = { available: slots.filter(s=>s.slot_status==='available').length,
    occupied: slots.filter(s=>s.slot_status==='occupied').length,
    reserved: slots.filter(s=>s.slot_status==='reserved').length,
    maintenance: slots.filter(s=>s.slot_status==='maintenance').length }

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Available', count:counts.available, color:'var(--c-chip-green-text)', bg:'var(--c-chip-green-bg)' },
          { label:'Occupied',  count:counts.occupied,  color:'var(--c-chip-red-text)',   bg:'var(--c-chip-red-bg)' },
          { label:'Reserved',  count:counts.reserved,  color:'var(--c-chip-blue-text)',  bg:'var(--c-chip-blue-bg)' },
          { label:'Maintenance',count:counts.maintenance,color:'var(--c-chip-amber-text)',bg:'var(--c-chip-amber-bg)' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:'var(--radius-xl)', padding:20, textAlign:'center' }}>
            <p style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.count}</p>
            <p style={{ fontSize:12, fontWeight:700, color:s.color, letterSpacing:0.5 }}>{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Slot grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {slots.slice(0,24).map(slot => (
          <div key={slot.slot_id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)',
            padding:16, boxShadow:'var(--shadow-card)',
            borderLeft:`4px solid ${slot.slot_status==='available'?'var(--c-chip-green-text)':slot.slot_status==='maintenance'?'var(--c-secondary)':'var(--c-amber)'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <p style={{ fontSize:15, fontWeight:700 }}>Slot {slot.slot_id}</p>
                <p style={{ fontSize:12, color:'var(--c-on-surface-var)' }}>{slot.connector_type} · {slot.power_kw} kW</p>
              </div>
              <StatusBadge status={slot.slot_status} />
            </div>
            <p style={{ fontSize:12, color:'var(--c-on-surface-var)', marginBottom:10 }}>📍 {slot.station_id}</p>
            {slot.slot_status === 'occupied' && (
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span>Output</span><span style={{ fontWeight:700 }}>{slot.powerKw.toFixed(1)} kW</span>
                </div>
                <div style={{ height:6, background:'var(--c-surface-high)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background:'var(--c-on-surface)',
                    width:`${Math.min(100,(slot.powerKw/slot.power_kw)*100).toFixed(0)}%` }} />
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              paddingTop:10, borderTop:'1px solid var(--c-outline-var)' }}>
              <span style={{ fontSize:13 }}>Enable Slot</span>
              <button onClick={() => setEnabled(p=>({...p,[slot.slot_id]:!p[slot.slot_id]}))}
                disabled={slot.slot_status==='maintenance'}
                style={{ width:44, height:24, borderRadius:12, cursor:slot.slot_status==='maintenance'?'not-allowed':'pointer',
                  background:enabled[slot.slot_id]?'#1a73e8':'var(--c-surface-high)',
                  position:'relative', transition:'background 0.2s' }}>
                <span style={{ position:'absolute', top:2, left:enabled[slot.slot_id]?22:2,
                  width:20, height:20, borderRadius:10, background:'#fff',
                  transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
