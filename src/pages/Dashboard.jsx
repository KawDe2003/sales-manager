import React, { useContext, useState, useMemo } from 'react';
import { StoreContext, DEFAULT_DASHBOARD_CONFIG } from '../context/StoreContext';
import { 
  Users, Target, Activity, 
  TrendingUp, TrendingDown, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Globe,
  FileText, PlusCircle, CreditCard, Award, AlertCircle, Calendar, Plus,
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, UserCheck,
  Wallet, Layers, ArrowRight, ShieldAlert, Sparkles, Filter, DollarSign,
  Percent, ArrowRightCircle, Package, Truck, Factory, ShoppingCart, Scale, Check, Building2,
  Sliders, X, RotateCcw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from '../components/DatePicker';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Line, LineChart
} from 'recharts';

// Modern Glassmorphism & Neon Glow Tooltip
const ModernGlassTooltip = ({ active, payload, label, currency = 'LKR', isPercent = false, isDark = true }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: isDark ? 'rgba(11, 15, 20, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(15, 23, 42, 0.12)',
      boxShadow: isDark 
        ? '0 16px 36px -8px rgba(0, 0, 0, 0.8), 0 0 24px rgba(16, 185, 129, 0.16)' 
        : '0 16px 36px -8px rgba(15, 23, 42, 0.14), 0 0 20px rgba(5, 150, 105, 0.08)',
      borderRadius: '12px',
      padding: '12px 16px',
      minWidth: '200px',
      color: isDark ? '#fff' : '#0f172a',
      zIndex: 1000
    }}>
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isDark ? '#94a3b8' : '#64748b',
        marginBottom: '8px',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
        paddingBottom: '5px'
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {payload.map((entry, idx) => (
          <div key={`tip-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: entry.color || entry.fill,
                boxShadow: `0 0 8px ${entry.color || entry.fill}`
              }}></span>
              <span style={{ fontSize: '0.75rem', color: isDark ? '#cbd5e1' : '#334155', fontWeight: 600 }}>{entry.name}</span>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontFamily: 'var(--font-mono, monospace)' }}>
              {typeof entry.value === 'number'
                ? (isPercent || entry.unit === '%' ? `${entry.value}%` : `${currency} ${entry.value.toLocaleString()}`)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    customers = [], 
    invoices = [], 
    quotes = [], 
    leads = [],
    expenses = [],
    payments = [],
    activityLogs = [],
    inventory = [],
    productionOrders = [],
    theme = 'dark',
    setQuickSaleOpen,
    activeBusinessId,
    activeBusiness,
    dashboardConfig = {},
    updateDashboardConfig
  } = useContext(StoreContext) || {};
  const isDark = theme !== 'light';

  // --- DASHBOARD CUSTOMIZATION MODAL STATE ---
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // --- GLOBAL DATE FILTER STATE ---
  const [dateFilter, setDateFilter] = useState('30d'); // 'today', '7d', '30d', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Current Calendar Month Range
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Date Range Calculator
  const dateRange = useMemo(() => {
    const end = new Date(now);
    let start = new Date(now);

    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (dateFilter === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    } else {
      start.setDate(now.getDate() - 30);
    }

    return { start, end };
  }, [dateFilter, customStart, customEnd]);

  const isWithinRange = (dateStr, start, end) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  // --- SECTION 12 MANDATORY REAL-DATABASE METRICS ---

  // 1. Total Customers
  const totalCustomersCount = customers.length;

  // 2. Quotations This Month
  const quotesThisMonth = useMemo(() => quotes.filter(q => {
    const dStr = q.date || q.createdAt;
    if (!dStr) return false;
    const d = new Date(dStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [quotes, currentMonth, currentYear]);

  // 3. Accepted Quotations (This Month)
  const acceptedQuotesThisMonth = useMemo(() => 
    quotesThisMonth.filter(q => q.status === 'Accepted' || q.status === 'Converted to Invoice'),
    [quotesThisMonth]
  );

  // 4. Rejected Quotations (This Month)
  const rejectedQuotesThisMonth = useMemo(() => 
    quotesThisMonth.filter(q => q.status === 'Rejected'),
    [quotesThisMonth]
  );

  // [SUGGESTED] Conversion Rate Card: Sent quotations -> Accepted this month as %
  const sentOrDecidedQuotesThisMonth = useMemo(() => 
    quotesThisMonth.filter(q => ['Sent', 'Pending', 'Counter Offer', 'Accepted', 'Converted to Invoice', 'Rejected'].includes(q.status)),
    [quotesThisMonth]
  );

  const quoteConversionRate = useMemo(() => {
    const base = sentOrDecidedQuotesThisMonth.length > 0 ? sentOrDecidedQuotesThisMonth.length : quotesThisMonth.length;
    if (base === 0) return 0;
    return Math.round((acceptedQuotesThisMonth.length / base) * 100);
  }, [sentOrDecidedQuotesThisMonth, quotesThisMonth, acceptedQuotesThisMonth]);

  // 5. Total Invoiced (This Month)
  const invoicesThisMonth = useMemo(() => invoices.filter(inv => {
    const dStr = inv.date || inv.createdAt;
    if (!dStr) return false;
    const d = new Date(dStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [invoices, currentMonth, currentYear]);

  const totalInvoicedThisMonth = useMemo(() => 
    invoicesThisMonth.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    [invoicesThisMonth]
  );

  // 6. Total Collected (This Month)
  const totalCollectedThisMonth = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const pList = inv.payments || [];
      const thisMonthPayments = pList.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      if (thisMonthPayments.length > 0) {
        return sum + thisMonthPayments.reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
      }
      if (inv.status === 'Paid') {
        const dStr = inv.date || inv.createdAt;
        if (dStr) {
          const d = new Date(dStr);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            return sum + (Number(inv.amount) || 0);
          }
        }
      }
      return sum;
    }, 0);
  }, [invoices, currentMonth, currentYear]);

  // 7. Outstanding / Debtors Total (Real outstanding > 0 across all invoices)
  const totalOutstandingDebtors = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === 'Paid' || inv.status === 'Closed') return sum;
      const total = Number(inv.amount) || 0;
      const paid = (inv.payments || []).reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
      const out = Math.max(0, total - paid);
      return sum + out;
    }, 0);
  }, [invoices]);

  // 8. Overdue Amount
  const totalOverdueAmount = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status !== 'Overdue') return sum;
      const total = Number(inv.amount) || 0;
      const paid = (inv.payments || []).reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [invoices]);

  // 9. Upcoming Renewals (Next 30 Days)
  const upcomingRenewalsCount = useMemo(() => {
    return customers.filter(c => {
      if (!c.nextRenewalDate || c.renewalFrequency === 'One Time') return false;
      const rDate = new Date(c.nextRenewalDate);
      const diffDays = Math.ceil((rDate - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;
  }, [customers, now]);

  // [SUGGESTED] Top 5 Customers by Total Invoiced Amount This Month
  const topCustomersThisMonth = useMemo(() => {
    const map = {};
    const dataset = invoicesThisMonth.length > 0 ? invoicesThisMonth : invoices;
    dataset.forEach(inv => {
      const name = inv.customerName || inv.prospectName || 'Unknown Client';
      map[name] = (map[name] || 0) + (Number(inv.amount) || 0);
    });

    return Object.entries(map)
      .map(([name, total]) => {
        const cust = customers.find(c => (c.name || c.gymName) === name);
        return {
          id: cust?.id,
          name,
          total,
          phone: cust?.phone || cust?.mobile || 'N/A',
          tag: cust?.customerTag || 'Standard'
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoicesThisMonth, invoices, customers]);

  // --- EXECUTIVE REAL-TIME PROFIT & LOSS (P&L) ENGINE ---
  const [pnlPeriod, setPnlPeriod] = useState('ytd'); // 'this_month' | 'last_month' | 'qtd' | 'ytd' | 'all'
  const [pnlChartTab, setPnlChartTab] = useState('bars'); // 'bars' | 'margins'

  const pnlRange = useMemo(() => {
    let start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    let end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    let label = `Year-to-Date (${now.getFullYear()})`;

    if (pnlPeriod === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `This Month (${now.toLocaleString('default', { month: 'short', year: 'numeric' })})`;
    } else if (pnlPeriod === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      label = `Last Month (${lastMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' })})`;
    } else if (pnlPeriod === 'qtd') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
      label = `Quarter ${q + 1} (QTD ${now.getFullYear()})`;
    } else if (pnlPeriod === 'all') {
      start = new Date(2020, 0, 1);
      end = new Date(2035, 11, 31);
      label = 'All Historical Records';
    }

    return { start, end, label };
  }, [pnlPeriod, now]);

  const periodInvoices = useMemo(() => {
    if (pnlPeriod === 'all') return invoices;
    return invoices.filter(inv => {
      const dStr = inv.date || inv.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return d >= pnlRange.start && d <= pnlRange.end;
    });
  }, [invoices, pnlRange, pnlPeriod]);

  const periodExpenses = useMemo(() => {
    if (pnlPeriod === 'all') return expenses;
    return expenses.filter(exp => {
      const dStr = exp.date || exp.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return d >= pnlRange.start && d <= pnlRange.end;
    });
  }, [expenses, pnlRange, pnlPeriod]);

  // Cost of Goods Sold (COGS) Calculation
  const cogsBreakdown = useMemo(() => {
    let totalCogs = 0;
    const itemized = [];
    
    periodInvoices.forEach(inv => {
      const items = inv.items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const qty = Number(it.qty || it.quantity || 1);
          const unitPrice = Number(it.unitPrice || it.price || 0);
          const itAmt = Number(it.amount != null ? it.amount : qty * unitPrice) || 0;
          
          let unitCost = 0;
          let costSource = 'default';
          
          if (it.costPrice != null && Number(it.costPrice) > 0) {
            unitCost = Number(it.costPrice);
            costSource = 'item_cost';
          } else if (it.unitCost != null && Number(it.unitCost) > 0) {
            unitCost = Number(it.unitCost);
            costSource = 'unit_cost';
          } else {
            // Find inventory match
            const match = (inventory || []).find(invItem => 
              invItem.name && it.name && (
                invItem.name.toLowerCase().includes(it.name.toLowerCase()) || 
                it.name.toLowerCase().includes(invItem.name.toLowerCase())
              )
            );
            if (match && match.costPrice && match.price) {
              const ratio = Number(match.costPrice) / Number(match.price);
              unitCost = unitPrice * ratio;
              costSource = 'inventory_matched';
            } else {
              const defaultRatio = 0.35;
              unitCost = unitPrice * defaultRatio;
              costSource = 'industry_standard';
            }
          }
          
          const lineCogs = Math.round(unitCost * qty);
          totalCogs += lineCogs;
          itemized.push({
            name: it.name || 'Sales Item',
            qty,
            unitCost,
            lineCogs,
            costSource
          });
        });
      } else {
        const invTotal = Number(inv.amount || inv.totalAmount) || 0;
        const defaultRatio = 0.35;
        totalCogs += Math.round(invTotal * defaultRatio);
      }
    });

    return { totalCogs, itemized };
  }, [periodInvoices, inventory]);

  // Operating Expenses (OPEX) Calculation
  const opexBreakdown = useMemo(() => {
    let totalOpex = 0;
    const byCategory = {};
    
    periodExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      totalOpex += amt;
      const cat = exp.category || 'General Administration';
      byCategory[cat] = (byCategory[cat] || 0) + amt;
    });

    return { totalOpex, byCategory };
  }, [periodExpenses]);

  // Core P&L Financial Totals
  const grossRevenue = useMemo(() => {
    return periodInvoices.reduce((s, inv) => s + (Number(inv.amount || inv.totalAmount) || 0), 0);
  }, [periodInvoices]);

  const grossProfit = Math.max(0, grossRevenue - cogsBreakdown.totalCogs);
  const grossMarginPct = grossRevenue > 0 ? ((grossProfit / grossRevenue) * 100).toFixed(1) : '0.0';

  const netProfit = grossProfit - opexBreakdown.totalOpex;
  const netMarginPct = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0';

  const cogsPercentOfRev = grossRevenue > 0 ? Math.min(100, Math.round((cogsBreakdown.totalCogs / grossRevenue) * 100)) : 0;
  const opexPercentOfRev = grossRevenue > 0 ? Math.min(100, Math.round((opexBreakdown.totalOpex / grossRevenue) * 100)) : 0;
  const netPercentOfRev = grossRevenue > 0 ? Math.max(0, Math.round((netProfit / grossRevenue) * 100)) : 0;

  // 6-Month Comparative P&L Trend Dataset
  const pnlMonthlyTrends = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const list = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();

      const mInvs = invoices.filter(inv => {
        const idate = new Date(inv.date || inv.createdAt);
        return idate.getMonth() === mIdx && idate.getFullYear() === yr;
      });

      const mExps = expenses.filter(exp => {
        const edate = new Date(exp.date || exp.createdAt);
        return edate.getMonth() === mIdx && edate.getFullYear() === yr;
      });

      const mRev = mInvs.reduce((s, inv) => s + (Number(inv.amount || inv.totalAmount) || 0), 0);
      
      let mCogs = 0;
      mInvs.forEach(inv => {
        const invTotal = Number(inv.amount || inv.totalAmount) || 0;
        const items = inv.items || [];
        if (items.length > 0) {
          items.forEach(it => {
            const itAmt = Number(it.amount != null ? it.amount : (Number(it.qty || 1) * Number(it.unitPrice || 0))) || 0;
            const match = (inventory || []).find(invItem => 
              invItem.name && it.name && (
                invItem.name.toLowerCase().includes(it.name.toLowerCase()) || 
                it.name.toLowerCase().includes(invItem.name.toLowerCase())
              )
            );
            if (match && match.costPrice && match.price) {
              mCogs += itAmt * (Number(match.costPrice) / Number(match.price));
            } else {
              mCogs += itAmt * 0.35;
            }
          });
        } else {
          mCogs += invTotal * 0.35;
        }
      });

      const mGp = Math.max(0, mRev - mCogs);
      const mOpex = mExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const mNet = mGp - mOpex;
      const mGmPct = mRev > 0 ? Math.round((mGp / mRev) * 100) : 0;
      const mNetPct = mRev > 0 ? Math.round((mNet / mRev) * 100) : 0;

      list.push({
        month: monthNames[mIdx],
        year: yr,
        label: `${monthNames[mIdx]} '${String(yr).slice(-2)}`,
        revenue: mRev,
        cogs: Math.round(mCogs),
        grossProfit: Math.round(mGp),
        expenses: mOpex,
        netProfit: Math.round(mNet),
        grossMarginPct: mGmPct,
        netMarginPct: mNetPct
      });
    }
    return list;
  }, [invoices, expenses, inventory, now]);

  // --- CUSTOMIZABLE MONTHLY REVENUE TARGET METRICS ---
  const currentMonthAchieved = totalCollectedThisMonth;
  const monthlyTarget = Number(dashboardConfig?.monthlyTarget) || 1000000;
  const targetProgressPct = monthlyTarget > 0 ? Math.min(1000, Math.round((currentMonthAchieved / monthlyTarget) * 100)) : 0;
  const remainingToTarget = Math.max(0, monthlyTarget - currentMonthAchieved);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(0, daysInCurrentMonth - now.getDate());

  // --- CHARTS & VISUALIZATIONS DATA ---
  const [financeChartMode, setFinanceChartMode] = useState('revenue_collections'); // 'revenue_collections' | 'cashflow_profit' | 'billing_trajectory'
  const [activeFunnelStage, setActiveFunnelStage] = useState(null);

  // 1. Comprehensive Financial Studio (last 6 months)
  const financialStudioData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      
      const monthInvs = invoices.filter(inv => {
        const iDate = new Date(inv.date || inv.createdAt);
        return iDate.getMonth() === mIdx && iDate.getFullYear() === yr;
      });

      const invoiced = monthInvs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const collected = monthInvs.reduce((s, i) => {
        const pList = i.payments || [];
        if (pList.length > 0) {
          return s + pList.reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
        }
        return s + (i.status === 'Paid' ? (Number(i.amount) || 0) : 0);
      }, 0);

      const monthExps = (expenses || []).filter(e => {
        if (!e.date) return false;
        const ed = new Date(e.date);
        return ed.getMonth() === mIdx && ed.getFullYear() === yr;
      });
      const monthExpenses = monthExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const netProfit = collected - monthExpenses;
      const collectionRate = invoiced > 0 ? Math.min(100, Math.round((collected / invoiced) * 100)) : (collected > 0 ? 100 : 0);

      months.push({
        name: monthNames[mIdx],
        year: yr,
        invoiced,
        collected,
        expenses: monthExpenses,
        netProfit,
        collectionRate
      });
    }
    return months;
  }, [invoices, expenses, now]);

  // Backward compatibility alias for trendData
  const trendData = financialStudioData;

  const financialTotals = useMemo(() => {
    const totalInvoiced = financialStudioData.reduce((s, m) => s + m.invoiced, 0);
    const totalCollected = financialStudioData.reduce((s, m) => s + m.collected, 0);
    const totalExpenses = financialStudioData.reduce((s, m) => s + m.expenses, 0);
    const totalNet = totalCollected - totalExpenses;
    const avgCollectionEfficiency = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
    return { totalInvoiced, totalCollected, totalExpenses, totalNet, avgCollectionEfficiency };
  }, [financialStudioData]);

  // 2. Quotation Status Breakdown (Donut Chart)
  const quoteStatusDonut = useMemo(() => {
    const counts = {
      'Draft': quotes.filter(q => q.status === 'Draft').length,
      'Sent': quotes.filter(q => q.status === 'Sent' || q.status === 'Pending').length,
      'Accepted': quotes.filter(q => q.status === 'Accepted' || q.status === 'Converted to Invoice').length,
      'Counter Offer': quotes.filter(q => q.status === 'Counter Offer').length,
      'Rejected': quotes.filter(q => q.status === 'Rejected').length,
      'Expired': quotes.filter(q => q.status === 'Expired').length,
    };

    const colors = {
      'Draft': isDark ? '#94a3b8' : '#64748b',
      'Sent': isDark ? '#38bdf8' : '#0284c7',
      'Accepted': isDark ? '#10b981' : '#059669',
      'Counter Offer': isDark ? '#f59e0b' : '#d97706',
      'Rejected': isDark ? '#ef4444' : '#dc2626',
      'Expired': isDark ? '#6b7280' : '#475569'
    };

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || (isDark ? '#94a3b8' : '#64748b')
      }));
  }, [quotes, isDark]);

  // 3. Debtor & Receivable Aging Analysis
  const debtorAgingData = useMemo(() => {
    const buckets = [
      { key: 'current', label: '0-30 Days', desc: 'Current', min: 0, max: 30, amount: 0, count: 0, color: isDark ? '#10b981' : '#059669', gradient: isDark ? ['#10b981', '#059669'] : ['#059669', '#047857'] },
      { key: 'mild', label: '31-60 Days', desc: 'Mild Overdue', min: 31, max: 60, amount: 0, count: 0, color: isDark ? '#f59e0b' : '#d97706', gradient: isDark ? ['#f59e0b', '#d97706'] : ['#d97706', '#b45309'] },
      { key: 'medium', label: '61-90 Days', desc: 'Aging Risk', min: 61, max: 90, amount: 0, count: 0, color: isDark ? '#f97316' : '#ea580c', gradient: isDark ? ['#f97316', '#ea580c'] : ['#ea580c', '#c2410c'] },
      { key: 'critical', label: '90+ Days', desc: 'Delinquent', min: 91, max: 99999, amount: 0, count: 0, color: isDark ? '#ef4444' : '#dc2626', gradient: isDark ? ['#ef4444', '#dc2626'] : ['#dc2626', '#b91c1c'] }
    ];

    invoices.forEach(inv => {
      if (inv.status === 'Paid' || inv.status === 'Closed' || inv.status === 'Cancelled') return;
      const total = Number(inv.amount) || 0;
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const out = Math.max(0, total - paid);
      if (out <= 0) return;

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date || inv.createdAt || now);
      const diffDays = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)));

      const bucket = buckets.find(b => diffDays >= b.min && diffDays <= b.max) || buckets[buckets.length - 1];
      bucket.amount += out;
      bucket.count += 1;
    });

    return buckets;
  }, [invoices, now, isDark]);

  const totalAgingDebt = useMemo(() => debtorAgingData.reduce((s, b) => s + b.amount, 0), [debtorAgingData]);
  const criticalDebt = useMemo(() => (debtorAgingData.find(b => b.key === 'critical')?.amount || 0) + (debtorAgingData.find(b => b.key === 'medium')?.amount || 0), [debtorAgingData]);

  // 4. Sales Conversion Funnel Data
  const salesFunnelData = useMemo(() => {
    const totalLeadsCount = leads.length;
    const leadsValue = leads.reduce((s, l) => s + (Number(l.estimatedBudget || l.budget || l.value) || 0), 0);

    const quotesCount = quotes.length;
    const quotesValue = quotes.reduce((s, q) => s + (Number(q.amount) || 0), 0);

    const activeQuotes = quotes.filter(q => ['Sent', 'Pending', 'Counter Offer'].includes(q.status));
    const activeQuotesCount = activeQuotes.length;
    const activeQuotesValue = activeQuotes.reduce((s, q) => s + (Number(q.amount) || 0), 0);

    const acceptedQuotes = quotes.filter(q => ['Accepted', 'Converted to Invoice'].includes(q.status));
    const acceptedCount = acceptedQuotes.length;
    const acceptedValue = acceptedQuotes.reduce((s, q) => s + (Number(q.amount) || 0), 0);

    const paidInvoices = invoices.filter(i => i.status === 'Paid');
    const paidCount = paidInvoices.length;
    const paidValue = totalCollectedThisMonth > 0 ? totalCollectedThisMonth : invoices.reduce((s, i) => {
      const pTotal = (i.payments || []).reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
      return s + (i.status === 'Paid' ? (Number(i.amount) || 0) : pTotal);
    }, 0);

    return [
      {
        id: 'leads',
        name: 'Inbound Prospects',
        step: '01',
        count: totalLeadsCount,
        value: leadsValue,
        icon: Users,
        color: isDark ? '#38bdf8' : '#0284c7',
        gradient: isDark 
          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(14, 165, 233, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(2, 132, 199, 0.02) 100%)',
        border: isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(2, 132, 199, 0.35)',
        glow: isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.15)',
        convRate: totalLeadsCount > 0 ? Math.min(100, Math.round((quotesCount / totalLeadsCount) * 100)) : 0,
        convLabel: 'Proposal Rate'
      },
      {
        id: 'proposals',
        name: 'Proposals Issued',
        step: '02',
        count: quotesCount,
        value: quotesValue,
        icon: FileText,
        color: isDark ? '#818cf8' : '#4f46e5',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(129, 140, 248, 0.22) 0%, rgba(99, 102, 241, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(79, 70, 229, 0.02) 100%)',
        border: isDark ? 'rgba(129, 140, 248, 0.45)' : 'rgba(79, 70, 229, 0.35)',
        glow: isDark ? 'rgba(129, 140, 248, 0.35)' : 'rgba(79, 70, 229, 0.15)',
        convRate: quotesCount > 0 ? Math.min(100, Math.round(((activeQuotesCount + acceptedCount) / quotesCount) * 100)) : 0,
        convLabel: 'Engagement Rate'
      },
      {
        id: 'negotiation',
        name: 'Active Negotiation',
        step: '03',
        count: activeQuotesCount,
        value: activeQuotesValue,
        icon: Target,
        color: isDark ? '#f59e0b' : '#d97706',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(217, 119, 6, 0.02) 100%)',
        border: isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(217, 119, 6, 0.35)',
        glow: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.15)',
        convRate: (activeQuotesCount + acceptedCount) > 0 ? Math.min(100, Math.round((acceptedCount / Math.max(1, activeQuotesCount + acceptedCount)) * 100)) : 0,
        convLabel: 'Closing Ratio'
      },
      {
        id: 'closed',
        name: 'Deals Won & Accepted',
        step: '04',
        count: acceptedCount,
        value: acceptedValue,
        icon: CheckCircle2,
        color: isDark ? '#10b981' : '#059669',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(5, 150, 105, 0.02) 100%)',
        border: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(5, 150, 105, 0.35)',
        glow: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.15)',
        convRate: quotesCount > 0 ? Math.min(100, Math.round((acceptedCount / quotesCount) * 100)) : (totalLeadsCount > 0 ? quoteConversionRate : 0),
        convLabel: 'Deal Win Rate'
      },
      {
        id: 'realized',
        name: 'Revenue Realized',
        step: '05',
        count: paidCount,
        value: paidValue,
        icon: Award,
        color: isDark ? '#22d3ee' : '#0891b2',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.22) 0%, rgba(6, 182, 212, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(8, 145, 178, 0.12) 0%, rgba(8, 145, 178, 0.02) 100%)',
        border: isDark ? 'rgba(34, 211, 238, 0.45)' : 'rgba(8, 145, 178, 0.35)',
        glow: isDark ? 'rgba(34, 211, 238, 0.35)' : 'rgba(8, 145, 178, 0.15)',
        convRate: invoices.length > 0 ? Math.min(100, Math.round((paidCount / Math.max(1, invoices.length)) * 100)) : 0,
        convLabel: 'Realization %'
      }
    ];
  }, [leads, quotes, invoices, totalCollectedThisMonth, quoteConversionRate, isDark]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px', animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      
      {/* HEADER WITH QUICK BUTTONS & DATE SELECTOR */}
      <div className="page-hero" style={{ position: 'relative', zIndex: 50, paddingBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="h1 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                Sales Management Dashboard
              </h1>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '20px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {activeBusiness?.name || 'Seynex Enterprises'}
              </span>
            </div>
            <p className="text-secondary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', 
                boxShadow: '0 0 10px var(--success)'
              }}></span>
              Real-Time Enterprise Financials & CRM Insights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button 
              id="dashboard-customize-layout-btn"
              onClick={() => setShowCustomizeModal(true)}
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '7px'
              }}
              title="Customize dashboard cards, metrics, and sales target"
            >
              <Sliders size={15} /> Customize
            </button>
            <button 
              id="dashboard-quick-sale-bill-btn"
              onClick={() => setQuickSaleOpen(true)}
              className="btn"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                cursor: 'pointer'
              }}
              title="⚡ Quick Sales Billing / Instant Invoice"
            >
              <Sparkles size={16} /> ⚡ Quick Sale
            </button>
            <Link to="/invoices" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <CreditCard size={16} /> Invoices
            </Link>
            <Link to="/customers" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Customer
            </Link>
          </div>
        </div>
      </div>

      {/* MONTHLY REVENUE TARGET PROGRESS WIDGET */}
      {dashboardConfig?.showMonthlyTarget !== false && (
        <div className="glass-panel hover-lift" style={{
          marginBottom: '20px',
          padding: '20px 24px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)',
          border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(99, 102, 241, 0.18)',
          borderRadius: '16px',
          boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.4)' : '0 8px 20px rgba(0, 0, 0, 0.06)'
        }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-primary)',
                boxShadow: '0 0 14px rgba(99, 102, 241, 0.25)'
              }}>
                <Target size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Monthly Sales Target Goal
                  </h3>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                    background: targetProgressPct >= 100 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(99, 102, 241, 0.15)',
                    color: targetProgressPct >= 100 ? '#10b981' : 'var(--accent-primary)',
                    border: targetProgressPct >= 100 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.25)'
                  }}>
                    {targetProgressPct >= 100 ? '🎉 Goal Achieved!' : `${targetProgressPct}% Achieved`}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  LKR {currentMonthAchieved.toLocaleString()} collected of LKR {monthlyTarget.toLocaleString()} monthly goal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {remainingDaysInMonth} days remaining
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: remainingToTarget > 0 ? 'var(--text-secondary)' : '#10b981' }}>
                  {remainingToTarget > 0 ? `LKR ${remainingToTarget.toLocaleString()} left` : 'Target surpassed!'}
                </div>
              </div>
              <button
                onClick={() => setShowCustomizeModal(true)}
                className="btn btn-secondary"
                style={{ height: '34px', padding: '0 12px', fontSize: '0.78rem', borderRadius: '8px' }}
                title="Adjust monthly target or layout"
              >
                <Sliders size={13} /> Adjust Goal
              </button>
            </div>
          </div>

          {/* Target Progress Bar */}
          <div style={{
            width: '100%', height: '10px', borderRadius: '999px',
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(100, targetProgressPct)}%`,
              height: '100%',
              borderRadius: '999px',
              background: targetProgressPct >= 100
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : targetProgressPct >= 50
                ? 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)'
                : 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
              boxShadow: targetProgressPct >= 100
                ? '0 0 12px rgba(16, 185, 129, 0.5)'
                : '0 0 12px rgba(99, 102, 241, 0.4)',
              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }} />
          </div>
        </div>
      )}

      {/* KPI ROW 1: CUSTOMERS & PIPELINE */}
      {dashboardConfig?.showQuotationKpis !== false && (
      <div style={{ marginBottom: '16px' }}>
        <div className="flex justify-between items-center mb-2">
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Quotation Pipeline & Customer Base
          </div>
        </div>

        {/* SEYNEX ENTERPRISE QUOTATION ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Customers</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)', color: isDark ? '#38bdf8' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalCustomersCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Active Client Portfolio
            </div>
          </div>

          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Quotes (This Month)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.12)', color: isDark ? '#818cf8' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {quotesThisMonth.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total generated this month
            </div>
          </div>

          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Accepted Quotes</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)', color: isDark ? 'var(--success)' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? 'var(--success)' : '#059669' }}>
              {acceptedQuotesThisMonth.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Confirmed & Invoiced deals
            </div>
          </div>

          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rejected Quotes</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(225, 29, 72, 0.12)', color: isDark ? 'var(--danger)' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? 'var(--danger)' : '#dc2626' }}>
              {rejectedQuotesThisMonth.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Declined proposals
            </div>
          </div>

          <div className="glass-panel hover-lift" style={{ 
            padding: '20px', 
            border: isDark ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid rgba(5, 150, 105, 0.35)',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0.04) 100%)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? 'var(--success)' : '#059669' }}>Conversion Rate</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'var(--success)' : '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {quoteConversionRate}%
            </div>
            <div style={{ fontSize: '0.7rem', color: isDark ? 'var(--success)' : '#059669', fontWeight: 700, marginTop: '4px' }}>
              Sent → Accepted this month
            </div>
          </div>
        </div>
      </div>
      )}

      {/* KPI ROW 2: FINANCIALS, COLLECTIONS & RENEWALS */}
      {dashboardConfig?.showFinancialKpis !== false && (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Revenue, Collections & Debtors
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Billing */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Invoiced (Month)
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.12)', color: isDark ? '#818cf8' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }} className="metric-value">
              LKR {totalInvoicedThisMonth.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Issued billing volume
            </div>
          </div>

          {/* Card 2: Cash Collected */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Collected (Month)
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)', color: isDark ? 'var(--success)' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isDark ? 'var(--success)' : '#059669' }} className="metric-value">
              LKR {totalCollectedThisMonth.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Actual cash received
            </div>
          </div>

          {/* Card 3: Debtors */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Total Debtors
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)', color: isDark ? '#fbbf24' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isDark ? '#fbbf24' : '#d97706' }} className="metric-value">
              LKR {totalOutstandingDebtors.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Outstanding & partial dues
            </div>
          </div>

          {/* Card 4: Overdue */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Overdue Amount
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(225, 29, 72, 0.12)', color: isDark ? '#f87171' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isDark ? '#f87171' : '#dc2626' }} className="metric-value">
              LKR {totalOverdueAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Past due payment dates
            </div>
          </div>

          {/* Card 5: Renewals (Seynex) */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Renewals (30 Days)
              </span>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '10px', 
                background: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(147, 51, 234, 0.12)', 
                color: isDark ? '#c084fc' : '#7c3aed', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <RefreshCw size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: isDark ? '#c084fc' : '#7c3aed' }}>
              {upcomingRenewalsCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Subscriptions due soon
            </div>
          </div>

        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* EXECUTIVE REAL-TIME PROFIT & LOSS (P&L) CENTER                            */}
      {/* ========================================================================= */}
      {dashboardConfig?.showProfitLoss !== false && (
      <div className="glass-panel mb-8" style={{
        padding: '24px',
        borderRadius: '18px',
        background: isDark
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(11, 15, 20, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%)',
        border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(5, 150, 105, 0.25)',
        boxShadow: isDark
          ? '0 24px 48px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.08)'
          : '0 16px 36px -10px rgba(15, 23, 42, 0.12), 0 0 20px rgba(5, 150, 105, 0.06)'
      }}>
        {/* P&L Suite Header & Period Selector */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isDark ? '0 0 20px rgba(16, 185, 129, 0.25)' : 'none'
            }}>
              <Scale color={isDark ? "#34d399" : "#059669"} size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="h3" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Executive Profit & Loss Statement (P&L)
                </h3>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)',
                  color: isDark ? '#34d399' : '#059669',
                  border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(5, 150, 105, 0.2)'
                }}>
                  LKAS / SLFRS REAL-TIME
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Turnover, Cloud Infrastructure Delivery Costs (COGS) & Operating Net Margin
              </p>
            </div>
          </div>

          {/* Interactive Period Filter Pill Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.05)',
            padding: '4px',
            borderRadius: '10px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'qtd', label: 'Quarter-to-Date' },
              { id: 'ytd', label: 'Year-to-Date (2026)' },
              { id: 'all', label: 'All Records' }
            ].map(tab => {
              const active = pnlPeriod === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPnlPeriod(tab.id)}
                  style={{
                    padding: '6px 13px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: active 
                      ? (isDark ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)')
                      : 'transparent',
                    color: active ? '#ffffff' : (isDark ? 'var(--text-secondary)' : '#475569'),
                    boxShadow: active ? '0 4px 12px rgba(5, 150, 105, 0.35)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Key Executive Scorecards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          
          {/* Card 1: Gross Sales Revenue */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '18px', 
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(2, 132, 199, 0.2)',
            background: isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(2, 132, 199, 0.03)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>
                Gross Sales Revenue
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)', color: isDark ? '#38bdf8' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)' }} className="metric-value">
              LKR {grossRevenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {periodInvoices.length} billed {periodInvoices.length === 1 ? 'order' : 'orders'} (100% Turnover)
            </div>
          </div>

          {/* Card 2: Cost of Goods Sold (COGS) */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '18px', 
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(217, 119, 6, 0.2)',
            background: isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(217, 119, 6, 0.03)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#fbbf24' : '#d97706' }}>
                Cost of Goods Sold (COGS)
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.1)', color: isDark ? '#fbbf24' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#fbbf24' : '#d97706' }} className="metric-value">
              LKR {cogsBreakdown.totalCogs.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {cogsPercentOfRev}% of Gross Revenue
            </div>
          </div>

          {/* Card 3: Gross Operating Profit */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '18px', 
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(5, 150, 105, 0.3)',
            background: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(5, 150, 105, 0.04)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#34d399' : '#059669' }}>
                Gross Operating Profit
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.12)', color: isDark ? '#34d399' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669' }} className="metric-value">
              LKR {grossProfit.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#34d399' : '#059669', background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                {grossMarginPct}% Margin
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Post-COGS</span>
            </div>
          </div>

          {/* Card 4: Operating Expenses (OPEX) */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '18px', 
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(225, 29, 72, 0.2)',
            background: isDark ? 'rgba(239, 68, 68, 0.04)' : 'rgba(225, 29, 72, 0.03)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#f87171' : '#dc2626' }}>
                Operating Expenses (OPEX)
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(225, 29, 72, 0.1)', color: isDark ? '#f87171' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#f87171' : '#dc2626' }} className="metric-value">
              LKR {opexBreakdown.totalOpex.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {periodExpenses.length} expense {periodExpenses.length === 1 ? 'item' : 'items'} ({opexPercentOfRev}% of Rev)
            </div>
          </div>

          {/* Card 5: Net Operating Profit (Bottom Line) */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '18px', 
            borderRadius: '14px',
            border: netProfit >= 0 
              ? (isDark ? '2px solid rgba(34, 211, 238, 0.45)' : '2px solid rgba(8, 145, 178, 0.35)')
              : (isDark ? '2px solid rgba(239, 68, 68, 0.45)' : '2px solid rgba(225, 29, 72, 0.35)'),
            background: netProfit >= 0
              ? (isDark ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)' : 'linear-gradient(135deg, rgba(34, 211, 238, 0.14) 0%, rgba(6, 78, 59, 0.05) 100%)')
              : (isDark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(127, 29, 29, 0.2) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(127, 29, 29, 0.05) 100%)')
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: netProfit >= 0 ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? '#f87171' : '#dc2626') }}>
                Net Operating Profit
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: netProfit >= 0 ? '#0891b2' : '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)' }} className="metric-value">
              LKR {netProfit.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                color: netProfit >= 0 ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? '#f87171' : '#dc2626'), 
                background: netProfit >= 0 ? (isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(8, 145, 178, 0.12)') : 'rgba(239, 68, 68, 0.15)', 
                padding: '1px 6px', borderRadius: '4px' 
              }}>
                {netMarginPct}% Net Margin
              </span>
              <span style={{ fontSize: '0.65rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {netProfit >= 0 ? '✓ Profitable' : 'Deficit'}
              </span>
            </div>
          </div>

        </div>

        {/* Visual Margin Waterfall Progress Bar */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '14px 18px', 
          borderRadius: '12px', 
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)'
        }}>
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Operating Margin Flow: Revenue (100%) → COGS → Expenses → Net Profit
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
              Active Period: {pnlRange.label}
            </span>
          </div>

          {/* Segmented Flow Bar */}
          <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)', display: 'flex', overflow: 'hidden' }}>
            <div 
              style={{ width: `${cogsPercentOfRev}%`, height: '100%', background: '#f59e0b', transition: 'width 0.4s ease' }} 
              title={`COGS: ${cogsPercentOfRev}%`}
            />
            <div 
              style={{ width: `${opexPercentOfRev}%`, height: '100%', background: '#ef4444', transition: 'width 0.4s ease' }} 
              title={`OPEX: ${opexPercentOfRev}%`}
            />
            <div 
              style={{ width: `${Math.max(0, 100 - cogsPercentOfRev - opexPercentOfRev)}%`, height: '100%', background: '#10b981', transition: 'width 0.4s ease' }} 
              title={`Net Margin: ${netPercentOfRev}%`}
            />
          </div>

          {/* Legend chips */}
          <div className="flex flex-wrap items-center gap-4 mt-2" style={{ fontSize: '0.7rem' }}>
            <div className="flex items-center gap-2">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Cost of Goods Sold:</span>
              <strong style={{ color: '#f59e0b' }}>{cogsPercentOfRev}%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Operating Expenses:</span>
              <strong style={{ color: '#ef4444' }}>{opexPercentOfRev}%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Net Bottom-Line Margin:</span>
              <strong style={{ color: '#10b981' }}>{netPercentOfRev}%</strong>
            </div>
            {grossRevenue === 0 && (
              <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 'auto' }}>
                Tip: No sales in this exact window. Select "Quarter-to-Date" or "Year-to-Date" to view full period.
              </span>
            )}
          </div>
        </div>

        {/* P&L Statement Details & 6-Month Comparative Studio Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Itemized SLFRS/LKAS P&L Statement Summary */}
          <div style={{
            padding: '20px',
            borderRadius: '14px',
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)'
          }}>
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Statement of Profit or Loss (SLFRS)
                </h4>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
                  Accrual Recognition for {pnlRange.label}
                </p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Currency: LKR
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              {/* Revenue Line */}
              <div className="flex justify-between items-center py-1">
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Revenue from Contracts with Customers (Billed Sales)
                </span>
                <span style={{ fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'var(--font-mono, monospace)' }}>
                  + {grossRevenue.toLocaleString()}
                </span>
              </div>

              {/* COGS Line */}
              <div className="flex justify-between items-center py-1" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
                <span style={{ fontWeight: 600 }}>
                  Less: Cost of Goods Sold (Raw Materials & Direct Labor)
                </span>
                <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>
                  - {cogsBreakdown.totalCogs.toLocaleString()}
                </span>
              </div>

              {/* Gross Profit Line */}
              <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ 
                background: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ fontWeight: 800, color: isDark ? '#34d399' : '#059669' }}>
                  = Gross Operating Profit
                </span>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: isDark ? '#34d399' : '#059669', fontFamily: 'var(--font-mono, monospace)' }}>
                  {grossProfit.toLocaleString()} ({grossMarginPct}%)
                </span>
              </div>

              {/* OPEX Header Line */}
              <div className="flex justify-between items-center pt-2">
                <span style={{ fontWeight: 700, color: isDark ? '#f87171' : '#dc2626' }}>
                  Less: Operating & Administrative Expenses (OPEX)
                </span>
                <span style={{ fontWeight: 800, color: isDark ? '#f87171' : '#dc2626', fontFamily: 'var(--font-mono, monospace)' }}>
                  - {opexBreakdown.totalOpex.toLocaleString()}
                </span>
              </div>

              {/* Categorized OPEX Breakdown Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px' }}>
                {Object.keys(opexBreakdown.byCategory).length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    No overhead expenses recorded for this period.
                  </div>
                ) : (
                  Object.entries(opexBreakdown.byCategory).map(([cat, amt], idx) => (
                    <div key={idx} className="flex justify-between items-center" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>• {cat}</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>LKR {amt.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Net Profit Line */}
              <div className="flex justify-between items-center py-2 px-3 rounded-lg mt-2" style={{ 
                background: netProfit >= 0 
                  ? (isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(8, 145, 178, 0.12)') 
                  : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(225, 29, 72, 0.12)'),
                border: netProfit >= 0 
                  ? (isDark ? '2px solid rgba(34, 211, 238, 0.35)' : '2px solid rgba(8, 145, 178, 0.3)')
                  : (isDark ? '2px solid rgba(239, 68, 68, 0.35)' : '2px solid rgba(225, 29, 72, 0.3)')
              }}>
                <div>
                  <span style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    = Net Operating Profit (Bottom Line)
                  </span>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    EBIT Pre-Tax Trading Return
                  </div>
                </div>
                <span style={{ 
                  fontWeight: 900, fontSize: '1.05rem', 
                  color: netProfit >= 0 ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? '#f87171' : '#dc2626'), 
                  fontFamily: 'var(--font-mono, monospace)' 
                }}>
                  LKR {netProfit.toLocaleString()} ({netMarginPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: 6-Month Comparative P&L Studio Chart */}
          <div style={{
            padding: '20px',
            borderRadius: '14px',
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  6-Month Comparative P&L Trajectory
                </h4>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
                  Revenue, COGS, Expenses & Net Bottom Line
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div style={{ display: 'flex', gap: '4px', background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(15, 23, 42, 0.05)', padding: '2px', borderRadius: '8px' }}>
                <button
                  onClick={() => setPnlChartTab('bars')}
                  style={{
                    padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: pnlChartTab === 'bars' ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' : 'transparent',
                    color: pnlChartTab === 'bars' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  P&L Values
                </button>
                <button
                  onClick={() => setPnlChartTab('margins')}
                  style={{
                    padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: pnlChartTab === 'margins' ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' : 'transparent',
                    color: pnlChartTab === 'margins' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  Margin %
                </button>
              </div>
            </div>

            {/* Chart Container */}
            <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height={220}>
                {pnlChartTab === 'bars' ? (
                  <BarChart data={pnlMonthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700}} dy={6}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                    <Tooltip content={<ModernGlassTooltip isDark={isDark} />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '10px' }} />
                    <Bar dataKey="revenue" name="Gross Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="cogs" name="COGS" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="netProfit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                ) : (
                  <AreaChart data={pnlMonthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="nmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700}} dy={6}/>
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700}} tickFormatter={(v) => `${v}%`}/>
                    <Tooltip content={<ModernGlassTooltip isPercent currency="%" isDark={isDark} />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="grossMarginPct" name="Gross Margin %" stroke="#10b981" fillOpacity={1} fill="url(#gmGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="netMarginPct" name="Net Margin %" stroke="#22d3ee" fillOpacity={1} fill="url(#nmGrad)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* COMPREHENSIVE VISUAL SUITE - ROW 1: FINANCIAL STUDIO & PIPELINE DONUT */}
      {dashboardConfig?.showTrendsChart !== false && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* 1. FINANCIAL PERFORMANCE & CASHFLOW STUDIO (2 COLS) */}
        <div className="glass-panel chart-panel col-span-1 lg:col-span-2" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '24px',
          background: isDark 
            ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(13, 18, 24, 0.85) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: isDark 
            ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
            : '0 10px 25px -5px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          borderRadius: '16px'
        }}>
          {/* Header & Mode Switcher */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '12px', 
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.10) 100%)', 
                border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: isDark ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <BarChart3 color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
              </div>
              <div>
                <h3 className="h3" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Financial Velocity Studio
                </h3>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                  Multi-Dimensional Cashflow & Operating Margins (Last 6 Months)
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(15, 23, 42, 0.05)',
              padding: '4px',
              borderRadius: '10px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
              gap: '4px'
            }}>
              <button
                onClick={() => setFinanceChartMode('revenue_collections')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: financeChartMode === 'revenue_collections' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(79, 70, 229, 0.9) 100%)' : 'transparent',
                  color: financeChartMode === 'revenue_collections' ? '#ffffff' : (isDark ? 'var(--text-secondary)' : '#475569'),
                  boxShadow: financeChartMode === 'revenue_collections' ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <TrendingUp size={13} /> Revenue vs Inflow
              </button>
              <button
                onClick={() => setFinanceChartMode('cashflow_profit')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: financeChartMode === 'cashflow_profit' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(5, 150, 105, 0.9) 100%)' : 'transparent',
                  color: financeChartMode === 'cashflow_profit' ? '#ffffff' : (isDark ? 'var(--text-secondary)' : '#475569'),
                  boxShadow: financeChartMode === 'cashflow_profit' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none'
                }}
              >
                <Wallet size={13} /> Cashflow & Profit
              </button>
              <button
                onClick={() => setFinanceChartMode('billing_trajectory')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: financeChartMode === 'billing_trajectory' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.8) 0%, rgba(2, 132, 199, 0.9) 100%)' : 'transparent',
                  color: financeChartMode === 'billing_trajectory' ? '#ffffff' : (isDark ? 'var(--text-secondary)' : '#475569'),
                  boxShadow: financeChartMode === 'billing_trajectory' ? '0 4px 12px rgba(56, 189, 248, 0.35)' : 'none'
                }}
              >
                <BarChart3 size={13} /> Trajectory
              </button>
            </div>
          </div>

          {/* Quick Financial Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" style={{
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.06)'
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>6M Invoiced</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#818cf8' : '#4f46e5', marginTop: '2px' }}>
                LKR {financialTotals.totalInvoiced.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>6M Cash Collected</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#34d399' : '#059669', marginTop: '2px' }}>
                LKR {financialTotals.totalCollected.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>6M Operating Expenses</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#fb7185' : '#e11d48', marginTop: '2px' }}>
                LKR {financialTotals.totalExpenses.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>Operating Net Cash</div>
              <div style={{ 
                fontSize: '1.05rem', fontWeight: 800, 
                color: financialTotals.totalNet >= 0 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#f43f5e' : '#dc2626'),
                marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {financialTotals.totalNet >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                LKR {Math.abs(financialTotals.totalNet).toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Main Chart Canvas */}
          <div style={{ flex: 1, minHeight: '320px', width: '100%', position: 'relative' }}>
             <ResponsiveContainer width="100%" height={320}>
               {financeChartMode === 'revenue_collections' ? (
                 <AreaChart data={financialStudioData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                   <defs>
                     <linearGradient id="neonInvoiced" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={isDark ? "#818cf8" : "#6366f1"} stopOpacity={0.45}/>
                       <stop offset="95%" stopColor={isDark ? "#818cf8" : "#6366f1"} stopOpacity={0.01}/>
                     </linearGradient>
                     <linearGradient id="neonCollected" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={isDark ? "#10b981" : "#059669"} stopOpacity={0.5}/>
                       <stop offset="95%" stopColor={isDark ? "#10b981" : "#059669"} stopOpacity={0.01}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} dy={10}/>
                   <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                   <Tooltip content={<ModernGlassTooltip isDark={isDark} />} />
                   <Area type="monotone" dataKey="invoiced" name="Invoiced Revenue" stroke={isDark ? "#818cf8" : "#4f46e5"} strokeWidth={3} fillOpacity={1} fill="url(#neonInvoiced)" animationDuration={1200} />
                   <Area type="monotone" dataKey="collected" name="Cash Collected" stroke={isDark ? "#10b981" : "#059669"} strokeWidth={3} fillOpacity={1} fill="url(#neonCollected)" animationDuration={1600} />
                 </AreaChart>
               ) : financeChartMode === 'cashflow_profit' ? (
                 <BarChart data={financialStudioData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                   <defs>
                     <linearGradient id="barCollected" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor={isDark ? "#34d399" : "#059669"} stopOpacity={0.9}/>
                       <stop offset="100%" stopColor={isDark ? "#059669" : "#047857"} stopOpacity={0.7}/>
                     </linearGradient>
                     <linearGradient id="barExpenses" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor={isDark ? "#f43f5e" : "#e11d48"} stopOpacity={0.9}/>
                       <stop offset="100%" stopColor={isDark ? "#be123c" : "#9f1239"} stopOpacity={0.7}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} dy={10}/>
                   <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                   <Tooltip content={<ModernGlassTooltip isDark={isDark} />} />
                   <Bar dataKey="collected" name="Cash Inflow" fill="url(#barCollected)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                   <Bar dataKey="expenses" name="Operational Outflow" fill="url(#barExpenses)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                   <Line type="monotone" dataKey="netProfit" name="Net Cash Margin" stroke={isDark ? "#38bdf8" : "#0284c7"} strokeWidth={3} dot={{ r: 4, fill: isDark ? '#38bdf8' : '#0284c7', strokeWidth: 2, stroke: isDark ? '#0b0f14' : '#ffffff' }} />
                 </BarChart>
               ) : (
                 <BarChart data={financialStudioData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                   <defs>
                     <linearGradient id="barTrajectory" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={0.95}/>
                       <stop offset="100%" stopColor={isDark ? "#6366f1" : "#4f46e5"} stopOpacity={0.65}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} dy={10}/>
                   <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                   <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: isDark ? '#34d399' : '#059669', fontSize: 11, fontWeight: 700}} domain={[0, 100]} tickFormatter={(v) => `${v}%`}/>
                   <Tooltip content={<ModernGlassTooltip isDark={isDark} />} />
                   <Bar yAxisId="left" dataKey="invoiced" name="Gross Billing" fill="url(#barTrajectory)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                   <Line yAxisId="right" type="monotone" dataKey="collectionRate" name="Collection Rate (%)" stroke={isDark ? "#34d399" : "#059669"} strokeWidth={3} dot={{ r: 5, fill: isDark ? '#34d399' : '#059669', strokeWidth: 2, stroke: isDark ? '#0b0f14' : '#ffffff' }} />
                 </BarChart>
               )}
             </ResponsiveContainer>
          </div>
        </div>

        {/* 2. DEAL / ORDER STATUS DISTRIBUTION DONUT (1 COL) */}
        <div className="glass-panel chart-panel" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '24px',
          background: isDark 
            ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(13, 18, 24, 0.85) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: isDark 
            ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
            : '0 10px 25px -5px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          borderRadius: '16px'
        }}>
          <div className="flex items-center gap-3 mb-4">
             <div style={{ 
               width: '42px', height: '42px', borderRadius: '12px', 
               background: isDark 
                 ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)' 
                 : 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)', 
               border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
               boxShadow: isDark ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
               display: 'flex', alignItems: 'center', justifyContent: 'center' 
             }}>
                <Target color={isDark ? "#38bdf8" : "#0284c7"} size={22} />
             </div>
             <div>
                <h3 className="h3" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Deal Distribution
                </h3>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                  Quotation Pipeline Status
                </p>
             </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {(quoteStatusDonut || []).length === 0 ? (
              <div className="text-center py-12 text-secondary" style={{ fontSize: '0.85rem' }}>
                No quotations created yet
              </div>
            ) : (
              <>
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quoteStatusDonut}
                        cx="50%" cy="50%"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke={isDark ? 'rgba(11, 15, 20, 0.8)' : '#ffffff'}
                        strokeWidth={2}
                      >
                        {quoteStatusDonut.map((entry, idx) => (
                          <Cell 
                            key={`donut-${idx}`} 
                            fill={entry.color} 
                            style={{ filter: `drop-shadow(0 2px 6px ${entry.color}40)` }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ModernGlassTooltip currency="" isDark={isDark} />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered KPI in Donut */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {quotes.length}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#94a3b8' : '#64748b', marginTop: '3px' }}>
                      Total Deals
                    </div>
                    <div style={{ 
                      fontSize: '0.68rem', fontWeight: 800, 
                      color: isDark ? '#10b981' : '#059669', 
                      background: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.12)', 
                      padding: '2px 6px', borderRadius: '4px',
                      marginTop: '4px', display: 'inline-block'
                    }}>
                      {quoteConversionRate}% Won
                    </div>
                  </div>
                </div>

                {/* Pipeline Status Breakdown Pills */}
                <div className="flex flex-wrap justify-center gap-2 w-full mt-4">
                  {quoteStatusDonut.map((item, idx) => {
                    const totalBase = quotes.length;
                    const pct = totalBase > 0 ? Math.round((item.value / totalBase) * 100) : 0;
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px', 
                          padding: '6px 10px', borderRadius: '8px', 
                          background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.08)',
                          fontSize: '0.72rem' 
                        }}
                      >
                        <span style={{ 
                          width: '8px', height: '8px', borderRadius: '50%', 
                          background: item.color, boxShadow: `0 0 8px ${item.color}` 
                        }}></span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.name}</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{item.value}</strong>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      )}

      {/* COMPREHENSIVE VISUAL SUITE - ROW 2: FUNNEL */}
      {dashboardConfig?.showFunnel !== false && (
      <div className="glass-panel mb-8" style={{ 
        padding: '24px',
        background: isDark 
          ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(13, 18, 24, 0.85) 100%)' 
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: isDark 
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
          : '0 10px 25px -5px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        borderRadius: '16px'
      }}>
        {/* Funnel Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)' 
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)', 
              border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: isDark ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Zap color={isDark ? "#34d399" : "#059669"} size={22} />
            </div>
            <div>
              <h3 className="h3" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Sales Conversion Velocity Funnel
              </h3>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                Lead Capture → Proposal Formulation → Client Negotiation → Deal Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '10px',
              background: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.14)',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#34d399' : '#059669' }}>
                Deal Win Rate:
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isDark ? '#ffffff' : '#065f46' }}>
                {quoteConversionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Funnel Visual Stages Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {salesFunnelData.map((stage) => {
            const Icon = stage.icon;
            const isSelected = activeFunnelStage === stage.id;
            return (
              <div 
                key={stage.id}
                onClick={() => setActiveFunnelStage(isSelected ? null : stage.id)}
                style={{
                  position: 'relative',
                  padding: '18px 16px',
                  borderRadius: '14px',
                  background: isSelected ? stage.gradient : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)'),
                  border: isSelected ? `2px solid ${stage.color}` : (isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)'),
                  boxShadow: isSelected ? `0 0 20px ${stage.glow || stage.color + '40'}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                className="hover-lift"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span style={{ 
                      fontSize: '0.65rem', fontWeight: 900, 
                      color: stage.color, background: `${stage.color}18`,
                      padding: '3px 7px', borderRadius: '6px', letterSpacing: '0.05em'
                    }}>
                      STAGE {stage.step}
                    </span>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', 
                      background: `${stage.color}18`, color: stage.color, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Icon size={16} />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {stage.name}
                  </div>

                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: stage.color, lineHeight: 1.1 }}>
                    {stage.count} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>entities</span>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    LKR {Math.round(stage.value).toLocaleString()}
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>{stage.convLabel}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: stage.color }}>{stage.convRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${stage.convRate}%`, height: '100%', borderRadius: '3px', 
                      background: stage.color, boxShadow: `0 0 8px ${stage.color}` 
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Funnel Stage Insight Footer */}
        {activeFunnelStage && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div className="flex items-center gap-3">
              <Sparkles size={16} color="#38bdf8" />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Inspecting stage: <strong style={{ color: '#38bdf8' }}>{(salesFunnelData.find(s => s.id === activeFunnelStage))?.name}</strong> — Showing {(salesFunnelData.find(s => s.id === activeFunnelStage))?.count} active pipeline records totaling LKR {Math.round((salesFunnelData.find(s => s.id === activeFunnelStage))?.value || 0).toLocaleString()}.
              </div>
            </div>
            <button 
              onClick={() => setActiveFunnelStage(null)}
              className="btn btn-secondary" 
              style={{ height: '30px', padding: '0 12px', fontSize: '0.75rem' }}
            >
              Reset View
            </button>
          </div>
        )}
      </div>
      )}

      {/* COMPREHENSIVE VISUAL SUITE - ROW 3: DEBTOR AGING ANALYSIS (BAR CHART) */}
      {dashboardConfig?.showDebtorAging !== false && (
      <div className="glass-panel mb-8" style={{ 
        padding: '24px',
        background: isDark 
          ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(13, 18, 24, 0.85) 100%)' 
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: isDark 
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
          : '0 10px 25px -5px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        borderRadius: '16px'
      }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.15) 100%)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)', 
              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: isDark ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <ShieldAlert color={isDark ? "#f87171" : "#dc2626"} size={22} />
            </div>
            <div>
              <h3 className="h3" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Accounts Receivable & Debtor Aging Distribution
              </h3>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                Credit Risk Segmentation & Liquidity Exposure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '10px',
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.14)',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.25)'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#f87171' : '#dc2626' }}>Critical Overdue (60+d):</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isDark ? '#ffffff' : '#991b1b' }}>LKR {criticalDebt.toLocaleString()}</span>
            </div>
            <Link to="/debtors" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
              Debtors Module <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* 4 Aging Tier Summary Cards & Bar Chart Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Bar Chart Canvas (2 Cols) */}
          <div className="lg:col-span-2" style={{ minHeight: '260px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {totalAgingDebt > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={debtorAgingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    {debtorAgingData.map((b, idx) => (
                      <linearGradient key={`grad-${idx}`} id={`agingGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={b.color} stopOpacity={0.9}/>
                        <stop offset="100%" stopColor={b.color} stopOpacity={0.4}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 700}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                  <Tooltip content={<ModernGlassTooltip isDark={isDark} />} />
                  <Bar dataKey="amount" name="Outstanding Balance" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {debtorAgingData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#agingGrad-${index})`} 
                        style={{ filter: `drop-shadow(0 4px 10px ${entry.color}35)` }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '32px 20px', width: '100%',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.02) 100%)' 
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)',
                borderRadius: '14px', 
                border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <div style={{ 
                  width: '54px', height: '54px', borderRadius: '16px', 
                  background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginBottom: '14px', boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)' 
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  All Receivables Reconciled & Current
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', marginTop: '6px', marginBottom: '16px', lineHeight: 1.5 }}>
                  Zero overdue debtor risk detected across all client accounts. No aging debt requires recovery action.
                </p>
                <div className="flex gap-3">
                  <Link to="/invoices" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> New Invoice
                  </Link>
                  <Link to="/debtors" className="btn btn-secondary" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>
                    Open Debtors Ledger
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Aging Tier Highlights (1 Col) */}
          <div className="flex flex-col gap-3">
            {debtorAgingData.map((bucket, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '12px',
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                  border: isDark ? `1px solid ${bucket.color}30` : `1px solid ${bucket.color}40`,
                  boxShadow: `inset 3px 0 0 ${bucket.color}`
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bucket.label}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: bucket.color, background: `${bucket.color}18`, padding: '2px 6px', borderRadius: '4px' }}>
                      {bucket.desc}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {bucket.count} invoices affected
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: bucket.color }}>
                    LKR {bucket.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: totalAgingDebt > 0 ? (isDark ? '#94a3b8' : '#64748b') : 'var(--success)', fontWeight: 700 }}>
                    {totalAgingDebt > 0 ? `${Math.round((bucket.amount / totalAgingDebt) * 100)}% of total` : 'All Settled'}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      )}

      {/* LOWER SECTION: TOP 5 CUSTOMERS & OVERDUE DEBTORS */}
      {dashboardConfig?.showRecentActivity !== false && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* [SUGGESTED] TOP CUSTOMERS CARD */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-3">
               <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)', color: isDark ? 'var(--success)' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={20} />
               </div>
               <div>
                  <h3 className="h3">Top 5 Clients</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                    By Invoiced Volume (This Month)
                  </p>
               </div>
            </div>
            <Link to="/customers" className="btn btn-secondary" style={{ height: '34px', padding: '0 14px', fontSize: '0.78rem' }}>
              View All Clients
            </Link>
          </div>
          
          <div className="table-container" style={{ margin: 0, background: 'transparent' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Rank & Client</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Total Invoiced</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersThisMonth.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No invoiced customers found for this period.
                    </td>
                  </tr>
                ) : (
                  topCustomersThisMonth.map((cust, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ paddingLeft: '24px' }}>
                        <div className="flex items-center gap-3">
                          <span style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            background: idx === 0 ? 'var(--warning)' : idx === 1 ? (isDark ? '#94a3b8' : '#cbd5e1') : (isDark ? 'var(--subtle-bg)' : '#f1f5f9'),
                            color: idx === 0 ? '#000' : (isDark ? 'var(--text-secondary)' : '#334155'),
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 800
                          }}>
                            {idx + 1}
                          </span>
                          <div>
                            <Link 
                              to="/customers" 
                              style={{ fontWeight: 700, color: 'var(--accent-primary)', textDecoration: 'none' }}
                              className="hover:underline"
                            >
                              {cust.name}
                            </Link>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cust.tag}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {cust.phone}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }} className="numeric">
                        LKR {cust.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OVERDUE & PENDING ACCOUNTS LIST */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-3">
               <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isDark ? 'var(--danger-bg)' : 'rgba(225, 29, 72, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle color={isDark ? "var(--danger)" : "#dc2626"} size={20} />
               </div>
               <div>
                  <h3 className="h3">Immediate Action Required</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                    Overdue Invoices & Debtor Balances
                  </p>
               </div>
            </div>
            <Link to="/debtors" className="btn btn-secondary" style={{ height: '34px', padding: '0 14px', fontSize: '0.78rem' }}>Debtors Ledger</Link>
          </div>
          
          <div className="table-container" style={{ margin: 0, background: 'transparent' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Client / Invoice</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.status !== 'Paid' && i.status !== 'Closed').slice(0, 5).map(inv => {
                  const total = Number(inv.amount) || 0;
                  const paid = (inv.payments || []).reduce((ps, p) => ps + (Number(p.amount) || 0), 0);
                  const out = Math.max(0, total - paid);
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ paddingLeft: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div>{inv.customerName || inv.prospectName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{inv.invoiceNumber}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status === 'Overdue' ? 'danger' : 'warning'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '24px', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.85rem' }} className="numeric">
                        LKR {out.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {invoices.filter(i => i.status !== 'Paid' && i.status !== 'Closed').length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>
                      <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                        All accounts are settled and up to date.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      )}

      {/* DASHBOARD LAYOUT & METRICS CUSTOMIZER MODAL */}
      {showCustomizeModal && (
        <div 
          className="app-modal-backdrop" 
          onClick={() => setShowCustomizeModal(false)}
          style={{ zIndex: 99999 }}
        >
          <div 
            className="app-modal-dialog" 
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '100%',
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(15, 23, 42, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)'
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}>
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Dashboard Customization
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Personalize sales targets, visible KPI rows, and widget layout
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCustomizeModal(false)}
                className="btn btn-secondary"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              
              {/* Monthly Target Config */}
              <div style={{
                background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  🎯 Monthly Revenue Target Goal (LKR)
                </label>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Set your business's monthly sales benchmark. Used to track completion progress on the top target widget.
                </p>
                <input 
                  type="number"
                  className="form-input"
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: 'var(--accent-primary)',
                    background: isDark ? '#1e293b' : '#ffffff'
                  }}
                  value={dashboardConfig?.monthlyTarget || 1000000}
                  onChange={e => updateDashboardConfig({ monthlyTarget: Number(e.target.value) || 0 })}
                  placeholder="1000000"
                />
              </div>

              {/* Section Visibility Switches */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Toggle Visible Sections & Cards
                </div>
                
                <div className="flex flex-col gap-2.5">
                  {[
                    { key: 'showMonthlyTarget', label: 'Monthly Sales Target & Progress Bar', desc: 'Top revenue completion bar and pace' },
                    { key: 'showQuotationKpis', label: 'Quotation Pipeline & Customer Base Row', desc: 'Deals, customer count, and conversion rate' },
                    { key: 'showFinancialKpis', label: 'Revenue, Collections & Debtors Row', desc: 'Billing volume, actual cash, and overdue' },
                    { key: 'showProfitLoss', label: 'Executive Profit & Loss Statement (P&L)', desc: 'Real-time gross/net margins, COGS, and OPEX' },
                    { key: 'showTrendsChart', label: 'Financial Studio & Performance Charts', desc: 'Revenue vs Collections trends and donut split' },
                    { key: 'showFunnel', label: 'Sales Conversion Velocity Funnel', desc: 'Lead-to-deal progression stages and win rate' },
                    { key: 'showDebtorAging', label: 'Accounts Receivable & Debtor Aging', desc: 'Credit risk segmentation and overdue distribution' },
                    { key: 'showRecentActivity', label: 'Top 5 Clients & Overdue Accounts', desc: 'Top volume customer rankings and collections ledger' }
                  ].map(sec => {
                    const isChecked = dashboardConfig?.[sec.key] !== false;
                    return (
                      <div 
                        key={sec.key}
                        onClick={() => updateDashboardConfig({ [sec.key]: !isChecked })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-lift"
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {sec.label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {sec.desc}
                          </div>
                        </div>

                        {/* Switch UI */}
                        <div style={{
                          width: '42px', height: '24px', borderRadius: '999px',
                          background: isChecked ? 'var(--accent-primary)' : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)'),
                          position: 'relative',
                          transition: 'background 0.2s ease',
                          flexShrink: 0
                        }}>
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: isChecked ? '21px' : '3px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)'
            }}>
              <button 
                type="button"
                onClick={() => updateDashboardConfig(DEFAULT_DASHBOARD_CONFIG)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0 12px', height: '36px', gap: '6px' }}
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
              <button 
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="btn btn-primary"
                style={{ fontSize: '0.84rem', padding: '0 20px', height: '36px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
