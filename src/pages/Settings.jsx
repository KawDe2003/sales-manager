import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Settings as SettingsIcon, CreditCard, MessageSquare, Save, RefreshCw, Building2, Globe, ShieldCheck, Mail, Phone, MapPin, Zap, Cake, Settings2, Info, Layout } from 'lucide-react';

const Settings = () => {
  const { smsConfig = {}, updateSmsConfig, fetchSmsBalance, showNotification, handleTestSms, resetToSeynexDefaults } = useContext(StoreContext) || {};
  const [balanceLoading, setBalanceLoading] = useState(false);

  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    if (fetchSmsBalance) await fetchSmsBalance();
    setBalanceLoading(false);
  };

  useEffect(() => {
    handleRefreshBalance();
  }, []);

  const handleSave = () => {
    showNotification('System configuration updated successfully.');
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="mb-10">
        <h1 className="h1 mb-2">System Configuration</h1>
        <p className="text-secondary" style={{ fontSize: '1rem' }}>Global settings for branding, API connectivity, and automated communication workflows.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Company & API */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Company Profile */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                <Building2 size={22} color="var(--success)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Corporate Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Dashboard Brand Name</label>
                <div style={{ position: 'relative' }}>
                  <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} 
                    placeholder="e.g. GymSales"
                    value={smsConfig.dashboardName || ''}
                    onChange={e => updateSmsConfig({...smsConfig, dashboardName: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Legal Entity Name</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyName || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyName: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Primary Email Header</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="email" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyEmail || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyEmail: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Support Line</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyPhone || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyPhone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Registered Office Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyAddress || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyAddress: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-panel">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.bank || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), bank: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Location</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.branch || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), branch: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.accountName || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountName: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.accountNumber || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountNumber: e.target.value}})} />
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Receipt Logo</label>
              <div style={{ position: 'relative' }}>
                <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input type="file" accept="image/*" className="form-input" style={{ paddingLeft: '40px' }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateSmsConfig({ ...smsConfig, receiptLogo: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {smsConfig.receiptLogo && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={smsConfig.receiptLogo} alt="Receipt Logo" style={{ height: '40px', borderRadius: '4px' }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }}
                    onClick={() => updateSmsConfig({ ...smsConfig, receiptLogo: '' })}>Remove</button>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Application Favicon</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input type="file" accept="image/*" className="form-input" style={{ paddingLeft: '40px' }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateSmsConfig({ ...smsConfig, appFavicon: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {smsConfig.appFavicon && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={smsConfig.appFavicon} alt="Favicon preview" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '4px' }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }}
                    onClick={() => updateSmsConfig({ ...smsConfig, appFavicon: '' })}>Remove</button>
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleSave}>
              <Save size={18} /> Push Branding Changes
            </button>
          </div>

          {/* SMS Gateway */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                <Globe size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Communications Gateway</h2>
            </div>

            <div className="form-group">
              <label className="form-label">API Infrastructure URL</label>
              <input type="text" className="form-input" 
                value={smsConfig.apiUrl || ''} 
                onChange={e => updateSmsConfig({...smsConfig, apiUrl: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Gateway Username</label>
                <input type="text" className="form-input" 
                  value={smsConfig.email || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cryptographic API Key</label>
                <input type="password" className="form-input" 
                  value={smsConfig.apiKey || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, apiKey: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Authorized Sender ID (SID)</label>
              <input type="text" className="form-input" 
                placeholder="SEYNEX"
                value={smsConfig.senderID || ''} 
                onChange={e => updateSmsConfig({...smsConfig, senderID: e.target.value})} 
              />
            </div>

            <div style={{ marginTop: '24px', padding: '24px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4), rgba(30, 41, 59, 0.2))', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
              <div className="flex justify-between items-end" style={{ marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepaid Wallet Balance</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: smsConfig.balance === 'Error' ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-display)' }}>
                      {smsConfig.balance !== undefined ? smsConfig.balance : '0.00'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>SMS Credits</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={balanceLoading}
                  className="btn btn-secondary"
                  style={{ animation: balanceLoading ? 'pulse 1s infinite' : 'none' }}
                >
                  <RefreshCw size={16} className={balanceLoading ? 'spin-anim' : ''} /> Sync
                </button>
              </div>

              <a 
                href={`https://quicksend.lk/Client/topup.php?email=${smsConfig.email}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary" 
                style={{ width: '100%', background: 'linear-gradient(to right, #3b82f6, #2563eb)' }}
              >
                <CreditCard size={18} /> Add Wallet Credits
              </a>
            </div>
          </div>

          {/* PDF Branding Section */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                <Layout size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>PDF Document Branding</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Document Theme Color</label>
              <div className="flex items-center gap-4">
                <input type="color" 
                  style={{ width: '60px', height: '42px', padding: '0', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer' }}
                  value={smsConfig.pdfColor || '#3b82f6'} 
                  onChange={e => updateSmsConfig({...smsConfig, pdfColor: e.target.value})} 
                />
                <input type="text" className="form-input" 
                  style={{ flex: 1 }}
                  value={smsConfig.pdfColor || '#3b82f6'} 
                  onChange={e => updateSmsConfig({...smsConfig, pdfColor: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">PDF Master Footer Text</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '60px', fontSize: '0.85rem' }}
                placeholder="e.g. Thank you for your business. Please process payment promptly."
                value={smsConfig.pdfFooterText || ''} 
                onChange={e => updateSmsConfig({...smsConfig, pdfFooterText: e.target.value})} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Document Notes (T&C)</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '100px', fontSize: '0.85rem' }}
                placeholder="e.g. This document is generated by GymSales Pro Management System."
                value={smsConfig.pdfNotes || ''} 
                onChange={e => updateSmsConfig({...smsConfig, pdfNotes: e.target.value})} 
              />
            </div>
            
            <div style={{ padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Pro Tip:</div>
              Branding changes apply instantly to all generated Quotations, Invoices, and Payment Receipts.
            </div>
          </div>

          {/* System Maintenance */}
          <div className="glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                <RefreshCw size={22} color="var(--danger)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>System Maintenance</h2>
            </div>
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Synchronize your application with the Seynex Technology business defaults. This will replace your current local data with the items and configurations from your business profile.</p>

            <button className="btn btn-secondary" 
              style={{ width: '100%', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', height: '48px' }} 
              onClick={resetToSeynexDefaults}
            >
              <RefreshCw size={18} /> Reset to Seynex Defaults
            </button>
          </div>
        </div>

        {/* Right Column: Templates & Branding */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Automation Rules */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px' }}>
                <Zap size={22} color="#a855f7" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Automated Workflows</h2>
            </div>
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Configure the system's background scheduler for automatic outbound reminders.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ fontWeight: 600 }}>Unpaid Invoices</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }} 
                      checked={smsConfig.autoInvoiceEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoInvoiceEnabled: e.target.checked})} 
                    />
                  </label>
                </div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Days Before Due:</label>
                <input type="number" className="form-input" 
                  value={smsConfig.autoInvoiceDays !== undefined ? smsConfig.autoInvoiceDays : 3} 
                  onChange={e => updateSmsConfig({...smsConfig, autoInvoiceDays: Number(e.target.value)})} 
                  disabled={!smsConfig.autoInvoiceEnabled}
                />
              </div>

              <div className="form-group" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ fontWeight: 600 }}>Annual Renewals</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }} 
                      checked={smsConfig.autoRenewalEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoRenewalEnabled: e.target.checked})} 
                    />
                  </label>
                </div>
                <input type="text" className="form-input" 
                  placeholder="15, 7, 1"
                  value={smsConfig.autoRenewalDays !== undefined ? smsConfig.autoRenewalDays : '7'} 
                  onChange={e => updateSmsConfig({...smsConfig, autoRenewalDays: e.target.value})} 
                  disabled={!smsConfig.autoRenewalEnabled}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                <MessageSquare size={22} color="var(--warning)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Smart Templates</h2>
            </div>
            
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Use bracket variables for dynamic injection.</p>

            <div className="flex flex-col gap-6">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Quote Delivery</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.quoteTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.quoteTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, quoteTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Receipt</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.thankYouTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.thankYouTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, thankYouTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Renewal Reminder</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.renewalTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.renewalTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, renewalTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice Due Reminder</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.invoiceReminderTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.invoiceReminderTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, invoiceReminderTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Birthday Greeting</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.birthdayTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.birthdayTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, birthdayTemplate: e.target.value})} 
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Auto-Save Protocol</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Changes are automatically staged and persisted.</p>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '32px', height: '50px' }} onClick={handleSave}>
              <Save size={20} /> Update Configuration
            </button>
          </div>

          {/* Advanced SMS Protocols */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                <Settings2 size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Advanced SMS Protocols</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Global Header</label>
                <input type="text" className="form-input" 
                  value={smsConfig.smsHeader || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, smsHeader: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Global Footer</label>
                <input type="text" className="form-input" 
                  value={smsConfig.smsFooter || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, smsFooter: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                <ShieldCheck size={22} color="var(--danger)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Security & Access</h2>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Inactivity Session Timeout</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Minutes</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ paddingLeft: '40px' }}
                  min="1"
                  max="1440"
                  value={smsConfig.sessionTimeout || 5} 
                  onChange={e => updateSmsConfig({...smsConfig, sessionTimeout: parseInt(e.target.value) || 1})} 
                />
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automatically logout the user after the specified period of inactivity. This helps protect your data if you leave the dashboard open.
              </p>
            </div>
          </div>

          {/* Dynamic Variable Glossary */}
          <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                <Info size={18} color="var(--accent-primary)" />
              </div>
              <h2 className="h3" style={{ margin: 0 }}>Template Variable Glossary</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <VariableTag tag="{name}" desc="Recipient's Name" />
              <VariableTag tag="{gym}" desc="Client's Business Name" />
              <VariableTag tag="{companyName}" desc="Your Identity Name" />
              <VariableTag tag="{amount}" desc="Total Amount (LKR)" />
              <VariableTag tag="{date}" desc="Due Date" />
              <VariableTag tag="{invoiceNumber}" desc="Invoice #" />
              <VariableTag tag="{link}" desc="Online Document Link" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const VariableTag = ({ tag, desc }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '8px 12px', 
    background: 'rgba(255, 255, 255, 0.03)', 
    borderRadius: '8px',
    border: '1px solid var(--panel-border)'
  }}>
    <code style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>{tag}</code>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{desc}</span>
  </div>
);

export default Settings;
