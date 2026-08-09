import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  IndianRupee, Users, Target, Activity, 
  TrendingUp, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Globe,
  FileText, PlusCircle, CreditCard, Award, AlertCircle, Calendar, Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DatePicker from '../components/DatePicker';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
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

  // Date Range Calculator
  const dateRange = useMemo(() => {
    const now = new Date();
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

  // Filter Helper
  const isWithinRange = (dateStr, start, end) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  // Compute Previous Period for Trend Delta Comparison
  const prevDateRange = useMemo(() => {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const prevEnd = new Date(dateRange.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start: prevStart, end: prevEnd };
  }, [dateRange]);

  // Filtered Datasets
  const filteredInvoices = useMemo(() => invoices.filter(inv => isWithinRange(inv.date, dateRange.start, dateRange.end)), [invoices, dateRange]);
  const prevInvoices = useMemo(() => invoices.filter(inv => isWithinRange(inv.date, prevDateRange.start, prevDateRange.end)), [invoices, prevDateRange]);

  const filteredCustomers = useMemo(() => customers.filter(c => isWithinRange(c.purchaseDate || c.createdAt, dateRange.start, dateRange.end)), [customers, dateRange]);
  const prevCustomers = useMemo(() => customers.filter(c => isWithinRange(c.purchaseDate || c.createdAt, prevDateRange.start, prevDateRange.end)), [customers, prevDateRange]);

  const filteredLeads = useMemo(() => leads.filter(l => isWithinRange(l.date, dateRange.start, dateRange.end)), [leads, dateRange]);
  const prevLeads = useMemo(() => leads.filter(l => isWithinRange(l.date, prevDateRange.start, prevDateRange.end)), [leads, prevDateRange]);

  const filteredQuotes = useMemo(() => quotes.filter(q => isWithinRange(q.date, dateRange.start, dateRange.end)), [quotes, dateRange]);

  // --- CORE ANALYTICS & METRIC DELTAS ---
  const stats = useMemo(() => {
    // Current Period Metrics
    const revCurr = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const revTotalAllTime = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const revPrev = prevInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const revGrowth = revPrev === 0 ? (revCurr > 0 ? 100 : 0) : Math.round(((revCurr - revPrev) / revPrev) * 100);

    const pendingCurr = filteredInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const pendingPrev = prevInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const pendingGrowth = pendingPrev === 0 ? (pendingCurr > 0 ? 100 : 0) : Math.round(((pendingCurr - pendingPrev) / pendingPrev) * 100);

    const custCurr = filteredCustomers.length || customers.length;
    const custPrev = prevCustomers.length || customers.length;
    const custGrowth = custPrev === 0 ? (custCurr > 0 ? 100 : 0) : Math.round(((custCurr - custPrev) / custPrev) * 100);

    const leadsCurr = filteredLeads.length || leads.length;
    const leadsPrev = prevLeads.length || leads.length;
    const leadsGrowth = leadsPrev === 0 ? (leadsCurr > 0 ? 100 : 0) : Math.round(((leadsCurr - leadsPrev) / leadsPrev) * 100);

    const totalOutstandingAllTime = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);

    return {
      revenue: { val: revCurr, growth: revGrowth, total: revTotalAllTime },
      outstanding: { val: pendingCurr, growth: pendingGrowth, total: totalOutstandingAllTime },
      customers: { val: custCurr, growth: custGrowth },
      leads: { val: leadsCurr, growth: leadsGrowth },
      quotes: filteredQuotes.length || quotes.length
    };
  }, [filteredInvoices, prevInvoices, filteredCustomers, prevCustomers, filteredLeads, prevLeads, filteredQuotes, invoices, customers, leads, quotes]);

  // --- 7-DAY MINI SPARKLINES DATA GENERATOR ---
  const sparklineData = useMemo(() => {
    const days = 7;
    const result = { revenue: [], pending: [], gyms: [], leads: [] };
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(dateStr));
      const dayLeads = leads.filter(l => l.date && l.date.startsWith(dateStr));
      const dayGyms = customers.filter(c => (c.purchaseDate || c.createdAt) && (c.purchaseDate || c.createdAt).startsWith(dateStr));

      result.revenue.push({ val: dayInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0) });
      result.pending.push({ val: dayInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0) });
      result.gyms.push({ val: dayGyms.length });
      result.leads.push({ val: dayLeads.length });
    }
    return result;
  }, [invoices, leads, customers]);

  // --- REVENUE & PIPELINE TREND DATA ---
  const trendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const yr = d.getFullYear();
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getMonth() === monthIdx && invDate.getFullYear() === yr;
      });

      months.push({
        name: monthNames[monthIdx],
        collection: monthInvoices.filter(inv => inv.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0),
        pipeline: monthInvoices.filter(inv => inv.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0)
      });
    }
    return months;
  }, [invoices]);

  // --- PIPELINE & RADIAL DONUT DATA ---
  const totalPipelineItems = stats.leads.val + stats.quotes + stats.customers.val;
  
  const radialData = [
    { name: 'Leads', value: stats.leads.val, fill: 'var(--accent-secondary)' }, 
    { name: 'Quotes', value: stats.quotes, fill: 'var(--warning)' },      
    { name: 'Deals', value: stats.customers.val, fill: 'var(--success)' },   
  ];

  const conversionRate = stats.leads.val > 0 
    ? Math.round((stats.customers.val / stats.leads.val) * 100) 
    : 0;

  const pieData = [
    { name: 'Collected', value: stats.revenue.val || stats.revenue.total, color: 'var(--success)' },
    { name: 'Outstanding', value: stats.outstanding.val || stats.outstanding.total, color: 'var(--warning)' }
  ];

  const recentAccessLogs = useMemo(() => {
    return activityLogs
      .filter(log => log.type === 'Access')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [activityLogs]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px', animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      
      {/* HEADER WITH QUICK BUTTONS & DATE SELECTOR */}
      <div className="page-hero" style={{ position: 'relative', zIndex: 50, paddingBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <h1 className="h1 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              Dashboard Overview
            </h1>
            <p className="text-secondary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', 
                boxShadow: '0 0 10px var(--success)'
              }}></span>
              Real-time Business & Financial Analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Global Date-Range Selector */}
            <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button 
                onClick={() => setDateFilter('today')}
                className={`btn ${dateFilter === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                Today
              </button>
              <button 
                onClick={() => setDateFilter('7d')}
                className={`btn ${dateFilter === '7d' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                7 Days
              </button>
              <button 
                onClick={() => setDateFilter('30d')}
                className={`btn ${dateFilter === '30d' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                30 Days
              </button>
              <button 
                onClick={() => setDateFilter('custom')}
                className={`btn ${dateFilter === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                Custom
              </button>
            </div>

            {/* Quick Action Buttons (Only 1 Filled Primary Button) */}
            <div className="flex items-center gap-3">
              <Link to="/customers" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                <Plus size={16} /> New Client
              </Link>
              <Link to="/invoices" className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                <FileText size={16} /> New Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Custom Date Selector Dropdown/Inputs */}
        {dateFilter === 'custom' && (
          <div style={{
            marginTop: '20px',
            padding: '14px 20px',
            background: 'var(--subtle-bg)',
            borderRadius: '14px',
            border: '1px solid var(--subtle-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '16px',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 10,
            animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div className="flex items-center gap-2">
              <span className="text-secondary" style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Start:</span>
              <div style={{ width: '180px' }}>
                <DatePicker 
                  value={customStart} 
                  onChange={(val) => setCustomStart(val)} 
                  placeholder="Start Date"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-secondary" style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>End:</span>
              <div style={{ width: '180px' }}>
                <DatePicker 
                  value={customEnd} 
                  onChange={(val) => setCustomEnd(val)} 
                  placeholder="End Date"
                />
              </div>
            </div>
            {(customStart || customEnd) && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.78rem', height: '38px', color: 'var(--text-muted)' }}
                onClick={() => { setCustomStart(''); setCustomEnd(''); }}
              >
                Clear Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI CARDS WITH SPARKLINES & TREND DELTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <KPIBox 
          title="Total Revenue" 
          subtitle="Collected payments"
          value={`LKR ${stats.revenue.val.toLocaleString()}`} 
          icon={<IndianRupee />} 
          badgeBg="var(--success-bg)"
          badgeColor="var(--success)"
          trend={stats.revenue.growth}
          sparklineData={sparklineData.revenue}
          sparklineColor="var(--success)"
        />
        <KPIBox 
          title="Pending Invoices" 
          subtitle="Unpaid balances"
          value={`LKR ${stats.outstanding.val.toLocaleString()}`} 
          icon={<Activity />} 
          badgeBg="var(--warning-bg)"
          badgeColor="var(--warning)"
          trend={stats.outstanding.growth}
          sparklineData={sparklineData.pending}
          sparklineColor="var(--warning)"
        />
        <KPIBox 
          title="Active Gyms" 
          subtitle="Registered gym clients"
          value={stats.customers.val} 
          icon={<Globe />} 
          badgeBg="rgba(56, 189, 248, 0.15)"
          badgeColor="var(--info)"
          trend={stats.customers.growth}
          sparklineData={sparklineData.gyms}
          sparklineColor="var(--info)"
        />
        <KPIBox 
          title="Sales Leads" 
          subtitle="Prospects in pipeline"
          value={stats.leads.val} 
          icon={<Zap />} 
          badgeBg="rgba(99, 102, 241, 0.15)"
          badgeColor="var(--accent-secondary)"
          trend={stats.leads.growth}
          sparklineData={sparklineData.leads}
          sparklineColor="var(--accent-secondary)"
        />
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* REVENUE & PIPELINE TREND CHART */}
        <div className="glass-panel col-span-1 lg:col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
               <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 color="var(--accent-primary)" size={20} />
               </div>
               <div>
                  <h3 className="h3">Revenue & Pipeline Trend</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Collected vs Pending</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
              <LegendItem color="var(--accent-primary)" label="Collected" />
              <LegendItem color="var(--accent-secondary)" label="Pending" />
            </div>
          </div>
          
          <div style={{ flex: 1, minHeight: '320px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.5}/>
                     <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.5}/>
                     <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--subtle-border)" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} dy={10}/>
                 <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `LKR ${v/1000}k`}/>
                 <Tooltip 
                   content={<CustomChartTooltip />}
                 />
                 <Area type="monotone" dataKey="pipeline" name="Pending Pipeline" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPipe)" animationDuration={1500} />
                 <Area type="monotone" dataKey="collection" name="Collected Revenue" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorColl)" animationDuration={2000} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* LEAD CONVERSION RADIAL DONUT WITH EMPTY STATE & CENTER LABEL */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="mb-4 relative z-10 flex items-center gap-3">
             <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="var(--accent-secondary)" size={20} />
             </div>
             <div>
                <h3 className="h3">Lead Conversion</h3>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Pipeline Ratio & Deals</p>
             </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {totalPipelineItems === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <Target size={44} className="text-muted mb-3" style={{ opacity: 0.4 }} />
                <p className="h3 mb-1" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>No Pipeline Data Yet</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add sales leads to view conversion ratios.</p>
              </div>
            ) : (
              <>
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" cy="50%" 
                      innerRadius="40%" outerRadius="95%" 
                      barSize={16} 
                      data={radialData}
                      startAngle={180} endAngle={-180}
                    >
                      <PolarAngleAxis type="number" domain={[0, Math.max(stats.leads.val, stats.quotes, stats.customers.val) || 10]} angleAxisId={0} tick={false} />
                      <RadialBar
                        minAngle={15}
                        background={{ fill: 'var(--subtle-bg)' }}
                        clockWise
                        dataKey="value"
                        cornerRadius={10}
                        animationDuration={1500}
                      />
                      <Tooltip 
                         contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px', backdropFilter: 'blur(20px)' }}
                         itemStyle={{ fontWeight: 800, color: 'var(--text-primary)' }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>

                  {/* Centered Conversion Rate Percentage */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {conversionRate}%
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                      Lead-to-Deal
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 w-full" style={{ marginTop: '16px' }}>
                   <LegendItem color="var(--accent-secondary)" label={`Leads (${stats.leads.val})`} />
                   <LegendItem color="var(--warning)" label={`Quotes (${stats.quotes})`} />
                   <LegendItem color="var(--success)" label={`Deals (${stats.customers.val})`} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* PIE CHART DISTRIBUTION */}
        <div className="glass-panel col-span-1 lg:col-span-1" style={{ display: 'flex', flexDirection: 'column' }}>
           <div className="mb-4 relative z-10 flex items-center gap-3">
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Globe color="var(--info)" size={20} />
              </div>
              <div>
                 <h3 className="h3">Payment Status</h3>
                 <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Revenue Split</p>
              </div>
           </div>
           
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <div style={{ height: '220px', width: '100%' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={pieData}
                     cx="50%" cy="50%"
                     innerRadius="55%"
                     outerRadius="85%"
                     paddingAngle={6}
                     dataKey="value"
                     animationDuration={1500}
                     stroke="none"
                   >
                     {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                     itemStyle={{ fontWeight: 800, color: 'var(--text-primary)' }}
                     formatter={(value) => `LKR ${Number(value).toLocaleString()}`}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 w-full" style={{ marginTop: '16px' }}>
                <LegendItem color="var(--success)" label="Collected" />
                <LegendItem color="var(--warning)" label="Pending" />
             </div>
           </div>
        </div>

        {/* BUSINESS PERFORMANCE PROTOCOL */}
        <div className="glass-panel col-span-1 lg:col-span-2" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6" style={{ height: '100%' }}>
              <div className="flex items-center gap-6">
                 <div style={{ 
                    width: '60px', height: '60px', borderRadius: '16px', 
                    background: 'var(--subtle-bg)', 
                    border: '1px solid var(--panel-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                 }}>
                    <Award color="var(--accent-primary)" size={28} />
                 </div>
                 <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Summary</h4>
                    <h2 className="h2" style={{ color: 'var(--text-primary)' }}>Sales Performing Smoothly</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', maxWidth: '400px', lineHeight: '1.5' }}>
                      Your overall revenue collections and active client pipelines are healthy. All records are updated.
                    </p>
                 </div>
              </div>
              <div>
                 <Link to="/reports" className="btn btn-secondary" style={{ padding: '12px 24px' }}>
                    <BarChart3 size={18} /> View Financial Reports
                 </Link>
              </div>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* OVERDUE ACCOUNTS LIST */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-3">
               <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle color="var(--danger)" size={20} />
               </div>
               <div>
                  <h3 className="h3">Action Required</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Overdue & Pending Accounts</p>
               </div>
            </div>
            <Link to="/invoices" className="btn btn-secondary" style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem' }}>View Ledger</Link>
          </div>
          
          <div className="table-container" style={{ margin: 0, background: 'transparent' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Client / Invoice</th>
                  <th>Status</th>
                  <th>Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.status !== 'Paid').slice(0, 5).map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                    <td style={{ paddingLeft: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div>{inv.prospectName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{inv.invoiceNumber}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.status === 'Overdue' ? 'danger' : 'warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.85rem' }} className="numeric">
                      LKR {inv.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {invoices.filter(i => i.status !== 'Paid').length === 0 && (
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

        {/* RECENT ACCESS (IP TRACKING) */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-3">
               <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe color="var(--info)" size={20} />
               </div>
               <div>
                  <h3 className="h3">Recent Client Views</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>IP Address & Location Tracking</p>
               </div>
            </div>
            <Link to="/logs" className="btn btn-secondary" style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem' }}>View All Logs</Link>
          </div>
          
          <div className="table-container" style={{ margin: 0, background: 'transparent' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Document Viewed</th>
                  <th>Timestamp</th>
                  <th>IP Address & Location</th>
                </tr>
              </thead>
              <tbody>
                {recentAccessLogs.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>
                      <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No recent client views tracked yet.</p>
                    </td>
                  </tr>
                ) : (
                  recentAccessLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ paddingLeft: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{log.message}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- KPI BOX COMPONENT WITH ICON BADGE & MINI SPARKLINES ---
const KPIBox = ({ title, subtitle, value, icon, badgeBg, badgeColor, trend, sparklineData, sparklineColor }) => {
  return (
    <div className="glass-panel hover-lift" style={{ position: 'relative', padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          {/* Remapped Semantic Icon Badge */}
          <div style={{ 
             width: '48px', height: '48px', borderRadius: '14px', background: badgeBg, 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             color: badgeColor
          }}>
            {React.cloneElement(icon, { size: 24, color: badgeColor })}
          </div>

          {/* Trend Delta vs Previous Period */}
          {trend !== undefined && (
            <div style={{ 
               display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 800, 
               padding: '4px 10px', borderRadius: '20px', 
               background: trend >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
               color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
               border: `1px solid ${trend >= 0 ? 'var(--success)' : 'var(--danger)'}33`
            }}>
              {trend >= 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '2px' }}>{title}</p>
          {subtitle && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{subtitle}</p>}
          <div style={{ 
            fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1,
            fontFamily: 'var(--font-display)'
          }} className="metric-value">
            {value}
          </div>
        </div>
      </div>

      {/* 7-DAY MINI SPARKLINE */}
      {sparklineData && sparklineData.length > 0 && (
        <div style={{ height: '36px', width: '100%', marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="val" 
                stroke={sparklineColor} 
                strokeWidth={2} 
                fill={`url(#spark-${title.replace(/\s+/g, '')})`} 
                isAnimationActive={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// --- CUSTOM TREND CHART TOOLTIP WITH LKR & DATE FORMATTING ---
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', backdropFilter: 'blur(20px)' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{label} Period</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', marginTop: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{entry.name}:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800 }} className="metric-value">
              LKR {Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
     <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }}></span>
     <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
  </div>
);

export default Dashboard;
