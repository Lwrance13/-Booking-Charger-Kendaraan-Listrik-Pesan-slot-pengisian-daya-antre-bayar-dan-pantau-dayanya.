import { useState } from 'react'
import Toast from '../components/Toast'
import { getTariffPlans } from '../services/adminDataService'

const EMPTY_PLAN = { id: '', planId: '', name: '', rate: 0.25, timeStart: '00:00', timeEnd: '23:59', applied: 0, status: 'active' as const, icon: 'tag-outline', border: 'var(--c-primary-cont)', note: '' }

export default function TariffsPage() {
  // Mutable plans state so updates are reflected immediately
  const [plans, setPlans] = useState(() => getTariffPlans())
  const [editing, setEditing] = useState<any>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rate, setRate] = useState('')
  const [planName, setPlanName] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  const openEdit = (plan: any) => {
    setEditing(plan); setIsNew(false)
    setRate(plan.rate.toFixed(2)); setPlanName(plan.name)
    setStartTime(plan.timeStart); setEndTime(plan.timeEnd)
  }

  const openCreate = () => {
    const newPlan = { ...EMPTY_PLAN, id: `TRF-${Date.now().toString().slice(-6)}` }
    setEditing(newPlan); setIsNew(true)
    setRate('0.25'); setPlanName('New Tariff Plan')
    setStartTime('00:00'); setEndTime('23:59')
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    const updatedPlan = { ...editing, name: planName, rateUsd: parseFloat(rate) || editing.rate, timeStart: startTime, timeEnd: endTime }
    if (isNew) {
      setPlans(prev => [...prev, updatedPlan])
    } else {
      setPlans(prev => prev.map(p => p.id === editing.id ? updatedPlan : p))
    }
    setEditing(null)
    setToast({ msg: isNew ? 'Tarif baru berhasil dibuat ✅' : 'Tarif berhasil diperbarui ✅', type: 'success' })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Hapus tarif ini?')) return
    setPlans(prev => prev.filter(p => p.id !== id))
    setToast({ msg: 'Tarif berhasil dihapus', type: 'success' })
  }

  const isHighRate = parseFloat(rate) > 0.35

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button onClick={openCreate} style={{ padding:'10px 20px', borderRadius:'var(--radius-xl)',
          background:'var(--c-primary-cont)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          + Create New Tariff
        </button>
      </div>

      <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Active Plans ({plans.length})</h2>
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
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(plan)}
                  style={{ padding:'5px 12px', borderRadius:'var(--radius-md)', background:'transparent',
                    color:'var(--c-primary-cont)', fontSize:12, fontWeight:700, cursor:'pointer' }}>Edit ✏️</button>
                <button onClick={() => handleDelete(plan.id)}
                  style={{ padding:'5px 10px', borderRadius:'var(--radius-md)',
                    background:'var(--c-chip-red-bg)', color:'var(--c-chip-red-text)',
                    fontSize:12, fontWeight:600, cursor:'pointer' }}>Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setEditing(null)}>
          <div style={{ background:'var(--c-surface)', borderRadius:'24px 24px 0 0', padding:32,
            width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
              <h3 style={{ fontSize:20, fontWeight:700 }}>{isNew ? 'Create New Tariff' : 'Edit Tariff'}</h3>
              <button onClick={() => setEditing(null)} style={{ fontSize:20, background:'none', color:'var(--c-on-surface-var)', cursor:'pointer' }}>✕</button>
            </div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Plan Name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--c-outline-var)', fontSize:14, marginBottom:16 }} />
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Rate per kWh (USD)</label>
            <div style={{ position:'relative', marginBottom:4 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--c-on-surface-var)' }}>$</span>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                step="0.01" min="0"
                style={{ width:'100%', padding:'10px 14px 10px 30px', borderRadius:10, fontSize:18, fontWeight:700,
                  border:`1px solid ${isHighRate?'var(--c-secondary)':'var(--c-outline-var)'}`,
                  color:isHighRate?'var(--c-secondary)':'var(--c-on-surface)' }} />
            </div>
            {isHighRate && <p style={{ fontSize:12, color:'var(--c-secondary)', marginBottom:12 }}>⚠️ Lebih tinggi 15% dari rata-rata regional.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
              <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Start Time</label>
                <input value={startTime} onChange={e => setStartTime(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--c-outline-var)', fontSize:14 }} /></div>
              <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>End Time</label>
                <input value={endTime} onChange={e => setEndTime(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--c-outline-var)', fontSize:14 }} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={() => setEditing(null)} style={{ padding:14, borderRadius:'var(--radius-xl)',
                border:'1.5px solid var(--c-outline-var)', fontSize:15, fontWeight:600, cursor:'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding:14, borderRadius:'var(--radius-xl)',
                background:'var(--c-primary-cont)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                {saving ? 'Menyimpan...' : isNew ? 'Buat Tarif' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
