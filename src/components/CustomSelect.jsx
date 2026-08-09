import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  const containerRef = useRef(null);

  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value !== undefined ? opt.value : opt.id, label: opt.label || opt.name || opt.value };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = formattedOptions.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange && onChange({ target: { value: optValue } });
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`custom-select-container ${className}`}
      style={{ position: 'relative', minWidth: '150px', userSelect: 'none', ...style }}
    >
      {/* TRIGGER BUTTON */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '8px',
          padding: size === 'sm' ? '6px 12px' : '10px 16px',
          height: size === 'sm' ? '36px' : '44px',
          background: 'var(--input-bg)',
          border: `1px solid ${isOpen ? 'var(--accent-primary)' : 'var(--input-border)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: size === 'sm' ? '0.82rem' : '0.88rem',
          fontWeight: 650,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 3.5px var(--accent-glow)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
        className="custom-select-trigger"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <ChevronDown 
          size={16} 
          color="var(--accent-primary)" 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0 
          }} 
        />
      </div>

      {/* FLOATING ANIMATED MENU DROPDOWN */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--panel-border-highlight)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 18px 45px -10px rgba(0, 0, 0, 0.65), 0 0 25px rgba(99, 102, 241, 0.15)',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {formattedOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <div
                key={idx}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.84rem',
                  fontWeight: isSelected ? 750 : 600,
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--subtle-bg)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} color="var(--accent-primary)" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
