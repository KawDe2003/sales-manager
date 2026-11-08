import React from 'react';
import { Building2 } from 'lucide-react';

/**
 * Single-entity business indicator for Seynex Enterprises.
 * Multi-business switching and secondary business profiles have been removed.
 */
export default function BusinessSwitcher() {
  return (
    <div 
      className="hidden-mobile"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '8px',
        background: 'rgba(79, 70, 229, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        color: 'var(--text-primary)',
        fontSize: '0.78rem',
        fontWeight: 700
      }}
      title="Seynex Enterprises Active Workspace"
    >
      <Building2 size={13} style={{ color: '#818cf8' }} />
      <span>Seynex Enterprises</span>
      <span style={{
        fontSize: '0.62rem',
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'rgba(79, 70, 229, 0.25)',
        color: '#c7d2fe'
      }}>
        Primary
      </span>
    </div>
  );
}
