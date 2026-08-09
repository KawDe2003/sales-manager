import React, { createContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const StoreContext = createContext();

export default function StoreContextProvider({ children }) {
  const { user } = useAuth();
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  // Initialize sample dummy data
  const sampleCustomers = [
    { id: 'c-101', gymName: 'Fitness First Colombo', name: 'Kamal Perera', email: 'kamal@fitnessfirst.lk', phone: '0771234567', dob: '1988-04-12', purchaseDate: '2025-01-15', renewalDate: '2026-08-15', annualFee: 450000, status: 'Active', notes: [{ id: 'n1', text: 'Premium enterprise subscription', timestamp: new Date().toISOString() }] },
    { id: 'c-102', gymName: 'Power World Gym Kandy', name: 'Nalin Fernando', email: 'nalin@powerworld.lk', phone: '0719876543', dob: '1992-09-20', purchaseDate: '2025-02-10', renewalDate: '2026-08-20', annualFee: 320000, status: 'Active', notes: [] },
    { id: 'c-103', gymName: "Gold's Gym Galle", name: 'Dinesh Jayawardena', email: 'dinesh@goldsgym.lk', phone: '0765554321', dob: '1985-11-05', purchaseDate: '2025-03-01', renewalDate: '2026-07-01', annualFee: 600000, status: 'Active', notes: [] },
    { id: 'c-104', gymName: 'High Octane Fitness Negombo', name: 'Ruwan Silva', email: 'ruwan@highoctane.lk', phone: '0752223333', dob: '1990-06-18', purchaseDate: '2025-04-12', renewalDate: '2026-09-12', annualFee: 280000, status: 'Active', notes: [] },
    { id: 'c-105', gymName: 'Ironworks Gym Matara', name: 'Sanjaya Wickramasinghe', email: 'sanjaya@ironworks.lk', phone: '0701112222', dob: '1995-02-28', purchaseDate: '2025-05-20', renewalDate: '2026-10-20', annualFee: 190000, status: 'Pending', notes: [] }
  ];

  const sampleInventory = [
    { id: 'inv-101', name: 'Commercial Treadmill Heavy Duty X9', type: 'Equipment', price: 480000, costPrice: 320000, stock: 12, reorderLevel: 3, desc: 'AC 5.0HP Motor commercial treadmill with touch screen' },
    { id: 'inv-102', name: 'Olympic Barbell 20kg Hard Chrome', type: 'Equipment', price: 42000, costPrice: 26000, stock: 45, reorderLevel: 10, desc: '2200mm 1500lbs rating chrome Olympic bar' },
    { id: 'inv-103', name: 'Rubber Bumper Plate Set 100kg', type: 'Accessories', price: 95000, costPrice: 62000, stock: 28, reorderLevel: 5, desc: 'High density rubber bumper weight plates' },
    { id: 'inv-104', name: 'Whey Protein Isolate 5lb (Vanilla)', type: 'Supplements', price: 24500, costPrice: 16500, stock: 110, reorderLevel: 20, desc: '100% Ultra filtered whey isolate 28g protein per scoop' },
    { id: 'inv-105', name: 'Commercial Cable Crossover Machine', type: 'Equipment', price: 850000, costPrice: 580000, stock: 4, reorderLevel: 2, desc: 'Dual stack multi station cable crossover machine' }
  ];

  const sampleLeads = [
    { id: 'lead-1', gymName: 'Titan Fitness Kurunegala', name: 'Sunil Cooray', phone: '0773334444', email: 'sunil@titan.lk', location: 'Kurunegala', status: 'Contacted', value: 350000, createdAt: new Date().toISOString() },
    { id: 'lead-2', gymName: 'Pulse Gym Jaffna', name: 'K. Selvam', phone: '0718889999', email: 'selvam@pulse.lk', location: 'Jaffna', status: 'Demo Scheduled', value: 420000, createdAt: new Date().toISOString() },
    { id: 'lead-3', gymName: 'Metro Fitness Battaramulla', name: 'Anura Dissanayake', phone: '0761110000', email: 'anura@metro.lk', location: 'Battaramulla', status: 'Interested', value: 290000, createdAt: new Date().toISOString() }
  ];

  const sampleQuotes = [
    { id: 'q-101', shareKey: 'SNX-Q101', quoteNumber: 'QT-1001', date: '2026-07-20', prospectName: 'Pulse Gym Jaffna', prospectPhone: '0718889999', amount: 420000, status: 'Pending', items: [{ name: 'Gym Software Setup + Hardware Package', qty: 1, unitPrice: 420000, amount: 420000 }] },
    { id: 'q-102', shareKey: 'SNX-Q102', quoteNumber: 'QT-1002', date: '2026-07-25', prospectName: 'Metro Fitness Battaramulla', prospectPhone: '0761110000', amount: 290000, status: 'Accepted', items: [{ name: 'Annual Software License + Turnstile Gate Module', qty: 1, unitPrice: 290000, amount: 290000 }] }
  ];

  const sampleInvoices = [
    { id: 'inv-201', shareKey: 'SNX-INV201', invoiceNumber: 'INV-1001', date: '2026-06-01', dueDate: '2026-06-15', customerId: 'c-101', prospectName: 'Fitness First Colombo', amount: 450000, status: 'Paid', items: [{ name: 'Annual GymSales Software License 2026', qty: 1, unitPrice: 450000, amount: 450000 }], reminderSent: true },
    { id: 'inv-202', shareKey: 'SNX-INV202', invoiceNumber: 'INV-1002', date: '2026-06-10', dueDate: '2026-06-25', customerId: 'c-102', prospectName: 'Power World Gym Kandy', amount: 320000, status: 'Paid', items: [{ name: 'Annual GymSales License + Biometric Module', qty: 1, unitPrice: 320000, amount: 320000 }], reminderSent: true },
    { id: 'inv-203', shareKey: 'SNX-INV203', invoiceNumber: 'INV-1003', date: '2026-07-01', dueDate: '2026-07-15', customerId: 'c-103', prospectName: "Gold's Gym Galle", amount: 600000, status: 'Overdue', items: [{ name: 'Multi-Branch Enterprise Software License', qty: 1, unitPrice: 600000, amount: 600000 }], reminderSent: false },
    { id: 'inv-204', shareKey: 'SNX-INV204', invoiceNumber: 'INV-1004', date: '2026-08-01', dueDate: '2026-08-25', customerId: 'c-104', prospectName: 'High Octane Fitness Negombo', amount: 280000, status: 'Sent', items: [{ name: 'Standard Gym Management Module', qty: 1, unitPrice: 280000, amount: 280000 }], reminderSent: false }
  ];

  const sampleExpenses = [
    { id: 'exp-1', category: 'Operational', amount: 45000, date: '2026-07-05', description: 'AWS Cloud Server & Database Infrastructure Hosting' },
    { id: 'exp-2', category: 'Marketing', amount: 85000, date: '2026-07-10', description: 'Facebook & Google Ads Marketing Campaign' },
    { id: 'exp-3', category: 'Staff', amount: 120000, date: '2026-07-28', description: 'Sales Team Monthly Bonus & Commissions' },
    { id: 'exp-4', category: 'Administrative', amount: 180000, date: '2026-08-01', description: 'Headquarters Office Rent & Fibre Internet' }
  ];

  const sampleFixedAssets = [
    { id: 'fa-1', assetCode: 'FA-1001', name: 'High Performance Server Workstations', category: 'IT Equipment', purchaseDate: '2025-01-10', purchaseCost: 1200000, usefulLifeYears: 5, salvageValue: 100000, depreciationMethod: 'Straight Line (SLM)', location: 'Colombo HQ', status: 'Active' },
    { id: 'fa-2', assetCode: 'FA-1002', name: 'Showroom Demo Equipment Set', category: 'Fitness Equipment', purchaseDate: '2025-03-15', purchaseCost: 2500000, usefulLifeYears: 7, salvageValue: 300000, depreciationMethod: 'Straight Line (SLM)', location: 'Kandy Branch', status: 'Active' }
  ];

  const sampleJournalEntries = [
    { id: 'je-1', date: '2026-01-01', reference: 'GEN-001', description: 'Initial Capital Contribution', createdBy: 'Admin', timestamp: new Date('2026-01-01').toISOString() },
    { id: 'je-2', date: '2026-06-01', reference: 'GEN-002', description: 'Fitness First Invoice INV-1001 Payment Received', createdBy: 'System', timestamp: new Date('2026-06-01').toISOString() },
    { id: 'je-3', date: '2026-06-10', reference: 'GEN-003', description: 'Power World Gym INV-1002 Payment Received', createdBy: 'System', timestamp: new Date('2026-06-10').toISOString() },
    { id: 'je-4', date: '2026-07-01', reference: 'GEN-004', description: 'Gold\'s Gym Invoice INV-1003 Billed (Receivable)', createdBy: 'System', timestamp: new Date('2026-07-01').toISOString() },
    { id: 'je-5', date: '2026-07-05', reference: 'GEN-005', description: 'Cloud Infrastructure & Hosting Expense', createdBy: 'System', timestamp: new Date('2026-07-05').toISOString() },
    { id: 'je-6', date: '2026-07-10', reference: 'GEN-006', description: 'Digital Marketing & Lead Generation Expense', createdBy: 'System', timestamp: new Date('2026-07-10').toISOString() }
  ];

  const sampleJournalLines = [
    { id: 'jl-1', journalEntryId: 'je-1', accountId: '1020', debit: 5000000, credit: 0 },
    { id: 'jl-2', journalEntryId: 'je-1', accountId: '3010', debit: 0, credit: 5000000 },
    { id: 'jl-3', journalEntryId: 'je-2', accountId: '1020', debit: 450000, credit: 0 },
    { id: 'jl-4', journalEntryId: 'je-2', accountId: '4010', debit: 0, credit: 450000 },
    { id: 'jl-5', journalEntryId: 'je-3', accountId: '1020', debit: 320000, credit: 0 },
    { id: 'jl-6', journalEntryId: 'je-3', accountId: '4010', debit: 0, credit: 320000 },
    { id: 'jl-7', journalEntryId: 'je-4', accountId: '1100', debit: 600000, credit: 0 },
    { id: 'jl-8', journalEntryId: 'je-4', accountId: '4010', debit: 0, credit: 600000 },
    { id: 'jl-9', journalEntryId: 'je-5', accountId: '5050', debit: 45000, credit: 0 },
    { id: 'jl-10', journalEntryId: 'je-5', accountId: '1020', debit: 0, credit: 45000 },
    { id: 'jl-11', journalEntryId: 'je-6', accountId: '5060', debit: 85000, credit: 0 },
    { id: 'jl-12', journalEntryId: 'je-6', accountId: '1020', debit: 0, credit: 85000 }
  ];

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('gym_customers');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleCustomers;
  });

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('gym_inventory');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleInventory;
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('gym_invoices');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleInvoices;
  });

  const [quotes, setQuotes] = useState(() => {
    const saved = localStorage.getItem('gym_quotes');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleQuotes;
  });

  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('gym_leads');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleLeads;
  });

  const [activityLogs, setActivityLogs] = useState([]);

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('gym_expenses');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleExpenses;
  });

  const [payments, setPayments] = useState([]);

  const [fixedAssets, setFixedAssets] = useState(() => {
    const saved = localStorage.getItem('gym_fixed_assets');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleFixedAssets;
  });

  const [tasks, setTasks] = useState([]);

  // --- DOUBLE-ENTRY ACCOUNTING LEDGER STATE ---
  const defaultAccounts = [
    { id: '1010', code: '1010', name: 'Cash on Hand', type: 'asset', statement_category: 'cash_and_equivalents', is_current: true, parentId: null },
    { id: '1020', code: '1020', name: 'Bank Account', type: 'asset', statement_category: 'cash_and_equivalents', is_current: true, parentId: null },
    { id: '1100', code: '1100', name: 'Accounts Receivable', type: 'asset', statement_category: 'trade_receivables', is_current: true, parentId: null },
    { id: '1200', code: '1200', name: 'Inventory Asset', type: 'asset', statement_category: 'inventory', is_current: true, parentId: null },
    { id: '1500', code: '1500', name: 'Equipment & Fixed Assets', type: 'asset', statement_category: 'ppe', is_current: false, parentId: null },
    { id: '1550', code: '1550', name: 'Accumulated Depreciation', type: 'asset', statement_category: 'accumulated_depreciation', is_current: false, parentId: '1500' },
    { id: '1600', code: '1600', name: 'Intangible Assets', type: 'asset', statement_category: 'intangible_assets', is_current: false, parentId: null },
    
    { id: '2010', code: '2010', name: 'Accounts Payable', type: 'liability', statement_category: 'trade_payables', is_current: true, parentId: null },
    { id: '2020', code: '2020', name: 'Tax Payable', type: 'liability', statement_category: 'tax_payable', is_current: true, parentId: null },
    { id: '2030', code: '2030', name: 'Short-Term Borrowings', type: 'liability', statement_category: 'short_term_borrowings', is_current: true, parentId: null },
    { id: '2500', code: '2500', name: 'Long-Term Loans', type: 'liability', statement_category: 'long_term_loans', is_current: false, parentId: null },
    
    { id: '3010', code: '3010', name: "Owner's Equity / Stated Capital", type: 'equity', statement_category: 'stated_capital', is_current: false, parentId: null },
    { id: '3020', code: '3020', name: 'Retained Earnings', type: 'equity', statement_category: 'retained_earnings', is_current: false, parentId: null },
    { id: '3030', code: '3030', name: "Owner's Drawings / Dividends", type: 'equity', statement_category: 'drawings', is_current: false, parentId: null },
    
    { id: '4010', code: '4010', name: 'Membership Revenue', type: 'revenue', statement_category: 'revenue', is_current: null, parentId: null },
    { id: '4020', code: '4020', name: 'Personal Training Revenue', type: 'revenue', statement_category: 'revenue', is_current: null, parentId: null },
    { id: '4030', code: '4030', name: 'Other Income', type: 'revenue', statement_category: 'other_income', is_current: null, parentId: null },
    { id: '4040', code: '4040', name: 'Finance Income', type: 'revenue', statement_category: 'finance_income', is_current: null, parentId: null },
    
    { id: '4500', code: '4500', name: 'Cost of Sales (COGS)', type: 'expense', statement_category: 'cost_of_sales', is_current: null, parentId: null },
    { id: '5010', code: '5010', name: 'Rent Expense', type: 'expense', statement_category: 'administrative_expenses', is_current: null, parentId: null },
    { id: '5020', code: '5020', name: 'Salaries Expense', type: 'expense', statement_category: 'administrative_expenses', is_current: null, parentId: null },
    { id: '5030', code: '5030', name: 'Utilities Expense', type: 'expense', statement_category: 'administrative_expenses', is_current: null, parentId: null },
    { id: '5040', code: '5040', name: 'Depreciation Expense', type: 'expense', statement_category: 'administrative_expenses', is_current: null, parentId: null },
    { id: '5050', code: '5050', name: 'Operational Expense', type: 'expense', statement_category: 'other_expenses', is_current: null, parentId: null },
    { id: '5060', code: '5060', name: 'Distribution & Marketing Costs', type: 'expense', statement_category: 'distribution_costs', is_current: null, parentId: null },
    { id: '5070', code: '5070', name: 'Finance Costs / Interest Expense', type: 'expense', statement_category: 'finance_costs', is_current: null, parentId: null },
    { id: '5080', code: '5080', name: 'Income Tax Expense', type: 'expense', statement_category: 'tax_expense', is_current: null, parentId: null }
  ];

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('gym_chart_of_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(acc => {
          const match = defaultAccounts.find(d => d.id === acc.id || d.code === acc.code);
          return {
            ...acc,
            statement_category: acc.statement_category || match?.statement_category || (acc.type === 'revenue' ? 'revenue' : acc.type === 'expense' ? 'administrative_expenses' : 'cash_and_equivalents'),
            is_current: acc.is_current !== undefined ? acc.is_current : (match?.is_current !== undefined ? match.is_current : true)
          };
        });
      } catch (e) {}
    }
    return defaultAccounts;
  });

  const [journalEntries, setJournalEntries] = useState(() => {
    const saved = localStorage.getItem('gym_journal_entries');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleJournalEntries;
  });

  const [journalLines, setJournalLines] = useState(() => {
    const saved = localStorage.getItem('gym_journal_lines');
    return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : sampleJournalLines;
  });

  const [paymentAllocations, setPaymentAllocations] = useState(() => {
    const saved = localStorage.getItem('gym_payment_allocations');
    return saved ? JSON.parse(saved) : [];
  });

  const [depreciationSchedule, setDepreciationSchedule] = useState(() => {
    const saved = localStorage.getItem('gym_depreciation_schedule');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('gym_chart_of_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('gym_journal_entries', JSON.stringify(journalEntries)); }, [journalEntries]);
  useEffect(() => { localStorage.setItem('gym_journal_lines', JSON.stringify(journalLines)); }, [journalLines]);
  useEffect(() => { localStorage.setItem('gym_payment_allocations', JSON.stringify(paymentAllocations)); }, [paymentAllocations]);
  useEffect(() => { localStorage.setItem('gym_depreciation_schedule', JSON.stringify(depreciationSchedule)); }, [depreciationSchedule]);

  // CORE JOURNAL ENTRY COMMITTER (ENFORCES sum(debit) === sum(credit))
  const createJournalEntry = ({ date, reference, description, lines = [], createdBy = 'System' }) => {
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      const err = `Unbalanced Journal Entry (${reference}): Debits (LKR ${totalDebit.toFixed(2)}) != Credits (LKR ${totalCredit.toFixed(2)})`;
      console.error('[Accounting Engine Error]', err);
      showNotification(err, 'error');
      throw new Error(err);
    }

    const entryId = uuidv4();
    const newEntry = {
      id: entryId,
      date: date || new Date().toISOString().split('T')[0],
      reference: reference || 'GEN-000',
      description: description || '',
      createdBy,
      timestamp: new Date().toISOString()
    };

    const newLines = lines.map(line => ({
      id: uuidv4(),
      journalEntryId: entryId,
      accountId: line.accountId,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0
    }));

    setJournalEntries(prev => [newEntry, ...prev]);
    setJournalLines(prev => [...newLines, ...prev]);

    return { entry: newEntry, lines: newLines };
  };

  const getInvoicePaymentSummary = (invoiceId, invoiceAmount = 0) => {
    const allocations = paymentAllocations.filter(a => a.invoiceId === invoiceId);
    const allocatedPaid = allocations.reduce((sum, a) => sum + (Number(a.amountApplied) || 0), 0);
    
    const legacyPayments = payments.filter(p => p.documentId === invoiceId);
    const legacyPaid = legacyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalPaid = Math.max(allocatedPaid, legacyPaid);
    const remaining = Math.max(0, Number(invoiceAmount) - totalPaid);

    let derivedStatus = 'Sent';
    if (totalPaid >= Number(invoiceAmount) && Number(invoiceAmount) > 0) {
      derivedStatus = 'Paid';
    } else if (totalPaid > 0) {
      derivedStatus = 'Partially Paid';
    }

    return { totalPaid, remaining, derivedStatus, allocations };
  };

  // SMS Configuration (Base Defaults with localStorage mirror)
  const [smsConfig, setSmsConfig] = useState(() => {
    const saved = localStorage.getItem('gym_sms_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      apiKey: '2179165276941c4e5eb994053957585',
      email: 'seynextech@gmail.com',
      senderID: 'QKSendDemo',
      companyName: 'Seynex Technology',
      dashboardName: 'GymSales Pro',
      receiptLogo: '',
      companyAddress: 'No 680/1B, Hendrik Perera Road, Gonwala, Kelaniya',
      companyPhone: '072 840 8880',
      adminPhone: '072 840 8880',
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
      sessionTimeout: 5,
      balance: 0,
      invoicePrefix: 'INV-',
      nextInvoiceNumber: 1001,
      quotePrefix: 'QT-',
      nextQuoteNumber: 1001,
      debtorNudgeTemplate: 'Hi {name},\nThis is a friendly reminder that you have an outstanding balance of LKR {remainingBalance} for Invoice {invoiceNumber}. Please settle as soon as possible. Thank you!'
    };
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gym_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [notification, setNotification] = useState(null);
  
  // Realtime System Notifications (for Bell)
  const [systemNotifications, setSystemNotifications] = useState([]);
  
  const markNotificationsRead = () => setSystemNotifications([]);

  const [teamMembers, setTeamMembers] = useState(() => {
    const saved = localStorage.getItem('gym_team_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: '1', name: 'System Administrator', email: user?.email || 'admin@company.com', role: 'Admin', status: 'Active', addedAt: new Date().toISOString() },
      { id: '2', name: 'Sales Executive', email: 'sales@company.com', role: 'Sales Representative', status: 'Active', addedAt: new Date().toISOString() },
      { id: '3', name: 'Senior Accountant', email: 'accounts@company.com', role: 'Accountant', status: 'Active', addedAt: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    localStorage.setItem('gym_team_members', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const [customRoles, setCustomRoles] = useState(() => {
    const saved = localStorage.getItem('gym_custom_roles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'role-1', title: 'Admin', description: 'Full system administrative access and configuration rights.', permissions: ['all'], isSystem: true },
      { id: 'role-2', title: 'Sales Representative', description: 'Access to Gym clients, quotations, invoices, and inventory stock.', permissions: ['manage_clients', 'manage_quotes', 'manage_invoices', 'manage_inventory'], isSystem: true },
      { id: 'role-3', title: 'Accountant', description: 'Read and manage financial statements, invoices, debtors, assets & P&L reports.', permissions: ['view_financials', 'manage_invoices', 'view_debtors', 'view_reports'], isSystem: true },
      { id: 'role-4', title: 'Inventory Manager', description: 'Manage equipment inventory, stock pricing, and view stock reports.', permissions: ['manage_inventory', 'view_reports'], isSystem: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('gym_custom_roles', JSON.stringify(customRoles));
  }, [customRoles]);

  const addCustomRole = (roleData) => {
    const newRole = {
      id: `role-${Date.now()}`,
      title: roleData.title,
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystem: false
    };
    setCustomRoles(prev => [...prev, newRole]);
    showNotification(`Created custom user role: ${roleData.title}`);
  };

  const updateCustomRole = (roleId, roleData) => {
    setCustomRoles(prev => prev.map(r => r.id === roleId ? { ...r, ...roleData } : r));
    showNotification(`Updated role: ${roleData.title}`);
  };

  const duplicateCustomRole = (roleId) => {
    const roleToCopy = customRoles.find(r => r.id === roleId);
    if (!roleToCopy) return;

    const copiedRole = {
      id: `role-${Date.now()}`,
      title: `${roleToCopy.title} (Copy)`,
      description: roleToCopy.description || '',
      permissions: [...roleToCopy.permissions],
      isSystem: false
    };
    setCustomRoles(prev => [...prev, copiedRole]);
    showNotification(`Duplicated role as ${copiedRole.title}`);
  };

  const deleteCustomRole = (roleId) => {
    setCustomRoles(prev => prev.filter(r => r.id !== roleId));
    showNotification(`Deleted custom role`, 'warning');
  };

  const addTeamMember = (data) => {
    const newMember = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: data.role || 'Sales Representative',
      department: data.department || 'General',
      phone: data.phone || '',
      status: data.status || 'Active',
      mustChangePassword: !!data.mustChangePassword,
      expiryDate: data.expiryDate || '',
      password: data.password || 'password123',
      addedAt: new Date().toISOString()
    };
    setTeamMembers(prev => [newMember, ...prev]);
    showNotification(`Added team member ${data.name} as ${newMember.role}`);
  };

  const updateTeamMember = (id, updatedData) => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));
    showNotification(`Updated user account details for ${updatedData.name || 'user'}`);
    if (typeof addLog === 'function') {
      addLog('Access', `Admin updated user account details for: ${updatedData.name || id}`);
    }
  };

  const toggleTeamMemberStatus = (id) => {
    let newStatus = 'Active';
    setTeamMembers(prev => prev.map(m => {
      if (m.id === id) {
        newStatus = m.status === 'Active' ? 'Suspended' : 'Active';
        return { ...m, status: newStatus };
      }
      return m;
    }));
    showNotification(`User account status changed to ${newStatus}`);
  };

  const updateTeamMemberRole = (id, newRole) => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
    showNotification(`Updated user role to ${newRole}`);
  };

  const deleteTeamMember = (id) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    showNotification(`Removed team member`, 'warning');
  };

  const resetUserPassword = (id, newPassword) => {
    let targetName = 'User';
    setTeamMembers(prev => prev.map(m => {
      if (m.id === id) {
        targetName = m.name;
        return { 
          ...m, 
          password: newPassword, 
          passwordResetAt: new Date().toISOString() 
        };
      }
      return m;
    }));
    showNotification(`Password updated successfully for ${targetName}`);
    if (typeof addLog === 'function') {
      addLog('Security', `Admin reset password for user: ${targetName}`);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save theme to localStorage (UI Preference only)
  useEffect(() => { 
    localStorage.setItem('gym_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const seedDummyData = () => {
    setCustomers(sampleCustomers);
    setInventory(sampleInventory);
    setLeads(sampleLeads);
    setQuotes(sampleQuotes);
    setInvoices(sampleInvoices);
    setExpenses(sampleExpenses);
    setFixedAssets(sampleFixedAssets);
    setJournalEntries(sampleJournalEntries);
    setJournalLines(sampleJournalLines);

    localStorage.setItem('gym_customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('gym_inventory', JSON.stringify(sampleInventory));
    localStorage.setItem('gym_leads', JSON.stringify(sampleLeads));
    localStorage.setItem('gym_quotes', JSON.stringify(sampleQuotes));
    localStorage.setItem('gym_invoices', JSON.stringify(sampleInvoices));
    localStorage.setItem('gym_expenses', JSON.stringify(sampleExpenses));
    localStorage.setItem('gym_fixed_assets', JSON.stringify(sampleFixedAssets));
    localStorage.setItem('gym_journal_entries', JSON.stringify(sampleJournalEntries));
    localStorage.setItem('gym_journal_lines', JSON.stringify(sampleJournalLines));

    showNotification('Loaded full enterprise demo dataset successfully!');
  };

  const resetToSeynexDefaults = async () => {
    if (window.confirm("This will permanently remove your cloud account data. Proceed?")) {
      if (!user) return;
      try {
          await Promise.all([
            supabase.from('customers').delete().eq('user_id', user.id),
            supabase.from('inventory').delete().eq('user_id', user.id),
            supabase.from('quotations').delete().eq('user_id', user.id),
            supabase.from('invoices').delete().eq('user_id', user.id),
            supabase.from('leads').delete().eq('user_id', user.id),
            supabase.from('expenses').delete().eq('user_id', user.id),
            supabase.from('payments').delete().eq('user_id', user.id),
            supabase.from('activity_logs').delete().eq('user_id', user.id),
            supabase.from('user_profiles').delete().eq('user_id', user.id)
          ]);
          localStorage.clear();
          window.location.reload();
      } catch (err) {
          console.error('Reset error:', err);
      }
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

  // Structured Audit Trail Recorder for Production Readiness
  const recordAuditLog = async (action, entity, entityId, beforeState = null, afterState = null, details = '') => {
    const logObj = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: user?.id || 'system',
      user_email: user?.email || 'admin@seynex.lk',
      action,
      entity,
      entity_id: entityId,
      before_state: beforeState,
      after_state: afterState,
      details,
      timestamp: new Date().toISOString()
    };

    setActivityLogs(prev => [logObj, ...(prev || [])]);

    if (user) {
      try {
        await supabase.from('activity_logs').insert({
          id: logObj.id,
          user_id: user.id,
          log_type: action,
          message: `${action} on ${entity} (${entityId})`,
          details: JSON.stringify(logObj)
        });
      } catch (err) {
        console.error('Audit log write error:', err);
      }
    }
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
          prospect_phone: invoice.prospectPhone || customers.find(c => c.id === invoice.customerId)?.phone || '',
          amount: invoice.amount,
          status: invoice.status,
          items: invoice.items,
          reminder_sent: invoice.reminderSent || false,
          installment_plan: invoice.installmentPlan || {}
        });
      if (error) console.error('[Supabase Sync] Invoice Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Invoice Exception:', err);
    }
  };

  const syncCustomerToSupabase = async (customer) => {
    if (!user) {
      console.error('[Supabase Sync] No user session - cannot save customer');
      return;
    }
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
      if (error) {
        console.error('[Supabase Sync] Customer Error:', error);
        showNotification(`Cloud save failed: ${error.message}`, 'error');
      } else {
        console.log('[Supabase Sync] Customer saved OK:', customer.gymName);
      }
    } catch (err) {
      console.error('[Supabase Sync] Customer Exception:', err);
      showNotification(`Cloud save error: ${err.message}`, 'error');
    }
  };

  const syncInventoryToSupabase = async (item) => {
    if (!user) return;
    try {
      const fullPayload = {
        id: item.id,
        user_id: user.id,
        name: item.name,
        item_type: item.type,
        price: item.price,
        cost_price: item.costPrice || 0,
        reorder_level: item.reorderLevel || 5,
        stock: item.stock,
        description: item.desc
      };

      let { error } = await supabase.from('inventory').upsert(fullPayload);

      // Automatic Schema Fallback: If cost_price or reorder_level column is missing in Supabase DB schema cache
      if (error && (error.message?.includes('cost_price') || error.message?.includes('reorder_level') || error.code === 'PGRST204')) {
        console.warn('[Supabase Sync] Optional column cost_price/reorder_level not found in Supabase schema. Executing fallback upsert...', error.message);
        const basePayload = {
          id: item.id,
          user_id: user.id,
          name: item.name,
          item_type: item.type,
          price: item.price,
          stock: item.stock,
          description: item.desc
        };
        const fallbackRes = await supabase.from('inventory').upsert(basePayload);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[Supabase Sync] Inventory Error:', error);
        showNotification(`Inventory sync warning: ${error.message}`, 'warning');
      }
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
          address: lead.address,
          gym_name: lead.gymName,
          prospect_name: lead.prospectName,
          phone: lead.phone,
          status: lead.status,
          date: lead.date,
          notes: lead.notes
        });
      if (error) {
        console.error('[Supabase Sync] Lead Error:', error);
        showNotification(`Lead sync failed: ${error.message}`, 'error');
      }
    } catch (err) {
      console.error('[Supabase Sync] Lead Exception:', err);
      showNotification(`Lead exception: ${err.message}`, 'error');
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
      if (error) {
        console.error('[Supabase Sync] Expense Error:', error);
        showNotification(`Expense sync failed: ${error.message}`, 'error');
      }
    } catch (err) {
      console.error('[Supabase Sync] Expense Exception:', err);
      showNotification(`Expense exception: ${err.message}`, 'error');
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
          payment_type: payment.type,
          payment_timestamp: payment.timestamp
        });
      if (error) console.error('[Supabase Sync] Payment Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Payment Exception:', err);
    }
  };

  const syncFixedAssetToSupabase = async (asset) => {
    if (!user) return;
    try {
      const fullPayload = {
        id: asset.id,
        user_id: user.id,
        asset_code: asset.assetCode,
        name: asset.name,
        category: asset.category,
        purchase_date: asset.purchaseDate,
        purchase_cost: asset.purchaseCost,
        useful_life_years: asset.usefulLifeYears,
        salvage_value: asset.salvageValue,
        depreciation_method: asset.depreciationMethod || 'Straight Line (SLM)',
        depreciation_rate: asset.depreciationRate || 0,
        location: asset.location,
        status: asset.status
      };

      let { error } = await supabase.from('fixed_assets').upsert(fullPayload);

      if (error && (error.message?.includes('depreciation_method') || error.message?.includes('depreciation_rate') || error.code === 'PGRST204')) {
        console.warn('[Supabase Sync] Depreciation columns missing in Supabase schema. Retrying base payload...', error.message);
        const basePayload = {
          id: asset.id,
          user_id: user.id,
          asset_code: asset.assetCode,
          name: asset.name,
          category: asset.category,
          purchase_date: asset.purchaseDate,
          purchase_cost: asset.purchaseCost,
          useful_life_years: asset.usefulLifeYears,
          salvage_value: asset.salvageValue,
          location: asset.location,
          status: asset.status
        };
        const fallbackRes = await supabase.from('fixed_assets').upsert(basePayload);
        error = fallbackRes.error;
      }

      if (error) console.error('[Supabase Sync] Fixed Asset Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Fixed Asset Exception:', err);
    }
  };

  const addFixedAsset = (asset) => {
    const newAsset = { ...asset, id: asset.id || uuidv4() };
    setFixedAssets(prev => [newAsset, ...prev]);
    syncFixedAssetToSupabase(newAsset);

    try {
      createJournalEntry({
        date: newAsset.purchaseDate || new Date().toISOString().split('T')[0],
        reference: newAsset.assetCode || `FA-${newAsset.id.substring(0, 4)}`,
        description: `Fixed Asset Acquired: ${newAsset.name}`,
        lines: [
          { accountId: '1500', debit: Number(newAsset.purchaseCost) || 0, credit: 0 },
          { accountId: '1010', debit: 0, credit: Number(newAsset.purchaseCost) || 0 }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for Fixed Asset]', err);
    }

    addLog('FixedAsset', `Registered fixed asset: ${newAsset.name} (${newAsset.assetCode})`);
  };

  const processMonthlyDepreciation = (assetId) => {
    const asset = fixedAssets.find(a => a.id === assetId);
    if (!asset || !asset.purchaseCost || !asset.usefulLifeYears) return;

    const monthlyAmount = Math.round((Number(asset.purchaseCost) / (Number(asset.usefulLifeYears) * 12)) * 100) / 100;
    const todayStr = new Date().toISOString().split('T')[0];

    const { entry } = createJournalEntry({
      date: todayStr,
      reference: `DEP-${asset.assetCode || 'FA'}`,
      description: `Monthly Depreciation for ${asset.name}`,
      lines: [
        { accountId: '5040', debit: monthlyAmount, credit: 0 },
        { accountId: '1550', debit: 0, credit: monthlyAmount }
      ]
    });

    const schedRow = {
      id: uuidv4(),
      fixedAssetId: asset.id,
      periodDate: todayStr,
      amount: monthlyAmount,
      journalEntryId: entry.id
    };
    setDepreciationSchedule(prev => [schedRow, ...prev]);
    addLog('FixedAsset', `Auto-posted monthly depreciation for ${asset.name}: LKR ${monthlyAmount}`);
    return schedRow;
  };

  const updateFixedAsset = (id, data) => {
    setFixedAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    const updated = { ...fixedAssets.find(a => a.id === id), ...data, id };
    syncFixedAssetToSupabase(updated);
    addLog('FixedAsset', `Updated fixed asset: ${updated.name}`);
  };

  const deleteFixedAsset = async (id) => {
    const asset = fixedAssets.find(a => a.id === id);
    setFixedAssets(prev => prev.filter(a => a.id !== id));
    if (user) {
      await supabase.from('fixed_assets').delete().eq('id', id);
    }
    if (asset) addLog('FixedAsset', `Deleted fixed asset: ${asset.name}`);
  };

  // --- Expenses CRUD ---
  const addExpense = (expense) => {
    const newExpense = { ...expense, id: expense.id || uuidv4() };
    setExpenses(prev => [newExpense, ...prev]);
    syncExpenseToSupabase(newExpense);

    let categoryAccountId = '5050'; // Operational Expense
    if (expense.category === 'Rent') categoryAccountId = '5010';
    else if (expense.category === 'Salaries') categoryAccountId = '5020';
    else if (expense.category === 'Utilities') categoryAccountId = '5030';
    else if (expense.categoryAccountId) categoryAccountId = expense.categoryAccountId;

    try {
      createJournalEntry({
        date: newExpense.date || new Date().toISOString().split('T')[0],
        reference: `EXP-${newExpense.id.substring(0, 6)}`,
        description: `Expense: ${newExpense.category} - ${newExpense.description || ''}`,
        lines: [
          { accountId: categoryAccountId, debit: Number(newExpense.amount) || 0, credit: 0 },
          { accountId: '1010', debit: 0, credit: Number(newExpense.amount) || 0 }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for Expense]', err);
    }

    addLog('Expense', `Added new expense: ${newExpense.category} - LKR ${newExpense.amount}`);
  };

  const updateExpense = (id, data) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    const updated = { ...expenses.find(e => e.id === id), ...data, id };
    syncExpenseToSupabase(updated);
    addLog('Expense', `Updated expense: ${updated.category}`);
  };

  const deleteExpense = async (id) => {
    const expense = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (user) {
      await supabase.from('expenses').delete().eq('id', id);
    }
    if (expense) addLog('Expense', `Deleted expense: ${expense.category}`);
  };

  // --- Tasks CRUD ---
  const syncTaskToSupabase = async (task) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .upsert({
          id: task.id,
          user_id: user.id,
          title: task.title,
          description: task.description,
          due_date: task.dueDate,
          status: task.status,
          priority: task.priority,
          related_to: task.relatedTo,
          related_id: task.relatedId
        });
      if (error) console.error('[Supabase Sync] Task Error:', error);
    } catch (err) {
      console.error('[Supabase Sync] Task Exception:', err);
    }
  };

  const addTask = (task) => {
    const newTask = { ...task, id: task.id || uuidv4() };
    setTasks(prev => [newTask, ...prev]);
    syncTaskToSupabase(newTask);
    addLog('Task', `Created task: ${newTask.title}`);
  };

  const updateTask = (id, data) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    const updated = { ...tasks.find(t => t.id === id), ...data, id };
    syncTaskToSupabase(updated);
    addLog('Task', `Updated task: ${updated.title}`);
  };

  const deleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) {
      await supabase.from('tasks').delete().eq('id', id);
    }
    if (task) addLog('Task', `Deleted task: ${task.title}`);
  };

  const syncLogToSupabase = async (log) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('activity_logs')
        .upsert({
          id: log.id,
          user_id: user.id,
          log_type: log.type,
          message: log.message,
          details: log.details,
          log_timestamp: log.timestamp
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
    if (!user) {
      setIsStoreLoading(false);
      return;
    }
    
    try {
      console.log('[Supabase Sync] Fetching all business data...');
      setIsStoreLoading(true);

      const safeFetch = async (table, query) => {
        try {
          const { data, error } = await query;
          if (error) {
            console.error(`[Supabase Sync] Error fetching ${table}:`, error);
            return null;
          }
          return data;
        } catch (e) {
          console.error(`[Supabase Sync] Exception fetching ${table}:`, e);
          return null;
        }
      };
      
      const fetchResults = await Promise.all([
        safeFetch('customers', supabase.from('customers').select('*').eq('user_id', user.id)),
        safeFetch('inventory', supabase.from('inventory').select('*').eq('user_id', user.id)),
        safeFetch('quotations', supabase.from('quotations').select('*').eq('user_id', user.id)),
        safeFetch('invoices', supabase.from('invoices').select('*').eq('user_id', user.id)),
        safeFetch('leads', supabase.from('leads').select('*').eq('user_id', user.id)),
        safeFetch('expenses', supabase.from('expenses').select('*').eq('user_id', user.id)),
        safeFetch('payments', supabase.from('payments').select('*').eq('user_id', user.id)),
        safeFetch('tasks', supabase.from('tasks').select('*').eq('user_id', user.id)),
        safeFetch('fixed_assets', supabase.from('fixed_assets').select('*').eq('user_id', user.id)),
        safeFetch('activity_logs', supabase.from('activity_logs').select('*').eq('user_id', user.id).order('log_timestamp', { ascending: false }).limit(500)),
        safeFetch('user_profiles', supabase.from('user_profiles').select('config').eq('user_id', user.id).single())
      ]);

      const [cData, invData, qData, iData, lData, eData, pData, tData, faData, logData, profData] = fetchResults;

      console.log('[Supabase Sync] Fetch results - Customers:', cData?.length ?? 'ERROR', '| Invoices:', iData?.length ?? 'ERROR');

      if (cData === null) showNotification('Could not load clients from cloud. Check console for details.', 'error');

      if (faData) setFixedAssets(faData.map(a => ({
        id: a.id,
        assetCode: a.asset_code,
        name: a.name,
        category: a.category,
        purchaseDate: a.purchase_date,
        purchaseCost: Number(a.purchase_cost) || 0,
        usefulLifeYears: Number(a.useful_life_years) || 5,
        salvageValue: Number(a.salvage_value) || 0,
        depreciationMethod: a.depreciation_method || 'Straight Line (SLM)',
        depreciationRate: Number(a.depreciation_rate) || 0,
        location: a.location,
        status: a.status || 'Active'
      })));

      if (profData?.config) {
        setSmsConfig(prev => {
          const merged = { ...prev, ...profData.config };
          // IMPORTANT: Mirror cloud config to local storage for the PDF generator
          localStorage.setItem('gym_sms_config', JSON.stringify(merged));
          return merged;
        });
      }

      if (cData) setCustomers(cData.map(c => ({
        id: c.id, gymName: c.gym_name, name: c.name, email: c.email, phone: c.phone,
        dob: c.dob, purchaseDate: c.purchase_date, renewalDate: c.renewal_date, 
        annualFee: Number(c.annual_fee), status: c.status, notes: c.notes || []
      })));

      if (invData) setInventory(invData.map(i => ({
        id: i.id, name: i.name, type: i.item_type, 
        price: Number(i.price) || 0, 
        costPrice: Number(i.cost_price ?? Math.round((Number(i.price) || 0) * 0.7)),
        reorderLevel: Number(i.reorder_level ?? 5),
        stock: Number(i.stock) || 0, 
        desc: i.description
      })));

      if (qData) setQuotes(qData.map(q => ({
        id: q.id, shareKey: q.share_key, quoteNumber: q.quote_number, date: q.date,
        prospectName: q.prospect_name, prospectPhone: q.prospect_phone, amount: Number(q.amount),
        status: q.status, items: q.items || []
      })));

      if (iData) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const loadedInvoices = iData.map(inv => {
          let parsed = {
            id: inv.id, shareKey: inv.share_key, invoiceNumber: inv.invoice_number, date: inv.date,
            dueDate: inv.due_date, customerId: inv.customer_id || 'unknown', amount: Number(inv.amount),
            status: inv.status, items: inv.items || [], prospectName: inv.prospect_name, reminderSent: inv.reminder_sent,
            installmentPlan: (inv.installment_plan && inv.installment_plan.enabled) ? inv.installment_plan : null
          };

          // TIER 1 FEATURE: Overdue Invoice Auto-Flag
          if (parsed.status !== 'Paid' && parsed.status !== 'Overdue' && parsed.dueDate) {
            const due = new Date(parsed.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < todayDate) {
              parsed.status = 'Overdue';
              // Sync updated status to Supabase asynchronously
              supabase.from('invoices').update({ status: 'Overdue' }).eq('id', parsed.id).then(({ error }) => {
                if (error) console.error('[Auto-Flag] Invoice Sync Error:', error);
                else {
                  console.log(`[Auto-Flag] Marked ${parsed.invoiceNumber} as Overdue.`);
                }
              });
            }
          }
          return parsed;
        });

        setInvoices(loadedInvoices);
      }

      if (lData) setLeads(lData.map(l => ({
        id: l.id, gymName: l.gym_name, prospectName: l.prospect_name, phone: l.phone,
        status: l.status, date: l.date, notes: l.notes
      })));

      if (eData) setExpenses(eData.map(e => ({
        id: e.id, category: e.category, amount: Number(e.amount), date: e.date, description: e.description
      })));

      if (pData) setPayments(pData.map(p => ({
        id: p.id, customerId: p.customer_id, documentId: p.document_id, amount: Number(p.amount),
        type: p.payment_type, timestamp: p.payment_timestamp
      })));

      if (tData) setTasks(tData.map(t => ({
        id: t.id, title: t.title, description: t.description, dueDate: t.due_date,
        status: t.status, priority: t.priority, relatedTo: t.related_to, relatedId: t.related_id
      })));

      if (logData) setActivityLogs(logData.map(l => ({
        id: l.id, type: l.log_type, message: l.message, details: l.details, timestamp: l.log_timestamp
      })));

      console.log('[Supabase Sync] Load complete.');
    } catch (err) {
      console.error('[Supabase Sync] Global Fetch Exception:', err);
    } finally {
      setIsStoreLoading(false);
    }
  };

  // REALTIME SUBSCRIPTION FOR QUOTES
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[Realtime] Quotation Changed:', payload);
          if (payload.eventType === 'UPDATE') {
            const oldItem = quotes.find(q => q.id === payload.new.id);
            if (oldItem && oldItem.status !== payload.new.status) {
              if (payload.new.status === 'Accepted') {
                showNotification(`🎉 Quotation for ${payload.new.prospect_name} was ACCEPTED!`, 'success');
                // Push to bell notifications
                setSystemNotifications(prev => [{
                  id: crypto.randomUUID(),
                  message: `Quote #${payload.new.quote_number} accepted by ${payload.new.prospect_name}`,
                  time: new Date().toISOString(),
                  type: 'success'
                }, ...prev]);
              } else if (payload.new.status === 'Rejected') {
                showNotification(`Quotation #${payload.new.quote_number} was Declined.`, 'info');
                setSystemNotifications(prev => [{
                  id: crypto.randomUUID(),
                  message: `Quote #${payload.new.quote_number} declined by ${payload.new.prospect_name}`,
                  time: new Date().toISOString(),
                  type: 'error'
                }, ...prev]);
              }
              // Refresh local state to reflect change
              fetchCloudData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, quotes]);

  // Fetch from cloud on login
  useEffect(() => {
    if (user) fetchCloudData();
  }, [user]);

  // Actions
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
  
  // Helper to deduct stock quantities from inventory upon sales
  const deductStockForInvoice = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setInventory(prevInventory => {
      return prevInventory.map(invItem => {
        const lineMatch = items.find(it => !it.isDiscount && ((it.id && it.id === invItem.id) || (it.name && it.name.toLowerCase() === invItem.name.toLowerCase())));
        if (lineMatch && invItem.type === 'Hardware') {
          const lineQty = Number(lineMatch.quantity || 1);
          const newStock = Math.max(0, (Number(invItem.stock) || 0) - lineQty);
          const updated = { ...invItem, stock: newStock };
          syncInventoryToSupabase(updated);
          addLog('Inventory', `Stock deducted: ${invItem.name} (-${lineQty} units). New Stock: ${newStock}`);
          return updated;
        }
        return invItem;
      });
    });
  };

  // Helper to restore stock quantities if invoice is cancelled or deleted
  const restoreStockForInvoice = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setInventory(prevInventory => {
      return prevInventory.map(invItem => {
        const lineMatch = items.find(it => !it.isDiscount && ((it.id && it.id === invItem.id) || (it.name && it.name.toLowerCase() === invItem.name.toLowerCase())));
        if (lineMatch && invItem.type === 'Hardware') {
          const lineQty = Number(lineMatch.quantity || 1);
          const newStock = (Number(invItem.stock) || 0) + lineQty;
          const updated = { ...invItem, stock: newStock };
          syncInventoryToSupabase(updated);
          addLog('Inventory', `Stock restored: ${invItem.name} (+${lineQty} units). New Stock: ${newStock}`);
          return updated;
        }
        return invItem;
      });
    });
  };

  const addInvoice = (invoice) => {
    const newInvoice = { ...invoice, id: uuidv4(), shareKey: generateShareKey(), status: 'Sent' };
    setInvoices([...invoices, newInvoice]);
    syncInvoiceToSupabase(newInvoice);

    try {
      createJournalEntry({
        date: newInvoice.date,
        reference: newInvoice.invoiceNumber,
        description: `Invoice issued to ${newInvoice.prospectName || 'Customer'}`,
        lines: [
          { accountId: '1100', debit: Number(newInvoice.amount) || 0, credit: 0 },
          { accountId: '4010', debit: 0, credit: Number(newInvoice.amount) || 0 }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for Invoice]', err);
    }

    // Auto-deduct stock if invoice contains items
    if (invoice.items && invoice.items.length > 0) {
      deductStockForInvoice(invoice.items);
    }

    // Auto-increment Next Invoice Number if it matches the current sequence
    const currentPrefix = smsConfig.invoicePrefix || 'INV-';
    const currentNext = parseInt(smsConfig.nextInvoiceNumber || 1001);
    if (invoice.invoiceNumber === `${currentPrefix}${currentNext}`) {
        updateSmsConfig({ ...smsConfig, nextInvoiceNumber: currentNext + 1 });
    }
  };

  const deleteInvoice = async (id) => {
    const inv = invoices.find(i => i.id === id);
    if (inv && inv.items && inv.items.length > 0) {
      restoreStockForInvoice(inv.items);
    }
    setInvoices(invoices.filter(i => i.id !== id));
    if (user) {
      await supabase.from('invoices').delete().eq('id', id);
    }
  };

  const generateInstallmentSchedule = (totalAmount, count = 3, downPayment = 0, startDate = new Date().toISOString().split('T')[0], frequency = 'Monthly') => {
    const total = Number(totalAmount) || 0;
    const down = Math.min(total, Math.max(0, Number(downPayment) || 0));
    const numInstallments = Math.max(1, Number(count) || 1);
    const remaining = Math.max(0, total - down);
    const baseInstallment = Math.round((remaining / numInstallments) * 100) / 100;

    const schedule = [];

    if (down > 0) {
      schedule.push({
        number: 0,
        title: 'Upfront Down Payment',
        dueDate: startDate,
        amount: down,
        status: 'Pending',
        paidDate: null,
        paidAmount: 0
      });
    }

    const baseDateObj = new Date(startDate);

    for (let i = 1; i <= numInstallments; i++) {
      const instDate = new Date(baseDateObj);
      if (frequency === 'Weekly') {
        instDate.setDate(instDate.getDate() + (i * 7));
      } else {
        instDate.setMonth(instDate.getMonth() + i);
      }

      let currentAmount = (i === numInstallments)
        ? Math.round((remaining - (baseInstallment * (numInstallments - 1))) * 100) / 100
        : baseInstallment;

      schedule.push({
        number: i,
        title: `Installment #${i} of ${numInstallments}`,
        dueDate: instDate.toISOString().split('T')[0],
        amount: currentAmount,
        status: 'Pending',
        paidDate: null,
        paidAmount: 0
      });
    }

    return {
      enabled: true,
      count: numInstallments,
      downPayment: down,
      frequency: frequency,
      totalAmount: total,
      remainingBalance: remaining,
      installments: schedule
    };
  };

  const updateInvoiceInstallmentPlan = (id, plan) => {
    setInvoices(prev => prev.map(i => {
      if (i.id === id) {
        const updated = { ...i, installmentPlan: plan };
        syncInvoiceToSupabase(updated);
        addLog('Invoice', `Updated Installment Plan for ${i.invoiceNumber}`);
        return updated;
      }
      return i;
    }));
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

        // Deduct stock when paid or sent, restore if reset to draft
        if ((status === 'Paid' || status === 'Sent') && (i.status !== 'Paid' && i.status !== 'Sent')) {
          if (i.items && i.items.length > 0) deductStockForInvoice(i.items);
        } else if (status === 'Draft' && (i.status === 'Paid' || i.status === 'Sent')) {
          if (i.items && i.items.length > 0) restoreStockForInvoice(i.items);
        }

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

    // Auto-increment Next Quote Number if it matches current sequence
    const currentPrefix = smsConfig.quotePrefix || 'QT-';
    const currentNext = parseInt(smsConfig.nextQuoteNumber || 1001);
    if (quote.quoteNumber === `${currentPrefix}${currentNext}`) {
        updateSmsConfig({ ...smsConfig, nextQuoteNumber: currentNext + 1 });
    }
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

  const updateQuoteStatus = async (id, status) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    
    // Cloud Sync
    const { error } = await supabase.from('quotations').update({ status }).eq('id', id);
    if (error) {
      console.error('[Supabase Sync] Quote Status Error:', error);
      showNotification('Could not update status in cloud.', 'error');
      return;
    }

    // MANAGER NOTIFICATION ON ACCEPTANCE
    if (status === 'Accepted') {
      const quote = quotes.find(q => q.id === id);
      if (quote) {
        addLog('System', `Quote #${quote.quoteNumber} accepted by customer.`);
        
        // Final Alert Logic: Target Admin/Owner Phone specifically
        const alertPhone = smsConfig.adminPhone || smsConfig.companyPhone;
        if (alertPhone) {
          const alertMsg = `🚀 BUSINESS WIN: Quotation #${quote.quoteNumber} has been ACCEPTED by ${quote.prospectName}. Value: LKR ${quote.amount.toLocaleString()}. Please process next steps.`;
          sendDirectSMS(alertPhone, alertMsg);
        }
      }
    }
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

    if (quote.items && quote.items.length > 0) {
      deductStockForInvoice(quote.items);
    }

    setInvoices(prev => [newInvoice, ...prev]);
    syncInvoiceToSupabase(newInvoice);
    updateQuoteStatus(quoteId, 'Accepted');
    addLog('System', `Converted Quote ${quote.quoteNumber} to Invoice ${newInvoice.invoiceNumber}`);
    showNotification(`Converted! New invoice ${newInvoice.invoiceNumber} created.`);
    return newInvoice;
  };

  const recalculateInvoiceBalanceAndInstallments = (invoiceId, addedPaymentAmount = 0) => {
    if (!invoiceId) return;

    setInvoices(prevInvoices => {
      return prevInvoices.map(inv => {
        if (inv.id !== invoiceId) return inv;

        const invPayments = payments.filter(p => p.documentId === invoiceId);
        const totalPaid = invPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + Number(addedPaymentAmount);
        const invAmount = Number(inv.amount) || 0;
        const remainingBalance = Math.max(0, invAmount - totalPaid);

        let newStatus = inv.status;
        if (totalPaid >= invAmount) {
          newStatus = 'Paid';
        } else if (totalPaid > 0) {
          newStatus = 'Partially Paid';
        }

        let updatedPlan = inv.installmentPlan ? { ...inv.installmentPlan } : null;

        if (updatedPlan && updatedPlan.enabled && Array.isArray(updatedPlan.installments)) {
          updatedPlan.remainingBalance = remainingBalance;
          updatedPlan.totalPaid = totalPaid;

          let availablePool = totalPaid;
          const downPayment = Number(updatedPlan.downPayment) || 0;

          updatedPlan.installments = updatedPlan.installments.map((inst) => {
            const instAmt = Number(inst.amount) || 0;
            if (inst.number === 0) {
              const paidDown = Math.min(downPayment, availablePool);
              availablePool = Math.max(0, availablePool - downPayment);
              return {
                ...inst,
                paidAmount: paidDown,
                status: paidDown >= downPayment ? 'Paid' : (paidDown > 0 ? 'Partially Paid' : 'Pending')
              };
            } else {
              if (availablePool >= instAmt) {
                availablePool -= instAmt;
                return {
                  ...inst,
                  paidAmount: instAmt,
                  status: 'Paid'
                };
              } else if (availablePool > 0) {
                const currentAlloc = availablePool;
                availablePool = 0;
                return {
                  ...inst,
                  paidAmount: currentAlloc,
                  status: 'Partially Paid'
                };
              } else {
                return {
                  ...inst,
                  paidAmount: 0,
                  status: 'Pending'
                };
              }
            }
          });
        }

        const updatedInvoice = {
          ...inv,
          status: newStatus,
          installmentPlan: updatedPlan
        };

        syncInvoiceToSupabase(updatedInvoice);
        return updatedInvoice;
      });
    });
  };

  const recordCashDeposit = (data) => {
    const { customerId, documentId, amount, paymentType, bankOrCash = '1010' } = data; 
    const paymentId = uuidv4();
    
    const newPayment = {
      id: paymentId,
      timestamp: new Date().toISOString(),
      customerId,
      documentId,
      amount: Number(amount) || 0,
      type: 'Cash'
    };

    setPayments(prev => [...prev, newPayment]);
    syncPaymentToSupabase(newPayment);

    if (documentId) {
      const newAllocation = {
        id: uuidv4(),
        paymentId: paymentId,
        invoiceId: documentId,
        amountApplied: Number(amount) || 0,
        createdAt: new Date().toISOString()
      };
      setPaymentAllocations(prev => [newAllocation, ...prev]);

      recalculateInvoiceBalanceAndInstallments(documentId, amount);
    }

    try {
      const targetAccount = bankOrCash === '1020' ? '1020' : '1010';
      createJournalEntry({
        date: new Date().toISOString().split('T')[0],
        reference: `PAY-${documentId || 'CASH'}`,
        description: `Payment received for ${paymentType || 'Invoice'}`,
        lines: [
          { accountId: targetAccount, debit: Number(amount) || 0, credit: 0 },
          { accountId: '1100', debit: 0, credit: Number(amount) || 0 }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for Payment]', err);
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
      const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
      const payload = {
        senderID: smsConfig.senderID || "SEYNEX",
        to: cleanPhone || phone,
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
      
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = rawText;
      }

      console.log('SMS Send Result:', data);
      showNotification(`Verification SMS sent to ${phone}!`);
      addLog('SMS', `Sent to ${phone}: ${rawMessage.substring(0, 50)}...`);
      return { success: true, data };
    } catch (err) {
      console.error('Failed to send SMS API', err);
      showNotification('Error connecting to QuickSend API.', 'error');
      return { success: false, error: err };
    }
  };

  const sendBulkSMSArray = async (phonesArray, rawMessage) => {
    try {
      const cleanPhones = (phonesArray || []).map(p => (typeof p === 'string' ? p.replace(/[^0-9]/g, '') : p));
      const payload = {
        check_cost: false,
        senderID: smsConfig.senderID || "SEYNEX",
        to: cleanPhones,
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

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = rawText;
      }

      console.log('Bulk SMS Send Result:', data);
      showNotification(`Broadcast sent to ${phonesArray.length} contacts!`);
      addLog('SMS', `Bulk Broadcast to ${phonesArray.length} recipients.`);
      return { success: true, data };
    } catch (err) {
      console.error('Failed to send Bulk API', err);
      showNotification('Error connecting to QuickSend API for Broadcast.', 'error');
      return { success: false, error: err };
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
    else if (type === 'DebtorNudge') template = smsConfig.debtorNudgeTemplate || '';

    let templateWithBranding = template;
    if (smsConfig.smsHeader) templateWithBranding = `${smsConfig.smsHeader}\n${templateWithBranding}`;
    if (smsConfig.smsFooter) templateWithBranding = `${templateWithBranding}\n${smsConfig.smsFooter}`;

    msg = templateWithBranding
      .replace(/{name}/g, cName)
      .replace(/{gym}/g, cGym)
      .replace(/{companyName}/g, smsConfig.companyName || 'Seynex Technology')
      .replace(/{amount}/g, (documentData?.amount || customer?.annualFee || 0).toLocaleString())
      .replace(/{remainingBalance}/g, (documentData?.remainingBalance || 0).toLocaleString())
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
      invoices, addInvoice, updateInvoice, updateInvoiceStatus, generateInstallmentSchedule, updateInvoiceInstallmentPlan, recalculateInvoiceBalanceAndInstallments,
      quotes, addQuote, updateQuoteStatus, updateQuote, convertQuoteToInvoice,
      leads, addLead, updateLead, deleteLead,
      expenses, addExpense, updateExpense, deleteExpense,
      tasks, addTask, updateTask, deleteTask,
      fixedAssets, addFixedAsset, updateFixedAsset, deleteFixedAsset,
      payments, recordCashDeposit,
      accounts, journalEntries, journalLines, paymentAllocations, depreciationSchedule,
      createJournalEntry, getInvoicePaymentSummary, processMonthlyDepreciation,
      activityLogs, addLog, recordAuditLog,
      addCustomerNote,
      deleteInvoice, deleteQuote,
      smsConfig, updateSmsConfig, fetchSmsBalance, triggerSMS, sendDirectSMS, sendBulkSMSArray, handleTestSms,
      teamMembers, addTeamMember, updateTeamMember, updateTeamMemberRole, toggleTeamMemberStatus, deleteTeamMember, resetUserPassword,
      customRoles, addCustomRole, updateCustomRole, duplicateCustomRole, deleteCustomRole,
      theme, toggleTheme,
      notification, showNotification,
      systemNotifications, markNotificationsRead,
      resetToSeynexDefaults, seedDummyData,
      isStoreLoading
    }}>
      {children}
    </StoreContext.Provider>
  );
}
