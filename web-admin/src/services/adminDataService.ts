import stations   from '../data/stations.json';
import slots       from '../data/slots.json';
import bookings    from '../data/bookings.json';
import sessions    from '../data/charging_sessions.json';
import invoices    from '../data/invoices.json';
import meterData   from '../data/realtime_meter.json';
import auditData   from '../data/audit_history.json';

export const allStations   = stations   as any[];
export const allSlots      = slots      as any[];
export const allBookings   = bookings   as any[];
export const allSessions   = sessions   as any[];
export const allInvoices   = invoices   as any[];
export const allMeter      = meterData  as any[];
export const allAudit      = auditData  as any[];

export function getStationWithSlots() {
  return allStations.map(st => {
    const stSlots = allSlots.filter(s => s.station_id === st.station_id);
    const available = stSlots.filter(s => s.slot_status === 'available').length;
    const occupied  = stSlots.filter(s => s.slot_status === 'occupied').length;
    const meter = allMeter.find(m => m.station_id === st.station_id);
    const powerKw = Math.abs(meter?.power_kw ?? 0);
    return { ...st, totalSlots: stSlots.length, available, occupied, powerKw,
      online: st.status !== 'maintenance' && meter?.connection_status === 'online' };
  });
}

export function getDashboardKpis() {
  const online = allStations.filter((_, i) =>
    allMeter[i]?.connection_status === 'online').length;
  const activeSessions = allSessions.length;
  const totalKwh = allSessions.reduce((s, r) => s + (r.energy_kwh ?? 0), 0);
  const totalRev  = allInvoices.filter(i => i.payment_status === 'paid')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0);
  return { totalStations: allStations.length, online, activeSessions,
    totalKwh: totalKwh.toFixed(0), totalRevIdr: totalRev };
}

export function getTariffPlans() {
  return [
    { id:'TRF-8492-PK', name:'Peak Hour Rate',      rate:0.45, timeStart:'14:00', timeEnd:'19:00', applied:42,  border:'var(--c-secondary)' },
    { id:'TRF-1022-OP', name:'Off-Peak Standard',   rate:0.22, timeStart:'19:00', timeEnd:'14:00', applied:128, border:'var(--c-on-surface)' },
    { id:'TRF-9941-MB', name:'Premium Member Rate', rate:0.18, timeStart:'00:00', timeEnd:'23:59', applied:100, border:'var(--c-amber)' },
  ];
}

export function fmtIdr(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}
