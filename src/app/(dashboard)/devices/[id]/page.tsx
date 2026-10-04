'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { DeviceOverviewItem } from '@/lib/services/devices.service';
import { GroupOverviewItem } from '@/lib/services/groups.service';
import { ProfileOverviewItem } from '@/lib/services/profiles.service';
import {
  ArrowLeft,
  Smartphone,
  Wifi,
  Zap,
  RotateCw,
  Key,
  Trash2,
  Layers,
  Palette,
  Check,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = (params?.id as string) || '';

  const [device, setDevice] = useState<DeviceOverviewItem | null>(null);
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isChangeGroupOpen, setIsChangeGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [isChangeProfileOpen, setIsChangeProfileOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDevice = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`);
      const json = await res.json();
      if (json.data) setDevice(json.data);
    } catch (err) {
      console.error('Error fetching device detail:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchOptions = async () => {
    try {
      const [grpRes, prfRes] = await Promise.all([fetch('/api/groups'), fetch('/api/display-profiles')]);
      const grpJson = await grpRes.json();
      const prfJson = await prfRes.json();
      if (grpJson.data) setGroups(grpJson.data);
      if (prfJson.data) setProfiles(prfJson.data);
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  useEffect(() => {
    fetchDevice();
    fetchOptions();
  }, [fetchDevice]);

  const handleUpdateGroup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroupId === 'none' ? null : selectedGroupId,
        }),
      });
      if (res.ok) {
        setIsChangeGroupOpen(false);
        fetchDevice();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignProfile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_profile_id: selectedProfileId,
          targets: [{ type: 'device', id: deviceId }],
        }),
      });
      if (res.ok) {
        setIsChangeProfileOpen(false);
        fetchDevice();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCustomProfile = async () => {
    if (!device) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/custom-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${device.name} (Custom Profile)` }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/display-profiles/${json.data.profileId}/editor`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceResync = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/devices/${deviceId}/sync`, { method: 'POST' });
      fetchDevice();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSynced = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/devices/${deviceId}/mark-synced`, { method: 'POST' });
      fetchDevice();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateToken = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/rotate-token`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setRotatedToken(json.data.device_token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/devices');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !device) {
    return (
      <div className="p-8 text-center text-slate-500">
        Memuat rincian perangkat...
      </div>
    );
  }

  return (
    <div className="pb-12">
      <Header
        title={device.name}
        subtitle={`UID: ${device.device_uid} · ${device.device_type.toUpperCase()}`}
        onRefresh={fetchDevice}
      >
        <Link href="/devices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Devices</span>
          </Button>
        </Link>
      </Header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Device Information & Telemetry Header Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Informasi & Spesifikasi Perangkat</span>
                </span>
              }
              action={
                <Badge variant={device.is_online ? 'online' : 'offline'}>
                  {device.is_online ? 'Online' : 'Offline'}
                </Badge>
              }
            />
            <CardBody className="p-5">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Device UID</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">{device.device_uid}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Tipe Hardware</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {device.device_type === 'esp32_c6' ? 'ESP32-C6 LCD 1.47"' : 'LilyGO T-Display-S3 1.9"'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Firmware Version</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {device.firmware_version || 'v1.0.0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">IP Address</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {device.ip_address || '192.168.1.20'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Sinyal RSSI</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {device.signal_strength ? `${device.signal_strength} dBm` : '-54 dBm'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Last Seen Heartbeat</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Belum pernah'}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {/* Sync Status Info Box */}
          <Card>
            <CardHeader title="Sinkronisasi Perangkat" />
            <CardBody className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Sync Status:</span>
                <Badge variant={device.sync.status}>
                  {device.sync.status === 'synced' && '✓ Synced'}
                  {device.sync.status === 'pending' && '⟳ Pending'}
                  {device.sync.status === 'syncing' && '⟳ Syncing...'}
                  {device.sync.status === 'failed' && '⚠ Failed'}
                </Badge>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Versi Server:</span>
                  <span className="font-semibold text-slate-800">v{device.sync.profile_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Versi Perangkat:</span>
                  <span className="font-semibold text-slate-800">v{device.sync.synced_version}</span>
                </div>
              </div>

              {device.sync.last_error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-md leading-tight">
                  ⚠ Error: {device.sync.last_error}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Current Effective Profile Card */}
        <Card>
          <CardHeader
            title="Display Profile Efektif"
            subtitle="Profile tampilan yang sedang aktif dan digunakan oleh perangkat ini"
          />
          <CardBody className="p-5">
            {device.profile ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">{device.profile.name}</h4>
                    <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      v{device.profile.version}
                    </span>
                    {device.profile.is_custom && (
                      <span className="text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-semibold">
                        Custom Profile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Sumber Profile: <strong>{device.profile.source === 'group' ? `Group (${device.group_name})` : 'Individual Assignment'}</strong>
                  </p>
                </div>

                <Link href={`/display-profiles/${device.profile.id}/editor`}>
                  <Button variant="outline" size="sm">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    <span>Buka Display Editor</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
                <p className="font-medium text-slate-700">Perangkat belum memiliki display profile (No Profile)</p>
                <p className="text-xs text-slate-400 mt-1">Assign profile atau tambahkan perangkat ini ke dalam Group.</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Device Actions Grid */}
        <Card>
          <CardHeader title="Tindakan & Pengaturan Perangkat" />
          <CardBody className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {device.device_type === 'esp32_c6' && (
              <Button
                variant="outline"
                size="md"
                className="justify-start"
                onClick={() => {
                  setSelectedGroupId(device.group_id || 'none');
                  setIsChangeGroupOpen(true);
                }}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Ubah Group Device</span>
              </Button>
            )}

            {!device.group_id && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="justify-start"
                  onClick={() => setIsChangeProfileOpen(true)}
                >
                  <Palette className="w-4 h-4 text-emerald-600" />
                  <span>Ganti Profile (Assign)</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  className="justify-start"
                  onClick={handleCreateCustomProfile}
                  isLoading={actionLoading}
                >
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Buat Profile Custom</span>
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="md"
              className="justify-start"
              onClick={handleForceResync}
              isLoading={actionLoading}
            >
              <RotateCw className="w-4 h-4 text-amber-600" />
              <span>Force Re-sync</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              className="justify-start text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={handleMarkSynced}
              isLoading={actionLoading}
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Tandai Ter-sync</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              className="justify-start text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={handleRotateToken}
              isLoading={actionLoading}
            >
              <Key className="w-4 h-4 text-amber-600" />
              <span>Rotate Token Secret</span>
            </Button>

            <Button
              variant="destructive"
              size="md"
              className="justify-start"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Device</span>
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Modal Change Group */}
      <Modal
        isOpen={isChangeGroupOpen}
        onClose={() => setIsChangeGroupOpen(false)}
        title="Ubah Group Device"
        subtitle={`Pindahkan ${device.name} ke group lain`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsChangeGroupOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdateGroup} isLoading={actionLoading}>
              Simpan Perubahan Group
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Perhatian: Memindahkan device ke dalam group akan membuat device mengikuti display profile milik group tersebut. Assignment individual sebelumnya akan dinonaktifkan (BR-06).
          </p>
          <Select
            label="Pilih Group Target"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            options={[
              { value: 'none', label: 'Tanpa Group (Keluarkan dari group)' },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </div>
      </Modal>

      {/* Modal Change Profile */}
      <Modal
        isOpen={isChangeProfileOpen}
        onClose={() => setIsChangeProfileOpen(false)}
        title="Ganti Display Profile"
        subtitle={`Pilih profile baru untuk ${device.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsChangeProfileOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssignProfile} isLoading={actionLoading}>
              Assign Profile
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Pilih Profile Display"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            options={[
              { value: '', label: 'Pilih Profile...' },
              ...profiles.map((p) => ({
                value: p.id,
                label: `${p.name} (v${p.version}) - ${p.product_name} (Rp${p.price})`,
              })),
            ]}
          />
        </div>
      </Modal>

      {/* Modal Rotated Token Reveal */}
      <Modal
        isOpen={!!rotatedToken}
        onClose={() => setRotatedToken(null)}
        title="Token Berhasil Di-rotate ✓"
        subtitle="Token lama langsung tidak berlaku. Tanamkan token baru ini ke firmware."
        footer={
          <Button variant="primary" size="sm" onClick={() => setRotatedToken(null)}>
            Tutup
          </Button>
        }
      >
        {rotatedToken && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-slate-900 text-emerald-400 rounded-md font-mono text-xs break-all">
                {rotatedToken}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(rotatedToken);
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 2000);
                }}
              >
                {tokenCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Hapus Device?"
        subtitle={`Tindakan ini tidak dapat dibatalkan.`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteDevice} isLoading={actionLoading}>
              Hapus Device Permanen
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin menghapus <strong>{device.name}</strong> ({device.device_uid})? Perangkat tidak akan dapat berkomunikasi lagi dengan dashboard sampai didaftarkan kembali.
        </p>
      </Modal>
    </div>
  );
}
