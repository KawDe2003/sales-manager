import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Check } from 'lucide-react';

const DatePicker = ({
  value,
  onChange,
  placeholder = 'Select date...',
  style = {},
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
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  // Normalize marked dates into a lookup Map: dateKey (YYYY-MM-DD) -> { color, label }
  const markedMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(markedDates)) return map;

    markedDates.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        const key = item.includes('T') ? item.split('T')[0] : item;
        map.set(key, { color: 'var(--accent-amber, #f59e0b)', label: 'Scheduled action' });
      } else if (typeof item === 'object' && item.date) {
        const key = item.date.includes('T') ? item.date.split('T')[0] : item.date;
        map.set(key, {
          color: item.color || 'var(--accent-primary, #10b981)',
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

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

    onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyPreset = (daysFromToday, e) => {
    if (e) e.stopPropagation();
    if (daysFromToday === null) {
      onChange('');
      setIsOpen(false);
      return;
    }
    const target = new Date(Date.now() + daysFromToday * 86400000);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const da = String(target.getDate()).padStart(2, '0');
    const formatted = `${yr}-${mo}-${da}`;
    onChange(formatted);
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

  const heightBySize = size === 'sm' ? '34px' : size === 'lg' ? '46px' : '42px';
  const fontSizeBySize = size === 'sm' ? '0.8rem' : size === 'lg' ? '0.95rem' : '0.88rem';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...style
      }}
      className={className}
    >
      {/* TRIGGER INPUT */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className="form-input custom-datepicker-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          height: heightBySize,
          fontSize: fontSizeBySize,
          padding: '0 12px',
          background: 'var(--input-bg)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--input-border)',
          borderRadius: 'var(--radius-md, 10px)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow, rgba(16, 185, 129, 0.2))' : 'none',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          gap: '8px'
        }}
      >
        <span
          style={{
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: value ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : placeholder}
        </span>

        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear date"
            >
              <X size={14} />
            </button>
          )}
          <CalendarIcon
            size={16}
            style={{
              color: isOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
              transition: 'color 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* CALENDAR POPOVER (MATCHES THEME PERFECTLY) */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="custom-calendar-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 9999999, // Guarantees above all modals & backdrops
            width: '295px',
            maxWidth: 'calc(100vw - 24px)',
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--panel-bg, #0f172a)',
            backgroundColor: 'color-mix(in srgb, var(--bg-primary, #0d1218) 95%, var(--panel-bg, #111827))',
            border: '1px solid var(--panel-border-highlight, rgba(16, 185, 129, 0.35))',
            boxShadow: '0 20px 45px -8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            animation: 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER NAV */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--subtle-border)',
                  borderRadius: '7px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--subtle-border)',
                  borderRadius: '7px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* DAY NAMES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '8px' }}>
            {dayNames.map(d => (
              <span key={d} style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* DAYS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
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
              const marker = markedMap.get(dateStr);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '32px',
                    borderRadius: '8px',
                    border: selected
                      ? '1px solid var(--accent-primary)'
                      : today
                      ? '1px solid var(--accent-primary, #10b981)'
                      : '1px solid transparent',
                    background: selected
                      ? 'var(--accent-primary, #10b981)'
                      : today
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'transparent',
                    color: selected
                      ? '#ffffff'
                      : today
                      ? 'var(--accent-primary)'
                      : 'var(--text-primary)',
                    fontWeight: selected || today ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: selected ? '0 4px 12px var(--accent-glow, rgba(16, 185, 129, 0.35))' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'var(--subtle-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = today ? 'rgba(16, 185, 129, 0.12)' : 'transparent';
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
                        bottom: '3px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: selected ? '#ffffff' : marker.color,
                        boxShadow: `0 0 6px ${marker.color}`,
                        transition: 'all 0.15s ease'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* QUICK PRESETS (Today, Tomorrow, In 3d, In 1w, Clear) */}
          {quickPresets && (
            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--subtle-border)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => handleApplyPreset(0, e)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--subtle-border)',
                    background: 'var(--subtle-bg)',
                    color: 'var(--accent-primary)',
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
                    borderRadius: '6px',
                    border: '1px solid var(--subtle-border)',
                    background: 'var(--subtle-bg)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
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
                    borderRadius: '6px',
                    border: '1px solid var(--subtle-border)',
                    background: 'var(--subtle-bg)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
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
                    borderRadius: '6px',
                    border: '1px solid var(--subtle-border)',
                    background: 'var(--subtle-bg)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
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
                    color: 'var(--text-muted)',
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
        </div>
      )}
    </div>
  );
};

export default DatePicker;
