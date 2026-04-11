import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Package, Plus, Trash2, Edit2, X, Monitor, Server, Wrench, ChevronRight, Search, AlertCircle, Hash, DollarSign, CheckCircle2 } from 'lucide-react';

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="h1 mb-2 font-black tracking-tight">Product & Service Catalog</h1>
          <p className="text-[var(--text-secondary)] font-medium max-w-2xl">Centralized inventory of software modules, specialized hardware, and consultancy services.</p>
        </div>
        <button className="btn btn-primary w-full md:w-auto py-3.5 px-8 shadow-xl shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold" onClick={() => { setEditingItem(null); setShowModal(true); }}>
          <Plus size={18} /> Register Item
        </button>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel p-4 mb-10 flex items-center bg-[var(--panel-bg)]/40 border-[var(--panel-border)]/50">
        <div className="relative w-full max-w-lg group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
          <input
            type="text"
            className="form-input pl-12 h-12 bg-black/10 border-transparent focus:bg-black/20 focus:border-[var(--accent-primary)]/30 rounded-xl transition-all"
            placeholder="Search catalog by name, type, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          const filteredInventory = inventory.filter(item => 
            (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredInventory.length === 0) {
            return (
              <div className="glass-panel col-span-full flex flex-col items-center justify-center py-20 bg-white/5 border-dashed border-2">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shrink-0">
                  <Search size={32} className="text-[var(--text-muted)] opacity-50" />
                </div>
                <h3 className="h2 text-xl mb-2 font-bold">No Results Found</h3>
                <p className="text-[var(--text-muted)] font-medium">We couldn't find any products matching your search criteria.</p>
              </div>
            );
          }

          return filteredInventory.map(item => (
            <div key={item.id} className="glass-panel hover:border-[var(--accent-primary)]/30 hover:shadow-2xl hover:shadow-[var(--accent-primary)]/10 transition-all flex flex-col p-6 gap-6 group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-[var(--subtle-bg)] border border-[var(--subtle-border)] flex items-center justify-center shadow-inner transition-transform group-hover:rotate-6">
                     {getTypeIcon(item.type)}
                   </div>
                   <div className="min-w-0">
                     <h3 className="h3 text-lg font-bold truncate leading-tight group-hover:text-[var(--accent-primary)] transition-colors">{item.name}</h3>
                     <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-70">
                       {item.sku ? `SKU: ${item.sku}` : `PID-${item.id.slice(0, 6).toUpperCase()}`}
                     </span>
                   </div>
                </div>
              </div>

              <div className="flex-1">
                 <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic opacity-80 line-clamp-2">
                   {item.desc || 'No technical description provided.'}
                 </p>
              </div>

              <div className="pt-6 border-t border-[var(--panel-border)] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                 <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`badge ${getTypeBadgeClass(item.type)} text-[9px] font-black tracking-widest px-2.5 shadow-sm`}>
                        {item.type}
                      </span>
                      {item.isSubscription && (
                        <span className="badge bg-emerald-500/10 text-emerald-400 text-[9px] font-black border border-emerald-500/20 px-2.5 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={10} strokeWidth={3} /> LICENSE
                        </span>
                      )}
                      {item.type !== 'Service' && item.quantity !== undefined && (
                        <span className={`badge text-[9px] font-black tracking-widest px-2.5 flex items-center gap-1.5 shadow-sm ${
                          item.quantity <= 0 ? 'bg-rose-500 text-white' : 
                          item.quantity <= 5 ? 'bg-amber-500 text-white' : 
                          'bg-emerald-500 text-white'
                        }`}>
                          {item.quantity <= 5 && <AlertCircle size={10} strokeWidth={3} />}
                          {item.quantity <= 0 ? 'OUT OF STOCK' : `STOCK: ${item.quantity}`}
                        </span>
                      )}
                    </div>
                    <div className="w-full">
                      <div className="flex items-baseline gap-1.5 mb-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 inline-flex">
                        <span className="text-[10px] font-black text-[var(--text-muted)] mt-1">SELL: LKR</span>
                        <span className="text-xl font-black text-[var(--accent-primary)] font-['Outfit'] tracking-tight">
                          {Number(item.price).toLocaleString()}
                        </span>
                      </div>
                      {item.cost > 0 && (
                        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider mt-2 bg-black/20 p-2.5 rounded-lg border border-black/10">
                           <span className="text-[var(--text-secondary)]">Buy Rate: LKR {Number(item.cost).toLocaleString()}</span>
                           <span className={`px-2 py-1 rounded-md shadow-sm ${((item.price - item.cost) > 0) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                             {Math.round(((item.price - item.cost) / item.price) * 100) || 0}% MARGIN
                           </span>
                        </div>
                      )}
                    </div>
                 </div>
                 
                 <div className="flex gap-2 w-full sm:w-auto">
                    <button className="btn btn-secondary flex-1 sm:flex-none p-3 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] group/btn" onClick={() => { setEditingItem(item); setShowModal(true); }}>
                      <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                    <button className="btn btn-secondary flex-1 sm:flex-none p-3 hover:bg-rose-500/10 hover:text-rose-500 group/btn" onClick={() => { if (window.confirm(`Permanently remove ${item.name}?`)) deleteInventoryItem(item.id); }}>
                      <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
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
  const [formData, setFormData] = useState(initialData || { name: '', type: 'Software', price: 0, cost: 0, sku: '', quantity: 0, desc: '', isSubscription: false });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl bg-[var(--bg-secondary)] shadow-2xl border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-[var(--panel-border)] bg-gradient-to-br from-white/5 to-transparent flex justify-between items-center">
           <div>
             <h2 className="h2 text-xl font-black">{initialData ? 'Update Specifications' : 'Add to Master Catalog'}</h2>
             <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mt-1">Classification & Commercial Data</p>
           </div>
           <button className="btn btn-secondary p-2.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="form-group mb-8">
            <label className="form-label text-[10px] font-black tracking-widest text-[var(--accent-primary)]">Commercial Name</label>
            <input required type="text" className="form-input h-14 text-lg font-bold rounded-xl" placeholder="e.g. Premium Gym POS License" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div className="form-group">
              <label className="form-label text-[10px] font-black tracking-widest">Classification</label>
              <select className="form-input h-12 font-bold rounded-xl" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Software">Software Solution</option>
                <option value="Hardware">Hardware / Terminal</option>
                <option value="Service">Professional Service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label text-[10px] font-black tracking-widest">Base Price (LKR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--text-muted)]">LKR</span>
                <input required type="number" className="form-input h-12 pl-12 font-bold rounded-xl" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-10">
            <div className="form-group">
              <label className="form-label text-[10px] font-black tracking-widest">SKU / Item Code</label>
              <div className="relative group">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input type="text" className="form-input h-12 pl-11 font-bold rounded-xl uppercase placeholder:normal-case" placeholder="Optional" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label text-[10px] font-black tracking-widest">Stock Quantity</label>
              <input type="number" className={`form-input h-12 font-bold rounded-xl ${formData.type === 'Service' ? 'opacity-50' : ''}`} value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} disabled={formData.type === 'Service'} />
            </div>
            <div className="form-group">
              <label className="form-label text-[10px] font-black tracking-widest">Cost Price (LKR)</label>
              <div className="relative group">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input type="number" className="form-input h-12 pl-11 font-bold rounded-xl" value={formData.cost || 0} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="form-group mb-12">
            <label className="form-label text-[10px] font-black tracking-widest">Full Technical Description</label>
            <textarea 
              className="form-input min-h-[140px] py-4 rounded-2xl resize-none leading-relaxed font-medium" 
              placeholder="Detail the features or services included in this package..."
              value={formData.desc} 
              onChange={e => setFormData({...formData, desc: e.target.value})} 
            />
          </div>

          <div className="form-group mb-12">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--subtle-bg)] hover:border-[var(--accent-primary)]/50 transition-colors">
              <input 
                type="checkbox" 
                id="isSubscription"
                className="w-5 h-5 accent-[var(--accent-primary)] rounded cursor-pointer"
                checked={formData.isSubscription || false}
                onChange={e => setFormData({...formData, isSubscription: e.target.checked})}
              />
              <label htmlFor="isSubscription" className="form-label text-sm font-bold m-0 cursor-pointer flex-1 text-[var(--text-primary)]">
                Software License / Subscription
                <span className="block text-[10px] font-normal text-[var(--text-muted)] mt-1 tracking-wide">
                  Flag this item to show a checkmark specifically for tracking recurring software licenses
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-4">
            <button type="button" className="btn btn-secondary py-4 px-8 font-black uppercase tracking-widest text-[10px] order-2 sm:order-1" onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary py-4 px-8 font-black uppercase tracking-widest text-[10px] order-1 sm:order-2 shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-[1.02] transition-all">Save Catalog Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
