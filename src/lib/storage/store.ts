import { DisplayConfigData } from '../display/renderer';

export interface DeviceRecord {
  id: string;
  device_uid: string;
  name: string;
  device_type: 'esp32_c6' | 'lilygo_s3';
  group_id: string | null;
  firmware_version: string | null;
  last_seen: string | null;
  ip_address: string | null;
  battery: number | null;
  signal_strength: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceCredentialRecord {
  device_id: string;
  token: string; // Stored in memory for demo verification / API auth
  token_hash: string;
  created_at: string;
  rotated_at: string | null;
}

export interface DeviceGroupRecord {
  id: string;
  name: string;
  device_type: 'esp32_c6';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisplayProfileRecord {
  id: string;
  name: string;
  description: string | null;
  version: number;
  is_custom: boolean;
  owner_device_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisplayConfigRecord extends DisplayConfigData {
  id: string;
  display_profile_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRecord {
  id: string;
  display_profile_id: string;
  device_id: string | null;
  group_id: string | null;
  is_active: boolean;
  assigned_at: string;
  updated_at: string;
}

export interface SyncStatusRecord {
  device_id: string;
  profile_id: string | null;
  profile_version: number;
  synced_profile_id: string | null;
  synced_version: number;
  sync_status: 'synced' | 'pending' | 'syncing' | 'failed';
  force_resync: boolean;
  last_sync: string | null;
  last_error: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'pending';
  created_at: string;
  updated_at: string;
}

class InMemStore {
  users: Map<string, UserRecord> = new Map();
  allowlist: Map<string, string> = new Map();
  groups: Map<string, DeviceGroupRecord> = new Map();
  devices: Map<string, DeviceRecord> = new Map();
  credentials: Map<string, DeviceCredentialRecord> = new Map();
  profiles: Map<string, DisplayProfileRecord> = new Map();
  configs: Map<string, DisplayConfigRecord> = new Map();
  assignments: Map<string, AssignmentRecord> = new Map();
  syncStatuses: Map<string, SyncStatusRecord> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Empty initial seed data - system synchronizes with real Supabase database
  }

  public getEffectiveProfileId(deviceId: string): string | null {
    const dev = this.devices.get(deviceId);
    if (!dev) return null;

    if (dev.group_id) {
      // Find active assignment for this group
      for (const asg of Array.from(this.assignments.values())) {
        if (asg.is_active && asg.group_id === dev.group_id) {
          return asg.display_profile_id;
        }
      }
      return null;
    } else {
      // Find active assignment for this device
      for (const asg of Array.from(this.assignments.values())) {
        if (asg.is_active && asg.device_id === dev.id) {
          return asg.display_profile_id;
        }
      }
      return null;
    }
  }

  public refreshDeviceSync(deviceId: string) {
    const profileId = this.getEffectiveProfileId(deviceId);
    const existingSync = this.syncStatuses.get(deviceId);
    const profile = profileId ? this.profiles.get(profileId) : null;
    const targetVersion = profile ? profile.version : 0;

    if (!profileId) {
      this.syncStatuses.set(deviceId, {
        device_id: deviceId,
        profile_id: null,
        profile_version: 0,
        synced_profile_id: null,
        synced_version: 0,
        sync_status: 'synced',
        force_resync: false,
        last_sync: existingSync?.last_sync || null,
        last_error: null,
      });
      return;
    }

    let nextStatus: 'synced' | 'pending' | 'syncing' | 'failed' = 'pending';

    if (existingSync) {
      if (
        existingSync.synced_profile_id === profileId &&
        existingSync.synced_version === targetVersion &&
        !existingSync.force_resync
      ) {
        nextStatus = 'synced';
      } else if (
        existingSync.profile_id === profileId &&
        existingSync.profile_version === targetVersion &&
        !existingSync.force_resync
      ) {
        nextStatus = existingSync.sync_status;
      }
    }

    this.syncStatuses.set(deviceId, {
      device_id: deviceId,
      profile_id: profileId,
      profile_version: targetVersion,
      synced_profile_id: existingSync?.synced_profile_id || null,
      synced_version: existingSync?.synced_version || 0,
      sync_status: nextStatus,
      force_resync: existingSync?.force_resync || false,
      last_sync: existingSync?.last_sync || null,
      last_error: existingSync?.last_error || null,
    });
  }

  public refreshAllSync() {
    for (const devId of Array.from(this.devices.keys())) {
      this.refreshDeviceSync(devId);
    }
  }

  public isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false;
    const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000;
    return diff <= 60;
  }
}

// Global singleton instance for local dev
const globalStore = (globalThis as any).__smartDisplayStore || new InMemStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__smartDisplayStore = globalStore;
}

export const store = globalStore as InMemStore;
