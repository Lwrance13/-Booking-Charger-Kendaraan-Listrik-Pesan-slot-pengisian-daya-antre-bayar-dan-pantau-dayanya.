import stationsData from '../data/stations.json';
import bookingsData from '../data/bookings.json';
import invoicesData from '../data/invoices.json';
import sessionsData from '../data/charging_sessions.json';
import vehiclesData from '../data/vehicles.json';

const USER_ID = 'USR049';

export interface NearbyStation {
  id: string; name: string; city: string; location: string;
  availableSlots: number; totalSlots: number;
  distanceKm: number; speedKw: number;
  connectors: string[]; status: 'available' | 'high-demand' | 'maintenance';
}

export interface NextBooking {
  bookingId: string; stationName: string; stationId: string;
  timeLabel: string; status: string;
}

export interface PastSession {
  id: string; stationName: string; dateLabel: string;
  kwhUsed: number; costUsd: number; autoReleased: boolean;
}

export interface Vehicle {
  id: string; brand: string; model: string; plate: string;
  type: string; batteryKwh: number; connector: string; color: string;
}

export function getUserBalance(): number {
  const paid = (invoicesData as any[]).filter(i => i.user_id === USER_ID && i.payment_status === 'paid');
  const used = paid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0);
  return Math.max(0, 10000000 - used) / 236000;
}

export function getNextBooking(): NextBooking | null {
  const b = (bookingsData as any[]).find(
    b => b.user_id === USER_ID && (b.status === 'confirmed' || b.status === 'pending'));
  if (!b) return null;
  const st = (stationsData as any[]).find(s => s.station_id === b.station_id);
  const start = new Date(b.scheduled_start);
  const end = new Date(b.scheduled_end);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return { bookingId: b.booking_id, stationName: st?.station_name ?? b.station_id,
    stationId: b.station_id, timeLabel: `Today, ${fmt(start)} - ${fmt(end)}`, status: b.status };
}

export function getNearbyStations(): NearbyStation[] {
  const statuses: NearbyStation['status'][] = ['available', 'high-demand', 'maintenance'];
  const connectorSets = [['CCS2', 'Type 2'], ['CCS2'], ['Type 2', 'CHAdeMO']];
  return (stationsData as any[]).slice(0, 6).map((s, i) => ({
    id: s.station_id, name: s.station_name, city: s.city, location: s.location,
    availableSlots: Math.max(0, 4 - (i % 3)), totalSlots: 4 + (i % 3) * 2,
    distanceKm: parseFloat((0.8 + i * 0.7).toFixed(1)),
    speedKw: [150, 50, 150, 22, 100, 50][i] ?? 50,
    connectors: connectorSets[i % 3],
    status: statuses[i % 3],
  }));
}

export function getUserBookings() {
  return (bookingsData as any[]).filter(b => b.user_id === USER_ID).slice(0, 10);
}

export function getActiveBooking(): any | null {
  return (bookingsData as any[]).find(
    b => b.user_id === USER_ID && (b.status === 'confirmed' || b.status === 'pending'));
}

export function getPastSessions(): PastSession[] {
  return (sessionsData as any[])
    .filter(s => s.booking_id)
    .slice(0, 10)
    .map(s => {
      const inv = (invoicesData as any[]).find(i => i.session_id === s.session_id)
      const costUsd = inv ? (inv.total_amount ?? 0) / 15000 : 0
      const booking = (bookingsData as any[]).find(b => b.booking_id === s.booking_id)
      const st = (stationsData as any[]).find(st => st.station_id === s.station_id)
      const autoReleased = booking?.status === 'cancelled' && (booking?.cancel_reason === 'NO_SHOW_AUTO_RELEASE' || s.energy_kwh === 0)
      const date = new Date(s.start_time)
      return {
        id: s.session_id,
        stationName: st?.station_name ?? s.station_id,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' • ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        kwhUsed: s.energy_kwh ?? 0,
        costUsd: parseFloat(costUsd.toFixed(2)),
        autoReleased,
      }
    })
}

const BRAND_COLORS: Record<string, string> = {
  BYD: '#1A4D43', Wuling: '#2D6B5A', Hyundai: '#0D2B22',
  Chery: '#264D3B', Toyota: '#1F4D40', Honda: '#2A4A35',
}

export function getUserVehicles(): Vehicle[] {
  return (vehiclesData as any[])
    .filter(v => v.user_id === USER_ID || true) // show all vehicles as demo
    .slice(0, 5)
    .map(v => ({
      id: v.vehicle_id,
      brand: v.brand,
      model: v.model,
      plate: v.vehicle_number,
      type: v.vehicle_type,
      batteryKwh: v.battery_capacity_kwh,
      connector: v.connector_type,
      color: BRAND_COLORS[v.brand] ?? '#1A4D43',
    }))
}

export function getUserInvoices() {
  return (invoicesData as any[]).filter(i => i.user_id === USER_ID).slice(0, 10);
}

export function formatIdr(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}
