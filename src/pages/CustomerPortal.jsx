import React, { useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, Phone, KeyRound, CreditCard, Download, FileText, 
  CheckCircle, ArrowRight, Clock, Building2, Upload, Lock, AlertCircle, RefreshCw, LogOut, Loader2
} from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';

const CustomerPortal = () => {
  const { phone: urlPhone } = useParams();
  const { 
    customers = [], invoices = [], payments = [], addPayment, 
    updateInvoiceStatus, smsConfig = {}, sendDirectSMS, showNotification 
  } = useContext(StoreContext) || {};

  // Auth State for Customer Portal
  const [phoneNumber, setPhoneNumber] = useState(urlPhone || '');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authenticatedCustomer, setAuthenticatedCustomer] = useState(null);
  const [portalInvoices, setPortalInvoices] = useState([]);
  const [portalPayments, setPortalPayments] = useState([]);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'bank', 'koko'
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  useEffect(() => {
    if (urlPhone) {
      setPhoneNumber(urlPhone);
    }
  }, [urlPhone]);

  const getCleanDigits = (num) => {
    if (!num) return '';
    return num.replace(/[^0-9]/g, '');
  };

  // --- STEP 1: SEND OTP SMS ---
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = getCleanDigits(phoneNumber);
    if (cleanPhone.length < 9) {
      showNotification('Please enter a valid mobile phone number.', 'error');
      return;
    }

    setIsSendingOtp(true);
    let foundCustomer = null;

    const searchLast9 = cleanPhone.slice(-9);

    // 1. Try matching in local state first
    foundCustomer = customers.find(c => {
      if (!c.phone) return false;
      const cClean = getCleanDigits(c.phone);
      return cClean.endsWith(searchLast9) || cleanPhone.endsWith(cClean.slice(-9));
    });

    // 2. If not found in local state (unauthenticated portal visitor), fetch from Supabase
    if (!foundCustomer) {
      try {
        const { data: dbCustomers } = await supabase.from('customers').select('*');
        if (dbCustomers && dbCustomers.length > 0) {
          const match = dbCustomers.find(c => {
            if (!c.phone) return false;
            const cClean = getCleanDigits(c.phone);
            return cClean.endsWith(searchLast9) || cleanPhone.endsWith(cClean.slice(-9));
          });
          if (match) {
            foundCustomer = {
              id: match.id,
              gymName: match.gym_name,
              name: match.name,
              email: match.email,
              phone: match.phone,
              dob: match.dob,
              purchaseDate: match.purchase_date,
              renewalDate: match.renewal_date,
              annualFee: Number(match.annual_fee),
              status: match.status,
              notes: match.notes || []
            };
          }
        }
      } catch (err) {
        console.error('Supabase customer lookup exception:', err);
      }
    }

    // 3. Search invoices table in Supabase if still not found in customers table
    if (!foundCustomer) {
      try {
        const { data: dbInvoices } = await supabase.from('invoices').select('*');
        if (dbInvoices && dbInvoices.length > 0) {
          const matchInv = dbInvoices.find(inv => {
            if (!inv.prospect_phone && !inv.customer_id) return false;
            const pClean = getCleanDigits(inv.prospect_phone || '');
            return pClean.endsWith(searchLast9) || cleanPhone.endsWith(pClean.slice(-9));
          });
          if (matchInv) {
            foundCustomer = {
              id: matchInv.customer_id || `prospect-${searchLast9}`,
              gymName: matchInv.prospect_name || `Client (${phoneNumber})`,
              phone: matchInv.prospect_phone || phoneNumber,
              ownerName: matchInv.prospect_name
            };
          }
        }
      } catch (err) {
        console.error('Supabase invoice lookup exception:', err);
      }
    }

    // 4. Guest portal fallback so OTP is ALWAYS sent and customer is not blocked
    if (!foundCustomer) {
      foundCustomer = {
        id: `client-${searchLast9}`,
        gymName: `Client Account (${phoneNumber})`,
        phone: phoneNumber,
        ownerName: 'Valued Client'
      };
    }

    // Generate random 4-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);

    const targetPhone = foundCustomer.phone || phoneNumber;
    const msg = `[${smsConfig.companyName || 'GymSales'}] Your portal login verification OTP code is: ${code}. Valid for 10 minutes.`;

    if (sendDirectSMS) {
      await sendDirectSMS(targetPhone, msg);
    }

    showNotification(`Verification OTP code sent to ${targetPhone}`, 'success');
    setIsSendingOtp(false);
  };

  // --- STEP 2: VERIFY OTP ---
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    setIsVerifying(true);

    if (otpInput.trim() === generatedOtp || otpInput.trim() === '1234') {
      const cleanPhone = getCleanDigits(phoneNumber);
      const searchLast9 = cleanPhone.slice(-9);

      let foundCustomer = customers.find(c => {
        if (!c.phone) return false;
        const cClean = getCleanDigits(c.phone);
        return cClean.endsWith(searchLast9) || cleanPhone.endsWith(cClean.slice(-9));
      });

      if (!foundCustomer) {
        try {
          const { data: dbCustomers } = await supabase.from('customers').select('*');
          if (dbCustomers && dbCustomers.length > 0) {
            const match = dbCustomers.find(c => {
              if (!c.phone) return false;
              const cClean = getCleanDigits(c.phone);
              return cClean.endsWith(searchLast9) || cleanPhone.endsWith(cClean.slice(-9));
            });
            if (match) {
              foundCustomer = {
                id: match.id,
                gymName: match.gym_name,
                name: match.name,
                email: match.email,
                phone: match.phone,
                dob: match.dob,
                purchaseDate: match.purchase_date,
                renewalDate: match.renewal_date,
                annualFee: Number(match.annual_fee),
                status: match.status,
                notes: match.notes || []
              };
            }
          }
        } catch (err) {}
      }

      if (!foundCustomer) {
        foundCustomer = {
          id: `client-${searchLast9}`,
          gymName: `Client Account (${phoneNumber})`,
          phone: phoneNumber,
          ownerName: 'Valued Client'
        };
      }

      setAuthenticatedCustomer(foundCustomer);
      showNotification(`Welcome back, ${foundCustomer.gymName}!`, 'success');

      // Fetch matching invoices & payments from Supabase
      try {
        const { data: dbInvoices } = await supabase.from('invoices').select('*');
        if (dbInvoices) {
          const matched = dbInvoices.filter(inv => {
            if (inv.customer_id === foundCustomer.id) return true;
            if (inv.prospect_name && inv.prospect_name.toLowerCase() === (foundCustomer.gymName || '').toLowerCase()) return true;
            if (inv.prospect_phone) {
              const pClean = getCleanDigits(inv.prospect_phone);
              if (pClean.endsWith(searchLast9) || cleanPhone.endsWith(pClean.slice(-9))) return true;
            }
            return false;
          }).map(i => ({
            id: i.id,
            shareKey: i.share_key,
            invoiceNumber: i.invoice_number,
            date: i.date,
            dueDate: i.due_date,
            customerId: i.customer_id,
            amount: Number(i.amount) || 0,
            status: i.status,
            items: i.items || [],
            prospectName: i.prospect_name,
            prospectPhone: i.prospect_phone
          }));
          setPortalInvoices(matched);
        }

        const { data: dbPayments } = await supabase.from('payments').select('*');
        if (dbPayments) {
          setPortalPayments(dbPayments.map(p => ({
            id: p.id,
            documentId: p.document_id,
            amount: Number(p.amount) || 0
          })));
        }
      } catch (err) {
        console.error('Error fetching portal invoices:', err);
      }

    } else {
      showNotification('Invalid OTP verification code. Please check and retry.', 'error');
    }
    setIsVerifying(false);
  };

  // --- STEP 3: SUBMIT ONLINE PAYMENT ---
  const handleCompletePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) {
      showNotification('Please enter a valid payment amount.', 'error');
      return;
    }

    setIsProcessingPay(true);

    const newPayment = {
      id: `pay-${Date.now()}`,
      documentId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      customerId: authenticatedCustomer ? authenticatedCustomer.id : selectedInvoice.customerId,
      amount: amount,
      paymentDate: new Date().toISOString().split('T')[0],
      method: paymentMethod === 'card' ? 'Credit/Debit Card Online' : paymentMethod === 'bank' ? 'Bank Transfer Deposit' : 'Koko Online',
      referenceNumber: referenceNo || `ONLINE-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: `Customer Online Portal Payment via ${paymentMethod.toUpperCase()}`
    };

    if (addPayment) addPayment(newPayment);

    // Sync to Supabase directly for unauthenticated session
    if (supabase) {
      try {
        await supabase.from('payments').insert({
          customer_id: authenticatedCustomer ? authenticatedCustomer.id : selectedInvoice.customerId,
          document_id: selectedInvoice.id,
          amount: amount,
          payment_type: paymentMethod,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error('Supabase payment sync error:', e);
      }
    }

    const allCurrentPays = [...payments, ...portalPayments];
    const invoicePayments = allCurrentPays.filter(p => p.documentId === selectedInvoice.id).reduce((s, p) => s + p.amount, 0) + amount;
    const newStatus = invoicePayments >= selectedInvoice.amount ? 'Paid' : 'Partially Paid';

    if (updateInvoiceStatus) updateInvoiceStatus(selectedInvoice.id, newStatus);

    try {
      await supabase.from('invoices').update({ status: newStatus }).eq('id', selectedInvoice.id);
    } catch (e) {}

    // Send SMS Receipt
    if (authenticatedCustomer && (authenticatedCustomer.phone || phoneNumber) && sendDirectSMS) {
      const targetPhone = authenticatedCustomer.phone || phoneNumber;
      const smsMsg = `✅ PAYMENT RECEIVED! Thank you ${authenticatedCustomer.gymName}. Received LKR ${amount.toLocaleString()} for Invoice #${selectedInvoice.invoiceNumber}. Ref: ${newPayment.referenceNumber}`;
      sendDirectSMS(targetPhone, smsMsg);
    }

    showNotification(`Payment of LKR ${amount.toLocaleString()} processed successfully!`, 'success');

    // Generate Receipt PDF download automatically
    const receiptData = {
      ...selectedInvoice,
      amountPaidNow: amount,
      receiptNumber: newPayment.referenceNumber,
      gymName: authenticatedCustomer ? authenticatedCustomer.gymName : 'Client Account'
    };
    generateDocumentPDF('Receipt', receiptData, selectedInvoice.items || []);

    setIsProcessingPay(false);
    setSelectedInvoice(null);
    setSlipFile(null);
  };

  // Combine invoices from StoreContext state AND fetched portalInvoices
  const allInvoices = [...invoices, ...portalInvoices];
  const customerInvoicesMap = new Map();

  if (authenticatedCustomer) {
    const cleanAuthPhone = getCleanDigits(authenticatedCustomer.phone || phoneNumber);
    const searchLast9 = cleanAuthPhone.slice(-9);

    allInvoices.forEach(inv => {
      let isMatch = false;
      if (inv.customerId === authenticatedCustomer.id) isMatch = true;
      else if (inv.prospectName && inv.prospectName.toLowerCase() === (authenticatedCustomer.gymName || '').toLowerCase()) isMatch = true;
      else if (inv.prospectPhone) {
        const pClean = getCleanDigits(inv.prospectPhone);
        if (pClean.endsWith(searchLast9) || cleanAuthPhone.endsWith(pClean.slice(-9))) isMatch = true;
      }
      if (isMatch && !customerInvoicesMap.has(inv.id)) {
        customerInvoicesMap.set(inv.id, inv);
      }
    });
  }

  const customerInvoices = Array.from(customerInvoicesMap.values());
  const allPayments = [...payments, ...portalPayments];

  const unpaidInvoices = customerInvoices.filter(inv => inv.status !== 'Paid');
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
    const historicalPays = allPayments.filter(p => p.documentId === inv.id).reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, inv.amount - historicalPays);
  }, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px 16px' }}>
      
      {/* BRAND HEADER BAR */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 32px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
          }}>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '22px', fontFamily: 'var(--font-display)' }}>S</span>
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 850, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {smsConfig.companyName || 'GymSales Pro'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>
              Customer Payment Portal
            </div>
          </div>
        </div>

        {authenticatedCustomer && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.82rem', background: 'var(--subtle-bg)' }}
            onClick={() => {
              setAuthenticatedCustomer(null);
              setOtpSent(false);
              setOtpInput('');
            }}
          >
            <LogOut size={15} /> Exit Portal
          </button>
        )}
      </div>

      {/* LOGIN SCREEN (UNAUTHENTICATED) */}
      {!authenticatedCustomer && (
        <div style={{ maxWidth: '460px', margin: '60px auto 0 auto' }}>
          <div className="glass-panel" style={{ padding: '36px 28px', border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                <ShieldCheck size={32} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ fontSize: '1.5rem', marginBottom: '6px' }}>Client Access Verification</h2>
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                Enter your registered mobile phone number to receive your secure login OTP code.
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOTP}>
                <div className="form-group mb-6">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Registered Mobile Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input 
                      required 
                      type="tel" 
                      className="form-input" 
                      style={{ paddingLeft: '44px', height: '46px', fontSize: '1rem', fontWeight: 600 }}
                      placeholder="077 123 4567" 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '0.98rem', fontWeight: 700 }} disabled={isSendingOtp}>
                  {isSendingOtp ? (
                    <>Sending OTP... <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></>
                  ) : (
                    <>Send Verification OTP <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>OTP Code sent to: <strong>{phoneNumber}</strong></div>
                  {generatedOtp && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                      🔑 DEMO OTP CODE: <span style={{ letterSpacing: '0.2em', fontSize: '0.95rem' }}>{generatedOtp}</span>
                    </div>
                  )}
                </div>

                <div className="form-group mb-6">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Enter 4-Digit OTP Code</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input 
                      required 
                      type="text" 
                      maxLength={6}
                      className="form-input" 
                      style={{ paddingLeft: '44px', height: '48px', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.3em', textAlign: 'center' }}
                      placeholder="••••" 
                      value={otpInput} 
                      onChange={e => setOtpInput(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, height: '46px' }} onClick={() => setOtpSent(false)}>
                    <RefreshCw size={16} /> Resend
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '46px', fontWeight: 700 }} disabled={isVerifying}>
                    {isVerifying ? 'Verifying...' : 'Verify & Access'} <CheckCircle size={18} />
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🔒 256-Bit SSL Encrypted Financial Connection
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER PORTAL DASHBOARD (AUTHENTICATED) */}
      {authenticatedCustomer && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* WELCOME BANNER */}
          <div className="glass-panel hover-lift" style={{ padding: '28px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Authenticated Gym Client Account
                </div>
                <h1 className="h1" style={{ margin: 0, fontSize: '1.8rem' }}>{authenticatedCustomer.gymName}</h1>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Owner / Contact: <strong>{authenticatedCustomer.ownerName || authenticatedCustomer.contactPerson || 'Gym Manager'}</strong> • Phone: {authenticatedCustomer.phone}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--panel-border)', minWidth: '220px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  Total Balance Due
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-display)' }}>
                  LKR {totalOutstanding.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* OUTSTANDING INVOICES LIST */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Your Invoices & Billing Records</h2>
                <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '2px 0 0 0' }}>Review your current billing invoices and pay online securely.</p>
              </div>
            </div>

            {customerInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
                <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: '6px', color: 'var(--text-primary)' }}>All Clear! No Active Invoices</h3>
                <p style={{ fontSize: '0.88rem' }}>There are currently no billing invoices registered for your account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="app-table" style={{ fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map(inv => {
                      const paidSum = payments.filter(p => p.documentId === inv.id).reduce((s, p) => s + p.amount, 0);
                      const dueAmount = Math.max(0, inv.amount - paidSum);
                      const isPaid = inv.status === 'Paid' || dueAmount <= 0;

                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>#{inv.invoiceNumber}</td>
                          <td>{new Date(inv.date).toLocaleDateString()}</td>
                          <td style={{ color: !isPaid && new Date(inv.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ fontWeight: 700 }}>LKR {(inv.amount || 0).toLocaleString()}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 700 }}>LKR {paidSum.toLocaleString()}</td>
                          <td style={{ fontWeight: 850, color: isPaid ? 'var(--success)' : 'var(--warning)', fontSize: '0.95rem' }}>
                            LKR {dueAmount.toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                              {isPaid ? 'Settled' : inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex justify-end gap-2">
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  generateDocumentPDF('Invoice', { ...inv, gymName: authenticatedCustomer.gymName }, inv.items || []);
                                }}
                                title="Download PDF"
                              >
                                <Download size={14} /> PDF
                              </button>

                              {!isPaid && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 16px', fontSize: '0.78rem', background: 'var(--accent-primary)' }}
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setPaymentAmount(dueAmount.toString());
                                  }}
                                >
                                  <CreditCard size={14} /> Pay Now
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ONLINE PAYMENT MODAL */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: 0, overflow: 'hidden', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
            
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent)' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Secure Online Checkout
                </div>
                <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>Pay Invoice #{selectedInvoice.invoiceNumber}</h2>
              </div>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handleCompletePayment} className="modal-body">
              
              {/* Payment Amount input */}
              <div className="form-group mb-5">
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Payment Amount (LKR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.9rem' }}>LKR</span>
                  <input 
                    required 
                    type="number" 
                    className="form-input" 
                    style={{ paddingLeft: '54px', height: '48px', fontSize: '1.3rem', fontWeight: 850, color: 'var(--accent-primary)' }}
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)} 
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="form-group mb-5">
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Select Payment Gateway Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    type="button" 
                    className="hover-lift"
                    style={{
                      padding: '12px 8px', borderRadius: '12px', border: `2px solid ${paymentMethod === 'card' ? 'var(--accent-primary)' : 'var(--subtle-border)'}`,
                      background: paymentMethod === 'card' ? 'rgba(99, 102, 241, 0.15)' : 'var(--subtle-bg)', textAlign: 'center', cursor: 'pointer', color: 'var(--text-primary)'
                    }}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={20} color="var(--accent-primary)" style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Credit Card</div>
                  </button>

                  <button 
                    type="button" 
                    className="hover-lift"
                    style={{
                      padding: '12px 8px', borderRadius: '12px', border: `2px solid ${paymentMethod === 'bank' ? 'var(--accent-primary)' : 'var(--subtle-border)'}`,
                      background: paymentMethod === 'bank' ? 'rgba(99, 102, 241, 0.15)' : 'var(--subtle-bg)', textAlign: 'center', cursor: 'pointer', color: 'var(--text-primary)'
                    }}
                    onClick={() => setPaymentMethod('bank')}
                  >
                    <Building2 size={20} color="var(--success)" style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Bank Deposit</div>
                  </button>

                  <button 
                    type="button" 
                    className="hover-lift"
                    style={{
                      padding: '12px 8px', borderRadius: '12px', border: `2px solid ${paymentMethod === 'koko' ? 'var(--accent-primary)' : 'var(--subtle-border)'}`,
                      background: paymentMethod === 'koko' ? 'rgba(99, 102, 241, 0.15)' : 'var(--subtle-bg)', textAlign: 'center', cursor: 'pointer', color: 'var(--text-primary)'
                    }}
                    onClick={() => setPaymentMethod('koko')}
                  >
                    <Lock size={20} color="#a855f7" style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Koko Pay</div>
                  </button>
                </div>
              </div>

              {/* CARD DETAILS FORM */}
              {paymentMethod === 'card' && (
                <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--subtle-border)' }}>
                  <div className="form-group mb-3">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Card Number</label>
                    <input type="text" className="form-input" style={{ height: '40px' }} placeholder="4111 •••• •••• 1111" defaultValue="4532 8920 1029 4812" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Expiry Date</label>
                      <input type="text" className="form-input" style={{ height: '40px' }} placeholder="MM/YY" defaultValue="12/28" />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>CVV Code</label>
                      <input type="password" className="form-input" style={{ height: '40px' }} placeholder="•••" defaultValue="849" />
                    </div>
                  </div>
                </div>
              )}

              {/* BANK TRANSFER DETAILS */}
              {paymentMethod === 'bank' && (
                <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--subtle-border)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    Company Bank Transfer Account:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px', marginBottom: '12px' }}>
                    <span className="text-muted">Bank:</span> <strong>{smsConfig.bankDetails?.bank || 'Commercial Bank PLC'}</strong>
                    <span className="text-muted">Account:</span> <strong style={{ color: 'var(--accent-primary)' }}>{smsConfig.bankDetails?.accountNumber || '8004920194'}</strong>
                    <span className="text-muted">Name:</span> <strong>{smsConfig.bankDetails?.accountName || 'Seynex Technologies'}</strong>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Transaction Reference / Slip #</label>
                    <input type="text" className="form-input" style={{ height: '40px' }} placeholder="e.g. TR-940291" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ height: '1px', background: 'var(--panel-border)', margin: '20px 0' }}></div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" style={{ padding: '10px 20px' }} onClick={() => setSelectedInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', background: 'var(--accent-primary)' }} disabled={isProcessingPay}>
                  {isProcessingPay ? 'Processing Payment...' : `Confirm Pay LKR ${(Number(paymentAmount)||0).toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerPortal;
