import { z } from 'zod';

export const elementSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  font_size: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
}).strict();

export const layoutConfigSchema = z.object({
  schema_version: z.literal(1),
  mode: z.enum(['auto', 'custom']),
  elements: z.object({
    product: elementSchema.optional(),
    price: elementSchema.optional(),
    promo: elementSchema.optional(),
  }).strict(),
}).strict().refine(v => JSON.stringify(v).length <= 4096, 'layout_config exceeds maximum size of 4KB');

export const displayConfigSchema = z.object({
  product_name: z.string().trim().min(1, 'Product name is required').max(32, 'Product name maximum 32 characters'),
  price: z.number().int('Price must be an integer').min(0, 'Price must be >= 0').max(999_999_999, 'Price maximum Rp999.999.999'),
  unit: z.string().trim().max(16, 'Unit maximum 16 characters').nullish().transform(v => v || null),
  promo_text: z.string().trim().max(48, 'Promo text maximum 48 characters').nullish().transform(v => v || null),
  font_size: z.enum(['small', 'medium', 'large', 'xlarge']).default('large'),
  font_weight: z.enum(['normal', 'bold']).default('bold'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  brightness: z.number().int().min(5, 'Minimum brightness 5%').max(100, 'Maximum brightness 100%').default(80),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  layout_config: layoutConfigSchema.default({ schema_version: 1, mode: 'auto', elements: {} }),
});

export const createProfileSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required').max(60, 'Profile name max 60 chars'),
  description: z.string().max(255).nullish(),
  config: displayConfigSchema.optional(),
  duplicate_from: z.string().uuid().optional(),
}).refine(v => v.config || v.duplicate_from, 'Either config or duplicate_from must be provided');

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().max(255).nullish(),
  expected_version: z.number().int().min(1).optional(),
  config: displayConfigSchema.partial().optional(),
}).refine(v => !v.config || v.expected_version !== undefined, {
  message: 'expected_version is required when updating display config',
  path: ['expected_version'],
});

export const createDeviceSchema = z.object({
  device_uid: z.string().regex(/^[A-Z0-9-]{3,40}$/, 'Device UID must be 3-40 uppercase alphanumeric characters or hyphens'),
  name: z.string().trim().min(1, 'Device name is required').max(60),
  device_type: z.enum(['esp32_c6', 'lilygo_s3']),
  group_id: z.string().uuid().nullish(),
});

export const updateDeviceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  group_id: z.string().uuid().nullable().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(60),
  device_type: z.literal('esp32_c6'),
  description: z.string().max(255).nullish(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().max(255).nullish(),
});

export const createAssignmentSchema = z.object({
  display_profile_id: z.string().uuid(),
  targets: z.array(z.object({
    type: z.enum(['device', 'group']),
    id: z.string().uuid(),
  })).min(1, 'At least one target is required').max(100),
});

export const heartbeatSchema = z.object({
  firmware_version: z.string().max(32),
  current_profile_id: z.string().nullable().optional(),
  current_profile_version: z.number().int().min(0).nullable().optional(),
  ip_address: z.string().nullable().optional(),
  battery: z.number().int().min(0).max(100).nullable().optional(),
  signal_strength: z.number().int().min(-120).max(0).nullable().optional(),
  timestamp: z.string().nullable().optional(),
});

export const syncAckSchema = z.object({
  profile_id: z.string(),
  version: z.number().int().min(0),
  success: z.boolean(),
  error: z.string().max(200).nullable().optional(),
});
