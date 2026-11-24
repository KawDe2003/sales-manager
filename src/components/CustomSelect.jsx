import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect — premium portal-based dropdown rendered at <body> level,
 * with buttery-smooth mount/unmount and fluid micro-interactions.
 */
const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  style = {},
  triggerStyle = {},
  className = '',
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 200, openUpwards: false });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  /* ── Normalise options ──────────────────────────────────────────────────── */
  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label || opt.name || (opt.value !== undefined ? String(opt.value) : '')
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = formattedOptions.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption 
    ? selectedOption.label 
    : (value !== undefined && value !== null && value !== '' ? String(value) : placeholder);
  const hasValue = !!(selectedOption && selectedOption.value !== '' && selectedOption.value !== undefined && selectedOption.value !== null) || (value !== undefined && value !== null && value !== '');

  /* ── Compute portal position with auto-flip ────────────────────────────── */
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 260; // approximate max dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const computedWidth = Math.min(rect.width, window.innerWidth - 16);
    const maxLeft = window.innerWidth + window.scrollX - computedWidth - 8;
    const safeLeft = Math.max(8 + window.scrollX, Math.min(rect.left + window.scrollX, maxLeft));

    setDropPos({
      top: openUpwards ? (rect.top + window.scrollY - 6) : (rect.bottom + window.scrollY + 6),
      left: safeLeft,
      width: computedWidth,
      openUpwards
    });
  }, []);

  /* ── Open / close with smooth enter/exit transitions ────────────────────── */
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

  /* ── Close on outside click, scroll, resize or Escape ──────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e) => {
      const inTrigger  = triggerRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
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

  /* ── Select an option ───────────────────────────────────────────────────── */
  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange && onChange(optValue);
    setIsOpen(false);
  };

  /* ── Height and sizing lookup ───────────────────────────────────────────── */
  const customHeight = style.height || triggerStyle.height;
  const triggerHeight = customHeight || (size === 'sm' ? '36px' : '42px');
  const triggerPadding = size === 'sm' ? '6px 10px' : '8px 14px';
  const triggerFontSize = size === 'sm' ? '0.82rem' : '0.88rem';

  // Separate container-level styles from trigger-level styles
  const { height, ...containerStyle } = style;

  /* ── Portal dropdown with fluid transitions ─────────────────────────────── */
  const dropdown = mounted
    ? ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position:             'absolute',
            top:                  dropPos.top,
            left:                 dropPos.left,
            width:                dropPos.width,
            minWidth:             Math.max(dropPos.width, 140),
            maxWidth:             'calc(100vw - 16px)',
            zIndex:               2147483647,
            background:           'var(--surface)',
            backdropFilter:       'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border:               '1px solid var(--border)',
            borderRadius:         'var(--radius, 12px)',
            boxShadow:            '0 20px 50px -10px rgba(0,0,0,0.5), 0 0 0 1px var(--border)',
            maxHeight:            '270px',
            overflowY:            'auto',
            padding:              '6px',
            opacity:              visible ? 1 : 0,
            transform:            dropPos.openUpwards 
              ? (visible ? 'translateY(-100%) scale(1)' : 'translateY(calc(-100% + 8px)) scale(0.96)') 
              : (visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)'),
            transformOrigin:      dropPos.openUpwards ? 'bottom center' : 'top center',
            transition:           'opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents:        visible ? 'auto' : 'none',
            boxSizing:            'border-box'
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
                    borderRadius:   'var(--radius-sm, 8px)',
                    fontSize:       '0.84rem',
                    fontWeight:     isSel ? 700 : 500,
                    color:          isSel ? 'var(--accent)' : 'var(--text)',
                    background:     isSel ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                    cursor:         'pointer',
                    transition:     'background 0.14s ease, transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), color 0.14s ease',
                    marginBottom:   '2px',
                    userSelect:     'none',
                    whiteSpace:     'nowrap',
                    overflow:       'hidden',
                    textOverflow:   'ellipsis'
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)';
                      e.currentTarget.style.transform  = 'translateX(4px)';
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
                      size={14}
                      color="var(--accent)"
                      style={{
                        flexShrink: 0,
                        marginLeft: '8px',
                        animation: 'checkPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
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
        minWidth:   containerStyle.minWidth !== undefined ? containerStyle.minWidth : (containerStyle.width ? 'auto' : '120px'),
        userSelect: 'none',
        ...containerStyle
      }}
    >
      {/* Trigger button with transitions */}
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
          background:     'var(--surface-2, var(--surface))',
          border:         `1.5px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius:   'var(--radius, 10px)',
          color:          hasValue ? 'var(--text)' : 'var(--muted)',
          fontSize:       triggerFontSize,
          fontWeight:     600,
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? 0.6 : 1,
          boxShadow:      isOpen
            ? '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'
            : 'none',
          transition:     'border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing:      'border-box',
          width:          '100%',
          ...triggerStyle
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
          size={size === 'sm' ? 13 : 15}
          color="var(--accent)"
          style={{
            transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
