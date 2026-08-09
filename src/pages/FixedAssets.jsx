import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  Building2, Plus, Search, Trash2, Edit2, Download, FileSpreadsheet, 
  Wallet, ShieldCheck, Activity, CalendarDays, RefreshCw, X, CheckCircle
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/export';

const FixedAssets = () => {
  const { 
    fixedAssets = [], 
    addFixedAsset, 
    updateFixedAsset, 
    deleteFixedAsset,
    showNotification 
  } = useContext(StoreContext) || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // --- DEPRECIATION & METRICS CALCULATIONS ---
  const calculateDepreciation = (asset) => {
    const cost = Number(asset.purchaseCost) || 0;
    const salvage = Number(asset.salvageValue) || 0;
    const lifeYears = Number(asset.usefulLifeYears) || 5;

    if (!asset.purchaseDate || cost <= 0 || lifeYears <= 0) {
      return { accumulatedDepreciation: 0, netBookValue: cost, annualDepreciation: 0 };
    }

    const annualDep = Math.max(0, (cost - salvage) / lifeYears);
    const purchaseYear = new Date(asset.purchaseDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsElapsed = Math.max(0, currentYear - purchaseYear + 1);

    const accumDep = Math.min(cost - salvage, Math.round(annualDep * yearsElapsed));
    const netBook = Math.max(salvage, cost - accumDep);

    return { accumulatedDepreciation: accumDep, netBookValue: netBook, annualDepreciation: Math.round(annualDep) };
  };

  // Asset Metrics
  const totalGrossCost = fixedAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
  const totalAccumulatedDep = fixedAssets.reduce((sum, a) => sum + calculateDepreciation(a).accumulatedDepreciation, 0);
  const totalNetBookValue = Math.max(0, totalGrossCost - totalAccumulatedDep);
  const activeCount = fixedAssets.filter(a => (a.status || 'Active') === 'Active').length;

  const filteredAssets = fixedAssets.filter(asset => {
    const nameMatch = (asset.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.assetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = categoryFilter === 'All' || asset.category === categoryFilter;
    return nameMatch && catMatch;
  });

  const handleExportExcel = () => {
    const rows = filteredAssets.map(a => {
      const dep = calculateDepreciation(a);
      return {
        'Asset Code': a.assetCode,
        'Asset Name': a.name,
        'Category': a.category,
        'Purchase Date': a.purchaseDate,
        'Original Cost (LKR)': a.purchaseCost,
        'Useful Life (Yrs)': a.usefulLifeYears,
        'Salvage Value (LKR)': a.salvageValue,
        'Accumulated Depreciation (LKR)': dep.accumulatedDepreciation,
        'Net Book Value (LKR)': dep.netBookValue,
        'Location': a.location,
        'Status': a.status
      };
    });
    exportToExcel('Fixed_Assets_Registry', rows);
  };

  const handleExportCSV = () => {
    const rows = filteredAssets.map(a => {
      const dep = calculateDepreciation(a);
      return {
        'Asset Code': a.assetCode,
        'Asset Name': a.name,
        'Category': a.category,
        'Purchase Date': a.purchaseDate,
        'Original Cost (LKR)': a.purchaseCost,
        'Useful Life (Yrs)': a.usefulLifeYears,
        'Salvage Value (LKR)': a.salvageValue,
        'Accumulated Depreciation (LKR)': dep.accumulatedDepreciation,
        'Net Book Value (LKR)': dep.netBookValue,
        'Location': a.location,
        'Status': a.status
      };
    });
    exportToCSV('Fixed_Assets_Registry', rows);
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)', paddingBottom: '40px' }}>
      
      {/* PAGE HERO */}
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Fixed Assets Registry</h1>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Track company equipment, machinery, IT hardware, depreciation, and net book valuation.</p>
          </div>
          <div className="btn-group flex gap-3">
            <button className="btn btn-secondary" style={{ padding: '10px 18px', color: 'var(--success)' }} onClick={handleExportExcel}>
              <FileSpreadsheet size={16} /> Excel Export
            </button>
            <button className="btn btn-primary" style={{ padding: '10px 22px' }} onClick={() => { setEditingAsset(null); setShowModal(true); }}>
              <Plus size={18} /> Register Fixed Asset
            </button>
          </div>
        </div>
      </div>

      {/* KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Gross Asset Cost', value: `LKR ${totalGrossCost.toLocaleString()}`, icon: <Building2 />, color: 'var(--accent-primary)', sub: `${fixedAssets.length} Assets Registered` },
          { title: 'Accumulated Depreciation', value: `LKR ${totalAccumulatedDep.toLocaleString()}`, icon: <Activity />, color: 'var(--warning)', sub: 'Straight Line Amortization' },
          { title: 'Net Book Valuation', value: `LKR ${totalNetBookValue.toLocaleString()}`, icon: <Wallet />, color: 'var(--success)', sub: 'Gross - Depreciation' },
          { title: 'Active Assets', value: `${activeCount} / ${fixedAssets.length}`, icon: <ShieldCheck />, color: 'var(--accent-cyan)', sub: 'In Operational Service' },
        ].map((card, idx) => (
          <div key={idx} className="glass-panel flex items-center gap-4 hover-lift" style={{ padding: '20px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: `rgba(${card.color === 'var(--accent-primary)' ? '99, 102, 241' : card.color === 'var(--success)' ? '16, 185, 129' : card.color === 'var(--warning)' ? '245, 158, 11' : '6, 182, 212'}, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: `1px solid rgba(255,255,255,0.08)`
            }}>
              {React.cloneElement(card.icon, { size: 20, color: card.color })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-secondary mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.title}</p>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</h3>
              <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px', fontWeight: 600 }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & CATEGORY FILTER TOOLBAR */}
      <div className="glass-panel mb-6" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by asset code, name, location..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap" style={{ width: '100%', mdWidth: 'auto' }}>
          {['All', 'Gym Equipment', 'IT Hardware', 'Office Furniture', 'Facility Infrastructure'].map(cat => (
            <button
              key={cat}
              className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', flex: '1 1 auto' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ASSETS TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Asset Code</th>
              <th>Asset Name & Category</th>
              <th>Purchase Date</th>
              <th>Original Cost</th>
              <th>Accum. Dep.</th>
              <th>Net Book Value</th>
              <th>Location</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Building2 size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No Fixed Assets Found</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "Register Fixed Asset" above to add your machinery, gym gear, or equipment.</p>
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => {
                const dep = calculateDepreciation(asset);

                return (
                  <tr key={asset.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                      #{asset.assetCode || 'AST-000'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{asset.name}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.62rem', marginTop: '2px' }}>{asset.category || 'General'}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
                      LKR {(Number(asset.purchaseCost) || 0).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      (LKR {dep.accumulatedDepreciation.toLocaleString()})
                    </td>
                    <td style={{ fontWeight: 850, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                      LKR {dep.netBookValue.toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {asset.location || 'Main Office'}
                    </td>
                    <td>
                      <span className={`badge badge-${asset.status === 'Active' ? 'success' : asset.status === 'Maintenance' ? 'warning' : 'danger'}`}>
                        {asset.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '6px' }}
                          onClick={() => { setEditingAsset(asset); setShowModal(true); }}
                          title="Edit Asset"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '6px' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${asset.name}?`)) {
                              deleteFixedAsset && deleteFixedAsset(asset.id);
                              showNotification && showNotification(`Asset ${asset.name} deleted.`, 'success');
                            }
                          }}
                          title="Delete Asset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* REGISTER / EDIT ASSET MODAL */}
      {showModal && (
        <AssetModal
          initialData={editingAsset}
          onClose={() => { setShowModal(false); setEditingAsset(null); }}
          onSave={(data) => {
            if (editingAsset) {
              updateFixedAsset && updateFixedAsset(editingAsset.id, data);
              showNotification && showNotification(`Asset ${data.name} updated.`, 'success');
            } else {
              addFixedAsset && addFixedAsset(data);
              showNotification && showNotification(`Fixed Asset ${data.name} registered!`, 'success');
            }
            setShowModal(false);
            setEditingAsset(null);
          }}
        />
      )}
    </div>
  );
};

const AssetModal = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    assetCode: initialData?.assetCode || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
    name: initialData?.name || '',
    category: initialData?.category || 'Gym Equipment',
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    purchaseCost: initialData?.purchaseCost || '',
    usefulLifeYears: initialData?.usefulLifeYears || 5,
    salvageValue: initialData?.salvageValue || 0,
    location: initialData?.location || 'Main Floor',
    status: initialData?.status || 'Active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purchaseCost) return;

    onSave({
      ...formData,
      purchaseCost: parseFloat(formData.purchaseCost) || 0,
      usefulLifeYears: parseFloat(formData.usefulLifeYears) || 5,
      salvageValue: parseFloat(formData.salvageValue) || 0
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>
            {initialData ? 'Update Fixed Asset Record' : 'Register New Fixed Asset'}
          </h2>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Asset Code / Tag #</label>
              <input 
                required 
                type="text" 
                className="form-input" 
                value={formData.assetCode} 
                onChange={e => setFormData({ ...formData, assetCode: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-input" 
                value={formData.category} 
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Gym Equipment">Gym Equipment</option>
                <option value="IT Hardware">IT Hardware & Servers</option>
                <option value="Office Furniture">Office Furniture</option>
                <option value="Facility Infrastructure">Facility & Aircon</option>
                <option value="Other">Other Equipment</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Asset Name / Description</label>
            <input 
              required 
              type="text" 
              className="form-input" 
              placeholder="e.g. Commercial Treadmill Machine X1"
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input 
                required 
                type="date" 
                className="form-input" 
                value={formData.purchaseDate} 
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Cost (LKR)</label>
              <input 
                required 
                type="number" 
                className="form-input" 
                placeholder="150000"
                value={formData.purchaseCost} 
                onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Useful Life (Years)</label>
              <input 
                required 
                type="number" 
                className="form-input" 
                value={formData.usefulLifeYears} 
                onChange={e => setFormData({ ...formData, usefulLifeYears: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Salvage Value (LKR)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="0"
                value={formData.salvageValue} 
                onChange={e => setFormData({ ...formData, salvageValue: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Department</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Main Gym Floor"
                value={formData.location} 
                onChange={e => setFormData({ ...formData, location: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Status</label>
            <select 
              className="form-input" 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Active / Operational</option>
              <option value="Maintenance">In Repair / Maintenance</option>
              <option value="Disposed">Retired / Disposed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle size={16} /> Save Fixed Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FixedAssets;
