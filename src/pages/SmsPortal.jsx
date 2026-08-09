import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  MessageSquare, Send, Users, RefreshCw, Smartphone, ShieldCheck, 
  Zap, Sparkles, Check, Copy, Clock, Filter, AlertCircle, PlusCircle, 
  CheckCircle2, Layout, FileText, Info, Phone, Search, X, CheckCircle
} from 'lucide-react';

const SmsPortal = () => {
  const { 
    smsConfig = {}, updateSmsConfig, fetchSmsBalance, showNotification, 
    sendDirectSMS, sendBulkSMSArray, handleTestSms,
    customers = [], leads = [], invoices = [], activityLogs = []
  } = useContext(StoreContext) || {};

  const [activeTab, setActiveTab] = useState('broadcast'); // 'broadcast' | 'direct' | 'templates' | 'history'
  const [balanceLoading, setBalanceLoading] = useState(false);

  // --- Bulk Broadcast State ---
  const [targetAudience, setTargetAudience] = useState('active_gyms'); // 'active_gyms' | 'overdue_debtors' | 'leads' | 'custom'
  const [customPhoneNumbers, setCustomPhoneNumbers] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // --- Direct SMS State ---
  const [directRecipient, setDirectRecipient] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // --- Local Template Editing State ---
  const [localConfig, setLocalConfig] = useState({ ...smsConfig });

  useEffect(() => {
    setLocalConfig({ ...smsConfig });
  }, [smsConfig]);

  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    if (fetchSmsBalance) await fetchSmsBalance();
    setBalanceLoading(false);
  };

  // Helper to extract phone list based on audience
  const getTargetRecipients = () => {
    if (targetAudience === 'active_gyms') {
      return customers
        .filter(c => c.status === 'Active' && c.phone)
        .map(c => ({ id: c.id, name: c.name || c.gymName, phone: c.phone, label: c.gymName }));
    }
    if (targetAudience === 'overdue_debtors') {
      const overdueInvoices = invoices.filter(i => i.status === 'Overdue' && (i.phone || i.customerPhone));
      // Deduplicate by phone
      const unique = [];
      const map = new Set();
      for (const inv of overdueInvoices) {
        const p = inv.phone || inv.customerPhone;
        if (p && !map.has(p)) {
          map.add(p);
          unique.push({ id: inv.id, name: inv.prospectName, phone: p, label: `${inv.prospectName} (${inv.invoiceNumber})` });
        }
      }
      return unique;
    }
    if (targetAudience === 'leads') {
      return leads
        .filter(l => l.phone)
        .map(l => ({ id: l.id, name: l.gymName || l.contactPerson, phone: l.phone, label: l.gymName }));
    }
    if (targetAudience === 'custom') {
      const raw = customPhoneNumbers
        .split(/[\n,;]+/)
        .map(p => p.trim())
        .filter(p => p.length >= 7);
      return raw.map((p, idx) => ({ id: `custom-${idx}`, name: `Recipient #${idx + 1}`, phone: p, label: p }));
    }
    return [];
  };

  const recipients = getTargetRecipients();

  // Template Quick Loader
  const handleLoadTemplate = (e) => {
    const key = e.target.value;
    setSelectedTemplateKey(key);
    if (!key) return;

    let tpl = '';
    if (key === 'renewal') tpl = smsConfig.renewalTemplate || 'Hi {name}, your annual subscription for {gym} is due on {date}. Amount: LKR {amount}. Thank you!';
    else if (key === 'debtor') tpl = smsConfig.debtorNudgeTemplate || 'Hi {name}, friendly reminder that Invoice {invoiceNumber} has an outstanding balance of LKR {amount}. Please settle soon.';
    else if (key === 'promo') tpl = 'Hi {name}! Exclusive special offer for {gym} from {companyName}. Get 20% off equipment & maintenance package this week!';
    else if (key === 'cash') tpl = smsConfig.cashReceivedTemplate || 'Dear {name}, we received your payment of LKR {amount} for {gym}. Receipt updated.';
    else if (key === 'birthday') tpl = smsConfig.birthdayTemplate || 'Happy Birthday {name}! Best wishes from {companyName}.';
    
    setBroadcastMessage(tpl);
  };

  const insertTag = (tag, isDirect = false) => {
    if (isDirect) {
      setDirectMessage(prev => `${prev} ${tag}`.trim());
    } else {
      setBroadcastMessage(prev => `${prev} ${tag}`.trim());
    }
  };

  // Preview Message Builder
  const getRenderedPreview = (rawMsg, sampleRecipient = null) => {
    let msg = rawMsg || '';
    if (smsConfig.smsHeader) msg = `${smsConfig.smsHeader}\n${msg}`;
    if (smsConfig.smsFooter) msg = `${msg}\n${smsConfig.smsFooter}`;

    const rName = sampleRecipient?.name || 'Kasun Perera';
    const rGym = sampleRecipient?.label || 'PowerWorld Gym';

    return msg
      .replace(/{name}/g, rName)
      .replace(/{gym}/g, rGym)
      .replace(/{companyName}/g, smsConfig.companyName || 'Seynex Sales Pro')
      .replace(/{amount}/g, '15,000')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{invoiceNumber}/g, 'INV-1042')
      .replace(/{link}/g, 'https://seynex.com/pay');
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showNotification && showNotification('Please compose a message for the broadcast.', 'error');
      return;
    }
    if (recipients.length === 0) {
      showNotification && showNotification('No recipients selected for broadcast.', 'error');
      return;
    }

    if (!window.confirm(`Confirm dispatching SMS Broadcast to ${recipients.length} contact(s)?`)) return;

    setIsSendingBroadcast(true);
    const phoneNumbers = recipients.map(r => r.phone);
    
    if (sendBulkSMSArray) {
      await sendBulkSMSArray(phoneNumbers, broadcastMessage);
    }
    setIsSendingBroadcast(false);
  };

  const handleSendSingleDirect = async (e) => {
    e.preventDefault();
    if (!directPhone || !directMessage) {
      showNotification && showNotification('Please provide both recipient phone number and message.', 'error');
      return;
    }

    setIsSendingDirect(true);
    if (sendDirectSMS) {
      await sendDirectSMS(directPhone, directMessage);
      setDirectMessage('');
    }
    setIsSendingDirect(false);
  };

  const handleSaveTemplates = (e) => {
    e.preventDefault();
    if (updateSmsConfig) {
      updateSmsConfig(localConfig);
      showNotification && showNotification('SMS templates and gateway settings saved successfully!');
    }
  };

  // Filter logs for SMS entries
  const smsLogs = (activityLogs || []).filter(l => l.type === 'SMS' || l.message?.toLowerCase().includes('sms'));

  const charCount = broadcastMessage.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div style={{ animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <MessageSquare size={24} color="var(--accent-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Communications Engine</div>
              <h1 className="h1" style={{ margin: 0 }}>SMS Portal & Bulk Broadcast</h1>
            </div>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.92rem', margin: 0 }}>
            Dispatch bulk promotional campaigns, send instant payment reminders, manage messaging templates, and monitor API credits.
          </p>
        </div>

        {/* SMS WALLET CARD */}
        <div className="glass-panel" style={{
          padding: '16px 22px', borderRadius: '16px', border: '1px solid var(--panel-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', minWidth: '290px',
          boxShadow: '0 8px 24px -6px rgba(0,0,0,0.1)'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              SMS Credit Balance
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                {(() => {
                  const b = smsConfig.balance;
                  if (b === undefined || b === null || b === '') return 'LKR 2,450.00';
                  if (typeof b === 'number') return `LKR ${b.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  const str = String(b).trim();
                  if (str.startsWith('LKR')) return str;
                  const parsed = parseFloat(str);
                  return !isNaN(parsed) ? `LKR ${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : str;
                })()}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', items: 'center', gap: '6px' }}>
              <span>Sender SID:</span>
              <span style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.75rem',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                {smsConfig.senderID || 'SEYNEX'}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn"
            style={{ 
              padding: '10px', 
              borderRadius: '12px',
              background: 'var(--subtle-bg)',
              border: '1px solid var(--panel-border)',
              color: 'var(--text-primary)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }} 
            onClick={handleRefreshBalance}
            disabled={balanceLoading}
            title="Refresh SMS Balance"
          >
            <RefreshCw size={18} className={balanceLoading ? "animate-spin" : ""} color="var(--text-primary)" />
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="glass-panel" style={{ padding: '6px', marginBottom: '24px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        <button 
          className={`btn ${activeTab === 'broadcast' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('broadcast')}
        >
          <Send size={16} /> Bulk SMS Broadcast
        </button>
        <button 
          className={`btn ${activeTab === 'direct' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('direct')}
        >
          <Smartphone size={16} /> Direct Composer
        </button>
        <button 
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={16} /> Template Library
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} /> Dispatch Logs
        </button>
      </div>

      {/* TAB 1: BULK SMS BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Target Audience & Composer */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex items-center gap-2 mb-4" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
                <Users size={18} color="var(--accent-primary)" />
                <h3 className="h3" style={{ margin: 0, fontSize: '1.1rem' }}>1. Select Target Audience</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setTargetAudience('active_gyms')}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', textAlign: 'left',
                    background: targetAudience === 'active_gyms' ? 'rgba(99, 102, 241, 0.15)' : 'var(--subtle-bg)',
                    border: `1px solid ${targetAudience === 'active_gyms' ? 'var(--accent-primary)' : 'var(--subtle-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: targetAudience === 'active_gyms' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Active Gyms</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customers.filter(c => c.status === 'Active' && c.phone).length} Accounts</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('overdue_debtors')}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', textAlign: 'left',
                    background: targetAudience === 'overdue_debtors' ? 'rgba(244, 63, 94, 0.15)' : 'var(--subtle-bg)',
                    border: `1px solid ${targetAudience === 'overdue_debtors' ? 'var(--danger)' : 'var(--subtle-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: targetAudience === 'overdue_debtors' ? 'var(--danger)' : 'var(--text-primary)' }}>Overdue Debtors</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{invoices.filter(i => i.status === 'Overdue').length} Debtors</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('leads')}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', textAlign: 'left',
                    background: targetAudience === 'leads' ? 'rgba(245, 158, 11, 0.15)' : 'var(--subtle-bg)',
                    border: `1px solid ${targetAudience === 'leads' ? 'var(--warning)' : 'var(--subtle-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: targetAudience === 'leads' ? 'var(--warning)' : 'var(--text-primary)' }}>Leads & Prospects</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leads.filter(l => l.phone).length} Prospects</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('custom')}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', textAlign: 'left',
                    background: targetAudience === 'custom' ? 'rgba(168, 85, 247, 0.15)' : 'var(--subtle-bg)',
                    border: `1px solid ${targetAudience === 'custom' ? '#a855f7' : 'var(--subtle-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: targetAudience === 'custom' ? '#a855f7' : 'var(--text-primary)' }}>Custom List</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paste Phone Numbers</div>
                </button>
              </div>

              {targetAudience === 'custom' && (
                <div className="form-group mb-4">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Enter Phone Numbers (comma or line separated)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="0771234567, 0719876543, 0751112223"
                    value={customPhoneNumbers}
                    onChange={e => setCustomPhoneNumbers(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Target Count Indicator */}
              <div style={{
                padding: '10px 14px', background: 'var(--subtle-bg)', borderRadius: '10px',
                border: '1px solid var(--subtle-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Target Audience Selected: <span style={{ color: 'var(--accent-primary)' }}>{recipients.length} Recipient(s)</span>
                  </span>
                </div>
                {recipients.length > 0 && (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Ready to Broadcast</span>
                )}
              </div>
            </div>

            {/* COMPOSER */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex justify-between items-center mb-4" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
                <div className="flex items-center gap-2">
                  <Send size={18} color="var(--accent-primary)" />
                  <h3 className="h3" style={{ margin: 0, fontSize: '1.1rem' }}>2. Compose Broadcast Message</h3>
                </div>
                <select 
                  className="form-input" 
                  style={{ height: '36px', fontSize: '0.8rem', width: '220px' }}
                  value={selectedTemplateKey}
                  onChange={handleLoadTemplate}
                >
                  <option value="">-- Load Predefined Template --</option>
                  <option value="renewal">📅 Subscription Renewal</option>
                  <option value="debtor">⚠️ Overdue Payment Nudge</option>
                  <option value="promo">🎉 Promotional Special Offer</option>
                  <option value="cash">🧾 Cash Payment Confirmation</option>
                  <option value="birthday">🎂 Birthday Greetings</option>
                </select>
              </div>

              {/* Dynamic Tag Quick Insert */}
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Insert Tag:</span>
                {['{name}', '{gym}', '{amount}', '{date}', '{invoiceNumber}', '{companyName}', '{link}'].map(tag => (
                  <button 
                    key={tag}
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.08)' }}
                    onClick={() => insertTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea 
                className="form-input mb-2" 
                rows={5}
                placeholder="Type your broadcast message here..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                style={{ fontSize: '0.95rem', lineHeight: 1.5 }}
              />

              <div className="flex justify-between items-center text-secondary mb-6" style={{ fontSize: '0.78rem' }}>
                <div>
                  Character Count: <strong>{charCount}</strong> | Segments: <strong>{smsSegments} SMS</strong> per recipient
                </div>
                <div>Estimated Total SMS: <strong>{recipients.length * smsSegments} credits</strong></div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => handleTestSms && handleTestSms(broadcastMessage)}
                  style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  <Sparkles size={16} /> Test Preview
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSendBroadcast}
                  disabled={isSendingBroadcast || recipients.length === 0}
                  style={{ padding: '10px 24px', fontSize: '0.9rem', gap: '8px' }}
                >
                  <Send size={16} /> {isSendingBroadcast ? "Dispatching..." : `Send to ${recipients.length} Contacts`}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Mobile Display Preview */}
          <div className="lg:col-span-1">
            <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '20px' }}>
              <div className="flex items-center gap-2 mb-4" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
                <Smartphone size={18} color="var(--accent-primary)" />
                <h3 className="h3" style={{ margin: 0, fontSize: '1.1rem' }}>Live Phone Output</h3>
              </div>

              {/* Mockup Mobile Frame */}
              <div style={{
                background: '#090d16', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '24px',
                padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative'
              }}>
                <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', margin: '0 auto 16px' }}></div>
                
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                  SMS From: {smsConfig.senderID || 'SEYNEX'}
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
                  borderRadius: '16px', padding: '14px', border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#f8fafc', fontSize: '0.85rem', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-line'
                }}>
                  {getRenderedPreview(broadcastMessage, recipients[0])}
                </div>

                <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.65rem', color: '#64748b' }}>
                  Now &bull; Delivery via QuickSend API
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '14px', background: 'var(--subtle-bg)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                💡 <strong>Tip:</strong> Variables like <code>{'{name}'}</code> and <code>{'{gym}'}</code> automatically replace with each customer's specific details upon dispatch.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT SINGLE SMS */}
      {activeTab === 'direct' && (
        <div className="glass-panel" style={{ maxWidth: '640px', margin: '0 auto', padding: '28px' }}>
          <div className="flex items-center gap-3 mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
              <Smartphone size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.2rem' }}>Direct Single SMS Composer</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send an instant single message to any client or custom phone number.</p>
            </div>
          </div>

          <form onSubmit={handleSendSingleDirect}>
            <div className="form-group mb-4">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Select Client or Prospect (Optional)</label>
              <select 
                className="form-input" 
                style={{ height: '42px' }}
                value={directRecipient}
                onChange={e => {
                  const val = e.target.value;
                  setDirectRecipient(val);
                  if (val) setDirectPhone(val);
                }}
              >
                <option value="">-- Choose Existing Contact --</option>
                {customers.filter(c => c.phone).map(c => (
                  <option key={c.id} value={c.phone}>{c.gymName} ({c.name}) - {c.phone}</option>
                ))}
                {leads.filter(l => l.phone).map(l => (
                  <option key={l.id} value={l.phone}>[Lead] {l.gymName} - {l.phone}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Recipient Phone Number</label>
              <input 
                required 
                type="text" 
                className="form-input" 
                style={{ height: '42px' }} 
                placeholder="e.g. 0771234567 or +94771234567" 
                value={directPhone} 
                onChange={e => setDirectPhone(e.target.value)} 
              />
            </div>

            {/* Tag Buttons */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Insert Tag:</span>
              {['{name}', '{gym}', '{companyName}', '{amount}'].map(tag => (
                <button 
                  key={tag}
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={() => insertTag(tag, true)}
                >
                  + {tag}
                </button>
              ))}
            </div>

            <div className="form-group mb-6">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Message Text</label>
              <textarea 
                required 
                className="form-input" 
                rows={4} 
                placeholder="Type your message..." 
                value={directMessage} 
                onChange={e => setDirectMessage(e.target.value)} 
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSendingDirect}
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                <Send size={16} /> {isSendingDirect ? "Sending..." : "Send SMS Now"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TEMPLATES & GATEWAY SETTINGS */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} className="glass-panel" style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div className="flex items-center gap-3">
              <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px' }}>
                <FileText size={20} color="#a855f7" />
              </div>
              <div>
                <h2 className="h2" style={{ margin: 0, fontSize: '1.2rem' }}>SMS Message Templates & Branding</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure automated message triggers, headers, and footers.</p>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
              Save All Templates
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Global SMS Header Wrapper</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="[SEYNEX SALES]" 
                value={localConfig.smsHeader || ''} 
                onChange={e => setLocalConfig({ ...localConfig, smsHeader: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Global SMS Footer Wrapper</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Hotline: +94 77 123 4567" 
                value={localConfig.smsFooter || ''} 
                onChange={e => setLocalConfig({ ...localConfig, smsFooter: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Subscription Renewal Reminder Template</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={localConfig.renewalTemplate || ''} 
                onChange={e => setLocalConfig({ ...localConfig, renewalTemplate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Overdue Debtor Nudge Template</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={localConfig.debtorNudgeTemplate || ''} 
                onChange={e => setLocalConfig({ ...localConfig, debtorNudgeTemplate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Quotation Notification Template</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={localConfig.quoteTemplate || ''} 
                onChange={e => setLocalConfig({ ...localConfig, quoteTemplate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Payment Thank You / Receipt Template</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={localConfig.thankYouTemplate || ''} 
                onChange={e => setLocalConfig({ ...localConfig, thankYouTemplate: e.target.value })} 
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: DISPATCH HISTORY & LOGS */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div className="flex items-center gap-3">
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
                <Clock size={20} color="var(--accent-primary)" />
              </div>
              <div>
                <h2 className="h2" style={{ margin: 0, fontSize: '1.2rem' }}>SMS Outbox & Dispatch History</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical log of sent messages and broadcast dispatches.</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Log Message Details</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                      <p className="text-secondary" style={{ margin: 0 }}>No SMS dispatch records found.</p>
                    </td>
                  </tr>
                ) : (
                  [...smsLogs].reverse().map((log, i) => (
                    <tr key={log.id || i}>
                      <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp || Date.now()).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>SMS DISPATCH</span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {log.message}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                          <Check size={10} /> Delivered
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsPortal;
