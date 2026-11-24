import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * DatePicker — Premium portal-based datepicker rendered at <body> level.
 * Features:
 * - Never clipped by parent containers, tables, or modals (renders via ReactDOM.createPortal)
 * - Auto-flips upwards when near bottom of viewport
 * - Dynamic positioning on scroll & resize
 * - 100% theme token parity (--surface, --text, --muted, --border, --accent, --accent-fg)
 * - Micro-interactions matching CustomSelect
 * - Marked dates, quick presets, min/max guards, and inline clear button
 */
const DatePicker = ({
  value,
  onChange,
  placeholder = 'Select date...',
  style = {},
  triggerStyle = {},
  className = '',
  markedDates = [],
  quickPresets = true,
  size = 'md',
  disabled = false,
  minDate = null,
  maxDate = null,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popPos, setPopPos] = useState({ top: 0, left: 0, openUpwards: false });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Normalize marked dates into lookup Map: dateKey (YYYY-MM-DD) -> { color, label }
  const markedMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(markedDates)) return map;

    markedDates.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        const key = item.includes('T') ? item.split('T')[0] : item;
        map.set(key, { color: 'var(--accent)', label: 'Scheduled action' });
      } else if (typeof item === 'object' && item.date) {
        const key = item.date.includes('T') ? item.date.split('T')[0] : item.date;
        map.set(key, {
          color: item.color || 'var(--accent)',
          label: item.label || 'Marked date',
          type: item.type || 'info'
        });
      }
    });
    return map;
  }, [markedDates]);

  // Initial date parsing
  const parsedDate = value ? new Date(value) : null;
  const validDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const [viewDate, setViewDate] = useState(validDate);

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [value]);

  /* ── Compute portal position with auto-flip & viewport bounding ─────── */
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 308;
    const popoverHeight = 360;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let targetLeft = align === 'right' 
      ? (rect.right + window.scrollX - popoverWidth) 
      : (rect.left + window.scrollX);

    const minLeft = 8 + window.scrollX;
    const maxLeft = window.innerWidth + window.scrollX - popoverWidth - 8;
    const safeLeft = Math.max(minLeft, Math.min(targetLeft, maxLeft));

    setPopPos({
      top: openUpwards ? (rect.top + window.scrollY - 6) : (rect.bottom + window.scrollY + 6),
      left: safeLeft,
      openUpwards
    });
  }, [align]);

  /* ── Open / close with smooth enter/exit transitions ─────────────────── */
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) computePosition();
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    let timer;
    if (isOpen) {
      setMounted(true);
      timer = requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 160);
    }
    return () => {
      cancelAnimationFrame(timer);
      clearTimeout(timer);
    };
  }, [isOpen]);

  /* ── Close on outside click, escape, resize, or scroll ───────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inTrigger && !inPopover) {
        setIsOpen(false);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      computePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, computePosition]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const yr = selected.getFullYear();
    const mo = String(selected.getMonth() + 1).padStart(2, '0');
    const da = String(selected.getDate()).padStart(2, '0');
    const formatted = `${yr}-${mo}-${da}`;

    onChange && onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyPreset = (daysFromToday, e) => {
    if (e) e.stopPropagation();
    if (daysFromToday === null) {
      onChange && onChange('');
      setIsOpen(false);
      return;
    }
    const target = new Date(Date.now() + daysFromToday * 86400000);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const da = String(target.getDate()).padStart(2, '0');
    const formatted = `${yr}-${mo}-${da}`;
    onChange && onChange(formatted);
    setViewDate(target);
    setIsOpen(false);
  };

  // Calendar Day Calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const isSelectedDay = (day) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  };

  const isTodayDay = (day) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const getDayDateString = (day) => {
    const mo = String(month + 1).padStart(2, '0');
    const da = String(day).padStart(2, '0');
    return `${year}-${mo}-${da}`;
  };

  const isDayDisabled = (day) => {
    const dateStr = getDayDateString(day);
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  // Sizing and Styles matching CustomSelect
  const customHeight = style.height || triggerStyle.height;
  const triggerHeight = customHeight || (size === 'sm' ? '36px' : '42px');
  const triggerPadding = size === 'sm' ? '0 10px' : '0 12px';
  const triggerFontSize = size === 'sm' ? '0.82rem' : '0.88rem';

  const { height, ...containerStyle } = style;

  // Format display label safely
  let displayLabel = placeholder;
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      displayLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } else {
      displayLabel = String(value);
    }
  }

  /* ── Popover Portal Content ────────────────────────────────────────────── */
  const popoverContent = mounted
    ? ReactDOM.createPortal(
        <div
          ref={popoverRef}
          className="custom-calendar-popover"
          style={{
            position:             'absolute',
            top:                  popPos.top,
            left:                 popPos.left,
            width:                '308px',
            maxWidth:             'calc(100vw - 16px)',
            zIndex:               2147483647,
            background:           'var(--surface)',
            color:                'var(--text)',
            border:               '1px solid var(--border)',
            borderRadius:         'var(--radius, 14px)',
            boxShadow:            '0 25px 60px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border)',
            backdropFilter:       'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding:              '14px',
            boxSizing:            'border-box',
            opacity:              visible ? 1 : 0,
            transform:            popPos.openUpwards 
              ? (visible ? 'translateY(-100%) scale(1)' : 'translateY(calc(-100% + 8px)) scale(0.96)') 
              : (visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)'),
            transformOrigin:      popPos.openUpwards ? 'bottom center' : 'top center',
            transition:           'opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents:        visible ? 'auto' : 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER NAV: Month & Year + Prev / Next Chevrons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>
              {monthNames[month]} {year}
            </span>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'var(--surface-2, var(--surface))',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm, 7px)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
                title="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'var(--surface-2, var(--surface))',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm, 7px)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
                title="Next month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* DAY NAMES ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '8px' }}>
            {dayNames.map(d => (
              <span key={d} style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* DAYS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center' }}>
            {/* Empty slots for starting day offset */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ height: '32px' }} />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = getDayDateString(day);
              const selected = isSelectedDay(day);
              const today = isTodayDay(day);
              const disabledDay = isDayDisabled(day);
              const marker = markedMap.get(dateStr);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => !disabledDay && handleSelectDay(day)}
                  style={{
                    height: '32px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    border: selected
                      ? '1.5px solid var(--accent)'
                      : today
                      ? '1.5px solid var(--accent)'
                      : '1.5px solid transparent',
                    background: selected
                      ? 'var(--accent)'
                      : today
                      ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                      : 'transparent',
                    color: selected
                      ? 'var(--accent-fg, #ffffff)'
                      : today
                      ? 'var(--accent)'
                      : disabledDay
                      ? 'var(--muted)'
                      : 'var(--text)',
                    fontWeight: selected || today ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: disabledDay ? 'not-allowed' : 'pointer',
                    opacity: disabledDay ? 0.35 : 1,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: selected ? '0 3px 10px color-mix(in srgb, var(--accent) 35%, transparent)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 15%, transparent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = today ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent';
                    }
                  }}
                  title={marker ? `${marker.label} on ${dateStr}` : dateStr}
                >
                  <span style={{ lineHeight: 1 }}>{day}</span>

                  {/* MARKED DATE INDICATOR DOT */}
                  {marker && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: selected ? 'var(--accent-fg, #ffffff)' : (marker.color || 'var(--accent)'),
                        boxShadow: `0 0 5px ${marker.color || 'var(--accent)'}`
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* QUICK PRESETS ROW */}
          {quickPresets && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(0, e)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2, var(--surface))',
                    color: 'var(--accent)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(1, e)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2, var(--surface))',
                    color: 'var(--text)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(3, e)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2, var(--surface))',
                    color: 'var(--text)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  In 3d
                </button>
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(7, e)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2, var(--surface))',
                    color: 'var(--text)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  In 1w
                </button>
              </div>

              {value && (
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(null, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  /* ── Trigger Component ─────────────────────────────────────────────────── */
  return (
    <div
      ref={triggerRef}
      className={`custom-datepicker-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: containerStyle.minWidth !== undefined ? containerStyle.minWidth : (containerStyle.width ? 'auto' : '140px'),
        userSelect: 'none',
        ...containerStyle
      }}
    >
      <div
        onClick={handleToggle}
        className="custom-datepicker-trigger"
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '6px',
          padding:        triggerPadding,
          height:         triggerHeight,
          background:     'var(--surface-2, var(--surface))',
          border:         `1.5px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius:   'var(--radius, 10px)',
          color:          value ? 'var(--text)' : 'var(--muted)',
          fontSize:       triggerFontSize,
          fontWeight:     value ? 600 : 500,
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? 0.6 : 1,
          boxShadow:      isOpen
            ? '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'
            : 'none',
          transition:     'border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, color 0.2s ease',
          boxSizing:      'border-box',
          width:          '100%',
          ...triggerStyle
        }}
      >
        <span
          style={{
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            flex:         1
          }}
        >
          {displayLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange && onChange('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              title="Clear date"
            >
              <X size={13} />
            </button>
          )}

          <CalendarIcon
            size={size === 'sm' ? 14 : 15}
            color="var(--accent)"
            style={{
              flexShrink: 0,
              opacity: isOpen ? 1 : 0.85,
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Render Popover Portal at document.body */}
      {popoverContent}
    </div>
  );
};

export default DatePicker;
