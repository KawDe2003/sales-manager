import React, { useContext, useState } from 'react';
import { Search, Plus, Calendar, MessageSquareText, Edit2, Trash2, X, User, StickyNote, Send, Clock, Cake } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const Customers = () => {
  const { customers = [], addCustomer, deleteCustomer, updateCustomer, sendBulkSMSArray, sendDirectSMS, smsConfig = {}, showNotification } = useContext(StoreContext) || {};
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeNotesCustomer, setActiveNotesCustomer] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const filteredCustomers = customers.filter(c =>
    (c.gymName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="responsive-header mb-8">
        <div>
          <h1 className="h1 mb-2">Active Gyms</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Manage and automate billing for your active gym software clients.</p>
        </div>
        <div className="btn-group flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={() => setShowBroadcastModal(true)}
          >
            <MessageSquareText size={18} className="text-warning" /> 
            <span className="sm-hidden">Broadcast SMS</span>
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
            <Plus size={18} /> Add New Client
          </button>
        </div>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search clients by gym name, owner, or ID..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid List View */}
      <div className="flex flex-col gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
              <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
            <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Clients Found</h3>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>We couldn't find any active gyms matching your criteria.</p>
          </div>
        ) : (
          filteredCustomers.map(gym => (
            <CustomerCard
              key={gym.id}
              gym={gym}
              onEdit={() => { setEditingCustomer(gym); setShowModal(true); }}
              onDelete={() => {
                if (window.confirm(`Remove ${gym.gymName} from your client list?`)) deleteCustomer && deleteCustomer(gym.id);
              }}
              onSendReminder={() => {
                if (!gym.phone) { 
                  showNotification && showNotification(`No phone number saved for ${gym.gymName}.`, 'error'); 
                  return; 
                }
                const msg = (smsConfig.renewalTemplate || '')
                  .replace('{name}', gym.name || '')
                  .replace('{gym}', gym.gymName || '')
                  .replace('{amount}', gym.annualFee || '0')
                  .replace('{date}', gym.renewalDate ? new Date(gym.renewalDate).toLocaleDateString() : 'N/A');
                if (sendDirectSMS) sendDirectSMS(gym.phone, msg);
              }}
              onViewNotes={() => setActiveNotesCustomer(gym)}
            />
          ))
        )}
      </div>

      {showModal && (
        <CustomerModal
          onClose={() => { setShowModal(false); setEditingCustomer(null); }}
          onSave={(data) => {
            if (editingCustomer) updateCustomer && updateCustomer(editingCustomer.id, data);
            else addCustomer && addCustomer(data);
          }}
          initialData={editingCustomer}
        />
      )}

      {activeNotesCustomer && (
        <NotesModal 
          customer={activeNotesCustomer} 
          onClose={() => setActiveNotesCustomer(null)} 
        />
      )}

      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          onSend={(msg) => {
            const active = customers.filter(c => c.status === 'Active' && c.phone);
            const phonesList = active.map(c => c.phone);
            if (sendBulkSMSArray) sendBulkSMSArray(phonesList, msg);
          }}
          activeCount={customers.filter(c => c.status === 'Active' && c.phone).length}
        />
      )}
    </div>
  );
};

const CustomerCard = ({ gym, onEdit, onDelete, onSendReminder, onViewNotes }) => {
  const today = new Date();
  const renewal = new Date(gym.renewalDate || today);
  const diffTime = renewal - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isApproaching = renewal > today && diffDays <= 30;
  const isOverdue = renewal < today;

  const noteCount = (gym.notes || []).length;

  return (
    <div className="glass-panel hover-lift" style={{ 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column',
      gap: '20px',
      borderLeft: `4px solid ${gym.status === 'Active' ? 'var(--success)' : 'var(--danger)'}`
    }}>
      {/* Top Section: Identity & Primary Info */}
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(59, 130, 246, 0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(129, 140, 248, 0.2)', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
              {(gym.gymName || 'G').charAt(0).toUpperCase()}
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '2px', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gym.gymName || 'Unnamed Entity'}</div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <User size={12} /> <span style={{ fontWeight: 600 }}>{gym.name || 'Owner'}</span>
              <span className="sm-hidden" style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">{gym.phone || 'Phone'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`badge badge-${gym.status === 'Active' ? 'success' : 'danger'}`} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
            {gym.status || 'Active'}
          </span>
          {gym.dob && new Date(gym.dob).getMonth() === new Date().getMonth() && new Date(gym.dob).getDate() === new Date().getDate() && (
            <div className="flex items-center gap-1" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
              <Cake size={14} />
            </div>
          )}
        </div>
      </div>

      {/* Middle/Bottom Section: Metadata & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-panel">
        <div className="flex flex-wrap items-center gap-6">
          {/* Fee Section (Hidden on small screens) */}
          <div className="sm-hidden">
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Annual Fee</div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', marginRight: '4px' }}>LKR</span>
              {(gym.annualFee || 0).toLocaleString()}
            </div>
          </div>

          {/* Renewal Tracking */}
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Next Billing Review</div>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '6px 12px', borderRadius: '10px',
              background: isOverdue ? 'rgba(244, 63, 94, 0.08)' : isApproaching ? 'rgba(245, 158, 11, 0.08)' : 'var(--subtle-bg)',
              color: isOverdue ? 'var(--danger)' : isApproaching ? 'var(--warning)' : 'var(--text-primary)',
              border: `1px solid ${isOverdue ? 'rgba(244, 63, 94, 0.2)' : isApproaching ? 'rgba(245, 158, 11, 0.2)' : 'var(--subtle-border)'}`
            }}>
              <Calendar size={13} />
              <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{gym.renewalDate ? new Date(gym.renewalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Improved Action Buttons Group */}
        <div className="flex items-center gap-2 justify-end">
          <button 
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, position: 'relative' }} 
            onClick={onViewNotes}
            title="Communication Log"
          >
            <StickyNote size={16} className="text-warning" />
            {noteCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--accent-primary)', color: 'white', fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '6px', border: '2px solid var(--panel-bg)'}}>
                {noteCount}
              </span>
            )}
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onSendReminder} title="Direct SMS">
            <MessageSquareText size={16} className="text-secondary" />
          </button>
          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 4px' }}></div>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onEdit} title="Modify Card">
            <Edit2 size={16} />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0, color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.05)' }} onClick={onDelete} title="Purge Record">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const NotesModal = ({ customer, onClose }) => {
  const { addCustomerNote, customers = [] } = useContext(StoreContext) || {};
  const [noteText, setNoteText] = useState('');
  
  const currentCustomer = customers.find(c => c.id === customer.id) || customer;
  const notes = currentCustomer.notes || [];

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    if (addCustomerNote) addCustomerNote(customer.id, noteText);
    setNoteText('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="modal-header">
          <div>
            <h2 className="h2" style={{ margin: 0, fontSize: '1.35rem' }}>Client Timeline</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>Activity logs for {currentCustomer.gymName}</p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <form onSubmit={handleAddNote} style={{ marginBottom: '40px' }}>
            <div style={{ position: 'relative' }}>
              <textarea 
                className="form-input" 
                placeholder="Log a new update or interaction..."
                style={{ paddingRight: '56px', minHeight: '90px', resize: 'none', background: 'var(--subtle-bg)', fontSize: '0.95rem' }}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ position: 'absolute', right: '12px', bottom: '12px', padding: '10px', borderRadius: '10px' }}
                disabled={!noteText.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                <Clock size={36} style={{ marginBottom: '16px', margin: '0 auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No historical updates recorded.</p>
              </div>
            ) : (
              notes.map((note, idx) => (
                <div key={note.id} style={{ position: 'relative', paddingLeft: '32px' }}>
                  {idx !== notes.length - 1 && (
                    <div style={{ position: 'absolute', left: '4px', top: '28px', bottom: '-32px', width: '2px', background: 'linear-gradient(to bottom, rgba(129, 140, 248, 0.4), rgba(255,255,255,0.05))' }}></div>
                  )}
                  <div style={{ 
                    position: 'absolute', left: '-1px', top: '8px', 
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: idx === 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
                    boxShadow: idx === 0 ? '0 0 12px var(--accent-primary)' : 'none'
                  }}></div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {new Date(note.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ 
                    padding: '16px 20px', background: 'var(--subtle-bg)', 
                    borderRadius: '16px', color: 'var(--text-primary)', fontSize: '0.95rem', 
                    lineHeight: '1.6', border: '1px solid var(--subtle-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {note.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerModal = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    gymName: '', name: '', email: '', phone: '', dob: '', purchaseDate: '', renewalDate: '', annualFee: 1200, status: 'Active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const calculateRenewal = (dateString) => {
    if (!dateString) return;
    const date = new Date(dateString);
    date.setFullYear(date.getFullYear() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setFormData(prev => ({ ...prev, purchaseDate: dateString, renewalDate: `${yyyy}-${mm}-${dd}` }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        
        <div className="modal-header">
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{initialData ? 'Update Configuration' : 'Onboard Client Suite'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Commercial Gym Name</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.gymName} onChange={e => setFormData({...formData, gymName: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Primary Decision Maker</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Billing Email</label>
              <input type="email" className="form-input" style={{ height: '44px' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Verified Phone Number</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} placeholder="07XXXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Owner's Date of Birth</label>
              <input type="date" className="form-input" style={{ height: '44px' }} value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Software Grant Date</label>
              <input type="date" className="form-input" style={{ height: '44px' }} value={formData.purchaseDate} onChange={e => calculateRenewal(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Next Billing Cycle</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.renewalDate} onChange={e => setFormData({...formData, renewalDate: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Annual License Fee (LKR)</label>
              <input required type="number" className="form-input" style={{ height: '44px' }} value={formData.annualFee} onChange={e => setFormData({...formData, annualFee: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Account Status</label>
              <select className="form-input" style={{ height: '44px' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="Active">Active Subscription</option>
                <option value="Inactive">Suspended / Deactivated</option>
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '40px 0 32px 0' }}></div>

          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              {initialData ? 'Commit Configuration' : 'Deploy Virtual Environment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BroadcastModal = ({ onClose, onSend, activeCount }) => {
  const [msg, setMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      onSend(msg);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: 0, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="modal-header">
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>Broadcast Message</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group mb-6">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>SMS Content</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{msg.length}/160</span>
            </label>
            <textarea 
              required
              className="form-input" 
              style={{ minHeight: '120px', resize: 'vertical' }}
              placeholder="Enter your message here..."
              value={msg} 
              onChange={e => setMsg(e.target.value)} 
            />
          </div>
          <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 mb-8">
            <div className="flex items-center gap-3 text-secondary">
              <User size={18} /> <span style={{ fontSize: '0.85rem' }}>Total Recipients</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.25rem' }}>{activeCount}</span>
          </div>
          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }} disabled={!msg.trim()}>Send Broadcast</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;
