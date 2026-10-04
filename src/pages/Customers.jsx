import React, { useContext, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Plus, Calendar, MessageSquareText, Edit2, Trash2, X, User, 
  StickyNote, Send, Clock, Cake, Download, Tag, Compass, History, 
  FileText, Receipt, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, 
  Phone, Mail, MapPin, DollarSign, Building, ExternalLink
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { exportToCSV } from '../utils/export';
import { generateCustomerStatementPDF } from '../utils/pdfGenerator';
import CustomSelect from '../components/CustomSelect';

const HAIRPIN_CUSTOMER_TAGS = ['All', 'Wholesale Distributor', 'Retail Fancy Shop', 'Beauty Salon Chain', 'Cosmetic Store', 'Direct Buyer'];
const SEYNEX_CUSTOMER_TAGS = ['All', 'Enterprise Client', 'Corporate Client', 'Commercial Client', 'SME', 'Government / NGO'];
const LEAD_SOURCES = ['Walk-in', 'Direct Visit', 'Referral', 'Social Media', 'Website', 'Phone Call', 'Wholesale Van Delivery'];

const Customers = () => {
  const { 
    customers = [], addCustomer, deleteCustomer, updateCustomer, 
    quotes = [], invoices = [], payments = [],
    sendDirectSMS, smsConfig = {}, showNotification, confirmAction, checkPlanLimit,
    activeBusinessId, activeBusiness
  } = useContext(StoreContext) || {};

  const isHairPins = activeBusinessId === 'biz_hairpins';
  const customerTags = isHairPins ? HAIRPIN_CUSTOMER_TAGS : SEYNEX_CUSTOMER_TAGS;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeNotesCustomer, setActiveNotesCustomer] = useState(null);
  const [timelineCustomer, setTimelineCustomer] = useState(null);

  const handleOpenAddModal = () => {
    if (checkPlanLimit) {
      const check = checkPlanLimit('maxCustomers');
      if (!check.allowed) {
        showNotification(check.message, 'warning');
        return;
      }
    }
    setEditingCustomer(null);
    setShowModal(true);
  };

  useEffect(() => {
    const isAnyModalOpen = showModal || !!activeNotesCustomer || !!timelineCustomer;
    if (isAnyModalOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [showModal, activeNotesCustomer, timelineCustomer]);

  // Strict Business Isolation: Purge any cross-contamination
  const visibleCustomers = useMemo(() => {
    return customers.filter(c => {
      if (!c) return false;
      if (isHairPins) {
        if (c.businessId && c.businessId !== 'biz_hairpins') return false;
        if (String(c.id).startsWith('mc-')) return false;
        const n = (c.gymName || c.name || '').toLowerCase();
        if (n.includes('apex global') || n.includes('metro commercial') || n.includes('horizon financial')) return false;
        return true;
      } else {
        if (c.businessId && c.businessId !== 'biz_main') return false;
        if (String(c.id).startsWith('c-10')) return false;
        const n = (c.gymName || c.name || '').toLowerCase();
        if (n.includes('fancy center') || n.includes('bridal') || n.includes('cosmetics') || n.includes('salon chamari') || n.includes('fashion corner')) return false;
        return true;
      }
    });
  }, [customers, isHairPins]);

  const filteredCustomers = useMemo(() => {
    return visibleCustomers.filter(c => {
      if (!c) return false;
      const searchStr = (searchTerm || '').toLowerCase();
      const nameMatch = (c.gymName || '').toLowerCase().includes(searchStr) ||
                        (c.name || '').toLowerCase().includes(searchStr) ||
                        (c.code || '').toLowerCase().includes(searchStr) ||
                        (c.phone || '').toLowerCase().includes(searchStr);
      
      const statusMatch = statusFilter === 'All' || c.status === statusFilter;
      
      const tagMatch = tagFilter === 'All' || 
                       (Array.isArray(c.tags) && c.tags.includes(tagFilter)) ||
                       c.tag === tagFilter;

      return nameMatch && statusMatch && tagMatch;
    });
  }, [visibleCustomers, searchTerm, statusFilter, tagFilter]);

  const handleExport = () => {
    const exportData = filteredCustomers.map(c => ({
      'Customer ID': c.code || c.id,
      [isHairPins ? 'Shop / Salon / Business Name' : 'Company / Enterprise Name']: c.gymName,
      'Contact Person': c.name,
      'Mobile Phone': c.phone,
      'Email': c.email,
      'Address': c.address,
      'Tax / VAT Number': c.taxNumber,
      'Tags': Array.isArray(c.tags) ? c.tags.join(', ') : (c.tag || ''),
      'Lead Source': c.leadSource || 'Walk-in',
      'Status': c.status,
      'Renewal Frequency': c.renewalFrequency || 'None',
      'Next Renewal Date': c.renewalDate || ''
    }));
    exportToCSV(isHairPins ? 'Royal_Hair_Pins_Buyers_Export' : 'Seynex_Enterprise_Clients_Export', exportData);
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">{isHairPins ? 'Wholesale Buyers & Salons' : 'Enterprise Clients & Accounts'}</h1>
            <p className="text-secondary" style={{ fontSize: '1rem' }}>
              {isHairPins 
                ? 'Manage wholesale distributors, cosmetic stores, salons, and retail outlet profiles.'
                : 'Create, track, and manage client profiles, 360 transaction timelines, and renewal schedules.'}
            </p>
          </div>
          <div className="btn-group flex gap-3">
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              title="Export CSV"
            >
              <Download size={18} className="text-success" />
              <span className="sm-hidden">Export CSV</span>
            </button>
            <button 
              className="btn btn-primary" 
              style={{ padding: '12px 24px' }} 
              onClick={handleOpenAddModal}
            >
              <Plus size={18} /> {isHairPins ? 'New Wholesale Buyer' : 'New Client'}
            </button>
          </div>
        </div>
      </div>

      {/* Styled Search & Filter Toolbar */}
      <div className="glass-panel flex flex-col md:flex-row gap-4 mb-6" style={{ padding: '16px 24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by company name, contact person, ID (CUST-XXXX), or phone..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <CustomSelect 
            value={tagFilter}
            onChange={(val) => setTagFilter(val)}
            options={customerTags.map(t => ({ value: t, label: t === 'All' ? 'All Categories' : `Tag: ${t}` }))}
            style={{ height: '42px', minWidth: '150px' }}
          />
          <CustomSelect 
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
            style={{ height: '42px', minWidth: '130px' }}
          />
        </div>
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="lg:col-span-3 glass-panel flex flex-col items-center justify-center" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <User size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '16px' }} />
            <h3 className="h3" style={{ marginBottom: '8px' }}>No Customers Found</h3>
            <p className="text-secondary" style={{ maxWidth: '400px' }}>Try adjusting your search query, status, or tag filter.</p>
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const custInvoices = invoices.filter(i => i.customerId === customer.id || i.prospectName === customer.gymName);
            const custQuotes = quotes.filter(q => (q.prospectName && q.prospectName === customer.gymName) || (q.prospectPhone && q.prospectPhone === customer.phone));
            const custPayments = payments.filter(p => p.customerId === customer.id || custInvoices.some(i => i.id === p.documentId));
            
            const totalInvoiced = custInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            const totalPaid = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const outstanding = Math.max(0, totalInvoiced - totalPaid);

            return (
              <div 
                key={customer.id} 
                className="glass-panel hover-lift" 
                style={{ 
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: '24px', position: 'relative', borderLeft: `4px solid ${customer.status === 'Active' ? 'var(--success)' : 'var(--panel-border)'}`
                }}
              >
                <div>
                  {/* Top Customer Code & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                        {customer.code || `CUST-${customer.id.slice(0, 4)}`}
                      </span>
                      {customer.leadSource && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Compass size={11} /> {customer.leadSource}
                        </span>
                      )}
                    </div>
                    <span className={`badge ${customer.status === 'Active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                      {customer.status || 'Active'}
                    </span>
                  </div>

                  {/* Customer Company & Name */}
                  <h3 className="h3" style={{ fontSize: '1.2rem', marginBottom: '4px', wordBreak: 'break-word' }}>
                    {customer.gymName || 'Unnamed Business'}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Contact: <strong style={{ color: 'var(--text-primary)' }}>{customer.name || 'N/A'}</strong>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mb-4">
                    {Array.isArray(customer.tags) && customer.tags.length > 0 ? (
                      customer.tags.map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--subtle-bg)', color: 'var(--text-secondary)', border: '1px solid var(--panel-border)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Tag size={10} /> {t}
                        </span>
                      ))
                    ) : customer.tag ? (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--subtle-bg)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Tag size={10} /> {customer.tag}
                      </span>
                    ) : null}
                  </div>

                  {/* Financial Stats Summary */}
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--subtle-bg)', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Total Invoiced</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        LKR {totalInvoiced.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Outstanding</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        LKR {outstanding.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Quick Contact Info */}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                    {customer.phone && <div className="flex items-center gap-2"><Phone size={12} /> {customer.phone}</div>}
                    {customer.email && <div className="flex items-center gap-2"><Mail size={12} /> {customer.email}</div>}
                    {customer.renewalFrequency && customer.renewalFrequency !== 'None' && (
                      <div className="flex items-center gap-2" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                        <Clock size={12} /> {customer.renewalFrequency} Renewal: {customer.renewalDate ? new Date(customer.renewalDate).toLocaleDateString() : 'Pending'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-panel flex items-center justify-between gap-2">
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ flex: 1, height: '36px', fontSize: '0.75rem', fontWeight: 700, gap: '6px' }}
                    onClick={() => setTimelineCustomer(customer)}
                    title="View 360 History and Transaction Timeline"
                  >
                    <History size={14} className="text-accent" /> 360 History
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ width: '36px', height: '36px', padding: 0, position: 'relative' }} 
                    onClick={() => setActiveNotesCustomer(customer)}
                    title="Internal Staff Notes"
                  >
                    <StickyNote size={15} color="var(--warning)" />
                    {customer.notes?.length > 0 && (
                      <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--warning)', color: '#000', fontSize: '9px', fontWeight: 900, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {customer.notes.length}
                      </span>
                    )}
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ width: '36px', height: '36px', padding: 0 }} 
                    onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                    title="Edit Customer"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ width: '36px', height: '36px', padding: 0, color: 'var(--danger)' }} 
                    onClick={() => {
                      confirmAction({
                        title: 'Delete Customer Record',
                        message: `Are you sure you want to delete "${customer.gymName}"? All related quotations and invoices will remain intact.`,
                        onConfirm: () => deleteCustomer(customer.id)
                      });
                    }}
                    title="Delete Customer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showModal && (
        <CustomerModal 
          onClose={() => { setShowModal(false); setEditingCustomer(null); }}
          onSave={(data) => {
            const payload = { ...data, businessId: activeBusinessId };
            if (editingCustomer) updateCustomer(editingCustomer.id, payload);
            else addCustomer(payload);
          }}
          initialData={editingCustomer}
          nextCustomerCode={isHairPins ? `HP-BUYER-${(visibleCustomers.length + 101).toString()}` : `SNX-CUST-${(visibleCustomers.length + 1001).toString()}`}
          isHairPins={isHairPins}
          customerTags={customerTags}
        />
      )}

      {/* INTERNAL STAFF NOTES MODAL */}
      {activeNotesCustomer && (
        <NotesModal 
          customer={activeNotesCustomer} 
          onClose={() => setActiveNotesCustomer(null)} 
        />
      )}

      {/* 360 TRANSACTION HISTORY & VERTICAL TIMELINE MODAL */}
      {timelineCustomer && (
        <Customer360Modal 
          customer={timelineCustomer}
          quotes={quotes}
          invoices={invoices}
          payments={payments}
          onClose={() => setTimelineCustomer(null)}
          onStatementPDF={() => {
            const custInvoices = invoices.filter(i => i.customerId === timelineCustomer.id || i.prospectName === timelineCustomer.gymName);
            const custPayments = payments.filter(p => p.customerId === timelineCustomer.id || custInvoices.some(i => i.id === p.documentId));
            generateCustomerStatementPDF(timelineCustomer, custInvoices, custPayments);
          }}
        />
      )}
    </div>
  );
};

const SALUTATION_OPTIONS = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Rev.', label: 'Rev.' }
];

const parseSalutationAndName = (rawName = '', defaultSalutation = 'Mr.') => {
  if (!rawName) return { salutation: defaultSalutation, cleanName: '' };
  const trimmed = rawName.trim();
  const match = trimmed.match(/^(Mr\.|Miss|Mrs\.|Ms\.|Dr\.|Rev\.)\s*(.*)$/i);
  if (match) {
    const matchedPrefix = match[1].toLowerCase();
    const found = SALUTATION_OPTIONS.find(opt => opt.value.toLowerCase() === matchedPrefix);
    return { salutation: found ? found.value : defaultSalutation, cleanName: match[2].trim() };
  }
  return { salutation: defaultSalutation, cleanName: trimmed };
};

// ADD / EDIT CUSTOMER MODAL COMPONENT
const CustomerModal = ({ onClose, onSave, initialData, nextCustomerCode, isHairPins = false, customerTags = [] }) => {
  const defaultTag = isHairPins ? 'Wholesale Distributor' : 'Enterprise Client';
  const parsedContact = parseSalutationAndName(initialData?.name || '', initialData?.salutation || 'Mr.');
  const [formData, setFormData] = useState({
    code: initialData?.code || nextCustomerCode || (isHairPins ? 'HP-BUYER-101' : 'SNX-CUST-1001'),
    gymName: initialData?.gymName || '',
    salutation: parsedContact.salutation,
    name: parsedContact.cleanName,
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    taxNumber: initialData?.taxNumber || '',
    status: initialData?.status || 'Active',
    tags: Array.isArray(initialData?.tags) ? initialData.tags : (initialData?.tag ? [initialData.tag] : [defaultTag]),
    leadSource: initialData?.leadSource || (isHairPins ? 'Direct Visit' : 'Referral'),
    renewalFrequency: initialData?.renewalFrequency || (isHairPins ? 'One Time' : 'Annual'),
    annualFee: initialData?.annualFee || (isHairPins ? 150000 : 450000),
    renewalDate: initialData?.renewalDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  });

  // Lock body scroll while modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const toggleTag = (tag) => {
    const current = formData.tags || [];
    if (current.includes(tag)) {
      setFormData({ ...formData, tags: current.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...current, tag] });
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: 'min(680px, calc(100vw - 20px))', 
          maxWidth: '680px', 
          maxHeight: 'min(92vh, calc(100dvh - 24px))', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Modal Header */}
        <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.35rem' }}>
                {initialData 
                  ? (isHairPins ? 'Edit Wholesale Buyer Record' : 'Edit Enterprise Client') 
                  : (isHairPins ? 'Register Wholesale Buyer / Salon' : 'Create New Enterprise Client')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isHairPins 
                  ? 'Complete shop, distributor or salon contact details and delivery terms.' 
                  : 'Complete corporate information, lead origin, and renewal configuration.'}
              </p>
            </div>
            <button type="button" className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Scrollable Form Body with Pinned Actions */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            const formattedName = formData.name.trim() 
              ? `${formData.salutation || 'Mr.'} ${formData.name.trim()}` 
              : '';
            onSave({
              ...formData,
              salutation: formData.salutation || 'Mr.',
              name: formattedName
            }); 
            onClose(); 
          }} 
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '18px' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="form-group">
                <label className="form-label">{isHairPins ? 'Buyer ID / Account Code' : 'Client ID / Code'}</label>
                <input required type="text" className="form-input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <CustomSelect 
                  value={formData.status} 
                  onChange={val => setFormData({...formData, status: val})}
                  options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                />
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">{isHairPins ? 'Shop / Salon / Business Name *' : 'Customer / Company Name *'}</label>
                <input 
                  required 
                  type="text" 
                  className="form-input" 
                  placeholder={isHairPins ? "e.g. Lanka Fancy Center (Pettah) or Queens Bridal Salon" : "e.g. Apex Global Technologies (Pvt) Ltd"} 
                  value={formData.gymName} 
                  onChange={e => setFormData({...formData, gymName: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">{isHairPins ? 'Proprietor / Contact Person *' : 'Contact Person Name *'}</label>
                <div className="flex gap-2 w-full">
                  <div style={{ width: '95px', flexShrink: 0 }}>
                    <CustomSelect
                      value={formData.salutation || 'Mr.'}
                      onChange={val => setFormData({ ...formData, salutation: val })}
                      options={SALUTATION_OPTIONS}
                      style={{ height: '42px', width: '100%' }}
                    />
                  </div>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    style={{ height: '42px', flex: 1, minWidth: 0 }}
                    placeholder={isHairPins ? "e.g. M. Farook" : "e.g. Rohan Jayasinghe"} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number (07X-XXXXXXX) *</label>
                <input required type="tel" className="form-input" placeholder="07XXXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="contact@company.lk" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Tax / VAT Information</label>
                <input type="text" className="form-input" placeholder="VAT-10293847-7000" value={formData.taxNumber} onChange={e => setFormData({...formData, taxNumber: e.target.value})} />
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" placeholder="No. 123, Galle Road, Colombo 03" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <CustomSelect 
                  value={formData.leadSource} 
                  onChange={val => setFormData({...formData, leadSource: val})}
                  options={LEAD_SOURCES.map(s => ({ value: s, label: s }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Renewal Frequency</label>
                <CustomSelect 
                  value={formData.renewalFrequency} 
                  onChange={val => setFormData({...formData, renewalFrequency: val})}
                  options={[
                    { value: 'One Time', label: 'One Time (No Recurrence)' },
                    { value: 'Monthly', label: 'Monthly (+1 Month)' },
                    { value: 'Bi-Annual', label: 'Bi-Annual (+6 Months)' },
                    { value: 'Annual', label: 'Annual (+12 Months)' }
                  ]}
                />
              </div>

              {/* Tags Selection */}
              <div className="form-group md:col-span-2">
                <label className="form-label">{isHairPins ? 'Buyer Category / Trade Tag' : 'Customer Tags / Labels'}</label>
                <div className="flex gap-2 flex-wrap">
                  {(customerTags.length > 0 ? customerTags : (isHairPins ? HAIRPIN_CUSTOMER_TAGS : SEYNEX_CUSTOMER_TAGS)).filter(t => t !== 'All').map(tag => {
                    const isSelected = (formData.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--panel-border)',
                          background: isSelected ? 'var(--accent-primary)20' : 'var(--subtle-bg)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Tag size={12} /> {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer (Actions) */}
          <div 
            className="flex justify-end gap-3 p-4 border-t modal-footer-solid" 
            style={{ 
              flexShrink: 0, 
              background: 'var(--panel-bg)', 
              borderColor: 'var(--panel-border)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Customer Record</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// INTERNAL STAFF NOTES MODAL
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

  // Lock body scroll while modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '580px', 
          maxHeight: 'min(90vh, calc(100dvh - 24px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 800, textTransform: 'uppercase' }}>INTERNAL USE ONLY</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Staff Notes: {customer.gymName}</h2>
            </div>
            <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Internal notes are visible to all staff members but are <strong>never</strong> displayed on customer-facing links or generated PDFs.
          </p>

          <form onSubmit={handleAddNote} className="mb-6">
            <textarea 
              rows={3} 
              className="form-input mb-3" 
              placeholder="e.g. Called twice regarding enterprise add-ons. Follow up after quarterly meeting..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                <Plus size={16} /> Add Internal Note
              </button>
            </div>
          </form>

          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Note History ({notes.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--subtle-bg)', borderRadius: '10px' }}>
                No internal notes recorded yet.
              </div>
            ) : (
              notes.map((n, idx) => (
                <div key={n.id || idx} style={{ padding: '14px', borderRadius: '10px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
                  <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>By: <strong style={{ color: 'var(--accent-primary)' }}>{n.author || 'Staff'}</strong></span>
                    <span>{n.timestamp || n.date ? new Date(n.timestamp || n.date).toLocaleString() : 'Recent'}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {n.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 360 TRANSACTION HISTORY & VERTICAL TIMELINE MODAL
const Customer360Modal = ({ customer, quotes = [], invoices = [], payments = [], onClose, onStatementPDF }) => {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'quotes' | 'invoices' | 'payments'

  const custInvoices = useMemo(() => invoices.filter(i => i.customerId === customer.id || i.prospectName === customer.gymName), [invoices, customer]);
  const custQuotes = useMemo(() => quotes.filter(q => (q.prospectName && q.prospectName === customer.gymName) || (q.prospectPhone && q.prospectPhone === customer.phone)), [quotes, customer]);
  const custPayments = useMemo(() => payments.filter(p => p.customerId === customer.id || custInvoices.some(i => i.id === p.documentId)), [payments, customer, custInvoices]);

  const totalInvoiced = custInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPaid = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = Math.max(0, totalInvoiced - totalPaid);

  // BUILD COMPLETE VERTICAL TRANSACTION TIMELINE
  const timelineEvents = useMemo(() => {
    const events = [];

    // 1. Customer Created
    if (customer.createdAt || customer.purchaseDate) {
      events.push({
        date: customer.createdAt || customer.purchaseDate,
        title: 'Customer Profile Created',
        desc: `Account initialized with ID ${customer.code || customer.id}. Status: ${customer.status}`,
        badge: 'Profile',
        icon: User,
        color: '#6366f1'
      });
    }

    // 2. Quotations & Counter Offers
    custQuotes.forEach(q => {
      events.push({
        date: q.date,
        title: `Quotation #${q.quoteNumber} Issued`,
        desc: `Net offer LKR ${(Number(q.amount) || 0).toLocaleString()} • Status: ${q.status}`,
        badge: 'Quotation',
        icon: FileText,
        color: '#3b82f6'
      });

      if (q.counterOffers && q.counterOffers.length > 0) {
        q.counterOffers.forEach(co => {
          events.push({
            date: co.createdAt,
            title: `Budget Counter Offer: LKR ${(Number(co.proposedBudget) || 0).toLocaleString()}`,
            desc: `Customer proposed budget with message: "${co.message || 'No note'}"`,
            badge: 'Counter Offer',
            icon: DollarSign,
            color: '#f59e0b'
          });
        });
      }

      if (q.acceptedAt) {
        events.push({
          date: q.acceptedAt,
          title: `Quotation #${q.quoteNumber} Accepted`,
          desc: `Customer confirmed proposal acceptance.`,
          badge: 'Accepted',
          icon: CheckCircle,
          color: '#10b981'
        });
      }
    });

    // 3. Invoices
    custInvoices.forEach(inv => {
      events.push({
        date: inv.date,
        title: `Invoice #${inv.invoiceNumber} Issued`,
        desc: `Amount: LKR ${(Number(inv.amount) || 0).toLocaleString()} • Due Date: ${inv.dueDate || 'N/A'}`,
        badge: 'Invoice',
        icon: Receipt,
        color: '#8b5cf6'
      });

      if (inv.paidAt) {
        events.push({
          date: inv.paidAt,
          title: `Invoice #${inv.invoiceNumber} Paid & Closed`,
          desc: `Full balance cleared. Invoice closed.`,
          badge: 'Closed',
          icon: CheckCircle,
          color: '#10b981'
        });
      }
    });

    // 4. Payments
    custPayments.forEach(p => {
      events.push({
        date: p.timestamp,
        title: `Payment: LKR ${(Number(p.amount) || 0).toLocaleString()} (${p.method || 'Cash'})`,
        desc: `Receipt #${p.receiptNumber || 'REC'} recorded by ${p.recordedBy || 'Staff'}. Ref: ${p.reference || 'None'}`,
        badge: 'Payment',
        icon: DollarSign,
        color: '#10b981'
      });
    });

    // 5. Renewal Tracking
    if (customer.lastRenewalDate) {
      events.push({
        date: customer.lastRenewalDate,
        title: `Renewal Completed (${customer.renewalFrequency || 'Annual'})`,
        desc: `Contract renewed. Next review: ${customer.renewalDate || 'N/A'}`,
        badge: 'Renewal',
        icon: Clock,
        color: '#0ea5e9'
      });
    }

    // Sort newest first
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customer, custQuotes, custInvoices, custPayments]);

  // Lock body scroll while modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '880px', 
          maxHeight: 'min(92vh, calc(100dvh - 24px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {customer.code || `CUST-${customer.id.slice(0, 4)}`}
                </span>
                <span className="badge badge-success">{customer.status}</span>
              </div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{customer.gymName}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Contact: {customer.name} • Phone: {customer.phone} • Email: {customer.email || 'N/A'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', gap: '6px' }} onClick={onStatementPDF}>
                <Download size={15} /> Customer Statement PDF
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={20} /></button>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Key 360 Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Quotations</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{custQuotes.length}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Invoiced</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>LKR {totalInvoiced.toLocaleString()}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Paid</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>LKR {totalPaid.toLocaleString()}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Outstanding</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: outstanding > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                LKR {outstanding.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-panel pb-3 mb-6">
            {[
              { id: 'timeline', label: 'Vertical Timeline', icon: History },
              { id: 'quotes', label: `Quotations (${custQuotes.length})`, icon: FileText },
              { id: 'invoices', label: `Invoices (${custInvoices.length})`, icon: Receipt },
              { id: 'payments', label: `Payments (${custPayments.length})`, icon: DollarSign }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px' }}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: VERTICAL TIMELINE */}
          {activeTab === 'timeline' && (
            <div style={{ position: 'relative', paddingLeft: '32px', borderLeft: '2px dashed var(--panel-border)', marginLeft: '12px' }}>
              {timelineEvents.map((ev, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Timeline Node Point */}
                  <div style={{
                    position: 'absolute', left: '-41px', top: '2px', width: '18px', height: '18px',
                    borderRadius: '50%', background: ev.color, border: '3px solid #0f172a',
                    boxShadow: `0 0 10px ${ev.color}40`
                  }} />

                  <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
                    <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.date).toLocaleDateString()} • {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {ev.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: QUOTATIONS LIST */}
          {activeTab === 'quotes' && (
            <div className="flex flex-col gap-3">
              {custQuotes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No quotations for this client.</div>
              ) : (
                custQuotes.map(q => (
                  <div key={q.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>#{q.quoteNumber}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Date: {new Date(q.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>LKR {(Number(q.amount) || 0).toLocaleString()}</div>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{q.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: INVOICES LIST */}
          {activeTab === 'invoices' && (
            <div className="flex flex-col gap-3">
              {custInvoices.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices for this client.</div>
              ) : (
                custInvoices.map(i => (
                  <div key={i.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>#{i.invoiceNumber}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Issued: {new Date(i.date).toLocaleDateString()} • Due: {i.dueDate || 'N/A'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>LKR {(Number(i.amount) || 0).toLocaleString()}</div>
                      <span className={`badge badge-${i.status === 'Paid' ? 'success' : 'danger'}`} style={{ fontSize: '0.65rem' }}>{i.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PAYMENTS LIST */}
          {activeTab === 'payments' && (
            <div className="flex flex-col gap-3">
              {custPayments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded for this client.</div>
              ) : (
                custPayments.map(p => (
                  <div key={p.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Receipt #{p.receiptNumber || 'REC'} ({p.method || 'Cash'})</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Date: {new Date(p.timestamp).toLocaleDateString()} • Ref: {p.reference || 'None'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--success)' }}>LKR {(Number(p.amount) || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Staff: {p.recordedBy || 'Staff'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Customers;
