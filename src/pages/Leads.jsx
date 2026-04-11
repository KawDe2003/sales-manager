import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, Target, Phone, Mail, Trash2, User, Calendar, Edit2, FileText, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Leads = () => {
  const { leads = [], addLead, deleteLead, updateLead } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const statuses = ['New', 'Contacted', 'Interested', 'Demo Scheduled', 'Refused'];

  const handleSave = (data) => {
    if (editingLead) {
      updateLead(editingLead.id, data);
    } else {
      addLead(data);
    }
    setShowModal(false);
    setEditingLead(null);
  };

  const filteredLeads = leads.filter(l => {
    const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
    const matchesSearch = (l.gymName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1 mb-2">Leads Pipeline</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Track and convert your fitness prospects</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => { setEditingLead(null); setShowModal(true); }}>
          <Plus size={20} /> Add New Lead
        </button>
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
        <button 
          className={`btn ${filterStatus === 'All' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterStatus('All')}
          style={{ minWidth: '120px', padding: '10px 20px', background: filterStatus === 'All' ? '' : 'rgba(255,255,255,0.03)' }}
        >
          All Leads ({leads.length})
        </button>
        {statuses.map(status => (
          <button 
            key={status}
            className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus(status)}
            style={{ whiteSpace: 'nowrap', minWidth: '140px', padding: '10px 20px', background: filterStatus === status ? '' : 'rgba(255,255,255,0.03)' }}
          >
            {status} ({leads.filter(l => l.status === status).length})
          </button>
        ))}
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search prospects by gym, person, or email..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLeads.map(lead => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            onEdit={() => { setEditingLead(lead); setShowModal(true); }}
            onDelete={() => { if(window.confirm(`Delete ${lead.gymName} from pipeline?`)) deleteLead(lead.id); }}
            onUpdateStatus={(s) => updateLead(lead.id, { status: s })}
            onQuote={() => navigate(`/quotations?leadId=${lead.id}`)}
          />
        ))}
        {filteredLeads.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 40px' }}>
            <Target size={64} className="text-muted" style={{ marginBottom: '24px', opacity: 0.2, margin: '0 auto 24px auto' }} />
            <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Active Leads</h3>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Your pipeline is empty. Add a new prospect to begin tracking.</p>
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal 
          initialData={editingLead} 
          onClose={() => { setShowModal(false); setEditingLead(null); }} 
          onSave={handleSave} 
          statuses={statuses}
        />
      )}
    </div>
  );
};

const LeadCard = ({ lead, onEdit, onDelete, onUpdateStatus, onQuote }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'New': return 'var(--accent-primary)';
      case 'Interested': return 'var(--warning)';
      case 'Demo Scheduled': return 'var(--success)';
      case 'Refused': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="glass-panel hover-lift" style={{ padding: '18px', borderLeft: `4px solid ${getStatusColor(lead.status)}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <h3 className="h3" style={{ marginBottom: '4px', fontSize: '1.05rem' }}>{lead.gymName}</h3>
          <div className="flex items-center gap-1.5 text-secondary" style={{ fontSize: '0.8rem' }}>
            <User size={13} style={{ opacity: 0.7 }} /> <span style={{ fontWeight: 500 }}>{lead.contactPerson}</span>
          </div>
        </div>
        <select 
          value={lead.status} 
          onChange={(e) => onUpdateStatus(e.target.value)}
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: getStatusColor(lead.status), fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px',
            fontWeight: 700, appearance: 'none', cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Interested">Interested</option>
          <option value="Demo Scheduled">Demo</option>
          <option value="Refused">Refused</option>
        </select>
      </div>

      {/* Details Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px' }}>
        <div className="flex items-center gap-2.5 text-secondary" style={{ fontSize: '0.85rem' }}>
          <Phone size={14} className="text-muted" /> <span style={{ color: '#e2e8f0' }}>{lead.phone || 'No phone'}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2.5 text-secondary" style={{ fontSize: '0.85rem' }}>
            <Mail size={14} className="text-muted" /> <span style={{ color: '#e2e8f0' }}>{lead.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
          <Calendar size={13} /> {new Date(lead.date).toLocaleDateString()}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-between items-center" style={{ marginTop: 'auto', paddingTop: '4px' }}>
        <div className="flex gap-2">
          <button className="btn btn-secondary" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)' }} onClick={onEdit} title="Edit Lead">
            <Edit2 size={14} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', color: 'var(--danger)' }} onClick={onDelete} title="Delete Lead">
            <Trash2 size={14} />
          </button>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          onClick={onQuote}
        >
          <FileText size={14} /> Quote
        </button>
      </div>
    </div>
  );
};

const LeadModal = ({ initialData, onClose, onSave, statuses }) => {
  const [formData, setFormData] = useState(initialData || {
    gymName: '',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'New',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        
        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--panel-border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)'}}>
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{initialData ? 'Update Pipeline Entry' : 'Add New Prospect'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
          <div className="form-group mb-6">
            <label className="form-label">Commercial Gym Name</label>
            <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.gymName} onChange={e => setFormData({...formData, gymName: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label">Key Decision Maker</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Pipeline Stage</label>
              <select className="form-input" style={{ height: '44px' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label">Contact Mobile</label>
              <input required type="tel" className="form-input" style={{ height: '44px' }} placeholder="07XXXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" style={{ height: '44px' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="form-group mb-8">
            <label className="form-label">Discovery Notes</label>
            <textarea className="form-input" style={{ minHeight: '100px', resize: 'none' }} placeholder="Enter any background context..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '0 0 32px 0' }}></div>

          <div className="flex justify-end gap-4">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>Commit Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Leads;
