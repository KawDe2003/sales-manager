import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, RotateCcw, Palette, Check, Sliders, Eye, EyeOff, Sparkles, 
  Layout, Shield, Sun, Moon, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { 
  THEME_PRESETS, 
  DEFAULT_THEME_CUSTOMIZER, 
  applyThemeTokens, 
  resetThemeTokens, 
  loadThemeCustomizerConfig, 
  saveThemeCustomizerConfig,
  computeAccentFg,
  isColorDark
} from '../utils/themeManager';

export default function ThemeCustomizerDrawer({ isOpen, onClose }) {
  const { theme, toggleTheme, dashboardConfig = {}, updateDashboardConfig } = useContext(StoreContext) || {};
  const [config, setConfig] = useState(() => loadThemeCustomizerConfig());

  // Listen for ESC key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Preset Selection
  const handleSelectPreset = (preset) => {
    const updated = {
      ...config,
      presetId: preset.id,
      mode: preset.mode,
      accent: preset.accent,
      bg: preset.bg,
      surface: preset.surface,
      surface2: preset.surface2,
      text: preset.text,
      muted: preset.muted,
      border: preset.border,
      radius: preset.radius || config.radius,
      cardPad: preset.cardPad || config.cardPad
    };
    setConfig(updated);
    applyThemeTokens(updated);
    saveThemeCustomizerConfig(updated);
  };

  // Handle Individual Color Change
  const handleColorChange = (key, hex) => {
    const nextMode = (key === 'bg' || key === 'surface') ? (isColorDark(hex) ? 'dark' : 'light') : config.mode;
    const updated = {
      ...config,
      presetId: 'custom',
      mode: nextMode,
      [key]: hex
    };
    // Recompute border dynamically if background or surface changes
    if (key === 'bg' || key === 'surface') {
      updated.border = isColorDark(hex) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)';
    }
    setConfig(updated);
    applyThemeTokens(updated);
    saveThemeCustomizerConfig(updated);
  };

  // Handle Radius Change
  const handleRadiusChange = (radius) => {
    const updated = { ...config, radius };
    setConfig(updated);
    applyThemeTokens(updated);
    saveThemeCustomizerConfig(updated);
  };

  // Handle Card Padding Change
  const handlePaddingChange = (cardPad) => {
    const updated = { ...config, cardPad };
    setConfig(updated);
    applyThemeTokens(updated);
    saveThemeCustomizerConfig(updated);
  };

  // Handle Widget Visibility Toggle
  const handleToggleWidget = (widgetKey) => {
    const currentVal = config.widgetVisibility?.[widgetKey] !== false;
    const nextVal = !currentVal;
    const updatedWidgets = {
      ...(config.widgetVisibility || {}),
      [widgetKey]: nextVal
    };
    const updated = {
      ...config,
      widgetVisibility: updatedWidgets
    };
    setConfig(updated);
    saveThemeCustomizerConfig(updated);

    // Sync with dashboardConfig in StoreContext if available
    if (updateDashboardConfig) {
      if (widgetKey === 'kpiCards') {
        updateDashboardConfig({ showQuotationKpis: nextVal, showFinancialKpis: nextVal, showKpiCards: nextVal });
      } else if (widgetKey === 'recentQuotes') {
        updateDashboardConfig({ showRecentQuotes: nextVal });
      } else if (widgetKey === 'biometricFleet') {
        updateDashboardConfig({ showBiometricFleet: nextVal });
      } else if (widgetKey === 'monthlyTarget') {
        updateDashboardConfig({ showMonthlyTarget: nextVal });
      } else if (widgetKey === 'profitLoss') {
        updateDashboardConfig({ showProfitLoss: nextVal });
      }
    }
  };

  // Reset to Canonical Defaults
  const handleResetDefaults = () => {
    resetThemeTokens();
    const defaults = { ...DEFAULT_THEME_CUSTOMIZER };
    setConfig(defaults);
    applyThemeTokens(defaults);
    saveThemeCustomizerConfig(defaults);

    if (updateDashboardConfig) {
      updateDashboardConfig({
        showQuotationKpis: true,
        showFinancialKpis: true,
        showKpiCards: true,
        showRecentQuotes: true,
        showBiometricFleet: true,
        showMonthlyTarget: true,
        showProfitLoss: true
      });
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const currentAccentFg = computeAccentFg(config.accent);

  return createPortal(
    <div className="customizer-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="customizer-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          color: 'var(--text)'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Palette size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                Customize Colors &amp; Layout
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--muted)' }}>
                Real-time theme tokens &amp; workspace density
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: '34px', height: '34px', minWidth: '34px', padding: 0, borderRadius: '8px', cursor: 'pointer' }}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Controls Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: QUICK PRESETS */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: 'var(--accent)' }} /> 1-Click Curated Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '8px' }}>
              {THEME_PRESETS.map((p) => {
                const isSelected = config.presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isSelected ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface-2)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Color Preview Dots */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.accent, border: '1px solid rgba(0,0,0,0.2)' }} />
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.bg, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.surface, border: '1px solid rgba(255,255,255,0.2)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {p.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: LIVE CUSTOM COLOR PICKERS */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} style={{ color: 'var(--accent)' }} /> Live Custom Color Pickers
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              
              {/* Accent Picker */}
              <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Brand Accent
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={config.accent || '#6366f1'}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--muted)' }}>
                    {config.accent}
                  </span>
                </div>
              </div>

              {/* Background Picker */}
              <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Canvas Background
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={config.bg || '#0d1117'}
                    onChange={(e) => handleColorChange('bg', e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--muted)' }}>
                    {config.bg}
                  </span>
                </div>
              </div>

              {/* Card Surface Picker */}
              <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Card Surface
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={config.surface || '#161a23'}
                    onChange={(e) => handleColorChange('surface', e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--muted)' }}>
                    {config.surface}
                  </span>
                </div>
              </div>

              {/* Text Color Picker */}
              <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Text Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={config.text || '#f8fafc'}
                    onChange={(e) => handleColorChange('text', e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--muted)' }}>
                    {config.text}
                  </span>
                </div>
              </div>

            </div>

            {/* Contrast Auto-Calculation Badge */}
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem'
            }}>
              <span style={{ color: 'var(--muted)' }}>Button Foreground:</span>
              <span style={{
                background: config.accent,
                color: currentAccentFg,
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.72rem'
              }}>
                Auto ({currentAccentFg === '#ffffff' ? 'Light Text' : 'Dark Text'} ≥ 4.5:1)
              </span>
            </div>
          </div>

          {/* SECTION 3: STYLE & DENSITY CONTROLS */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} style={{ color: 'var(--accent)' }} /> Corner Radius &amp; Padding
            </div>
            
            {/* Radius Options */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Corner Curvature
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Rounded (12px)', val: '12px' },
                  { label: 'Subtle (6px)', val: '6px' },
                  { label: 'Sharp (0px)', val: '0px' }
                ].map(r => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => handleRadiusChange(r.val)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: r.val,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: config.radius === r.val ? 'var(--accent)' : 'var(--surface-2)',
                      color: config.radius === r.val ? 'var(--accent-fg)' : 'var(--text)',
                      border: `1px solid ${config.radius === r.val ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Padding Options */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Card Spacing / Density
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Comfortable (20px)', val: '20px' },
                  { label: 'Compact (14px)', val: '14px' }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handlePaddingChange(p.val)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: config.cardPad === p.val ? 'var(--accent)' : 'var(--surface-2)',
                      color: config.cardPad === p.val ? 'var(--accent-fg)' : 'var(--text)',
                      border: `1px solid ${config.cardPad === p.val ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {r => r.label ? r.label : p.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* SECTION 4: DASHBOARD WIDGET VISIBILITY TOGGLES */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layout size={14} style={{ color: 'var(--accent)' }} /> Dashboard Section Visibility
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'kpiCards', label: 'KPI Summary Cards', desc: 'Active customers, quotes pipeline, and revenue totals' },
                { key: 'recentQuotes', label: 'Recent Quotations', desc: 'Latest customer proposals, deal status, and net offer amounts' },
                { key: 'biometricFleet', label: 'Biometric Devices Summary', desc: 'Hardware terminal telemetry, fleet health, and IoT links' },
                { key: 'monthlyTarget', label: 'Monthly Sales Target', desc: 'Progress bar and pace towards revenue goals' },
                { key: 'profitLoss', label: 'Executive P&L Statement', desc: 'Gross margin, operating expense breakdown, and net profit' }
              ].map(w => {
                const isVisible = config.widgetVisibility?.[w.key] !== false;
                return (
                  <div
                    key={w.key}
                    onClick={() => handleToggleWidget(w.key)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                        {w.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {w.desc}
                      </div>
                    </div>
                    {/* Switch pill */}
                    <div style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '12px',
                      background: isVisible ? 'var(--accent)' : 'rgba(148, 163, 184, 0.25)',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '3px',
                        left: isVisible ? '19px' : '3px',
                        transition: 'left 0.2s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Drawer Actions Footer */}
        <div style={{
          padding: '16px 22px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: 'var(--surface)'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDefaults}
            style={{
              height: '38px',
              padding: '0 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 18px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={14} /> Apply &amp; Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
