import React, { useState, useContext, useMemo } from 'react';
import { 
  BookOpen, Scale, Plus, Search, Filter, FileText, Download, Trash2, Edit2, 
  CheckCircle2, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight, Eye, 
  Printer, DollarSign, Calendar, Layers, ShieldCheck, FileSpreadsheet, PlusCircle, X,
  ChevronRight, Sparkles
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

  // Readable Statement Category Labels
  const categoryLabels = {
    cash_and_equivalents: 'Cash & Cash Equivalents',
    trade_receivables: 'Trade Receivables / Debtors',
    inventory: 'Inventory & Stock Assets',
    ppe: 'Property, Plant & Equipment (PPE)',
    accumulated_depreciation: 'Accumulated Depreciation',
    intangible_assets: 'Intangible Assets',
    trade_payables: 'Trade Payables / Creditors',
    tax_payable: 'Tax Payable',
    short_term_borrowings: 'Short-Term Borrowings',
    long_term_loans: 'Long-Term Loans & Liabilities',
    stated_capital: 'Owner Stated Capital',
    retained_earnings: 'Retained Earnings',
    drawings: "Owner's Drawings / Dividends",
    revenue: 'Main Sales & Operating Revenue',
    other_income: 'Other Operating Income',
    finance_income: 'Finance & Interest Income',
    cost_of_sales: 'Cost of Goods Sold (COGS)',
    administrative_expenses: 'Administrative & Operating Expenses',
    distribution_costs: 'Distribution & Marketing Costs',
    other_expenses: 'Other Operating Expenses',
    finance_costs: 'Finance Costs & Interest Expense',
    tax_expense: 'Income Tax Expense'
  };

  const categoryOptions = Object.entries(categoryLabels).map(([key, label]) => ({
    value: key,
    label
  }));

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
      const catText = categoryLabels[acc.statement_category] || acc.statement_category || '';
      const matchSearch = acc.name.toLowerCase().includes(coaSearch.toLowerCase()) || 
                          acc.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
                          catText.toLowerCase().includes(coaSearch.toLowerCase());
      const matchType = coaTypeFilter === 'all' || acc.type?.toLowerCase() === coaTypeFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [accounts, coaSearch, coaTypeFilter]);

  // Handle Account Form Submit
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
      } catch (e) {}
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
    } catch (err) {}
  };

  // Export Chart of Accounts to Excel
  const exportCoaExcel = () => {
    const data = accounts.map(acc => {
      const bal = accountBalances.get(acc.id);
      return {
        'Account Code': acc.code,
        'Account Name': acc.name,
        'Type': acc.type?.toUpperCase(),
        'Category': categoryLabels[acc.statement_category] || acc.statement_category,
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
        'Statement Category': categoryLabels[acc.statement_category] || acc.statement_category,
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

  // Helper for Type Badge Colors
  const getTypeBadgeStyle = (type) => {
    switch (type?.toLowerCase()) {
      case 'asset':
        return { bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.35)', color: '#38bdf8' };
      case 'liability':
        return { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' };
      case 'equity':
        return { bg: 'rgba(168, 85, 247, 0.14)', border: 'rgba(168, 85, 247, 0.35)', color: '#c084fc' };
      case 'revenue':
        return { bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399' };
      case 'expense':
        return { bg: 'rgba(244, 63, 94, 0.14)', border: 'rgba(244, 63, 94, 0.35)', color: '#fb7185' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.35)', color: '#cbd5e1' };
    }
  };

  return (
    <div style={{ paddingBottom: '60px', animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* HERO HEADER GLASS PANEL */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.72))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '28px 32px',
        marginBottom: '28px',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Ambient Glow Orbs */}
        <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: '-40%', left: '-10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ 
                background: 'rgba(99, 102, 241, 0.15)', 
                border: '1px solid rgba(99, 102, 241, 0.35)', 
                color: '#a5b4fc', 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.74rem', 
                fontWeight: 800,
                letterSpacing: '0.08em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Scale size={14} color="#818cf8" /> ERP ACCOUNTING ENGINE
              </span>

              <span style={{ 
                background: overallTotals.isBalanced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                border: `1px solid ${overallTotals.isBalanced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`, 
                color: overallTotals.isBalanced ? '#34d399' : '#fca5a5', 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.74rem', 
                fontWeight: 800,
                letterSpacing: '0.08em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {overallTotals.isBalanced ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                {overallTotals.isBalanced ? 'GL BALANCED (DOUBLE-ENTRY RECONCILED)' : `DISCREPANCY: LKR ${Math.abs(overallTotals.discrepancy).toLocaleString()}`}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              General Ledger & Chart of Accounts
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '6px 0 0 0', fontWeight: 500 }}>
              Double-entry account register, individual T-Account history statements, and manual journal voucher posting.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '12px 22px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.25s ease'
              }}
              className="hover-lift"
            >
              <Plus size={18} /> New Account
            </button>

            <button 
              onClick={() => setIsVoucherModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 24px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.25s ease'
              }}
              className="hover-lift"
            >
              <PlusCircle size={18} /> Post Journal Voucher
            </button>
          </div>
        </div>

        {/* 4 SUMMARY METRIC CARDS */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '16px', 
          marginTop: '28px' 
        }}>
          {/* Card 1: Chart of Accounts */}
          <div style={{ 
            padding: '18px 22px', 
            background: 'rgba(15, 23, 42, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CHART OF ACCOUNTS
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={16} color="#818cf8" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              {accounts.length} <span style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>Accounts</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#818cf8', marginTop: '4px', fontWeight: 700 }}>
              5 Financial Categories
            </div>
          </div>

          {/* Card 2: Total Ledger Debits */}
          <div style={{ 
            padding: '18px 22px', 
            background: 'rgba(15, 23, 42, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                TOTAL LEDGER DEBITS
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={16} color="#34d399" />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
              LKR {overallTotals.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
              Cumulative Debits Posted
            </div>
          </div>

          {/* Card 3: Total Ledger Credits */}
          <div style={{ 
            padding: '18px 22px', 
            background: 'rgba(15, 23, 42, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                TOTAL LEDGER CREDITS
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={16} color="#38bdf8" />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
              LKR {overallTotals.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
              Cumulative Credits Posted
            </div>
          </div>

          {/* Card 4: Journal Vouchers */}
          <div style={{ 
            padding: '18px 22px', 
            background: 'rgba(15, 23, 42, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                JOURNAL VOUCHERS
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={16} color="#fbbf24" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              {journalEntries.length} <span style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>Entries</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
              {journalLines.length} Ledger Line Items
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div style={{ 
        display: 'flex', 
        background: 'rgba(15, 23, 42, 0.65)', 
        padding: '6px', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '24px',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'coa', label: `Chart of Accounts (${accounts.length})`, icon: BookOpen },
          { id: 'statement', label: 'Account Ledger Statement', icon: FileText },
          { id: 'vouchers', label: `Journal Vouchers (${journalEntries.length})`, icon: Layers },
          { id: 'trial', label: 'Trial Balance', icon: Scale }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '12px 18px',
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(79, 70, 229, 0.32))' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none'
              }}
            >
              <Icon size={17} color={isActive ? '#ffffff' : '#94a3b8'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeTab === 'coa' && (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.75)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '24px', 
          padding: '28px',
          backdropFilter: 'blur(16px)'
        }}>
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#818cf8' }} />
                <input 
                  type="text" 
                  placeholder="Search by code, account name, or LKAS category..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px 12px 46px', 
                    background: 'rgba(15, 23, 42, 0.85)', 
                    border: '1px solid rgba(255, 255, 255, 0.14)', 
                    borderRadius: '14px', 
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ width: '210px' }}>
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
                />
              </div>
            </div>

            <button 
              onClick={exportCoaExcel}
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                borderRadius: '12px',
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="hover-lift"
            >
              <FileSpreadsheet size={16} /> Export CoA (Excel)
            </button>
          </div>

          {/* ACCOUNTS TABLE */}
          <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '100px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em' }}>CODE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em' }}>ACCOUNT NAME</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', width: '110px' }}>TYPE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em' }}>STATEMENT CLASSIFICATION</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', width: '150px' }}>TOTAL DEBIT (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', width: '150px' }}>TOTAL CREDIT (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', width: '170px' }}>NET BALANCE (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', width: '130px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                      No matching ledger accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc, idx) => {
                    const bal = accountBalances.get(acc.id) || { totalDeb: 0, totalCred: 0, net: 0 };
                    const badgeStyle = getTypeBadgeStyle(acc.type);
                    const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';

                    return (
                      <tr 
                        key={acc.id}
                        style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 800, 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            background: 'rgba(99, 102, 241, 0.15)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818cf8',
                            fontSize: '0.85rem'
                          }}>
                            {acc.code}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem' }}>{acc.name}</div>
                          {acc.parentId && (
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                              Parent: ID {acc.parentId}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ 
                            background: badgeStyle.bg,
                            border: `1px solid ${badgeStyle.border}`,
                            color: badgeStyle.color,
                            padding: '3px 10px',
                            borderRadius: '14px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {acc.type}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
                            {categoryLabels[acc.statement_category] || acc.statement_category || 'General'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {acc.is_current ? 'Current Classification' : 'Non-Current Classification'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#cbd5e1' }}>
                          {bal.totalDeb > 0 ? bal.totalDeb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#cbd5e1' }}>
                          {bal.totalCred > 0 ? bal.totalCred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td style={{ 
                          padding: '14px 18px', 
                          textAlign: 'right', 
                          fontFamily: 'monospace', 
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          color: isDebitNormal ? (bal.net >= 0 ? '#ffffff' : '#fb7185') : (bal.net >= 0 ? '#34d399' : '#fb7185')
                        }}>
                          LKR {bal.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setSelectedAccountId(acc.id);
                                setActiveTab('statement');
                              }}
                              style={{ 
                                background: 'rgba(56, 189, 248, 0.12)', 
                                border: '1px solid rgba(56, 189, 248, 0.3)', 
                                color: '#38bdf8', 
                                padding: '6px', 
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                              title="View Account T-Account History"
                              className="hover-lift"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => handleEditAccount(acc)}
                              style={{ 
                                background: 'rgba(99, 102, 241, 0.12)', 
                                border: '1px solid rgba(99, 102, 241, 0.3)', 
                                color: '#a5b4fc', 
                                padding: '6px', 
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                              title="Edit Account"
                              className="hover-lift"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleDeleteAccountClick(acc)}
                              style={{ 
                                background: 'rgba(244, 63, 94, 0.12)', 
                                border: '1px solid rgba(244, 63, 94, 0.3)', 
                                color: '#fb7185', 
                                padding: '6px', 
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                              title="Delete Account"
                              className="hover-lift"
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

      {/* TAB 2: ACCOUNT LEDGER STATEMENT */}
      {activeTab === 'statement' && (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.75)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '24px', 
          padding: '28px',
          backdropFilter: 'blur(16px)'
        }}>
          {/* CONTROL BAR */}
          <div style={{ 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px', 
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ width: '320px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
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
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
                  FROM DATE
                </label>
                <input 
                  type="date" 
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  style={{ 
                    padding: '10px 14px', 
                    background: 'rgba(15, 23, 42, 0.85)', 
                    border: '1px solid rgba(255, 255, 255, 0.14)', 
                    borderRadius: '12px', 
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
                  TO DATE
                </label>
                <input 
                  type="date" 
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  style={{ 
                    padding: '10px 14px', 
                    background: 'rgba(15, 23, 42, 0.85)', 
                    border: '1px solid rgba(255, 255, 255, 0.14)', 
                    borderRadius: '12px', 
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {(statementStartDate || statementEndDate) && (
                <button 
                  onClick={() => { setStatementStartDate(''); setStatementEndDate(''); }}
                  style={{ alignSelf: 'flex-end', padding: '10px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '12px', cursor: 'pointer' }}
                >
                  Clear Dates
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={exportStatementExcel}
                style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', borderRadius: '12px', padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                className="hover-lift"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>

              <button 
                onClick={() => exportAccountLedgerPDF({ 
                  account: targetAccount, 
                  lines: selectedAccountLines, 
                  journalEntries, 
                  startDate: statementStartDate, 
                  endDate: statementEndDate 
                })}
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 8px 16px rgba(99,102,241,0.3)' }}
                className="hover-lift"
              >
                <Printer size={16} /> Export PDF
              </button>
            </div>
          </div>

          {/* TARGET ACCOUNT SUMMARY HEADER */}
          {targetAccount && (
            <div style={{ 
              padding: '22px 28px', 
              background: 'rgba(15, 23, 42, 0.9)', 
              borderRadius: '18px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                    ACCOUNT STATEMENT
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: '4px 0 0 0' }}>
                    [{targetAccount.code}] {targetAccount.name}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                    Type: <strong style={{ color: '#ffffff', textTransform: 'uppercase' }}>{targetAccount.type}</strong> | Category: <strong style={{ color: '#ffffff' }}>{categoryLabels[targetAccount.statement_category] || targetAccount.statement_category}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>CURRENT ENDING NET BALANCE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                    LKR {(accountBalances.get(targetAccount.id)?.net || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TRANSACTION TABLE */}
          <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '110px', fontSize: '0.72rem', fontWeight: 800 }}>DATE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '130px', fontSize: '0.72rem', fontWeight: 800 }}>VOUCHER REF</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800 }}>PARTICULARS / NARRATION</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '110px', fontSize: '0.72rem', fontWeight: 800 }}>POSTED BY</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '150px', fontSize: '0.72rem', fontWeight: 800 }}>DEBIT (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '150px', fontSize: '0.72rem', fontWeight: 800 }}>CREDIT (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '170px', fontSize: '0.72rem', fontWeight: 800 }}>RUNNING BALANCE (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {selectedAccountLines.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                      No transaction lines recorded for this account in the selected period.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningNet = 0;
                    return selectedAccountLines.map((line, idx) => {
                      const entry = entryMap.get(line.journalEntryId);
                      const deb = Number(line.debit || 0);
                      const cred = Number(line.credit || 0);

                      if (targetAccount?.type === 'revenue' || targetAccount?.type === 'liability' || targetAccount?.type === 'equity') {
                        runningNet += (cred - deb);
                      } else {
                        runningNet += (deb - cred);
                      }

                      return (
                        <tr key={line.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {entry?.date ? new Date(entry.date).toLocaleDateString() : '—'}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                              {entry?.reference || '—'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: 600, color: '#ffffff' }}>
                            {entry?.description || line.memo || 'General Journal Posting'}
                          </td>

                          <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.82rem' }}>
                            {entry?.createdBy || 'System'}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: deb > 0 ? '#34d399' : '#64748b' }}>
                            {deb > 0 ? deb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: cred > 0 ? '#38bdf8' : '#64748b' }}>
                            {cred > 0 ? cred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#ffffff' }}>
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

      {/* TAB 3: JOURNAL VOUCHERS */}
      {activeTab === 'vouchers' && (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.75)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '24px', 
          padding: '28px',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                General Journal Voucher Register
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                All double-entry vouchers posted automatically or created manually by accountants.
              </p>
            </div>

            <button 
              onClick={() => setIsVoucherModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 18px rgba(16,185,129,0.3)' }}
              className="hover-lift"
            >
              <PlusCircle size={16} /> Post New Journal Voucher
            </button>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '130px', fontSize: '0.72rem', fontWeight: 800 }}>VOUCHER REF</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '110px', fontSize: '0.72rem', fontWeight: 800 }}>DATE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800 }}>NARRATION / DESCRIPTION</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '110px', fontSize: '0.72rem', fontWeight: 800 }}>CREATED BY</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '170px', fontSize: '0.72rem', fontWeight: 800 }}>TOTAL AMOUNT (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', width: '130px', fontSize: '0.72rem', fontWeight: 800 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                      No journal vouchers posted yet.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((entry, idx) => {
                    const lines = journalLines.filter(l => l.journalEntryId === entry.id);
                    const totalAmt = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
                    const isExpanded = expandedEntryId === entry.id;

                    return (
                      <React.Fragment key={entry.id}>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                              {entry.reference}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                            {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#ffffff' }}>
                            {entry.description || 'General Voucher Entry'}
                          </td>

                          <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.82rem' }}>
                            {entry.createdBy || 'System'}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#ffffff' }}>
                            LKR {totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                title={isExpanded ? 'Hide Voucher Lines' : 'View Voucher Lines'}
                                className="hover-lift"
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() => exportJournalVoucherPDF({ entry, lines, accounts })}
                                style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                title="Print / Export Voucher PDF"
                                className="hover-lift"
                              >
                                <Printer size={15} />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete / Void Journal Voucher ${entry.reference}?`)) {
                                    deleteJournalEntry(entry.id);
                                  }
                                }}
                                style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                title="Delete Voucher"
                                className="hover-lift"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '20px 28px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#818cf8', marginBottom: '12px', letterSpacing: '0.05em' }}>
                                VOUCHER LINE ITEMS BREAKDOWN (#{entry.reference})
                              </div>
                              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Account Description</th>
                                    <th style={{ textAlign: 'right', padding: '8px 12px', width: '180px' }}>Debit (LKR)</th>
                                    <th style={{ textAlign: 'right', padding: '8px 12px', width: '180px' }}>Credit (LKR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map(l => {
                                    const acc = accounts.find(a => a.id === l.accountId || a.code === l.accountId);
                                    return (
                                      <tr key={l.id} style={{ borderBottom: '1px dotted rgba(255,255,255,0.06)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ffffff' }}>
                                          [{acc?.code || l.accountId}] {acc?.name || 'Account'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: Number(l.debit) > 0 ? '#34d399' : '#64748b' }}>
                                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: Number(l.credit) > 0 ? '#38bdf8' : '#64748b' }}>
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
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.75)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '24px', 
          padding: '28px',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  Trial Balance Reconciliation
                </h2>
                <span style={{ 
                  background: overallTotals.isBalanced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${overallTotals.isBalanced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: overallTotals.isBalanced ? '#34d399' : '#fb7185',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {overallTotals.isBalanced ? '✓ Reconciled' : '⚠️ Discrepancy'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                General ledger trial balance debit and credit balance sheet per Sri Lanka Accounting Standards (SLFRS/LKAS).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={exportTrialBalanceExcel}
                style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', borderRadius: '12px', padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                className="hover-lift"
              >
                <FileSpreadsheet size={16} /> Export Excel
              </button>

              <button 
                onClick={() => exportTrialBalancePDF({ accounts, journalLines, journalEntries })}
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 8px 16px rgba(99,102,241,0.3)' }}
                className="hover-lift"
              >
                <Printer size={16} /> Export PDF
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '100px', fontSize: '0.72rem', fontWeight: 800 }}>CODE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800 }}>ACCOUNT NAME</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', width: '110px', fontSize: '0.72rem', fontWeight: 800 }}>TYPE</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800 }}>CATEGORY</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '180px', fontSize: '0.72rem', fontWeight: 800 }}>DEBIT BALANCE (LKR)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', width: '180px', fontSize: '0.72rem', fontWeight: 800 }}>CREDIT BALANCE (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let totalDebit = 0;
                  let totalCredit = 0;

                  const rows = accounts.map((acc, idx) => {
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

                    const badgeStyle = getTypeBadgeStyle(acc.type);

                    return (
                      <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                            {acc.code}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#ffffff' }}>{acc.name}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ background: badgeStyle.bg, border: `1px solid ${badgeStyle.border}`, color: badgeStyle.color, padding: '3px 10px', borderRadius: '14px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                            {acc.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.82rem' }}>
                          {categoryLabels[acc.statement_category] || acc.statement_category}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: debitBal > 0 ? '#34d399' : '#64748b' }}>
                          {debitBal > 0 ? debitBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: creditBal > 0 ? '#38bdf8' : '#64748b' }}>
                          {creditBal > 0 ? creditBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    );
                  });

                  return (
                    <>
                      {rows}
                      <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderTop: '2px solid rgba(255,255,255,0.15)' }}>
                        <td colSpan={4} style={{ padding: '16px 18px', fontWeight: 900, fontSize: '0.95rem', color: '#ffffff' }}>
                          TOTAL TRIAL BALANCE
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: '#34d399' }}>
                          LKR {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: '#38bdf8' }}>
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
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '540px', 
            background: '#0f172a', 
            border: '1px solid rgba(255, 255, 255, 0.15)', 
            borderRadius: '24px', 
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                {editingAccount ? 'Edit Ledger Account' : 'Add New Ledger Account'}
              </h3>
              <button 
                onClick={() => setIsAccountModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>ACCOUNT CODE *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 1030"
                    value={accountForm.code}
                    disabled={!!editingAccount}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>ACCOUNT NAME *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Petty Cash Account"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>ACCOUNT TYPE *</label>
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
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>CLASSIFICATION</label>
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>STATEMENT CATEGORY (SLFRS/LKAS)</label>
                <CustomSelect
                  value={accountForm.statement_category}
                  onChange={(val) => setAccountForm({ ...accountForm, statement_category: val })}
                  options={categoryOptions}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAccountModalOpen(false)}
                  style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(99,102,241,0.3)' }}
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
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '880px', 
            background: '#0f172a', 
            border: '1px solid rgba(255, 255, 255, 0.15)', 
            borderRadius: '24px', 
            padding: '32px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  Post Double-Entry Journal Voucher
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  All manual postings must balance ($\sum \text{Debits} = \sum \text{Credits}$).
                </p>
              </div>

              <button 
                onClick={() => setIsVoucherModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>VOUCHER REFERENCE *</label>
                  <input 
                    type="text" 
                    required
                    value={voucherForm.reference}
                    onChange={(e) => setVoucherForm({ ...voucherForm, reference: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>POSTING DATE *</label>
                  <input 
                    type="date" 
                    required
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>POSTED BY</label>
                  <input 
                    type="text" 
                    value={voucherForm.createdBy}
                    onChange={(e) => setVoucherForm({ ...voucherForm, createdBy: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>NARRATION / DESCRIPTION *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Monthly Accrual Adjustment for Fiber Internet Expense"
                  value={voucherForm.description}
                  onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', color: '#ffffff' }}
                />
              </div>

              {/* DYNAMIC VOUCHER LINES BUILDER */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8' }}>
                    JOURNAL LINES (MINIMUM 2 LINES)
                  </label>
                  <button 
                    type="button" 
                    onClick={addVoucherLine}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Line Item
                  </button>
                </div>

                <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.95)', color: '#94a3b8' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left' }}>Account</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', width: '160px' }}>Debit (LKR)</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', width: '160px' }}>Credit (LKR)</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', width: '50px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucherForm.lines.map((line, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <td style={{ padding: '10px' }}>
                            <CustomSelect
                              value={line.accountId}
                              onChange={(val) => updateVoucherLine(idx, 'accountId', val)}
                              options={accounts.map(a => ({
                                value: a.id,
                                label: `[${a.code}] ${a.name} (${a.type.toUpperCase()})`
                              }))}
                            />
                          </td>

                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              value={line.debit}
                              onChange={(e) => updateVoucherLine(idx, 'debit', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', fontFamily: 'monospace', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '10px', color: '#ffffff' }}
                            />
                          </td>

                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              value={line.credit}
                              onChange={(e) => updateVoucherLine(idx, 'credit', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', fontFamily: 'monospace', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '10px', color: '#ffffff' }}
                            />
                          </td>

                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => removeVoucherLine(idx)}
                              style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
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
                padding: '16px 20px', 
                borderRadius: '16px', 
                background: voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)',
                border: `1px solid ${voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                display: 'flex', 
                justify: 'space-between', 
                alignItems: 'center',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {voucherTotals.isBalanced ? (
                    <CheckCircle2 size={22} style={{ color: '#34d399' }} />
                  ) : (
                    <AlertTriangle size={22} style={{ color: '#fb7185' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: voucherTotals.isBalanced ? '#34d399' : '#fb7185' }}>
                      {voucherTotals.isBalanced ? 'Voucher is Perfectly Balanced' : 'Unbalanced Journal Voucher'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                      Total Debits: LKR {voucherTotals.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Total Credits: LKR {voucherTotals.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {!voucherTotals.isBalanced && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fb7185', fontSize: '0.9rem' }}>
                    Diff: LKR {Math.abs(voucherTotals.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsVoucherModalOpen(false)}
                  style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!voucherTotals.isBalanced}
                  style={{ 
                    padding: '10px 24px', 
                    background: voucherTotals.isBalanced ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: 900, 
                    cursor: voucherTotals.isBalanced ? 'pointer' : 'not-allowed',
                    opacity: voucherTotals.isBalanced ? 1 : 0.4,
                    boxShadow: voucherTotals.isBalanced ? '0 8px 18px rgba(16,185,129,0.35)' : 'none'
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
