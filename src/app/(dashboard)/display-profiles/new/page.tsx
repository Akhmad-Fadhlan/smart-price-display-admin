'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ArrowLeft, Palette } from 'lucide-react';
import Link from 'next/link';

export default function CreateProfilePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('5000');
  const [unit, setUnit] = useState('gelas');
  const [promoText, setPromoText] = useState('SEGAR SETIAP HARI');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericPrice = parseInt(price, 10);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Harga harus berupa angka >= 0');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/display-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          config: {
            product_name: productName.trim().toUpperCase(),
            price: numericPrice,
            unit: unit.trim() || null,
            promo_text: promoText.trim() || null,
            font_size: 'large',
            font_weight: 'bold',
            alignment: 'center',
            brightness: 80,
            rotation: 0,
            layout_config: { schema_version: 1, mode: 'auto', elements: {} },
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Gagal membuat profile');
      } else {
        router.push(`/display-profiles/${json.data.id}/editor`);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <Header
        title="Buat Display Profile Baru"
        subtitle="Konfigurasi awal paket tampilan label harga digital"
      >
        <Link href="/display-profiles">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Batal</span>
          </Button>
        </Link>
      </Header>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Formulir Pengaturan Profile</span>
              </span>
            }
          />
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {error}
                </div>
              )}

              <Input
                label="Nama Internal Profile"
                placeholder="Contoh: Es Teh Manis Jumbo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                helperText="Label nama internal untuk referensi admin"
              />

              <Input
                label="Deskripsi Profile (Opsional)"
                placeholder="Keterangan peruntukan atau promo produk"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <hr className="my-2 border-slate-100" />
              <p className="text-xs font-semibold text-slate-700">Isi Konten Layar Display</p>

              <Input
                label="Teks Nama Produk"
                placeholder="Contoh: ES TEH"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                helperText="Teks nama produk yang akan tampil di layar (1-32 karakter)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Harga Rupiah (Angka)"
                  placeholder="5000"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  helperText="Ditampilkan otomatis sebagai Rp5.000"
                />

                <Input
                  label="Satuan Unit (Opsional)"
                  placeholder="gelas, cangkir, porsi"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  helperText="Ditampilkan sebagai Rp5.000/gelas"
                />
              </div>

              <Input
                label="Teks Promo / Subtitle (Opsional)"
                placeholder="Contoh: SEGAR SETIAP HARI"
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                helperText="Ditampilkan di bawah baris harga (maks 48 karakter)"
              />

              <div className="pt-4 flex justify-end gap-3">
                <Link href="/display-profiles">
                  <Button variant="outline" size="md">
                    Batal
                  </Button>
                </Link>
                <Button variant="primary" size="md" type="submit" isLoading={loading}>
                  Buat Profile & Buka Editor LCD
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
