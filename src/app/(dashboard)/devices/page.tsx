'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DeviceOverviewItem } from '@/lib/services/devices.service';
import { GroupOverviewItem } from '@/lib/services/groups.service';
import { Search, Plus, Copy, Check, ShieldAlert, Smartphone, Filter } from 'lucide-react';
import Link from 'next/link';

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceOverviewItem[]>([]);
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Add Device Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addUid, setAddUid] = useState('');
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'esp32_c6' | 'lilygo_s3'>('esp32_c6');
  const [addGroupId, setAddGroupId] = useState('');
  const [addError, setAddError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Token Reveal Modal State
  const [registeredTokenData, setRegisteredTokenData] = useState<{
    uid: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filterType !== 'all') params.set('type', filterType);
      if (filterGroup !== 'all') params.set('group_id', filterGroup);
      if (filterStatus === 'online') params.set('online', 'true');
      if (filterStatus === 'offline') params.set('online', 'false');

      const res = await fetch(`/api/devices?${params.toString()}`);
      const json = await res.json();
      if (json.data) setDevices(json.data);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, filterGroup, filterStatus]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const json = await res.json();
      if (json.data) setGroups(json.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchGroups();
  }, [fetchDevices]);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_uid: addUid.trim().toUpperCase(),
          name: addName.trim(),
          device_type: addType,
          group_id: addGroupId || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setAddError(json.error?.message || 'Gagal mendaftarkan device');
      } else {
        setIsAddOpen(false);
        setRegisteredTokenData({
          uid: json.data.device_uid,
          token: json.data.device_token,
        });
        // Reset form
        setAddUid('');
        setAddName('');
        setAddGroupId('');
        fetchDevices();
      }
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (!registeredTokenData) return;
    navigator.clipboard.writeText(registeredTokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-12">
      <Header
        title="Daftar Perangkat (Devices)"
        subtitle="Kelola seluruh smart display ESP32-C6 dan LilyGO T-Display-S3"
        onRefresh={fetchDevices}
        onAddDevice={() => setIsAddOpen(true)}
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Search & Filter Toolbar */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Cari nama atau UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Tipe Hardware' },
                { value: 'esp32_c6', label: 'ESP32-C6 LCD 1.47"' },
                { value: 'lilygo_s3', label: 'LilyGO T-Display-S3 1.9"' },
              ]}
            />

            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Group' },
                { value: 'none', label: 'Tanpa Group (Standalone)' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Status Koneksi' },
                { value: 'online', label: '● Online' },
                { value: 'offline', label: '○ Offline' },
              ]}
            />
          </div>
        </Card>

        {/* Devices Data Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Device UID / Nama</th>
                  <th className="px-5 py-3">Tipe</th>
                  <th className="px-5 py-3">Group</th>
                  <th className="px-5 py-3">Profile Efektif</th>
                  <th className="px-5 py-3">Koneksi</th>
                  <th className="px-5 py-3">Sync Status</th>
                  <th className="px-5 py-3">Last Seen</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Memuat daftar perangkat...
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-800">Tidak ada perangkat ditemukan</p>
                        <p className="text-xs text-slate-500">
                          Sesuaikan filter atau daftarkan perangkat smart display baru.
                        </p>
                        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Device Baru</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{dev.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{dev.device_uid}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200">
                          {dev.device_type === 'esp32_c6' ? 'ESP32-C6' : 'LilyGO S3'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {dev.group_name ? (
                          <span className="font-medium text-slate-800">{dev.group_name}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {dev.profile ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{dev.profile.name}</span>
                            <span className="text-[10px] font-mono bg-slate-200/70 text-slate-600 px-1 py-0.2 rounded">
                              v{dev.profile.version}
                            </span>
                            {dev.profile.is_custom && (
                              <span className="text-[9px] bg-purple-50 text-purple-700 px-1 rounded border border-purple-200 font-semibold">
                                Custom
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
                          {dev.sync.status === 'syncing' && '⟳ Syncing'}
                          {dev.sync.status === 'failed' && '⚠ Failed'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString() : 'Belum pernah'}
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
      </div>

      {/* Modal Add Device */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Daftarkan Device Baru"
        subtitle="Buat kredenisial awal perangkat untuk dimasukkan ke firmware"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateDevice} isLoading={isSubmitting}>
              Register Device
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateDevice} className="space-y-4">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {addError}
            </div>
          )}

          <Input
            label="Device UID (Unik)"
            placeholder="Contoh: ESP32C6-A001 atau LILYGO-S3-001"
            value={addUid}
            onChange={(e) => setAddUid(e.target.value)}
            required
            helperText="Format: 3-40 karakter kapital, angka, dan '-' (BR-01)"
          />

          <Input
            label="Nama Display"
            placeholder="Contoh: Display Rak Minuman Kasir"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
          />

          <Select
            label="Tipe Perangkat Hardware"
            value={addType}
            onChange={(e) => setAddType(e.target.value as any)}
            options={[
              { value: 'esp32_c6', label: 'ESP32-C6 LCD 1.47" (Waveshare)' },
              { value: 'lilygo_s3', label: 'LilyGO T-Display-S3 1.9"' },
            ]}
          />

          {addType === 'esp32_c6' && (
            <Select
              label="Group (Opsional)"
              value={addGroupId}
              onChange={(e) => setAddGroupId(e.target.value)}
              options={[
                { value: '', label: 'Tanpa Group (Atur Nanti)' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              helperText="ESP32-C6 yang berada dalam group akan otomatis menggunakan display profile milik group."
            />
          )}
        </form>
      </Modal>

      {/* Modal Token Reveal (ONE-TIME SECRET) */}
      <Modal
        isOpen={!!registeredTokenData}
        onClose={() => setRegisteredTokenData(null)}
        title="Device Token Terbuat ✓"
        subtitle="Simpan token ini sekarang. Token hanya ditampilkan SEKALI!"
        footer={
          <Button variant="primary" size="sm" onClick={() => setRegisteredTokenData(null)}>
            Saya Sudah Menyimpan Token
          </Button>
        }
      >
        {registeredTokenData && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Peringatan Keamanan Token</p>
                <p>
                  Token ini digunakan untuk otentikasi HTTPS firmware. Jika token hilang, Anda harus melakukan <strong>Rotate Token</strong> dari halaman detail device.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Device UID</label>
              <div className="p-2.5 bg-slate-100 rounded-md font-mono text-xs font-semibold text-slate-900 border border-slate-200">
                {registeredTokenData.uid}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Device Token (Bearer Secret)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 bg-slate-900 text-emerald-400 rounded-md font-mono text-xs break-all border border-slate-800">
                  {registeredTokenData.token}
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyToken}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tercopy' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
