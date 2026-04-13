import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { IndianRupee, Users, ArrowUpRight, Clock, Target, ClipboardList, TrendingUp, Smartphone, Info, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const { 
    customers = [], 
    invoices = [], 
    quotes = [], 
    leads = [], 
    expenses = [],
    activityLogs = [] 
  } = useContext(StoreContext) || {};

  // Calculate metrics
  const totalRevenue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingRevenue = invoices
    .filter(inv => inv.status !== 'Paid' && inv.status !== 'Overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueRevenue = invoices
    .filter(inv => inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const activeCustomers = customers.filter(c => c.status === 'Active').length;
  const leadCount = leads.length;
  const recentLogs = activityLogs.slice(0, 5);

  // Renewals in next 30 days
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);
  
  const upcomingRenewals = customers.filter(c => {
    const renewDate = new Date(c.renewalDate);
    return renewDate >= today && renewDate <= next30Days;
  });

  // --- Monthly Revenue Chart Data (last 6 months) ---
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });

      const collected = invoices
        .filter(inv => inv.status === 'Paid' && inv.date?.startsWith(monthKey))
        .reduce((s, inv) => s + inv.amount, 0);

      const outstanding = invoices
        .filter(inv => inv.status !== 'Paid' && inv.date?.startsWith(monthKey))
        .reduce((s, inv) => s + inv.amount, 0);

      const totalExpenses = expenses
        .filter(e => e.date?.startsWith(monthKey))
        .reduce((s, e) => s + e.amount, 0);

      months.push({ month: label, Collected: collected, Outstanding: outstanding, Expenses: totalExpenses });
    }
    return months;
  };

  const monthlyData = getMonthlyData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '12px', padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' 
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{label}</p>
          {payload.map(p => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '4px' }}>
              <span style={{ color: p.color, fontWeight: 600, fontSize: '0.8rem' }}>{p.name}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.8rem' }}>LKR {(p.value || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- CSV Export ---
  const exportDashboardCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue (Paid)', totalRevenue],
      ['Outstanding Revenue', outstandingRevenue],
      ['Overdue Revenue', overdueRevenue],
      ['Active Clients', activeCustomers],
      ['Total Leads', leadCount],
      ['Upcoming Renewals (30d)', upcomingRenewals.length],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="h1 mb-2">Enterprise Insights</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Global performance analytics and business operation metrics.</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" style={{ height: '44px' }} onClick={exportDashboardCSV}>
            <Download size={16} /> Export
          </button>
          <Link to="/quotations" className="btn btn-secondary" style={{ height: '44px' }}>Draft Quote</Link>
          <Link to="/invoices" className="btn btn-primary" style={{ height: '44px' }}>Issue Invoice</Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Consolidated Revenue" 
          value={`LKR ${totalRevenue.toLocaleString()}`} 
          icon={<IndianRupee />} 
          color="var(--success)"
          sub={`${invoices.filter(i => i.status === 'Paid').length} paid invoices`}
        />
        <StatCard 
          title="Accounts Receivable" 
          value={`LKR ${outstandingRevenue.toLocaleString()}`} 
          icon={<ArrowUpRight />} 
          color="var(--warning)"
          sub={`${invoices.filter(i => i.status === 'Sent').length} pending`}
        />
        <StatCard 
          title="Enterprise Clients" 
          value={activeCustomers} 
          icon={<Users />} 
          color="var(--accent-primary)"
          sub={`${customers.length} total`}
        />
        <StatCard 
          title="Overdue Balance" 
          value={overdueRevenue > 0 ? `LKR ${overdueRevenue.toLocaleString()}` : '—'} 
          icon={<Target />} 
          color="var(--danger)"
          sub={`${invoices.filter(i => i.status === 'Overdue').length} overdue`}
        />
      </div>

      {/* Revenue Chart */}
      <div className="glass-panel mb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="h3">Revenue Overview</h2>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Monthly collected vs outstanding (last 6 months)</p>
          </div>
          <TrendingUp size={18} className="text-muted" style={{ opacity: 0.4 }} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }} 
              axisLine={false} tickLine={false} 
            />
            <YAxis 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
              axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="Collected" fill="#22c55e" radius={[6,6,0,0]} />
            <Bar dataKey="Outstanding" fill="#f59e0b" radius={[6,6,0,0]} />
            <Bar dataKey="Expenses" fill="#f43f5e" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-4 justify-center">
          {[['#22c55e','Collected'],['#f59e0b','Outstanding'],['#f43f5e','Expenses']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Funnel + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="h3">Conversion Intelligence Pipeline</h2>
            <TrendingUp size={18} className="text-muted" />
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-4 md:gap-2 px-2" style={{ minHeight: '120px' }}>
             <FunnelStep label="Gross Leads" count={leads.length} color="var(--danger)" total={leads.length || 1} />
             <div className="sm-hidden" style={{ fontSize: '18px', color: 'var(--panel-border)', fontWeight: 300, paddingBottom: '30px' }}>━━━</div>
             <FunnelStep label="Draft Proposals" count={quotes.length} color="var(--warning)" total={leads.length || 1} />
             <div className="sm-hidden" style={{ fontSize: '18px', color: 'var(--panel-border)', fontWeight: 300, paddingBottom: '30px' }}>━━━</div>
             <FunnelStep label="Client Conversions" count={activeCustomers} color="var(--success)" total={leads.length || 1} />
          </div>
        </div>

        <div className="glass-panel">
          <h2 className="h3 mb-6">Attention Required</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pending Quotations</span>
              <span style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{quotes.filter(q => q.status === 'Pending').length}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(244, 63, 94, 0.04)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overdue Invoices</span>
              <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{invoices.filter(i => i.status === 'Overdue').length}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(34, 197, 94, 0.04)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Renewals (30 days)</span>
              <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{upcomingRenewals.length}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(99,102,241, 0.04)', borderRadius: '12px', border: '1px solid rgba(99,102,241, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Leads</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{leads.filter(l => l.status === 'New' || l.status === 'Contacted').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="h3">Upcoming Renewals</h2>
            <div style={{ padding: '6px 12px', background: 'var(--subtle-bg)', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>NEXT 30 DAYS</div>
          </div>
          
          {upcomingRenewals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Clock size={48} className="text-muted" style={{ opacity: 0.1, marginBottom: '20px', display: 'block', margin: '0 auto 20px' }} />
              <p className="text-secondary" style={{ fontSize: '0.95rem' }}>No pending renewals found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               {upcomingRenewals.map(gym => (
                  <div key={gym.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', 
                    background: 'var(--subtle-bg)', borderRadius: '14px',
                    border: '1px solid var(--subtle-border)',
                    transition: 'all 0.2s ease'
                  }} className="hover-lift">
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '2px' }}>{gym.gymName}</div>
                       <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          Renews on {new Date(gym.renewalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                       </div>
                    </div>
                    <div style={{ color: 'var(--success)', fontWeight: 800, textAlign: 'right', fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                       <span style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: '4px' }}>LKR</span>
                       {gym.annualFee.toLocaleString()}
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Recent Activity Logs */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="h3">Recent Activity</h2>
            <Link to="/logs" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>View Full Log</Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentLogs.map(log => (
              <div key={log.id} style={{ 
                display: 'flex', gap: '16px', padding: '16px', 
                background: 'var(--subtle-bg)', borderRadius: '14px',
                border: '1px solid var(--subtle-border)',
                transition: 'all 0.2s ease'
              }} className="hover-lift">
                <div style={{ 
                  width: '42px', height: '42px', borderRadius: '12px', 
                  background: log.type === 'SMS' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                }}>
                  {log.type === 'SMS' ? <Smartphone size={18} color="var(--accent-primary)" /> : <Info size={18} color="var(--warning)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-start">
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{log.message}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {log.type} Activity logged
                  </p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <ClipboardList size={48} className="text-muted" style={{ opacity: 0.1, marginBottom: '20px', display: 'block', margin: '0 auto 20px' }} />
                <p className="text-secondary" style={{ fontSize: '0.95rem' }}>No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, sub }) => (
  <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
    <div style={{ 
      width: '42px', height: '42px', borderRadius: '12px', 
      background: `${color}10`, display: 'flex', 
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      border: `1px solid ${color}15`
    }}>
      {React.cloneElement(icon, { size: 20, color })}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p className="text-secondary mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 850, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value}</h3>
      {sub && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  </div>
);

const FunnelStep = ({ label, count, color, total }) => {
  const height = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        width: '100%', maxWidth: '24px', height: '60px', background: 'var(--subtle-bg)', 
        borderRadius: '6px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
        border: '1px solid var(--subtle-border)'
      }}>
        <div style={{ 
          width: '100%', height: `${Math.max(height, 10)}%`, background: color, 
          transition: '1.2s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '1px',
          boxShadow: `0 0 20px ${color}25`
        }}></div>
      </div>
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ fontWeight: 800, color, fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '2px' }}>{count}</div>
        <div className="text-secondary" style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      </div>
    </div>
  );
};

export default Dashboard;
