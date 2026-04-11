import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Package, Plus, Trash2, Edit2, X, Monitor, Server, Wrench, ChevronRight, Search } from 'lucide-react';

const Inventory = () => {
  const { inventory = [], addInventoryItem, deleteInventoryItem, updateInventoryItem } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Software': return <Monitor size={22} color="var(--accent-primary)" />;
      case 'Hardware': return <Server size={22} color="var(--warning)" />;
      case 'Service': return <Wrench size={22} color="var(--success)" />;
      default: return <Package size={22} color="var(--text-muted)" />;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Software': return 'badge-primary';
      case 'Hardware': return 'badge-warning';
      case 'Service': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Product & Service Catalog</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Centralized inventory of software modules, specialized hardware, and consultancy services.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px', height: '44px' }} onClick={() => { setEditingItem(null); setShowModal(true); }}>
          <Plus size={18} /> Register Item
        </button>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search catalog by name or type..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {(() => {
          const filteredInventory = inventory.filter(item => 
            (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredInventory.length === 0) {
            return (
              <div className="glass-panel col-span-full flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
                  <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
                <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Results Found</h3>
                <p className="text-secondary" style={{ fontSize: '0.95rem' }}>We couldn't find any products matching your search criteria.</p>
              </div>
            );
          }

          return filteredInventory.map(item => (
            <div key={item.id} className="glass-panel hover-lift" style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '16px' }}>
              <div className="flex justify-between items-start">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{
                     width: '44px', height: '44px', borderRadius: '12px',
                     background: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center'
                   }}>
                     {getTypeIcon(item.type)}
                   </div>
                   <div>
                     <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: '4px', lineHeight: '1.2' }}>{item.name}</h3>
                     <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', opacity: 0.7 }}>PID-{item.id.slice(0, 6).toUpperCase()}</span>
                   </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, minHeight: '40px' }}>
                   {item.desc ? (item.desc.length > 90 ? item.desc.substring(0, 90) + '...' : item.desc) : 'No description provided.'}
                 </p>
              </div>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                 <div>
                   <span className={`badge ${getTypeBadgeClass(item.type)}`} style={{ fontSize: '0.7rem', padding: '4px 10px', marginBottom: '12px', display: 'inline-block' }}>
                     {item.type}
                   </span>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LKR</span>
                     <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                       {Number(item.price).toLocaleString()}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)' }} onClick={() => { setEditingItem(item); setShowModal(true); }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)', color: 'var(--danger)' }} onClick={() => { if (window.confirm(`Permanently remove ${item.name}?`)) deleteInventoryItem(item.id); }}>
                      <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            </div>
          ));
        })()}
      </div>

      {showModal && (
        <InventoryModal
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSave={(data) => {
            if (editingItem) updateInventoryItem(editingItem.id, data);
            else addInventoryItem(data);
          }}
          initialData={editingItem}
        />
      )}
    </div>
  );
};

const InventoryModal = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || { name: '', type: 'Software', price: 0, desc: '' });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: 0, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--panel-border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)'}}>
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.35rem' }}>{initialData ? 'Update Specifications' : 'Add to Master Catalog'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} style={{ padding: '40px' }}>
          <div className="form-group mb-6">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Commercial Name</label>
            <input required type="text" className="form-input" style={{ height: '44px' }} placeholder="e.g. Premium Gym POS License" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Classification</label>
              <select className="form-input" style={{ height: '44px' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Software">Software Solution</option>
                <option value="Hardware">Hardware / Terminal</option>
                <option value="Service">Professional Service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Base Price (LKR)</label>
              <input required type="number" className="form-input" style={{ height: '44px' }} value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
            </div>
          </div>

          <div className="form-group mb-8">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Technical Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '120px', resize: 'vertical', padding: '16px' }}
              placeholder="Detail the features or services included..."
              value={formData.desc} 
              onChange={e => setFormData({...formData, desc: e.target.value})} 
            />
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '0 0 32px 0' }}></div>

          <div className="flex justify-end gap-4">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
