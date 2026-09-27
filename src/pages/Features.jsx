import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Search, CheckCircle2, ShieldCheck, Layers, BookOpen, 
  Scale, Users, ShoppingBag, CreditCard, Building2, MessageSquare, 
  Settings as SettingsIcon, FileText, ArrowRight, Package, Zap, ExternalLink,
  Shield, Check, Award, TrendingUp, Clock, AlertCircle, RefreshCw,
  Receipt, DollarSign, Smartphone, BarChart3, UserCheck, CheckSquare,
  FileSpreadsheet, ArrowUpRight, HelpCircle, Star, Target, ChevronRight
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const Features = () => {
  const { featureToggles = {}, updateFeatureToggle, applyPlanPreset, showNotification } = useContext(StoreContext) || {};
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isEnabled = (key) => featureToggles[key] !== false;

  const categories = [
    { id: 'all', label: 'All Capabilities', icon: Layers },
    { id: 'sales', label: 'Sales & CRM', icon: Users },
    { id: 'deals', label: 'Quotations & Invoicing', icon: FileText },
    { id: 'payments', label: 'Payments & Debtors', icon: CreditCard },
    { id: 'renewals', label: 'Subscriptions & Renewals', icon: RefreshCw },
    { id: 'accounting', label: 'SLFRS Accounting', icon: Scale },
    { id: 'operations', label: 'Operations & Catalog', icon: Package },
    { id: 'automation', label: 'WhatsApp & SMS Hub', icon: MessageSquare }
  ];

  const modules = [
    {
      id: 'customer_management',
      category: 'sales',
      title: 'Customer Management & 360° Ledger',
      badge: 'Core Relationship Engine',
      accentColor: '#38bdf8',
      icon: Users,
      route: '/customers',
      summary: 'Complete client transaction ledger tracking quotations, invoices, payments, outstanding balances, and recurring renewals in one unified view.',
      features: [
        'Auto-generated Customer ID (CUST-XXXX) with corporate details and tax/VAT tracking',
        'Configurable Customer Tags (Corporate, VIP, Individual, Student, Walk-in)',
        'Lead Source Attribution tracking marketing ROI (Walk-in, Referral, Social, Website)',
        'Internal Staff Notes with author stamp & timestamp (strictly hidden from customer view)',
        'Vertical Chronological Transaction Timeline from Quote to Final Payment',
        '1-Click Export of Customer Registry and Statements to Professional PDF'
      ]
    },
    {
      id: 'quotation_workflow',
      category: 'deals',
      title: 'Quotation Workflow & Customer Response Portal',
      badge: 'Deal Closer Engine',
      accentColor: '#818cf8',
      icon: FileText,
      route: '/quotations',
      summary: 'High-converting interactive proposals with instant client acceptance, counter-offer budget negotiation, and automated validity expiration.',
      features: [
        'Status Lifecycle: Draft → Sent → Viewed → Accepted / Counter Offer / Rejected / Expired',
        'Secure Client-Facing Portal Link exposing only the specific quotation',
        'Interactive Client Actions: [ ACCEPT ], [ PROPOSE BUDGET ], and [ REJECT ]',
        'Counter Offer Negotiation preserving original quote without data overwrites',
        'Pre-filled WhatsApp Share Button opening wa.me with unique proposal link',
        'Automated Validity Expiration engine flagging expired proposals automatically'
      ]
    },
    {
      id: 'automated_invoicing',
      category: 'deals',
      title: 'Automated Tax Invoicing & Installments',
      badge: 'Billing Engine',
      accentColor: '#34d399',
      icon: Receipt,
      route: '/invoices',
      summary: 'Turn accepted quotations into professional tax invoices in one click with zero re-entry and complete relational traceability.',
      features: [
        '1-Click Convert Quote to Invoice maintaining direct relational link (QT-XXXX → INV-XXXX)',
        '2–12 Month Installment Payment Plans with scheduled due dates and payment tracking',
        'Automated Tax, Subtotal, and Line-item Discount calculations with decimal precision',
        'Multi-stage automated payment reminder schedules (7 days prior, due date, overdue)',
        'Pre-filled WhatsApp Invoice Sharing with bank account settlement coordinates',
        'Real-time Invoice Status: Draft, Issued, Partially Paid, Paid, Overdue, Cancelled'
      ]
    },
    {
      id: 'payment_management',
      category: 'payments',
      title: 'Multi-Channel Payments & Instant Receipts',
      badge: 'Cash Flow Guardian',
      accentColor: '#10b981',
      icon: CreditCard,
      route: '/payments',
      summary: 'Record full and partial settlements across multiple channels with instant standalone payment receipts and audit trail integrity.',
      features: [
        'Supported Methods: Cash, Bank Transfer, Credit Card, Online Payment, Other',
        'Strict Mathematical Rule: Outstanding = Total − All Valid Payments (Never Negative)',
        'Instant Standalone Payment Receipt PDF (REC-XXXX) with official watermark stamp',
        '1-Click WhatsApp Receipt Dispatch directly to the customer mobile number',
        'Automatic Debtors Clearing: Settled accounts auto-shift to Paid/Closed',
        'Non-Destructive Audit Trail: Payment history is permanently retained for audit'
      ]
    },
    {
      id: 'debtors_aging',
      category: 'payments',
      title: 'Debtors Management & Aging Ledger',
      badge: 'Liquidity Protector',
      accentColor: '#f59e0b',
      icon: Clock,
      route: '/debtors',
      summary: 'Total visibility over outstanding balances > 0 with inline payment collection, aging brackets, and one-click debtor statement exports.',
      features: [
        'Real-time aggregation of all active receivables with outstanding balance > LKR 0',
        'Instant Filters: All, Partially Paid, Overdue, Due Today, Due This Week, by Tag',
        'Inline [ RECORD PAYMENT ] modal directly from debtor row for rapid collection',
        'Automatic removal from active view once balance reaches LKR 0 without record deletion',
        'Overdue aging classification with days past due tracking',
        '1-Click Export of Debtor Aging Statement to Professional Vector PDF'
      ]
    },
    {
      id: 'renewal_frequency',
      category: 'renewals',
      title: 'Subscription & Renewal Automation',
      badge: 'Recurring Revenue Engine',
      accentColor: '#c084fc',
      icon: RefreshCw,
      route: '/customers',
      summary: 'Prompted on first payment to automate recurring billing cycles, next renewal date calculations, and 1-click renewal invoice generation.',
      features: [
        'Prompted on First Payment: [ One Time ] [ Monthly ] [ Bi-Annual ] [ Annual ]',
        'Automated Next Renewal Date: Monthly (+1 mo), Bi-Annual (+6 mo), Annual (+12 mo)',
        'Upcoming Renewals Monitor tracking accounts due in 30, 14, 7 days and overdue',
        '1-Click [ Generate Renewal Invoice ] copying previous service and pricing intact',
        'Renewal Invoice Traceability: Linked as RENEWAL of INV-XXXX with fresh history',
        'Automated Pre-Renewal Notification reminders via SMS and WhatsApp'
      ]
    },
    {
      id: 'product_catalog',
      category: 'operations',
      title: 'Reusable Product & Service Catalog',
      badge: 'Catalog & Inventory',
      accentColor: '#ec4899',
      icon: Package,
      route: '/inventory',
      summary: 'Standardize service offerings, hardware stock, unit pricing, and default tax rates for rapid quote building without manual typing.',
      features: [
        'Catalog Fields: Item Name, Description, Default Unit Price, Tax Rate, Unit, Status',
        'Search and select directly from QuotationModal and InvoiceModal with 1-click insert',
        'Instant quantity, price, and discount overrides per line item without altering base catalog',
        'Real-time physical stock level tracking and reorder threshold alerts',
        'Multi-warehouse and branch stock transfer management with audit logging',
        'Export Inventory Stock Balance and Valuation Reports to PDF and Excel'
      ]
    },
    {
      id: 'notification_service',
      category: 'automation',
      title: 'Multi-Channel Notification Hub (SMS & WhatsApp)',
      badge: 'Communication Hub',
      accentColor: '#06b6d4',
      icon: MessageSquare,
      route: '/sms',
      summary: 'Configurable multi-channel gateway abstraction triggering automated messages for every key sales milestone without hardcoded logic.',
      features: [
        'Provider Abstraction: Configurable SMS gateways and WhatsApp Business API',
        'Dynamic Template Interpolation: {name}, {amount}, {invoiceNumber}, {link}, etc.',
        'Trigger Milestones: Quote Sent/Viewed/Accepted/Counter/Rejected, Invoices & Payments',
        'Native wa.me link generation for 1-click mobile and desktop WhatsApp messaging',
        'Top-Navigation In-App Activity Bell with unread badges, feed, and mark-as-read',
        'All API credentials strictly isolated in backend configuration — zero frontend leakage'
      ]
    },
    {
      id: 'general_ledger',
      category: 'accounting',
      title: 'Double-Entry General Ledger (SLFRS / LKAS)',
      badge: 'Statutory Financials',
      accentColor: '#a78bfa',
      icon: Scale,
      route: '/ledger',
      summary: 'Full compliance with Sri Lanka Accounting Standards (SLFRS/LKAS) featuring Chart of Accounts, Journal Vouchers, and T-Account Ledgers.',
      features: [
        'Standard 5-Category Chart of Accounts: Assets, Liabilities, Equity, Revenue, Expenses',
        'Strict Double-Entry Enforcement: Real-time validation that Total Debits = Total Credits',
        'Manual Journal Vouchers (JV-XXXX) with audit memos and reference numbers',
        'Interactive T-Account drill-down with running chronological account balances',
        'Bank Statement Reconciliation tool with cleared balance versus book balance matching',
        'Automated posting of sales invoices, payments, and expenses to general ledger'
      ]
    },
    {
      id: 'financial_reporting',
      category: 'accounting',
      title: 'SLFRS Financial Statements & Analytics',
      badge: 'Executive Intelligence',
      accentColor: '#6366f1',
      icon: BarChart3,
      route: '/reports',
      summary: 'Instant generation of Trial Balance, Income Statement (P&L), Balance Sheet, and Staff Conversion analytics with professional PDF exports.',
      features: [
        'SLFRS Statement of Profit or Loss (Income Statement) with Gross & Net Margins',
        'SLFRS Statement of Financial Position (Balance Sheet) validating A = L + E equation',
        'Real-time Trial Balance with debit/credit equality verification',
        'Staff Performance Tracking: Quotations created, accepted, and conversion rate %',
        'Lead Source ROI Report identifying top revenue-generating marketing channels',
        'All 7 Reports exportable to publication-grade Vector PDFs with repeating headers'
      ]
    },
    {
      id: 'executive_dashboard',
      category: 'sales',
      title: 'Executive Real-Time Sales Dashboard',
      badge: 'Command Center',
      accentColor: '#10b981',
      icon: Target,
      route: '/',
      summary: 'Real database-powered KPI command center delivering live conversion rates, top customer rankings, and 6-month cash collection trajectories.',
      features: [
        '10 Real-Database KPI Cards: Customers, Quotes, Accepted, Invoiced, Collected, Debtors',
        'Quotation Conversion Rate Card tracking Sent → Accepted percentage this month',
        'Top 5 Customers Ranked by invoiced volume this month with clickable navigation',
        '6-Month Invoiced Volume vs Cash Collections Area Trend Chart',
        'Quotation Status Breakdown Donut Chart (Draft, Sent, Accepted, Counter, Rejected)',
        'Immediate Action Required panel displaying top overdue accounts'
      ]
    },
    {
      id: 'vector_pdf_engine',
      category: 'deals',
      title: 'Professional Vector PDF Engine',
      badge: 'Publication Grade',
      accentColor: '#f43f5e',
      icon: Award,
      route: '/quotations',
      summary: 'Flawless document generation with repeating headers, exact LKR formatting, multi-page table wrapping, and auto-paginated footers.',
      features: [
        'Strict Currency Formatting: LKR 100,000.00 (Standardized across all documents)',
        'Consistent Date Formatting: DD Month YYYY (e.g. 27 September 2026)',
        'Repeating Table Headers on continuation pages for multi-page invoices & reports',
        'Auto Page Numbering (Page X of Y) with document reference and timestamp',
        'Embedded high-resolution company branding, logos, and custom accent themes',
        'Tested with 20+ line items and multi-page tables with zero row clipping'
      ]
    },
    {
      id: 'security_governance',
      category: 'operations',
      title: 'Enterprise Security, RBAC & Cloud Audit',
      badge: 'Zero-Trust Architecture',
      accentColor: '#0ea5e9',
      icon: ShieldCheck,
      route: '/settings',
      summary: 'Granular role-based permissions, non-destructive audit logging, session inactivity timeouts, and encrypted Supabase cloud sync.',
      features: [
        'Role-Based Access Control (RBAC): Admin, Sales Representative, Financial Controller',
        'Permanent Non-Destructive Storage: Customers, Quotes, and Invoices are never deleted',
        'Full Action Audit Logging recording user, timestamp, action, and altered record',
        'Automated Inactivity Session Lockout protecting sensitive accounting workspaces',
        'Public Quotation & Invoice Links expose only the target document without data leakage',
        'Dual-Layer Persistence: Instant offline-first localStorage backed by Supabase cloud'
      ]
    }
  ];

  const filteredModules = modules.filter(m => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch = searchTerm === '' || 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '60px', animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* WORLD-CLASS MARKETING HERO SECTION */}
      <div style={{
        position: 'relative',
        borderRadius: '28px',
        padding: '56px 40px',
        marginBottom: '40px',
        background: 'radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.95) 70%, #070b14 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        
        {/* Ambient Top Glow */}
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)', pointerEvents: 'none'
        }}></div>

        {/* Supreme Product Edition Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 18px', borderRadius: '30px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399', fontSize: '0.78rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          marginBottom: '20px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
        }}>
          <Star size={14} fill="#34d399" /> SEYNEX ENTERPRISE SALES & REVENUE ENGINE 2026
        </div>

        <h1 style={{
          fontSize: '2.8rem', fontWeight: 900, color: '#f8fafc',
          letterSpacing: '-0.04em', lineHeight: 1.15,
          maxWidth: '900px', margin: '0 auto 18px auto',
          fontFamily: 'var(--font-display, inherit)'
        }}>
          The Complete Revenue Operating System for High-Growth Enterprise Sales
        </h1>

        <p style={{
          fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6,
          maxWidth: '780px', margin: '0 auto 32px auto', fontWeight: 500
        }}>
          Unify client relationships, interactive WhatsApp proposals, automated tax billing, multi-channel payment receipting, and SLFRS double-entry accounting in one synchronized cloud platform.
        </p>

        {/* 5 Core Trust Pillars */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px',
          maxWidth: '850px', margin: '0 auto 36px auto'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#10b981" /> 100% SLFRS / LKAS Compliant
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#38bdf8" /> Decimal-Safe Financial Math
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#a855f7" /> WhatsApp & SMS Hub Native
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#f59e0b" /> Sub-Second Supabase Cloud Sync
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#ec4899" /> Publication-Grade Vector PDF Engine
          </span>
        </div>

        {/* Hero Quick Navigation CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link to="/quotations" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: 800 }}>
            <FileText size={18} /> Launch Quotation Builder
          </Link>
          <Link to="/reports" className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: 700 }}>
            <BarChart3 size={18} /> Explore Financial Analytics
          </Link>
          <Link to="/customers" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700 }}>
            <Users size={18} /> Manage Customer Ledger
          </Link>
        </div>

      </div>

      {/* FILTER CONTROLS & SEARCH BAR */}
      <div style={{
        display: 'flex', flexDirection: 'column', mdDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center', gap: '16px',
        marginBottom: '28px', flexWrap: 'wrap'
      }}>
        {/* Category Pill Filters */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px', border: 'none',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                <Icon size={15} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search all 13 modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: '40px', padding: '0 14px 0 38px',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* FEATURE CARDS GRID (ALL 13 ENTERPRISE MODULES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {filteredModules.map(mod => {
          const Icon = mod.icon;
          return (
            <div 
              key={mod.id}
              className="glass-panel hover-lift"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '28px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.25s ease'
              }}
            >
              <div>
                {/* Header Icon & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '12px',
                    background: `${mod.accentColor}18`,
                    color: mod.accentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${mod.accentColor}33`
                  }}>
                    <Icon size={24} />
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px',
                    borderRadius: '20px', background: 'rgba(255, 255, 255, 0.06)',
                    color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)',
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {mod.badge}
                  </span>
                </div>

                {/* Module Title & Summary */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                  {mod.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
                  {mod.summary}
                </p>

                {/* Micro-Features Bullet Points */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Production Capabilities:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {mod.features.map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                        <Check size={14} color={mod.accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <Link 
                to={mod.route}
                className="btn btn-secondary"
                style={{
                  width: '100%', height: '42px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontSize: '0.84rem', fontWeight: 700,
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <span>Launch {mod.title.split(' ')[0]} Module</span>
                <ChevronRight size={16} />
              </Link>

            </div>
          );
        })}
      </div>

      {/* ENTERPRISE COMPARISON MATRIX */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '24px',
        padding: '36px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Competitive Advantage
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
            Why Seynex Replaces 5 Disconnected Software Tools
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '600px', margin: '6px auto 0 auto' }}>
            Eliminate copy-pasting customer records between CRM, Excel sheets, manual invoices, and external accounting software.
          </p>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 20px', width: '30%' }}>Core Workflow Capability</th>
                <th style={{ padding: '14px 20px', width: '25%', color: '#94a3b8' }}>Fragmented Tools / Spreadsheets</th>
                <th style={{ padding: '14px 20px', width: '45%', color: 'var(--success)', fontWeight: 800 }}>Seynex Enterprise Sales Cloud</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>Quotation to Invoice Conversion</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Manual re-typing & price errors</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ 1-Click direct conversion with preserved QT → INV relationship</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>Interactive Negotiation</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Back-and-forth emails, lost records</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ Secure link with Propose Budget counter offer modal & audit log</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>WhatsApp Integration</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Manual copy-paste of links</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ Native pre-filled wa.me links on Quotes, Invoices, and Payment Receipts</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>Payment Receipts & Debtors</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Disconnected ledger; manual follow-up</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ Standalone Receipt PDF generated automatically; real-time aging Debtors</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>Statutory Accounting</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Requires separate accounting package</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ Built-in SLFRS Double-Entry Ledger, Trial Balance, P&L, and Balance Sheet</td>
              </tr>
              <tr>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>Recurring Subscriptions</td>
                <td style={{ padding: '14px 20px', color: '#ef4444' }}>❌ Missed renewals and revenue loss</td>
                <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 700 }}>✅ Prompted frequency on payment; auto next renewal date; 1-click renewal billing</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FINAL MARKETING CALL TO ACTION */}
      <div style={{
        borderRadius: '24px',
        padding: '48px 36px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ 
          width: '54px', height: '54px', borderRadius: '16px',
          background: 'var(--success)', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
        }}>
          <Sparkles size={28} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', marginBottom: '10px' }}>
          Elevate Your Sales Operations Today
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 28px auto', lineHeight: 1.5 }}>
          All features are completely connected to your production database. Create a proposal, send a WhatsApp link, and track the live audit trail immediately.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link to="/quotations" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '0.95rem', fontWeight: 800 }}>
            <FileText size={18} /> Create New Quotation
          </Link>
          <Link to="/debtors" className="btn btn-secondary" style={{ padding: '12px 26px', fontSize: '0.95rem', fontWeight: 700 }}>
            <Clock size={18} /> View Debtors Ledger
          </Link>
          <Link to="/settings" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700 }}>
            <SettingsIcon size={18} /> Workspace Settings
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Features;
