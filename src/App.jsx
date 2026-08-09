import React, { useContext, useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Receipt, BarChart3, 
  Settings as SettingsIcon, Package, CheckCircle, AlertCircle, 
  X, Target, ClipboardList, Menu, BadgeDollarSign, LogIn,
  PanelLeftClose, PanelLeftOpen, Bell, Search, PlusCircle, CreditCard, ChevronRight,
  Sun, Moon, Building2, CalendarDays, Wallet, ShieldAlert, Shield, MessageSquare
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
const FixedAssets = lazy(() => import('./pages/FixedAssets'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Expenses = lazy(() => import('./pages/Expenses'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const SmsPortal = lazy(() => import('./pages/SmsPortal'));

import { AuthProvider, useAuth } from './context/AuthContext';
const Login = lazy(() => import('./pages/Login'));

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    height: '100vh', width: '100%', background: 'var(--bg-primary)',
    position: 'fixed', top: 0, left: 0, zIndex: 9999
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' }}>
      <div className="brand-loader-logo">
        S
      </div>

      <div className="spinner-outer">
        <div className="spinner-inner"></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', 
          letterSpacing: '0.15em', textTransform: 'uppercase' 
        }}>
          GymSales Pro Enterprise
        </div>
        <div className="loader-track">
          <div className="loader-bar"></div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Initializing SLFRS Financial Workspace...
        </div>
      </div>
    </div>
  </div>
);

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#090d16', color: '#f8fafc', padding: '24px', textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px', width: '100%', padding: '36px 28px', background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <span style={{ fontSize: '32px' }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Application Error</h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '24px', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Reload Page
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }} 
                style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#f8fafc', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
              >
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <StoreContextProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </StoreContextProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
};

const hasPermission = (userPermissions = [], required) => {
  if (!required) return true;
  if (!userPermissions || userPermissions.length === 0) return true;
  if (userPermissions.includes('all')) return true;

  if (Array.isArray(required)) {
    return required.some(p => userPermissions.includes(p));
  }
  return userPermissions.includes(required);
};

const ProtectedRoute = ({ children, requiredPermission, userPermissions }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(userPermissions, requiredPermission)) {
    return (
      <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', margin: '40px auto', maxWidth: '520px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          color: 'var(--danger)'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Access Restricted</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          Your assigned user role does not have permission to view or manage this section.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return children;
};

const AppContent = () => {
  const { notification, theme, toggleTheme, smsConfig = {}, showNotification, isStoreLoading, systemNotifications = [], markNotificationsRead, customers = [], invoices = [], leads = [], teamMembers = [], customRoles = [] } = useContext(StoreContext) || {};
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Determine user role & permission set
  const currentMember = teamMembers.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
  const userRoleTitle = currentMember?.role || user?.user_metadata?.role || 'Admin';
  
  const roleObj = customRoles.find(r => r.title?.toLowerCase() === userRoleTitle?.toLowerCase());
  
  let userPermissions = roleObj?.permissions;
  if (!userPermissions) {
    if (userRoleTitle === 'Admin') {
      userPermissions = ['all'];
    } else if (userRoleTitle === 'Sales Representative') {
      userPermissions = ['manage_clients', 'manage_quotes', 'manage_invoices', 'manage_inventory'];
    } else if (userRoleTitle === 'Accountant') {
      userPermissions = ['view_financials', 'manage_invoices', 'view_debtors', 'view_reports'];
    } else if (userRoleTitle === 'Inventory Manager') {
      userPermissions = ['manage_inventory', 'view_reports'];
    } else {
      userPermissions = ['all'];
    }
  }

  const checkPerm = (req) => hasPermission(userPermissions, req);

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
  const isCustomerPortal = location.pathname.startsWith('/portal') || location.pathname === '/pay' || location.pathname.startsWith('/pay/');
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

  // If on public customer portal, render without admin layout
  if (isCustomerPortal) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/pay" element={<CustomerPortal />} />
            <Route path="/pay/:phone" element={<CustomerPortal />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  // If on public share view, render without layout
  if (isPublicShareView) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
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
      {/* ===== GLOBAL TOAST NOTIFICATION ===== */}
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '14px 20px', borderRadius: 'var(--radius-md)', minWidth: '320px', maxWidth: '420px',
          background: notification.type === 'success' 
            ? 'linear-gradient(135deg, #059669, #10b981)' 
            : 'linear-gradient(135deg, #dc2626, #f43f5e)',
          color: 'white',
          boxShadow: notification.type === 'success' 
            ? '0 12px 40px rgba(16, 185, 129, 0.4)' 
            : '0 12px 40px rgba(244, 63, 94, 0.4)',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'slideInRight 0.35s ease-out',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)'
        }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ flex: 1, fontWeight: '600', fontSize: '0.88rem', lineHeight: 1.4 }}>{notification.message}</span>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="layout-header">
        <div className="flex items-center gap-4">
          {/* Mobile Toggle */}
          <button 
            className="hidden-desktop" 
            onClick={toggleSidebar}
            style={{ padding: '8px', border: '1px solid var(--panel-border)', background: 'var(--subtle-bg)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Desktop Collapse Toggle */}
          <button 
            className="hidden-mobile" 
            onClick={toggleSidebarCollapse}
            style={{ 
              padding: '8px', 
              border: '1px solid var(--panel-border)', 
              background: 'rgba(99, 102, 241, 0.06)', 
              borderRadius: '10px',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          
          <Link to="/" className="flex items-center gap-3" onClick={closeSidebar}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '11px', 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.25)'
            }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '18px', fontFamily: 'var(--font-display)' }}>
                {(smsConfig.dashboardName || 'GymSales').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden-mobile">
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {smsConfig.dashboardName || 'GymSales'}<span style={{ color: 'var(--accent-primary)' }}>.</span>
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Link to="/sms" className="btn btn-secondary hidden-mobile" style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <MessageSquare size={16} /> SMS Portal
          </Link>
          <Link to="/invoices" className="btn btn-secondary hidden-mobile" style={{ height: '38px', padding: '0 14px', fontSize: '0.82rem', color: 'var(--success)' }}>
            <CreditCard size={16} /> Invoice
          </Link>
          <Link to="/customers" className="btn btn-primary hidden-mobile" style={{ height: '38px', padding: '0 14px', fontSize: '0.82rem' }}>
            <PlusCircle size={16} /> New Client
          </Link>

          {/* Search */}
          <button 
            className="btn btn-secondary" 
            style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSearchOpen(true)}
            title="Search (Ctrl+K)"
          >
            <Search size={17} className="text-secondary" />
          </button>

          {/* Theme Toggle */}
          <button
            className="btn btn-secondary hidden-mobile"
            style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {theme === 'dark' ? <Sun size={17} className="text-secondary" /> : <Moon size={17} className="text-secondary" />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={17} className="text-secondary" />
              {systemNotifications?.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  background: 'var(--danger)', color: 'white', fontSize: '0.6rem',
                  fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)'
                }}>{systemNotifications.length}</span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="glass-panel" style={{
                position: 'absolute', top: '50px', right: '0', width: '340px', padding: '0',
                zIndex: 1000, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', border: '1px solid var(--panel-border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)' }}>
                   <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Notifications</span>
                   {systemNotifications?.length > 0 && (
                     <button onClick={markNotificationsRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
                   )}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {systemNotifications?.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>All caught up — no new alerts</div>
                  ) : (
                    systemNotifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{ display: 'flex', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--subtle-border)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0, background: n.type === 'success' ? 'var(--success)' : 'var(--danger)' }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.time).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <Link 
            to="/settings" 
            className="btn btn-secondary hidden-mobile" 
            style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={closeSidebar}
          >
            <SettingsIcon size={17} className="text-secondary" />
          </Link>

          {/* Logout */}
          {user && (
            <button 
              className="btn btn-secondary" 
              style={{ color: 'var(--danger)', height: '38px', padding: '0 12px', fontSize: '0.82rem' }}
              onClick={() => {
                signOut();
                closeSidebar();
              }}
            >
              <LogIn size={16} style={{ transform: 'rotate(180deg)' }} />
              <span className="hidden-mobile">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* ===== GLOBAL SEARCH MODAL ===== */}
      {searchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 20px'
        }} onClick={() => setSearchOpen(false)}>
           <div style={{ 
             width: '100%', maxWidth: '580px', background: 'var(--bg-secondary)',
             border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-lg)',
             boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflow: 'hidden',
             animation: 'fadeIn 0.2s ease-out'
           }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--subtle-border)', gap: '12px' }}>
                 <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                 <input 
                   autoFocus
                   type="text" 
                   placeholder="Search clients, leads, invoices..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.05rem', outline: 'none', fontFamily: 'var(--font-family)' }}
                 />
                 <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--subtle-bg)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid var(--panel-border)' }}>ESC</div>
              </div>
              <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
                 {searchQuery.length < 2 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Type to search across your data...</div>
                 ) : (
                   (() => {
                     const q = searchQuery.toLowerCase();
                     const foundCustomers = customers.filter(c => c.gymName?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)).slice(0, 3);
                     const foundLeads = leads.filter(l => l.gymName?.toLowerCase().includes(q)).slice(0, 3);
                     const foundInvoices = invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(q) || i.prospectName?.toLowerCase().includes(q)).slice(0, 3);
                     
                     const hasResults = foundCustomers.length > 0 || foundLeads.length > 0 || foundInvoices.length > 0;
                     
                     return !hasResults ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No results for "{searchQuery}"</div>
                     ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                           {foundCustomers.length > 0 && <div style={{ padding: '8px 12px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Clients</div>}
                           {foundCustomers.map(c => (
                             <Link key={c.id} to="/customers" onClick={() => setSearchOpen(false)} className="search-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 0.15s' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={15} style={{ color: 'var(--accent-primary)' }} /> <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.gymName}</span></div>
                               <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                             </Link>
                           ))}
                           {foundLeads.length > 0 && <div style={{ padding: '8px 12px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>Leads</div>}
                           {foundLeads.map(l => (
                             <Link key={l.id} to="/leads" onClick={() => setSearchOpen(false)} className="search-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 0.15s' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Target size={15} style={{ color: 'var(--warning)' }} /> <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{l.gymName}</span></div>
                               <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                             </Link>
                           ))}
                           {foundInvoices.length > 0 && <div style={{ padding: '8px 12px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>Invoices</div>}
                           {foundInvoices.map(i => (
                             <Link key={i.id} to="/invoices" onClick={() => setSearchOpen(false)} className="search-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 0.15s' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Receipt size={15} style={{ color: 'var(--success)' }} /> <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{i.invoiceNumber} — {i.prospectName}</span></div>
                               <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                             </Link>
                           ))}
                        </div>
                     )
                   })()
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ===== MAIN LAYOUT ===== */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar Overlay (Mobile) */}
        <div className="sidebar-overlay" onClick={closeSidebar}></div>

        {/* ===== SIDEBAR ===== */}
        <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ 
          display: 'flex',
          flexDirection: 'column',
          padding: isSidebarCollapsed ? '20px 8px' : '20px 0'
        }}>
          {/* User Profile Badge */}
          {user && (
            <div style={{
              margin: isSidebarCollapsed ? '0 0 16px 0' : '0 16px 16px 16px',
              padding: isSidebarCollapsed ? '8px 0' : '10px 12px',
              background: 'var(--subtle-bg)',
              borderRadius: '12px',
              border: '1px solid var(--subtle-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: '10px'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.82rem', flexShrink: 0
              }}>
                {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.user_metadata?.name || user?.email?.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {userRoleTitle}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: CORE */}
          <SidebarSection label="CORE" collapsed={isSidebarCollapsed} />
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', gap: '2px' }}>
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            {checkPerm(['manage_clients', 'manage_tasks']) && (
              <NavItem to="/tasks" icon={<CalendarDays size={18} />} label="Tasks & Calendar" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            )}
            {checkPerm(['manage_clients', 'manage_leads']) && (
              <NavItem to="/leads" icon={<Target size={18} />} label="Leads Pipeline" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            )}
            {checkPerm(['manage_clients']) && (
              <NavItem to="/customers" icon={<Users size={18} />} label="Active Gyms" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
            )}
          </nav>

          {/* Section: SALES */}
          {(checkPerm(['manage_quotes']) || checkPerm(['manage_invoices', 'view_invoices']) || checkPerm(['manage_inventory', 'view_inventory'])) && (
            <>
              <SidebarSection label="SALES" collapsed={isSidebarCollapsed} />
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', gap: '2px' }}>
                {checkPerm(['manage_quotes']) && (
                  <NavItem to="/quotations" icon={<FileText size={18} />} label="Quotations" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['manage_invoices', 'view_invoices']) && (
                  <NavItem to="/invoices" icon={<Receipt size={18} />} label="Invoices" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['manage_inventory', 'view_inventory']) && (
                  <NavItem to="/inventory" icon={<Package size={18} />} label="Inventory" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
              </nav>
            </>
          )}

          {/* Section: FINANCE */}
          {(checkPerm(['manage_invoices', 'view_invoices', 'view_financials']) || checkPerm(['view_financials', 'view_debtors']) || checkPerm(['view_financials', 'manage_expenses']) || checkPerm(['view_financials', 'manage_assets']) || checkPerm(['view_reports', 'view_financials'])) && (
            <>
              <SidebarSection label="FINANCE" collapsed={isSidebarCollapsed} />
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', gap: '2px' }}>
                {checkPerm(['manage_invoices', 'view_invoices', 'view_financials']) && (
                  <NavItem to="/payments" icon={<BadgeDollarSign size={18} />} label="Payments" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['view_financials', 'view_debtors']) && (
                  <NavItem to="/debtors" icon={<AlertCircle size={18} />} label="Debtors" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['view_financials', 'manage_expenses']) && (
                  <NavItem to="/expenses" icon={<Wallet size={18} />} label="Expenses" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['view_financials', 'manage_assets']) && (
                  <NavItem to="/assets" icon={<Building2 size={18} />} label="Fixed Assets" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['view_reports', 'view_financials']) && (
                  <NavItem to="/reports" icon={<BarChart3 size={18} />} label="Reports" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
              </nav>
            </>
          )}

          {/* Section: SYSTEM */}
          {(checkPerm(['manage_users']) || checkPerm(['view_logs', 'manage_users']) || checkPerm(['manage_users', 'manage_settings']) || checkPerm(['manage_invoices', 'manage_clients'])) && (
            <>
              <SidebarSection label="SYSTEM" collapsed={isSidebarCollapsed} />
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', gap: '2px' }}>
                <NavItem to="/sms" icon={<MessageSquare size={18} />} label="SMS Portal & Broadcast" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                {checkPerm(['manage_users']) && (
                  <NavItem to="/settings" icon={<Users size={18} />} label="User Management" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['view_logs', 'manage_users']) && (
                  <NavItem to="/logs" icon={<ClipboardList size={18} />} label="Activity Logs" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
                {checkPerm(['manage_users', 'manage_settings']) && (
                  <NavItem to="/settings" icon={<SettingsIcon size={18} />} label="Settings" onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                )}
              </nav>
            </>
          )}

          {/* Footer */}
          <div style={{ marginTop: 'auto', padding: '20px 24px', textAlign: 'center', borderTop: '1px solid var(--panel-border)' }}>
             {!isSidebarCollapsed && (
               <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
                 v3.2.0 Enterprise
               </div>
             )}
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className={`main-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<ProtectedRoute userPermissions={userPermissions}><Dashboard /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute requiredPermission={['manage_clients', 'manage_leads']} userPermissions={userPermissions}><Leads /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute requiredPermission={['manage_clients', 'manage_tasks']} userPermissions={userPermissions}><Tasks /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute requiredPermission={['manage_clients']} userPermissions={userPermissions}><Customers /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute requiredPermission={['manage_inventory', 'view_inventory']} userPermissions={userPermissions}><Inventory /></ProtectedRoute>} />
                <Route path="/quotations" element={<ProtectedRoute requiredPermission={['manage_quotes']} userPermissions={userPermissions}><Quotations /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute requiredPermission={['manage_invoices', 'view_invoices']} userPermissions={userPermissions}><Invoices /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute requiredPermission={['manage_invoices', 'view_invoices', 'view_financials']} userPermissions={userPermissions}><Payments /></ProtectedRoute>} />
                <Route path="/debtors" element={<ProtectedRoute requiredPermission={['view_financials', 'view_debtors']} userPermissions={userPermissions}><Debtors /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute requiredPermission={['view_financials', 'manage_expenses']} userPermissions={userPermissions}><Expenses /></ProtectedRoute>} />
                <Route path="/assets" element={<ProtectedRoute requiredPermission={['view_financials', 'manage_assets']} userPermissions={userPermissions}><FixedAssets /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredPermission={['view_reports', 'view_financials']} userPermissions={userPermissions}><Reports /></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute requiredPermission={['view_logs', 'manage_users']} userPermissions={userPermissions}><Logs /></ProtectedRoute>} />
                <Route path="/sms" element={<ProtectedRoute userPermissions={userPermissions}><SmsPortal /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredPermission={['manage_users', 'manage_settings']} userPermissions={userPermissions}><Settings /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

// Sidebar Section Header
const SidebarSection = ({ label, collapsed }) => (
  <div style={{ 
    padding: collapsed ? '16px 0 4px' : '16px 24px 4px', 
    textAlign: collapsed ? 'center' : 'left' 
  }}>
    <span style={{ 
      fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', 
      textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7
    }}>
      {collapsed ? '·' : label}
    </span>
  </div>
);

// NavItem Component
const NavItem = ({ to, icon, label, onClick, collapsed }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? '0' : '12px',
        padding: collapsed ? '12px 0' : '11px 16px',
        borderRadius: '12px',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.08) 100%)' : 'transparent',
        fontWeight: isActive ? '700' : '500',
        transition: 'all 0.22s ease',
        fontSize: '0.86rem',
        borderLeft: (isActive && !collapsed) ? '3px solid var(--accent-primary)' : '3px solid transparent',
        boxShadow: isActive ? 'inset 0 0 15px rgba(99, 102, 241, 0.08)' : 'none',
        position: 'relative',
        textDecoration: 'none'
      })}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
      title={collapsed ? label : ""}
    >
      {({ isActive }) => (
        <>
          <span style={{ 
            color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', 
            display: 'flex', 
            flexShrink: 0,
            transition: 'color 0.2s ease, transform 0.2s ease',
            transform: isActive ? 'scale(1.08)' : 'scale(1)'
          }}>
            {icon}
          </span>
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
};

export default App;
