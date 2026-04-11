import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { BadgeDollarSign, Search, User, FileText, CheckCircle2, AlertCircle, ShoppingBag, Send } from 'lucide-react';

const Payments = () => {
  const { customers = [], invoices = [], quotes = [], recordCashDeposit } = useContext(StoreContext) || {};
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null); // { id, type, amount, number }
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerInvoices = invoices.filter(inv => inv.customerId === selectedCustomer?.id && inv.status !== 'Paid');
  const customerQuotes = quotes.filter(q => (q.prospectName === selectedCustomer?.gymName || q.prospectPhone === selectedCustomer?.phone) && q.status === 'Accepted');

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !amount) return;

    setIsSubmitting(true);
    try {
      recordCashDeposit({
        customerId: selectedCustomer.id,
        documentId: selectedDoc.id,
        amount: parseFloat(amount),
        paymentType: selectedDoc.type
      });
      
      // Reset
      setSelectedDoc(null);
      setAmount('');
      // Keep customer selected for multiple payments if needed, or reset:
      // setSelectedCustomer(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="mb-8">
        <h1 className="h1 mb-2">Payment Portal</h1>
        <p className="text-secondary">Record cash deposits and send instant payment confirmations to your clients.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Select Gym */}
        <div className="glass-panel lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="var(--accent-primary)" />
            </div>
            <h2 className="h3">1. Select Gym</h2>
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

          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCustomers.map(customer => (
              <button
                key={customer.id}
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Document & Record */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="glass-panel flex flex-col items-center justify-center" style={{ height: '100%', minHeight: '400px', textAlign: 'center', opacity: 0.6 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <BadgeDollarSign size={32} color="var(--text-muted)" />
              </div>
              <h3 className="h3">Pick a client to start</h3>
              <p className="text-secondary" style={{ maxWidth: '280px' }}>Select an active gym from the list to see their outstanding invoices and quotations.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Document Selection */}
              <div className="glass-panel">
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--warning)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="var(--warning)" />
                  </div>
                  <h2 className="h3">2. Select Invoice or Quotation</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unpaid Invoices</div>
                    {customerInvoices.length === 0 ? (
                      <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--subtle-bg)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No pending invoices found.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {customerInvoices.map(inv => (
                          <DocItem 
                            key={inv.id} 
                            doc={{ ...inv, type: 'Invoice', number: inv.invoiceNumber }} 
                            selected={selectedDoc?.id === inv.id}
                            onSelect={() => {
                                setSelectedDoc({ id: inv.id, type: 'Invoice', amount: inv.amount, number: inv.invoiceNumber });
                                setAmount(inv.amount.toString());
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accepted Quotations</div>
                    {customerQuotes.length === 0 ? (
                      <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--subtle-bg)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No accepted quotes found.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                         {customerQuotes.map(q => (
                          <DocItem 
                            key={q.id} 
                            doc={{ ...q, type: 'Quotation', number: q.quoteNumber }} 
                            selected={selectedDoc?.id === q.id}
                            onSelect={() => {
                                setSelectedDoc({ id: q.id, type: 'Quotation', amount: q.amount, number: q.quoteNumber });
                                setAmount(q.amount.toString());
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Entry */}
              {selectedDoc && (
                <div className="glass-panel" style={{ animation: 'fadeIn 0.4s ease-out', border: '1px solid var(--accent-primary)40' }}>
                   <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--success)20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                    </div>
                    <h2 className="h3">3. Record Cash Amount</h2>
                  </div>

                  <form onSubmit={handleRecordPayment}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                      <div className="form-group mb-0">
                        <label className="form-label">Payment Amount (LKR)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>LKR</span>
                          <input 
                            required 
                            type="number" 
                            className="form-input" 
                            style={{ paddingLeft: '56px', fontSize: '1.25rem', fontWeight: 800, height: '52px' }}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn btn-primary" 
                        style={{ height: '52px', fontSize: '1rem', width: '100%' }}
                      >
                        {isSubmitting ? 'Processing...' : (
                          <>
                            <Send size={18} /> Confirm Deposit & Notify
                          </>
                        )}
                      </button>
                    </div>

                    <div style={{ marginTop: '24px', padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                       <AlertCircle size={18} color="var(--accent-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Confirming this deposit will update the {selectedDoc.type} status and send a <strong>"Cash Received"</strong> SMS to <strong>{selectedCustomer.phone}</strong>.
                       </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DocItem = ({ doc, selected, onSelect }) => (
  <button
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
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{doc.number}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>LKR {doc.amount.toLocaleString()}</div>
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
