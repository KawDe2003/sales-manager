import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Search, CheckCircle2, ShieldCheck, Layers, BookOpen, 
  Scale, Users, ShoppingBag, CreditCard, Building2, MessageSquare, 
  Settings as SettingsIcon, FileText, ArrowRight, Package, Zap, ExternalLink,
  Shield, Check
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const Features = () => {
  const { smsConfig = {}, featureToggles = {}, updateFeatureToggle, applyPlanPreset, showNotification } = useContext(StoreContext) || {};
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isEnabled = (key) => featureToggles[key] !== false;

  const featureModules = [
    {
      id: 'crm',
      title: 'CRM & Client Registry',
      category: 'sales',
      route: '/customers',
      toggleKey: null,
      icon: Users,
      badge: 'Core Subsystem',
      color: '#38bdf8',
      description: 'Complete Client Relationship Management with subscription tracking and automated renewal date calculations.',
      microFeatures: [
        'Active Gym directory with contact person & billing addresses',
        'Automated Annual Subscription Renewal Date calculation engine',
        'Interactive client activity history & internal notes',
        '1-Click WhatsApp direct messaging & phone calling integration',
        'Export active client registry to Excel (.xlsx)'
      ]
    },
    {
      id: 'leads',
      title: 'Kanban Leads Pipeline',
      category: 'sales',
      route: '/leads',
      toggleKey: 'leads',
      icon: Sparkles,
      badge: 'Sales Accelerator',
      color: '#fbbf24',
      description: 'Visual B2B sales pipeline for tracking prospect deals from cold lead to active contract.',
      microFeatures: [
        'Drag-and-drop Kanban status stages (New, Contacted, Demo, Proposal, Won)',
        'Deal valuation & expected revenue forecasting',
        '1-Click Convert Won Lead directly to Active Gym Customer profile'
      ]
    },
    {
      id: 'quotes',
      title: 'Quotations & Dynamic Item Builder',
      category: 'sales',
      route: '/quotations',
      toggleKey: 'quotations',
      icon: FileText,
      badge: 'B2B Sales',
      color: '#818cf8',
      description: 'Professional commercial equipment quotation generator with custom branding.',
      microFeatures: [
        'Custom Quote Number generation (QT-1001)',
        'Multi-item line builder with auto-calculated discounts and taxes',
        '1-Click Convert Approved Quotation directly to live Invoice',
        'Public shareable web link generation (/share/quote/id)',
        'PDF export with company logo and custom branding colors'
      ]
    },
    {
      id: 'invoices',
      title: 'Invoices & Installment Plans',
      category: 'sales',
      route: '/invoices',
      toggleKey: null,
      icon: ReceiptIcon,
      badge: 'Billing Engine',
      color: '#34d399',
      description: 'Commercial invoice generation with 2 to 12 month installment plan financing.',
      microFeatures: [
        '2–12 Month Installment Payment Plans with scheduled due dates',
        'Partial payment recording & remaining balance tracking',
        'Automated Overdue invoice auto-flagging based on due date',
        'Public payment link (/share/invoice/id) with client self-service portal',
        'Professional PDF Invoice and Payment Receipt generation'
      ]
    },
    {
      id: 'ledger',
      title: 'Double-Entry General Ledger',
      category: 'accounting',
      route: '/ledger',
      toggleKey: 'ledger',
      icon: Scale,
      badge: 'SLFRS / IFRS Compliant',
      color: '#a78bfa',
      description: 'Full SLFRS/IFRS compliant double-entry Chart of Accounts and Journal Voucher system.',
      microFeatures: [
        '5 Financial Categories: Asset, Liability, Equity, Revenue, Expense',
        'Parent-child nested account hierarchy',
        'Individual T-Account Ledger statements with running balances',
        'Manual Journal Vouchers (JV-001) with real-time Debit/Credit validation',
        'Auto-rejection of unbalanced journal postings'
      ]
    },
    {
      id: 'reconciliation',
      title: 'Bank Statement Reconciliation',
      category: 'accounting',
      route: '/ledger',
      toggleKey: 'ledger',
      icon: ShieldCheck,
      badge: 'Audit Ready',
      color: '#38bdf8',
      description: 'Match General Ledger cash/bank entries against physical bank statement records.',
      microFeatures: [
        'Live GL Book Balance calculation',
        'Total Cleared / Reconciled Balance monitoring',
        'Unreconciled Difference tracking with 1-click clearing toggles'
      ]
    },
    {
      id: 'reports',
      title: 'Financial Statements & Reports',
      category: 'accounting',
      route: '/reports',
      toggleKey: null,
      icon: BookOpen,
      badge: 'Executive Suite',
      color: '#f43f5e',
      description: 'Automated Trial Balance, P&L, Balance Sheet, and Cash Flow statements.',
      microFeatures: [
        'Trial Balance with auto-balance indicator (Debits - Credits = 0.00)',
        'Profit & Loss (P&L) Statement: Revenue vs Expenses',
        'Balance Sheet verification (Assets = Equity + Liabilities)',
        'Cash Flow Statement (Operating, Investing, Financing)',
        'Export all financial statements to PDF and Excel'
      ]
    },
    {
      id: 'inventory',
      title: 'Stock Inventory & Warehouse Transfers',
      category: 'inventory',
      route: '/inventory',
      toggleKey: 'inventory',
      icon: Package,
      badge: 'Stock Control',
      color: '#f97316',
      description: 'Multi-warehouse stock inventory management with reorder level alerts.',
      microFeatures: [
        'Selling Price vs Cost Price margin tracking',
        'Reorder level alert badges when stock falls below threshold',
        'Multi-Warehouse Stock Transfers (Main Warehouse, Showrooms, Outlets)',
        'Transfer status tracking (Pending, In Transit, Completed)'
      ]
    },
    {
      id: 'procurement',
      title: 'Procurement & Purchase Orders',
      category: 'inventory',
      route: '/procurement',
      toggleKey: 'procurement',
      icon: ShoppingBag,
      badge: 'Supply Chain',
      color: '#10b981',
      description: 'Supplier directory and automated Purchase Order replenishment.',
      microFeatures: [
        'Registered Suppliers directory with categories and contacts',
        'Purchase Order creation (PO-1001) with item cost breakdowns',
        '1-Click Receive Goods: Auto-replenishes inventory stock levels',
        'Official Purchase Order print formatting'
      ]
    },
    {
      id: 'payroll',
      title: 'HR & Statutory Payroll ERP',
      category: 'hr',
      route: '/hr',
      toggleKey: 'hrPayroll',
      icon: Users,
      badge: 'Sri Lanka Statutory',
      color: '#ec4899',
      description: 'Sri Lanka Labour Law compliant payroll engine with EPF/ETF auto-calculation.',
      microFeatures: [
        'EPF 8% Employee deduction + EPF 12% Employer contribution',
        'ETF 3% Employer contribution auto-calculation',
        '1-Click Approve Payrun: Auto-posts GL Journal Voucher (Salaries Expense ➔ Bank)',
        'Daily Attendance logs with Clock-In/Clock-Out and Overtime tracking',
        'Staff Leave request workflow with leave balance calculations'
      ]
    },
    {
      id: 'claims',
      title: 'Expense Claims & Performance Appraisals',
      category: 'hr',
      route: '/hr',
      toggleKey: 'hrPayroll',
      icon: Zap,
      badge: 'Staff Management',
      color: '#06b6d4',
      description: 'Staff out-of-pocket expense claims and KPI appraisal reviews.',
      microFeatures: [
        'Out-of-pocket expense claim submission with Manager Approval',
        'Approved claims auto-post GL Journal Voucher (Office Expense ➔ Bank)',
        'Staff Performance Appraisals with 1-5 star ratings (Punctuality, Engagement, Teamwork)',
        'Salary Advance requests with auto-deduction on next payroll run'
      ]
    },
    {
      id: 'assets',
      title: 'Fixed Assets & Depreciation Engine',
      category: 'assets',
      route: '/assets',
      toggleKey: 'fixedAssets',
      icon: Building2,
      badge: 'Asset Registry',
      color: '#6366f1',
      description: 'Fixed Asset registry with 1-click straight-line depreciation run.',
      microFeatures: [
        'Fixed Asset registry (Asset Code, Purchase Date, Price, Useful Life)',
        'Real-time Accumulated Depreciation & Net Book Value (NBV)',
        '1-Click Run Monthly Depreciation: Auto-posts GL Journal Voucher (Depreciation Expense ➔ Accum Dep)'
      ]
    },
    {
      id: 'sms',
      title: 'SMS Broadcast & Customer Portal',
      category: 'sms',
      route: '/sms',
      toggleKey: 'smsPortal',
      icon: MessageSquare,
      badge: 'Client Portal',
      color: '#3b82f6',
      description: 'QuickSend SMS Gateway integration and mobile customer self-service portal.',
      microFeatures: [
        'Prepaid Wallet balance live monitoring & 1-click Sync',
        'Single SMS & Bulk Broadcast messaging to client segments',
        'Automated SMS triggers (Overdue Invoice Nudges, Payment Receipts, Birthday Wishes)',
        'Customer Portal (/portal & /pay) accessible by mobile phone number'
      ]
    },
    {
      id: 'security',
      title: 'Security & Custom RBAC Roles',
      category: 'security',
      route: '/settings',
      toggleKey: null,
      icon: Shield,
      badge: 'Security Audit',
      color: '#14b8a6',
      description: 'Role-Based Access Control with granular permission toggles and activity logs.',
      microFeatures: [
        'Create custom staff roles (Sales Exec, Accountant, Inventory Mgr)',
        '10+ Granular Permission toggles (manage_clients, view_financials, etc.)',
        'Real-time Activity Logs with IP timestamp audit trails'
      ]
    }
  ];

  // Icon helper component
  function ReceiptIcon(props) {
    return <CreditCard {...props} />;
  }

  const filteredModules = featureModules.filter(m => {
    const matchesCat = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.microFeatures.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* ===== HERO HEADER ===== */}
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
              <Sparkles size={14} /> Official Capabilities Directory
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.03em' }}>
              {smsConfig.dashboardName || smsConfig.companyName || 'GymSales Pro'} Enterprise ERP Features
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '8px 0 0 0', maxWidth: '750px', lineHeight: 1.5 }}>
              Explore the complete catalog of double-entry accounting, SLFRS financial statements, statutory payroll, inventory, procurement, and CRM micro-features.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/settings" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.85rem' }}>
              <SettingsIcon size={16} /> Feature Flags Settings
            </Link>
            <a href="https://seynextech.com" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <ExternalLink size={16} /> Seynex Technology
            </a>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER BAR */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search features (e.g. EPF, Installments, Trial Balance)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'sales', label: 'CRM & Sales' },
              { id: 'accounting', label: 'Accounting & Ledger' },
              { id: 'inventory', label: 'Inventory & PO' },
              { id: 'hr', label: 'HR & Payroll' },
              { id: 'assets', label: 'Fixed Assets' },
              { id: 'sms', label: 'SMS & Portal' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: activeCategory === cat.id ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                  background: activeCategory === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                  color: activeCategory === cat.id ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FEATURE MODULES GRID ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        {filteredModules.map(mod => {
          const Icon = mod.icon;
          const enabled = mod.toggleKey ? isEnabled(mod.toggleKey) : true;

          return (
            <div 
              key={mod.id} 
              style={{ 
                background: 'rgba(15, 23, 42, 0.75)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '20px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(16px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Accent Stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: mod.color }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${mod.color}18`, border: `1px solid ${mod.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={mod.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {mod.title}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: mod.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {mod.badge}
                    </span>
                  </div>
                </div>

                {mod.toggleKey && (
                  <button
                    onClick={() => {
                      updateFeatureToggle(mod.toggleKey, !enabled);
                      showNotification(`${mod.title} ${!enabled ? 'Enabled' : 'Disabled'}`, !enabled ? 'success' : 'warning');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: enabled ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      background: enabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: enabled ? '#34d399' : '#fb7185',
                      cursor: 'pointer'
                    }}
                  >
                    {enabled ? 'Active' : 'Disabled'}
                  </button>
                )}
              </div>

              <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                {mod.description}
              </p>

              <div style={{ flex: 1, marginBottom: '20px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  KEY MICRO-FEATURES:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mod.microFeatures.map((feat, idx) => (
                    <li key={idx} style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.35 }}>
                      <CheckCircle2 size={14} color={mod.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link 
                to={mod.route}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Launch Module <ArrowRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* ===== B2B PLAN PARITY COMPARISON TABLE ===== */}
      <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', padding: '28px', backdropFilter: 'blur(16px)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0' }}>
          System Tier Parity Matrix
        </h2>
        <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: '0 0 20px 0' }}>
          Compare micro-feature availability across Starter, Professional, and Enterprise plans.
        </p>

        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>CAPABILITY / MICRO-FEATURE</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: '140px' }}>
                  STARTER
                  <button onClick={() => applyPlanPreset && applyPlanPreset('starter')} className="btn btn-secondary btn-sm" style={{ display: 'block', margin: '6px auto 0', padding: '2px 8px', fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    Apply Preset
                  </button>
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: '150px' }}>
                  PROFESSIONAL
                  <button onClick={() => applyPlanPreset && applyPlanPreset('professional')} className="btn btn-secondary btn-sm" style={{ display: 'block', margin: '6px auto 0', padding: '2px 8px', fontSize: '0.72rem', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    Apply Preset
                  </button>
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: '140px' }}>
                  ENTERPRISE
                  <button onClick={() => applyPlanPreset && applyPlanPreset('enterprise')} className="btn btn-secondary btn-sm" style={{ display: 'block', margin: '6px auto 0', padding: '2px 8px', fontSize: '0.72rem', background: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
                    Apply Preset
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { feat: 'Active Gyms & Subscription Renewals', starter: true, pro: true, ent: true },
                { feat: 'Quotations & Invoicing', starter: true, pro: true, ent: true },
                { feat: '2–12 Month Equipment Installments', starter: true, pro: true, ent: true },
                { feat: 'Leads Pipeline & Kanban', starter: false, pro: true, ent: true },
                { feat: 'Multi-Warehouse Stock Transfers', starter: false, pro: true, ent: true },
                { feat: 'Suppliers & Purchase Orders (POs)', starter: false, pro: true, ent: true },
                { feat: 'Sri Lanka EPF (8/12%) & ETF (3%) Payroll', starter: false, pro: true, ent: true },
                { feat: 'Staff Attendance & Leave Approvals', starter: false, pro: true, ent: true },
                { feat: 'Staff Expense Claims & Appraisals', starter: false, pro: true, ent: true },
                { feat: 'SLFRS Double-Entry General Ledger', starter: false, pro: 'Add-on', ent: true },
                { feat: 'Bank Statement Reconciliation', starter: false, pro: 'Add-on', ent: true },
                { feat: 'Fixed Asset Depreciation Engine', starter: false, pro: 'Add-on', ent: true },
                { feat: 'Custom Granular RBAC Permissions', starter: false, pro: 'Presets', ent: true },
                { feat: 'Real-time Activity Audit Logs', starter: false, pro: false, ent: true }
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#e2e8f0' }}>{row.feat}</td>
                  <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                    {typeof row.starter === 'boolean' ? (row.starter ? <Check size={18} color="#34d399" style={{ margin: '0 auto' }} /> : <span style={{ color: '#64748b' }}>—</span>) : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>{row.starter}</span>}
                  </td>
                  <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                    {typeof row.pro === 'boolean' ? (row.pro ? <Check size={18} color="#34d399" style={{ margin: '0 auto' }} /> : <span style={{ color: '#64748b' }}>—</span>) : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>{row.pro}</span>}
                  </td>
                  <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                    {typeof row.ent === 'boolean' ? (row.ent ? <Check size={18} color="#34d399" style={{ margin: '0 auto' }} /> : <span style={{ color: '#64748b' }}>—</span>) : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>{row.ent}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Features;
