import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  BadgeDollarSign, Search, User, FileText, CheckCircle2, AlertCircle, 
  Send, CalendarDays, Download, MessageCircle, Clock, Check, X, ShieldCheck
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { openWhatsApp } from '../utils/notificationService';
import CustomSelect from '../components/CustomSelect';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Online Payment', 'Other'];

const Payments = () => {
  const { 
    customers = [], invoices = [], quotes = [], payments = [], 
    recordEnhancedPayment, smsConfig = {}, showNotification 
  } = useContext(StoreContext) || {};
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null); // { id, type, amount, remaining, number, rawInv }
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [renewalFrequency, setRenewalFrequency] = useState('Annual');
  const [showRenewalPrompt, setShowRenewalPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Post-payment receipt modal state
  const [completedPaymentData, setCompletedPaymentData] = useState(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (!c) return false;
      const gymStr = String(c.gymName || '').toLowerCase();
      const nameStr = String(c.name || '').toLowerCase();
      const searchStr = (searchTerm || '').toLowerCase();
      return gymStr.includes(searchStr) || nameStr.includes(searchStr);
    });
  }, [customers, searchTerm]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(inv => {
      if (!inv) return false;
      const isCustMatch = inv.customerId === selectedCustomer.id || (inv.prospectName && inv.prospectName === selectedCustomer.gymName);
      if (!isCustMatch) return false;
      const invPayments = payments.filter(p => p.documentId === inv.id);
      const paidSum = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const remaining = Math.max(0, (Number(inv.amount) || 0) - paidSum);
      return inv.status !== 'Paid' && remaining > 0;
    });
  }, [invoices, selectedCustomer, payments]);

  const customerQuotes = useMemo(() => {
    if (!selectedCustomer) return [];
    return quotes.filter(q => q && ((q.prospectName && q.prospectName === selectedCustomer.gymName) || (q.prospectPhone && selectedCustomer.phone && q.prospectPhone === selectedCustomer.phone)) && q.status === 'Accepted');
  }, [quotes, selectedCustomer]);

  const handleStartSubmit = (e) => {
    e.preventDefault();
    if (!selectedDoc || !amount) return;

    const payVal = parseFloat(amount);
    if (isNaN(payVal) || payVal <= 0) {
      showNotification('Please enter a valid payment amount.', 'error');
      return;
    }

    if (payVal > selectedDoc.remaining) {
      showNotification(`Payment cannot exceed outstanding balance of LKR ${selectedDoc.remaining.toLocaleString()}`, 'error');
      return;
    }

    // Check if customer has an existing renewal frequency
    const hasExistingRenewal = selectedCustomer?.renewalFrequency && selectedCustomer.renewalFrequency !== 'None';
    if (!hasExistingRenewal) {
      // First payment: prompt staff to pick renewal frequency
      setShowRenewalPrompt(true);
    } else {
      executePayment(selectedCustomer.renewalFrequency);
    }
  };

  const executePayment = async (selectedFreq) => {
    setIsSubmitting(true);
    try {
      const result = await recordEnhancedPayment({
        customerId: selectedCustomer.id,
        documentId: selectedDoc.id,
        amount: parseFloat(amount),
        method,
        reference,
        notes,
        renewalFrequency: selectedFreq
      });

      if (result) {
        setCompletedPaymentData(result);
        setSelectedDoc(null);
        setAmount('');
        setReference('');
        setNotes('');
        setShowRenewalPrompt(false);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to record payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent Payments List
  const recentPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
  }, [payments]);

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)', paddingBottom: '40px' }}>
      <div className="mb-8">
        <h1 className="h1 mb-2">Payment Portal & Cash Receipts</h1>
        <p className="text-secondary">
          Record full or partial invoice payments, set renewal cycles, and generate professional instant receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Step 1: Select Customer */}
        <div className="glass-panel lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="var(--accent-primary)" />
            </div>
            <h2 className="h3">1. Select Customer</h2>
          </div>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search active gyms..." 
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCustomers.map(customer => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  setSelectedCustomer(customer);
                  setSelectedDoc(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: selectedCustomer?.id === customer.id ? 'var(--accent-primary)' : 'var(--panel-border)',
                  background: selectedCustomer?.id === customer.id ? 'var(--accent-primary)10' : 'var(--subtle-bg)',
                  textAlign: 'left',
                  transition: '0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{customer.gymName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.name} • {customer.phone}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Document & Record Payment */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="glass-panel flex flex-col items-center justify-center" style={{ height: '100%', minHeight: '400px', textAlign: 'center', opacity: 0.6 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <BadgeDollarSign size={32} color="var(--text-muted)" />
              </div>
              <h3 className="h3">Pick a customer to start</h3>
              <p className="text-secondary" style={{ maxWidth: '280px' }}>Select an active customer from the left list to see their outstanding invoices.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Document Selection */}
              <div className="glass-panel">
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--warning)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="var(--warning)" />
                  </div>
                  <h2 className="h3">2. Select Invoice for {selectedCustomer.gymName}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Invoices</div>
                    {customerInvoices.length === 0 ? (
                      <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--subtle-bg)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No pending invoices found for this client.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {customerInvoices.map(inv => {
                          const paidSum = payments.filter(p => p.documentId === inv.id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                          const remaining = Math.max(0, (Number(inv.amount) || 0) - paidSum);

                          return (
                            <DocItem 
                              key={inv.id} 
                              doc={{ ...inv, type: 'Invoice', number: inv.invoiceNumber, remaining }} 
                              selected={selectedDoc?.id === inv.id}
                              onSelect={() => {
                                setSelectedDoc({ id: inv.id, type: 'Invoice', amount: inv.amount, remaining, number: inv.invoiceNumber, rawInv: inv });
                                setAmount(remaining.toString());
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accepted Quotations</div>
                    {customerQuotes.length === 0 ? (
                      <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--subtle-bg)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No accepted quotations awaiting invoicing.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {customerQuotes.map(q => (
                          <DocItem 
                            key={q.id} 
                            doc={{ ...q, type: 'Quotation', number: q.quoteNumber, remaining: q.amount }} 
                            selected={selectedDoc?.id === q.id}
                            onSelect={() => {
                              setSelectedDoc({ id: q.id, type: 'Quotation', amount: q.amount, remaining: q.amount, number: q.quoteNumber, rawInv: q });
                              setAmount(q.amount.toString());
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Entry Form */}
              {selectedDoc && (
                <div className="glass-panel" style={{ border: '1px solid var(--accent-primary)40' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--success)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                    </div>
                    <div>
                      <h2 className="h3" style={{ margin: 0 }}>3. Record Payment Details</h2>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Target: #{selectedDoc.number} • Remaining Due: <strong style={{ color: 'var(--warning)' }}>LKR {selectedDoc.remaining.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleStartSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="form-group">
                        <label className="form-label">Payment Amount (LKR) *</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>LKR</span>
                          <input 
                            required 
                            type="number" 
                            className="form-input" 
                            style={{ paddingLeft: '56px', fontSize: '1.2rem', fontWeight: 800, height: '48px' }}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Payment Method *</label>
                        <CustomSelect 
                          value={method}
                          onChange={setMethod}
                          options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
                          style={{ height: '48px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Reference # / Cheque #</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. SLIP-9921 / TXN-001" 
                          style={{ height: '48px' }}
                          value={reference}
                          onChange={e => setReference(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group mb-6">
                      <label className="form-label">Payment Notes (Optional)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Paid via Commercial Bank online transfer" 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                          onClick={() => setAmount(selectedDoc.remaining.toString())}
                        >
                          Fill Full Outstanding (LKR {selectedDoc.remaining.toLocaleString()})
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn btn-primary" 
                        style={{ height: '48px', padding: '0 28px', fontSize: '0.95rem', fontWeight: 800 }}
                      >
                        {isSubmitting ? 'Recording...' : (
                          <>
                            <Send size={18} /> Confirm Payment & Generate Receipt
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RECENT PAYMENTS LEDGER TABLE */}
      <div className="glass-panel">
        <div className="flex justify-between items-center mb-6">
          <h2 className="h3">Recent Recorded Payments</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest {recentPayments.length} entries</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Recorded By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map(p => {
                  const cust = customers.find(c => c.id === p.customerId);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {p.receiptNumber || 'REC'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(p.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cust?.gymName || 'Valued Customer'}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{p.method || 'Cash'}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.reference || '—'}
                      </td>
                      <td style={{ fontWeight: 850, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                        LKR {(Number(p.amount) || 0).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.recordedBy || 'Staff'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px', height: '32px', width: '32px' }}
                            title="Download Payment Receipt PDF"
                            onClick={() => {
                              const inv = invoices.find(i => i.id === p.documentId);
                              generatePaymentReceiptPDF(p, cust || { gymName: 'Valued Client' }, inv);
                            }}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '6px', height: '32px', width: '32px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                            title="Share Receipt via WhatsApp"
                            onClick={() => {
                              const msg = `Hello ${cust?.gymName || 'Valued Customer'},\n\nPayment confirmation for *Receipt #${p.receiptNumber || 'REC'}*.\n\n*Amount Paid:* LKR ${(Number(p.amount) || 0).toLocaleString()}\n*Method:* ${p.method || 'Cash'}\n*Date:* ${new Date(p.timestamp).toLocaleDateString()}\n\nThank you for choosing ${smsConfig?.companyName || 'Seynex Technology'}!`;
                              openWhatsApp({ phone: cust?.phone || '', text: msg });
                            }}
                          >
                            <MessageCircle size={14} />
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

      {/* RENEWAL FREQUENCY FIRST-PAYMENT PROMPT MODAL */}
      {showRenewalPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '32px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Clock size={24} color="var(--accent-primary)" />
            </div>

            <h3 className="h3" style={{ marginBottom: '8px', fontSize: '1.3rem' }}>First Payment: Set Renewal Cycle</h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '24px' }}>
              This is the customer's first payment on this contract. Please select the agreed renewal frequency to automatically schedule future billing reviews.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '28px' }}>
              {[
                { id: 'One Time', label: 'One Time', desc: 'No recurrence' },
                { id: 'Monthly', label: 'Monthly', desc: '+1 month cycle' },
                { id: 'Bi-Annual', label: 'Bi-Annual', desc: '+6 months cycle' },
                { id: 'Annual', label: 'Annual', desc: '+12 months cycle' }
              ].map(freq => (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setRenewalFrequency(freq.id)}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: renewalFrequency === freq.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    background: renewalFrequency === freq.id ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.9rem' }}>{freq.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{freq.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRenewalPrompt(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '0 24px', fontWeight: 800 }}
                onClick={() => executePayment(renewalFrequency)}
              >
                Confirm & Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-PAYMENT RECEIPT SUCCESS MODAL */}
      {completedPaymentData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 32px',
            border: '1px solid rgba(255,255,255,0.15)', background: '#0f172a'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto'
            }}>
              <CheckCircle2 size={36} color="#10b981" />
            </div>

            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', color: '#ffffff', fontWeight: 900 }}>
              Payment Recorded!
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '24px' }}>
              Receipt <strong>#{completedPaymentData.receiptNumber}</strong> • Amount: <strong>LKR {completedPaymentData.payment.amount.toLocaleString()}</strong>
              <div style={{ fontSize: '0.8rem', color: completedPaymentData.remainingBalance === 0 ? '#10b981' : '#f59e0b', marginTop: '4px' }}>
                Remaining Balance: LKR {completedPaymentData.remainingBalance.toLocaleString()} {completedPaymentData.remainingBalance === 0 ? '(PAID IN FULL - CLOSED)' : ''}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ height: '46px', gap: '8px', fontSize: '0.9rem' }}
                onClick={() => {
                  generatePaymentReceiptPDF(completedPaymentData.payment, completedPaymentData.customer, completedPaymentData.invoice);
                }}
              >
                <Download size={18} /> Download Payment Receipt PDF
              </button>

              <button 
                type="button" 
                className="btn" 
                style={{ height: '46px', gap: '8px', fontSize: '0.9rem', background: '#22c55e', color: '#ffffff', fontWeight: 800 }}
                onClick={() => {
                  const cust = completedPaymentData.customer;
                  const pay = completedPaymentData.payment;
                  const msg = `Hello ${cust?.gymName || 'Valued Customer'},\n\nPayment confirmation for *Receipt #${pay.receiptNumber}*.\n\n*Amount Paid:* LKR ${pay.amount.toLocaleString()}\n*Method:* ${pay.method || 'Cash'}\n*Remaining Balance:* LKR ${completedPaymentData.remainingBalance.toLocaleString()}\n\nThank you for choosing ${smsConfig?.companyName || 'Seynex Technology'}!`;
                  openWhatsApp({ phone: cust?.phone || '', text: msg });
                }}
              >
                <MessageCircle size={18} /> Share Receipt via WhatsApp
              </button>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', height: '42px' }}
              onClick={() => setCompletedPaymentData(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DocItem = ({ doc, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    style={{
      width: '100%',
      padding: '14px',
      borderRadius: '12px',
      border: '1px solid',
      borderColor: selected ? 'var(--accent-primary)' : 'var(--panel-border)',
      background: selected ? 'var(--accent-primary)10' : 'var(--subtle-bg)',
      textAlign: 'left',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{doc.number}</span>
      </div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
        LKR {(Number(doc.remaining || doc.amount) || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>of LKR {(Number(doc.amount) || 0).toLocaleString()}</span>
      </div>
    </div>
    <div style={{ 
      width: '24px', height: '24px', borderRadius: '50%', border: '2px solid',
      borderColor: selected ? 'var(--accent-primary)' : 'var(--panel-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'var(--accent-primary)' : 'transparent'
    }}>
      {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
    </div>
  </button>
);

export default Payments;
