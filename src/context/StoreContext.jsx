import React, { createContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const StoreContext = createContext();

export default function StoreContextProvider({ children }) {
  const { user } = useAuth();
  // Initialize state with localStorage or default mock data
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('gym_customers');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'target-fitness-01', name: 'Mr Sidath Rathnayake', gymName: 'Target Fitness', email: '', phone: '0777888637', dob: '1985-04-11', purchaseDate: '2026-02-24', renewalDate: '2027-02-24', annualFee: 70000, status: 'Active', notes: [] },
      { id: uuidv4(), name: 'John Doe', gymName: 'FitLife Gym', email: 'john@fitlife.com', phone: '0712345678', dob: '1990-05-15', purchaseDate: '2023-05-15', renewalDate: '2024-05-15', annualFee: 1200, status: 'Active', notes: [] },
    ];
  });

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('gym_inventory');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'inv-item-01', name: 'ZKTeco SenseFace 3 (Fingerprint / Face ID)', type: 'Hardware', price: 130000, stock: 12, desc: 'Advanced Biometric Terminal with RFID support' },
      { id: 'inv-item-02', name: 'Electromagnetic Lock (Glass Door)', type: 'Hardware', price: 16500, stock: 25, desc: 'Secure magnetic locking system with matching brackets' },
      { id: 'inv-item-03', name: 'Power Supply Unit for Lock & Device', type: 'Hardware', price: 18000, stock: 15, desc: 'Stable 12V supply for uninterrupted security' },
      { id: 'inv-item-04', name: 'Glass Break Switch', type: 'Hardware', price: 5500, stock: 40, desc: 'Emergency release for safety compliance' },
      { id: 'inv-item-05', name: 'Battery Backup', type: 'Hardware', price: 7000, stock: 10, desc: '12V 7Ah backup for power failure' },
      { id: 'inv-item-06', name: 'Cabling & Networking Material', type: 'Hardware', price: 5000, stock: 100, desc: 'Cat6 cabling and conduit accessories' },
      { id: 'inv-item-07', name: 'Installation & Technical Configuration', type: 'Service', price: 14500, stock: null, desc: 'On-site terminal setup and cloud integration' },
      { id: 'inv-item-08', name: 'Push Cloud Service (Annual Fee)', type: 'Software', price: 20000, stock: null, desc: 'Cloud sync for active member attendance (Up to 400)' },
      { id: 'inv-item-09', name: 'Server Hosting & Maintenance (Annual)', type: 'Software', price: 50000, stock: null, desc: 'Proprietary central management server access' },
      { id: 'inv-item-10', name: 'SMS API Integration (One Time)', type: 'Service', price: 3000, stock: null, desc: 'Configuration of transactional SMS gateway' },
      { id: 'inv-item-11', name: 'GYM Management Software Suite', type: 'Software', price: 150000, stock: null, desc: 'Full business management, billing and attendance' }
    ];
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('gym_invoices');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'invoice-demo-in0014',
        invoiceNumber: 'IN0014',
        date: '2026-02-24',
        dueDate: '2026-03-03',
        customerId: 'target-fitness-01',
        status: 'Sent',
        amount: 565000,
        items: [
          { id: 'inv-item-01', name: 'ZKTeco SenseFace 3', quantity: 2, price: 130000 },
          { id: 'inv-item-02', name: 'Electromagnetic Lock', quantity: 2, price: 16500 },
          { id: 'inv-item-03', name: 'Power Supply Unit', quantity: 2, price: 18000 },
          { id: 'inv-item-04', name: 'Glass Break Switch', quantity: 1, price: 5500 },
          { id: 'inv-item-05', name: 'Battery Backup', quantity: 1, price: 7000 },
          { id: 'inv-item-06', name: 'Cabling', quantity: 1, price: 5000 },
          { id: 'inv-item-07', name: 'Installation and Configuration', quantity: 1, price: 14500 },
          { id: 'inv-item-08', name: 'Push Cloud Service (Annual)', quantity: 1, price: 20000 },
          { id: 'inv-item-09', name: 'Server Annual Fee', quantity: 1, price: 50000 },
          { id: 'inv-item-10', name: 'SMS API Fee', quantity: 1, price: 3000 },
          { id: 'inv-item-11', name: 'GYM Management Software', quantity: 1, price: 150000 }
        ]
      }
    ];
  });

  const [quotes, setQuotes] = useState(() => {
    const saved = localStorage.getItem('gym_quotes');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'quote-demo-01',
        quoteNumber: 'QT0014',
        date: '2026-02-24',
        prospectName: 'Target Fitness',
        prospectPhone: '0777888637',
        status: 'Accepted',
        amount: 565000,
        items: [
          { id: 'inv-item-01', name: 'ZKTeco SenseFace 3', quantity: 2, price: 130000 },
          { id: 'inv-item-11', name: 'GYM Management Software', quantity: 1, price: 150000 }
        ]
      }
    ];
  });

  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('gym_leads');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [activityLogs, setActivityLogs] = useState(() => {
    const saved = localStorage.getItem('gym_logs');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('gym_expenses');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('gym_payments');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // SMS Configuration
  const [smsConfig, setSmsConfig] = useState(() => {
    const saved = localStorage.getItem('gym_sms_config');
    if (saved) return JSON.parse(saved);
    return {
      apiKey: '2179165276941c4e5eb994053957585',
      email: 'seynextech@gmail.com',
      senderID: 'QKSendDemo',
      companyName: 'Seynex Technology',
      dashboardName: 'GymSales',
      receiptLogo: '',
      companyAddress: 'No 680/1B, Hendrik Perera Road, Gonwala, Kelaniya',
      companyPhone: '072 840 8880',
      companyEmail: 'seynextech@gmail.com',
      bankDetails: {
        accountName: 'B M A P K DE SILVA',
        bank: 'Sampath Bank',
        branch: 'Ratmalana Branch',
        accountNumber: '1018 5281 9432'
      },
      quoteTemplate: 'Hi {name},\nHere is your quotation for {gym}.\nTotal Amount: LKR {amount}\nView your Quote here: {link}',
      thankYouTemplate: 'Hi {name},\nThank you! We have received payment for Invoice {invoiceNumber}.\nYour account is up to date.',
      renewalTemplate: 'Hi {name},\nNotice: Your annual software renewal of LKR {amount} for {gym} is due on {date}. Please contact us to renew.',
      invoiceReminderTemplate: 'Hi {name},\nReminder: Payment of LKR {amount} for Invoice {invoiceNumber} is due on {date}. Please arrange payment.',
      birthdayTemplate: 'Happy Birthday {name}! Wishing you and the team at {gym} a fantastic year ahead! - {companyName}',
      cashReceivedTemplate: 'Hi {name},\nCash Received! We have successfully received a deposit of LKR {amount} for {documentType} #{number}. Thank you!',
      autoRenewalEnabled: false,
      autoRenewalDays: '15,7,1',
      autoInvoiceEnabled: false,
      autoInvoiceDays: 3,
      birthdayWishEnabled: true,
      smsHeader: '',
      smsFooter: '',
      smsEncoding: 'GSM',
      deliveryReports: true,
      pdfColor: '#3b82f6',
      pdfFooterText: 'Thank you for your business. Please process payment promptly.',
      pdfNotes: 'This document is generated by GymSales Pro Management System.',
      sessionTimeout: 5, // Default timeout in minutes
      balance: 0 // Mock balance initially
    };
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gym_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save to localStorage on change
  useEffect(() => { localStorage.setItem('gym_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('gym_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('gym_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('gym_quotes', JSON.stringify(quotes)); }, [quotes]);
  useEffect(() => { localStorage.setItem('gym_sms_config', JSON.stringify(smsConfig)); }, [smsConfig]);
  useEffect(() => { localStorage.setItem('gym_leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('gym_logs', JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem('gym_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('gym_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { 
    localStorage.setItem('gym_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Migrate existing data to have valid UUIDs and share keys
  useEffect(() => {
    if (!user) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let changedC = false;
    let changedQ = false;
    let changedI = false;

    // 1. Migrate Customers first
    const customerIdMap = {}; // Map old string IDs to new UUIDs
    const updatedCustomers = customers.map(c => {
      if (!uuidRegex.test(c.id)) {
        const newId = uuidv4();
        customerIdMap[c.id] = newId;
        changedC = true;
        return { ...c, id: newId };
      }
      return c;
    });

    // 2. Migrate Quotes
    const updatedQuotes = quotes.map(q => {
      let updated = { ...q };
      let needsSync = false;
      
      if (!uuidRegex.test(q.id)) {
        updated.id = uuidv4();
        changedQ = true;
        needsSync = true;
      }
      if (!q.shareKey || q.shareKey.length > 20) {
        updated.shareKey = generateShareKey();
        changedQ = true;
        needsSync = true;
      }

      if (needsSync) syncQuoteToSupabase(updated);
      return updated;
    });

    // 3. Migrate Invoices
    const updatedInvoices = invoices.map(inv => {
      let updated = { ...inv };
      let needsSync = false;

      if (!uuidRegex.test(inv.id)) {
        updated.id = uuidv4();
        changedI = true;
        needsSync = true;
      }
      
      // Update linked customer ID if it was migrated
      if (customerIdMap[inv.customerId]) {
        updated.customerId = customerIdMap[inv.customerId];
        changedI = true;
        needsSync = true;
      } else if (!uuidRegex.test(inv.customerId) && inv.customerId !== 'unknown') {
        // Fallback for dangling IDs
        updated.customerId = 'unknown';
        changedI = true;
        needsSync = true;
      }

      if (!inv.shareKey || inv.shareKey.length > 20) {
        updated.shareKey = generateShareKey();
        changedI = true;
        needsSync = true;
      }

      if (needsSync) syncInvoiceToSupabase(updated);
      return updated;
    });

    if (changedC) setCustomers(updatedCustomers);
    if (changedQ) setQuotes(updatedQuotes);
    if (changedI) setInvoices(updatedInvoices);

    // 4. Initial Global Cloud Sync (Upload anything that's only local)
    const pushLocalToCloud = async () => {
      console.log('[Supabase Sync] Migrating local data to cloud...');
      for (const c of updatedCustomers) syncCustomerToSupabase(c);
      for (const i of updatedInvoices) syncInvoiceToSupabase(i);
      for (const q of updatedQuotes) syncQuoteToSupabase(q);
      for (const itm of inventory) syncInventoryToSupabase(itm);
      for (const l of leads) syncLeadToSupabase(l);
      for (const e of expenses) syncExpenseToSupabase(e);
      for (const p of payments) syncPaymentToSupabase(p);
      syncConfigToSupabase(smsConfig);
      console.log('[Supabase Sync] Migration complete.');
    };
    
    // Run migration if it looks like we have local data but haven't synced it yet
    const migrationFlag = localStorage.getItem('gym_sync_migrated');
    if (!migrationFlag && (updatedCustomers.length > 2 || updatedInvoices.length > 1)) {
        pushLocalToCloud();
        localStorage.setItem('gym_sync_migrated', 'true');
    }

  }, [user]);
  
  const resetToSeynexDefaults = () => {
    if (window.confirm("This will permanently remove your current data and load the Seynex Technology business defaults. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const generateShareKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SNX-${code}`;
  };

  // --- SUPABASE SYNC LOGIC ---
  const syncQuoteToSupabase = async (quote) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('quotations')
        .upsert({
          id: quote.id,
          user_id: user.id,
          share_key: quote.shareKey,
          quote_number: quote.quoteNumber,
          date: quote.date,
          prospect_name: quote.prospectName,
          prospect_phone: quote.prospectPhone,
          amount: quote.amount,
          status: quote.status,
          items: quote.items
        });
      if (error) console.error('[Supabase Sync] Quote Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Quote Exception:', err);
    }
  };

  const syncInvoiceToSupabase = async (invoice) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .upsert({
          id: invoice.id,
          user_id: user.id,
          share_key: invoice.shareKey,
          invoice_number: invoice.invoiceNumber,
          date: invoice.date,
          due_date: invoice.dueDate,
          customer_id: (invoice.customerId && invoice.customerId !== 'unknown') ? invoice.customerId : null,
          prospect_name: invoice.prospectName || customers.find(c => c.id === invoice.customerId)?.gymName || '',
          amount: invoice.amount,
          status: invoice.status,
          items: invoice.items,
          reminder_sent: invoice.reminderSent || false
        });
      if (error) console.error('[Supabase Sync] Invoice Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Invoice Exception:', err);
    }
  };

  const syncCustomerToSupabase = async (customer) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('customers')
        .upsert({
          id: customer.id,
          user_id: user.id,
          gym_name: customer.gymName,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          dob: customer.dob,
          purchase_date: customer.purchaseDate,
          renewal_date: customer.renewalDate,
          annual_fee: customer.annualFee,
          status: customer.status,
          notes: customer.notes || []
        });
      if (error) console.error('[Supabase Sync] Customer Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Customer Exception:', err);
    }
  };

  const syncInventoryToSupabase = async (item) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('inventory')
        .upsert({
          id: item.id,
          user_id: user.id,
          name: item.name,
          type: item.type,
          price: item.price,
          stock: item.stock,
          desc: item.desc
        });
      if (error) console.error('[Supabase Sync] Inventory Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Inventory Exception:', err);
    }
  };

  const syncLeadToSupabase = async (lead) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('leads')
        .upsert({
          id: lead.id,
          user_id: user.id,
          gym_name: lead.gymName,
          prospect_name: lead.prospectName,
          phone: lead.phone,
          status: lead.status,
          date: lead.date,
          notes: lead.notes
        });
      if (error) console.error('[Supabase Sync] Lead Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Lead Exception:', err);
    }
  };

  const syncExpenseToSupabase = async (expense) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('expenses')
        .upsert({
          id: expense.id,
          user_id: user.id,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          description: expense.description
        });
      if (error) console.error('[Supabase Sync] Expense Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Expense Exception:', err);
    }
  };

  const syncPaymentToSupabase = async (payment) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('payments')
        .upsert({
          id: payment.id,
          user_id: user.id,
          customer_id: payment.customerId,
          document_id: payment.documentId,
          amount: payment.amount,
          type: payment.type,
          timestamp: payment.timestamp
        });
      if (error) console.error('[Supabase Sync] Payment Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Payment Exception:', err);
    }
  };

  const syncLogToSupabase = async (log) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('activity_logs')
        .upsert({
          id: log.id,
          user_id: user.id,
          type: log.type,
          message: log.message,
          details: log.details,
          timestamp: log.timestamp
        });
      if (error) console.error('[Supabase Sync] Log Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Log Exception:', err);
    }
  };

  const syncConfigToSupabase = async (config) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          config,
          updated_at: new Date().toISOString()
        });
      if (error) console.error('[Supabase Sync] Config Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Config Exception:', err);
    }
  };

  const fetchCloudData = async () => {
    if (!user) return;
    try {
      console.log('[Supabase Sync] Fetching all business data...');
      
      const [
        { data: cData }, { data: invData }, { data: qData }, { data: iData },
        { data: lData }, { data: eData }, { data: pData }, { data: logData },
        { data: profData }
      ] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('inventory').select('*').eq('user_id', user.id),
        supabase.from('quotations').select('*').eq('user_id', user.id),
        supabase.from('invoices').select('*').eq('user_id', user.id),
        supabase.from('leads').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('payments').select('*').eq('user_id', user.id),
        supabase.from('activity_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(500),
        supabase.from('user_profiles').select('config').eq('user_id', user.id).single()
      ]);

      if (profData?.config) {
        setSmsConfig(prev => ({ ...prev, ...profData.config }));
      }

      if (cData?.length) setCustomers(cData.map(c => ({
        id: c.id, gymName: c.gym_name, name: c.name, email: c.email, phone: c.phone,
        dob: c.dob, purchaseDate: c.purchase_date, renewalDate: c.renewal_date, 
        annualFee: Number(c.annual_fee), status: c.status, notes: c.notes || []
      })));

      if (invData?.length) setInventory(invData.map(i => ({
        id: i.id, name: i.name, type: i.type, price: Number(i.price), stock: Number(i.stock), desc: i.desc
      })));

      if (qData?.length) setQuotes(qData.map(q => ({
        id: q.id, shareKey: q.share_key, quoteNumber: q.quote_number, date: q.date,
        prospectName: q.prospect_name, prospectPhone: q.prospect_phone, amount: Number(q.amount),
        status: q.status, items: q.items || []
      })));

      if (iData?.length) setInvoices(iData.map(inv => ({
        id: inv.id, shareKey: inv.share_key, invoiceNumber: inv.invoice_number, date: inv.date,
        dueDate: inv.due_date, customerId: inv.customer_id || 'unknown', amount: Number(inv.amount),
        status: inv.status, items: inv.items || [], prospectName: inv.prospect_name, reminderSent: inv.reminder_sent
      })));

      if (lData?.length) setLeads(lData.map(l => ({
        id: l.id, gymName: l.gym_name, prospectName: l.prospect_name, phone: l.phone,
        status: l.status, date: l.date, notes: l.notes
      })));

      if (eData?.length) setExpenses(eData.map(e => ({
        id: e.id, category: e.category, amount: Number(e.amount), date: e.date, description: e.description
      })));

      if (pData?.length) setPayments(pData.map(p => ({
        id: p.id, customerId: p.customer_id, documentId: p.document_id, amount: Number(p.amount),
        type: p.type, timestamp: p.timestamp
      })));

      if (logData?.length) setActivityLogs(logData.map(l => ({
        id: l.id, type: l.type, message: l.message, details: l.details, timestamp: l.timestamp
      })));

      console.log('[Supabase Sync] Load complete.');
    } catch (err) {
      console.error('[Supabase Sync] Global Fetch Exception:', err);
    }
  };

  // Fetch from cloud on login
  useEffect(() => {
    if (user) fetchCloudData();
  }, [user]);

  // Actions
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const addCustomer = (customer) => {
    const newCustomer = { 
      ...customer, 
      id: uuidv4(),
      notes: [] 
    };
    setCustomers([...customers, newCustomer]);
    syncCustomerToSupabase(newCustomer);
    addLog('System', `Added new Active Gym: ${customer.gymName}`);
  };

  const deleteCustomer = async (id) => {
    setCustomers(customers.filter(c => c.id !== id));
    if (user) {
      await supabase.from('customers').delete().eq('id', id);
    }
  };

  const updateCustomer = (id, updatedData) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedData };
        syncCustomerToSupabase(updated);
        return updated;
      }
      return c;
    }));
  };
  
  const addCustomerNote = (customerId, text) => {
    if (!text.trim()) return;
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newNote = {
          id: uuidv4(),
          date: new Date().toISOString(),
          text
        };
        const updatedNotes = [newNote, ...(c.notes || [])];
        const updated = { ...c, notes: updatedNotes };
        syncCustomerToSupabase(updated);
        addLog('Status', `Update logged for ${c.gymName}: ${text.substring(0, 30)}...`);
        return updated;
      }
      return c;
    }));
  };
  
  const addLog = (type, message, details = '') => {
    const newLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type, 
      message,
      details
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 500));
    syncLogToSupabase(newLog);
  };

  const addInventoryItem = (item) => {
    const newItem = { ...item, id: uuidv4() };
    setInventory([...inventory, newItem]);
    syncInventoryToSupabase(newItem);
  };

  const deleteInventoryItem = async (id) => {
    setInventory(inventory.filter(i => i.id !== id));
    if (user) {
      await supabase.from('inventory').delete().eq('id', id);
    }
  };

  const updateInventoryItem = (id, data) => {
    setInventory(prev => prev.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...data };
        syncInventoryToSupabase(updated);
        return updated;
      }
      return i;
    }));
  };
  
  const addInvoice = (invoice) => {
    const newInvoice = { ...invoice, id: uuidv4(), shareKey: generateShareKey(), status: 'Draft' };
    setInvoices([...invoices, newInvoice]);
    syncInvoiceToSupabase(newInvoice);
  };

  const deleteInvoice = async (id) => {
    setInvoices(invoices.filter(i => i.id !== id));
    if (user) {
      await supabase.from('invoices').delete().eq('id', id);
    }
  };

  const updateInvoice = (id, data) => {
    const updatedInvoices = invoices.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...data };
        syncInvoiceToSupabase(updated);
        return updated;
      }
      return i;
    });
    setInvoices(updatedInvoices);
  };
  
  const updateInvoiceStatus = (id, status) => {
    setInvoices(invoices.map(i => {
      if (i.id === id) {
        const updated = { ...i, status };
        addLog('Status', `Invoice ${i.invoiceNumber} status changed to ${status}`);
        syncInvoiceToSupabase(updated);
        if (status === 'Paid' && i.status !== 'Paid') {
          const customer = customers.find(c => c.id === i.customerId);
          if(customer && customer.phone) {
            triggerSMS('Payment', customer, i);
          }
        }
        return updated;
      }
      return i;
    }));
  };

  const addQuote = (quote) => {
    const newQuote = { ...quote, id: uuidv4(), shareKey: generateShareKey(), status: 'Pending' };
    setQuotes([...quotes, newQuote]);
    syncQuoteToSupabase(newQuote);
  };

  const deleteQuote = async (id) => {
    setQuotes(quotes.filter(q => q.id !== id));
    if (user) {
      await supabase.from('quotations').delete().eq('id', id);
    }
  };

  const updateQuote = (id, updatedData) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        const updated = { ...q, ...updatedData };
        syncQuoteToSupabase(updated);
        return updated;
      }
      return q;
    }));
  };

  const updateQuoteStatus = (id, status) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        const updated = { ...q, status };
        addLog('Status', `Quotation ${q.quoteNumber} marked as ${status}`);
        syncQuoteToSupabase(updated);
        return updated;
      }
      return q;
    }));
  };

  const convertQuoteToInvoice = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    let customer = customers.find(c => c.gymName === quote.prospectName || c.phone === quote.prospectPhone);
    if (!customer) {
        customer = customers.find(c => c.gymName === quote.prospectName);
    }

    const newInvoice = {
      id: uuidv4(),
      shareKey: generateShareKey(),
      invoiceNumber: `INV-${quote.quoteNumber.split('-')[1] || Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      customerId: customer ? customer.id : 'unknown',
      prospectName: !customer ? quote.prospectName : undefined, 
      items: quote.items,
      amount: quote.amount,
      status: 'Draft'
    };

    setInvoices(prev => [...prev, newInvoice]);
    syncInvoiceToSupabase(newInvoice);
    updateQuoteStatus(quoteId, 'Accepted');
    addLog('System', `Converted Quote ${quote.quoteNumber} to Invoice ${newInvoice.invoiceNumber}`);
    showNotification(`Converted! New invoice ${newInvoice.invoiceNumber} created.`);
    return newInvoice;
  };

  const recordCashDeposit = (data) => {
    const { customerId, documentId, amount, paymentType } = data; 
    
    const newPayment = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      customerId,
      documentId,
      amount,
      type: 'Cash'
    };

    setPayments(prev => [...prev, newPayment]);
    syncPaymentToSupabase(newPayment);

    if (paymentType === 'Invoice') {
      const invoice = invoices.find(inv => inv.id === documentId);
      if (invoice) {
        if (amount >= invoice.amount) {
           updateInvoiceStatus(documentId, 'Paid');
        }
      }
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.phone) {
        triggerSMS('CashReceived', customer, { ...data, amount, documentType: paymentType, number: documentId });
    }

    addLog('Status', `Cash deposit of LKR ${amount.toLocaleString()} received for ${paymentType}`);
    showNotification(`Deposit of LKR ${amount.toLocaleString()} recorded!`);
  };

  const addLead = (lead) => {
    const newLead = { ...lead, id: uuidv4(), date: new Date().toISOString() };
    setLeads([...leads, newLead]);
    syncLeadToSupabase(newLead);
    addLog('System', `New Lead Added: ${lead.gymName}`);
  };
  const updateLead = (id, data) => {
    setLeads(prev => prev.map(l => {
        if (l.id === id) {
            const updated = { ...l, ...data };
            syncLeadToSupabase(updated);
            return updated;
        }
        return l;
    }));
  };
  const deleteLead = async (id) => {
    setLeads(leads.filter(l => l.id !== id));
    if (user) {
        await supabase.from('leads').delete().eq('id', id);
    }
  };

  const addExpense = (exp) => {
    const newExpense = { ...exp, id: uuidv4(), date: new Date().toISOString() };
    setExpenses([...expenses, newExpense]);
    syncExpenseToSupabase(newExpense);
  };
  const deleteExpense = async (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
    if (user) {
        await supabase.from('expenses').delete().eq('id', id);
    }
  };

  // Automated Scheduler for Renewals and Invoices
  useEffect(() => {
    let updatedCustomers = [...customers];
    let customersChanged = false;
    
    let updatedInvoices = [...invoices];
    let invoicesChanged = false;
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    // Only trigger automated schedules from 8:00 AM onwards
    if (now.getHours() < 8) return;
    
    // 1. Check Renewals
    if (smsConfig?.autoRenewalEnabled) {
      const daysArray = String(smsConfig.autoRenewalDays || '7').split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

      customers.forEach((c, index) => {
        if (c.renewalDate && c.status === 'Active') {
          const renewalDate = new Date(c.renewalDate);
          renewalDate.setHours(0, 0, 0, 0);
          const timeDiff = renewalDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysArray.includes(daysDiff)) {
            // Prevent multiple sends on the same exact day
            if (c.lastReminderDaysDiff !== daysDiff) {
              console.log(`[Auto Schedule] Sending renewal SMS to ${c.name} (${c.gymName})`);
              // Trigger actual SMS
              triggerSMS('Renewal', c, null);
              showNotification(`Auto-scheduled renewal reminder sent to ${c.gymName}`);
              updatedCustomers[index] = { ...c, lastReminderDaysDiff: daysDiff };
              customersChanged = true;
            }
          }
        }
      });
    }

    // 2. Check Pending/Draft/Sent Invoices
    if (smsConfig?.autoInvoiceEnabled) {
      invoices.forEach((inv, index) => {
        if (!inv.reminderSent && inv.status !== 'Paid' && inv.dueDate) {
          const dueDate = new Date(inv.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const timeDiff = dueDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysDiff <= (smsConfig.autoInvoiceDays || 3) && daysDiff >= 0) {
            const customer = customers.find(c => c.id === inv.customerId);
            if (customer) {
              // Trigger actual SMS
              triggerSMS('InvoiceReminder', customer, inv);
              showNotification(`Auto-scheduled invoice reminder sent to ${customer.gymName}`);
              updatedInvoices[index] = { ...inv, reminderSent: true };
              invoicesChanged = true;
            }
          }
        }
      });
    }

    // 3. Check Birthdays
    if (smsConfig?.birthdayWishEnabled) {
      customers.forEach((c, index) => {
        if (c.dob && c.status === 'Active') {
          const dob = new Date(c.dob);
          const currentYear = today.getFullYear();
          
          if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
            // Check if already sent this year
            if (c.lastBirthdaySentYear !== currentYear) {
              // Trigger actual SMS
              triggerSMS('Birthday', c, null);
              showNotification(`Auto-scheduled birthday wish sent to ${c.name}`);
              updatedCustomers[index] = { ...c, lastBirthdaySentYear: currentYear };
              customersChanged = true;
            }
          }
        }
      });
    }

    if (customersChanged) setCustomers(updatedCustomers);
    if (invoicesChanged) setInvoices(updatedInvoices);
  }, []); // Run once on startup

  // SMS Service Core
  const updateSmsConfig = (newConfig) => {
    setSmsConfig(newConfig);
    syncConfigToSupabase(newConfig);
  };

  const getBasicAuthHeader = () => {
    return 'Basic ' + btoa(`${smsConfig.email}:${smsConfig.apiKey}`);
  };

  const fetchSmsBalance = async () => {
    try {
      const response = await fetch('/api/quicksend?FUN=CHECK_BALANCE', {
        method: 'POST',
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      // Quicksend returns plain text (a number) for CHECK_BALANCE, not JSON
      const rawText = await response.text();

      // Try to parse as JSON first, fallback to plain text
      let balanceVal;
      try {
        const parsed = JSON.parse(rawText);
        balanceVal = parsed.balance ?? parsed.Balance ?? parsed.credit ?? rawText;
      } catch {
        balanceVal = rawText.trim();
      }

      // Update the stored balance in state — this will reflect live in the UI
      setSmsConfig(prev => ({ ...prev, balance: balanceVal }));

    } catch (e) {
      console.error('Balance fetch error:', e);
      setSmsConfig(prev => ({ ...prev, balance: 'Error' }));
    }
  };

  const sendDirectSMS = async (phone, rawMessage) => {
    try {
      const payload = {
        senderID: smsConfig.senderID || "SEYNEX",
        to: phone,
        msg: rawMessage
      };

      const res = await fetch('/api/quicksend?FUN=SEND_SINGLE', {
        method: 'POST',
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('SMS Send Result:', data);
      showNotification(`Sent successfully to ${phone}!`);
      addLog('SMS', `Sent to ${phone}: ${rawMessage.substring(0, 50)}...`);
    } catch (err) {
      console.error('Failed to send SMS API', err);
      showNotification('Error connecting to QuickSend API.', 'error');
    }
  };

  const sendBulkSMSArray = async (phonesArray, rawMessage) => {
    try {
      const payload = {
        check_cost: false,
        senderID: smsConfig.senderID || "SEYNEX",
        to: phonesArray,
        msg: rawMessage
      };

      const res = await fetch('/api/quicksend?FUN=SEND_BULK_SAME', {
        method: 'POST',
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('Bulk SMS Send Result:', data);
      showNotification(`Broadcast sent to ${phonesArray.length} contacts!`);
      addLog('SMS', `Bulk Broadcast to ${phonesArray.length} recipients.`);
    } catch (err) {
      console.error('Failed to send Bulk API', err);
      showNotification('Error connecting to QuickSend API for Broadcast.', 'error');
    }
  };

  const handleTestSms = (templateStr) => {
    let msg = templateStr;
    
    // Apply Global Formatting
    if (smsConfig.smsHeader) msg = `${smsConfig.smsHeader}\n${msg}`;
    if (smsConfig.smsFooter) msg = `${msg}\n${smsConfig.smsFooter}`;

    msg = msg
      .replace(/{name}/g, 'John Doe')
      .replace(/{gym}/g, 'FitLife Gym')
      .replace(/{companyName}/g, smsConfig.companyName || 'Seynex Technology')
      .replace(/{amount}/g, '15,000')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{days_left}/g, '7')
      .replace(/{invoiceNumber}/g, 'INV-9999')
      .replace(/{renewalDate}/g, new Date().toLocaleDateString())
      .replace(/{dueDate}/g, new Date().toLocaleDateString())
      .replace(/{phone}/g, '0712345678')
      .replace(/{bankName}/g, smsConfig.bankDetails?.bank || 'Sample Bank')
      .replace(/{accountNumber}/g, smsConfig.bankDetails?.accountNumber || '0000 0000 0000')
      .replace(/{accountName}/g, smsConfig.bankDetails?.accountName || 'Sample Name')
      .replace(/{link}/g, 'https://example.com/pay');
    
    alert(`[TEST SMS PREVIEW]\n\n${msg}\n\nLength: ${msg.length} characters`);
  };

  const triggerSMS = (type, customer, documentData) => {
    let msg = '';
    
    // Default fallback values
    const cName = customer?.name || documentData?.prospectName || 'Customer';
    const cGym = customer?.gymName || documentData?.prospectName || 'Gym';
    
    let template = '';
    
    if (type === 'Quotation') template = smsConfig.quoteTemplate || '';
    else if (type === 'Payment') template = smsConfig.thankYouTemplate || '';
    else if (type === 'Renewal') template = smsConfig.renewalTemplate || '';
    else if (type === 'InvoiceReminder') template = smsConfig.invoiceReminderTemplate || '';
    else if (type === 'Birthday') template = smsConfig.birthdayTemplate || '';
    else if (type === 'CashReceived') template = smsConfig.cashReceivedTemplate || '';

    let templateWithBranding = template;
    if (smsConfig.smsHeader) templateWithBranding = `${smsConfig.smsHeader}\n${templateWithBranding}`;
    if (smsConfig.smsFooter) templateWithBranding = `${templateWithBranding}\n${smsConfig.smsFooter}`;

    msg = templateWithBranding
      .replace(/{name}/g, cName)
      .replace(/{gym}/g, cGym)
      .replace(/{companyName}/g, smsConfig.companyName || 'Seynex Technology')
      .replace(/{amount}/g, (documentData?.amount || customer?.annualFee || 0).toLocaleString())
      .replace(/{date}/g, documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : customer?.renewalDate ? new Date(customer.renewalDate).toLocaleDateString() : '')
      .replace(/{invoiceNumber}/g, documentData?.invoiceNumber || '')
      .replace(/{number}/g, documentData?.invoiceNumber || documentData?.quoteNumber || '')
      .replace(/{documentType}/g, documentData?.documentType || 'Document')
      .replace(/{link}/g, (documentData?.id || documentData?.shareKey) ? `${window.location.origin}/share/${
        type.toLowerCase() === 'quotation' ? 'quote' : 
        type.toLowerCase() === 'cashreceived' ? 'receipt' : 'invoice'
      }/${documentData.id || documentData.shareKey}` : '')
      .replace(/{renewalDate}/g, customer?.renewalDate ? new Date(customer.renewalDate).toLocaleDateString() : '')
      .replace(/{dueDate}/g, documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : '')
      .replace(/{phone}/g, customer?.phone || documentData?.prospectPhone || '')
      .replace(/{bankName}/g, smsConfig.bankDetails?.bank || '')
      .replace(/{accountNumber}/g, smsConfig.bankDetails?.accountNumber || '')
      .replace(/{accountName}/g, smsConfig.bankDetails?.accountName || '');

    if(customer?.phone || documentData?.prospectPhone) {
      sendDirectSMS(customer?.phone || documentData?.prospectPhone, msg);
    } else {
      showNotification(`Could not send SMS: No phone number saved`, 'error');
    }
  };

  return (
    <StoreContext.Provider value={{
      customers, addCustomer, deleteCustomer, updateCustomer,
      inventory, addInventoryItem, deleteInventoryItem, updateInventoryItem,
      invoices, addInvoice, updateInvoice, updateInvoiceStatus,
      quotes, addQuote, updateQuoteStatus, updateQuote, convertQuoteToInvoice,
      leads, addLead, updateLead, deleteLead,
      expenses, addExpense, deleteExpense,
      payments, recordCashDeposit,
      activityLogs, addLog,
      addCustomerNote,
      deleteInvoice, deleteQuote,
      smsConfig, updateSmsConfig, fetchSmsBalance, triggerSMS, sendDirectSMS, sendBulkSMSArray, handleTestSms,
      theme, toggleTheme,
      notification, showNotification,
      resetToSeynexDefaults
    }}>
      {children}
    </StoreContext.Provider>
  );
}
