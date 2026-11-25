import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot, Play, Pause, RefreshCw, Plus, Trash2, Edit2, CheckCircle2,
  AlertTriangle, XCircle, Clock, Activity, Server, ShieldCheck,
  Terminal, Bell, Cloud, Receipt, Users, Globe, Copy, X, Zap
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { getSupabaseClient } from '../lib/supabase';
import CustomSelect from '../components/CustomSelect';

const AGENT_TYPE_META = {
  overdue_reminder: {
    label: 'Overdue Invoice & Reminder',
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.14)'
  },
  cloud_push_sync: {
    label: 'Cloud Push 24/7 Health Monitor',
    icon: Cloud,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)'
  },
  auto_renewal: {
    label: 'Auto-Renewal & Invoice Drafter',
    icon: Receipt,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.14)'
  },
  lead_summary: {
    label: 'Lead Follow-Up & Daily Briefing',
    icon: Users,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.14)'
  },
  custom_webhook: {
    label: 'Custom 24/7 Webhook Agent',
    icon: Globe,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.14)'
  }
};

const CRON_PRESETS = [
  { value: '*/15 * * * *', label: 'Every 15 Minutes (24/7)' },
  { value: '0 * * * *', label: 'Every Hour (24/7)' },
  { value: '0 8 * * *', label: 'Daily at 8:00 AM' },
  { value: '0 9 * * *', label: 'Daily at 9:00 AM' },
  { value: '0 18 * * *', label: 'Daily at 6:00 PM' },
  { value: '0 9 * * 1-5', label: 'Weekdays at 9:00 AM' }
];

const MIGRATION_SQL_SNIPPET = `-- Run in Supabase SQL Editor to enable 24/7 Automation Agents
-- Full file: supabase/migrations/20261125000000_automation_agents.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.automation_agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  agent_type text NOT NULL,
  description text DEFAULT '',
  schedule_cron text NOT NULL DEFAULT '*/15 * * * *',
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_status text DEFAULT 'idle',
  last_summary text DEFAULT 'Awaiting first execution',
  total_runs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.automation_agents(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  agent_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  trigger_source text NOT NULL DEFAULT 'vercel_cron',
  items_processed integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on automation_agents" ON public.automation_agents;
CREATE POLICY "Full access on automation_agents" ON public.automation_agents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Full access on automation_logs" ON public.automation_logs;
CREATE POLICY "Full access on automation_logs" ON public.automation_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

export default function AutomationAgents() {
  const {
    activeBusinessId = 'biz_main',
    customers = [],
    invoices = [],
    leads = [],
    showNotification,
    confirmAction
  } = useContext(StoreContext) || {};

  const supabase = useMemo(() => getSupabaseClient(activeBusinessId), [activeBusinessId]);

  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [logAgentFilter, setLogAgentFilter] = useState('ALL');

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState({
    name: '',
    agent_type: 'overdue_reminder',
    description: '',
    schedule_cron: '*/15 * * * *',
    is_enabled: true,
    graceDays: 1,
    sendSms: false,
    alertOnOffline: true,
    daysBeforeRenewal: 7,
    autoCreateInvoice: true,
    staleDays: 3,
    adminPhone: '',
    webhookUrl: ''
  });

  const notify = (msg, type = 'info') => {
    if (showNotification) showNotification(msg, type);
  };

  const loadAutomationData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: agentRows, error: aErr }, { data: logRows, error: lErr }] = await Promise.all([
        supabase.from('automation_agents').select('*').order('created_at', { ascending: true }),
        supabase.from('automation_logs').select('*').order('executed_at', { ascending: false }).limit(60)
      ]);

      if (aErr && (aErr.code === '42P01' || aErr.message?.includes('does not exist'))) {
        setTableMissing(true);
        setAgents([]);
        setLogs([]);
      } else {
        setTableMissing(false);
        setAgents(Array.isArray(agentRows) ? agentRows : []);
        setLogs(Array.isArray(logRows) ? logRows : []);
        if (lErr) console.warn('Logs fetch warning:', lErr.message);
      }
    } catch (err) {
      console.warn('Automation load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomationData();
  }, [activeBusinessId]);

  const openCreateModal = () => {
    setEditingAgent(null);
    setForm({
      name: '',
      agent_type: 'overdue_reminder',
      description: '',
      schedule_cron: '*/15 * * * *',
      is_enabled: true,
      graceDays: 1,
      sendSms: false,
      alertOnOffline: true,
      daysBeforeRenewal: 7,
      autoCreateInvoice: true,
      staleDays: 3,
      adminPhone: '',
      webhookUrl: ''
    });
    setShowModal(true);
  };

  const openEditModal = (agent) => {
    setEditingAgent(agent);
    const cfg = agent.config || {};
    setForm({
      name: agent.name || '',
      agent_type: agent.agent_type || 'overdue_reminder',
      description: agent.description || '',
      schedule_cron: agent.schedule_cron || '*/15 * * * *',
      is_enabled: agent.is_enabled !== false,
      graceDays: cfg.graceDays ?? 1,
      sendSms: Boolean(cfg.sendSms),
      alertOnOffline: cfg.alertOnOffline !== false,
      daysBeforeRenewal: cfg.daysBeforeRenewal ?? 7,
      autoCreateInvoice: cfg.autoCreateInvoice !== false,
      staleDays: cfg.staleDays ?? 3,
      adminPhone: cfg.adminPhone || '',
      webhookUrl: cfg.webhookUrl || ''
    });
    setShowModal(true);
  };

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify('Agent name is required.', 'warning');
      return;
    }

    const configPayload = {};
    if (form.agent_type === 'overdue_reminder') {
      configPayload.graceDays = Number(form.graceDays) || 1;
      configPayload.sendSms = Boolean(form.sendSms);
    } else if (form.agent_type === 'cloud_push_sync') {
      configPayload.alertOnOffline = Boolean(form.alertOnOffline);
    } else if (form.agent_type === 'auto_renewal') {
      configPayload.daysBeforeRenewal = Number(form.daysBeforeRenewal) || 7;
      configPayload.autoCreateInvoice = Boolean(form.autoCreateInvoice);
    } else if (form.agent_type === 'lead_summary') {
      configPayload.staleDays = Number(form.staleDays) || 3;
      configPayload.adminPhone = form.adminPhone.trim();
    } else if (form.agent_type === 'custom_webhook') {
      configPayload.webhookUrl = form.webhookUrl.trim();
    }

    const record = {
      name: form.name.trim(),
      agent_type: form.agent_type,
      description: form.description.trim(),
      schedule_cron: form.schedule_cron.trim() || '*/15 * * * *',
      is_enabled: Boolean(form.is_enabled),
      config: configPayload,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingAgent) {
        const { error } = await supabase.from('automation_agents').update(record).eq('id', editingAgent.id);
        if (error) throw error;
        notify(`Updated 24/7 agent "${record.name}".`, 'success');
      } else {
        const { error } = await supabase.from('automation_agents').insert({
          ...record,
          last_status: 'idle',
          last_summary: 'Created and scheduled for 24/7 execution'
        });
        if (error) throw error;
        notify(`Created 24/7 agent "${record.name}".`, 'success');
      }
      setShowModal(false);
      loadAutomationData();
    } catch (err) {
      notify(`Failed to save agent: ${err.message}`, 'error');
    }
  };

  const handleToggleAgent = async (agent) => {
    const nextEnabled = !agent.is_enabled;
    try {
      const { error } = await supabase
        .from('automation_agents')
        .update({ is_enabled: nextEnabled, updated_at: new Date().toISOString() })
        .eq('id', agent.id);
      if (error) throw error;
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_enabled: nextEnabled } : a));
      notify(`${agent.name} ${nextEnabled ? 'activated for 24/7 execution' : 'paused'}.`, 'info');
    } catch (err) {
      notify(`Failed to update agent status: ${err.message}`, 'error');
    }
  };

  const handleDeleteAgent = (agent) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase.from('automation_agents').delete().eq('id', agent.id);
        if (error) throw error;
        notify(`Deleted agent "${agent.name}".`, 'info');
        loadAutomationData();
      } catch (err) {
        notify(`Delete failed: ${err.message}`, 'error');
      }
    };

    if (confirmAction) {
      confirmAction({
        title: 'Delete 24/7 Automation Agent',
        message: `Are you sure you want to permanently delete "${agent.name}" and its execution history?`,
        onConfirm: doDelete
      });
    } else if (window.confirm(`Delete "${agent.name}"?`)) {
      doDelete();
    }
  };

  // Fallback local evaluator when running in local Vite dev without serverless cron
  const executeLocalFallback = async (agent) => {
    const startMs = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    let status = 'success';
    let itemsProcessed = 0;
    let summary = 'Executed check';

    if (agent.agent_type === 'overdue_reminder') {
      const graceDays = Number(agent.config?.graceDays ?? 1);
      const cutoff = new Date(Date.now() - graceDays * 86400000).toISOString().slice(0, 10);
      const overdue = invoices.filter(i => !['Paid', 'Void', 'Cancelled'].includes(i.status) && i.dueDate && i.dueDate < cutoff && Number(i.balance ?? i.total ?? 0) > 0);
      itemsProcessed = overdue.length;
      status = overdue.length > 0 ? 'warning' : 'success';
      summary = overdue.length > 0
        ? `Identified ${overdue.length} overdue invoice(s) past ${graceDays}d grace period.`
        : 'All active invoices are within payment due dates.';
    } else if (agent.agent_type === 'cloud_push_sync') {
      const activePush = customers.filter(c => c.cloudPushEnabled !== false && Boolean(c.cloudPushAcc));
      itemsProcessed = activePush.length;
      summary = `Verified ${activePush.length} Cloud Push client profile(s) configured for 24/7 monitoring.`;
    } else if (agent.agent_type === 'auto_renewal') {
      const daysAhead = Number(agent.config?.daysBeforeRenewal ?? 7);
      const limitStr = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
      const upcoming = customers.filter(c => c.billingType === 'Annual' && c.renewalDate && c.renewalDate >= todayStr && c.renewalDate <= limitStr);
      itemsProcessed = upcoming.length;
      summary = `Scanned ${customers.length} client(s): ${upcoming.length} annual renewal(s) due within ${daysAhead} days.`;
    } else if (agent.agent_type === 'lead_summary') {
      const openLeads = leads.filter(l => !['Won', 'Lost', 'Closed'].includes(l.status));
      const outstanding = invoices.filter(i => !['Paid', 'Void', 'Cancelled'].includes(i.status)).reduce((s, i) => s + Number(i.balance ?? i.total ?? 0), 0);
      itemsProcessed = openLeads.length;
      summary = `Pipeline Briefing: ${openLeads.length} open lead(s), LKR ${outstanding.toLocaleString()} outstanding receivables.`;
    } else {
      summary = 'Custom webhook check completed (requires server deployment for outbound POST).';
    }

    const nowIso = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    await supabase.from('automation_logs').insert({
      agent_id: agent.id,
      agent_name: agent.name,
      agent_type: agent.agent_type,
      status,
      trigger_source: 'manual_ui',
      items_processed: itemsProcessed,
      summary,
      duration_ms: durationMs,
      executed_at: nowIso
    });

    await supabase.from('automation_agents').update({
      last_run_at: nowIso,
      last_status: status,
      last_summary: summary,
      total_runs: (agent.total_runs || 0) + 1,
      updated_at: nowIso
    }).eq('id', agent.id);
  };

  const getAuthHeaders = async () => {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const { data } = await supabase?.auth?.getSession?.() || {};
      const token = data?.session?.access_token;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {}
    return headers;
  };

  const handleRunAgentNow = async (agent) => {
    setRunningAgentId(agent.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/cron/run-agents?agentId=${encodeURIComponent(agent.id)}&manual=1`, {
        method: 'POST',
        headers
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const r = data.results?.[0];
        notify(r?.summary || `Agent "${agent.name}" executed successfully.`, r?.status === 'error' ? 'error' : 'success');
      } else {
        await executeLocalFallback(agent);
        notify(`Agent "${agent.name}" executed and logged.`, 'success');
      }
      await loadAutomationData();
    } catch {
      await executeLocalFallback(agent);
      notify(`Agent "${agent.name}" executed and logged.`, 'success');
      await loadAutomationData();
    } finally {
      setRunningAgentId(null);
    }
  };

  const handleRunAllNow = async () => {
    const enabled = agents.filter(a => a.is_enabled);
    if (enabled.length === 0) {
      notify('No enabled 24/7 agents to run.', 'warning');
      return;
    }
    setRunningAll(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/cron/run-agents?manual=1', { method: 'POST', headers });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        notify(`Executed ${data.executedCount || enabled.length} active 24/7 agent(s).`, 'success');
      } else {
        for (const ag of enabled) {
          await executeLocalFallback(ag);
        }
        notify(`Executed ${enabled.length} active agent(s).`, 'success');
      }
      await loadAutomationData();
    } catch {
      for (const ag of enabled) {
        await executeLocalFallback(ag);
      }
      notify(`Executed ${enabled.length} active agent(s).`, 'success');
      await loadAutomationData();
    } finally {
      setRunningAll(false);
    }
  };

  const handleSeedDefaultAgents = async () => {
    const defaults = [
      {
        name: 'Overdue Invoice & Payment Reminder Agent',
        agent_type: 'overdue_reminder',
        description: 'Continuously scans unpaid invoices past due date, flags overdue accounts, alerts staff, and optionally sends payment reminder SMS.',
        schedule_cron: '0 9 * * *',
        is_enabled: true,
        config: { graceDays: 1, sendSms: false },
        last_status: 'idle',
        last_summary: 'Awaiting first 24/7 execution'
      },
      {
        name: 'Cloud Push Biometric Sync & Health Monitor',
        agent_type: 'cloud_push_sync',
        description: 'Monitors eTechno Push biometric terminals 24/7, checks live gateway connectivity, and alerts if a client device goes offline.',
        schedule_cron: '*/15 * * * *',
        is_enabled: true,
        config: { alertOnOffline: true },
        last_status: 'idle',
        last_summary: 'Awaiting first 24/7 execution'
      },
      {
        name: 'Auto-Renewal & Recurring Invoice Agent',
        agent_type: 'auto_renewal',
        description: 'Checks upcoming annual client renewals and automatically drafts renewal invoices before service expiration.',
        schedule_cron: '0 8 * * *',
        is_enabled: true,
        config: { daysBeforeRenewal: 7, autoCreateInvoice: true },
        last_status: 'idle',
        last_summary: 'Awaiting first 24/7 execution'
      },
      {
        name: 'Lead Follow-Up & Executive Summary Agent',
        agent_type: 'lead_summary',
        description: 'Detects stale leads needing follow-up and compiles a daily revenue, debtors, and pipeline briefing.',
        schedule_cron: '0 18 * * *',
        is_enabled: true,
        config: { staleDays: 3, adminPhone: '' },
        last_status: 'idle',
        last_summary: 'Awaiting first 24/7 execution'
      }
    ];
    try {
      const { error } = await supabase.from('automation_agents').insert(defaults);
      if (error) throw error;
      notify('Provisioned 4 default 24/7 automation agents!', 'success');
      loadAutomationData();
    } catch (err) {
      notify(`Failed to seed agents: ${err.message}`, 'error');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (logStatusFilter !== 'ALL' && l.status !== logStatusFilter) return false;
      if (logAgentFilter !== 'ALL' && l.agent_id !== logAgentFilter) return false;
      return true;
    });
  }, [logs, logStatusFilter, logAgentFilter]);

  const activeCount = agents.filter(a => a.is_enabled).length;
  const totalRuns = agents.reduce((sum, a) => sum + (a.total_runs || 0), 0);
  const lastHeartbeat = logs[0]?.executed_at ? new Date(logs[0].executed_at).toLocaleString() : 'Not run yet';

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              24/7 Automation Agents
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
              Cloud-scheduled background agents powered by Vercel Cron (`/api/cron/run-agents`) &amp; Supabase — runs 24/7 even when browsers are closed.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRunAllNow}
            disabled={runningAll || tableMissing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {runningAll ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} style={{ color: 'var(--accent)' }} />}
            <span>Run All Active Now</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
            disabled={tableMissing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Create 24/7 Agent</span>
          </button>
        </div>
      </div>

      {/* Missing SQL Table Setup Banner */}
      {tableMissing && (
        <div className="card" style={{
          padding: '20px 24px', borderRadius: '16px', marginBottom: '24px',
          border: '1px solid rgba(245, 158, 11, 0.45)', background: 'rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>One-Time Supabase Table Setup Required</span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.5, maxWidth: '760px' }}>
                Run the migration file <code>supabase/migrations/20261125000000_automation_agents.sql</code> in your Supabase SQL Editor so 24/7 agents and execution logs persist in the cloud database.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(MIGRATION_SQL_SNIPPET);
                  notify('Copied SQL setup script to clipboard!', 'success');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} /> Copy Setup SQL
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadAutomationData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> Re-Check DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active 24/7 Agents</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            {activeCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ {agents.length}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cloud Cron Cadence</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} style={{ color: 'var(--accent)' }} />
            <span>Daily Cloud Cron (24/7)</span>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Automated Runs</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent)', marginTop: '6px' }}>{totalRuns}</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Heartbeat</div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', marginTop: '10px' }}>{lastHeartbeat}</div>
        </div>
      </div>

      {/* Empty Agents State (when table exists but empty) */}
      {!loading && !tableMissing && agents.length === 0 && (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', borderRadius: '16px', marginBottom: '24px', border: '1px dashed var(--border)' }}>
          <Bot size={36} style={{ margin: '0 auto 12px', color: 'var(--accent)', opacity: 0.85 }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>No 24/7 Agents Configured Yet</h3>
          <p style={{ margin: '0 auto 18px', maxWidth: '520px', fontSize: '0.86rem', color: 'var(--muted)' }}>
            Provision the 4 core automated agents (Overdue Reminders, Cloud Push Monitor, Auto-Renewals, and Daily Executive Briefing) in one click, or create a custom agent.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleSeedDefaultAgents}>
            Provision 4 Core 24/7 Agents
          </button>
        </div>
      )}

      {/* Agent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {agents.map(agent => {
          const meta = AGENT_TYPE_META[agent.agent_type] || AGENT_TYPE_META.custom_webhook;
          const IconComp = meta.icon;
          const isRunning = runningAgentId === agent.id;

          return (
            <div key={agent.id} className="card" style={{
              padding: '20px', borderRadius: '16px', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
              opacity: agent.is_enabled ? 1 : 0.78
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>{agent.name}</h3>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAgent(agent)}
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
                      background: agent.is_enabled ? 'rgba(16, 185, 129, 0.14)' : 'var(--surface-2)',
                      color: agent.is_enabled ? '#10b981' : 'var(--muted)',
                      border: `1px solid ${agent.is_enabled ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)'}`,
                      display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                    }}
                    title={agent.is_enabled ? 'Click to pause 24/7 execution' : 'Click to activate 24/7 execution'}
                  >
                    {agent.is_enabled ? <Play size={11} /> : <Pause size={11} />}
                    <span>{agent.is_enabled ? '24/7 Active' : 'Paused'}</span>
                  </button>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.45 }}>
                  {agent.description || 'Automated 24/7 background agent.'}
                </p>

                <div style={{
                  padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--muted)' }}>
                    <span>Schedule: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{agent.schedule_cron}</strong></span>
                    <span>Runs: <strong style={{ color: 'var(--text)' }}>{agent.total_runs || 0}</strong></span>
                  </div>
                  <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.78rem', lineHeight: 1.35 }}>
                    {agent.last_summary || 'Awaiting first execution'}
                  </div>
                  {agent.last_run_at && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Last run: {new Date(agent.last_run_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(agent)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem' }}
                  >
                    <Edit2 size={12} /> Configure
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDeleteAgent(agent)}
                    style={{ color: '#ef4444', padding: '5px 8px' }}
                    title="Delete Agent"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRunAgentNow(agent)}
                  disabled={isRunning}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}
                >
                  {isRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution History Log Table */}
      <div className="card" style={{ borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={17} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
              24/7 Agent Execution Logs ({filteredLogs.length})
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CustomSelect
              value={logAgentFilter}
              onChange={setLogAgentFilter}
              options={[
                { value: 'ALL', label: 'All Agents' },
                ...agents.map(a => ({ value: a.id, label: a.name }))
              ]}
              size="sm"
              style={{ width: '210px' }}
            />
            <CustomSelect
              value={logStatusFilter}
              onChange={setLogStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' }
              ]}
              size="sm"
              style={{ width: '140px' }}
            />
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={loadAutomationData}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '34px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Executed At</th>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Agent</th>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Trigger</th>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Processed</th>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {log.executed_at ? new Date(log.executed_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: '0.84rem', color: 'var(--text)' }}>
                    {log.agent_name}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                    {log.trigger_source === 'vercel_cron' ? '24/7 Cloud Cron' : log.trigger_source}
                  </td>
                  <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
                    {log.items_processed ?? 0} <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500 }}>({log.duration_ms || 0}ms)</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 9px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700,
                      background: log.status === 'error' ? 'rgba(239, 68, 68, 0.14)' : log.status === 'warning' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                      color: log.status === 'error' ? '#ef4444' : log.status === 'warning' ? '#f59e0b' : '#10b981'
                    }}>
                      {log.status === 'error' ? <XCircle size={12} /> : log.status === 'warning' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      {String(log.status || 'success').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: 'var(--text)' }}>
                    {log.summary}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.86rem' }}>
                    No execution logs recorded yet. Click <strong>Run Now</strong> on any agent above to trigger an immediate run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Agent Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="app-modal-backdrop" style={{ zIndex: 99999 }} onClick={() => setShowModal(false)}>
          <div className="app-modal-dialog" style={{ maxWidth: '580px', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  {editingAgent ? 'Configure 24/7 Agent' : 'Create New 24/7 Agent'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Agent Name *</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Overdue Invoice Reminder Agent"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label">Agent Type</label>
                  <CustomSelect
                    value={form.agent_type}
                    onChange={val => setForm({ ...form, agent_type: val })}
                    options={Object.entries(AGENT_TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))}
                  />
                </div>
                <div>
                  <label className="form-label">24/7 Cron Schedule</label>
                  <CustomSelect
                    value={form.schedule_cron}
                    onChange={val => setForm({ ...form, schedule_cron: val })}
                    options={CRON_PRESETS}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What does this agent monitor or automate?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Type-Specific Configuration */}
              {form.agent_type === 'overdue_reminder' && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>Grace Period (Days)</label>
                    <input type="number" className="form-input" value={form.graceDays} onChange={e => setForm({ ...form, graceDays: Number(e.target.value) })} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, marginTop: '16px' }}>
                    <input type="checkbox" checked={form.sendSms} onChange={e => setForm({ ...form, sendSms: e.target.checked })} />
                    <span>Auto-Send SMS Reminders</span>
                  </label>
                </div>
              )}

              {form.agent_type === 'cloud_push_sync' && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.alertOnOffline} onChange={e => setForm({ ...form, alertOnOffline: e.target.checked })} />
                    <span>Alert staff immediately if any biometric terminal goes offline</span>
                  </label>
                </div>
              )}

              {form.agent_type === 'auto_renewal' && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>Days Before Renewal</label>
                    <input type="number" className="form-input" value={form.daysBeforeRenewal} onChange={e => setForm({ ...form, daysBeforeRenewal: Number(e.target.value) })} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, marginTop: '16px' }}>
                    <input type="checkbox" checked={form.autoCreateInvoice} onChange={e => setForm({ ...form, autoCreateInvoice: e.target.checked })} />
                    <span>Auto-Draft Renewal Invoices</span>
                  </label>
                </div>
              )}

              {form.agent_type === 'lead_summary' && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>Stale Lead Days</label>
                    <input type="number" className="form-input" value={form.staleDays} onChange={e => setForm({ ...form, staleDays: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>Admin SMS Phone (Optional)</label>
                    <input type="text" className="form-input" placeholder="e.g. 0771234567" value={form.adminPhone} onChange={e => setForm({ ...form, adminPhone: e.target.value })} />
                  </div>
                </div>
              )}

              {form.agent_type === 'custom_webhook' && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Webhook Target URL (POST)</label>
                  <input type="url" className="form-input" placeholder="https://example.com/webhook" value={form.webhookUrl} onChange={e => setForm({ ...form, webhookUrl: e.target.value })} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingAgent ? 'Save Agent Changes' : 'Create 24/7 Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
