import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { IndianRupee, Users, ArrowUpRight, Clock, Target, ClipboardList, TrendingUp, Smartphone, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="h1 mb-1">Dashboard</h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base font-medium">Welcome back. Here's a summary of your sales and operations.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link to="/quotations" className="btn btn-secondary flex-1 md:flex-none py-3 px-6 hover:scale-105 active:scale-95 transition-all">Create Quote</Link>
          <Link to="/invoices" className="btn btn-primary flex-1 md:flex-none py-3 px-6 hover:scale-105 active:scale-95 transition-all">Create Invoice</Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Revenue" 
          value={`LKR ${totalRevenue.toLocaleString()}`} 
          icon={<IndianRupee />} 
          color="var(--success)"
        />
        <StatCard 
          title="Outstanding" 
          value={`LKR ${outstandingRevenue.toLocaleString()}`} 
          icon={<ArrowUpRight />} 
          color="var(--warning)"
        />
        <StatCard 
          title="Active Gyms" 
          value={activeCustomers} 
          icon={<Users />} 
          color="var(--accent-primary)"
        />
        <StatCard 
          title="Incoming Leads" 
          value={leadCount} 
          icon={<Target />} 
          color="var(--danger)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Sales Funnel */}
        <div className="glass-panel lg:col-span-2 p-8 overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h2 className="h3 font-bold group flex items-center gap-2">
              Sales Performance Pipeline
              <TrendingUp size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
            </h2>
          </div>
          <div className="flex items-end justify-between gap-4 h-[140px] px-2">
             <FunnelStep label="Total Leads" count={leads.length} color="var(--danger)" total={leads.length || 1} />
             <div className="flex-1 border-t-2 border-dashed border-[var(--panel-border)] mb-10 opacity-30"></div>
             <FunnelStep label="Sent Quotes" count={quotes.length} color="var(--warning)" total={leads.length || 1} />
             <div className="flex-1 border-t-2 border-dashed border-[var(--panel-border)] mb-10 opacity-30"></div>
             <FunnelStep label="Closed Sales" count={activeCustomers} color="var(--success)" total={leads.length || 1} />
          </div>
        </div>

        {/* Quick Health Status */}
        <div className="glass-panel p-8">
          <h2 className="h3 mb-8 font-bold">Attention Required</h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 hover:border-amber-500/30 transition-all group">
              <span className="text-[var(--text-secondary)] font-bold text-sm">Pending Quotations</span>
              <span className="font-black text-[var(--warning)] text-2xl font-['Outfit'] group-hover:scale-110 transition-transform">{quotes.filter(q => q.status === 'Pending').length}</span>
            </div>
            <div className="flex justify-between items-center p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 hover:border-rose-500/30 transition-all group">
              <span className="text-[var(--text-secondary)] font-bold text-sm">Overdue Payments</span>
              <span className="font-black text-[var(--danger)] text-2xl font-['Outfit'] group-hover:scale-110 transition-transform">{invoices.filter(i => i.status === 'Overdue').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Renewals */}
        <div className="glass-panel p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="h3 font-bold">Upcoming Renewals</h2>
            <div className="px-3 py-1 bg-[var(--subtle-bg)] rounded-lg text-[10px] font-black text-[var(--text-muted)] tracking-widest">NEXT 30 DAYS</div>
          </div>
          
          {upcomingRenewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Clock size={48} className="mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">No pending renewals found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
               {upcomingRenewals.map(gym => (
                  <div key={gym.id} className="flex justify-between items-center p-4 bg-[var(--subtle-bg)] rounded-2xl border border-[var(--subtle-border)] hover:border-[var(--accent-primary)]/30 hover:scale-[1.02] transition-all group cursor-default">
                    <div className="flex-1">
                       <div className="font-bold text-[var(--text-primary)] text-lg mb-1">{gym.gymName}</div>
                       <div className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider">
                          Renews {new Date(gym.renewalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[var(--success)] font-black text-xl font-['Outfit'] group-hover:scale-110 transition-transform">
                          <span className="text-[10px] opacity-70 mr-1 font-bold">LKR</span>
                          {gym.annualFee.toLocaleString()}
                       </div>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Recent Activity Logs */}
        <div className="glass-panel p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="h3 font-bold">Recent Activity</h2>
            <Link to="/logs" className="btn btn-secondary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-primary)]/10">View Full Log</Link>
          </div>
          <div className="flex flex-col gap-4">
            {recentLogs.map(log => (
              <div key={log.id} className="flex gap-4 p-4 bg-[var(--subtle-bg)] rounded-2xl border border-[var(--subtle-border)] hover:border-[var(--accent-primary)]/20 transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:rotate-12 ${
                  log.type === 'SMS' ? 'bg-indigo-500/10 border-indigo-500/20 text-[var(--accent-primary)]' : 'bg-amber-500/10 border-amber-500/20 text-[var(--warning)]'
                }`}>
                  {log.type === 'SMS' ? <Smartphone size={20} /> : <Info size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{log.message}</p>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    {log.type} Event Logged
                  </p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 opacity-30">
                <ClipboardList size={48} className="mb-4" />
                <p className="text-[var(--text-secondary)] font-medium">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="glass-panel p-6 flex items-center gap-5 group hover:border-[var(--accent-primary)]/30 transition-all">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-110" 
         style={{ background: `${color}10`, borderColor: `${color}20` }}>
      {React.cloneElement(icon, { size: 24, color })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl md:text-2xl font-black text-[var(--text-primary)] font-['Outfit'] truncate tracking-tight">{value}</h3>
    </div>
  </div>
);

const FunnelStep = ({ label, count, color, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-4 flex-1 group">
      <div className="w-full max-w-[32px] h-[80px] bg-[var(--subtle-bg)] rounded-xl relative overflow-hidden border border-[var(--subtle-border)] flex flex-col justify-end">
        <div 
          className="w-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]" 
          style={{ height: `${Math.max(percentage, 5)}%`, background: color }}
        ></div>
      </div>
      <div className="text-center">
        <div className="font-black text-lg md:text-xl font-['Outfit'] group-hover:scale-110 transition-transform" style={{ color }}>{count}</div>
        <div className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest leading-tight">{label}</div>
      </div>
    </div>
  );
};

export default Dashboard;

