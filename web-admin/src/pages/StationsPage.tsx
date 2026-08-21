
import { useMemo, useState, useCallback, useEffect } from 'react'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { getStationWithSlots, getDashboardKpis, fmtIdr } from '../services/adminDataService'
import { api } from '../services/apiClient'

const EMPTY = { station_id:'', station_name:'', location:'', city:'', province:'',
  latitude:0, longitude:0, status:'active' }

function KpiCard({ label, value, sub, color }: any) {
  return (
    <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)',
      padding:24, boxShadow:'var(--shadow-card)', borderLeft:`4px solid ${color}` }}>
      <p style={{ fontSize:12, fontWeight:600, letterSpacing:1, color:'var(--c-on-surface-var)', marginBottom:8 }}>{label}</p>
      <p style={{ fontSize:32, fontWeight:700, color:'var(--c-on-surface)', marginBottom:4 }}>{value}</p>
      {sub && <p style={{ fontSize:13, color:'var(--c-on-surface-var)' }}>{sub}</p>}
    </div>
  )
}

export default function StationsPage() {
  const kpi = useMemo(() => getDashboardKpis(), [])
  const [stations, setStations] = useState(() => getStationWithSlots())
  // Sync with backend DB on mount
  useEffect(() => {
    api.getStations('').then((rows: any[]) => {
      if (!rows || rows.length === 0) return
      setStations(rows.map(s => ({
        ...s,
        station_id: s.station_id ?? s.id,
        station_name: s.station_name ?? s.name,
        online: s.status === 'active',
        available: s.availableSlots ?? 0,
        occupied: s.totalSlots ? (s.totalSlots - (s.availableSlots ?? 0)) : 0,
        powerKw: s.powerKw ?? 0,
      })))
    }).catch(() => {/* keep seed JSON if API unreachable */})
  }, [])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg,type})

  const filtered = stations.filter(s =>
    !search || s.station_name.toLowerCase().includes(search.toLowerCase()) ||
    s.station_id.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setForm({ ...EMPTY }); setEditItem(null); setShowAdd(true) }
  const openEdit = (s: any) => { setForm({ ...s }); setEditItem(s); setShowAdd(true) }

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      if (editItem) {
        await api.updateStation(form.station_id, form)
        setStations(prev => prev.map(s => s.station_id === form.station_id ? { ...s, ...form } : s))
        showToast('Stasiun berhasil diupdate')
      } else {
        await api.createStation(form)
        setStations(prev => [...prev, { ...form, totalSlots:0, available:0, occupied:0, powerKw:0, online:false }])
        showToast('Stasiun berhasil ditambahkan')
      }
      setShowAdd(false)
    } catch(e: any) {
      showToast(e.message || 'Gagal menyimpan stasiun', 'error')
    } finally { setLoading(false) }
  }, [form, editItem])

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Hapus stasiun "${name}"?`)) return
    setLoading(true)
    try {
      await api.deleteStation(id)
      setStations(prev => prev.filter(s => s.station_id !== id))
      showToast('Stasiun berhasil dihapus')
    } catch(e: any) {
      showToast(e.message || 'Gagal menghapus', 'error')
    } finally { setLoading(false) }
  }, [])

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        <KpiCard label="TOTAL STATIONS"   value={stations.length}  sub={`${kpi.online} online`}         color="var(--c-primary-cont)" />
        <KpiCard label="ACTIVE SESSIONS"  value={kpi.activeSessions} sub="sesi sedang berjalan"           color="var(--c-amber)" />
        <KpiCard label="TOTAL ENERGY"     value={`${Number(kpi.totalKwh).toLocaleString()} kWh`} sub="total terkirim" color="var(--c-chip-blue-text)" />
        <KpiCard label="TOTAL REVENUE"    value={fmtIdr(kpi.totalRevIdr)} sub="dari invoice terbayar"    color="var(--c-chip-green-text)" />
      </div>

      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--c-outline-var)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Daftar Stasiun ({filtered.length})</h2>
          <div style={{ display:'flex', gap:10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / kota / ID..."
              style={{ padding:'8px 14px', borderRadius:'var(--radius-xl)', border:'1px solid var(--c-outline-var)',
                fontSize:13, width:240, background:'var(--c-surface-low)' }} />
            <button onClick={openAdd} disabled={loading}
              style={{ padding:'8px 18px', borderRadius:'var(--radius-xl)',
              background:'var(--c-primary-cont)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + Tambah Stasiun
            </button>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Station ID','Nama','Kota','Status','Slots','Power (kW)','Aksi'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,20).map((s: any, i: number) => (
                <tr key={s.station_id} style={{ background: i%2===0 ? 'var(--c-surface)' : 'var(--c-bg)' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{s.station_id}</td>
                  <td style={{ padding:'12px 16px', fontSize:14, fontWeight:500 }}>{s.station_name}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--c-on-surface-var)' }}>{s.city}</td>
                  <td style={{ padding:'12px 16px' }}><StatusBadge status={s.online ? 'online' : s.status} /></td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>
                    <span style={{ fontWeight:700 }}>{s.available}</span>
                    <span style={{ color:'var(--c-on-surface-var)' }}> / {s.totalSlots}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600 }}>{(s.powerKw ?? 0).toFixed(1)}</td>
                  <td style={{ padding:'12px 16px', display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(s)} style={{ padding:'4px 10px', borderRadius:'var(--radius-md)',
                      background:'var(--c-chip-blue-bg)', color:'var(--c-chip-blue-text)', fontSize:11, fontWeight:600, cursor:'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(s.station_id, s.station_name)}
                      style={{ padding:'4px 10px', borderRadius:'var(--radius-md)',
                      background:'var(--c-chip-red-bg)', color:'var(--c-chip-red-text)', fontSize:11, fontWeight:600, cursor:'pointer' }}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background:'var(--c-surface)', borderRadius:20, padding:32, width:520, maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700 }}>{editItem ? 'Edit Stasiun' : 'Tambah Stasiun Baru'}</h3>
              <button onClick={() => setShowAdd(false)} style={{ fontSize:20, background:'none', color:'var(--c-on-surface-var)', cursor:'pointer' }}>✕</button>
            </div>
            {[
              ['station_id','Station ID (contoh: ST101)'],['station_name','Nama Stasiun'],
              ['location','Alamat Lokasi'],['city','Kota'],['province','Provinsi'],
              ['latitude','Latitude'],['longitude','Longitude'],
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>{label}</label>
                <input value={(form as any)[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  disabled={!!editItem && key === 'station_id'}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-outline-var)', fontSize:13 }} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5 }}>Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-outline-var)', fontSize:13 }}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding:12, borderRadius:10, border:'1.5px solid var(--c-outline-var)', fontSize:14, fontWeight:600, cursor:'pointer' }}>Batal</button>
              <button onClick={handleSubmit} disabled={loading}
                style={{ padding:12, borderRadius:10, background:'var(--c-primary-cont)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {loading ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Stasiun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
