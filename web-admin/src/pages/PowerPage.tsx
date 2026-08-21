import { useMemo } from 'react'
import { allMeter, allSessions } from '../services/adminDataService'

export default function PowerPage() {
  const bars = useMemo(() => {
    const readings = allMeter.slice(0,12).map(r => Math.abs(r.power_kw ?? 0))
    const max = Math.max(...readings, 1)
    return readings.map((v,i) => ({ v, pct: v/max, label: allMeter[i]?.slot_id ?? `S${i}` }))
  }, [])

  const totalKwh = useMemo(() => allSessions.reduce((s,r)=>s+(r.energy_kwh??0),0).toFixed(0),[])
  const onlineCount = allMeter.filter(m=>m.connection_status==='online').length
  const totalPow = allMeter.filter(m=>m.connection_status==='online').reduce((s,m)=>s+Math.abs(m.power_kw??0),0)

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <div style={{ background:'var(--c-primary-cont)', borderRadius:'var(--radius-xl)', padding:24, color:'#fff' }}>
          <p style={{ fontSize:12, fontWeight:700, letterSpacing:1, opacity:0.7, marginBottom:8 }}>CURRENT POWER</p>
          <p style={{ fontSize:36, fontWeight:800 }}>{(totalPow/1000).toFixed(2)} <span style={{ fontSize:18, fontWeight:400 }}>MW</span></p>
          <p style={{ fontSize:13, opacity:0.6, marginTop:4 }}>{onlineCount} slot online</p>
        </div>
        <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:'var(--c-on-surface-var)', marginBottom:8 }}>TOTAL ENERGY DELIVERED</p>
          <p style={{ fontSize:36, fontWeight:800 }}>{Number(totalKwh).toLocaleString()} <span style={{ fontSize:18, fontWeight:400, color:'var(--c-on-surface-var)' }}>kWh</span></p>
          <p style={{ fontSize:13, color:'var(--c-on-surface-var)', marginTop:4 }}>dari {allSessions.length} sesi</p>
        </div>
        <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:'var(--c-on-surface-var)', marginBottom:8 }}>REALTIME METER READINGS</p>
          <p style={{ fontSize:36, fontWeight:800 }}>{allMeter.length}</p>
          <p style={{ fontSize:13, color:'var(--c-on-surface-var)', marginTop:4 }}>pembacaan aktif</p>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, boxShadow:'var(--shadow-card)', marginBottom:24 }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>⚡ Real-time Power Distribution per Slot</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:180 }}>
          {bars.map((b,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:10, color:'var(--c-on-surface-var)' }}>{b.v.toFixed(0)}</span>
              <div style={{ width:'100%', background:'var(--c-surface-low)', borderRadius:4, overflow:'hidden', height:160, display:'flex', alignItems:'flex-end' }}>
                <div style={{ width:'100%', borderRadius:4,
                  background: i%2===0 ? 'var(--c-primary-cont)' : 'var(--c-surface-high)',
                  height:`${Math.max(4,b.pct*100)}%`, transition:'height 0.3s' }} />
              </div>
              <span style={{ fontSize:9, color:'var(--c-on-surface-var)', textAlign:'center' }}>{b.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, marginTop:16, fontSize:12 }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:12, height:12, borderRadius:2, background:'var(--c-primary-cont)', display:'inline-block' }} /> Used Power
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:12, height:12, borderRadius:2, background:'var(--c-surface-high)', display:'inline-block' }} /> Available
          </span>
        </div>
      </div>

      {/* Meter table */}
      <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--c-outline-var)' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Realtime Meter Readings (WebSocket feed)</h2>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Reading ID','Station','Slot','Voltage (V)','Current (A)','Power (kW)','Energy (kWh)','Connection'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    letterSpacing:0.5, color:'var(--c-on-surface-var)', textTransform:'uppercase',
                    background:'var(--c-surface-low)', borderBottom:'1px solid var(--c-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMeter.slice(0,10).map((m: any, i: number) => (
                <tr key={m.reading_id} style={{ background:i%2===0?'var(--c-surface)':'var(--c-bg)' }}>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:600, color:'var(--c-primary-cont)' }}>{m.reading_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{m.station_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{m.slot_id}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{m.meter_voltage_v?.toFixed(1)}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{m.meter_current_a?.toFixed(1)}</td>
                  <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700 }}>{Math.abs(m.power_kw??0).toFixed(1)}</td>
                  <td style={{ padding:'11px 16px', fontSize:13 }}>{Math.abs(m.energy_kwh??0).toFixed(2)}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600,
                      color: m.connection_status==='online'?'var(--c-chip-green-text)':'var(--c-chip-red-text)' }}>
                      <span style={{ width:7,height:7,borderRadius:'50%',
                        background:m.connection_status==='online'?'var(--c-chip-green-text)':'var(--c-chip-red-text)',display:'inline-block' }} />
                      {m.connection_status}
                    </span>
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
