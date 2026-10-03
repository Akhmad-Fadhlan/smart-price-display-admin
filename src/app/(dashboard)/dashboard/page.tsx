'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FirmwareSimulator } from '@/components/simulator/FirmwareSimulator';
import { DeviceOverviewItem } from '@/lib/services/devices.service';
import { GroupOverviewItem } from '@/lib/services/groups.service';
import {
  Smartphone,
  Activity,
  FolderKanban,
  RotateCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    total_devices: 0,
    online: 0,
    offline: 0,
    groups: 0,
    pending_sync: 0,
  });
  const [devices, setDevices] = useState<DeviceOverviewItem[]>([]);
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, devRes, grpRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/devices'),
        fetch('/api/groups'),
      ]);

      const sumJson = await sumRes.json();
      const devJson = await devRes.json();
      const grpJson = await grpRes.json();

      if (sumJson.data) setSummary(sumJson.data);
      if (devJson.data) setDevices(devJson.data);
      if (grpJson.data) setGroups(grpJson.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds for online calculation (BR-13)
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="pb-12">
      <Header
        title="Dashboard Control Center"
        subtitle="Pantau dan kelola seluruh label harga digital ESP32-C6 & LilyGO T-Display-S3"
        onRefresh={fetchData}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Devices</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  {loading ? '...' : summary.total_devices}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">ESP32-C6 & LilyGO</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Smartphone className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Perangkat</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-emerald-600 font-mono">
                    {loading ? '...' : summary.online}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">/ {summary.total_devices} Online</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{summary.offline} Offline (&gt; 60s)</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Device Groups</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  {loading ? '...' : summary.groups}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Kelompok ESP32-C6</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FolderKanban className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Sync</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                  {loading ? '...' : summary.pending_sync}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Menunggu heartbeat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <RotateCw className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Realtime Device & Group Status Table */}
        <Card>
          <CardHeader
            title="Ringkasan Perangkat Terdaftar"
            subtitle="Status koneksi dan sinkronisasi konfigurasi terbaru"
            action={
              <Link href="/devices">
                <Button variant="ghost" size="sm">
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Perangkat / Group</th>
                  <th className="px-5 py-3">Tipe Screen</th>
                  <th className="px-5 py-3">Profile Efektif</th>
                  <th className="px-5 py-3">Koneksi</th>
                  <th className="px-5 py-3">Sync Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Memuat data perangkat...
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center">
                      <p className="text-slate-500 font-medium">Belum ada device terdaftar.</p>
                      <Link href="/devices" className="inline-block mt-2">
                        <Button variant="primary" size="sm">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Daftarkan Device Pertama</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div>
                          <div className="font-semibold">{dev.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{dev.device_uid}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200">
                          {dev.device_type === 'esp32_c6' ? 'ESP32-C6 (1.47")' : 'LilyGO S3 (1.9")'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {dev.profile ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{dev.profile.name}</span>
                            <span className="text-[10px] font-mono bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded">
                              v{dev.profile.version}
                            </span>
                            {dev.profile.source === 'group' && (
                              <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1 rounded border border-blue-100">
                                (Group: {dev.group_name})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No profile</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={dev.is_online ? 'online' : 'offline'}>
                          {dev.is_online ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={dev.sync.status}>
                          {dev.sync.status === 'synced' && '✓ Synced'}
                          {dev.sync.status === 'pending' && '⟳ Pending'}
                          {dev.sync.status === 'syncing' && '⟳ Syncing...'}
                          {dev.sync.status === 'failed' && '⚠ Failed'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/devices/${dev.id}`}>
                          <Button variant="outline" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Embedded Firmware Simulator for Lay Users */}
        <FirmwareSimulator
          devices={devices.map((d) => ({
            id: d.id,
            name: d.name,
            device_uid: d.device_uid,
            device_type: d.device_type,
          }))}
          onActionComplete={fetchData}
        />
      </div>
    </div>
  );
}
