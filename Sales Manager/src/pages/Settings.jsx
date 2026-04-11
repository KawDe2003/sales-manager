import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Settings as SettingsIcon, CreditCard, MessageSquare, Save, RefreshCw, Building2, Globe, ShieldCheck, Mail, Phone, MapPin, Zap } from 'lucide-react';

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="mb-12">
        <h1 className="h1 mb-2 font-black tracking-tight">System Configuration</h1>
        <p className="text-[var(--text-secondary)] font-medium max-w-2xl">Global settings for branding, API connectivity, and automated communication workflows.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Company & API */}
        <div className="lg:col-span-7 flex flex-col gap-10">
          
          {/* Company Profile */}
          <div className="glass-panel p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Building2 size={24} className="text-[var(--success)]" />
              </div>
              <div>
                <h2 className="h2 text-xl font-black">Corporate Identity</h2>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Branding & Legal Information</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Legal Entity Name</label>
                <div className="relative group">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                  <input type="text" className="form-input pl-12 h-12 font-bold rounded-xl" value={smsConfig.companyName || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyName: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Primary Email Header</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                  <input type="email" className="form-input pl-12 h-12 font-bold rounded-xl" value={smsConfig.companyEmail || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyEmail: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Customer Support Line</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                  <input type="text" className="form-input pl-12 h-12 font-bold rounded-xl" value={smsConfig.companyPhone || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyPhone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Registered Office Address</label>
                <div className="relative group">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                  <input type="text" className="form-input pl-12 h-12 font-bold rounded-xl" value={smsConfig.companyAddress || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyAddress: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 pt-8 border-t border-[var(--panel-border)]">
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest text-[var(--accent-primary)]">Settlement Bank</label>
                <input type="text" className="form-input h-11 font-bold rounded-xl" placeholder="Bank Name" value={smsConfig.bankDetails?.bank || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), bank: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Branch Location</label>
                <input type="text" className="form-input h-11 font-bold rounded-xl" placeholder="Branch" value={smsConfig.bankDetails?.branch || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), branch: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Account Holder</label>
                <input type="text" className="form-input h-11 font-bold rounded-xl" placeholder="Name on Account" value={smsConfig.bankDetails?.accountName || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountName: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Account Number</label>
                <input type="text" className="form-input h-11 font-bold rounded-xl" placeholder="0000 0000 0000" value={smsConfig.bankDetails?.accountNumber || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountNumber: e.target.value}})} />
              </div>
            </div>
            
            <button className="btn btn-primary mt-6 py-4 px-8 w-full sm:w-auto text-[10px] font-black uppercase tracking-widest" onClick={handleSave}>
              <Save size={18} /> Push Branding Changes
            </button>
          </div>

          {/* SMS Gateway */}
          <div className="glass-panel p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Globe size={24} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h2 className="h2 text-xl font-black">Communications Gateway</h2>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">QuickSend API Configuration</p>
              </div>
            </div>

            <div className="form-group mb-8">
              <label className="form-label text-[10px] font-black tracking-widest">API Infrastructure URL</label>
              <input type="text" className="form-input h-12 font-bold rounded-xl" 
                value={smsConfig.apiUrl || ''} 
                onChange={e => updateSmsConfig({...smsConfig, apiUrl: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Gateway Username</label>
                <input type="text" className="form-input h-12 font-bold rounded-xl" 
                  value={smsConfig.email || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label text-[10px] font-black tracking-widest">Cryptographic API Key</label>
                <input type="password" password="true" className="form-input h-12 font-bold rounded-xl" 
                  value={smsConfig.apiKey || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, apiKey: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="form-group mb-10">
              <label className="form-label text-[10px] font-black tracking-widest">Authorized Sender ID (SID)</label>
              <input type="text" className="form-input h-12 font-bold rounded-xl uppercase" 
                placeholder="SEYNEX"
                value={smsConfig.senderID || ''} 
                onChange={e => updateSmsConfig({...smsConfig, senderID: e.target.value})} 
              />
            </div>

            <div className="p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/10 rounded-3xl border border-[var(--panel-border)] shadow-inner">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
                <div>
                  <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Prepaid Wallet Balance</h3>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-4xl md:text-5xl font-black font-['Outfit'] tracking-tighter ${smsConfig.balance === 'Error' ? 'text-[var(--danger)]' : 'text-[var(--success)] shadow-emerald-500/20'}`}>
                      {smsConfig.balance !== undefined ? smsConfig.balance : '0.00'}
                    </span>
                    <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">SMS Credits</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={balanceLoading}
                  className={`btn btn-secondary py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group transition-all ${balanceLoading ? 'animate-pulse opacity-50' : 'hover:bg-white/10'}`}
                >
                  <RefreshCw size={14} className={`${balanceLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> Sync
                </button>
              </div>

              <a 
                href={`https://quicksend.lk/Client/topup.php?email=${smsConfig.email}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 text-[11px] font-black uppercase tracking-widest"
              >
                <CreditCard size={20} /> Add Wallet Credits
              </a>
            </div>
          </div>
          {/* Automation Rules */}
          <div className="glass-panel p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <Zap size={24} className="text-purple-500" />
              </div>
              <div>
                <h2 className="h2 text-xl font-black">Automated Workflows</h2>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Background Scheduler Configuration</p>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] mb-8 font-medium text-sm leading-relaxed">Configure the system's background scheduler for automatic outbound reminders. SMS will automatically send when conditions are met.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="p-6 bg-white/5 rounded-2xl border border-[var(--panel-border)] group hover:border-[var(--accent-primary)]/30 transition-all">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-black text-[10px] uppercase tracking-widest">Unpaid Invoices</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" 
                      checked={smsConfig.autoInvoiceEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoInvoiceEnabled: e.target.checked})} 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>
                <label className="form-label text-[9px] font-black tracking-widest opacity-60">Days Before Due Date:</label>
                <input type="number" className="form-input h-11 font-bold rounded-xl text-center" 
                  value={smsConfig.autoInvoiceDays !== undefined ? smsConfig.autoInvoiceDays : 3} 
                  onChange={e => updateSmsConfig({...smsConfig, autoInvoiceDays: Number(e.target.value)})} 
                  disabled={!smsConfig.autoInvoiceEnabled}
                />
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-[var(--panel-border)] group hover:border-purple-500/30 transition-all">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-black text-[10px] uppercase tracking-widest">Annual Renewals</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" 
                      checked={smsConfig.autoRenewalEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoRenewalEnabled: e.target.checked})} 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label text-[9px] font-black tracking-widest opacity-60">Days Before Expiry:</label>
                  <span className="text-[9px] font-black text-[var(--accent-primary)] opacity-60 tracking-wider">COMMA SEPARATED</span>
                </div>
                <input type="text" className="form-input h-11 font-bold rounded-xl text-center" 
                  placeholder="15, 7, 1"
                  value={smsConfig.autoRenewalDays !== undefined ? smsConfig.autoRenewalDays : '7'} 
                  onChange={e => updateSmsConfig({...smsConfig, autoRenewalDays: e.target.value})} 
                  disabled={!smsConfig.autoRenewalEnabled}
                />
              </div>
            </div>
          </div>

          {/* System Maintenance */}
          <div className="glass-panel p-8 border-rose-500/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <RefreshCw size={24} className="text-[var(--danger)]" />
              </div>
              <div>
                <h2 className="h2 text-xl font-black">System Maintenance</h2>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Seynex Cloud Synchronization</p>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] mb-10 font-medium text-sm leading-relaxed">Synchronize your application with the Seynex Technology business defaults. This will replace your current local data with the items and configurations from your business profile.</p>

            <button className="btn btn-secondary w-full h-14 rounded-2xl border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 font-black uppercase text-[10px] tracking-widest group transition-all" 
              onClick={resetToSeynexDefaults}
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> Reset to Seynex Defaults
            </button>
          </div>
        </div>

        {/* Right Column: Templates */}
        <div className="lg:col-span-5 h-full">
          <div className="glass-panel p-8 h-full flex flex-col">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <MessageSquare size={24} className="text-[var(--warning)]" />
              </div>
              <div>
                <h2 className="h2 text-xl font-black">Smart Templates</h2>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Dynamic Message Payloads</p>
              </div>
            </div>
            
            <p className="text-[var(--text-secondary)] mb-8 font-medium text-sm leading-relaxed">Configure automated message payloads. Use standard bracket variables for dynamic injection.</p>

            <div className="flex flex-col gap-10 flex-1">
              {[
                { label: 'Quote Delivery', value: 'quoteTemplate', placeholders: '{name}, {gym}, {amount}, {link}' },
                { label: 'Payment Receipt', value: 'thankYouTemplate', placeholders: '{name}, {gym}, {invoiceNumber}' },
                { label: 'Renewal Reminder', value: 'renewalTemplate', placeholders: '{name}, {gym}, {amount}, {date}' },
                { label: 'Invoice Due Reminder', value: 'invoiceReminderTemplate', placeholders: '{name}, {gym}, {invoiceNumber}, {amount}, {date}' }
              ].map((template) => (
                <div key={template.value} className="form-group flex flex-col gap-3 group">
                  <div className="flex justify-between items-center px-1">
                    <span className="font-black text-[10px] uppercase tracking-widest text-[var(--text-primary)]">{template.label}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${String(smsConfig[template.value] || '').length > 150 ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                      {String(smsConfig[template.value] || '').length}/160
                    </span>
                  </div>
                  <textarea 
                    className="form-input min-h-[100px] p-4 rounded-2xl resize-none italic font-medium leading-relaxed bg-black/10 border-transparent focus:bg-black/20 focus:border-[var(--accent-primary)]/30 group-hover:border-[var(--panel-border)]" 
                    value={smsConfig[template.value] || ''} 
                    onChange={e => updateSmsConfig({...smsConfig, [template.value]: e.target.value})} 
                  />
                  <div className="flex justify-between items-center px-1">
                    <div className="text-[9px] font-black text-[var(--accent-primary)] opacity-40 group-focus-within:opacity-100 transition-opacity uppercase tracking-widest">
                      {template.placeholders}
                    </div>
                    <button type="button" className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-4" onClick={() => handleTestSms && handleTestSms(smsConfig[template.value] || '')}>Preview</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-start gap-4">
              <ShieldCheck size={20} className="text-[var(--success)] shrink-0 mt-1" />
              <div>
                <span className="font-black text-[10px] text-[var(--success)] uppercase tracking-widest block mb-1">Auto-Save Protocol</span>
                <p className="text-xs font-semibold text-[var(--text-secondary)] opacity-70 leading-relaxed">Changes are automatically staged and persisted to encrypted local storage every 500ms.</p>
              </div>
            </div>

            <button className="btn btn-primary w-full mt-8 h-14 rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-black uppercase tracking-widest" onClick={handleSave}>
              <Save size={20} /> Update Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
