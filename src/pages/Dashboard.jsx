import React, { useContext, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  IndianRupee, Users, Target, Activity, 
  TrendingUp, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Globe,
  FileText, PlusCircle, CreditCard, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  } = useContext(StoreContext) || {};

  // --- CORE ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const getRevenue = (m, y) => invoices
      .filter(inv => new Date(inv.date).getMonth() === m && new Date(inv.date).getFullYear() === y && inv.status === 'Paid')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

    const revenueNow = getRevenue(thisMonth, thisYear);
    const revenuePrev = getRevenue(lastMonth, lastMonthYear);
    const revenueTotal = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
    const revenueGrowth = revenuePrev === 0 ? 100 : Math.round(((revenueNow - revenuePrev) / revenuePrev) * 100);
    
    const outstanding = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);

    return {
      revenue: { val: revenueTotal, growth: revenueGrowth },
      outstanding: outstanding,
      customers: customers.length,
      leads: leads.length,
      quotes: quotes.length
    };
  }, [invoices, customers, leads, quotes]);

  // --- CHART DATA PREP ---
  const trendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return monthNames.map((name, i) => {
      const targetMonth = (new Date().getMonth() - (5 - i) + 12) % 12;
      const monthInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === targetMonth);
      return {
        name,
        collection: monthInvoices.filter(inv => inv.status === 'Paid').reduce((s, i) => s + i.amount, 0),
        pipeline: monthInvoices.filter(inv => inv.status !== 'Paid').reduce((s, i) => s + i.amount, 0)
      };
    });
  }, [invoices]);

  const radialData = [
    { name: 'Leads', value: stats.leads || 1, fill: '#06b6d4' },       // Cyan
    { name: 'Quotes', value: stats.quotes || 1, fill: '#8b5cf6' },      // Violet
    { name: 'Deals', value: stats.customers || 1, fill: '#10b981' },    // Emerald
  ];
  const maxRadialValue = Math.max(stats.leads, stats.quotes, stats.customers) || 10;

  const pieData = [
    { name: 'Collected', value: stats.revenue.val, color: '#06b6d4' },
    { name: 'Outstanding', value: stats.outstanding, color: '#f59e0b' }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      
      {/* HEADER WITH QUICK BUTTONS */}
      <div className="page-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '120%', height: '200%', background: 'radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.15), transparent 50%)', pointerEvents: 'none' }}></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h1 className="h1" style={{ 
              background: 'linear-gradient(to right, #0ea5e9, #8b5cf6, #ec4899)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 15px rgba(139, 92, 246, 0.3))',
              marginBottom: '4px'
            }}>
              Nexus Command
            </h1>
            <p className="text-secondary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', 
                boxShadow: '0 0 12px #10b981, 0 0 4px #10b981'
              }}></span>
              SYSTEMS ONLINE & SYNCHRONIZED
            </p>
          </div>
          <div className="btn-group">
            <Link to="/invoices" className="btn btn-secondary">
               <CreditCard size={18} /> Issue Invoice
            </Link>
            <Link to="/customers" className="btn btn-primary">
               <Users size={18} /> New Deployment
            </Link>
          </div>
        </div>
      </div>

      {/* ACTION MATRIX (QUICK BUTTONS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <ActionBtn icon={<FileText />} label="Draft Quote" link="/quotations" mainColor="#06b6d4" />
         <ActionBtn icon={<PlusCircle />} label="Add Lead" link="/customers" mainColor="#8b5cf6" />
         <ActionBtn icon={<CreditCard />} label="Log Payment" link="/invoices" mainColor="#10b981" />
         <ActionBtn icon={<BarChart3 />} label="Analytics Tab" link="/reports" mainColor="#f59e0b" />
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPIBox 
          title="Capital Realized" 
          value={`LKR ${stats.revenue.val.toLocaleString()}`} 
          icon={<IndianRupee color="#34d399" />} 
          trend={stats.revenue.growth}
          glowColor="#34d399"
        />
        <KPIBox 
          title="Capital Pipeline" 
          value={`LKR ${stats.outstanding.toLocaleString()}`} 
          icon={<Activity color="#fbbf24" />} 
          glowColor="#fbbf24"
        />
        <KPIBox 
          title="Deployments" 
          value={stats.customers} 
          icon={<Globe color="#818cf8" />} 
          glowColor="#818cf8"
        />
        <KPIBox 
          title="Market Vectors" 
          value={stats.leads} 
          icon={<Zap color="#f472b6" />} 
          glowColor="#f472b6"
        />
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* VELOCITY MATRIX */}
        <div className="glass-panel col-span-1 lg:col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
               <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 211, 238, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 color="#22d3ee" size={20} />
               </div>
               <div>
                  <h3 className="h3">Velocity Matrix</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Revenue vs Pipeline</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
              <LegendItem color="#22d3ee" label="Collected" />
              <LegendItem color="#8b5cf6" label="Pipeline" />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '320px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6}/>
                     <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                     <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--subtle-border)" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} dy={15}/>
                 <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `${v/1000}k`}/>
                 <Tooltip 
                   contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px', backdropFilter: 'blur(20px)', color: 'var(--text-primary)', fontWeight: 800 }}
                 />
                 <Area type="monotone" dataKey="pipeline" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPipe)" animationDuration={1500} />
                 <Area type="monotone" dataKey="collection" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorColl)" animationDuration={2000} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* RADIAL TOPOLOGY */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="mb-4 relative z-10 flex items-center gap-3">
             <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="#8b5cf6" size={20} />
             </div>
             <div>
                <h3 className="h3">Conversion Rings</h3>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Lead Topology</p>
             </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" cy="50%" 
                  innerRadius="30%" outerRadius="100%" 
                  barSize={18} 
                  data={radialData}
                  startAngle={180} endAngle={-180}
                >
                  <PolarAngleAxis type="number" domain={[0, maxRadialValue]} angleAxisId={0} tick={false} />
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
            </div>
            <div className="flex flex-wrap justify-center gap-4 w-full" style={{ marginTop: '20px' }}>
               <LegendItem color="#06b6d4" label="Leads" />
               <LegendItem color="#8b5cf6" label="Quotes" />
               <LegendItem color="#10b981" label="Deals" />
            </div>
          </div>
        </div>

        {/* PIE CHART DISTRIBUTION */}
        <div className="glass-panel col-span-1 lg:col-span-1" style={{ display: 'flex', flexDirection: 'column' }}>
           <div className="mb-4 relative z-10 flex items-center gap-3">
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Globe color="#f59e0b" size={20} />
              </div>
              <div>
                 <h3 className="h3">Distribution</h3>
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
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 w-full" style={{ marginTop: '20px' }}>
                <LegendItem color="#06b6d4" label="Collected" />
                <LegendItem color="#f59e0b" label="Pending" />
             </div>
           </div>
        </div>

        {/* INTELLIGENCE PROTOCOL */}
        <div className="glass-panel col-span-1 lg:col-span-2" style={{ borderLeft: '4px solid #6366f1' }}>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6" style={{ height: '100%' }}>
              <div className="flex items-center gap-6">
                 <div style={{ 
                    width: '60px', height: '60px', borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #6366f1, #22d3ee)', 
                    padding: '2px', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' 
                 }}>
                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Award color="#22d3ee" size={28} />
                    </div>
                 </div>
                 <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px' }}>Intelligence Protocol</h4>
                    <h2 className="h2" style={{ color: 'var(--text-primary)' }}>System Optimized</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', maxWidth: '400px', lineHeight: '1.5' }}>
                      Your fiscal architecture is demonstrating positive flow. Customer acquisition loops and invoice generation nodes remain fully functional.
                    </p>
                 </div>
              </div>
              <div>
                 <Link to="/reports" className="btn" style={{ 
                    background: 'rgba(34, 211, 238, 0.1)', color: '#0ea5e9', 
                    border: '1px solid rgba(34, 211, 238, 0.2)', padding: '12px 24px' 
                 }}>
                    <BarChart3 size={18} /> Deep Scan
                 </Link>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

// Subcomponents

const ActionBtn = ({ icon, label, link, mainColor }) => {
  return (
    <Link to={link} className="glass-panel" style={{ 
       display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
       gap: '12px', padding: '24px 12px',
       textDecoration: 'none', position: 'relative'
    }}
    onMouseEnter={(e) => {
       e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
       e.currentTarget.style.borderColor = mainColor;
       e.currentTarget.style.boxShadow = `0 15px 35px -5px ${mainColor}40, inset 0 1px 1px rgba(255,255,255,0.1)`;
       const iconWrapper = e.currentTarget.querySelector('.icon-wrap');
       if(iconWrapper) iconWrapper.style.transform = 'scale(1.1)';
    }}
    onMouseLeave={(e) => {
       e.currentTarget.style.transform = 'translateY(0) scale(1)';
       e.currentTarget.style.borderColor = 'var(--panel-border)';
       e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.05), var(--card-shadow)';
       const iconWrapper = e.currentTarget.querySelector('.icon-wrap');
       if(iconWrapper) iconWrapper.style.transform = 'scale(1)';
    }}
    >
       <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: mainColor, opacity: 0.8 }}></div>
       <div className="icon-wrap" style={{ 
         width: '44px', height: '44px', borderRadius: '14px', background: 'var(--bg-primary)', 
         border: '1px solid var(--subtle-border)',
         display: 'flex', alignItems: 'center', justifyContent: 'center', color: mainColor,
         boxShadow: `0 8px 16px ${mainColor}20`,
         transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
       }}>
          {React.cloneElement(icon, { size: 22 })}
       </div>
       <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', textAlign: 'center' }}>{label}</span>
    </Link>
  );
}

const KPIBox = ({ title, value, icon, trend, glowColor }) => {
  return (
    <div className="glass-panel" style={{ position: 'relative', padding: '32px 28px' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: `radial-gradient(circle at top right, ${glowColor}15, transparent 70%)`, pointerEvents: 'none' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', position: 'relative', zIndex: 2 }}>
        <div style={{ 
           width: '56px', height: '56px', borderRadius: '16px', background: 'var(--bg-primary)', 
           border: '1px solid var(--subtle-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           boxShadow: `0 8px 20px ${glowColor}25, inset 0 2px 4px rgba(255,255,255,0.05)`
        }}>
          {React.cloneElement(icon, { size: 28 })}
        </div>
        {trend !== undefined && (
          <div style={{ 
             display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 800, 
             padding: '6px 12px', borderRadius: '20px', 
             background: trend >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
             color: trend >= 0 ? '#10b981' : '#ef4444',
             border: `1px solid ${trend >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
             boxShadow: trend >= 0 ? '0 4px 10px rgba(16, 185, 129, 0.1)' : '0 4px 10px rgba(239, 68, 68, 0.1)'
          }}>
            {trend >= 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '8px' }}>{title}</p>
        <div style={{ 
          fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1,
          fontFamily: 'var(--font-display)', textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          {value}
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
     <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }}></span>
     <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
  </div>
);

export default Dashboard;

