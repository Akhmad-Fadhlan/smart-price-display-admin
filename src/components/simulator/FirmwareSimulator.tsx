'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Cpu, Send, CheckCircle2, XCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';

interface SimulatorProps {
  devices: { id: string; name: string; device_uid: string; device_type: string }[];
  onActionComplete?: () => void;
}

export const FirmwareSimulator: React.FC<SimulatorProps> = ({ devices, onActionComplete }) => {
  const [selectedDevId, setSelectedDevId] = useState<string>(devices[0]?.id || '');
  const [logs, setLogs] = useState<{ time: string; type: 'req' | 'res' | 'err'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedDevice = devices.find((d) => d.id === selectedDevId) || devices[0];

  const addLog = (type: 'req' | 'res' | 'err', text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, text }, ...prev.slice(0, 15)]);
  };

  const getSimToken = (id: string) => {
    if (id === 'dev-c6-01') return 'dpt_demo_token_c6_01_secret';
    if (id === 'dev-c6-02') return 'dpt_demo_token_c6_02_secret';
    if (id === 'dev-lily-01') return 'dpt_demo_token_lily_01_secret';
    if (id === 'dev-lily-02') return 'dpt_demo_token_lily_02_secret';
    return 'dpt_demo_token_c6_01_secret';
  };

  const handleSendHeartbeat = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    addLog('req', `POST /api/device/heartbeat [${selectedDevice.device_uid}]`);

    try {
      const res = await fetch('/api/device/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-UID': selectedDevice.device_uid,
          'Authorization': `Bearer ${getSimToken(selectedDevice.id)}`,
        },
        body: JSON.stringify({
          firmware_version: '1.0.3',
          current_profile_id: 'prf-es-teh',
          current_profile_version: 3,
          ip_address: '192.168.1.20',
          battery: 95,
          signal_strength: -55,
          timestamp: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        addLog(
          'res',
          `200 OK -> config_outdated: ${json.data?.config_outdated}, latest_version: ${json.data?.latest_version}`
        );
      } else {
        addLog('err', `${res.status} Error: ${json.error?.message}`);
      }
    } catch (err: any) {
      addLog('err', `Network error: ${err.message}`);
    } finally {
      setLoading(false);
      onActionComplete?.();
    }
  };

  const handleGetConfig = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    addLog('req', `GET /api/device/config [${selectedDevice.device_uid}]`);

    try {
      const res = await fetch('/api/device/config', {
        method: 'GET',
        headers: {
          'X-Device-UID': selectedDevice.device_uid,
          'Authorization': `Bearer ${getSimToken(selectedDevice.id)}`,
        },
      });

      if (res.status === 204) {
        addLog('res', '204 No Content (Perangkat belum punya profile)');
      } else {
        const json = await res.json();
        if (res.ok) {
          addLog(
            'res',
            `200 OK -> Profile "${json.data?.config?.product_name}" v${json.data?.version} (price: Rp${json.data?.config?.price})`
          );
        } else {
          addLog('err', `${res.status} Error: ${json.error?.message}`);
        }
      }
    } catch (err: any) {
      addLog('err', `Network error: ${err.message}`);
    } finally {
      setLoading(false);
      onActionComplete?.();
    }
  };

  const handleSendAck = async (success: boolean) => {
    if (!selectedDevice) return;
    setLoading(true);
    addLog('req', `POST /api/device/sync-ack [success=${success}]`);

    try {
      const res = await fetch('/api/device/sync-ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-UID': selectedDevice.device_uid,
          'Authorization': `Bearer ${getSimToken(selectedDevice.id)}`,
        },
        body: JSON.stringify({
          profile_id: 'prf-es-teh',
          version: 3,
          success,
          error: success ? undefined : 'Simulation rendering error test',
        }),
      });

      const json = await res.json();
      if (res.ok) {
        addLog('res', `200 OK -> Sync Status updated to ${success ? 'synced' : 'failed'}`);
      } else {
        addLog('err', `${res.status} Error: ${json.error?.message}`);
      }
    } catch (err: any) {
      addLog('err', `Network error: ${err.message}`);
    } finally {
      setLoading(false);
      onActionComplete?.();
    }
  };

  return (
    <Card className="border-slate-300">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Firmware Hardware Simulator</span>
          </span>
        }
        subtitle="Uji coba protokol ESP32-C6 / LilyGO (Heartbeat, Fetch Config & Sync ACK) tanpa hardware fisik."
      />
      <CardBody className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Pilih Perangkat Terhubung"
            value={selectedDevId}
            onChange={(e) => setSelectedDevId(e.target.value)}
            options={devices.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.device_uid}) - ${d.device_type.toUpperCase()}`,
            }))}
          />
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSendHeartbeat}
              isLoading={loading}
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Heartbeat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGetConfig}
              isLoading={loading}
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. GET Config</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">Respon Perangkat (ACK):</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendAck(true)}
            isLoading={loading}
            className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>ACK Sukses</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendAck(false)}
            isLoading={loading}
            className="text-rose-700 hover:bg-rose-50 border-rose-300"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>ACK Gagal</span>
          </Button>
        </div>

        {/* Console Logs */}
        <div className="bg-slate-900 rounded-md p-3 font-mono text-xs text-slate-200 h-28 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-[11px] italic">
              Klik tombol di atas untuk mengirim payload HTTP dari perangkat...
            </p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex items-start gap-2 leading-tight">
                <span className="text-slate-500 shrink-0 text-[10px]">{l.time}</span>
                <span
                  className={
                    l.type === 'req'
                      ? 'text-blue-400'
                      : l.type === 'res'
                      ? 'text-emerald-400'
                      : 'text-rose-400 font-semibold'
                  }
                >
                  {l.text}
                </span>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
};
