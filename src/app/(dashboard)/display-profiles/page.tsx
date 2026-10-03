'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProfileOverviewItem } from '@/lib/services/profiles.service';
import { GroupOverviewItem } from '@/lib/services/groups.service';
import { DeviceOverviewItem } from '@/lib/services/devices.service';
import { formatPrice } from '@/lib/display/formatter';
import { Palette, Plus, Copy, Edit3, Send, Trash2, Smartphone, FolderKanban } from 'lucide-react';
import Link from 'next/link';

export default function DisplayProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileOverviewItem[]>([]);
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [standaloneDevices, setStandaloneDevices] = useState<DeviceOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Duplicate Modal State
  const [duplicateSource, setDuplicateSource] = useState<ProfileOverviewItem | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Assign Modal State
  const [assignSource, setAssignSource] = useState<ProfileOverviewItem | null>(null);
  const [targetType, setTargetType] = useState<'group' | 'device'>('group');
  const [selectedTargetId, setSelectedTargetId] = useState('');

  // Delete Modal State
  const [deleteSource, setDeleteSource] = useState<ProfileOverviewItem | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/display-profiles');
      const json = await res.json();
      if (json.data) setProfiles(json.data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTargets = async () => {
    try {
      const [grpRes, devRes] = await Promise.all([fetch('/api/groups'), fetch('/api/devices')]);
      const grpJson = await grpRes.json();
      const devJson = await devRes.json();
      if (grpJson.data) setGroups(grpJson.data);
      if (devJson.data) {
        // Only standalone devices without group (BR-06)
        setStandaloneDevices(devJson.data.filter((d: any) => !d.group_id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchTargets();
  }, [fetchProfiles]);

  const handleDuplicate = async () => {
    if (!duplicateSource || !duplicateName.trim()) return;
    setActionLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/display-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateName.trim(),
          duplicate_from: duplicateSource.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Gagal menduplikasi profile');
      } else {
        setDuplicateSource(null);
        setDuplicateName('');
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignSource || !selectedTargetId) return;
    setActionLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_profile_id: assignSource.id,
          targets: [{ type: targetType, id: selectedTargetId }],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Gagal meng-assign profile');
      } else {
        setAssignSource(null);
        setSelectedTargetId('');
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (force = false) => {
    if (!deleteSource) return;
    setActionLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/display-profiles/${deleteSource.id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Gagal menghapus profile');
      } else {
        setDeleteSource(null);
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <Header
        title="Display Profiles"
        subtitle="Kelola paket konfigurasi tampilan yang dapat dipakai bersama"
        onRefresh={fetchProfiles}
      >
        <Link href="/display-profiles/new">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4" />
            <span>Buat Profile Baru</span>
          </Button>
        </Link>
      </Header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Memuat daftar profile...</div>
        ) : profiles.length === 0 ? (
          <Card className="p-12 text-center max-w-md mx-auto">
            <Palette className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Belum ada Display Profile</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Buat konfigurasi tampilan awal untuk produk dan harga yang akan ditampilkan pada layar LCD.
            </p>
            <Link href="/display-profiles/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" />
                <span>Buat Profile Pertama</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((prf) => (
              <Card key={prf.id} className="flex flex-col justify-between">
                <div>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{prf.name}</span>
                        <span className="text-xs font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                          v{prf.version}
                        </span>
                      </span>
                    }
                    action={
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {formatPrice(prf.price)}
                        {prf.unit ? `/${prf.unit}` : ''}
                      </span>
                    }
                  />
                  <CardBody className="p-5 space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Teks Produk Layar</p>
                      <p className="text-sm font-bold text-slate-900 tracking-wide mt-0.5">{prf.product_name}</p>
                    </div>

                    <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                      {prf.description || 'Tidak ada deskripsi profile.'}
                    </p>

                    <div className="p-2.5 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Perangkat Menggunakan:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {prf.device_count} Device
                      </span>
                    </div>
                  </CardBody>
                </div>

                <CardFooter className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Link href={`/display-profiles/${prf.id}/editor`}>
                      <Button variant="outline" size="sm" title="Edit Config & Live Preview">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDuplicateSource(prf);
                        setDuplicateName(`${prf.name} (Copy)`);
                      }}
                      title="Duplikasi Profile"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplikat</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAssignSource(prf);
                        setSelectedTargetId('');
                      }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => setDeleteSource(prf)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Duplicate Profile */}
      <Modal
        isOpen={!!duplicateSource}
        onClose={() => setDuplicateSource(null)}
        title="Duplikasi Display Profile"
        subtitle={`Salin isi konfigurasi dari ${duplicateSource?.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDuplicateSource(null)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleDuplicate} isLoading={actionLoading}>
              Duplikasi Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">{errorMsg}</div>}
          <Input
            label="Nama Profile Baru"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Modal Assign Profile */}
      <Modal
        isOpen={!!assignSource}
        onClose={() => setAssignSource(null)}
        title="Assign Profile ke Target"
        subtitle={`Hubungkan ${assignSource?.name} (v${assignSource?.version}) ke Group atau Device`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAssignSource(null)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssign} isLoading={actionLoading}>
              Simpan Assignment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">{errorMsg}</div>}

          <Select
            label="Tipe Target Assignment"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as any);
              setSelectedTargetId('');
            }}
            options={[
              { value: 'group', label: 'Group (Semua device dalam group)' },
              { value: 'device', label: 'Individual Device (Tanpa group)' },
            ]}
          />

          {targetType === 'group' ? (
            <Select
              label="Pilih Group Target"
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              options={[
                { value: '', label: 'Pilih Group...' },
                ...groups.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.device_count} devices)`,
                })),
              ]}
              helperText="Semua perangkat dalam group akan otomatis menggunakan profile ini."
            />
          ) : (
            <Select
              label="Pilih Individual Device"
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              options={[
                { value: '', label: 'Pilih Device Standalone...' },
                ...standaloneDevices.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.device_uid}) - ${d.device_type.toUpperCase()}`,
                })),
              ]}
              helperText="Perangkat yang berada dalam group tidak muncul di sini (BR-06)."
            />
          )}
        </div>
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        isOpen={!!deleteSource}
        onClose={() => setDeleteSource(null)}
        title="Hapus Profile?"
        subtitle={`Konfirmasi penghapusan profile ${deleteSource?.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteSource(null)}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(true)} isLoading={actionLoading}>
              Force Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">{errorMsg}</div>}
          <p className="text-xs text-slate-600 leading-relaxed">
            Profile ini saat ini dipakai oleh {deleteSource?.device_count} device. Dengan <strong>Force Delete</strong>, profile akan dihapus dan perangkat terkait akan menjadi tanpa profile.
          </p>
        </div>
      </Modal>
    </div>
  );
}
