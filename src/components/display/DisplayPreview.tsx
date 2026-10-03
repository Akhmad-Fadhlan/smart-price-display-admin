'use client';

import React from 'react';
import { DeviceType, DEVICE_SPECS } from '@/lib/display/devices';
import { DisplayConfigData, renderDisplay } from '@/lib/display/renderer';
import { AlertTriangle, Monitor } from 'lucide-react';

interface DisplayPreviewProps {
  deviceType: DeviceType;
  config: DisplayConfigData;
  onDeviceTypeChange?: (type: DeviceType) => void;
  scale?: number;
  showSelector?: boolean;
}

export const DisplayPreview: React.FC<DisplayPreviewProps> = ({
  deviceType,
  config,
  onDeviceTypeChange,
  scale = 1,
  showSelector = true,
}) => {
  const spec = DEVICE_SPECS[deviceType] || DEVICE_SPECS.esp32_c6;
  const renderResult = renderDisplay(deviceType, config);

  const dimAlpha = Math.max(0.05, Math.min(1, config.brightness / 100));

  return (
    <div className="flex flex-col items-center">
      {/* Selector Tabs */}
      {showSelector && onDeviceTypeChange && (
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg mb-4 border border-slate-300 text-xs font-medium">
          <button
            type="button"
            onClick={() => onDeviceTypeChange('esp32_c6')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              deviceType === 'esp32_c6'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>ESP32-C6 (1.47")</span>
          </button>
          <button
            type="button"
            onClick={() => onDeviceTypeChange('lilygo_s3')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              deviceType === 'lilygo_s3'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>LilyGO S3 (1.9")</span>
          </button>
        </div>
      )}

      {/* Device Hardware Chassis */}
      <div className="relative bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center">
        {/* Hardware Status Header LED */}
        <div className="w-full flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 font-semibold uppercase">
            {spec.name}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-slate-400">{config.rotation}°</span>
          </div>
        </div>

        {/* Physical Screen Bezel Canvas */}
        <div
          className="relative bg-black rounded-sm border-2 border-slate-800 overflow-hidden shadow-inner flex items-center justify-center transition-all"
          style={{
            width: `${renderResult.viewportWidth * scale}px`,
            height: `${renderResult.viewportHeight * scale}px`,
          }}
        >
          {/* LCD Backlight & Content Layer */}
          <div
            className="w-full h-full relative bg-slate-950 text-white select-none transition-opacity duration-200"
            style={{ opacity: dimAlpha }}
          >
            {/* Grid texture for LCD feel */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#11182715_1px,transparent_1px),linear-gradient(to_bottom,#11182715_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none" />

            {/* Rendered Elements */}
            {renderResult.elements.map((el) => {
              const alignClass =
                el.align === 'left'
                  ? 'text-left left-3'
                  : el.align === 'right'
                  ? 'text-right right-3'
                  : 'text-center left-1/2 -translate-x-1/2';

              return (
                <div
                  key={el.id}
                  className={`absolute whitespace-nowrap tracking-wide leading-none transition-all ${alignClass}`}
                  style={{
                    top: `${el.yPercent}%`,
                    transform: el.align === 'center' ? 'translate(-50%, -50%)' : 'translateY(-50%)',
                    fontSize: `${el.fontSizePx * scale}px`,
                    fontWeight: el.fontWeight === 'bold' ? 700 : 400,
                    color: el.id === 'price' ? '#fde047' : el.id === 'promo' ? '#38bdf8' : '#ffffff',
                  }}
                >
                  {el.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chassis Footer Spec Info */}
        <div className="mt-2 text-[10px] font-mono text-slate-500">
          Resolution: {renderResult.viewportWidth} × {renderResult.viewportHeight} px
        </div>
      </div>

      {/* Overflow Warnings */}
      {renderResult.hasOverflow && (
        <div className="mt-3 w-full max-w-[280px] p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-900">Peringatan Ukuran Teks</p>
            {renderResult.warnings.map((w, idx) => (
              <p key={idx} className="text-[11px] leading-tight text-amber-700">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
