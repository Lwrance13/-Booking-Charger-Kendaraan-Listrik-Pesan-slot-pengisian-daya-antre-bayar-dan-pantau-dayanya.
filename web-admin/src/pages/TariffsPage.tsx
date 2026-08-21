import { useMemo, useState } from 'react'
import { getTariffPlans } from '../services/adminDataService'

export default function TariffsPage() {
  const plans = useMemo(() => getTariffPlans(), [])
  const [editing, setEditing] = useState<any>(null)
  const [rate, setRate] = useState('')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button style={{ padding:'10px 20px', borderRadius:'var(--radius-xl)',
          background:'var(--c-primary-cont)', color:'#fff', fontSize:14, fontWeight:700 }}>
          + Create New Tariff
        </button>
      </div>

      <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Active Plans</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16, marginBottom:32 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)',
            padding:20, boxShadow:'var(--shadow-card)', borderLeft:`4px solid ${plan.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div>
                <p style={{ fontSize:15, fontWeight:700 }}>{plan.name}</p>
                <p style={{ fontSize:11, color:'var(--c-on-surface-var)' }}>ID: {plan.id}</p>
              </div>
              <span style={{ padding:'3px 10px', borderRadius:'var(--radius-pill)', fontSize:11, fontWeight:700,
                background:'var(--c-chip-green-bg)', color:'var(--c-chip-green-text)' }}>● Active</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ background:'var(--c-surface-low)', borderRadius:10, padding:'10px 12px' }}>
                <p style={{ fontSize:10, color:'var(--c-on-surface-var)', fontWeight:600, letterSpacing:0.5, marginBottom:4 }}>ENERGY RATE</p>
                <p style={{ fontSize:20, fontWeight:800, color:'var(--c-secondary)' }}>${plan.rate.toFixed(2)}<span style={{ fontSize:12, fontWeight:400, color:'var(--c-on-surface-var)' }}>/kWh</span></p>
              </div>
              <div style={{ background:'var(--c-surface-low)', borderRadius:10, padding:'10px 12px' }}>
                <p style={{ fontSize:10, color:'var(--c-on-surface-var)', fontWeight:600, letterSpacing:0.5, marginBottom:4 }}>TIME WINDOW</p>
                <p style={{ fontSize:15, fontWeight:700 }}>{plan.timeStart} – {plan.timeEnd === '23:59' ? '24 Hours' : plan.timeEnd}</p>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              paddingTop:12, borderTop:'1px solid var(--c-outline-var)' }}>
              <span style={{ fontSize:12, color:'var(--c-on-surface-var)' }}>Applied to {plan.applied} stations</span>
              <button onClick={() => { setEditing(plan); setRate(plan.rate.toFixed(2)) }}
                style={{ padding:'5px 12px', borderRadius:'var(--radius-md)', background:'transparent',
                  color:'var(--c-primary-cont)', fontSize:12, fontWeight:700 }}>Edit ✏️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setEditing(null)}>
          <div style={{ background:'var(--c-surface)', borderRadius:'24px 24px 0 0', padding:32,
            width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
              <h3 style={{ fontSize:20, fontWeight:700 }}>Edit Tariff</h3>
              <button onClick={() => setEditing(null)} style={{ fontSize:20, background:'none', color:'var(--c-on-surface-var)' }}>✕</button>
            </div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Plan Name</label>
            <input defaultValue={editing.name} style={{ width:'100%', padding:'10px 14px', borderRadius:10,
              border:'1px solid var(--c-outline-var)', fontSize:14, marginBottom:16 }} />
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Rate per kWh (USD)</label>
            <div style={{ position:'relative', marginBottom:4 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--c-on-surface-var)' }}>$</span>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                style={{ width:'100%', padding:'10px 14px 10px 30px', borderRadius:10, fontSize:18, fontWeight:700,
                  border:`1px solid ${parseFloat(rate)>0.35?'var(--c-secondary)':'var(--c-outline-var)'}`,
                  color:parseFloat(rate)>0.35?'var(--c-secondary)':'var(--c-on-surface)' }} />
            </div>
            {parseFloat(rate)>0.35 && <p style={{ fontSize:12, color:'var(--c-secondary)', marginBottom:12 }}>⚠️ Currently 15% higher than regional average.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
              <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Start Time</label>
                <input defaultValue={editing.timeStart} style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--c-outline-var)', fontSize:14 }} /></div>
              <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>End Time</label>
                <input defaultValue={editing.timeEnd} style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--c-outline-var)', fontSize:14 }} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={() => setEditing(null)} style={{ padding:14, borderRadius:'var(--radius-xl)',
                border:'1.5px solid var(--c-outline-var)', fontSize:15, fontWeight:600, background:'transparent' }}>Cancel</button>
              <button onClick={() => setEditing(null)} style={{ padding:14, borderRadius:'var(--radius-xl)',
                background:'var(--c-primary-cont)', color:'#fff', fontSize:15, fontWeight:700 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
