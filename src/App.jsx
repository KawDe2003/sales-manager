import React, { useContext, useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Receipt, BarChart3, 
  Settings as SettingsIcon, Package, CheckCircle, AlertCircle, 
  X, Target, ClipboardList, Menu, BadgeDollarSign, LogIn,
  PanelLeftClose, PanelLeftOpen, Bell, Search, PlusCircle, CreditCard, ChevronRight
} from 'lucide-react';
import StoreContextProvider, { StoreContext } from './context/StoreContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Quotations = lazy(() => import('./pages/Quotations'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Reports = lazy(() => import('./pages/Reports'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Settings = lazy(() => import('./pages/Settings'));
const SharedDocument = lazy(() => import('./pages/SharedDocument'));
const Leads = lazy(() => import('./pages/Leads'));
const Logs = lazy(() => import('./pages/Logs'));
const Payments = lazy(() => import('./pages/Payments'));
const Debtors = lazy(() => import('./pages/Debtors'));

import { AuthProvider, useAuth } from './context/AuthContext';
const Login = lazy(() => import('./pages/Login'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%', background: '#020617' }}>
    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <StoreContextProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </StoreContextProvider>
    </AuthProvider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppContent = () => {
  const { notification, theme, smsConfig = {}, showNotification, isStoreLoading, systemNotifications = [], markNotificationsRead, customers = [], invoices = [], leads = [] } = useContext(StoreContext);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const isPublicShareView = location.pathname.startsWith('/share');
  const isLoginPage = location.pathname === '/login';

  // Inactivity Timer
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const timeoutMinutes = smsConfig.sessionTimeout || 5;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        showNotification('Session expired due to inactivity', 'error');
        signOut();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, smsConfig.sessionTimeout, signOut, showNotification]);

  useEffect(() => {
    if (smsConfig.appFavicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = smsConfig.appFavicon;
    }
  }, [smsConfig.appFavicon]);

  // Sync browser tab title with Dashboard Name
  useEffect(() => {
    document.title = `${smsConfig.dashboardName || 'GymSales Pro'} | Sales Management`;
  }, [smsConfig.dashboardName]);

  // If on public share view, render without layout
  if (isPublicShareView) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617' }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/share/:type/:id" element={<SharedDocument />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  // If on login page, render without layout
  if (isLoginPage) {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  // Fully Cloud: Show global loader if store is still fetching for authenticated user
  if (user && isStoreLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className={sidebarOpen ? "sidebar-open" : ""} style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh', 
      position: 'relative',
      width: '100%'
    }}>
      {/* Global Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '16px 24px', borderRadius: '12px', minWidth: '300px',
          background: notification.type === 'success' ? 'var(--success)' : 'var(--danger)',
          backdropFilter: 'blur(10px)', color: 'white',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'fadeIn 0.3s ease-out',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ flex: 1, fontWeight: '600', fontSize: '0.9rem' }}>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="layout-header flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Mobile Toggle */}
          <button 
            className="btn btn-secondary hidden-desktop" 
            onClick={toggleSidebar}
            style={{ padding: '8px', border: '1px solid var(--panel-border)', background: 'var(--subtle-bg)', borderRadius: '10px' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Desktop Collapse Toggle */}
          <button 
            className="btn btn-secondary hidden-mobile" 
            onClick={toggleSidebarCollapse}
            style={{ 
              padding: '8px', 
              border: '1px solid var(--panel-border)', 
              background: 'rgba(99, 102, 241, 0.08)', 
              borderRadius: '10px',
              color: 'var(--accent-primary)',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.1)'
            }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          
          <Link to="/" className="flex items-center gap-4" onClick={closeSidebar}>
            <div style={{ 
              width: '38px', height: '38px', borderRadius: '12px', 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
            }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-display)' }}>
                {(smsConfig.dashboardName || 'GymSales').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden-mobile">
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {smsConfig.dashboardName || 'GymSales'}<span style={{ color: 'var(--accent-primary)' }}>.</span>
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/invoices" className="btn btn-secondary hidden-mobile" style={{ height: '42px', color: 'var(--success)' }}>
            <CreditCard size={18} /> Issue Invoice
          </Link>
          <Link to="/customers" className="btn btn-primary hidden-mobile" style={{ height: '42px' }}>
            <PlusCircle size={18} /> New Deployment
          </Link>

          <button 
            className="btn btn-secondary" 
            style={{ width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSearchOpen(true)}
            title="Search (Cmd+K)"
          >
            <Search size={18} className="text-secondary" />
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              style={{ width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={18} className="text-secondary" />
              {systemNotifications?.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: 'var(--danger)', color: 'white', fontSize: '0.65rem',
                  fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)'
                }}>{systemNotifications.length}</span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="glass-panel" style={{
                position: 'absolute', top: '54px', right: '0', width: '320px', padding: '16px',
                zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)', border: '1px solid var(--panel-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--subtle-border)', paddingBottom: '12px', marginBottom: '8px' }}>
                   <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>System Alerts</span>
                   {systemNotifications?.length > 0 && (
                     <button onClick={markNotificationsRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                   )}
                </div>
                {systemNotifications?.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new notifications</div>
                ) : (
                  systemNotifications.slice(0, 5).map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--subtle-bg)', borderRadius: '8px', borderLeft: `3px solid ${n.type === 'success' ? 'var(--success)' : 'var(--danger)'}` }}>
                       <div style={{ flex: 1 }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.message}</div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.time).toLocaleTimeString()}</div>
                       </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Link 
            to="/settings" 
            className="btn btn-secondary hidden-mobile" 
            style={{ height: '42px', width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={closeSidebar}
          >
            <SettingsIcon size={18} className="text-secondary" />
          </Link>

          {user && (
            <button 
              className="btn btn-secondary" 
              style={{ color: 'var(--danger)', height: '42px' }}
              onClick={() => {
                signOut();
                closeSidebar();
              }}
            >
              <LogIn size={18} style={{ transform: 'rotate(180deg)' }} />
              <span className="hidden-mobile" style={{ marginLeft: '6px' }}>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px'
        }} onClick={() => setSearchOpen(false)}>
           <div className="glass-panel" style={{ 
             width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden', 
             border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' 
           }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)', background: 'var(--bg-secondary)' }}>
                 <Search size={24} className="text-muted" style={{ marginRight: '16px' }} />
                 <input 
                   autoFocus
                   type="text" 
                   placeholder="Search gyms, leads, or invoices..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', outline: 'none' }}
                 />
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--subtle-bg)', padding: '4px 8px', borderRadius: '6px', fontWeight: 800 }}>ESC</div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
                 {searchQuery.length < 2 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Type at least 2 characters to search...</div>
                 ) : (
                   (() => {
                     const q = searchQuery.toLowerCase();
                     const foundCustomers = customers.filter(c => c.gymName?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)).slice(0, 3);
                     const foundLeads = leads.filter(l => l.gymName?.toLowerCase().includes(q)).slice(0, 3);
                     const foundInvoices = invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(q) || i.prospectName?.toLowerCase().includes(q)).slice(0, 3);
                     
                     const hasResults = foundCustomers.length > 0 || foundLeads.length > 0 || foundInvoices.length > 0;
                     
                     return !hasResults ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No results found for "{searchQuery}"</div>
                     ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           {foundCustomers.map(c => (
                             <Link key={c.id} to="/customers" onClick={() => setSearchOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }} className="search-item">
                               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Users size={16} className="text-accent-primary" /> <span style={{ fontWeight: 600 }}>{c.gymName}</span></div>
                               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Active Gym</span>
                             </Link>
                           ))}
                           {foundLeads.map(l => (
                             <Link key={l.id} to="/leads" onClick={() => setSearchOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }} className="search-item">
                               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Target size={16} className="text-warning" /> <span style={{ fontWeight: 600 }}>{l.gymName}</span></div>
                               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Lead</span>
                             </Link>
                           ))}
                           {foundInvoices.map(i => (
                             <Link key={i.id} to="/invoices" onClick={() => setSearchOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }} className="search-item">
                               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Receipt size={16} className="text-success" /> <span style={{ fontWeight: 600 }}>{i.invoiceNumber} - {i.prospectName}</span></div>
                               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Invoice</span>
                             </Link>
                           ))}
                        </div>
                     )
                   })()
                 )}
              </div>
           </div>
           <style>{`
             .search-item:hover { background: var(--subtle-bg); }
           `}</style>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar Overlay (Mobile) */}
        <div className="sidebar-overlay" onClick={closeSidebar}></div>

        {/* Sidebar */}
        <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ 
          background: 'var(--bg-secondary)',
          opacity: 0.98,
          display: 'flex',
          flexDirection: 'column',
          padding: isSidebarCollapsed ? '32px 8px' : '32px 0'
        }}>
          <div style={{ padding: isSidebarCollapsed ? '0' : '0 24px', marginBottom: '24px', textAlign: isSidebarCollapsed ? 'center' : 'left' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {isSidebarCollapsed ? '•' : 'Navigation'}
            </span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', flex: 1, gap: '4px' }}>
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/leads" icon={<Target size={18} />} label="Leads Pipeline" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/customers" icon={<Users size={18} />} label="Active Gyms" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/inventory" icon={<Package size={18} />} label="Inventory" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/quotations" icon={<FileText size={18} />} label="Quotations" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/invoices" icon={<Receipt size={18} />} label="Invoices" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/payments" icon={<BadgeDollarSign size={18} />} label="Payment Portal" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/debtors" icon={<AlertCircle size={18} />} label="Debtor Management" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/reports" icon={<BarChart3 size={18} />} label="Insights" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            <NavItem to="/logs" icon={<ClipboardList size={18} />} label="Activity Logs" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
          </nav>
          
          <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--panel-border)' }}>
             {!isSidebarCollapsed && (
               <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
                 v3.2.0 Enterprise
               </div>
             )}
          </div>
        </aside>

        {/* Main Content */}
        <main className={`main-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/debtors" element={<ProtectedRoute><Debtors /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

// NavItem Component
const NavItem = ({ to, icon, label, onClick, collapsed }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? '0' : '12px',
        padding: collapsed ? '14px 0' : '14px 18px',
        borderRadius: '14px',
        color: isActive ? '#ffffff' : 'var(--text-secondary)',
        background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))' : 'transparent',
        fontWeight: isActive ? '700' : '600',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '0.88rem',
        borderLeft: (isActive && !collapsed) ? '4px solid var(--accent-primary)' : '4px solid transparent',
        boxShadow: isActive ? 'inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 15px var(--accent-glow)' : 'none',
        position: 'relative'
      })}
      className={({ isActive }) => `${isActive ? "nav-item active" : "nav-item"} ${collapsed ? "collapsed" : ""}`}
      title={collapsed ? label : ""}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex' }}>{icon}</span>
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
};

export default App;


