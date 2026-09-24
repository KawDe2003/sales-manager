import React, { useContext, useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, Calendar, Plus, Search, CheckCircle2, FileText, 
  Trash2, Edit, X, Calculator, ShieldCheck, Printer, Download, UserPlus,
  Briefcase, Building, Wallet, TrendingUp, Clock, AlertCircle, Check, Eye,
  CalendarDays, CreditCard, ChevronRight, CheckSquare, XSquare, FileSpreadsheet,
  Award, ShieldAlert, FileCheck, Phone, Mail, MapPin, HeartPulse, UserCheck,
  Send, RefreshCw, Filter, Layers, BadgeCheck, BookOpen, AlertTriangle
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';

// Professional number to words helper for payslips and salary certificates
const numberToWords = (num) => {
  if (!num || isNaN(num)) return 'Zero';
  num = Math.round(Number(num));
  if (num === 0) return 'Zero';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertGroup = (n) => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  };

  let words = '';
  if (num >= 1000000) {
    words += convertGroup(Math.floor(num / 1000000)) + ' Million ';
    num %= 1000000;
  }
  if (num >= 1000) {
    words += convertGroup(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    words += convertGroup(num);
  }
  return words.trim();
};

const HR = () => {
  const { 
    employees = [], addEmployee, updateEmployee, deleteEmployee, terminateEmployee,
    payruns = [], processPayrun, confirmAction, showNotification,
    attendanceLogs = [], markAttendance, getMonthlyAttendanceSummary,
    leaveRequests = [], addLeaveRequest, updateLeaveStatus, deleteLeaveRequest, getEmployeeLeaveBalance,
    salaryAdvances = [], addSalaryAdvance, deleteSalaryAdvance,
    hrLetters = [], addHrLetter, deleteHrLetter,
    performanceReviews = [], addPerformanceReview, deletePerformanceReview,
    expenseClaims = [], addExpenseClaim, updateExpenseClaimStatus, deleteExpenseClaim,
    smsConfig = {}
  } = useContext(StoreContext) || {};

  // Active navigation tab
  // 'directory' | 'attendance' | 'leaves' | 'payruns' | 'advances' | 'letters' | 'appraisals' | 'claims'
  const [activeTab, setActiveTab] = useState('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [directoryViewMode, setDirectoryViewMode] = useState('table'); // 'table' | 'cards'

  // Analytics toggle
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

  // Selected Employee for 360° Profile Modal
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'leaves' | 'attendance' | 'payslips' | 'advances'

  // Attendance Sheet State
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attSheet, setAttSheet] = useState([]);
  const [attViewMode, setAttViewMode] = useState('daily'); // 'daily' | 'matrix'
  const [matrixMonth, setMatrixMonth] = useState(new Date().toISOString().slice(0, 7));

  // Employee Form Modal State
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empModalTab, setEmpModalTab] = useState('personal'); // 'personal' | 'employment' | 'compensation' | 'emergency'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empForm, setEmpForm] = useState({
    employeeId: '',
    name: '',
    nic: '',
    dob: '1995-01-01',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Spouse',
    designation: 'Fitness Trainer',
    department: 'Fitness & Training',
    employmentType: 'Full-Time',
    shift: 'General (08:30 - 17:00)',
    joinDate: new Date().toISOString().split('T')[0],
    confirmationDate: '',
    basicSalary: 75000,
    allowance: 10000,
    foodAllowance: 5000,
    transportAllowance: 5000,
    epfEligible: true,
    bankName: 'Commercial Bank of Ceylon',
    bankAccount: '',
    bankBranch: '',
    bankDetails: '',
    status: 'Active',
    leaveBalances: { annual: 14, casual: 7, medical: 7 }
  });

  // Leave Form Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Annual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    days: 1,
    reason: ''
  });

  // Auto-calculate days when leave dates change
  const handleLeaveDateChange = (field, value) => {
    const updated = { ...leaveForm, [field]: value };
    const start = new Date(field === 'startDate' ? value : leaveForm.startDate);
    const end = new Date(field === 'endDate' ? value : leaveForm.endDate);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      let count = 0;
      const cursor = new Date(start);
      while (cursor <= end) {
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; // Exclude weekends
        cursor.setDate(cursor.getDate() + 1);
      }
      updated.days = Math.max(1, count);
    }
    setLeaveForm(updated);
  };

  // Salary Advance Modal State
  const [showAdvModal, setShowAdvModal] = useState(false);
  const [advForm, setAdvForm] = useState({
    employeeId: '',
    amount: 15000,
    requestDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    reason: ''
  });

  // Payrun Processor State & Modals
  const [showPayrunModal, setShowPayrunModal] = useState(false);
  const [payrunMonth, setPayrunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrunCalcList, setPayrunCalcList] = useState([]);
  const [viewingPayrun, setViewingPayrun] = useState(null);
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [viewingCForm, setViewingCForm] = useState(null);
  const [viewingMasterSheet, setViewingMasterSheet] = useState(null);

  // HR Letter Generator State & Modal
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [viewingLetter, setViewingLetter] = useState(null);
  const [letterForm, setLetterForm] = useState({
    employeeId: '',
    type: 'Salary Certificate', // 'Salary Certificate' | 'Appointment Letter' | 'Service Certificate' | 'Promotion Letter'
    recipient: 'To Whom It May Concern',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    refNumber: `HR-REF-${Math.floor(1000 + Math.random() * 9000)}`
  });

  // Appraisal Form Modal State
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [appraisalForm, setAppraisalForm] = useState({
    employeeId: '',
    punctualityRating: 5,
    trainingQualityRating: 5,
    clientEngagementRating: 5,
    teamworkRating: 5,
    initiativeRating: 5,
    comments: '',
    developmentGoals: '',
    reviewDate: new Date().toISOString().split('T')[0]
  });

  // Expense Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    employeeId: '',
    category: 'Gym Equipment Supplies',
    amount: 5000,
    description: '',
    claimDate: new Date().toISOString().split('T')[0]
  });

  // Active staff list
  const activeStaff = useMemo(() => employees.filter(e => e.status !== 'Inactive' && e.status !== 'Resigned'), [employees]);

  // Initialize Daily Attendance Sheet whenever attDate, employees, or attendanceLogs change
  useEffect(() => {
    const sheet = activeStaff.map(emp => {
      const existing = attendanceLogs.find(a => a.employeeId === emp.id && a.date === attDate);
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeId,
        designation: emp.designation,
        department: emp.department,
        status: existing ? existing.status : 'Present',
        checkIn: existing ? existing.checkIn : '08:30',
        checkOut: existing ? existing.checkOut : '17:00',
        otHours: existing ? (existing.otHours || 0) : 0,
        notes: existing ? (existing.notes || '') : ''
      };
    });
    setAttSheet(sheet);
  }, [attDate, activeStaff, attendanceLogs]);

  // Metrics & KPI Computations
  const totalMonthlyBasic = activeStaff.reduce((sum, e) => sum + (Number(e.basicSalary) || 0) + (Number(e.allowance) || 0) + (Number(e.foodAllowance) || 0) + (Number(e.transportAllowance) || 0), 0);
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'Pending').length;
  const activeAdvancesTotal = salaryAdvances.filter(a => a.status === 'Issued').reduce((s, a) => s + (Number(a.amount) || 0), 0);

  // Today's attendance snapshot
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = attendanceLogs.filter(a => a.date === todayStr);
  const todayPresentCount = todayLogs.filter(a => a.status === 'Present').length;
  const todayAbsentCount = todayLogs.filter(a => a.status === 'Absent').length;
  const todayLeaveCount = todayLogs.filter(a => a.status === 'On Leave').length;

  // Department analytics
  const deptStats = useMemo(() => {
    const stats = {};
    employees.forEach(e => {
      const dept = e.department || 'Unknown';
      if (!stats[dept]) stats[dept] = { count: 0, totalSalary: 0, active: 0 };
      stats[dept].count++;
      stats[dept].totalSalary += (Number(e.basicSalary) || 0);
      if (e.status === 'Active') stats[dept].active++;
    });
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
  }, [employees]);

  // Years of service helper
  const getYearsOfService = (joinDate) => {
    if (!joinDate) return null;
    const join = new Date(joinDate);
    const now = new Date();
    const years = Math.floor((now - join) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now - join) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years}y ${months}m`;
    return `${months}m`;
  };

  // Filter Employees
  const filteredEmployees = employees.filter(e => {
    const searchMatch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.phone || '').includes(searchTerm) ||
                        (e.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = deptFilter === 'All' || e.department === deptFilter;
    const statusMatch = statusFilter === 'All' || e.status === statusFilter;
    return searchMatch && deptMatch && statusMatch;
  });

  // Calculate shift duration and OT helper
  const calculateWorkHours = (inTime, outTime) => {
    if (!inTime || !outTime) return { hours: 0, ot: 0 };
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Over midnight
    const totalHours = Math.round((diffMinutes / 60) * 10) / 10;
    const standardShift = 8.5; // 8.5 hours standard shift
    const ot = totalHours > standardShift ? Math.round((totalHours - standardShift) * 10) / 10 : 0;
    return { hours: totalHours, ot };
  };

  // Bulk attendance actions
  const markAllPresent = () => {
    setAttSheet(prev => prev.map(row => ({
      ...row,
      status: 'Present',
      checkIn: '08:30',
      checkOut: '17:00',
      otHours: 0
    })));
    showNotification('Marked all active staff as Present (08:30 - 17:00)', 'info');
  };

  const handleSaveAttendanceSheet = () => {
    const records = attSheet.map(item => ({
      employeeId: item.employeeId,
      date: attDate,
      status: item.status,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      otHours: Number(item.otHours) || 0,
      notes: item.notes || ''
    }));

    markAttendance(records);
  };

  const updateAttRow = (idx, field, value) => {
    const updated = [...attSheet];
    updated[idx][field] = value;
    if (field === 'checkIn' || field === 'checkOut') {
      const calc = calculateWorkHours(
        field === 'checkIn' ? value : updated[idx].checkIn,
        field === 'checkOut' ? value : updated[idx].checkOut
      );
      updated[idx].otHours = calc.ot;
    }
    setAttSheet(updated);
  };

  // Employee Form Submit
  const handleSaveEmployee = (e) => {
    e.preventDefault();
    if (!empForm.name.trim()) {
      showNotification('Please enter employee full name', 'error');
      return;
    }

    const compiledData = {
      ...empForm,
      bankDetails: empForm.bankDetails || `${empForm.bankName} - ${empForm.bankAccount} (${empForm.bankBranch || 'Branch'})`
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, compiledData);
    } else {
      addEmployee(compiledData);
    }

    setShowEmpModal(false);
    setEditingEmployee(null);
  };

  // Leave Request Submit
  const handleCreateLeaveRequest = (e) => {
    e.preventDefault();
    if (!leaveForm.employeeId) {
      showNotification('Please select an employee', 'error');
      return;
    }

    const emp = employees.find(e => e.id === leaveForm.employeeId);
    const balance = getEmployeeLeaveBalance ? getEmployeeLeaveBalance(leaveForm.employeeId) : null;
    
    // Validate balance if applicable
    if (balance) {
      const requestedDays = Number(leaveForm.days) || 1;
      if (leaveForm.leaveType === 'Annual Leave' && requestedDays > balance.annual.remaining) {
        showNotification(`Warning: Staff only has ${balance.annual.remaining} annual leave day(s) remaining.`, 'warning');
      } else if (leaveForm.leaveType === 'Casual Leave' && requestedDays > balance.casual.remaining) {
        showNotification(`Warning: Staff only has ${balance.casual.remaining} casual leave day(s) remaining.`, 'warning');
      } else if (leaveForm.leaveType === 'Medical Leave' && requestedDays > balance.medical.remaining) {
        showNotification(`Warning: Staff only has ${balance.medical.remaining} medical leave day(s) remaining.`, 'warning');
      }
    }

    addLeaveRequest({
      ...leaveForm,
      employeeName: emp ? emp.name : 'Unknown Staff',
      appliedDate: new Date().toISOString().split('T')[0]
    });
    setShowLeaveModal(false);
  };

  // Salary Advance Submit
  const handleCreateSalaryAdvance = (e) => {
    e.preventDefault();
    if (!advForm.employeeId) {
      showNotification('Please select an employee', 'error');
      return;
    }
    const emp = employees.find(e => e.id === advForm.employeeId);
    addSalaryAdvance({
      ...advForm,
      employeeName: emp ? emp.name : 'Unknown Staff'
    });
    setShowAdvModal(false);
  };

  // Payrun Calculation Engine
  const buildPayrunCalcs = (month) => {
    return activeStaff.map(emp => {
      const basic = Number(emp.basicSalary) || 0;
      const allow = Number(emp.allowance) || 0;
      const foodAllow = Number(emp.foodAllowance) || 0;
      const transAllow = Number(emp.transportAllowance) || 0;
      const totalAllowances = allow + foodAllow + transAllow;
      const bonus = 0;

      // Attendance summary for month
      const attSummary = getMonthlyAttendanceSummary ? getMonthlyAttendanceSummary(emp.id, month) : { present: 26, absent: 0, otHours: 0 };
      const daysAbsent = attSummary.absent || 0;
      const otHours = attSummary.otHours || 0;

      // Active unrecovered salary advances for this employee
      const empAdvances = salaryAdvances.filter(a => a.employeeId === emp.id && a.status === 'Issued');
      const advanceDeduction = empAdvances.reduce((s, a) => s + (Number(a.amount) || 0), 0);

      // Hourly and daily rate calculations
      const dailyRate = basic / 26;
      const otHourlyRate = (basic / 208) * 1.5;

      const otPay = Math.round(otHours * otHourlyRate);
      const absenceDeduction = Math.round(daysAbsent * dailyRate);

      const gross = Math.max(0, basic + totalAllowances + bonus + otPay - absenceDeduction);
      const epfEmployee = emp.epfEligible ? Math.round(basic * 0.08) : 0;
      const epfEmployer = emp.epfEligible ? Math.round(basic * 0.12) : 0;
      const etfEmployer = emp.epfEligible ? Math.round(basic * 0.03) : 0;
      const netSalary = Math.max(0, gross - epfEmployee - advanceDeduction);

      return {
        employeeId: emp.id,
        empCode: emp.employeeId,
        name: emp.name,
        nic: emp.nic || '',
        designation: emp.designation,
        department: emp.department,
        bankName: emp.bankName || 'Commercial Bank',
        bankAccount: emp.bankAccount || '',
        basic,
        allow: totalAllowances,
        fixedAllowance: allow,
        foodAllowance: foodAllow,
        transportAllowance: transAllow,
        bonus,
        otHours,
        otPay,
        daysAbsent,
        absenceDeduction,
        advanceDeduction,
        advanceIds: empAdvances.map(a => a.id),
        attSummary,
        grossSalary: gross,
        epfEmployee,
        epfEmployer,
        etfEmployer,
        netSalary
      };
    });
  };

  const openPayrunModal = () => {
    // Warn if payrun for this month already exists
    const existingPayrun = payruns.find(pr => pr.month === payrunMonth);
    if (existingPayrun) {
      showNotification(`⚠️ A payrun for ${payrunMonth} has already been processed on ${existingPayrun.payrunDate}. Processing again will create a duplicate.`, 'warning');
    }
    const calcs = buildPayrunCalcs(payrunMonth);
    setPayrunCalcList(calcs);
    setShowPayrunModal(true);
  };

  // Recalculate when payrun month changes inside modal
  const handlePayrunMonthChange = (newMonth) => {
    setPayrunMonth(newMonth);
    if (showPayrunModal) {
      const calcs = buildPayrunCalcs(newMonth);
      setPayrunCalcList(calcs);
    }
  };

  const updatePayrunBonus = (index, bonusVal) => {
    const updated = [...payrunCalcList];
    const b = Number(bonusVal) || 0;
    updated[index].bonus = b;
    updated[index].grossSalary = Math.max(0, updated[index].basic + updated[index].allow + b + updated[index].otPay - updated[index].absenceDeduction);
    updated[index].netSalary = Math.max(0, updated[index].grossSalary - updated[index].epfEmployee - updated[index].advanceDeduction);
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

  // HR Letter Generator Submit
  const handleGenerateLetter = (e) => {
    e.preventDefault();
    if (!letterForm.employeeId) {
      showNotification('Please select staff member', 'error');
      return;
    }
    const emp = employees.find(e => e.id === letterForm.employeeId);
    if (!emp) return;

    let content = '';
    const companyName = smsConfig.companyName || 'GymSales Pro Fitness Ltd';
    const companyAddress = smsConfig.companyAddress || '42/A Galle Road, Colombo 03, Sri Lanka';

    if (letterForm.type === 'Salary Certificate') {
      content = `This is to formally certify that Mr./Ms. ${emp.name} (NIC: ${emp.nic || 'Registered'}) has been employed with ${companyName} as a ${emp.designation} in the ${emp.department} Department since ${emp.joinDate}.\n\n` +
        `As of current records, their total monthly remuneration is as follows:\n` +
        `• Basic Monthly Salary: LKR ${(Number(emp.basicSalary) || 0).toLocaleString()}\n` +
        `• Fixed Monthly Allowances: LKR ${(Number(emp.allowance) || 0).toLocaleString()}\n` +
        `• Total Monthly Gross Pay: LKR {${((Number(emp.basicSalary) || 0) + (Number(emp.allowance) || 0)).toLocaleString()}}\n\n` +
        `Their service with the organization is in good standing, and this letter is issued upon the employee's request for financial/administrative purposes.`;
    } else if (letterForm.type === 'Appointment Letter') {
      content = `Dear ${emp.name},\n\n` +
        `We are pleased to formally confirm your appointment with ${companyName} as a ${emp.designation} in the ${emp.department} Department, effective from ${emp.joinDate}.\n\n` +
        `TERMS OF EMPLOYMENT:\n` +
        `1. Employment Type: ${emp.employmentType || 'Full-Time Regular'}\n` +
        `2. Work Shift: ${emp.shift || 'General Shift 08:30 - 17:00'}\n` +
        `3. Monthly Remuneration: Basic Salary of LKR ${(Number(emp.basicSalary) || 0).toLocaleString()} plus Fixed Allowances of LKR ${(Number(emp.allowance) || 0).toLocaleString()}.\n` +
        `4. Statutory Benefits: Contributory EPF (8% Employee / 12% Employer) & ETF (3% Employer).\n` +
        `5. Annual Leave Entitlement: 14 Days Annual Leave, 7 Days Casual Leave, 7 Days Medical Leave upon confirmation.\n\n` +
        `We warmly welcome you to our team and look forward to your valuable contribution.`;
    } else if (letterForm.type === 'Service Certificate') {
      content = `TO WHOM IT MAY CONCERN,\n\n` +
        `This is to certify that Mr./Ms. ${emp.name} has been employed with ${companyName} from ${emp.joinDate} to the present date, serving diligently as a ${emp.designation}.\n\n` +
        `During their tenure, they have demonstrated high professional competence, disciplined client engagement, and strong teamwork. Their conduct and character have been exemplary.\n\n` +
        `We wish them continued success in all their future professional endeavors.`;
    } else {
      content = `Dear ${emp.name},\n\n` +
        `In recognition of your exceptional dedication and performance at ${companyName}, management is delighted to announce a salary enhancement and position progression effective this period.\n\n` +
        `Your revised basic remuneration is set at LKR ${(Number(emp.basicSalary) || 0).toLocaleString()} with updated responsibilities under the ${emp.designation} role.\n\n` +
        `Thank you for your dedicated service and leadership.`;
    }

    const newLetter = addHrLetter({
      ...letterForm,
      employeeName: emp.name,
      designation: emp.designation,
      department: emp.department,
      title: `${letterForm.type} — ${emp.name}`,
      content
    });

    setShowLetterModal(false);
    setViewingLetter(newLetter);
  };

  // Matrix view days array
  const daysInMatrixMonth = useMemo(() => {
    const [year, month] = matrixMonth.split('-').map(Number);
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [matrixMonth]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '50px' }}>
      
      {/* ===== HERO HEADER ===== */}
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)'
              }}>
                <Users size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  HR Management & Staff Payroll Suite
                </h1>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Employee 360° directory, shift attendance, leave quotas, automated payroll pay sheets, EPF/ETF statutory compliance & HR letters.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setLetterForm({
                  employeeId: activeStaff[0]?.id || '',
                  type: 'Salary Certificate',
                  recipient: 'To Whom It May Concern',
                  date: new Date().toISOString().split('T')[0],
                  notes: '',
                  refNumber: `HR-REF-${Math.floor(1000 + Math.random() * 9000)}`
                });
                setShowLetterModal(true);
              }}
              title="Issue Official Letters & Certificates"
            >
              <FileCheck size={16} /> HR Letters
            </button>
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
                  nic: '',
                  dob: '1995-01-01',
                  gender: 'Male',
                  bloodGroup: 'O+',
                  phone: '',
                  email: '',
                  address: '',
                  emergencyContactName: '',
                  emergencyContactPhone: '',
                  emergencyContactRelation: 'Spouse',
                  designation: 'Fitness Trainer',
                  department: 'Fitness & Training',
                  employmentType: 'Full-Time',
                  shift: 'General (08:30 - 17:00)',
                  joinDate: new Date().toISOString().split('T')[0],
                  confirmationDate: '',
                  basicSalary: 75000,
                  allowance: 10000,
                  foodAllowance: 5000,
                  transportAllowance: 5000,
                  epfEligible: true,
                  bankName: 'Commercial Bank of Ceylon',
                  bankAccount: '',
                  bankBranch: '',
                  bankDetails: '',
                  status: 'Active',
                  leaveBalances: { annual: 14, casual: 7, medical: 7 }
                });
                setEmpModalTab('personal');
                setShowEmpModal(true);
              }}
            >
              <UserPlus size={16} /> Register Employee
            </button>
          </div>
        </div>
      </div>

      {/* ===== EXECUTIVE KPI CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel hover-lift" style={{ padding: '18px', borderBottom: '3px solid var(--accent-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MONTHLY PAYROLL</span>
            <Wallet size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            LKR {totalMonthlyBasic.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Basic + Fixed Allowances
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px', borderBottom: '3px solid var(--success)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACTIVE STAFF</span>
            <Users size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeStaff.length} Employees
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active on Payroll Directory
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px', borderBottom: '3px solid var(--accent-primary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TODAY'S ATTENDANCE</span>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayPresentCount} / {activeStaff.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{todayPresentCount} Present</span> · <span style={{ color: 'var(--danger)' }}>{todayAbsentCount} Absent</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px', borderBottom: '3px solid var(--info)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PENDING LEAVES</span>
            <CalendarDays size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--info)' }}>
            {pendingLeavesCount} Requests
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {pendingLeavesCount > 0 ? 'Review Required' : 'All Clear'}
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '18px', borderBottom: '3px solid var(--warning)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACTIVE ADVANCES</span>
            <CreditCard size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            LKR {activeAdvancesTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            To Recover in Payruns
          </div>
        </div>
      </div>

      {/* ===== TABS NAVIGATION BAR ===== */}
      <div className="glass-panel mb-6" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', background: 'var(--subtle-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            {[
              { id: 'directory', label: `Staff Directory (${employees.length})` },
              { id: 'attendance', label: 'Shift Attendance' },
              { id: 'leaves', label: `Leave Approvals (${leaveRequests.length})` },
              { id: 'payruns', label: `Payroll Payruns (${payruns.length})` },
              { id: 'advances', label: `Salary Advances (${salaryAdvances.length})` },
              { id: 'letters', label: `HR Letters (${hrLetters.length})` },
              { id: 'appraisals', label: `KPI Appraisals (${performanceReviews.length})` },
              { id: 'claims', label: `Expense Claims (${expenseClaims.length})` }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search staff, designation, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', height: '36px', fontSize: '0.84rem' }}
              />
            </div>
            {activeTab === 'directory' && (
          <div className="flex items-center gap-2">
                <CustomSelect 
                  value={deptFilter}
                  onChange={setDeptFilter}
                  options={[
                    { value: 'All', label: 'All Departments' },
                    { value: 'Fitness & Training', label: 'Fitness & Training' },
                    { value: 'Management', label: 'Management' },
                    { value: 'Operations & Front Desk', label: 'Operations & Front Desk' },
                    { value: 'Maintenance', label: 'Maintenance' },
                    { value: 'Finance & Accounts', label: 'Finance & Accounts' }
                  ]}
                  style={{ height: '36px', minWidth: '160px' }}
                />
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'On Leave', label: 'On Leave' },
                    { value: 'Resigned', label: 'Resigned' },
                    { value: 'Inactive', label: 'Inactive' }
                  ]}
                  style={{ height: '36px', minWidth: '130px' }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAnalyticsPanel(prev => !prev)}
                  title="Toggle Department Analytics Panel"
                  style={{ padding: '8px 12px' }}
                >
                  <TrendingUp size={15} /> Analytics
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDirectoryViewMode(prev => prev === 'table' ? 'cards' : 'table')}
                  title="Toggle Table or Cards view"
                  style={{ padding: '8px 12px' }}
                >
                  <Layers size={15} /> {directoryViewMode === 'table' ? 'Cards' : 'Table'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ===== TAB 1: STAFF DIRECTORY & 360° PROFILES ============================= */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <>
          {directoryViewMode === 'table' ? (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STAFF ID</th>
                      <th>EMPLOYEE NAME & CONTACT</th>
                      <th>DESIGNATION</th>
                      <th>DEPARTMENT</th>
                      <th>SHIFT</th>
                      <th>SERVICE</th>
                      <th>BASIC SALARY</th>
                      <th>TOTAL ALLOWANCE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                          No employees found matching your query.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => {
                        const basic = Number(emp.basicSalary) || 0;
                        const allow = (Number(emp.allowance) || 0) + (Number(emp.foodAllowance) || 0) + (Number(emp.transportAllowance) || 0);

                        return (
                          <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => {
                            setProfileEmployee(emp);
                            setProfileTab('overview');
                          }}>
                            <td>
                              <div style={{ fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                                {emp.employeeId}
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-3">
                                <div style={{
                                  width: '34px', height: '34px', borderRadius: '10px',
                                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem', flexShrink: 0
                                }}>
                                  {(emp.name || 'E').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{emp.phone} {emp.email && `· ${emp.email}`}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {emp.designation}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                                {emp.department}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {emp.shift || 'General Shift'}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {getYearsOfService(emp.joinDate) || '—'}
                              </div>
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
                              <span className={`status-badge ${emp.status === 'Active' ? 'status-paid' : 'status-pending'}`}>
                                {emp.status || 'Active'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '6px' }}
                                  title="View 360° Profile Drawer"
                                  onClick={() => {
                                    setProfileEmployee(emp);
                                    setProfileTab('overview');
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '6px' }}
                                  title="Edit Employee"
                                  onClick={() => {
                                    setEditingEmployee(emp);
                                    setEmpForm({
                                      ...emp,
                                      foodAllowance: emp.foodAllowance || 0,
                                      transportAllowance: emp.transportAllowance || 0
                                    });
                                    setEmpModalTab('personal');
                                    setShowEmpModal(true);
                                  }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--danger)', padding: '6px' }}
                                  title="Remove Employee"
                                  onClick={() => {
                                    confirmAction({
                                      title: 'Remove Employee Record',
                                      message: `Are you sure you want to remove ${emp.name} from payroll and employee records? This action cannot be undone.`,
                                      onConfirm: () => deleteEmployee(emp.id)
                                    });
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                                {emp.status === 'Active' && (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: 'var(--warning)', padding: '6px', fontSize: '0.72rem' }}
                                    title="Mark as Resigned"
                                    onClick={() => {
                                      confirmAction({
                                        title: 'Mark Employee as Resigned',
                                        message: `Are you sure you want to mark ${emp.name} as Resigned? This will remove them from payroll processing.`,
                                        confirmText: 'Mark Resigned',
                                        variant: 'warning',
                                        onConfirm: () => terminateEmployee && terminateEmployee(emp.id, 'Resigned')
                                      });
                                    }}
                                  >
                                    <UserCheck size={14} />
                                  </button>
                                )}
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
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(emp => {
                const basic = Number(emp.basicSalary) || 0;
                const balance = getEmployeeLeaveBalance ? getEmployeeLeaveBalance(emp.id) : null;

                return (
                  <div 
                    key={emp.id} 
                    className="glass-panel hover-lift" 
                    style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px' }}
                    onClick={() => {
                      setProfileEmployee(emp);
                      setProfileTab('overview');
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, color: 'white', fontSize: '1.1rem'
                        }}>
                          {(emp.name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {emp.name}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {emp.designation} · {emp.employeeId}
                          </span>
                        </div>
                      </div>
                      <span className={`status-badge ${emp.status === 'Active' ? 'status-paid' : 'status-pending'}`}>
                        {emp.status || 'Active'}
                      </span>
                    </div>

                    <div style={{ background: 'var(--subtle-bg)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Basic Pay:</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>LKR {basic.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Contact:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{emp.phone || emp.email || '—'}</span>
                      </div>
                    </div>

                    {balance && (
                      <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem' }}>
                        <div style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Annual</div>
                          <div style={{ fontWeight: 800, color: 'var(--info)' }}>{balance.annual.remaining} left</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Casual</div>
                          <div style={{ fontWeight: 800, color: 'var(--warning)' }}>{balance.casual.remaining} left</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(34, 197, 94, 0.1)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Medical</div>
                          <div style={{ fontWeight: 800, color: 'var(--success)' }}>{balance.medical.remaining} left</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid var(--subtle-border)', paddingTop: '10px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setProfileEmployee(emp);
                          setProfileTab('overview');
                        }}
                      >
                        <Eye size={13} /> View 360° Profile
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingEmployee(emp);
                          setEmpForm({ ...emp });
                          setShowEmpModal(true);
                        }}
                      >
                        <Edit size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== ANALYTICS PANEL ===== */}
      {activeTab === 'directory' && showAnalyticsPanel && (
        <div className="glass-panel mb-4" style={{ padding: '20px 24px' }}>
          <div className="flex justify-between items-center mb-4">
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              <TrendingUp size={16} style={{ marginRight: '8px', color: 'var(--accent-secondary)' }} />
              Workforce & Department Analytics
            </h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAnalyticsPanel(false)} style={{ padding: '4px 8px' }}>
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deptStats.map(([dept, stat]) => (
              <div key={dept} style={{ background: 'var(--subtle-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dept}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stat.count}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>{stat.active} Active</span> · LKR {Math.round(stat.totalSalary / 1000)}k Total
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL HEADCOUNT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>{employees.length}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ACTIVE STAFF</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>{activeStaff.length}</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL PAYROLL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>LKR {totalMonthlyBasic.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>EPF/ETF LIABILITY</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>LKR {activeStaff.reduce((s, e) => s + (e.epfEligible !== false ? Math.round(Number(e.basicSalary) * 0.15) : 0), 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== TAB 2: SHIFT ATTENDANCE (DAILY & MONTHLY MATRIX) ================== */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Shift Attendance & Overtime Tracker
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Log daily check-in, check-out, working hours, and view full monthly presence matrix.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div style={{ display: 'flex', background: 'var(--subtle-bg)', padding: '3px', borderRadius: '8px' }}>
                <button 
                  className={`btn btn-sm ${attViewMode === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none', padding: '6px 12px' }}
                  onClick={() => setAttViewMode('daily')}
                >
                  <Calendar size={14} /> Daily Sheet
                </button>
                <button 
                  className={`btn btn-sm ${attViewMode === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none', padding: '6px 12px' }}
                  onClick={() => setAttViewMode('matrix')}
                >
                  <FileSpreadsheet size={14} /> Monthly Matrix
                </button>
              </div>

              {attViewMode === 'daily' ? (
                <>
                  <div>
                    <input 
                      type="date"
                      className="form-input"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      style={{ height: '36px', width: '150px' }}
                    />
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={markAllPresent} title="Mark All Active Staff Present">
                    <CheckSquare size={14} /> Mark All Present
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveAttendanceSheet}>
                    <Check size={14} /> Save Attendance
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Month:</span>
                  <input 
                    type="month"
                    className="form-input"
                    value={matrixMonth}
                    onChange={(e) => setMatrixMonth(e.target.value)}
                    style={{ height: '36px', width: '160px' }}
                  />
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.print()}
                    title="Print Monthly Attendance Matrix"
                  >
                    <Printer size={14} /> Print Matrix
                  </button>
                </div>
              )}
            </div>
          </div>

          {attViewMode === 'daily' ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>DEPARTMENT</th>
                    <th>ATTENDANCE STATUS</th>
                    <th>CHECK IN</th>
                    <th>CHECK OUT</th>
                    <th>OVERTIME (HRS)</th>
                    <th>NOTES / REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {attSheet.map((row, idx) => (
                    <tr key={row.employeeId}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.employeeName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{row.employeeCode} · {row.designation}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {row.department}
                        </span>
                      </td>
                      <td>
                        <CustomSelect 
                          value={row.status}
                          onChange={(val) => updateAttRow(idx, 'status', val)}
                          options={[
                            { value: 'Present', label: '🟢 Present' },
                            { value: 'Absent', label: '🔴 Absent (Unpaid)' },
                            { value: 'Half Day', label: '🟡 Half Day' },
                            { value: 'On Leave', label: '🔵 On Leave (Paid)' },
                            { value: 'Late', label: '🟠 Late Arrival' }
                          ]}
                          style={{ height: '36px', width: '165px' }}
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
                          step="0.5"
                          min="0"
                          className="form-input"
                          value={row.otHours}
                          onChange={(e) => updateAttRow(idx, 'otHours', e.target.value)}
                          style={{ height: '36px', width: '90px' }}
                          disabled={row.status === 'Absent' || row.status === 'On Leave'}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="e.g. Morning Shift"
                          className="form-input"
                          value={row.notes}
                          onChange={(e) => updateAttRow(idx, 'notes', e.target.value)}
                          style={{ height: '36px', minWidth: '140px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Monthly Attendance Matrix View */
            <div className="table-container printable-area" style={{ overflowX: 'auto' }}>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Attendance Matrix for {matrixMonth}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    P: Present (Green) · A: Absent (Red) · HD: Half Day (Yellow) · L: On Leave (Blue)
                  </span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: 'var(--subtle-bg)', borderBottom: '2px solid var(--subtle-border)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '160px' }}>STAFF NAME</th>
                    {daysInMatrixMonth.map(d => (
                      <th key={d} style={{ padding: '6px 4px', width: '28px', color: 'var(--text-muted)' }}>
                        {d}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', color: 'var(--success)' }}>P</th>
                    <th style={{ padding: '8px 10px', color: 'var(--danger)' }}>A</th>
                    <th style={{ padding: '8px 10px', color: 'var(--warning)' }}>HD</th>
                    <th style={{ padding: '8px 10px', color: 'var(--info)' }}>OT (H)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map(emp => {
                    const monthLogs = attendanceLogs.filter(a => a.employeeId === emp.id && a.date?.startsWith(matrixMonth));
                    let pCount = 0;
                    let aCount = 0;
                    let hdCount = 0;
                    let otTotal = 0;

                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                        <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div>{emp.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.designation}</div>
                        </td>
                        {daysInMatrixMonth.map(dayNum => {
                          const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                          const dateKey = `${matrixMonth}-${dayStr}`;
                          const log = monthLogs.find(l => l.date === dateKey);

                          let bg = 'transparent';
                          let code = '·';
                          let color = 'var(--text-muted)';

                          if (log) {
                            if (log.status === 'Present') {
                              bg = 'rgba(34, 197, 94, 0.18)'; code = 'P'; color = 'var(--success)'; pCount++;
                            } else if (log.status === 'Absent') {
                              bg = 'rgba(244, 63, 94, 0.18)'; code = 'A'; color = 'var(--danger)'; aCount++;
                            } else if (log.status === 'Half Day') {
                              bg = 'rgba(245, 158, 11, 0.18)'; code = 'H'; color = 'var(--warning)'; hdCount++;
                            } else if (log.status === 'On Leave') {
                              bg = 'rgba(56, 189, 248, 0.18)'; code = 'L'; color = 'var(--info)';
                            }
                            if (log.otHours > 0) otTotal += Number(log.otHours);
                          }

                          return (
                            <td key={dayNum} style={{ padding: '6px 2px', background: bg, color: color, fontWeight: log ? 800 : 400 }}>
                              {code}
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--success)' }}>{pCount}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--danger)' }}>{aCount}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--warning)' }}>{hdCount}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{otTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== TAB 3: LEAVE MANAGEMENT & APPROVALS =============================== */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Leave Management & Entitlements
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Review, approve, or reject employee leave requests and track annual/casual/medical balances.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setLeaveForm({
                employeeId: activeStaff[0]?.id || '',
                leaveType: 'Annual Leave',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                days: 1,
                reason: ''
              });
              setShowLeaveModal(true);
            }}>
              <Plus size={16} /> Apply for Leave
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>LEAVE TYPE</th>
                  <th>PERIOD & DATES</th>
                  <th>TOTAL DAYS</th>
                  <th>REASON / NOTES</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No leave applications found. Click "Apply for Leave" to create a new record.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map(l => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.employeeName}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{l.leaveType}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {l.startDate} to {l.endDate}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{l.days} Day(s)</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {l.reason || '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                          background: l.status === 'Approved' ? 'rgba(34, 197, 94, 0.14)' : l.status === 'Rejected' ? 'rgba(244, 63, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                          color: l.status === 'Approved' ? 'var(--success)' : l.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          {l.status === 'Pending' && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--success)', padding: '6px' }}
                                onClick={() => updateLeaveStatus(l.id, 'Approved')}
                                title="Approve Application"
                              >
                                <CheckSquare size={14} /> Approve
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--danger)', padding: '6px' }}
                                onClick={() => updateLeaveStatus(l.id, 'Rejected')}
                                title="Reject Application"
                              >
                                <XSquare size={14} /> Reject
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            onClick={() => deleteLeaveRequest(l.id)}
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== TAB 4: PAYROLL PAYRUNS & PAY SHEETS ============================== */}
      {/* ========================================================================= */}
      {activeTab === 'payruns' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Monthly Payroll Payruns & Pay Sheets
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Historical disbursed payruns, individual payslips, EPF/ETF statutory C-Form, and master registers.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openPayrunModal}>
              <Calculator size={16} /> Run Monthly Payroll
            </button>
          </div>

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
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {payruns.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      No payroll payruns processed yet. Click "Run Monthly Payroll" to disburse salaries.
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
                        {pr.payrunDate ? new Date(pr.payrunDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pr.slipsCount || (pr.details || []).length} Employees
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
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingMasterSheet(pr)}
                            title="View Full Company Salary Register"
                          >
                            <FileSpreadsheet size={14} /> Master Pay Sheet
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingCForm(pr)}
                            title="EPF/ETF Statutory C-Form Return"
                          >
                            <ShieldCheck size={14} /> C-Form Return
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingPayrun(pr)}
                            title="View Staff Payslips"
                          >
                            <FileText size={14} /> Payslips
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== TAB 5: SALARY ADVANCES & STAFF LOANS =============================== */}
      {/* ========================================================================= */}
      {activeTab === 'advances' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Salary Advances & Emergency Loans
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Issue cash/bank salary advances that are automatically recovered during monthly payroll processing.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setAdvForm({
                employeeId: activeStaff[0]?.id || '',
                amount: 15000,
                requestDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'Bank Transfer',
                reason: ''
              });
              setShowAdvModal(true);
            }}>
              <Plus size={16} /> Issue Salary Advance
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>ISSUED DATE</th>
                  <th>AMOUNT</th>
                  <th>PAYMENT METHOD</th>
                  <th>PURPOSE / REASON</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {salaryAdvances.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No salary advances issued.
                    </td>
                  </tr>
                ) : (
                  salaryAdvances.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.employeeName}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.requestDate}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(a.amount) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{a.paymentMethod || 'Bank Transfer'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{a.reason || '—'}</td>
                      <td>
                        <span className={`status-badge ${a.status === 'Issued' ? 'status-pending' : 'status-paid'}`}>
                          {a.status === 'Issued' ? 'Issued (Unrecovered)' : `Recovered (${a.deductedInMonth || 'Payroll'})`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', padding: '6px' }}
                          onClick={() => deleteSalaryAdvance(a.id)}
                        >
                          <Trash2 size={14} />
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

      {/* ========================================================================= */}
      {/* ===== TAB 6: OFFICIAL HR LETTERS & CERTIFICATES ========================= */}
      {/* ========================================================================= */}
      {activeTab === 'letters' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Official HR Letters & Document Certificates
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Generate official appointment letters, salary certificates for bank/visa loans, and service letters.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setLetterForm({
                employeeId: activeStaff[0]?.id || '',
                type: 'Salary Certificate',
                recipient: 'To Whom It May Concern',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                refNumber: `HR-REF-${Math.floor(1000 + Math.random() * 9000)}`
              });
              setShowLetterModal(true);
            }}>
              <Plus size={16} /> Generate New Letter
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>EMPLOYEE</th>
                  <th>DOCUMENT TYPE</th>
                  <th>RECIPIENT / PURPOSE</th>
                  <th>REF NO</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {hrLetters.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No official HR letters generated yet.
                    </td>
                  </tr>
                ) : (
                  hrLetters.map(letRecord => (
                    <tr key={letRecord.id}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{letRecord.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{letRecord.employeeName}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                          {letRecord.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{letRecord.recipient}</td>
                      <td style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{letRecord.refNumber || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingLetter(letRecord)}
                            title="View & Print Document"
                          >
                            <Printer size={14} /> View & Print
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            onClick={() => deleteHrLetter(letRecord.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== TAB 7: PERFORMANCE APPRAISALS & KPIS =============================== */}
      {/* ========================================================================= */}
      {activeTab === 'appraisals' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Performance Appraisals & Scorecards
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                5-Star multi-criteria evaluations: punctuality, technical quality, customer service, and teamwork.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAppraisalModal(true)}>
              <Plus size={16} /> Conduct Appraisal
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>REVIEW DATE</th>
                  <th>REVIEWER</th>
                  <th>RATINGS (P / Q / C / T / I)</th>
                  <th>OVERALL SCORE</th>
                  <th>MANAGER COMMENTS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {performanceReviews.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No performance reviews recorded.
                    </td>
                  </tr>
                ) : (
                  performanceReviews.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.employeeName}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.reviewDate}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.reviewer || 'Manager'}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {r.punctualityRating}★ / {r.trainingQualityRating}★ / {r.clientEngagementRating}★ / {r.teamworkRating}★
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: 900, padding: '4px 10px', borderRadius: '6px',
                          background: r.overallScore >= 4.0 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                          color: r.overallScore >= 4.0 ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {r.overallScore} / 5.0
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.comments || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', padding: '6px' }}
                          onClick={() => deletePerformanceReview(r.id)}
                        >
                          <Trash2 size={14} />
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

      {/* ========================================================================= */}
      {/* ===== TAB 8: STAFF EXPENSE CLAIMS ======================================= */}
      {/* ========================================================================= */}
      {activeTab === 'claims' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Expense Claims & Out-of-Pocket Reimbursements
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Review and approve staff claims with automated General Ledger double-entry posting.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowClaimModal(true)}>
              <Plus size={16} /> Submit Expense Claim
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>CLAIM DATE</th>
                  <th>CATEGORY</th>
                  <th>DESCRIPTION</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {expenseClaims.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No expense reimbursement claims recorded.
                    </td>
                  </tr>
                ) : (
                  expenseClaims.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.employeeName}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.claimDate}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)' }}>
                          {c.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.description || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          LKR {(Number(c.amount) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                          background: c.status === 'Approved' ? 'rgba(34, 197, 94, 0.14)' : c.status === 'Rejected' ? 'rgba(244, 63, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                          color: c.status === 'Approved' ? 'var(--success)' : c.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'Pending' && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--success)' }}
                                onClick={() => updateExpenseClaimStatus(c.id, 'Approved')}
                              >
                                Approve & Disburse
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => updateExpenseClaimStatus(c.id, 'Rejected')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            onClick={() => deleteExpenseClaim(c.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: EMPLOYEE 360° PROFILE DRAWER ============================== */}
      {/* ========================================================================= */}
      {profileEmployee && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '820px', padding: 0, borderRadius: '24px',
            maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header / Avatar Profile Bar */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))' }}>
              <div className="flex items-center gap-4">
                <div style={{
                  width: '60px', height: '60px', borderRadius: '18px',
                  background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: 'white', fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                }}>
                  {(profileEmployee.name || 'E').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {profileEmployee.name}
                    </h2>
                    <span className={`status-badge ${profileEmployee.status === 'Active' ? 'status-paid' : 'status-pending'}`}>
                      {profileEmployee.status || 'Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{profileEmployee.employeeId}</span> · {profileEmployee.designation} · {profileEmployee.department}
                  </div>
                </div>
              </div>
              <button onClick={() => setProfileEmployee(null)} className="btn btn-secondary" style={{ padding: '8px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Profile Drawer Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 28px', borderBottom: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)' }}>
              {[
                { id: 'overview', label: 'File Overview' },
                { id: 'leaves', label: 'Leave Quotas' },
                { id: 'attendance', label: 'Attendance History' },
                { id: 'advances', label: 'Salary Advances' }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setProfileTab(subTab.id)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: profileTab === subTab.id ? 'var(--bg-secondary)' : 'transparent',
                    color: profileTab === subTab.id ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Content */}
            <div style={{ padding: '28px' }}>
              {profileTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', border: '1px solid var(--subtle-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={16} style={{ color: 'var(--accent-secondary)' }} /> Employment Information
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Staff ID:</span><span style={{ fontWeight: 700 }}>{profileEmployee.employeeId}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Employment Type:</span><span style={{ fontWeight: 600 }}>{profileEmployee.employmentType || 'Full-Time'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Assigned Shift:</span><span>{profileEmployee.shift || 'General Shift'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Join Date:</span><span>{profileEmployee.joinDate || '—'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Confirmation Date:</span><span>{profileEmployee.confirmationDate || 'Confirmed'}</span></div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', border: '1px solid var(--subtle-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wallet size={16} style={{ color: 'var(--success)' }} /> Remuneration & Banking
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Basic Salary:</span><span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>LKR {(Number(profileEmployee.basicSalary) || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Fixed Allowances:</span><span style={{ fontFamily: 'var(--font-mono)' }}>LKR {(Number(profileEmployee.allowance) || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>EPF/ETF Statutory:</span><span style={{ fontWeight: 700, color: profileEmployee.epfEligible ? 'var(--success)' : 'var(--text-muted)' }}>{profileEmployee.epfEligible ? 'Enrolled (20% EPF / 3% ETF)' : 'Exempt'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Bank Name:</span><span>{profileEmployee.bankName || 'Commercial Bank'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Account Number:</span><span style={{ fontFamily: 'var(--font-mono)' }}>{profileEmployee.bankAccount || '—'}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', border: '1px solid var(--subtle-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} style={{ color: 'var(--info)' }} /> Personal & Contact Info
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>NIC / Passport:</span><span style={{ fontWeight: 600 }}>{profileEmployee.nic || '—'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span><span>{profileEmployee.dob || '—'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Gender / Blood:</span><span>{profileEmployee.gender || '—'} ({profileEmployee.bloodGroup || 'O+'})</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Phone:</span><span>{profileEmployee.phone || '—'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Address:</span><span>{profileEmployee.address || '—'}</span></div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '14px', border: '1px solid var(--subtle-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HeartPulse size={16} style={{ color: 'var(--danger)' }} /> Emergency Contact
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Contact Person:</span><span style={{ fontWeight: 700 }}>{profileEmployee.emergencyContactName || '—'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Relationship:</span><span>{profileEmployee.emergencyContactRelation || 'Family'}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Emergency Phone:</span><span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{profileEmployee.emergencyContactPhone || '—'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons for this Employee */}
                  <div className="flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--subtle-border)', paddingTop: '18px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setLetterForm({
                          employeeId: profileEmployee.id,
                          type: 'Salary Certificate',
                          recipient: 'To Whom It May Concern',
                          date: new Date().toISOString().split('T')[0],
                          notes: '',
                          refNumber: `HR-REF-${Math.floor(1000 + Math.random() * 9000)}`
                        });
                        setShowLetterModal(true);
                      }}
                    >
                      <FileCheck size={14} /> Generate Letter
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setLeaveForm({
                          employeeId: profileEmployee.id,
                          leaveType: 'Annual Leave',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0],
                          days: 1,
                          reason: ''
                        });
                        setShowLeaveModal(true);
                      }}
                    >
                      <CalendarDays size={14} /> Apply Leave
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setAdvForm({
                          employeeId: profileEmployee.id,
                          amount: 15000,
                          requestDate: new Date().toISOString().split('T')[0],
                          paymentMethod: 'Bank Transfer',
                          reason: ''
                        });
                        setShowAdvModal(true);
                      }}
                    >
                      <CreditCard size={14} /> Issue Advance
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setEditingEmployee(profileEmployee);
                        setEmpForm({ ...profileEmployee });
                        setShowEmpModal(true);
                      }}
                    >
                      <Edit size={14} /> Edit Profile Data
                    </button>
                  </div>
                </div>
              )}

              {profileTab === 'leaves' && (
                (() => {
                  const bal = getEmployeeLeaveBalance ? getEmployeeLeaveBalance(profileEmployee.id) : null;
                  const empLeaves = leaveRequests.filter(l => l.employeeId === profileEmployee.id);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {bal && (
                        <div className="grid grid-cols-3 gap-4">
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ANNUAL LEAVE</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--info)', marginTop: '4px' }}>
                              {bal.annual.remaining} / {bal.annual.total} Days Left
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bal.annual.used} days utilized this year</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CASUAL LEAVE</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--warning)', marginTop: '4px' }}>
                              {bal.casual.remaining} / {bal.casual.total} Days Left
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bal.casual.used} days utilized this year</div>
                          </div>
                          <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MEDICAL LEAVE</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                              {bal.medical.remaining} / {bal.medical.total} Days Left
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bal.medical.used} days utilized this year</div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800 }}>Leave History for this Staff Member</h4>
                        {empLeaves.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No leave applications recorded.</div>
                        ) : (
                          <div className="table-container">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>TYPE</th>
                                  <th>DATES</th>
                                  <th>DAYS</th>
                                  <th>STATUS</th>
                                  <th>REASON</th>
                                </tr>
                              </thead>
                              <tbody>
                                {empLeaves.map(l => (
                                  <tr key={l.id}>
                                    <td style={{ fontWeight: 700 }}>{l.leaveType}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{l.startDate} to {l.endDate}</td>
                                    <td style={{ fontWeight: 800 }}>{l.days}</td>
                                    <td>
                                      <span style={{
                                        fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                                        background: l.status === 'Approved' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                                        color: l.status === 'Approved' ? 'var(--success)' : 'var(--warning)'
                                      }}>
                                        {l.status}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{l.reason || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {profileTab === 'attendance' && (
                (() => {
                  const empLogs = attendanceLogs.filter(a => a.employeeId === profileEmployee.id).slice(0, 15);
                  return (
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800 }}>Recent Attendance Logs</h4>
                      {empLogs.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent attendance logs recorded.</div>
                      ) : (
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>DATE</th>
                                <th>STATUS</th>
                                <th>CHECK IN</th>
                                <th>CHECK OUT</th>
                                <th>OT HOURS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empLogs.map(l => (
                                <tr key={l.id}>
                                  <td>{l.date}</td>
                                  <td><span className={`status-badge ${l.status === 'Present' ? 'status-paid' : 'status-pending'}`}>{l.status}</span></td>
                                  <td>{l.checkIn || '—'}</td>
                                  <td>{l.checkOut || '—'}</td>
                                  <td style={{ fontWeight: 700 }}>{l.otHours || 0} hrs</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {profileTab === 'advances' && (
                (() => {
                  const empAdvances = salaryAdvances.filter(a => a.employeeId === profileEmployee.id);
                  return (
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800 }}>Salary Advances Issued</h4>
                      {empAdvances.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No salary advances issued to this employee.</div>
                      ) : (
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                                <th>PURPOSE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empAdvances.map(a => (
                                <tr key={a.id}>
                                  <td>{a.requestDate}</td>
                                  <td style={{ fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>LKR {(Number(a.amount) || 0).toLocaleString()}</td>
                                  <td><span className={`status-badge ${a.status === 'Issued' ? 'status-pending' : 'status-paid'}`}>{a.status}</span></td>
                                  <td>{a.reason || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: REGISTER / EDIT EMPLOYEE (COMPREHENSIVE) =================== */}
      {/* ========================================================================= */}
      {showEmpModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '680px', padding: 0, borderRadius: '24px',
            maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header" style={{ padding: '20px 28px', borderBottom: '1px solid var(--subtle-border)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {editingEmployee ? 'Edit Staff Profile' : 'Register New Employee'}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Complete personal, employment, compensation, and banking file</span>
                </div>
              </div>
              <button onClick={() => setShowEmpModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div style={{ display: 'flex', gap: '6px', padding: '12px 28px', background: 'var(--subtle-bg)', borderBottom: '1px solid var(--subtle-border)' }}>
              {[
                { id: 'personal', label: '1. Personal Details' },
                { id: 'employment', label: '2. Job & Shift' },
                { id: 'compensation', label: '3. Salary & Bank' },
                { id: 'emergency', label: '4. Emergency & Leave Quota' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEmpModalTab(tab.id)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: empModalTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                    color: empModalTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
              
              {/* Tab 1: Personal Details */}
              {empModalTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">EMPLOYEE ID *</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={empForm.employeeId}
                        onChange={(e) => setEmpForm({ ...empForm, employeeId: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">FULL NAME *</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Kasun Rajapaksha"
                        value={empForm.name}
                        onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">NIC / PASSPORT NO</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. 199214502819"
                        value={empForm.nic}
                        onChange={(e) => setEmpForm({ ...empForm, nic: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">DATE OF BIRTH</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={empForm.dob}
                        onChange={(e) => setEmpForm({ ...empForm, dob: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">GENDER</label>
                      <CustomSelect 
                        value={empForm.gender}
                        onChange={(val) => setEmpForm({ ...empForm, gender: val })}
                        options={[
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">PHONE NUMBER *</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="077XXXXXXX"
                        value={empForm.phone}
                        onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">EMAIL ADDRESS</label>
                      <input 
                        type="email" 
                        className="form-input"
                        placeholder="emp@gymsales.lk"
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">RESIDENTIAL ADDRESS</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. 45/2 Temple Road, Colombo 03"
                      value={empForm.address}
                      onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Employment & Shift */}
              {empModalTab === 'employment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">DESIGNATION / JOB TITLE *</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Senior Fitness Instructor"
                        value={empForm.designation}
                        onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">DEPARTMENT</label>
                      <CustomSelect 
                        value={empForm.department}
                        onChange={(val) => setEmpForm({ ...empForm, department: val })}
                        options={[
                          { value: 'Fitness & Training', label: 'Fitness & Training' },
                          { value: 'Management', label: 'Management' },
                          { value: 'Operations & Front Desk', label: 'Operations & Front Desk' },
                          { value: 'Maintenance', label: 'Maintenance' },
                          { value: 'Finance & Accounts', label: 'Finance & Accounts' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">EMPLOYMENT TYPE</label>
                      <CustomSelect 
                        value={empForm.employmentType}
                        onChange={(val) => setEmpForm({ ...empForm, employmentType: val })}
                        options={[
                          { value: 'Full-Time', label: 'Full-Time Regular' },
                          { value: 'Probation', label: 'On Probation' },
                          { value: 'Contract', label: 'Contract Basis' },
                          { value: 'Part-Time', label: 'Part-Time' },
                          { value: 'Intern', label: 'Intern' }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="form-label">WORK SHIFT</label>
                      <CustomSelect 
                        value={empForm.shift}
                        onChange={(val) => setEmpForm({ ...empForm, shift: val })}
                        options={[
                          { value: 'Morning (06:00 - 15:00)', label: 'Morning (06:00 - 15:00)' },
                          { value: 'General (08:30 - 17:00)', label: 'General (08:30 - 17:00)' },
                          { value: 'Evening (13:00 - 22:00)', label: 'Evening (13:00 - 22:00)' },
                          { value: 'Night (21:00 - 06:00)', label: 'Night (21:00 - 06:00)' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">DATE OF JOINING</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={empForm.joinDate}
                        onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">CONFIRMATION / PROBATION END DATE</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={empForm.confirmationDate}
                        onChange={(e) => setEmpForm({ ...empForm, confirmationDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">EMPLOYMENT STATUS</label>
                    <CustomSelect 
                      value={empForm.status}
                      onChange={(val) => setEmpForm({ ...empForm, status: val })}
                      options={[
                        { value: 'Active', label: 'Active on Duty' },
                        { value: 'On Leave', label: 'On Extended Leave' },
                        { value: 'Resigned', label: 'Resigned / Relieved' },
                        { value: 'Inactive', label: 'Inactive' }
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Salary & Bank */}
              {empModalTab === 'compensation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">BASIC SALARY (LKR) *</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={empForm.basicSalary}
                        onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">FOOD ALLOWANCE (LKR)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={empForm.foodAllowance}
                        onChange={(e) => setEmpForm({ ...empForm, foodAllowance: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">TRANSPORT ALLOWANCE (LKR)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={empForm.transportAllowance}
                        onChange={(e) => setEmpForm({ ...empForm, transportAllowance: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">OTHER FIXED ALLOWANCE (LKR)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={empForm.allowance}
                      onChange={(e) => setEmpForm({ ...empForm, allowance: e.target.value })}
                    />
                  </div>

                  <div style={{ background: 'var(--subtle-bg)', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>EPF & ETF Statutory Enrolment</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subject to 8% Employee deduction, 12% Employer EPF, and 3% Employer ETF</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={empForm.epfEligible}
                      onChange={(e) => setEmpForm({ ...empForm, epfEligible: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">BANK NAME</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Commercial Bank"
                        value={empForm.bankName}
                        onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">ACCOUNT NUMBER</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Account Number"
                        value={empForm.bankAccount}
                        onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">BRANCH NAME</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Kollupitiya"
                        value={empForm.bankBranch}
                        onChange={(e) => setEmpForm({ ...empForm, bankBranch: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Emergency & Leave Quotas */}
              {empModalTab === 'emergency' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">EMERGENCY CONTACT NAME</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Sunethra Rajapaksha"
                        value={empForm.emergencyContactName}
                        onChange={(e) => setEmpForm({ ...empForm, emergencyContactName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">RELATIONSHIP</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Spouse / Parent"
                        value={empForm.emergencyContactRelation}
                        onChange={(e) => setEmpForm({ ...empForm, emergencyContactRelation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">EMERGENCY PHONE</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="07XXXXXXXX"
                        value={empForm.emergencyContactPhone}
                        onChange={(e) => setEmpForm({ ...empForm, emergencyContactPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--subtle-border)', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800 }}>Annual Leave Quotas (Days per Year)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">ANNUAL LEAVE DAYS</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={empForm.leaveBalances?.annual ?? 14}
                          onChange={(e) => setEmpForm({
                            ...empForm,
                            leaveBalances: { ...empForm.leaveBalances, annual: Number(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <label className="form-label">CASUAL LEAVE DAYS</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={empForm.leaveBalances?.casual ?? 7}
                          onChange={(e) => setEmpForm({
                            ...empForm,
                            leaveBalances: { ...empForm.leaveBalances, casual: Number(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <label className="form-label">MEDICAL LEAVE DAYS</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={empForm.leaveBalances?.medical ?? 7}
                          onChange={(e) => setEmpForm({
                            ...empForm,
                            leaveBalances: { ...empForm.leaveBalances, medical: Number(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center" style={{ marginTop: '14px', borderTop: '1px solid var(--subtle-border)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Save Changes' : 'Register Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: APPLY LEAVE ================================================ */}
      {/* ========================================================================= */}
      {showLeaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px', padding: 0, borderRadius: '22px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Staff Leave Application
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveRequest} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <label className="form-label">SELECT STAFF MEMBER *</label>
                <CustomSelect 
                  value={leaveForm.employeeId}
                  onChange={(val) => setLeaveForm({ ...leaveForm, employeeId: val })}
                  options={activeStaff.map(e => ({ value: e.id, label: `${e.name} (${e.employeeId})` }))}
                />
              </div>

              {/* Show live leave quota remaining for this employee */}
              {leaveForm.employeeId && (() => {
                const bal = getEmployeeLeaveBalance ? getEmployeeLeaveBalance(leaveForm.employeeId) : null;
                if (!bal) return null;
                return (
                  <div style={{ background: 'var(--subtle-bg)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Annual: <strong>{bal.annual.remaining}</strong> left</span>
                    <span>Casual: <strong>{bal.casual.remaining}</strong> left</span>
                    <span>Medical: <strong>{bal.medical.remaining}</strong> left</span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">LEAVE TYPE</label>
                  <CustomSelect 
                    value={leaveForm.leaveType}
                    onChange={(val) => setLeaveForm({ ...leaveForm, leaveType: val })}
                    options={[
                      { value: 'Annual Leave', label: 'Annual Leave' },
                      { value: 'Casual Leave', label: 'Casual Leave' },
                      { value: 'Medical Leave', label: 'Medical Leave' },
                      { value: 'Half Day', label: 'Half Day Leave' },
                      { value: 'Unpaid Leave', label: 'Unpaid / No-Pay Leave' },
                      { value: 'Maternity / Paternity', label: 'Maternity / Paternity' }
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">TOTAL DAYS</label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    className="form-input"
                    value={leaveForm.days}
                    onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">START DATE</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={leaveForm.startDate}
                    onChange={(e) => handleLeaveDateChange('startDate', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">END DATE</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={leaveForm.endDate}
                    onChange={(e) => handleLeaveDateChange('endDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">REASON / NOTES</label>
                <textarea 
                  className="form-textarea"
                  rows="2"
                  placeholder="Reason for leave request..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: SALARY ADVANCE ============================================= */}
      {/* ========================================================================= */}
      {showAdvModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '480px', padding: 0, borderRadius: '22px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Issue Salary Advance / Loan
              </h3>
              <button onClick={() => setShowAdvModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSalaryAdvance} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <label className="form-label">SELECT STAFF MEMBER *</label>
                <CustomSelect 
                  value={advForm.employeeId}
                  onChange={(val) => setAdvForm({ ...advForm, employeeId: val })}
                  options={activeStaff.map(e => ({ value: e.id, label: `${e.name} (${e.employeeId})` }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">ADVANCE AMOUNT (LKR) *</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={advForm.amount}
                    onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">DISBURSEMENT METHOD</label>
                  <CustomSelect 
                    value={advForm.paymentMethod}
                    onChange={(val) => setAdvForm({ ...advForm, paymentMethod: val })}
                    options={[
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'Cash', label: 'Cash Payment' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">ISSUE DATE</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={advForm.requestDate}
                  onChange={(e) => setAdvForm({ ...advForm, requestDate: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">PURPOSE / REASON</label>
                <textarea 
                  className="form-textarea"
                  rows="2"
                  placeholder="e.g. Emergency family medical expenses"
                  value={advForm.reason}
                  onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdvModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Disburse Advance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: MONTHLY PAYROLL PROCESSOR ================================== */}
      {/* ========================================================================= */}
      {showPayrunModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '1100px', padding: 0, borderRadius: '24px',
            maxHeight: '94vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.85)', animation: 'modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="modal-header" style={{ padding: '20px 28px', borderBottom: '1px solid var(--subtle-border)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Process Monthly Staff Payroll Engine
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Integrates daily attendance absences, overtime pay, and automatic salary advance recovery
                  </span>
                </div>
              </div>
              <button onClick={() => setShowPayrunModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <label className="form-label" style={{ margin: 0 }}>PAYROLL MONTH:</label>
                  <input 
                    type="month"
                    className="form-input"
                    value={payrunMonth}
                    onChange={(e) => handlePayrunMonthChange(e.target.value)}
                    style={{ width: '170px' }}
                  />
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Processing <strong>{payrunCalcList.length}</strong> active staff members
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STAFF</th>
                      <th>ATTENDANCE</th>
                      <th>BASIC</th>
                      <th>ALLOWANCES</th>
                      <th>OT PAY</th>
                      <th>ABSENCE DEDUCT</th>
                      <th>ADVANCE DEDUCT</th>
                      <th>BONUS</th>
                      <th>EPF 8%</th>
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
                          <div style={{ fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{item.attSummary?.present || 26}P</span> · <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{item.daysAbsent}A</span> · <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{item.otHours}h OT</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>LKR {item.basic.toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>LKR {item.allow.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+LKR {item.otPay.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-LKR {item.absenceDeduction.toLocaleString()}</td>
                        <td style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>-LKR {item.advanceDeduction.toLocaleString()}</td>
                        <td>
                          <input 
                            type="number"
                            className="form-input"
                            value={item.bonus}
                            onChange={(e) => updatePayrunBonus(idx, e.target.value)}
                            style={{ width: '85px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                          />
                        </td>
                        <td style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-LKR {item.epfEmployee.toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                          LKR {item.netSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div style={{ background: 'var(--subtle-bg)', padding: '18px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', border: '1px solid var(--subtle-border)' }}>
                <div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Total Gross Payroll:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    LKR {payrunCalcList.reduce((s, c) => s + c.grossSalary, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Employer EPF (12%) + ETF (3%):</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>
                    LKR {(payrunCalcList.reduce((s, c) => s + c.epfEmployer + c.etfEmployer, 0)).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Total Net Salaries Payable:</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    LKR {payrunCalcList.reduce((s, c) => s + c.netSalary, 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayrunModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleExecutePayrun}>
                  <CheckCircle2 size={16} /> Disburse & Post Payrun to Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: VIEW INDIVIDUAL PAYSLIPS =================================== */}
      {/* ========================================================================= */}
      {viewingPayrun && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '820px', padding: 0, borderRadius: '22px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--panel-border)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Staff Payslips — {viewingPayrun.month}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Disbursed: {viewingPayrun.payrunDate || 'End of Month'}</span>
              </div>
              <button onClick={() => setViewingPayrun(null)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STAFF</th>
                      <th>BASIC</th>
                      <th>OT PAY</th>
                      <th>GROSS</th>
                      <th>EPF 8%</th>
                      <th>NET SALARY</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingPayrun.details || []).map((slip, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{slip.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{slip.designation}</div>
                        </td>
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

      {/* ========================================================================= */}
      {/* ===== MODAL: HIGH-RES PRINTABLE EMPLOYEE PAYSLIP ======================== */}
      {/* ========================================================================= */}
      {viewingPayslip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel printable-area" style={{
            width: '100%', maxWidth: '640px', padding: 0, borderRadius: '20px',
            maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', color: '#0f172a',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85)'
          }}>
            {/* Payslip Header */}
            <div style={{ padding: '24px 28px', borderBottom: '2px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {(smsConfig.receiptLogo || smsConfig.companyLogo) && (
                  <img 
                    src={smsConfig.receiptLogo || smsConfig.companyLogo} 
                    alt="Logo" 
                    style={{ height: '46px', maxWidth: '110px', objectFit: 'contain' }} 
                  />
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {smsConfig.companyName || 'GYMSALES PRO FITNESS LTD'}
                  </h2>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                  {smsConfig.companyAddress || '42/A Galle Road, Colombo 03, Sri Lanka'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Email: {smsConfig.companyEmail || 'payroll@gymsales.lk'} · Hotline: {smsConfig.companyPhone || '0112345678'}
                </div>
              </div>
            </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: '#059669', color: '#ffffff', letterSpacing: '0.08em' }}>
                  SALARY PAYSLIP
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  Period: {viewingPayslip.month}
                </div>
                <div className="no-print" style={{ marginTop: '10px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                    <Printer size={13} /> Print
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewingPayslip(null)}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Employee Metadata */}
            <div style={{ padding: '20px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Employee Name: </span>
                <strong style={{ color: '#0f172a' }}>{viewingPayslip.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Designation: </span>
                <strong style={{ color: '#0f172a' }}>{viewingPayslip.designation}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Staff ID: </span>
                <strong style={{ color: '#0f172a' }}>{viewingPayslip.empCode || 'EMP-STAFF'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Department: </span>
                <strong style={{ color: '#0f172a' }}>{viewingPayslip.department || 'Operations'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Disbursement Date: </span>
                <strong style={{ color: '#0f172a' }}>{viewingPayslip.payrunDate || 'End of Month'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Disbursement Mode: </span>
                <strong style={{ color: '#0f172a' }}>Bank Transfer ({viewingPayslip.bankName || 'Bank'})</strong>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Earnings Column */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#059669', borderBottom: '2px solid #059669', paddingBottom: '6px', marginBottom: '8px' }}>
                    EARNINGS (LKR)
                  </div>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 0', color: '#475569' }}>Basic Salary</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{(Number(viewingPayslip.basic) || 0).toLocaleString()}</td>
                      </tr>
                      {Number(viewingPayslip.fixedAllowance) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#475569' }}>Fixed Allowance</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{(Number(viewingPayslip.fixedAllowance) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {Number(viewingPayslip.foodAllowance) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#475569' }}>Food Allowance</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{(Number(viewingPayslip.foodAllowance) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {Number(viewingPayslip.transportAllowance) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#475569' }}>Transport Allowance</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{(Number(viewingPayslip.transportAllowance) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {/* fallback for old records that have only `allow` */}
                      {!viewingPayslip.fixedAllowance && !viewingPayslip.foodAllowance && !viewingPayslip.transportAllowance && Number(viewingPayslip.allow) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#475569' }}>Fixed Allowances</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{(Number(viewingPayslip.allow) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {Number(viewingPayslip.otPay) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#059669' }}>OT Pay ({viewingPayslip.otHours || 0} hrs @ 1.5×)</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#059669' }}>+{(Number(viewingPayslip.otPay) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {Number(viewingPayslip.bonus) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#059669' }}>Performance Bonus</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#059669' }}>+{(Number(viewingPayslip.bonus) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Deductions Column */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: '6px', marginBottom: '8px' }}>
                    DEDUCTIONS (LKR)
                  </div>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 0', color: '#475569' }}>Employee EPF (8%)</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{(Number(viewingPayslip.epfEmployee) || 0).toLocaleString()}</td>
                      </tr>
                      {Number(viewingPayslip.absenceDeduction) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#dc2626' }}>Absence ({viewingPayslip.daysAbsent || 0} days)</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{(Number(viewingPayslip.absenceDeduction) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {Number(viewingPayslip.advanceDeduction) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 0', color: '#d97706' }}>Salary Advance Recovery</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>-{(Number(viewingPayslip.advanceDeduction) || 0).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Salary Banner */}
              <div style={{ marginTop: '24px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px 20px', borderRadius: '12px' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>NET SALARY PAYABLE:</span>
                    <div style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                      Sri Lankan Rupees {numberToWords(viewingPayslip.netSalary)} Only
                    </div>
                  </div>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
                    LKR {(Number(viewingPayslip.netSalary) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Employer Statutory Contributions */}
              <div style={{ marginTop: '16px', background: '#f1f5f9', padding: '12px 18px', borderRadius: '10px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Employer EPF (12%): <strong>LKR {(Number(viewingPayslip.epfEmployer) || 0).toLocaleString()}</strong></span>
                <span>Employer ETF (3%): <strong>LKR {(Number(viewingPayslip.etfEmployer) || 0).toLocaleString()}</strong></span>
                <span>Total Statutory EPF (20%): <strong>LKR {((Number(viewingPayslip.epfEmployee) || 0) + (Number(viewingPayslip.epfEmployer) || 0)).toLocaleString()}</strong></span>
              </div>

              {/* Signatures */}
              <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ height: '30px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Employee Signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ height: '30px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontWeight: 700, color: '#0f172a' }}>Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: MASTER PAYROLL PAY SHEET REGISTER ========================== */}
      {/* ========================================================================= */}
      {viewingMasterSheet && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel printable-area" style={{
            width: '100%', maxWidth: '1100px', padding: 0, borderRadius: '22px',
            maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', color: '#0f172a',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '2px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  MASTER PAYROLL REGISTER & PAY SHEET
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {smsConfig.companyName || 'GymSales Pro Ltd'} · Month of {viewingMasterSheet.month}
                </span>
              </div>
              <div className="no-print flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Master Pay Sheet
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewingMasterSheet(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>STAFF</th>
                    <th style={{ padding: '8px' }}>BASIC</th>
                    <th style={{ padding: '8px' }}>ALLOW</th>
                    <th style={{ padding: '8px' }}>OT PAY</th>
                    <th style={{ padding: '8px' }}>BONUS</th>
                    <th style={{ padding: '8px' }}>GROSS</th>
                    <th style={{ padding: '8px', color: '#dc2626' }}>EPF 8%</th>
                    <th style={{ padding: '8px', color: '#d97706' }}>ADVANCE</th>
                    <th style={{ padding: '8px', color: '#dc2626' }}>ABSENCE</th>
                    <th style={{ padding: '8px', color: '#059669', fontWeight: 900 }}>NET PAY</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingMasterSheet.details || []).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{row.name}</td>
                      <td style={{ padding: '8px' }}>{(row.basic || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>{(row.allow || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>+{(row.otPay || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>+{(row.bonus || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{(row.grossSalary || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', color: '#dc2626' }}>-{(row.epfEmployee || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', color: '#d97706' }}>-{(row.advanceDeduction || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', color: '#dc2626' }}>-{(row.absenceDeduction || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#059669' }}>LKR {(row.netSalary || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Column Totals */}
              <div style={{ marginTop: '20px', background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Gross Payroll: </span>
                  <strong style={{ fontSize: '1.1rem' }}>LKR {(viewingMasterSheet.totalGross || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Net Pay Disbursed: </span>
                  <strong style={{ fontSize: '1.25rem', color: '#059669' }}>LKR {(viewingMasterSheet.totalNet || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: STATUTORY EPF / ETF C-FORM RETURN ========================== */}
      {/* ========================================================================= */}
      {viewingCForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel printable-area" style={{
            width: '100%', maxWidth: '780px', padding: 0, borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', color: '#1e293b'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-2">
                <div style={{ background: '#059669', color: '#ffffff', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>C</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>STATUTORY EPF / ETF C-FORM RETURN</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Month of Return: {viewingCForm.month}</span>
                </div>
              </div>
              <div className="no-print flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print C-Form
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewingCForm(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>STAFF NAME</th>
                    <th style={{ padding: '10px' }}>BASIC SALARY</th>
                    <th style={{ padding: '10px' }}>EPF 8% (EE)</th>
                    <th style={{ padding: '10px' }}>EPF 12% (ER)</th>
                    <th style={{ padding: '10px' }}>TOTAL EPF (20%)</th>
                    <th style={{ padding: '10px' }}>ETF 3% (ER)</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingCForm.details || []).map((row, i) => {
                    const epfTotal = (row.epfEmployee || 0) + (row.epfEmployer || 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{row.name}</td>
                        <td style={{ padding: '10px' }}>LKR {(row.basic || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px', color: '#dc2626' }}>LKR {(row.epfEmployee || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px', color: '#2563eb' }}>LKR {(row.epfEmployer || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>LKR {epfTotal.toLocaleString()}</td>
                        <td style={{ padding: '10px', color: '#d97706' }}>LKR {(row.etfEmployer || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Monthly EPF Remittance (20%):</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    LKR {((viewingCForm.details || []).reduce((s, r) => s + (r.epfEmployee || 0) + (r.epfEmployer || 0), 0)).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Monthly ETF Liability (3%):</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d97706' }}>
                    LKR {((viewingCForm.details || []).reduce((s, r) => s + (r.etfEmployer || 0), 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: GENERATE OFFICIAL HR LETTER =============================== */}
      {/* ========================================================================= */}
      {showLetterModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px', padding: 0, borderRadius: '22px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Generate Official HR Letter / Certificate
              </h3>
              <button onClick={() => setShowLetterModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerateLetter} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <label className="form-label">SELECT STAFF MEMBER *</label>
                <CustomSelect 
                  value={letterForm.employeeId}
                  onChange={(val) => setLetterForm({ ...letterForm, employeeId: val })}
                  options={activeStaff.map(e => ({ value: e.id, label: `${e.name} (${e.designation})` }))}
                />
              </div>

              <div>
                <label className="form-label">DOCUMENT TEMPLATE</label>
                <CustomSelect 
                  value={letterForm.type}
                  onChange={(val) => setLetterForm({ ...letterForm, type: val })}
                  options={[
                    { value: 'Salary Certificate', label: 'Salary Certificate (Bank / Visa Loan)' },
                    { value: 'Appointment Letter', label: 'Appointment / Employment Offer Letter' },
                    { value: 'Service Certificate', label: 'Service & Experience Certificate' },
                    { value: 'Promotion Letter', label: 'Salary Increment & Promotion Letter' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">ADDRESSED TO</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. The Manager, Commercial Bank"
                    value={letterForm.recipient}
                    onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">DATE OF ISSUANCE</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={letterForm.date}
                    onChange={(e) => setLetterForm({ ...letterForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLetterModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate & Preview</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: VIEW & PRINT OFFICIAL HR LETTER ============================ */}
      {/* ========================================================================= */}
      {viewingLetter && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel printable-area" style={{
            width: '100%', maxWidth: '680px', padding: 0, borderRadius: '20px',
            maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', color: '#0f172a',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85)'
          }}>
            <div style={{ padding: '24px 32px', borderBottom: '2px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                  {smsConfig.companyName || 'GYMSALES PRO FITNESS LTD'}
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  {smsConfig.companyAddress || '42/A Galle Road, Colombo 03, Sri Lanka'}
                </div>
              </div>
              <div className="no-print flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Letter
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewingLetter(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '32px', fontSize: '0.88rem', lineHeight: 1.7, color: '#1e293b' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '24px', fontSize: '0.82rem', color: '#64748b' }}>
                <span>Ref: {viewingLetter.refNumber || 'HR-REF-001'}</span>
                <span>Date: {viewingLetter.date || new Date().toISOString().split('T')[0]}</span>
              </div>

              <div style={{ fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
                {viewingLetter.recipient || 'To Whom It May Concern'}
              </div>

              <div style={{ fontWeight: 900, fontSize: '1.05rem', textDecoration: 'underline', marginBottom: '20px', color: '#0f172a' }}>
                {viewingLetter.type?.toUpperCase()}
              </div>

              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '40px' }}>
                {viewingLetter.content}
              </div>

              <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ height: '35px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '180px', paddingTop: '4px', fontWeight: 700, color: '#0f172a' }}>
                    Head of Human Resources
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Authorized Signatory</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '35px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '180px', paddingTop: '4px', fontWeight: 700, color: '#0f172a' }}>
                    Managing Director
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Corporate Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: CONDUCT APPRAISAL ========================================== */}
      {/* ========================================================================= */}
      {showAppraisalModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px', padding: 0, borderRadius: '22px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Conduct Staff Performance Appraisal
              </h3>
              <button onClick={() => setShowAppraisalModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!appraisalForm.employeeId) {
                showNotification('Please select staff member', 'error');
                return;
              }
              const emp = employees.find(e => e.id === appraisalForm.employeeId);
              const p = Number(appraisalForm.punctualityRating) || 5;
              const q = Number(appraisalForm.trainingQualityRating) || 5;
              const c = Number(appraisalForm.clientEngagementRating) || 5;
              const t = Number(appraisalForm.teamworkRating) || 5;
              const i = Number(appraisalForm.initiativeRating) || 5;
              const overall = Math.round(((p + q + c + t + i) / 5) * 10) / 10;

              addPerformanceReview({
                ...appraisalForm,
                employeeName: emp ? emp.name : 'Staff Member',
                overallScore: overall,
                reviewer: 'Management'
              });
              setShowAppraisalModal(false);
            }} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <label className="form-label">SELECT STAFF MEMBER *</label>
                <CustomSelect 
                  value={appraisalForm.employeeId}
                  onChange={(val) => setAppraisalForm({ ...appraisalForm, employeeId: val })}
                  options={activeStaff.map(e => ({ value: e.id, label: `${e.name} (${e.employeeId})` }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">PUNCTUALITY (1-5★)</label>
                  <input type="number" min="1" max="5" className="form-input" value={appraisalForm.punctualityRating} onChange={e => setAppraisalForm({ ...appraisalForm, punctualityRating: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">JOB QUALITY (1-5★)</label>
                  <input type="number" min="1" max="5" className="form-input" value={appraisalForm.trainingQualityRating} onChange={e => setAppraisalForm({ ...appraisalForm, trainingQualityRating: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">CLIENT SERVICE (1-5★)</label>
                  <input type="number" min="1" max="5" className="form-input" value={appraisalForm.clientEngagementRating} onChange={e => setAppraisalForm({ ...appraisalForm, clientEngagementRating: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">TEAMWORK (1-5★)</label>
                  <input type="number" min="1" max="5" className="form-input" value={appraisalForm.teamworkRating} onChange={e => setAppraisalForm({ ...appraisalForm, teamworkRating: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="form-label">INITIATIVE & ATTITUDE (1-5★)</label>
                <input type="number" min="1" max="5" className="form-input" value={appraisalForm.initiativeRating} onChange={e => setAppraisalForm({ ...appraisalForm, initiativeRating: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">APPRAISAL FEEDBACK & DEVELOPMENT GOALS</label>
                <textarea 
                  className="form-textarea"
                  rows="2"
                  placeholder="Manager observations, strengths, areas of growth..."
                  value={appraisalForm.comments}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, comments: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAppraisalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Appraisal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: SUBMIT EXPENSE CLAIM ======================================= */}
      {/* ========================================================================= */}
      {showClaimModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          padding: '20px', animation: 'backdropFade 0.15s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px', padding: 0, borderRadius: '22px',
            border: '1px solid var(--panel-border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
          }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--subtle-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Submit Staff Expense Claim
              </h3>
              <button onClick={() => setShowClaimModal(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!claimForm.employeeId) {
                showNotification('Please select staff member', 'error');
                return;
              }
              const emp = employees.find(e => e.id === claimForm.employeeId);
              addExpenseClaim({
                ...claimForm,
                employeeName: emp ? emp.name : 'Staff Member'
              });
              setShowClaimModal(false);
            }} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <label className="form-label">SELECT STAFF MEMBER *</label>
                <CustomSelect 
                  value={claimForm.employeeId}
                  onChange={(val) => setClaimForm({ ...claimForm, employeeId: val })}
                  options={activeStaff.map(e => ({ value: e.id, label: `${e.name} (${e.employeeId})` }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">EXPENSE CATEGORY</label>
                  <CustomSelect 
                    value={claimForm.category}
                    onChange={(val) => setClaimForm({ ...claimForm, category: val })}
                    options={[
                      { value: 'Gym Equipment Supplies', label: 'Gym Equipment Supplies' },
                      { value: 'Travel & Transport', label: 'Travel & Transport' },
                      { value: 'Office Stationary', label: 'Office Stationary' },
                      { value: 'Staff Welfare / Meals', label: 'Staff Welfare / Meals' },
                      { value: 'Other Miscellaneous', label: 'Other Miscellaneous' }
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">CLAIM AMOUNT (LKR) *</label>
                  <input type="number" className="form-input" value={claimForm.amount} onChange={e => setClaimForm({ ...claimForm, amount: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="form-label">CLAIM DESCRIPTION / RECEIPT DETAILS</label>
                <textarea 
                  className="form-textarea"
                  rows="2"
                  placeholder="Receipt number and reason for purchase..."
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClaimModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HR;
