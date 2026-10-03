import { DEVICE_SPECS, DeviceType, FontSizePreset } from './devices';
import { formatPriceWithUnit, getPxFromPreset, getRelativeFontSize } from './formatter';

export interface LayoutElementConfig {
  x?: number;
  y?: number;
  font_size?: FontSizePreset;
  align?: 'left' | 'center' | 'right';
}

export interface LayoutConfig {
  schema_version: number;
  mode: 'auto' | 'custom';
  elements?: {
    product?: LayoutElementConfig;
    price?: LayoutElementConfig;
    promo?: LayoutElementConfig;
  };
}

export interface DisplayConfigData {
  product_name: string;
  price: number;
  unit?: string | null;
  promo_text?: string | null;
  font_size: FontSizePreset;
  font_weight: 'normal' | 'bold';
  alignment: 'left' | 'center' | 'right';
  brightness: number;
  rotation: 0 | 90 | 180 | 270;
  layout_config: LayoutConfig;
}

export interface RenderedElement {
  id: 'product' | 'price' | 'promo';
  text: string;
  fontSizePx: number;
  fontWeight: string;
  align: 'left' | 'center' | 'right';
  xPercent: number;
  yPercent: number;
  overflow: boolean;
}

export interface RenderResult {
  viewportWidth: number;
  viewportHeight: number;
  elements: RenderedElement[];
  hasOverflow: boolean;
  warnings: string[];
}

export function renderDisplay(
  deviceType: DeviceType,
  config: DisplayConfigData
): RenderResult {
  const spec = DEVICE_SPECS[deviceType] || DEVICE_SPECS.esp32_c6;
  const isLandscape = config.rotation === 90 || config.rotation === 270;
  
  const viewportWidth = isLandscape ? spec.height : spec.width;
  const viewportHeight = isLandscape ? spec.width : spec.height;

  const warnings: string[] = [];
  const elements: RenderedElement[] = [];

  const productName = config.product_name || 'PRODUCT NAME';
  const priceText = formatPriceWithUnit(config.price, config.unit);
  const promoText = config.promo_text ? config.promo_text.trim() : null;

  if (config.layout_config.mode === 'custom' && config.layout_config.elements) {
    const custom = config.layout_config.elements;
    
    if (productName && custom.product) {
      const preset = custom.product.font_size || config.font_size;
      const px = getPxFromPreset(preset);
      const align = custom.product.align || config.alignment;
      const overflow = estimateTextOverflow(productName, px, viewportWidth);
      elements.push({
        id: 'product',
        text: productName,
        fontSizePx: px,
        fontWeight: config.font_weight,
        align,
        xPercent: custom.product.x ?? 50,
        yPercent: custom.product.y ?? 25,
        overflow
      });
      if (overflow) warnings.push(`Product name "${productName}" may exceed screen width.`);
    }

    if (custom.price) {
      const preset = custom.price.font_size || getRelativeFontSize(config.font_size, 1);
      const px = getPxFromPreset(preset);
      const align = custom.price.align || config.alignment;
      const overflow = estimateTextOverflow(priceText, px, viewportWidth);
      elements.push({
        id: 'price',
        text: priceText,
        fontSizePx: px,
        fontWeight: config.font_weight,
        align,
        xPercent: custom.price.x ?? 50,
        yPercent: custom.price.y ?? 55,
        overflow
      });
      if (overflow) warnings.push(`Price text "${priceText}" may exceed screen width.`);
    }

    if (promoText && custom.promo) {
      const preset = custom.promo.font_size || getRelativeFontSize(config.font_size, -1);
      const px = getPxFromPreset(preset);
      const align = custom.promo.align || config.alignment;
      const overflow = estimateTextOverflow(promoText, px, viewportWidth);
      elements.push({
        id: 'promo',
        text: promoText,
        fontSizePx: px,
        fontWeight: 'normal',
        align,
        xPercent: custom.promo.x ?? 50,
        yPercent: custom.promo.y ?? 85,
        overflow
      });
      if (overflow) warnings.push(`Promo text "${promoText}" may exceed screen width.`);
    }
  } else {
    // Auto Mode: stacked vertically
    const activeItems: { id: 'product' | 'price' | 'promo'; text: string; preset: FontSizePreset; weight: string }[] = [];
    
    activeItems.push({
      id: 'product',
      text: productName,
      preset: config.font_size,
      weight: config.font_weight
    });

    activeItems.push({
      id: 'price',
      text: priceText,
      preset: getRelativeFontSize(config.font_size, 1),
      weight: config.font_weight
    });

    if (promoText) {
      activeItems.push({
        id: 'promo',
        text: promoText,
        preset: getRelativeFontSize(config.font_size, -1),
        weight: 'normal'
      });
    }

    const itemCount = activeItems.length;
    activeItems.forEach((item, index) => {
      const yPercent = Math.round(((index + 1) / (itemCount + 1)) * 100);
      const px = getPxFromPreset(item.preset);
      const overflow = estimateTextOverflow(item.text, px, viewportWidth);
      
      elements.push({
        id: item.id,
        text: item.text,
        fontSizePx: px,
        fontWeight: item.weight,
        align: config.alignment,
        xPercent: 50,
        yPercent,
        overflow
      });

      if (overflow) {
        warnings.push(`Text "${item.text}" may overflow screen boundaries.`);
      }
    });
  }

  return {
    viewportWidth,
    viewportHeight,
    elements,
    hasOverflow: warnings.length > 0,
    warnings
  };
}

function estimateTextOverflow(text: string, fontSizePx: number, maxPxWidth: number): boolean {
  // Approximate average character width ratio: ~0.6 for bold/medium UI font
  const charWidthPx = fontSizePx * 0.58;
  const estimatedTotalWidth = text.length * charWidthPx;
  return estimatedTotalWidth > (maxPxWidth - 10); // 10px padding allowance
}
