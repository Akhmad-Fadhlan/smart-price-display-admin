'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DisplayPreview } from '@/components/display/DisplayPreview';
import { DeviceType, FontSizePreset } from '@/lib/display/devices';
import { DisplayConfigData } from '@/lib/display/renderer';
import {
  ArrowLeft,
  Save,
  RotateCw,
  AlertTriangle,
  Layers,
  Palette,
  Sliders,
  Smartphone,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function DisplayEditorPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = (params?.id as string) || '';

  const [profile, setProfile] = useState<any>(null);
  const [deviceTypePreview, setDeviceTypePreview] = useState<DeviceType>('esp32_c6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Optimistic locking conflict state
  const [versionConflict, setVersionConflict] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('5000');
  const [unit, setUnit] = useState('');
  const [promoText, setPromoText] = useState('');
  const [fontSize, setFontSize] = useState<FontSizePreset>('large');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [brightness, setBrightness] = useState<number>(80);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'custom'>('auto');

  // Custom Layout Coordinates
  const [productX, setProductX] = useState(50);
  const [productY, setProductY] = useState(25);
  const [priceX, setPriceX] = useState(50);
  const [priceY, setPriceY] = useState(55);
  const [promoX, setPromoX] = useState(50);
  const [promoY, setPromoY] = useState(85);

  const fetchProfile = useCallback(async () => {
    try {
      setVersionConflict(null);
      const res = await fetch(`/api/display-profiles/${profileId}`);
      const json = await res.json();
      if (json.data) {
        setProfile(json.data);
        const cfg = json.data.config;
        setProductName(cfg.product_name || '');
        setPrice(cfg.price !== undefined ? cfg.price.toString() : '0');
        setUnit(cfg.unit || '');
        setPromoText(cfg.promo_text || '');
        setFontSize(cfg.font_size || 'large');
        setFontWeight(cfg.font_weight || 'bold');
        setAlignment(cfg.alignment || 'center');
        setBrightness(cfg.brightness !== undefined ? cfg.brightness : 80);
        setRotation(cfg.rotation !== undefined ? cfg.rotation : 0);
        setLayoutMode(cfg.layout_config?.mode || 'auto');

        const el = cfg.layout_config?.elements;
        if (el) {
          if (el.product) { setProductX(el.product.x ?? 50); setProductY(el.product.y ?? 25); }
          if (el.price) { setPriceX(el.price.x ?? 50); setPriceY(el.price.y ?? 55); }
          if (el.promo) { setPromoX(el.promo.x ?? 50); setPromoY(el.promo.y ?? 85); }
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Constructed live config object for preview
  const liveConfig: DisplayConfigData = {
    product_name: productName || 'PRODUCT NAME',
    price: parseInt(price, 10) || 0,
    unit: unit || null,
    promo_text: promoText || null,
    font_size: fontSize,
    font_weight: fontWeight,
    alignment: alignment,
    brightness: brightness,
    rotation: rotation,
    layout_config: {
      schema_version: 1,
      mode: layoutMode,
      elements:
        layoutMode === 'custom'
          ? {
              product: { x: productX, y: productY },
              price: { x: priceX, y: priceY },
              promo: { x: promoX, y: promoY },
            }
          : {},
    },
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setVersionConflict(null);
    setSaveSuccess(false);

    try {
      const numericPrice = parseInt(price, 10);

      const res = await fetch(`/api/display-profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_version: profile.version, // BR-09 Optimistic Locking
          config: {
            product_name: productName.trim().toUpperCase(),
            price: isNaN(numericPrice) ? 0 : numericPrice,
            unit: unit.trim() || null,
            promo_text: promoText.trim() || null,
            font_size: fontSize,
            font_weight: fontWeight,
            alignment: alignment,
            brightness: brightness,
            rotation: rotation,
            layout_config: {
              schema_version: 1,
              mode: layoutMode,
              elements:
                layoutMode === 'custom'
                  ? {
                      product: { x: productX, y: productY },
                      price: { x: priceX, y: priceY },
                      promo: { x: promoX, y: promoY },
                    }
                  : {},
            },
          },
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json.error?.code === 'VERSION_CONFLICT') {
        setVersionConflict(json.error.message || 'Profile telah diubah oleh admin lain.');
      } else if (!res.ok) {
        alert(json.error?.message || 'Gagal menyimpan konfigurasi');
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan server');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <div className="p-12 text-center text-slate-500">Memuat Display Editor...</div>;
  }

  return (
    <div className="pb-16">
      <Header
        title={`Display Editor: ${profile.name}`}
        subtitle={`Nomor Versi Konfigurasi: v${profile.version}`}
      >
        <Link href="/display-profiles">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke List</span>
          </Button>
        </Link>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Tersimpan ✓' : 'Simpan Perubahan'}</span>
        </Button>
      </Header>

      <div className="p-6 max-w-[1600px] mx-auto space-y-4">
        {/* Version Conflict Alert Banner */}
        {versionConflict && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg flex items-center justify-between gap-4 text-rose-800 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-rose-900">Konflik Versi Optimistic Locking (BR-09)</p>
                <p className="mt-0.5">{versionConflict}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProfile} className="shrink-0 bg-white">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Versi Terbaru</span>
            </Button>
          </div>
        )}

        {/* 3-Column Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Configuration Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" />
                    <span>Konfigurasi Teks & Konten</span>
                  </span>
                }
              />
              <CardBody className="p-5 space-y-4">
                <Input
                  label="Nama Produk (Product Name)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  maxLength={32}
                  required
                  helperText="Teks utama produk di layar (maks 32 karakter)"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Harga Rupiah"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    helperText="Tampil: Rp15.000"
                  />
                  <Input
                    label="Satuan Unit"
                    placeholder="gelas, kg, porsi"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    maxLength={16}
                    helperText="Contoh: Rp15.000/gelas"
                  />
                </div>

                <Input
                  label="Teks Promo / Subtitle"
                  placeholder="SEGAR SETIAP HARI"
                  value={promoText}
                  onChange={(e) => setPromoText(e.target.value)}
                  maxLength={48}
                  helperText="Teks promo di baris bawah (maks 48 karakter)"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Pengaturan Tipografi, Alignment & Daya" />
              <CardBody className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Ukuran Font Dasar"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as FontSizePreset)}
                    options={[
                      { value: 'small', label: 'Small (12px)' },
                      { value: 'medium', label: 'Medium (18px)' },
                      { value: 'large', label: 'Large (28px)' },
                      { value: 'xlarge', label: 'X-Large (40px)' },
                    ]}
                  />

                  <Select
                    label="Ketebalan Font"
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value as any)}
                    options={[
                      { value: 'bold', label: 'Bold (Tebal)' },
                      { value: 'normal', label: 'Normal' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Alignment Teks"
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value as any)}
                    options={[
                      { value: 'center', label: 'Center (Tengah)' },
                      { value: 'left', label: 'Left (Rata Kiri)' },
                      { value: 'right', label: 'Right (Rata Kanan)' },
                    ]}
                  />

                  <Select
                    label="Rotasi Screen Display"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10) as any)}
                    options={[
                      { value: 0, label: '0° (Portrait Standard)' },
                      { value: 90, label: '90° (Landscape Rotated)' },
                      { value: 180, label: '180° (Portrait Inverted)' },
                      { value: 270, label: '270° (Landscape Inverted)' },
                    ]}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Brightness Backlight Layar</span>
                    <span className="font-mono text-blue-600">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Minimum 5% agar layar tidak mati tanpa sengaja.</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Select
                    label="Mode Layout Koordinat"
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value as any)}
                    options={[
                      { value: 'auto', label: 'Auto (Stacked Vertikal Otomatis)' },
                      { value: 'custom', label: 'Custom (Koordinat Persen X/Y)' },
                    ]}
                  />

                  {layoutMode === 'custom' && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3 text-xs">
                      <p className="font-semibold text-slate-800">Koordinat Persen (0-100%)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Product X (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={productX}
                          onChange={(e) => setProductX(parseInt(e.target.value, 10))}
                        />
                        <Input
                          label="Product Y (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={productY}
                          onChange={(e) => setProductY(parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Price X (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={priceX}
                          onChange={(e) => setPriceX(parseInt(e.target.value, 10))}
                        />
                        <Input
                          label="Price Y (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={priceY}
                          onChange={(e) => setPriceY(parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Promo X (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={promoX}
                          onChange={(e) => setPromoX(parseInt(e.target.value, 10))}
                        />
                        <Input
                          label="Promo Y (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={promoY}
                          onChange={(e) => setPromoY(parseInt(e.target.value, 10))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Column 2: Live Screen Preview Canvas (4 cols) */}
          <div className="lg:col-span-4 sticky top-20">
            <Card>
              <CardHeader title="Live LCD Canvas Preview" subtitle="Simulasi visual identik dengan tampilan firmware hardware" />
              <CardBody className="p-6 flex flex-col items-center justify-center bg-slate-100/50">
                <DisplayPreview
                  deviceType={deviceTypePreview}
                  config={liveConfig}
                  onDeviceTypeChange={(type) => setDeviceTypePreview(type)}
                />
              </CardBody>
            </Card>
          </div>

          {/* Column 3: Profile Info & Target Summary (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Informasi & Target" />
              <CardBody className="p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nama Internal Profile</label>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{profile.name}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Versi Server Saat Ini</label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      v{profile.version}
                    </span>
                    <span className="text-[11px] text-slate-500">Meningkat +1 saat disimpan</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Penggunaan Target</label>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {profile.device_count} Perangkat Menggunakan Profile Ini
                  </p>
                  {profile.assigned_devices && profile.assigned_devices.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                      {profile.assigned_devices.map((d: any) => (
                        <div key={d.id} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200 flex justify-between">
                          <span className="font-semibold text-slate-800">{d.name}</span>
                          <span className="font-mono text-slate-400">{d.device_uid}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
