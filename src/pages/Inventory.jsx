import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  Package, Plus, Trash2, Edit2, X, Monitor, Server, 
  Wrench, ChevronRight, Search, Download, TrendingUp, 
  AlertTriangle, Check, FileSpreadsheet, DollarSign, Layers, Tag
} from 'lucide-react';
import { generateStockReportPDF } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/export';

const Inventory = () => {
  const { inventory = [], invoices = [], addInventoryItem, deleteInventoryItem, updateInventoryItem } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'stock'

  // --- SALES & UNITS SOLD LINKAGE CALCULATIONS ---
  const itemSalesMap = React.useMemo(() => {
    const map = {}; // itemID/Name -> { unitsSold, salesRevenue }
    invoices.forEach(inv => {
      if (inv.status === 'Paid' || inv.status === 'Sent' || inv.status === 'Partially Paid') {
        (inv.items || []).forEach(lineItem => {
          if (!lineItem || lineItem.isDiscount) return;
          const key = lineItem.id || lineItem.name;
          const qty = Number(lineItem.quantity || 1);
          const price = Number(lineItem.price || 0);
          
          if (!map[key]) map[key] = { unitsSold: 0, salesRevenue: 0 };
          map[key].unitsSold += qty;
          map[key].salesRevenue += price * qty;
        });
      }
    });
    return map;
  }, [invoices]);

  // --- VALUATION METRICS CALCULATIONS ---
  const stockMetrics = React.useMemo(() => {
    let totalRetail = 0;
    let totalCost = 0;
    let lowStockCount = 0;
    let totalUnitsSold = 0;
    let totalSalesRevenue = 0;

    inventory.forEach(item => {
      const qty = item.stock || 0;
      const price = item.price || 0;
      const cost = item.costPrice || 0;
      const reorder = item.reorderLevel || 5;

      totalRetail += price * qty;
      totalCost += cost * qty;

      if (item.type === 'Hardware' && qty <= reorder) {
        lowStockCount++;
      }

      const salesData = itemSalesMap[item.id] || itemSalesMap[item.name] || { unitsSold: 0, salesRevenue: 0 };
      totalUnitsSold += salesData.unitsSold;
      totalSalesRevenue += salesData.salesRevenue;
    });

    const potentialProfit = totalRetail - totalCost;
    const overallMarginPct = totalRetail > 0 ? Math.round((potentialProfit / totalRetail) * 100) : 0;

    return { totalRetail, totalCost, potentialProfit, overallMarginPct, lowStockCount, totalUnitsSold, totalSalesRevenue };
  }, [inventory, itemSalesMap]);

  const handleExportStockExcel = () => {
    const data = inventory.map(item => {
      const qty = item.stock || 0;
      const price = item.price || 0;
      const cost = item.costPrice || 0;
      const margin = price - cost;
      return {
        'Item Description': item.name,
        'Category': item.type,
        'Selling Price (LKR)': price,
        'Cost Price (LKR)': cost,
        'Unit Margin (LKR)': margin,
        'In Stock': qty,
        'Reorder Level': item.reorderLevel || 5,
        'Total Cost Value (LKR)': cost * qty,
        'Total Retail Value (LKR)': price * qty,
        'Potential Stock Profit (LKR)': margin * qty
      };
    });
    exportToExcel('Stock_Valuation_Report', data);
  };

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
      default: return 'badge-neutral';
    }
  };

  const handleUpdateStock = (id, newStock) => {
    const val = Math.max(0, parseInt(newStock) || 0);
    updateInventoryItem(id, { stock: val });
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Inventory & Stock Management</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Manage product catalog, cost prices, selling margins, and real-time stock balance valuation.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn btn-secondary" 
            style={{ padding: '12px 20px', height: '44px', color: 'var(--success)' }}
            onClick={handleExportStockExcel}
          >
            <FileSpreadsheet size={18} /> Excel Report
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '12px 20px', height: '44px' }}
            onClick={() => generateStockReportPDF(inventory)}
          >
            <Download size={18} /> PDF Report
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 24px', height: '44px' }} 
            onClick={() => { setEditingItem(null); setShowModal(true); }}
          >
            <Plus size={18} /> Register Item
          </button>
        </div>
      </div>

      {/* VALUATION & SALES SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Stock Retail Value
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            LKR {stockMetrics.totalRetail.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Available catalog
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Stock Cost Value
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-display)' }}>
            LKR {stockMetrics.totalCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            At acquisition cost
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Total Sales Units
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
            {stockMetrics.totalUnitsSold} Units
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: 700 }}>
            LKR {stockMetrics.totalSalesRevenue.toLocaleString()} Revenue
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Potential Profit
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
            LKR {stockMetrics.potentialProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '4px', fontWeight: 700 }}>
            {stockMetrics.overallMarginPct}% Margin
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Reorder Alerts
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stockMetrics.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-display)' }}>
            {stockMetrics.lowStockCount} Items
          </div>
          <div style={{ fontSize: '0.7rem', color: stockMetrics.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
            {stockMetrics.lowStockCount > 0 ? 'Requires stock reorder' : 'All stock healthy'}
          </div>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px', 
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
          <TrendingUp size={16} /> Stock & Valuation Table
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '440px', flex: '1 1 auto' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder={`Search ${activeTab === 'catalog' ? 'catalog items' : 'stock balance'}...`}
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Category:</label>
          <select 
            className="form-input" 
            style={{ height: '42px', width: '160px', background: 'var(--subtle-bg)' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Service">Service</option>
          </select>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInventory.length === 0 ? (
            <EmptyState message="No products matching your search criteria." />
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
                  <th>Product Item</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Unit Profit</th>
                  <th>Units Sold (Sales)</th>
                  <th>In Stock</th>
                  <th>Stock Cost</th>
                  <th>Retail Value</th>
                  <th>Potential Profit</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '80px 0' }}>
                      <EmptyState message="No stock items registered." />
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => (
                    <StockRow 
                      key={item.id} 
                      item={item} 
                      salesData={itemSalesMap[item.id] || itemSalesMap[item.name] || { unitsSold: 0, salesRevenue: 0 }}
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

const InventoryCard = ({ item, onEdit, onDelete, getTypeIcon, getTypeBadgeClass }) => {
  const sellingPrice = Number(item.price) || 0;
  const costPrice = Number(item.costPrice) || 0;
  const margin = sellingPrice - costPrice;
  const marginPct = sellingPrice > 0 ? Math.round((margin / sellingPrice) * 100) : 0;
  const isLowStock = item.type === 'Hardware' && (item.stock || 0) <= (item.reorderLevel || 5);

  return (
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
             <h3 className="h3" style={{ fontSize: '1.05rem', marginBottom: '4px', lineHeight: '1.2' }}>{item.name}</h3>
             <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)', opacity: 0.7 }}>PID-{item.id.slice(0, 6).toUpperCase()}</span>
           </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
         <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, minHeight: '36px' }}>
           {item.desc ? (item.desc.length > 90 ? item.desc.substring(0, 90) + '...' : item.desc) : 'No description provided.'}
         </p>
      </div>

      {/* Pricing & Margins Card Box */}
      <div style={{ background: 'var(--subtle-bg)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--subtle-border)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Selling Price:</span>
          <span style={{ fontWeight: 850, color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>LKR {sellingPrice.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Stock Cost Price:</span>
          <span style={{ fontWeight: 700, color: 'var(--warning)' }}>LKR {costPrice.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '4px' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Unit Margin:</span>
          <span style={{ fontWeight: 800, color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            LKR {margin.toLocaleString()} ({marginPct}%)
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
           <span className={`badge ${getTypeBadgeClass(item.type)}`} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
             {item.type}
           </span>
           {isLowStock && (
             <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Low Stock</span>
           )}
         </div>
         
         <div className="flex gap-2">
            <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)' }} onClick={onEdit} title="Edit Item">
              <Edit2 size={15} />
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px', background: 'var(--subtle-bg)', color: 'var(--danger)' }} onClick={onDelete} title="Delete Item">
              <Trash2 size={15} />
            </button>
         </div>
      </div>
    </div>
  );
};

const StockRow = ({ item, salesData = { unitsSold: 0, salesRevenue: 0 }, onUpdateStock, getTypeIcon }) => {
  const sellingPrice = Number(item.price) || 0;
  const costPrice = Number(item.costPrice) || 0;
  const unitProfit = sellingPrice - costPrice;
  const qty = Number(item.stock) || 0;
  const reorderLevel = Number(item.reorderLevel) || 5;

  const totalCost = costPrice * qty;
  const totalRetail = sellingPrice * qty;
  const totalProfit = unitProfit * qty;

  const isOutOfStock = item.type === 'Hardware' && qty === 0;
  const isLowStock = item.type === 'Hardware' && qty > 0 && qty <= reorderLevel;
  const isService = item.type === 'Service' || item.type === 'Software';

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div style={{ padding: '8px', background: 'var(--subtle-bg)', borderRadius: '10px' }}>
            {getTypeIcon(item.type)}
          </div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</span>
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
      <td style={{ fontWeight: 600, color: 'var(--warning)' }}>LKR {costPrice.toLocaleString()}</td>
      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {sellingPrice.toLocaleString()}</td>
      <td style={{ fontWeight: 800, color: unitProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        LKR {unitProfit.toLocaleString()}
      </td>
      <td style={{ fontWeight: 800 }}>
        {salesData.unitsSold > 0 ? (
          <div>
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{salesData.unitsSold} Units</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>LKR {salesData.salesRevenue.toLocaleString()}</div>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0 Sold</span>
        )}
      </td>
      <td>
        {isService ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>N/A (Virtual)</span>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              className="btn-icon" 
              style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--subtle-bg)', fontSize: '1.1rem', cursor: 'pointer', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
              onClick={() => onUpdateStock(item.id, qty - 1)}
            >-</button>
            <input 
              type="number" 
              className="form-input" 
              style={{ width: '60px', height: '30px', textAlign: 'center', fontWeight: 800, fontSize: '0.88rem', padding: 0 }}
              value={qty}
              onChange={(e) => onUpdateStock(item.id, e.target.value)}
            />
            <button 
              className="btn-icon" 
              style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--subtle-bg)', fontSize: '1.1rem', cursor: 'pointer', border: '1px solid var(--panel-border)', color: 'var(--text-primary)' }}
              onClick={() => onUpdateStock(item.id, qty + 1)}
            >+</button>
            
            {isOutOfStock && (
              <span className="badge badge-danger" style={{ fontSize: '0.62rem', marginLeft: '6px' }}>
                <AlertTriangle size={10} /> OUT OF STOCK
              </span>
            )}
            {isLowStock && (
              <span className="badge badge-warning" style={{ fontSize: '0.62rem', marginLeft: '6px' }}>
                LOW STOCK (≤{reorderLevel})
              </span>
            )}
          </div>
        )}
      </td>
      <td style={{ fontWeight: 700, color: 'var(--warning)' }}>
        {isService ? '-' : `LKR ${totalCost.toLocaleString()}`}
      </td>
      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
        {isService ? '-' : `LKR ${totalRetail.toLocaleString()}`}
      </td>
      <td style={{ fontWeight: 800, color: 'var(--success)' }}>
        {isService ? '-' : `LKR ${totalProfit.toLocaleString()}`}
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onUpdateStock(item.id, qty)}>Save</button>
      </td>
    </tr>
  );
};

const EmptyState = ({ message }) => (
  <div className="glass-panel col-span-full flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
      <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
    </div>
    <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Items Found</h3>
    <p className="text-secondary" style={{ fontSize: '0.95rem' }}>{message}</p>
  </div>
);

const InventoryModal = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || { 
    name: '', 
    type: 'Hardware', 
    price: 0, 
    costPrice: 0,
    reorderLevel: 5,
    stock: 0, 
    desc: '' 
  });

  const sellingPrice = Number(formData.price) || 0;
  const costPrice = Number(formData.costPrice) || 0;
  const calculatedMargin = sellingPrice - costPrice;
  const calculatedMarginPct = sellingPrice > 0 ? Math.round((calculatedMargin / sellingPrice) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
           <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>{initialData ? 'Update Specifications' : 'Register Product Item'}</h2>
           <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="modal-body">
          <div className="form-group mb-4">
            <label className="form-label">Product Commercial Name</label>
            <input required type="text" className="form-input" style={{ height: '42px' }} placeholder="e.g. Turnstile Gate Reader / Gym POS Software" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Classification Category</label>
            <select className="form-input" style={{ height: '42px', width: '100%' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Hardware">Hardware / Terminal</option>
              <option value="Software">Software Solution</option>
              <option value="Service">Professional Service</option>
            </select>
          </div>

          {/* Pricing & Cost Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group mb-0">
              <label className="form-label">Cost Price (LKR)</label>
              <input required type="number" className="form-input" style={{ height: '42px' }} placeholder="Unit acquisition cost" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Selling Price (LKR)</label>
              <input required type="number" className="form-input" style={{ height: '42px' }} placeholder="Unit selling price" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
            </div>
          </div>

          {/* Calculated Margin Live Indicator */}
          <div style={{ background: 'var(--subtle-bg)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calculated Unit Profit Margin:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: calculatedMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              LKR {calculatedMargin.toLocaleString()} ({calculatedMarginPct}%)
            </span>
          </div>

          {/* Stock & Reorder Level Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group mb-0">
              <label className="form-label">Initial Stock Quantity</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ height: '42px' }} 
                disabled={formData.type === 'Service' || formData.type === 'Software'}
                value={formData.stock || 0} 
                onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Low Stock Alert Level</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ height: '42px' }} 
                disabled={formData.type === 'Service' || formData.type === 'Software'}
                value={formData.reorderLevel || 5} 
                onChange={e => setFormData({...formData, reorderLevel: Number(e.target.value)})} 
              />
            </div>
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Product Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '90px', resize: 'vertical', padding: '12px' }}
              placeholder="Specify product details or warranty info..."
              value={formData.desc || ''} 
              onChange={e => setFormData({...formData, desc: e.target.value})} 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
