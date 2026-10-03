'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GroupOverviewItem } from '@/lib/services/groups.service';
import { FolderKanban, Plus, Smartphone, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Create Group
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups');
      const json = await res.json();
      if (json.data) setGroups(json.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          device_type: 'esp32_c6',
          description: description.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'Gagal membuat group');
      } else {
        setIsCreateOpen(false);
        setName('');
        setDescription('');
        fetchGroups();
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-12">
      <Header
        title="Device Groups"
        subtitle="Kelola kelompok smart display ESP32-C6 bersama-sama"
        onRefresh={fetchGroups}
      >
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Buat Group Baru</span>
        </Button>
      </Header>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Memuat daftar group...</div>
        ) : groups.length === 0 ? (
          <Card className="p-12 text-center max-w-md mx-auto">
            <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Belum ada group terbuat</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Buat group untuk mengelola banyak perangkat ESP32-C6 sekaligus dengan display profile yang sama.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Buat Group Pertama</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((grp) => (
              <Card key={grp.id} className="flex flex-col justify-between">
                <div>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>{grp.name}</span>
                      </span>
                    }
                    action={
                      <Badge variant={grp.status === 'online' ? 'online' : grp.status === 'partial' ? 'partial' : 'offline'}>
                        {grp.status.toUpperCase()}
                      </Badge>
                    }
                  />
                  <CardBody className="p-5 space-y-4">
                    <p className="text-xs text-slate-500 min-h-[32px]">
                      {grp.description || 'Tidak ada deskripsi group.'}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Anggota Perangkat:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {grp.online_count} / {grp.device_count} Online
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Display Profile:</span>
                        {grp.profile ? (
                          <span className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>{grp.profile.name}</span>
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1 py-0.2 rounded">
                              v{grp.profile.version}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No profile</span>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </div>

                <CardFooter>
                  <span className="text-slate-500 text-[11px] font-mono">
                    Tipe: {grp.device_type.toUpperCase()}
                  </span>
                  <Link href={`/groups/${grp.id}`}>
                    <Button variant="outline" size="sm">
                      <span>Buka Group</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Create Group */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Buat Group Perangkat Baru"
        subtitle="Kelompokkan beberapa ESP32-C6 untuk menerima display profile yang identik"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateGroup} isLoading={isSubmitting}>
              Buat Group
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <Input
            label="Nama Group"
            placeholder="Contoh: ESP32-C6 Group 01 (Meja Kasir Utama)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Deskripsi Group (Opsional)"
            placeholder="Keterangan lokasi atau peruntukan rak display"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
