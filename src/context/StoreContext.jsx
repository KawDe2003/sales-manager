import React, { createContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const StoreContext = createContext();

export default function StoreContextProvider({ children }) {
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
      { id: 'inv-item-01', name: 'ZKTeco SenseFace 3 (Fingerprint / Face ID)', type: 'Hardware', price: 130000, desc: 'Advanced Biometric Terminal with RFID support' },
      { id: 'inv-item-02', name: 'Electromagnetic Lock (Glass Door)', type: 'Hardware', price: 16500, desc: 'Secure magnetic locking system with matching brackets' },
      { id: 'inv-item-03', name: 'Power Supply Unit for Lock & Device', type: 'Hardware', price: 18000, desc: 'Stable 12V supply for uninterrupted security' },
      { id: 'inv-item-04', name: 'Glass Break Switch', type: 'Hardware', price: 5500, desc: 'Emergency release for safety compliance' },
      { id: 'inv-item-05', name: 'Battery Backup', type: 'Hardware', price: 7000, desc: '12V 7Ah backup for power failure' },
      { id: 'inv-item-06', name: 'Cabling & Networking Material', type: 'Hardware', price: 5000, desc: 'Cat6 cabling and conduit accessories' },
      { id: 'inv-item-07', name: 'Installation & Technical Configuration', type: 'Service', price: 14500, desc: 'On-site terminal setup and cloud integration' },
      { id: 'inv-item-08', name: 'Push Cloud Service (Annual Fee)', type: 'Software', price: 20000, desc: 'Cloud sync for active member attendance (Up to 400)' },
      { id: 'inv-item-09', name: 'Server Hosting & Maintenance (Annual)', type: 'Software', price: 50000, desc: 'Proprietary central management server access' },
      { id: 'inv-item-10', name: 'SMS API Integration (One Time)', type: 'Service', price: 3000, desc: 'Configuration of transactional SMS gateway' },
      { id: 'inv-item-11', name: 'GYM Management Software Suite', type: 'Software', price: 150000, desc: 'Full business management, billing and attendance' }
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

  // Migrate existing quotes/invoices to have a shareKey if missing
  useEffect(() => {
    let changed = false;
    const migrate = (items, setItems) => {
      const updated = items.map(item => {
        if (!item.shareKey) {
          changed = true;
          return { ...item, shareKey: generateShareKey() };
        }
        return item;
      });
      if (changed) setItems(updated);
    };
    migrate(quotes, setQuotes);
    migrate(invoices, setInvoices);
  }, []);
  
  const resetToSeynexDefaults = () => {
    if (window.confirm("This will permanently remove your current data and load the Seynex Technology business defaults. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const generateShareKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Actions
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const addCustomer = (customer) => {
    const newCustomer = { 
      ...customer, 
      id: uuidv4(),
      notes: [] // Initialize empty notes array
    };
    setCustomers([...customers, newCustomer]);
    addLog('System', `Added new Active Gym: ${customer.gymName}`);
  };
  const deleteCustomer = (id) => setCustomers(customers.filter(c => c.id !== id));
  const updateCustomer = (id, updatedData) => setCustomers(customers.map(c => c.id === id ? { ...c, ...updatedData } : c));
  
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
        addLog('Status', `Update logged for ${c.gymName}: ${text.substring(0, 30)}...`);
        return { ...c, notes: updatedNotes };
      }
      return c;
    }));
  };
  
  const addLog = (type, message, details = '') => {
    setActivityLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type, // 'SMS', 'System', 'Status'
      message,
      details
    }, ...prev].slice(0, 500)); // Keep last 500 logs
  };
  const addInventoryItem = (item) => setInventory([...inventory, { ...item, id: uuidv4() }]);
  const deleteInventoryItem = (id) => setInventory(inventory.filter(i => i.id !== id));
  const updateInventoryItem = (id, data) => setInventory(inventory.map(i => i.id === id ? { ...i, ...data } : i));
  
  const addInvoice = (invoice) => setInvoices([...invoices, { ...invoice, id: uuidv4(), shareKey: generateShareKey(), status: 'Draft' }]);
  const updateInvoice = (id, data) => setInvoices(invoices.map(i => i.id === id ? { ...i, ...data } : i));
  
  const updateInvoiceStatus = (id, status) => {
    setInvoices(invoices.map(i => {
      if (i.id === id) {
        addLog('Status', `Invoice ${i.invoiceNumber} status changed to ${status}`);
        // TRIGGER RECEIPT SMS IF CHANGED TO PAID
        if (status === 'Paid' && i.status !== 'Paid') {
          const customer = customers.find(c => c.id === i.customerId);
          if(customer && customer.phone) {
            triggerSMS('Payment', customer, i);
          }
        }
        return { ...i, status };
      }
      return i;
    }));
  };

  const addQuote = (quote) => setQuotes([...quotes, { ...quote, id: uuidv4(), shareKey: generateShareKey(), status: 'Pending' }]);

  const updateQuote = (id, updatedData) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        return { ...q, ...updatedData };
      }
      return q;
    }));
  };

  const updateQuoteStatus = (id, status) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        addLog('Status', `Quotation ${q.quoteNumber} marked as ${status}`);
        return { ...q, status };
      }
      return q;
    }));
  };

  const convertQuoteToInvoice = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    // 1. Find or create customer
    let customer = customers.find(c => c.gymName === quote.prospectName || c.phone === quote.prospectPhone);
    
    // If quote has prospect info as strings, we might need a customer ID
    // Check if we need to link to existing customer
    if (!customer) {
        // Find existing customer by name
        customer = customers.find(c => c.gymName === quote.prospectName);
    }

    const newInvoice = {
      id: uuidv4(),
      shareKey: generateShareKey(),
      invoiceNumber: `INV-${quote.quoteNumber.split('-')[1] || Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      customerId: customer ? customer.id : 'unknown',
      prospectName: !customer ? quote.prospectName : undefined, // Fallback if no customer linked
      items: quote.items,
      amount: quote.amount,
      status: 'Draft'
    };

    setInvoices(prev => [...prev, newInvoice]);
    updateQuoteStatus(quoteId, 'Accepted');
    addLog('System', `Converted Quote ${quote.quoteNumber} to Invoice ${newInvoice.invoiceNumber}`);
    showNotification(`Converted! New invoice ${newInvoice.invoiceNumber} created.`);
    return newInvoice;
  };

  const recordCashDeposit = (data) => {
    const { customerId, documentId, amount, paymentType } = data; // paymentType: 'Invoice' or 'Quotation'
    
    const newPayment = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      customerId,
      documentId,
      amount,
      type: 'Cash'
    };

    setPayments(prev => [...prev, newPayment]);

    // Update Invoice status if it's an invoice
    if (paymentType === 'Invoice') {
      const invoice = invoices.find(inv => inv.id === documentId);
      if (invoice) {
        // Simple logic: if payment >= amount, mark as Paid
        if (amount >= invoice.amount) {
           updateInvoiceStatus(documentId, 'Paid');
        }
      }
    }

    // Send SMS
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.phone) {
        triggerSMS('CashReceived', customer, { ...data, amount, documentType: paymentType, number: documentId });
    }

    addLog('Status', `Cash deposit of LKR ${amount.toLocaleString()} received for ${paymentType}`);
    showNotification(`Deposit of LKR ${amount.toLocaleString()} recorded!`);
  };

  const addLead = (lead) => {
    setLeads([...leads, { ...lead, id: uuidv4(), date: new Date().toISOString() }]);
    addLog('System', `New Lead Added: ${lead.gymName}`);
  };
  const updateLead = (id, data) => setLeads(leads.map(l => l.id === id ? { ...l, ...data } : l));
  const deleteLead = (id) => setLeads(leads.filter(l => l.id !== id));

  const addExpense = (exp) => setExpenses([...expenses, { ...exp, id: uuidv4(), date: new Date().toISOString() }]);
  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));

  // Automated Scheduler for Renewals and Invoices
  useEffect(() => {
    let updatedCustomers = [...customers];
    let customersChanged = false;
    
    let updatedInvoices = [...invoices];
    let invoicesChanged = false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
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
              // In real app, make API call. Using alert for demo:
              setTimeout(() => {
                 alert(`[AUTOMATIC SMS TRIGGERED]\\nRenewal reminder sent to ${c.gymName} (Due in ${daysDiff} days)`);
              }, 1000);
              
              // Uncomment in production: triggerSMS('Renewal', c, null);
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
              console.log(`[Auto Schedule] Sending invoice SMS to ${customer.name}`);
              setTimeout(() => {
                 alert(`[AUTOMATIC SMS TRIGGERED]\nInvoice reminder sent to ${customer.gymName} for INV# ${inv.invoiceNumber}`);
              }, 1500);
              // Uncomment in prod: triggerSMS('InvoiceReminder', customer, inv);
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
              console.log(`[Auto Schedule] Sending birthday wish to ${c.name} (${c.gymName})`);
              setTimeout(() => {
                 alert(`[AUTOMATIC SMS TRIGGERED]\nBirthday wish sent to ${c.name} (${c.gymName})`);
              }, 2000);
              
              // triggerSMS('Birthday', c, null);
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
  const updateSmsConfig = (newConfig) => setSmsConfig(newConfig);

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
      .replace(/{link}/g, (documentData?.shareKey || documentData?.id) ? `${window.location.origin}/share/${
        type.toLowerCase() === 'quotation' ? 'quote' : 
        type.toLowerCase() === 'cashreceived' ? 'receipt' : 'invoice'
      }/${documentData.shareKey || documentData.id}` : '')
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
      smsConfig, updateSmsConfig, fetchSmsBalance, triggerSMS, sendDirectSMS, sendBulkSMSArray, handleTestSms,
      theme, toggleTheme,
      notification, showNotification,
      resetToSeynexDefaults
    }}>
      {children}
    </StoreContext.Provider>
  );
}
