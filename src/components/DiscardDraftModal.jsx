import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * Confirmation dialog shown when the user clicks outside (or closes) a document
 * modal that has unsaved draft changes.
 */
const DiscardDraftModal = ({
  isOpen,
  title = 'Discard unsaved draft?',
  message = 'You have unsaved changes in this document. Are you sure you want to discard them?',
  onKeepEditing,
  onDiscard
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="app-modal-backdrop modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000001,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onKeepEditing) onKeepEditing();
      }}
    >
      <div
        className="glass-panel app-modal-dialog"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          borderRadius: '16px',
          background: 'var(--panel-bg, var(--surface))',
          border: '1px solid var(--panel-border, var(--border))',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={onKeepEditing}
          >
            Keep Editing
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'var(--danger, #ef4444)',
              color: '#ffffff',
              border: 'none'
            }}
            onClick={onDiscard}
          >
            Discard Draft
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DiscardDraftModal;
