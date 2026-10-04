import React, { createContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase, getSupabaseClient, getBusinessDbConfig, saveBusinessDbConfig, testDatabaseConnection } from '../lib/supabase';
import { useAuth } from './AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { sendNotification } from '../utils/notificationService';

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

export const DEFAULT_APP_TEAM_MEMBERS = [
  // Seynex Enterprises (biz_main)
  {
    id: '76bb4580-2006-464f-aab8-64029dbe9540',
    name: 'Seynex Administrator',
    email: 'admin@seynex.lk',
    role: 'Admin',
    status: 'Active',
    password: 'seynex2026',
    businessId: 'biz_main',
    department: 'Executive',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'e2a87062-8e1e-4509-91a5-e362fa91901a',
    name: 'Seynex Sales Executive',
    email: 'sales@seynex.lk',
    role: 'Sales Representative',
    status: 'Active',
    password: 'seynex2026',
    businessId: 'biz_main',
    department: 'Enterprise Sales',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'b4317154-8c88-4660-84cf-cb864b22b7a9',
    name: 'Seynex Senior Accountant',
    email: 'accounts@seynex.lk',
    role: 'Accountant',
    status: 'Active',
    password: 'seynex2026',
    businessId: 'biz_main',
    department: 'Finance & Compliance',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  // Royal Hair Pin Industries (biz_hairpins)
  {
    id: 'hairpins-admin-01',
    name: 'Royal Hair Pins Admin',
    email: 'admin@royalhairpins.lk',
    role: 'Admin',
    status: 'Active',
    password: 'hairpins2026',
    businessId: 'biz_hairpins',
    department: 'Plant Management',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'hairpins-sales-01',
    name: 'Wholesale Sales Manager',
    email: 'sales@royalhairpins.lk',
    role: 'Sales Representative',
    status: 'Active',
    password: 'hairpins2026',
    businessId: 'biz_hairpins',
    department: 'Wholesale & Distribution',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'hairpins-acc-01',
    name: 'Factory Accounts Lead',
    email: 'accounts@royalhairpins.lk',
    role: 'Accountant',
    status: 'Active',
    password: 'hairpins2026',
    businessId: 'biz_hairpins',
    department: 'Factory Accounts',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  // Universal / Legacy fallbacks
  {
    id: 'legacy-admin-01',
    name: 'System Administrator',
    email: 'admin@company.com',
    role: 'Admin',
    status: 'Active',
    password: 'adminpassword123',
    businessId: 'biz_main',
    department: 'Executive',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'legacy-sales-01',
    name: 'Sales Executive',
    email: 'sales@company.com',
    role: 'Sales Representative',
    status: 'Active',
    password: 'salespassword123',
    businessId: 'biz_main',
    department: 'Sales',
    addedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'legacy-acc-01',
    name: 'Senior Accountant',
    email: 'accounts@company.com',
    role: 'Accountant',
    status: 'Active',
    password: 'accountspassword123',
    businessId: 'biz_main',
    department: 'Finance',
    addedAt: '2025-01-01T00:00:00.000Z'
  }
];

// Bulletproof Sequential Numbering Helpers (guarantees zero duplicate invoice/quote numbers)
export const getNextSequentialInvoiceNumber = (invoices = [], config = {}) => {
  const prefix = config.invoicePrefix || 'INV-';
  const configuredStart = parseInt(config.nextInvoiceNumber || 1001, 10);
  
  let highestNum = configuredStart - 1;
  (invoices || []).forEach(inv => {
    const raw = String(inv.invoiceNumber || inv.invoice_number || '').trim();
    const match = raw.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > highestNum) {
        highestNum = n;
      }
    }
  });
  
  const nextNum = Math.max(configuredStart, highestNum + 1);
  return {
    nextNumber: nextNum,
    formattedNumber: `${prefix}${nextNum}`
  };
};

export const getNextSequentialQuoteNumber = (quotes = [], config = {}) => {
  const prefix = config.quotePrefix || 'QT-';
  const configuredStart = parseInt(config.nextQuoteNumber || 1001, 10);
  
  let highestNum = configuredStart - 1;
  (quotes || []).forEach(q => {
    const raw = String(q.quoteNumber || q.quote_number || '').trim();
    const match = raw.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > highestNum) {
        highestNum = n;
      }
    }
  });
  
  const nextNum = Math.max(configuredStart, highestNum + 1);
  return {
    nextNumber: nextNum,
    formattedNumber: `${prefix}${nextNum}`
  };
};

export default function StoreContextProvider({ children }) {
  const { user } = useAuth();
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    try { return localStorage.getItem('gym_last_sync_time') || null; } catch(e) { return null; }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
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

  // Initialize sample dummy data for Hair Pin Manufacturing & Wholesale
  const sampleCustomers = [
    { id: 'c-101', gymName: 'Lanka Fancy Center (Wholesale Pettah)', name: 'M. Farook', email: 'farook@lankafancy.lk', phone: '0772345678', dob: '1982-04-12', purchaseDate: '2025-01-15', renewalDate: '2026-08-15', annualFee: 450000, status: 'Active', tag: 'Wholesale Distributor', notes: [{ id: 'n1', text: 'Buys 15-20 cartons bobby pins monthly', timestamp: new Date().toISOString() }] },
    { id: 'c-102', gymName: 'Queens Bridal & Beauty Salon', name: 'Nilmini Perera', email: 'nilmini@queensbridal.lk', phone: '0718765432', dob: '1990-09-20', purchaseDate: '2025-02-10', renewalDate: '2026-08-20', annualFee: 320000, status: 'Active', tag: 'Beauty Salon Chain', notes: [] },
    { id: 'c-103', gymName: 'Sunil Cosmetics & Novelty Stores', name: 'Sunil Gamage', email: 'sunil@sunilcosmetics.lk', phone: '0765432109', dob: '1985-11-05', purchaseDate: '2025-03-01', renewalDate: '2026-07-01', annualFee: 600000, status: 'Active', tag: 'Retail Fancy Shop', notes: [] },
    { id: 'c-104', gymName: 'New Fashion Corner Kurunegala', name: 'K. Bandara', email: 'bandara@newfashion.lk', phone: '0754321098', dob: '1988-06-18', purchaseDate: '2025-04-12', renewalDate: '2026-09-12', annualFee: 280000, status: 'Active', tag: 'Retail & Wholesale', notes: [] },
    { id: 'c-105', gymName: 'Salon Chamari Hair Care', name: 'Chamari Silva', email: 'chamari@salonchamari.lk', phone: '0703210987', dob: '1993-02-28', purchaseDate: '2025-05-20', renewalDate: '2026-10-20', annualFee: 190000, status: 'Pending', tag: 'Salon Customer', notes: [] }
  ];

  const sampleInventory = [
    { id: 'inv-101', name: 'Classic Black Bobby Pins (Box of 50 Pkts)', type: 'Bobby Pins', price: 250, costPrice: 140, stock: 450, reorderLevel: 50, desc: 'High-tensile tempered steel bobby pins with protective ball tips' },
    { id: 'inv-102', name: 'Golden Wave Hair Grips (Card of 24 pcs)', type: 'Wave Grips', price: 320, costPrice: 180, stock: 320, reorderLevel: 40, desc: 'Anti-rust gold-tone wave contoured hair grip pins' },
    { id: 'inv-103', name: 'Salon Jumbo U-Pins (Box of 100 pcs - Black)', type: 'U-Pins', price: 450, costPrice: 260, stock: 280, reorderLevel: 30, desc: 'Professional salon grade 6.5cm hair updo U-pins' },
    { id: 'inv-104', name: 'Classic Snap Hair Clips 5cm (Card of 12 pcs)', type: 'Snap Clips', price: 380, costPrice: 210, stock: 550, reorderLevel: 60, desc: 'Durable spring-steel snap hair clips in black gloss finish' },
    { id: 'inv-105', name: 'Kids Colorful Pastel Snap Clips (Card of 10 pcs)', type: 'Kids Clips', price: 420, costPrice: 220, stock: 380, reorderLevel: 40, desc: 'Vibrant enamel coated hair clips with rounded safety corners' },
    { id: 'inv-106', name: 'Bridal Pearl & Crystal Fancy Hair Pins (Pack of 6)', type: 'Fancy Pins', price: 850, costPrice: 420, stock: 140, reorderLevel: 25, desc: 'Handcrafted wedding and bridal decorative pearl flower hair pins' },
    { id: 'inv-107', name: 'Wholesale Bulk Bobby Pins (1 Gross = 144 pins)', type: 'Wholesale Pack', price: 720, costPrice: 390, stock: 210, reorderLevel: 30, desc: 'Master wholesale 1-gross polybag pack for cosmetic shops' },
    { id: 'inv-108', name: 'Master Shipping Carton Bobby Pins (50 Gross)', type: 'Master Carton', price: 34000, costPrice: 19500, stock: 28, reorderLevel: 5, desc: 'Factory sealed master carton containing 7,200 hair pins' },
    { id: 'inv-109', name: 'Spring Steel Wire 1.0mm (25kg Spool)', type: 'Raw Material', price: 9800, costPrice: 8500, stock: 20, reorderLevel: 4, desc: 'Cold-drawn high-carbon spring steel wire for pin forming' },
    { id: 'inv-110', name: 'Rust-Proof Black Baking Enamel (5L Can)', type: 'Raw Material', price: 7500, costPrice: 6200, stock: 12, reorderLevel: 3, desc: 'Industrial thermosetting gloss black lacquer' },
    { id: 'inv-111', name: 'Printed Hair Pin Display Cards (Pack of 1,000)', type: 'Packaging', price: 3500, costPrice: 2800, stock: 45, reorderLevel: 10, desc: 'Custom printed 350gsm brand backing cards with euro slot' }
  ];

  const sampleLeads = [
    { 
      id: 'lead-1', 
      gymName: 'City Fancy Center Pettah', 
      contactPerson: 'M. Riaz', 
      name: 'M. Riaz', 
      phone: '0771122334', 
      email: 'riaz@cityfancy.lk', 
      location: 'Colombo 11', 
      status: 'Contacted', 
      value: 350000, 
      date: '2026-09-28T09:30:00.000Z',
      lastActionDate: '2026-10-01T14:30:00.000Z',
      nextActionDate: new Date().toISOString().split('T')[0], // Due Today!
      nextActionNote: 'Call back to finalize wholesale bulk discount on 30 boxes',
      comments: [
        {
          id: 'c-101',
          date: '2026-10-01T14:30:00.000Z',
          text: 'Spoke with Mr. Riaz. Very interested in our Classic Black Bobby Pins. Requested 5% volume rebate for 30 cartons order.',
          type: 'Call',
          nextActionDate: new Date().toISOString().split('T')[0],
          nextActionNote: 'Call back to finalize wholesale bulk discount on 30 boxes',
          author: 'Sales Executive'
        },
        {
          id: 'c-100',
          date: '2026-09-28T10:00:00.000Z',
          text: 'Initial outreach via WhatsApp. Sent product catalog and wholesale price list.',
          type: 'WhatsApp',
          nextActionDate: '2026-10-01',
          nextActionNote: 'Follow up on catalog delivery',
          author: 'Sales Executive'
        }
      ]
    },
    { 
      id: 'lead-2', 
      gymName: 'Salon Majestic & Bridal Wear Kandy', 
      contactPerson: 'S. Kumari', 
      name: 'S. Kumari', 
      phone: '0714455667', 
      email: 'kumari@majestic.lk', 
      location: 'Kandy', 
      status: 'Demo Scheduled', 
      value: 240000, 
      date: '2026-09-25T11:00:00.000Z',
      lastActionDate: '2026-09-30T16:00:00.000Z',
      nextActionDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // Upcoming in 3 days
      nextActionNote: 'Conduct on-site product presentation of Bridal Pearl Hair Pin series',
      comments: [
        {
          id: 'c-201',
          date: '2026-09-30T16:00:00.000Z',
          text: 'Confirmed demo date with Ms. Kumari for next Monday at 10 AM at Kandy branch. Preparing bridal samples kit.',
          type: 'Demo',
          nextActionDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          nextActionNote: 'Conduct on-site product presentation of Bridal Pearl Hair Pin series',
          author: 'Admin'
        }
      ]
    },
    { 
      id: 'lead-3', 
      gymName: 'Glamour Cosmetics Galle Fort', 
      contactPerson: 'Niluka Silva', 
      name: 'Niluka Silva', 
      phone: '0767788990', 
      email: 'niluka@glamour.lk', 
      location: 'Galle', 
      status: 'Interested', 
      value: 180000, 
      date: '2026-09-20T10:00:00.000Z',
      lastActionDate: '2026-09-28T11:15:00.000Z',
      nextActionDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // Overdue by 2 days!
      nextActionNote: 'Send sample display stand mockups and credit payment terms',
      comments: [
        {
          id: 'c-301',
          date: '2026-09-28T11:15:00.000Z',
          text: 'Meeting at shop. Wants counter display racks for snap clips. Overdue for follow-up on credit terms.',
          type: 'Meeting',
          nextActionDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          nextActionNote: 'Send sample display stand mockups and credit payment terms',
          author: 'Sales Executive'
        }
      ]
    }
  ];

  const sampleQuotes = [
    { id: 'q-101', shareKey: 'SNX-Q101', quoteNumber: 'QT-1001', date: '2026-07-20', prospectName: 'Lanka Fancy Center', prospectPhone: '0772345678', amount: 480000, status: 'Pending', items: [{ name: 'Wholesale Bobby Pins (20 Cartons)', qty: 20, unitPrice: 24000, amount: 480000 }] },
    { id: 'q-102', shareKey: 'SNX-Q102', quoteNumber: 'QT-1002', date: '2026-07-25', prospectName: 'Queens Bridal & Beauty Salon', prospectPhone: '0718765432', amount: 145000, status: 'Sent', sentAt: '2026-07-25T10:00:00Z', items: [{ name: 'Salon Jumbo U-Pins + Pearl Bridal Sets', qty: 100, unitPrice: 1450, amount: 145000 }] }
  ];

  const sampleInvoices = [
    { id: 'inv-201', shareKey: 'SNX-INV201', invoiceNumber: 'INV-1001', date: '2026-06-01', dueDate: '2026-06-15', customerId: 'c-101', prospectName: 'Lanka Fancy Center', amount: 450000, status: 'Paid', items: [{ name: 'Classic Black Bobby Pins (15 Master Cartons)', qty: 15, unitPrice: 30000, amount: 450000 }], reminderSent: true },
    { id: 'inv-202', shareKey: 'SNX-INV202', invoiceNumber: 'INV-1002', date: '2026-06-10', dueDate: '2026-06-25', customerId: 'c-102', prospectName: 'Queens Bridal & Beauty Salon', amount: 145000, status: 'Paid', items: [{ name: 'Salon Jumbo U-Pins & Pearl Hair Pins Package', qty: 1, unitPrice: 145000, amount: 145000 }], reminderSent: true },
    { id: 'inv-203', shareKey: 'SNX-INV203', invoiceNumber: 'INV-1003', date: '2026-07-01', dueDate: '2026-07-15', customerId: 'c-103', prospectName: 'Sunil Cosmetics & Novelty Stores', amount: 280000, status: 'Overdue', items: [{ name: 'Wholesale Bobby Pins & Snap Clips Assortment', qty: 1, unitPrice: 280000, amount: 280000 }], reminderSent: false },
    { id: 'inv-204', shareKey: 'SNX-INV204', invoiceNumber: 'INV-1004', date: '2026-08-01', dueDate: '2026-08-25', customerId: 'c-104', prospectName: 'New Fashion Corner Kurunegala', amount: 195000, status: 'Sent', items: [{ name: 'Kids Snap Clips & Golden Wave Grips Pack', qty: 1, unitPrice: 195000, amount: 195000 }], reminderSent: false }
  ];

  const sampleExpenses = [
    { id: 'exp-1', category: 'Operational', amount: 55000, date: '2026-07-05', description: 'Factory 3-Phase Machine Power & Electricity Bill' },
    { id: 'exp-2', category: 'Operational', amount: 32000, date: '2026-07-10', description: 'Forming Machine Hydraulic Oil & Cutter Tool Sharpening' },
    { id: 'exp-3', category: 'Staff', amount: 145000, date: '2026-07-28', description: 'Workshop Machine Operators & Packing Piece-Rate Wages' },
    { id: 'exp-4', category: 'Administrative', amount: 48000, date: '2026-08-01', description: 'Wholesale Delivery Van Diesel Fuel & Maintenance' }
  ];

  const sampleFixedAssets = [
    { id: 'fa-1', assetCode: 'FA-1001', name: 'Automatic Wire Bending & Pin Forming Machine (HP-2024)', category: 'Production Machinery', purchaseDate: '2025-01-10', purchaseCost: 1850000, usefulLifeYears: 8, salvageValue: 200000, depreciationMethod: 'Straight Line (SLM)', location: 'Factory Line 1', status: 'Active' },
    { id: 'fa-2', assetCode: 'FA-1002', name: 'High-Temperature Enamel Baking & Curing Conveyor Oven', category: 'Production Machinery', purchaseDate: '2025-03-15', purchaseCost: 950000, usefulLifeYears: 10, salvageValue: 100000, depreciationMethod: 'Straight Line (SLM)', location: 'Baking Cell', status: 'Active' },
    { id: 'fa-3', assetCode: 'FA-1003', name: 'Card Mounting & Shrink Packaging Sealer', category: 'Packaging Equipment', purchaseDate: '2025-05-20', purchaseCost: 580000, usefulLifeYears: 6, salvageValue: 50000, depreciationMethod: 'Straight Line (SLM)', location: 'Packaging Bay', status: 'Active' }
  ];

  const sampleJournalEntries = [
    { id: 'je-1', date: '2026-01-01', reference: 'GEN-001', description: 'Initial Manufacturing Capital Contribution', createdBy: 'Admin', timestamp: new Date('2026-01-01').toISOString() },
    { id: 'je-2', date: '2026-06-01', reference: 'GEN-002', description: 'Lanka Fancy Center INV-1001 Payment Received', createdBy: 'System', timestamp: new Date('2026-06-01').toISOString() },
    { id: 'je-3', date: '2026-06-10', reference: 'GEN-003', description: 'Queens Bridal Salon INV-1002 Payment Received', createdBy: 'System', timestamp: new Date('2026-06-10').toISOString() },
    { id: 'je-4', date: '2026-07-01', reference: 'GEN-004', description: 'Sunil Cosmetics Invoice INV-1003 Billed (Debtor)', createdBy: 'System', timestamp: new Date('2026-07-01').toISOString() },
    { id: 'je-5', date: '2026-07-05', reference: 'GEN-005', description: 'Factory Power & Machine Operating Expense', createdBy: 'System', timestamp: new Date('2026-07-05').toISOString() },
    { id: 'je-6', date: '2026-07-10', reference: 'GEN-006', description: 'Machine Tooling & Maintenance Expense', createdBy: 'System', timestamp: new Date('2026-07-10').toISOString() }
  ];

  const sampleJournalLines = [
    { id: 'jl-1', journalEntryId: 'je-1', accountId: '1020', debit: 5000000, credit: 0 },
    { id: 'jl-2', journalEntryId: 'je-1', accountId: '3010', debit: 0, credit: 5000000 },
    { id: 'jl-3', journalEntryId: 'je-2', accountId: '1020', debit: 450000, credit: 0 },
    { id: 'jl-4', journalEntryId: 'je-2', accountId: '4010', debit: 0, credit: 450000 },
    { id: 'jl-5', journalEntryId: 'je-3', accountId: '1020', debit: 145000, credit: 0 },
    { id: 'jl-6', journalEntryId: 'je-3', accountId: '4010', debit: 0, credit: 145000 },
    { id: 'jl-7', journalEntryId: 'je-4', accountId: '1100', debit: 280000, credit: 0 },
    { id: 'jl-8', journalEntryId: 'je-4', accountId: '4010', debit: 0, credit: 280000 },
    { id: 'jl-9', journalEntryId: 'je-5', accountId: '5050', debit: 55000, credit: 0 },
    { id: 'jl-10', journalEntryId: 'je-5', accountId: '1020', debit: 0, credit: 55000 },
    { id: 'jl-11', journalEntryId: 'je-6', accountId: '5060', debit: 32000, credit: 0 },
    { id: 'jl-12', journalEntryId: 'je-6', accountId: '1020', debit: 0, credit: 32000 }
  ];

  // ===================================================================
  // MULTI-BUSINESS ERP ARCHITECTURE: MAIN BUSINESS vs HAIR PINS
  // ===================================================================
  const DEFAULT_BUSINESSES = [
    {
      id: 'biz_main',
      name: 'Seynex Enterprises',
      category: 'General / Technology',
      tagline: 'Main Enterprise Operations',
      companyName: 'Seynex Enterprises',
      dashboardName: 'Seynex Enterprises',
      companyAddress: 'No. 45/A, Galle Road, Colombo 03, Sri Lanka',
      companyEmail: 'info@seynex.lk',
      companyPhone: '+94 11 234 5678',
      currency: 'LKR',
      icon: 'Building2',
      color: '#4f46e5'
    },
    {
      id: 'biz_hairpins',
      name: 'Royal Hair Pin Industries',
      category: 'Hair Pin Manufacturing & Wholesale',
      tagline: 'Bobby Pins, U-Pins, Wave Grips & Fasteners',
      companyName: 'Royal Hair Pin Industries',
      dashboardName: 'Royal Hair Pins & Accessories',
      companyAddress: 'Industrial Zone, Kelaniya, Sri Lanka',
      companyEmail: 'royalhairpins@gmail.com',
      companyPhone: '+94 77 123 4567',
      currency: 'LKR',
      icon: 'Sparkles',
      color: '#0d9488'
    }
  ];

  const sampleMainCustomers = [
    { id: 'mc-1', gymName: 'Apex Global Technologies', name: 'Rohan Jayasinghe', email: 'rohan@apexglobal.lk', phone: '0773456789', status: 'Active', tag: 'Enterprise Client', annualFee: 650000, purchaseDate: '2025-01-10', renewalDate: '2026-11-10', notes: [] },
    { id: 'mc-2', gymName: 'Metro Commercial Logistics', name: 'Samantha Silva', email: 'samantha@metrologistics.lk', phone: '0714567890', status: 'Active', tag: 'Commercial Client', annualFee: 420000, purchaseDate: '2025-02-15', renewalDate: '2026-12-15', notes: [] },
    { id: 'mc-3', gymName: 'Horizon Financial Services', name: 'Nishan Mendis', email: 'nishan@horizonfs.lk', phone: '0765678901', status: 'Active', tag: 'Corporate Client', annualFee: 850000, purchaseDate: '2025-03-20', renewalDate: '2026-10-20', notes: [] }
  ];

  const sampleMainInventory = [
    { id: 'minv-101', name: 'Enterprise Cloud ERP License (Annual)', type: 'Software', price: 185000, costPrice: 65000, stock: 100, reorderLevel: 10, desc: 'Full-featured enterprise cloud operations license' },
    { id: 'minv-102', name: 'Annual Priority SLA & Support Contract', type: 'Service', price: 95000, costPrice: 30000, stock: 999, reorderLevel: 5, desc: '24/7 dedicated support and maintenance package' },
    { id: 'minv-103', name: 'Commercial Network Security Gateway', type: 'Hardware', price: 145000, costPrice: 98000, stock: 18, reorderLevel: 4, desc: 'Managed hardware firewall and VPN gateway' },
    { id: 'minv-104', name: 'Professional Systems Consulting (Day Rate)', type: 'Consulting', price: 45000, costPrice: 15000, stock: 50, reorderLevel: 5, desc: 'On-site senior enterprise technical advisory' },
    { id: 'minv-105', name: 'Cloud Automated Backup Storage 1TB', type: 'Cloud Service', price: 36000, costPrice: 14000, stock: 200, reorderLevel: 20, desc: 'Encrypted off-site disaster recovery storage' }
  ];

  const sampleMainLeads = [
    { 
      id: 'mlead-1', 
      gymName: 'Orion Solutions Colombo', 
      contactPerson: 'Dinesh Wickramasinghe', 
      name: 'Dinesh Wickramasinghe', 
      phone: '0776789012', 
      email: 'dinesh@orionsolutions.lk', 
      location: 'Colombo 04', 
      status: 'Proposal Sent', 
      value: 520000, 
      date: '2026-09-25T10:00:00.000Z',
      lastActionDate: '2026-10-01T11:00:00.000Z',
      nextActionDate: new Date().toISOString().split('T')[0],
      nextActionNote: 'Review custom ERP implementation proposal with procurement committee',
      comments: [
        {
          id: 'mc-1',
          date: '2026-10-01T11:00:00.000Z',
          text: 'Conducted demonstration for finance team. Requested itemized quotation for 5 user licenses.',
          type: 'Meeting',
          nextActionDate: new Date().toISOString().split('T')[0],
          nextActionNote: 'Review custom ERP implementation proposal with procurement committee',
          author: 'Sales Executive'
        }
      ]
    },
    { 
      id: 'mlead-2', 
      gymName: 'Sterling Retail Group', 
      contactPerson: 'Anura Fernando', 
      name: 'Anura Fernando', 
      phone: '0717890123', 
      email: 'anura@sterlingretail.lk', 
      location: 'Kandy', 
      status: 'Contacted', 
      value: 380000, 
      date: '2026-09-29T14:20:00.000Z',
      lastActionDate: '2026-09-30T16:00:00.000Z',
      nextActionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      nextActionNote: 'Follow-up call regarding hardware specifications',
      comments: []
    }
  ];

  const sampleMainQuotes = [
    {
      id: 'mq-101',
      quoteNumber: 'QT-2001',
      shareKey: 'SNX-MQ101',
      date: '2026-09-25',
      validUntil: '2026-10-25',
      customerId: 'mc-1',
      prospectName: 'Orion Solutions Colombo',
      contactPerson: 'Dinesh Wickramasinghe',
      phone: '0776789012',
      email: 'dinesh@orionsolutions.lk',
      status: 'Sent',
      sentAt: '2026-09-25T11:00:00Z',
      amount: 520000,
      totalAmount: 520000,
      items: [
        { name: 'Enterprise Cloud ERP License (Annual)', qty: 2, unitPrice: 185000, amount: 370000 },
        { name: 'Annual Priority SLA & Support Contract', qty: 1, unitPrice: 95000, amount: 95000 },
        { name: 'Professional Systems Consulting (Day Rate)', qty: 1, unitPrice: 55000, amount: 55000 }
      ],
      notes: 'Standard 12-month license with guaranteed 99.9% uptime SLA.'
    }
  ];

  const sampleMainInvoices = [
    {
      id: 'minv-201',
      invoiceNumber: 'INV-2001',
      shareKey: 'SNX-MINV201',
      date: '2026-09-20',
      dueDate: '2026-10-05',
      customerId: 'mc-1',
      prospectName: 'Apex Global Technologies',
      amount: 650000,
      totalAmount: 650000,
      status: 'Paid',
      items: [
        { name: 'Enterprise Cloud ERP License (Annual)', qty: 3, unitPrice: 185000, amount: 555000 },
        { name: 'Annual Priority SLA & Support Contract', qty: 1, unitPrice: 95000, amount: 95000 }
      ],
      reminderSent: false
    }
  ];

  const sampleHairPinsPayments = [
    { id: 'pay-hp-1', documentId: 'inv-201', invoiceNumber: 'INV-1001', amount: 450000, date: '2026-06-01', method: 'Cash', customerName: 'Lanka Fancy Center' },
    { id: 'pay-hp-2', documentId: 'inv-202', invoiceNumber: 'INV-1002', amount: 145000, date: '2026-06-10', method: 'Bank Transfer', customerName: 'Queens Bridal & Beauty Salon' }
  ];

  const sampleMainPayments = [
    { id: 'pay-main-1', documentId: 'minv-201', invoiceNumber: 'INV-2001', amount: 650000, date: '2026-09-28', method: 'Bank Transfer', customerName: 'Apex Global Technologies' }
  ];

  const sampleMainExpenses = [
    { id: 'mexp-1', category: 'Operational', amount: 85000, date: '2026-07-05', description: 'AWS Cloud Server Hosting & Disaster Recovery Tier 3' },
    { id: 'mexp-2', category: 'Operational', amount: 28000, date: '2026-07-10', description: 'Colombo 03 Office Dedicated Leased Line High-Speed Fiber' },
    { id: 'mexp-3', category: 'Staff', amount: 240000, date: '2026-07-28', description: 'Enterprise Solutions Engineering & Cloud DevOps Salaries' },
    { id: 'mexp-4', category: 'Administrative', amount: 45000, date: '2026-08-01', description: 'Corporate Legal Advisory & Annual Regulatory Compliance' }
  ];

  const sampleMainFixedAssets = [
    { id: 'mfa-1', assetCode: 'FA-2001', name: 'Dell PowerEdge Enterprise Rack Server R750', category: 'IT Infrastructure', purchaseDate: '2025-01-15', purchaseCost: 1450000, usefulLifeYears: 5, salvageValue: 150000, depreciationMethod: 'Straight Line (SLM)', location: 'Colombo 03 Server Room', status: 'Active' },
    { id: 'mfa-2', assetCode: 'FA-2002', name: 'Cisco Core Managed Switch & Next-Gen Firewall Gateway', category: 'Network Hardware', purchaseDate: '2025-03-20', purchaseCost: 680000, usefulLifeYears: 6, salvageValue: 50000, depreciationMethod: 'Straight Line (SLM)', location: 'Data Rack A', status: 'Active' },
    { id: 'mfa-3', assetCode: 'FA-2003', name: 'Executive Systems Engineering Dual-Monitor Workstations', category: 'Office IT Equipment', purchaseDate: '2025-05-10', purchaseCost: 520000, usefulLifeYears: 4, salvageValue: 40000, depreciationMethod: 'Straight Line (SLM)', location: 'Engineering Lab', status: 'Active' }
  ];

  const sampleMainSuppliers = [
    { 
      id: 'msup-1', 
      name: 'Cisco & Dell Authorized Tech Distributor', 
      contactPerson: 'Harsha Wickramasinghe', 
      phone: '0112890123', 
      email: 'enterprise@techdistributors.lk', 
      category: 'Enterprise Hardware & Servers', 
      address: 'Level 14, World Trade Center, Colombo 01', 
      status: 'Active',
      isVatRegistered: true,
      vatNumber: 'VAT-401928374-7000',
      vatRate: 18
    },
    { 
      id: 'msup-2', 
      name: 'Amazon Web Services / Cloud Partner SL', 
      contactPerson: 'Suren Perera', 
      phone: '0114567890', 
      email: 'billing@cloudpartners.lk', 
      category: 'Cloud Hosting & Infrastructure', 
      address: 'No. 120, Dharmapala Mawatha, Colombo 07', 
      status: 'Active',
      isVatRegistered: true,
      vatNumber: 'VAT-902817263-7000',
      vatRate: 18
    }
  ];

  const sampleMainPurchaseOrders = [
    {
      id: 'mpo-1',
      poNumber: 'PO-2001',
      supplierId: 'msup-1',
      supplierName: 'Cisco & Dell Authorized Tech Distributor',
      supplierPhone: '0112890123',
      supplierEmail: 'enterprise@techdistributors.lk',
      supplierAddress: 'Level 14, World Trade Center, Colombo 01',
      date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      status: 'Ordered',
      subtotal: 290000,
      applyVat: true,
      vatRate: 18,
      vatAmount: 52200,
      totalAmount: 342200,
      isVatRegistered: true,
      supplierVatNumber: 'VAT-401928374-7000',
      shareKey: 'po_share_2001',
      items: [
        { name: 'Commercial Network Security Gateway', quantity: 2, unitCost: 98000, totalCost: 196000 },
        { name: 'Cloud Automated Backup Storage 1TB', quantity: 5, unitCost: 14000, totalCost: 70000 },
        { name: 'Priority Replacement Hardware Module', quantity: 1, unitCost: 24000, totalCost: 24000 }
      ]
    }
  ];

  const sampleMainJournalEntries = [
    { id: 'mje-1', date: '2026-01-01', reference: 'GEN-2001', description: 'Stated Capital Inflow - Seynex Enterprises', createdBy: 'Admin', timestamp: new Date('2026-01-01').toISOString() },
    { id: 'mje-2', date: '2026-09-20', reference: 'GEN-2002', description: 'Apex Global Technologies INV-2001 Billed (Software & SLA)', createdBy: 'System', timestamp: new Date('2026-09-20').toISOString() },
    { id: 'mje-3', date: '2026-09-28', reference: 'GEN-2003', description: 'Apex Global Technologies INV-2001 Full Settlement Received', createdBy: 'System', timestamp: new Date('2026-09-28').toISOString() },
    { id: 'mje-4', date: '2026-10-01', reference: 'GEN-2004', description: 'AWS Cloud Infrastructure Monthly Hosting Expense', createdBy: 'System', timestamp: new Date('2026-10-01').toISOString() }
  ];

  const sampleMainJournalLines = [
    { id: 'mjl-1', journalEntryId: 'mje-1', accountId: '1020', debit: 8000000, credit: 0 },
    { id: 'mjl-2', journalEntryId: 'mje-1', accountId: '3010', debit: 0, credit: 8000000 },
    { id: 'mjl-3', journalEntryId: 'mje-2', accountId: '1100', debit: 650000, credit: 0 },
    { id: 'mjl-4', journalEntryId: 'mje-2', accountId: '4010', debit: 0, credit: 650000 },
    { id: 'mjl-5', journalEntryId: 'mje-3', accountId: '1020', debit: 650000, credit: 0 },
    { id: 'mjl-6', journalEntryId: 'mje-3', accountId: '1100', debit: 0, credit: 650000 },
    { id: 'mjl-7', journalEntryId: 'mje-4', accountId: '5050', debit: 85000, credit: 0 },
    { id: 'mjl-8', journalEntryId: 'mje-4', accountId: '1020', debit: 0, credit: 85000 }
  ];

  const sampleMainBOMs = [
    {
      id: 'mbom-1',
      code: 'BOM-2001',
      productSku: 'SYS-CLD-ERP',
      name: 'Turnkey Cloud ERP Deployment Kit (Server + License + SLA)',
      productName: 'Turnkey Cloud ERP Deployment Kit (Server + License + SLA)',
      productCategory: 'Turnkey Solutions',
      outputUnit: 'Packages',
      batchYield: 1,
      components: [
        { name: 'Commercial Network Security Gateway', materialName: 'Commercial Network Security Gateway', materialSku: 'HW-SEC-01', quantity: 1, unit: 'unit', unitCost: 98000, totalCost: 98000 },
        { name: 'Enterprise Cloud ERP License (Annual)', materialName: 'Enterprise Cloud ERP License (Annual)', materialSku: 'SW-LIC-01', quantity: 1, unit: 'license', unitCost: 65000, totalCost: 65000 },
        { name: 'Cloud Automated Backup Storage 1TB', materialName: 'Cloud Automated Backup Storage 1TB', materialSku: 'CLD-BKP-01', quantity: 1, unit: 'service', unitCost: 14000, totalCost: 14000 }
      ],
      laborHours: 8,
      laborRatePerHour: 2500,
      laborCost: 20000,
      overheadCost: 15000,
      machineOverhead: 15000,
      materialCostPerUnit: 177000,
      totalCost: 212000,
      totalCostPerUnit: 212000,
      suggestedPrice: 325000,
      suggestedRetailPrice: 325000,
      marginPercent: 35,
      routing: ['Hardware Provisioning & Hardening', 'ERP Instance Cloud Staging', 'VPN & SSL Security Setup', 'Client User Onboarding & Handover'],
      notes: 'Ready-to-deploy enterprise on-premise + cloud hybrid bundle.'
    }
  ];

  const sampleMainProductionOrders = [
    {
      id: 'mmo-1',
      orderNumber: 'SYS-2026-001',
      bomId: 'mbom-1',
      productName: 'Turnkey Cloud ERP Deployment Kit (Server + License + SLA)',
      productSku: 'SYS-CLD-ERP',
      quantity: 1,
      quantityToProduce: 1,
      status: 'Completed',
      priority: 'High',
      startDate: '2026-09-18',
      dueDate: '2026-09-20',
      assignedTo: 'Cloud DevOps Team',
      supervisor: 'Senior Solutions Architect',
      workstation: 'Staging Lab 1',
      materialCost: 177000,
      laborCost: 20000,
      overheadCost: 15000,
      totalCost: 212000,
      totalBatchCost: 212000,
      costPerUnit: 212000,
      unitCost: 212000,
      batchNumber: 'DEPLOY-2026-01',
      components: sampleMainBOMs[0].components,
      qcPassedQty: 1,
      qcRejectedQty: 0,
      qcInspector: 'Principal Architect',
      notes: 'Successfully deployed and certified for Apex Global Technologies.'
    }
  ];

  const DEFAULT_MAIN_SMS_CONFIG = {
    apiKey: '2179165276941c4e5eb994053957585',
    email: 'info@seynex.lk',
    senderID: 'SEYNEX',
    companyName: 'Seynex Enterprises',
    dashboardName: 'Seynex Enterprises',
    receiptLogo: '',
    companyLogo: '',
    companyAddress: 'No. 45/A, Galle Road, Colombo 03, Sri Lanka',
    companyPhone: '+94 11 234 5678',
    adminPhone: '+94 11 234 5678',
    companyEmail: 'info@seynex.lk',
    bankDetails: {
      accountName: 'SEYNEX ENTERPRISES PVT LTD',
      bank: 'Commercial Bank of Ceylon',
      branch: 'Colombo 03 Branch',
      accountNumber: '8004 9123 4567'
    },
    quoteTemplate: 'Hi {name},\nHere is your quotation #{quoteNumber} from Seynex Enterprises.\nTotal Amount: LKR {amount}\nView Quote: {link}',
    thankYouTemplate: 'Hi {name},\nThank you for choosing Seynex Enterprises! Payment received for Invoice {invoiceNumber}.\nYour account is up to date.',
    renewalTemplate: 'Hi {name},\nNotice: Scheduled license & SLA service renewal for {gym} (LKR {amount}) is due on {date}. View invoice: {link} . Contact {companyName} to confirm.',
    invoiceReminderTemplate: 'Hi {name},\nReminder from Seynex Enterprises: Invoice {invoiceNumber} balance LKR {amount} is due. Kindly arrange settlement.',
    birthdayTemplate: 'Happy Birthday {name}! Wishing you prosperity and success from Seynex Enterprises!',
    cashReceivedTemplate: 'Hi {name},\nPayment Received! Seynex Enterprises received LKR {amount} for {documentType} #{number}. Thank you!',
    autoRenewalEnabled: true,
    autoRenewalDays: '15,7,3,1,0',
    autoInvoiceEnabled: false,
    autoInvoiceDays: 3,
    birthdayWishEnabled: true,
    autoTaskReminderEnabled: true,
    reminderHoursBefore: 24,
    reminderClockTime: '09:00',
    smsHeader: '',
    smsFooter: '',
    smsEncoding: 'GSM',
    deliveryReports: true,
    pdfColor: '#4f46e5',
    pdfFooterText: 'Thank you for your business. Seynex Enterprises.',
    pdfNotes: 'Computer-generated document by Seynex Enterprises Management Suite.',
    sessionTimeout: 5,
    balance: 0,
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 2002,
    quotePrefix: 'QT-',
    nextQuoteNumber: 2002,
    debtorNudgeTemplate: 'Hi {name},\nFriendly reminder from Seynex Enterprises: Outstanding balance of LKR {remainingBalance} for Invoice {invoiceNumber}. Please settle soon.'
  };

  const DEFAULT_HAIRPINS_SMS_CONFIG = {
    apiKey: '2179165276941c4e5eb994053957585',
    email: 'royalhairpins@gmail.com',
    senderID: 'SEYNEX',
    companyName: 'Royal Hair Pin Industries',
    dashboardName: 'Royal Hair Pins & Accessories',
    receiptLogo: '',
    companyLogo: '',
    companyAddress: 'Industrial Zone, Kelaniya, Sri Lanka',
    companyPhone: '+94 77 123 4567',
    adminPhone: '+94 77 123 4567',
    companyEmail: 'royalhairpins@gmail.com',
    bankDetails: {
      accountName: 'ROYAL HAIR PIN INDUSTRIES',
      bank: 'Sampath Bank',
      branch: 'Kelaniya Branch',
      accountNumber: '1018 5281 9432'
    },
    quoteTemplate: 'Hi {name},\nHere is your hair pin quotation from Royal Hair Pins.\nTotal Amount: LKR {amount}\nView Quote: {link}',
    thankYouTemplate: 'Hi {name},\nThank you for choosing Royal Hair Pins! Payment received for Invoice {invoiceNumber}.\nYour account is up to date.',
    renewalTemplate: 'Hi {name},\nNotice: Scheduled wholesale supply renewal for {gym} (LKR {amount}) is due on {date}. View invoice: {link} . Contact {companyName} to confirm.',
    invoiceReminderTemplate: 'Hi {name},\nReminder from Royal Hair Pins: Invoice {invoiceNumber} balance LKR {amount} is due. Kindly arrange settlement.',
    birthdayTemplate: 'Happy Birthday {name}! Wishing you prosperity and success from Royal Hair Pins!',
    cashReceivedTemplate: 'Hi {name},\nCash Received! Royal Hair Pins received LKR {amount} for {documentType} #{number}. Thank you!',
    autoRenewalEnabled: true,
    autoRenewalDays: '15,7,3,1,0',
    autoInvoiceEnabled: false,
    autoInvoiceDays: 3,
    birthdayWishEnabled: true,
    autoTaskReminderEnabled: true,
    reminderHoursBefore: 24,
    reminderClockTime: '09:00',
    smsHeader: '',
    smsFooter: '',
    smsEncoding: 'GSM',
    deliveryReports: true,
    pdfColor: '#0d9488',
    pdfFooterText: 'Thank you for your business. Quality Hair Pins & Fasteners.',
    pdfNotes: 'Computer-generated invoice by Royal Hair Pin Industries Management System.',
    sessionTimeout: 5,
    balance: 0,
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1005,
    quotePrefix: 'QT-',
    nextQuoteNumber: 1003,
    debtorNudgeTemplate: 'Hi {name},\nFriendly reminder from Royal Hair Pins: Outstanding balance of LKR {remainingBalance} for Invoice {invoiceNumber}. Please settle soon.'
  };

  const DEFAULT_SMS_CONFIG = DEFAULT_MAIN_SMS_CONFIG;

  const [businesses, setBusinesses] = useState(() => {
    try {
      const saved = localStorage.getItem('app_businesses');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUSINESSES;
  });

  const getInitialActiveBusinessId = () => {
    try {
      const authUserStr = localStorage.getItem('gym_auth_user');
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        if (authUser?.businessId && authUser.businessId !== 'all') {
          return authUser.businessId;
        }
      }
      const saved = localStorage.getItem('active_business_id');
      if (saved) return saved;
    } catch (e) {}
    return 'biz_main';
  };

  const [activeBusinessId, setActiveBusinessId] = useState(getInitialActiveBusinessId);

  const [customers, setCustomers] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_customers`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(c => {
            if (activeId === 'biz_hairpins') {
              if (c.businessId && c.businessId !== 'biz_hairpins') return false;
              if (String(c.id).startsWith('mc-')) return false;
              const n = (c.gymName || c.name || '').toLowerCase();
              if (n.includes('apex global') || n.includes('metro commercial') || n.includes('horizon financial')) return false;
              return true;
            } else {
              if (c.businessId && c.businessId !== 'biz_main') return false;
              if (String(c.id).startsWith('c-10')) return false;
              const n = (c.gymName || c.name || '').toLowerCase();
              if (n.includes('fancy center') || n.includes('bridal') || n.includes('cosmetics') || n.includes('salon chamari') || n.includes('fashion corner')) return false;
              return true;
            }
          });
          return sanitized;
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleCustomers : sampleMainCustomers;
  });

  const [inventory, setInventory] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_inventory`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(i => {
            if (activeId === 'biz_hairpins') {
              if (String(i.id).startsWith('minv-')) return false;
              const n = (i.name || '').toLowerCase();
              if (n.includes('cloud erp') || n.includes('sla & support') || n.includes('security gateway') || n.includes('backup storage')) return false;
              return true;
            } else {
              if (String(i.id).startsWith('inv-10')) return false;
              const n = (i.name || '').toLowerCase();
              if (n.includes('bobby pin') || n.includes('wave grip') || n.includes('u-pin') || n.includes('snap clip') || n.includes('wire') || n.includes('enamel')) return false;
              return true;
            }
          });
          return sanitized;
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleInventory : sampleMainInventory;
  });

  const [invoices, setInvoices] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_invoices`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(inv => {
            if (activeId === 'biz_hairpins') {
              if (inv.businessId && inv.businessId !== 'biz_hairpins') return false;
              if (String(inv.id).startsWith('minv-')) return false;
              const p = (inv.prospectName || inv.customerName || '').toLowerCase();
              if (p.includes('apex global') || p.includes('metro commercial') || p.includes('horizon financial')) return false;
              return true;
            } else {
              if (inv.businessId && inv.businessId !== 'biz_main') return false;
              if (String(inv.id).startsWith('inv-20')) return false;
              const p = (inv.prospectName || inv.customerName || '').toLowerCase();
              if (p.includes('lanka fancy') || p.includes('bridal') || p.includes('sunil cosmetics') || p.includes('salon chamari') || p.includes('fashion corner')) return false;
              return true;
            }
          });
          return sanitized.map(inv => {
            const rawAmt = Number(inv.amount != null && !isNaN(inv.amount) ? inv.amount : (inv.totalAmount != null && !isNaN(inv.totalAmount) ? inv.totalAmount : (inv.items?.[0]?.amount || 10000)));
            const validAmt = isNaN(rawAmt) || rawAmt <= 0 ? 10000 : rawAmt;
            return {
              ...inv,
              amount: validAmt,
              totalAmount: validAmt
            };
          });
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleInvoices : sampleMainInvoices;
  });

  const [quotes, setQuotes] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_quotes`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(q => {
            if (activeId === 'biz_hairpins') {
              if (String(q.id).startsWith('mq-')) return false;
              return true;
            } else {
              if (String(q.id).startsWith('q-10')) return false;
              return true;
            }
          });
          return sanitized.map(q => {
            if ((q.id === 'q-102' || q.quoteNumber === 'QT-1002') && (q.status === 'Accepted' || q.status === 'Converted to Invoice') && !q.convertedAt) {
              return { ...q, status: 'Sent', sentAt: q.sentAt || '2026-07-25T10:00:00Z', convertedInvoiceNumber: undefined, convertedInvoiceId: undefined };
            }
            return q;
          });
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleQuotes : sampleMainQuotes;
  });

  const [leads, setLeads] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_leads`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(l => {
            if (activeId === 'biz_hairpins') {
              if (String(l.id).startsWith('mlead-')) return false;
              return true;
            } else {
              if (String(l.id).startsWith('lead-')) return false;
              return true;
            }
          });
          return sanitized;
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleLeads : sampleMainLeads;
  });

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_activity_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const sanitizeExpensesByBiz = (list, bizId) => {
    if (!Array.isArray(list)) return [];
    return list.filter(e => {
      if (bizId === 'biz_hairpins') {
        if (e.businessId && e.businessId !== 'biz_hairpins') return false;
        if (String(e.id).startsWith('mexp-')) return false;
        const desc = (e.description || '').toLowerCase();
        if (desc.includes('aws cloud') || desc.includes('colombo 03 office') || desc.includes('devops')) return false;
        return true;
      } else {
        if (e.businessId && e.businessId !== 'biz_main') return false;
        if (String(e.id).startsWith('exp-') && !String(e.id).startsWith('mexp-')) return false;
        const desc = (e.description || '').toLowerCase();
        if (desc.includes('wholesale delivery van') || desc.includes('forming machine') || desc.includes('factory 3-phase') || desc.includes('bobby pin')) return false;
        return true;
      }
    });
  };

  const [expenses, setExpenses] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_expenses`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) {
          return sanitizeExpensesByBiz(parsed, activeId);
        }
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleExpenses : sampleMainExpenses;
  });

  const [payments, setPayments] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_payments`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleHairPinsPayments : sampleMainPayments;
  });

  const [fixedAssets, setFixedAssets] = useState(() => {
    const activeId = getInitialActiveBusinessId();
    try {
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_fixedAssets`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return activeId === 'biz_hairpins' ? sampleFixedAssets : sampleMainFixedAssets;
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const activeId = getInitialActiveBusinessId();
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const saved = localStorage.getItem(`biz_data_${activeId}_tasks`) || localStorage.getItem('gym_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // --- PROCUREMENT & PURCHASE ORDER (PO) ERP STATE ---
  const sampleSuppliers = [
    { 
      id: 'sup-1', 
      name: 'Lanka Steel & Wire Mills', 
      contactPerson: 'Kanishka Silva', 
      phone: '0112345678', 
      email: 'sales@lankawire.lk', 
      category: 'Spring Steel Wire & Metals', 
      address: 'No 45, Industrial Zone, Kelaniya', 
      status: 'Active',
      isVatRegistered: true,
      vatNumber: 'VAT-102938475-7000',
      vatRate: 18
    },
    { 
      id: 'sup-2', 
      name: 'Apex Industrial Paints & Lacquers', 
      contactPerson: 'Nalin Perera', 
      phone: '0117654321', 
      email: 'orders@apexpaints.lk', 
      category: 'Enamel & Protective Coatings', 
      address: 'No 112, Kandy Road, Ekala', 
      status: 'Active',
      isVatRegistered: false,
      vatNumber: '',
      vatRate: 18
    },
    { 
      id: 'sup-3', 
      name: 'ColorPack Printing & Packaging', 
      contactPerson: 'Devinda de Silva', 
      phone: '0728408880', 
      email: 'packaging@colorpack.lk', 
      category: 'Cards, Pouches & Master Cartons', 
      address: 'No 680/1B, Colombo 10', 
      status: 'Active',
      isVatRegistered: true,
      vatNumber: 'VAT-884920194-7000',
      vatRate: 18
    }
  ];

  const samplePurchaseOrders = [
    {
      id: 'po-1',
      poNumber: 'PO-1001',
      supplierId: 'sup-1',
      supplierName: 'Lanka Steel & Wire Mills',
      supplierPhone: '0112345678',
      supplierEmail: 'sales@lankawire.lk',
      supplierAddress: 'No 45, Industrial Zone, Kelaniya',
      date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'Ordered',
      subtotal: 170000,
      applyVat: true,
      vatRate: 18,
      vatAmount: 30600,
      totalAmount: 200600,
      isVatRegistered: true,
      supplierVatNumber: 'VAT-102938475-7000',
      shareKey: 'po_share_1001',
      items: [
        { name: 'Spring Steel Wire 1.0mm (25kg Spool)', quantity: 20, unitCost: 8500, totalCost: 170000 }
      ]
    },
    {
      id: 'po-2',
      poNumber: 'PO-1002',
      supplierId: 'sup-3',
      supplierName: 'ColorPack Printing & Packaging',
      supplierPhone: '0728408880',
      supplierEmail: 'packaging@colorpack.lk',
      supplierAddress: 'No 680/1B, Colombo 10',
      date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      status: 'Received',
      subtotal: 84000,
      applyVat: true,
      vatRate: 18,
      vatAmount: 15120,
      totalAmount: 99120,
      isVatRegistered: true,
      supplierVatNumber: 'VAT-884920194-7000',
      shareKey: 'po_share_1002',
      items: [
        { name: 'Printed Hair Pin Display Cards (Pack of 1,000)', quantity: 30, unitCost: 2800, totalCost: 84000 }
      ]
    }
  ];

  const [suppliers, setSuppliers] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_suppliers`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return activeId === 'biz_hairpins' ? sampleSuppliers : sampleMainSuppliers;
  });

  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_purchaseOrders`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return activeId === 'biz_hairpins' ? samplePurchaseOrders : sampleMainPurchaseOrders;
  });

  // --- MANUFACTURING & PRODUCTION (BOM) ERP STATE ---
  const sampleBOMs = [
    {
      id: 'bom-1',
      code: 'BOM-1001',
      productSku: 'HP-BP-101',
      name: 'Classic Black Bobby Pins (Batch of 100 Packets = 12,000 pins)',
      productName: 'Classic Black Bobby Pins (Batch of 100 Packets = 12,000 pins)',
      productCategory: 'Bobby Pins',
      outputUnit: 'Packets',
      batchYield: 100,
      components: [
        { name: 'Spring Steel Wire 1.0mm', materialName: 'Spring Steel Wire 1.0mm', materialSku: 'RM-WIRE-01', quantity: 12, unit: 'kg', unitCost: 340, totalCost: 4080 },
        { name: 'Rust-Proof Black Baking Enamel', materialName: 'Rust-Proof Black Baking Enamel', materialSku: 'RM-ENML-02', quantity: 1, unit: 'L', unitCost: 1240, totalCost: 1240 },
        { name: 'Protective Ball-End Dipping Plastic', materialName: 'Protective Ball-End Dipping Plastic', materialSku: 'RM-TIP-03', quantity: 0.5, unit: 'kg', unitCost: 900, totalCost: 450 },
        { name: 'Printed Backing Cards', materialName: 'Printed Backing Cards', materialSku: 'PK-CARD-05', quantity: 100, unit: 'pcs', unitCost: 3.5, totalCost: 350 },
        { name: 'Clear OPP Hanging Pouches', materialName: 'Clear OPP Hanging Pouches', materialSku: 'PK-BAG-06', quantity: 100, unit: 'pcs', unitCost: 2.2, totalCost: 220 }
      ],
      laborHours: 3.5,
      laborRatePerHour: 850,
      laborCost: 2975,
      overheadCost: 1650,
      machineOverhead: 1650,
      materialCostPerUnit: 63.4,
      totalCost: 10965,
      totalCostPerUnit: 109.65,
      suggestedPrice: 250,
      suggestedRetailPrice: 250,
      marginPercent: 56,
      routing: ['High-Speed Automatic Wire Feeding & Bending', 'Heat Treatment & Spring Quenching', 'Electrostatically Applied Enamel & Oven Baking', 'Smooth Safety Ball-Tip Resin Dipping', 'Automated Card Mounting & OPP Bag Sealing', 'Final Batch Quality Inspection'],
      notes: 'Master batch formulation producing 100 retail packets (120 pins per packet).'
    },
    {
      id: 'bom-2',
      code: 'BOM-1002',
      productSku: 'HP-GW-102',
      name: 'Golden Wave Hair Grips (Batch of 50 Cards = 100 Dozen)',
      productName: 'Golden Wave Hair Grips (Batch of 50 Cards = 100 Dozen)',
      productCategory: 'Wave Grips',
      outputUnit: 'Cards',
      batchYield: 50,
      components: [
        { name: 'Cold-Formed Spring Flat Wire', materialName: 'Cold-Formed Spring Flat Wire', materialSku: 'RM-FLAT-01', quantity: 5, unit: 'kg', unitCost: 450, totalCost: 2250 },
        { name: 'Gold Metallic Lacquer & Luster Coating', materialName: 'Gold Metallic Lacquer & Luster Coating', materialSku: 'RM-GOLD-03', quantity: 0.4, unit: 'kg', unitCost: 4500, totalCost: 1800 },
        { name: 'Gold-Tone Display Hanging Cards', materialName: 'Gold-Tone Display Hanging Cards', materialSku: 'PK-GCARD-02', quantity: 50, unit: 'pcs', unitCost: 5, totalCost: 250 },
        { name: 'Polybag Packaging Sleeves', materialName: 'Polybag Packaging Sleeves', materialSku: 'PK-BAG-06', quantity: 50, unit: 'pcs', unitCost: 2, totalCost: 100 }
      ],
      laborHours: 2.5,
      laborRatePerHour: 850,
      laborCost: 2125,
      overheadCost: 1200,
      machineOverhead: 1200,
      materialCostPerUnit: 88,
      totalCost: 7725,
      totalCostPerUnit: 154.5,
      suggestedPrice: 320,
      suggestedRetailPrice: 320,
      marginPercent: 52,
      routing: ['Precision Wave Die Pressing', 'Anti-Corrosion Polishing', 'Gold Dipping & Thermo-Cure', 'Card Attachment & Packaging'],
      notes: 'Produces 50 display cards (24 pins per card / 2 Dozen).'
    },
    {
      id: 'bom-3',
      code: 'BOM-1003',
      productSku: 'HP-SC-104',
      name: 'Classic Snap Hair Clips 5cm (Batch of 100 Cards = 100 Dozen)',
      productName: 'Classic Snap Hair Clips 5cm (Batch of 100 Cards = 100 Dozen)',
      productCategory: 'Snap Clips',
      outputUnit: 'Cards',
      batchYield: 100,
      components: [
        { name: 'Spring Steel Strip Coil 0.8mm', materialName: 'Spring Steel Strip Coil 0.8mm', materialSku: 'RM-COIL-01', quantity: 7, unit: 'kg', unitCost: 480, totalCost: 3360 },
        { name: 'Gloss Black Powder Coating', materialName: 'Gloss Black Powder Coating', materialSku: 'RM-ENML-02', quantity: 0.8, unit: 'kg', unitCost: 1100, totalCost: 880 },
        { name: 'Center Click Spring Tongue Inserts', materialName: 'Center Click Spring Tongue Inserts', materialSku: 'RM-CLICK-03', quantity: 1200, unit: 'pcs', unitCost: 1.8, totalCost: 2160 },
        { name: '1-Dozen Display Hanging Cards', materialName: '1-Dozen Display Hanging Cards', materialSku: 'PK-CARD-05', quantity: 100, unit: 'pcs', unitCost: 3.5, totalCost: 350 }
      ],
      laborHours: 4,
      laborRatePerHour: 850,
      laborCost: 3400,
      overheadCost: 1800,
      machineOverhead: 1800,
      materialCostPerUnit: 67.5,
      totalCost: 11950,
      totalCostPerUnit: 119.5,
      suggestedPrice: 380,
      suggestedRetailPrice: 380,
      marginPercent: 68,
      routing: ['Progressive Stamping Press', 'Tumble Deburring & Edge Softening', 'Center Click Assembly', 'Electrostatic Black Coating', 'Card Insertion & QC'],
      notes: 'Produces 100 retail dozen cards (12 clips per card = 1,200 clips).'
    }
  ];

  const sampleProductionOrders = [
    {
      id: 'mo-1',
      orderNumber: 'MO-2026-001',
      bomId: 'bom-1',
      productName: 'Classic Black Bobby Pins (Batch of 100 Packets = 12,000 pins)',
      productSku: 'HP-BP-101',
      quantity: 5,
      quantityToProduce: 5,
      status: 'In Progress',
      priority: 'High',
      startDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      assignedTo: 'Automatic Forming Machine 1',
      supervisor: 'Father (Master Craftsman)',
      workstation: 'Automatic Forming Machine 1',
      materialCost: 31700,
      laborCost: 14875,
      overheadCost: 8250,
      totalCost: 54825,
      totalBatchCost: 54825,
      costPerUnit: 109.65,
      unitCost: 109.65,
      batchNumber: 'LOT-2026-09A',
      components: sampleBOMs[0].components,
      notes: 'Wholesale order for Lanka Fancy Center Pettah distributor.'
    },
    {
      id: 'mo-2',
      orderNumber: 'MO-2026-002',
      bomId: 'bom-2',
      productName: 'Golden Wave Hair Grips (Batch of 50 Cards = 100 Dozen)',
      productSku: 'HP-GW-102',
      quantity: 10,
      quantityToProduce: 10,
      status: 'Completed',
      priority: 'Normal',
      startDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      completedDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      assignedTo: 'Wave Forming Line 2',
      supervisor: 'Father (Master Craftsman)',
      workstation: 'Wave Forming Line 2',
      materialCost: 44000,
      laborCost: 21250,
      overheadCost: 12000,
      totalCost: 77250,
      totalBatchCost: 77250,
      costPerUnit: 154.5,
      unitCost: 154.5,
      batchNumber: 'LOT-2026-08B',
      components: sampleBOMs[1].components,
      qcPassedQty: 10,
      qcRejectedQty: 0,
      qcInspector: 'Father (Master Craftsman)',
      notes: 'Completed ahead of schedule, zero defects recorded during spring tension test.'
    },
    {
      id: 'mo-3',
      orderNumber: 'MO-2026-003',
      bomId: 'bom-3',
      productName: 'Classic Snap Hair Clips 5cm (Batch of 100 Cards = 100 Dozen)',
      productSku: 'HP-SC-104',
      quantity: 15,
      quantityToProduce: 15,
      status: 'Planned',
      priority: 'Urgent',
      startDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      assignedTo: 'Stamping Press 1',
      supervisor: 'Father (Master Craftsman)',
      workstation: 'Stamping Press 1',
      materialCost: 101250,
      laborCost: 51000,
      overheadCost: 27000,
      totalCost: 179250,
      totalBatchCost: 179250,
      costPerUnit: 119.5,
      unitCost: 119.5,
      batchNumber: 'LOT-2026-09C',
      components: sampleBOMs[2].components,
      notes: 'Planned batch replenishment for wholesale warehouse stock.'
    }
  ];

  const normalizeBOM = (b) => ({
    ...b,
    id: b.id || `bom-${Date.now()}`,
    code: b.code || b.productSku || 'BOM-GEN',
    productSku: b.productSku || b.code || 'BOM-GEN',
    name: b.name || b.productName || 'Custom Formulation',
    productName: b.productName || b.name || 'Custom Formulation',
    outputUnit: b.outputUnit || 'Units',
    batchYield: Number(b.batchYield || 1),
    totalCost: Number(b.totalCost || b.totalCostPerUnit || 0),
    totalCostPerUnit: Number(b.totalCostPerUnit || b.totalCost || 0),
    materialCostPerUnit: Number(b.materialCostPerUnit || 0),
    laborCost: Number(b.laborCost || 0),
    overheadCost: Number(b.overheadCost || b.machineOverhead || 0),
    machineOverhead: Number(b.machineOverhead || b.overheadCost || 0),
    suggestedPrice: Number(b.suggestedPrice || b.suggestedRetailPrice || 0),
    suggestedRetailPrice: Number(b.suggestedRetailPrice || b.suggestedPrice || 0),
    marginPercent: Number(b.marginPercent || 0),
    components: (b.components || []).map(c => ({
      ...c,
      name: c.name || c.materialName || 'Component',
      materialName: c.materialName || c.name || 'Component',
      materialSku: c.materialSku || c.sku || '',
      quantity: Number(c.quantity || 1),
      unit: c.unit || 'pcs',
      unitCost: Number(c.unitCost || 0),
      totalCost: Number(c.totalCost || (Number(c.quantity || 1) * Number(c.unitCost || 0)))
    }))
  });

  const normalizeProductionOrder = (o) => ({
    ...o,
    id: o.id || `mo-${Date.now()}`,
    orderNumber: o.orderNumber || `MO-${new Date().getFullYear()}-001`,
    bomId: o.bomId || 'bom-1',
    productName: o.productName || o.name || 'Finished Product',
    productSku: o.productSku || o.code || '',
    quantity: Number(o.quantity || o.quantityToProduce || 1),
    quantityToProduce: Number(o.quantityToProduce || o.quantity || 1),
    status: o.status || 'Planned',
    priority: o.priority || 'Normal',
    batchNumber: o.batchNumber || `LOT-${new Date().getFullYear()}-01`,
    startDate: o.startDate || new Date().toISOString().split('T')[0],
    dueDate: o.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assignedTo: o.assignedTo || o.supervisor || o.workstation || 'Assembly Line 1',
    supervisor: o.supervisor || o.assignedTo || 'Line Supervisor',
    costPerUnit: Number(o.costPerUnit || o.unitCost || 0),
    unitCost: Number(o.unitCost || o.costPerUnit || 0),
    totalCost: Number(o.totalCost || o.totalBatchCost || 0),
    totalBatchCost: Number(o.totalBatchCost || o.totalCost || 0),
    components: o.components || [],
    notes: o.notes || ''
  });

  const [boms, setBoms] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_boms`);
      if (bizSaved) return JSON.parse(bizSaved).map(normalizeBOM);
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return (activeId === 'biz_hairpins' ? sampleBOMs : sampleMainBOMs).map(normalizeBOM);
  });

  const [productionOrders, setProductionOrders] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_productionOrders`);
      if (bizSaved) return JSON.parse(bizSaved).map(normalizeProductionOrder);
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return (activeId === 'biz_hairpins' ? sampleProductionOrders : sampleMainProductionOrders).map(normalizeProductionOrder);
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
    },
    {
      id: 'emp-5',
      employeeId: 'EMP-105',
      name: 'Nuwan Bandara (Outsourced Tech)',
      nic: '199045102938',
      dob: '1990-07-18',
      gender: 'Male',
      bloodGroup: 'B+',
      designation: 'Outsourced Assembly Specialist',
      department: 'Manufacturing & Assembly',
      employmentType: 'Piece-Rate',
      compensationType: 'piece_rate',
      pieceRate: 450,
      pieceDescription: 'Per Equipment Unit Assembled',
      defaultUnits: 160,
      unitsCompleted: 160,
      shift: 'General (08:30 - 17:00)',
      phone: '0714455667',
      email: 'nuwan.contractor@gymsales.lk',
      address: '22 Factory Zone, Homagama',
      emergencyContactName: 'Kusum Bandara',
      emergencyContactPhone: '0719988776',
      emergencyContactRelation: 'Spouse',
      joinDate: '2023-05-10',
      confirmationDate: '2023-11-10',
      basicSalary: 72000,
      allowance: 0,
      foodAllowance: 4000,
      transportAllowance: 6000,
      epfEligible: false,
      bankName: 'Sampath Bank PLC',
      bankAccount: '1100293847',
      bankBranch: 'Homagama Branch',
      bankDetails: 'Sampath Bank - 1100293847 (Homagama)',
      status: 'Active',
      leaveBalances: { annual: 7, casual: 3, medical: 5 }
    },
    {
      id: 'emp-6',
      employeeId: 'EMP-106',
      name: 'Chathura Senanayake (Freelance)',
      nic: '198734109283',
      dob: '1987-12-04',
      gender: 'Male',
      bloodGroup: 'A+',
      designation: 'Freelance Fitness Workshop Coach',
      department: 'Fitness & Training',
      employmentType: 'Outsourced',
      compensationType: 'piece_rate',
      pieceRate: 2500,
      pieceDescription: 'Per Client Workshop / Training Session',
      defaultUnits: 28,
      unitsCompleted: 28,
      shift: 'Morning (06:00 - 15:00)',
      phone: '0776655443',
      email: 'chathura.coach@gymsales.lk',
      address: '55 Kotte Road, Nugegoda',
      emergencyContactName: 'Nirosha Senanayake',
      emergencyContactPhone: '0773322110',
      emergencyContactRelation: 'Spouse',
      joinDate: '2023-09-01',
      confirmationDate: '2024-03-01',
      basicSalary: 70000,
      allowance: 0,
      foodAllowance: 0,
      transportAllowance: 8000,
      epfEligible: false,
      bankName: 'Commercial Bank of Ceylon',
      bankAccount: '8005521940',
      bankBranch: 'Nugegoda Branch',
      bankDetails: 'Commercial Bank - 8005521940 (Nugegoda)',
      status: 'Active',
      leaveBalances: { annual: 5, casual: 2, medical: 3 }
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
    manufacturing: true,
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
  useEffect(() => { localStorage.setItem('gym_boms', JSON.stringify(boms)); }, [boms]);
  useEffect(() => { localStorage.setItem('gym_production_orders', JSON.stringify(productionOrders)); }, [productionOrders]);
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
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_journalEntries`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return activeId === 'biz_hairpins' ? sampleJournalEntries : sampleMainJournalEntries;
  });

  const [journalLines, setJournalLines] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      if (localStorage.getItem(`biz_data_${activeId}_erased`) === 'true') return [];
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_journalLines`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    const activeId = localStorage.getItem('active_business_id') || 'biz_main';
    return activeId === 'biz_hairpins' ? sampleJournalLines : sampleMainJournalLines;
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

  // SMS Configuration State (business-aware)

  const [smsConfig, setSmsConfig] = useState(() => {
    try {
      const activeId = localStorage.getItem('active_business_id') || 'biz_main';
      const bizSaved = localStorage.getItem(`biz_data_${activeId}_smsConfig`);
      if (bizSaved) {
        const parsed = JSON.parse(bizSaved);
        if (parsed && typeof parsed === 'object') {
          return { ...(activeId === 'biz_hairpins' ? DEFAULT_HAIRPINS_SMS_CONFIG : DEFAULT_MAIN_SMS_CONFIG), ...parsed };
        }
      }
      return activeId === 'biz_hairpins' ? DEFAULT_HAIRPINS_SMS_CONFIG : DEFAULT_MAIN_SMS_CONFIG;
    } catch (e) {}
    return DEFAULT_MAIN_SMS_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gym_sms_config', JSON.stringify(smsConfig));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_smsConfig`, JSON.stringify(smsConfig));
      }
    } catch (e) {
      console.warn('Failed to mirror gym_sms_config to localStorage', e);
    }
  }, [smsConfig, activeBusinessId]);

  // Multi-Business Persistence: Mirror each entity to active business slot
  useEffect(() => {
    try {
      localStorage.setItem('gym_customers', JSON.stringify(customers));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_customers`, JSON.stringify(customers));
      }
    } catch (e) {}
  }, [customers, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_inventory', JSON.stringify(inventory));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_inventory`, JSON.stringify(inventory));
      }
    } catch (e) {}
  }, [inventory, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_leads', JSON.stringify(leads));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_leads`, JSON.stringify(leads));
      }
    } catch (e) {}
  }, [leads, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_quotes', JSON.stringify(quotes));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_quotes`, JSON.stringify(quotes));
      }
    } catch (e) {}
  }, [quotes, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_invoices', JSON.stringify(invoices));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_invoices`, JSON.stringify(invoices));
      }
    } catch (e) {}
  }, [invoices, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_expenses', JSON.stringify(expenses));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_expenses`, JSON.stringify(expenses));
      }
    } catch (e) {}
  }, [expenses, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_suppliers', JSON.stringify(suppliers));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_suppliers`, JSON.stringify(suppliers));
      }
    } catch (e) {}
  }, [suppliers, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_purchase_orders', JSON.stringify(purchaseOrders));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_purchaseOrders`, JSON.stringify(purchaseOrders));
      }
    } catch (e) {}
  }, [purchaseOrders, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_boms', JSON.stringify(boms));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_boms`, JSON.stringify(boms));
      }
    } catch (e) {}
  }, [boms, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_production_orders', JSON.stringify(productionOrders));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_productionOrders`, JSON.stringify(productionOrders));
      }
    } catch (e) {}
  }, [productionOrders, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_payments', JSON.stringify(payments));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_payments`, JSON.stringify(payments));
      }
    } catch (e) {}
  }, [payments, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_fixed_assets', JSON.stringify(fixedAssets));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_fixedAssets`, JSON.stringify(fixedAssets));
      }
    } catch (e) {}
  }, [fixedAssets, activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem('gym_tasks', JSON.stringify(tasks));
      if (activeBusinessId) {
        localStorage.setItem(`biz_data_${activeBusinessId}_tasks`, JSON.stringify(tasks));
      }
    } catch (e) {}
  }, [tasks, activeBusinessId]);

  // Load business dataset by ID
  const loadBusinessData = (businessId) => {
    const isErased = localStorage.getItem(`biz_data_${businessId}_erased`) === 'true';

    if (businessId === 'biz_hairpins') {
      const savedCust = localStorage.getItem('biz_data_biz_hairpins_customers');
      const savedInv = localStorage.getItem('biz_data_biz_hairpins_inventory');
      const savedLeads = localStorage.getItem('biz_data_biz_hairpins_leads');
      const savedQuotes = localStorage.getItem('biz_data_biz_hairpins_quotes');
      const savedInvoices = localStorage.getItem('biz_data_biz_hairpins_invoices');
      const savedExpenses = localStorage.getItem('biz_data_biz_hairpins_expenses');
      const savedPayments = localStorage.getItem('biz_data_biz_hairpins_payments');
      const savedFA = localStorage.getItem('biz_data_biz_hairpins_fixedAssets');
      const savedJE = localStorage.getItem('biz_data_biz_hairpins_journalEntries');
      const savedJL = localStorage.getItem('biz_data_biz_hairpins_journalLines');
      const savedSuppliers = localStorage.getItem('biz_data_biz_hairpins_suppliers');
      const savedPO = localStorage.getItem('biz_data_biz_hairpins_purchaseOrders');
      const savedBOM = localStorage.getItem('biz_data_biz_hairpins_boms');
      const savedMO = localStorage.getItem('biz_data_biz_hairpins_productionOrders');
      const savedConfig = localStorage.getItem('biz_data_biz_hairpins_smsConfig');

      let loadedHairpinCustomers = isErased ? [] : sampleCustomers;
      if (savedCust) {
        try {
          const parsed = JSON.parse(savedCust);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(c => {
              if (c.businessId && c.businessId !== 'biz_hairpins') return false;
              if (String(c.id).startsWith('mc-')) return false;
              const n = (c.gymName || c.name || '').toLowerCase();
              if (n.includes('apex global') || n.includes('metro commercial') || n.includes('horizon financial')) return false;
              return true;
            });
            loadedHairpinCustomers = sanitized;
          }
        } catch (e) {}
      }

      let loadedHairpinInventory = isErased ? [] : sampleInventory;
      if (savedInv) {
        try {
          const parsed = JSON.parse(savedInv);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(i => {
              if (String(i.id).startsWith('minv-')) return false;
              const n = (i.name || '').toLowerCase();
              if (n.includes('cloud erp') || n.includes('sla & support') || n.includes('security gateway') || n.includes('backup storage')) return false;
              return true;
            });
            loadedHairpinInventory = sanitized;
          }
        } catch (e) {}
      }

      let loadedHairpinInvoices = isErased ? [] : sampleInvoices;
      if (savedInvoices) {
        try {
          const parsed = JSON.parse(savedInvoices);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(inv => {
              if (inv.businessId && inv.businessId !== 'biz_hairpins') return false;
              if (String(inv.id).startsWith('minv-')) return false;
              const p = (inv.prospectName || inv.customerName || '').toLowerCase();
              if (p.includes('apex global') || p.includes('metro commercial') || p.includes('horizon financial')) return false;
              return true;
            });
            loadedHairpinInvoices = sanitized;
          }
        } catch (e) {}
      }

      return {
        customers: loadedHairpinCustomers,
        inventory: loadedHairpinInventory,
        leads: savedLeads ? JSON.parse(savedLeads) : (isErased ? [] : sampleLeads),
        quotes: savedQuotes ? JSON.parse(savedQuotes) : (isErased ? [] : sampleQuotes),
        invoices: loadedHairpinInvoices,
        expenses: savedExpenses ? sanitizeExpensesByBiz(JSON.parse(savedExpenses), 'biz_hairpins') : (isErased ? [] : sampleExpenses),
        payments: savedPayments ? JSON.parse(savedPayments) : (isErased ? [] : sampleHairPinsPayments),
        fixedAssets: savedFA ? JSON.parse(savedFA) : (isErased ? [] : sampleFixedAssets),
        journalEntries: savedJE ? JSON.parse(savedJE) : (isErased ? [] : sampleJournalEntries),
        journalLines: savedJL ? JSON.parse(savedJL) : (isErased ? [] : sampleJournalLines),
        suppliers: savedSuppliers ? JSON.parse(savedSuppliers) : (isErased ? [] : sampleSuppliers),
        purchaseOrders: savedPO ? JSON.parse(savedPO) : (isErased ? [] : samplePurchaseOrders),
        boms: savedBOM ? JSON.parse(savedBOM).map(normalizeBOM) : (isErased ? [] : sampleBOMs.map(normalizeBOM)),
        productionOrders: savedMO ? JSON.parse(savedMO).map(normalizeProductionOrder) : (isErased ? [] : sampleProductionOrders.map(normalizeProductionOrder)),
        smsConfig: savedConfig ? JSON.parse(savedConfig) : DEFAULT_HAIRPINS_SMS_CONFIG
      };
    }

    if (businessId === 'biz_main') {
      const savedCust = localStorage.getItem('biz_data_biz_main_customers');
      const savedInv = localStorage.getItem('biz_data_biz_main_inventory');
      const savedLeads = localStorage.getItem('biz_data_biz_main_leads');
      const savedQuotes = localStorage.getItem('biz_data_biz_main_quotes');
      const savedInvoices = localStorage.getItem('biz_data_biz_main_invoices');
      const savedExpenses = localStorage.getItem('biz_data_biz_main_expenses');
      const savedPayments = localStorage.getItem('biz_data_biz_main_payments');
      const savedFA = localStorage.getItem('biz_data_biz_main_fixedAssets');
      const savedJE = localStorage.getItem('biz_data_biz_main_journalEntries');
      const savedJL = localStorage.getItem('biz_data_biz_main_journalLines');
      const savedSuppliers = localStorage.getItem('biz_data_biz_main_suppliers');
      const savedPO = localStorage.getItem('biz_data_biz_main_purchaseOrders');
      const savedBOM = localStorage.getItem('biz_data_biz_main_boms');
      const savedMO = localStorage.getItem('biz_data_biz_main_productionOrders');
      const savedConfig = localStorage.getItem('biz_data_biz_main_smsConfig');

      let loadedMainCustomers = isErased ? [] : sampleMainCustomers;
      if (savedCust) {
        try {
          const parsed = JSON.parse(savedCust);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(c => {
              if (c.businessId && c.businessId !== 'biz_main') return false;
              if (String(c.id).startsWith('c-10')) return false;
              const n = (c.gymName || c.name || '').toLowerCase();
              if (n.includes('fancy center') || n.includes('bridal') || n.includes('cosmetics') || n.includes('salon chamari') || n.includes('fashion corner')) return false;
              return true;
            });
            loadedMainCustomers = sanitized;
          }
        } catch (e) {}
      }

      let loadedMainInventory = isErased ? [] : sampleMainInventory;
      if (savedInv) {
        try {
          const parsed = JSON.parse(savedInv);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(i => {
              if (String(i.id).startsWith('inv-10')) return false;
              const n = (i.name || '').toLowerCase();
              if (n.includes('bobby pin') || n.includes('wave grip') || n.includes('u-pin') || n.includes('snap clip') || n.includes('wire') || n.includes('enamel')) return false;
              return true;
            });
            loadedMainInventory = sanitized;
          }
        } catch (e) {}
      }

      let loadedMainInvoices = isErased ? [] : sampleMainInvoices;
      if (savedInvoices) {
        try {
          const parsed = JSON.parse(savedInvoices);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(inv => {
              if (inv.businessId && inv.businessId !== 'biz_main') return false;
              if (String(inv.id).startsWith('inv-20')) return false;
              const p = (inv.prospectName || inv.customerName || '').toLowerCase();
              if (p.includes('lanka fancy') || p.includes('bridal') || p.includes('sunil cosmetics') || p.includes('salon chamari') || p.includes('fashion corner')) return false;
              return true;
            });
            loadedMainInvoices = sanitized;
          }
        } catch (e) {}
      }

      return {
        customers: loadedMainCustomers,
        inventory: loadedMainInventory,
        leads: savedLeads ? JSON.parse(savedLeads) : (isErased ? [] : sampleMainLeads),
        quotes: savedQuotes ? JSON.parse(savedQuotes) : (isErased ? [] : sampleMainQuotes),
        invoices: loadedMainInvoices,
        expenses: savedExpenses ? sanitizeExpensesByBiz(JSON.parse(savedExpenses), 'biz_main') : (isErased ? [] : sampleMainExpenses),
        payments: savedPayments ? JSON.parse(savedPayments) : (isErased ? [] : sampleMainPayments),
        fixedAssets: savedFA ? JSON.parse(savedFA) : (isErased ? [] : sampleMainFixedAssets),
        journalEntries: savedJE ? JSON.parse(savedJE) : (isErased ? [] : sampleMainJournalEntries),
        journalLines: savedJL ? JSON.parse(savedJL) : (isErased ? [] : sampleMainJournalLines),
        suppliers: savedSuppliers ? JSON.parse(savedSuppliers) : (isErased ? [] : sampleMainSuppliers),
        purchaseOrders: savedPO ? JSON.parse(savedPO) : (isErased ? [] : sampleMainPurchaseOrders),
        boms: savedBOM ? JSON.parse(savedBOM).map(normalizeBOM) : (isErased ? [] : sampleMainBOMs.map(normalizeBOM)),
        productionOrders: savedMO ? JSON.parse(savedMO).map(normalizeProductionOrder) : (isErased ? [] : sampleMainProductionOrders.map(normalizeProductionOrder)),
        smsConfig: savedConfig ? JSON.parse(savedConfig) : DEFAULT_MAIN_SMS_CONFIG
      };
    }

    // Custom Business Profile
    const savedCust = localStorage.getItem(`biz_data_${businessId}_customers`);
    const savedInv = localStorage.getItem(`biz_data_${businessId}_inventory`);
    const savedLeads = localStorage.getItem(`biz_data_${businessId}_leads`);
    const savedQuotes = localStorage.getItem(`biz_data_${businessId}_quotes`);
    const savedInvoices = localStorage.getItem(`biz_data_${businessId}_invoices`);
    const savedExpenses = localStorage.getItem(`biz_data_${businessId}_expenses`);
    const savedPayments = localStorage.getItem(`biz_data_${businessId}_payments`);
    const savedConfig = localStorage.getItem(`biz_data_${businessId}_smsConfig`);

    const bizObj = businesses.find(b => b.id === businessId) || { name: 'Custom Business' };

    return {
      customers: savedCust ? JSON.parse(savedCust) : [],
      inventory: savedInv ? JSON.parse(savedInv) : [],
      leads: savedLeads ? JSON.parse(savedLeads) : [],
      quotes: savedQuotes ? JSON.parse(savedQuotes) : [],
      invoices: savedInvoices ? JSON.parse(savedInvoices) : [],
      expenses: savedExpenses ? JSON.parse(savedExpenses) : [],
      payments: savedPayments ? JSON.parse(savedPayments) : [],
      fixedAssets: [],
      journalEntries: [],
      journalLines: [],
      suppliers: [],
      purchaseOrders: [],
      boms: [],
      productionOrders: [],
      smsConfig: savedConfig ? JSON.parse(savedConfig) : {
        ...DEFAULT_MAIN_SMS_CONFIG,
        companyName: bizObj.name,
        dashboardName: bizObj.name,
        pdfFooterText: `Thank you for your business. ${bizObj.name}.`,
        pdfNotes: `Computer-generated document by ${bizObj.name} Management Suite.`
      }
    };
  };

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESSES[0];

  const switchBusiness = (targetBusinessId) => {
    if (!targetBusinessId || targetBusinessId === activeBusinessId) return;

    // Strict Business Access Control: restricted users can only access their assigned business
    if (user?.businessId && user.businessId !== 'all' && user.businessId !== targetBusinessId) {
      const assignedBizName = user.businessName || (businesses.find(b => b.id === user.businessId)?.name) || 'your assigned business';
      showNotification(`Access Restricted: Your account is dedicated to ${assignedBizName} only.`, 'error');
      return;
    }

    const targetBiz = businesses.find(b => b.id === targetBusinessId);
    if (!targetBiz) return;

    // 1. Save current active business data
    try {
      localStorage.setItem(`biz_data_${activeBusinessId}_customers`, JSON.stringify(customers));
      localStorage.setItem(`biz_data_${activeBusinessId}_inventory`, JSON.stringify(inventory));
      localStorage.setItem(`biz_data_${activeBusinessId}_leads`, JSON.stringify(leads));
      localStorage.setItem(`biz_data_${activeBusinessId}_quotes`, JSON.stringify(quotes));
      localStorage.setItem(`biz_data_${activeBusinessId}_invoices`, JSON.stringify(invoices));
      localStorage.setItem(`biz_data_${activeBusinessId}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`biz_data_${activeBusinessId}_payments`, JSON.stringify(payments));
      localStorage.setItem(`biz_data_${activeBusinessId}_fixedAssets`, JSON.stringify(fixedAssets));
      localStorage.setItem(`biz_data_${activeBusinessId}_journalEntries`, JSON.stringify(journalEntries));
      localStorage.setItem(`biz_data_${activeBusinessId}_journalLines`, JSON.stringify(journalLines));
      localStorage.setItem(`biz_data_${activeBusinessId}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`biz_data_${activeBusinessId}_purchaseOrders`, JSON.stringify(purchaseOrders));
      localStorage.setItem(`biz_data_${activeBusinessId}_boms`, JSON.stringify(boms));
      localStorage.setItem(`biz_data_${activeBusinessId}_productionOrders`, JSON.stringify(productionOrders));
      localStorage.setItem(`biz_data_${activeBusinessId}_smsConfig`, JSON.stringify(smsConfig));
    } catch (e) {
      console.warn('Failed to save outgoing business data', e);
    }

    // 2. Load target business data
    const loadedData = loadBusinessData(targetBusinessId);

    // 3. Set React states
    setCustomers(loadedData.customers);
    setInventory(loadedData.inventory);
    setLeads(loadedData.leads);
    setQuotes(loadedData.quotes);
    setInvoices(loadedData.invoices);
    setExpenses(loadedData.expenses);
    setPayments(loadedData.payments);
    setFixedAssets(loadedData.fixedAssets);
    setJournalEntries(loadedData.journalEntries);
    setJournalLines(loadedData.journalLines);
    setSuppliers(loadedData.suppliers);
    setPurchaseOrders(loadedData.purchaseOrders);
    setBoms(loadedData.boms);
    setProductionOrders(loadedData.productionOrders);
    setSmsConfig(loadedData.smsConfig);

    // 4. Update active ID and mirror to localStorage
    setActiveBusinessId(targetBusinessId);
    localStorage.setItem('active_business_id', targetBusinessId);

    // Mirror to gym_* for cross-compatibility
    try {
      localStorage.setItem('gym_customers', JSON.stringify(loadedData.customers));
      localStorage.setItem('gym_inventory', JSON.stringify(loadedData.inventory));
      localStorage.setItem('gym_leads', JSON.stringify(loadedData.leads));
      localStorage.setItem('gym_quotes', JSON.stringify(loadedData.quotes));
      localStorage.setItem('gym_invoices', JSON.stringify(loadedData.invoices));
      localStorage.setItem('gym_payments', JSON.stringify(loadedData.payments));
      localStorage.setItem('gym_sms_config', JSON.stringify(loadedData.smsConfig));
    } catch (e) {}

    showNotification(`Switched to "${targetBiz.name}"!`, 'success');
  };

  // Keep workspace locked to user's assigned business
  useEffect(() => {
    if (user?.businessId && user.businessId !== 'all') {
      if (activeBusinessId !== user.businessId) {
        switchBusiness(user.businessId);
      }
    }
  }, [user?.businessId, activeBusinessId]);

  // Listen for external business switches (e.g. from Login screen)
  useEffect(() => {
    const handleBizChanged = (e) => {
      const targetId = e?.detail || localStorage.getItem('active_business_id');
      if (user?.businessId && user.businessId !== 'all' && user.businessId !== targetId) {
        return;
      }
      if (targetId && targetId !== activeBusinessId) {
        switchBusiness(targetId);
      }
    };
    window.addEventListener('active_business_changed', handleBizChanged);
    return () => window.removeEventListener('active_business_changed', handleBizChanged);
  }, [activeBusinessId, switchBusiness, user?.businessId]);

  const addBusiness = ({ name, category, tagline, color, icon }) => {
    const newId = `biz_${Date.now()}`;
    const newBiz = {
      id: newId,
      name,
      category: category || 'General',
      tagline: tagline || `${name} Operations`,
      color: color || '#4f46e5',
      icon: icon || 'Building2',
      createdAt: new Date().toISOString()
    };
    const updated = [...businesses, newBiz];
    setBusinesses(updated);
    localStorage.setItem('app_businesses', JSON.stringify(updated));

    // Initialize clean empty data for this business
    const emptyConfig = {
      ...DEFAULT_SMS_CONFIG,
      companyName: name,
      dashboardName: name,
      pdfFooterText: `Thank you for your business. ${name}.`,
      pdfNotes: `Computer-generated document by ${name} Management System.`
    };
    try {
      localStorage.setItem(`biz_data_${newId}_customers`, JSON.stringify([]));
      localStorage.setItem(`biz_data_${newId}_inventory`, JSON.stringify([]));
      localStorage.setItem(`biz_data_${newId}_leads`, JSON.stringify([]));
      localStorage.setItem(`biz_data_${newId}_quotes`, JSON.stringify([]));
      localStorage.setItem(`biz_data_${newId}_invoices`, JSON.stringify([]));
      localStorage.setItem(`biz_data_${newId}_smsConfig`, JSON.stringify(emptyConfig));
    } catch (e) {}

    showNotification(`Created business profile "${name}"!`, 'success');
    return newId;
  };

  const updateBusiness = (id, updates) => {
    const updated = businesses.map(b => b.id === id ? { ...b, ...updates } : b);
    setBusinesses(updated);
    localStorage.setItem('app_businesses', JSON.stringify(updated));
    showNotification('Updated business profile');
  };

  const deleteBusiness = (id) => {
    if (businesses.length <= 1) {
      showNotification('Cannot delete the only business profile', 'error');
      return;
    }
    const updated = businesses.filter(b => b.id !== id);
    setBusinesses(updated);
    localStorage.setItem('app_businesses', JSON.stringify(updated));
    if (activeBusinessId === id) {
      switchBusiness(updated[0].id);
    }
    showNotification('Business profile deleted', 'warning');
  };

  // Change tracking: count actual state changes after hydration and initial cloud load
  const isHydratingCloudRef = useRef(false);
  const dataVersionRef = useRef(0);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    // Increment change counter
    dataVersionRef.current += 1;

    // Skip the first 2 renders (mount + initial load) and whenever cloud is actively hydrating
    if (dataVersionRef.current <= 2 || isHydratingCloudRef.current) {
      return;
    }

    // Auto-save: sync to cloud in background without requiring manual user button clicks
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      syncAllToCloud(true);
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [customers, inventory, invoices, quotes, leads, expenses, fixedAssets, payments, tasks, smsConfig]);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gym_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [notification, setNotification] = useState(null);
  
  // Realtime System Notifications (for Bell)
  const [systemNotifications, setSystemNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_system_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gym_system_notifications', JSON.stringify(systemNotifications.slice(0, 50)));
    } catch (e) {}
  }, [systemNotifications]);

  const addNotification = (notif) => {
    const newNotif = {
      id: notif.id || uuidv4(),
      type: notif.type || 'info', // 'success' | 'warning' | 'error' | 'info'
      title: notif.title || 'Notification',
      message: notif.message || '',
      link: notif.link || '',
      time: notif.time || new Date().toISOString(),
      read: false,
      metadata: notif.metadata || {}
    };
    setSystemNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)].slice(0, 50));
    return newNotif;
  };

  const markNotificationRead = (id) => {
    setSystemNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markNotificationsRead = () => {
    setSystemNotifications([]);
    try { localStorage.removeItem('gym_system_notifications'); } catch (e) {}
  };

  const [teamMembers, setTeamMembers] = useState(() => {
    const saved = localStorage.getItem('gym_team_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          let updated = false;
          DEFAULT_APP_TEAM_MEMBERS.forEach(def => {
            const exists = merged.some(m => m.email?.trim().toLowerCase() === def.email.toLowerCase());
            if (!exists) {
              merged.push(def);
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem('gym_team_members', JSON.stringify(merged));
          }
          return merged;
        }
      } catch (e) {}
    }
    return DEFAULT_APP_TEAM_MEMBERS;
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
    const assignedBusinessId = data.businessId || activeBusinessId || 'biz_main';
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
      businessId: assignedBusinessId,
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

    // NOTE: We intentionally do NOT call supabase.auth.signUp() here because it
    // would hijack the current admin's Supabase session via onAuthStateChange.
    // Team members are managed locally via localStorage. Cloud auth registration
    // happens separately if the user signs up through the login page.

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
    try {
      localStorage.removeItem('biz_data_biz_main_erased');
      localStorage.removeItem(`biz_data_${activeBusinessId}_erased`);
    } catch (e) {}

    if (activeBusinessId === 'biz_hairpins') {
      loadHairPinIndustryDefaults();
      return;
    }

    setCustomers(sampleMainCustomers);
    setInventory(sampleMainInventory);
    setLeads(sampleMainLeads);
    setQuotes(sampleMainQuotes);
    setInvoices(sampleMainInvoices);
    setExpenses(sampleMainExpenses);
    setPayments(sampleMainPayments);
    setFixedAssets(sampleMainFixedAssets);
    setJournalEntries(sampleMainJournalEntries);
    setJournalLines(sampleMainJournalLines);
    setSuppliers(sampleMainSuppliers);
    setPurchaseOrders(sampleMainPurchaseOrders);
    setBoms(sampleMainBOMs.map(normalizeBOM));
    setProductionOrders(sampleMainProductionOrders.map(normalizeProductionOrder));
    setSmsConfig(DEFAULT_MAIN_SMS_CONFIG);

    try {
      localStorage.setItem('biz_data_biz_main_customers', JSON.stringify(sampleMainCustomers));
      localStorage.setItem('biz_data_biz_main_inventory', JSON.stringify(sampleMainInventory));
      localStorage.setItem('biz_data_biz_main_leads', JSON.stringify(sampleMainLeads));
      localStorage.setItem('biz_data_biz_main_quotes', JSON.stringify(sampleMainQuotes));
      localStorage.setItem('biz_data_biz_main_invoices', JSON.stringify(sampleMainInvoices));
      localStorage.setItem('biz_data_biz_main_expenses', JSON.stringify(sampleMainExpenses));
      localStorage.setItem('biz_data_biz_main_payments', JSON.stringify(sampleMainPayments));
      localStorage.setItem('biz_data_biz_main_fixedAssets', JSON.stringify(sampleMainFixedAssets));
      localStorage.setItem('biz_data_biz_main_journalEntries', JSON.stringify(sampleMainJournalEntries));
      localStorage.setItem('biz_data_biz_main_journalLines', JSON.stringify(sampleMainJournalLines));
      localStorage.setItem('biz_data_biz_main_suppliers', JSON.stringify(sampleMainSuppliers));
      localStorage.setItem('biz_data_biz_main_purchaseOrders', JSON.stringify(sampleMainPurchaseOrders));
      localStorage.setItem('biz_data_biz_main_boms', JSON.stringify(sampleMainBOMs));
      localStorage.setItem('biz_data_biz_main_productionOrders', JSON.stringify(sampleMainProductionOrders));
      localStorage.setItem('biz_data_biz_main_smsConfig', JSON.stringify(DEFAULT_MAIN_SMS_CONFIG));
    } catch (e) {}

    showNotification('Loaded Seynex Enterprises demo dataset successfully!', 'success');
  };

  const loadHairPinIndustryDefaults = () => {
    try {
      localStorage.removeItem('biz_data_biz_hairpins_erased');
      localStorage.removeItem(`biz_data_${activeBusinessId}_erased`);
    } catch (e) {}

    setCustomers(sampleCustomers);
    setInventory(sampleInventory);
    setLeads(sampleLeads);
    setQuotes(sampleQuotes);
    setInvoices(sampleInvoices);
    setExpenses(sampleExpenses);
    setPayments(sampleHairPinsPayments);
    setFixedAssets(sampleFixedAssets);
    setJournalEntries(sampleJournalEntries);
    setJournalLines(sampleJournalLines);
    setSuppliers(sampleSuppliers);
    setPurchaseOrders(samplePurchaseOrders);
    setBoms(sampleBOMs.map(normalizeBOM));
    setProductionOrders(sampleProductionOrders.map(normalizeProductionOrder));
    setSmsConfig(DEFAULT_HAIRPINS_SMS_CONFIG);

    try {
      localStorage.setItem('biz_data_biz_hairpins_customers', JSON.stringify(sampleCustomers));
      localStorage.setItem('biz_data_biz_hairpins_inventory', JSON.stringify(sampleInventory));
      localStorage.setItem('biz_data_biz_hairpins_leads', JSON.stringify(sampleLeads));
      localStorage.setItem('biz_data_biz_hairpins_quotes', JSON.stringify(sampleQuotes));
      localStorage.setItem('biz_data_biz_hairpins_invoices', JSON.stringify(sampleInvoices));
      localStorage.setItem('biz_data_biz_hairpins_expenses', JSON.stringify(sampleExpenses));
      localStorage.setItem('biz_data_biz_hairpins_payments', JSON.stringify(sampleHairPinsPayments));
      localStorage.setItem('biz_data_biz_hairpins_fixedAssets', JSON.stringify(sampleFixedAssets));
      localStorage.setItem('biz_data_biz_hairpins_journalEntries', JSON.stringify(sampleJournalEntries));
      localStorage.setItem('biz_data_biz_hairpins_journalLines', JSON.stringify(sampleJournalLines));
      localStorage.setItem('biz_data_biz_hairpins_suppliers', JSON.stringify(sampleSuppliers));
      localStorage.setItem('biz_data_biz_hairpins_purchaseOrders', JSON.stringify(samplePurchaseOrders));
      localStorage.setItem('biz_data_biz_hairpins_boms', JSON.stringify(sampleBOMs));
      localStorage.setItem('biz_data_biz_hairpins_productionOrders', JSON.stringify(sampleProductionOrders));
      localStorage.setItem('biz_data_biz_hairpins_smsConfig', JSON.stringify(DEFAULT_HAIRPINS_SMS_CONFIG));
    } catch (e) {}

    setHasUnsavedChanges(true);
    showNotification('🏭 Loaded Hair Pin Manufacturing & Wholesale Catalog successfully!', 'success');
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
          items: quote.items || [],
          // Explicit invoice link fields — critical for SharedDocument status resolution
          converted_invoice_id: quote.convertedInvoiceId || null,
          converted_invoice_number: quote.convertedInvoiceNumber || null,
          sent_at: quote.sentAt || null,
          accepted_at: quote.acceptedAt || null
        }, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync] Quote Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date().toISOString());
        setHasUnsavedChanges(false);
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

      // Clean core payload strictly matching columns verified in remote Supabase
      const cleanCorePayload = {
        id: toUuid(invoice.id),
        user_id: effId,
        share_key: invoice.shareKey || generateShareKey(),
        invoice_number: invoice.invoiceNumber || 'INV-1001',
        date: invoice.date || new Date().toISOString().split('T')[0],
        due_date: invoice.dueDate || null,
        customer_id: isUuid(invoice.customerId) ? invoice.customerId : null,
        prospect_name: invoice.prospectName || customers.find(c => c.id === invoice.customerId)?.gymName || '',
        amount: Number(invoice.amount) || 0,
        status: invoice.status || 'Draft',
        items: Array.isArray(invoice.items) ? invoice.items : [],
        reminder_sent: !!invoice.reminderSent
      };

      // Extended payload including optional relational fields
      const extendedPayload = {
        ...cleanCorePayload,
        notes: invoice.notes || '',
        quote_ref: invoice.quoteRef || invoice.quotationNumber || null,
        quotation_number: invoice.quotationNumber || invoice.quoteRef || null,
        installment_plan: invoice.installmentPlan || {},
        quotation_id: isUuid(invoice.quotationId) ? invoice.quotationId : null
      };

      let { error } = await supabase
        .from('invoices')
        .upsert(extendedPayload, { onConflict: 'id' });

      // If extended columns do not exist in the remote database, immediately fallback to clean core schema
      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        const cleanRes = await supabase
          .from('invoices')
          .upsert(cleanCorePayload, { onConflict: 'id' });
        error = cleanRes.error;
      }

      if (error) {
        console.warn('[Supabase Sync] Invoice Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date().toISOString());
        setHasUnsavedChanges(false);
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
          business_id: customer.businessId || activeBusinessId,
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
      const notesPayload = JSON.stringify({
        notesText: typeof lead.notes === 'string' ? lead.notes : '',
        comments: Array.isArray(lead.comments) ? lead.comments : [],
        lastActionDate: lead.lastActionDate || lead.date || null,
        nextActionDate: lead.nextActionDate || null,
        nextActionNote: lead.nextActionNote || '',
        contactPerson: lead.contactPerson || lead.prospectName || ''
      });

      const { error } = await supabase
        .from('leads')
        .upsert({
          id: toUuid(lead.id),
          user_id: effId,
          address: lead.address || '',
          gym_name: lead.gymName || 'Lead Gym',
          prospect_name: lead.contactPerson || lead.prospectName || lead.name || '',
          phone: lead.phone || '',
          status: lead.status || 'New',
          date: lead.date || new Date().toISOString(),
          notes: notesPayload
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
    const newExpense = { 
      ...expense, 
      id: expense.id || uuidv4(),
      businessId: expense.businessId || activeBusinessId 
    };
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
    const client = getSupabaseClient(activeBusinessId);
    try {
      const payload = {
        id: toUuid(task.id),
        user_id: user.id,
        business_id: activeBusinessId,
        title: task.title,
        description: task.description || '',
        due_date: task.dueDate || null,
        status: task.status || 'Pending',
        priority: task.priority || 'Normal',
        related_to: task.relatedTo || '',
        related_id: task.relatedId || '',
        reminder_date: task.reminderDate || null,
        reminder_time: task.reminderTime || null
      };

      let res = await client.from('tasks').upsert(payload);
      // Fallback if reminder columns don't exist on remote schema
      if (res.error && (res.error.code === '42703' || res.error.message?.includes('reminder'))) {
        delete payload.reminder_date;
        delete payload.reminder_time;
        res = await client.from('tasks').upsert(payload);
      }
      // Fallback if business_id column does not exist
      if (res.error && (res.error.code === '42703' || res.error.message?.includes('business_id'))) {
        delete payload.business_id;
        res = await client.from('tasks').upsert(payload);
      }
      if (res.error) console.warn('[Supabase Sync] Task Warning:', res.error.message);
    } catch (err) {
      console.warn('[Supabase Sync] Task Exception:', err.message);
    }
  };

  const addTask = async (task) => {
    const defaultTime = smsConfig.reminderClockTime || '09:00';
    const recipientPhone = task.recipientPhone || task.phone || smsConfig.adminPhone || smsConfig.companyPhone || '';
    const newTask = {
      ...task,
      id: task.id || uuidv4(),
      recipientPhone,
      reminderDate: task.reminderDate || task.dueDate || new Date().toISOString().split('T')[0],
      reminderTime: task.reminderTime || defaultTime,
      sendSmsReminder: task.sendSmsReminder !== false,
      createdAt: task.createdAt || new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    syncTaskToSupabase(newTask);
    addLog('Task', `Created task: ${newTask.title}`);
    showNotification(`Task "${newTask.title}" created!`, 'success');

    // Send SMS reminder notification via actual SMS gateway (sendDirectSMS) if enabled
    if (newTask.sendSmsReminder) {
      if (recipientPhone) {
        const dueInfo = newTask.dueDate ? ` (Due: ${newTask.dueDate})` : '';
        const reminderInfo = newTask.reminderDate ? ` Reminder: ${newTask.reminderDate} at ${newTask.reminderTime}.` : '';
        const smsMsg = `Task Alert [${smsConfig.companyName || 'Seynex'}]: "${newTask.title}"${dueInfo}.${reminderInfo}`;
        await sendDirectSMS(recipientPhone, smsMsg);
      } else {
        showNotification('Task created, but no phone number found to send SMS. Set Admin Phone in Settings or on the task.', 'warning');
      }
    }
  };

  const updateTask = (id, data) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    const current = tasks.find(t => t.id === id) || {};
    const updated = { ...current, ...data, id };
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
      let { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: effId,
          config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      // If foreign key constraint failed on user_id, fallback to system admin UUID
      if (error && error.code === '23503' && effId !== '76bb4580-2006-464f-aab8-64029dbe9540') {
        const fallbackRes = await supabase
          .from('user_profiles')
          .upsert({
            user_id: '76bb4580-2006-464f-aab8-64029dbe9540',
            config,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        error = fallbackRes.error;
      }

      // Also ensure all existing profiles have the latest company configuration so no stale row overrides it
      try {
        await supabase
          .from('user_profiles')
          .update({
            config,
            updated_at: new Date().toISOString()
          })
          .neq('user_id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        // Non-fatal if update fails
      }

      if (error) {
        console.warn('[Supabase Sync] Config Upsert Warning:', error.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncTime(new Date().toISOString());
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
    isHydratingCloudRef.current = true;
    
    try {
      const activeClient = getSupabaseClient(activeBusinessId);
      console.log(`[Supabase Multi-DB Sync] Fetching records for workspace "${activeBusinessId}" from database...`);

      const safeFetch = async (table, queryWithFilter, fallbackQuery) => {
        try {
          const { data, error } = await queryWithFilter;
          if (!error && Array.isArray(data)) {
            return data;
          }
          if (error && (error.code === '42703' || error.message?.includes('business_id'))) {
            const fallbackRes = await fallbackQuery;
            return fallbackRes.data || null;
          }
          if (error) {
            console.warn(`[Supabase Sync] Warning fetching ${table}:`, error.message);
          }
          return null;
        } catch (e) {
          console.warn(`[Supabase Sync] Exception fetching ${table}:`, e.message);
          return null;
        }
      };
      
      const fetchResults = await Promise.all([
        safeFetch('customers', activeClient.from('customers').select('*').eq('business_id', activeBusinessId), activeClient.from('customers').select('*')),
        safeFetch('inventory', activeClient.from('inventory').select('*').eq('business_id', activeBusinessId), activeClient.from('inventory').select('*')),
        safeFetch('quotations', activeClient.from('quotations').select('*').eq('business_id', activeBusinessId), activeClient.from('quotations').select('*')),
        safeFetch('invoices', activeClient.from('invoices').select('*').eq('business_id', activeBusinessId), activeClient.from('invoices').select('*')),
        safeFetch('leads', activeClient.from('leads').select('*').eq('business_id', activeBusinessId), activeClient.from('leads').select('*')),
        safeFetch('expenses', activeClient.from('expenses').select('*').eq('business_id', activeBusinessId), activeClient.from('expenses').select('*')),
        safeFetch('payments', activeClient.from('payments').select('*').eq('business_id', activeBusinessId), activeClient.from('payments').select('*')),
        safeFetch('tasks', activeClient.from('tasks').select('*').eq('business_id', activeBusinessId), activeClient.from('tasks').select('*')),
        safeFetch('fixed_assets', activeClient.from('fixed_assets').select('*').eq('business_id', activeBusinessId), activeClient.from('fixed_assets').select('*')),
        safeFetch('activity_logs', activeClient.from('activity_logs').select('*').eq('business_id', activeBusinessId).order('created_at', { ascending: false }).limit(200), activeClient.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)),
        safeFetch('user_profiles', activeClient.from('user_profiles').select('config, user_id, updated_at').order('updated_at', { ascending: false }).limit(5), activeClient.from('user_profiles').select('config, user_id, updated_at').order('updated_at', { ascending: false }).limit(5)),
        safeFetch('boms', activeClient.from('boms').select('*').eq('business_id', activeBusinessId), activeClient.from('boms').select('*')),
        safeFetch('production_orders', activeClient.from('production_orders').select('*').eq('business_id', activeBusinessId), activeClient.from('production_orders').select('*')),
        safeFetch('suppliers', activeClient.from('suppliers').select('*').eq('business_id', activeBusinessId), activeClient.from('suppliers').select('*')),
        safeFetch('purchase_orders', activeClient.from('purchase_orders').select('*').eq('business_id', activeBusinessId), activeClient.from('purchase_orders').select('*'))
      ]);

      const [cData, invData, qData, iData, lData, eData, pData, tData, faData, logData, profData, bomData, moData, supData, poData] = fetchResults;

      console.log('[Supabase Sync] Fetch results - Customers:', cData?.length ?? 'N/A', '| Invoices:', iData?.length ?? 'N/A', '| Quotes:', qData?.length ?? 'N/A');

      const isErased = localStorage.getItem(`biz_data_${activeBusinessId}_erased`) === 'true';
      const hasAnyRemoteData = (cData?.length > 0) || (invData?.length > 0) || (qData?.length > 0) || (iData?.length > 0) || (lData?.length > 0) || (eData?.length > 0) || (pData?.length > 0) || (tData?.length > 0);

      if (isErased) {
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
        setSuppliers([]);
        setPurchaseOrders([]);
        setBoms([]);
        setProductionOrders([]);
        setCloudSyncStatus('synced');
        setHasUnsavedChanges(false);
        setTimeout(() => {
          isHydratedRef.current = true;
          isHydratingCloudRef.current = false;
        }, 200);
        return;
      }

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
        try {
          localStorage.setItem('gym_fixed_assets', JSON.stringify(loadedAssets));
          localStorage.setItem(`biz_data_${activeBusinessId}_fixedAssets`, JSON.stringify(loadedAssets));
          localStorage.setItem(`biz_data_${activeBusinessId}_fixed_assets`, JSON.stringify(loadedAssets));
        } catch(e) {}
      }

      // 2. Company Config & Branding Profile
      let remoteConfig = null;
      if (Array.isArray(profData) && profData.length > 0) {
        const effId = getEffectiveUserId();
        const matched = profData.find(p => p.user_id === effId) || profData[0];
        remoteConfig = matched?.config;
      } else if (profData && typeof profData === 'object') {
        remoteConfig = profData.config;
      }

      if (remoteConfig && typeof remoteConfig === 'object' && Object.keys(remoteConfig).length > 0) {
        setSmsConfig(prev => {
          const merged = { ...prev, ...remoteConfig };
          try {
            localStorage.setItem('gym_sms_config', JSON.stringify(merged));
            localStorage.setItem(`biz_data_${activeBusinessId}_smsConfig`, JSON.stringify(merged));
            localStorage.setItem(`biz_data_${activeBusinessId}_sms_config`, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }

      // 3. Customers
      if (Array.isArray(cData)) {
        const isHp = activeBusinessId === 'biz_hairpins';
        const filteredCData = cData.filter(c => {
          if (c.business_id) return c.business_id === activeBusinessId;
          const cid = String(c.id || '');
          const gn = String(c.gym_name || c.name || '').toLowerCase();
          if (isHp) {
            if (cid.startsWith('mc-')) return false;
            if (gn.includes('apex global') || gn.includes('metro commercial') || gn.includes('horizon financial')) return false;
            return true;
          } else {
            if (cid.startsWith('c-10')) return false;
            if (gn.includes('fancy center') || gn.includes('bridal') || gn.includes('cosmetics') || gn.includes('salon chamari') || gn.includes('fashion corner')) return false;
            return true;
          }
        });

        if (filteredCData.length > 0) {
          const loadedCustomers = filteredCData.map(c => ({
            id: c.id,
            businessId: c.business_id || activeBusinessId,
            gymName: c.gym_name || c.gymName,
            name: c.name,
            email: c.email,
            phone: c.phone,
            dob: c.dob,
            purchaseDate: c.purchase_date || c.purchaseDate,
            renewalDate: c.renewal_date || c.renewalDate, 
            annualFee: Number(c.annual_fee || c.annualFee) || 0,
            status: c.status,
            notes: c.notes || []
          }));
          setCustomers(loadedCustomers);
          try {
            localStorage.setItem('gym_customers', JSON.stringify(loadedCustomers));
            localStorage.setItem(`biz_data_${activeBusinessId}_customers`, JSON.stringify(loadedCustomers));
          } catch(e) {}
        }
      }

      // 4. Inventory
      if (Array.isArray(invData)) {
        const isHp = activeBusinessId === 'biz_hairpins';
        const filteredInvData = invData.filter(i => {
          if (i.business_id) return i.business_id === activeBusinessId;
          const iid = String(i.id || '');
          const n = String(i.name || '').toLowerCase();
          if (isHp) {
            if (iid.startsWith('minv-')) return false;
            if (n.includes('cloud erp') || n.includes('sla & support') || n.includes('security gateway') || n.includes('backup storage')) return false;
            return true;
          } else {
            if (iid.startsWith('inv-10')) return false;
            if (n.includes('bobby pin') || n.includes('wave grip') || n.includes('u-pin') || n.includes('snap clip') || n.includes('wire') || n.includes('enamel')) return false;
            return true;
          }
        });

        if (filteredInvData.length > 0) {
          const loadedInventory = filteredInvData.map(i => ({
            id: i.id,
            businessId: i.business_id || activeBusinessId,
            name: i.name,
            type: i.item_type || i.type, 
            price: Number(i.price) || 0, 
            costPrice: Number(i.cost_price ?? i.costPrice ?? Math.round((Number(i.price) || 0) * 0.7)),
            reorderLevel: Number(i.reorder_level ?? i.reorderLevel ?? 5),
            stock: Number(i.stock) || 0, 
            desc: i.description || i.desc
          }));
          setInventory(loadedInventory);
          try {
            localStorage.setItem('gym_inventory', JSON.stringify(loadedInventory));
            localStorage.setItem(`biz_data_${activeBusinessId}_inventory`, JSON.stringify(loadedInventory));
          } catch(e) {}
        }
      }

      // 5. Quotations
      if (Array.isArray(qData)) {
        let localQuotes = [];
        try {
          localQuotes = JSON.parse(localStorage.getItem(`biz_data_${activeBusinessId}_quotes`) || localStorage.getItem('gym_quotes') || '[]');
        } catch (e) {}

        const loadedQuotes = qData.map(q => {
          const localMatch = localQuotes.find(lq => lq.id === q.id || lq.quoteNumber === q.quote_number);
          const matchedInv = Array.isArray(iData) ? iData.find(inv => 
            (inv.id && inv.id === q.converted_invoice_id) ||
            (inv.quotation_id && inv.quotation_id === q.id) ||
            (inv.quote_ref && inv.quote_ref === q.quote_number) ||
            (inv.quotation_number && inv.quotation_number === q.quote_number)
          ) : null;

          const finalConvNum = q.converted_invoice_number || localMatch?.convertedInvoiceNumber || matchedInv?.invoice_number || null;
          const finalConvId = q.converted_invoice_id || localMatch?.convertedInvoiceId || matchedInv?.id || null;

          return {
            id: q.id,
            shareKey: q.share_key,
            quoteNumber: q.quote_number,
            date: q.date,
            prospectName: q.prospect_name,
            prospectPhone: q.prospect_phone,
            amount: Number(q.amount) || 0,
            status: q.status || localMatch?.status || 'Pending',
            items: q.items || localMatch?.items || [],
            validUntil: q.valid_until || localMatch?.validUntil || null,
            agreementTerms: q.agreement_terms || localMatch?.agreementTerms || '',
            counterOffers: q.counter_offers || localMatch?.counterOffers || [],
            acceptedAt: q.accepted_at || localMatch?.acceptedAt || null,
            convertedInvoiceNumber: finalConvNum,
            convertedInvoiceId: finalConvId,
            sentAt: q.sent_at || localMatch?.sentAt || null
          };
        });

        // Merge any local quotes created offline or before sync
        const remoteQIds = new Set(loadedQuotes.map(q => q.id));
        const remoteQNumbers = new Set(loadedQuotes.map(q => q.quoteNumber));
        const unSyncedLocalQuotes = localQuotes.filter(lq => lq && lq.id && !remoteQIds.has(lq.id) && !remoteQNumbers.has(lq.quoteNumber));
        const mergedQuotes = [...loadedQuotes, ...unSyncedLocalQuotes];

        setQuotes(mergedQuotes);
        try {
          localStorage.setItem('gym_quotes', JSON.stringify(mergedQuotes));
          localStorage.setItem(`biz_data_${activeBusinessId}_quotes`, JSON.stringify(mergedQuotes));
        } catch(e) {}
      }

      // 6. Invoices
      if (Array.isArray(iData)) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        // Retrieve existing local cache to prevent data loss of local-only attributes
        let localInvoices = [];
        try {
          localInvoices = JSON.parse(localStorage.getItem(`biz_data_${activeBusinessId}_invoices`) || localStorage.getItem('gym_invoices') || '[]');
        } catch (e) {}

        const isHp = activeBusinessId === 'biz_hairpins';
        const filteredIData = iData.filter(inv => {
          if (inv.business_id) return inv.business_id === activeBusinessId;
          const iid = String(inv.id || '');
          const p = String(inv.prospect_name || '').toLowerCase();
          if (isHp) {
            if (iid.startsWith('minv-')) return false;
            if (p.includes('apex global') || p.includes('metro commercial') || p.includes('horizon financial')) return false;
            return true;
          } else {
            if (iid.startsWith('inv-20')) return false;
            if (p.includes('fancy center') || p.includes('bridal') || p.includes('cosmetics') || p.includes('salon chamari')) return false;
            return true;
          }
        });

        const loadedInvoices = filteredIData.map(inv => {
          const localMatch = localInvoices.find(li => li.id === inv.id || li.invoiceNumber === inv.invoice_number);
          
          // Strict quotation reference matching
          const matchingQuote = Array.isArray(qData) ? qData.find(q => 
            q.converted_invoice_id === inv.id || 
            q.converted_invoice_number === inv.invoice_number ||
            (localMatch?.quoteRef && q.quote_number === localMatch.quoteRef) ||
            (inv.quote_ref && q.quote_number === inv.quote_ref) ||
            (inv.quotation_id && q.id === inv.quotation_id)
          ) : null;

          let parsed = {
            id: inv.id,
            businessId: inv.business_id || activeBusinessId,
            shareKey: inv.share_key,
            invoiceNumber: inv.invoice_number,
            date: inv.date,
            dueDate: inv.due_date,
            customerId: inv.customer_id || localMatch?.customerId || 'unknown',
            amount: Number(inv.amount) || 0,
            status: inv.status,
            items: inv.items || localMatch?.items || [],
            prospectName: inv.prospect_name || localMatch?.prospectName || '',
            reminderSent: inv.reminder_sent,
            installmentPlan: (inv.installment_plan && inv.installment_plan.enabled) 
              ? inv.installment_plan 
              : (localMatch?.installmentPlan || null),
            quoteRef: inv.quote_ref || localMatch?.quoteRef || matchingQuote?.quote_number || null,
            quotationNumber: inv.quotation_number || localMatch?.quotationNumber || matchingQuote?.quote_number || null,
            notes: inv.notes || localMatch?.notes || ''
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

        // Merge any local invoices that were created locally but haven't synced to remote yet
        const remoteIds = new Set(loadedInvoices.map(i => i.id));
        const remoteNumbers = new Set(loadedInvoices.map(i => i.invoiceNumber));
        const unSyncedLocalInvoices = localInvoices.filter(li => li && li.id && !remoteIds.has(li.id) && !remoteNumbers.has(li.invoiceNumber));
        const mergedInvoices = [...loadedInvoices, ...unSyncedLocalInvoices];

        setInvoices(mergedInvoices);
        try {
          localStorage.setItem('gym_invoices', JSON.stringify(mergedInvoices));
          localStorage.setItem(`biz_data_${activeBusinessId}_invoices`, JSON.stringify(mergedInvoices));
        } catch(e) {}
      }

      // 7. Leads
      if (Array.isArray(lData)) {
        let localLeads = [];
        try {
          localLeads = JSON.parse(localStorage.getItem(`biz_data_${activeBusinessId}_leads`) || localStorage.getItem('gym_leads') || '[]');
        } catch (e) {}

        const loadedLeads = lData.map(l => {
          const localMatch = localLeads.find(ll => ll.id === l.id);
          let comments = localMatch?.comments || [];
          let lastActionDate = localMatch?.lastActionDate || l.date || null;
          let nextActionDate = localMatch?.nextActionDate || null;
          let nextActionNote = localMatch?.nextActionNote || '';
          let notesText = typeof l.notes === 'string' ? l.notes : '';
          let contactPerson = l.prospect_name || localMatch?.contactPerson || '';

          if (notesText && notesText.startsWith('{') && notesText.includes('"comments"')) {
            try {
              const parsed = JSON.parse(notesText);
              if (Array.isArray(parsed.comments)) comments = parsed.comments;
              if (parsed.lastActionDate) lastActionDate = parsed.lastActionDate;
              if (parsed.nextActionDate) nextActionDate = parsed.nextActionDate;
              if (parsed.nextActionNote) nextActionNote = parsed.nextActionNote;
              if (parsed.contactPerson) contactPerson = parsed.contactPerson;
              notesText = parsed.notesText || '';
            } catch (e) {}
          }

          return {
            id: l.id,
            gymName: l.gym_name,
            contactPerson: contactPerson,
            prospectName: contactPerson,
            phone: l.phone || localMatch?.phone || '',
            email: localMatch?.email || '',
            status: l.status || localMatch?.status || 'New',
            date: l.date,
            notes: notesText || localMatch?.notes || '',
            comments: comments,
            lastActionDate: lastActionDate,
            nextActionDate: nextActionDate,
            nextActionNote: nextActionNote
          };
        });

        // Merge any local leads created offline or before sync
        const remoteLIds = new Set(loadedLeads.map(l => l.id));
        const unSyncedLocalLeads = localLeads.filter(ll => ll && ll.id && !remoteLIds.has(ll.id));
        const mergedLeads = [...loadedLeads, ...unSyncedLocalLeads];

        setLeads(mergedLeads);
        try {
          localStorage.setItem('gym_leads', JSON.stringify(mergedLeads));
          localStorage.setItem(`biz_data_${activeBusinessId}_leads`, JSON.stringify(mergedLeads));
        } catch(e) {}
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
        try {
          localStorage.setItem('gym_expenses', JSON.stringify(loadedExpenses));
          localStorage.setItem(`biz_data_${activeBusinessId}_expenses`, JSON.stringify(loadedExpenses));
        } catch(e) {}
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
        try {
          localStorage.setItem('gym_payments', JSON.stringify(loadedPayments));
          localStorage.setItem(`biz_data_${activeBusinessId}_payments`, JSON.stringify(loadedPayments));
        } catch(e) {}
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
        try {
          localStorage.setItem('gym_tasks', JSON.stringify(loadedTasks));
          localStorage.setItem(`biz_data_${activeBusinessId}_tasks`, JSON.stringify(loadedTasks));
        } catch(e) {}
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
        try {
          localStorage.setItem('gym_activity_logs', JSON.stringify(loadedLogs));
          localStorage.setItem(`biz_data_${activeBusinessId}_activity_logs`, JSON.stringify(loadedLogs));
        } catch(e) {}
      }

      // 12. Bill of Materials (BOMs)
      if (Array.isArray(bomData) && bomData.length > 0) {
        const loadedBoms = bomData.map(b => ({
          id: b.id,
          name: b.name,
          outputUnit: b.output_unit || 'Unit',
          batchYield: Number(b.output_qty) || 1,
          laborCost: Number(b.estimated_labor_cost) || 0,
          overheadCost: Number(b.estimated_overhead_cost) || 0,
          components: b.components || [],
          notes: b.notes || ''
        }));
        setBoms(loadedBoms);
        try { localStorage.setItem(`biz_data_${activeBusinessId}_boms`, JSON.stringify(loadedBoms)); } catch(e) {}
      }

      // 13. Production Orders
      if (Array.isArray(moData) && moData.length > 0) {
        const loadedMOs = moData.map(m => ({
          id: m.id,
          orderNumber: m.mo_number,
          bomId: m.bom_id,
          productName: m.bom_name,
          quantity: Number(m.target_qty) || 100,
          status: m.status || 'Scheduled',
          startDate: m.start_date,
          dueDate: m.due_date,
          totalCost: Number(m.total_cost) || 0,
          notes: m.notes || ''
        }));
        setProductionOrders(loadedMOs);
        try { localStorage.setItem(`biz_data_${activeBusinessId}_productionOrders`, JSON.stringify(loadedMOs)); } catch(e) {}
      }

      // 14. Suppliers
      if (Array.isArray(supData) && supData.length > 0) {
        const loadedSuppliers = supData.map(s => ({
          id: s.id,
          name: s.name,
          contactPerson: s.contact_person,
          email: s.email,
          phone: s.phone,
          address: s.address,
          category: s.category || 'Supplies',
          paymentTerms: s.payment_terms || 'Net 30',
          status: s.status || 'Active'
        }));
        setSuppliers(loadedSuppliers);
        try { localStorage.setItem(`biz_data_${activeBusinessId}_suppliers`, JSON.stringify(loadedSuppliers)); } catch(e) {}
      }

      // 15. Purchase Orders
      if (Array.isArray(poData) && poData.length > 0) {
        const loadedPOs = poData.map(p => ({
          id: p.id,
          poNumber: p.po_number,
          supplierId: p.supplier_id,
          supplierName: p.supplier_name,
          date: p.date,
          expectedDelivery: p.expected_delivery_date,
          status: p.status || 'Draft',
          items: p.items || [],
          totalAmount: Number(p.total_amount) || 0,
          paymentTerms: p.payment_terms || 'Net 30',
          notes: p.notes || ''
        }));
        setPurchaseOrders(loadedPOs);
        try { localStorage.setItem(`biz_data_${activeBusinessId}_purchaseOrders`, JSON.stringify(loadedPOs)); } catch(e) {}
      }

      const syncTimeStr = new Date().toISOString();
      setLastSyncTime(syncTimeStr);
      try { localStorage.setItem('gym_last_sync_time', syncTimeStr); } catch(e) {}
      setCloudSyncStatus('synced');
      setHasUnsavedChanges(false);
      setTimeout(() => { 
        isHydratedRef.current = true; 
        isHydratingCloudRef.current = false;
        setHasUnsavedChanges(false);
      }, 300);
      console.log('[Supabase Sync] Cloud data hydration completed successfully.');
    } catch (err) {
      console.error('[Supabase Sync] Global Fetch Exception:', err);
      setCloudSyncStatus('error');
    } finally {
      setIsStoreLoading(false);
      setTimeout(() => { isHydratingCloudRef.current = false; }, 400);
    }
  };

  // PUSH ALL LOCAL DATA TO SUPABASE CLOUD (MANUAL OR AUTO INITIAL SYNC)
  const syncAllToCloud = async (isSilent = false) => {
    setCloudSyncStatus('syncing');
    if (!isSilent) showNotification(`Saving ${activeBusiness?.name || 'Workspace'} records to cloud database...`, 'info');
    const effId = getEffectiveUserId();
    const activeClient = getSupabaseClient(activeBusinessId);

    try {
      let savedCount = 0;
      let rlsBlocked = false;
      let firstError = null;

      const safeUpsertBatch = async (table, records, onConflict = 'id') => {
        if (!records || records.length === 0) return true;
        try {
          const payloadWithBiz = records.map(r => ({ ...r, business_id: activeBusinessId }));
          let res = await activeClient.from(table).upsert(payloadWithBiz, { onConflict });

          // If foreign key constraint failed on user_id, retry without user_id
          if (res.error && res.error.code === '23503') {
            const fallback = payloadWithBiz.map(r => {
              const copy = { ...r };
              delete copy.user_id;
              return copy;
            });
            res = await activeClient.from(table).upsert(fallback, { onConflict });
          }

          // If business_id column not present on remote schema yet, retry without business_id
          if (res.error && (res.error.code === '42703' || res.error.message?.includes('business_id'))) {
            res = await activeClient.from(table).upsert(records, { onConflict });
          }

          if (res.error) {
            if (res.error.code === '42501' || res.error.message?.includes('row-level security')) {
              rlsBlocked = true;
            }
            if (!firstError) firstError = `${table}: ${res.error.message}`;
            console.warn(`[Supabase Save Warning on ${table}]`, res.error.message);
            return false;
          }
          savedCount += records.length;
          return true;
        } catch (e) {
          console.warn(`[Supabase Save Exception on ${table}]`, e.message);
          if (!firstError) firstError = `${table}: ${e.message}`;
          return false;
        }
      };

      const customerRecords = (customers || []).map(c => ({
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
      }));

      const inventoryRecords = (inventory || []).map(item => ({
        id: toUuid(item.id),
        user_id: effId,
        name: item.name,
        item_type: item.type || 'Equipment',
        price: Number(item.price) || 0,
        cost_price: Number(item.costPrice) || 0,
        reorder_level: Number(item.reorderLevel) || 5,
        stock: Number(item.stock) || 0,
        description: item.desc || ''
      }));

      const quoteRecords = (quotes || []).map(q => ({
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
      }));

      const invoiceRecords = (invoices || []).map(inv => ({
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
      }));

      const leadRecords = (leads || []).map(l => ({
        id: toUuid(l.id),
        user_id: effId,
        gym_name: l.gymName || 'Lead Gym',
        prospect_name: l.prospectName || l.name || '',
        phone: l.phone || '',
        status: l.status || 'New',
        date: l.date || new Date().toISOString(),
        notes: l.notes || ''
      }));

      const expenseRecords = (expenses || []).map(e => ({
        id: toUuid(e.id),
        user_id: effId,
        category: e.category || 'Operational',
        amount: Number(e.amount) || 0,
        date: e.date || new Date().toISOString().split('T')[0],
        description: e.description || ''
      }));

      const fixedAssetRecords = (fixedAssets || []).map(fa => ({
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
      }));

      const paymentRecords = (payments || []).map(p => ({
        id: toUuid(p.id),
        user_id: effId,
        customer_id: isUuid(p.customerId) ? p.customerId : null,
        document_id: isUuid(p.documentId) ? p.documentId : null,
        amount: Number(p.amount) || 0,
        payment_type: p.type || 'Cash',
        payment_timestamp: p.timestamp || new Date().toISOString()
      }));

      const taskRecords = (tasks || []).map(t => ({
        id: toUuid(t.id),
        user_id: effId,
        title: t.title || 'Task',
        description: t.description || '',
        due_date: t.dueDate || null,
        status: t.status || 'Pending',
        priority: t.priority || 'Medium',
        related_to: t.relatedTo || '',
        related_id: t.relatedId || ''
      }));

      const logRecords = (activityLogs || []).slice(0, 50).map(l => ({
        id: toUuid(l.id),
        user_id: effId,
        log_type: l.type || 'System',
        message: l.message || '',
        details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || ''),
        log_timestamp: l.timestamp || new Date().toISOString()
      }));

      const supplierRecords = (suppliers || []).map(s => ({
        id: toUuid(s.id),
        name: s.name || '',
        contact_person: s.contactPerson || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        category: s.category || 'Supplies',
        payment_terms: s.paymentTerms || 'Net 30',
        status: s.status || 'Active'
      }));

      const poRecords = (purchaseOrders || []).map(po => ({
        id: toUuid(po.id),
        po_number: po.poNumber || 'PO-1001',
        supplier_id: isUuid(po.supplierId) ? po.supplierId : null,
        supplier_name: po.supplierName || '',
        date: po.date || new Date().toISOString().split('T')[0],
        expected_delivery_date: po.expectedDelivery || null,
        status: po.status || 'Draft',
        items: po.items || [],
        total_amount: Number(po.totalAmount) || 0,
        payment_terms: po.paymentTerms || 'Net 30',
        notes: po.notes || ''
      }));

      const bomRecords = (boms || []).map(b => ({
        id: toUuid(b.id),
        user_id: effId,
        name: b.name || 'BOM Specification',
        output_unit: b.outputUnit || 'Unit',
        output_qty: Number(b.batchYield) || 1,
        estimated_labor_cost: Number(b.laborCost) || 0,
        estimated_overhead_cost: Number(b.overheadCost) || 0,
        components: b.components || [],
        notes: b.notes || ''
      }));

      const prodOrderRecords = (productionOrders || []).map(mo => ({
        id: toUuid(mo.id),
        user_id: effId,
        mo_number: mo.orderNumber || 'MO-1001',
        bom_id: isUuid(mo.bomId) ? mo.bomId : null,
        bom_name: mo.productName || '',
        target_qty: Number(mo.quantity) || 100,
        status: mo.status || 'Scheduled',
        start_date: mo.startDate || null,
        due_date: mo.dueDate || null,
        total_cost: Number(mo.totalCost) || 0,
        notes: mo.notes || ''
      }));

      // Execute all table upserts in parallel batches for maximum speed (50x faster)
      await Promise.allSettled([
        safeUpsertBatch('customers', customerRecords),
        safeUpsertBatch('inventory', inventoryRecords),
        safeUpsertBatch('quotations', quoteRecords),
        safeUpsertBatch('invoices', invoiceRecords),
        safeUpsertBatch('leads', leadRecords),
        safeUpsertBatch('expenses', expenseRecords),
        safeUpsertBatch('fixed_assets', fixedAssetRecords),
        safeUpsertBatch('payments', paymentRecords),
        safeUpsertBatch('tasks', taskRecords),
        safeUpsertBatch('activity_logs', logRecords),
        safeUpsertBatch('suppliers', supplierRecords),
        safeUpsertBatch('purchase_orders', poRecords),
        safeUpsertBatch('boms', bomRecords),
        safeUpsertBatch('production_orders', prodOrderRecords),
        safeUpsertBatch('user_profiles', [{
          user_id: effId,
          config: smsConfig,
          updated_at: new Date().toISOString()
        }], 'user_id')
      ]);

      // Also ensure all existing profiles have the latest config
      try {
        await supabase.from('user_profiles').update({
          config: smsConfig,
          updated_at: new Date().toISOString()
        }).neq('user_id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {}

      // Mirror to active business partition
      try {
        localStorage.setItem(`biz_data_${activeBusinessId}_customers`, JSON.stringify(customers));
        localStorage.setItem(`biz_data_${activeBusinessId}_inventory`, JSON.stringify(inventory));
        localStorage.setItem(`biz_data_${activeBusinessId}_quotes`, JSON.stringify(quotes));
        localStorage.setItem(`biz_data_${activeBusinessId}_invoices`, JSON.stringify(invoices));
        localStorage.setItem(`biz_data_${activeBusinessId}_leads`, JSON.stringify(leads));
        localStorage.setItem(`biz_data_${activeBusinessId}_expenses`, JSON.stringify(expenses));
        localStorage.setItem(`biz_data_${activeBusinessId}_payments`, JSON.stringify(payments));
        localStorage.setItem(`biz_data_${activeBusinessId}_fixedAssets`, JSON.stringify(fixedAssets));
        localStorage.setItem(`biz_data_${activeBusinessId}_tasks`, JSON.stringify(tasks));
        localStorage.setItem(`biz_data_${activeBusinessId}_suppliers`, JSON.stringify(suppliers));
        localStorage.setItem(`biz_data_${activeBusinessId}_purchaseOrders`, JSON.stringify(purchaseOrders));
        localStorage.setItem(`biz_data_${activeBusinessId}_boms`, JSON.stringify(boms));
        localStorage.setItem(`biz_data_${activeBusinessId}_productionOrders`, JSON.stringify(productionOrders));
        localStorage.setItem(`biz_data_${activeBusinessId}_smsConfig`, JSON.stringify(smsConfig));
      } catch (e) {}

      if (rlsBlocked) {
        setCloudSyncStatus('error');
        showNotification('Supabase blocked save (Row Level Security is ON). Go to Settings → Cloud Sync for the quick SQL fix.', 'error', 10000);
        return { success: false, rlsBlocked: true };
      }

      const syncTimeStr = new Date().toISOString();
      setLastSyncTime(syncTimeStr);
      try { localStorage.setItem('gym_last_sync_time', syncTimeStr); } catch (e) {}
      setCloudSyncStatus('synced');
      setHasUnsavedChanges(false);
      if (!isSilent) showNotification(`Data Saved! ${savedCount} records saved to Supabase cloud.`, 'success');
      return { success: true, count: savedCount };
    } catch (err) {
      console.error('[Cloud Save Error]', err);
      setCloudSyncStatus('error');
      if (!isSilent) showNotification(`Save error: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  };

  // EXECUTE DELETION OF ALL DATA BOTH LOCALLY AND IN CLOUD
  const executeResetEverything = async () => {
    setIsStoreLoading(true);
    setCloudSyncStatus('syncing');
    isHydratingCloudRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const defaultConfig = activeBusinessId === 'biz_hairpins' ? DEFAULT_HAIRPINS_SMS_CONFIG : DEFAULT_MAIN_SMS_CONFIG;

    // 1. IMMEDIATELY WIPE ALL LOCAL STORAGE & MARK ERASED
    try {
      localStorage.setItem(`biz_data_${activeBusinessId}_erased`, 'true');
      if (activeBusinessId === 'biz_main') {
        localStorage.setItem('biz_data_biz_main_erased', 'true');
      } else if (activeBusinessId === 'biz_hairpins') {
        localStorage.setItem('biz_data_biz_hairpins_erased', 'true');
      }

      const dataKeys = [
        'customers', 'inventory', 'quotes', 'invoices',
        'leads', 'expenses', 'payments', 'fixedAssets',
        'tasks', 'activity_logs', 'journalEntries', 'journalLines',
        'suppliers', 'purchaseOrders', 'boms', 'productionOrders',
        'employees', 'payruns', 'attendanceLogs', 'leaveRequests',
        'salaryAdvances', 'stockTransfers', 'performanceReviews',
        'expenseClaims', 'hrLetters', 'systemNotifications'
      ];
      dataKeys.forEach(k => {
        localStorage.setItem(`biz_data_${activeBusinessId}_${k}`, '[]');
        if (activeBusinessId === 'biz_main') {
          localStorage.setItem(`biz_data_biz_main_${k}`, '[]');
        }
      });

      const explicitGymKeys = [
        'gym_customers', 'gym_inventory', 'gym_quotes', 'gym_invoices',
        'gym_leads', 'gym_expenses', 'gym_payments', 'gym_fixed_assets',
        'gym_tasks', 'gym_activity_logs', 'gym_logs', 'gym_journal_entries', 'gym_journal_lines',
        'gym_payment_allocations', 'gym_depreciation_schedule',
        'gym_suppliers', 'gym_purchase_orders', 'gym_employees', 'gym_payruns',
        'gym_attendance_logs', 'gym_leave_requests', 'gym_salary_advances',
        'gym_stock_transfers', 'gym_performance_reviews', 'gym_expense_claims', 'gym_hr_letters',
        'gym_boms', 'gym_production_orders'
      ];
      explicitGymKeys.forEach(k => {
        try { localStorage.setItem(k, '[]'); } catch (e) {}
      });

      // Re-seed clean default SMS / business configuration in localStorage
      localStorage.setItem('gym_sms_config', JSON.stringify(defaultConfig));
      localStorage.setItem(`biz_data_${activeBusinessId}_smsConfig`, JSON.stringify(defaultConfig));
      localStorage.setItem(`biz_data_${activeBusinessId}_sms_config`, JSON.stringify(defaultConfig));
    } catch (e) {
      console.warn('LocalStorage reset error', e);
    }

    // 2. IMMEDIATELY CLEAR ALL REACT STATE IN MEMORY (0ms UI update)
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
    setBoms([]);
    setProductionOrders([]);
    setEmployees([]);
    setPayruns([]);
    setAttendanceLogs([]);
    setLeaveRequests([]);
    setSalaryAdvances([]);
    setStockTransfers([]);
    setPerformanceReviews([]);
    setExpenseClaims([]);
    setHrLetters([]);
    setSystemNotifications([]);
    setSmsConfig(defaultConfig);
    setHasUnsavedChanges(false);
    setCloudSyncStatus('synced');
    setLastSyncTime(new Date().toISOString());

    showNotification('All data and settings have been completely reset to a clean state!', 'success');

    // 3. ASYNCHRONOUSLY WIPE SUPABASE CLOUD IN PARALLEL WITHOUT BLOCKING UI
    try {
      const tablesInOrder = [
        'payment_allocations',
        'payments',
        'invoices',
        'quotations',
        'production_orders',
        'boms',
        'purchase_orders',
        'suppliers',
        'expenses',
        'fixed_assets',
        'inventory',
        'customers',
        'tasks',
        'activity_logs',
        'leads'
      ];

      const activeClient = getSupabaseClient(activeBusinessId);
      const clientsToWipe = [activeClient];
      if (supabase && supabase !== activeClient) {
        clientsToWipe.push(supabase);
      }

      await Promise.allSettled(
        clientsToWipe.flatMap(client =>
          tablesInOrder.map(async (tbl) => {
            try {
              // Unconditionally wipe all records in this table
              const res = await client.from(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000');
              if (res.error) {
                await client.from(tbl).delete().not('id', 'is', null);
              }
            } catch (tblErr) {
              console.warn(`[Supabase Reset Notice on ${tbl}]`, tblErr?.message);
            }
          })
        )
      );

      await Promise.allSettled(
        clientsToWipe.map(client =>
          client.from('user_profiles').update({
            config: defaultConfig,
            updated_at: new Date().toISOString()
          }).neq('user_id', '00000000-0000-0000-0000-000000000000')
        )
      );
    } catch (err) {
      console.warn('[Supabase Cloud Reset Notice]', err);
    } finally {
      setIsStoreLoading(false);
      isHydratingCloudRef.current = false;
    }
    return true;
  };

  // TRIGGER CONFIRMATION MODAL TO RESET EVERYTHING
  const resetEverythingWithConfirmation = () => {
    const isConfirmed = window.confirm(
      "⚠️ DANGER ZONE: Reset All Business Data?\n\n" +
      "This will permanently wipe all local and cloud records (clients, quotes, invoices, inventory, leads, expenses, and logs).\n\n" +
      "Your system will be reset to a completely clean state. This action CANNOT be undone.\n\n" +
      "Click OK to proceed with erasing all data."
    );
    if (isConfirmed) {
      executeResetEverything();
    }
  };

  // REALTIME SUBSCRIPTION FOR QUOTES & INVOICES (LIVE CROSS-DEVICE SYNC)
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        (payload) => {
          console.log('[Realtime] Quotation Changed:', payload);
          if (payload.eventType === 'UPDATE') {
            const oldItem = quotes.find(q => q.id === payload.new.id);
            if (oldItem && oldItem.status !== payload.new.status) {
              if (payload.new.status === 'Accepted') {
                showNotification?.(`Quotation for ${payload.new.prospect_name} was ACCEPTED!`, 'success');
                setSystemNotifications(prev => [{
                  id: crypto.randomUUID(),
                  message: `Quote #${payload.new.quote_number} accepted by ${payload.new.prospect_name}`,
                  time: new Date().toISOString(),
                  type: 'success'
                }, ...prev]);
              } else if (payload.new.status === 'Rejected') {
                showNotification?.(`Quotation #${payload.new.quote_number} was Declined.`, 'info');
                setSystemNotifications(prev => [{
                  id: crypto.randomUUID(),
                  message: `Quote #${payload.new.quote_number} declined by ${payload.new.prospect_name}`,
                  time: new Date().toISOString(),
                  type: 'error'
                }, ...prev]);
              }
            }
          }
          // Refresh data on any remote insert/update/delete so other devices stay in sync
          fetchCloudData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('[Realtime] Invoice Changed on remote device:', payload);
          fetchCloudData();
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
      businessId: customer.businessId || activeBusinessId,
      notes: [] 
    };
    setCustomers(prev => [...prev, newCustomer]);
    syncCustomerToSupabase(newCustomer);
    addLog('System', `Added new ${activeBusinessId === 'biz_hairpins' ? 'Wholesale Buyer' : 'Client'}: ${customer.gymName || customer.name}`);
    showNotification(`${activeBusinessId === 'biz_hairpins' ? 'Wholesale buyer' : 'Client'} "${customer.gymName || customer.name}" added successfully!`, 'success');
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
        const updated = { ...c, ...updatedData, businessId: c.businessId || activeBusinessId };
        syncCustomerToSupabase(updated);
        showNotification(`Client "${updated.gymName || 'Client'}" updated!`, 'success');
        return updated;
      }
      return c;
    }));
  };
  
  const addCustomerNote = (customerId, text, authorName = null) => {
    if (!text || !text.trim()) return;
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const staffAuthor = authorName || user?.name || user?.email || 'Staff';
        const newNote = {
          id: uuidv4(),
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          author: staffAuthor,
          text: text.trim()
        };
        const updatedNotes = [newNote, ...(c.notes || [])];
        const updated = { ...c, notes: updatedNotes };
        syncCustomerToSupabase(updated);
        addLog('Status', `Internal staff note added for ${c.gymName} by ${staffAuthor}`);
        showNotification(`Internal note added for ${c.gymName}`, 'success');
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
    const newItem = { ...item, id: uuidv4(), businessId: item.businessId || activeBusinessId };
    setInventory(prev => [...prev, newItem]);
    syncInventoryToSupabase(newItem);
    showNotification(`Item "${item.name}" added!`, 'success');
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
        const updated = { ...i, ...data, businessId: i.businessId || activeBusinessId };
        syncInventoryToSupabase(updated);
        showNotification(`Inventory item "${updated.name}" updated!`, 'success');
        return updated;
      }
      return i;
    }));
  };
  
  // Helper to deduct stock quantities from inventory upon sales (both Hardware & Hair Pin manufactured goods)
  const deductStockForInvoice = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setInventory(prevInventory => {
      return prevInventory.map(invItem => {
        const lineMatch = items.find(it => !it.isDiscount && ((it.id && it.id === invItem.id) || (it.name && it.name.toLowerCase() === invItem.name.toLowerCase())));
        const isTangibleGood = invItem.type !== 'Service' && invItem.type !== 'Consulting' && invItem.type !== 'Cloud Service';
        if (lineMatch && isTangibleGood) {
          const lineQty = Number(lineMatch.quantity || lineMatch.qty || 1);
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
        const isTangibleGood = invItem.type !== 'Service' && invItem.type !== 'Consulting' && invItem.type !== 'Cloud Service';
        if (lineMatch && isTangibleGood) {
          const lineQty = Number(lineMatch.quantity || lineMatch.qty || 1);
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
    let finalInvoiceNumber = String(invoice.invoiceNumber || '').trim();
    if (!finalInvoiceNumber || invoices.some(i => i.invoiceNumber === finalInvoiceNumber)) {
      finalInvoiceNumber = getNextSequentialInvoiceNumber(invoices, smsConfig).formattedNumber;
    }
    const rawAmt = Number(invoice.amount != null && !isNaN(invoice.amount) ? invoice.amount : (invoice.totalAmount != null && !isNaN(invoice.totalAmount) ? invoice.totalAmount : 0)) || 0;
    const newInvoice = { 
      ...invoice, 
      id: invoice.id || uuidv4(), 
      businessId: invoice.businessId || activeBusinessId,
      shareKey: invoice.shareKey || generateShareKey(), 
      invoiceNumber: finalInvoiceNumber,
      status: invoice.status || 'Sent',
      amount: rawAmt,
      totalAmount: rawAmt,
      date: invoice.date || invoice.issueDate || new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [...prev, newInvoice]);
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

    // Auto-advance nextInvoiceNumber based on this newly added invoice
    const match = finalInvoiceNumber.match(/(\d+)$/);
    if (match) {
      const addedNum = parseInt(match[1], 10);
      if (!isNaN(addedNum) && addedNum >= (smsConfig.nextInvoiceNumber || 1001)) {
        updateSmsConfig(prev => ({ ...prev, nextInvoiceNumber: addedNum + 1 }));
      }
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
    const existing = invoices.find(i => i.id === id);
    const hasPayments = (payments || []).some(p => p.documentId === id && Number(p.amount) > 0);
    const isLocked = existing && (
      existing.status === 'Sent' || 
      existing.status === 'Partially Paid' || 
      existing.status === 'Paid' || 
      existing.status === 'Overdue' || 
      Boolean(existing.sentAt) || 
      Boolean(existing.reminderSent) ||
      hasPayments
    );
    if (isLocked) {
      showNotification(`Invoice #${existing?.invoiceNumber || ''} has already been sent to customer and is locked from editing.`, 'warning');
      return;
    }
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
        const additionalFields = status === 'Sent' ? { sentAt: new Date().toISOString() } : {};
        const updated = { ...i, status, ...additionalFields };
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
    let finalQuoteNumber = String(quote.quoteNumber || '').trim();
    if (!finalQuoteNumber || quotes.some(q => q.quoteNumber === finalQuoteNumber)) {
      finalQuoteNumber = getNextSequentialQuoteNumber(quotes, smsConfig).formattedNumber;
    }
    const newQuote = { 
      ...quote, 
      id: quote.id || uuidv4(), 
      businessId: quote.businessId || activeBusinessId,
      shareKey: quote.shareKey || generateShareKey(), 
      quoteNumber: finalQuoteNumber,
      status: quote.status || 'Pending' 
    };
    setQuotes(prev => [...prev, newQuote]);
    syncQuoteToSupabase(newQuote);

    // Auto-advance nextQuoteNumber based on this newly added quote
    const match = finalQuoteNumber.match(/(\d+)$/);
    if (match) {
      const addedNum = parseInt(match[1], 10);
      if (!isNaN(addedNum) && addedNum >= (smsConfig.nextQuoteNumber || 1001)) {
        updateSmsConfig(prev => ({ ...prev, nextQuoteNumber: addedNum + 1 }));
      }
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
    const existing = quotes.find(q => q.id === id);
    const isSent = existing && (
      existing.status === 'Sent' || 
      existing.status === 'Accepted' || 
      existing.status === 'Converted to Invoice' || 
      existing.status === 'Rejected' || 
      existing.status === 'Counter Offer' || 
      Boolean(existing.sentAt)
    );
    if (isSent) {
      showNotification(`Quotation #${existing?.quoteNumber || ''} has already been sent to customer and cannot be edited.`, 'warning');
      return;
    }
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
    // If status is updated to 'Accepted', automatically convert to invoice and alert owner!
    if (status === 'Accepted') {
      const quote = quotes.find(q => q.id === id);
      if (quote && quote.status !== 'Converted to Invoice' && !quote.convertedInvoiceNumber) {
        return acceptQuote(id);
      }
    }

    const additionalFields = status === 'Sent' ? { sentAt: new Date().toISOString() } : {};
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status, ...additionalFields } : q));
    
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
  };

  // Quotation Auto-Expiry Check
  const checkQuotationExpirations = () => {
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    setQuotes(prevQuotes => {
      const updated = prevQuotes.map(q => {
        if ((q.status === 'Draft' || q.status === 'Sent' || q.status === 'Pending') && q.validUntil && q.validUntil < today) {
          changed = true;
          addNotification({
            type: 'warning',
            title: 'Quotation Expired',
            message: `Quotation #${q.quoteNumber} for ${q.prospectName || 'Prospect'} has expired.`,
            link: '/quotations',
            time: new Date().toISOString()
          });
          addLog('System', `Quotation #${q.quoteNumber} automatically marked as Expired.`);
          return { ...q, status: 'Expired', expiredAt: new Date().toISOString() };
        }
        return q;
      });
      if (changed) {
        try {
          localStorage.setItem('gym_quotes', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }
      return prevQuotes;
    });
  };

  useEffect(() => {
    if (quotes.length > 0) {
      checkQuotationExpirations();
    }
  }, [quotes.length]);

  // Customer Response: Accept Quotation -> Automatically Create Invoice with Ref: QT Number and Alert Owner
  const acceptQuote = async (quoteId, notes = '', directQuote = null) => {
    let quote = directQuote || quotes.find(q => q.id === quoteId || q.shareKey === quoteId);
    if (!quote && quoteId) {
      try {
        const localQuotes = JSON.parse(localStorage.getItem('gym_quotes') || '[]');
        quote = localQuotes.find(q => q.id === quoteId || q.shareKey === quoteId);
      } catch (e) {}
    }
    if (!quote && quoteId) {
      try {
        const { data } = await supabase.from('quotations').select('*').or(`id.eq.${quoteId},share_key.eq.${quoteId}`).maybeSingle();
        if (data) {
          quote = {
            ...data,
            shareKey: data.share_key,
            quoteNumber: data.quote_number,
            prospectName: data.prospect_name,
            prospectPhone: data.prospect_phone
          };
        }
      } catch (e) {}
    }
    if (!quote) return null;
    const acceptanceTime = new Date().toISOString();
    
    // 1. Mark Quote Accepted
    const acceptedQuote = {
      ...quote,
      status: 'Accepted',
      acceptedAt: acceptanceTime,
      acceptanceNotes: notes || quote.acceptanceNotes
    };

    setQuotes(prev => {
      const updated = prev.some(q => q.id === quote.id || q.shareKey === quote.shareKey)
        ? prev.map(q => (q.id === quote.id || q.shareKey === quote.shareKey) ? acceptedQuote : q)
        : [acceptedQuote, ...prev];
      try { localStorage.setItem('gym_quotes', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    syncQuoteToSupabase(acceptedQuote);

    // In-App Notification
    addNotification({
      type: 'success',
      title: 'Quotation Accepted!',
      message: `Quotation #${quote.quoteNumber} accepted by ${quote.prospectName} (LKR ${(Number(quote.amount) || 0).toLocaleString()})`,
      link: '/quotations',
      time: acceptanceTime
    });

    addLog('System', `Quotation #${quote.quoteNumber} ACCEPTED by customer ${quote.prospectName}`);

    // 2. Automatically Convert to Invoice with Ref: QT Number and Alert Business Owner
    const newInvoice = convertQuoteToInvoice(quote.id, acceptedQuote);

    showNotification(`Quotation #${quote.quoteNumber} accepted! Invoice #${newInvoice?.invoiceNumber || ''} (Ref: #${quote.quoteNumber}) created automatically.`, 'success');
    return { quote: acceptedQuote, invoice: newInvoice };
  };

  // Customer Response: Propose Budget (Counter Offer)
  const proposeBudget = async (quoteId, { proposedBudget, message, preferredChanges }) => {
    const quote = quotes.find(q => q.id === quoteId || q.shareKey === quoteId);
    if (!quote) return;

    const counterOffer = {
      id: uuidv4(),
      proposedBudget: Number(proposedBudget) || 0,
      originalAmount: Number(quote.amount) || 0,
      difference: (Number(proposedBudget) || 0) - (Number(quote.amount) || 0),
      message: message || '',
      preferredChanges: preferredChanges || '',
      createdAt: new Date().toISOString()
    };

    const existingCounterOffers = quote.counterOffers || quote.counter_offers || [];
    const updatedQuote = {
      ...quote,
      status: 'Counter Offer',
      counterOffers: [counterOffer, ...existingCounterOffers],
      lastCounterOffer: counterOffer
    };

    setQuotes(prev => prev.map(q => (q.id === quote.id || q.shareKey === quote.shareKey) ? updatedQuote : q));
    syncQuoteToSupabase(updatedQuote);

    addNotification({
      type: 'warning',
      title: 'Budget Proposed (Counter Offer)',
      message: `${quote.prospectName} proposed LKR ${(Number(proposedBudget) || 0).toLocaleString()} for #${quote.quoteNumber}`,
      link: '/quotations',
      time: counterOffer.createdAt
    });

    addLog('System', `Budget Counter Offer of LKR ${(Number(proposedBudget) || 0).toLocaleString()} submitted by ${quote.prospectName} for #${quote.quoteNumber}`);

    const recipientPhone = smsConfig.adminPhone || smsConfig.companyPhone || '0728408880';
    try {
      await sendNotification({
        eventType: 'BUDGET_PROPOSED',
        recipientPhone,
        recipientName: quote.prospectName,
        data: {
          quoteNumber: quote.quoteNumber,
          amount: (Number(quote.amount) || 0).toLocaleString(),
          proposedBudget: (Number(proposedBudget) || 0).toLocaleString(),
          difference: counterOffer.difference.toLocaleString(),
          message: message || 'None',
          name: quote.prospectName,
          companyName: smsConfig.companyName || 'Seynex Technology'
        },
        config: smsConfig
      });
    } catch (e) {
      console.warn('[Notification Error on Budget Proposal]', e);
    }

    showNotification(`Counter offer of LKR ${(Number(proposedBudget) || 0).toLocaleString()} submitted!`, 'info');
    return updatedQuote;
  };

  // Customer Response: Reject Quotation
  const rejectQuote = async (quoteId, reason = '') => {
    const quote = quotes.find(q => q.id === quoteId || q.shareKey === quoteId);
    if (!quote) return;

    const rejectionTime = new Date().toISOString();
    const updatedQuote = {
      ...quote,
      status: 'Rejected',
      rejectedAt: rejectionTime,
      rejectionReason: reason || 'Customer declined proposal'
    };

    setQuotes(prev => prev.map(q => (q.id === quote.id || q.shareKey === quote.shareKey) ? updatedQuote : q));
    syncQuoteToSupabase(updatedQuote);

    addNotification({
      type: 'error',
      title: 'Quotation Declined',
      message: `Quotation #${quote.quoteNumber} was declined by ${quote.prospectName}`,
      link: '/quotations',
      time: rejectionTime
    });

    addLog('System', `Quotation #${quote.quoteNumber} declined by ${quote.prospectName}. Reason: ${reason || 'Not specified'}`);

    const recipientPhone = smsConfig.adminPhone || smsConfig.companyPhone || '0728408880';
    try {
      await sendNotification({
        eventType: 'QUOTATION_REJECTED',
        recipientPhone,
        recipientName: quote.prospectName,
        data: {
          quoteNumber: quote.quoteNumber,
          name: quote.prospectName,
          rejectionReason: reason || 'Customer declined proposal',
          companyName: smsConfig.companyName || 'Seynex Technology'
        },
        config: smsConfig
      });
    } catch (e) {
      console.warn('[Notification Error on Quote Rejection]', e);
    }

    showNotification(`Quotation #${quote.quoteNumber} declined.`, 'info');
    return updatedQuote;
  };

  const convertQuoteToInvoice = (quoteId, explicitQuote = null) => {
    let quote = explicitQuote || quotes.find(q => q.id === quoteId || q.shareKey === quoteId);
    if (!quote && quoteId) {
      try {
        const localQuotes = JSON.parse(localStorage.getItem('gym_quotes') || '[]');
        quote = localQuotes.find(q => q.id === quoteId || q.shareKey === quoteId);
      } catch (e) {}
    }
    if (!quote) return null;

    let customer = customers.find(c => c.gymName === quote.prospectName || (c.phone && quote.prospectPhone && c.phone === quote.prospectPhone));
    if (!customer) {
      const custCode = `CUST-${(customers.length + 1001).toString().padStart(4, '0')}`;
      customer = {
        id: uuidv4(),
        code: custCode,
        gymName: quote.prospectName,
        name: quote.prospectName,
        phone: quote.prospectPhone || '',
        email: quote.prospectEmail || '',
        address: quote.prospectAddress || '',
        status: 'Active',
        tags: ['Walk-in'],
        leadSource: 'Quotation Conversion',
        createdAt: new Date().toISOString(),
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: [{ id: uuidv4(), text: `Customer created automatically via accepted quotation #${quote.quoteNumber}`, author: 'System', date: new Date().toISOString() }]
      };
      setCustomers(prev => [...prev, customer]);
      syncCustomerToSupabase(customer);
    }

    const { nextNumber, formattedNumber: invoiceNumber } = getNextSequentialInvoiceNumber(invoices, smsConfig);
    updateSmsConfig(prev => ({ ...prev, nextInvoiceNumber: nextNumber + 1 }));

    const quoteRef = quote.quoteNumber || 'QT';

    const newInvoice = {
      id: uuidv4(),
      shareKey: generateShareKey(),
      invoiceNumber: invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: quote.validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: customer.id,
      prospectName: customer.gymName,
      items: quote.items || [],
      amount: Number(quote.amount) || 0,
      subtotal: Number(quote.subtotal || quote.amount) || 0,
      discount: Number(quote.discount || 0),
      tax: Number(quote.tax || 0),
      notes: quote.notes ? `${quote.notes}\nConverted from Quote: #${quoteRef}` : `Converted from Quote: #${quoteRef}`,
      agreementTerms: quote.agreementTerms || quote.terms || '',
      quotationId: quote.id,
      quotationNumber: quoteRef,
      quoteRef: quoteRef,
      status: 'Sent',           // Auto-sent: customer has already accepted
      sentAt: new Date().toISOString(),
      acceptedFromQuote: true,
      paidAmount: 0,
      remainingBalance: Number(quote.amount) || 0,
      createdAt: new Date().toISOString()
    };

    if (quote.items && quote.items.length > 0) {
      deductStockForInvoice(quote.items);
    }

    // Immediately persist to local memory AND localStorage so invoice is never lost on refresh/navigation
    setInvoices(prev => {
      const updated = [newInvoice, ...prev.filter(i => i.id !== newInvoice.id && i.invoiceNumber !== newInvoice.invoiceNumber)];
      try { localStorage.setItem('gym_invoices', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    syncInvoiceToSupabase(newInvoice);

    // Maintain relationship: QT-XXXX -> INV-XXXX
    const updatedQuote = {
      ...quote,
      status: 'Converted to Invoice',
      convertedInvoiceId: newInvoice.id,
      convertedInvoiceNumber: newInvoice.invoiceNumber,
      convertedAt: new Date().toISOString()
    };
    setQuotes(prev => {
      const updated = prev.map(q => q.id === quote.id ? updatedQuote : q);
      try { localStorage.setItem('gym_quotes', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    syncQuoteToSupabase(updatedQuote);

    addLog('System', `Converted Quotation #${quote.quoteNumber} into Invoice #${newInvoice.invoiceNumber} (Converted from Quote: #${quoteRef})`);
    addNotification({
      type: 'success',
      title: 'Invoice Auto-Created',
      message: `Invoice #${newInvoice.invoiceNumber} created from Quotation #${quote.quoteNumber} (Converted from Quote: #${quoteRef})`,
      link: '/invoices',
      time: new Date().toISOString()
    });

    // ── NOTIFY BUSINESS OWNER VIA SMS & WHATSAPP ──────────────────────────────
    const ownerPhone = smsConfig.adminPhone || smsConfig.companyPhone || '072 840 8880';
    if (ownerPhone) {
      const ownerAlertMsg = `BUSINESS WIN: Quotation #${quoteRef} was ACCEPTED by ${quote.prospectName}!\nInvoice #${newInvoice.invoiceNumber} (Converted from Quote: #${quoteRef}) has been AUTOMATICALLY CREATED.\nAmount: LKR ${(Number(quote.amount) || 0).toLocaleString()}.\nPortal: ${window.location.origin}/share/invoice/${newInvoice.id || newInvoice.shareKey}`;
      try {
        sendDirectSMS(ownerPhone, ownerAlertMsg);
      } catch (smsErr) {
        console.warn('[Auto-Invoice SMS Notification to Owner Failed]:', smsErr);
      }
    }

    showNotification(`Invoice #${newInvoice.invoiceNumber} (Converted from Quote: #${quoteRef}) successfully created from quotation! Owner notified.`, 'success');
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

  // Enhanced Payment Recording supporting Full/Partial, Receipts, Renewal Frequency
  const recordEnhancedPayment = async ({ customerId, documentId, amount, method = 'Cash', reference = '', notes = '', renewalFrequency = null, recordedBy = null }) => {
    const paymentAmount = Number(amount) || 0;
    if (paymentAmount <= 0) {
      showNotification('Payment amount must be greater than zero.', 'error');
      return null;
    }

    const inv = invoices.find(i => i.id === documentId);
    const cust = customers.find(c => c.id === (customerId || inv?.customerId));

    const existingPayments = payments.filter(p => p.documentId === documentId);
    const existingPaid = existingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const invoiceTotal = Number(inv?.amount || paymentAmount);
    const outstandingBefore = Math.max(0, invoiceTotal - existingPaid);

    if (paymentAmount > outstandingBefore && outstandingBefore > 0) {
      showNotification(`Payment cannot exceed outstanding balance of LKR ${outstandingBefore.toLocaleString()}`, 'error');
      return null;
    }

    const receiptSeq = (payments.length + 1001).toString();
    const receiptNumber = `REC-${receiptSeq}`;
    const paymentId = uuidv4();
    const paymentTimestamp = new Date().toISOString();
    const staffName = recordedBy || user?.name || user?.email || 'Staff';

    const newPayment = {
      id: paymentId,
      receiptNumber,
      timestamp: paymentTimestamp,
      customerId: cust?.id || customerId,
      documentId: documentId,
      invoiceNumber: inv?.invoiceNumber || '',
      amount: paymentAmount,
      method: method || 'Cash',
      reference: reference || '',
      notes: notes || '',
      recordedBy: staffName,
      status: 'Completed'
    };

    setPayments(prev => [...prev, newPayment]);
    syncPaymentToSupabase(newPayment);

    const totalPaidAfter = existingPaid + paymentAmount;
    const remainingAfter = Math.max(0, invoiceTotal - totalPaidAfter);
    const newStatus = remainingAfter === 0 ? 'Paid' : 'Partially Paid';

    if (inv) {
      const updatedInv = {
        ...inv,
        status: newStatus,
        paidAmount: totalPaidAfter,
        remainingBalance: remainingAfter,
        lastPaymentDate: paymentTimestamp,
        paidAt: remainingAfter === 0 ? paymentTimestamp : inv.paidAt
      };
      setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
      syncInvoiceToSupabase(updatedInv);
      recalculateInvoiceBalanceAndInstallments(inv.id, paymentAmount);
    }

    // Renewal frequency calculation if set (or on first payment)
    if (cust && renewalFrequency && renewalFrequency !== 'Keep Existing') {
      const startDate = cust.purchaseDate || new Date().toISOString().split('T')[0];
      let nextDate = null;
      const startObj = new Date(startDate);
      
      if (renewalFrequency === 'Monthly') {
        const d = new Date(startObj);
        d.setMonth(d.getMonth() + 1);
        nextDate = d.toISOString().split('T')[0];
      } else if (renewalFrequency === 'Bi-Annual') {
        const d = new Date(startObj);
        d.setMonth(d.getMonth() + 6);
        nextDate = d.toISOString().split('T')[0];
      } else if (renewalFrequency === 'Annual') {
        const d = new Date(startObj);
        d.setFullYear(d.getFullYear() + 1);
        nextDate = d.toISOString().split('T')[0];
      } else if (renewalFrequency === 'One Time') {
        nextDate = null;
      }

      const updatedCust = {
        ...cust,
        renewalFrequency,
        renewalDate: nextDate,
        lastRenewalDate: cust.lastRenewalDate || startDate,
        renewalStatus: nextDate ? 'Active' : 'Completed'
      };
      setCustomers(prev => prev.map(c => c.id === cust.id ? updatedCust : c));
      syncCustomerToSupabase(updatedCust);
    }

    // Journal Entry auto-post
    try {
      const targetAccount = method === 'Bank Transfer' ? '1020' : '1010';
      createJournalEntry({
        date: paymentTimestamp.split('T')[0],
        reference: receiptNumber,
        description: `Payment received for ${inv?.invoiceNumber || 'Invoice'} via ${method}`,
        lines: [
          { accountId: targetAccount, debit: paymentAmount, credit: 0 },
          { accountId: '1100', debit: 0, credit: paymentAmount }
        ]
      });
    } catch (err) {
      console.warn('[Journal Auto-Post Error]', err);
    }

    addNotification({
      type: 'success',
      title: 'Payment Recorded',
      message: `LKR ${paymentAmount.toLocaleString()} received for #${inv?.invoiceNumber || receiptNumber} (${method})`,
      link: '/payments',
      time: paymentTimestamp
    });

    addLog('Status', `Payment of LKR ${paymentAmount.toLocaleString()} recorded for ${inv?.invoiceNumber || 'Invoice'} by ${staffName}. Outstanding: LKR ${remainingAfter.toLocaleString()}`);

    // Trigger SMS to customer
    if (cust && cust.phone) {
      triggerSMS('Payment', cust, { ...inv, amount: paymentAmount, remainingBalance: remainingAfter, receiptNumber });
    }

    showNotification(`Payment of LKR ${paymentAmount.toLocaleString()} recorded successfully!`, 'success');
    return {
      payment: newPayment,
      receiptNumber,
      remainingBalance: remainingAfter,
      invoice: inv,
      customer: cust
    };
  };

  // 1-Click Renewal Invoice Generation
  const generateRenewalInvoice = (customerOrInvoiceId) => {
    let customer = customers.find(c => c.id === customerOrInvoiceId);
    let previousInvoice = null;

    if (!customer) {
      previousInvoice = invoices.find(i => i.id === customerOrInvoiceId);
      if (previousInvoice) {
        customer = customers.find(c => c.id === previousInvoice.customerId);
      }
    } else {
      previousInvoice = invoices
        .filter(i => i.customerId === customer.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    }

    if (!customer) {
      showNotification('Customer record not found for renewal.', 'error');
      return null;
    }

    const { nextNumber, formattedNumber: invoiceNumber } = getNextSequentialInvoiceNumber(invoices, smsConfig);
    updateSmsConfig(prev => ({ ...prev, nextInvoiceNumber: nextNumber + 1 }));

    const renewalItems = previousInvoice?.items?.length > 0
      ? previousInvoice.items
      : [{ name: `${customer.renewalFrequency || 'Annual'} Software & Support Renewal`, quantity: 1, price: customer.annualFee || 350000 }];

    const amount = renewalItems.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

    const renewalInvoice = {
      id: uuidv4(),
      shareKey: generateShareKey(),
      invoiceNumber: invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: customer.id,
      prospectName: customer.gymName,
      items: renewalItems,
      amount: amount,
      subtotal: amount,
      discount: 0,
      tax: 0,
      notes: `RENEWAL of ${previousInvoice?.invoiceNumber || 'previous contract'} (${customer.renewalFrequency || 'Annual'})`,
      agreementTerms: previousInvoice?.agreementTerms || 'Standard annual service renewal agreement terms apply.',
      previousInvoiceId: previousInvoice?.id || null,
      previousInvoiceNumber: previousInvoice?.invoiceNumber || null,
      status: 'Draft',
      paidAmount: 0,
      remainingBalance: amount,
      createdAt: new Date().toISOString()
    };

    setInvoices(prev => {
      const updated = [renewalInvoice, ...prev.filter(i => i.id !== renewalInvoice.id)];
      try { localStorage.setItem('gym_invoices', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    syncInvoiceToSupabase(renewalInvoice);

    // Calculate new next renewal date
    const freq = customer.renewalFrequency || 'Annual';
    const baseDate = new Date();
    let nextRenewal = null;
    if (freq === 'Monthly') {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + 1);
      nextRenewal = d.toISOString().split('T')[0];
    } else if (freq === 'Bi-Annual') {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + 6);
      nextRenewal = d.toISOString().split('T')[0];
    } else if (freq === 'Annual') {
      const d = new Date(baseDate);
      d.setFullYear(d.getFullYear() + 1);
      nextRenewal = d.toISOString().split('T')[0];
    }

    const updatedCust = {
      ...customer,
      lastRenewalDate: new Date().toISOString().split('T')[0],
      renewalDate: nextRenewal,
      renewalStatus: 'Renewed',
      lastRenewalNoticeDate: new Date().toISOString().split('T')[0]
    };
    setCustomers(prev => {
      const updated = prev.map(c => c.id === customer.id ? updatedCust : c);
      try { localStorage.setItem('gym_customers', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    syncCustomerToSupabase(updatedCust);

    addLog('System', `Generated Renewal Invoice #${renewalInvoice.invoiceNumber} for ${customer.gymName} (Linked: RENEWAL of ${previousInvoice?.invoiceNumber || 'N/A'})`);
    addNotification({
      type: 'success',
      title: 'Renewal Invoice Generated',
      message: `Renewal Invoice #${renewalInvoice.invoiceNumber} generated for ${customer.gymName}`,
      link: '/invoices',
      time: new Date().toISOString()
    });

    // ── AUTOMATED RENEWAL MESSAGE TO CUSTOMER (SMS / WHATSAPP) ────────────────
    const custPhone = customer.phone || customer.prospectPhone;
    if (custPhone) {
      try {
        triggerSMS('Renewal', updatedCust, renewalInvoice);
      } catch (smsErr) {
        console.warn('[Auto-Renewal SMS Notification to Customer Failed]:', smsErr);
      }
    }

    showNotification(`Renewal Invoice #${renewalInvoice.invoiceNumber} generated & renewal message sent to ${customer.gymName}!`, 'success');
    return renewalInvoice;
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
    const creationDate = lead.date || new Date().toISOString();
    const newLead = { 
      ...lead, 
      id: uuidv4(), 
      date: creationDate,
      comments: Array.isArray(lead.comments) ? lead.comments : [],
      lastActionDate: lead.lastActionDate || creationDate,
      nextActionDate: lead.nextActionDate || null,
      nextActionNote: lead.nextActionNote || ''
    };
    const nextLeads = [...leads, newLead];
    setLeads(nextLeads);
    try { localStorage.setItem('gym_leads', JSON.stringify(nextLeads)); } catch (e) {}
    syncLeadToSupabase(newLead);
    addLog('System', `New Lead Added: ${lead.gymName}`);
    showNotification(`Lead "${lead.gymName || lead.prospectName || 'Lead'}" added!`, 'success');
    return newLead;
  };

  const updateLead = (id, data) => {
    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === id) {
          const updated = { ...l, ...data };
          syncLeadToSupabase(updated);
          return updated;
        }
        return l;
      });
      try { localStorage.setItem('gym_leads', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    showNotification('Lead updated successfully!', 'success');
  };

  const addLeadComment = (leadId, commentData) => {
    const commentDate = commentData.date || new Date().toISOString();
    const newComment = {
      id: uuidv4(),
      date: commentDate,
      text: commentData.text || '',
      type: commentData.type || 'Call',
      nextActionDate: commentData.nextActionDate || null,
      nextActionNote: commentData.nextActionNote || '',
      author: commentData.author || user?.name || user?.email || 'Sales Rep'
    };

    let updatedLead = null;
    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === leadId) {
          const prevComments = Array.isArray(l.comments) ? l.comments : [];
          const updated = {
            ...l,
            comments: [newComment, ...prevComments],
            lastActionDate: commentDate, // Last action date is the commented date!
            nextActionDate: commentData.nextActionDate !== undefined ? commentData.nextActionDate : l.nextActionDate,
            nextActionNote: commentData.nextActionNote !== undefined ? commentData.nextActionNote : l.nextActionNote
          };
          syncLeadToSupabase(updated);
          updatedLead = updated;
          return updated;
        }
        return l;
      });
      try { localStorage.setItem('gym_leads', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    addLog('CRM', `Lead Follow-up Comment added for ${updatedLead?.gymName || 'Lead'}`);
    showNotification(`Comment logged! Next action: ${commentData.nextActionDate ? new Date(commentData.nextActionDate).toLocaleDateString() : 'None'}`, 'success');
    return updatedLead;
  };

  const deleteLeadComment = (leadId, commentId) => {
    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === leadId) {
          const prevComments = Array.isArray(l.comments) ? l.comments : [];
          const remaining = prevComments.filter(c => c.id !== commentId);
          const latestComment = remaining[0];
          const updated = {
            ...l,
            comments: remaining,
            lastActionDate: latestComment ? latestComment.date : (l.date || new Date().toISOString()),
            nextActionDate: latestComment ? latestComment.nextActionDate : l.nextActionDate,
            nextActionNote: latestComment ? latestComment.nextActionNote : l.nextActionNote
          };
          syncLeadToSupabase(updated);
          return updated;
        }
        return l;
      });
      try { localStorage.setItem('gym_leads', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    showNotification('Comment removed.', 'info');
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
    const matchedSupplier = suppliers.find(s => s.id === poData.supplierId);
    const subtotal = Number(poData.subtotal != null 
      ? poData.subtotal 
      : (poData.items || []).reduce((acc, it) => acc + ((Number(it.quantity) || 1) * (Number(it.unitCost) || 0)), 0));
    
    // Auto-detect VAT registration from supplier if not explicitly set
    const applyVat = poData.applyVat !== undefined 
      ? Boolean(poData.applyVat) 
      : Boolean(matchedSupplier?.isVatRegistered);
    
    const vatRate = Number(poData.vatRate != null ? poData.vatRate : (matchedSupplier?.vatRate || 18));
    const vatAmount = applyVat ? Math.round(subtotal * (vatRate / 100)) : 0;
    const totalAmount = poData.totalAmount != null ? Number(poData.totalAmount) : (subtotal + vatAmount);

    const newPO = {
      ...poData,
      id: poData.id || `po-${Date.now()}`,
      shareKey: poData.shareKey || `po_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      poNumber: poData.poNumber || `PO-${1000 + purchaseOrders.length + 1}`,
      supplierName: poData.supplierName || matchedSupplier?.name || 'Unknown Supplier',
      supplierPhone: poData.supplierPhone || matchedSupplier?.phone || '',
      supplierEmail: poData.supplierEmail || matchedSupplier?.email || '',
      supplierAddress: poData.supplierAddress || matchedSupplier?.address || '',
      supplierContact: poData.supplierContact || matchedSupplier?.contactPerson || '',
      supplierVatNumber: poData.supplierVatNumber || matchedSupplier?.vatNumber || '',
      isVatRegistered: matchedSupplier ? Boolean(matchedSupplier.isVatRegistered) : applyVat,
      status: poData.status || 'Ordered',
      date: poData.date || new Date().toISOString().split('T')[0],
      subtotal,
      applyVat,
      vatRate,
      vatAmount,
      totalAmount
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    addLog('Procurement', `Issued Purchase Order ${newPO.poNumber} to ${newPO.supplierName} (Total: LKR ${totalAmount.toLocaleString()}${applyVat ? ` incl. ${vatRate}% VAT` : ' Non-VAT'})`);
    showNotification(`Purchase Order #${newPO.poNumber} created!`, 'success');

    if (newPO.status === 'Received') {
      fulfillPurchaseOrderItems(newPO);
    }
    return newPO;
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

  // --- MANUFACTURING & BILL OF MATERIALS (BOM) ERP HANDLERS ---
  const addBOM = (bomData) => {
    const newBom = {
      ...bomData,
      id: `bom-${Date.now()}`,
      code: bomData.code || `BOM-${1000 + boms.length + 1}`
    };
    setBoms(prev => [newBom, ...prev]);
    addLog('Manufacturing', `Created Bill of Materials ${newBom.code} for "${newBom.name}"`);
    showNotification(`Bill of Materials "${newBom.name}" registered!`, 'success');
  };

  const updateBOM = (id, data) => {
    setBoms(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    addLog('Manufacturing', `Updated Bill of Materials for "${data.name || id}"`);
    showNotification('Bill of Materials updated successfully!', 'success');
  };

  const deleteBOM = (id) => {
    const target = boms.find(b => b.id === id);
    setBoms(prev => prev.filter(b => b.id !== id));
    addLog('Manufacturing', `Deleted Bill of Materials ${target?.code || id}`);
    showNotification(`BOM "${target?.name || ''}" removed.`, 'info');
  };

  const addProductionOrder = (moData) => {
    const linkedBom = boms.find(b => b.id === moData.bomId);
    const qty = Number(moData.quantity) || 1;
    const materialCost = linkedBom ? (linkedBom.components || []).reduce((s, c) => s + (Number(c.totalCost || (c.quantity * c.unitCost)) || 0), 0) * qty : 0;
    const laborCost = linkedBom ? (Number(linkedBom.laborCost) || 0) * qty : 0;
    const overheadCost = linkedBom ? (Number(linkedBom.overheadCost) || 0) * qty : 0;
    const totalCost = materialCost + laborCost + overheadCost;
    const costPerUnit = qty > 0 ? Math.round(totalCost / qty) : 0;

    const newMO = {
      ...moData,
      id: `mo-${Date.now()}`,
      orderNumber: moData.orderNumber || `MO-${new Date().getFullYear()}-${String(productionOrders.length + 1).padStart(3, '0')}`,
      productName: moData.productName || linkedBom?.name || 'Manufactured Item',
      status: moData.status || 'Planned',
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      costPerUnit,
      batchNumber: moData.batchNumber || `BATCH-${new Date().getFullYear()}-${String(productionOrders.length + 1).padStart(3, '0')}`,
      startDate: moData.startDate || new Date().toISOString().split('T')[0]
    };

    setProductionOrders(prev => [newMO, ...prev]);
    addLog('Manufacturing', `Scheduled Production Order ${newMO.orderNumber}: ${newMO.quantity}x "${newMO.productName}"`);
    showNotification(`Production Order #${newMO.orderNumber} created!`, 'success');
  };

  const updateProductionOrderStatus = (id, newStatus) => {
    setProductionOrders(prev => prev.map(mo => {
      if (mo.id === id) {
        const oldStatus = mo.status;
        const updated = { 
          ...mo, 
          status: newStatus,
          completedDate: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : mo.completedDate
        };
        addLog('Manufacturing', `Work Order ${mo.orderNumber} status changed from ${oldStatus} to ${newStatus}`);
        showNotification(`Order #${mo.orderNumber} status: ${newStatus}`, 'info');
        return updated;
      }
      return mo;
    }));
  };

  const completeProductionOrder = (id, qcData = {}) => {
    const targetOrder = productionOrders.find(mo => mo.id === id);
    if (!targetOrder) return;

    const linkedBom = boms.find(b => b.id === targetOrder.bomId);
    const orderQty = Number(targetOrder.quantity) || 1;

    // 1. Consume Raw Materials from Inventory
    if (linkedBom?.components && Array.isArray(linkedBom.components)) {
      setInventory(prevInventory => {
        return prevInventory.map(invItem => {
          const comp = linkedBom.components.find(c => c.name?.toLowerCase() === invItem.name?.toLowerCase());
          if (comp) {
            const consumed = (Number(comp.quantity) || 0) * orderQty;
            const newStock = Math.max(0, (Number(invItem.stock) || 0) - consumed);
            addLog('Inventory', `Raw material consumed for ${targetOrder.orderNumber}: ${invItem.name} (-${consumed} units). Remaining stock: ${newStock}`);
            return { ...invItem, stock: newStock };
          }
          return invItem;
        });
      });
    }

    // 2. Add Manufactured Finished Good to Inventory
    setInventory(prevInventory => {
      const existing = prevInventory.find(i => i.name?.toLowerCase() === targetOrder.productName?.toLowerCase());
      if (existing) {
        const newStock = (Number(existing.stock) || 0) + orderQty;
        addLog('Inventory', `Finished goods stock added from ${targetOrder.orderNumber}: ${existing.name} (+${orderQty} units). New stock: ${newStock}`);
        return prevInventory.map(i => i.id === existing.id ? { ...i, stock: newStock, costPrice: targetOrder.costPerUnit || i.costPrice } : i);
      } else {
        const newItem = {
          id: `inv-${Date.now()}`,
          name: targetOrder.productName,
          type: linkedBom?.productCategory || 'Equipment',
          price: linkedBom?.suggestedPrice || Math.round((targetOrder.costPerUnit || 50000) * 1.35),
          costPrice: targetOrder.costPerUnit || 0,
          stock: orderQty,
          reorderLevel: 3,
          desc: `Manufactured in-house per ${targetOrder.orderNumber} (Batch: ${targetOrder.batchNumber})`
        };
        addLog('Inventory', `New finished product registered from ${targetOrder.orderNumber}: ${newItem.name} (+${orderQty} units).`);
        return [newItem, ...prevInventory];
      }
    });

    // 3. Post SLFRS Manufacturing Journal Voucher
    try {
      const matCost = Number(targetOrder.materialCost) || 0;
      const labCost = Number(targetOrder.laborCost) || 0;
      const ovhCost = Number(targetOrder.overheadCost) || 0;
      const totalCOGM = Number(targetOrder.totalCost) || (matCost + labCost + ovhCost);

      createJournalEntry({
        date: new Date().toISOString().split('T')[0],
        reference: targetOrder.orderNumber,
        description: `Cost of Goods Manufactured (COGM) - ${orderQty}x ${targetOrder.productName} (Batch ${targetOrder.batchNumber})`,
        lines: [
          { accountId: '1200', debit: totalCOGM, credit: 0 },
          { accountId: '1200', debit: 0, credit: matCost }
        ]
      });
    } catch (err) {
      console.warn('[Journal Entry Auto-Post Failed for Production Order]', err);
    }

    // 4. Update order status to Completed with QC metrics
    setProductionOrders(prev => prev.map(mo => {
      if (mo.id === id) {
        return {
          ...mo,
          status: 'Completed',
          completedDate: new Date().toISOString().split('T')[0],
          qcPassedQty: qcData.passedQty !== undefined ? Number(qcData.passedQty) : orderQty,
          qcRejectedQty: Number(qcData.rejectedQty) || 0,
          qcInspector: qcData.inspector || user?.user_metadata?.name || 'QA Lead',
          notes: qcData.notes || mo.notes
        };
      }
      return mo;
    }));

    addLog('Manufacturing', `Completed Production Order ${targetOrder.orderNumber}: ${orderQty}x "${targetOrder.productName}" added to finished inventory.`);
    showNotification(`Work Order #${targetOrder.orderNumber} completed! ${orderQty} units added to stock.`, 'success');
  };

  const deleteProductionOrder = (id) => {
    const mo = productionOrders.find(p => p.id === id);
    setProductionOrders(prev => prev.filter(p => p.id !== id));
    addLog('Manufacturing', `Deleted Production Order ${mo?.orderNumber || id}`);
    showNotification(`Production Order #${mo?.orderNumber || ''} deleted.`, 'info');
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
    else if (limitType === 'maxQuotations') currentCount = (quotes || []).length;
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

  // --- AUTOMATED WHOLESALE / CLIENT AUTO-INVOICING RENEWAL ENGINE ---
  const generateRecurringInvoices = () => {
    let generatedCount = 0;
    const activeClients = customers.filter(c => c.status === 'Active' || c.status === 'Overdue');

    if (activeClients.length === 0) {
      showNotification('No active wholesale clients found to generate renewals for.', 'info');
      return;
    }

    activeClients.forEach(client => {
      const annualVal = Number(client.annualFee != null ? client.annualFee : client.annualValue) || 240000;
      const monthlyVal = Math.round(annualVal / 12);
      const invNum = `INV-REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const clientDisplayName = client.gymName || client.name || 'Wholesale Client';
      const companyName = smsConfig?.companyName || 'Our Company';
      const invId = uuidv4();
      const invShareKey = generateShareKey();

      addInvoice({
        id: invId,
        shareKey: invShareKey,
        invoiceNumber: invNum,
        customerId: client.id,
        prospectName: clientDisplayName,
        billingCycle: 'Monthly Recurring',
        date: new Date().toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        amount: monthlyVal,
        totalAmount: monthlyVal,
        status: 'Sent',
        sentAt: new Date().toISOString(),
        items: [
          { 
            name: `Monthly Standing Order — ${companyName} (${client.tag || 'Regular Supply'})`, 
            quantity: 1,
            unitPrice: monthlyVal,
            amount: monthlyVal 
          }
        ]
      });

      if (client.phone) {
        try {
          // Use shareKey in URL so SharedDocument can look up by shareKey OR id
          const invLink = `${window.location.origin}/share/invoice/${invShareKey}`;
          triggerSMS && triggerSMS('Renewal', client, { 
            invoiceNumber: invNum, 
            totalAmount: monthlyVal, 
            amount: monthlyVal,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            link: invLink,
            prospectName: clientDisplayName
          });
        } catch (e) {
          console.warn('[Auto Renewal SMS Trigger Error]', e);
        }
      }


      generatedCount++;
    });

    addLog('Invoicing', `Executed Auto-Renewal Engine: Generated ${generatedCount} recurring invoices with automatic customer renewal notices.`);
    showNotification(`Auto-Renewal Engine complete: ${generatedCount} recurring invoices & renewal notices dispatched!`, 'success');
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



  // Automated Scheduler for Renewals, Invoices and Greetings
  useEffect(() => {
    if (!customers || customers.length === 0) return;

    let updatedCustomers = [...customers];
    let customersChanged = false;
    
    let updatedInvoices = [...invoices];
    let invoicesChanged = false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const todayStr = today.toISOString().split('T')[0];
    
    // 1. Check Upcoming & Due Renewals
    if (smsConfig?.autoRenewalEnabled !== false) {
      const daysArray = String(smsConfig?.autoRenewalDays || '15,7,3,1,0').split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

      customers.forEach((c, index) => {
        if (c.renewalDate && (c.status === 'Active' || c.status === 'Pending')) {
          const renewalDate = new Date(c.renewalDate);
          renewalDate.setHours(0, 0, 0, 0);
          const timeDiff = renewalDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysArray.includes(daysDiff) || (daysDiff <= 0 && daysDiff >= -3)) {
            // Prevent multiple sends on the same exact day
            if (c.lastReminderDaysDiff !== daysDiff && c.lastRenewalNoticeDate !== todayStr) {
              console.log(`[Auto Schedule] Sending renewal SMS to ${c.name} (${c.gymName})`);
              triggerSMS('Renewal', c, null);
              showNotification(`Auto-scheduled renewal reminder sent to ${c.gymName}`, 'info');
              updatedCustomers[index] = { ...c, lastReminderDaysDiff: daysDiff, lastRenewalNoticeDate: todayStr };
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
            if (c.lastBirthdaySentYear !== currentYear) {
              triggerSMS('Birthday', c, null);
              showNotification(`Auto-scheduled birthday wish sent to ${c.name}`);
              updatedCustomers[index] = { ...c, lastBirthdaySentYear: currentYear };
              customersChanged = true;
            }
          }
        }
      });
    }

    // 4. Check Tasks Reminders (Due Today or on Reminder Date)
    let updatedTasks = [...tasks];
    let tasksChanged = false;
    if (smsConfig?.autoTaskReminderEnabled !== false) {
      tasks.forEach((t, index) => {
        if (t.status !== 'Completed' && t.sendSmsReminder !== false && !t.reminderSent) {
          const reminderDateStr = t.reminderDate || t.dueDate;
          if (reminderDateStr) {
            const remDate = new Date(reminderDateStr);
            remDate.setHours(0, 0, 0, 0);
            const timeDiff = remDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            // If reminder date is reached (today or up to 3 days overdue)
            if (daysDiff <= 0 && daysDiff >= -3 && t.lastReminderNoticeDate !== todayStr) {
              const targetPhone = t.recipientPhone || smsConfig.adminPhone || smsConfig.companyPhone;
              if (targetPhone) {
                const dueText = t.dueDate ? ` (Due: ${t.dueDate})` : '';
                const msg = `Task Reminder [${smsConfig.companyName || 'Seynex'}]: "${t.title}"${dueText}. Priority: ${t.priority || 'Normal'}. Kindly review and update status.`;
                sendDirectSMS(targetPhone, msg);
                showNotification(`Task reminder SMS dispatched to ${targetPhone} for "${t.title}"`, 'info');
                updatedTasks[index] = { ...t, reminderSent: true, lastReminderNoticeDate: todayStr };
                tasksChanged = true;
              }
            }
          }
        }
      });
    }

    if (customersChanged) {
      setCustomers(updatedCustomers);
      try { localStorage.setItem('gym_customers', JSON.stringify(updatedCustomers)); } catch(e) {}
    }
    if (invoicesChanged) {
      setInvoices(updatedInvoices);
      try { localStorage.setItem('gym_invoices', JSON.stringify(updatedInvoices)); } catch(e) {}
    }
    if (tasksChanged) {
      setTasks(updatedTasks);
      try {
        localStorage.setItem('gym_tasks', JSON.stringify(updatedTasks));
        localStorage.setItem(`biz_data_${activeBusinessId}_tasks`, JSON.stringify(updatedTasks));
      } catch (e) {}
    }
  }, [customers.length, invoices.length, tasks.length, smsConfig?.autoRenewalEnabled, smsConfig?.autoTaskReminderEnabled, activeBusinessId]);

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

  async function sendDirectSMS(phone, rawMessage) {
    try {
      if (!phone) {
        showNotification('Cannot dispatch SMS: No phone number provided.', 'error');
        return { success: false, error: 'No phone number provided' };
      }

      // Sanitize phone number (strip whitespace, symbols)
      let cleanPhone = String(phone).trim().replace(/[^0-9]/g, '');
      // Format Sri Lankan numbers: e.g. 0771234567 -> 94771234567
      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        cleanPhone = '94' + cleanPhone.substring(1);
      } else if (cleanPhone.length === 9) {
        cleanPhone = '94' + cleanPhone;
      }

      const senderId = smsConfig?.senderID || "SEYNEX";
      const payload = {
        senderID: senderId,
        to: cleanPhone,
        msg: rawMessage
      };

      console.log(`[QuickSend API] Dispatching to ${cleanPhone} (${phone})...`);

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

      console.log('[QuickSend API Result]:', data);

      if (!res.ok) {
        const errorMsg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : String(data);
        showNotification(`SMS Gateway HTTP Error (${res.status}): ${errorMsg}`, 'error');
        return { success: false, error: errorMsg };
      }

      // Check if response contains failure indications from SMS gateway
      if (data && typeof data === 'object' && (data.status === 'FAILED' || data.error || data.success === false)) {
        const errorMsg = data.message || data.error || 'SMS gateway rejected dispatch';
        showNotification(`SMS Gateway Failed: ${errorMsg}`, 'error');
        return { success: false, error: errorMsg, data };
      }

      showNotification(`SMS sent successfully to ${phone}!`, 'success');
      addLog?.('SMS', `Sent to ${phone}: ${rawMessage.substring(0, 50)}...`);
      return { success: true, data };
    } catch (err) {
      console.error('[QuickSend API Exception]', err);
      showNotification(`Error connecting to QuickSend API: ${err.message || err}`, 'error');
      return { success: false, error: err };
    }
  }

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
      .replace(/{companyName}/g, smsConfig.companyName || 'Royal Hair Pin Industries')
      .replace(/{amount}/g, (documentData?.amount || customer?.annualFee || 0).toLocaleString())
      .replace(/{remainingBalance}/g, (documentData?.remainingBalance != null ? documentData.remainingBalance : (documentData?.amount || customer?.annualFee || 0)).toLocaleString())
      .replace(/{date}/g, documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : customer?.renewalDate ? new Date(customer.renewalDate).toLocaleDateString() : new Date().toLocaleDateString())
      .replace(/{invoiceNumber}/g, documentData?.invoiceNumber || '')
      .replace(/{receiptNumber}/g, documentData?.receiptNumber || '')
      .replace(/{number}/g, documentData?.invoiceNumber || documentData?.receiptNumber || documentData?.quoteNumber || '')
      .replace(/{link}/g, () => {
        if (!documentData) return '';
        const isQuote = type.toLowerCase() === 'quotation';
        const isPayment = type.toLowerCase() === 'cashreceived' || type.toLowerCase() === 'payment';
        const route = isQuote ? 'quote' : isPayment ? 'receipt' : 'invoice';
        const token = isQuote 
          ? (documentData.quoteNumber || documentData.quote_number || documentData.shareKey || documentData.id)
          : isPayment
          ? (documentData.receiptNumber || documentData.shareKey || documentData.id)
          : (documentData.invoiceNumber || documentData.invoice_number || documentData.shareKey || documentData.id);
        return `${window.location.origin}/share/${route}/${token}`;
      })
      .replace(/{renewalDate}/g, customer?.renewalDate ? new Date(customer.renewalDate).toLocaleDateString() : (documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : new Date().toLocaleDateString()))
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
      quotes, addQuote, updateQuoteStatus, updateQuote, convertQuoteToInvoice, acceptQuote, proposeBudget, rejectQuote, checkQuotationExpirations,
      leads, addLead, updateLead, deleteLead, addLeadComment, deleteLeadComment,
      expenses, addExpense, updateExpense, deleteExpense,
      tasks, addTask, updateTask, deleteTask,
      fixedAssets, addFixedAsset, updateFixedAsset, deleteFixedAsset,
      payments, recordCashDeposit, recordEnhancedPayment, generateRenewalInvoice,
      accounts, journalEntries, journalLines, paymentAllocations, depreciationSchedule,
      createJournalEntry, addAccount, updateAccount, deleteAccount, deleteJournalEntry, getInvoicePaymentSummary, processMonthlyDepreciation,
      activityLogs, addLog, recordAuditLog, clearActivityLogs,
      addCustomerNote,
      deleteInvoice, deleteQuote,
      getNextSequentialInvoiceNumber, getNextSequentialQuoteNumber,
      smsConfig, updateSmsConfig, fetchSmsBalance, triggerSMS, sendDirectSMS, sendBulkSMSArray, handleTestSms,
      teamMembers, addTeamMember, updateTeamMember, updateTeamMemberRole, toggleTeamMemberStatus, deleteTeamMember, resetUserPassword,
      customRoles, addCustomRole, updateCustomRole, duplicateCustomRole, deleteCustomRole,
      theme, toggleTheme,
      notification, showNotification,
      systemNotifications, addNotification, markNotificationRead, markNotificationsRead,
      quickSaleOpen, setQuickSaleOpen,
      resetToSeynexDefaults, seedDummyData, loadHairPinIndustryDefaults,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      purchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder,
      boms, addBOM, updateBOM, deleteBOM,
      productionOrders, addProductionOrder, updateProductionOrderStatus, completeProductionOrder, deleteProductionOrder,
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
      // Multi-Database Architecture & Connections
      getBusinessDbConfig, saveBusinessDbConfig, testDatabaseConnection, getSupabaseClient,
      // Multi-Business Entity Partitioning & Switcher
      businesses, activeBusinessId, activeBusiness, switchBusiness, addBusiness, updateBusiness, deleteBusiness, DEFAULT_BUSINESSES,
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
