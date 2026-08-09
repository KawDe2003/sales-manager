import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, Search, CheckCircle, Clock, Trash2, CalendarDays, Edit3 } from 'lucide-react';

const Tasks = () => {
  const { tasks = [], addTask, updateTask, deleteTask } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  const initialForm = {
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pending',
    priority: 'Normal',
    relatedTo: '',
    relatedId: ''
  };
  const [form, setForm] = useState(initialForm);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const handleSave = (e) => {
    e.preventDefault();
    if (editingTask) {
      updateTask(editingTask.id, form);
    } else {
      addTask(form);
    }
    setShowModal(false);
    setForm(initialForm);
    setEditingTask(null);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'var(--success)';
      case 'In Progress': return 'var(--info)';
      case 'Pending': return 'var(--warning)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="h1 mb-1">Task & Follow-up Calendar</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Schedule meetings, follow-up calls, and sales tasks.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '10px 22px' }} onClick={() => { setEditingTask(null); setForm(initialForm); setShowModal(true); }}>
          <Plus size={18} /> Add New Task
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
          <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Total Tasks</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tasks.length}</h3>
        </div>
        <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
          <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)' }}>Pending</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tasks.filter(t => t.status === 'Pending').length}</h3>
        </div>
        <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
          <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info)' }}>In Progress</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tasks.filter(t => t.status === 'In Progress').length}</h3>
        </div>
        <div className="glass-panel hover-lift" style={{ padding: '20px' }}>
          <p className="text-secondary mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>Completed</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tasks.filter(t => t.status === 'Completed').length}</h3>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel mb-8" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex gap-4 w-full md:w-auto">
          <select className="form-input" style={{ width: '150px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
          <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="form-input"
            style={{ paddingLeft: '44px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Task List / Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-3 text-center py-12 glass-panel">
            <CheckCircle size={48} className="text-muted mx-auto mb-4" />
            <h3 className="h3 mb-2">No Tasks Found</h3>
            <p className="text-secondary">You're all caught up! Enjoy your day.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="glass-panel hover-lift" style={{ padding: '24px', borderLeft: `4px solid ${getStatusColor(task.status)}`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: `${getStatusColor(task.status)}15`, color: getStatusColor(task.status) }}>
                  {task.status}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {task.priority} Priority
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{task.title}</h3>
              <p className="text-secondary mb-4" style={{ fontSize: '0.85rem', lineHeight: 1.5, minHeight: '40px' }}>{task.description || 'No description provided.'}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <CalendarDays size={14} className="text-muted" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '16px', marginTop: 'auto' }}>
                <button 
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const newStatus = task.status === 'Pending' ? 'In Progress' : task.status === 'In Progress' ? 'Completed' : 'Pending';
                    updateTask(task.id, { status: newStatus });
                  }}
                >
                  <Clock size={14} /> Advance Status
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setForm(task); setEditingTask(task); setShowModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2 className="h2 mb-6">{editingTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input required type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Call GymX for follow-up" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '100px' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Task details..."></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input required type="date" className="form-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
