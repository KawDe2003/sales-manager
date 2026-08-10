import React, { useContext, useState, useEffect } from 'react';
import { 
  Users, DollarSign, Calendar, Plus, Search, CheckCircle2, FileText, 
  Trash2, Edit, X, Calculator, ShieldCheck, Printer, Download, UserPlus,
  Briefcase, Building, Wallet, TrendingUp, Clock, AlertCircle, Check, Eye
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';

const HR = () => {
  const { 
    employees = [], addEmployee, updateEmployee, deleteEmployee,
    payruns = [], processPayrun, confirmAction, showNotification,
    attendanceLogs = [], markAttendance, getMonthlyAttendanceSummary
  } = useContext(StoreContext) || {};

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance' | 'payruns'
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Attendance Form State
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attSheet, setAttSheet] = useState([]);

  // Modals
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPayrunModal, setShowPayrunModal] = useState(false);
  const [viewingPayrun, setViewingPayrun] = useState(null);
  const [viewingPayslip, setViewingPayslip] = useState(null);

  // Employee Form State
  const [empForm, setEmpForm] = useState({
    employeeId: '',
    name: '',
    designation: 'Fitness Trainer',
    department: 'Fitness & Training',
    phone: '',
    email: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 75000,
    allowance: 10000,
    epfEligible: true,
    bankDetails: ''
  });

  // Payrun Form State
  const [payrunMonth, setPayrunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrunCalcList, setPayrunCalcList] = useState([]);

  // Initialize Daily Attendance Sheet whenever attDate changes
  useEffect(() => {
    const activeStaff = employees.filter(e => e.status !== 'Inactive');
    const sheet = activeStaff.map(emp => {
      const existing = attendanceLogs.find(a => a.employeeId === emp.id && a.date === attDate);
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeId,
        designation: emp.designation,
        status: existing ? existing.status : 'Present',
        checkIn: existing ? existing.checkIn : '08:30',
        checkOut: existing ? existing.checkOut : '17:00',
        otHours: existing ? (existing.otHours || 0) : 0
      };
    });
    setAttSheet(sheet);
  }, [attDate, employees, attendanceLogs]);

  // High-level HR Metrics
  const activeStaff = employees.filter(e => e.status !== 'Inactive');
  const totalMonthlyBasic = activeStaff.reduce((sum, e) => sum + (Number(e.basicSalary) || 0) + (Number(e.allowance) || 0), 0);
  const totalEpfEmployerMonthly = activeStaff.reduce((sum, e) => sum + (e.epfEligible ? (Number(e.basicSalary) * 0.12) : 0), 0);
  const totalEtfEmployerMonthly = activeStaff.reduce((sum, e) => sum + (e.epfEligible ? (Number(e.basicSalary) * 0.03) : 0), 0);

  // Filter Employees
  const filteredEmployees = employees.filter(e => {
    const searchMatch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = deptFilter === 'All' || e.department === deptFilter;
    return searchMatch && deptMatch;
  });

  const handleSaveEmployee = (e) => {
    e.preventDefault();
    if (!empForm.name.trim()) {
      showNotification('Please enter employee name', 'error');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, empForm);
    } else {
      addEmployee(empForm);
    }

    setShowEmpModal(false);
    setEditingEmployee(null);
    setEmpForm({
      employeeId: '',
      name: '',
      designation: 'Fitness Trainer',
      department: 'Fitness & Training',
      phone: '',
      email: '',
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: 75000,
      allowance: 10000,
      epfEligible: true,
      bankDetails: ''
    });
  };

  const handleSaveAttendanceSheet = () => {
    const records = attSheet.map(item => ({
      employeeId: item.employeeId,
      date: attDate,
      status: item.status,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      otHours: Number(item.otHours) || 0
    }));

    markAttendance(records);
  };

  const updateAttRow = (idx, field, value) => {
    const updated = [...attSheet];
    updated[idx][field] = value;
    setAttSheet(updated);
  };

  const openPayrunModal = () => {
    const calcs = activeStaff.map(emp => {
      const basic = Number(emp.basicSalary) || 0;
      const allow = Number(emp.allowance) || 0;
      const bonus = 0;

      // Attendance summary for selected month
      const attSummary = getMonthlyAttendanceSummary ? getMonthlyAttendanceSummary(emp.id, payrunMonth) : { present: 26, absent: 0, otHours: 0 };
      const daysAbsent = attSummary.absent || 0;
      const otHours = attSummary.otHours || 0;

      // Rate calculations
      const dailyRate = basic / 26;
      const otHourlyRate = (basic / 208) * 1.5; // 1.5x OT rate based on 208 monthly standard hours

      const otPay = Math.round(otHours * otHourlyRate);
      const absenceDeduction = Math.round(daysAbsent * dailyRate);

      const gross = Math.max(0, basic + allow + bonus + otPay - absenceDeduction);
      const epfEmployee = emp.epfEligible ? Math.round(basic * 0.08) : 0;
      const epfEmployer = emp.epfEligible ? Math.round(basic * 0.12) : 0;
      const etfEmployer = emp.epfEligible ? Math.round(basic * 0.03) : 0;
      const netSalary = Math.max(0, gross - epfEmployee);

      return {
        employeeId: emp.id,
        empCode: emp.employeeId,
        name: emp.name,
        designation: emp.designation,
        basic,
        allow,
        bonus,
        otHours,
        otPay,
        daysAbsent,
        absenceDeduction,
        attSummary,
        grossSalary: gross,
        epfEmployee,
        epfEmployer,
        etfEmployer,
        netSalary
      };
    });

    setPayrunCalcList(calcs);
    setShowPayrunModal(true);
  };

  const updatePayrunBonus = (index, bonusVal) => {
    const updated = [...payrunCalcList];
    const b = Number(bonusVal) || 0;
    updated[index].bonus = b;
    updated[index].grossSalary = Math.max(0, updated[index].basic + updated[index].allow + b + updated[index].otPay - updated[index].absenceDeduction);
    updated[index].netSalary = Math.max(0, updated[index].grossSalary - updated[index].epfEmployee);
    setPayrunCalcList(updated);
  };

  const handleExecutePayrun = () => {
    if (payrunCalcList.length === 0) {
      showNotification('No active employees to process', 'error');
      return;
    }

    processPayrun({
      month: payrunMonth,
      payrunDate: new Date().toISOString().split('T')[0],
      employeeCalculations: payrunCalcList
    });

    setShowPayrunModal(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      
      {/* ===== HERO HEADER ===== */}
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)'
              }}>
                <Users size={20} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                HR & Payroll ERP with Attendance
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Attendance tracking, OT/absence auto-calculations, EPF/ETF statutory compliance, and payroll ledger posting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="btn btn-secondary"
              onClick={openPayrunModal}
            >
              <Calculator size={16} /> Run Monthly Payroll
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingEmployee(null);
                setEmpForm({
                  employeeId: `EMP-${100 + employees.length + 1}`,
                  name: '',
                  designation: 'Fitness Trainer',
                  department: 'Fitness & Training',
                  phone: '',
                  email: '',
                  joinDate: new Date().toISOString().split('T')[0],
                  basicSalary: 75000,
                  allowance: 10000,
                  epfEligible: true,
                  bankDetails: ''
                });
                setShowEmpModal(true);
              }}
            >
              <UserPlus size={16} /> Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* ===== KPI OVERVIEW CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--accent-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MONTHLY BASIC PAYROLL</span>
            <Wallet size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            LKR {totalMonthlyBasic.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Basic + Fixed Allowances
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--success)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACTIVE STAFF</span>
            <Users size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeStaff.length} Employees
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Registered on Active Payroll
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--info)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>EMPLOYER EPF (12%)</span>
            <ShieldCheck size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--info)' }}>
            LKR {totalEpfEmployerMonthly.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Statutory EPF Liability
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', borderBottom: '3px solid var(--warning)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ATTENDANCE LOGS</span>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {attendanceLogs.length} Records
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Logged Shift Entries
          </div>
        </div>
      </div>

      {/* ===== TABS & SEARCH BAR ===== */}
      <div className="glass-panel mb-6" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div style={{ display: 'flex', gap: '6px', background: 'var(--subtle-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            <button 
              onClick={() => setActiveTab('directory')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'directory' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'directory' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'directory' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Staff Directory ({employees.length})
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'attendance' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'attendance' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Daily Attendance Sheet
            </button>
            <button 
              onClick={() => setActiveTab('payruns')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: activeTab === 'payruns' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'payruns' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'payruns' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Payroll Payruns ({payruns.length})
            </button>
          </div>

          <div className="flex items-center gap-3 width-full md:width-auto">
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search Staff, Designations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {activeTab === 'directory' && (
              <CustomSelect 
                value={deptFilter}
                onChange={(val) => setDeptFilter(val)}
                options={[
                  { value: 'All', label: 'All Departments' },
                  { value: 'Fitness & Training', label: 'Fitness & Training' },
                  { value: 'Management', label: 'Management' },
                  { value: 'Operations & Front Desk', label: 'Operations & Front Desk' },
                  { value: 'Maintenance', label: 'Maintenance' }
                ]}
                style={{ height: '38px', width: '170px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== TAB 1: STAFF DIRECTORY ===== */}
      {activeTab === 'directory' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>STAFF ID</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DESIGNATION</th>
                  <th>DEPARTMENT</th>
                  <th>BASIC SALARY</th>
                  <th>ALLOWANCE</th>
                  <th>EST. NET PAY</th>
                  <th>EPF/ETF</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      No staff members found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const basic = Number(emp.basicSalary) || 0;
                    const allow = Number(emp.allowance) || 0;
                    const epfDed = emp.epfEligible ? basic * 0.08 : 0;
                    const estNet = (basic + allow) - epfDed;

                    return (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {emp.employeeId}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.phone || emp.email}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {emp.designation}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                            {emp.department}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            LKR {basic.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            LKR {allow.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                            LKR {estNet.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: emp.epfEligible ? 'rgba(34, 197, 94, 0.12)' : 'rgba(148, 163, 184, 0.12)', color: emp.epfEligible ? 'var(--success)' : 'var(--text-muted)' }}>
                            {emp.epfEligible ? 'EPF 8%/12%' : 'Exempt'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px' }}
                              onClick={() => {
                                setEditingEmployee(emp);
                                setEmpForm({ ...emp });
                                setShowEmpModal(true);
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)', padding: '6px' }}
                              onClick={() => {
                                confirmAction({
                                  title: 'Remove Employee',
                                  message: `Are you sure you want to remove ${emp.name} from active payroll?`,
                                  onConfirm: () => deleteEmployee(emp.id)
                                });
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 2: DAILY ATTENDANCE SHEET ===== */}
      {activeTab === 'attendance' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Daily Staff Attendance Log
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Log check-in, check-out, absences, and overtime hours for automated payroll processing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="form-label" style={{ margin: 0, fontSize: '0.72rem' }}>LOG DATE</label>
                <input 
                  type="date"
                  className="form-input"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  style={{ height: '38px', width: '160px' }}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleSaveAttendanceSheet}
                style={{ marginTop: '16px' }}
              >
                <Check size={16} /> Save Attendance
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>ATTENDANCE STATUS</th>
                  <th>CHECK IN</th>
                  <th>CHECK OUT</th>
                  <th>OVERTIME (HOURS)</th>
                </tr>
              </thead>
              <tbody>
                {attSheet.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No active staff registered for attendance logging.
                    </td>
                  </tr>
                ) : (
                  attSheet.map((row, idx) => (
                    <tr key={row.employeeId}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.employeeName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.employeeCode} — {row.designation}</div>
                      </td>
                      <td>
                        <CustomSelect 
                          value={row.status}
                          onChange={(val) => updateAttRow(idx, 'status', val)}
                          options={[
                            { value: 'Present', label: 'Present' },
                            { value: 'Absent', label: 'Absent (Unpaid)' },
                            { value: 'Half Day', label: 'Half Day' },
                            { value: 'On Leave', label: 'On Leave (Paid)' }
                          ]}
                          style={{ height: '36px', width: '160px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="time" 
                          className="form-input"
                          value={row.checkIn}
                          onChange={(e) => updateAttRow(idx, 'checkIn', e.target.value)}
                          style={{ height: '36px', width: '120px' }}
                          disabled={row.status === 'Absent' || row.status === 'On Leave'}
                        />
                      </td>
                      <td>
                        <input 
                          type="time" 
                          className="form-input"
                          value={row.checkOut}
                          onChange={(e) => updateAttRow(idx, 'checkOut', e.target.value)}
                          style={{ height: '36px', width: '120px' }}
                          disabled={row.status === 'Absent' || row.status === 'On Leave'}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input"
                          value={row.otHours}
                          onChange={(e) => updateAttRow(idx, 'otHours', e.target.value)}
                          style={{ height: '36px', width: '90px' }}
                          disabled={row.status === 'Absent' || row.status === 'On Leave'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 3: PAYROLL PAYRUNS ===== */}
      {activeTab === 'payruns' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PAYROLL MONTH</th>
                  <th>PAYRUN DATE</th>
                  <th>STAFF SLIPS</th>
                  <th>TOTAL GROSS</th>
                  <th>EMPLOYER EPF (12%)</th>
                  <th>EMPLOYER ETF (3%)</th>
                  <th>TOTAL NET SALARIES</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {payruns.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      No payroll payruns recorded. Click "Run Monthly Payroll" to disburse staff salaries.
                    </td>
                  </tr>
                ) : (
                  payruns.map(pr => (
                    <tr key={pr.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {pr.month}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {pr.payrunDate ? new Date(pr.payrunDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pr.slipsCount} Employees
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(pr.totalGross) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(pr.totalEpfEmployer) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(pr.totalEtfEmployer) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(pr.totalNet) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge status-paid">
                          {pr.status || 'Processed'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewingPayrun(pr)}
                        >
                          <FileText size={14} /> View Slips
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODAL: ADD / EDIT EMPLOYEE ===== */}
      {showEmpModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '540px', padding: 0, borderRadius: '20px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
            animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingEmployee ? 'Edit Staff Details' : 'Register New Employee'}
              </h3>
              <button onClick={() => setShowEmpModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">EMPLOYEE ID</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={empForm.employeeId}
                    onChange={(e) => setEmpForm({ ...empForm, employeeId: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">FULL NAME *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Kasun Rajapaksha"
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">DESIGNATION</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Fitness Trainer"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">DEPARTMENT</label>
                  <CustomSelect 
                    value={empForm.department}
                    onChange={(val) => setEmpForm({ ...empForm, department: val })}
                    options={[
                      { value: 'Fitness & Training', label: 'Fitness & Training' },
                      { value: 'Management', label: 'Management' },
                      { value: 'Operations & Front Desk', label: 'Operations & Front Desk' },
                      { value: 'Maintenance', label: 'Maintenance' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">BASIC SALARY (LKR) *</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={empForm.basicSalary}
                    onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">FIXED ALLOWANCE (LKR)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={empForm.allowance}
                    onChange={(e) => setEmpForm({ ...empForm, allowance: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label className="form-label">PHONE NUMBER</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="077XXXXXXX"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="form-label">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    className="form-input"
                    placeholder="emp@company.lk"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ width: '100%' }}>
                <label className="form-label">SALARY BANK DISBURSEMENT DETAILS</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Bank Name, Branch, Account Number"
                  value={empForm.bankDetails}
                  onChange={(e) => setEmpForm({ ...empForm, bankDetails: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Save Changes' : 'Register Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: ATTENDANCE-INTEGRATED MONTHLY PAYROLL PROCESSOR ===== */}
      {showPayrunModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '960px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Process Monthly Staff Payroll (Attendance Integrated)
              </h3>
              <button onClick={() => setShowPayrunModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="flex items-center gap-4">
                <div>
                  <label className="form-label" style={{ margin: 0 }}>PAYROLL MONTH</label>
                  <input 
                    type="month"
                    className="form-input"
                    value={payrunMonth}
                    onChange={(e) => setPayrunMonth(e.target.value)}
                    style={{ width: '180px', marginTop: '6px' }}
                  />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '20px' }}>
                  Processing payroll for <strong>{payrunCalcList.length}</strong> active staff members based on attendance logs for <strong>{payrunMonth}</strong>.
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STAFF</th>
                      <th>ATTENDANCE</th>
                      <th>BASIC</th>
                      <th>OT PAY</th>
                      <th>ABSENCE DEDUCT</th>
                      <th>BONUS</th>
                      <th>GROSS SALARY</th>
                      <th>EPF (8%)</th>
                      <th>NET SALARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrunCalcList.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.designation}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{item.attSummary?.present || 26}P</span> / <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{item.daysAbsent}A</span> / <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{item.otHours}h OT</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>LKR {item.basic.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+LKR {item.otPay.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-LKR {item.absenceDeduction.toLocaleString()}</td>
                        <td>
                          <input 
                            type="number"
                            className="form-input"
                            value={item.bonus}
                            onChange={(e) => updatePayrunBonus(idx, e.target.value)}
                            style={{ width: '90px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>LKR {item.grossSalary.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-LKR {item.epfEmployee.toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                          LKR {item.netSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--subtle-bg)', padding: '18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Gross Payroll: </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    LKR {payrunCalcList.reduce((s, c) => s + c.grossSalary, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Net Salaries Disbursed: </span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    LKR {payrunCalcList.reduce((s, c) => s + c.netSalary, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayrunModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleExecutePayrun}>
                  <CheckCircle2 size={16} /> Disburse & Post Payrun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: VIEW PAYSLIPS OF PROCESSED PAYRUN ===== */}
      {viewingPayrun && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '780px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Payslips for {viewingPayrun.month}
              </h3>
              <button onClick={() => setViewingPayrun(null)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STAFF NAME</th>
                      <th>BASIC</th>
                      <th>OT PAY</th>
                      <th>GROSS</th>
                      <th>EPF (8%)</th>
                      <th>NET SALARY</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingPayrun.details || []).map((slip, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{slip.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>LKR {(Number(slip.basic) || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+LKR {(Number(slip.otPay) || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>LKR {(Number(slip.grossSalary) || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-LKR {(Number(slip.epfEmployee) || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>LKR {(Number(slip.netSalary) || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingPayslip({ ...slip, month: viewingPayrun.month, payrunDate: viewingPayrun.payrunDate })}
                          >
                            <Printer size={14} /> Print Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: PRINT INDIVIDUAL PAYSLIP ===== */}
      {viewingPayslip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          padding: '20px', animation: 'backdropFade 0.14s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '600px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.7)', background: '#ffffff', color: '#1e293b'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-2">
                <div style={{ background: '#059669', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>G</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>EMPLOYEE PAYSLIP</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Period: {viewingPayslip.month}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewingPayslip(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>EMPLOYEE DETAILS</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginTop: '4px' }}>{viewingPayslip.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{viewingPayslip.designation}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DISBURSEMENT DATE</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{viewingPayslip.payrunDate || 'End of Month'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>EARNINGS & DEDUCTIONS SUMMARY</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#475569' }}>Basic Salary</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>LKR {(Number(viewingPayslip.basic) || 0).toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#475569' }}>Fixed Allowances</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>LKR {(Number(viewingPayslip.allow) || 0).toLocaleString()}</td>
                    </tr>
                    {Number(viewingPayslip.otPay) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#059669' }}>Overtime Pay ({viewingPayslip.otHours || 0} hrs)</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#059669' }}>+LKR {(Number(viewingPayslip.otPay) || 0).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(viewingPayslip.absenceDeduction) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#dc2626' }}>Absence Deduction ({viewingPayslip.daysAbsent || 0} days)</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-LKR {(Number(viewingPayslip.absenceDeduction) || 0).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#dc2626' }}>Employee EPF (8%)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-LKR {(Number(viewingPayslip.epfEmployee) || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>NET SALARY DISBURSED:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', fontFamily: 'var(--font-mono)' }}>LKR {(Number(viewingPayslip.netSalary) || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HR;
