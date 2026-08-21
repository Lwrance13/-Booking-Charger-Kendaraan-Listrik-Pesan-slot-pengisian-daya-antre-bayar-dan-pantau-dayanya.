import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { getStationWithSlots, getDashboardKpis, fmtIdr } from '../services/adminDataService'

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
  const stations = useMemo(() => getStationWithSlots(), [])
  const [search, setSearch] = useState('')

  const filtered = stations.filter(s =>
    !search ||
    s.station_name.toLowerCase().includes(search.toLowerCase()) ||
    s.station_id.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        <KpiCard label="TOTAL STATIONS"   value={kpi.totalStations}         sub={`${kpi.online} online`}         color="var(--c-primary-cont)" />
        <KpiCard label="ACTIVE SESSIONS"  value={kpi.activeSessions}        sub="sesi sedang berjalan"           color="var(--c-amber)" />
        <KpiCard label="TOTAL ENERGY"     value={`${Number(kpi.totalKwh).toLocaleString()} kWh`} sub="total terkirim" color="var(--c-chip-blue-text)" />
        <KpiCard label="TOTAL REVENUE"    value={fmtIdr(kpi.totalRevIdr)}   sub="dari invoice terbayar"         color="var(--c-chip-green-text)" />
      </div>

      {/* Table */}
      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--c-outline-var)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Daftar Stasiun</h2>
          <div style={{ display:'flex', gap:10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / kota..."
              style={{ padding:'8px 14px', borderRadius:'var(--radius-xl)', border:'1px solid var(--c-outline-var)',
                fontSize:13, width:220, background:'var(--c-surface-low)' }} />
            <button style={{ padding:'8px 16px', borderRadius:'var(--radius-xl)',
              background:'var(--c-primary-cont)', color:'#fff', fontSize:13, fontWeight:600 }}>
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
              {filtered.slice(0,20).map((s, i) => (
                <tr key={s.station_id} style={{ background: i%2===0 ? 'var(--c-surface)' : 'var(--c-bg)' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{s.station_id}</td>
                  <td style={{ padding:'12px 16px', fontSize:14, fontWeight:500 }}>{s.station_name}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--c-on-surface-var)' }}>{s.city}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <StatusBadge status={s.online ? 'online' : s.status} />
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>
                    <span style={{ fontWeight:700 }}>{s.available}</span>
                    <span style={{ color:'var(--c-on-surface-var)' }}> / {s.totalSlots}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600 }}>{s.powerKw.toFixed(1)}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <button style={{ padding:'5px 12px', borderRadius:'var(--radius-md)',
                      background:'var(--c-chip-blue-bg)', color:'var(--c-chip-blue-text)',
                      fontSize:12, fontWeight:600 }}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 24px', fontSize:12, color:'var(--c-on-surface-var)',
          borderTop:'1px solid var(--c-outline-var)' }}>
          Menampilkan {Math.min(20, filtered.length)} dari {filtered.length} stasiun
        </div>
      </div>
    </div>
  )
}
