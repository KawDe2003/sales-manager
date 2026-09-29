import React, { useContext, useState } from 'react';
import { 
  ShoppingBag, Truck, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, ArrowUpRight, DollarSign, PackageCheck, Building2, 
  Trash2, Edit, X, ArrowRight, RefreshCw, FileText, Printer, Download,
  MessageSquare, Share2, Copy, Check, ExternalLink, Send, Smartphone, SendHorizontal
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';
import { generatePurchaseOrderPDF } from '../utils/pdfGenerator';

const Procurement = () => {
  const { 
    suppliers = [], addSupplier, updateSupplier, deleteSupplier,
    purchaseOrders = [], addPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder,
    inventory = [], confirmAction, showNotification, smsConfig = {}, sendDirectSMS
  } = useContext(StoreContext) || {};

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers' | 'reorder'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [newlyCreatedPO, setNewlyCreatedPO] = useState(null); // Post-creation WhatsApp share modal
  const [smsModalPO, setSmsModalPO] = useState(null); // Send SMS modal
  const [customSmsPhone, setCustomSmsPhone] = useState('');
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  // New PO Form State
  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDelivery: '',
    status: 'Ordered',
    applyVat: false,
    vatRate: 18,
    items: [{ name: '', quantity: 1, unitCost: 0 }]
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'Hair Pin Raw Materials & Supplies',
    address: '',
    isVatRegistered: false,
    vatNumber: '',
    vatRate: 18
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

  // WhatsApp & Link Sharing Helpers
  const formatPhoneForWhatsApp = (rawPhone) => {
    if (!rawPhone) return '';
    let digits = String(rawPhone).replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      digits = '94' + digits.substring(1);
    } else if (digits.length === 9) {
      digits = '94' + digits;
    }
    return digits;
  };

  const getPoShareUrl = (po) => {
    return `${window.location.origin}/share/po/${po.shareKey || po.id}`;
  };

  const sendPOViaWhatsApp = (po) => {
    const matchedSup = suppliers.find(s => s.id === po.supplierId);
    const phone = formatPhoneForWhatsApp(po.supplierPhone || matchedSup?.phone);
    const shareUrl = getPoShareUrl(po);
    const subtotal = Number(po.subtotal != null ? po.subtotal : (
      (po.items || []).reduce((acc, it) => acc + ((Number(it.quantity) || 1) * (Number(it.unitCost) || 0)), 0)
    ));
    const hasVat = Boolean(po.applyVat);
    const vatRate = Number(po.vatRate != null ? po.vatRate : 18);
    const vatAmount = Number(po.vatAmount != null ? po.vatAmount : (hasVat ? Math.round(subtotal * (vatRate / 100)) : 0));
    const total = Number(po.totalAmount || (subtotal + vatAmount));

    const itemsSummary = (po.items || []).map((it, idx) => 
      `${idx + 1}. *${it.name}* (Qty: ${it.quantity} @ LKR ${(Number(it.unitCost) || 0).toLocaleString()})`
    ).join('\n');

    const vatBreakdown = hasVat 
      ? `• *Subtotal:* LKR ${subtotal.toLocaleString()}\n• *VAT (${vatRate}%):* LKR ${vatAmount.toLocaleString()}${po.supplierVatNumber ? ` (VAT Reg: ${po.supplierVatNumber})` : ''}\n• *Grand Total:* LKR ${total.toLocaleString()}`
      : `• *Total Order Value (Non-VAT):* LKR ${total.toLocaleString()}`;

    const senderCompanyName = smsConfig?.companyName || 'Hair Pins & Accessories Manufacturing Co.';

    const message = `*OFFICIAL PURCHASE ORDER #${po.poNumber}*
From: *${senderCompanyName}*
To: *${po.supplierName || matchedSup?.name || 'Valued Supplier'}*
Date: ${po.date || new Date().toISOString().split('T')[0]}
Expected Delivery: ${po.expectedDelivery || 'As agreed'}

*Order Items:*
${itemsSummary || 'See official PO link'}

-----------------------------------
${vatBreakdown}
-----------------------------------

📄 *View & Download Official PO Online:*
${shareUrl}

Please confirm receipt of this order and acknowledge your dispatch schedule. Thank you!`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    showNotification?.('Opening WhatsApp to send Purchase Order...', 'info');
  };

  const copyPOLink = (po) => {
    const url = getPoShareUrl(po);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showNotification?.('Purchase Order share link copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy this PO share link:', url);
      });
    } else {
      prompt('Copy this PO share link:', url);
    }
  };

  // SMS Generation & Dispatch Helpers
  const getPoSmsMessage = (po) => {
    const senderCompanyName = smsConfig?.companyName || 'Hair Pins & Accessories Co.';
    const shareUrl = getPoShareUrl(po);
    const total = Number(po.totalAmount || 0).toLocaleString();
    const vatNote = po.applyVat ? ` (incl. ${po.vatRate || 18}% VAT)` : '';
    return `PO #${po.poNumber} from ${senderCompanyName}. Total: LKR ${total}${vatNote}. View official PO: ${shareUrl}`;
  };

  const handleOpenSmsModal = (po) => {
    const matchedSup = suppliers.find(s => s.id === po.supplierId);
    const phone = po.supplierPhone || matchedSup?.phone || '';
    setCustomSmsPhone(phone);
    setCustomSmsMessage(getPoSmsMessage(po));
    setSmsModalPO(po);
  };

  const handleSendGatewaySms = async () => {
    if (!customSmsPhone.trim()) {
      showNotification?.('Please enter a valid recipient phone number.', 'error');
      return;
    }
    setSendingSms(true);
    try {
      if (sendDirectSMS) {
        const cleanPhone = customSmsPhone.replace(/[^0-9]/g, '');
        const res = await sendDirectSMS(cleanPhone, customSmsMessage);
        if (res && res.success !== false) {
          showNotification?.(`Purchase Order SMS sent to ${customSmsPhone}!`, 'success');
          setSmsModalPO(null);
        }
      } else {
        openNativeSmsApp(customSmsPhone, customSmsMessage);
        setSmsModalPO(null);
      }
    } catch (err) {
      console.error('Failed to send SMS:', err);
      showNotification?.('Gateway send issue. Opening device SMS app...', 'warning');
      openNativeSmsApp(customSmsPhone, customSmsMessage);
    } finally {
      setSendingSms(false);
    }
  };

  const openNativeSmsApp = (phone, text) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${cleanPhone}${separator}body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

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

  // Live VAT Calculations for New PO Form
  const calculatePOSubtotal = () => {
    return poForm.items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const c = Number(item.unitCost) || 0;
      return sum + (q * c);
    }, 0);
  };

  const calculatePOVatAmount = () => {
    if (!poForm.applyVat) return 0;
    const subtotal = calculatePOSubtotal();
    const rate = Number(poForm.vatRate) || 0;
    return Math.round(subtotal * (rate / 100));
  };

  const calculatePOTotal = () => {
    return calculatePOSubtotal() + calculatePOVatAmount();
  };

  // Automatically update VAT state when supplier changes
  const handleSupplierChange = (supId) => {
    const matched = suppliers.find(s => s.id === supId);
    setPoForm(prev => ({
      ...prev,
      supplierId: supId,
      applyVat: matched ? Boolean(matched.isVatRegistered) : false,
      vatRate: matched?.vatRate != null ? Number(matched.vatRate) : 18
    }));
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

    const subtotal = calculatePOSubtotal();
    const vatAmount = calculatePOVatAmount();
    const totalAmount = calculatePOTotal();

    const createdPO = addPurchaseOrder({
      supplierId: poForm.supplierId,
      supplierName: supplier ? supplier.name : 'Unknown Supplier',
      supplierPhone: supplier?.phone || '',
      supplierEmail: supplier?.email || '',
      supplierAddress: supplier?.address || '',
      supplierContact: supplier?.contactPerson || '',
      supplierVatNumber: supplier?.vatNumber || '',
      isVatRegistered: Boolean(supplier?.isVatRegistered),
      expectedDelivery: poForm.expectedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: poForm.status,
      subtotal,
      applyVat: poForm.applyVat,
      vatRate: Number(poForm.vatRate) || 18,
      vatAmount,
      totalAmount,
      items: lineItems
    });

    setShowPOModal(false);
    if (createdPO) {
      setNewlyCreatedPO(createdPO);
    }

    setPoForm({
      supplierId: '',
      expectedDelivery: '',
      status: 'Ordered',
      applyVat: false,
      vatRate: 18,
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
                setSupplierForm({ 
                  name: '', 
                  contactPerson: '', 
                  phone: '', 
                  email: '', 
                  category: 'Hair Pin Raw Materials & Supplies', 
                  address: '',
                  isVatRegistered: false,
                  vatNumber: '',
                  vatRate: 18
                });
                setEditingSupplier(null);
                setShowSupplierModal(true);
              }}
            >
              <Building2 size={16} /> Add Supplier
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                const firstSup = suppliers[0];
                setPoForm({
                  supplierId: firstSup?.id || '',
                  expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  status: 'Ordered',
                  applyVat: Boolean(firstSup?.isVatRegistered),
                  vatRate: firstSup?.vatRate != null ? Number(firstSup.vatRate) : 18,
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
                          <div style={{ marginTop: '2px' }}>
                            {po.applyVat ? (
                              <span style={{ 
                                fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', 
                                background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', 
                                fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'inline-flex', alignItems: 'center', gap: '3px'
                              }}>
                                <Check size={10} /> VAT {po.vatRate || 18}% (+LKR {(Number(po.vatAmount) || 0).toLocaleString()})
                              </span>
                            ) : (
                              <span style={{ 
                                fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', 
                                background: 'var(--subtle-bg)', color: 'var(--text-muted)' 
                              }}>
                                Non-VAT
                              </span>
                            )}
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
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button 
                              className="btn btn-sm"
                              style={{ 
                                background: '#25D366', color: '#ffffff', border: 'none', 
                                padding: '5px 8px', display: 'inline-flex', alignItems: 'center', 
                                gap: '4px', fontWeight: 700, fontSize: '0.78rem' 
                              }}
                              onClick={() => sendPOViaWhatsApp(po)}
                              title="Send Purchase Order & Link via WhatsApp to Supplier"
                            >
                              <MessageSquare size={13} /> WhatsApp
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.78rem' }}
                              onClick={() => handleOpenSmsModal(po)}
                              title="Send SMS to Supplier Phone"
                            >
                              <Smartphone size={13} style={{ color: 'var(--accent-primary)' }} /> SMS
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px' }}
                              onClick={() => copyPOLink(po)}
                              title="Copy PO Web Share Link"
                            >
                              <Copy size={13} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => setViewingPO(po)}
                              title="View Purchase Order Details"
                            >
                              <FileText size={14} /> View
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                        {supplier.category}
                      </span>
                      {supplier.isVatRegistered ? (
                        <span style={{ 
                          fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', 
                          background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', 
                          border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '3px' 
                        }}>
                          <Check size={11} /> VAT Reg ({supplier.vatRate || 18}%)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: 'var(--subtle-bg)', color: 'var(--text-muted)' }}>
                          Non-VAT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px' }}
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setSupplierForm({ 
                          ...supplier,
                          isVatRegistered: Boolean(supplier.isVatRegistered),
                          vatNumber: supplier.vatNumber || '',
                          vatRate: supplier.vatRate != null ? supplier.vatRate : 18
                        });
                        setShowSupplierModal(true);
                      }}
                      title="Edit Supplier Profile"
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
                      title="Delete Supplier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Contact:</strong> {supplier.contactPerson || '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span><strong>Phone:</strong> {supplier.phone || '-'}</span>
                    {supplier.phone && (
                      <>
                        <a 
                          href={`https://wa.me/${formatPhoneForWhatsApp(supplier.phone)}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ 
                            color: '#25D366', display: 'inline-flex', alignItems: 'center', 
                            gap: '3px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' 
                          }}
                          title="Chat with Supplier on WhatsApp"
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                        <a 
                          href={`sms:${supplier.phone.replace(/[^0-9]/g, '')}`} 
                          style={{ 
                            color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', 
                            gap: '3px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' 
                          }}
                          title="Send SMS to Supplier"
                        >
                          <Smartphone size={12} /> SMS
                        </a>
                      </>
                    )}
                  </div>
                  <div><strong>Email:</strong> {supplier.email || '-'}</div>
                  {supplier.isVatRegistered && supplier.vatNumber && (
                    <div>
                      <strong>VAT Reg No:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{supplier.vatNumber}</span>
                    </div>
                  )}
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
                        applyVat: Boolean(supplier.isVatRegistered),
                        vatRate: supplier.vatRate != null ? Number(supplier.vatRate) : 18,
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
                    onChange={handleSupplierChange}
                    options={suppliers.map(s => ({ 
                      value: s.id, 
                      label: `${s.name} ${s.isVatRegistered ? '🟢 (VAT Reg)' : '⚪ (Non-VAT)'}` 
                    }))}
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

              {/* VAT Registration & Tax Setting */}
              {(() => {
                const currentSupplier = suppliers.find(s => s.id === poForm.supplierId);
                return (
                  <div style={{
                    background: poForm.applyVat ? 'rgba(16, 185, 129, 0.08)' : 'var(--subtle-bg)',
                    border: poForm.applyVat ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--subtle-border)',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}>
                    <label className="flex items-center gap-3 cursor-pointer" style={{ margin: 0 }}>
                      <input 
                        type="checkbox"
                        checked={poForm.applyVat}
                        onChange={(e) => setPoForm({ ...poForm, applyVat: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          Include VAT on this Purchase Order
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {currentSupplier?.isVatRegistered 
                            ? `🟢 Supplier is VAT Registered: ${currentSupplier.vatNumber || 'Active'}` 
                            : '⚪ Supplier profile is Non-VAT (check box if you wish to apply VAT)'}
                        </div>
                      </div>
                    </label>

                    {poForm.applyVat && (
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VAT Rate:</span>
                        <div style={{ position: 'relative', width: '90px' }}>
                          <input 
                            type="number"
                            className="form-input"
                            style={{ paddingRight: '22px', textAlign: 'right', fontWeight: 800, height: '36px' }}
                            value={poForm.vatRate}
                            onChange={(e) => setPoForm({ ...poForm, vatRate: Number(e.target.value) || 0 })}
                          />
                          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {/* Order Cost Breakdown Box */}
              <div style={{ background: 'var(--subtle-bg)', padding: '16px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--subtle-border)' }}>
                <div className="flex justify-between items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Items Subtotal:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>LKR {calculatePOSubtotal().toLocaleString()}</span>
                </div>
                
                {poForm.applyVat ? (
                  <div className="flex justify-between items-center text-sm" style={{ color: 'var(--success)' }}>
                    <span style={{ fontWeight: 700 }}>VAT ({poForm.vatRate}%):</span>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>+ LKR {calculatePOVatAmount().toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Tax:</span>
                    <span>Non-VAT / Exempt (LKR 0)</span>
                  </div>
                )}

                <div style={{ height: '1px', background: 'var(--subtle-border)', margin: '4px 0' }}></div>

                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Estimated Total Order Value:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    LKR {calculatePOTotal().toLocaleString()}
                  </span>
                </div>
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

              {/* VAT Registration Section for Supplier */}
              <div style={{
                background: supplierForm.isVatRegistered ? 'rgba(16, 185, 129, 0.08)' : 'var(--subtle-bg)',
                border: supplierForm.isVatRegistered ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--subtle-border)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}>
                <label className="flex items-center gap-3 cursor-pointer" style={{ margin: 0 }}>
                  <input 
                    type="checkbox"
                    checked={supplierForm.isVatRegistered}
                    onChange={(e) => setSupplierForm({ ...supplierForm, isVatRegistered: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      Supplier is VAT Registered
                    </span>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      If checked, system will automatically include and calculate VAT whenever issuing POs to this supplier.
                    </p>
                  </div>
                </label>

                {supplierForm.isVatRegistered && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginTop: '2px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>VAT REGISTRATION NO. *</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. VAT-102938475-7000"
                        value={supplierForm.vatNumber}
                        onChange={(e) => setSupplierForm({ ...supplierForm, vatNumber: e.target.value })}
                        required={supplierForm.isVatRegistered}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>DEFAULT VAT RATE (%)</label>
                      <input 
                        type="number"
                        className="form-input"
                        placeholder="18"
                        value={supplierForm.vatRate}
                        onChange={(e) => setSupplierForm({ ...supplierForm, vatRate: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Save Changes' : 'Register Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: POST-CREATION WHATSAPP & LINK SHARE POPUP ===== */}
      {newlyCreatedPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '20px', animation: 'backdropFade 0.16s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '540px', padding: 0, borderRadius: '24px',
            border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            animation: 'modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)', background: 'var(--panel-bg)'
          }}>
            <div style={{ padding: '28px 24px', textAlign: 'center', borderBottom: '1px solid var(--subtle-border)' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px auto', color: 'var(--success)'
              }}>
                <CheckCircle2 size={36} />
              </div>
              
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Purchase Order #{newlyCreatedPO.poNumber} Issued!
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                Issued to <strong>{newlyCreatedPO.supplierName}</strong> • Total: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>LKR {(Number(newlyCreatedPO.totalAmount) || 0).toLocaleString()}</strong> {newlyCreatedPO.applyVat ? `(incl. ${newlyCreatedPO.vatRate}% VAT)` : '(Non-VAT)'}
              </p>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'var(--subtle-bg)', padding: '14px 16px', borderRadius: '12px',
                border: '1px solid var(--subtle-border)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '10px'
              }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {getPoShareUrl(newlyCreatedPO)}
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => copyPOLink(newlyCreatedPO)}
                >
                  <Copy size={13} /> Copy Link
                </button>
              </div>

              {/* 1-Tap Actions: WhatsApp & SMS Directly to Supplier */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <button 
                  onClick={() => sendPOViaWhatsApp(newlyCreatedPO)}
                  className="btn"
                  style={{ 
                    background: '#25D366', borderColor: '#25D366', color: '#ffffff', 
                    height: '46px', fontSize: '0.92rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                  title="Share PO via WhatsApp"
                >
                  <MessageSquare size={17} /> Send via WhatsApp
                </button>
                <button 
                  onClick={() => handleOpenSmsModal(newlyCreatedPO)}
                  className="btn btn-primary"
                  style={{ 
                    height: '46px', fontSize: '0.92rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                  title="Send PO details via SMS"
                >
                  <Smartphone size={17} /> Send via SMS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="btn btn-secondary"
                  onClick={() => generatePurchaseOrderPDF(newlyCreatedPO)}
                  style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Download size={15} /> Download PDF
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setViewingPO(newlyCreatedPO);
                    setNewlyCreatedPO(null);
                  }}
                  style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FileText size={15} /> View PO
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setNewlyCreatedPO(null)}
                  style={{ color: 'var(--text-muted)' }}
                >
                  Done / Close
                </button>
              </div>
            </div>
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
            width: '100%', maxWidth: '720px', padding: 0, borderRadius: '24px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', background: 'var(--card-bg)', color: 'var(--text-primary)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px', background: 'var(--subtle-bg)'
            }}>
              <div className="flex items-center gap-2.5">
                <div style={{
                  background: 'var(--accent-primary)', color: '#ffffff',
                  width: '38px', height: '38px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}>P</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    OFFICIAL PURCHASE ORDER
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    #{viewingPO.poNumber}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  className="btn btn-sm" 
                  style={{ background: '#25D366', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                  onClick={() => sendPOViaWhatsApp(viewingPO)}
                  title="Send via WhatsApp"
                >
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                  onClick={() => handleOpenSmsModal(viewingPO)}
                  title="Send via SMS to Supplier"
                >
                  <Smartphone size={14} style={{ color: 'var(--accent-primary)' }} /> SMS
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyPOLink(viewingPO)}
                  title="Copy Link"
                >
                  <Copy size={14} /> Copy Link
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => generatePurchaseOrderPDF(viewingPO)} 
                  title="Download as PDF"
                >
                  <Download size={14} /> PDF
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setViewingPO(null)}
                  style={{ padding: '6px' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px dashed var(--subtle-border)', paddingBottom: '18px',
                flexWrap: 'wrap', gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ISSUED TO (SUPPLIER)
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {viewingPO.supplierName}
                  </div>
                  {viewingPO.supplierPhone && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Phone: <span style={{ fontFamily: 'var(--font-mono)' }}>{viewingPO.supplierPhone}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    {viewingPO.applyVat ? (
                      <span style={{ 
                        background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '3px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', gap: '5px'
                      }}>
                        <Check size={12} /> VAT Registered {viewingPO.supplierVatNumber ? `(${viewingPO.supplierVatNumber})` : ''}
                      </span>
                    ) : (
                      <span style={{
                        background: 'var(--subtle-bg)', color: 'var(--text-muted)',
                        border: '1px solid var(--subtle-border)',
                        padding: '3px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700
                      }}>
                        Non-VAT Supplier
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ORDER DETAILS
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    Date: <span style={{ fontFamily: 'var(--font-mono)' }}>{viewingPO.date}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Expected: <span style={{ fontFamily: 'var(--font-mono)' }}>{viewingPO.expectedDelivery}</span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800,
                      background: viewingPO.status === 'Received' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: viewingPO.status === 'Received' ? 'var(--success)' : 'var(--accent-primary)',
                      border: `1px solid ${viewingPO.status === 'Received' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                    }}>
                      Status: {viewingPO.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table Container */}
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--subtle-border)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em' }}>ITEM DESCRIPTION</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em' }}>QTY</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em' }}>UNIT COST</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>LINE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPO.items && viewingPO.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: i === viewingPO.items.length - 1 ? 'none' : '1px solid var(--subtle-border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>LKR {(Number(item.unitCost) || 0).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          LKR {((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Financial Breakdown */}
              <div style={{ background: 'var(--subtle-bg)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--subtle-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    LKR {(Number(viewingPO.subtotal != null ? viewingPO.subtotal : viewingPO.totalAmount) || 0).toLocaleString()}
                  </span>
                </div>

                {viewingPO.applyVat ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--success)' }}>
                    <span style={{ fontWeight: 700 }}>VAT ({viewingPO.vatRate || 18}%):</span>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      + LKR {(Number(viewingPO.vatAmount) || 0).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>VAT Status:</span>
                    <span>Non-VAT / Exempt (LKR 0)</span>
                  </div>
                )}

                <div style={{ height: '1px', background: 'var(--subtle-border)', margin: '4px 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>Total Purchase Order Value:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    LKR {(Number(viewingPO.totalAmount) || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: SEND PURCHASE ORDER VIA SMS ===== */}
      {smsModalPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px', padding: 0, borderRadius: '22px',
            overflow: 'hidden', border: '1px solid var(--panel-border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)', background: 'var(--card-bg)'
          }}>
            <div style={{
              padding: '18px 22px', borderBottom: '1px solid var(--subtle-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--subtle-bg)'
            }}>
              <div className="flex items-center gap-2">
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>Send PO via SMS</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PO #{smsModalPO.poNumber} • {smsModalPO.supplierName}</span>
                </div>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setSmsModalPO(null)}
                style={{ padding: '6px' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Recipient Phone Number
                </label>
                <input 
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0771234567 or +94771234567"
                  value={customSmsPhone}
                  onChange={(e) => setCustomSmsPhone(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Sri Lanka mobile formats accepted: 07XXXXXXXX, +947XXXXXXXX, 947XXXXXXXX.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    SMS Message Content
                  </label>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: customSmsMessage.length > 160 ? '#f59e0b' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {customSmsMessage.length} chars ({Math.ceil(customSmsMessage.length / 160) || 1} SMS)
                  </span>
                </div>
                <textarea 
                  className="form-input"
                  rows={4}
                  value={customSmsMessage}
                  onChange={(e) => setCustomSmsMessage(e.target.value)}
                  style={{ fontSize: '0.85rem', lineHeight: '1.4', resize: 'vertical' }}
                />
              </div>

              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px', padding: '12px 14px', fontSize: '0.78rem',
                color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>💡 Delivery Channels:</span>
                </div>
                <div>• <strong>Cloud SMS Gateway:</strong> Dispatches immediately via configured SMS provider ({smsConfig?.provider || 'Seynex Gateway'}).</div>
                <div>• <strong>Phone SMS App:</strong> 1-click opens your native Messages app on mobile or desktop (100% free using your phone carrier bundle).</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    openNativeSmsApp(customSmsPhone, customSmsMessage);
                    setSmsModalPO(null);
                  }}
                  style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                  title="Open native SMS messaging app"
                >
                  <Smartphone size={16} /> Open Phone App
                </button>

                <button 
                  type="button"
                  className="btn btn-primary"
                  disabled={sendingSms || !customSmsPhone.trim()}
                  onClick={handleSendGatewaySms}
                  style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 800 }}
                  title="Send via Cloud SMS Gateway"
                >
                  {sendingSms ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <SendHorizontal size={16} /> Send Gateway SMS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Procurement;
