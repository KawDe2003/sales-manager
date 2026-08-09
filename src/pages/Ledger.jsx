import React, { useState, useContext, useMemo } from 'react';
import { 
  BookOpen, Scale, Plus, Search, Filter, FileText, Download, Trash2, Edit2, 
  CheckCircle2, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight, Eye, 
  Printer, DollarSign, Calendar, Layers, ShieldCheck, FileSpreadsheet, PlusCircle, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StoreContext } from '../context/StoreContext';
import { exportAccountLedgerPDF, exportJournalVoucherPDF, exportTrialBalancePDF } from '../utils/pdfGenerator';
import CustomSelect from '../components/CustomSelect';

const Ledger = () => {
  const { 
    accounts = [], journalEntries = [], journalLines = [], 
    createJournalEntry, addAccount, updateAccount, deleteAccount, deleteJournalEntry,
    showNotification 
  } = useContext(StoreContext);

  const [activeTab, setActiveTab] = useState('coa'); // 'coa' | 'statement' | 'vouchers' | 'trial'

  // Chart of Accounts Filters & Search
  const [coaSearch, setCoaSearch] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState('all');

  // Selected Account for Ledger Statement
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '1020');
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'asset',
    statement_category: 'cash_and_equivalents',
    is_current: true,
    parentId: '',
    status: 'Active'
  });

  // Journal Voucher Modal State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    reference: `JV-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    description: '',
    createdBy: 'Admin',
    lines: [
      { accountId: accounts[0]?.id || '1020', debit: '', credit: '', memo: '' },
      { accountId: accounts[1]?.id || '4010', debit: '', credit: '', memo: '' }
    ]
  });

  // Expanded Journal Voucher Details
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  // Category mapping definitions for statement classification
  const categoryOptions = [
    { value: 'cash_and_equivalents', label: 'Cash & Cash Equivalents (Current Asset)' },
    { value: 'trade_receivables', label: 'Trade Receivables / Debtors (Current Asset)' },
    { value: 'inventory', label: 'Inventory / Stock Assets (Current Asset)' },
    { value: 'ppe', label: 'Property, Plant & Equipment (Non-Current Asset)' },
    { value: 'accumulated_depreciation', label: 'Accumulated Depreciation (Asset Contra)' },
    { value: 'intangible_assets', label: 'Intangible Assets (Non-Current Asset)' },
    { value: 'trade_payables', label: 'Trade Payables / Creditors (Current Liability)' },
    { value: 'tax_payable', label: 'Tax Payable (Current Liability)' },
    { value: 'short_term_borrowings', label: 'Short-Term Borrowings (Current Liability)' },
    { value: 'long_term_loans', label: 'Long-Term Loans / Liabilities (Non-Current)' },
    { value: 'stated_capital', label: 'Owner Stated Capital (Equity)' },
    { value: 'retained_earnings', label: 'Retained Earnings (Equity)' },
    { value: 'drawings', label: "Owner's Drawings / Dividends (Equity)" },
    { value: 'revenue', label: 'Main Sales & Operating Revenue (Revenue)' },
    { value: 'other_income', label: 'Other Operating Income (Revenue)' },
    { value: 'finance_income', label: 'Finance & Interest Income (Revenue)' },
    { value: 'cost_of_sales', label: 'Cost of Goods Sold / Cost of Sales (Expense)' },
    { value: 'administrative_expenses', label: 'Administrative & Operating Expenses (Expense)' },
    { value: 'distribution_costs', label: 'Distribution & Marketing Expenses (Expense)' },
    { value: 'other_expenses', label: 'Other Operating Expenses (Expense)' },
    { value: 'finance_costs', label: 'Finance Costs & Interest Expense (Expense)' },
    { value: 'tax_expense', label: 'Income Tax Expense (Expense)' }
  ];

  // Helper map to quickly get entries by ID
  const entryMap = useMemo(() => new Map(journalEntries.map(e => [e.id, e])), [journalEntries]);

  // Account net balance calculations
  const accountBalances = useMemo(() => {
    const map = new Map();
    accounts.forEach(acc => {
      const lines = journalLines.filter(l => l.accountId === acc.id || l.accountId === acc.code);
      const totalDeb = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCred = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

      let net = 0;
      if (acc.type === 'revenue' || acc.type === 'liability' || acc.type === 'equity') {
        net = totalCred - totalDeb;
      } else {
        net = totalDeb - totalCred;
      }

      map.set(acc.id, { totalDeb, totalCred, net });
    });
    return map;
  }, [accounts, journalLines]);

  // System-wide trial balance totals
  const overallTotals = useMemo(() => {
    const totalDebits = journalLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredits = journalLines.reduce((s, l) => s + Number(l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const discrepancy = totalDebits - totalCredits;
    return { totalDebits, totalCredits, isBalanced, discrepancy };
  }, [journalLines]);

  // Filtered CoA list
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = acc.name.toLowerCase().includes(coaSearch.toLowerCase()) || 
                          acc.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
                          (acc.statement_category && acc.statement_category.toLowerCase().includes(coaSearch.toLowerCase()));
      const matchType = coaTypeFilter === 'all' || acc.type?.toLowerCase() === coaTypeFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [accounts, coaSearch, coaTypeFilter]);

  // Handle Account Form Submit (Create or Edit)
  const handleAccountSubmit = (e) => {
    e.preventDefault();
    if (!accountForm.code || !accountForm.name) {
      showNotification('Please enter both Account Code and Account Name', 'error');
      return;
    }

    if (editingAccount) {
      updateAccount(editingAccount.id, accountForm);
    } else {
      addAccount(accountForm);
    }

    setIsAccountModalOpen(false);
    setEditingAccount(null);
    setAccountForm({
      code: '',
      name: '',
      type: 'asset',
      statement_category: 'cash_and_equivalents',
      is_current: true,
      parentId: '',
      status: 'Active'
    });
  };

  // Open Edit Account Modal
  const handleEditAccount = (acc) => {
    setEditingAccount(acc);
    setAccountForm({
      code: acc.code,
      name: acc.name,
      type: acc.type || 'asset',
      statement_category: acc.statement_category || 'cash_and_equivalents',
      is_current: acc.is_current !== undefined ? acc.is_current : true,
      parentId: acc.parentId || '',
      status: acc.status || 'Active'
    });
    setIsAccountModalOpen(true);
  };

  // Handle Delete Account
  const handleDeleteAccountClick = (acc) => {
    if (window.confirm(`Are you sure you want to delete Account ${acc.code} (${acc.name})?`)) {
      try {
        deleteAccount(acc.id);
      } catch (e) {
        // Notification already handled in context
      }
    }
  };

  // Handle Journal Line updates in Voucher Form
  const updateVoucherLine = (index, field, value) => {
    setVoucherForm(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const addVoucherLine = () => {
    setVoucherForm(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: accounts[0]?.id || '1020', debit: '', credit: '', memo: '' }]
    }));
  };

  const removeVoucherLine = (index) => {
    if (voucherForm.lines.length <= 2) {
      showNotification('A journal voucher must have at least 2 lines', 'error');
      return;
    }
    setVoucherForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Calculate live voucher totals
  const voucherTotals = useMemo(() => {
    const debits = voucherForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credits = voucherForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const isBalanced = Math.abs(debits - credits) < 0.01 && debits > 0;
    const difference = debits - credits;
    return { debits, credits, isBalanced, difference };
  }, [voucherForm.lines]);

  // Handle Journal Voucher Submit
  const handleVoucherSubmit = (e) => {
    e.preventDefault();
    if (!voucherForm.reference || !voucherForm.description) {
      showNotification('Please enter Voucher Reference and Narration', 'error');
      return;
    }

    if (!voucherTotals.isBalanced) {
      showNotification(`Voucher is unbalanced! Debits (LKR ${voucherTotals.debits.toLocaleString()}) must equal Credits (LKR ${voucherTotals.credits.toLocaleString()})`, 'error');
      return;
    }

    try {
      createJournalEntry({
        date: voucherForm.date,
        reference: voucherForm.reference,
        description: voucherForm.description,
        createdBy: voucherForm.createdBy || 'Admin',
        lines: voucherForm.lines.map(l => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        }))
      });

      showNotification(`Posted Journal Voucher #${voucherForm.reference} successfully!`);
      setIsVoucherModalOpen(false);
      setVoucherForm({
        reference: `JV-${new Date().getFullYear()}-${String(journalEntries.length + 2).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        description: '',
        createdBy: 'Admin',
        lines: [
          { accountId: accounts[0]?.id || '1020', debit: '', credit: '', memo: '' },
          { accountId: accounts[1]?.id || '4010', debit: '', credit: '', memo: '' }
        ]
      });
    } catch (err) {
      // Error notification handled in createJournalEntry
    }
  };

  // Export Chart of Accounts to Excel
  const exportCoaExcel = () => {
    const data = accounts.map(acc => {
      const bal = accountBalances.get(acc.id);
      return {
        'Account Code': acc.code,
        'Account Name': acc.name,
        'Type': acc.type?.toUpperCase(),
        'Category': acc.statement_category,
        'Classification': acc.is_current ? 'Current' : 'Non-Current',
        'Status': acc.status || 'Active',
        'Total Debit (LKR)': bal?.totalDeb || 0,
        'Total Credit (LKR)': bal?.totalCred || 0,
        'Net Balance (LKR)': bal?.net || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    XLSX.writeFile(wb, 'Chart_of_Accounts_Export.xlsx');
  };

  // Selected Account details for Account Statement tab
  const targetAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId || a.code === selectedAccountId) || accounts[0], [accounts, selectedAccountId]);

  // Account Ledger Lines for Account Statement tab
  const selectedAccountLines = useMemo(() => {
    if (!targetAccount) return [];
    return journalLines.filter(line => {
      if (line.accountId !== targetAccount.id && line.accountId !== targetAccount.code) return false;
      const entry = entryMap.get(line.journalEntryId);
      if (!entry) return false;
      if (statementStartDate && entry.date < statementStartDate) return false;
      if (statementEndDate && entry.date > statementEndDate) return false;
      return true;
    }).sort((a, b) => {
      const dateA = entryMap.get(a.journalEntryId)?.date || '';
      const dateB = entryMap.get(b.journalEntryId)?.date || '';
      return dateA.localeCompare(dateB);
    });
  }, [journalLines, targetAccount, entryMap, statementStartDate, statementEndDate]);

  // Account Statement export Excel
  const exportStatementExcel = () => {
    if (!targetAccount) return;
    let runningNet = 0;
    const data = selectedAccountLines.map(line => {
      const entry = entryMap.get(line.journalEntryId);
      const deb = Number(line.debit || 0);
      const cred = Number(line.credit || 0);
      if (targetAccount.type === 'revenue' || targetAccount.type === 'liability' || targetAccount.type === 'equity') {
        runningNet += (cred - deb);
      } else {
        runningNet += (deb - cred);
      }

      return {
        'Date': entry?.date || '—',
        'Voucher Ref': entry?.reference || '—',
        'Particulars / Narration': entry?.description || 'Journal Entry',
        'Posted By': entry?.createdBy || 'System',
        'Debit (LKR)': deb,
        'Credit (LKR)': cred,
        'Running Balance (LKR)': runningNet
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ledger_${targetAccount.code}`);
    XLSX.writeFile(wb, `Account_Ledger_${targetAccount.code}_Statement.xlsx`);
  };

  // Export Trial Balance to Excel
  const exportTrialBalanceExcel = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    const data = accounts.map(acc => {
      const accLines = journalLines.filter(l => l.accountId === acc.id || l.accountId === acc.code);
      let deb = accLines.reduce((s, l) => s + Number(l.debit || 0), 0);
      let cred = accLines.reduce((s, l) => s + Number(l.credit || 0), 0);

      let debitBal = 0;
      let creditBal = 0;

      if (acc.type === 'revenue' || acc.type === 'liability' || acc.type === 'equity') {
        const net = cred - deb;
        if (net >= 0) creditBal = net;
        else debitBal = Math.abs(net);
      } else {
        const net = deb - cred;
        if (net >= 0) debitBal = net;
        else creditBal = Math.abs(net);
      }

      totalDebit += debitBal;
      totalCredit += creditBal;

      return {
        'Account Code': acc.code,
        'Account Name': acc.name,
        'Account Type': acc.type?.toUpperCase(),
        'Statement Category': acc.statement_category,
        'Debit Balance (LKR)': debitBal,
        'Credit Balance (LKR)': creditBal
      };
    });

    data.push({
      'Account Code': 'TOTAL',
      'Account Name': 'TOTAL TRIAL BALANCE',
      'Account Type': '',
      'Statement Category': '',
      'Debit Balance (LKR)': totalDebit,
      'Credit Balance (LKR)': totalCredit
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, 'Trial_Balance_Report.xlsx');
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* PAGE HEADER */}
      <div className="glass-panel" style={{ padding: '24px 30px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={14} /> ERP Accounting Engine
              </span>
              <span className={`badge ${overallTotals.isBalanced ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {overallTotals.isBalanced ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                {overallTotals.isBalanced ? 'GL Balanced (Double-Entry Reconciled)' : `Discrepancy: LKR ${Math.abs(overallTotals.discrepancy).toLocaleString()}`}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              General Ledger & Chart of Accounts
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Double-entry account register, individual T-Account history statements, and manual journal voucher posting.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                setEditingAccount(null);
                setAccountForm({
                  code: '',
                  name: '',
                  type: 'asset',
                  statement_category: 'cash_and_equivalents',
                  is_current: true,
                  parentId: '',
                  status: 'Active'
                });
                setIsAccountModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
            >
              <Plus size={16} /> New Account
            </button>

            <button 
              onClick={() => setIsVoucherModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
            >
              <PlusCircle size={16} /> Post Journal Voucher
            </button>
          </div>
        </div>

        {/* METRIC SUMMARY CARDS */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '16px', 
          marginTop: '24px' 
        }}>
          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chart of Accounts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {accounts.length} Accounts
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: 600 }}>
              5 Financial Categories
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Ledger Debits
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
              LKR {overallTotals.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cumulative Debits Posted
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Ledger Credits
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
              LKR {overallTotals.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cumulative Credits Posted
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Journal Vouchers
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {journalEntries.length} Entries
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {journalLines.length} Ledger Line Items
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('coa')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'coa' ? 'var(--panel-bg)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'coa' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'coa' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'coa' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen size={18} /> Chart of Accounts ({accounts.length})
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'statement' ? 'var(--panel-bg)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'statement' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'statement' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'statement' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          <FileText size={18} /> Account Ledger Statement
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'vouchers' ? 'var(--panel-bg)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'vouchers' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'vouchers' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'vouchers' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={18} /> Journal Vouchers ({journalEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('trial')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'trial' ? 'var(--panel-bg)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'trial' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'trial' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'trial' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          <Scale size={18} /> Trial Balance
        </button>
      </div>

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeTab === 'coa' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* SEARCH & FILTER BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Search account code, name, or statement category..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>

              <CustomSelect 
                value={coaTypeFilter}
                onChange={setCoaTypeFilter}
                options={[
                  { value: 'all', label: 'All Account Types' },
                  { value: 'asset', label: 'Assets' },
                  { value: 'liability', label: 'Liabilities' },
                  { value: 'equity', label: 'Equity' },
                  { value: 'revenue', label: 'Revenue' },
                  { value: 'expense', label: 'Expenses' }
                ]}
                style={{ width: '200px' }}
              />
            </div>

            <button 
              onClick={exportCoaExcel}
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}
            >
              <FileSpreadsheet size={16} /> Export CoA (Excel)
            </button>
          </div>

          {/* ACCOUNTS TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Statement Classification</th>
                  <th style={{ textAlign: 'right' }}>Total Debit (LKR)</th>
                  <th style={{ textAlign: 'right' }}>Total Credit (LKR)</th>
                  <th style={{ textAlign: 'right' }}>Net Balance (LKR)</th>
                  <th style={{ textAlign: 'center', width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No matching ledger accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => {
                    const bal = accountBalances.get(acc.id) || { totalDeb: 0, totalCred: 0, net: 0 };
                    const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';

                    return (
                      <tr key={acc.id}>
                        <td>
                          <span style={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            color: 'var(--accent-primary)',
                            fontSize: '0.85rem'
                          }}>
                            {acc.code}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</div>
                          {acc.parentId && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Sub-account of ID: {acc.parentId}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${
                            acc.type === 'asset' ? 'badge-primary' :
                            acc.type === 'liability' ? 'badge-warning' :
                            acc.type === 'equity' ? 'badge-info' :
                            acc.type === 'revenue' ? 'badge-success' : 'badge-danger'
                          }`} style={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                            {acc.type}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {acc.statement_category?.replace(/_/g, ' ') || 'General'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {acc.is_current ? 'Current Classification' : 'Non-Current Classification'}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {bal.totalDeb > 0 ? bal.totalDeb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {bal.totalCred > 0 ? bal.totalCred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td style={{ 
                          textAlign: 'right', 
                          fontFamily: 'monospace', 
                          fontWeight: 800,
                          color: isDebitNormal ? (bal.net >= 0 ? 'var(--text-primary)' : 'var(--danger)') : (bal.net >= 0 ? 'var(--success)' : 'var(--danger)')
                        }}>
                          LKR {bal.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setSelectedAccountId(acc.id);
                                setActiveTab('statement');
                              }}
                              className="btn btn-icon"
                              title="View Account Ledger History"
                              style={{ padding: '6px', borderRadius: '6px' }}
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => handleEditAccount(acc)}
                              className="btn btn-icon"
                              title="Edit Account Details"
                              style={{ padding: '6px', borderRadius: '6px' }}
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleDeleteAccountClick(acc)}
                              className="btn btn-icon"
                              title="Delete Account"
                              style={{ padding: '6px', borderRadius: '6px', color: 'var(--danger)' }}
                            >
                              <Trash2 size={15} />
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

      {/* TAB 2: ACCOUNT LEDGER STATEMENT (T-ACCOUNT HISTORY) */}
      {activeTab === 'statement' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* ACCOUNT SELECTOR & DATE CONTROLS */}
          <div style={{ 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px', 
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--panel-border)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ width: '320px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  SELECT LEDGER ACCOUNT
                </label>
                <CustomSelect
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  options={accounts.map(a => ({
                    value: a.id,
                    label: `${a.code} - ${a.name} (${a.type.toUpperCase()})`
                  }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  FROM DATE
                </label>
                <input 
                  type="date" 
                  className="input" 
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  style={{ width: '150px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  TO DATE
                </label>
                <input 
                  type="date" 
                  className="input" 
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  style={{ width: '150px' }}
                />
              </div>

              {(statementStartDate || statementEndDate) && (
                <button 
                  onClick={() => { setStatementStartDate(''); setStatementEndDate(''); }}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-end', padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  Clear Dates
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={exportStatementExcel}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '0.85rem' }}
              >
                <FileSpreadsheet size={15} /> Excel
              </button>

              <button 
                onClick={() => exportAccountLedgerPDF({ 
                  account: targetAccount, 
                  lines: selectedAccountLines, 
                  journalEntries, 
                  startDate: statementStartDate, 
                  endDate: statementEndDate 
                })}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '0.85rem' }}
              >
                <Printer size={15} /> Export PDF
              </button>
            </div>
          </div>

          {/* TARGET ACCOUNT SUMMARY HEADER */}
          {targetAccount && (
            <div style={{ 
              padding: '20px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '12px', 
              border: '1px solid var(--panel-border)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Account Statement
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                    [{targetAccount.code}] {targetAccount.name}
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Type: <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{targetAccount.type}</strong> | Category: <strong style={{ color: 'var(--text-primary)' }}>{targetAccount.statement_category}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT ENDING NET BALANCE</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    LKR {(accountBalances.get(targetAccount.id)?.net || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TRANSACTION TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Posting Date</th>
                  <th style={{ width: '120px' }}>Voucher Ref</th>
                  <th>Particulars / Narration</th>
                  <th style={{ width: '100px' }}>Posted By</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Debit (LKR)</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Credit (LKR)</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Running Balance (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {selectedAccountLines.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No journal transaction lines recorded for this account in the selected period.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningNet = 0;
                    return selectedAccountLines.map((line) => {
                      const entry = entryMap.get(line.journalEntryId);
                      const deb = Number(line.debit || 0);
                      const cred = Number(line.credit || 0);

                      if (targetAccount?.type === 'revenue' || targetAccount?.type === 'liability' || targetAccount?.type === 'equity') {
                        runningNet += (cred - deb);
                      } else {
                        runningNet += (deb - cred);
                      }

                      return (
                        <tr key={line.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {entry?.date ? new Date(entry.date).toLocaleDateString() : '—'}
                          </td>

                          <td>
                            <span style={{ 
                              fontFamily: 'monospace', 
                              fontWeight: 700, 
                              fontSize: '0.8rem',
                              color: 'var(--accent-primary)'
                            }}>
                              {entry?.reference || '—'}
                            </span>
                          </td>

                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {entry?.description || line.memo || 'General Journal Posting'}
                          </td>

                          <td>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {entry?.createdBy || 'System'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: deb > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {deb > 0 ? deb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>

                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: cred > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {cred > 0 ? cred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>

                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            LKR {runningNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: JOURNAL VOUCHERS & MANUAL POSTING */}
      {activeTab === 'vouchers' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                General Journal Voucher Register
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                All double-entry vouchers posted automatically or created manually by accountants.
              </p>
            </div>

            <button 
              onClick={() => setIsVoucherModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
            >
              <PlusCircle size={16} /> Post New Journal Voucher
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Voucher Ref</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th>Narration / Description</th>
                  <th>Created By</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Total Amount (LKR)</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No journal vouchers posted yet.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map(entry => {
                    const lines = journalLines.filter(l => l.journalEntryId === entry.id);
                    const totalAmt = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
                    const isExpanded = expandedEntryId === entry.id;

                    return (
                      <React.Fragment key={entry.id}>
                        <tr>
                          <td>
                            <span style={{ 
                              fontFamily: 'monospace', 
                              fontWeight: 700, 
                              color: 'var(--accent-primary)',
                              fontSize: '0.85rem' 
                            }}>
                              {entry.reference}
                            </span>
                          </td>

                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                          </td>

                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entry.description || 'General Voucher Entry'}
                          </td>

                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {entry.createdBy || 'System'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                            LKR {totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button
                                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                className="btn btn-icon"
                                title={isExpanded ? 'Hide Voucher Details' : 'View Voucher Lines'}
                                style={{ padding: '6px', borderRadius: '6px' }}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() => exportJournalVoucherPDF({ entry, lines, accounts })}
                                className="btn btn-icon"
                                title="Print / Export Voucher PDF"
                                style={{ padding: '6px', borderRadius: '6px' }}
                              >
                                <Printer size={15} />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete / Void Journal Voucher ${entry.reference}?`)) {
                                    deleteJournalEntry(entry.id);
                                  }
                                }}
                                className="btn btn-icon"
                                title="Delete Voucher"
                                style={{ padding: '6px', borderRadius: '6px', color: 'var(--danger)' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED VOUCHER LINES ROW */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={{ background: 'var(--bg-secondary)', padding: '16px 24px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '10px' }}>
                                VOUCHER LINE ITEMS DEBIT/CREDIT BREAKDOWN (#{entry.reference})
                              </div>
                              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '6px' }}>Account Code & Name</th>
                                    <th style={{ textAlign: 'right', padding: '6px', width: '160px' }}>Debit (LKR)</th>
                                    <th style={{ textAlign: 'right', padding: '6px', width: '160px' }}>Credit (LKR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map(l => {
                                    const acc = accounts.find(a => a.id === l.accountId || a.code === l.accountId);
                                    return (
                                      <tr key={l.id} style={{ borderBottom: '1px dotted var(--panel-border)' }}>
                                        <td style={{ padding: '6px', fontWeight: 600 }}>
                                          [{acc?.code || l.accountId}] {acc?.name || 'Account'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', fontWeight: 700, color: Number(l.debit) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', fontWeight: 700, color: Number(l.credit) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                          {Number(l.credit) > 0 ? Number(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TRIAL BALANCE */}
      {activeTab === 'trial' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Trial Balance Reconciliation
                </h2>
                <span className={`badge ${overallTotals.isBalanced ? 'badge-success' : 'badge-danger'}`}>
                  {overallTotals.isBalanced ? '✓ Reconciled' : '⚠️ Discrepancy'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                General ledger trial balance debit and credit balance sheet per Sri Lanka Accounting Standards (SLFRS/LKAS).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={exportTrialBalanceExcel}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '0.85rem' }}
              >
                <FileSpreadsheet size={15} /> Export Excel
              </button>

              <button 
                onClick={() => exportTrialBalancePDF({ accounts, journalLines, journalEntries })}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '0.85rem' }}
              >
                <Printer size={15} /> Export PDF
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Code</th>
                  <th>Account Name</th>
                  <th>Account Type</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Debit Balance (LKR)</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Credit Balance (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let totalDebit = 0;
                  let totalCredit = 0;

                  const rows = accounts.map(acc => {
                    const accLines = journalLines.filter(l => l.accountId === acc.id || l.accountId === acc.code);
                    let deb = accLines.reduce((s, l) => s + Number(l.debit || 0), 0);
                    let cred = accLines.reduce((s, l) => s + Number(l.credit || 0), 0);

                    let debitBal = 0;
                    let creditBal = 0;

                    if (acc.type === 'revenue' || acc.type === 'liability' || acc.type === 'equity') {
                      const net = cred - deb;
                      if (net >= 0) creditBal = net;
                      else debitBal = Math.abs(net);
                    } else {
                      const net = deb - cred;
                      if (net >= 0) debitBal = net;
                      else creditBal = Math.abs(net);
                    }

                    totalDebit += debitBal;
                    totalCredit += creditBal;

                    return (
                      <tr key={acc.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {acc.code}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</td>
                        <td>
                          <span className={`badge ${
                            acc.type === 'asset' ? 'badge-primary' :
                            acc.type === 'liability' ? 'badge-warning' :
                            acc.type === 'equity' ? 'badge-info' :
                            acc.type === 'revenue' ? 'badge-success' : 'badge-danger'
                          }`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
                            {acc.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{acc.statement_category}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {debitBal > 0 ? debitBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {creditBal > 0 ? creditBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    );
                  });

                  return (
                    <>
                      {rows}
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <td colSpan={4} style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          TOTAL TRIAL BALANCE
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>
                          LKR {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                          LKR {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingAccount ? 'Edit Ledger Account' : 'Add New Ledger Account'}
              </h3>
              <button 
                onClick={() => setIsAccountModalOpen(false)}
                className="btn btn-icon"
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ACCOUNT CODE *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="e.g. 1030"
                    value={accountForm.code}
                    disabled={!!editingAccount}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ACCOUNT NAME *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="e.g. Petty Cash Account"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ACCOUNT TYPE *</label>
                  <CustomSelect
                    value={accountForm.type}
                    onChange={(val) => setAccountForm({ ...accountForm, type: val })}
                    options={[
                      { value: 'asset', label: 'Asset' },
                      { value: 'liability', label: 'Liability' },
                      { value: 'equity', label: 'Equity' },
                      { value: 'revenue', label: 'Revenue' },
                      { value: 'expense', label: 'Expense' }
                    ]}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CLASSIFICATION</label>
                  <CustomSelect
                    value={accountForm.is_current ? 'current' : 'non_current'}
                    onChange={(val) => setAccountForm({ ...accountForm, is_current: val === 'current' })}
                    options={[
                      { value: 'current', label: 'Current' },
                      { value: 'non_current', label: 'Non-Current' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>STATEMENT CATEGORY (SLFRS/LKAS)</label>
                <CustomSelect
                  value={accountForm.statement_category}
                  onChange={(val) => setAccountForm({ ...accountForm, statement_category: val })}
                  options={categoryOptions}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAccountModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 700 }}
                >
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST NEW JOURNAL VOUCHER MODAL */}
      {isVoucherModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', padding: '28px', borderRadius: '18px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Post Double-Entry Journal Voucher
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  All manual postings must balance ($\sum \text{Debits} = \sum \text{Credits}$).
                </p>
              </div>

              <button 
                onClick={() => setIsVoucherModalOpen(false)}
                className="btn btn-icon"
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>VOUCHER REFERENCE *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    value={voucherForm.reference}
                    onChange={(e) => setVoucherForm({ ...voucherForm, reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>POSTING DATE *</label>
                  <input 
                    type="date" 
                    className="input" 
                    required
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>POSTED BY</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={voucherForm.createdBy}
                    onChange={(e) => setVoucherForm({ ...voucherForm, createdBy: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>NARRATION / DESCRIPTION *</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  placeholder="e.g. Monthly Accrual Adjustment for Fiber Internet Expense"
                  value={voucherForm.description}
                  onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                />
              </div>

              {/* DYNAMIC VOUCHER LINES BUILDER */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="label" style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>
                    JOURNAL LINES (MINIMUM 2 LINES)
                  </label>
                  <button 
                    type="button" 
                    onClick={addVoucherLine}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    + Add Line Item
                  </button>
                </div>

                <div style={{ border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Account</th>
                        <th style={{ padding: '10px', textAlign: 'right', width: '140px' }}>Debit (LKR)</th>
                        <th style={{ padding: '10px', textAlign: 'right', width: '140px' }}>Credit (LKR)</th>
                        <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucherForm.lines.map((line, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--panel-border)' }}>
                          <td style={{ padding: '8px' }}>
                            <CustomSelect
                              value={line.accountId}
                              onChange={(val) => updateVoucherLine(idx, 'accountId', val)}
                              options={accounts.map(a => ({
                                value: a.id,
                                label: `[${a.code}] ${a.name} (${a.type.toUpperCase()})`
                              }))}
                            />
                          </td>

                          <td style={{ padding: '8px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              className="input"
                              placeholder="0.00"
                              value={line.debit}
                              onChange={(e) => updateVoucherLine(idx, 'debit', e.target.value)}
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                            />
                          </td>

                          <td style={{ padding: '8px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              className="input"
                              placeholder="0.00"
                              value={line.credit}
                              onChange={(e) => updateVoucherLine(idx, 'credit', e.target.value)}
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                            />
                          </td>

                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => removeVoucherLine(idx)}
                              className="btn btn-icon"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VOUCHER BALANCE STATUS BADGE */}
              <div style={{ 
                padding: '14px 18px', 
                borderRadius: '12px', 
                background: voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex', 
                justify: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {voucherTotals.isBalanced ? (
                    <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: voucherTotals.isBalanced ? 'var(--success)' : 'var(--danger)' }}>
                      {voucherTotals.isBalanced ? 'Voucher is Perfectly Balanced' : 'Unbalanced Journal Voucher'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Total Debits: LKR {voucherTotals.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Total Credits: LKR {voucherTotals.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {!voucherTotals.isBalanced && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--danger)', fontSize: '0.88rem' }}>
                    Diff: LKR {Math.abs(voucherTotals.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!voucherTotals.isBalanced}
                  className="btn btn-primary"
                  style={{ 
                    padding: '10px 22px', 
                    fontWeight: 800, 
                    opacity: voucherTotals.isBalanced ? 1 : 0.5,
                    cursor: voucherTotals.isBalanced ? 'pointer' : 'not-allowed'
                  }}
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
