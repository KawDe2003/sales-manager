import React, { useContext, useState } from 'react';
import { 
  ShoppingBag, Truck, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, ArrowUpRight, DollarSign, PackageCheck, Building2, 
  Trash2, Edit, X, ArrowRight, RefreshCw, FileText
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';

const Procurement = () => {
  const { 
    suppliers = [], addSupplier, updateSupplier, deleteSupplier,
    purchaseOrders = [], addPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder,
    inventory = [], confirmAction, showNotification
  } = useContext(StoreContext) || {};

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers' | 'reorder'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // New PO Form State
  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDelivery: '',
    status: 'Ordered',
    items: [{ name: '', quantity: 1, unitCost: 0 }]
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'Fitness Equipment',
    address: ''
  });

  // Calculate Metrics
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  const pendingDeliveries = purchaseOrders.filter(po => po.status === 'Ordered').length;
  const activeSuppliersCount = suppliers.length;
  const lowStockItems = inventory.filter(item => (Number(item.stock) || 0) <= (Number(item.reorderLevel) || 5));

  // Filter Purchase Orders
  const filteredPOs = purchaseOrders.filter(po => {
    const searchMatch = (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (po.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'All' || po.status === statusFilter;
    return searchMatch && statusMatch;
  });

  // Filter Suppliers
  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // PO Line Items Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...poForm.items];
    updated[index][field] = value;
    setPoForm({ ...poForm, items: updated });
  };

  const addPOLineItem = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { name: '', quantity: 1, unitCost: 0 }]
    });
  };

  const removePOLineItem = (index) => {
    if (poForm.items.length <= 1) return;
    setPoForm({
      ...poForm,
      items: poForm.items.filter((_, idx) => idx !== index)
    });
  };

  const calculatePOTotal = () => {
    return poForm.items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const c = Number(item.unitCost) || 0;
      return sum + (q * c);
    }, 0);
  };

  const handleSavePO = (e) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      showNotification('Please select a supplier', 'error');
      return;
    }

    const supplier = suppliers.find(s => s.id === poForm.supplierId);
    const lineItems = poForm.items
      .filter(it => it.name.trim())
      .map(it => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unitCost: Number(it.unitCost) || 0,
        totalCost: (Number(it.quantity) || 1) * (Number(it.unitCost) || 0)
      }));

    if (lineItems.length === 0) {
      showNotification('Please add at least one line item with a valid name', 'error');
      return;
    }

    addPurchaseOrder({
      supplierId: poForm.supplierId,
      supplierName: supplier ? supplier.name : 'Unknown Supplier',
      expectedDelivery: poForm.expectedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: poForm.status,
      totalAmount: calculatePOTotal(),
      items: lineItems
    });

    setShowPOModal(false);
    setPoForm({
      supplierId: '',
      expectedDelivery: '',
      status: 'Ordered',
      items: [{ name: '', quantity: 1, unitCost: 0 }]
    });
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showNotification('Please enter supplier name', 'error');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
    } else {
      addSupplier(supplierForm);
    }

    setShowSupplierModal(false);
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      category: 'Fitness Equipment',
      address: ''
    });
  };

  const openReorderForInventoryItem = (invItem) => {
    let matchedSupplier = suppliers[0];
    setPoForm({
      supplierId: matchedSupplier ? matchedSupplier.id : '',
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Ordered',
      items: [{
        name: invItem.name,
        quantity: Math.max(5, (Number(invItem.reorderLevel) || 5) * 2),
        unitCost: Number(invItem.costPrice || invItem.price * 0.7) || 0
      }]
    });
    setShowPOModal(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      
      {/* ===== HERO HEADER ===== */}
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)'
              }}>
                <ShoppingBag size={20} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                Procurement & Purchase Orders
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Supplier management, PO replenishment tracking, and Accounts Payable automation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', category: 'Fitness Equipment', address: '' });
                setEditingSupplier(null);
                setShowSupplierModal(true);
              }}
            >
              <Building2 size={16} /> Add Supplier
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setPoForm({
                  supplierId: suppliers[0]?.id || '',
                  expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  status: 'Ordered',
                  items: [{ name: '', quantity: 1, unitCost: 0 }]
                });
                setShowPOModal(true);
              }}
            >
              <Plus size={16} /> Create PO
            </button>
          </div>
        </div>
      </div>

      {/* ===== KPI OVERVIEW CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--accent-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TOTAL PROCUREMENT</span>
            <ShoppingBag size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            LKR {totalPOValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {purchaseOrders.length} Total Purchase Orders
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--warning)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PENDING DELIVERIES</span>
            <Truck size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--warning)' }}>
            {pendingDeliveries} Orders
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Awaiting supplier dispatch
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--success)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACTIVE SUPPLIERS</span>
            <Building2 size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeSuppliersCount} Vendors
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Registered supply partners
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--danger)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>LOW STOCK ALERT</span>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: lowStockItems.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {lowStockItems.length} Products
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Requires stock replenishment
          </div>
        </div>
      </div>

      {/* ===== TABS & SEARCH BAR ===== */}
      <div className="glass-panel mb-6" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--subtle-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            <button 
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'orders' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'orders' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button 
              onClick={() => setActiveTab('suppliers')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'suppliers' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'suppliers' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'suppliers' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Suppliers Directory ({suppliers.length})
            </button>
            <button 
              onClick={() => setActiveTab('reorder')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'reorder' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'reorder' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'reorder' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              Reorder Assistant
              {lowStockItems.length > 0 && (
                <span style={{ background: 'var(--danger)', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                  {lowStockItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3 width-full md:width-auto">
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search POs, Suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {activeTab === 'orders' && (
              <CustomSelect 
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Ordered', label: 'Ordered' },
                  { value: 'Received', label: 'Received' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Cancelled', label: 'Cancelled' }
                ]}
                style={{ height: '38px', width: '150px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== TAB 1: PURCHASE ORDERS ===== */}
      {activeTab === 'orders' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO NUMBER</th>
                  <th>SUPPLIER</th>
                  <th>DATE</th>
                  <th>EXPECTED DELIVERY</th>
                  <th>ITEMS</th>
                  <th>TOTAL AMOUNT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      No purchase orders found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map(po => {
                    const isReceived = po.status === 'Received';
                    const isOrdered = po.status === 'Ordered';

                    return (
                      <tr key={po.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {po.poNumber}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{po.supplierName}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {po.date ? new Date(po.date).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {po.items ? po.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            LKR {(Number(po.totalAmount) || 0).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${
                            isReceived ? 'status-paid' :
                            isOrdered ? 'status-sent' :
                            po.status === 'Cancelled' ? 'status-declined' : 'status-draft'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => setViewingPO(po)}
                              title="Print / View Purchase Order"
                            >
                              <FileText size={14} /> Print PO
                            </button>
                            {!isReceived && po.status !== 'Cancelled' && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                                onClick={() => updatePurchaseOrderStatus(po.id, 'Received')}
                                title="Mark Goods Received & Replenish Stock"
                              >
                                <PackageCheck size={14} /> Receive
                              </button>
                            )}
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)', padding: '6px' }}
                              onClick={() => {
                                confirmAction({
                                  title: 'Delete Purchase Order',
                                  message: `Are you sure you want to remove Purchase Order ${po.poNumber}?`,
                                  onConfirm: () => deletePurchaseOrder(po.id)
                                });
                              }}
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
        </div>
      )}

      {/* ===== TAB 2: SUPPLIERS DIRECTORY ===== */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No suppliers found. Click "Add Supplier" to register your vendor list.
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="glass-panel hover-lift" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {supplier.name}
                    </h3>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                      {supplier.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px' }}
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setSupplierForm({ ...supplier });
                        setShowSupplierModal(true);
                      }}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px', color: 'var(--danger)' }}
                      onClick={() => {
                        confirmAction({
                          title: 'Remove Supplier',
                          message: `Are you sure you want to remove supplier "${supplier.name}"?`,
                          onConfirm: () => deleteSupplier(supplier.id)
                        });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Contact:</strong> {supplier.contactPerson || '-'}</div>
                  <div><strong>Phone:</strong> {supplier.phone || '-'}</div>
                  <div><strong>Email:</strong> {supplier.email || '-'}</div>
                  <div><strong>Address:</strong> {supplier.address || '-'}</div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--subtle-border)', display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {purchaseOrders.filter(po => po.supplierId === supplier.id).length} Orders Issued
                  </span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setPoForm({
                        supplierId: supplier.id,
                        expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                        status: 'Ordered',
                        items: [{ name: '', quantity: 1, unitCost: 0 }]
                      });
                      setShowPOModal(true);
                    }}
                  >
                    <Plus size={13} /> Order Stock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== TAB 3: LOW STOCK REORDER ASSISTANT ===== */}
      {activeTab === 'reorder' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStockItems.length === 0 ? (
            <div className="col-span-full glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>All Inventory Stocks Healthy!</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>No items currently fall below reorder thresholds.</p>
            </div>
          ) : (
            lowStockItems.map(item => (
              <div key={item.id} className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {item.type}</span>
                  </div>
                  <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}>
                    Stock: {item.stock} left
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Reorder Threshold:</strong> {item.reorderLevel || 5} units</div>
                  <div><strong>Est. Cost Price:</strong> LKR {(Number(item.costPrice || item.price * 0.7) || 0).toLocaleString()}</div>
                </div>

                <button 
                  className="btn btn-primary"
                  style={{ marginTop: 'auto' }}
                  onClick={() => openReorderForInventoryItem(item)}
                >
                  <RefreshCw size={14} /> Auto-Generate Purchase Order
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== MODAL: CREATE / EDIT PURCHASE ORDER ===== */}
      {showPOModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '680px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Issue Purchase Order
              </h3>
              <button onClick={() => setShowPOModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePO} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">SELECT SUPPLIER *</label>
                  <CustomSelect 
                    value={poForm.supplierId}
                    onChange={(val) => setPoForm({ ...poForm, supplierId: val })}
                    options={suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))}
                  />
                </div>
                <div>
                  <label className="form-label">EXPECTED DELIVERY DATE</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={poForm.expectedDelivery}
                    onChange={(e) => setPoForm({ ...poForm, expectedDelivery: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label" style={{ margin: 0 }}>ORDER LINE ITEMS *</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addPOLineItem}>
                    <Plus size={13} /> Add Item Line
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Item / Equipment Name"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        style={{ width: '80px' }}
                      />
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="Unit Cost Price (LKR)"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                        style={{ width: '160px' }}
                      />
                      {poForm.items.length > 1 && (
                        <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '8px' }} onClick={() => removePOLineItem(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Estimated Total Order Value:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  LKR {calculatePOTotal().toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Issue Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: ADD / EDIT SUPPLIER ===== */}
      {showSupplierModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px', padding: 0, borderRadius: '20px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
            animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{ width: '100%' }}>
                <label className="form-label">SUPPLIER / COMPANY NAME *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. TechnoGym Sri Lanka"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">CONTACT PERSON</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Contact Name"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">CATEGORY</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Fitness Equipment"
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">PHONE NUMBER</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="011XXXXXXX"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    className="form-input"
                    placeholder="supplier@company.lk"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ width: '100%' }}>
                <label className="form-label">BUSINESS ADDRESS</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Street, City, Postal Code"
                  rows="2"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Save Changes' : 'Register Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PRINT / VIEW PURCHASE ORDER ===== */}
      {viewingPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '640px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', background: '#ffffff', color: '#1e293b'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-2">
                <div style={{ background: '#059669', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>G</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>OFFICIAL PURCHASE ORDER</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>#{viewingPO.poNumber}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewingPO(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ISSUED TO (SUPPLIER)</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginTop: '4px' }}>{viewingPO.supplierName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ORDER DATE & EXPECTED</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>Date: {viewingPO.date}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Expected: {viewingPO.expectedDelivery}</div>
                </div>
              </div>

              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>ITEM DESCRIPTION</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>QTY</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>UNIT COST</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>LINE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPO.items && viewingPO.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>LKR {(Number(item.unitCost) || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>LKR {((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#475569' }}>Total Purchase Order Value:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>LKR {(Number(viewingPO.totalAmount) || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Procurement;
