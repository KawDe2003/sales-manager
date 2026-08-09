import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  Building2, Plus, Search, Trash2, Edit2, Download, FileSpreadsheet, 
  Wallet, ShieldCheck, Activity, CalendarDays, RefreshCw, X, CheckCircle,
  Clock, TrendingDown, Eye, Calculator, Table
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
  const [methodFilter, setMethodFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewScheduleAsset, setViewScheduleAsset] = useState(null);

  // --- CORE DEPRECIATION CALCULATOR ---
  const calculateDepreciation = (asset) => {
    const cost = Number(asset.purchaseCost) || 0;
    const salvage = Number(asset.salvageValue) || 0;
    const lifeYears = Number(asset.usefulLifeYears) || 5;
    const method = asset.depreciationMethod || 'Straight Line (SLM)';
    const customRate = Number(asset.depreciationRate) || 0;

    if (!asset.purchaseDate || cost <= 0 || method === 'No Depreciation (Land/Art)') {
      return { 
        monthlyDepreciation: 0, 
        annualDepreciation: 0, 
        accumulatedDepreciation: 0, 
        netBookValue: cost, 
        monthsElapsed: 0 
      };
    }

    // Calculate Months Elapsed since Purchase Date
    const purchase = new Date(asset.purchaseDate);
    const today = new Date();
    const monthsElapsed = Math.max(0, (today.getFullYear() - purchase.getFullYear()) * 12 + (today.getMonth() - purchase.getMonth()));
    const totalLifeMonths = lifeYears * 12;

    if (method === 'Straight Line (SLM)') {
      const depreciableAmount = Math.max(0, cost - salvage);
      const monthlyDep = totalLifeMonths > 0 ? depreciableAmount / totalLifeMonths : 0;
      const annualDep = monthlyDep * 12;
      const accumDep = Math.min(depreciableAmount, Math.round(monthlyDep * monthsElapsed));
      const nbv = Math.max(salvage, cost - accumDep);

      return {
        monthlyDepreciation: Math.round(monthlyDep),
        annualDepreciation: Math.round(annualDep),
        accumulatedDepreciation: Math.round(accumDep),
        netBookValue: Math.round(nbv),
        monthsElapsed
      };
    }

    if (method === 'Declining Balance (WDV)') {
      // Annual rate: customRate if provided, otherwise double declining rate (2 / lifeYears)
      const annualRate = customRate > 0 ? (customRate / 100) : Math.min(1, 2 / lifeYears);
      const monthlyRate = 1 - Math.pow(1 - annualRate, 1 / 12);

      let currentNBV = cost;
      let currentMonthlyDep = 0;

      for (let m = 1; m <= Math.min(monthsElapsed, totalLifeMonths); m++) {
        if (currentNBV <= salvage) break;
        const depCharge = Math.min(currentNBV - salvage, currentNBV * monthlyRate);
        currentMonthlyDep = depCharge;
        currentNBV = Math.max(salvage, currentNBV - depCharge);
      }

      // Current monthly charge calculation for active asset
      const activeMonthlyDep = currentNBV > salvage ? Math.round(currentNBV * monthlyRate) : 0;
      const accumDep = Math.min(cost - salvage, Math.round(cost - currentNBV));

      return {
        monthlyDepreciation: activeMonthlyDep,
        annualDepreciation: Math.round(activeMonthlyDep * 12),
        accumulatedDepreciation: accumDep,
        netBookValue: Math.round(currentNBV),
        monthsElapsed
      };
    }

    if (method === 'Sum of Years Digits (SYD)') {
      const sumOfYears = (lifeYears * (lifeYears + 1)) / 2;
      const currentYearIndex = Math.min(lifeYears, Math.floor(monthsElapsed / 12) + 1);
      const depreciableAmount = Math.max(0, cost - salvage);
      
      const currentYearFactor = (lifeYears - currentYearIndex + 1) / sumOfYears;
      const currentAnnualDep = depreciableAmount * currentYearFactor;
      const monthlyDep = currentAnnualDep / 12;

      // Accumulated sum over elapsed months
      let accumDep = 0;
      for (let m = 1; m <= Math.min(monthsElapsed, totalLifeMonths); m++) {
        const yIdx = Math.min(lifeYears, Math.floor((m - 1) / 12) + 1);
        const yFactor = (lifeYears - yIdx + 1) / sumOfYears;
        accumDep += (depreciableAmount * yFactor) / 12;
      }
      accumDep = Math.min(depreciableAmount, Math.round(accumDep));

      return {
        monthlyDepreciation: Math.round(monthlyDep),
        annualDepreciation: Math.round(currentAnnualDep),
        accumulatedDepreciation: accumDep,
        netBookValue: Math.round(cost - accumDep),
        monthsElapsed
      };
    }

    return { monthlyDepreciation: 0, annualDepreciation: 0, accumulatedDepreciation: 0, netBookValue: cost, monthsElapsed };
  };

  // Generate Month-by-Month Schedule Array for an Asset
  const generateMonthlySchedule = (asset) => {
    if (!asset || !asset.purchaseDate) return [];

    const cost = Number(asset.purchaseCost) || 0;
    const salvage = Number(asset.salvageValue) || 0;
    const lifeYears = Number(asset.usefulLifeYears) || 5;
    const method = asset.depreciationMethod || 'Straight Line (SLM)';
    const customRate = Number(asset.depreciationRate) || 0;
    const totalLifeMonths = lifeYears * 12;
    const startDate = new Date(asset.purchaseDate);

    const schedule = [];
    let currentBookValue = cost;
    let accumDep = 0;

    if (method === 'Straight Line (SLM)') {
      const depreciableAmount = Math.max(0, cost - salvage);
      const monthlyDep = totalLifeMonths > 0 ? depreciableAmount / totalLifeMonths : 0;

      for (let m = 1; m <= totalLifeMonths; m++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m - 1, 1);
        const beginningNBV = currentBookValue;
        const depCharge = Math.min(beginningNBV - salvage, monthlyDep);
        accumDep += depCharge;
        currentBookValue = Math.max(salvage, beginningNBV - depCharge);

        schedule.push({
          monthNumber: m,
          dateLabel: monthDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          beginningNBV: Math.round(beginningNBV),
          depreciationCharge: Math.round(depCharge),
          accumulatedDepreciation: Math.round(accumDep),
          endingNBV: Math.round(currentBookValue)
        });
      }
    } else if (method === 'Declining Balance (WDV)') {
      const annualRate = customRate > 0 ? (customRate / 100) : Math.min(1, 2 / lifeYears);
      const monthlyRate = 1 - Math.pow(1 - annualRate, 1 / 12);

      for (let m = 1; m <= totalLifeMonths; m++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m - 1, 1);
        const beginningNBV = currentBookValue;
        const depCharge = Math.min(beginningNBV - salvage, beginningNBV * monthlyRate);
        accumDep += depCharge;
        currentBookValue = Math.max(salvage, beginningNBV - depCharge);

        schedule.push({
          monthNumber: m,
          dateLabel: monthDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          beginningNBV: Math.round(beginningNBV),
          depreciationCharge: Math.round(depCharge),
          accumulatedDepreciation: Math.round(accumDep),
          endingNBV: Math.round(currentBookValue)
        });
      }
    } else if (method === 'Sum of Years Digits (SYD)') {
      const sumOfYears = (lifeYears * (lifeYears + 1)) / 2;
      const depreciableAmount = Math.max(0, cost - salvage);

      for (let m = 1; m <= totalLifeMonths; m++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m - 1, 1);
        const beginningNBV = currentBookValue;

        const yIdx = Math.min(lifeYears, Math.floor((m - 1) / 12) + 1);
        const yFactor = (lifeYears - yIdx + 1) / sumOfYears;
        const depCharge = Math.min(beginningNBV - salvage, (depreciableAmount * yFactor) / 12);
        
        accumDep += depCharge;
        currentBookValue = Math.max(salvage, beginningNBV - depCharge);

        schedule.push({
          monthNumber: m,
          dateLabel: monthDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          beginningNBV: Math.round(beginningNBV),
          depreciationCharge: Math.round(depCharge),
          accumulatedDepreciation: Math.round(accumDep),
          endingNBV: Math.round(currentBookValue)
        });
      }
    }

    return schedule;
  };

  // Asset Metrics Aggregations
  const totalGrossCost = fixedAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
  const totalMonthlyDep = fixedAssets.reduce((sum, a) => sum + calculateDepreciation(a).monthlyDepreciation, 0);
  const totalAccumulatedDep = fixedAssets.reduce((sum, a) => sum + calculateDepreciation(a).accumulatedDepreciation, 0);
  const totalNetBookValue = Math.max(0, totalGrossCost - totalAccumulatedDep);
  const activeCount = fixedAssets.filter(a => (a.status || 'Active') === 'Active').length;

  const filteredAssets = fixedAssets.filter(asset => {
    const nameMatch = (asset.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.assetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = categoryFilter === 'All' || asset.category === categoryFilter;
    const methodMatch = methodFilter === 'All' || asset.depreciationMethod === methodFilter;
    return nameMatch && catMatch && methodMatch;
  });

  const handleExportExcel = () => {
    const rows = filteredAssets.map(a => {
      const dep = calculateDepreciation(a);
      return {
        'Asset Code': a.assetCode,
        'Asset Name': a.name,
        'Category': a.category,
        'Depreciation Method': a.depreciationMethod || 'Straight Line (SLM)',
        'Purchase Date': a.purchaseDate,
        'Original Cost (LKR)': a.purchaseCost,
        'Useful Life (Yrs)': a.usefulLifeYears,
        'Monthly Depreciation (LKR/mo)': dep.monthlyDepreciation,
        'Annual Depreciation (LKR/yr)': dep.annualDepreciation,
        'Accumulated Depreciation (LKR)': dep.accumulatedDepreciation,
        'Net Book Value (LKR)': dep.netBookValue,
        'Location': a.location,
        'Status': a.status
      };
    });
    exportToExcel('Fixed_Assets_Monthly_Depreciation_Registry', rows);
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)', paddingBottom: '40px' }}>
      
      {/* PAGE HERO */}
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Fixed Assets & Monthly Depreciation</h1>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Asset lifecycle tracking, monthly depreciation charges (SLM, WDV, SYD), and net book valuation schedule.</p>
          </div>
          <div className="btn-group flex gap-3">
            <button className="btn btn-secondary" style={{ padding: '10px 18px', color: 'var(--success)' }} onClick={handleExportExcel}>
              <FileSpreadsheet size={16} /> Export Excel Schedule
            </button>
            <button className="btn btn-primary" style={{ padding: '10px 22px' }} onClick={() => { setEditingAsset(null); setShowModal(true); }}>
              <Plus size={18} /> Register Fixed Asset
            </button>
          </div>
        </div>
      </div>

      {/* KPI FINANCIAL METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Gross Asset Cost', value: `LKR ${totalGrossCost.toLocaleString()}`, icon: <Building2 />, color: 'var(--accent-primary)', sub: `${fixedAssets.length} Registered Assets` },
          { title: 'Monthly Dep. Charge', value: `LKR ${totalMonthlyDep.toLocaleString()} / mo`, icon: <TrendingDown />, color: '#f59e0b', sub: 'Current Monthly Amortization' },
          { title: 'Accumulated Depreciation', value: `LKR ${totalAccumulatedDep.toLocaleString()}`, icon: <Activity />, color: 'var(--danger)', sub: 'Total Depreciated to Date' },
          { title: 'Net Book Valuation (NBV)', value: `LKR ${totalNetBookValue.toLocaleString()}`, icon: <Wallet />, color: 'var(--success)', sub: 'Current Balance Sheet Value' },
        ].map((card, idx) => (
          <div key={idx} className="glass-panel flex items-center gap-4 hover-lift" style={{ padding: '20px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: `rgba(${card.color === 'var(--accent-primary)' ? '99, 102, 241' : card.color === 'var(--success)' ? '16, 185, 129' : card.color === '#f59e0b' ? '245, 158, 11' : '244, 63, 94'}, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: `1px solid rgba(255,255,255,0.08)`
            }}>
              {React.cloneElement(card.icon, { size: 20, color: card.color })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-secondary mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.title}</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</h3>
              <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px', fontWeight: 600 }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="glass-panel mb-6" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search code, name, location..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap" style={{ width: '100%', mdWidth: 'auto' }}>
          <select 
            className="form-input" 
            style={{ height: '42px', minWidth: '150px', background: 'var(--subtle-bg)', fontSize: '0.8rem' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Gym Equipment">Gym Equipment</option>
            <option value="IT Hardware">IT Hardware & Servers</option>
            <option value="Office Furniture">Office Furniture</option>
            <option value="Facility Infrastructure">Facility & Aircon</option>
          </select>

          <select 
            className="form-input" 
            style={{ height: '42px', minWidth: '160px', background: 'var(--subtle-bg)', fontSize: '0.8rem' }}
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
          >
            <option value="All">All Dep. Methods</option>
            <option value="Straight Line (SLM)">Straight Line (SLM)</option>
            <option value="Declining Balance (WDV)">Declining Balance (WDV)</option>
            <option value="Sum of Years Digits (SYD)">Sum of Years Digits (SYD)</option>
            <option value="No Depreciation (Land/Art)">No Depreciation</option>
          </select>
        </div>
      </div>

      {/* ASSETS & DEPRECIATION TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Asset Code</th>
              <th>Asset Name & Method</th>
              <th>Purchase Date</th>
              <th>Original Cost</th>
              <th>Monthly Dep.</th>
              <th>Accum. Dep.</th>
              <th>Net Book Value</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Schedule / Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Building2 size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No Fixed Assets Found</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "Register Fixed Asset" above to add your machinery, gym gear, or hardware equipment.</p>
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => {
                const dep = calculateDepreciation(asset);
                const isSLM = (asset.depreciationMethod || 'Straight Line (SLM)') === 'Straight Line (SLM)';

                return (
                  <tr key={asset.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                      #{asset.assetCode || 'AST-000'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{asset.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>{asset.category || 'General'}</span>
                        <span className={`badge badge-${isSLM ? 'info' : 'warning'}`} style={{ fontSize: '0.62rem' }}>
                          {asset.depreciationMethod || 'Straight Line (SLM)'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
                      LKR {(Number(asset.purchaseCost) || 0).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
                      LKR {dep.monthlyDepreciation.toLocaleString()} <span style={{ fontSize: '0.68rem', opacity: 0.7, fontWeight: 500 }}>/mo</span>
                    </td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      (LKR {dep.accumulatedDepreciation.toLocaleString()})
                    </td>
                    <td style={{ fontWeight: 850, color: 'var(--success)', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                      LKR {dep.netBookValue.toLocaleString()}
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
                          style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setViewScheduleAsset(asset)}
                          title="View Month-by-Month Schedule"
                        >
                          <CalendarDays size={13} color="var(--accent-primary)" /> Schedule
                        </button>
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

      {/* MONTHLY DEPRECIATION SCHEDULE BREAKDOWN MODAL */}
      {viewScheduleAsset && (
        <ScheduleModal
          asset={viewScheduleAsset}
          schedule={generateMonthlySchedule(viewScheduleAsset)}
          depMetrics={calculateDepreciation(viewScheduleAsset)}
          onClose={() => setViewScheduleAsset(null)}
        />
      )}
    </div>
  );
};

// --- ASSET REGISTRATION & EDIT MODAL ---
const AssetModal = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    assetCode: initialData?.assetCode || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
    name: initialData?.name || '',
    category: initialData?.category || 'Gym Equipment',
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    purchaseCost: initialData?.purchaseCost || '',
    usefulLifeYears: initialData?.usefulLifeYears || 5,
    salvageValue: initialData?.salvageValue || 0,
    depreciationMethod: initialData?.depreciationMethod || 'Straight Line (SLM)',
    depreciationRate: initialData?.depreciationRate || '',
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
      salvageValue: parseFloat(formData.salvageValue) || 0,
      depreciationRate: parseFloat(formData.depreciationRate) || 0
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
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
              <label className="form-label">Asset Category</label>
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

          {/* DEPRECIATION METHOD SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>Depreciation Method</label>
              <select 
                className="form-input" 
                value={formData.depreciationMethod} 
                onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value })}
              >
                <option value="Straight Line (SLM)">Straight Line Method (SLM)</option>
                <option value="Declining Balance (WDV)">Declining / Reducing Balance (WDV)</option>
                <option value="Sum of Years Digits (SYD)">Sum of Years Digits (SYD)</option>
                <option value="No Depreciation (Land/Art)">No Depreciation (Land / Art)</option>
              </select>
            </div>

            {formData.depreciationMethod === 'Declining Balance (WDV)' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Custom Annual Rate % (Optional)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 20 (Defaults to Double Declining)"
                  value={formData.depreciationRate} 
                  onChange={e => setFormData({ ...formData, depreciationRate: e.target.value })} 
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
              <label className="form-label">Salvage / Scrap Value (LKR)</label>
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

// --- MONTHLY DEPRECIATION SCHEDULE BREAKDOWN MODAL ---
const ScheduleModal = ({ asset, schedule = [], depMetrics, onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary">#{asset.assetCode}</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{asset.name}</span>
            </div>
            <p className="text-secondary" style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
              Monthly Depreciation Schedule • Method: <strong>{asset.depreciationMethod || 'Straight Line (SLM)'}</strong>
            </p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* METRICS HEADER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--panel-border)' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Purchase Cost</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>LKR {(asset.purchaseCost || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Monthly Charge</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f59e0b' }}>LKR {depMetrics.monthlyDepreciation.toLocaleString()}/mo</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Accum. Dep.</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)' }}>LKR {depMetrics.accumulatedDepreciation.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Current NBV</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--success)' }}>LKR {depMetrics.netBookValue.toLocaleString()}</div>
          </div>
        </div>

        {/* SCHEDULE TABLE */}
        <div className="table-container" style={{ flex: 1, overflowY: 'auto', margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Month #</th>
                <th>Billing Period</th>
                <th>Beginning NBV</th>
                <th>Monthly Dep. Charge</th>
                <th>Accumulated Dep.</th>
                <th>Ending NBV</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No depreciation schedule available.</td>
                </tr>
              ) : (
                schedule.map((row) => (
                  <tr key={row.monthNumber} style={{ background: row.monthNumber === depMetrics.monthsElapsed ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      Month {row.monthNumber} {row.monthNumber === depMetrics.monthsElapsed && <span className="badge badge-success" style={{ fontSize: '0.58rem', marginLeft: '4px' }}>CURRENT</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.dateLabel}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>LKR {row.beginningNBV.toLocaleString()}</td>
                    <td style={{ fontWeight: 750, color: '#f59e0b' }}>LKR {row.depreciationCharge.toLocaleString()}</td>
                    <td style={{ color: 'var(--danger)' }}>LKR {row.accumulatedDepreciation.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>LKR {row.endingNBV.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-footer flex justify-between items-center" style={{ padding: '16px 24px', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Useful Life: <strong>{asset.usefulLifeYears || 5} Years ({schedule.length} Months)</strong>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close Schedule</button>
        </div>
      </div>
    </div>
  );
};

export default FixedAssets;
