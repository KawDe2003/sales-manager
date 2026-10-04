import React, { useState, useRef, useEffect, useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Sparkles, ChevronDown, Check, Plus, 
  Settings, Briefcase, X, Store, ArrowRightLeft, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomColorPicker from './CustomColorPicker';

export default function BusinessSwitcher() {
  const { 
    businesses = [], 
    activeBusinessId, 
    activeBusiness, 
    switchBusiness, 
    addBusiness,
    inventory = [],
    invoices = [],
    leads = []
  } = useContext(StoreContext) || {};

  const { user } = useAuth();
  const isRestricted = Boolean(user?.businessId && user.businessId !== 'all');

  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizCategory, setNewBizCategory] = useState('');
  const [newBizColor, setNewBizColor] = useState('#4f46e5');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentBiz = activeBusiness || businesses.find(b => b.id === activeBusinessId) || businesses[0] || {
    id: 'biz_main',
    name: 'Seynex Enterprises',
    category: 'Enterprise Solutions & Tech',
    color: '#4f46e5',
    icon: 'Building2'
  };

  const isHairPins = currentBiz.id === 'biz_hairpins';

  const handleSelectBusiness = (bizId) => {
    if (isRestricted && bizId !== user.businessId) {
      return;
    }
    if (bizId !== activeBusinessId) {
      switchBusiness && switchBusiness(bizId);
    }
    setIsOpen(false);
  };

  const handleCreateBusiness = (e) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    if (addBusiness) {
      const newId = addBusiness({
        name: newBizName.trim(),
        category: newBizCategory.trim() || 'General Business',
        tagline: `${newBizName.trim()} Operations`,
        color: newBizColor,
        icon: 'Building2'
      });
      setShowAddModal(false);
      setNewBizName('');
      setNewBizCategory('');
      if (newId) {
        switchBusiness && switchBusiness(newId);
      }
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} style={{ zIndex: 100 }}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        id="business-switcher-btn"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          height: '36px',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--subtle-border)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.borderColor = 'var(--subtle-border)';
        }}
        title={isRestricted ? `Dedicated Account: Locked to ${currentBiz.name}` : `Active Business: ${currentBiz.name} (Click to switch)`}
      >
        {/* Icon */}
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          background: isHairPins ? 'rgba(13, 148, 136, 0.2)' : 'rgba(79, 70, 229, 0.2)',
          color: isHairPins ? '#14b8a6' : '#818cf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isHairPins ? <Sparkles size={13} /> : <Building2 size={13} />}
        </div>

        {/* Business Name */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentBiz.name}
            </span>
            <span className="hidden-mobile" style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '4px',
              background: isHairPins ? 'rgba(13, 148, 136, 0.15)' : 'rgba(79, 70, 229, 0.15)',
              color: isHairPins ? '#2dd4bf' : '#a5b4fc',
              border: `1px solid ${isHairPins ? 'rgba(13, 148, 136, 0.3)' : 'rgba(79, 70, 229, 0.3)'}`
            }}>
              {isHairPins ? 'Hair Pins' : 'Enterprise'}
            </span>
            {isRestricted && (
              <span title="Account restricted to this workspace only" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Lock size={11} color="#fca5a5" />
              </span>
            )}
          </div>
        </div>

        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="business-switcher-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 'min(290px, calc(100vw - 20px))',
            maxWidth: 'calc(100vw - 20px)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--panel-border)',
            borderRadius: '12px',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.55)',
            padding: '8px',
            zIndex: 9999,
            animation: 'dialogSpring 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '6px 10px 8px 10px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              {isRestricted ? 'Assigned Workspace' : 'Select Active Business'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {businesses.length} Businesses
            </span>
          </div>

          {/* Restricted Notice Banner */}
          {isRestricted && (
            <div style={{
              margin: '6px 2px 2px 2px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Lock size={14} color="#f87171" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', lineHeight: 1.3 }}>
                Dedicated account: Locked to <strong>{currentBiz.name}</strong>.
              </div>
            </div>
          )}

          {/* Business Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0' }}>
            {businesses.map((biz) => {
              const isSelected = biz.id === activeBusinessId;
              const isBizHairPins = biz.id === 'biz_hairpins';
              const isLockedForUser = isRestricted && biz.id !== user.businessId;

              return (
                <button
                  key={biz.id}
                  type="button"
                  disabled={isLockedForUser}
                  onClick={() => !isLockedForUser && handleSelectBusiness(biz.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                    color: 'var(--text-primary)',
                    cursor: isLockedForUser ? 'not-allowed' : 'pointer',
                    opacity: isLockedForUser ? 0.45 : 1,
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isLockedForUser) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isLockedForUser) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: isBizHairPins ? 'rgba(13, 148, 136, 0.2)' : 'rgba(79, 70, 229, 0.2)',
                      color: isBizHairPins ? '#14b8a6' : '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isBizHairPins ? <Sparkles size={15} /> : <Building2 size={15} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {biz.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {biz.category || (isBizHairPins ? 'Hair Pins & Accessories' : 'Enterprise / Tech')}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : isLockedForUser ? (
                    <span style={{ fontSize: '0.68rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Lock size={10} /> Locked
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Active Stats */}
          <div style={{
            margin: '4px 2px 8px 2px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--subtle-border)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            <span>Active: <strong style={{ color: 'var(--text-secondary)' }}>{currentBiz.name}</strong></span>
            <span>{inventory.length} Items • {leads.length} Leads</span>
          </div>

          {/* Footer Actions */}
          <div style={{ borderTop: '1px solid var(--subtle-border)', paddingTop: '6px', display: 'flex', gap: '6px' }}>
            {!isRestricted ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowAddModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--subtle-border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              >
                <Plus size={13} /> Add Business
              </button>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', padding: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                🔒 Single-entity account restriction active
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid var(--subtle-border)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Manage in Settings"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add New Business Profile */}
      {showAddModal && (
        <div className="modal-overlay app-modal-backdrop" style={{ zIndex: 999999 }}>
          <div 
            className="app-modal-dialog"
            style={{
              maxWidth: '420px',
              padding: '20px',
              background: 'var(--panel-bg, #0f172a)',
              borderRadius: '14px',
              border: '1px solid var(--panel-border)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Store size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Create Business Profile
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px', display: 'block' }}>
                  Business / Company Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Seynex Fitness, Apex Logistics..."
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  style={{ width: '100%', height: '36px', fontSize: '0.84rem' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px', display: 'block' }}>
                  Industry / Business Category
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fitness & Gym, Retail, Electronics..."
                  value={newBizCategory}
                  onChange={(e) => setNewBizCategory(e.target.value)}
                  style={{ width: '100%', height: '36px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px', display: 'block' }}>
                  Entity Branding Accent Color
                </label>
                <CustomColorPicker
                  value={newBizColor}
                  onChange={setNewBizColor}
                  label="Entity Theme Color"
                />
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                ℹ️ Each business profile maintains its own completely independent inventory, leads, invoices, quotations, and branding templates.
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                >
                  Create & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
