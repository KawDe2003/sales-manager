import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';
import { 
  Settings as SettingsIcon, CreditCard, MessageSquare, Save, RefreshCw, 
  Building2, Globe, ShieldCheck, Mail, Phone, MapPin, Zap, Cake, 
  Settings2, Info, Layout, Users, UserPlus, Shield, Trash2, X, Check,
  Key, Eye, EyeOff, Copy, Edit3, Search, Filter, Lock, Calendar, Building,
  AlertTriangle, CheckCircle2
} from 'lucide-react';

const Settings = () => {
  const { 
    smsConfig = {}, updateSmsConfig, fetchSmsBalance, showNotification, 
    handleTestSms, resetToSeynexDefaults, seedDummyData,
    teamMembers = [], addTeamMember, updateTeamMember, updateTeamMemberRole, toggleTeamMemberStatus, deleteTeamMember, resetUserPassword,
    customRoles = [], addCustomRole, updateCustomRole, duplicateCustomRole, deleteCustomRole, confirmAction
  } = useContext(StoreContext) || {};
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeSettingsTab, setActiveSettingsTab] = useState('users'); // 'users', 'company', 'sms', 'bank'

  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    if (fetchSmsBalance) await fetchSmsBalance();
    setBalanceLoading(false);
  };

  useEffect(() => {
    handleRefreshBalance();
  }, []);

  const handleSave = () => {
    showNotification('System configuration updated successfully.');
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <div>
          <h1 className="h1 mb-2">System Settings</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Manage team member accounts, corporate branding, SMS API integrations, and payment details.</p>
        </div>
        <button className="btn btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={handleSave}>
          <Save size={18} /> Save All Changes
        </button>
      </div>

      {/* TOP TAB NAVIGATION BAR */}
      <div className="glass-panel flex flex-wrap gap-2 mb-8" style={{ padding: '8px 12px' }}>
        {[
          { id: 'users', label: 'Team & User Roles', icon: <Users size={16} /> },
          { id: 'company', label: 'Corporate Identity', icon: <Building2 size={16} /> },
          { id: 'sms', label: 'SMS & Messaging API', icon: <MessageSquare size={16} /> },
          { id: 'bank', label: 'Bank & Payments', icon: <CreditCard size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSettingsTab(tab.id)}
            className={`btn ${activeSettingsTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              borderRadius: '10px',
              border: activeSettingsTab === tab.id ? 'none' : '1px solid transparent'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TEAM & USER ROLES (PRIMARY DEFAULT VIEW) */}
      {activeSettingsTab === 'users' && (
        <div className="flex flex-col gap-8 mb-8">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <Users size={22} color="var(--accent-primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Accounts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{teamMembers.length}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <CheckCircle2 size={22} color="var(--success)" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Logins</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>{teamMembers.filter(m => m.status === 'Active').length}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.15)', borderRadius: '14px', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                <AlertTriangle size={22} color="var(--danger)" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suspended / Inactive</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-display)' }}>{teamMembers.filter(m => m.status === 'Suspended').length}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                <Shield size={22} color="#a855f7" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Defined Roles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', fontFamily: 'var(--font-display)' }}>{customRoles.length}</div>
              </div>
            </div>
          </div>

          {/* MAIN USER ACCOUNTS TABLE PANEL */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--panel-border)' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <Users size={24} color="var(--accent-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Access Control</div>
                  <h2 className="h2" style={{ margin: 0, fontSize: '1.4rem' }}>Team & User Account Management</h2>
                </div>
              </div>
              <button className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem', gap: '8px' }} onClick={() => setShowAddUserModal(true)}>
                <UserPlus size={18} /> + Provision User Account
              </button>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6" style={{ background: 'var(--subtle-bg)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--subtle-border)' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search accounts by name, email or department..." 
                  value={searchMemberQuery} 
                  onChange={e => setSearchMemberQuery(e.target.value)} 
                  style={{ height: '38px', paddingLeft: '40px', fontSize: '0.86rem' }}
                />
              </div>

              <div className="flex items-center gap-2" style={{ width: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status:</span>
                {['All', 'Active', 'Suspended', 'Pending'].map(st => (
                  <button 
                    key={st}
                    type="button" 
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                      background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                      color: statusFilter === st ? 'white' : 'var(--text-secondary)',
                      border: statusFilter === st ? '1px solid var(--accent-primary)' : '1px solid var(--subtle-border)'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-container" style={{ background: 'transparent' }}>
              <table style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '12px 0', opacity: 0.7 }}>Team Member Details</th>
                    <th style={{ padding: '12px 0', opacity: 0.7 }}>Department</th>
                    <th style={{ padding: '12px 0', opacity: 0.7 }}>System Role</th>
                    <th style={{ padding: '12px 0', opacity: 0.7 }}>Account Status</th>
                    <th style={{ padding: '12px 0', textAlign: 'right', opacity: 0.7 }}>Actions & Security</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers
                    .filter(member => {
                      const q = searchMemberQuery.toLowerCase();
                      const matchesSearch = (member.name || '').toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q) || (member.department || '').toLowerCase().includes(q);
                      const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: member.status === 'Suspended' 
                              ? 'rgba(244, 63, 94, 0.15)' 
                              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.1))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, color: member.status === 'Suspended' ? 'var(--danger)' : 'var(--accent-primary)', fontFamily: 'var(--font-display)'
                          }}>
                            {(member.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {member.name}
                              {member.mustChangePassword && (
                                <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>Reset Required</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{member.email} {member.phone ? `• ${member.phone}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)' }}>
                          <Building size={11} /> {member.department || 'General'}
                        </span>
                      </td>
                      <td>
                        <CustomSelect 
                          size="sm"
                          style={{ width: '210px' }}
                          value={member.role}
                          onChange={e => updateTeamMemberRole && updateTeamMemberRole(member.id, e.target.value)}
                          options={[
                            { value: 'Admin', label: '👑 Admin (Full Access)' },
                            { value: 'Sales Representative', label: '💼 Sales Representative' },
                            { value: 'Accountant', label: '📊 Accountant (Read-Only)' },
                            ...customRoles.filter(r => !['Admin', 'Sales Representative', 'Accountant'].includes(r.title)).map(r => ({
                              value: r.title,
                              label: `🛡️ ${r.title}`
                            }))
                          ]}
                        />
                      </td>
                      <td>
                        <button 
                          type="button"
                          onClick={() => toggleTeamMemberStatus && toggleTeamMemberStatus(member.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Click to toggle status"
                        >
                          {member.status === 'Active' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                              <Check size={12} /> Active Account
                            </span>
                          ) : member.status === 'Pending' ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                              <Clock size={12} /> Pending Invite
                            </span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                              <X size={12} /> Suspended Access
                            </span>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '8px 10px', fontSize: '0.8rem' }}
                            onClick={() => setEditingUser(member)}
                            title="Edit Account Details"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '8px 10px', 
                              fontSize: '0.8rem',
                              color: 'var(--accent-primary)', 
                              background: 'rgba(99, 102, 241, 0.1)', 
                              border: '1px solid rgba(99, 102, 241, 0.25)' 
                            }}
                            onClick={() => setResetPasswordUser(member)}
                            title="Reset User Password"
                          >
                            <Key size={14} /> Reset Pass
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                            onClick={() => {
                              if (confirmAction) {
                                confirmAction({
                                  title: 'Revoke User Access',
                                  message: `Are you sure you want to remove user account for ${member.name}?`,
                                  confirmText: 'Remove Access',
                                  onConfirm: () => deleteTeamMember && deleteTeamMember(member.id)
                                });
                              } else if (window.confirm(`Are you sure you want to remove user account for ${member.name}?`)) {
                                deleteTeamMember && deleteTeamMember(member.id);
                              }
                            }}
                            title="Revoke User Access"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CUSTOM USER ROLES & PERMISSIONS PANEL */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--panel-border)' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <Shield size={24} color="#a855f7" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Role Definitions & Matrix</div>
                  <h2 className="h2" style={{ margin: 0, fontSize: '1.4rem' }}>Defined System & Custom Roles</h2>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.88rem', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' }} onClick={() => { setEditingRole(null); setShowCreateRoleModal(true); }}>
                <Shield size={16} /> + Create Custom Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoles.map(role => {
                const assignedCount = teamMembers.filter(m => m.role === role.title).length;
                return (
                  <div key={role.id} style={{
                    background: 'var(--subtle-bg)', padding: '20px', borderRadius: '16px',
                    border: '1px solid var(--subtle-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 850, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{role.title}</span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{assignedCount} Member(s)</span>
                        </div>
                        {role.isSystem ? (
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>System Built-in</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              onClick={() => { setEditingRole(role); setShowCreateRoleModal(true); }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              onClick={() => duplicateCustomRole && duplicateCustomRole(role.id)}
                              title="Duplicate Role"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--danger)', background: 'transparent' }}
                              onClick={() => deleteCustomRole && deleteCustomRole(role.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {role.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                          {role.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 style={{ marginTop: '12px' }}">
                      {role.permissions.includes('all') ? (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>👑 Full Administrative System Access</span>
                      ) : (
                        role.permissions.map(p => (
                          <span key={p} className="badge badge-secondary" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }}>
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab !== 'users' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Company & API */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Company Profile */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                <Building2 size={22} color="var(--success)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Corporate Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Dashboard Brand Name</label>
                <div style={{ position: 'relative' }}>
                  <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} 
                    placeholder="e.g. GymSales"
                    value={smsConfig.dashboardName || ''}
                    onChange={e => updateSmsConfig({...smsConfig, dashboardName: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Legal Entity Name</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyName || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyName: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Primary Email Header</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="email" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyEmail || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyEmail: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Support Line</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyPhone || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyPhone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Owner / Admin Phone <Info size={12} className="text-secondary" title="Receives internal alerts for quote acceptances" />
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: 'var(--accent-primary)' }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px', borderColor: 'rgba(59, 130, 246, 0.2)' }} 
                    placeholder="For Internal Alerts"
                    value={smsConfig.adminPhone || ''}
                    onChange={e => updateSmsConfig({...smsConfig, adminPhone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Registered Office Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={smsConfig.companyAddress || ''}
                    onChange={e => updateSmsConfig({...smsConfig, companyAddress: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-panel">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.bank || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), bank: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Location</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.branch || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), branch: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.accountName || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountName: e.target.value}})} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input type="text" className="form-input" value={smsConfig.bankDetails?.accountNumber || ''}
                  onChange={e => updateSmsConfig({...smsConfig, bankDetails: {...(smsConfig.bankDetails || {}), accountNumber: e.target.value}})} />
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Receipt Logo</label>
              <div style={{ position: 'relative' }}>
                <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input type="file" accept="image/*" className="form-input" style={{ paddingLeft: '40px' }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateSmsConfig({ ...smsConfig, receiptLogo: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {smsConfig.receiptLogo && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={smsConfig.receiptLogo} alt="Receipt Logo" style={{ height: '40px', borderRadius: '4px' }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }}
                    onClick={() => updateSmsConfig({ ...smsConfig, receiptLogo: '' })}>Remove</button>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Application Favicon</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input type="file" accept="image/*" className="form-input" style={{ paddingLeft: '40px' }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateSmsConfig({ ...smsConfig, appFavicon: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {smsConfig.appFavicon && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={smsConfig.appFavicon} alt="Favicon preview" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '4px' }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }}
                    onClick={() => updateSmsConfig({ ...smsConfig, appFavicon: '' })}>Remove</button>
                </div>
              )}
            </div>
          </div>

          {/* Document Numbering & Sequence */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                <Settings2 size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Document Sequencing</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Invoice Prefix <Info size={12} className="text-secondary" title="The text before the number e.g. INV-" />
                </label>
                <input type="text" className="form-input" 
                  value={smsConfig.invoicePrefix || ''}
                  placeholder="INV-"
                  onChange={e => updateSmsConfig({...smsConfig, invoicePrefix: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Starting Invoice #</label>
                <input type="number" className="form-input" 
                  value={smsConfig.nextInvoiceNumber || 1001}
                  onChange={e => updateSmsConfig({...smsConfig, nextInvoiceNumber: Number(e.target.value)})} />
              </div>
              
              <div style={{ height: '1px', background: 'var(--panel-border)', gridColumn: 'span 2' }}></div>
              
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Quotation Prefix <Info size={12} className="text-secondary" title="The text before the number e.g. QT-" />
                </label>
                <input type="text" className="form-input" 
                  value={smsConfig.quotePrefix || ''}
                  placeholder="QT-"
                  onChange={e => updateSmsConfig({...smsConfig, quotePrefix: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Starting Quotation #</label>
                <input type="number" className="form-input" 
                  value={smsConfig.nextQuoteNumber || 1001}
                  onChange={e => updateSmsConfig({...smsConfig, nextQuoteNumber: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          {/* Demo Data & System Utilities */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '12px' }}>
                <Zap size={22} color="var(--success)" />
              </div>
              <div>
                <h2 className="h2" style={{ margin: 0 }}>Demo Data & Sample Records</h2>
                <p className="text-secondary" style={{ fontSize: '0.82rem', margin: 0 }}>Populate full sample enterprise records across clients, invoices, inventory, and general ledger journal lines.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={seedDummyData}
                style={{ padding: '10px 20px', fontSize: '0.88rem', gap: '8px' }}
              >
                <Zap size={16} /> Seed Sample Enterprise Dataset
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={resetToSeynexDefaults}
                style={{ padding: '10px 18px', fontSize: '0.88rem', gap: '6px', color: 'var(--danger)' }}
              >
                <Trash2 size={16} /> Clear Workspace Data
              </button>
            </div>
          </div>

          {/* SMS Gateway */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                <Globe size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Communications Gateway</h2>
            </div>

            <div className="form-group">
              <label className="form-label">API Infrastructure URL</label>
              <input type="text" className="form-input" 
                value={smsConfig.apiUrl || ''} 
                onChange={e => updateSmsConfig({...smsConfig, apiUrl: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Gateway Username</label>
                <input type="text" className="form-input" 
                  value={smsConfig.email || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cryptographic API Key</label>
                <input type="password" className="form-input" 
                  value={smsConfig.apiKey || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, apiKey: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Authorized Sender ID (SID)</label>
              <input type="text" className="form-input" 
                placeholder="SEYNEX"
                value={smsConfig.senderID || ''} 
                onChange={e => updateSmsConfig({...smsConfig, senderID: e.target.value})} 
              />
            </div>

            <div style={{ marginTop: '24px', padding: '24px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4), rgba(30, 41, 59, 0.2))', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
              <div className="flex justify-between items-end" style={{ marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepaid Wallet Balance</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: smsConfig.balance === 'Error' ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-display)' }}>
                      {smsConfig.balance !== undefined ? smsConfig.balance : '0.00'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>SMS Credits</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={balanceLoading}
                  className="btn btn-secondary"
                  style={{ animation: balanceLoading ? 'pulse 1s infinite' : 'none' }}
                >
                  <RefreshCw size={16} className={balanceLoading ? 'spin-anim' : ''} /> Sync
                </button>
              </div>

              <a 
                href={`https://quicksend.lk/Client/topup.php?email=${smsConfig.email}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary" 
                style={{ width: '100%', background: 'linear-gradient(to right, #3b82f6, #2563eb)' }}
              >
                <CreditCard size={18} /> Add Wallet Credits
              </a>
            </div>
          </div>

          {/* PDF Branding Section */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                <Layout size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>PDF Document Branding</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Document Theme Color</label>
              <div className="flex items-center gap-4">
                <input type="color" 
                  style={{ width: '60px', height: '42px', padding: '0', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer' }}
                  value={smsConfig.pdfColor || '#3b82f6'} 
                  onChange={e => updateSmsConfig({...smsConfig, pdfColor: e.target.value})} 
                />
                <input type="text" className="form-input" 
                  style={{ flex: 1 }}
                  value={smsConfig.pdfColor || '#3b82f6'} 
                  onChange={e => updateSmsConfig({...smsConfig, pdfColor: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">PDF Master Footer Text</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '60px', fontSize: '0.85rem' }}
                placeholder="e.g. Thank you for your business. Please process payment promptly."
                value={smsConfig.pdfFooterText || ''} 
                onChange={e => updateSmsConfig({...smsConfig, pdfFooterText: e.target.value})} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Document Notes (T&C)</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '100px', fontSize: '0.85rem' }}
                placeholder="e.g. This document is generated by GymSales Pro Management System."
                value={smsConfig.pdfNotes || ''} 
                onChange={e => updateSmsConfig({...smsConfig, pdfNotes: e.target.value})} 
              />
            </div>
            
            <div style={{ padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Pro Tip:</div>
              Branding changes apply instantly to all generated Quotations, Invoices, and Payment Receipts.
            </div>
          </div>

          {/* System Maintenance */}
          <div className="glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                <RefreshCw size={22} color="var(--danger)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>System Maintenance</h2>
            </div>
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Synchronize your application with the Seynex Technology business defaults. This will replace your current local data with the items and configurations from your business profile.</p>

            <button className="btn btn-secondary" 
              style={{ width: '100%', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', height: '48px' }} 
              onClick={resetToSeynexDefaults}
            >
              <RefreshCw size={18} /> Reset to Seynex Defaults
            </button>
          </div>
        </div>

        {/* Right Column: Templates & Branding */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Automation Rules */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px' }}>
                <Zap size={22} color="#a855f7" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Automated Workflows</h2>
            </div>
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Configure the system's background scheduler for automatic outbound reminders.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ fontWeight: 600 }}>Unpaid Invoices</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }} 
                      checked={smsConfig.autoInvoiceEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoInvoiceEnabled: e.target.checked})} 
                    />
                  </label>
                </div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Days Before Due:</label>
                <input type="number" className="form-input" 
                  value={smsConfig.autoInvoiceDays !== undefined ? smsConfig.autoInvoiceDays : 3} 
                  onChange={e => updateSmsConfig({...smsConfig, autoInvoiceDays: Number(e.target.value)})} 
                  disabled={!smsConfig.autoInvoiceEnabled}
                />
              </div>

              <div className="form-group" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ fontWeight: 600 }}>Annual Renewals</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }} 
                      checked={smsConfig.autoRenewalEnabled || false} 
                      onChange={e => updateSmsConfig({...smsConfig, autoRenewalEnabled: e.target.checked})} 
                    />
                  </label>
                </div>
                <input type="text" className="form-input" 
                  placeholder="15, 7, 1"
                  value={smsConfig.autoRenewalDays !== undefined ? smsConfig.autoRenewalDays : '7'} 
                  onChange={e => updateSmsConfig({...smsConfig, autoRenewalDays: e.target.value})} 
                  disabled={!smsConfig.autoRenewalEnabled}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                <MessageSquare size={22} color="var(--warning)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Smart Templates</h2>
            </div>
            
            <p className="text-secondary" style={{ marginBottom: '24px', fontSize: '0.85rem' }}>Use bracket variables for dynamic injection.</p>

            <div className="flex flex-col gap-6">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Quote Delivery</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.quoteTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.quoteTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, quoteTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Receipt</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.thankYouTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.thankYouTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, thankYouTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Renewal Reminder</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.renewalTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.renewalTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, renewalTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice Due Reminder</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.invoiceReminderTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.invoiceReminderTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, invoiceReminderTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Birthday Greeting</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.birthdayTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={smsConfig.birthdayTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, birthdayTemplate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Debtor Collection Nudge</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{smsConfig.debtorNudgeTemplate?.length || 0}/160</span>
                </label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', borderColor: 'var(--danger)20' }}
                  placeholder="e.g. Hi {name}, you have an outstanding balance of LKR {remainingBalance} for {invoiceNumber}..."
                  value={smsConfig.debtorNudgeTemplate || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, debtorNudgeTemplate: e.target.value})} 
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Auto-Save Protocol</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Changes are automatically staged and persisted.</p>
            </div>
          </div>

          {/* Advanced SMS Protocols */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                <Settings2 size={22} color="var(--accent-primary)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Advanced SMS Protocols</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Global Header</label>
                <input type="text" className="form-input" 
                  value={smsConfig.smsHeader || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, smsHeader: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Global Footer</label>
                <input type="text" className="form-input" 
                  value={smsConfig.smsFooter || ''} 
                  onChange={e => updateSmsConfig({...smsConfig, smsFooter: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="glass-panel">
            <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                <ShieldCheck size={22} color="var(--danger)" />
              </div>
              <h2 className="h2" style={{ margin: 0 }}>Security & Access</h2>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Inactivity Session Timeout</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Minutes</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ paddingLeft: '40px' }}
                  min="1"
                  max="1440"
                  value={smsConfig.sessionTimeout || 5} 
                  onChange={e => updateSmsConfig({...smsConfig, sessionTimeout: parseInt(e.target.value) || 1})} 
                />
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automatically logout the user after the specified period of inactivity. This helps protect your data if you leave the dashboard open.
              </p>
            </div>
          </div>

          {/* TEAM & USER ROLES MANAGEMENT PANEL */}
          <div className="glass-panel">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                  <Users size={22} color="var(--accent-primary)" />
                </div>
                <div>
                  <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>Team & User Role Management</h2>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Create system accounts and define access privileges.</p>
                </div>
              </div>
              <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowAddUserModal(true)}>
                <UserPlus size={16} /> Create User
              </button>
            </div>

            <div className="table-container" style={{ background: 'transparent' }}>
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '10px 0', opacity: 0.7 }}>Team Member</th>
                    <th style={{ padding: '10px 0', opacity: 0.7 }}>Assigned Role</th>
                    <th style={{ padding: '10px 0', opacity: 0.7 }}>Status</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', opacity: 0.7 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                      <td style={{ padding: '12px 0' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{member.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                      </td>
                      <td>
                        <select 
                          className="form-input" 
                          style={{ height: '34px', fontSize: '0.78rem', padding: '2px 8px', width: '160px', background: 'var(--subtle-bg)' }}
                          value={member.role}
                          onChange={e => updateTeamMemberRole && updateTeamMemberRole(member.id, e.target.value)}
                        >
                          <option value="Admin">Admin (Full Access)</option>
                          <option value="Sales Representative">Sales Representative</option>
                          <option value="Accountant">Accountant (Read-Only)</option>
                        </select>
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                          <Check size={10} /> Active
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                            onClick={() => setResetPasswordUser(member)}
                            title="Reset Password"
                          >
                            <Key size={12} /> Reset Password
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.05)', border: 'none' }}
                            onClick={() => {
                              if (confirmAction) {
                                confirmAction({
                                  title: 'Revoke User Access',
                                  message: `Are you sure you want to remove user account for ${member.name}?`,
                                  confirmText: 'Remove Access',
                                  onConfirm: () => deleteTeamMember && deleteTeamMember(member.id)
                                });
                              } else if (window.confirm(`Are you sure you want to remove user account for ${member.name}?`)) {
                                deleteTeamMember && deleteTeamMember(member.id);
                              }
                            }}
                            title="Revoke User Access"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Variable Glossary */}
          <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                <Info size={18} color="var(--accent-primary)" />
              </div>
              <h2 className="h3" style={{ margin: 0 }}>Template Variable Glossary</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <VariableTag tag="{name}" desc="Recipient's Name" />
              <VariableTag tag="{gym}" desc="Client's Business Name" />
              <VariableTag tag="{companyName}" desc="Your Identity Name" />
              <VariableTag tag="{amount}" desc="Total Amount (LKR)" />
              <VariableTag tag="{date}" desc="Due Date" />
              <VariableTag tag="{invoiceNumber}" desc="Invoice #" />
              <VariableTag tag="{link}" desc="Online Document Link" />
            </div>
          </div>
        </div>

      </div>
      )}

      {showAddUserModal && (
        <AddUserModal 
          onClose={() => setShowAddUserModal(false)} 
          onSave={(user) => addTeamMember && addTeamMember(user)} 
          customRoles={customRoles}
        />
      )}

      {editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => setEditingUser(null)} 
          onSave={(data) => updateTeamMember && updateTeamMember(editingUser.id, data)} 
          customRoles={customRoles}
        />
      )}

      {showCreateRoleModal && (
        <CreateRoleModal 
          initialRole={editingRole}
          onClose={() => { setShowCreateRoleModal(false); setEditingRole(null); }} 
          onSave={(roleData) => {
            if (editingRole) {
              updateCustomRole && updateCustomRole(editingRole.id, roleData);
            } else {
              addCustomRole && addCustomRole(roleData);
            }
          }} 
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal 
          member={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onReset={(id, pass) => resetUserPassword && resetUserPassword(id, pass)}
        />
      )}
    </div>
  );
};

const AddUserModal = ({ onClose, onSave, customRoles = [] }) => {
  const [userForm, setUserForm] = useState({ 
    name: '', email: '', phone: '', department: 'Sales Division', role: 'Sales Representative', 
    status: 'Active', password: '', mustChangePassword: false, expiryDate: '' 
  });
  const [showPassword, setShowPassword] = useState(false);

  // Live Password Strength Meter
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: 'None', color: 'var(--text-muted)', width: '0%' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { label: 'Weak', color: 'var(--danger)', width: '33%' };
    if (score <= 4) return { label: 'Good', color: 'var(--warning)', width: '66%' };
    return { label: 'Enterprise Strong 🛡️', color: 'var(--success)', width: '100%' };
  };

  const strength = getPasswordStrength(userForm.password);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let generated = 'Sec#';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserForm(prev => ({ ...prev, password: generated }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header">
           <div className="flex items-center gap-3">
             <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
               <UserPlus size={20} color="var(--accent-primary)" />
             </div>
             <div>
               <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>Provision User Account</h2>
               <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Create system credentials & assign access rights</p>
             </div>
           </div>
           <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave(userForm);
          onClose();
        }} className="modal-body" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto', padding: '24px' }}>
          
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            1. Personal & Contact Profile
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Name *</label>
              <input required type="text" className="form-input" style={{ height: '42px' }} placeholder="e.g. Kasun Perera" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Email Address (Login ID) *</label>
              <input required type="email" className="form-input" style={{ height: '42px' }} placeholder="kasun@seynex.com" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Mobile Phone</label>
              <input type="text" className="form-input" style={{ height: '42px' }} placeholder="+94 77 123 4567" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Department / Branch</label>
              <select className="form-input" style={{ height: '42px' }} value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})}>
                <option value="Headquarters">Headquarters</option>
                <option value="Sales Division">Sales Division</option>
                <option value="Finance & Accounting">Finance & Accounting</option>
                <option value="Inventory & Operations">Inventory & Operations</option>
                <option value="Regional Support">Regional Support</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 12px 0' }}>
            2. System Access & Security Credentials
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Assign System Role *</label>
              <CustomSelect
                value={userForm.role}
                onChange={e => setUserForm({...userForm, role: e.target.value})}
                options={[
                  { value: 'Admin', label: '👑 Admin (Full Access)' },
                  { value: 'Sales Representative', label: '💼 Sales Representative' },
                  { value: 'Accountant', label: '📊 Accountant (Financials)' },
                  ...customRoles.filter(r => !['Admin', 'Sales Representative', 'Accountant'].includes(r.title)).map(r => ({
                    value: r.title,
                    label: `🛡️ ${r.title}`
                  }))
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Account Status</label>
              <CustomSelect
                value={userForm.status}
                onChange={e => setUserForm({...userForm, status: e.target.value})}
                options={[
                  { value: 'Active', label: '🟢 Active Account' },
                  { value: 'Pending', label: '🟡 Pending Verification' },
                  { value: 'Suspended', label: '🔴 Suspended Access' }
                ]}
              />
            </div>
          </div>

          <div className="form-group mb-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', margin: 0 }}>Initial Temporary Password *</label>
              <button 
                type="button" 
                onClick={generatePassword}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Auto-Generate
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                className="form-input" 
                style={{ height: '42px', paddingRight: '44px' }} 
                placeholder="••••••••" 
                value={userForm.password} 
                onChange={e => setUserForm({...userForm, password: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength Meter Bar */}
            {userForm.password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s' }}></div>
                </div>
                <div style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 700, marginTop: '4px' }}>
                  Strength: {strength.label}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-6" style={{ padding: '12px 14px', background: 'var(--subtle-bg)', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
            <input 
              type="checkbox" 
              id="mustChange"
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              checked={userForm.mustChangePassword}
              onChange={e => setUserForm({ ...userForm, mustChangePassword: e.target.checked })}
            />
            <label htmlFor="mustChange" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
              Require user to reset password upon first sign in
            </label>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '20px 0' }}></div>

          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>Provision Account</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSave, customRoles = [] }) => {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    department: user.department || 'General',
    role: user.role || 'Sales Representative',
    status: user.status || 'Active',
    expiryDate: user.expiryDate || ''
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header">
           <div className="flex items-center gap-3">
             <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
               <Edit3 size={20} color="var(--accent-primary)" />
             </div>
             <div>
               <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>Edit Account Details</h2>
               <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Update contact info, department and system permissions</p>
             </div>
           </div>
           <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
          onClose();
        }} className="modal-body" style={{ padding: '24px' }}>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Name</label>
              <input required type="text" className="form-input" style={{ height: '42px' }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Email Address</label>
              <input required type="email" className="form-input" style={{ height: '42px' }} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone Number</label>
              <input type="text" className="form-input" style={{ height: '42px' }} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Department / Branch</label>
              <select className="form-input" style={{ height: '42px' }} value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                <option value="Headquarters">Headquarters</option>
                <option value="Sales Division">Sales Division</option>
                <option value="Finance & Accounting">Finance & Accounting</option>
                <option value="Inventory & Operations">Inventory & Operations</option>
                <option value="Regional Support">Regional Support</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Assigned System Role</label>
              <select className="form-input" style={{ height: '42px', fontWeight: 700 }} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="Admin">👑 Admin (Full Access)</option>
                <option value="Sales Representative">💼 Sales Representative</option>
                <option value="Accountant">📊 Accountant (Read-Only)</option>
                {customRoles.filter(r => !['Admin', 'Sales Representative', 'Accountant'].includes(r.title)).map(r => (
                  <option key={r.id} value={r.title}>🛡️ {r.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Account Status</label>
              <select className="form-input" style={{ height: '42px' }} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="Active">🟢 Active Account</option>
                <option value="Pending">🟡 Pending Verification</option>
                <option value="Suspended">🔴 Suspended Access</option>
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '20px 0' }}></div>

          <div className="flex justify-end gap-3 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: '0.88rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '0.88rem' }}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateRoleModal = ({ initialRole = null, onClose, onSave }) => {
  const [roleTitle, setRoleTitle] = useState(initialRole?.title || '');
  const [roleDescription, setRoleDescription] = useState(initialRole?.description || '');
  const [permissions, setPermissions] = useState(initialRole?.permissions || ['manage_clients', 'manage_invoices']);

  const permissionCategories = [
    {
      category: '👥 Client & Lead Management',
      items: [
        { id: 'manage_clients', label: 'Manage Gym Clients, Leads & Tasks' }
      ]
    },
    {
      category: '📄 Sales & Invoices',
      items: [
        { id: 'manage_quotes', label: 'Manage Quotations & Proposals' },
        { id: 'manage_invoices', label: 'Manage Invoices & Payments' }
      ]
    },
    {
      category: '📦 Inventory & Stock',
      items: [
        { id: 'manage_inventory', label: 'Manage Inventory Stock & Pricing' }
      ]
    },
    {
      category: '📊 Financials & Accounting',
      items: [
        { id: 'view_financials', label: 'View Profit & Loss, Expenses, Assets & Debtors' }
      ]
    },
    {
      category: '📈 Reports & Analytics',
      items: [
        { id: 'view_reports', label: 'View Analytics & Financial Reports' }
      ]
    },
    {
      category: '🔑 System Administration & Audit',
      items: [
        { id: 'all', label: '👑 Master Full System Access (Admin)' },
        { id: 'manage_users', label: 'Manage Team Accounts & User Roles' },
        { id: 'view_logs', label: 'View System Audit Logs' }
      ]
    }
  ];

  const togglePerm = (permId) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: 0, overflow: 'hidden', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <div className="modal-header">
           <div className="flex items-center gap-3">
             <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px' }}>
               <Shield size={20} color="#a855f7" />
             </div>
             <div>
               <h2 className="h2" style={{ margin: 0, fontSize: '1.25rem' }}>{initialRole ? "Edit Role Definition" : "Create Custom User Role"}</h2>
               <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Configure role permissions & access matrix</p>
             </div>
           </div>
           <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!roleTitle.trim()) return;
          onSave({ title: roleTitle, description: roleDescription, permissions });
          onClose();
        }} className="modal-body" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto', padding: '24px' }}>
          
          <div className="form-group mb-4">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Role Title *</label>
            <input required type="text" className="form-input" style={{ height: '42px' }} placeholder="e.g. Regional Support Manager" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
          </div>

          <div className="form-group mb-6">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Role Description</label>
            <input type="text" className="form-input" style={{ height: '40px' }} placeholder="Brief overview of responsibilities..." value={roleDescription} onChange={e => setRoleDescription(e.target.value)} />
          </div>

          <div className="flex justify-between items-center mb-3">
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Select Privilege Matrix ({permissions.includes('all') ? 'All' : permissions.length} Granted):
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            {permissionCategories.map(cat => (
              <div key={cat.category} style={{ background: 'var(--subtle-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {cat.category}
                </div>
                <div className="flex flex-col gap-2">
                  {cat.items.map(p => (
                    <label key={p.id} className="flex items-center gap-3" style={{ cursor: 'pointer', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '16px', height: '16px', accentColor: '#a855f7' }}
                        checked={permissions.includes(p.id)}
                        onChange={() => togglePerm(p.id)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '24px 0' }}></div>

          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#a855f7', borderColor: '#a855f7' }}>
              Save Role Matrix
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VariableTag = ({ tag, desc }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '8px 12px', 
    background: 'rgba(255, 255, 255, 0.03)', 
    borderRadius: '8px',
    border: '1px solid var(--panel-border)'
  }}>
    <code style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>{tag}</code>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{desc}</span>
  </div>
);

const ResetPasswordModal = ({ member, onClose, onReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let generated = 'Sec#';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setError('');
  };

  const handleCopy = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    onReset(member.id, newPassword);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div className="flex items-center gap-3">
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
              <Key size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.2rem' }}>Reset User Password</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Admin credentials override</p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px' }}>
          <div style={{
            padding: '14px 16px', background: 'var(--subtle-bg)', borderRadius: '12px',
            border: '1px solid var(--subtle-border)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem'
            }}>
              {(member?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{member?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{member?.email} &bull; <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{member?.role}</span></div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '10px', color: '#fb7185', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <X size={14} /> {error}
            </div>
          )}

          <div className="form-group mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', margin: 0 }}>New Password</label>
              <button 
                type="button" 
                onClick={generatePassword}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Auto-Generate
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                className="form-input" 
                style={{ height: '42px', paddingRight: '76px' }} 
                placeholder="Enter new password (min 6 chars)" 
                value={newPassword} 
                onChange={e => { setNewPassword(e.target.value); setError(''); }} 
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                {newPassword && (
                  <button 
                    type="button" 
                    onClick={handleCopy}
                    style={{ background: 'transparent', border: 'none', padding: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title="Copy Password"
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', padding: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group mb-6">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Confirm New Password</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              className="form-input" 
              style={{ height: '42px' }} 
              placeholder="Re-enter new password" 
              value={confirmPassword} 
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }} 
            />
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '20px 0' }}></div>

          <div className="flex justify-end gap-3 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: '0.88rem' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
              <Key size={16} /> Save New Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
