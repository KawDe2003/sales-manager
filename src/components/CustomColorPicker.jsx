import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Pipette, Check, Copy, RotateCcw, Palette, Sparkles, 
  ChevronDown, X, ExternalLink, RefreshCw 
} from 'lucide-react';

// --- Color Conversion Helpers ---
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 59, g: 130, b: 246 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return { r: 59, g: 130, b: 246 };
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 59, g: 130, b: 246 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (val) => Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
  const toHex = (c) => clamp(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

export function hsvToRgb(h, s, v) {
  let r, g, b;
  const i = Math.floor((h / 60) % 6);
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function getContrastYIQ(hexcolor) {
  const { r, g, b } = hexToRgb(hexcolor);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

// Curated Design System Color Presets
export const CURATED_PALETTES = [
  {
    name: 'Primary Brand Accents',
    colors: [
      { hex: '#0d9488', name: 'Royal Teal' },
      { hex: '#059669', name: 'Emerald' },
      { hex: '#10b981', name: 'Mint Green' },
      { hex: '#4f46e5', name: 'Enterprise Indigo' },
      { hex: '#6366f1', name: 'Electric Iris' },
      { hex: '#2563eb', name: 'Ocean Blue' },
      { hex: '#0284c7', name: 'Sky Blue' },
      { hex: '#0891b2', name: 'Vibrant Cyan' }
    ]
  },
  {
    name: 'Commercial & Warm Accents',
    colors: [
      { hex: '#7c3aed', name: 'Royal Purple' },
      { hex: '#9333ea', name: 'Deep Violet' },
      { hex: '#ec4899', name: 'Rose Pink' },
      { hex: '#f43f5e', name: 'Ruby Crimson' },
      { hex: '#e11d48', name: 'Scarlet Red' },
      { hex: '#ea580c', name: 'Sunset Tangerine' },
      { hex: '#d97706', name: 'Imperial Amber' },
      { hex: '#eab308', name: 'Gold' }
    ]
  },
  {
    name: 'Executive & Neutral Tones',
    colors: [
      { hex: '#0f172a', name: 'Obsidian Midnight' },
      { hex: '#1e293b', name: 'Slate Dark' },
      { hex: '#334155', name: 'Slate Medium' },
      { hex: '#475569', name: 'Slate Cool' },
      { hex: '#64748b', name: 'Steel Grey' },
      { hex: '#94a3b8', name: 'Silver' },
      { hex: '#cbd5e1', name: 'Platinum' },
      { hex: '#ffffff', name: 'Pure White' }
    ]
  }
];

export default function CustomColorPicker({
  value = '#3b82f6',
  onChange,
  label = 'Theme Color',
  showInput = true,
  disabled = false,
  presetOnly = false,
  align = 'left' // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(value);
    return rgbToHsv(r, g, b);
  });

  const containerRef = useRef(null);
  const spectrumRef = useRef(null);
  const hueSliderRef = useRef(null);
  const nativeColorInputRef = useRef(null);
  const isDraggingSpectrum = useRef(false);
  const isDraggingHue = useRef(false);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value && value !== hexInput) {
      setHexInput(value);
      const { r, g, b } = hexToRgb(value);
      setHsv(rgbToHsv(r, g, b));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Handle color change dispatch
  const emitColorChange = useCallback((newHex) => {
    const clean = newHex.startsWith('#') ? newHex : `#${newHex}`;
    setHexInput(clean);
    if (onChange) onChange(clean);
  }, [onChange]);

  // Spectrum 2D Drag / Click
  const updateSpectrumPosition = useCallback((e) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = x / rect.width;
    const v = 1 - (y / rect.height);

    setHsv(prev => {
      const next = { ...prev, s, v };
      const { r, g, b } = hsvToRgb(next.h, s, v);
      emitColorChange(rgbToHex(r, g, b));
      return next;
    });
  }, [emitColorChange]);

  // Hue Slider Drag / Click
  const updateHuePosition = useCallback((e) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const h = (x / rect.width) * 360;

    setHsv(prev => {
      const next = { ...prev, h };
      const { r, g, b } = hsvToRgb(h, prev.s, prev.v);
      emitColorChange(rgbToHex(r, g, b));
      return next;
    });
  }, [emitColorChange]);

  // Global mousemove/mouseup listener for dragging spectrum & hue
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingSpectrum.current) {
        updateSpectrumPosition(e);
      } else if (isDraggingHue.current) {
        updateHuePosition(e);
      }
    };

    const handleMouseUp = () => {
      isDraggingSpectrum.current = false;
      isDraggingHue.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [updateSpectrumPosition, updateHuePosition]);

  // Hex Input Change Handler
  const handleHexInputChange = (e) => {
    const raw = e.target.value;
    setHexInput(raw);
    const clean = raw.trim();
    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      const formatted = clean.startsWith('#') ? clean : `#${clean}`;
      const { r, g, b } = hexToRgb(formatted);
      setHsv(rgbToHsv(r, g, b));
      if (onChange) onChange(formatted);
    }
  };

  // RGB Input Handler
  const currentRgb = hexToRgb(value || '#3b82f6');
  const handleRgbChange = (channel, val) => {
    const num = Math.max(0, Math.min(255, Number(val) || 0));
    const nextRgb = { ...currentRgb, [channel]: num };
    const newHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setHexInput(newHex);
    setHsv(rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b));
    if (onChange) onChange(newHex);
  };

  // Copy Hex
  const handleCopyHex = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // Screen Eyedropper API (Native Chrome/Chromium API)
  const handleEyedropper = async () => {
    if (window.EyeDropper) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          emitColorChange(result.sRGBHex.toLowerCase());
          const { r, g, b } = hexToRgb(result.sRGBHex);
          setHsv(rgbToHsv(r, g, b));
        }
      } catch (err) {
        // User canceled eyedropper
      }
    } else if (nativeColorInputRef.current) {
      nativeColorInputRef.current.click();
    }
  };

  const contrastText = getContrastYIQ(value);
  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`;

  return (
    <div 
      className="custom-color-picker-wrapper" 
      ref={containerRef} 
      style={{ position: 'relative', display: 'inline-block', width: showInput ? '100%' : 'auto' }}
    >
      {/* Hidden Native Input as ultimate fallback */}
      <input 
        ref={nativeColorInputRef}
        type="color" 
        value={value.startsWith('#') && value.length === 7 ? value : '#3b82f6'}
        onChange={(e) => {
          emitColorChange(e.target.value);
          const { r, g, b } = hexToRgb(e.target.value);
          setHsv(rgbToHsv(r, g, b));
        }}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />

      {/* Main Trigger Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        {/* Color Chip Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className="color-picker-trigger-btn"
          style={{
            height: '42px',
            minWidth: '56px',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: isOpen 
              ? `1.5px solid ${value || 'var(--accent-primary)'}` 
              : '1px solid var(--panel-border)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isOpen 
              ? `0 0 16px ${value}44, 0 4px 12px rgba(0,0,0,0.25)` 
              : '0 2px 6px rgba(0, 0, 0, 0.12)'
          }}
          title={`Click to open styled color palette (${value})`}
        >
          {/* Glowing Inner Swatch */}
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: value || '#3b82f6',
              boxShadow: `0 2px 8px ${value}55, inset 0 0 0 1px rgba(255, 255, 255, 0.25)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease'
            }}
          >
            <Palette size={14} style={{ color: contrastText, opacity: 0.85 }} />
          </div>

          <ChevronDown 
            size={14} 
            style={{ 
              color: 'var(--text-muted)', 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s',
              marginRight: '2px'
            }} 
          />
        </button>

        {/* Synchronized Hex / Monospace Text Field */}
        {showInput && (
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: value,
              pointerEvents: 'none'
            }}>
              #
            </span>
            <input
              type="text"
              className="form-input"
              value={hexInput.replace('#', '')}
              onChange={handleHexInputChange}
              onFocus={() => setIsOpen(true)}
              placeholder="0d9488"
              maxLength={7}
              style={{
                width: '100%',
                height: '42px',
                paddingLeft: '28px',
                paddingRight: '75px',
                fontFamily: 'monospace',
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            />
            {/* Quick Copy / Eyedropper Mini Actions */}
            <div style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={handleCopyHex}
                className="btn btn-secondary"
                style={{
                  height: '30px',
                  width: '30px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)'
                }}
                title={copied ? 'Copied Hex!' : 'Copy Hex Code'}
              >
                {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
              </button>

              <button
                type="button"
                onClick={handleEyedropper}
                className="btn btn-secondary"
                style={{
                  height: '30px',
                  width: '30px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)'
                }}
                title="Sample color from screen (Eyedropper)"
              >
                <Pipette size={13} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styled Glassmorphic Popover Modal / Dropdown */}
      {isOpen && (
        <div
          className="custom-color-picker-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: '320px',
            maxWidth: '92vw',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--panel-border)',
            borderRadius: '16px',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0,0,0,0.2)',
            padding: '16px',
            zIndex: 9999,
            animation: 'dialogSpring 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Popover Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            marginBottom: '12px',
            borderBottom: '1px solid var(--subtle-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: value,
                boxShadow: `0 0 10px ${value}66`
              }} />
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px' }}>
                  {value.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close picker"
            >
              <X size={16} />
            </button>
          </div>

          {/* Interactive 2D Color Spectrum Box */}
          <div
            ref={spectrumRef}
            onMouseDown={(e) => {
              isDraggingSpectrum.current = true;
              updateSpectrumPosition(e);
            }}
            onTouchStart={(e) => {
              isDraggingSpectrum.current = true;
              updateSpectrumPosition(e);
            }}
            style={{
              position: 'relative',
              width: '100%',
              height: '140px',
              borderRadius: '10px',
              cursor: 'crosshair',
              overflow: 'hidden',
              backgroundColor: pureHueColor,
              backgroundImage: `
                linear-gradient(to right, #ffffff 0%, rgba(255, 255, 255, 0) 100%),
                linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0) 100%)
              `,
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
              marginBottom: '14px'
            }}
          >
            {/* Target Reticle Cursor */}
            <div
              style={{
                position: 'absolute',
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: '0 0 4px rgba(0, 0, 0, 0.8), inset 0 0 2px rgba(0,0,0,0.5)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                backgroundColor: value
              }}
            />
          </div>

          {/* Hue Rainbow Slider */}
          <div style={{ marginBottom: '16px' }}>
            <div
              ref={hueSliderRef}
              onMouseDown={(e) => {
                isDraggingHue.current = true;
                updateHuePosition(e);
              }}
              onTouchStart={(e) => {
                isDraggingHue.current = true;
                updateHuePosition(e);
              }}
              style={{
                position: 'relative',
                width: '100%',
                height: '14px',
                borderRadius: '7px',
                cursor: 'pointer',
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Hue Thumb Indicator */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(hsv.h / 360) * 100}%`,
                  top: '50%',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  backgroundColor: pureHueColor
                }}
              />
            </div>
          </div>

          {/* RGB Numeric Breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {['r', 'g', 'b'].map((channel) => (
              <div key={channel} style={{ textAlign: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="255"
                  className="form-input"
                  value={currentRgb[channel]}
                  onChange={(e) => handleRgbChange(channel, e.target.value)}
                  style={{
                    height: '32px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px'
                  }}
                />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px', display: 'block' }}>
                  {channel}
                </span>
              </div>
            ))}
          </div>

          {/* Curated Brand Swatches */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Corporate Presets</span>
              <button
                type="button"
                onClick={() => emitColorChange('#0d9488')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Reset Default
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CURATED_PALETTES.map((palette) => (
                <div key={palette.name}>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {palette.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                    {palette.colors.map((c) => {
                      const isSelected = value.toLowerCase() === c.hex.toLowerCase();
                      const textColor = getContrastYIQ(c.hex);

                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            emitColorChange(c.hex);
                            const { r, g, b } = hexToRgb(c.hex);
                            setHsv(rgbToHsv(r, g, b));
                          }}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            borderRadius: '7px',
                            background: c.hex,
                            border: isSelected 
                              ? `2px solid ${textColor}` 
                              : '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: isSelected 
                              ? `0 0 10px ${c.hex}88` 
                              : '0 1px 3px rgba(0, 0, 0, 0.2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.15)';
                            e.currentTarget.style.zIndex = '5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.zIndex = '1';
                          }}
                          title={`${c.name} (${c.hex})`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} style={{ color: textColor }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Document Preview Strip */}
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--subtle-border)',
            fontSize: '0.74rem'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
              Live Document Preview
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{
                fontWeight: 900,
                fontSize: '0.9rem',
                color: value,
                letterSpacing: '-0.01em'
              }}>
                ROYAL HAIR PINS
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                background: `${value}22`,
                color: value,
                border: `1px solid ${value}44`
              }}>
                INV-1005
              </span>
              <button
                type="button"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: value,
                  color: contrastText,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'default'
                }}
              >
                Sample Action
              </button>
            </div>
          </div>

          {/* System Picker Eyedropper / Fallback trigger */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem'
          }}>
            <button
              type="button"
              onClick={handleEyedropper}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: 0,
                fontWeight: 600
              }}
            >
              <Pipette size={13} />
              <span>Sample from screen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (nativeColorInputRef.current) {
                  nativeColorInputRef.current.click();
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                fontSize: '0.7rem'
              }}
              title="Open OS default color dialog"
            >
              <span>System Picker</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
