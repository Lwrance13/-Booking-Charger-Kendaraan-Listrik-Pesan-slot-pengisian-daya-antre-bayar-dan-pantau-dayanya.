import stationsData from '../data/stations.json';
import bookingsData from '../data/bookings.json';
import invoicesData from '../data/invoices.json';

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
  return [
    { id: 'CS-001', stationName: 'Station Beta-12',  dateLabel: 'Oct 24, 2023 • 2:15 PM', kwhUsed: 45, costUsd: 12.50, autoReleased: false },
    { id: 'CS-002', stationName: 'Station Gamma-01', dateLabel: 'Oct 20, 2023 • 9:00 AM',  kwhUsed: 60, costUsd: 18.00, autoReleased: false },
    { id: 'CS-003', stationName: 'Station Alpha-02', dateLabel: 'Oct 15, 2023',             kwhUsed: 0,  costUsd: 0,    autoReleased: true },
  ];
}

export function getUserVehicles(): Vehicle[] {
  return [
    { id: 'VH-1', brand: 'BYD',    model: 'Atto 3',   plate: 'EV 1234 AB', type: 'Mobil Listrik', batteryKwh: 60, connector: 'CCS2',    color: '#1A4D43' },
    { id: 'VH-2', brand: 'Wuling', model: 'Air EV',   plate: 'EV 5678 CD', type: 'Mobil Listrik', batteryKwh: 26, connector: 'Type 2',  color: '#2D6B5A' },
    { id: 'VH-3', brand: 'Hyundai',model: 'Ioniq 5',  plate: 'EV 9012 EF', type: 'Mobil Listrik', batteryKwh: 77, connector: 'CCS2',    color: '#0D2B22' },
  ];
}

export function getUserInvoices() {
  return (invoicesData as any[]).filter(i => i.user_id === USER_ID).slice(0, 10);
}

export function formatIdr(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}
