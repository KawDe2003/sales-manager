import React, { useState, useContext, useMemo } from 'react';
import {
  Zap, Play, CheckCircle, Clock, AlertTriangle, MessageSquare,
  Calendar, FileText, Check, X, Shield, RefreshCw, Send,
  Cpu, ArrowRight, Eye, CheckCheck, Sliders, History,
  Sparkles, Bot, ChevronRight, UserCheck, HardDrive, BellRing, Key
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const Agents = () => {
  const {
    agentRules = [],
    agentQueue = [],
    agentLogs = [],
    updateAgentRule,
    approveQueueItem,
    dismissQueueItem,
    approveAllQueueItems,
    dismissAllQueueItems,
    runDailySweepManual,
    showNotification,
    customers = [],
    invoices = [],
    leads = [],
    inventory = []
  } = useContext(StoreContext) || {};

  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'rules' | 'logs'
  const [isSweeping, setIsSweeping] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Copilot Drawer State & Free AI Model Configuration
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [freeApiKey, setFreeApiKey] = useState(() => {
    try { return localStorage.getItem('seynex_free_ai_key') || ''; } catch { return ''; }
  });
  const [aiProvider, setAiProvider] = useState(() => {
    try { return localStorage.getItem('seynex_free_ai_provider') || 'gemini'; } catch { return 'gemini'; }
  });
  const [showAiKeyConfig, setShowAiKeyConfig] = useState(false);

  const [copilotMessages, setCopilotMessages] = useState([
    {
      role: 'assistant',
      text: `### 👋 Welcome to Seynex Executive AI Copilot\nI analyze your live business signals across **Overdue Debtors**, **Annual Cloud Subscriptions**, **CRM Pipeline**, and **Turnstile Hardware**.\n\nPowered by 100% Free AI models (Google Gemini 1.5 Flash, Groq Cloud LLaMA 3.3 70B, or our built-in on-premise engine). Click **"⚙️ Free AI Key"** at top right to enter a custom key or use the built-in free tier.`
    }
  ]);

  // Derived Statistics
  const pendingItems = useMemo(() => {
    return (agentQueue || []).filter(item => item.status === 'pending');
  }, [agentQueue]);

  const filteredLogs = useMemo(() => {
    if (selectedAgentFilter === 'all') return agentLogs || [];
    return (agentLogs || []).filter(log => log.agent_key === selectedAgentFilter);
  }, [agentLogs, selectedAgentFilter]);

  // Manual Trigger Handler
  const handleRunSweep = async () => {
    setIsSweeping(true);
    try {
      if (runDailySweepManual) {
        await runDailySweepManual();
      } else {
        const res = await fetch('/api/agents/daily-sweep', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          showNotification?.('Autonomous Cron Sweep completed successfully!', 'success');
        } else {
          showNotification?.(data.message || 'Daily sweep finished with warnings.', 'warning');
        }
      }
    } catch (err) {
      showNotification?.(`Daily sweep failed: ${err.message}`, 'error');
    } finally {
      setIsSweeping(false);
    }
  };

  // Copilot Query Handler
  const handleSendCopilotPrompt = async (promptToSend) => {
    const text = promptToSend || copilotPrompt;
    if (!text.trim()) return;

    setCopilotMessages(prev => [...prev, { role: 'user', text }]);
    setCopilotPrompt('');
    setCopilotLoading(true);

    try {
      // Calculate high-signal metrics for Copilot
      const totalOverdue = invoices.reduce((sum, inv) => {
        const balance = Number(inv.outstanding_balance ?? (Number(inv.total || 0) - Number(inv.amount_paid || 0)));
        return (inv.status !== 'Paid' && balance > 0) ? sum + balance : sum;
      }, 0);

      const today = new Date();
      const renewingCustomers = customers.filter(c => {
        if (!c.renewalDate && !c.renewal_date) return false;
        const d = new Date(c.renewalDate || c.renewal_date);
        const diff = Math.round((d - today) / (1000 * 3600 * 24));
        return diff >= 0 && diff <= 30;
      });

      const totalRenewalArr = renewingCustomers.reduce((sum, c) => sum + Number(c.annualFee || c.annual_fee || 0), 0);

      const res = await fetch('/api/agents/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          customApiKey: freeApiKey,
          customProvider: aiProvider,
          context: {
            debtors: invoices.filter(i => i.status !== 'Paid' && (i.outstanding_balance > 0 || (i.total - (i.amount_paid || 0)) > 0)).slice(0, 10),
            renewals: renewingCustomers.slice(0, 10),
            leads: leads.filter(l => (l.stage || l.status || '').toLowerCase() !== 'won').slice(0, 10),
            inventory: inventory.filter(i => (i.stock || 0) <= (i.minStock || 5)).slice(0, 10),
            totalOverdueAmount: totalOverdue,
            totalRenewalArr: totalRenewalArr,
            activeClientsCount: customers.length
          }
        })
      });

      const data = await res.json();
      if (data.ok && data.briefing) {
        setCopilotMessages(prev => [...prev, { role: 'assistant', text: data.briefing, source: data.source }]);
      } else {
        setCopilotMessages(prev => [...prev, {
          role: 'assistant',
          text: `⚠️ Copilot encountered an operational issue: ${data.message || 'Unable to generate strategic insight.'}`
        }]);
      }
    } catch (e) {
      setCopilotMessages(prev => [...prev, {
        role: 'assistant',
        text: `⚠️ Network error: Could not reach AI Copilot endpoint (${e.message}).`
      }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const getAgentBadge = (key) => {
    switch (key) {
      case 'renewal_agent':
        return { label: 'Renewal Agent', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'debtors_agent':
        return { label: 'Debtors Agent', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'crm_agent':
        return { label: 'CRM Watchdog', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)' };
      case 'ops_watchdog':
        return { label: 'Ops Watchdog', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' };
      default:
        return { label: 'Agent', color: 'var(--text-secondary)', bg: 'var(--subtle-bg)', border: 'var(--subtle-border)' };
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'send_sms':
        return { label: 'QuickSend SMS', icon: <MessageSquare size={13} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'create_task':
        return { label: 'CRM Task', icon: <Calendar size={13} />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
      case 'create_invoice':
        return { label: 'Draft Invoice', icon: <FileText size={13} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'alert':
        return { label: 'Ops Alert', icon: <AlertTriangle size={13} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
      default:
        return { label: action, icon: <Zap size={13} />, color: 'var(--text-primary)', bg: 'var(--subtle-bg)' };
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* ===== PAGE HEADER ===== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}>
              <Zap size={20} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              AI Autonomous Agents & Automation Suite
            </h1>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
            Scheduled Vercel Cron sweep, automated QuickSend SMS recovery, CRM inactivity follow-ups & ops monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* AI Copilot Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} color="#6366f1" />
            <span>AI Copilot</span>
          </button>

          {/* Manual Run Sweep Button */}
          <button
            type="button"
            disabled={isSweeping}
            onClick={handleRunSweep}
            className="btn btn-primary"
            style={{
              height: '38px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isSweeping ? 'not-allowed' : 'pointer',
              opacity: isSweeping ? 0.7 : 1
            }}
          >
            <RefreshCw size={15} className={isSweeping ? 'animate-spin' : ''} />
            <span>{isSweeping ? 'Sweeping System...' : '⚡ Run Daily Sweep Now'}</span>
          </button>
        </div>
      </div>

      {/* ===== OVERVIEW METRIC PILLS ===== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Pending Queue Actions
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: pendingItems.length > 0 ? '#f59e0b' : '#10b981' }}>
              {pendingItems.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {pendingItems.length > 0 ? 'Awaiting human authorization' : 'All approved & cleared'}
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Autonomous Agents
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {agentRules.filter(r => r.enabled).length} / {agentRules.length || 4}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Active in cron schedule
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Scheduled Cron Time
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              08:30 AM SLT
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Daily ("0 3 * * *" UTC)
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Execution Logs & Audit
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {(agentLogs || []).length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Unique milestones tracked
            </span>
          </div>
        </div>
      </div>

      {/* ===== TAB SWITCHER ===== */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--subtle-border)',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '10px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'approvals' ? 700 : 500,
            color: activeTab === 'approvals' ? 'var(--accent-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'approvals' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <BellRing size={16} />
          <span>Pending Approvals</span>
          {pendingItems.length > 0 && (
            <span style={{
              background: '#f59e0b', color: '#fff', fontSize: '0.68rem',
              fontWeight: 800, padding: '2px 7px', borderRadius: '10px'
            }}>
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            color: activeTab === 'rules' ? 'var(--accent-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'rules' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Sliders size={16} />
          <span>Agent Rules & Modes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'logs' ? 700 : 500,
            color: activeTab === 'logs' ? 'var(--accent-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <History size={16} />
          <span>Execution History & Audit</span>
        </button>
      </div>

      {/* ===== TAB CONTENT: PENDING APPROVALS QUEUE ===== */}
      {activeTab === 'approvals' && (
        <div>
          {pendingItems.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px 18px',
              background: 'var(--subtle-bg)',
              borderRadius: '10px',
              border: '1px solid var(--subtle-border)'
            }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Showing {pendingItems.length} proposed action(s) generated by autonomous agents.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => approveAllQueueItems && approveAllQueueItems()}
                  style={{
                    height: '32px', padding: '0 12px', fontSize: '0.78rem', fontWeight: 700,
                    borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Approve All</span>
                </button>
                <button
                  type="button"
                  onClick={() => dismissAllQueueItems && dismissAllQueueItems()}
                  style={{
                    height: '32px', padding: '0 12px', fontSize: '0.78rem', fontWeight: 700,
                    borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <X size={14} />
                  <span>Dismiss All</span>
                </button>
              </div>
            </div>
          )}

          {pendingItems.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '14px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                color: '#10b981'
              }}>
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Approval Queue is Empty
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                All agent tasks are caught up. When agents discover overdue debtors, upcoming renewals, or untouched leads, action cards will appear here for 1-click execution.
              </p>
              <button
                type="button"
                onClick={handleRunSweep}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', padding: '8px 16px', fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} /> Trigger Sweep Check Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingItems.map(item => {
                const agentBadge = getAgentBadge(item.agent_key);
                const actionBadge = getActionBadge(item.proposed_action);
                const payload = item.payload_json || {};

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${agentBadge.color}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                          color: agentBadge.color, background: agentBadge.bg, border: `1px solid ${agentBadge.border}`
                        }}>
                          {agentBadge.label}
                        </span>

                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                          color: actionBadge.color, background: actionBadge.bg, display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          {actionBadge.icon}
                          <span>{actionBadge.label}</span>
                        </span>

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        {item.summary}
                      </p>

                      {/* Payload SMS message preview box */}
                      {payload.message && (
                        <div style={{
                          padding: '10px 14px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '8px',
                          border: '1px solid var(--subtle-border)',
                          fontSize: '0.8rem',
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          lineHeight: 1.45,
                          maxWidth: '720px',
                          wordBreak: 'break-word'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                            To: {payload.phone || 'Client Phone'} (SMS Preview)
                          </div>
                          {payload.message}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => approveQueueItem && approveQueueItem(item.id)}
                        className="btn btn-primary"
                        style={{
                          height: '36px',
                          padding: '0 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={15} />
                        <span>Approve & Execute</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => dismissQueueItem && dismissQueueItem(item.id)}
                        className="btn btn-secondary"
                        style={{
                          height: '36px',
                          padding: '0 12px',
                          fontSize: '0.8rem',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <X size={15} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB CONTENT: AGENT RULES & MODES ===== */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {(agentRules || []).map(rule => {
            const badge = getAgentBadge(rule.agent_key);
            const isAuto = rule.mode === 'auto';

            return (
              <div
                key={rule.agent_key}
                className="glass-panel"
                style={{
                  padding: '22px',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: badge.bg, border: `1px solid ${badge.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: badge.color
                    }}>
                      <Bot size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                        {rule.name}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Key: {rule.agent_key}
                      </span>
                    </div>
                  </div>

                  {/* Enable/Disable Toggle Switch */}
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => updateAgentRule && updateAgentRule(rule.agent_key, { enabled: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rule.enabled ? '#10b981' : 'var(--text-muted)' }}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  {rule.description}
                </p>

                {/* Mode Selector: Approval Queue vs Auto-Run */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--subtle-bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--subtle-border)'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Execution Policy Mode
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateAgentRule && updateAgentRule(rule.agent_key, { mode: 'approval_queue' })}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: !isAuto ? '1px solid var(--accent-primary)' : '1px solid var(--subtle-border)',
                        background: !isAuto ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                        color: !isAuto ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <UserCheck size={14} />
                      <span>Approval Queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateAgentRule && updateAgentRule(rule.agent_key, { mode: 'auto' })}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isAuto ? '1px solid #10b981' : '1px solid var(--subtle-border)',
                        background: isAuto ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: isAuto ? '#10b981' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Zap size={14} />
                      <span>Autonomous Auto-Run</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.35 }}>
                    {isAuto
                      ? '⚡ Zero-touch mode: Actions (SMS/Tasks) are dispatched immediately during daily sweep.'
                      : '🛡️ Human-in-the-loop: Discovered items require 1-click review in the Approval Queue.'}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--subtle-border)',
                  paddingTop: '12px'
                }}>
                  <span>Schedule: <strong>08:30 AM Daily</strong></span>
                  <span>Last Run: {rule.last_run_at ? new Date(rule.last_run_at).toLocaleDateString() : 'Pending sweep'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== TAB CONTENT: EXECUTION HISTORY & AUDIT TRAIL ===== */}
      {activeTab === 'logs' && (
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Execution History & Milestone Deduplication Audit
            </h3>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'renewal_agent', 'debtors_agent', 'crm_agent', 'ops_watchdog'].map(filterKey => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setSelectedAgentFilter(filterKey)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedAgentFilter === filterKey ? 'var(--accent-primary)' : 'var(--subtle-bg)',
                    color: selectedAgentFilter === filterKey ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--subtle-border)'
                  }}
                >
                  {filterKey === 'all' ? 'All Agents' : getAgentBadge(filterKey).label}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              No execution records recorded for this filter yet. Run a daily sweep to generate activity logs.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--subtle-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Timestamp</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Agent</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Entity ID</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Milestone Key</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.slice(0, 50).map(log => {
                    const badge = getAgentBadge(log.agent_key);
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {log.executed_at ? new Date(log.executed_at).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            color: badge.color, background: badge.bg
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {String(log.entity_id).substring(0, 16)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.milestone_key}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            background: log.status === 'executed' ? 'rgba(16, 185, 129, 0.15)' : log.status === 'queued' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.status === 'executed' ? '#10b981' : log.status === 'queued' ? '#f59e0b' : '#ef4444'
                          }}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== SLIDE-OVER AI COPILOT DRAWER ===== */}
      {isCopilotOpen && (
        <>
          <div
            onClick={() => setIsCopilotOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)',
              zIndex: 99999
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(500px, 100vw)',
              background: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--subtle-border)',
              boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.5)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out'
            }}
          >
            {/* Copilot Drawer Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              borderBottom: '1px solid var(--subtle-border)',
              background: 'var(--subtle-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Executive AI Copilot
                  </h3>
                  <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                    Powered by Gemini 1.5 Flash
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAiKeyConfig(!showAiKeyConfig)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: freeApiKey ? 'rgba(16, 185, 129, 0.12)' : 'var(--subtle-bg)',
                    border: freeApiKey ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--subtle-border)',
                    color: freeApiKey ? '#10b981' : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Configure 100% Free AI Model Key"
                >
                  <Key size={13} />
                  <span>{freeApiKey ? 'Free AI Connected' : 'Free AI Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCopilotOpen(false)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '6px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Collapsible Free AI Key Configuration Panel */}
            {showAiKeyConfig && (
              <div style={{
                padding: '14px 18px',
                background: 'rgba(99, 102, 241, 0.06)',
                borderBottom: '1px solid var(--subtle-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Free AI Provider Configuration
                  </span>
                  <a
                    href={aiProvider === 'groq' ? 'https://console.groq.com/keys' : 'https://aistudio.google.com/app/apikey'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Get Free Key →
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'gemini', label: 'Google Gemini (Free)' },
                    { id: 'groq', label: 'Groq LLaMA 3.3 (Free)' },
                    { id: 'builtin', label: 'Built-in Engine (No Key)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setAiProvider(p.id);
                        try { localStorage.setItem('seynex_free_ai_provider', p.id); } catch(e) {}
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: aiProvider === p.id ? 'var(--accent-primary)' : 'var(--subtle-bg)',
                        color: aiProvider === p.id ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--subtle-border)'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {aiProvider !== 'builtin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        placeholder={aiProvider === 'groq' ? 'Paste Free Groq Key (gsk_...)' : 'Paste Free Gemini Key (AIzaSy...)'}
                        value={freeApiKey}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setFreeApiKey(val);
                          try { localStorage.setItem('seynex_free_ai_key', val); } catch(e) {}
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          border: '1px solid var(--subtle-border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try { localStorage.setItem('seynex_free_ai_key', freeApiKey); } catch(e) {}
                          setShowAiKeyConfig(false);
                          showNotification?.('Free AI API Key saved in browser!', 'success');
                        }}
                        className="btn btn-primary"
                        style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Save
                      </button>
                    </div>

                    {/* Key Format Helper / Validation */}
                    {aiProvider === 'gemini' && !freeApiKey && (
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
                        💡 Tip: In <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Google AI Studio</a>, click <strong>Create API Key</strong> → select <em>"Create key in new project"</em> to ensure the Generative Language API is pre-enabled.
                      </div>
                    )}
                    {aiProvider === 'groq' && !freeApiKey && (
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
                        ⚡ Groq provides free LLaMA 3.3 70B inference (keys start with <code>gsk_...</code>) at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>console.groq.com/keys</a>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Prompt Suggestions */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--subtle-border)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              {[
                'Morning Executive Briefing',
                'Prioritize Overdue Debtors',
                '30-Day Renewal Strategy',
                'Hardware Safety Check'
              ].map(promptText => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => handleSendCopilotPrompt(promptText)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--subtle-border)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Conversation Flow */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {copilotMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--subtle-bg)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--subtle-border)',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>
              ))}

              {copilotLoading && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--subtle-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)'
                }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing live metrics & generating executive briefing...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div style={{
              padding: '14px 18px',
              borderTop: '1px solid var(--subtle-border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                placeholder="Ask AI Copilot for advice or cash recovery strategy..."
                value={copilotPrompt}
                onChange={(e) => setCopilotPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendCopilotPrompt();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--subtle-border)',
                  background: 'var(--subtle-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                disabled={copilotLoading || !copilotPrompt.trim()}
                onClick={() => handleSendCopilotPrompt()}
                className="btn btn-primary"
                style={{
                  height: '40px',
                  width: '40px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  opacity: (!copilotPrompt.trim() || copilotLoading) ? 0.6 : 1
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Agents;
