import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Receipt, BarChart3, 
  Settings as SettingsIcon, Package, CheckCircle, AlertCircle, 
  X, Target, ClipboardList, Menu, Sun, Moon 
} from 'lucide-react';
import StoreContextProvider, { StoreContext } from './context/StoreContext';

import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import SharedDocument from './pages/SharedDocument';
import Leads from './pages/Leads';
import Logs from './pages/Logs';

const App = () => {
  return (
    <StoreContextProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </StoreContextProvider>
  );
};

const AppContent = () => {
  const { notification, theme, toggleTheme } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isPublicShareView = location.pathname.startsWith('/share');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`flex flex-col min-h-screen relative ${sidebarOpen ? "sidebar-open" : ""} ${isPublicShareView ? 'bg-[var(--bg-primary)]' : ''}`}>
      {/* Global Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-xl min-w-[300px] shadow-2xl backdrop-blur-md flex items-center gap-3 border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
        } text-white`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="flex-1 font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      {!isPublicShareView && (
        <header className="layout-header flex items-center justify-between sticky top-0 z-50 px-6 md:px-10 h-[72px] bg-[var(--bg-secondary)]/80 backdrop-blur-2xl border-b border-[var(--panel-border)] shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              className="btn btn-secondary md:hidden p-2 border-none bg-white/5" 
              onClick={toggleSidebar}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link to="/" className="flex items-center gap-4 group" onClick={closeSidebar}>
              <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20 transition-transform group-hover:scale-110">
                <span className="text-white font-black text-xl font-['Outfit']">G</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-extrabold text-[var(--text-primary)] font-['Outfit'] tracking-tight">
                  GymSales<span className="text-[var(--accent-primary)]">.</span>
                </h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="btn btn-secondary w-[42px] h-[42px] p-0 flex items-center justify-center hover:bg-white/10"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-[var(--accent-primary)]" />}
            </button>

            <Link 
              to="/settings" 
              className="btn btn-secondary h-[42px] px-4 flex items-center gap-2 hover:bg-white/10"
              onClick={closeSidebar}
            >
              <SettingsIcon size={18} className="text-[var(--text-secondary)]" />
              <span className="hidden sm:inline font-bold">Settings</span>
            </Link>
          </div>
        </header>
      )}

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay (Mobile) */}
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] transition-opacity duration-300 md:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeSidebar}></div>

        {/* Sidebar */}
        {!isPublicShareView && (
          <aside className={`fixed md:sticky top-0 md:top-[72px] left-0 w-[280px] h-screen md:h-[calc(100vh-72px)] bg-[var(--bg-secondary)]/98 border-r border-[var(--panel-border)] flex flex-col py-8 z-[1000] transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
            <div className="px-6 mb-6">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">Navigation</span>
            </div>
            <nav className="flex flex-col px-4 flex-1 gap-1">
              <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={closeSidebar} />
              <NavItem to="/leads" icon={<Target size={18} />} label="Leads Pipeline" onClick={closeSidebar} />
              <NavItem to="/customers" icon={<Users size={18} />} label="Active Gyms" onClick={closeSidebar} />
              <NavItem to="/inventory" icon={<Package size={18} />} label="Inventory" onClick={closeSidebar} />
              <NavItem to="/quotations" icon={<FileText size={18} />} label="Quotations" onClick={closeSidebar} />
              <NavItem to="/invoices" icon={<Receipt size={18} />} label="Invoices" onClick={closeSidebar} />
              <NavItem to="/reports" icon={<BarChart3 size={18} />} label="Insights" onClick={closeSidebar} />
              <NavItem to="/logs" icon={<ClipboardList size={18} />} label="Activity Logs" onClick={closeSidebar} />
            </nav>
            
            <div className="px-6 py-6 text-center border-t border-[var(--panel-border)]">
              <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest opacity-50">
                v3.2.0 Enterprise
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto ${isPublicShareView ? 'p-0' : 'p-6 md:p-8 lg:p-10'}`}>
          <div className={`max-auto w-full max-w-[1400px] ${isPublicShareView ? 'pt-12' : ''}`}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/share/:type/:id" element={<SharedDocument />} />
            </Routes>
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
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
        ${isActive 
          ? "bg-[var(--bg-primary)] text-[var(--text-primary)] font-bold border-l-[3px] border-[var(--accent-primary)] pl-[13px]" 
          : "text-[var(--text-secondary)] font-medium hover:bg-white/5 pl-4"}
      `}
    >
      {({ isActive }) => (
        <>
          <span className={`transition-colors duration-300 ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
            {icon}
          </span>
          <span className="text-[0.9rem]">{label}</span>
        </>
      )}
    </NavLink>
  );
};

export default App;


