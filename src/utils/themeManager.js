/**
 * Theme & UI Customizer Architecture for Seynex Sales Manager
 * Provides 5 curated presets, native color pickers with automatic relative luminance
 * contrast calculations, corner radius / density sizing, and widget visibility controls.
 */

export const THEME_PRESETS = [
  {
    id: 'seynex-indigo',
    name: 'Seynex Indigo',
    mode: 'dark',
    accent: '#6366f1',
    bg: '#0d1117',
    surface: '#161a23',
    surface2: '#1f2430',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.12)',
    radius: '12px',
    cardPad: '20px'
  },
  {
    id: 'clean-daylight',
    name: 'Clean Daylight',
    mode: 'light',
    accent: '#4f46e5',
    bg: '#f1f5f9',
    surface: '#ffffff',
    surface2: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    radius: '12px',
    cardPad: '20px'
  },
  {
    id: 'emerald-ops',
    name: 'Emerald Ops',
    mode: 'dark',
    accent: '#10b981',
    bg: '#071510',
    surface: '#0d201a',
    surface2: '#142e26',
    text: '#f0fdf4',
    muted: '#6ee7b7',
    border: 'rgba(16, 185, 129, 0.22)',
    radius: '12px',
    cardPad: '20px'
  },
  {
    id: 'amber-executive',
    name: 'Amber Executive',
    mode: 'dark',
    accent: '#f59e0b',
    bg: '#140f09',
    surface: '#1e1710',
    surface2: '#2b2015',
    text: '#fef3c7',
    muted: '#fcd34d',
    border: 'rgba(245, 158, 11, 0.22)',
    radius: '12px',
    cardPad: '20px'
  },
  {
    id: 'cobalt-crisp',
    name: 'Cobalt Crisp Light',
    mode: 'light',
    accent: '#0284c7',
    bg: '#f0f5fa',
    surface: '#ffffff',
    surface2: '#e2ecf5',
    text: '#0b253a',
    muted: '#486581',
    border: '#cde0ee',
    radius: '12px',
    cardPad: '20px'
  }
];

export const DEFAULT_THEME_CUSTOMIZER = {
  presetId: 'seynex-indigo',
  mode: 'dark',
  accent: '#6366f1',
  bg: '#0d1117',
  surface: '#161a23',
  surface2: '#1f2430',
  text: '#f8fafc',
  muted: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.12)',
  radius: '12px',
  cardPad: '20px',
  widgetVisibility: {
    kpiCards: true,
    recentQuotes: true,
    biometricFleet: true,
    monthlyTarget: true,
    profitLoss: true
  }
};

/**
 * Standard ITU-R BT.709 relative luminance formula
 * Returns readable contrast foreground (#0a0f1d or #ffffff) with >= 4.5:1 ratio.
 */
export const computeAccentFg = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return y > 140 ? '#0a0f1d' : '#ffffff';
};

/**
 * Checks if a given hex color is perceived as dark
 */
export const isColorDark = (hex) => {
  if (!hex || typeof hex !== 'string') return true;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
};

/**
 * Applies custom CSS variables dynamically to the document root element
 */
export const applyThemeTokens = (config) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!config) {
    resetThemeTokens();
    return;
  }

  const mode = config.mode || (isColorDark(config.bg) ? 'dark' : 'light');
  root.setAttribute('data-theme', mode);
  root.dataset.theme = mode;

  const fg = config.accentFg || computeAccentFg(config.accent);

  if (config.accent) {
    root.style.setProperty('--accent', config.accent);
    root.style.setProperty('--accent-primary', config.accent);
    root.style.setProperty('--accent-secondary', config.accent);
    root.style.setProperty('--accent-fg', fg);
    root.style.setProperty('--accent-glow', `color-mix(in srgb, ${config.accent} 25%, transparent)`);
    root.style.setProperty('--btn-primary-bg', config.accent);
    root.style.setProperty('--btn-primary-color', fg);
    root.style.setProperty('--btn-primary-border', config.accent);
    root.style.setProperty('--btn-primary-shadow', `0 2px 10px color-mix(in srgb, ${config.accent} 40%, transparent)`);
  }
  if (config.bg) {
    root.style.setProperty('--bg', config.bg);
    root.style.setProperty('--bg-color', config.bg);
    root.style.setProperty('--bg-primary', config.bg);
  }
  if (config.surface) {
    root.style.setProperty('--surface', config.surface);
    root.style.setProperty('--bg-secondary', config.surface);
    root.style.setProperty('--panel-bg', config.surface);
    root.style.setProperty('--header-bg', config.surface);
    root.style.setProperty('--card-bg', config.surface);
  }
  const surface2 = config.surface2 || (isColorDark(config.surface || '#161a23') ? '#221b14' : '#f8fafc');
  root.style.setProperty('--surface-2', surface2);
  root.style.setProperty('--bg-tertiary', surface2);
  root.style.setProperty('--input-bg', surface2);

  if (config.text) {
    root.style.setProperty('--text', config.text);
    root.style.setProperty('--text-primary', config.text);
    root.style.setProperty('--btn-secondary-color', config.text);
  }
  if (config.muted) {
    root.style.setProperty('--muted', config.muted);
    root.style.setProperty('--text-secondary', config.muted);
    root.style.setProperty('--text-muted', config.muted);
  }
  if (config.border) {
    root.style.setProperty('--border', config.border);
    root.style.setProperty('--panel-border', config.border);
    root.style.setProperty('--subtle-border', config.border);
    root.style.setProperty('--input-border', config.border);
    root.style.setProperty('--btn-secondary-border', config.border);
  }

  const isDarkTheme = isColorDark(config.bg || '#000000');
  const subtleBg = isDarkTheme ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)';
  root.style.setProperty('--subtle-bg', subtleBg);

  if (isDarkTheme) {
    const textCol = config.text || '#f8fafc';
    const borderCol = config.border || 'rgba(255, 255, 255, 0.14)';
    root.style.setProperty('--btn-secondary-bg', `color-mix(in srgb, ${textCol} 10%, ${surface2})`);
    root.style.setProperty('--btn-secondary-border', `color-mix(in srgb, ${textCol} 24%, ${borderCol})`);
    root.style.setProperty('--btn-secondary-shadow', '0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)');
  } else {
    root.style.setProperty('--btn-secondary-bg', config.surface || '#ffffff');
    root.style.setProperty('--btn-secondary-border', config.border || '#cbd5e1');
    root.style.setProperty('--btn-secondary-shadow', '0 1px 3px rgba(15, 23, 42, 0.08)');
  }

  if (config.radius) {
    root.style.setProperty('--radius', config.radius);
    root.style.setProperty('--radius-sm', config.radius === '0px' ? '0px' : '6px');
    root.style.setProperty('--radius-md', config.radius);
    root.style.setProperty('--radius-lg', config.radius === '0px' ? '0px' : '16px');
    root.style.setProperty('--radius-xl', config.radius === '0px' ? '0px' : '22px');
  }
  if (config.cardPad) {
    root.style.setProperty('--card-pad', config.cardPad);
  }

  try {
    window.dispatchEvent(new CustomEvent('seynex_theme_changed', { detail: config }));
  } catch (e) {}
};

/**
 * Resets all custom inline root variable overrides
 */
export const resetThemeTokens = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const properties = [
    '--accent', '--accent-primary', '--accent-fg', '--btn-primary-bg', '--btn-primary-color', '--btn-primary-border',
    '--bg', '--bg-color', '--bg-primary', '--surface', '--bg-secondary', '--panel-bg', '--header-bg',
    '--surface-2', '--bg-tertiary', '--input-bg', '--text', '--text-primary', '--muted', '--text-secondary',
    '--text-muted', '--border', '--panel-border', '--subtle-border', '--input-border', '--radius', '--radius-md', '--card-pad'
  ];
  properties.forEach(p => root.style.removeProperty(p));
};

/**
 * Loads persisted custom theme configuration from localStorage
 */
export const loadThemeCustomizerConfig = () => {
  try {
    const raw = localStorage.getItem('seynex_theme_customizer');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_THEME_CUSTOMIZER,
          ...parsed,
          widgetVisibility: {
            ...DEFAULT_THEME_CUSTOMIZER.widgetVisibility,
            ...(parsed.widgetVisibility || {})
          }
        };
      }
    }
  } catch (e) {
    console.warn('[Theme Customizer] Failed to load configuration from localStorage:', e);
  }
  return DEFAULT_THEME_CUSTOMIZER;
};

/**
 * Persists custom theme configuration to localStorage
 */
export const saveThemeCustomizerConfig = (config) => {
  try {
    localStorage.setItem('seynex_theme_customizer', JSON.stringify(config));
  } catch (e) {
    console.warn('[Theme Customizer] Failed to save configuration to localStorage:', e);
  }
};
