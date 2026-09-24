import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect — portal-based dropdown that renders at <body> level,
 * so it is NEVER clipped by parent overflow:hidden / overflow:auto containers.
 *
 * onChange API: calls onChange(rawValue) — just the selected string / number,
 * NOT an event-like object.
 */
const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  style = {},
  className = '',
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 200 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  /* ── Normalise options ──────────────────────────────────────────────────── */
  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label || opt.name || String(opt.value)
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = formattedOptions.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const hasValue = !!selectedOption;

  /* ── Compute portal position from trigger rect ──────────────────────────── */
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropPos({
      top:   rect.bottom + window.scrollY + 5,
      left:  rect.left   + window.scrollX,
      width: rect.width
    });
  }, []);

  /* ── Open / close ───────────────────────────────────────────────────────── */
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) computePosition();
    setIsOpen(prev => !prev);
  };

  /* ── Close on outside click or scroll ──────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e) => {
      const inTrigger  = triggerRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      computePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, computePosition]);

  /* ── Select an option ───────────────────────────────────────────────────── */
  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange && onChange(optValue);
    setIsOpen(false);
  };

  /* ── Height lookup ──────────────────────────────────────────────────────── */
  const triggerHeight = size === 'sm' ? '36px' : '44px';
  const triggerPadding = size === 'sm' ? '6px 10px' : '10px 14px';
  const triggerFontSize = size === 'sm' ? '0.82rem' : '0.88rem';

  /* ── Portal dropdown ────────────────────────────────────────────────────── */
  const dropdown = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position:          'absolute',
            top:               dropPos.top,
            left:              dropPos.left,
            width:             dropPos.width,
            minWidth:          140,
            zIndex:            2147483647,          /* max int — always on top */
            background:        'var(--bg-secondary, #0f172a)',
            backdropFilter:    'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:            '1.5px solid var(--panel-border-highlight, rgba(99,102,241,.35))',
            borderRadius:      'var(--radius-md, 10px)',
            boxShadow:         '0 20px 50px -8px rgba(0,0,0,.75), 0 0 30px rgba(99,102,241,.12)',
            maxHeight:         '270px',
            overflowY:         'auto',
            padding:           '5px',
            animation:         'modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            boxSizing:         'border-box'
          }}
        >
          {formattedOptions.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No options
            </div>
          ) : (
            formattedOptions.map((opt, idx) => {
              const isSel = String(opt.value) === String(value);
              return (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(opt.value);
                  }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '8px 12px',
                    borderRadius:   'var(--radius-sm, 7px)',
                    fontSize:       '0.84rem',
                    fontWeight:     isSel ? 750 : 600,
                    color:          isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background:     isSel ? 'rgba(99,102,241,.14)' : 'transparent',
                    cursor:         'pointer',
                    transition:     'background 0.13s ease, transform 0.13s ease',
                    marginBottom:   '2px',
                    userSelect:     'none',
                    whiteSpace:     'nowrap',
                    overflow:       'hidden',
                    textOverflow:   'ellipsis'
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'var(--subtle-bg, rgba(255,255,255,.04))';
                      e.currentTarget.style.transform  = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform  = 'translateX(0)';
                    }
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {opt.label}
                  </span>
                  {isSel && (
                    <Check
                      size={13}
                      color="var(--accent-primary)"
                      style={{ flexShrink: 0, marginLeft: '8px' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )
    : null;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      ref={triggerRef}
      className={`custom-select-container ${className}`}
      style={{
        position:   'relative',
        minWidth:   '120px',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Trigger button */}
      <div
        onClick={handleToggle}
        className="custom-select-trigger"
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '8px',
          padding:        triggerPadding,
          height:         triggerHeight,
          background:     'var(--input-bg)',
          border:         `1.5px solid ${isOpen ? 'var(--accent-primary)' : 'var(--input-border)'}`,
          borderRadius:   'var(--radius-md, 10px)',
          color:          hasValue ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize:       triggerFontSize,
          fontWeight:     650,
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? 0.6 : 1,
          boxShadow:      isOpen
            ? '0 0 0 3.5px var(--accent-glow)'
            : '0 2px 8px rgba(0,0,0,.04)',
          transition:     'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing:      'border-box',
          width:          '100%'
        }}
      >
        <span style={{
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          flex:         1
        }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={15}
          color="var(--accent-primary)"
          style={{
            transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0
          }}
        />
      </div>

      {/* Portal dropdown — rendered at <body>, never clipped */}
      {dropdown}
    </div>
  );
};

export default CustomSelect;
