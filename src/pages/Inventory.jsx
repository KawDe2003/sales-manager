import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  Package, Plus, Trash2, Edit2, X, Monitor, Server, 
  Wrench, ChevronRight, Search, Download, TrendingUp, 
  AlertTriangle, Check
} from 'lucide-react';
import { generateStockReportPDF } from '../utils/pdfGenerator';

const Inventory = () => {
  const { inventory = [], addInventoryItem, deleteInventoryItem, updateInventoryItem } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'stock'

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Software': return <Monitor size={20} color="var(--accent-primary)" />;
      case 'Hardware': return <Server size={20} color="var(--warning)" />;
      case 'Service': return <Wrench size={20} color="var(--success)" />;
      default: return <Package size={20} color="var(--text-muted)" />;
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

  const handleUpdateStock = (id, newStock) => {
    const val = Math.max(0, parseInt(newStock) || 0);
    updateInventoryItem(id, { stock: val });
  };

  const filteredInventory = inventory.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Inventory Management</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Manage your product catalog and monitor real-time stock balances.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'stock' && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '12px 24px', height: '44px' }}
              onClick={() => generateStockReportPDF(inventory)}
            >
              <Download size={18} /> Export Stock Report
            </button>
          )}
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 24px', height: '44px' }} 
            onClick={() => { setEditingItem(null); setShowModal(true); }}
          >
            <Plus size={18} /> Register Item
          </button>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px', 
        background: 'rgba(255,255,255,0.02)', 
        padding: '6px', 
        borderRadius: '14px',
        width: 'fit-content',
        border: '1px solid var(--panel-border)'
      }}>
        <button 
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            transition: 'all 0.3s ease',
            background: activeTab === 'catalog' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'catalog' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={16} /> Product Catalog
        </button>
        <button 
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            transition: 'all 0.3s ease',
            background: activeTab === 'stock' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'stock' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={16} /> Stock Balances
        </button>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder={`Filter ${activeTab === 'catalog' ? 'catalog' : 'stock list'}...`}
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInventory.length === 0 ? (
            <EmptyState message="No products matching your search." />
          ) : (
            filteredInventory.map(item => (
              <InventoryCard 
                key={item.id} 
                item={item} 
                onEdit={() => { setEditingItem(item); setShowModal(true); }}
                onDelete={() => { if (window.confirm(`Permanently remove ${item.name}?`)) deleteInventoryItem(item.id); }}
                getTypeIcon={getTypeIcon}
                getTypeBadgeClass={getTypeBadgeClass}
              />
            ))
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>In Stock</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px 0' }}>
                      <EmptyState message="No stock data found." />
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => (
                    <StockRow 
                      key={item.id} 
                      item={item} 
                      onUpdateStock={handleUpdateStock}
                      getTypeIcon={getTypeIcon}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

const InventoryCard = ({ item, onEdit, onDelete, getTypeIcon, getTypeBadgeClass }) => (
  <div className="glass-panel hover-lift" style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '16px' }}>
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
          <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)' }} onClick={onEdit}>
            <Edit2 size={16} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)', color: 'var(--danger)' }} onClick={onDelete}>
            <Trash2 size={16} />
          </button>
       </div>
    </div>
  </div>
);

const StockRow = ({ item, onUpdateStock, getTypeIcon }) => {
  const isOutOfStock = item.type === 'Hardware' && (item.stock === 0 || !item.stock);
  const isService = item.type === 'Service' || item.type === 'Software';

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div style={{ padding: '8px', background: 'var(--subtle-bg)', borderRadius: '10px' }}>
            {getTypeIcon(item.type)}
          </div>
          <span style={{ fontWeight: 700 }}>{item.name}</span>
        </div>
      </td>
      <td>
        <span className={`badge ${
          item.type === 'Hardware' ? 'badge-warning' : 
          item.type === 'Software' ? 'badge-primary' : 'badge-success'
        }`}>
          {item.type}
        </span>
      </td>
      <td style={{ fontWeight: 600 }}>LKR {Number(item.price).toLocaleString()}</td>
      <td>
        {isService ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A (Variable)</span>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              className="btn-icon" 
              style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--subtle-bg)', fontSize: '1.2rem' }}
              onClick={() => onUpdateStock(item.id, (item.stock || 0) - 1)}
            >-</button>
            <input 
              type="number" 
              className="form-input" 
              style={{ width: '70px', height: '32px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', padding: 0 }}
              value={item.stock || 0}
              onChange={(e) => onUpdateStock(item.id, e.target.value)}
            />
            <button 
              className="btn-icon" 
              style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--subtle-bg)', fontSize: '1.2rem' }}
              onClick={() => onUpdateStock(item.id, (item.stock || 0) + 1)}
            >+</button>
            
            {isOutOfStock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 800, marginLeft: '8px' }}>
                <AlertTriangle size={12} /> OUT OF STOCK
              </div>
            )}
            {!isOutOfStock && item.stock < 5 && (
              <div style={{ color: 'var(--warning)', fontSize: '0.7rem', fontWeight: 800, marginLeft: '8px' }}>
                LOW STOCK
              </div>
            )}
            {!isOutOfStock && item.stock >= 5 && (
               <div style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 800, marginLeft: '8px' }}>
                <Check size={12} /> IN STOCK
              </div>
            )}
          </div>
        )}
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Current Value</span>
          <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
            LKR {((item.price || 0) * (item.stock || 0)).toLocaleString()}
          </span>
        </div>
      </td>
    </tr>
  );
};

const EmptyState = ({ message }) => (
  <div className="glass-panel col-span-full flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
      <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
    </div>
    <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Results</h3>
    <p className="text-secondary" style={{ fontSize: '0.95rem' }}>{message}</p>
  </div>
);

const InventoryModal = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || { name: '', type: 'Hardware', price: 0, stock: 0, desc: '' });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: 0, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--panel-border)' }}>
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.35rem' }}>{initialData ? 'Update Specifications' : 'Add to Master Catalog'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="modal-body" style={{ padding: '24px' }}>
          <div className="form-group mb-6">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Commercial Name</label>
            <input required type="text" className="form-input" style={{ height: '44px' }} placeholder="e.g. Premium Gym POS License" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Classification</label>
              <select className="form-input" style={{ height: '44px', width: '100%' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
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

          <div className="form-group mb-6">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Initial Stock Balance</label>
            <input 
              type="number" 
              className="form-input" 
              style={{ height: '44px' }} 
              disabled={formData.type === 'Service' || formData.type === 'Software'}
              value={formData.stock || 0} 
              onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
            />
            {(formData.type === 'Service' || formData.type === 'Software') && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Stock tracking disabled for services and virtual software.</span>
            )}
          </div>

          <div className="form-group mb-8">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Technical Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '100px', resize: 'vertical', padding: '16px' }}
              placeholder="Detail the features or services included..."
              value={formData.desc} 
              onChange={e => setFormData({...formData, desc: e.target.value})} 
            />
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '0 0 24px 0' }}></div>

          <div className="flex justify-end gap-4">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>Save Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
