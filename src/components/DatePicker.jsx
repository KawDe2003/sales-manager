import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DatePicker = ({ value, onChange, placeholder = 'Select date...', style = {}, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    // Format YYYY-MM-DD
    const yr = selected.getFullYear();
    const mo = String(selected.getMonth() + 1).padStart(2, '0');
    const da = String(selected.getDate()).padStart(2, '0');
    const formatted = `${yr}-${mo}-${da}`;

    onChange(formatted);
    setIsOpen(false);
  };

  const handleSetToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const yr = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, '0');
    const da = String(today.getDate()).padStart(2, '0');
    onChange(`${yr}-${mo}-${da}`);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
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

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }} className={className}>
      {/* TRIGGER BUTTON */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          paddingRight: '12px'
        }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 600 : 400 }}>
          {value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : placeholder}
        </span>
        <CalendarIcon size={16} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
      </div>

      {/* MATCHING CUSTOM CALENDAR POPOVER */}
      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: '280px',
            padding: '16px',
            boxShadow: '0 15px 35px -5px rgba(0,0,0,0.6)',
            border: '1px solid var(--panel-border-highlight)',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(20px)',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* HEADER NAV */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)',
                  borderRadius: '6px', width: '28px', height: '28px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)',
                  borderRadius: '6px', width: '28px', height: '28px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* DAY NAMES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
            {dayNames.map(d => (
              <span key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* DAYS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {/* Empty slots for starting day offset */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDay(day);
              const today = isTodayDay(day);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '30px',
                    borderRadius: '8px',
                    border: today ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: selected ? 'var(--accent-primary)' : 'transparent',
                    color: selected ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: selected || today ? 800 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="hover:bg-[var(--subtle-bg)]"
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--subtle-border)' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
