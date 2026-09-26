import React, { createContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import ConfirmModal from '../components/ConfirmModal';

export const StoreContext = createContext();

export const PLAN_CONFIGS = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    price: 'LKR 15,000 / mo',
    maxBranches: 1,
    maxUsers: 2,
    maxCustomers: 50,
    maxSmsCredits: 100,
    maxQuotations: 20
  },
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    price: 'LKR 42,000 / mo',
    maxBranches: 3,
    maxUsers: 10,
    maxCustomers: 250,
    maxSmsCredits: 500,
    maxQuotations: Infinity
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 'LKR 95,000 / mo',
    maxBranches: Infinity,
    maxUsers: Infinity,
    maxCustomers: Infinity,
    maxSmsCredits: 5000,
    maxQuotations: Infinity
  }
};

export default function StoreContextProvider({ children }) {
  const { user } = useAuth();
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    try { return localStorage.getItem('gym_last_sync_time') || null; } catch(e) { return null; }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isHydratedRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  
  const toUuid = (id) => {
    if (isUuid(id)) return id;
    if (!id) return uuidv4();
    const hex = Array.from(String(id)).map(c => c.charCodeAt(0).toString(16)).join('').padEnd(32, '0').slice(0, 32);
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  };

  const getEffectiveUserId = () => {
    if (user?.id && isUuid(user.id)) return user.id;
    return '76bb4580-2006-464f-aab8-64029dbe9540';
  };

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
    try {
      const saved = localStorage.getItem('gym_customers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_inventory');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_invoices');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [quotes, setQuotes] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_quotes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [leads, setLeads] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_leads');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_activity_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_payments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [fixedAssets, setFixedAssets] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_fixed_assets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [tasks, setTasks] = useState([]);

  // --- PROCUREMENT & PURCHASE ORDER (PO) ERP STATE ---
  const sampleSuppliers = [
    { id: 'sup-1', name: 'TechnoGym Sri Lanka', contactPerson: 'Kanishka Silva', phone: '0112345678', email: 'sales@technogym.lk', category: 'Fitness Equipment', address: 'No 45, Galle Road, Colombo 03', status: 'Active' },
    { id: 'sup-2', name: 'Matrix Fitness Hardware', contactPerson: 'Nalin Perera', phone: '0117654321', email: 'orders@matrixfitness.lk', category: 'Gym Hardware & Sensors', address: 'No 112, Kandy Road, Kelaniya', status: 'Active' },
    { id: 'sup-3', name: 'Seynex Tech Hardware Supplying', contactPerson: 'Devinda de Silva', phone: '0728408880', email: 'hardware@seynex.lk', category: 'Biometric Access Control', address: 'No 680/1B, Gonwala, Kelaniya', status: 'Active' }
  ];

  const samplePurchaseOrders = [
    {
      id: 'po-1',
      poNumber: 'PO-1001',
      supplierId: 'sup-1',
      supplierName: 'TechnoGym Sri Lanka',
      date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'Ordered',
      totalAmount: 450000,
      items: [
        { name: 'Commercial Treadmill X10', quantity: 1, unitCost: 350000, totalCost: 350000 },
        { name: 'Rubber Bumper Plates 20kg', quantity: 4, unitCost: 25000, totalCost: 100000 }
      ]
    },
    {
      id: 'po-2',
      poNumber: 'PO-1002',
      supplierId: 'sup-3',
      supplierName: 'Seynex Tech Hardware Supplying',
      date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      status: 'Received',
      totalAmount: 180000,
      items: [
        { name: 'Biometric Turnstile Controller', quantity: 2, unitCost: 90000, totalCost: 180000 }
      ]
    }
  ];

  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_suppliers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_purchase_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // --- HR & PAYROLL ERP STATE ---
  const sampleEmployees = [
    {
      id: 'emp-1',
      employeeId: 'EMP-101',
      name: 'Kasun Rajapaksha',
      nic: '199214502819',
      dob: '1992-05-14',
      gender: 'Male',
      bloodGroup: 'O+',
      designation: 'Head Fitness Trainer',
      department: 'Fitness & Training',
      employmentType: 'Full-Time',
      shift: 'Morning (06:00 - 15:00)',
      phone: '0771234567',
      email: 'kasun@gymsales.lk',
      address: '45/2 Temple Road, Colombo 03',
      emergencyContactName: 'Sunethra Rajapaksha',
      emergencyContactPhone: '0778899001',
      emergencyContactRelation: 'Spouse',
      joinDate: '2023-01-15',
      confirmationDate: '2023-07-15',
      basicSalary: 85000,
      allowance: 15000,
      foodAllowance: 5000,
      transportAllowance: 10000,
      epfEligible: true,
      bankName: 'Commercial Bank of Ceylon',
      bankAccount: '8004920192',
      bankBranch: 'Kollupitiya Branch',
      bankDetails: 'Commercial Bank - 8004920192 (Kollupitiya)',
      status: 'Active',
      leaveBalances: { annual: 14, casual: 7, medical: 7 }
    },
    {
      id: 'emp-2',
      employeeId: 'EMP-102',
      name: 'Dilani Samarasinghe',
      nic: '198865403211',
      dob: '1988-11-20',
      gender: 'Female',
      bloodGroup: 'A+',
      designation: 'Operations Manager',
      department: 'Management',
      employmentType: 'Full-Time',
      shift: 'General (08:30 - 17:00)',
      phone: '0719876543',
      email: 'dilani@gymsales.lk',
      address: '12 Galle Road, Mount Lavinia',
      emergencyContactName: 'Kamal Samarasinghe',
      emergencyContactPhone: '0712233445',
      emergencyContactRelation: 'Brother',
      joinDate: '2022-06-01',
      confirmationDate: '2022-12-01',
      basicSalary: 120000,
      allowance: 20000,
      foodAllowance: 8000,
      transportAllowance: 12000,
      epfEligible: true,
      bankName: 'Sampath Bank PLC',
      bankAccount: '1009283940',
      bankBranch: 'Dehiwala Branch',
      bankDetails: 'Sampath Bank - 1009283940 (Dehiwala)',
      status: 'Active',
      leaveBalances: { annual: 14, casual: 7, medical: 7 }
    },
    {
      id: 'emp-3',
      employeeId: 'EMP-103',
      name: 'Mahesh Kumara',
      nic: '199532104928',
      dob: '1995-09-08',
      gender: 'Male',
      bloodGroup: 'B+',
      designation: 'Senior Gym Instructor',
      department: 'Fitness & Training',
      employmentType: 'Full-Time',
      shift: 'Evening (13:00 - 22:00)',
      phone: '0754443322',
      email: 'mahesh@gymsales.lk',
      address: '88 Kandy Road, Kelaniya',
      emergencyContactName: 'Ranjith Kumara',
      emergencyContactPhone: '0751122334',
      emergencyContactRelation: 'Father',
      joinDate: '2023-08-10',
      confirmationDate: '2024-02-10',
      basicSalary: 65000,
      allowance: 10000,
      foodAllowance: 4000,
      transportAllowance: 6000,
      epfEligible: true,
      bankName: 'Hatton National Bank',
      bankAccount: '0029384756',
      bankBranch: 'Kelaniya Branch',
      bankDetails: 'HNB Bank - 0029384756 (Kelaniya)',
      status: 'Active',
      leaveBalances: { annual: 14, casual: 7, medical: 7 }
    },
    {
      id: 'emp-4',
      employeeId: 'EMP-104',
      name: 'Anoma Perera',
      nic: '199854302910',
      dob: '1998-03-24',
      gender: 'Female',
      bloodGroup: 'AB+',
      designation: 'Front Desk Receptionist',
      department: 'Operations & Front Desk',
      employmentType: 'Full-Time',
      shift: 'Morning (06:00 - 15:00)',
      phone: '0703344556',
      email: 'anoma@gymsales.lk',
      address: '14/B Lake Road, Rajagiriya',
      emergencyContactName: 'Swarna Perera',
      emergencyContactPhone: '0708877665',
      emergencyContactRelation: 'Mother',
      joinDate: '2024-01-05',
      confirmationDate: '2024-07-05',
      basicSalary: 55000,
      allowance: 8000,
      foodAllowance: 3000,
      transportAllowance: 5000,
      epfEligible: true,
      bankName: 'Bank of Ceylon',
      bankAccount: '772819034',
      bankBranch: 'Rajagiriya Branch',
      bankDetails: 'Bank of Ceylon - 772819034 (Rajagiriya)',
      status: 'Active',
      leaveBalances: { annual: 14, casual: 7, medical: 7 }
    }
  ];

  const sampleHrLetters = [
    {
      id: 'let-1',
      employeeId: 'emp-1',
      employeeName: 'Kasun Rajapaksha',
      type: 'Salary Certificate',
      title: 'Salary Confirmation & Employment Certificate',
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      recipient: 'The Manager, Commercial Bank of Ceylon PLC',
      content: 'This is to certify that Mr. Kasun Rajapaksha is an active full-time employee holding the designation of Head Fitness Trainer with a current gross monthly remuneration of LKR 100,000.00.'
    }
  ];

  const samplePayruns = [
    {
      id: 'pr-1',
      month: '2026-07',
      payrunDate: '2026-07-31',
      totalGross: 315000,
      totalNet: 289800,
      totalEpfEmployer: 32400,
      totalEtfEmployer: 8100,
      status: 'Processed',
      slipsCount: 3
    }
  ];

  const defaultFeatureToggles = {
    procurement: true,
    hrPayroll: true,
    fixedAssets: true,
    debtors: true,
    expenses: true,
    leads: true,
    smsPortal: true,
    inventory: true,
    quotations: true,
    tasks: true,
    ledger: true
  };

  const sampleAttendanceLogs = [
    { id: 'att-1', employeeId: 'emp-1', date: new Date().toISOString().split('T')[0], status: 'Present', checkIn: '08:30', checkOut: '17:30', otHours: 1 },
    { id: 'att-2', employeeId: 'emp-2', date: new Date().toISOString().split('T')[0], status: 'Present', checkIn: '08:50', checkOut: '17:00', otHours: 0 },
    { id: 'att-3', employeeId: 'emp-3', date: new Date().toISOString().split('T')[0], status: 'On Leave', checkIn: '', checkOut: '', otHours: 0 }
  ];

  const sampleLeaveRequests = [
    {
      id: 'leave-1',
      employeeId: 'emp-3',
      employeeName: 'Mahesh Kumara',
      leaveType: 'Annual Leave',
      startDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      days: 2,
      reason: 'Personal family event',
      status: 'Approved'
    }
  ];

  const sampleSalaryAdvances = [
    {
      id: 'adv-1',
      employeeId: 'emp-1',
      employeeName: 'Kasun Rajapaksha',
      amount: 15000,
      requestDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      reason: 'Emergency home repair',
      status: 'Issued',
      deductedInMonth: ''
    }
  ];

  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [payruns, setPayruns] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_payruns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_attendance_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_leave_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const sampleStockTransfers = [
    {
      id: 'st-1',
      transferNumber: 'STO-1001',
      sourceLocation: 'Main Central Warehouse',
      destinationLocation: 'Colombo 03 Gym Branch',
      requestDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      status: 'In Transit',
      items: [
        { itemName: 'Rubber Bumper Plates 20kg', quantity: 10 },
        { itemName: 'Commercial Dumbbell Set 2.5-25kg', quantity: 2 }
      ],
      notes: 'Branch replenishment for new fitness studio area'
    }
  ];

  const samplePerformanceReviews = [
    {
      id: 'rev-1',
      employeeId: 'emp-1',
      employeeName: 'Kasun Rajapaksha',
      reviewDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
      reviewer: 'Manager',
      punctualityRating: 5,
      trainingQualityRating: 4,
      clientEngagementRating: 5,
      teamworkRating: 4,
      overallScore: 4.5,
      comments: 'Exceptional client retention rate and gym floor discipline.'
    }
  ];

  const sampleExpenseClaims = [
    {
      id: 'claim-1',
      employeeId: 'emp-2',
      employeeName: 'Nimali Perera',
      claimDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      category: 'Gym Equipment Supplies',
      description: 'Emergency cable replacement parts purchased locally',
      amount: 4500,
      status: 'Approved',
      disbursedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0]
    }
  ];

  const [salaryAdvances, setSalaryAdvances] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_salary_advances');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [stockTransfers, setStockTransfers] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_stock_transfers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [performanceReviews, setPerformanceReviews] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_performance_reviews');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [expenseClaims, setExpenseClaims] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_expense_claims');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [hrLetters, setHrLetters] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_hr_letters');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [currentPlan, setCurrentPlan] = useState(() => {
    const saved = localStorage.getItem('gym_current_plan');
    return saved || 'enterprise';
  });

  const [featureToggles, setFeatureToggles] = useState(() => {
    const saved = localStorage.getItem('gym_feature_toggles');
    return saved ? { ...defaultFeatureToggles, ...JSON.parse(saved) } : defaultFeatureToggles;
  });

  useEffect(() => { localStorage.setItem('gym_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('gym_purchase_orders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem('gym_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('gym_payruns', JSON.stringify(payruns)); }, [payruns]);
  useEffect(() => { localStorage.setItem('gym_attendance_logs', JSON.stringify(attendanceLogs)); }, [attendanceLogs]);
  useEffect(() => { localStorage.setItem('gym_leave_requests', JSON.stringify(leaveRequests)); }, [leaveRequests]);
  useEffect(() => { localStorage.setItem('gym_salary_advances', JSON.stringify(salaryAdvances)); }, [salaryAdvances]);
  useEffect(() => { localStorage.setItem('gym_stock_transfers', JSON.stringify(stockTransfers)); }, [stockTransfers]);
  useEffect(() => { localStorage.setItem('gym_performance_reviews', JSON.stringify(performanceReviews)); }, [performanceReviews]);
  useEffect(() => { localStorage.setItem('gym_expense_claims', JSON.stringify(expenseClaims)); }, [expenseClaims]);
  useEffect(() => { localStorage.setItem('gym_hr_letters', JSON.stringify(hrLetters)); }, [hrLetters]);
  useEffect(() => { localStorage.setItem('gym_feature_toggles', JSON.stringify(featureToggles)); }, [featureToggles]);

  // LOCAL STORAGE REALTIME MIRRORS (PREVENTS LOCAL DATA LOSS ON REFRESH)
  useEffect(() => { try { localStorage.setItem('gym_customers', JSON.stringify(customers)); } catch (e) {} }, [customers]);
  useEffect(() => { try { localStorage.setItem('gym_inventory', JSON.stringify(inventory)); } catch (e) {} }, [inventory]);
  useEffect(() => { try { localStorage.setItem('gym_invoices', JSON.stringify(invoices)); } catch (e) {} }, [invoices]);
  useEffect(() => { try { localStorage.setItem('gym_quotes', JSON.stringify(quotes)); } catch (e) {} }, [quotes]);
  useEffect(() => { try { localStorage.setItem('gym_leads', JSON.stringify(leads)); } catch (e) {} }, [leads]);
  useEffect(() => { try { localStorage.setItem('gym_expenses', JSON.stringify(expenses)); } catch (e) {} }, [expenses]);
  useEffect(() => { try { localStorage.setItem('gym_fixed_assets', JSON.stringify(fixedAssets)); } catch (e) {} }, [fixedAssets]);
  useEffect(() => { try { localStorage.setItem('gym_payments', JSON.stringify(payments)); } catch (e) {} }, [payments]);
  useEffect(() => { try { localStorage.setItem('gym_tasks', JSON.stringify(tasks)); } catch (e) {} }, [tasks]);
  useEffect(() => { try { localStorage.setItem('gym_activity_logs', JSON.stringify(activityLogs)); } catch (e) {} }, [activityLogs]);

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
    try {
      const saved = localStorage.getItem('gym_journal_entries');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [journalLines, setJournalLines] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_journal_lines');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
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

  const addAccount = (accountData) => {
    const exists = accounts.some(a => String(a.code).trim() === String(accountData.code).trim());
    if (exists) {
      const err = `Account code "${accountData.code}" already exists in Chart of Accounts`;
      showNotification(err, 'error');
      throw new Error(err);
    }

    const newAcc = {
      id: accountData.code || uuidv4(),
      code: String(accountData.code).trim(),
      name: String(accountData.name).trim(),
      type: accountData.type || 'asset',
      statement_category: accountData.statement_category || 'cash_and_equivalents',
      is_current: accountData.is_current !== undefined ? accountData.is_current : true,
      parentId: accountData.parentId || null,
      status: accountData.status || 'Active'
    };

    setAccounts(prev => [...prev, newAcc]);
    showNotification(`Created ledger account: ${newAcc.code} - ${newAcc.name}`);
    return newAcc;
  };

  const updateAccount = (id, updatedData) => {
    setAccounts(prev => prev.map(a => (a.id === id || a.code === id) ? { ...a, ...updatedData } : a));
    showNotification(`Updated ledger account details`);
  };

  const deleteAccount = (id) => {
    const hasTransactions = journalLines.some(l => l.accountId === id);
    if (hasTransactions) {
      const err = `Cannot delete account. Active journal lines exist for this account.`;
      showNotification(err, 'error');
      throw new Error(err);
    }

    setAccounts(prev => prev.filter(a => a.id !== id && a.code !== id));
    showNotification(`Deleted ledger account`, 'warning');
  };

  const deleteJournalEntry = (entryId) => {
    setJournalEntries(prev => prev.filter(e => e.id !== entryId));
    setJournalLines(prev => prev.filter(l => l.journalEntryId !== entryId));
    showNotification(`Deleted Journal Voucher ${entryId}`, 'warning');
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
  const DEFAULT_SMS_CONFIG = {
    apiKey: '2179165276941c4e5eb994053957585',
    email: 'seynextech@gmail.com',
    senderID: 'QKSendDemo',
    companyName: 'Seynex Technology',
    dashboardName: 'GymSales Pro',
    receiptLogo: '',
    companyLogo: '',
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

  const [smsConfig, setSmsConfig] = useState(() => {
    const saved = localStorage.getItem('gym_sms_config');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_SMS_CONFIG, ...parsed };
        }
      } catch (e) {}
    }
    return DEFAULT_SMS_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gym_sms_config', JSON.stringify(smsConfig));
    } catch (e) {
      console.warn('Failed to mirror gym_sms_config to localStorage', e);
    }
  }, [smsConfig]);

  // Track unsaved local changes to toggle Save button
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isHydratedRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [customers, inventory, invoices, quotes, leads, expenses, fixedAssets, payments, tasks, smsConfig]);

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
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanPassword = (data.password || 'password123').trim();
    const newMember = {
      id: Date.now().toString(),
      name: (data.name || '').trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: data.role || 'Sales Representative',
      department: data.department || 'General',
      phone: (data.phone || '').trim(),
      status: data.status || 'Active',
      mustChangePassword: !!data.mustChangePassword,
      expiryDate: data.expiryDate || '',
      password: cleanPassword,
      addedAt: new Date().toISOString()
    };

    setTeamMembers(prev => {
      const filtered = prev.filter(m => (m.email || '').trim().toLowerCase() !== cleanEmail);
      const updated = [newMember, ...filtered];
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to sync team member to localStorage', e);
      }
      return updated;
    });

    // Also attempt Supabase sign-up in the background so cloud auth is in sync if online
    if (supabase?.auth && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: { name: newMember.name, role: newMember.role }
        }
      }).catch(err => console.log('[StoreContext] Cloud auth sync deferred:', err?.message));
    }

    showNotification(`Added team member ${newMember.name} as ${newMember.role}`);
  };

  const updateTeamMember = (id, updatedData) => {
    setTeamMembers(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updatedData } : m);
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showNotification(`Updated user account details for ${updatedData.name || 'user'}`);
    if (typeof addLog === 'function') {
      addLog('Access', `Admin updated user account details for: ${updatedData.name || id}`);
    }
  };

  const toggleTeamMemberStatus = (id) => {
    let newStatus = 'Active';
    setTeamMembers(prev => {
      const updated = prev.map(m => {
        if (m.id === id) {
          newStatus = m.status === 'Active' ? 'Suspended' : 'Active';
          return { ...m, status: newStatus };
        }
        return m;
      });
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showNotification(`User account status changed to ${newStatus}`);
  };

  const updateTeamMemberRole = (id, newRole) => {
    setTeamMembers(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, role: newRole } : m);
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showNotification(`Updated user role to ${newRole}`);
  };

  const deleteTeamMember = (id) => {
    setTeamMembers(prev => {
      const updated = prev.filter(m => m.id !== id);
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showNotification(`Removed team member`, 'warning');
  };

  const resetUserPassword = (id, newPassword) => {
    let targetName = 'User';
    const cleanPass = (newPassword || '').trim();
    setTeamMembers(prev => {
      const updated = prev.map(m => {
        if (m.id === id) {
          targetName = m.name;
          return { 
            ...m, 
            password: cleanPass, 
            passwordResetAt: new Date().toISOString() 
          };
        }
        return m;
      });
      try {
        localStorage.setItem('gym_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showNotification(`Password updated successfully for ${targetName}`);
    if (typeof addLog === 'function') {
      addLog('Security', `Admin reset password for user: ${targetName}`);
    }
  };

  const showNotification = (message, type = 'success', duration = 3200) => {
    if (!message) {
      setNotification(null);
      if (window._toastTimer) clearTimeout(window._toastTimer);
      return;
    }
    setNotification({ message, type });
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      setNotification(null);
    }, duration);
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
    setSuppliers(sampleSuppliers);
    setPurchaseOrders(samplePurchaseOrders);
    setEmployees(sampleEmployees);

    localStorage.setItem('gym_customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('gym_inventory', JSON.stringify(sampleInventory));
    localStorage.setItem('gym_leads', JSON.stringify(sampleLeads));
    localStorage.setItem('gym_quotes', JSON.stringify(sampleQuotes));
    localStorage.setItem('gym_invoices', JSON.stringify(sampleInvoices));
    localStorage.setItem('gym_expenses', JSON.stringify(sampleExpenses));
    localStorage.setItem('gym_fixed_assets', JSON.stringify(sampleFixedAssets));
    localStorage.setItem('gym_journal_entries', JSON.stringify(sampleJournalEntries));
    localStorage.setItem('gym_journal_lines', JSON.stringify(sampleJournalLines));
    localStorage.setItem('gym_suppliers', JSON.stringify(sampleSuppliers));
    localStorage.setItem('gym_purchase_orders', JSON.stringify(samplePurchaseOrders));
    localStorage.setItem('gym_employees', JSON.stringify(sampleEmployees));

    showNotification('Loaded enterprise demo dataset successfully!');
  };

  const resetToSeynexDefaults = async () => {
    await executeResetEverything();
  };

  const clearActivityLogs = async () => {
    setActivityLogs([]);
    try {
      localStorage.removeItem('gym_activity_logs');
      localStorage.removeItem('gym_logs');
      setCloudSyncStatus('syncing');
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setCloudSyncStatus('synced');
    } catch (e) {
      console.warn('[Logs] Clear error:', e);
      setCloudSyncStatus('error');
    }
    showNotification('All activity and audit logs have been permanently cleared!', 'success');
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
  // --- SUPABASE CLOUD SYNC ENGINE ---
  const syncQuoteToSupabase = async (quote) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('quotations')
        .upsert({
          id: toUuid(quote.id),
          user_id: effId,
          share_key: quote.shareKey || generateShareKey(),
          quote_number: quote.quoteNumber || 'QT-1001',
          date: quote.date || new Date().toISOString().split('T')[0],
          prospect_name: quote.prospectName || '',
          prospect_phone: quote.prospectPhone || '',
          amount: Number(quote.amount) || 0,
          status: quote.status || 'Pending',
          items: quote.items || []
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Quote Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Quote Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncInvoiceToSupabase = async (invoice) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('invoices')
        .upsert({
          id: toUuid(invoice.id),
          user_id: effId,
          share_key: invoice.shareKey || generateShareKey(),
          invoice_number: invoice.invoiceNumber || 'INV-1001',
          date: invoice.date || new Date().toISOString().split('T')[0],
          due_date: invoice.dueDate || null,
          customer_id: isUuid(invoice.customerId) ? invoice.customerId : null,
          prospect_name: invoice.prospectName || customers.find(c => c.id === invoice.customerId)?.gymName || '',
          prospect_phone: invoice.prospectPhone || customers.find(c => c.id === invoice.customerId)?.phone || '',
          amount: Number(invoice.amount) || 0,
          status: invoice.status || 'Draft',
          items: invoice.items || [],
          reminder_sent: !!invoice.reminderSent,
          installment_plan: invoice.installmentPlan || {}
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Invoice Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Invoice Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncCustomerToSupabase = async (customer) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('customers')
        .upsert({
          id: toUuid(customer.id),
          user_id: effId,
          gym_name: customer.gymName || 'Client Gym',
          name: customer.name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          dob: customer.dob || null,
          purchase_date: customer.purchaseDate || null,
          renewal_date: customer.renewalDate || null,
          annual_fee: Number(customer.annualFee) || 0,
          status: customer.status || 'Active',
          notes: customer.notes || []
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Customer Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Customer Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncInventoryToSupabase = async (item) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const fullPayload = {
        id: toUuid(item.id),
        user_id: effId,
        name: item.name,
        item_type: item.type || 'Equipment',
        price: Number(item.price) || 0,
        cost_price: Number(item.costPrice) || 0,
        reorder_level: Number(item.reorderLevel) || 5,
        stock: Number(item.stock) || 0,
        description: item.desc || ''
      };

      let { error } = await supabase.from('inventory').upsert(fullPayload, { onConflict: 'id' });

      if (error && (error.message?.includes('cost_price') || error.message?.includes('reorder_level') || error.code === 'PGRST204')) {
        const basePayload = {
          id: toUuid(item.id),
          user_id: effId,
          name: item.name,
          item_type: item.type || 'Equipment',
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          description: item.desc || ''
        };
        const fallbackRes = await supabase.from('inventory').upsert(basePayload, { onConflict: 'id' });
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[Supabase Sync] Inventory Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Inventory Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncLeadToSupabase = async (lead) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('leads')
        .upsert({
          id: toUuid(lead.id),
          user_id: effId,
          address: lead.address || '',
          gym_name: lead.gymName || 'Lead Gym',
          prospect_name: lead.prospectName || lead.name || '',
          phone: lead.phone || '',
          status: lead.status || 'New',
          date: lead.date || new Date().toISOString(),
          notes: lead.notes || ''
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Lead Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Lead Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncExpenseToSupabase = async (expense) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('expenses')
        .upsert({
          id: toUuid(expense.id),
          user_id: effId,
          category: expense.category || 'Operational',
          amount: Number(expense.amount) || 0,
          date: expense.date || new Date().toISOString().split('T')[0],
          description: expense.description || ''
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Expense Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Expense Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncPaymentToSupabase = async (payment) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('payments')
        .upsert({
          id: toUuid(payment.id),
          user_id: effId,
          customer_id: isUuid(payment.customerId) ? payment.customerId : null,
          document_id: isUuid(payment.documentId) ? payment.documentId : null,
          amount: Number(payment.amount) || 0,
          payment_type: payment.type || 'Cash',
          payment_timestamp: payment.timestamp || new Date().toISOString()
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Payment Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Payment Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  const syncFixedAssetToSupabase = async (asset) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const assetUuid = toUuid(asset.id);
      const fullPayload = {
        id: assetUuid,
        user_id: effId,
        asset_code: asset.assetCode || 'FA-001',
        name: asset.name,
        category: asset.category || 'Gym Equipment',
        purchase_date: asset.purchaseDate || new Date().toISOString().split('T')[0],
        purchase_cost: Number(asset.purchaseCost) || 0,
        useful_life_years: Number(asset.usefulLifeYears) || 5,
        salvage_value: Number(asset.salvageValue) || 0,
        depreciation_method: asset.depreciationMethod || 'Straight Line (SLM)',
        depreciation_rate: Number(asset.depreciationRate) || 0,
        location: asset.location || 'HQ',
        status: asset.status || 'Active'
      };

      let { error } = await supabase.from('fixed_assets').upsert(fullPayload, { onConflict: 'id' });
      if (error && (error.message?.includes('depreciation_method') || error.message?.includes('depreciation_rate') || error.code === 'PGRST204')) {
        const basePayload = {
          id: assetUuid,
          user_id: effId,
          asset_code: asset.assetCode || 'FA-001',
          name: asset.name,
          category: asset.category || 'Gym Equipment',
          purchase_date: asset.purchaseDate || new Date().toISOString().split('T')[0],
          purchase_cost: Number(asset.purchaseCost) || 0,
          useful_life_years: Number(asset.usefulLifeYears) || 5,
          salvage_value: Number(asset.salvageValue) || 0,
          location: asset.location || 'HQ',
          status: asset.status || 'Active'
        };
        const fallbackRes = await supabase.from('fixed_assets').upsert(basePayload, { onConflict: 'id' });
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[Supabase Sync] Fixed Asset Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Fixed Asset Exception:', err.message);
      setCloudSyncStatus('error');
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
    showNotification(`Fixed asset "${newAsset.name}" registered!`, 'success');
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
    showNotification(`Depreciation LKR ${monthlyAmount.toLocaleString()} posted for ${asset.name}`, 'success');
    return schedRow;
  };

  const updateFixedAsset = (id, data) => {
    setFixedAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    const updated = { ...fixedAssets.find(a => a.id === id), ...data, id };
    syncFixedAssetToSupabase(updated);
    addLog('FixedAsset', `Updated fixed asset: ${updated.name}`);
    showNotification(`Fixed asset "${updated.name}" updated!`, 'success');
  };

  const deleteFixedAsset = async (id) => {
    const asset = fixedAssets.find(a => a.id === id);
    setFixedAssets(prev => prev.filter(a => a.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('fixed_assets').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete asset error:', e);
      setCloudSyncStatus('error');
    }
    if (asset) addLog('FixedAsset', `Deleted fixed asset: ${asset.name}`);
    showNotification(`Fixed asset "${asset?.name || 'Asset'}" deleted.`, 'info');
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
    showNotification(`Expense of LKR ${Number(newExpense.amount).toLocaleString()} added!`, 'success');
  };

  const updateExpense = (id, data) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    const updated = { ...expenses.find(e => e.id === id), ...data, id };
    syncExpenseToSupabase(updated);
    addLog('Expense', `Updated expense: ${updated.category}`);
    showNotification(`Expense details updated!`, 'success');
  };

  const deleteExpense = async (id) => {
    const expense = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('expenses').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete expense error:', e);
      setCloudSyncStatus('error');
    }
    if (expense) addLog('Expense', `Deleted expense: ${expense.category}`);
    showNotification(`Expense deleted.`, 'info');
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
    showNotification(`Task "${newTask.title}" created!`, 'success');
  };

  const updateTask = (id, data) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    const updated = { ...tasks.find(t => t.id === id), ...data, id };
    syncTaskToSupabase(updated);
    addLog('Task', `Updated task: ${updated.title}`);
    showNotification(`Task updated!`, 'success');
  };

  const deleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('tasks').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete task error:', e);
      setCloudSyncStatus('error');
    }
    if (task) addLog('Task', `Deleted task: ${task.title}`);
    showNotification(`Task deleted.`, 'info');
  };

  const syncLogToSupabase = async (log) => {
    try {
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('activity_logs')
        .upsert({
          id: toUuid(log.id),
          user_id: effId,
          log_type: log.type,
          message: log.message,
          details: log.details,
          log_timestamp: log.timestamp || new Date().toISOString()
        }, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Log Warning:', error.message);
    } catch (err) {
      console.warn('[Supabase Sync] Log Exception:', err.message);
    }
  };

  const syncConfigToSupabase = async (config) => {
    try {
      setCloudSyncStatus('syncing');
      const effId = getEffectiveUserId();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: effId,
          config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      if (error) {
        console.warn('[Supabase Sync] Config Upsert Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Supabase Sync] Config Exception:', err.message);
      setCloudSyncStatus('error');
    }
  };

  // FULL BIDIRECTIONAL CLOUD SYNCHRONIZATION
  const fetchCloudData = async (forcePushLocalIfEmpty = false) => {
    setIsStoreLoading(true);
    setCloudSyncStatus('syncing');
    
    try {
      console.log('[Supabase Sync] Fetching all business records from cloud...');

      const safeFetch = async (table, query) => {
        try {
          const { data, error } = await query;
          if (error) {
            console.warn(`[Supabase Sync] Warning fetching ${table}:`, error.message);
            return null;
          }
          return data;
        } catch (e) {
          console.warn(`[Supabase Sync] Exception fetching ${table}:`, e.message);
          return null;
        }
      };
      
      const fetchResults = await Promise.all([
        safeFetch('customers', supabase.from('customers').select('*')),
        safeFetch('inventory', supabase.from('inventory').select('*')),
        safeFetch('quotations', supabase.from('quotations').select('*')),
        safeFetch('invoices', supabase.from('invoices').select('*')),
        safeFetch('leads', supabase.from('leads').select('*')),
        safeFetch('expenses', supabase.from('expenses').select('*')),
        safeFetch('payments', supabase.from('payments').select('*')),
        safeFetch('tasks', supabase.from('tasks').select('*')),
        safeFetch('fixed_assets', supabase.from('fixed_assets').select('*')),
        safeFetch('activity_logs', supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)),
        safeFetch('user_profiles', supabase.from('user_profiles').select('config').limit(1))
      ]);

      const [cData, invData, qData, iData, lData, eData, pData, tData, faData, logData, profData] = fetchResults;

      console.log('[Supabase Sync] Fetch results - Customers:', cData?.length ?? 'N/A', '| Invoices:', iData?.length ?? 'N/A', '| Quotes:', qData?.length ?? 'N/A');

      // 1. Fixed Assets
      if (Array.isArray(faData)) {
        const loadedAssets = faData.map(a => ({
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
        }));
        setFixedAssets(loadedAssets);
        try { localStorage.setItem('gym_fixed_assets', JSON.stringify(loadedAssets)); } catch(e) {}
      }

      // 2. Company Config & Branding Profile
      const remoteConfig = Array.isArray(profData) ? profData[0]?.config : profData?.config;
      if (remoteConfig && typeof remoteConfig === 'object' && Object.keys(remoteConfig).length > 0) {
        setSmsConfig(prev => {
          const merged = { ...prev, ...remoteConfig };
          try { localStorage.setItem('gym_sms_config', JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      }

      // 3. Customers
      if (Array.isArray(cData)) {
        const loadedCustomers = cData.map(c => ({
          id: c.id,
          gymName: c.gym_name,
          name: c.name,
          email: c.email,
          phone: c.phone,
          dob: c.dob,
          purchaseDate: c.purchase_date,
          renewalDate: c.renewal_date, 
          annualFee: Number(c.annual_fee) || 0,
          status: c.status,
          notes: c.notes || []
        }));
        setCustomers(loadedCustomers);
        try { localStorage.setItem('gym_customers', JSON.stringify(loadedCustomers)); } catch(e) {}
      }

      // 4. Inventory
      if (Array.isArray(invData)) {
        const loadedInventory = invData.map(i => ({
          id: i.id,
          name: i.name,
          type: i.item_type, 
          price: Number(i.price) || 0, 
          costPrice: Number(i.cost_price ?? Math.round((Number(i.price) || 0) * 0.7)),
          reorderLevel: Number(i.reorder_level ?? 5),
          stock: Number(i.stock) || 0, 
          desc: i.description
        }));
        setInventory(loadedInventory);
        try { localStorage.setItem('gym_inventory', JSON.stringify(loadedInventory)); } catch(e) {}
      }

      // 5. Quotations
      if (Array.isArray(qData)) {
        const loadedQuotes = qData.map(q => ({
          id: q.id,
          shareKey: q.share_key,
          quoteNumber: q.quote_number,
          date: q.date,
          prospectName: q.prospect_name,
          prospectPhone: q.prospect_phone,
          amount: Number(q.amount) || 0,
          status: q.status,
          items: q.items || []
        }));
        setQuotes(loadedQuotes);
        try { localStorage.setItem('gym_quotes', JSON.stringify(loadedQuotes)); } catch(e) {}
      }

      // 6. Invoices
      if (Array.isArray(iData)) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const loadedInvoices = iData.map(inv => {
          let parsed = {
            id: inv.id,
            shareKey: inv.share_key,
            invoiceNumber: inv.invoice_number,
            date: inv.date,
            dueDate: inv.due_date,
            customerId: inv.customer_id || 'unknown',
            amount: Number(inv.amount) || 0,
            status: inv.status,
            items: inv.items || [],
            prospectName: inv.prospect_name,
            reminderSent: inv.reminder_sent,
            installmentPlan: (inv.installment_plan && inv.installment_plan.enabled) ? inv.installment_plan : null
          };

          if (parsed.status !== 'Paid' && parsed.status !== 'Overdue' && parsed.dueDate) {
            const due = new Date(parsed.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < todayDate) {
              parsed.status = 'Overdue';
              supabase.from('invoices').update({ status: 'Overdue' }).eq('id', parsed.id).catch(e => console.warn(e));
            }
          }
          return parsed;
        });

        setInvoices(loadedInvoices);
        try { localStorage.setItem('gym_invoices', JSON.stringify(loadedInvoices)); } catch(e) {}
      }

      // 7. Leads
      if (Array.isArray(lData)) {
        const loadedLeads = lData.map(l => ({
          id: l.id,
          gymName: l.gym_name,
          prospectName: l.prospect_name,
          phone: l.phone,
          status: l.status,
          date: l.date,
          notes: l.notes
        }));
        setLeads(loadedLeads);
        try { localStorage.setItem('gym_leads', JSON.stringify(loadedLeads)); } catch(e) {}
      }

      // 8. Expenses
      if (Array.isArray(eData)) {
        const loadedExpenses = eData.map(e => ({
          id: e.id,
          category: e.category,
          amount: Number(e.amount) || 0,
          date: e.date,
          description: e.description
        }));
        setExpenses(loadedExpenses);
        try { localStorage.setItem('gym_expenses', JSON.stringify(loadedExpenses)); } catch(e) {}
      }

      // 9. Payments
      if (Array.isArray(pData)) {
        const loadedPayments = pData.map(p => ({
          id: p.id,
          customerId: p.customer_id,
          documentId: p.document_id,
          amount: Number(p.amount) || 0,
          type: p.payment_type,
          timestamp: p.payment_timestamp
        }));
        setPayments(loadedPayments);
        try { localStorage.setItem('gym_payments', JSON.stringify(loadedPayments)); } catch(e) {}
      }

      // 10. Tasks
      if (Array.isArray(tData)) {
        const loadedTasks = tData.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.due_date,
          status: t.status,
          priority: t.priority,
          relatedTo: t.related_to,
          relatedId: t.related_id
        }));
        setTasks(loadedTasks);
        try { localStorage.setItem('gym_tasks', JSON.stringify(loadedTasks)); } catch(e) {}
      }

      // 11. Activity Logs
      if (Array.isArray(logData)) {
        const loadedLogs = logData.map(l => ({
          id: l.id,
          type: l.log_type,
          message: l.message,
          details: l.details,
          timestamp: l.log_timestamp
        }));
        setActivityLogs(loadedLogs);
        try { localStorage.setItem('gym_activity_logs', JSON.stringify(loadedLogs)); } catch(e) {}
      }

      const syncTimeStr = new Date().toISOString();
      setLastSyncTime(syncTimeStr);
      try { localStorage.setItem('gym_last_sync_time', syncTimeStr); } catch(e) {}
      setCloudSyncStatus('synced');
      setHasUnsavedChanges(false);
      setTimeout(() => { isHydratedRef.current = true; }, 100);
      console.log('[Supabase Sync] Cloud data hydration completed successfully.');
    } catch (err) {
      console.error('[Supabase Sync] Global Fetch Exception:', err);
      setCloudSyncStatus('error');
    } finally {
      setIsStoreLoading(false);
    }
  };

  // PUSH ALL LOCAL DATA TO SUPABASE CLOUD (MANUAL OR AUTO INITIAL SYNC)
  const syncAllToCloud = async () => {
    setCloudSyncStatus('syncing');
    showNotification('Saving all data to Supabase cloud...', 'info');
    const effId = getEffectiveUserId();

    try {
      let savedCount = 0;
      let rlsBlocked = false;
      let firstError = null;

      const safeUpsert = async (table, payload, onConflict = 'id') => {
        try {
          let res = await supabase.from(table).upsert(payload, { onConflict });
          // If foreign key constraint failed on user_id, retry without user_id
          if (res.error && res.error.code === '23503' && payload.user_id) {
            const fallback = { ...payload };
            delete fallback.user_id;
            res = await supabase.from(table).upsert(fallback, { onConflict });
          }
          if (res.error) {
            if (res.error.code === '42501' || res.error.message?.includes('row-level security')) {
              rlsBlocked = true;
            }
            if (!firstError) firstError = `${table}: ${res.error.message}`;
            console.warn(`[Supabase Save Warning on ${table}]`, res.error.message);
            return false;
          }
          savedCount++;
          return true;
        } catch (e) {
          console.warn(`[Supabase Save Exception on ${table}]`, e.message);
          if (!firstError) firstError = `${table}: ${e.message}`;
          return false;
        }
      };

      // 1. Customers
      for (const c of (customers || [])) {
        await safeUpsert('customers', {
          id: toUuid(c.id),
          user_id: effId,
          gym_name: c.gymName || 'Client Gym',
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          dob: c.dob || null,
          purchase_date: c.purchaseDate || null,
          renewal_date: c.renewalDate || null,
          annual_fee: Number(c.annualFee) || 0,
          status: c.status || 'Active',
          notes: c.notes || []
        });
      }

      // 2. Inventory
      for (const item of (inventory || [])) {
        await safeUpsert('inventory', {
          id: toUuid(item.id),
          user_id: effId,
          name: item.name,
          item_type: item.type || 'Equipment',
          price: Number(item.price) || 0,
          cost_price: Number(item.costPrice) || 0,
          reorder_level: Number(item.reorderLevel) || 5,
          stock: Number(item.stock) || 0,
          description: item.desc || ''
        });
      }

      // 3. Quotations
      for (const q of (quotes || [])) {
        await safeUpsert('quotations', {
          id: toUuid(q.id),
          user_id: effId,
          share_key: q.shareKey || generateShareKey(),
          quote_number: q.quoteNumber || 'QT-1001',
          date: q.date || new Date().toISOString().split('T')[0],
          prospect_name: q.prospectName || '',
          prospect_phone: q.prospectPhone || '',
          amount: Number(q.amount) || 0,
          status: q.status || 'Pending',
          items: q.items || []
        });
      }

      // 4. Invoices
      for (const inv of (invoices || [])) {
        await safeUpsert('invoices', {
          id: toUuid(inv.id),
          user_id: effId,
          share_key: inv.shareKey || generateShareKey(),
          invoice_number: inv.invoiceNumber || 'INV-1001',
          date: inv.date || new Date().toISOString().split('T')[0],
          due_date: inv.dueDate || null,
          customer_id: isUuid(inv.customerId) ? inv.customerId : null,
          prospect_name: inv.prospectName || '',
          amount: Number(inv.amount) || 0,
          status: inv.status || 'Draft',
          items: inv.items || [],
          reminder_sent: !!inv.reminderSent,
          installment_plan: inv.installmentPlan || {}
        });
      }

      // 5. Leads
      for (const l of (leads || [])) {
        await safeUpsert('leads', {
          id: toUuid(l.id),
          user_id: effId,
          gym_name: l.gymName || 'Lead Gym',
          prospect_name: l.prospectName || l.name || '',
          phone: l.phone || '',
          status: l.status || 'New',
          date: l.date || new Date().toISOString(),
          notes: l.notes || ''
        });
      }

      // 6. Expenses
      for (const e of (expenses || [])) {
        await safeUpsert('expenses', {
          id: toUuid(e.id),
          user_id: effId,
          category: e.category || 'Operational',
          amount: Number(e.amount) || 0,
          date: e.date || new Date().toISOString().split('T')[0],
          description: e.description || ''
        });
      }

      // 7. Fixed Assets
      for (const fa of (fixedAssets || [])) {
        await safeUpsert('fixed_assets', {
          id: toUuid(fa.id),
          user_id: effId,
          asset_code: fa.assetCode || 'FA-001',
          name: fa.name,
          category: fa.category || 'Gym Equipment',
          purchase_date: fa.purchaseDate || new Date().toISOString().split('T')[0],
          purchase_cost: Number(fa.purchaseCost) || 0,
          useful_life_years: Number(fa.usefulLifeYears) || 5,
          salvage_value: Number(fa.salvageValue) || 0,
          location: fa.location || 'HQ',
          status: fa.status || 'Active'
        });
      }

      // 8. Payments
      for (const p of (payments || [])) {
        await safeUpsert('payments', {
          id: toUuid(p.id),
          user_id: effId,
          customer_id: isUuid(p.customerId) ? p.customerId : null,
          document_id: isUuid(p.documentId) ? p.documentId : null,
          amount: Number(p.amount) || 0,
          payment_type: p.type || 'Cash',
          payment_timestamp: p.timestamp || new Date().toISOString()
        });
      }

      // 9. Tasks
      for (const t of (tasks || [])) {
        await safeUpsert('tasks', {
          id: toUuid(t.id),
          user_id: effId,
          title: t.title || 'Task',
          description: t.description || '',
          due_date: t.dueDate || null,
          status: t.status || 'Pending',
          priority: t.priority || 'Medium',
          related_to: t.relatedTo || '',
          related_id: t.relatedId || ''
        });
      }

      // 10. Activity Logs (last 50)
      for (const l of (activityLogs || []).slice(0, 50)) {
        await safeUpsert('activity_logs', {
          id: toUuid(l.id),
          user_id: effId,
          log_type: l.type || 'System',
          message: l.message || '',
          details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || ''),
          log_timestamp: l.timestamp || new Date().toISOString()
        });
      }

      // 11. Config / Profile
      await safeUpsert('user_profiles', {
        user_id: effId,
        config: smsConfig,
        updated_at: new Date().toISOString()
      }, 'user_id');

      if (rlsBlocked) {
        setCloudSyncStatus('error');
        showNotification('⚠️ Supabase blocked save (Row Level Security is ON). Go to Settings → Cloud Sync for the quick SQL fix.', 'error', 10000);
        return { success: false, rlsBlocked: true };
      }

      const syncTimeStr = new Date().toISOString();
      setLastSyncTime(syncTimeStr);
      try { localStorage.setItem('gym_last_sync_time', syncTimeStr); } catch (e) {}
      setCloudSyncStatus('synced');
      setHasUnsavedChanges(false);
      showNotification(`💾 Data Saved! ${savedCount} records saved to Supabase cloud.`, 'success');
      return { success: true, count: savedCount };
    } catch (err) {
      console.error('[Cloud Save Error]', err);
      setCloudSyncStatus('error');
      showNotification(`Save error: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  };

  // EXECUTE DELETION OF ALL DATA BOTH LOCALLY AND IN CLOUD
  const executeResetEverything = async () => {
    setIsStoreLoading(true);
    setCloudSyncStatus('syncing');
    showNotification('Wiping local and cloud records...', 'info');

    try {
      // 1. Delete records from Supabase in foreign-key safe order
      const tablesInOrder = [
        'payments',
        'activity_logs',
        'tasks',
        'invoices',
        'quotations',
        'customers',
        'inventory',
        'expenses',
        'fixed_assets',
        'leads'
      ];

      for (const tbl of tablesInOrder) {
        try {
          await supabase.from(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (tblErr) {
          console.warn(`[Supabase Reset Notice on ${tbl}]`, tblErr.message);
        }
      }

      // 2. Clear Local Storage
      const keys = [
        'gym_customers', 'gym_inventory', 'gym_quotes', 'gym_invoices',
        'gym_leads', 'gym_expenses', 'gym_payments', 'gym_fixed_assets',
        'gym_tasks', 'gym_activity_logs', 'gym_logs', 'gym_journal_entries', 'gym_journal_lines',
        'gym_payment_allocations', 'gym_depreciation_schedule', 'gym_last_sync_time',
        'gym_suppliers', 'gym_purchase_orders', 'gym_employees', 'gym_payruns',
        'gym_attendance_logs', 'gym_leave_requests', 'gym_salary_advances',
        'gym_stock_transfers', 'gym_performance_reviews', 'gym_expense_claims', 'gym_hr_letters'
      ];
      keys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // 3. Clear React state
      setCustomers([]);
      setInventory([]);
      setQuotes([]);
      setInvoices([]);
      setLeads([]);
      setExpenses([]);
      setPayments([]);
      setFixedAssets([]);
      setTasks([]);
      setActivityLogs([]);
      setPaymentAllocations([]);
      setJournalEntries([]);
      setJournalLines([]);
      setDepreciationSchedule([]);
      setSuppliers([]);
      setPurchaseOrders([]);
      setEmployees([]);
      setPayruns([]);
      setAttendanceLogs([]);
      setLeaveRequests([]);
      setSalaryAdvances([]);
      setStockTransfers([]);
      setPerformanceReviews([]);
      setExpenseClaims([]);
      setHrLetters([]);

      setCloudSyncStatus('synced');
      setHasUnsavedChanges(false);
      setLastSyncTime(new Date().toISOString());
      showNotification('All data has been reset to a clean state!', 'success');
      return true;
    } catch (err) {
      console.error('[Reset Error]', err);
      showNotification(`Reset error: ${err.message}`, 'error');
      return false;
    } finally {
      setIsStoreLoading(false);
    }
  };

  // TRIGGER CONFIRMATION MODAL TO RESET EVERYTHING
  const resetEverythingWithConfirmation = () => {
    confirmAction({
      title: 'Reset All Business Data?',
      message: 'This will permanently wipe all local and cloud records (clients, quotes, invoices, inventory, leads, expenses, and logs). Your system will be reset to a completely clean state. This action CANNOT be undone. Are you sure you want to proceed?',
      confirmText: 'Yes, Reset Everything',
      cancelText: 'Cancel & Keep Data',
      variant: 'danger',
      onConfirm: async () => {
        await executeResetEverything();
      }
    });
  };

  // REALTIME SUBSCRIPTION FOR QUOTES
  useEffect(() => {
    const effId = getEffectiveUserId();
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        (payload) => {
          console.log('[Realtime] Quotation Changed:', payload);
          if (payload.eventType === 'UPDATE') {
            const oldItem = quotes.find(q => q.id === payload.new.id);
            if (oldItem && oldItem.status !== payload.new.status) {
              if (payload.new.status === 'Accepted') {
                showNotification(`🎉 Quotation for ${payload.new.prospect_name} was ACCEPTED!`, 'success');
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

  // Fetch from cloud on initial app startup & whenever auth changes
  useEffect(() => {
    fetchCloudData();
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
    showNotification(`Client "${customer.gymName || customer.name}" added successfully!`, 'success');
  };

  const deleteCustomer = async (id) => {
    const target = customers.find(c => c.id === id);
    setCustomers(customers.filter(c => c.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('customers').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete customer error:', e);
      setCloudSyncStatus('error');
    }
    showNotification(`Client "${target?.gymName || 'Client'}" removed.`, 'info');
  };

  const updateCustomer = (id, updatedData) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedData };
        syncCustomerToSupabase(updated);
        showNotification(`Client "${updated.gymName || 'Client'}" updated!`, 'success');
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
        showNotification(`Note added for ${c.gymName}`, 'success');
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
    showNotification(`Inventory item "${item.name}" added!`, 'success');
  };

  const deleteInventoryItem = async (id) => {
    const item = inventory.find(i => i.id === id);
    setInventory(inventory.filter(i => i.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('inventory').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete inventory error:', e);
      setCloudSyncStatus('error');
    }
    showNotification(`Inventory item "${item?.name || 'Item'}" deleted.`, 'info');
  };

  const updateInventoryItem = (id, data) => {
    setInventory(prev => prev.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...data };
        syncInventoryToSupabase(updated);
        showNotification(`Inventory item "${updated.name}" updated!`, 'success');
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
    showNotification(`Invoice #${newInvoice.invoiceNumber} created!`, 'success');
  };

  const deleteInvoice = async (id) => {
    const inv = invoices.find(i => i.id === id);
    if (inv && inv.items && inv.items.length > 0) {
      restoreStockForInvoice(inv.items);
    }
    setInvoices(invoices.filter(i => i.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('invoices').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete invoice error:', e);
      setCloudSyncStatus('error');
    }
    showNotification(`Invoice #${inv?.invoiceNumber || ''} deleted.`, 'info');
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
        showNotification(`Installment plan updated for ${i.invoiceNumber}`, 'success');
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
        showNotification(`Invoice #${updated.invoiceNumber || ''} updated!`, 'success');
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
        showNotification(`Invoice #${i.invoiceNumber} marked as ${status}!`, 'success');

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
    showNotification(`Quotation #${newQuote.quoteNumber} created!`, 'success');
  };

  const deleteQuote = async (id) => {
    const q = quotes.find(item => item.id === id);
    setQuotes(quotes.filter(q => q.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('quotations').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete quote error:', e);
      setCloudSyncStatus('error');
    }
    showNotification(`Quotation #${q?.quoteNumber || ''} deleted.`, 'info');
  };

  const updateQuote = (id, updatedData) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        const updated = { ...q, ...updatedData };
        syncQuoteToSupabase(updated);
        showNotification(`Quotation #${updated.quoteNumber || ''} updated!`, 'success');
        return updated;
      }
      return q;
    }));
  };

  const updateQuoteStatus = async (id, status) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    
    // Cloud Sync
    try {
      setCloudSyncStatus('syncing');
      const { error } = await supabase.from('quotations').update({ status }).eq('id', toUuid(id));
      if (error) {
        console.warn('[Supabase Sync] Quote Status Error:', error.message);
        setCloudSyncStatus('error');
        showNotification('Could not update status in cloud.', 'error');
        return;
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (e) {
      console.warn('[Supabase Sync] Quote Status Exception:', e.message);
      setCloudSyncStatus('error');
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
    showNotification(`Lead "${lead.gymName || lead.prospectName || 'Lead'}" added!`, 'success');
  };
  const updateLead = (id, data) => {
    setLeads(prev => prev.map(l => {
        if (l.id === id) {
            const updated = { ...l, ...data };
            syncLeadToSupabase(updated);
            showNotification(`Lead "${updated.gymName || 'Lead'}" updated!`, 'success');
            return updated;
        }
        return l;
    }));
  };
  const deleteLead = async (id) => {
    const target = leads.find(l => l.id === id);
    setLeads(leads.filter(l => l.id !== id));
    try {
      setCloudSyncStatus('syncing');
      await supabase.from('leads').delete().eq('id', toUuid(id));
      setCloudSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('[Supabase Sync] Delete lead error:', e);
      setCloudSyncStatus('error');
    }
    showNotification(`Lead "${target?.gymName || 'Lead'}" removed.`, 'info');
  };

  // --- PROCUREMENT & SUPPLIER MANAGEMENT CRUD ---
  const addSupplier = (supplierData) => {
    const newSup = { ...supplierData, id: `sup-${Date.now()}`, status: 'Active' };
    setSuppliers(prev => [newSup, ...prev]);
    showNotification(`Supplier "${newSup.name}" added!`, 'success');
  };

  const updateSupplier = (id, data) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    showNotification('Supplier details updated!', 'success');
  };

  const deleteSupplier = (id) => {
    const target = suppliers.find(s => s.id === id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    showNotification(`Supplier "${target?.name || ''}" removed.`, 'info');
  };

  const fulfillPurchaseOrderItems = (po) => {
    // 1. Auto-replenish stock for ordered items
    if (po.items && Array.isArray(po.items)) {
      setInventory(prevInventory => {
        return prevInventory.map(invItem => {
          const match = po.items.find(pi => pi.name && pi.name.toLowerCase() === invItem.name.toLowerCase());
          if (match) {
            const addedStock = Number(match.quantity || 1);
            const newStock = (Number(invItem.stock) || 0) + addedStock;
            addLog('Inventory', `Stock replenished via PO ${po.poNumber}: ${invItem.name} (+${addedStock} units). New Stock: ${newStock}`);
            return { ...invItem, stock: newStock };
          }
          return invItem;
        });
      });
    }

    // 2. Auto-post Accounts Payable (AP) Journal Voucher (Debit: 1200 Inventory Asset, Credit: 2010 Accounts Payable)
    try {
      createJournalEntry({
        date: new Date().toISOString().split('T')[0],
        reference: po.poNumber,
        description: `Goods Received PO #${po.poNumber} from ${po.supplierName}`,
        lines: [
          { accountId: '1200', debit: Number(po.totalAmount) || 0, credit: 0 },
          { accountId: '2010', debit: 0, credit: Number(po.totalAmount) || 0 }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for PO]', err);
    }
  };

  const addPurchaseOrder = (poData) => {
    const newPO = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber: poData.poNumber || `PO-${1000 + purchaseOrders.length + 1}`,
      status: poData.status || 'Ordered',
      date: poData.date || new Date().toISOString().split('T')[0]
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    addLog('Procurement', `Issued Purchase Order ${newPO.poNumber} to ${newPO.supplierName}`);
    showNotification(`Purchase Order #${newPO.poNumber} created!`, 'success');

    if (newPO.status === 'Received') {
      fulfillPurchaseOrderItems(newPO);
    }
  };

  const updatePurchaseOrderStatus = (id, newStatus) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === id) {
        const oldStatus = po.status;
        const updated = { ...po, status: newStatus };
        
        if (newStatus === 'Received' && oldStatus !== 'Received') {
          fulfillPurchaseOrderItems(updated);
          showNotification(`PO #${po.poNumber} received! Stock replenished & Accounts Payable updated.`, 'success');
        } else {
          showNotification(`PO #${po.poNumber} status changed to ${newStatus}`, 'info');
        }
        return updated;
      }
      return po;
    }));
  };

  const deletePurchaseOrder = (id) => {
    const po = purchaseOrders.find(p => p.id === id);
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
    showNotification(`Purchase Order #${po?.poNumber || ''} deleted.`, 'info');
  };

  // --- HR & PAYROLL ERP CRUD HANDLERS ---
  const addEmployee = (empData) => {
    const newEmp = {
      ...empData,
      id: `emp-${Date.now()}`,
      employeeId: empData.employeeId || `EMP-${100 + employees.length + 1}`,
      status: empData.status || 'Active',
      basicSalary: Number(empData.basicSalary) || 0,
      allowance: Number(empData.allowance) || 0,
      foodAllowance: Number(empData.foodAllowance) || 0,
      transportAllowance: Number(empData.transportAllowance) || 0,
      leaveBalances: empData.leaveBalances || { annual: 14, casual: 7, medical: 7 }
    };
    setEmployees(prev => [newEmp, ...prev]);
    showNotification(`Employee "${newEmp.name}" registered successfully!`, 'success');
  };

  const updateEmployee = (id, data) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    showNotification('Employee details updated!', 'success');
  };

  const deleteEmployee = (id) => {
    const target = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    showNotification(`Employee "${target?.name || ''}" removed.`, 'info');
  };

  const processPayrun = ({ month, payrunDate, employeeCalculations }) => {
    const totalGross = employeeCalculations.reduce((s, c) => s + (Number(c.grossSalary) || 0), 0);
    const totalNet = employeeCalculations.reduce((s, c) => s + (Number(c.netSalary) || 0), 0);
    const totalEpfEmployer = employeeCalculations.reduce((s, c) => s + (Number(c.epfEmployer) || 0), 0);
    const totalEtfEmployer = employeeCalculations.reduce((s, c) => s + (Number(c.etfEmployer) || 0), 0);

    const newPayrun = {
      id: `pr-${Date.now()}`,
      month,
      payrunDate: payrunDate || new Date().toISOString().split('T')[0],
      totalGross,
      totalNet,
      totalEpfEmployer,
      totalEtfEmployer,
      status: 'Processed',
      slipsCount: employeeCalculations.length,
      details: employeeCalculations
    };

    setPayruns(prev => [newPayrun, ...prev]);

    // Automatically mark all deducted salary advances as Recovered
    const allAdvanceIds = employeeCalculations.flatMap(c => c.advanceIds || []).filter(Boolean);
    if (allAdvanceIds.length > 0) {
      setSalaryAdvances(prev => prev.map(a => 
        allAdvanceIds.includes(a.id) ? { ...a, status: 'Recovered', deductedInMonth: month } : a
      ));
    }

    // Auto-post Payroll Expense to Journal (Debit: 5020 Staff Salaries, Credit: 1020 Bank Account)
    try {
      createJournalEntry({
        date: payrunDate || new Date().toISOString().split('T')[0],
        reference: `PAYROLL-${month}`,
        description: `Monthly Staff Salary Payrun for ${month}`,
        lines: [
          { accountId: '5020', debit: totalGross, credit: 0 },
          { accountId: '1020', debit: 0, credit: totalGross }
        ]
      });
    } catch (err) {
      console.warn('[Payroll Journal Post Warning]', err);
    }

    addLog('HR & Payroll', `Processed Monthly Payroll for ${month} (${employeeCalculations.length} staff slips, Total Net: LKR ${totalNet.toLocaleString()})`);
    showNotification(`Payroll Payrun for ${month} processed successfully!`, 'success');
  };

  const updateFeatureToggle = (featureKey, enabled) => {
    setFeatureToggles(prev => {
      const updated = { ...prev, [featureKey]: enabled };
      showNotification(`Module "${featureKey}" ${enabled ? 'Enabled' : 'Disabled'}!`, enabled ? 'success' : 'info');
      return updated;
    });
  };

  const applyPlanPreset = (planName) => {
    let preset = {};
    if (planName === 'starter') {
      preset = {
        tasks: true, quotations: true, debtors: true,
        leads: false, inventory: false, procurement: false,
        hrPayroll: false, expenses: false, fixedAssets: false,
        ledger: false, smsPortal: false
      };
    } else if (planName === 'professional') {
      preset = {
        tasks: true, quotations: true, debtors: true,
        leads: true, inventory: true, procurement: true,
        hrPayroll: true, expenses: true, fixedAssets: false,
        ledger: false, smsPortal: true
      };
    } else if (planName === 'enterprise') {
      preset = {
        tasks: true, quotations: true, debtors: true,
        leads: true, inventory: true, procurement: true,
        hrPayroll: true, expenses: true, fixedAssets: true,
        ledger: true, smsPortal: true
      };
    } else if (planName === 'enable_all') {
      preset = {
        tasks: true, quotations: true, debtors: true,
        leads: true, inventory: true, procurement: true,
        hrPayroll: true, expenses: true, fixedAssets: true,
        ledger: true, smsPortal: true
      };
    } else if (planName === 'disable_all') {
      preset = {
        tasks: false, quotations: false, debtors: false,
        leads: false, inventory: false, procurement: false,
        hrPayroll: false, expenses: false, fixedAssets: false,
        ledger: false, smsPortal: false
      };
    }

    setFeatureToggles(preset);
    localStorage.setItem('gym_feature_toggles', JSON.stringify(preset));
    showNotification(`Applied ${planName.toUpperCase().replace('_', ' ')} Plan Feature Preset!`, 'success');
  };

  const selectPlan = (planId) => {
    if (!PLAN_CONFIGS[planId]) return;
    setCurrentPlan(planId);
    localStorage.setItem('gym_current_plan', planId);
    applyPlanPreset(planId);
    showNotification(`Switched subscription plan to ${PLAN_CONFIGS[planId].name}!`, 'success');
  };

  const checkPlanLimit = (limitType) => {
    const config = PLAN_CONFIGS[currentPlan] || PLAN_CONFIGS.enterprise;
    let currentCount = 0;
    let maxLimit = config[limitType] !== undefined ? config[limitType] : Infinity;

    if (limitType === 'maxCustomers') currentCount = (customers || []).length;
    else if (limitType === 'maxUsers') currentCount = (teamMembers || []).length;
    else if (limitType === 'maxBranches') currentCount = 1;
    else if (limitType === 'maxQuotations') currentCount = (quotations || []).length;
    else if (limitType === 'maxSmsCredits') currentCount = smsConfig?.balance || 0;

    const allowed = currentCount < maxLimit;
    return {
      allowed,
      currentCount,
      maxLimit,
      planName: config.name,
      message: allowed ? null : `Limit Reached: ${config.name} allows up to ${maxLimit} ${limitType.replace('max', '')}. Please upgrade your plan!`
    };
  };

  const markAttendance = (records) => {
    setAttendanceLogs(prev => {
      let updated = [...prev];
      records.forEach(rec => {
        const existingIdx = updated.findIndex(a => a.employeeId === rec.employeeId && a.date === rec.date);
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...rec };
        } else {
          updated.unshift({ id: `att-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, ...rec });
        }
      });
      return updated;
    });
    showNotification('Daily staff attendance logged successfully!', 'success');
  };

  const getMonthlyAttendanceSummary = (employeeId, monthStr) => {
    const logs = attendanceLogs.filter(a => a.employeeId === employeeId && a.date?.startsWith(monthStr));
    const present = logs.filter(a => a.status === 'Present').length;
    const absent = logs.filter(a => a.status === 'Absent').length;
    const halfDay = logs.filter(a => a.status === 'Half Day').length;
    const leave = logs.filter(a => a.status === 'On Leave').length;
    const otHours = logs.reduce((sum, a) => sum + (Number(a.otHours) || 0), 0);

    return {
      totalLogged: logs.length,
      present,
      absent,
      halfDay,
      leave,
      otHours
    };
  };

  const addLeaveRequest = (leaveData) => {
    const newReq = {
      ...leaveData,
      id: `leave-${Date.now()}`,
      status: leaveData.status || 'Pending'
    };
    setLeaveRequests(prev => [newReq, ...prev]);
    showNotification(`Leave request logged for ${newReq.employeeName}!`, 'success');
  };

  const updateLeaveStatus = (id, status) => {
    setLeaveRequests(prev => prev.map(l => {
      if (l.id !== id) return l;
      return { ...l, status, reviewedAt: new Date().toISOString() };
    }));
    showNotification(`Leave request status updated to ${status}!`, status === 'Approved' ? 'success' : 'info');
  };

  const deleteLeaveRequest = (id) => {
    setLeaveRequests(prev => prev.filter(l => l.id !== id));
    showNotification('Leave request deleted.', 'info');
  };

  // Terminate / Resign an employee - marks status as Resigned and records date
  const terminateEmployee = (id, reason = 'Resigned', terminationDate = null) => {
    const target = employees.find(e => e.id === id);
    const date = terminationDate || new Date().toISOString().split('T')[0];
    setEmployees(prev => prev.map(e => e.id === id ? {
      ...e,
      status: reason,
      terminationDate: date,
      terminationReason: reason
    } : e));
    addLog('HR & Payroll', `Employee "${target?.name || 'Unknown'}" marked as ${reason} effective ${date}.`);
    showNotification(`${target?.name || 'Employee'} has been marked as ${reason}.`, 'info');
  };

  const addSalaryAdvance = (advData) => {
    const newAdv = {
      ...advData,
      id: `adv-${Date.now()}`,
      status: 'Issued',
      amount: Number(advData.amount) || 0,
      requestDate: advData.requestDate || new Date().toISOString().split('T')[0]
    };
    setSalaryAdvances(prev => [newAdv, ...prev]);

    // Auto-post Advance to General Ledger
    try {
      createJournalEntry({
        date: newAdv.requestDate,
        reference: `ADV-${newAdv.employeeName}`,
        description: `Salary Advance issued to ${newAdv.employeeName}`,
        lines: [
          { accountId: '1100', debit: newAdv.amount, credit: 0 },
          { accountId: '1020', debit: 0, credit: newAdv.amount }
        ]
      });
    } catch (err) {
      console.warn('[Salary Advance Journal Entry Failed]', err);
    }

    showNotification(`Salary advance of LKR ${newAdv.amount.toLocaleString()} issued to ${newAdv.employeeName}!`, 'success');
  };

  const deleteSalaryAdvance = (id) => {
    setSalaryAdvances(prev => prev.filter(a => a.id !== id));
    showNotification('Salary advance entry deleted.', 'info');
  };

  const getEmployeeLeaveBalance = (employeeId) => {
    const currentYear = new Date().getFullYear().toString();
    const empApprovedLeaves = leaveRequests.filter(l => 
      l.employeeId === employeeId && 
      l.status === 'Approved' && 
      (l.startDate?.startsWith(currentYear) || !l.startDate)
    );

    const annualUsed = empApprovedLeaves
      .filter(l => l.leaveType === 'Annual Leave')
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);
    const casualUsed = empApprovedLeaves
      .filter(l => l.leaveType === 'Casual Leave')
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);
    const medicalUsed = empApprovedLeaves
      .filter(l => l.leaveType === 'Medical Leave')
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);

    const emp = employees.find(e => e.id === employeeId);
    const totalAnnual = emp?.leaveBalances?.annual ?? 14;
    const totalCasual = emp?.leaveBalances?.casual ?? 7;
    const totalMedical = emp?.leaveBalances?.medical ?? 7;

    return {
      annual: { total: totalAnnual, used: annualUsed, remaining: Math.max(0, totalAnnual - annualUsed) },
      casual: { total: totalCasual, used: casualUsed, remaining: Math.max(0, totalCasual - casualUsed) },
      medical: { total: totalMedical, used: medicalUsed, remaining: Math.max(0, totalMedical - medicalUsed) }
    };
  };

  const addHrLetter = (letterData) => {
    const newLetter = {
      ...letterData,
      id: `let-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setHrLetters(prev => [newLetter, ...prev]);
    showNotification(`Generated ${newLetter.title || 'HR Document'} successfully!`, 'success');
    return newLetter;
  };

  const deleteHrLetter = (id) => {
    setHrLetters(prev => prev.filter(l => l.id !== id));
    showNotification('Document record removed.', 'info');
  };

  // --- MULTI-BRANCH STOCK TRANSFERS ---
  const addStockTransfer = (transferData) => {
    const newST = {
      ...transferData,
      id: `st-${Date.now()}`,
      transferNumber: transferData.transferNumber || `STO-${1000 + stockTransfers.length + 1}`,
      status: transferData.status || 'Requested',
      requestDate: transferData.requestDate || new Date().toISOString().split('T')[0]
    };
    setStockTransfers(prev => [newST, ...prev]);
    showNotification(`Stock Transfer Order #${newST.transferNumber} created!`, 'success');
  };

  const updateStockTransferStatus = (id, status) => {
    setStockTransfers(prev => prev.map(st => {
      if (st.id === id) {
        if (status === 'Received' && st.status !== 'Received') {
          showNotification(`Stock Transfer #${st.transferNumber} marked Received at destination branch!`, 'success');
        }
        return { ...st, status };
      }
      return st;
    }));
  };

  const deleteStockTransfer = (id) => {
    setStockTransfers(prev => prev.filter(st => st.id !== id));
    showNotification('Stock transfer order deleted.', 'info');
  };

  // --- AUTOMATED MEMBERSHIP AUTO-INVOICING RENEWAL ENGINE ---
  const generateRecurringInvoices = () => {
    let generatedCount = 0;
    const activeClients = customers.filter(c => c.status === 'Active' || c.status === 'Overdue');

    activeClients.forEach(client => {
      const annualVal = Number(client.annualValue) || 120000;
      const monthlyVal = Math.round(annualVal / 12);
      const invNum = `INV-REC-${Math.floor(1000 + Math.random() * 9000)}`;

      addInvoice({
        invoiceNumber: invNum,
        prospectName: client.gymName,
        billingCycle: 'Monthly Recurring',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        totalAmount: monthlyVal,
        status: 'Unpaid',
        items: [
          { name: `Monthly Gym Management System Subscription (${client.packageName || 'Pro Plan'})`, amount: monthlyVal }
        ]
      });

      if (client.phone) {
        try {
          triggerSMS && triggerSMS('payment_due', client, { invoiceNumber: invNum, totalAmount: monthlyVal, dueDate: '14 days' });
        } catch (e) {
          console.warn('[SMS Trigger Error]', e);
        }
      }

      generatedCount++;
    });

    addLog('Invoicing', `Executed Auto-Renewal Engine: Generated ${generatedCount} recurring invoices.`);
    showNotification(`Auto-Renewal Engine complete: ${generatedCount} recurring invoices generated!`, 'success');
  };

  // --- HR PERFORMANCE APPRAISALS ---
  const addPerformanceReview = (reviewData) => {
    const p = Number(reviewData.punctualityRating) || 5;
    const t = Number(reviewData.trainingQualityRating) || 5;
    const c = Number(reviewData.clientEngagementRating) || 5;
    const w = Number(reviewData.teamworkRating) || 5;
    const overallScore = Math.round(((p + t + c + w) / 4) * 10) / 10;

    const newRev = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      overallScore,
      reviewDate: reviewData.reviewDate || new Date().toISOString().split('T')[0]
    };

    setPerformanceReviews(prev => [newRev, ...prev]);
    showNotification(`Performance Appraisal logged for ${newRev.employeeName} (Score: ${overallScore}/5)!`, 'success');
  };

  const deletePerformanceReview = (id) => {
    setPerformanceReviews(prev => prev.filter(r => r.id !== id));
    showNotification('Performance review deleted.', 'info');
  };

  // --- HR STAFF EXPENSE CLAIMS & REIMBURSEMENTS ---
  const addExpenseClaim = (claimData) => {
    const newClaim = {
      ...claimData,
      id: `claim-${Date.now()}`,
      status: 'Pending',
      amount: Number(claimData.amount) || 0,
      claimDate: claimData.claimDate || new Date().toISOString().split('T')[0]
    };

    setExpenseClaims(prev => [newClaim, ...prev]);
    showNotification(`Expense claim of LKR ${newClaim.amount.toLocaleString()} submitted by ${newClaim.employeeName}!`, 'success');
  };

  const updateExpenseClaimStatus = (id, status) => {
    setExpenseClaims(prev => prev.map(cl => {
      if (cl.id === id) {
        if (status === 'Approved' && cl.status !== 'Approved') {
          try {
            createJournalEntry({
              date: new Date().toISOString().split('T')[0],
              reference: `REIMB-${cl.employeeName}`,
              description: `Staff Expense Reimbursement to ${cl.employeeName}: ${cl.description}`,
              lines: [
                { accountId: '5010', debit: cl.amount, credit: 0 },
                { accountId: '1020', debit: 0, credit: cl.amount }
              ]
            });
          } catch (err) {
            console.warn('[Staff Reimbursement Journal Error]', err);
          }
        }
        return { 
          ...cl, 
          status,
          disbursedDate: status === 'Approved' ? new Date().toISOString().split('T')[0] : cl.disbursedDate
        };
      }
      return cl;
    }));
    showNotification(`Expense claim ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'info');
  };

  const deleteExpenseClaim = (id) => {
    setExpenseClaims(prev => prev.filter(c => c.id !== id));
    showNotification('Expense claim deleted.', 'info');
  };

  // --- FIXED ASSETS DEPRECIATION RUN ENGINE ---
  const runFixedAssetDepreciation = () => {
    if (fixedAssets.length === 0) {
      showNotification('No fixed assets registered to depreciate.', 'info');
      return;
    }

    let totalMonthlyDep = 0;
    fixedAssets.forEach(fa => {
      const cost = Number(fa.costPrice || fa.purchaseCost) || 0;
      const usefulYears = Number(fa.usefulLifeYears) || 5;
      const salvage = Number(fa.salvageValue) || 0;
      const monthlyDep = Math.round(Math.max(0, (cost - salvage) / (usefulYears * 12)));
      totalMonthlyDep += monthlyDep;
    });

    if (totalMonthlyDep > 0) {
      try {
        createJournalEntry({
          date: new Date().toISOString().split('T')[0],
          reference: `DEP-RUN-${new Date().toISOString().slice(0,7)}`,
          description: `Monthly Fixed Assets Depreciation Run (${fixedAssets.length} assets)`,
          lines: [
            { accountId: '5040', debit: totalMonthlyDep, credit: 0 },
            { accountId: '1590', debit: 0, credit: totalMonthlyDep }
          ]
        });
      } catch (err) {
        console.warn('[Depreciation Run Journal Error]', err);
      }
    }

    showNotification(`Monthly Fixed Asset Depreciation of LKR ${totalMonthlyDep.toLocaleString()} posted to Ledger!`, 'success');
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
    const updated = typeof newConfig === 'function' ? newConfig(smsConfig) : newConfig;
    setSmsConfig(updated);
    try {
      localStorage.setItem('gym_sms_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save gym_sms_config to localStorage', e);
    }
    syncConfigToSupabase(updated);
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

  // Global Modern Confirmation Modal System
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: null
  });

  const confirmAction = ({ title, message, confirmText = 'Delete', cancelText = 'Cancel', variant = 'danger', onConfirm }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
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
      createJournalEntry, addAccount, updateAccount, deleteAccount, deleteJournalEntry, getInvoicePaymentSummary, processMonthlyDepreciation,
      activityLogs, addLog, recordAuditLog, clearActivityLogs,
      addCustomerNote,
      deleteInvoice, deleteQuote,
      smsConfig, updateSmsConfig, fetchSmsBalance, triggerSMS, sendDirectSMS, sendBulkSMSArray, handleTestSms,
      teamMembers, addTeamMember, updateTeamMember, updateTeamMemberRole, toggleTeamMemberStatus, deleteTeamMember, resetUserPassword,
      customRoles, addCustomRole, updateCustomRole, duplicateCustomRole, deleteCustomRole,
      theme, toggleTheme,
      notification, showNotification,
      systemNotifications, markNotificationsRead,
      resetToSeynexDefaults, seedDummyData,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      purchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder,
      employees, addEmployee, updateEmployee, deleteEmployee, terminateEmployee,
      payruns, processPayrun,
      attendanceLogs, markAttendance, getMonthlyAttendanceSummary,
      leaveRequests, addLeaveRequest, updateLeaveStatus, deleteLeaveRequest, getEmployeeLeaveBalance,
      salaryAdvances, addSalaryAdvance, deleteSalaryAdvance,
      hrLetters, addHrLetter, deleteHrLetter,
      stockTransfers, addStockTransfer, updateStockTransferStatus, deleteStockTransfer,
      generateRecurringInvoices,
      performanceReviews, addPerformanceReview, deletePerformanceReview,
      expenseClaims, addExpenseClaim, updateExpenseClaimStatus, deleteExpenseClaim,
      runFixedAssetDepreciation,
      featureToggles, updateFeatureToggle, applyPlanPreset,
      currentPlan, selectPlan, checkPlanLimit, PLAN_CONFIGS,
      isStoreLoading,
      cloudSyncStatus, lastSyncTime, fetchCloudData, syncAllToCloud,
      hasUnsavedChanges, setHasUnsavedChanges,
      resetEverythingWithConfirmation, executeResetEverything,
      confirmAction
    }}>
      {children}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onClose={closeConfirm}
      />
    </StoreContext.Provider>
  );
}
