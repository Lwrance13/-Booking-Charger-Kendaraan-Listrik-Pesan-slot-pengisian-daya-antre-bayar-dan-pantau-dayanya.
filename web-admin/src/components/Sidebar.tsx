import { NavLink } from 'react-router-dom'

const NAV = [
  { to:'/stations',  icon:'🔌', label:'Stations' },
  { to:'/bookings',  icon:'📅', label:'Bookings' },
  { to:'/sessions',  icon:'⚡', label:'Sessions' },
  { to:'/slots',     icon:'🟦', label:'Slots' },
  { to:'/power',     icon:'📊', label:'Power' },
  { to:'/billing',   icon:'💳', label:'Billing' },
  { to:'/tariffs',   icon:'🏷️', label:'Tariffs' },
  { to:'/audit',     icon:'📋', label:'Audit Log' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width:'var(--sidebar-w)', minHeight:'100vh', background:'var(--c-primary)',
      display:'flex', flexDirection:'column', flexShrink:0,
      boxShadow:'4px 0 16px rgba(0,0,0,0.15)', position:'fixed', top:0, left:0, bottom:0, zIndex:100,
    }}>
      {/* Logo */}
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'var(--c-primary-cont)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>⚡</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Emerald Charge</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Admin Dashboard</div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div style={{ margin:'16px 12px', padding:'12px', background:'rgba(255,255,255,0.08)',
        borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:20, background:'rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👤</div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Admin User</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Station Manager</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex:1, padding:'8px 12px', display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.2,
          color:'rgba(255,255,255,0.4)', padding:'8px 8px 4px' }}>NAVIGATION</div>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 12px', borderRadius:10, textDecoration:'none',
            background: isActive ? 'var(--c-primary-cont)' : 'transparent',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
            fontWeight: isActive ? 600 : 400, fontSize:14,
            transition:'all 0.15s',
            borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
          })}>
            <span style={{ fontSize:16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.1)',
        fontSize:11, color:'rgba(255,255,255,0.35)' }}>
        Emerald Charge Admin v1.0
      </div>
    </aside>
  )
}
