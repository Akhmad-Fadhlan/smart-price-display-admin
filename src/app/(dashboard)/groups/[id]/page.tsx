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
import { ProfileOverviewItem } from '@/lib/services/profiles.service';
import { ArrowLeft, Layers, Palette, Plus, UserMinus, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.id as string) || '';

  const [group, setGroup] = useState<any>(null);
  const [profiles, setProfiles] = useState<ProfileOverviewItem[]>([]);
  const [availableDevices, setAvailableDevices] = useState<DeviceOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMemberDevId, setSelectedMemberDevId] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchGroupDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const json = await res.json();
      if (json.data) setGroup(json.data);
    } catch (err) {
      console.error('Error fetching group detail:', err);
    } fontally: {
      setLoading(false);
    }
  }, [groupId]);

  const fetchOptions = async () => {
    try {
      const [prfRes, devRes] = await Promise.all([fetch('/api/display-profiles'), fetch('/api/devices')]);
      const prfJson = await prfRes.json();
      const devJson = await devRes.json();
      if (prfJson.data) setProfiles(prfJson.data);
      if (devJson.data) {
        // Filter ESP32-C6 devices not in this group
        setAvailableDevices(devJson.data.filter((d: any) => d.device_type === 'esp32_c6' && d.group_id !== groupId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroupDetail();
    fetchOptions();
  }, [fetchGroupDetail]);

  const handleAssignGroupProfile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_profile_id: selectedProfileId,
          targets: [{ type: 'group', id: groupId }],
        }),
      });
      if (res.ok) {
        setIsAssignOpen(false);
        fetchGroupDetail();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberDevId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [selectedMemberDevId] }),
      });
      if (res.ok) {
        setIsAddMemberOpen(false);
        setSelectedMemberDevId('');
        fetchGroupDetail();
        fetchOptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (devId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/devices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [devId] }),
      });
      if (res.ok) {
        fetchGroupDetail();
        fetchOptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async (force: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/groups');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !group) {
    return <div className="p-8 text-center text-slate-500">Memuat rincian group...</div>;
  }

  return (
    <div className="pb-12">
      <Header
        title={group.name}
        subtitle={`${group.device_count} Anggota Perangkat ESP32-C6`}
        onRefresh={fetchGroupDetail}
      >
        <Link href="/groups">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Groups</span>
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus Group</span>
        </Button>
      </Header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Assigned Display Profile Banner */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>Display Profile Group</span>
              </span>
            }
            subtitle="Semua anggota dalam group ini otomatis menggunakan konfigurasi profile berikut"
            action={
              <Button variant="primary" size="sm" onClick={() => setIsAssignOpen(true)}>
                <span>Ganti Profile Group</span>
              </Button>
            }
          />
          <CardBody className="p-5">
            {group.profile ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">{group.profile.name}</h4>
                    <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      v{group.profile.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mengatur seluruh tampilan {group.device_count} device anggota secara bersamaan.
                  </p>
                </div>
                <Link href={`/display-profiles/${group.profile.id}/editor`}>
                  <Button variant="outline" size="sm">
                    Editor Profile
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
                <p className="font-medium text-slate-700">Group ini belum memiliki Display Profile</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAssignOpen(true)}>
                  Assign Display Profile Pertama
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Member Devices Table */}
        <Card>
          <CardHeader
            title="Anggota Perangkat dalam Group"
            subtitle={`${group.online_count} / ${group.device_count} Perangkat Online`}
            action={
              <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Anggota</span>
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Nama Perangkat</th>
                  <th className="px-5 py-3">Device UID</th>
                  <th className="px-5 py-3">Status Koneksi</th>
                  <th className="px-5 py-3">Sync Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {group.members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      Belum ada device anggota dalam group ini.
                    </td>
                  </tr>
                ) : (
                  group.members.map((dev: DeviceOverviewItem) => (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{dev.name}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{dev.device_uid}</td>
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
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <Link href={`/devices/${dev.id}`}>
                          <Button variant="outline" size="sm">
                            Detail
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleRemoveMember(dev.id)}
                          isLoading={actionLoading}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Keluarkan</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal Assign Group Profile */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Ganti Display Profile Group"
        subtitle={`Seluruh ${group.device_count} device anggota akan mengikuti profile ini`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAssignOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssignGroupProfile} isLoading={actionLoading}>
              Assign ke Group
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

      {/* Modal Add Member */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Tambah Device ke Group"
        subtitle="Hanya device bertipe ESP32-C6 yang dapat dimasukkan"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddMember} isLoading={actionLoading}>
              Tambahkan ke Group
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Pilih Device ESP32-C6"
            value={selectedMemberDevId}
            onChange={(e) => setSelectedMemberDevId(e.target.value)}
            options={[
              { value: '', label: 'Pilih Device...' },
              ...availableDevices.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.device_uid})`,
              })),
            ]}
          />
        </div>
      </Modal>

      {/* Modal Delete Group */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Hapus Group?"
        subtitle="Konfirmasi penghapusan group"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteGroup(true)}
              isLoading={actionLoading}
            >
              Hapus (Force Delete)
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Group ini memiliki {group.device_count} device anggota. Dengan <strong>Force Delete</strong>, group akan dihapus dan seluruh device anggota akan dikeluarkan dari group (menjadi tanpa profile).
        </p>
      </Modal>
    </div>
  );
}
