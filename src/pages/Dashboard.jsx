import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  Users, Target, Activity, 
  TrendingUp, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Globe,
  FileText, PlusCircle, CreditCard, Award, AlertCircle, Calendar, Plus,
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, UserCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from '../components/DatePicker';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    customers = [], 
    invoices = [], 
    quotes = [], 
    leads = [],
    activityLogs = []
  } = useContext(StoreContext) || {};

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

  // --- CHARTS DATA ---
  // 1. Monthly Revenue vs Collected (last 6 months)
  const trendData = useMemo(() => {
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

      months.push({
        name: monthNames[mIdx],
        invoiced,
        collected
      });
    }
    return months;
  }, [invoices]);

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
      'Draft': '#94a3b8',
      'Sent': '#38bdf8',
      'Accepted': '#10b981',
      'Counter Offer': '#f59e0b',
      'Rejected': '#ef4444',
      'Expired': '#6b7280'
    };

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || '#94a3b8'
      }));
  }, [quotes]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px', animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      
      {/* HEADER WITH QUICK BUTTONS & DATE SELECTOR */}
      <div className="page-hero" style={{ position: 'relative', zIndex: 50, paddingBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <h1 className="h1 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              Sales Management Dashboard
            </h1>
            <p className="text-secondary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', 
                boxShadow: '0 0 10px var(--success)'
              }}></span>
              Real-Time Production Financials & CRM Insights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Link to="/quotations" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <FileText size={16} /> New Quotation
            </Link>
            <Link to="/invoices" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <CreditCard size={16} /> New Invoice
            </Link>
            <Link to="/customers" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Customer
            </Link>
          </div>
        </div>
      </div>

      {/* KPI ROW 1: CUSTOMERS & QUOTATION PIPELINE */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Quotation Pipeline & Customer Base
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Total Customers */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Customers</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Quotations This Month */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Quotes (This Month)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Accepted Quotations */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Accepted Quotes</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
              {acceptedQuotesThisMonth.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Confirmed & Invoiced deals
            </div>
          </div>

          {/* Rejected Quotations */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rejected Quotes</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>
              {rejectedQuotesThisMonth.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Declined proposals
            </div>
          </div>

          {/* CONVERSION RATE CARD (CRITICAL SALES KPI) */}
          <div className="glass-panel hover-lift" style={{ 
            padding: '20px', 
            border: '2px solid rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.15) 100%)'
          }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)' }}>Conversion Rate</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {quoteConversionRate}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700, marginTop: '4px' }}>
              Sent → Accepted this month
            </div>
          </div>

        </div>
      </div>

      {/* KPI ROW 2: FINANCIALS & REVENUES */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Revenue, Collections & Debtors
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Total Invoiced (This Month) */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Invoiced (Month)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Total Collected (This Month) */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Collected (Month)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)' }} className="metric-value">
              LKR {totalCollectedThisMonth.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Actual cash received
            </div>
          </div>

          {/* Outstanding / Debtors Total */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Debtors</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--warning)' }} className="metric-value">
              LKR {totalOutstandingDebtors.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Outstanding & partial dues
            </div>
          </div>

          {/* Overdue Amount */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Overdue Amount</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--danger)' }} className="metric-value">
              LKR {totalOverdueAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Past due payment dates
            </div>
          </div>

          {/* Upcoming Renewals (Next 30 Days) */}
          <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-2">
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Renewals (30 Days)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>
              {upcomingRenewalsCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Subscriptions due soon
            </div>
          </div>

        </div>
      </div>

      {/* CHARTS CONTAINER: REVENUE TREND & STATUS DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* REVENUE VS COLLECTED 6-MONTH CHART */}
        <div className="glass-panel col-span-1 lg:col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
               <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 color="var(--accent-primary)" size={20} />
               </div>
               <div>
                  <h3 className="h3">Monthly Revenue vs Collections</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Last 6 Months Invoiced vs Cash Collected</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent-primary)' }}></span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Invoiced</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--success)' }}></span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Collected</span>
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1, minHeight: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                     <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4}/>
                     <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--subtle-border)" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} dy={10}/>
                 <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}/>
                 <Tooltip 
                   contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px', backdropFilter: 'blur(20px)' }}
                   formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, '']}
                 />
                 <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorInvoiced)" animationDuration={1500} />
                 <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" animationDuration={2000} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* QUOTATION STATUS BREAKDOWN (DONUT) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="mb-4 relative z-10 flex items-center gap-3">
             <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="var(--accent-secondary)" size={20} />
             </div>
             <div>
                <h3 className="h3">Quotation Status</h3>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Pipeline Breakdown</p>
             </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {quoteStatusDonut.length === 0 ? (
              <div className="text-center py-12 text-secondary" style={{ fontSize: '0.85rem' }}>
                No quotations created yet
              </div>
            ) : (
              <>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quoteStatusDonut}
                        cx="50%" cy="50%"
                        innerRadius="50%"
                        outerRadius="80%"
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {quoteStatusDonut.map((entry, idx) => (
                          <Cell key={`donut-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px' }}
                        formatter={(val, name) => [`${val} Quotes`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 w-full mt-3">
                  {quoteStatusDonut.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }}></span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.name}: <strong style={{ color: 'var(--text-primary)' }}>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* LOWER SECTION: TOP 5 CUSTOMERS & OVERDUE DEBTORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* [SUGGESTED] TOP CUSTOMERS CARD */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-3">
               <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={20} />
               </div>
               <div>
                  <h3 className="h3">Top 5 Clients</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>By Invoiced Volume (This Month)</p>
               </div>
            </div>
            <Link to="/customers" className="btn btn-secondary" style={{ height: '34px', padding: '0 14px', fontSize: '0.78rem' }}>View All Clients</Link>
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
                            background: idx === 0 ? 'var(--warning)' : idx === 1 ? '#94a3b8' : 'var(--subtle-bg)',
                            color: idx < 2 ? '#000' : 'var(--text-secondary)',
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
               <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle color="var(--danger)" size={20} />
               </div>
               <div>
                  <h3 className="h3">Immediate Action Required</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Overdue Invoices & Debtor Balances</p>
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
                      <p className="text-secondary" style={{ fontSize: '0.9rem' }}>All accounts are settled and up to date.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
