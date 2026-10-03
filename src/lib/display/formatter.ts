import { FONT_PRESETS, FontSizePreset } from './devices';

export function formatPrice(price: number): string {
  const formatted = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp${formatted}`;
}

export function formatPriceWithUnit(price: number, unit?: string | null): string {
  const priceStr = formatPrice(price);
  if (!unit || !unit.trim()) return priceStr;
  return `${priceStr}/${unit.trim()}`;
}

const FONT_LEVELS: FontSizePreset[] = ['small', 'medium', 'large', 'xlarge'];

export function getRelativeFontSize(basePreset: FontSizePreset, offset: -1 | 0 | 1): FontSizePreset {
  const currentIndex = FONT_LEVELS.indexOf(basePreset);
  const targetIndex = Math.max(0, Math.min(FONT_LEVELS.length - 1, currentIndex + offset));
  return FONT_LEVELS[targetIndex];
}

export function getPxFromPreset(preset: FontSizePreset): number {
  return FONT_PRESETS[preset];
}
