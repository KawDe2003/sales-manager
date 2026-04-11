import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { ClipboardList, Smartphone, Info, AlertCircle, Calendar, Trash2, Clock, Activity } from 'lucide-react';

const Logs = () => {
  const { activityLogs = [] } = useContext(StoreContext) || {};
  const [filterType, setFilterType] = useState('All');

  const filteredLogs = filterType === 'All' 
    ? activityLogs 
    : activityLogs.filter(log => log.type === filterType);

  const getIcon = (type) => {
    switch (type) {
      case 'SMS': return <Smartphone size={16} style={{ color: 'var(--accent-primary)' }} />;
      case 'Status': return <Info size={16} style={{ color: 'var(--warning)' }} />;
      case 'System': return <Activity size={16} style={{ color: 'var(--success)' }} />;
      case 'Error': return <AlertCircle size={16} style={{ color: 'var(--danger)' }} />;
      default: return <ClipboardList size={16} />;
    }
  };

  const clearLogs = () => {
    if(window.confirm('This will permanently delete all historical activity logs. Proceed?')) {
      localStorage.removeItem('gym_logs');
      window.location.reload(); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1 mb-2">Audit Trail</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Comprehensive system logs tracking communications, status updates, and automated tasks.</p>
        </div>
        <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.1)' }} onClick={clearLogs}>
          <Trash2 size={18} /> Purge Records
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ 
          padding: '20px 24px', background: 'var(--subtle-bg)', 
          borderBottom: '1px solid var(--panel-border)', display: 'flex', gap: '8px' 
        }}>
          {['All', 'SMS', 'Status', 'System', 'Error'].map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? 'var(--accent-primary)' : 'var(--subtle-bg)',
                color: filterType === type ? 'white' : 'var(--text-secondary)',
                border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="table-container" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                <th>Timestamp</th>
                <th>Classification</th>
                <th>Primary Action</th>
                <th>Technical Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '80px 24px' }}>
                    <div style={{ opacity: 0.15, marginBottom: '16px' }}><ClipboardList size={48} /></div>
                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No activity records available for the selected criteria.</p>
                  </td>
                </tr>
              ) : (
                [...filteredLogs].reverse().map(log => (
                  <tr key={log.id} className="hover-lift">
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2 text-secondary" style={{ fontSize: '0.8rem' }}>
                        <Clock size={13} />
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {getIcon(log.type)}
                        <span style={{ 
                          color: log.type === 'Error' ? 'var(--danger)' : 
                                 log.type === 'SMS' ? 'var(--accent-primary)' : 
                                 log.type === 'Status' ? 'var(--warning)' : 'var(--success)'
                        }}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.message}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.8 }}>
                        {log.details || 'LOG_ENTRY_NULL'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
