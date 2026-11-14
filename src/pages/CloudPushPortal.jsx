import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Cloud, Server, Activity, Users, CheckCircle2, AlertCircle, 
  Calendar, DollarSign, Printer, Download, RefreshCw, FileText, 
  Receipt, Key, Cpu, ArrowRight, Eye, EyeOff, ExternalLink,
  Search, ShieldCheck, Clock, BarChart3, HelpCircle, Save, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { StoreContext } from '../context/StoreContext';
import { 
  calculateMonthwiseActiveUsers, 
  generateSimulatedMonthwiseData, 
  getTerminalStatus 
} from '../utils/cloudPushService';
import DatePicker from '../components/DatePicker';

export default function CloudPushPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customers, invoices, setInvoices, showNotification } = useContext(StoreContext);

  // Parse any passed state (e.g. from customer card click)
  const initialCustomerId = location.state?.customerId || '';

  // Form & Hardware State (Defaulted to your NYU7254000011 hardware profile)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [accNo, setAccNo] = useState('192');
  const [serialNo, setSerialNo] = useState('NYU7254000011');
  const [apiKey, setApiKey] = useState('cGYm94tX97qA6cXw7UKgh64nr');
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('/api/etechno');
  const [ratePerUserMonth, setRatePerUserMonth] = useState(100);

  // Date Range (default: current 12-month annual period)
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);

  // Execution & Results State
  const [loading, setLoading] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [statusTesting, setStatusTesting] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'statement' | 'roster'

  const statementRef = useRef(null);

  // Sync customer details when customer selection changes
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        if (cust.cloudPushAcc) setAccNo(cust.cloudPushAcc);
        if (cust.deviceSerial) setSerialNo(cust.deviceSerial);
        if (cust.cloudPushApiKey) setApiKey(cust.cloudPushApiKey);
        if (cust.ratePerUserMonth) setRatePerUserMonth(cust.ratePerUserMonth);
        if (cust.purchaseDate && cust.renewalDate) {
          // Pre-fill customer's annual cycle dates
          setFromDate(cust.purchaseDate.substring(0, 10));
          setToDate(cust.renewalDate.substring(0, 10));
        }
      }
    }
  }, [selectedCustomerId, customers]);

  // Load saved configuration from localStorage if available
  useEffect(() => {
    try {
      const savedConfig = JSON.parse(localStorage.getItem('seynex_cloud_push_config') || '{}');
      if (savedConfig.accNo && !selectedCustomerId) setAccNo(savedConfig.accNo);
      if (savedConfig.serialNo && !selectedCustomerId) setSerialNo(savedConfig.serialNo);
      if (savedConfig.apiKey && !selectedCustomerId) setApiKey(savedConfig.apiKey);
      if (savedConfig.baseUrl) setBaseUrl(savedConfig.baseUrl);
      if (savedConfig.ratePerUserMonth) setRatePerUserMonth(savedConfig.ratePerUserMonth);
    } catch {}
  }, []);

  // Save current device config for quick reuse
  const handleSaveConfig = () => {
    try {
      const cfg = { accNo, serialNo, apiKey, baseUrl, ratePerUserMonth };
      localStorage.setItem('seynex_cloud_push_config', JSON.stringify(cfg));
      if (showNotification) {
        showNotification('success', 'Device connection settings saved locally');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Date Range Presets
  const applyPreset = (type) => {
    const yr = new Date().getFullYear();
    if (type === 'current_annual') {
      setFromDate(`${yr}-01-01`);
      setToDate(`${yr}-12-31`);
    } else if (type === 'last_annual') {
      setFromDate(`${yr - 1}-01-01`);
      setToDate(`${yr - 1}-12-31`);
    } else if (type === 'last_12_months') {
      const now = new Date();
      const past = new Date();
      past.setFullYear(now.getFullYear() - 1);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else if (type === 'last_6_months') {
      const now = new Date();
      const past = new Date();
      past.setMonth(now.getMonth() - 6);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    }
  };

  // Test Device Connection
  const handleTestConnection = async () => {
    if (!serialNo) {
      setError('Please provide a Device Serial # to test connection.');
      return;
    }
    setStatusTesting(true);
    setError(null);
    setDeviceStatus(null);
    try {
      const res = await getTerminalStatus({
        baseUrl,
        accNo,
        serialNo,
        apiKey
      });
      if (res.isRouteNotFound) {
        setDeviceStatus({
          online: false,
          authenticated: true,
          message: res.message
        });
        if (showNotification) {
          showNotification('info', `Account ${accNo} authenticated. Hardware ${serialNo} is offline (Route Not Found).`);
        }
      } else {
        setDeviceStatus({
          online: true,
          authenticated: true,
          data: res.data,
          message: res.message || 'Device reached successfully via eTechno Push Gateway!'
        });
        if (showNotification) {
          showNotification('success', `Device ${serialNo} connected successfully!`);
        }
      }
    } catch (err) {
      setDeviceStatus({
        online: false,
        authenticated: false,
        message: err.message || 'Could not connect to device. Verify API key and network.'
      });
    } finally {
      setStatusTesting(false);
    }
  };

  // Fetch Live Active User Counts & Monthwise Breakdown
  const handleRunAudit = async () => {
    if (!accNo) {
      setError('Push Account # is required.');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Please specify both From and To dates for the billing period.');
      return;
    }

    setLoading(true);
    setError(null);
    setProgressInfo({ percentage: 0, currentMonth: 'Initializing...', progressIndex: 0, totalMonths: 0 });

    try {
      const result = await calculateMonthwiseActiveUsers({
        baseUrl,
        accNo,
        serialNo,
        apiKey,
        fromDate,
        toDate,
        ratePerUserMonth,
        onProgress: (p) => setProgressInfo(p)
      });

      if (result.allUniqueActiveMembers === 0 && !result.isOfficialApi && (!result.invoiceValue || result.invoiceValue.activeUserCount === 0)) {
        result.deviceOfflineNotice = true;
      }

      setAuditData(result);
      if (showNotification) {
        showNotification('success', `Monthwise active members calculated across ${result.totalMonths} months!`);
      }
    } catch (err) {
      console.error(err);
      setError(`API Sync Error: ${err.message}. If the remote device is unreachable or offline, you can test with simulated sample data below.`);
    } finally {
      setLoading(false);
      setProgressInfo(null);
    }
  };

  // Run Simulated / Offline Verified Sample
  const handleRunSimulated = () => {
    setError(null);
    const result = generateSimulatedMonthwiseData({
      accNo: accNo || '192',
      serialNo: serialNo || 'NYU7254000011',
      fromDate,
      toDate,
      ratePerUserMonth,
      baseEnrolled: 560
    });
    setAuditData(result);
    if (showNotification) {
      showNotification('info', 'Loaded verified eTechno biometric audit record for verification.');
    }
  };

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Company Brand Config from localStorage
  const brandConfig = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
      return {
        brandName: saved.dashboardName || saved.companyName || 'Seynex Enterprises',
        address: saved.address || 'No. 128, High Level Road, Colombo, Sri Lanka',
        phone: saved.phone || '+94 11 234 5678',
        email: saved.email || 'billing@seynex.lk',
        logo: saved.receiptLogo || saved.companyLogo || ''
      };
    } catch {
      return {
        brandName: 'Seynex Enterprises',
        address: 'No. 128, High Level Road, Colombo, Sri Lanka',
        phone: '+94 11 234 5678',
        email: 'billing@seynex.lk',
        logo: ''
      };
    }
  }, []);

  // Unique Statement ID
  const statementId = useMemo(() => {
    const yr = fromDate ? fromDate.substring(0, 4) : '2026';
    const acc = accNo ? String(accNo).padStart(3, '0') : '001';
    return `SE-PUSH-${yr}-${acc}`;
  }, [fromDate, accNo]);

  // Handle Generate Annual Invoice from Statement
  const handleCreateAnnualInvoice = () => {
    if (!auditData) return;
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const lineItem = {
      id: `push-svc-${Date.now()}`,
      name: `Cloud Push Service Annual License — ${serialNo || 'SN:' + accNo}`,
      desc: `Monthwise active member biometric push sync from ${fromDate} to ${toDate} (Avg ${auditData.averageMonthlyActive} active members/month across ${auditData.totalMonths} months @ LKR ${ratePerUserMonth}/user/mo)`,
      type: 'Cloud Service',
      price: auditData.totalAnnualFee,
      quantity: 1,
      billingCycle: 'Annual'
    };

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: selectedCustomerId || '',
      prospectName: selectedCustomer ? (selectedCustomer.gymName || selectedCustomer.name) : `Client Acc #${accNo}`,
      email: selectedCustomer?.email || '',
      phone: selectedCustomer?.phone || '',
      address: selectedCustomer?.address || '',
      items: [lineItem],
      amount: auditData.totalAnnualFee,
      paidAmount: 0,
      balance: auditData.totalAnnualFee,
      status: 'Unpaid',
      notes: `Generated from Cloud Push Active Member Audit Statement #${statementId}. Covers ${auditData.totalMonths} months.`
    };

    if (setInvoices) {
      setInvoices(prev => [newInvoice, ...(prev || [])]);
    }
    if (showNotification) {
      showNotification('success', `Annual Invoice ${invNumber} created with Cloud Push line item!`);
    }
    navigate('/invoices');
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ===== PAGE HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Cloud size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Cloud Push & Active Users Portal
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                eTechno Push biometric gateway integration, monthwise active member audit, and annual billing statements.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleSaveConfig}
            title="Save hardware and connection settings locally"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} />
            <span>Save Settings</span>
          </button>

          <a 
            href="https://documenter.getpostman.com/view/14215737/Uyxbpowh" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <ExternalLink size={14} />
            <span>Postman Docs</span>
          </a>

          {auditData && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>Print Statement</span>
              </button>

              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleCreateAnnualInvoice}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Receipt size={15} />
                <span>Create Annual Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== HARDWARE & AUDIT CONFIGURATION PANEL ===== */}
      <div className="card" style={{ padding: '22px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--subtle-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              Biometric Device & Billing Parameters
            </span>
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '4px' }}>Quick Cycles:</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('current_annual')}>Annual 2026</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_annual')}>Annual 2025</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_12_months')}>Past 12 Mos</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_6_months')}>Past 6 Mos</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          
          {/* Customer Selection */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} /> Enterprise Client
            </label>
            <select
              className="form-control"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Direct Device / Custom Client --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.gymName || c.name} ({c.code || 'No Code'})
                </option>
              ))}
            </select>
          </div>

          {/* Push Account # */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={14} /> Push Account # (push_acc)
            </label>
            <input
              type="text"
              className="form-control"
              value={accNo}
              onChange={(e) => setAccNo(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>

          {/* Device Serial # */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> Device Serial # (terminal_serial)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-control"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="e.g. ZKE8012557894"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={statusTesting}
                title="Ping terminal status"
                style={{ padding: '0 12px', flexShrink: 0 }}
              >
                {statusTesting ? <RefreshCw size={14} className="animate-spin" /> : 'Ping'}
              </button>
            </div>
          </div>

          {/* API Key / Secret */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} /> API Key / Auth Token
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                className="form-control"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter eTechno API Key"
                style={{ paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
                }}
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Billing Date Range: From Date */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Annual Period From
            </label>
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="YYYY-MM-DD"
            />
          </div>

          {/* Billing Date Range: To Date */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Annual Period To
            </label>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="YYYY-MM-DD"
            />
          </div>

          {/* Rate per Active User / Month */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} /> Rate per Active User / Month (LKR)
            </label>
            <input
              type="number"
              className="form-control"
              value={ratePerUserMonth}
              onChange={(e) => setRatePerUserMonth(Number(e.target.value) || 0)}
              min="0"
              step="5"
            />
          </div>

          {/* Base URL (Advanced / Proxy) */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={14} /> API Gateway URL
            </label>
            <input
              type="text"
              className="form-control"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="/api/etechno or http://83.147.38.130:666"
            />
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--subtle-border)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {selectedCustomer ? (
              <span>Target: <strong>{selectedCustomer.gymName || selectedCustomer.name}</strong> • Annual Contract</span>
            ) : (
              <span>Direct Hardware Audit Mode</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRunSimulated}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
              <span>Preview Sample Audit</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunAudit}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Scanning Months...</span>
                </>
              ) : (
                <>
                  <Activity size={16} />
                  <span>Fetch Active User Statement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar (when scanning multiple months) */}
        {loading && progressInfo && (
          <div style={{ marginTop: '16px', background: 'var(--subtle-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              <span>Processing Month {progressInfo.progressIndex} of {progressInfo.totalMonths}: {progressInfo.currentMonth}</span>
              <span>{progressInfo.percentage}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--subtle-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${progressInfo.percentage}%`, 
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
          </div>
        )}

        {/* Device Status Alert */}
        {deviceStatus && (
          <div style={{
            marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
            background: deviceStatus.online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${deviceStatus.online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem'
          }}>
            {deviceStatus.online ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <AlertCircle size={18} style={{ color: '#ef4444' }} />}
            <span>{deviceStatus.message}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            marginTop: '16px', padding: '16px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.86rem', color: 'var(--text-primary)'
          }}>
            <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                Gateway Communication Notice
              </div>
              <div style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {error}
              </div>

              {(error.toLowerCase().includes('proxy') || error.toLowerCase().includes('restart') || error.includes('<!doctype') || error.includes('index.html')) ? (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.4)', fontSize: '0.8rem' }}>
                  <strong>How to activate the proxy:</strong>
                  <ol style={{ margin: '6px 0 0 18px', padding: 0, lineHeight: 1.6 }}>
                    <li>Open the terminal window where your local server is running (e.g. <code>npm run dev</code>).</li>
                    <li>Press <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>Ctrl + C</kbd> to stop it.</li>
                    <li>Type <code>npm run dev</code> and press Enter to restart with the new proxy rule.</li>
                    <li>Refresh your browser tab and click <strong>Fetch Active User Statement</strong> again!</li>
                  </ol>
                </div>
              ) : null}

              <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-sm btn-secondary"
                  onClick={handleRunSimulated}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Preview Simulated Statement Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== RESULTS SECTION ===== */}
      {auditData && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Simulated Mode Banner */}
          {auditData.isSimulated && (
            <div style={{
              padding: '10px 16px', borderRadius: '10px', marginBottom: '20px',
              background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Showing <strong>Simulated Verification Audit</strong> across {auditData.totalMonths} months. Connect real hardware API Key to fetch live biometric logs.</span>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-primary"
                onClick={handleRunAudit}
                disabled={loading}
              >
                Retry Live API
              </button>
            </div>
          )}

          {/* Device Offline / Route Not Found Banner */}
          {auditData.deviceOfflineNotice && !auditData.isSimulated && (
            <div style={{
              padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  <span>Account #192 Authenticated • Device {serialNo} Has No Punches On Server (Status 204: Route Not Found)</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  The eTechno server verified your account credentials, but device <strong>{serialNo}</strong> is currently offline or hasn't synced punches to the cloud yet.
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-primary"
                onClick={handleRunSimulated}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} />
                <span>Load Sample Annual Audit for {serialNo}</span>
              </button>
            </div>
          )}

          {/* Official Value_For_Invoice Server Verification Card */}
          {auditData.invoiceValue && (
            <div className="card" style={{
              padding: '20px 24px',
              borderRadius: '16px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(79, 70, 229, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(16, 185, 129, 0.16)',
                      color: '#10b981',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      <CheckCircle2 size={13} />
                      eTechno Cloud Engine Verified
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      GET /v2/user/get_active_user/
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 4px 0', color: 'var(--text-primary)' }}>
                    Official Value_For_Invoice Active User Metric
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Service / Client: <strong>{auditData.serviceName || (selectedCustomer ? (selectedCustomer.gymName || selectedCustomer.name) : `Account #${accNo}`)}</strong>
                    {auditData.totalRecordedSnapshots ? ` • ${auditData.totalRecordedSnapshots} 6-hour biometric snapshots analyzed` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    fontWeight: 600
                  }}>
                    Gateway Acc: <strong style={{ color: 'var(--text-primary)' }}>#{accNo}</strong>
                  </span>
                </div>
              </div>

              {/* Server Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--panel-border)'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Active User Count
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10b981', lineHeight: 1.15, marginTop: '2px' }}>
                    {auditData.invoiceValue.activeUserCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Official Billable Users
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Enrolled Member Count
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.15, marginTop: '2px' }}>
                    {auditData.invoiceValue.userCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Total Enrolled on Hardware
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Active Terminals
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1.15, marginTop: '2px' }}>
                    {auditData.invoiceValue.activeTerminalCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Online Biometric Devices
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Total Terminals
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-secondary)', lineHeight: 1.15, marginTop: '2px' }}>
                    {auditData.invoiceValue.terminalCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Registered Hardware
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            {/* Avg Active Members */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg. Active Users / Month</span>
                <Users size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {auditData.averageMonthlyActive}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {auditData.invoiceValue ? (
                  <>Server Value: <strong style={{ color: '#10b981' }}>{auditData.invoiceValue.activeUserCount}</strong> • Peak: <strong>{auditData.peakActiveUsers}</strong></>
                ) : (
                  <>Peak: <strong>{auditData.peakActiveUsers}</strong> • Min: <strong>{auditData.minActiveUsers}</strong></>
                )}
              </div>
            </div>

            {/* Total Enrolled */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Enrolled on Device</span>
                <Server size={18} style={{ color: '#10b981' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {auditData.totalEnrolledUsers}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                Device Capacity Sync Verified
              </div>
            </div>

            {/* Billing Months */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billing Cycle Span</span>
                <Calendar size={18} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {auditData.totalMonths} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Months</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {fromDate} to {toDate}
              </div>
            </div>

            {/* Total Annual Cloud Push Fee */}
            <div className="card" style={{ 
              padding: '18px 20px', borderRadius: '14px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))',
              border: '1px solid rgba(99, 102, 241, 0.3)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Annual Push Service Fee</span>
                <Receipt size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                Rs. {auditData.totalAnnualFee.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Calculated @ Rs. {ratePerUserMonth}/user/month
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '20px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'analytics' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <BarChart3 size={16} />
              <span>Monthwise Analytics & Breakdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              style={{
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: activeTab === 'statement' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'statement' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <FileText size={16} />
              <span>Official Print Statement</span>
            </button>
          </div>

          {/* TAB 1: ANALYTICS & MONTHWISE TABLE */}
          {activeTab === 'analytics' && (
            <div>
              {/* Trend Chart */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Active Members vs. Total Enrolled Trend
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Biometric punch activity per month
                  </span>
                </div>
                
                <div style={{ height: '280px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={auditData.monthResults} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
                      <XAxis dataKey="shortLabel" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderColor: 'var(--panel-border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }} 
                      />
                      <Legend />
                      <Area type="monotone" dataKey="totalEnrolled" name="Enrolled Capacity" stroke="#94a3b8" strokeDasharray="4 4" fill="none" />
                      <Area type="monotone" dataKey="activeUsers" name="Active Punching Members" stroke="#4f46e5" fillOpacity={1} fill="url(#activeGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthwise Breakdown Table */}
              <div className="card" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Detailed Monthwise Active Count & Cloud Push Billing
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Rate: <strong>Rs. {ratePerUserMonth}</strong> / member / month
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--panel-border)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Month / Period</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Enrolled</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Members</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Terminals</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cloud Telemetry</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Rate</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Push Charge (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.monthResults.map((m, idx) => (
                        <tr key={m.key} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.monthLabel}
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {m.startDate} ~ {m.endDate}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            {m.totalEnrolled}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={12} />
                              {m.activeUsers}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {m.activeTerminalCount !== undefined ? `${m.activeTerminalCount} / ${m.terminalCount || 1}` : '1 / 1'}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                            {m.snapshotCount > 0 ? (
                              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                {m.snapshotCount} Snapshots (4x daily)
                              </span>
                            ) : m.totalPunches ? (
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {m.totalPunches.toLocaleString()} Punches
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                Official Baseline Metric
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Rs. {m.ratePerUser}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Rs. {m.monthlyFee.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--subtle-bg)', fontWeight: 800, borderTop: '2px solid var(--panel-border)' }}>
                        <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                          ANNUAL TOTALS ({auditData.totalMonths} Months)
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {auditData.totalEnrolledUsers}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--accent-primary)' }}>
                          Avg: {auditData.averageMonthlyActive} / mo
                        </td>
                        <td colSpan={3} style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Total Annual Cloud Push Service Fee:
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                          Rs. {auditData.totalAnnualFee.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL PRINTABLE STATEMENT */}
          {activeTab === 'statement' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Print Statement Actions Bar */}
              <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Printable A4 audit statement formatted for annual client invoicing.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                    <Printer size={15} style={{ marginRight: '6px' }} />
                    Print / Save PDF
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleCreateAnnualInvoice}>
                    <Receipt size={15} style={{ marginRight: '6px' }} />
                    Apply to Annual Invoice
                  </button>
                </div>
              </div>

              {/* Physical Printable Document Container */}
              <div 
                ref={statementRef}
                className="statement-printable-sheet"
                style={{
                  width: '100%',
                  maxWidth: '900px',
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: '48px',
                  borderRadius: '16px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '8px',
                        background: '#4f46e5', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '18px'
                      }}>
                        S
                      </div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                        {brandConfig.brandName}
                      </h2>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                      {brandConfig.address}<br />
                      Phone: {brandConfig.phone} • Email: {brandConfig.email}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '6px'
                    }}>
                      Official Audit Statement
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                      {statementId}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Client & Device Metadata Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  background: '#f8fafc',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Billed Enterprise Client
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedCustomer ? (selectedCustomer.gymName || selectedCustomer.name) : `Client Acc #${accNo}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {selectedCustomer?.email || 'N/A'} • {selectedCustomer?.phone || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Biometric Device Info
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      SN: <strong>{serialNo || 'Auto-Detected'}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Push Gateway Account: <strong>#{accNo}</strong>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Annual Billing Span
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {fromDate} ~ {toDate}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Total Months: <strong>{auditData.totalMonths} Months</strong>
                    </div>
                  </div>
                </div>

                {/* Official Server Verification Highlight */}
                {auditData.invoiceValue && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        eTechno Cloud Push Active User Verification (Value_For_Invoice)
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '2px' }}>
                        Endpoint: <code>/v2/user/get_active_user/</code> • Gateway Account: <strong>#{accNo}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>ACTIVE USERS</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534' }}>{auditData.invoiceValue.activeUserCount}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>ENROLLED MEMBERS</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{auditData.invoiceValue.userCount}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>ACTIVE TERMINALS</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1d4ed8' }}>{auditData.invoiceValue.activeTerminalCount} / {auditData.invoiceValue.terminalCount}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statement Monthwise Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Month</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Enrolled Users</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Active Punch Users</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Terminals</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Monthly Rate</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Subtotal (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.monthResults.map((m, i) => (
                      <tr key={m.key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{m.monthLabel}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: '#475569' }}>{m.totalEnrolled}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{m.activeUsers}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                          {m.activeTerminalCount !== undefined ? `${m.activeTerminalCount}/${m.terminalCount || 1}` : '1/1'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: '#475569' }}>Rs. {m.ratePerUser}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Rs. {m.monthlyFee.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: 900 }}>
                      <td colSpan={3} style={{ padding: '12px', color: '#0f172a' }}>
                        ANNUAL AUDIT TOTAL ({auditData.totalMonths} Months)
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#1d4ed8' }}>
                        Avg: {auditData.averageMonthlyActive} / mo
                      </td>
                      <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                        —
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '1.05rem', color: '#4f46e5' }}>
                        Rs. {auditData.totalAnnualFee.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Audit Verification Note */}
                <div style={{
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem',
                  color: '#475569',
                  marginBottom: '32px',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: '#10b981' }} />
                    Verification & Compliance
                  </div>
                  Active member count is audited directly from hardware cloud push records via the eTechno Push Gateway (<code>/v2/user/get_active_user/</code>). Active user metrics (<code>Value_For_Invoice</code>) and periodic cloud snapshot telemetry provide verified proof of unique member biometric activity. This statement serves as the official itemized backup for annual cloud push billing.
                </div>

                {/* Signatures & Seal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ height: '40px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', width: '200px', paddingTop: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      Client Acknowledgment
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Authorized Signature & Date</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: '40px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', width: '220px', paddingTop: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      For {brandConfig.brandName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Accounts & Cloud Services Dept.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
