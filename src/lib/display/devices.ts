export type DeviceType = 'esp32_c6' | 'lilygo_s3';

export interface DeviceSpec {
  name: string;
  type: DeviceType;
  width: number; // width in landscape / native panel resolution width
  height: number; // height in portrait
  screenSize: string;
}

export const DEVICE_SPECS: Record<DeviceType, DeviceSpec> = {
  esp32_c6: {
    name: 'ESP32-C6 LCD 1.47"',
    type: 'esp32_c6',
    width: 172,
    height: 320,
    screenSize: '1.47"'
  },
  lilygo_s3: {
    name: 'LilyGO T-Display-S3 1.9"',
    type: 'lilygo_s3',
    width: 170,
    height: 320,
    screenSize: '1.9"'
  }
};

export const FONT_PRESETS = {
  small: 12,
  medium: 18,
  large: 28,
  xlarge: 40
} as const;

export type FontSizePreset = keyof typeof FONT_PRESETS;
