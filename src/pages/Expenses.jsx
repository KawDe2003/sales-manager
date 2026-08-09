import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, Search, CheckCircle, Trash2, Edit3, DollarSign, PieChart, Wallet } from 'lucide-react';

const Expenses = () => {
  const { expenses = [], addExpense, updateExpense, deleteExpense } = useContext(StoreContext);
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

  const categories = ['Operational', 'Travel', 'Meals', 'Office Supplies', 'Software', 'Marketing', 'Other'];

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleSave = (e) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpense(editingExpense.id, { ...form, amount: Number(form.amount) });
    } else {
      addExpense({ ...form, amount: Number(form.amount) });
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
          <h1 className="h1 mb-1">Expenses & Petty Cash</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Track operating expenses for Profit & Loss calculation.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '10px 22px' }} onClick={() => { setEditingExpense(null); setForm(initialForm); setShowModal(true); }}>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{expenses.length}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel mb-8" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex gap-4 w-full md:w-auto">
          <select className="form-input" style={{ width: '150px' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
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
                  <p className="text-secondary">No expenses found.</p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-[var(--subtle-bg)]">
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: 'var(--subtle-bg)', color: 'var(--text-secondary)' }}>
                      {expense.category}
                    </span>
                  </td>
                  <td>{expense.description || '-'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{expense.amount.toLocaleString()}</td>
                  <td className="text-right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => { setForm(expense); setEditingExpense(expense); setShowModal(true); }} className="btn-icon">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteExpense(expense.id)} className="btn-icon text-danger">
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 className="h2 mb-6">{editingExpense ? 'Edit Expense' : 'Record Expense'}</h2>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select required className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input required type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Note</label>
                <input required type="text" className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Uber to client site" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (LKR)</label>
                <input required type="number" step="0.01" className="form-input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="flex justify-end gap-4 mt-8">
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
