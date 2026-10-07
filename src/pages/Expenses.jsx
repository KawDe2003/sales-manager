import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, Search, Trash2, Edit3, DollarSign, PieChart, Wallet, Factory, Building2 } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const Expenses = () => {
  const { 
    expenses = [], 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    activeBusinessId,
    activeBusiness 
  } = useContext(StoreContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const initialForm = {
    category: 'Operational',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  };
  const [form, setForm] = useState(initialForm);

  const seynexCategories = [
    'Operational',
    'Staff',
    'Administrative',
    'Cloud Hosting & Servers',
    'Software & SaaS Licenses',
    'Office & Leased Line Fiber',
    'Marketing & Sales',
    'Travel & Client Site',
    'Meals & Entertainment',
    'Other'
  ];

  const baseCategories = seynexCategories;

  // Complete category list guaranteeing any category in form, stored data or ERP standard is selectable
  const categories = Array.from(new Set([
    ...baseCategories,
    'Operational', 'Staff', 'Administrative',
    ...(form.category ? [form.category] : []),
    ...expenses.map(e => e.category).filter(Boolean)
  ]));

  // Strictly isolate expenses by business domain
  const visibleExpenses = expenses.filter(e => {
    if (e.businessId && e.businessId !== 'biz_main') return false;
    if (String(e.id).startsWith('exp-') && !String(e.id).startsWith('mexp-')) return false;
    const desc = (e.description || '').toLowerCase();
    if (desc.includes('wholesale delivery van') || desc.includes('forming machine') || desc.includes('factory 3-phase') || desc.includes('bobby pin')) return false;
    return true;
  });

  const filteredExpenses = visibleExpenses.filter(e => {
    const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalExpenses = visibleExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonthExpenses = visibleExpenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setForm({
      category: expense.category || 'Operational',
      description: expense.description || '',
      amount: expense.amount !== undefined ? String(expense.amount) : '',
      date: expense.date || new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingExpense(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = { 
      ...form, 
      amount: Number(form.amount) || 0,
      businessId: activeBusinessId 
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
    } else {
      addExpense(payload);
    }
    setShowModal(false);
    setForm(initialForm);
    setEditingExpense(null);
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              color: 'var(--accent-primary)', 
              background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)', 
              padding: '3px 10px', 
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Building2 size={13} />
              Seynex Enterprise Corp
            </span>
          </div>
          <h1 className="h1 mb-1">
            Operating Expenses & Petty Cash
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Track cloud infrastructure, telecom, payroll, and corporate compliance for executive P&L.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ padding: '10px 22px' }} 
          onClick={handleOpenNew}
        >
          <Plus size={18} /> Record Expense
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-panel hover-lift" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--danger-bg)', borderRadius: '12px', color: 'var(--danger)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Total All Time</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>LKR {totalExpenses.toLocaleString()}</h3>
          </div>
        </div>
        <div className="glass-panel hover-lift" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--warning-bg)', borderRadius: '12px', color: 'var(--warning)' }}>
            <PieChart size={24} />
          </div>
          <div>
            <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>This Month</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>LKR {thisMonthExpenses.toLocaleString()}</h3>
          </div>
        </div>
        <div className="glass-panel hover-lift" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--info-bg)', borderRadius: '12px', color: 'var(--info)' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Total Records</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{visibleExpenses.length}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel mb-8" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex gap-4 w-full md:w-auto">
          <CustomSelect 
            value={filterCategory} 
            onChange={val => setFilterCategory(val)}
            options={[
              { value: 'All', label: 'All Categories' },
              ...categories.map(c => ({ value: c, label: c }))
            ]}
            style={{ width: '180px', height: '42px' }}
          />
        </div>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
          <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search description..." 
            className="form-input"
            style={{ paddingLeft: '44px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Expense List */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table className="w-full text-left" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount (LKR)</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8">
                  <p className="text-secondary">No expenses found for this business filter.</p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-[var(--subtle-bg)]">
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--subtle-bg))', 
                      color: 'var(--text-primary)',
                      border: '1px solid var(--panel-border)'
                    }}>
                      {expense.category}
                    </span>
                  </td>
                  <td>{expense.description || '-'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{Number(expense.amount).toLocaleString()}</td>
                  <td className="text-right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEdit(expense)} 
                        className="btn-icon"
                        title="Edit Expense"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteExpense(expense.id)} 
                        className="btn-icon text-danger"
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Modal */}
      {showModal && (
        <div className="modal-overlay app-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div 
            className="modal-content glass-panel app-modal-dialog" 
            style={{ 
              maxWidth: '520px', 
              background: 'var(--panel-bg)', 
              border: '1px solid var(--panel-border)', 
              borderRadius: '16px',
              padding: '24px'
            }}
          >
            <h2 className="h2 mb-6" style={{ fontSize: '1.35rem', margin: '0 0 20px 0' }}>
              {editingExpense ? 'Edit Expense' : 'Record Expense'}
            </h2>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <CustomSelect 
                    value={form.category} 
                    onChange={val => setForm({...form, category: val})}
                    options={categories.map(c => ({ value: c, label: c }))}
                    style={{ width: '100%', height: '42px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Description / Note</label>
                <input 
                  required 
                  type="text" 
                  className="form-input" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="e.g. AWS Cloud Hosting / Monthly Leased Line" 
                />
              </div>
              <div className="form-group mb-6">
                <label className="form-label">Amount (LKR)</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={form.amount} 
                  onChange={e => setForm({...form, amount: e.target.value})} 
                  placeholder="0.00" 
                />
              </div>
              <div 
                className="flex justify-end gap-3 pt-4"
                style={{ borderTop: '1px solid var(--panel-border)' }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingExpense ? 'Save Changes' : 'Record Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
