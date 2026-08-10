import React from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2 } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, confirmText = 'Delete', cancelText = 'Cancel', variant = 'danger', onConfirm, onClose }) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
      padding: '20px', animation: 'fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '440px', padding: '28px', borderRadius: '20px',
        border: isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: isDanger ? '0 25px 50px -12px rgba(239, 68, 68, 0.25)' : '0 25px 50px -12px rgba(99, 102, 241, 0.25)',
        position: 'relative', background: 'var(--bg-secondary)'
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
            width: '52px', height: '52px', borderRadius: '16px',
            background: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {isDanger ? (
              <Trash2 size={26} color="var(--danger)" />
            ) : variant === 'warning' ? (
              <AlertTriangle size={26} color="var(--warning)" />
            ) : (
              <CheckCircle2 size={26} color="var(--accent-primary)" />
            )}
          </div>
          <div style={{ paddingRight: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              {title}
            </h3>
          </div>
        </div>

        <p style={{ margin: '0 0 24px 0', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '10px 20px', fontSize: '0.88rem', fontWeight: 600 }}
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
              padding: '10px 22px', fontSize: '0.88rem', fontWeight: 700,
              background: isDanger ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
              boxShadow: isDanger ? '0 4px 14px rgba(239, 68, 68, 0.35)' : undefined
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
