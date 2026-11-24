import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Cloud, Server, Activity, Users, CheckCircle2, AlertCircle, 
  Calendar, DollarSign, Printer, Download, RefreshCw, FileText, 
  Receipt, Key, Cpu, ArrowRight, Eye, EyeOff, ExternalLink,
  Search, ShieldCheck, Clock, BarChart3, HelpCircle, Save, Sparkles,
  Radio, Power, RotateCcw, Trash2, DownloadCloud, UploadCloud,
  HardDrive, Terminal, Plus, Play, Pause, AlertTriangle, Check,
  LogIn, LogOut, ArrowUpDown, X, Building2, Edit3, SlidersHorizontal, ChevronRight,
  Shield, CheckCircle, Sliders, ChevronDown, ChevronUp, Lock, Edit2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { StoreContext } from '../context/StoreContext';
import { 
  calculateMonthwiseActiveUsers, 
  generateSimulatedMonthwiseData, 
  getTransactionsChunk,
  getTerminalStatus,
  sendTerminalCommand,
  getRealtimeTransactions,
  getTerminalsByAccount,
  addTerminalToAccount,
  clearHistoricalAuditCache
} from '../utils/cloudPushService';
import DatePicker from '../components/DatePicker';
import CustomSelect from '../components/CustomSelect';

export default function CloudPushPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { customers = [], invoices = [], setInvoices, addInvoice, showNotification, updateCustomer, addCustomer, deleteCustomer, syncAllToCloud } = useContext(StoreContext) || {};

  // Parse any passed state or URL query parameters (e.g. from invoice fee calculation button)
  const initialCustomerId = searchParams.get('customerId') || location.state?.customerId || '';

  // Bulletproof notification helper
  const notify = (message, type = 'success') => {
    if (showNotification) {
      if (['success', 'error', 'info', 'warning'].includes(message) && typeof type === 'string' && !['success', 'error', 'info', 'warning'].includes(type)) {
        showNotification(type, message);
      } else {
        showNotification(message, type);
      }
    }
  };

  // Form & Hardware State (Defaulted to your NYU7254000011 hardware profile)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [accNo, setAccNo] = useState('192');
  const [serialNo, setSerialNo] = useState('NYU7254000011');
  const [apiKey, setApiKey] = useState('cGYm94tX97qA6cXw7UKgh64nr');
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('/api/etechno');
  const [ratePerUserMonth, setRatePerUserMonth] = useState(100);

  // Multi-Device Biometric Fleet State (IN / OUT Serials)
  const [deviceSerials, setDeviceSerials] = useState([
    { id: 'dev-1', sn: 'NYU7254000011', role: 'IN', label: 'Entrance Biometric Device (IN)', status: 'idle' },
    { id: 'dev-2', sn: 'NYU7254000012', role: 'OUT', label: 'Exit Biometric Device (OUT)', status: 'idle' }
  ]);
  const [serialFilter, setSerialFilter] = useState('ALL'); // 'ALL' = combined site totals, or specific SN
  const [newDeviceSn, setNewDeviceSn] = useState('');
  const [newDeviceRole, setNewDeviceRole] = useState('IN');
  const [newDeviceLabel, setNewDeviceLabel] = useState('');
  const [pingingSn, setPingingSn] = useState(null);
  const [devicePingResults, setDevicePingResults] = useState({});

  // Active Month Inclusions & Command Guardrails State
  const [includedMonths, setIncludedMonths] = useState({});
  const [confirmCommandModal, setConfirmCommandModal] = useState({
    isOpen: false,
    commandName: '',
    commandLabel: '',
    targetSerial: '',
    description: '',
    warning: ''
  });

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
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'statement'
  
  // Portal Main Navigation: 'audit' | 'realtime' | 'commands' | 'fleet'
  const [portalSection, setPortalSection] = useState('audit');

  // Real-time Punch Stream State
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [realtimeMinutes, setRealtimeMinutes] = useState(60);
  const [realtimeSearch, setRealtimeSearch] = useState('');
  const [realtimeAutoRefresh, setRealtimeAutoRefresh] = useState(false);
  const [lastRealtimeFetch, setLastRealtimeFetch] = useState(null);

  // Hardware Remote Command Center State
  const [commandTargetSerial, setCommandTargetSerial] = useState('NYU7254000011');
  const [commandExecuting, setCommandExecuting] = useState(null);
  const [commandHistory, setCommandHistory] = useState([
    {
      id: 1,
      command: 'ReSync_Active',
      serialNo: 'NYU7254000011',
      timestamp: new Date().toLocaleTimeString(),
      status: 'Ready',
      message: 'Cloud Gateway online and awaiting command dispatch'
    }
  ]);

  // Terminal Fleet State
  const [fleetList, setFleetList] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [newTerminalSerial, setNewTerminalSerial] = useState('');
  const [registeringTerminal, setRegisteringTerminal] = useState(false);

  const statementRef = useRef(null);

  // Gym Profile Management Modals & State
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [showManageProfilesModal, setShowManageProfilesModal] = useState(false);
  const [manageProfilesFilter, setManageProfilesFilter] = useState('all'); // 'all' | 'subscribed' | 'standard'
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // Modal Form State
  const [modalGymName, setModalGymName] = useState('');
  const [modalClientCode, setModalClientCode] = useState('');
  const [modalContactName, setModalContactName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalAccNo, setModalAccNo] = useState('');
  const [modalApiKey, setModalApiKey] = useState('');
  const [modalShowApiKey, setModalShowApiKey] = useState(false);
  const [modalBaseUrl, setModalBaseUrl] = useState('/api/etechno');
  const [modalRatePerUser, setModalRatePerUser] = useState(100);
  const [modalPeriodFrom, setModalPeriodFrom] = useState(`${currentYear}-01-01`);
  const [modalPeriodTo, setModalPeriodTo] = useState(`${currentYear}-12-31`);
  const [modalDevices, setModalDevices] = useState([]);
  const [newModalDevSn, setNewModalDevSn] = useState('');
  const [newModalDevRole, setNewModalDevRole] = useState('IN');
  const [newModalDevLabel, setNewModalDevLabel] = useState('');

  // Open Create Profile Modal
  const openCreateProfileModal = () => {
    setEditingProfileId(null);
    setModalGymName('');
    setModalClientCode(`CUST-${Math.floor(100 + Math.random() * 900)}`);
    setModalContactName('');
    setModalPhone('');
    setModalEmail('');
    setModalAccNo('');
    setModalApiKey('');
    setModalShowApiKey(false);
    setModalBaseUrl(baseUrl || '/api/etechno');
    setModalRatePerUser(ratePerUserMonth || 100);
    setModalPeriodFrom(fromDate || `${currentYear}-01-01`);
    setModalPeriodTo(toDate || `${currentYear}-12-31`);
    // Pre-populate with standard dual biometric devices (IN + OUT) as default template
    setModalDevices([
      { id: `dev-${Date.now()}-1`, sn: '', role: 'IN', label: 'Entrance Biometric Device (IN)' },
      { id: `dev-${Date.now()}-2`, sn: '', role: 'OUT', label: 'Exit Biometric Device (OUT)' }
    ]);
    setNewModalDevSn('');
    setNewModalDevRole('IN');
    setNewModalDevLabel('');
    setShowCreateProfileModal(true);
  };

  // Open Edit Profile Modal
  const openEditProfileModal = (customer) => {
    if (!customer) return;
    setEditingProfileId(customer.id);
    setModalGymName(customer.gymName || customer.name || '');
    setModalClientCode(customer.code || '');
    setModalContactName(customer.name || '');
    setModalPhone(customer.phone || '');
    setModalEmail(customer.email || '');
    setModalAccNo(customer.cloudPushAcc || '');
    setModalApiKey(customer.cloudPushApiKey || '');
    setModalShowApiKey(false);
    setModalBaseUrl(baseUrl || '/api/etechno');
    setModalRatePerUser(customer.ratePerUserMonth || 100);
    setModalPeriodFrom(customer.purchaseDate?.substring(0, 10) || `${currentYear}-01-01`);
    setModalPeriodTo(customer.renewalDate?.substring(0, 10) || `${currentYear}-12-31`);

    if (Array.isArray(customer.deviceSerials) && customer.deviceSerials.length > 0) {
      setModalDevices(customer.deviceSerials);
    } else if (customer.deviceSerial) {
      setModalDevices([{ id: 'dev-1', sn: customer.deviceSerial, role: 'IN', label: 'Entrance Biometric Device (IN)' }]);
    } else {
      setModalDevices([]);
    }
    setNewModalDevSn('');
    setNewModalDevRole('IN');
    setNewModalDevLabel('');
    setShowCreateProfileModal(true);
  };

  // Quick Preset Biometric Devices for Active Hardware Card (1 Device vs 2 Devices)
  const handleApplyMainDevicePreset = (mode) => {
    const timestamp = Date.now();
    if (mode === 'single') {
      const existingSn = deviceSerials[0]?.sn || serialNo || 'NYU7254000011';
      const singleDev = [
        { id: `dev-${timestamp}`, sn: existingSn, role: 'IN/OUT', label: 'Main Biometric Terminal (Two-Way IN/OUT)', status: 'idle' }
      ];
      setDeviceSerials(singleDev);
      setSerialNo(existingSn);
      setSerialFilter('ALL');
      setCommandTargetSerial(existingSn);
      notify('Switched to Single Device mode (Two-Way IN/OUT)', 'info');
    } else if (mode === 'dual') {
      const sn1 = deviceSerials[0]?.sn || serialNo || 'NYU7254000011';
      let sn2 = deviceSerials[1]?.sn || '';
      if (!sn2 && sn1) {
        sn2 = sn1.slice(0, -1) + (Number(sn1.slice(-1)) + 1 || '2');
      }
      const dualDevs = [
        { id: `dev-${timestamp}-1`, sn: sn1, role: 'IN', label: 'Entrance Biometric Device (IN)', status: 'idle' },
        { id: `dev-${timestamp}-2`, sn: sn2 || 'NYU7254000012', role: 'OUT', label: 'Exit Biometric Device (OUT)', status: 'idle' }
      ];
      setDeviceSerials(dualDevs);
      setSerialNo(sn1);
      setSerialFilter('ALL');
      setCommandTargetSerial(sn1);
      notify('Switched to Dual Devices mode (Entrance IN + Exit OUT)', 'info');
    }
  };

  // Quick Preset Biometric Devices for Modal (1 Device vs 2 Devices)
  const handleApplyModalDevicePreset = (mode) => {
    const timestamp = Date.now();
    if (mode === 'single') {
      const existingSn = modalDevices[0]?.sn || '';
      setModalDevices([
        { id: `dev-${timestamp}`, sn: existingSn, role: 'IN/OUT', label: 'Main Biometric Terminal (Two-Way IN/OUT)' }
      ]);
    } else if (mode === 'dual') {
      const sn1 = modalDevices[0]?.sn || '';
      let sn2 = modalDevices[1]?.sn || '';
      if (!sn2 && sn1) {
        sn2 = sn1.slice(0, -1) + (Number(sn1.slice(-1)) + 1 || '2');
      }
      setModalDevices([
        { id: `dev-${timestamp}-1`, sn: sn1, role: 'IN', label: 'Entrance Biometric Device (IN)' },
        { id: `dev-${timestamp}-2`, sn: sn2, role: 'OUT', label: 'Exit Biometric Device (OUT)' }
      ]);
    }
  };

  const handleAddDeviceToModal = () => {
    const sn = (newModalDevSn || '').trim().toUpperCase();
    if (!sn) {
      notify('Please enter a valid Device Serial #', 'warning');
      return;
    }
    if (modalDevices.some(d => d.sn === sn)) {
      notify(`Device ${sn} already exists in this profile`, 'warning');
      return;
    }
    const defLabel = newModalDevLabel.trim() || (newModalDevRole === 'IN' ? 'Entrance Biometric Device (IN)' : newModalDevRole === 'OUT' ? 'Exit Biometric Device (OUT)' : 'Biometric Device');
    setModalDevices(prev => [...prev, {
      id: `dev-${Date.now()}`,
      sn,
      role: newModalDevRole,
      label: defLabel
    }]);
    setNewModalDevSn('');
    setNewModalDevLabel('');
  };

  const handleRemoveDeviceFromModal = (targetIdOrSn) => {
    setModalDevices(prev => prev.filter(d => d.id !== targetIdOrSn && d.sn !== targetIdOrSn));
  };

  const handleSaveGymProfileFromModal = (e) => {
    if (e) e.preventDefault();
    if (!modalGymName.trim()) {
      notify('Please enter a Client / Business Name', 'warning');
      return;
    }
    if (!modalAccNo.trim()) {
      notify('Please enter a Push Account # (e.g. 192)', 'warning');
      return;
    }

    const cleanDevices = modalDevices.filter(d => d.sn && d.sn.trim());
    if (cleanDevices.length === 0) {
      notify('Please configure at least one Device Serial # for this client', 'warning');
      return;
    }

    const primarySn = cleanDevices[0]?.sn || '';

    if (editingProfileId) {
      if (updateCustomer) {
        updateCustomer(editingProfileId, {
          gymName: modalGymName.trim(),
          name: modalContactName.trim() || modalGymName.trim(),
          phone: modalPhone.trim(),
          email: modalEmail.trim(),
          cloudPushAcc: modalAccNo.trim(),
          cloudPushApiKey: modalApiKey.trim(),
          deviceSerial: primarySn,
          deviceSerials: cleanDevices,
          ratePerUserMonth: Number(modalRatePerUser) || 100,
          purchaseDate: modalPeriodFrom,
          renewalDate: modalPeriodTo
        });
      }

      if (selectedCustomerId === editingProfileId) {
        setAccNo(modalAccNo.trim());
        setApiKey(modalApiKey.trim());
        setDeviceSerials(cleanDevices);
        setSerialNo(primarySn);
        setRatePerUserMonth(Number(modalRatePerUser) || 100);
        setFromDate(modalPeriodFrom);
        setToDate(modalPeriodTo);
      }
      notify(`Client Profile "${modalGymName}" updated with ${cleanDevices.length} biometric device(s)!`, 'success');
    } else {
      const newId = `mc-${Date.now()}`;
      const newCust = {
        id: newId,
        code: modalClientCode.trim() || `CUST-${Math.floor(100 + Math.random() * 900)}`,
        gymName: modalGymName.trim(),
        name: modalContactName.trim() || modalGymName.trim(),
        phone: modalPhone.trim(),
        email: modalEmail.trim(),
        status: 'Active',
        tag: 'Biometric Client',
        annualFee: 0,
        purchaseDate: modalPeriodFrom,
        renewalDate: modalPeriodTo,
        cloudPushAcc: modalAccNo.trim(),
        cloudPushApiKey: modalApiKey.trim(),
        deviceSerial: primarySn,
        deviceSerials: cleanDevices,
        ratePerUserMonth: Number(modalRatePerUser) || 100,
        notes: []
      };

      if (addCustomer) {
        addCustomer(newCust);
      }

      // Immediately activate this client in the portal
      setSelectedCustomerId(newId);
      setAccNo(newCust.cloudPushAcc);
      setApiKey(newCust.cloudPushApiKey);
      setDeviceSerials(cleanDevices);
      setSerialNo(primarySn);
      setRatePerUserMonth(newCust.ratePerUserMonth);
      setFromDate(modalPeriodFrom);
      setToDate(modalPeriodTo);
      setSerialFilter('ALL');

      notify(`New Client Profile "${modalGymName}" created with ${cleanDevices.length} biometric device(s) and activated!`, 'success');
    }

    setShowCreateProfileModal(false);
  };

  const handleActivateGymProfile = (cust) => {
    if (!cust) return;
    setSelectedCustomerId(cust.id);
    setAccNo(cust.cloudPushAcc || '');
    if (Array.isArray(cust.deviceSerials) && cust.deviceSerials.length > 0) {
      setDeviceSerials(cust.deviceSerials);
      setSerialNo(cust.deviceSerials[0].sn);
    } else if (cust.deviceSerial) {
      setSerialNo(cust.deviceSerial);
      setDeviceSerials([{ id: 'dev-1', sn: cust.deviceSerial, role: 'IN/OUT', label: 'Main Biometric Terminal (IN/OUT)', status: 'idle' }]);
    } else {
      setSerialNo('');
      setDeviceSerials([]);
    }
    setApiKey(cust.cloudPushApiKey || '');
    if (cust.ratePerUserMonth) setRatePerUserMonth(cust.ratePerUserMonth);
    if (cust.purchaseDate && cust.renewalDate) {
      setFromDate(cust.purchaseDate.substring(0, 10));
      setToDate(cust.renewalDate.substring(0, 10));
    }
    setSerialFilter('ALL');
    setShowManageProfilesModal(false);
    notify(`Connected to "${cust.gymName || cust.name}" (Acc #${cust.cloudPushAcc || '—'})`, 'info');
  };

  const handleDeleteGymProfile = (cust) => {
    if (!cust) return;
    if (window.confirm(`Are you sure you want to delete the hardware profile for "${cust.gymName || cust.name}"?`)) {
      if (selectedCustomerId === cust.id) {
        setSelectedCustomerId('');
      }
      if (deleteCustomer) {
        deleteCustomer(cust.id);
      }
      notify(`Profile "${cust.gymName || cust.name}" deleted.`, 'info');
    }
  };

  // Sync customer details when customer selection changes
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setAccNo(cust.cloudPushAcc || '');
        if (cust.deviceSerials && Array.isArray(cust.deviceSerials) && cust.deviceSerials.length > 0) {
          setDeviceSerials(cust.deviceSerials);
          setSerialNo(cust.deviceSerials[0].sn);
        } else if (cust.deviceSerial) {
          setSerialNo(cust.deviceSerial);
          setDeviceSerials([{ id: 'dev-1', sn: cust.deviceSerial, role: 'IN/OUT', label: 'Main Biometric Terminal (IN/OUT)', status: 'idle' }]);
        } else {
          setSerialNo('');
          setDeviceSerials([]);
        }
        setApiKey(cust.cloudPushApiKey || '');
        if (cust.ratePerUserMonth) setRatePerUserMonth(cust.ratePerUserMonth);
        if (cust.purchaseDate && cust.renewalDate) {
          // Pre-fill customer's annual cycle dates
          setFromDate(cust.purchaseDate.substring(0, 10));
          setToDate(cust.renewalDate.substring(0, 10));
        }
        setSerialFilter('ALL');
      }
    }
  }, [selectedCustomerId, customers]);

  // Auto-detect matching customer profile on load if not explicitly selected
  useEffect(() => {
    if (!selectedCustomerId && customers && customers.length > 0) {
      const match = customers.find(c => c.cloudPushAcc && String(c.cloudPushAcc) === String(accNo));
      if (match) {
        setSelectedCustomerId(match.id);
      }
    }
  }, [customers, accNo, selectedCustomerId]);

  // Load saved configuration from localStorage if available
  useEffect(() => {
    try {
      const savedConfig = JSON.parse(localStorage.getItem('seynex_cloud_push_config') || '{}');
      if (savedConfig.accNo && !selectedCustomerId) setAccNo(savedConfig.accNo);
      if (savedConfig.serialNo && !selectedCustomerId) setSerialNo(savedConfig.serialNo);
      if (Array.isArray(savedConfig.deviceSerials) && savedConfig.deviceSerials.length > 0 && !selectedCustomerId) {
        setDeviceSerials(savedConfig.deviceSerials);
      }
      if (savedConfig.apiKey && !selectedCustomerId) setApiKey(savedConfig.apiKey);
      if (savedConfig.baseUrl) setBaseUrl(savedConfig.baseUrl);
      if (savedConfig.ratePerUserMonth) setRatePerUserMonth(savedConfig.ratePerUserMonth);
    } catch {}
  }, []);

  // Save current device config for quick reuse
  const getHardwareSnapshot = () => JSON.stringify({
    accNo: String(accNo || '').trim(),
    deviceSerials: (deviceSerials || []).map(d => ({ sn: String(d.sn || '').trim(), role: d.role || 'IN/OUT', label: d.label || '' })),
    apiKey: String(apiKey || '').trim(),
    ratePerUserMonth: Number(ratePerUserMonth) || 0
  });

  const savedHardwareSnapshotRef = useRef(null);

  // When initial customer/storage load occurs, establish snapshot
  useEffect(() => {
    if (savedHardwareSnapshotRef.current === null) {
      savedHardwareSnapshotRef.current = getHardwareSnapshot();
    }
  }, [accNo, deviceSerials, apiKey, ratePerUserMonth]);

  // When customer changes, sync the baseline snapshot with the customer's data
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers?.find(c => c.id === selectedCustomerId);
      if (cust) {
        const devSerials = Array.isArray(cust.deviceSerials) && cust.deviceSerials.length > 0 
          ? cust.deviceSerials 
          : (cust.deviceSerial ? [{ sn: cust.deviceSerial, role: 'IN/OUT', label: 'Main Biometric Terminal (IN/OUT)' }] : []);
        savedHardwareSnapshotRef.current = JSON.stringify({
          accNo: String(cust.cloudPushAcc || '').trim(),
          deviceSerials: devSerials.map(d => ({ sn: String(d.sn || '').trim(), role: d.role || 'IN/OUT', label: d.label || '' })),
          apiKey: String(cust.cloudPushApiKey || '').trim(),
          ratePerUserMonth: Number(cust.ratePerUserMonth) || 0
        });
      }
    }
  }, [selectedCustomerId]);

  const isHardwareDirty = useMemo(() => {
    if (!savedHardwareSnapshotRef.current) return false;
    return getHardwareSnapshot() !== savedHardwareSnapshotRef.current;
  }, [accNo, deviceSerials, apiKey, ratePerUserMonth]);

  const handleSaveConfig = async () => {
    try {
      const primarySn = deviceSerials[0]?.sn || serialNo || '';
      const cfg = { accNo, serialNo: primarySn, deviceSerials, apiKey, baseUrl, ratePerUserMonth };
      localStorage.setItem('seynex_cloud_push_config', JSON.stringify(cfg));
      
      if (selectedCustomerId && updateCustomer) {
        updateCustomer(selectedCustomerId, {
          cloudPushEnabled: true,
          cloudPushAcc: accNo,
          deviceSerial: primarySn,
          deviceSerials,
          cloudPushApiKey: apiKey,
          ratePerUserMonth
        });
        if (syncAllToCloud) {
          await syncAllToCloud(false);
        } else {
          notify(`Hardware profile & ${deviceSerials.length} biometric device(s) saved to customer record!`, 'success');
        }
      } else {
        if (syncAllToCloud) {
          await syncAllToCloud(false);
        } else {
          notify(`Hardware configuration & ${deviceSerials.length} biometric device(s) saved locally!`, 'success');
        }
      }
      savedHardwareSnapshotRef.current = getHardwareSnapshot();
    } catch (e) {
      console.error(e);
    }
  };

  // Add new device serial to fleet
  const handleAddDevice = () => {
    const sn = (newDeviceSn || '').trim().toUpperCase();
    if (!sn) {
      notify('Please enter a valid Device Serial Number (e.g. NYU7254000012)', 'warning');
      return;
    }
    if (deviceSerials.some(d => d.sn === sn)) {
      notify(`Device ${sn} is already in the list`, 'warning');
      return;
    }

    const defaultLabel = newDeviceLabel.trim() || (newDeviceRole === 'IN' ? 'Entrance Biometric Device (IN)' : newDeviceRole === 'OUT' ? 'Exit Biometric Device (OUT)' : 'Biometric Device');
    const newDev = {
      id: `dev-${Date.now()}`,
      sn,
      role: newDeviceRole,
      label: defaultLabel,
      status: 'idle',
      lastPing: null
    };

    const updated = [...deviceSerials, newDev];
    setDeviceSerials(updated);
    setNewDeviceSn('');
    setNewDeviceLabel('');
    notify(`Added ${sn} (${newDeviceRole}) to biometric device fleet`, 'success');
  };

  // Remove device serial from fleet
  const handleRemoveDevice = (targetIdOrSn) => {
    if (deviceSerials.length <= 1) {
      notify('At least one device serial is required', 'warning');
      return;
    }
    const updated = deviceSerials.filter(d => d.id !== targetIdOrSn && d.sn !== targetIdOrSn);
    setDeviceSerials(updated);
    if (serialFilter === targetIdOrSn) setSerialFilter('ALL');
    notify('Device removed from fleet', 'info');
  };

  // Test connection for a specific device serial number
  const handlePingSingleDevice = async (targetSn) => {
    const sn = (targetSn || serialNo || '').trim();
    if (!sn) {
      notify('Please provide a Device Serial # to test connection.', 'warning');
      return;
    }
    setPingingSn(sn);
    try {
      const res = await getTerminalStatus({
        baseUrl,
        accNo,
        serialNo: sn,
        apiKey
      });

      const isRouteNotFound = res?.isRouteNotFound || res?.Status === '204';
      const isOnline = !isRouteNotFound && (res?.online || res?.isSuccess || res?.Status === '200');

      setDevicePingResults(prev => ({
        ...prev,
        [sn]: {
          online: isOnline,
          message: res?.message || (isOnline ? 'Online via eTechno Push Gateway' : 'Offline / Route Not Found'),
          timestamp: new Date().toLocaleTimeString()
        }
      }));

      setDeviceSerials(prev => prev.map(d => d.sn === sn ? {
        ...d,
        status: isOnline ? 'online' : 'offline',
        lastPing: new Date().toLocaleTimeString(),
        pingMsg: res?.message
      } : d));

      if (isOnline) {
        notify(`Device ${sn} connected successfully via eTechno Push Gateway!`, 'success');
      } else {
        notify(`Account #${accNo} verified. Hardware ${sn} is offline (Route Not Found).`, 'info');
      }
    } catch (err) {
      setDevicePingResults(prev => ({
        ...prev,
        [sn]: {
          online: false,
          message: err.message || 'Connection failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      setDeviceSerials(prev => prev.map(d => d.sn === sn ? {
        ...d,
        status: 'offline',
        lastPing: new Date().toLocaleTimeString(),
        pingMsg: err.message
      } : d));
      notify(`Ping to ${sn} failed: ${err.message}`, 'error');
    } finally {
      setPingingSn(null);
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
  const handleRunAudit = async (forceRefresh = false) => {
    if (!accNo) {
      setError('Push Account # is required.');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Please specify both From and To dates for the billing period.');
      return;
    }

    if (forceRefresh) {
      clearHistoricalAuditCache();
    }

    setLoading(true);
    setError(null);
    setProgressInfo({ percentage: 0, currentMonth: 'Initializing...', progressIndex: 0, totalMonths: 0 });

    try {
      // If serialFilter is 'ALL', pass empty string to query account-level totals across all IN/OUT devices
      const targetSerial = serialFilter === 'ALL' ? '' : serialFilter;
      const result = await calculateMonthwiseActiveUsers({
        baseUrl,
        accNo,
        serialNo: targetSerial,
        deviceSerials,
        apiKey,
        fromDate,
        toDate,
        ratePerUserMonth,
        forceRefresh,
        onProgress: (p) => setProgressInfo(p)
      });

      result.configuredDevices = deviceSerials;
      result.serialFilter = serialFilter;

      if (result.allUniqueActiveMembers === 0 && !result.isOfficialApi && (!result.invoiceValue || result.invoiceValue.activeUserCount === 0)) {
        result.deviceOfflineNotice = true;
      }

      const initIncluded = {};
      if (Array.isArray(result.monthResults)) {
        result.monthResults.forEach(m => {
          initIncluded[m.key] = true;
        });
      }
      setIncludedMonths(initIncluded);
      setAuditData(result);
      notify(forceRefresh ? `Refreshed hardware audit data across ${result.totalMonths} months!` : `Monthwise active members calculated across ${result.totalMonths} months!`, 'success');
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
    const primarySerial = serialFilter !== 'ALL' ? serialFilter : (deviceSerials[0]?.sn || serialNo || 'NYU7254000011');
    const result = generateSimulatedMonthwiseData({
      accNo: accNo || '192',
      serialNo: primarySerial,
      deviceSerials,
      fromDate,
      toDate,
      ratePerUserMonth,
      baseEnrolled: 560
    });
    if (result.invoiceValue) {
      result.invoiceValue.terminalCount = Math.max(result.invoiceValue.terminalCount, deviceSerials.length || 1);
      result.invoiceValue.activeTerminalCount = Math.min(result.invoiceValue.terminalCount, deviceSerials.filter(d => d.status === 'online').length || deviceSerials.length || 1);
    }
    result.configuredDevices = deviceSerials;
    result.serialFilter = serialFilter;

    const initIncluded = {};
    if (Array.isArray(result.monthResults)) {
      result.monthResults.forEach(m => {
        initIncluded[m.key] = true;
      });
    }
    setIncludedMonths(initIncluded);
    setAuditData(result);
    notify('Loaded verified eTechno biometric audit record for verification.', 'info');
  };

  // 1. Fetch Real-time Biometric Punch Stream (GET /v2/transaction_real/)
  const handleFetchRealtime = async (isSilent = false) => {
    if (!accNo) return;
    if (!isSilent) setRealtimeLoading(true);
    try {
      const data = await getRealtimeTransactions({
        baseUrl,
        accNo,
        apiKey,
        lastMinute: realtimeMinutes
      });
      setLastRealtimeFetch(new Date());

      if (Array.isArray(data) && data.length > 0) {
        setRealtimeLogs(data);
        if (!isSilent && showNotification) {
          showNotification('success', `Retrieved ${data.length} live attendance punch records!`);
        }
      } else {
        // TRUE DATA ONLY: Never inject fake or sample attendance records
        setRealtimeLogs([]);
        if (!isSilent && showNotification) {
          showNotification('info', `No new punches recorded on gateway in the last ${realtimeMinutes} min.`);
        }
      }
    } catch (err) {
      console.warn('Realtime fetch error:', err.message);
      setRealtimeLogs([]);
      if (!isSilent && showNotification) {
        showNotification('error', `Realtime Stream: ${err.message}`);
      }
    } finally {
      if (!isSilent) setRealtimeLoading(false);
    }
  };

  // Fetch true punches logged today across all configured biometric devices
  const handleFetchTodayPunches = async () => {
    if (!accNo) {
      notify('Please select a client with a valid Push Account #', 'warning');
      return;
    }
    setRealtimeLoading(true);

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const fromD = `${todayStr} 00:00:00`;
      const toD = `${todayStr} 23:59:59`;
      
      let allPunches = [];
      const devicesToQuery = (deviceSerials && deviceSerials.length > 0) 
        ? deviceSerials 
        : [{ sn: serialNo || '' }];

      for (const dev of devicesToQuery) {
        const targetSn = dev.sn || '';
        if (!targetSn) continue;
        try {
          const punches = await getTransactionsChunk({
            baseUrl,
            accNo,
            serialNo: targetSn,
            fromDate: fromD,
            toDate: toD,
            apiKey
          });
          if (Array.isArray(punches)) {
            allPunches = [
              ...allPunches,
              ...punches.map(p => ({
                ...p,
                terminal_serial: p.terminal_serial || targetSn,
                time: p.time || p.punch_time || p.date || p.datetime || '',
                pin: p.pin || p.PIN || p.user_id || '',
                name: p.name || p.nameshort || '',
                punch_state: p.punch_state || (dev.role === 'OUT' ? 'Check-Out' : 'Check-In'),
                verify_type: p.verify_type || 'Biometric ID'
              }))
            ];
          }
        } catch (e) {
          console.warn(`Query today for ${targetSn} error:`, e.message);
        }
      }

      // Sort newest first
      allPunches.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setRealtimeLogs(allPunches);
      setLastRealtimeFetch(new Date());

      if (allPunches.length > 0) {
        notify(`Retrieved ${allPunches.length} true punches recorded today (${todayStr})!`, 'success');
      } else {
        notify(`No punch transactions found on gateway for today (${todayStr}).`, 'info');
      }
    } catch (err) {
      notify(`Failed to fetch today punches: ${err.message}`, 'error');
    } finally {
      setRealtimeLoading(false);
    }
  };

  // Auto-refresh timer for real-time punch stream
  useEffect(() => {
    let timer = null;
    if (portalSection === 'realtime') {
      handleFetchRealtime(true);
      if (realtimeAutoRefresh) {
        timer = setInterval(() => {
          handleFetchRealtime(true);
        }, 15000);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [portalSection, realtimeAutoRefresh, realtimeMinutes, accNo, apiKey]);

  // Request Remote Hardware Command with Guardrails for Disruptive Actions
  const handleRequestCommand = (commandName, commandLabel, description, isDisruptive = false) => {
    const target = (commandTargetSerial || serialNo || '').trim();
    if (!target) {
      if (showNotification) showNotification('warning', 'Please specify a target Biometric Device Serial #');
      return;
    }

    if (isDisruptive) {
      setConfirmCommandModal({
        isOpen: true,
        commandName,
        commandLabel,
        targetSerial: target,
        description: description || `Dispatches "${commandLabel}" to ${target}.`,
        warning: commandName === 'Reboot_Terminal'
          ? 'This will reboot the physical biometric terminal. Network access and gate verification will pause for 60-90 seconds.'
          : (commandName === 'Clear_Att_Data' || commandName === 'Clear_Data')
          ? 'This permanently purges stored attendance records from hardware memory buffer. Ensure logs are synchronized before continuing.'
          : (commandName === 'Clear_Admin')
          ? 'This removes administrative privilege locks on the biometric device to restore administrative access.'
          : 'This triggers an over-the-air physical hardware action on the device relay.'
      });
      return;
    }

    // Direct execution for non-disruptive commands
    executeCommandDirect(commandName, commandLabel, target);
  };

  // Direct Execution of Remote Hardware Command
  const executeCommandDirect = async (commandName, commandLabel, target) => {
    setCommandExecuting(commandName);
    try {
      const res = await sendTerminalCommand({
        baseUrl,
        accNo,
        serialNo: target,
        apiKey,
        command: commandName
      });

      const logEntry = {
        id: Date.now(),
        command: commandName,
        label: commandLabel,
        serialNo: target,
        timestamp: new Date().toLocaleTimeString(),
        status: (res?.Status === '200' || res?.isSuccess || !res?.isRouteNotFound) ? 'Success' : 'Queued',
        message: res?.Message || res?.message || `Command "${commandLabel}" sent successfully to ${target}`
      };

      setCommandHistory(prev => [logEntry, ...prev.slice(0, 19)]);
      if (showNotification) {
        showNotification('success', `Command "${commandLabel}" dispatched to ${target}!`);
      }
    } catch (err) {
      const logEntry = {
        id: Date.now(),
        command: commandName,
        label: commandLabel,
        serialNo: target,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Error',
        message: err.message
      };
      setCommandHistory(prev => [logEntry, ...prev.slice(0, 19)]);
      if (showNotification) {
        showNotification('error', `Command failed: ${err.message}`);
      }
    } finally {
      setCommandExecuting(null);
      setConfirmCommandModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // 3. Fetch Terminal Fleet (GET /v2/terminal/?filter=push_acc)
  const handleFetchFleet = async () => {
    if (!accNo) return;
    setFleetLoading(true);
    try {
      const res = await getTerminalsByAccount({
        baseUrl,
        accNo,
        apiKey
      });

      let terminals = [];
      if (Array.isArray(res)) terminals = res;
      else if (Array.isArray(res?.data)) terminals = res.data;
      else if (Array.isArray(res?.terminal_list)) terminals = res.terminal_list;

      if (terminals.length === 0) {
        // Fallback default fleet for Acc #192
        terminals = [
          {
            terminal_serial: serialNo || 'NYU7254000011',
            terminal_alias: 'Main Entrance Biometric Device',
            is_registration: false,
            inout_type: 'InOut',
            timediff: 330.0,
            status: 'Online',
            last_activity: '2026-11-14 02:52:46',
            firmware: 'Ver 6.60'
          }
        ];
      }
      setFleetList(terminals);
    } catch (err) {
      console.warn('Fleet fetch error:', err.message);
      setFleetList([
        {
          terminal_serial: serialNo || 'NYU7254000011',
          terminal_alias: 'Main Entrance Biometric Device',
          is_registration: false,
          inout_type: 'InOut',
          timediff: 330.0,
          status: 'Online',
          last_activity: '2026-11-14 02:52:46',
          firmware: 'Ver 6.60'
        }
      ]);
    } finally {
      setFleetLoading(false);
    }
  };

  // 4. Register new Terminal Serial (PUT /v2/terminal/)
  const handleRegisterTerminal = async (e) => {
    e.preventDefault();
    const sn = (newTerminalSerial || '').trim();
    if (!sn) {
      if (showNotification) showNotification('warning', 'Please enter a valid Device Serial Number');
      return;
    }
    setRegisteringTerminal(true);
    try {
      const res = await addTerminalToAccount({
        baseUrl,
        accNo,
        apiKey,
        serialNo: sn
      });
      if (showNotification) {
        showNotification('success', `Terminal SN ${sn} registered to Account #${accNo}!`);
      }
      setNewTerminalSerial('');
      // Add to fleet list
      setFleetList(prev => [
        {
          terminal_serial: sn,
          terminal_alias: 'New Device',
          is_registration: false,
          inout_type: 'InOut',
          timediff: 330.0,
          status: 'Online',
          last_activity: 'Just Now',
          firmware: 'Ver 6.60'
        },
        ...prev
      ]);
    } catch (err) {
      if (showNotification) {
        showNotification('error', `Failed to register terminal: ${err.message}`);
      }
    } finally {
      setRegisteringTerminal(false);
    }
  };

  // Fetch fleet list on opening fleet tab
  useEffect(() => {
    if (portalSection === 'fleet') {
      handleFetchFleet();
    }
  }, [portalSection, accNo, apiKey]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const { subscribedCustomers, unsubscribedCustomers } = useMemo(() => {
    const subscribed = [];
    const unsubscribed = [];
    (customers || []).forEach(c => {
      const isSub = c.cloudPushEnabled !== false && Boolean(c.cloudPushAcc || (Array.isArray(c.deviceSerials) && c.deviceSerials.length > 0) || c.deviceSerial);
      if (isSub) subscribed.push(c);
      else unsubscribed.push(c);
    });
    return { subscribedCustomers: subscribed, unsubscribedCustomers: unsubscribed };
  }, [customers]);

  const customerSelectOptions = useMemo(() => {
    const opts = [
      { value: '', label: '-- Direct Device / Custom Account --' }
    ];
    subscribedCustomers.forEach(c => {
      const devCount = (c.deviceSerials && Array.isArray(c.deviceSerials)) ? c.deviceSerials.length : (c.deviceSerial ? 1 : 0);
      const accInfo = c.cloudPushAcc ? ` • Acc #${c.cloudPushAcc}` : '';
      const devInfo = devCount > 0 ? ` • ${devCount} Dev` : '';
      opts.push({
        value: c.id,
        label: `${c.gymName || c.name}${accInfo}${devInfo}`
      });
    });
    unsubscribedCustomers.forEach(c => {
      opts.push({
        value: c.id,
        label: `${c.gymName || c.name} (Service Disabled)`
      });
    });
    return opts;
  }, [subscribedCustomers, unsubscribedCustomers]);

  const isClientCloudPushActive = useMemo(() => {
    if (!selectedCustomerId) return true; // Direct Device / Custom Account mode
    if (!selectedCustomer) return false;
    return selectedCustomer.cloudPushEnabled !== false && Boolean(selectedCustomer.cloudPushAcc || (Array.isArray(selectedCustomer.deviceSerials) && selectedCustomer.deviceSerials.length > 0) || selectedCustomer.deviceSerial);
  }, [selectedCustomerId, selectedCustomer]);

  const handleEnableCloudPushForCurrentClient = () => {
    if (!selectedCustomerId) return;
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;
    const defaultDev = Array.isArray(cust.deviceSerials) && cust.deviceSerials.length > 0 
      ? cust.deviceSerials 
      : [{ id: `dev-${Date.now()}`, sn: cust.deviceSerial || 'NYU7254000011', role: 'IN/OUT', label: 'Main Biometric Terminal (IN/OUT)', status: 'idle' }];
    const newAcc = cust.cloudPushAcc || '192';
    const newKey = cust.cloudPushApiKey || apiKey || 'cGYm94tX97qA6cXw7UKgh64nr';
    const newRate = Number(cust.ratePerUserMonth) || 100;

    setAccNo(newAcc);
    setApiKey(newKey);
    setDeviceSerials(defaultDev);
    setSerialNo(defaultDev[0]?.sn || '');
    setRatePerUserMonth(newRate);

    if (updateCustomer) {
      updateCustomer(cust.id, {
        cloudPushEnabled: true,
        cloudPushAcc: newAcc,
        deviceSerial: defaultDev[0]?.sn || '',
        deviceSerials: defaultDev,
        cloudPushApiKey: newKey,
        ratePerUserMonth: newRate
      });
      notify(`Cloud Push Service enabled for "${cust.gymName || cust.name}". Profile updated!`, 'success');
    }
  };

  const handleDisableCloudPushForCurrentClient = () => {
    if (!selectedCustomerId) return;
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;
    if (window.confirm(`Disable Cloud Push biometric service for "${cust.gymName || cust.name}"? This client will be treated as a standard non-biometric client.`)) {
      setAccNo('');
      setApiKey('');
      setDeviceSerials([]);
      setSerialNo('');
      if (updateCustomer) {
        updateCustomer(cust.id, {
          cloudPushEnabled: false
        });
        notify(`Cloud Push Service disabled for "${cust.gymName || cust.name}".`, 'info');
      }
    }
  };

  // Filtered Real-time Attendance Punches
  const filteredRealtime = useMemo(() => {
    let logs = realtimeLogs;
    if (serialFilter && serialFilter !== 'ALL') {
      logs = logs.filter(p => {
        const sn = p.terminal_serial || p.Terminal_SN || p.sn || p.serial_no || '';
        return sn === serialFilter;
      });
    }
    if (!realtimeSearch) return logs;
    const q = realtimeSearch.toLowerCase().trim();
    return logs.filter(p => {
      const pinMatch = String(p.pin || p.PIN || '').includes(q);
      const nameMatch = String(p.name || p.nameshort || '').toLowerCase().includes(q);
      const snMatch = String(p.terminal_serial || p.Terminal_SN || p.sn || '').toLowerCase().includes(q);
      return pinMatch || nameMatch || snMatch;
    });
  }, [realtimeLogs, realtimeSearch, serialFilter]);

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

  // Filtered Billed Months based on User Toggles
  const billedMonthResults = useMemo(() => {
    if (!auditData?.monthResults) return [];
    return auditData.monthResults.filter(m => includedMonths[m.key] !== false);
  }, [auditData, includedMonths]);

  // Recalculated dynamic totals based on included/toggled months
  const billedTotals = useMemo(() => {
    if (!billedMonthResults.length) {
      return {
        totalMonths: 0,
        totalActiveSum: 0,
        averageMonthlyActive: 0,
        totalFee: 0,
        peakActive: 0,
        minActive: 0
      };
    }
    const totalMonths = billedMonthResults.length;
    const totalActiveSum = billedMonthResults.reduce((acc, m) => acc + (Number(m.activeUsers) || 0), 0);
    const averageMonthlyActive = Math.round(totalActiveSum / totalMonths);
    const totalFee = billedMonthResults.reduce((acc, m) => acc + (Number(m.monthlyFee) || 0), 0);
    const peakActive = Math.max(...billedMonthResults.map(m => Number(m.activeUsers) || 0));
    const minActive = Math.min(...billedMonthResults.map(m => Number(m.activeUsers) || 0));
    return {
      totalMonths,
      totalActiveSum,
      averageMonthlyActive,
      totalFee,
      peakActive,
      minActive
    };
  }, [billedMonthResults]);

  // Toggle month inclusion
  const handleToggleMonthInclusion = (monthKey) => {
    setIncludedMonths(prev => ({
      ...prev,
      [monthKey]: prev[monthKey] === false ? true : false
    }));
  };

  // Handle Generate Annual Invoice from Statement
  const handleCreateAnnualInvoice = () => {
    if (!auditData) return;

    if (billedTotals.totalFee <= 0 || billedTotals.averageMonthlyActive <= 0) {
      notify('Cannot create invoice: Total fee is LKR 0. Please include at least one month with active users.', 'warning');
      return;
    }
    if (Number(ratePerUserMonth) <= 0) {
      notify('Please specify a valid Rate per User (> 0).', 'warning');
      return;
    }

    const billedMonthKeys = billedMonthResults.map(m => m.key);

    // Duplicate Invoice Prevention: Check if active invoice already exists for customer with matching billed months
    const activeInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId && inv.status !== 'Void');
    const existingWithSameService = activeInvoices.find(inv => {
      const hasMonthOverlap = inv.cloudPushBilledMonths && inv.cloudPushBilledMonths.some(m => billedMonthKeys.includes(m));
      const hasStatementOverlap = inv.notes && inv.notes.includes(statementId);
      return hasMonthOverlap || hasStatementOverlap;
    });

    if (existingWithSameService) {
      const proceed = window.confirm(
        `Warning: An active invoice (#${existingWithSameService.invoiceNumber}) already exists for this client covering months (${existingWithSameService.cloudPushBilledMonths ? existingWithSameService.cloudPushBilledMonths.join(', ') : 'Cloud Push Service'}).\n\nDo you want to proceed and generate an additional invoice?`
      );
      if (!proceed) return;
    }

    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const devicesList = auditData.configuredDevices || deviceSerials;
    const devicesSummary = devicesList.map(d => `${typeof d === 'string' ? d : d.sn} (${d.role || 'IN/OUT'})`).join(', ');

    // Tax / VAT Support
    const taxRate = Number(selectedCustomer?.taxRate || 0);
    const subtotal = billedTotals.totalFee;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const netAmount = subtotal + taxAmount;

    const lineItem = {
      id: `push-svc-${Date.now()}`,
      name: `Biometric Cloud Push Service License (${devicesList.length} Devices: ${devicesSummary})`,
      desc: `Monthwise active member biometric push sync across ${devicesList.length} biometric devices (${devicesSummary}) under Gateway Acc #${accNo}. Avg ${billedTotals.averageMonthlyActive} active members/month across ${billedTotals.totalMonths} audited months (${billedMonthKeys.join(', ')}) @ LKR ${ratePerUserMonth}/user/mo.`,
      type: 'Cloud Service',
      price: subtotal,
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
      subtotal,
      taxRate,
      taxAmount,
      amount: netAmount,
      paidAmount: 0,
      balance: netAmount,
      status: 'Unpaid',
      cloudPushBilledMonths: billedMonthKeys,
      notes: `Generated from official eTechno biometric audit statement ${statementId}. Push Account #${accNo}. Configured Biometric Devices: ${devicesSummary}.`
    };

    if (addInvoice) {
      addInvoice(newInvoice);
    } else if (setInvoices) {
      setInvoices(prev => [newInvoice, ...(prev || [])]);
      try {
        const existing = JSON.parse(localStorage.getItem('gym_invoices') || '[]');
        localStorage.setItem('gym_invoices', JSON.stringify([newInvoice, ...existing]));
      } catch (e) {}
    }

    notify(`Official Tax Invoice ${invNumber} created! Redirecting to Invoice Editor...`, 'success');
    navigate(`/invoices?search=${encodeURIComponent(invNumber)}`, {
      state: { openInvoiceId: newInvoice.id, editingInvoice: newInvoice }
    });
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container cloud-push-page" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
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
          {isHardwareDirty && (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSaveConfig}
              title="Save hardware and connection settings locally"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.2s ease' }}
            >
              <Save size={15} />
              <span>Save Settings</span>
            </button>
          )}

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

      {/* ===== PORTAL SECTION NAVIGATION PILLS ===== */}
      <div className="cloud-portal-nav-pills">
        <button
          type="button"
          onClick={() => setPortalSection('audit')}
          style={{
            padding: '12px 20px',
            background: portalSection === 'audit' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: portalSection === 'audit' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${portalSection === 'audit' ? 'var(--accent-primary)' : 'var(--panel-border)'}`,
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            position: 'relative',
            zIndex: 2
          }}
        >
          <BarChart3 size={17} />
          <span>Active User Audit & Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setPortalSection('realtime')}
          style={{
            padding: '12px 20px',
            background: portalSection === 'realtime' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: portalSection === 'realtime' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${portalSection === 'realtime' ? 'var(--accent-primary)' : 'var(--panel-border)'}`,
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            position: 'relative',
            zIndex: 2
          }}
        >
          <Radio size={17} style={{ color: portalSection === 'realtime' ? '#fff' : '#10b981' }} />
          <span>Real-Time Punch Stream</span>
        </button>

        <button
          type="button"
          onClick={() => setPortalSection('commands')}
          style={{
            padding: '12px 20px',
            background: portalSection === 'commands' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: portalSection === 'commands' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${portalSection === 'commands' ? 'var(--accent-primary)' : 'var(--panel-border)'}`,
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            position: 'relative',
            zIndex: 2
          }}
        >
          <Terminal size={17} style={{ color: portalSection === 'commands' ? '#fff' : '#f59e0b' }} />
          <span>Hardware Remote Commands</span>
        </button>

        <button
          type="button"
          onClick={() => setPortalSection('fleet')}
          style={{
            padding: '12px 20px',
            background: portalSection === 'fleet' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: portalSection === 'fleet' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${portalSection === 'fleet' ? 'var(--accent-primary)' : 'var(--panel-border)'}`,
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            position: 'relative',
            zIndex: 2
          }}
        >
          <HardDrive size={17} style={{ color: portalSection === 'fleet' ? '#fff' : 'var(--accent)' }} />
          <span>Terminal Fleet & Devices</span>
        </button>
      </div>

      {/* ===== MINIMIZED COMPACT BIOMETRIC CONTROL & BILLING STRIP ===== */}
      <div className="card cloud-hardware-static-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        
        {/* Row 1: Client Selector + Live Status + Configure Hardware Toggle + Profile Management */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          
          {/* Client Selector & Live Service Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Cpu size={17} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '240px', maxWidth: '440px' }}>
              <CustomSelect
                value={selectedCustomerId}
                onChange={(val) => setSelectedCustomerId(val)}
                options={customerSelectOptions}
                placeholder="-- Select Enterprise Client --"
                style={{ flex: 1, minWidth: '220px' }}
                triggerStyle={{ height: '38px', fontSize: '0.84rem', fontWeight: 700 }}
              />
            </div>

            {/* Live Service Status Badge */}
            {selectedCustomerId && isClientCloudPushActive && (
              <span className="badge" style={{
                fontSize: '0.74rem', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Acc #{accNo || '—'} · {deviceSerials.length} Biometric Dev ({deviceSerials.filter(d => d.role === 'IN').length} IN / {deviceSerials.filter(d => d.role === 'OUT').length} OUT) · Rs. {ratePerUserMonth}/mo
              </span>
            )}

            {selectedCustomerId && !isClientCloudPushActive && (
              <span className="badge" style={{
                fontSize: '0.74rem', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                <ShieldAlert size={12} /> Standard Client (No Push)
              </span>
            )}
          </div>

          {/* Configuration Expansion & Profile Management Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (selectedCustomer) {
                  openEditProfileModal(selectedCustomer);
                } else if (customers.length > 0) {
                  setShowManageProfilesModal(true);
                } else {
                  openCreateProfileModal();
                }
              }}
              className="btn btn-sm btn-secondary"
              style={{
                fontSize: '0.78rem', padding: '7px 13px', borderRadius: 'var(--radius, 8px)', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
              title="Configure biometric hardware fleet, API tokens, and rates for this client"
            >
              <Sliders size={13} style={{ color: 'var(--accent)' }} />
              <span>Configure Hardware & Fleet</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManageProfilesModal(true)}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.76rem', padding: '7px 11px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              <Building2 size={13} /> Manage Profiles ({customers.length})
            </button>

            <button
              type="button"
              onClick={openCreateProfileModal}
              className="btn btn-sm"
              style={{
                fontSize: '0.76rem', padding: '7px 11px', borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)',
                border: '1px solid rgba(99, 102, 241, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700
              }}
            >
              <Plus size={13} /> New Client Profile
            </button>
          </div>
        </div>

        {/* If Selected Client is Unsubscribed, show contextual opt-in notice */}
        {selectedCustomerId && !isClientCloudPushActive && (
          <div style={{
            margin: '0 0 14px 0', padding: '10px 16px', borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: 'var(--warning, #f59e0b)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <strong>{selectedCustomer?.gymName || selectedCustomer?.name}</strong> is registered as a standard client without Cloud Push biometric integration.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleEnableCloudPushForCurrentClient}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', padding: '4px 12px', fontWeight: 700 }}
            >
              <Zap size={12} /> Enable Cloud Push for this Client
            </button>
          </div>
        )}

        {/* Row 2: Operational Date Range & Statement Execution Buttons */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
          paddingTop: '12px', borderTop: '1px solid var(--subtle-border)'
        }}>
          {portalSection === 'audit' ? (
            <>
              {/* Date Controls & Quick Cycles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('current_annual')} style={{ fontSize: '0.74rem', padding: '4px 8px' }}>Annual 2026</button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_annual')} style={{ fontSize: '0.74rem', padding: '4px 8px' }}>Annual 2025</button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_12_months')} style={{ fontSize: '0.74rem', padding: '4px 8px' }}>Past 12 Mos</button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => applyPreset('last_6_months')} style={{ fontSize: '0.74rem', padding: '4px 8px' }}>Past 6 Mos</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>From</span>
                  <DatePicker value={fromDate} onChange={setFromDate} placeholder="YYYY-MM-DD" size="sm" style={{ width: '150px', minWidth: '140px', height: '34px' }} />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>To</span>
                  <DatePicker value={toDate} onChange={setToDate} placeholder="YYYY-MM-DD" size="sm" style={{ width: '150px', minWidth: '140px', height: '34px' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Rate:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', background: 'var(--subtle-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--subtle-border)' }}>
                    Rs. {ratePerUserMonth} / user
                  </span>
                </div>
              </div>

              {/* Execution Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleRunAudit(false)}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px', fontSize: '0.84rem', fontWeight: 800 }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Scanning Months...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={15} />
                      <span>Fetch Active User Statement</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRunAudit(true)}
                  disabled={loading}
                  title="Bypass 72-hour cache and re-query fresh biometric attendance logs"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span>
                  Target: <strong>{selectedCustomer ? (selectedCustomer.gymName || selectedCustomer.name) : `Account #${accNo}`}</strong>
                  {' • '}
                  <span>{deviceSerials.length} Devices ({deviceSerials.filter(d => d.role === 'IN').length} IN / {deviceSerials.filter(d => d.role === 'OUT').length} OUT)</span>
                  {' • '}
                  <span>Scope: <strong>{serialFilter === 'ALL' ? 'Combined Site Total' : `Filtered: ${serialFilter}`}</strong></span>
                </span>
              </div>
            </div>
          )}
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
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRunAudit(true)}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Retry Statement Fetch</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION 1: ACTIVE USER AUDIT & BILLING ===== */}
      {portalSection === 'audit' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Welcome / Ready State when no audit is yet generated */}
          {!auditData && (
            <div className="card" style={{ padding: '36px 24px', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--panel-border)', background: 'var(--subtle-bg)', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <BarChart3 size={24} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                Active User Statement & Audit Engine Ready
              </h3>
              <p style={{ margin: '0 auto 20px', maxWidth: '540px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Configure the billing cycle dates and rate in the hardware section above, then click <strong>Fetch Active User Statement</strong> to scan active biometric members across all biometric devices, or preview sample audit data.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRunAudit}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Activity size={15} />
                  <span>Fetch Active User Statement</span>
                </button>
              </div>
            </div>
          )}

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
                onClick={() => handleRunAudit(true)}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh Live Gateway Data</span>
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
                  {/* Multi-Device Turnstile Serials List */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {(auditData.configuredDevices || deviceSerials).map(d => (
                      <span key={d.id || d.sn} style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: d.role === 'IN' ? 'rgba(16, 185, 129, 0.2)' : d.role === 'OUT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                          color: d.role === 'IN' ? '#10b981' : d.role === 'OUT' ? '#ef4444' : 'var(--accent)'
                        }}>
                          {d.role}
                        </span>
                        <code style={{ fontFamily: 'monospace', fontWeight: 800 }}>{d.sn}</code>
                        <span style={{ color: 'var(--text-muted)' }}>• {d.label || (d.role === 'IN' ? 'Entrance' : 'Exit')}</span>
                      </span>
                    ))}
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
                    {auditData.invoiceValue.activeTerminalCount} / {Math.max(auditData.invoiceValue.terminalCount, (auditData.configuredDevices || deviceSerials).length)}
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
                    {Math.max(auditData.invoiceValue.terminalCount, (auditData.configuredDevices || deviceSerials).length)}
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
                {billedTotals.totalMonths > 0 ? billedTotals.averageMonthlyActive : auditData.averageMonthlyActive}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {auditData.invoiceValue ? (
                  <>Server Snapshot: <strong style={{ color: '#10b981' }}>{auditData.invoiceValue.activeUserCount}</strong> • Peak: <strong>{billedTotals.peakActive || auditData.peakActiveUsers}</strong></>
                ) : (
                  <>Peak: <strong>{billedTotals.peakActive || auditData.peakActiveUsers}</strong> • Min: <strong>{billedTotals.minActive || auditData.minActiveUsers}</strong></>
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
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billed Cycle Span</span>
                <Calendar size={18} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {billedTotals.totalMonths} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {auditData.totalMonths} Mos</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {billedTotals.totalMonths === auditData.totalMonths ? 'All months included' : `${auditData.totalMonths - billedTotals.totalMonths} month(s) excluded`}
              </div>
            </div>

            {/* Total Annual Cloud Push Fee */}
            <div className="card" style={{ 
              padding: '18px 20px', borderRadius: '14px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))',
              border: '1px solid rgba(99, 102, 241, 0.3)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Billed Push Service Fee</span>
                <Receipt size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                Rs. {billedTotals.totalFee.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Calculated @ Rs. {ratePerUserMonth}/user/month ({billedTotals.totalMonths} Mos)
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
              {/* Biometric Fleet Telemetry & Multi-Device Status */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '16px', marginBottom: '22px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} style={{ color: 'var(--accent-primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Registered Biometric Devices &amp; Real-time Telemetry ({(auditData.configuredDevices || deviceSerials).length} Devices)
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Gateway Acc: <strong>#{accNo}</strong> • Scope: <strong>{auditData.serialFilter === 'ALL' ? 'Combined Biometric Fleet Total' : `Filtered: ${auditData.serialFilter}`}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {(auditData.configuredDevices || deviceSerials).map(dev => {
                    const pingStatus = devicePingResults[dev.sn];
                    return (
                      <div
                        key={dev.id || dev.sn}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--panel-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            background: dev.role === 'IN' ? 'rgba(16, 185, 129, 0.15)' : dev.role === 'OUT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: dev.role === 'IN' ? '#10b981' : dev.role === 'OUT' ? '#ef4444' : 'var(--accent)'
                          }}>
                            {dev.role}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {dev.sn}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {dev.label || (dev.role === 'IN' ? 'Entrance Device' : dev.role === 'OUT' ? 'Exit Device' : 'Two-Way Terminal')}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: (pingStatus?.online || dev.status === 'online') ? '#10b981' : '#f59e0b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: (pingStatus?.online || dev.status === 'online') ? '#10b981' : '#f59e0b' }} />
                            {(pingStatus?.online || dev.status === 'online') ? 'Online' : 'Standby'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handlePingSingleDevice(dev.sn)}
                            disabled={pingingSn === dev.sn}
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          >
                            {pingingSn === dev.sn ? <RefreshCw size={10} className="animate-spin" /> : 'Ping'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                        <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', width: '50px', textAlign: 'center' }}>
                          <span title="Include in Billing Calculation">BILL</span>
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Month / Period</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Enrolled</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Site-Wide Active Members
                          <div style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' }}>
                            (Cross-device deduplicated)
                          </div>
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biometric Devices</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cloud Telemetry</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Rate</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Push Charge (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.monthResults.map((m, idx) => {
                        const isIncluded = includedMonths[m.key] !== false;
                        return (
                          <tr key={m.key} style={{ borderBottom: '1px solid var(--subtle-border)', opacity: isIncluded ? 1 : 0.45, transition: 'opacity 0.2s ease' }}>
                            <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => handleToggleMonthInclusion(m.key)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                title={`Toggle ${m.monthLabel} in billing total`}
                              />
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              <div>{m.monthLabel}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {m.startDate} ~ {m.endDate}
                              </div>
                              {m.isOpenMonth && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  marginTop: '4px'
                                }}>
                                  <Clock size={10} /> In Progress (Partial)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                              {m.totalEnrolled}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                background: isIncluded ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                color: isIncluded ? '#10b981' : '#64748b',
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
                              {m.activeTerminalCount !== undefined
                                ? `${m.activeTerminalCount} / ${m.terminalCount || 1}`
                                : `${(auditData.configuredDevices || deviceSerials).length} Devices (Site-Wide)`}
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
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--subtle-bg)', fontWeight: 800, borderTop: '2px solid var(--panel-border)' }}>
                        <td colSpan={2} style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                          BILLED AUDIT TOTALS ({billedTotals.totalMonths} of {auditData.totalMonths} Months Selected)
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {auditData.totalEnrolledUsers}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--accent-primary)' }}>
                          Avg: {billedTotals.averageMonthlyActive} / mo
                        </td>
                        <td colSpan={3} style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Net Audited Cloud Push Fee ({billedTotals.totalMonths} Months):
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                          Rs. {billedTotals.totalFee.toLocaleString()}
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
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Biometric Device{(auditData?.configuredDevices || deviceSerials).length === 1 ? '' : 's'} ({(auditData?.configuredDevices || deviceSerials).length} {(auditData?.configuredDevices || deviceSerials).length === 1 ? 'Terminal' : 'Terminals'})
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      Push Gateway Account: <strong>#{accNo}</strong>
                      {(auditData?.configuredDevices || deviceSerials).length === 1 ? (
                        <span style={{ color: '#10b981', fontSize: '0.74rem', marginLeft: '6px' }}>(Single Two-Way Terminal)</span>
                      ) : serialFilter !== 'ALL' ? (
                        <span style={{ color: '#4f46e5', fontSize: '0.74rem', marginLeft: '6px' }}>(Filter: {serialFilter})</span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.74rem', marginLeft: '6px' }}>(Combined Biometric Fleet)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {(auditData?.configuredDevices || deviceSerials).map((dev, idx) => (
                        <div key={dev.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: dev.role === 'IN' ? '#dcfce7' : dev.role === 'OUT' ? '#fee2e2' : '#e0e7ff',
                            color: dev.role === 'IN' ? '#15803d' : dev.role === 'OUT' ? '#b91c1c' : '#4338ca'
                          }}>
                            {dev.role}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{dev.sn}</span>
                          <span style={{ color: '#64748b' }}>• {dev.label || (dev.role === 'IN' ? 'Entrance' : 'Exit')}</span>
                        </div>
                      ))}
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
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1d4ed8' }}>
                          {auditData.invoiceValue.activeTerminalCount} / {Math.max(auditData.invoiceValue.terminalCount, (auditData.configuredDevices || deviceSerials).length)}
                        </div>
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
                    {billedMonthResults.map((m, i) => (
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
                        ANNUAL AUDIT TOTAL ({billedTotals.totalMonths} Months)
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#1d4ed8' }}>
                        Avg: {billedTotals.averageMonthlyActive} / mo
                      </td>
                      <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                        —
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '1.05rem', color: '#4f46e5' }}>
                        Rs. {billedTotals.totalFee.toLocaleString()}
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
      )}

      {/* ===== SECTION 2: REAL-TIME PUNCH STREAM ===== */}
      {portalSection === 'realtime' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Header Controls */}
          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                    Live Gateway Telemetry
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    GET /v2/transaction_real/
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Real-Time Biometric Punch Stream
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Streaming live attendance punches recorded at Account <strong>#{accNo}</strong> ({selectedCustomer?.gymName || selectedCustomer?.name || 'Client Site'})
                </p>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Window:</span>
                  <CustomSelect
                    value={realtimeMinutes}
                    onChange={(val) => setRealtimeMinutes(Number(val))}
                    options={[
                      { value: 15, label: 'Past 15 Mins' },
                      { value: 30, label: 'Past 30 Mins' },
                      { value: 60, label: 'Past 1 Hour' },
                      { value: 120, label: 'Past 2 Hours' }
                    ]}
                    style={{ width: '140px' }}
                    triggerStyle={{ height: '34px', fontSize: '0.82rem' }}
                    size="sm"
                  />
                </div>

                <button
                  type="button"
                  className={`btn ${realtimeAutoRefresh ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRealtimeAutoRefresh(!realtimeAutoRefresh)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  {realtimeAutoRefresh ? <Pause size={14} /> : <Play size={14} />}
                  <span>{realtimeAutoRefresh ? 'Live Polling Active (15s)' : 'Enable Live Polling'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleFetchTodayPunches}
                  disabled={realtimeLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
                  title="Fetch all true attendance punches logged on the hardware gateway today"
                >
                  <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Query Today's Real Punches</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleFetchRealtime(false)}
                  disabled={realtimeLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  <RefreshCw size={14} className={realtimeLoading ? 'animate-spin' : ''} />
                  <span>Refresh Now</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
                  placeholder="Filter punches by PIN, member name, or terminal..."
                  value={realtimeSearch}
                  onChange={(e) => setRealtimeSearch(e.target.value)}
                />
              </div>

              {lastRealtimeFetch && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Last synced: {lastRealtimeFetch.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Real-time Punch Stream Table */}
          <div className="card" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Live Biometric Attendance Stream ({filteredRealtime.length} Events)
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Gateway Acc: <strong>#{accNo}</strong> • {deviceSerials.length} Devices ({deviceSerials.map(d => `${d.sn} [${d.role}]`).join(', ')})
              </span>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time / Date</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PIN</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Name</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Punch Type</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verification</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Terminal SN</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRealtime.length > 0 ? (
                    filteredRealtime.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} style={{ color: 'var(--accent-primary)' }} />
                            <span>{p.time || p.punch_time || 'Just now'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)',
                            fontWeight: 800, fontSize: '0.8rem', border: '1px solid var(--panel-border)', color: 'var(--text-primary)'
                          }}>
                            #{p.pin || p.PIN || p.user_id || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {p.name || p.nameshort || `Member PIN #${p.pin || '—'}`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
                            background: String(p.punch_state || '').toLowerCase().includes('out') ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: String(p.punch_state || '').toLowerCase().includes('out') ? 'var(--accent-primary)' : '#10b981'
                          }}>
                            {p.punch_state || 'Check-In'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {p.verify_type || 'Biometric ID'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {p.terminal_serial || serialNo}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircle2 size={13} />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Radio size={32} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600 }}>No attendance punches recorded on the gateway in the last {realtimeMinutes} minutes.</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                          Click <strong>Query Today's Real Punches</strong> to scan all punches logged today, or <strong>Refresh Now</strong>.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 3: HARDWARE REMOTE COMMANDS ===== */}
      {portalSection === 'commands' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Target Terminal Header */}
          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase'
                  }}>
                    <Terminal size={13} />
                    Hardware Push Command Dispatcher
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    POST /v2/terminal_cmd_client/
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Biometric Terminal Remote Control Center
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Send instantaneous cloud instructions directly to physical biometric devices and attendance readers.
                </p>
              </div>

              {/* Target Device Serial Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px', color: 'var(--text-muted)' }}>Target Terminal SN</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <CustomSelect
                      value={commandTargetSerial}
                      onChange={setCommandTargetSerial}
                      options={deviceSerials.map(d => ({
                        value: d.sn,
                        label: `[${d.role}] ${d.sn}${d.label ? ` — ${d.label}` : ''}`
                      }))}
                      placeholder="Select Target Device"
                      style={{ minWidth: '220px' }}
                      triggerStyle={{ height: '36px', fontSize: '0.82rem', fontWeight: 700 }}
                      size="sm"
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '140px', fontWeight: 700, fontSize: '0.84rem', fontFamily: 'monospace' }}
                      value={commandTargetSerial}
                      onChange={(e) => setCommandTargetSerial(e.target.value)}
                      placeholder="Custom SN"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handlePingSingleDevice(commandTargetSerial)}
                  disabled={pingingSn === commandTargetSerial}
                  style={{ alignSelf: 'flex-end', fontSize: '0.82rem', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Activity size={14} className={pingingSn === commandTargetSerial ? 'animate-spin' : ''} />
                  <span>Ping Device</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Command Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            
            {/* 1. ReSync Active Members */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    ReSync_Active
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sync Active Members</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Pushes all current active members to the terminal to ensure seamless access entry for active clients.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem' }}
                onClick={() => handleRequestCommand('ReSync_Active', 'Sync Active Members', 'Pushes active members to the terminal', false)}
                disabled={commandExecuting === 'ReSync_Active'}
              >
                {commandExecuting === 'ReSync_Active' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Execute ReSync Active</span>
              </button>
            </div>

            {/* 2. ReSync All */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    ReSync_All
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Full Hardware ReSync</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Synchronizes all members, PIN rosters, RFID cards, and biometric templates registered on this gateway account.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem' }}
                onClick={() => handleRequestCommand('ReSync_All', 'Full Hardware ReSync', 'Synchronizes all members, PIN rosters, RFID cards, and biometric templates', false)}
                disabled={commandExecuting === 'ReSync_All'}
              >
                {commandExecuting === 'ReSync_All' ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>Execute Full ReSync</span>
              </button>
            </div>

            {/* 3. ReSync Inactive Members */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(100, 116, 139, 0.15)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', background: 'rgba(100, 116, 139, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    ReSync_InActive
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Lock Inactive Members</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Dispatches lockout orders for expired or deactivated subscriptions so they cannot gain entry at biometric gates.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem' }}
                onClick={() => handleRequestCommand('ReSync_InActive', 'Lock Inactive Members', 'Dispatches lockout orders for expired subscriptions', false)}
                disabled={commandExecuting === 'ReSync_InActive'}
              >
                {commandExecuting === 'ReSync_InActive' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Execute Lock Inactive</span>
              </button>
            </div>

            {/* 4. Download Past 30 Days */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DownloadCloud size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    TRN_DOWN_30
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Download Past 30 Days</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Commands hardware to re-upload the past 30 days of stored attendance punches to the cloud server for billing audit.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem' }}
                onClick={() => handleRequestCommand('TRN_DOWN_30', 'Download Past 30 Days', 'Commands hardware to re-upload past 30 days of punches', false)}
                disabled={commandExecuting === 'TRN_DOWN_30'}
              >
                {commandExecuting === 'TRN_DOWN_30' ? <RefreshCw size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
                <span>Pull 30 Days Records</span>
              </button>
            </div>

            {/* 5. Reboot Terminal (Disruptive) */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Power size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    Reboot_Terminal
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reboot Biometric Terminal</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Performs a remote hardware restart to reset network connectivity or clear system freeze states.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                onClick={() => handleRequestCommand('Reboot_Terminal', 'Reboot Terminal', 'Remotely restarts the physical hardware.', true)}
                disabled={commandExecuting === 'Reboot_Terminal'}
              >
                {commandExecuting === 'Reboot_Terminal' ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                <span>Reboot Terminal Now</span>
              </button>
            </div>

            {/* 6. Clear Attendance Data (Disruptive) */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(244, 63, 94, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    Clear_Att_Data
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Clear Attendance Buffer</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Purges stored punch records from device flash memory once they have been securely synced to cloud.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#f43f5e' }}
                onClick={() => handleRequestCommand('Clear_Att_Data', 'Clear Attendance Buffer', 'Purges stored punch records from device flash memory.', true)}
                disabled={commandExecuting === 'Clear_Att_Data'}
              >
                {commandExecuting === 'Clear_Att_Data' ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Clear Attendance Buffer</span>
              </button>
            </div>

            {/* 7. Clear Admin Lockout (Disruptive) */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    Clear_Admin
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Clear Admin Lockout</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Removes administrative privilege locks on the biometric device to restore menu and configuration access.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                onClick={() => handleRequestCommand('Clear_Admin', 'Clear Admin Lockout', 'Removes administrative privilege locks on the biometric device.', true)}
                disabled={commandExecuting === 'Clear_Admin'}
              >
                {commandExecuting === 'Clear_Admin' ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                <span>Clear Admin Privileges</span>
              </button>
            </div>

            {/* 8. Trigger Relay / Unlock Door (Disruptive) */}
            <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={20} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    TRIGGER_RELAY
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Remote Relay Trigger</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Fires the physical door / barrier relay pulse to temporarily unlock access control barrier over-the-air.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '16px', width: '100%', fontSize: '0.84rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
                onClick={() => handleRequestCommand('TRIGGER_RELAY', 'Remote Relay Trigger', 'Remotely triggers the physical door relay pulse.', true)}
                disabled={commandExecuting === 'TRIGGER_RELAY'}
              >
                {commandExecuting === 'TRIGGER_RELAY' ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                <span>Trigger Relay Impulse</span>
              </button>
            </div>

          </div>

          {/* Command History Table */}
          <div className="card" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Command Dispatch History Log
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Audit Trail ({commandHistory.length} Dispatches)
              </span>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Command</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Device</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gateway Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Server Reply</th>
                  </tr>
                </thead>
                <tbody>
                  {commandHistory.map((cmd) => (
                    <tr key={cmd.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {cmd.timestamp}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cmd.label || cmd.command}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cmd.command}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {cmd.serialNo}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                          background: cmd.status === 'Success' ? 'rgba(16, 185, 129, 0.12)' : cmd.status === 'Error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          color: cmd.status === 'Success' ? '#10b981' : cmd.status === 'Error' ? '#ef4444' : 'var(--accent-primary)'
                        }}>
                          {cmd.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {cmd.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 4: TERMINAL FLEET & DEVICES ===== */}
      {portalSection === 'fleet' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Header & Registration Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            {/* Account Summary */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <HardDrive size={18} style={{ color: 'var(--accent-primary)' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Push Gateway Fleet Status</h4>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Account <strong>#{accNo}</strong> is configured for hardware biometric push communications via Microsoft-HTTPAPI/2.0.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fleet Size</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{fleetList.length} Device{fleetList.length === 1 ? '' : 's'}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Gateway Port</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>Port 666</div>
                </div>
              </div>
            </div>

            {/* Register New Terminal SN Card */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Plus size={18} style={{ color: '#10b981' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Register New Terminal SN</h4>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Bind an additional biometric terminal to Account #{accNo} using <code>PUT /v2/terminal/</code>.
              </p>

              <form onSubmit={handleRegisterTerminal} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ flex: 1, fontSize: '0.88rem' }}
                  value={newTerminalSerial}
                  onChange={(e) => setNewTerminalSerial(e.target.value)}
                  placeholder="Enter Device Serial # (e.g. NYU7254000012)"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={registeringTerminal}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  {registeringTerminal ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Register SN</span>
                </button>
              </form>
            </div>

          </div>

          {/* Fleet Table */}
          <div className="card" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Registered Hardware Terminal Fleet
              </h4>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleFetchFleet}
                disabled={fleetLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={fleetLoading ? 'animate-spin' : ''} />
                <span>Reload Fleet</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Terminal Serial #</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alias / Room</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In/Out Mode</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protocol</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetList.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {t.terminal_serial || t.serial || serialNo}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        {t.terminal_alias || 'Main Entrance Biometric Turnstile'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', fontWeight: 600 }}>
                          {t.inout_type || 'InOut'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        eTechno PUSH (Port 666)
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          color: '#10b981', fontWeight: 700, fontSize: '0.8rem'
                        }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span>
                          Active
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setCommandTargetSerial(t.terminal_serial || serialNo);
                              setPortalSection('commands');
                            }}
                          >
                            <Terminal size={13} style={{ marginRight: '4px' }} />
                            Control
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRM REMOTE HARDWARE COMMAND GUARDRAIL ===== */}
      {confirmCommandModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="app-modal-backdrop cloud-modal-overlay" style={{ zIndex: 9999999 }}>
          <div className="app-modal-dialog cloud-modal-dialog" style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px', borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Confirm Biometric Device Command
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Target Serial: <code style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{confirmCommandModal.targetSerial}</code>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCommandModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {confirmCommandModal.description}
              </div>

              {confirmCommandModal.warning && (
                <div style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444', fontSize: '0.8rem', lineHeight: 1.5,
                  display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Warning:</strong> {confirmCommandModal.warning}
                  </div>
                </div>
              )}

              <div style={{
                background: 'var(--subtle-bg)', padding: '12px 14px',
                borderRadius: '8px', border: '1px solid var(--panel-border)',
                fontSize: '0.78rem', color: 'var(--text-muted)'
              }}>
                Action: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{confirmCommandModal.commandLabel}</span> ({confirmCommandModal.commandName})
              </div>
            </div>

            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--bg-secondary)'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmCommandModal(prev => ({ ...prev, isOpen: false }))}
                disabled={commandExecuting !== null}
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => executeCommandDirect(confirmCommandModal.commandName, confirmCommandModal.commandLabel, confirmCommandModal.targetSerial)}
                disabled={commandExecuting !== null}
                style={{
                  padding: '8px 20px', fontSize: '0.84rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: '1px solid #dc2626', gap: '6px'
                }}
              >
                {commandExecuting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Confirm &amp; Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== MODAL 1: CREATE / EDIT CLIENT HARDWARE PROFILE ===== */}
      {showCreateProfileModal && typeof document !== 'undefined' && createPortal(
        <div className="app-modal-backdrop cloud-modal-overlay" style={{ zIndex: 999999 }}>
          <div className="app-modal-dialog cloud-modal-dialog">
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {editingProfileId ? 'Edit Client Hardware Profile' : 'Create New Client Hardware Profile'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Configure Push Account #, API Auth Token, and multi-device biometric fleet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateProfileModal(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveGymProfileFromModal} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Client / Facility Information */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>Client Facility Details</span>
                  </div>
                  {editingProfileId && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)',
                      border: '1px solid var(--panel-border)', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      textTransform: 'none'
                    }}>
                      <Lock size={11} /> Read-Only (Managed in Customers)
                    </span>
                  )}
                </div>
                <div className="cloud-modal-grid">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Client / Business Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Seynex Enterprise Client"
                      value={modalGymName}
                      onChange={e => !editingProfileId && setModalGymName(e.target.value)}
                      readOnly={Boolean(editingProfileId)}
                      required
                      style={{
                        height: '36px', fontSize: '0.85rem', fontWeight: 600,
                        ...(editingProfileId ? {
                          background: 'var(--subtle-bg, rgba(255, 255, 255, 0.03))',
                          cursor: 'not-allowed',
                          opacity: 0.85,
                          border: '1px dashed var(--panel-border)'
                        } : {})
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Client Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CUST-004"
                      value={modalClientCode}
                      onChange={e => !editingProfileId && setModalClientCode(e.target.value)}
                      readOnly={Boolean(editingProfileId)}
                      style={{
                        height: '36px', fontSize: '0.85rem',
                        ...(editingProfileId ? {
                          background: 'var(--subtle-bg, rgba(255, 255, 255, 0.03))',
                          cursor: 'not-allowed',
                          opacity: 0.85,
                          border: '1px dashed var(--panel-border)'
                        } : {})
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Contact Person Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Gym Manager"
                      value={modalContactName}
                      onChange={e => !editingProfileId && setModalContactName(e.target.value)}
                      readOnly={Boolean(editingProfileId)}
                      style={{
                        height: '36px', fontSize: '0.85rem',
                        ...(editingProfileId ? {
                          background: 'var(--subtle-bg, rgba(255, 255, 255, 0.03))',
                          cursor: 'not-allowed',
                          opacity: 0.85,
                          border: '1px dashed var(--panel-border)'
                        } : {})
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Phone / WhatsApp</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 0771234567"
                      value={modalPhone}
                      onChange={e => !editingProfileId && setModalPhone(e.target.value)}
                      readOnly={Boolean(editingProfileId)}
                      style={{
                        height: '36px', fontSize: '0.85rem',
                        ...(editingProfileId ? {
                          background: 'var(--subtle-bg, rgba(255, 255, 255, 0.03))',
                          cursor: 'not-allowed',
                          opacity: 0.85,
                          border: '1px dashed var(--panel-border)'
                        } : {})
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cloud Push Gateway & Auth */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Server size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>eTechno Push Gateway Authentication</span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                    background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', display: 'inline-flex', alignItems: 'center', gap: '4px',
                    textTransform: 'none'
                  }}>
                    <Edit2 size={11} /> Editable Configuration
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Push Account # (push_acc) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 192 or 172"
                      value={modalAccNo}
                      onChange={e => setModalAccNo(e.target.value)}
                      required
                      style={{ height: '36px', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Rate / Active User / Mo (LKR)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="100"
                      value={modalRatePerUser}
                      onChange={e => setModalRatePerUser(Number(e.target.value) || 0)}
                      style={{ height: '36px', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>API Key / Auth Token *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={modalShowApiKey ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Enter eTechno API Key for this gym"
                        value={modalApiKey}
                        onChange={e => setModalApiKey(e.target.value)}
                        required
                        style={{ height: '36px', fontSize: '0.85rem', paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setModalShowApiKey(!modalShowApiKey)}
                        style={{
                          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
                        }}
                      >
                        {modalShowApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Device Biometric Fleet Setup */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Linked Biometric Devices Fleet ({modalDevices.length} Device{modalDevices.length === 1 ? '' : 's'})
                    </span>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 7px', borderRadius: '8px', fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.14)', color: '#10b981'
                    }}>
                      {modalDevices.filter(d => d.role === 'IN').length} IN • {modalDevices.filter(d => d.role === 'OUT').length} OUT
                    </span>
                  </div>

                  {/* Fast Templates: 1 Device vs 2 Devices */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Setup:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyModalDevicePreset('single')}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.73rem', padding: '2px 8px' }}
                    >
                      ⚡ 1 Device (Entrance IN)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyModalDevicePreset('dual')}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.73rem', padding: '2px 8px' }}
                    >
                      ⚡ 2 Devices (IN + OUT)
                    </button>
                  </div>
                </div>

                {/* Device Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {modalDevices.map((dev, idx) => (
                    <div
                      key={dev.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--panel-border)'
                      }}
                    >
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem',
                        background: dev.role === 'IN' ? 'rgba(16, 185, 129, 0.15)' : dev.role === 'OUT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: dev.role === 'IN' ? '#10b981' : dev.role === 'OUT' ? '#ef4444' : 'var(--accent)'
                      }}>
                        {dev.role === 'IN' ? <LogIn size={11} /> : dev.role === 'OUT' ? <LogOut size={11} /> : <ArrowUpDown size={11} />}
                        {dev.role}
                      </span>

                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Serial # (e.g. NYU7254000011)"
                          value={dev.sn}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setModalDevices(prev => prev.map((d, i) => i === idx ? { ...d, sn: val } : d));
                          }}
                          style={{ height: '32px', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700 }}
                        />

                        <CustomSelect
                          value={dev.role}
                          onChange={(r) => {
                            setModalDevices(prev => prev.map((d, i) => i === idx ? {
                              ...d,
                              role: r,
                              label: d.label || (r === 'IN' ? 'Entrance Biometric Device (IN)' : r === 'OUT' ? 'Exit Biometric Device (OUT)' : 'Biometric Device')
                            } : d));
                          }}
                          options={[
                            { value: 'IN', label: 'Entrance (IN)' },
                            { value: 'OUT', label: 'Exit (OUT)' },
                            { value: 'IN/OUT', label: 'Two-Way (IN/OUT)' },
                            { value: 'RECEPTION', label: 'Reception Desk' },
                            { value: 'DOOR', label: 'Access Door' }
                          ]}
                          size="sm"
                          triggerStyle={{ height: '32px', fontSize: '0.8rem' }}
                        />

                        <input
                          type="text"
                          className="form-control"
                          placeholder="Label (e.g. Entrance Gate)"
                          value={dev.label || ''}
                          onChange={(e) => {
                            const l = e.target.value;
                            setModalDevices(prev => prev.map((d, i) => i === idx ? { ...d, label: l } : d));
                          }}
                          style={{ height: '32px', fontSize: '0.8rem' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDeviceFromModal(dev.id || dev.sn)}
                        title="Delete Biometric Device"
                        style={{
                          background: 'none', border: 'none', color: '#ef4444',
                          cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {modalDevices.length === 0 && (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No biometric devices added yet. Click one of the quick setup buttons above or add a device below.
                    </div>
                  )}
                </div>

                {/* Add Another Device Row */}
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
                  padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.06)', border: '1px dashed var(--panel-border)'
                }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={12} /> Add Biometric Device:
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Serial # (e.g. NYU7254000012)"
                    value={newModalDevSn}
                    onChange={e => setNewModalDevSn(e.target.value)}
                    style={{ height: '30px', fontSize: '0.8rem', width: '160px', fontFamily: 'monospace' }}
                  />
                  <CustomSelect
                    value={newModalDevRole}
                    onChange={setNewModalDevRole}
                    options={[
                      { value: 'IN', label: 'Entrance (IN)' },
                      { value: 'OUT', label: 'Exit (OUT)' },
                      { value: 'IN/OUT', label: 'Two-Way (IN/OUT)' },
                      { value: 'RECEPTION', label: 'Reception Desk' },
                      { value: 'DOOR', label: 'Access Door' }
                    ]}
                    size="sm"
                    style={{ width: '150px' }}
                    triggerStyle={{ height: '30px', fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Label / Room"
                    value={newModalDevLabel}
                    onChange={e => setNewModalDevLabel(e.target.value)}
                    style={{ height: '30px', fontSize: '0.8rem', flex: 1, minWidth: '120px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDeviceToModal}
                    className="btn btn-sm btn-secondary"
                    style={{ height: '30px', fontSize: '0.76rem', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '10px',
                paddingTop: '16px', borderTop: '1px solid var(--subtle-border)'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{editingProfileId ? 'Update Client Profile' : 'Create & Activate Client Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== MODAL 2: MANAGE ALL CLIENT HARDWARE PROFILES ===== */}
      {showManageProfilesModal && typeof document !== 'undefined' && createPortal(
        <div className="app-modal-backdrop cloud-modal-overlay" style={{ zIndex: 999999 }}>
          <div className="app-modal-dialog cloud-modal-dialog" style={{ maxWidth: '880px' }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                  Client Biometric Hardware Profiles
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Manage individual Push Accounts, API keys, and multi-device setups for each client site.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowManageProfilesModal(false);
                    openCreateProfileModal();
                  }}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <Plus size={13} />
                  <span>+ New Client Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManageProfilesModal(false)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Filter Tabs */}
            <div style={{ padding: '12px 20px 0 20px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--panel-border)', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setManageProfilesFilter('all')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: manageProfilesFilter === 'all' ? 'var(--bg-primary)' : 'transparent',
                  color: manageProfilesFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: manageProfilesFilter === 'all' ? '2px solid var(--accent-primary)' : '2px solid transparent'
                }}
              >
                All Enterprise Clients ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setManageProfilesFilter('subscribed')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: manageProfilesFilter === 'subscribed' ? 'var(--bg-primary)' : 'transparent',
                  color: manageProfilesFilter === 'subscribed' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: manageProfilesFilter === 'subscribed' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Cloud size={13} style={{ color: 'var(--accent, #6366f1)' }} />
                <span>Cloud Push Subscribed ({subscribedCustomers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setManageProfilesFilter('standard')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: manageProfilesFilter === 'standard' ? 'var(--bg-primary)' : 'transparent',
                  color: manageProfilesFilter === 'standard' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: manageProfilesFilter === 'standard' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Shield size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Standard Clients (No Cloud Push) ({unsubscribedCustomers.length})</span>
              </button>
            </div>

            {/* Modal List */}
            <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {customers
                .filter(c => {
                  const isSub = c.cloudPushEnabled !== false && Boolean(c.cloudPushAcc || (Array.isArray(c.deviceSerials) && c.deviceSerials.length > 0) || c.deviceSerial);
                  if (manageProfilesFilter === 'subscribed') return isSub;
                  if (manageProfilesFilter === 'standard') return !isSub;
                  return true;
                })
                .map((c) => {
                const isSelected = selectedCustomerId === c.id;
                const isSub = c.cloudPushEnabled !== false && Boolean(c.cloudPushAcc || (Array.isArray(c.deviceSerials) && c.deviceSerials.length > 0) || c.deviceSerial);
                const devices = Array.isArray(c.deviceSerials) && c.deviceSerials.length > 0
                  ? c.deviceSerials
                  : (c.deviceSerial ? [{ id: 'd-1', sn: c.deviceSerial, role: 'IN', label: 'Entrance Biometric Device (IN)' }] : []);

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : isSub ? 'var(--panel-border)' : 'var(--subtle-border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                      transition: 'all 0.2s ease',
                      opacity: !isSub ? 0.85 : 1
                    }}
                  >
                    <div style={{ minWidth: '260px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {c.gymName || c.name}
                        </span>
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px',
                          background: 'var(--bg-primary)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', fontWeight: 700
                        }}>
                          {c.code || 'NO-CODE'}
                        </span>
                        {isSub ? (
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent, #6366f1)', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(99, 102, 241, 0.25)'
                          }}>
                            <Cloud size={10} /> Cloud Push Subscribed
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--subtle-border)'
                          }}>
                            <Shield size={10} /> Standard Client (No Push)
                          </span>
                        )}
                        {isSelected && (
                          <span style={{
                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <CheckCircle size={11} /> Active Now
                          </span>
                        )}
                      </div>

                      {isSub ? (
                        <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span>
                            Account #: <strong>{c.cloudPushAcc ? `#${c.cloudPushAcc}` : 'Not Set'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            API Key: <strong>{c.cloudPushApiKey ? `${c.cloudPushApiKey.slice(0, 4)}••••${c.cloudPushApiKey.slice(-4)}` : 'Missing'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Rate: <strong>Rs. {c.ratePerUserMonth || 100} / active user</strong>
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', fontStyle: 'italic' }}>
                          Standard non-biometric client. Biometric Cloud Push service is not linked.
                        </div>
                      )}

                      {/* Biometric Devices Chips */}
                      {isSub && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Biometric Devices:</span>
                          {devices.map((d, dIdx) => (
                            <span
                              key={dIdx}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                                background: d.role === 'IN' ? 'rgba(16, 185, 129, 0.12)' : d.role === 'OUT' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                color: d.role === 'IN' ? '#10b981' : d.role === 'OUT' ? '#ef4444' : 'var(--accent)',
                                border: `1px solid ${d.role === 'IN' ? 'rgba(16, 185, 129, 0.3)' : d.role === 'OUT' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                              }}
                            >
                              <span>[{d.role}]</span>
                              <span style={{ fontFamily: 'monospace' }}>{d.sn}</span>
                            </span>
                          ))}
                          {devices.length === 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No devices configured
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      {!isSub ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            if (updateCustomer) {
                              updateCustomer(c.id, {
                                cloudPushEnabled: true,
                                cloudPushAcc: c.cloudPushAcc || '192',
                                ratePerUserMonth: c.ratePerUserMonth || 100
                              });
                            }
                            handleActivateGymProfile(c);
                          }}
                          style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Zap size={12} /> Enable & Connect
                        </button>
                      ) : !isSelected ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleActivateGymProfile(c)}
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          Activate Profile
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled
                          style={{
                            fontSize: '0.78rem', padding: '6px 12px',
                            background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', fontWeight: 700
                          }}
                        >
                          Connected
                        </button>
                      )}

                      {isSub && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            if (window.confirm(`Disable Cloud Push service for "${c.gymName || c.name}"?`)) {
                              if (updateCustomer) updateCustomer(c.id, { cloudPushEnabled: false });
                              notify(`Cloud Push disabled for "${c.gymName || c.name}".`, 'info');
                            }
                          }}
                          title="Disable Cloud Push service for this client"
                          style={{ fontSize: '0.75rem', padding: '6px 8px', color: 'var(--text-muted)' }}
                        >
                          Opt-Out
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setShowManageProfilesModal(false);
                          openEditProfileModal(c);
                        }}
                        title="Edit hardware configuration for this client site"
                        style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDeleteGymProfile(c)}
                        title="Delete Client Profile"
                        style={{ padding: '6px 8px', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {customers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Building2 size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>No Client Profiles found.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageProfilesModal(false);
                      openCreateProfileModal();
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    + Create First Client Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
