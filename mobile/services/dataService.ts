import stationsData from '../data/stations.json';
import slotsData from '../data/slots.json';
import invoicesData from '../data/invoices.json';
import meterData from '../data/realtime_meter.json';
import sessionsData from '../data/charging_sessions.json';
import { colors } from '../constants/theme';

export type SlotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface Station {
  station_id: string; station_name: string; location: string;
  city: string; province: string; latitude: number; longitude: number; status: string;
}

export interface StationDetail extends Station {
  displayId: string;
  onlineStatus: 'online' | 'offline' | 'maintenance';
  activeSlots: number; totalSlots: number;
  currentPowerKw: number; slotStatusLabel: string;
}

export interface SlotDetail {
  slot_id: string; station_id: string; connector_type: string; power_kw: number;
  slot_status: string; currentOutputKw: number; outputPct: number; errorMessage?: string;
}

export interface TariffPlan {
  id: string; planId: string; name: string; rateUsd: number;
  timeStart: string; timeEnd: string; appliedStations: number;
  status: 'active' | 'inactive'; icon: string; borderColor: string; note?: string;
}

export interface DashboardStats {
  totalStations: number; newThisMonth: number; activeSlots: number;
  totalSlots: number; utilizationPct: number; totalPowerMw: string;
  isPeakHour: boolean; totalRevenueIdr: number; avgSessionIdr: number; totalTransactions: number;
}

export function getDashboardStats(): DashboardStats {
  const totalStations = stationsData.length;
  const activeSlots = (slotsData as any[]).filter(
    (s) => s.slot_status === 'available' || s.slot_status === 'occupied').length;
  const totalSlots = slotsData.length;
  const utilizationPct = Math.round((activeSlots / totalSlots) * 100);
  const onlineReadings = (meterData as any[]).filter((r) => r.connection_status === 'online');
  const totalPowerKw = onlineReadings.reduce((sum: number, r: any) => sum + (r.power_kw ?? 0), 0);
  const totalPowerMw = (Math.abs(totalPowerKw) / 1000).toFixed(1);
  const isPeakHour = Math.abs(totalPowerKw) > onlineReadings.length * 50 * 0.6;
  const paidInvoices = (invoicesData as any[]).filter((i) => i.payment_status === 'paid');
  const totalRevenueIdr = paidInvoices.reduce((sum: number, i: any) => sum + (i.total_amount ?? 0), 0);
  const avgSessionIdr = paidInvoices.length > 0 ? Math.round(totalRevenueIdr / paidInvoices.length) : 0;
  return { totalStations, newThisMonth: 3, activeSlots, totalSlots, utilizationPct,
    totalPowerMw, isPeakHour, totalRevenueIdr, avgSessionIdr, totalTransactions: paidInvoices.length };
}

export function getStationDetails(): StationDetail[] {
  return (stationsData as Station[]).map((station) => {
    const stSlots = (slotsData as any[]).filter((s) => s.station_id === station.station_id);
    const activeSlots = stSlots.filter(
      (s) => s.slot_status === 'available' || s.slot_status === 'occupied').length;
    const faultSlots = stSlots.filter((s) => s.slot_status === 'maintenance').length;
    const meter = (meterData as any[]).find((m) => m.station_id === station.station_id);
    const currentPowerKw = Math.abs(meter?.power_kw ?? 0);
    let onlineStatus: StationDetail['onlineStatus'] = 'offline';
    if (station.status === 'maintenance') onlineStatus = 'maintenance';
    else if (meter?.connection_status === 'online') onlineStatus = 'online';
    const slotStatusLabel = onlineStatus === 'offline' ? 'Offline'
      : faultSlots > 0 ? 'Reduced Cap' : 'Available';
    const num = station.station_id.replace('ST', '').padStart(3, '0');
    const displayId = `ST-${num}-A`;
    return { ...station, displayId, onlineStatus, activeSlots,
      totalSlots: stSlots.length, currentPowerKw, slotStatusLabel };
  });
}

export function getSlotDetails(stationId?: string): SlotDetail[] {
  const raw = stationId
    ? (slotsData as any[]).filter((s) => s.station_id === stationId)
    : (slotsData as any[]).slice(0, 12);
  return raw.map((slot) => {
    const meter = (meterData as any[]).find((m) => m.slot_id === slot.slot_id);
    const currentOutputKw = Math.abs(meter?.power_kw ?? 0);
    const outputPct = Math.min(currentOutputKw / Math.max(slot.power_kw, 1), 1);
    const errorMessage = slot.slot_status === 'maintenance'
      ? 'Connector fault detected. Engineer dispatched.' : undefined;
    return { slot_id: slot.slot_id, station_id: slot.station_id,
      connector_type: slot.connector_type, power_kw: slot.power_kw,
      slot_status: slot.slot_status,
      currentOutputKw: Math.round(currentOutputKw), outputPct, errorMessage };
  });
}

export function getMeterBars(): number[] {
  const readings = (meterData as any[]).slice(0, 8).map((r) => Math.abs(r.power_kw ?? 0));
  const max = Math.max(...readings, 1);
  return readings.map((v) => v / max);
}

export function getTariffPlans(): TariffPlan[] {
  return [
    { id: '1', planId: 'TRF-8492-PK', name: 'Peak Hour Rate',      rateUsd: 0.45,
      timeStart: '14:00', timeEnd: '19:00', appliedStations: 42,  status: 'active',
      icon: 'weather-sunny',  borderColor: colors.secondary },
    { id: '2', planId: 'TRF-1022-OP', name: 'Off-Peak Standard',   rateUsd: 0.22,
      timeStart: '19:00', timeEnd: '14:00', appliedStations: 128, status: 'active',
      icon: 'weather-night',  borderColor: colors.primaryContainer },
    { id: '3', planId: 'TRF-9941-MB', name: 'Premium Member Rate', rateUsd: 0.18,
      timeStart: '00:00', timeEnd: '23:59', appliedStations: 100, status: 'active',
      icon: 'star-outline', borderColor: colors.amber, note: 'Requires RFID verification' },
  ];
}

export function formatIdr(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}
export function getAllStations(): Station[] { return stationsData as Station[]; }
export function getAllSlots() { return slotsData; }
export function getAllSessions() { return sessionsData; }
export function getAllInvoices() { return invoicesData; }
