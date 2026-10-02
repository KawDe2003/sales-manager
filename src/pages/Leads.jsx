import React, { useContext, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { StoreContext } from '../context/StoreContext';
import { 
  Plus, Target, Phone, Mail, Trash2, User, Calendar, Edit2, FileText, X, Search,
  MessageSquare, Clock, CheckCircle2, AlertCircle, ArrowRight, LayoutGrid, List,
  Filter, MessageCircle, Send, Check, ChevronRight, ChevronLeft, Sparkles, AlertTriangle,
  History, CalendarDays, ExternalLink, Flame, CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';

export const PIPELINE_STATUSES = ['New', 'Contacted', 'Interested', 'Demo Scheduled', 'Refused'];

export const INTERACTION_TYPES = [
  { id: 'Call', label: 'Phone Call', icon: Phone, color: '#38bdf8' },
  { id: 'WhatsApp', label: 'WhatsApp Chat', icon: MessageCircle, color: '#34d399' },
  { id: 'Meeting', label: 'In-Person Meeting', icon: Calendar, color: '#a78bfa' },
  { id: 'Demo', label: 'Product Demo', icon: Target, color: '#fbbf24' },
  { id: 'Email', label: 'Email Follow-up', icon: Mail, color: '#f472b6' },
  { id: 'Note', label: 'Internal Note', icon: FileText, color: '#94a3b8' }
];

// Helper: Format Date nicely
const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper: Format Date & Time
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Not recorded';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Helper: Compute action date status (Overdue, Due Today, Upcoming, None)
const getActionDateStatus = (nextActionDate) => {
  if (!nextActionDate) {
    return {
      status: 'none',
      label: 'No action marked',
      shortLabel: 'None',
      daysDiff: null,
      color: 'var(--text-muted)',
      bg: 'rgba(148, 163, 184, 0.08)',
      border: 'rgba(148, 163, 184, 0.15)'
    };
  }

  // Parse YYYY-MM-DD
  const target = new Date(nextActionDate);
  const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((targetDateOnly.getTime() - todayDateOnly.getTime()) / msPerDay);

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: `Overdue (${overdueDays}d)`,
      shortLabel: `Overdue ${overdueDays}d`,
      daysDiff: diffDays,
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.3)'
    };
  }

  if (diffDays === 0) {
    return {
      status: 'today',
      label: 'Due Today',
      shortLabel: 'Today',
      daysDiff: 0,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.14)',
      border: 'rgba(251, 191, 36, 0.35)'
    };
  }

  if (diffDays === 1) {
    return {
      status: 'upcoming',
      label: 'Due Tomorrow',
      shortLabel: 'Tomorrow',
      daysDiff: 1,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
      border: 'rgba(52, 211, 153, 0.3)'
    };
  }

  return {
    status: 'upcoming',
    label: `In ${diffDays}d (${formatDate(nextActionDate)})`,
    shortLabel: `In ${diffDays}d`,
    daysDiff: diffDays,
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.3)'
  };
};

const getStageConfig = (status) => {
  switch (status) {
    case 'New':
      return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.35)', desc: 'New inbound lead or prospect' };
    case 'Contacted':
      return { color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)', border: 'rgba(129, 140, 248, 0.35)', desc: 'First contact or introduction made' };
    case 'Interested':
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', desc: 'Evaluating products & commercial terms' };
    case 'Demo Scheduled':
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', desc: 'Product presentation or sample delivery' };
    case 'Refused':
      return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', desc: 'Closed lost or not interested currently' };
    default:
      return { color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)', desc: 'General prospect' };
  }
};

const Leads = () => {
  const { leads = [], addLead, deleteLead, updateLead, addLeadComment, deleteLeadComment, confirmAction, showNotification } = useContext(StoreContext) || {};
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [activeCommentLead, setActiveCommentLead] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'calendar' | 'list'
  const [filterStage, setFilterStage] = useState('All');
  const [filterAction, setFilterAction] = useState('All'); // 'All' | 'DueToday' | 'Overdue' | 'Upcoming' | 'HasComments'
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Metrics computation
  const metrics = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let withComments = 0;
    let totalValue = 0;

    leads.forEach(l => {
      const actionStatus = getActionDateStatus(l.nextActionDate);
      if (actionStatus.status === 'today') dueToday += 1;
      if (actionStatus.status === 'overdue') overdue += 1;
      if (actionStatus.status === 'upcoming') upcoming += 1;
      if (Array.isArray(l.comments) && l.comments.length > 0) withComments += 1;
      totalValue += Number(l.value || l.estimatedBudget || l.budget || 0);
    });

    return {
      total: leads.length,
      dueToday,
      overdue,
      upcoming,
      withComments,
      totalValue
    };
  }, [leads]);

  // Marked Dates array for DatePicker components appwide
  const markedActionDates = useMemo(() => {
    return leads
      .filter(l => l.nextActionDate)
      .map(l => {
        const actionStatus = getActionDateStatus(l.nextActionDate);
        return {
          date: l.nextActionDate,
          color: actionStatus.color,
          label: `${l.gymName} (${actionStatus.label}): ${l.nextActionNote || 'Follow-up'}`
        };
      });
  }, [leads]);

  // Lead Filtering
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Stage filter
      if (filterStage !== 'All' && l.status !== filterStage) return false;

      // Action status filter
      if (filterAction !== 'All') {
        const actionStatus = getActionDateStatus(l.nextActionDate);
        if (filterAction === 'DueToday' && actionStatus.status !== 'today') return false;
        if (filterAction === 'Overdue' && actionStatus.status !== 'overdue') return false;
        if (filterAction === 'Upcoming' && actionStatus.status !== 'upcoming') return false;
        if (filterAction === 'HasComments' && (!Array.isArray(l.comments) || l.comments.length === 0)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const gymName = (l.gymName || '').toLowerCase();
        const contact = (l.contactPerson || l.prospectName || l.name || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const email = (l.email || '').toLowerCase();
        const nextActionNote = (l.nextActionNote || '').toLowerCase();
        const notes = (l.notes || '').toLowerCase();
        const commentsText = Array.isArray(l.comments) ? l.comments.map(c => c.text || '').join(' ').toLowerCase() : '';

        return gymName.includes(query) || contact.includes(query) || phone.includes(query) || 
               email.includes(query) || nextActionNote.includes(query) || notes.includes(query) || commentsText.includes(query);
      }

      return true;
    });
  }, [leads, filterStage, filterAction, searchTerm]);

  // Keep activeCommentLead synced with latest state from leads
  const currentCommentLead = useMemo(() => {
    if (!activeCommentLead) return null;
    return leads.find(l => l.id === activeCommentLead.id) || activeCommentLead;
  }, [leads, activeCommentLead]);

  const handleSaveLead = (formData) => {
    if (editingLead && editingLead.id) {
      updateLead(editingLead.id, formData);
    } else {
      addLead(formData);
    }
    setShowAddModal(false);
    setEditingLead(null);
  };

  // 1-Click Action: "Mark Next Action Date Complete"
  const handleMarkActionDone = (lead) => {
    const todayIso = new Date().toISOString();
    const taskTitle = lead.nextActionNote ? `"${lead.nextActionNote}"` : 'Scheduled follow-up';
    const noteText = `✓ Action Completed: ${taskTitle}. Marked done on ${formatDate(todayIso)}.`;

    if (addLeadComment) {
      addLeadComment(lead.id, {
        text: noteText,
        type: 'Call',
        date: todayIso,
        nextActionDate: null,
        nextActionNote: ''
      });
    } else {
      const prev = Array.isArray(lead.comments) ? lead.comments : [];
      const newComment = {
        id: `c-${Date.now()}`,
        text: noteText,
        type: 'Call',
        date: todayIso,
        nextActionDate: null,
        nextActionNote: '',
        author: 'Sales Rep'
      };
      updateLead(lead.id, {
        comments: [newComment, ...prev],
        lastActionDate: todayIso,
        nextActionDate: null,
        nextActionNote: ''
      });
    }

    if (showNotification) {
      showNotification(`Next action marked as complete for "${lead.gymName}"!`, 'success');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '60px' }}>
      
      {/* PAGE HEADER */}
      <div className="page-hero leads-page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div style={{ 
                padding: '4px 8px', 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid rgba(16, 185, 129, 0.35)', 
                borderRadius: '6px', 
                color: 'var(--accent-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                <Flame size={13} /> CRM & Leads Pipeline
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Auto-Synced</span>
            </div>
            <h1 className="h1 leads-title" style={{ color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>Leads Pipeline & Calendar</h1>
            <p className="text-secondary sm-hidden" style={{ marginTop: '2px', fontSize: '0.84rem', fontWeight: 500 }}>
              Mark next action dates, review day-by-day comment histories, and track client interactions across all calendar views.
            </p>
          </div>

          <div className="leads-actions-bar">
            {/* View Mode Switcher (Board | Calendar | List) */}
            <div className="leads-view-switcher">
              <button 
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`leads-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              >
                <LayoutGrid size={13} /> Board
              </button>

              <button 
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`leads-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              >
                <CalendarDays size={13} /> Calendar
              </button>

              <button 
                type="button"
                onClick={() => setViewMode('list')}
                className={`leads-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              >
                <List size={13} /> List
              </button>
            </div>

            <button 
              className="btn btn-primary leads-add-btn" 
              onClick={() => { setEditingLead(null); setShowAddModal(true); }}
            >
              <Plus size={15} /> <span><span className="hidden-mobile">New </span>Prospect</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 leads-kpi-grid">
        
        {/* Total Prospects */}
        <div 
          className="glass-panel lead-metric-card" 
          style={{ 
            borderLeft: '4px solid var(--accent-primary)',
            cursor: 'pointer'
          }}
          onClick={() => { setFilterAction('All'); setFilterStage('All'); }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>Total Prospects</span>
            <Target size={15} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-num" style={{ color: 'var(--text-primary)' }}>{metrics.total}</div>
          <div className="metric-subtext" style={{ color: 'var(--text-muted)' }}>
            {metrics.withComments} with follow-up logs
          </div>
        </div>

        {/* Due Today */}
        <div 
          className="glass-panel lead-metric-card" 
          style={{ 
            borderLeft: '4px solid #f59e0b',
            background: filterAction === 'DueToday' ? 'rgba(245, 158, 11, 0.08)' : undefined,
            cursor: 'pointer'
          }}
          onClick={() => setFilterAction(filterAction === 'DueToday' ? 'All' : 'DueToday')}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="metric-label" style={{ color: '#f59e0b' }}>Action Due Today</span>
            <Clock size={15} style={{ color: '#f59e0b' }} />
          </div>
          <div className="metric-num" style={{ color: '#f59e0b' }}>{metrics.dueToday}</div>
          <div className="metric-subtext" style={{ color: 'var(--text-secondary)' }}>
            {metrics.dueToday > 0 ? 'Requires action today' : 'No calls pending today'}
          </div>
        </div>

        {/* Overdue */}
        <div 
          className="glass-panel lead-metric-card" 
          style={{ 
            borderLeft: '4px solid #ef4444',
            background: filterAction === 'Overdue' ? 'rgba(239, 68, 68, 0.08)' : undefined,
            cursor: 'pointer'
          }}
          onClick={() => setFilterAction(filterAction === 'Overdue' ? 'All' : 'Overdue')}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="metric-label" style={{ color: '#ef4444' }}>Overdue Follow-ups</span>
            <AlertCircle size={15} style={{ color: '#ef4444' }} />
          </div>
          <div className="metric-num" style={{ color: '#ef4444' }}>{metrics.overdue}</div>
          <div className="metric-subtext" style={{ color: 'var(--text-secondary)' }}>
            {metrics.overdue > 0 ? 'Past scheduled follow-up' : 'All follow-ups on track'}
          </div>
        </div>

        {/* Upcoming Actions */}
        <div 
          className="glass-panel lead-metric-card" 
          style={{ 
            borderLeft: '4px solid #38bdf8',
            background: filterAction === 'Upcoming' ? 'rgba(56, 189, 248, 0.08)' : undefined,
            cursor: 'pointer'
          }}
          onClick={() => setFilterAction(filterAction === 'Upcoming' ? 'All' : 'Upcoming')}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="metric-label" style={{ color: '#38bdf8' }}>Upcoming Actions</span>
            <CalendarDays size={15} style={{ color: '#38bdf8' }} />
          </div>
          <div className="metric-num" style={{ color: '#38bdf8' }}>{metrics.upcoming}</div>
          <div className="metric-subtext" style={{ color: 'var(--text-secondary)' }}>
            Marked future contacts
          </div>
        </div>

      </div>

      {/* SEARCH AND QUICK FILTER CONTROLS */}
      <div className="glass-panel mb-4 leads-filter-panel">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input leads-search-input"
              placeholder="Search by client gym, contact person, mobile, or comment text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 leads-filter-pills">
            
            <button
              type="button"
              className={`leads-pill-btn ${filterAction === 'All' ? 'active-all' : ''}`}
              onClick={() => setFilterAction('All')}
            >
              All Leads ({leads.length})
            </button>

            <button
              type="button"
              className={`leads-pill-btn ${filterAction === 'DueToday' ? 'active-due' : ''}`}
              onClick={() => setFilterAction('DueToday')}
            >
              <Clock size={12} /> Due Today ({metrics.dueToday})
            </button>

            <button
              type="button"
              className={`leads-pill-btn ${filterAction === 'Overdue' ? 'active-overdue' : ''}`}
              onClick={() => setFilterAction('Overdue')}
            >
              <AlertCircle size={12} /> Overdue ({metrics.overdue})
            </button>

            {/* Stage filter dropdown */}
            <div className="leads-stage-select-wrap">
              <CustomSelect
                value={filterStage}
                onChange={(val) => setFilterStage(val)}
                options={[
                  { value: 'All', label: 'All Stages' },
                  ...PIPELINE_STATUSES.map(s => ({ value: s, label: s }))
                ]}
                size="sm"
                triggerStyle={{ height: '32px', fontSize: '0.78rem' }}
              />
            </div>

          </div>

        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div 
          className="pipeline-board-container"
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '20px',
            alignItems: 'flex-start'
          }}
        >
          {PIPELINE_STATUSES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.status === stage);
            const stageConfig = getStageConfig(stage);

            return (
              <div 
                key={stage}
                className="pipeline-column"
                style={{
                  flex: '1 0 310px',
                  minWidth: '290px',
                  maxWidth: '360px',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--subtle-border)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 220px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}
              >
                {/* Stage Header */}
                <div 
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--subtle-border)',
                    borderTop: `3px solid ${stageConfig.color}`,
                    borderRadius: '16px 16px 0 0',
                    background: 'var(--input-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{stage}</span>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: stageConfig.bg,
                        color: stageConfig.color,
                        border: `1px solid ${stageConfig.border}`
                      }}
                    >
                      {stageLeads.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingLead({ status: stage, gymName: '', contactPerson: '', phone: '', email: '' });
                      setShowAddModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.15s ease'
                    }}
                    title={`Add prospect to ${stage}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Stage Cards Container */}
                <div 
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1
                  }}
                >
                  {stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onOpenComments={() => setActiveCommentLead(lead)}
                      onMarkDone={() => handleMarkActionDone(lead)}
                      onEdit={() => { setEditingLead(lead); setShowAddModal(true); }}
                      onDelete={() => {
                        if (confirmAction) {
                          confirmAction({
                            title: 'Remove Prospect Entry',
                            message: `Are you sure you want to remove "${lead.gymName}" from your pipeline?`,
                            confirmText: 'Delete Prospect',
                            onConfirm: () => deleteLead(lead.id)
                          });
                        } else if (window.confirm(`Delete ${lead.gymName}?`)) {
                          deleteLead(lead.id);
                        }
                      }}
                      onUpdateStatus={(s) => updateLead(lead.id, { status: s })}
                      onQuote={() => navigate(`/quotations?leadId=${lead.id}`)}
                    />
                  ))}

                  {stageLeads.length === 0 && (
                    <div 
                      style={{
                        padding: '30px 16px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        border: '1px dashed var(--subtle-border)',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      No prospects in {stage}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: THEME-MATCHED INTERACTIVE CRM CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <LeadsCalendarView 
          leads={filteredLeads}
          onOpenComments={(lead) => setActiveCommentLead(lead)}
          onMarkDone={handleMarkActionDone}
          onQuote={(lead) => navigate(`/quotations?leadId=${lead.id}`)}
        />
      )}

      {/* VIEW 3: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--subtle-border)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 18px' }}>Prospect / Gym</th>
                  <th style={{ padding: '14px 18px' }}>Contact & Mobile</th>
                  <th style={{ padding: '14px 18px' }}>Pipeline Stage</th>
                  <th style={{ padding: '14px 18px' }}>Last Action Date</th>
                  <th style={{ padding: '14px 18px' }}>Marked Next Action</th>
                  <th style={{ padding: '14px 18px' }}>Follow-up Logs</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const actionStatus = getActionDateStatus(lead.nextActionDate);
                  const stageConfig = getStageConfig(lead.status);
                  const commentCount = Array.isArray(lead.comments) ? lead.comments.length : 0;
                  const latestComment = Array.isArray(lead.comments) && lead.comments.length > 0 ? lead.comments[0] : null;

                  return (
                    <tr 
                      key={lead.id} 
                      style={{ borderBottom: '1px solid var(--subtle-border)', transition: 'background 0.15s ease' }}
                      className="hover-bg"
                    >
                      {/* Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{lead.gymName}</div>
                        {lead.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{lead.email}</div>}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.contactPerson || lead.prospectName || 'Not specified'}</div>
                        <div className="flex items-center gap-2" style={{ marginTop: '2px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lead.phone || 'No phone'}</span>
                          {lead.phone && (
                            <a 
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: '#22c55e', display: 'inline-flex' }}
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Stage */}
                      <td style={{ padding: '14px 18px' }}>
                        <CustomSelect
                          value={lead.status}
                          onChange={(val) => updateLead(lead.id, { status: val })}
                          options={PIPELINE_STATUSES.map(s => ({ value: s, label: s }))}
                          size="sm"
                          triggerStyle={{
                            height: '30px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            color: stageConfig.color,
                            background: stageConfig.bg,
                            borderColor: stageConfig.border
                          }}
                          style={{ width: '140px' }}
                        />
                      </td>

                      {/* Last Action Date (Commented Date) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                          {formatDate(lead.lastActionDate || lead.date)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {latestComment ? `Logged: ${latestComment.type}` : 'Entry date'}
                        </div>
                      </td>

                      {/* Marked Next Action Schedule */}
                      <td style={{ padding: '14px 18px' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div 
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: actionStatus.bg,
                              color: actionStatus.color,
                              border: `1px solid ${actionStatus.border}`
                            }}
                          >
                            {actionStatus.status === 'overdue' && <AlertCircle size={12} />}
                            {actionStatus.status === 'today' && <Clock size={12} />}
                            {actionStatus.status === 'upcoming' && <Calendar size={12} />}
                            {actionStatus.label}
                          </div>

                          {/* Quick Mark Complete Button */}
                          {lead.nextActionDate && (
                            <button
                              type="button"
                              onClick={() => handleMarkActionDone(lead)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer'
                              }}
                              title="Mark this next action as completed"
                            >
                              <Check size={11} /> Mark Done
                            </button>
                          )}
                        </div>

                        {lead.nextActionNote && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{lead.nextActionNote}"
                          </div>
                        )}
                      </td>

                      {/* Comments / Logs */}
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveCommentLead(lead)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            background: commentCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--subtle-bg)',
                            border: `1px solid ${commentCount > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--subtle-border)'}`,
                            borderRadius: '8px',
                            color: commentCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <MessageSquare size={13} />
                          {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            onClick={() => setActiveCommentLead(lead)}
                            title="Add daily comment / log follow-up"
                          >
                            <MessageSquare size={13} /> Log
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => navigate(`/quotations?leadId=${lead.id}`)}
                            title="Create quotation for prospect"
                          >
                            <FileText size={13} /> Quote
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px' }}
                            onClick={() => { setEditingLead(lead); setShowAddModal(true); }}
                            title="Edit prospect info"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', color: 'var(--danger)' }}
                            onClick={() => {
                              if (confirmAction) {
                                confirmAction({
                                  title: 'Delete Prospect',
                                  message: `Are you sure you want to remove ${lead.gymName}?`,
                                  confirmText: 'Delete',
                                  onConfirm: () => deleteLead(lead.id)
                                });
                              } else if (window.confirm(`Delete ${lead.gymName}?`)) {
                                deleteLead(lead.id);
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                      <Target size={48} style={{ opacity: 0.25, margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Matching Prospects Found</div>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your filters or search keywords.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAD CREATION / EDIT MODAL */}
      {showAddModal && (
        <LeadModal
          initialData={editingLead}
          onClose={() => { setShowAddModal(false); setEditingLead(null); }}
          onSave={handleSaveLead}
          statuses={PIPELINE_STATUSES}
          markedActionDates={markedActionDates}
        />
      )}

      {/* DAY-BY-DAY COMMENTS & FOLLOW-UP TIMELINE MODAL */}
      {currentCommentLead && (
        <LeadCommentsModal
          lead={currentCommentLead}
          onClose={() => setActiveCommentLead(null)}
          markedActionDates={markedActionDates}
          onAddComment={(commentData) => {
            if (addLeadComment) {
              addLeadComment(currentCommentLead.id, commentData);
            } else {
              const commentDate = commentData.date || new Date().toISOString();
              const newComment = {
                id: `c-${Date.now()}`,
                date: commentDate,
                text: commentData.text,
                type: commentData.type || 'Call',
                nextActionDate: commentData.nextActionDate || null,
                nextActionNote: commentData.nextActionNote || '',
                author: 'Sales Rep'
              };
              const prev = Array.isArray(currentCommentLead.comments) ? currentCommentLead.comments : [];
              updateLead(currentCommentLead.id, {
                comments: [newComment, ...prev],
                lastActionDate: commentDate,
                nextActionDate: commentData.nextActionDate !== undefined ? commentData.nextActionDate : currentCommentLead.nextActionDate,
                nextActionNote: commentData.nextActionNote !== undefined ? commentData.nextActionNote : currentCommentLead.nextActionNote
              });
            }
          }}
          onMarkDone={() => handleMarkActionDone(currentCommentLead)}
          onDeleteComment={(commentId) => {
            if (deleteLeadComment) {
              deleteLeadComment(currentCommentLead.id, commentId);
            }
          }}
          onUpdateStatus={(newStatus) => updateLead(currentCommentLead.id, { status: newStatus })}
          onQuote={() => navigate(`/quotations?leadId=${currentCommentLead.id}`)}
        />
      )}

    </div>
  );
};

// ===================================================================
// LEAD CARD COMPONENT (Used in Kanban Board)
// ===================================================================
const LeadCard = ({ lead, onOpenComments, onMarkDone, onEdit, onDelete, onUpdateStatus, onQuote }) => {
  const stageConfig = getStageConfig(lead.status);
  const actionStatus = getActionDateStatus(lead.nextActionDate);
  const comments = Array.isArray(lead.comments) ? lead.comments : [];
  const latestComment = comments.length > 0 ? comments[0] : null;

  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');

  return (
    <div 
      className="glass-panel hover-lift"
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'var(--panel-bg, #111827)',
        border: '1px solid var(--subtle-border)',
        borderLeft: `4px solid ${stageConfig.color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}
    >
      {/* Top Header: Business & Contact */}
      <div className="flex justify-between items-start gap-2">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 
            className="h3" 
            style={{ 
              margin: 0, 
              fontSize: '1rem', 
              fontWeight: 800, 
              color: 'var(--text-primary)',
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}
            title={lead.gymName}
          >
            {lead.gymName}
          </h3>
          <div className="flex items-center gap-1.5 text-secondary" style={{ fontSize: '0.8rem', marginTop: '3px' }}>
            <User size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.contactPerson || lead.prospectName || 'Decision Maker'}
            </span>
          </div>
        </div>

        {/* Stage Changer Dropdown */}
        <CustomSelect 
          value={lead.status} 
          onChange={(val) => onUpdateStatus(val)}
          options={PIPELINE_STATUSES.map(s => ({ value: s, label: s }))}
          size="sm"
          style={{ width: '135px', flexShrink: 0 }}
          triggerStyle={{
            padding: '3px 8px',
            fontSize: '0.74rem',
            fontWeight: 800,
            height: '28px',
            color: stageConfig.color,
            borderColor: stageConfig.border,
            background: stageConfig.bg
          }}
        />
      </div>

      {/* Contact Channels Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '8px 12px', 
          background: 'var(--subtle-bg)', 
          borderRadius: '10px',
          border: '1px solid var(--subtle-border)'
        }}
      >
        <div className="flex items-center gap-2">
          <Phone size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {lead.phone || 'No phone recorded'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {lead.phone && (
            <>
              <a 
                href={`tel:${lead.phone}`}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  background: 'rgba(56, 189, 248, 0.12)', 
                  color: '#38bdf8', 
                  fontSize: '0.72rem', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none'
                }}
                title="Direct Phone Call"
              >
                <Phone size={11} />
              </a>
              <a 
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  background: 'rgba(34, 197, 94, 0.12)', 
                  color: '#22c55e', 
                  fontSize: '0.72rem', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none'
                }}
                title="WhatsApp Message"
              >
                <MessageCircle size={11} />
              </a>
            </>
          )}
        </div>
      </div>

      {/* ACTION DATES BANNER: Prominently Marked Next Action Date & Last Action Date */}
      <div 
        style={{ 
          padding: '10px 12px', 
          background: 'var(--input-bg)', 
          borderRadius: '10px',
          border: '1px solid var(--subtle-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        {/* Next Action Date (Marked Banner) */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Marked Next Action:
            </span>
            {lead.nextActionDate && (
              <button
                type="button"
                onClick={onMarkDone}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 4px',
                  borderRadius: '4px'
                }}
                title="Mark this scheduled action as completed"
              >
                <Check size={11} /> Mark Done
              </button>
            )}
          </div>

          <div 
            onClick={onOpenComments}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '7px',
              fontSize: '0.76rem',
              fontWeight: 800,
              background: actionStatus.bg,
              color: actionStatus.color,
              border: `1px solid ${actionStatus.border}`,
              cursor: 'pointer'
            }}
          >
            {actionStatus.status === 'overdue' && <AlertCircle size={12} />}
            {actionStatus.status === 'today' && <Clock size={12} />}
            {actionStatus.status === 'upcoming' && <Calendar size={12} />}
            {actionStatus.status === 'none' && <Plus size={12} />}
            {actionStatus.label}
          </div>

          {lead.nextActionNote && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{lead.nextActionNote}"
            </div>
          )}
        </div>

        {/* Last Action Date (The commented date) */}
        <div style={{ paddingTop: '6px', borderTop: '1px solid var(--subtle-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Last Action (Commented):</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatDate(lead.lastActionDate || lead.date)}
            {latestComment && <span style={{ opacity: 0.7, marginLeft: '4px' }}>({latestComment.type})</span>}
          </span>
        </div>
      </div>

      {/* Latest Comment Snippet */}
      {latestComment ? (
        <div 
          onClick={onOpenComments}
          style={{ 
            padding: '8px 10px', 
            background: 'var(--subtle-bg)', 
            border: '1px solid var(--subtle-border)', 
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          title="Click to view full comment timeline"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.72rem' }}>
              💬 Latest Note ({formatDate(latestComment.date)}):
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{comments.length} logged</span>
          </div>
          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35 }}>
            "{latestComment.text}"
          </p>
        </div>
      ) : (
        <div 
          onClick={onOpenComments}
          style={{
            padding: '8px 10px',
            border: '1px dashed var(--subtle-border)',
            borderRadius: '8px',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          + Add first daily follow-up comment
        </div>
      )}

      {/* Action Footer */}
      <div 
        className="flex items-center gap-2" 
        style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--subtle-border)' }}
      >
        {/* Comment CTA */}
        <button 
          type="button"
          className="btn btn-secondary" 
          style={{ 
            flex: 1, 
            padding: '6px 10px', 
            fontSize: '0.78rem', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
            color: 'var(--accent-primary)'
          }} 
          onClick={onOpenComments}
        >
          <MessageSquare size={13} /> Follow-up ({comments.length})
        </button>

        {/* Quote Button */}
        <button 
          type="button"
          className="btn btn-primary" 
          style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={onQuote}
          title="Create Quotation"
        >
          <FileText size={13} /> Quote
        </button>

        {/* Edit Lead */}
        <button 
          type="button"
          className="btn btn-secondary" 
          style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.03)' }} 
          onClick={onEdit} 
          title="Edit Prospect"
        >
          <Edit2 size={13} />
        </button>

        {/* Delete Lead */}
        <button 
          type="button"
          className="btn btn-secondary" 
          style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.03)', color: 'var(--danger)' }} 
          onClick={onDelete} 
          title="Delete Prospect"
        >
          <Trash2 size={13} />
        </button>
      </div>

    </div>
  );
};

// ===================================================================
// CRM MONTHLY CALENDAR VIEW (All Marked Next Action Dates Appwide)
// ===================================================================
const LeadsCalendarView = ({ leads, onOpenComments, onMarkDone, onQuote }) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(new Date().toISOString().split('T')[0]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const startingOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Map of leads grouped by their nextActionDate
  const leadsByDate = useMemo(() => {
    const map = new Map();
    leads.forEach(l => {
      if (!l.nextActionDate) return;
      const key = l.nextActionDate.includes('T') ? l.nextActionDate.split('T')[0] : l.nextActionDate;
      const list = map.get(key) || [];
      list.push(l);
      map.set(key, list);
    });
    return map;
  }, [leads]);

  const todayKey = new Date().toISOString().split('T')[0];
  const selectedDayLeads = leadsByDate.get(selectedDayKey) || [];

  return (
    <div className="glass-panel" style={{ borderRadius: '16px', padding: '20px' }}>
      
      {/* CALENDAR CONTROLS & HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </h2>
            <button
              type="button"
              onClick={() => {
                setCurrentMonthDate(new Date());
                setSelectedDayKey(todayKey);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--subtle-border)',
                background: 'var(--subtle-bg)',
                color: 'var(--accent-primary)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Today
            </button>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
            Click any day to view scheduled follow-ups and mark next actions completed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
            style={{ padding: '6px 10px' }}
          >
            <ChevronLeft size={16} /> Prev Month
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
            style={{ padding: '6px 10px' }}
          >
            Next Month <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '24px' }}>
        {/* Day Name Headers */}
        {dayNames.map(d => (
          <div 
            key={d} 
            style={{ 
              textAlign: 'center', 
              padding: '8px 0', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {d}
          </div>
        ))}

        {/* Empty slots for starting offset */}
        {Array.from({ length: startingOffset }).map((_, i) => (
          <div key={`cal-empty-${i}`} style={{ minHeight: '80px', background: 'transparent' }} />
        ))}

        {/* Month Day Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const mo = String(month + 1).padStart(2, '0');
          const da = String(day).padStart(2, '0');
          const dateKey = `${year}-${mo}-${da}`;
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDayKey;
          const dayLeads = leadsByDate.get(dateKey) || [];

          return (
            <div
              key={`cal-day-${day}`}
              onClick={() => setSelectedDayKey(dateKey)}
              style={{
                minHeight: '85px',
                padding: '8px',
                borderRadius: '10px',
                background: isSelected 
                  ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--subtle-bg))'
                  : isToday 
                  ? 'color-mix(in srgb, var(--accent-primary) 8%, var(--input-bg))' 
                  : 'var(--input-bg)',
                border: isSelected
                  ? '2px solid var(--accent-primary)'
                  : isToday
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--subtle-border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Day Number and Today / Count Badge */}
              <div className="flex justify-between items-center mb-1">
                <span 
                  style={{ 
                    fontSize: '0.82rem', 
                    fontWeight: isToday || isSelected ? 800 : 600,
                    color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                >
                  {day}
                </span>

                {dayLeads.length > 0 && (
                  <span 
                    style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '1px 6px', 
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    {dayLeads.length} {dayLeads.length === 1 ? 'lead' : 'leads'}
                  </span>
                )}
              </div>

              {/* Marked Leads inside this cell */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto', overflow: 'hidden' }}>
                {dayLeads.slice(0, 2).map(dl => {
                  const actionStatus = getActionDateStatus(dl.nextActionDate);
                  return (
                    <div 
                      key={dl.id}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: actionStatus.bg,
                        color: actionStatus.color,
                        border: `1px solid ${actionStatus.border}`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${dl.gymName}: ${dl.nextActionNote || 'Action scheduled'}`}
                    >
                      {dl.gymName}
                    </div>
                  );
                })}
                {dayLeads.length > 2 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    +{dayLeads.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED DAY DETAILS DRAWER */}
      <div 
        style={{ 
          padding: '16px 20px', 
          borderRadius: '12px', 
          background: 'var(--subtle-bg)', 
          border: '1px solid var(--subtle-border)' 
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="h3" style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Marked Follow-ups for {formatDate(selectedDayKey)}
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {selectedDayLeads.length} {selectedDayLeads.length === 1 ? 'Action Marked' : 'Actions Marked'}
          </span>
        </div>

        {selectedDayLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDayLeads.map(lead => {
              const actionStatus = getActionDateStatus(lead.nextActionDate);
              return (
                <div 
                  key={lead.id}
                  style={{ 
                    padding: '14px', 
                    borderRadius: '10px', 
                    background: 'var(--input-bg)', 
                    border: '1px solid var(--subtle-border)',
                    borderLeft: `4px solid ${actionStatus.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>{lead.gymName}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{lead.contactPerson || 'Contact'}</span>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        padding: '2px 8px', 
                        borderRadius: '6px',
                        background: actionStatus.bg,
                        color: actionStatus.color,
                        border: `1px solid ${actionStatus.border}`
                      }}
                    >
                      {actionStatus.shortLabel}
                    </span>
                  </div>

                  {lead.nextActionNote && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', fontStyle: 'italic', background: 'var(--subtle-bg)', padding: '6px 8px', borderRadius: '6px' }}>
                      "{lead.nextActionNote}"
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-panel">
                    <button
                      type="button"
                      onClick={() => onMarkDone(lead)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={12} /> Mark Done
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        onClick={() => onOpenComments(lead)}
                      >
                        <MessageSquare size={12} /> Log
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        onClick={() => onQuote(lead)}
                      >
                        <FileText size={12} /> Quote
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No client follow-ups marked for this date.
          </div>
        )}
      </div>

    </div>
  );
};

// ===================================================================
// DAY-BY-DAY COMMENTS & FOLLOW-UP MODAL (The Core Requested Feature)
// ===================================================================
const LeadCommentsModal = ({ lead, onClose, markedActionDates, onAddComment, onMarkDone, onDeleteComment, onUpdateStatus, onQuote }) => {
  const [commentText, setCommentText] = useState('');
  const [interactionType, setInteractionType] = useState('Call');
  
  // Date of this comment: default to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [commentDate, setCommentDate] = useState(todayStr);

  // Next Action Date: defaults to tomorrow or existing
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [nextActionDate, setNextActionDate] = useState(lead.nextActionDate || tomorrowStr);
  const [nextActionNote, setNextActionNote] = useState(lead.nextActionNote || '');
  const [submitting, setSubmitting] = useState(false);

  const comments = Array.isArray(lead.comments) ? lead.comments : [];
  const actionStatus = getActionDateStatus(lead.nextActionDate);
  const stageConfig = getStageConfig(lead.status);

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const formattedCommentDate = new Date(commentDate).toISOString();

      onAddComment({
        date: formattedCommentDate,
        text: commentText.trim(),
        type: interactionType,
        nextActionDate: nextActionDate || null,
        nextActionNote: nextActionNote.trim()
      });

      setCommentText('');
      setNextActionNote('');
    } finally {
      setSubmitting(false);
    }
  };

  const applyPresetDate = (daysFromToday) => {
    if (daysFromToday === null) {
      setNextActionDate('');
      return;
    }
    const d = new Date(Date.now() + daysFromToday * 86400000);
    setNextActionDate(d.toISOString().split('T')[0]);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '720px', 
          maxHeight: 'min(94vh, calc(100dvh - 16px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0, 
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--panel-bg, #0f172a)',
          backgroundColor: '#0f172a',
          border: '1px solid var(--subtle-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div 
          style={{ 
            flexShrink: 0, 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--subtle-border)',
            background: 'var(--subtle-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  padding: '2px 7px', 
                  borderRadius: '5px',
                  background: stageConfig.bg,
                  color: stageConfig.color,
                  border: `1px solid ${stageConfig.border}`
                }}
              >
                {lead.status}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.contactPerson || lead.prospectName || 'Lead Prospect'}
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.gymName}
            </h2>
          </div>

          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            <button 
              type="button"
              className="btn btn-secondary"
              style={{ 
                padding: '5px 10px', 
                fontSize: '0.76rem', 
                fontWeight: 600, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px',
                height: '32px',
                color: '#818cf8',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                background: 'rgba(99, 102, 241, 0.08)'
              }}
              onClick={onQuote}
              title="Create quotation for this lead"
            >
              <FileText size={13} /> <span>Quote</span>
            </button>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ padding: '6px', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CURRENT STATUS BANNER: Compact, clean single row / flex wrap */}
        <div 
          style={{ 
            padding: '8px 16px', 
            background: 'var(--subtle-bg)', 
            borderBottom: '1px solid var(--subtle-border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.76rem'
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Action:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {formatDate(lead.lastActionDate || lead.date)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}>Next:</span>
              <span 
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: actionStatus.bg,
                  color: actionStatus.color,
                  border: `1px solid ${actionStatus.border}`
                }}
              >
                {actionStatus.label}
              </span>

              {lead.nextActionDate && (
                <button
                  type="button"
                  onClick={onMarkDone}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '5px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Mark scheduled action completed"
                >
                  <CheckCheck size={11} /> Done
                </button>
              )}
            </div>
          </div>

          {/* Quick Stage Changer */}
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Stage:</span>
            <div style={{ width: '120px' }}>
              <CustomSelect 
                value={lead.status}
                onChange={(val) => onUpdateStatus(val)}
                options={PIPELINE_STATUSES.map(s => ({ value: s, label: s }))}
                size="sm"
                triggerStyle={{ height: '28px', fontSize: '0.74rem', fontWeight: 600 }}
              />
            </div>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE TIMELINE + ADD FORM) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* SECTION 1: LOG DAILY COMMENT / FOLLOW-UP FORM */}
          <form 
            onSubmit={handleCommentSubmit}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--subtle-bg)',
              border: '1px solid var(--subtle-border)'
            }}
          >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Log Daily Follow-up
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Sets last action date automatically
              </span>
            </div>

            {/* Interaction Type & Comment Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-2.5">
              
              {/* Type */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Channel</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {INTERACTION_TYPES.map(t => {
                    const Icon = t.icon;
                    const isSelected = interactionType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setInteractionType(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '5px 4px',
                          borderRadius: '5px',
                          border: `1px solid ${isSelected ? t.color : 'var(--subtle-border)'}`,
                          background: isSelected ? `color-mix(in srgb, ${t.color} 12%, transparent)` : 'var(--input-bg)',
                          color: isSelected ? t.color : 'var(--text-secondary)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={11} /> {t.label.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Date */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
                  Comment Date
                </label>
                <DatePicker
                  value={commentDate}
                  onChange={setCommentDate}
                  size="sm"
                  placeholder="Select comment date..."
                />
              </div>

            </div>

            {/* Daily Discussion Note Textarea */}
            <div className="form-group mb-2.5">
              <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
                Follow-up Discussion Notes / Feedback <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                className="form-input"
                rows={2}
                placeholder="What was discussed today? e.g. Spoke with owner regarding pricing; sent quote..."
                style={{ resize: 'vertical', fontSize: '0.8rem', minHeight: '56px', padding: '6px 8px' }}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>

            {/* Next Action Scheduling */}
            <div 
              style={{ 
                padding: '8px 10px', 
                background: 'var(--input-bg)', 
                borderRadius: '8px', 
                border: '1px solid var(--subtle-border)',
                marginBottom: '10px'
              }}
            >
              {/* Header & Quick Presets cleanly separated to NEVER break words vertically! */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={12} style={{ color: '#818cf8' }} />
                  <span>Next Scheduled Action &amp; Goal</span>
                </div>
                
                {/* Clean Presets Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quick:</span>
                  <button type="button" onClick={() => applyPresetDate(1)} style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '4px', border: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Tomorrow</button>
                  <button type="button" onClick={() => applyPresetDate(3)} style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '4px', border: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>In 3d</button>
                  <button type="button" onClick={() => applyPresetDate(7)} style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '4px', border: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>In 1w</button>
                  <button type="button" onClick={() => applyPresetDate(null)} style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '4px', border: '1px solid var(--subtle-border)', background: 'var(--subtle-bg)', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <DatePicker
                    value={nextActionDate}
                    onChange={setNextActionDate}
                    markedDates={markedActionDates}
                    size="sm"
                    placeholder="Mark next action date..."
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Goal / Task (e.g. Call back, visit)..."
                    style={{ height: '32px', fontSize: '0.78rem', padding: '0 8px' }}
                    value={nextActionNote}
                    onChange={(e) => setNextActionNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || !commentText.trim()}
                className="btn btn-primary"
                style={{ 
                  padding: '6px 14px', 
                  fontSize: '0.78rem', 
                  fontWeight: 600, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  width: 'auto',
                  borderRadius: '6px'
                }}
              >
                <Check size={13} /> Save Comment &amp; Action
              </button>
            </div>
          </form>

          {/* SECTION 2: CHRONOLOGICAL DAY-BY-DAY ACTIVITY TIMELINE */}
          <div style={{ marginTop: '4px' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <History size={14} style={{ color: 'var(--text-muted)' }} />
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Activity History ({comments.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Newest first
              </span>
            </div>

            {comments.length > 0 ? (
              <div 
                style={{ 
                  position: 'relative', 
                  paddingLeft: '18px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}
              >
                {/* Timeline vertical rule */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: '5px', 
                    top: '8px', 
                    bottom: '8px', 
                    width: '2px', 
                    background: 'var(--subtle-border)' 
                  }} 
                />

                {comments.map((c, index) => {
                  const typeObj = INTERACTION_TYPES.find(t => t.id === c.type) || INTERACTION_TYPES[0];
                  const Icon = typeObj.icon;

                  return (
                    <div 
                      key={c.id || index}
                      style={{ 
                        position: 'relative', 
                        padding: '10px 12px', 
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--subtle-border)'
                      }}
                    >
                      {/* Timeline dot */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: '-17px', 
                          top: '14px', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: typeObj.color,
                          border: '2px solid var(--panel-bg, #0f172a)'
                        }} 
                      />

                      {/* Comment Top: Author, Type, Date */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: `color-mix(in srgb, ${typeObj.color} 12%, transparent)`,
                              color: typeObj.color,
                              border: `1px solid color-mix(in srgb, ${typeObj.color} 25%, transparent)`
                            }}
                          >
                            <Icon size={10} /> {typeObj.label}
                          </span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {c.author || 'Sales Rep'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(c.date)}
                          </span>
                          {onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this comment from history?')) {
                                  onDeleteComment(c.id);
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment Content */}
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {c.text}
                      </p>

                      {/* Next action scheduled in this comment */}
                      {c.nextActionDate && (
                        <div 
                          style={{ 
                            marginTop: '8px', 
                            padding: '4px 8px', 
                            borderRadius: '5px', 
                            background: 'rgba(99, 102, 241, 0.08)', 
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            color: '#818cf8'
                          }}
                        >
                          <Calendar size={11} />
                          <span>
                            Next Action: <strong>{formatDate(c.nextActionDate)}</strong>
                            {c.nextActionNote && ` — "${c.nextActionNote}"`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '24px 14px', 
                  border: '1px dashed var(--subtle-border)', 
                  borderRadius: '8px',
                  color: 'var(--text-muted)' 
                }}
              >
                <Clock size={24} style={{ opacity: 0.35, margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Activity Yet</div>
                <p style={{ fontSize: '0.72rem', marginTop: '2px', color: 'var(--text-muted)' }}>
                  Log notes above to build this prospect's timeline.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div 
          style={{ 
            flexShrink: 0, 
            padding: '8px 16px', 
            paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
            borderTop: '1px solid var(--subtle-border)', 
            background: 'var(--panel-bg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Pipeline status updates automatically
          </span>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '5px 14px', fontSize: '0.78rem', height: 'auto', borderRadius: '6px' }} 
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// ===================================================================
// CREATE / EDIT PROSPECT MODAL
// ===================================================================
const LeadModal = ({ initialData, onClose, onSave, statuses, markedActionDates = [] }) => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState(initialData || {
    gymName: '',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'New',
    value: '',
    notes: '',
    nextActionDate: tomorrowStr,
    nextActionNote: 'Initial outreach / qualification call'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '620px', 
          maxHeight: 'min(92vh, calc(100dvh - 24px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0, 
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--panel-bg, #111827)',
          backgroundColor: 'color-mix(in srgb, var(--bg-primary, #0d1218) 95%, var(--panel-bg, #111827))',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.85)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div className="flex justify-between items-center">
            <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              {initialData?.id ? 'Edit Prospect Details' : 'Add New Prospect to Pipeline'}
            </h2>
            <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label">Client Business / Gym Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                required 
                type="text" 
                className="form-input" 
                placeholder="e.g. Lanka Fancy Pettah / PowerZone Gym"
                style={{ height: '42px' }} 
                value={formData.gymName || ''} 
                onChange={e => setFormData({...formData, gymName: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Key Decision Maker <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. M. Farook (Manager)"
                  style={{ height: '42px' }} 
                  value={formData.contactPerson || formData.prospectName || ''} 
                  onChange={e => setFormData({...formData, contactPerson: e.target.value, prospectName: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pipeline Stage</label>
                <CustomSelect 
                  value={formData.status || 'New'} 
                  onChange={val => setFormData({...formData, status: val})}
                  options={statuses.map(s => ({ value: s, label: s }))}
                  style={{ width: '100%', height: '42px' }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Mobile Contact <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required 
                  type="tel" 
                  className="form-input" 
                  style={{ height: '42px' }} 
                  placeholder="07XXXXXXXX" 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ height: '42px' }} 
                  placeholder="owner@domain.lk"
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            {/* Next Action Scheduling (Using Theme-Matched DatePicker) */}
            <div style={{ padding: '14px', background: 'var(--subtle-bg)', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
              <div className="flex items-center gap-1.5 mb-2 text-warning" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                <Clock size={14} /> Mark First Follow-up Action Date
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Next Action Date</label>
                  <DatePicker
                    value={formData.nextActionDate || ''}
                    onChange={val => setFormData({...formData, nextActionDate: val})}
                    markedDates={markedActionDates}
                    size="sm"
                    placeholder="Mark next action date..."
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Next Action Goal</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Call to introduce products"
                    style={{ height: '34px', fontSize: '0.82rem' }}
                    value={formData.nextActionNote || ''}
                    onChange={e => setFormData({...formData, nextActionNote: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Background / Discovery Notes</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '80px', resize: 'vertical', fontSize: '0.85rem' }} 
                placeholder="Business background, current supplier, estimated monthly volume..." 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
              />
            </div>
          </div>

          <div 
            className="flex justify-end gap-3 p-4 border-t border-panel responsive-form-actions"
            style={{
              flexShrink: 0,
              background: 'var(--input-bg)',
              backdropFilter: 'blur(8px)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))'
            }}
          >
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 20px' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px', fontWeight: 700 }}>Save Prospect</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default Leads;
