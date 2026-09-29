import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, CheckCircle2 } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, confirmText = 'Delete', cancelText = 'Cancel', variant = 'danger', onConfirm, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 6, 23, 0.82)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: '16px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="modal-card" style={{
        maxWidth: '440px', width: '100%', padding: '24px 20px', borderRadius: '18px',
        border: isDanger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
        boxShadow: isDanger ? '0 25px 50px -12px rgba(239, 68, 68, 0.3)' : '0 25px 50px -12px rgba(99, 102, 241, 0.3)',
        position: 'relative'
      }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)',
            color: 'var(--text-muted)', cursor: 'pointer', padding: '6px',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {isDanger ? (
              <Trash2 size={24} color="var(--danger)" />
            ) : variant === 'warning' ? (
              <AlertTriangle size={24} color="var(--warning)" />
            ) : (
              <CheckCircle2 size={24} color="var(--accent-primary)" />
            )}
          </div>
          <div style={{ paddingRight: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.25 }}>
              {title}
            </h3>
          </div>
        </div>

        <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </p>

        <div className="flex gap-2.5" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ minHeight: '42px', padding: '10px 18px', fontSize: '0.88rem', fontWeight: 600, flex: '1 1 auto', justifyContent: 'center' }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{ 
              minHeight: '42px', padding: '10px 20px', fontSize: '0.88rem', fontWeight: 700,
              color: '#ffffff',
              background: isDanger ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
              boxShadow: isDanger ? '0 4px 14px rgba(239, 68, 68, 0.4)' : undefined,
              border: isDanger ? '1px solid rgba(255,255,255,0.15)' : undefined,
              flex: '1 1 auto',
              justifyContent: 'center'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
