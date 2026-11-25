import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import {
  ClipboardList, Smartphone, Info, AlertCircle, Trash2, Clock, Activity,
  ShieldCheck, Search, Download, Terminal, Lock, DollarSign, Building2
} from 'lucide-react';
import { exportToCSV } from '../utils/export';

const KNOWN_TYPES = ['All', 'SMS', 'HardwareCommand', 'Security', 'Access', 'Status', 'System', 'Error'];

const Logs = () => {
  const { activityLogs = [], confirmAction, clearActivityLogs, showNotification } = useContext(StoreContext) || {};
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const availableTypes = useMemo(() => {
    const extra = new Set(KNOWN_TYPES);
    activityLogs.forEach(l => {
      if (l?.type) extra.add(l.type);
    });
    return Array.from(extra);
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...activityLogs]
      .filter(log => {
        if (!log) return false;
        if (filterType !== 'All' && log.type !== filterType) return false;
        if (q) {
          const hay = `${log.type || ''} ${log.message || ''} ${log.details || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [activityLogs, filterType, searchQuery]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Error': return 'var(--danger, #ef4444)';
      case 'SMS': return 'var(--accent, #6366f1)';
      case 'HardwareCommand': return '#f59e0b';
      case 'Security': return '#a855f7';
      case 'Access': return '#0ea5e9';
      case 'Status': return 'var(--warning, #f59e0b)';
      case 'FixedAsset':
      case 'Expense': return '#10b981';
      default: return 'var(--success, #10b981)';
    }
  };

  const getIcon = (type) => {
    const color = getTypeColor(type);
    switch (type) {
      case 'SMS': return <Smartphone size={16} style={{ color }} />;
      case 'HardwareCommand': return <Terminal size={16} style={{ color }} />;
      case 'Security': return <Lock size={16} style={{ color }} />;
      case 'Status': return <Info size={16} style={{ color }} />;
      case 'System': return <Activity size={16} style={{ color }} />;
      case 'Error': return <AlertCircle size={16} style={{ color }} />;
      case 'Access': return <ShieldCheck size={16} style={{ color }} />;
      case 'FixedAsset': return <Building2 size={16} style={{ color }} />;
      case 'Expense': return <DollarSign size={16} style={{ color }} />;
      default: return <ClipboardList size={16} style={{ color }} />;
    }
  };

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map(l => ({
      Timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : '',
      Type: l.type || 'System',
      Action: l.message || '',
      Details: l.details || ''
    }));
    exportToCSV(rows, `Activity_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    if (showNotification) showNotification(`Exported ${rows.length} activity log(s) to CSV.`, 'success');
  };

  const clearLogs = () => {
    if (confirmAction) {
      confirmAction({
        title: 'Clear All Activity Logs?',
        message: 'This will permanently wipe all system activity, SMS records, and audit logs from both local storage and the cloud database. Proceed?',
        confirmText: 'Yes, Clear All Logs',
        cancelText: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          if (clearActivityLogs) {
            await clearActivityLogs();
          }
        }
      });
    } else if (window.confirm('This will permanently delete all historical activity logs. Proceed?')) {
      if (clearActivityLogs) clearActivityLogs();
    }
  };

  return (
    <div style={{ paddingBottom: '90px', animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="h1 mb-1">Activity &amp; Security Audit Logs</h1>
          <p className="text-secondary" style={{ fontSize: '0.92rem', margin: 0 }}>
            Newest-first audit trail of hardware commands, SMS dispatches, security events, and user actions ({filteredLogs.length} entries).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            style={{ height: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: 'var(--danger, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.35)', height: '40px' }}
            onClick={clearLogs}
          >
            <Trash2 size={16} /> Clear All Logs
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Filter Pills + Search */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--surface-2, var(--subtle-bg))',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {availableTypes.map(type => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  style={{
                    background: isActive ? 'var(--accent)' : 'var(--surface)',
                    color: isActive ? 'var(--accent-fg)' : 'var(--text)',
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', maxWidth: '420px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search logs by action, terminal SN, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.84rem' }}
            />
          </div>
        </div>

        <div className="table-container" style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          {/* Desktop Table */}
          <table className="sm-hidden interactive-table table">
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--surface-2, var(--surface))', zIndex: 10 }}>
                <th>Timestamp</th>
                <th>Classification</th>
                <th>Primary Action</th>
                <th>Technical Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '72px 24px' }}>
                    <div style={{ opacity: 0.25, marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><ClipboardList size={44} /></div>
                    <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0 }}>No matching activity records found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2 text-secondary tabular-nums" style={{ fontSize: '0.8rem' }}>
                        <Clock size={13} />
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        {getIcon(log.type)}
                        <span style={{ color: getTypeColor(log.type) }}>
                          {(log.type || 'SYSTEM').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{log.message}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                        {log.details || '—'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile List View */}
          <div className="md-hidden" style={{ padding: '12px' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p className="text-secondary">No activity records.</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} style={{
                  padding: '14px',
                  background: 'var(--surface-2, var(--subtle-bg))',
                  borderRadius: '12px',
                  marginBottom: '10px',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${getTypeColor(log.type)}`
                }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="flex items-center gap-1.5" style={{ fontSize: '0.74rem', fontWeight: 800, color: getTypeColor(log.type) }}>
                      {getIcon(log.type)}
                      {(log.type || 'SYSTEM').toUpperCase()}
                    </span>
                    <span className="text-secondary tabular-nums" style={{ fontSize: '0.72rem' }}>
                      {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text)' }}>{log.message}</div>
                  {log.details && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                      {log.details}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
