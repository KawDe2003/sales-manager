import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { IndianRupee, Users, ArrowUpRight, Clock, Target, ClipboardList, TrendingUp, Smartphone, Info, BarChart3, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard = () => {
  const { 
    customers = [], 
    invoices = [], 
    quotes = [], 
    leads = [], 
    activityLogs = [] 
  } = useContext(StoreContext) || {};

  // Calculate metrics
  const totalRevenue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingRevenue = invoices
    .filter(inv => inv.status !== 'Paid')
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

  // Analytics Data Prep
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyDataMap = {};
  invoices.forEach(inv => {
    if (!inv.date) return;
    const d = new Date(inv.date);
    const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { name: monthKey, Collected: 0, Outstanding: 0 };
    }
    if (inv.status === 'Paid') {
      monthlyDataMap[monthKey].Collected += Number(inv.amount) || 0;
    } else {
      monthlyDataMap[monthKey].Outstanding += Number(inv.amount) || 0;
    }
  });
  const revenueChartData = Object.values(monthlyDataMap).slice(-6); // Last 6 months

  const clientRevenueMap = {};
  invoices.filter(i => i.status === 'Paid').forEach(inv => {
    if (!clientRevenueMap[inv.customerId]) {
      clientRevenueMap[inv.customerId] = 0;
    }
    clientRevenueMap[inv.customerId] += Number(inv.amount) || 0;
  });
  
  const topClientsData = Object.entries(clientRevenueMap)
    .map(([id, amount]) => {
      const customer = customers.find(c => c.id === id);
      return { name: customer ? customer.gymName : 'Unknown', amount };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="h1 mb-2">Enterprise Insights</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Global performance analytics and business operation metrics.</p>
        </div>
        <div className="btn-group">
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
        />
        <StatCard 
          title="Accounts Receivable" 
          value={`LKR ${outstandingRevenue.toLocaleString()}`} 
          icon={<ArrowUpRight />} 
          color="var(--warning)"
        />
        <StatCard 
          title="Enterprise Clients" 
          value={activeCustomers} 
          icon={<Users />} 
          color="var(--accent-primary)"
        />
        <StatCard 
          title="Market Inbounds" 
          value={leadCount} 
          icon={<Target />} 
          color="var(--danger)"
        />
      </div>

      {/* Revenue Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-accent" size={20} />
              <h2 className="h3 m-0">Monthly Revenue Trends</h2>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={revenueChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `LKR ${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'var(--subtle-bg)'}}
                    contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="Collected" stackId="a" fill="var(--success)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Outstanding" stackId="a" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-secondary">
                  <BarChart3 size={48} className="text-muted" style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p>Not enough invoice data to display trends.</p>
                </div>
            )}
          </div>
        </div>

        <div className="glass-panel">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Award className="text-warning" size={20} />
              <h2 className="h3 m-0">Top Performing Clients</h2>
            </div>
          </div>
          {topClientsData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {topClientsData.map((client, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-xl border border-subtle bg-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                      #{index + 1}
                    </div>
                    <span className="font-semibold text-primary">{client.name}</span>
                  </div>
                  <span className="font-bold font-display text-success">LKR {client.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center py-10 text-secondary">
                <p>No paid invoices recorded yet.</p>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Funnel */}
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

        {/* Quick Health Status */}
        <div className="glass-panel">
          <h2 className="h3 mb-6">Attention Required</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pending Quotations</span>
              <span style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{quotes.filter(q => q.status === 'Pending').length}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '14px 18px', background: 'rgba(244, 63, 94, 0.04)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.06)' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overdue Payments</span>
              <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{invoices.filter(i => i.status === 'Overdue').length}</span>
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
              <Clock size={48} className="text-muted" style={{ opacity: 0.1, mb: '20px' }} />
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
                <ClipboardList size={48} className="text-muted" style={{ opacity: 0.1, marginBottom: '20px' }} />
                <p className="text-secondary" style={{ fontSize: '0.95rem' }}>No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
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
      <h3 style={{ fontSize: '1.15rem', fontWeight: 850, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value}</h3>
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

