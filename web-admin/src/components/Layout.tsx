import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const TITLES: Record<string, string> = {
  '/stations':'Manage Stations', '/bookings':'Booking Management',
  '/sessions':'Charging Sessions', '/slots':'Slot Status & Controls',
  '/power':'Power Monitoring', '/billing':'Billing & Invoices',
  '/tariffs':'Tariff Management', '/audit':'Audit Log',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Dashboard'

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <div style={{ marginLeft:'var(--sidebar-w)', flex:1, display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <header style={{ background:'var(--c-surface)', borderBottom:'1px solid var(--c-outline-var)',
          padding:'0 32px', height:64, display:'flex', alignItems:'center',
          justifyContent:'space-between', position:'sticky', top:0, zIndex:50,
          boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:'var(--c-on-surface)' }}>{title}</h1>
            <p style={{ fontSize:12, color:'var(--c-on-surface-var)', marginTop:1 }}>
              Emerald Charge Admin · {new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:18, background:'var(--c-surface-low)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, cursor:'pointer' }}>🔔</div>
            <div style={{ width:36, height:36, borderRadius:18, background:'var(--c-primary-cont)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer' }}>👤</div>
          </div>
        </header>
        {/* Page content */}
        <main style={{ flex:1, padding:32, overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
