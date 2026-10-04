/**
 * LCD Display Themes
 * Each theme contains:
 *  - bgGradient: CSS background for the LCD canvas
 *  - patternSvg: inline SVG string for the decorative pattern overlay
 *  - iconsSvg: inline SVG string for decorative icons placed on the screen
 *  - defaultProductColor / defaultPriceColor / defaultPromoColor: suggested text colors
 */

export interface LcdTheme {
  id: string;
  label: string;
  /** CSS background property value */
  bgGradient: string;
  /** Opacity of pattern layer (0–1) */
  patternOpacity: number;
  /** Raw SVG markup for pattern overlay (full size, use preserveAspectRatio="xMidYMid slice") */
  patternSvg: string;
  /** Raw SVG markup for decorative icons (positioned absolutely, full-canvas SVG) */
  iconsSvg: string;
  /** Default text colors per element */
  defaultProductColor: string;
  defaultPriceColor: string;
  defaultPromoColor: string;
}

export const LCD_THEMES: LcdTheme[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Midnight Circuit
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'midnight_circuit',
    label: 'Midnight Circuit',
    bgGradient: 'linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)',
    patternOpacity: 0.25,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect width="60" height="60" fill="none"/>
      <path d="M10 0 L10 20 L30 20 L30 10 L50 10" stroke="#00d4ff" stroke-width="1" fill="none"/>
      <path d="M0 40 L20 40 L20 30 L40 30 L40 50 L60 50" stroke="#00d4ff" stroke-width="1" fill="none"/>
      <circle cx="10" cy="20" r="2" fill="#00d4ff"/>
      <circle cx="30" cy="10" r="2" fill="#00d4ff"/>
      <circle cx="40" cy="30" r="2" fill="#00d4ff"/>
      <circle cx="20" cy="40" r="2" fill="#00d4ff"/>
      <rect x="28" y="18" width="4" height="4" fill="none" stroke="#7c3aed" stroke-width="0.8"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Chip icon top-right -->
      <rect x="140" y="8" width="24" height="18" rx="3" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
      <line x1="140" y1="13" x2="136" y2="13" stroke="#00d4ff" stroke-width="1"/>
      <line x1="140" y1="17" x2="136" y2="17" stroke="#00d4ff" stroke-width="1"/>
      <line x1="140" y1="21" x2="136" y2="21" stroke="#00d4ff" stroke-width="1"/>
      <line x1="164" y1="13" x2="168" y2="13" stroke="#00d4ff" stroke-width="1"/>
      <line x1="164" y1="17" x2="168" y2="17" stroke="#00d4ff" stroke-width="1"/>
      <line x1="164" y1="21" x2="168" y2="21" stroke="#00d4ff" stroke-width="1"/>
      <text x="152" y="20" text-anchor="middle" font-size="6" fill="#00d4ff" font-family="monospace">IC</text>
      <!-- Corner dots -->
      <circle cx="6" cy="6" r="2" fill="#7c3aed" opacity="0.7"/>
      <circle cx="166" cy="314" r="2" fill="#7c3aed" opacity="0.7"/>
      <!-- Bottom signal line -->
      <path d="M10 310 L30 310 L35 305 L45 315 L55 310 L162 310" stroke="#00d4ff" stroke-width="0.8" fill="none" opacity="0.5"/>
    </svg>`,
    defaultProductColor: '#e0f2fe',
    defaultPriceColor: '#00d4ff',
    defaultPromoColor: '#a78bfa',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Golden Luxury
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'golden_luxury',
    label: 'Golden Luxury',
    bgGradient: 'linear-gradient(180deg, #0d0900 0%, #1a1100 40%, #2a1c00 100%)',
    patternOpacity: 0.18,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect width="40" height="40" fill="none"/>
      <polygon points="20,2 22,18 38,20 22,22 20,38 18,22 2,20 18,18" fill="#d4a017" opacity="0.6"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Crown icon top-center -->
      <path d="M72 18 L80 10 L86 16 L92 10 L100 18 L98 28 L74 28 Z" fill="none" stroke="#d4a017" stroke-width="1.5"/>
      <circle cx="80" cy="10" r="2" fill="#d4a017"/>
      <circle cx="92" cy="10" r="2" fill="#d4a017"/>
      <circle cx="86" cy="6" r="2.5" fill="#fbbf24"/>
      <!-- decorative line under crown -->
      <line x1="60" y1="32" x2="112" y2="32" stroke="#d4a017" stroke-width="0.8" opacity="0.6"/>
      <!-- Bottom ornament -->
      <path d="M60 300 Q86 292 112 300" stroke="#d4a017" stroke-width="1" fill="none" opacity="0.5"/>
      <circle cx="86" cy="305" r="3" fill="none" stroke="#d4a017" stroke-width="1" opacity="0.5"/>
      <!-- Corner diamonds -->
      <polygon points="6,6 10,10 6,14 2,10" fill="#d4a017" opacity="0.5"/>
      <polygon points="166,306 170,310 166,314 162,310" fill="#d4a017" opacity="0.5"/>
    </svg>`,
    defaultProductColor: '#fef3c7',
    defaultPriceColor: '#fbbf24',
    defaultPromoColor: '#d4a017',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Neon Tokyo
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'neon_tokyo',
    label: 'Neon Tokyo',
    bgGradient: 'linear-gradient(160deg, #050014 0%, #0a0020 50%, #000a14 100%)',
    patternOpacity: 0.2,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
      <rect width="30" height="30" fill="none"/>
      <line x1="0" y1="0" x2="30" y2="0" stroke="#ff00aa" stroke-width="0.5"/>
      <line x1="0" y1="10" x2="30" y2="10" stroke="#00ffee" stroke-width="0.5"/>
      <line x1="0" y1="20" x2="30" y2="20" stroke="#ff00aa" stroke-width="0.5"/>
      <line x1="0" y1="0" x2="0" y2="30" stroke="#00ffee" stroke-width="0.5"/>
      <line x1="10" y1="0" x2="10" y2="30" stroke="#ff00aa" stroke-width="0.5"/>
      <line x1="20" y1="0" x2="20" y2="30" stroke="#00ffee" stroke-width="0.5"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Lightning bolt bottom right -->
      <polygon points="148,280 156,295 150,295 158,315 142,298 150,298" fill="#ff00aa" opacity="0.8"/>
      <!-- Top left Japanese-style character box -->
      <rect x="4" y="4" width="22" height="22" fill="none" stroke="#00ffee" stroke-width="1"/>
      <text x="15" y="19" text-anchor="middle" font-size="11" fill="#00ffee" font-family="serif" opacity="0.8">東</text>
      <!-- Glowing dots scattered -->
      <circle cx="10" cy="180" r="1.5" fill="#ff00aa" opacity="0.7"/>
      <circle cx="162" cy="90" r="1.5" fill="#00ffee" opacity="0.7"/>
      <circle cx="155" cy="200" r="1" fill="#ff00aa" opacity="0.5"/>
      <circle cx="15" cy="250" r="1" fill="#00ffee" opacity="0.5"/>
      <!-- Bottom scanline accent -->
      <line x1="0" y1="308" x2="172" y2="308" stroke="#ff00aa" stroke-width="1" opacity="0.4"/>
      <line x1="0" y1="312" x2="172" y2="312" stroke="#00ffee" stroke-width="0.5" opacity="0.3"/>
    </svg>`,
    defaultProductColor: '#ffffff',
    defaultPriceColor: '#ff00aa',
    defaultPromoColor: '#00ffee',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Emerald Forest
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'emerald_forest',
    label: 'Emerald Forest',
    bgGradient: 'linear-gradient(180deg, #022c22 0%, #064e3b 50%, #065f46 100%)',
    patternOpacity: 0.15,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
      <rect width="50" height="50" fill="none"/>
      <path d="M25 5 Q35 20 25 28 Q15 20 25 5Z" fill="#34d399" opacity="0.5"/>
      <path d="M10 30 Q20 20 10 45 Q0 20 10 30Z" fill="#34d399" opacity="0.3"/>
      <path d="M40 35 Q50 25 40 48 Q30 25 40 35Z" fill="#34d399" opacity="0.3"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Leaf icon top-right -->
      <path d="M148 5 Q168 8 165 28 Q148 25 148 5Z" fill="#34d399" opacity="0.7"/>
      <path d="M148 5 L162 22" stroke="#065f46" stroke-width="1" fill="none"/>
      <!-- Small leaves top-left -->
      <path d="M8 12 Q18 8 16 22 Q6 18 8 12Z" fill="#6ee7b7" opacity="0.5"/>
      <!-- Branch bottom -->
      <path d="M10 305 Q86 290 162 305" stroke="#34d399" stroke-width="1" fill="none" opacity="0.4"/>
      <path d="M50 305 Q55 296 60 305" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M100 300 Q108 292 116 300" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.4"/>
      <!-- Firefly dots -->
      <circle cx="20" cy="150" r="1.5" fill="#a7f3d0" opacity="0.6"/>
      <circle cx="155" cy="200" r="1.5" fill="#a7f3d0" opacity="0.6"/>
      <circle cx="30" cy="270" r="1" fill="#a7f3d0" opacity="0.5"/>
    </svg>`,
    defaultProductColor: '#ecfdf5',
    defaultPriceColor: '#34d399',
    defaultPromoColor: '#6ee7b7',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Sakura Dream
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'sakura_dream',
    label: 'Sakura Dream',
    bgGradient: 'linear-gradient(180deg, #1a0010 0%, #3b0028 50%, #2d001e 100%)',
    patternOpacity: 0.2,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect width="60" height="60" fill="none"/>
      <circle cx="30" cy="30" r="12" fill="none" stroke="#f9a8d4" stroke-width="0.6" opacity="0.5"/>
      <circle cx="30" cy="30" r="6" fill="none" stroke="#f9a8d4" stroke-width="0.4" opacity="0.4"/>
      <circle cx="10" cy="10" r="6" fill="none" stroke="#fda4af" stroke-width="0.5" opacity="0.3"/>
      <circle cx="50" cy="50" r="6" fill="none" stroke="#fda4af" stroke-width="0.5" opacity="0.3"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Cherry blossom petals scattered -->
      <!-- Petal 1 -->
      <ellipse cx="20" cy="30" rx="5" ry="8" fill="#f9a8d4" opacity="0.5" transform="rotate(-20,20,30)"/>
      <!-- Petal 2 -->
      <ellipse cx="150" cy="50" rx="4" ry="7" fill="#fda4af" opacity="0.4" transform="rotate(30,150,50)"/>
      <!-- Petal 3 -->
      <ellipse cx="40" cy="280" rx="5" ry="8" fill="#f9a8d4" opacity="0.4" transform="rotate(15,40,280)"/>
      <!-- Petal 4 -->
      <ellipse cx="140" cy="260" rx="4" ry="6" fill="#fda4af" opacity="0.4" transform="rotate(-25,140,260)"/>
      <!-- Petal 5 -->
      <ellipse cx="10" cy="160" rx="3" ry="5" fill="#f9a8d4" opacity="0.3" transform="rotate(10,10,160)"/>
      <!-- Center flower top -->
      <circle cx="86" cy="16" r="4" fill="none" stroke="#f9a8d4" stroke-width="1" opacity="0.6"/>
      <circle cx="86" cy="16" r="1.5" fill="#fbbf24" opacity="0.6"/>
      <line x1="86" y1="10" x2="86" y2="22" stroke="#f9a8d4" stroke-width="0.5" opacity="0.4"/>
      <line x1="80" y1="16" x2="92" y2="16" stroke="#f9a8d4" stroke-width="0.5" opacity="0.4"/>
    </svg>`,
    defaultProductColor: '#fce7f3',
    defaultPriceColor: '#f472b6',
    defaultPromoColor: '#f9a8d4',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Arctic Frost
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'arctic_frost',
    label: 'Arctic Frost',
    bgGradient: 'linear-gradient(160deg, #e0f4ff 0%, #c8eafb 50%, #b0ddf5 100%)',
    patternOpacity: 0.2,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect width="60" height="60" fill="none"/>
      <!-- Snowflake -->
      <line x1="30" y1="10" x2="30" y2="50" stroke="#93c5fd" stroke-width="1"/>
      <line x1="10" y1="30" x2="50" y2="30" stroke="#93c5fd" stroke-width="1"/>
      <line x1="16" y1="16" x2="44" y2="44" stroke="#93c5fd" stroke-width="1"/>
      <line x1="44" y1="16" x2="16" y2="44" stroke="#93c5fd" stroke-width="1"/>
      <circle cx="30" cy="30" r="3" fill="#bfdbfe"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Snowflake corners -->
      <!-- Top-left -->
      <line x1="8" y1="4" x2="8" y2="20" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="0" y1="12" x2="16" y2="12" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="3" y1="7" x2="13" y2="17" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <line x1="13" y1="7" x2="3" y2="17" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <!-- Top-right -->
      <line x1="164" y1="4" x2="164" y2="20" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="156" y1="12" x2="172" y2="12" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="159" y1="7" x2="169" y2="17" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <line x1="169" y1="7" x2="159" y2="17" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <!-- Bottom-left -->
      <line x1="8" y1="300" x2="8" y2="318" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="0" y1="309" x2="16" y2="309" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="3" y1="304" x2="13" y2="314" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <line x1="13" y1="304" x2="3" y2="314" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <!-- Bottom-right -->
      <line x1="164" y1="300" x2="164" y2="318" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="156" y1="309" x2="172" y2="309" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
      <line x1="159" y1="304" x2="169" y2="314" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
      <line x1="169" y1="304" x2="159" y2="314" stroke="#3b82f6" stroke-width="0.8" opacity="0.5"/>
    </svg>`,
    defaultProductColor: '#1e3a5f',
    defaultPriceColor: '#1d4ed8',
    defaultPromoColor: '#2563eb',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Ocean Deep
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ocean_depth',
    label: 'Ocean Deep',
    bgGradient: 'linear-gradient(180deg, #000d1a 0%, #001a33 55%, #002244 100%)',
    patternOpacity: 0.18,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="30">
      <rect width="80" height="30" fill="none"/>
      <path d="M0 15 Q10 5 20 15 Q30 25 40 15 Q50 5 60 15 Q70 25 80 15" stroke="#38bdf8" stroke-width="1" fill="none"/>
      <path d="M0 25 Q10 15 20 25 Q30 35 40 25 Q50 15 60 25 Q70 35 80 25" stroke="#0ea5e9" stroke-width="0.6" fill="none" opacity="0.5"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Wave at bottom -->
      <path d="M0 295 Q20 285 40 295 Q60 305 80 295 Q100 285 120 295 Q140 305 160 295 L172 295 L172 320 L0 320Z" fill="#38bdf8" opacity="0.15"/>
      <path d="M0 305 Q22 296 44 305 Q66 314 88 305 Q110 296 132 305 Q154 314 172 305" stroke="#38bdf8" stroke-width="1.2" fill="none" opacity="0.6"/>
      <!-- Bubble dots rising -->
      <circle cx="25" cy="250" r="2.5" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.5"/>
      <circle cx="40" cy="200" r="1.5" fill="none" stroke="#38bdf8" stroke-width="0.6" opacity="0.4"/>
      <circle cx="145" cy="230" r="2" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.5"/>
      <circle cx="130" cy="175" r="1.5" fill="none" stroke="#38bdf8" stroke-width="0.6" opacity="0.4"/>
      <!-- Compass rose top-center -->
      <circle cx="86" cy="18" r="10" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.5"/>
      <line x1="86" y1="8" x2="86" y2="28" stroke="#38bdf8" stroke-width="0.8" opacity="0.5"/>
      <line x1="76" y1="18" x2="96" y2="18" stroke="#38bdf8" stroke-width="0.8" opacity="0.5"/>
      <text x="86" y="15" text-anchor="middle" font-size="5" fill="#38bdf8" opacity="0.6" font-family="sans-serif">N</text>
    </svg>`,
    defaultProductColor: '#e0f2fe',
    defaultPriceColor: '#38bdf8',
    defaultPromoColor: '#7dd3fc',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Crimson Royal
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'crimson_royal',
    label: 'Crimson Royal',
    bgGradient: 'linear-gradient(160deg, #0d0000 0%, #1a0000 50%, #2d0000 100%)',
    patternOpacity: 0.15,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect width="40" height="40" fill="none"/>
      <!-- Diamond crosshatch -->
      <line x1="0" y1="20" x2="20" y2="0" stroke="#ef4444" stroke-width="0.6"/>
      <line x1="20" y1="0" x2="40" y2="20" stroke="#ef4444" stroke-width="0.6"/>
      <line x1="40" y1="20" x2="20" y2="40" stroke="#ef4444" stroke-width="0.6"/>
      <line x1="20" y1="40" x2="0" y2="20" stroke="#ef4444" stroke-width="0.6"/>
      <rect x="18" y="18" width="4" height="4" fill="#ef4444" opacity="0.4"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Star top-center -->
      <polygon points="86,6 89,14 98,14 91,19 94,27 86,22 78,27 81,19 74,14 83,14" fill="#ef4444" opacity="0.8"/>
      <!-- Star accent small -->
      <polygon points="20,20 21.5,25 27,25 22.5,28 24,33 20,30 16,33 17.5,28 13,25 18.5,25" fill="#fca5a5" opacity="0.5"/>
      <polygon points="152,25 153,28.5 157,28.5 154,31 155,34.5 152,32.5 149,34.5 150,31 147,28.5 151,28.5" fill="#fca5a5" opacity="0.5"/>
      <!-- Decorative banner bottom -->
      <path d="M20 306 L86 298 L152 306" stroke="#ef4444" stroke-width="1" fill="none" opacity="0.5"/>
      <line x1="20" y1="306" x2="20" y2="315" stroke="#ef4444" stroke-width="0.8" opacity="0.4"/>
      <line x1="152" y1="306" x2="152" y2="315" stroke="#ef4444" stroke-width="0.8" opacity="0.4"/>
    </svg>`,
    defaultProductColor: '#fee2e2',
    defaultPriceColor: '#ef4444',
    defaultPromoColor: '#fca5a5',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Cosmic Galaxy
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'cosmic_galaxy',
    label: 'Cosmic Galaxy',
    bgGradient: 'radial-gradient(ellipse at 40% 30%, #1a003d 0%, #0a0020 50%, #000010 100%)',
    patternOpacity: 0.3,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="none"/>
      <!-- Stars -->
      <circle cx="10" cy="15" r="1" fill="white"/>
      <circle cx="25" cy="5" r="0.8" fill="white"/>
      <circle cx="45" cy="20" r="1.2" fill="white"/>
      <circle cx="70" cy="8" r="0.6" fill="white"/>
      <circle cx="85" cy="25" r="1" fill="white"/>
      <circle cx="5" cy="50" r="0.8" fill="white"/>
      <circle cx="55" cy="60" r="1" fill="white"/>
      <circle cx="80" cy="70" r="0.7" fill="white"/>
      <circle cx="30" cy="80" r="1.2" fill="white"/>
      <circle cx="90" cy="90" r="0.8" fill="white"/>
      <circle cx="15" cy="95" r="0.6" fill="#c084fc"/>
      <circle cx="60" cy="40" r="0.8" fill="#c084fc"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Planet bottom-right -->
      <circle cx="148" cy="285" r="18" fill="none" stroke="#c084fc" stroke-width="1.2" opacity="0.6"/>
      <ellipse cx="148" cy="285" rx="26" ry="5" fill="none" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <circle cx="148" cy="285" r="8" fill="#1a003d" stroke="#c084fc" stroke-width="0.8" opacity="0.7"/>
      <!-- Shooting star -->
      <line x1="10" y1="50" x2="40" y2="20" stroke="white" stroke-width="1" opacity="0.6"/>
      <circle cx="10" cy="50" r="1.5" fill="white" opacity="0.7"/>
      <!-- Constellation -->
      <circle cx="20" cy="120" r="1.5" fill="#c084fc" opacity="0.7"/>
      <circle cx="35" cy="108" r="1.5" fill="#c084fc" opacity="0.7"/>
      <circle cx="28" cy="130" r="1.5" fill="#c084fc" opacity="0.7"/>
      <line x1="20" y1="120" x2="35" y2="108" stroke="#c084fc" stroke-width="0.5" opacity="0.4"/>
      <line x1="35" y1="108" x2="28" y2="130" stroke="#c084fc" stroke-width="0.5" opacity="0.4"/>
    </svg>`,
    defaultProductColor: '#f3e8ff',
    defaultPriceColor: '#c084fc',
    defaultPromoColor: '#a855f7',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Retro Amber
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'retro_amber',
    label: 'Retro Amber',
    bgGradient: 'linear-gradient(180deg, #0d0700 0%, #1a0e00 50%, #261500 100%)',
    patternOpacity: 0.2,
    patternSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="8">
      <rect width="4" height="8" fill="none"/>
      <!-- Scanlines -->
      <line x1="0" y1="0" x2="4" y2="0" stroke="#f59e0b" stroke-width="0.5"/>
      <line x1="0" y1="4" x2="4" y2="4" stroke="#f59e0b" stroke-width="0.3" opacity="0.5"/>
    </svg>`,
    iconsSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 172 320">
      <!-- Terminal prompt top-left -->
      <rect x="4" y="4" width="50" height="20" rx="2" fill="none" stroke="#f59e0b" stroke-width="0.8" opacity="0.5"/>
      <text x="10" y="17" font-size="9" fill="#f59e0b" font-family="monospace" opacity="0.8">&gt;_</text>
      <!-- Dot-matrix grid bottom area -->
      <circle cx="20" cy="300" r="1" fill="#f59e0b" opacity="0.4"/>
      <circle cx="30" cy="300" r="1" fill="#f59e0b" opacity="0.4"/>
      <circle cx="40" cy="300" r="1" fill="#f59e0b" opacity="0.4"/>
      <circle cx="50" cy="300" r="1" fill="#f59e0b" opacity="0.4"/>
      <circle cx="60" cy="300" r="1" fill="#f59e0b" opacity="0.4"/>
      <circle cx="25" cy="310" r="1" fill="#f59e0b" opacity="0.3"/>
      <circle cx="35" cy="310" r="1" fill="#f59e0b" opacity="0.3"/>
      <circle cx="45" cy="310" r="1" fill="#f59e0b" opacity="0.3"/>
      <!-- CRT corner glow -->
      <circle cx="0" cy="0" r="20" fill="#f59e0b" opacity="0.04"/>
      <circle cx="172" cy="0" r="20" fill="#f59e0b" opacity="0.04"/>
      <circle cx="0" cy="320" r="20" fill="#f59e0b" opacity="0.04"/>
      <circle cx="172" cy="320" r="20" fill="#f59e0b" opacity="0.04"/>
      <!-- Horizontal rule -->
      <line x1="4" y1="28" x2="168" y2="28" stroke="#f59e0b" stroke-width="0.6" opacity="0.3"/>
    </svg>`,
    defaultProductColor: '#fef3c7',
    defaultPriceColor: '#f59e0b',
    defaultPromoColor: '#fbbf24',
  },
];

/** Returns a theme by ID, falling back to the first theme */
export function getThemeById(id?: string | null): LcdTheme {
  if (!id) return LCD_THEMES[0];
  return LCD_THEMES.find((t) => t.id === id) ?? LCD_THEMES[0];
}
