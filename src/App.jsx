import React, { useContext, useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Receipt, BarChart3, 
  Settings as SettingsIcon, Package, CheckCircle, AlertCircle, 
  X, Target, ClipboardList, Menu, Sun, Moon, BadgeDollarSign, LogIn
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

import { AuthProvider, useAuth } from './context/AuthContext';
const Login = lazy(() => import('./pages/Login'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
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
  const { notification, theme, toggleTheme, smsConfig = {} } = useContext(StoreContext);
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const isPublicShareView = location.pathname.startsWith('/share');
  const isLoginPage = location.pathname === '/login';

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

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

  return (
    <div className={sidebarOpen ? "sidebar-open" : ""} style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh', 
      position: 'relative' 
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
          <button 
            className="btn btn-secondary md-hidden" 
            onClick={toggleSidebar}
            style={{ padding: '8px', border: 'none', background: 'rgba(255,255,255,0.05)' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
            <div className="sm-hidden">
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                {smsConfig.dashboardName || 'GymSales'}<span style={{ color: 'var(--accent-primary)' }}>.</span>
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="btn btn-secondary" 
            style={{ width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-accent-primary" />}
          </button>

          <Link 
            to="/settings" 
            className="btn btn-secondary" 
            style={{ height: '42px' }}
            onClick={closeSidebar}
          >
            <SettingsIcon size={18} className="text-secondary" />
            <span className="sm-hidden" style={{ fontWeight: '600' }}>Settings</span>
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
              <span className="sm-hidden">Logout</span>
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar Overlay (Mobile) */}
        <div className="sidebar-overlay" onClick={closeSidebar}></div>

        {/* Sidebar */}
        <aside className="app-sidebar" style={{ 
          width: '280px', 
          background: 'var(--bg-secondary)',
          opacity: 0.98,
          borderRight: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 0',
          height: 'calc(100vh - 72px)',
          position: 'sticky',
          top: '72px'
        }}>
          <div style={{ padding: '0 24px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Navigation</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 16px', flex: 1, gap: '4px' }}>
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={closeSidebar} />
            <NavItem to="/leads" icon={<Target size={18} />} label="Leads Pipeline" onClick={closeSidebar} />
            <NavItem to="/customers" icon={<Users size={18} />} label="Active Gyms" onClick={closeSidebar} />
            <NavItem to="/inventory" icon={<Package size={18} />} label="Inventory" onClick={closeSidebar} />
            <NavItem to="/quotations" icon={<FileText size={18} />} label="Quotations" onClick={closeSidebar} />
            <NavItem to="/invoices" icon={<Receipt size={18} />} label="Invoices" onClick={closeSidebar} />
            <NavItem to="/payments" icon={<BadgeDollarSign size={18} />} label="Payment Portal" onClick={closeSidebar} />
            <NavItem to="/reports" icon={<BarChart3 size={18} />} label="Insights" onClick={closeSidebar} />
            <NavItem to="/logs" icon={<ClipboardList size={18} />} label="Activity Logs" onClick={closeSidebar} />
          </nav>
          
          <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
              v3.2.0 Enterprise
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content" style={{ flex: 1 }}>
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
const NavItem = ({ to, icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--bg-primary)' : 'transparent',
        fontWeight: isActive ? '700' : '500',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '0.9rem',
        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        paddingLeft: isActive ? '13px' : '16px'
      })}
      className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex' }}>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
};

export default App;


