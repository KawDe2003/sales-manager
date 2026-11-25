// 24/7 Cloud Automation Runner (Vercel Cron + Manual Webhook Trigger)
// Executes enabled automation agents in Supabase even when all browsers are closed.
import { createClient } from '@supabase/supabase-js';

const CANONICAL_SUPABASE_URL = 'https://cavehtshlvorbzlgqmxs.supabase.co';
const CANONICAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdmVodHNobHZvcmJ6bGdxbXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NzQxMzEsImV4cCI6MjA5MTQ1MDEzMX0.aApzqy2ByGpWInScx-vuxgZ_GHJjCwenN0cWz1CyadI';

function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || CANONICAL_SUPABASE_URL).trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || CANONICAL_SUPABASE_ANON_KEY).trim();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function sendQuickSendSms(phone, message) {
  const apiUser = process.env.QUICKSEND_API_USER;
  const apiKey = process.env.QUICKSEND_API_KEY;
  if (!apiUser || !apiKey || !phone) return { sent: false, reason: 'SMS credentials or phone missing' };

  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone) return { sent: false, reason: 'Invalid phone number' };

  const auth = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
  const res = await fetch('https://quicksend.lk/Client/api.php?FUN=SEND_SINGLE', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      senderID: process.env.QUICKSEND_SENDER_ID || 'Seynex',
      to: cleanPhone,
      msg: message
    })
  });
  return { sent: res.ok, status: res.status };
}

async function postSystemNotification(supabase, title, message, type = 'info', link = '/automations') {
  try {
    await supabase.from('system_notifications').insert({
      id: `notif_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      message,
      type,
      link,
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    // Non-fatal if system_notifications schema differs
  }
}

async function runOverdueReminderAgent(supabase, agent) {
  const graceDays = Number(agent.config?.graceDays ?? 1);
  const sendSms = Boolean(agent.config?.sendSms);
  const cutoffDate = new Date(Date.now() - graceDays * 86400000).toISOString().slice(0, 10);

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, prospect_name, phone, due_date, total, balance, status')
    .not('status', 'in', '("Paid","Void","Cancelled")');

  if (error) throw new Error(`Failed to query invoices: ${error.message}`);

  const overdueList = (invoices || []).filter(inv => {
    const due = (inv.due_date || '').slice(0, 10);
    return due && due < cutoffDate && Number(inv.balance ?? inv.total ?? 0) > 0;
  });

  let smsCount = 0;
  for (const inv of overdueList) {
    if (inv.status !== 'Overdue') {
      await supabase.from('invoices').update({ status: 'Overdue' }).eq('id', inv.id);
    }
    if (sendSms && inv.phone) {
      const msg = `Reminder: Invoice #${inv.invoice_number || inv.id} for LKR ${Number(inv.balance ?? inv.total ?? 0).toLocaleString()} was due on ${inv.due_date?.slice(0, 10)}. Please settle at your earliest convenience. - Seynex`;
      const smsRes = await sendQuickSendSms(inv.phone, msg);
      if (smsRes.sent) smsCount += 1;
    }
  }

  if (overdueList.length > 0) {
    await postSystemNotification(
      supabase,
      '24/7 Overdue Invoice Agent',
      `Detected ${overdueList.length} overdue invoice(s) past ${graceDays}d grace period${smsCount ? ` (${smsCount} SMS reminders dispatched)` : ''}.`,
      'warning',
      '/debtors'
    );
  }

  return {
    status: overdueList.length > 0 ? 'warning' : 'success',
    itemsProcessed: overdueList.length,
    summary: overdueList.length > 0
      ? `Flagged ${overdueList.length} overdue invoice(s); ${smsCount} SMS sent.`
      : 'All active invoices are within payment due dates.',
    details: { overdueIds: overdueList.map(i => i.invoice_number || i.id), smsSent: smsCount }
  };
}

async function runCloudPushSyncAgent(supabase, agent) {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, gym_name, name, cloud_push_enabled, cloud_push_acc, cloud_push_api_key, device_serial, device_serials, data');

  if (error) throw new Error(`Failed to query Cloud Push clients: ${error.message}`);

  const activeClients = (customers || []).filter(c => {
    const enabled = c.cloud_push_enabled !== false && (c.data?.cloudPushEnabled !== false);
    const acc = c.cloud_push_acc || c.data?.cloudPushAcc;
    return enabled && Boolean(acc);
  });

  let onlineCount = 0;
  let offlineClients = [];

  for (const c of activeClients) {
    const accNo = String(c.cloud_push_acc || c.data?.cloudPushAcc || '');
    const apiKey = String(c.cloud_push_api_key || c.data?.cloudPushApiKey || '');
    const serial = c.device_serial || c.data?.deviceSerial || (Array.isArray(c.device_serials) ? c.device_serials[0]?.sn : '') || '';
    const authHeader = apiKey ? `Basic ${Buffer.from(`${apiKey}:${accNo}`).toString('base64')}` : '';

    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`http://83.147.38.130:666/v2/terminal/?filter=push_acc&value=${encodeURIComponent(accNo)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {}),
          ...(apiKey ? { 'api_key': apiKey } : {})
        },
        signal: ctrl.signal
      });
      clearTimeout(tid);
      if (res.ok) {
        onlineCount += 1;
      } else {
        offlineClients.push({ client: c.gym_name || c.name, accNo, serial, httpStatus: res.status });
      }
    } catch (err) {
      offlineClients.push({ client: c.gym_name || c.name, accNo, serial, error: err.message });
    }
  }

  if (offlineClients.length > 0 && agent.config?.alertOnOffline !== false) {
    await postSystemNotification(
      supabase,
      'Cloud Push 24/7 Health Alert',
      `${offlineClients.length} of ${activeClients.length} Cloud Push client gateway(s) failed health check (${offlineClients.map(o => o.client).join(', ')}).`,
      'error',
      '/cloud-push'
    );
  }

  return {
    status: offlineClients.length > 0 ? 'warning' : 'success',
    itemsProcessed: activeClients.length,
    summary: activeClients.length === 0
      ? 'No active Cloud Push clients configured.'
      : `Checked ${activeClients.length} Cloud Push client(s): ${onlineCount} reachable, ${offlineClients.length} unreachable.`,
    details: { totalClients: activeClients.length, onlineCount, offlineClients }
  };
}

async function runAutoRenewalAgent(supabase, agent) {
  const daysAhead = Number(agent.config?.daysBeforeRenewal ?? 7);
  const autoCreate = agent.config?.autoCreateInvoice !== false;
  const now = new Date();
  const futureLimit = new Date(now.getTime() + daysAhead * 86400000).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, gym_name, name, phone, billing_type, annual_fee, renewal_date, data');

  if (error) throw new Error(`Failed to query customers for renewal: ${error.message}`);

  const dueRenewals = (customers || []).filter(c => {
    const bType = c.billing_type || c.data?.billingType || '';
    const rDate = (c.renewal_date || c.data?.renewalDate || '').slice(0, 10);
    const fee = Number(c.annual_fee ?? c.data?.annualFee ?? 0);
    return bType === 'Annual' && rDate && rDate >= todayStr && rDate <= futureLimit && fee > 0;
  });

  let createdCount = 0;
  if (autoCreate && dueRenewals.length > 0) {
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('customer_id, date, status')
      .neq('status', 'Void');

    const recentMonth = todayStr.slice(0, 7);
    for (const cust of dueRenewals) {
      const alreadyBilled = (existingInvoices || []).some(
        inv => inv.customer_id === cust.id && String(inv.date || '').startsWith(recentMonth)
      );
      if (alreadyBilled) continue;

      const fee = Number(cust.annual_fee ?? cust.data?.annualFee ?? 0);
      const invId = `inv_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const invNum = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const dueDate = (cust.renewal_date || cust.data?.renewalDate || futureLimit).slice(0, 10);

      const { error: insErr } = await supabase.from('invoices').insert({
        id: invId,
        invoice_number: invNum,
        customer_id: cust.id,
        prospect_name: cust.gym_name || cust.name,
        phone: cust.phone || '',
        date: todayStr,
        due_date: dueDate,
        status: 'Draft',
        total: fee,
        balance: fee,
        items: [{
          id: `item_${Date.now()}`,
          name: 'Annual Software & Support Renewal',
          desc: `Automated 24/7 renewal draft for cycle due ${dueDate}`,
          price: fee,
          quantity: 1
        }],
        notes: `Auto-generated by 24/7 Auto-Renewal Agent on ${todayStr}`
      });

      if (!insErr) createdCount += 1;
    }
  }

  if (createdCount > 0) {
    await postSystemNotification(
      supabase,
      '24/7 Auto-Renewal Agent',
      `Automatically drafted ${createdCount} annual renewal invoice(s) for upcoming renewals within ${daysAhead} days.`,
      'success',
      '/invoices'
    );
  }

  return {
    status: 'success',
    itemsProcessed: dueRenewals.length,
    summary: `Found ${dueRenewals.length} upcoming renewal(s) within ${daysAhead} days; drafted ${createdCount} invoice(s).`,
    details: { upcomingRenewals: dueRenewals.length, invoicesDrafted: createdCount }
  };
}

async function runLeadSummaryAgent(supabase, agent) {
  const staleDays = Number(agent.config?.staleDays ?? 3);
  const cutoffIso = new Date(Date.now() - staleDays * 86400000).toISOString();

  const [{ data: leads }, { data: invoices }] = await Promise.all([
    supabase.from('leads').select('id, gym_name, status, updated_at, created_at'),
    supabase.from('invoices').select('total, balance, status')
  ]);

  const openLeads = (leads || []).filter(l => !['Won', 'Lost', 'Closed'].includes(l.status));
  const staleLeads = openLeads.filter(l => (l.updated_at || l.created_at || '') < cutoffIso);

  const outstanding = (invoices || [])
    .filter(i => !['Paid', 'Void', 'Cancelled'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.balance ?? i.total ?? 0), 0);

  const briefing = `Daily Briefing: ${openLeads.length} open lead(s) (${staleLeads.length} need follow-up > ${staleDays}d), LKR ${outstanding.toLocaleString()} total outstanding receivables.`;

  await postSystemNotification(supabase, '24/7 Executive Summary', briefing, 'info', '/leads');

  let smsSent = false;
  if (agent.config?.adminPhone) {
    const res = await sendQuickSendSms(agent.config.adminPhone, `Seynex 24/7 Agent: ${briefing}`);
    smsSent = res.sent;
  }

  return {
    status: staleLeads.length > 0 ? 'warning' : 'success',
    itemsProcessed: openLeads.length,
    summary: briefing,
    details: { openLeads: openLeads.length, staleLeads: staleLeads.length, outstandingLkr: outstanding, smsSent }
  };
}

async function runCustomWebhookAgent(agent) {
  const url = agent.config?.webhookUrl;
  if (!url) {
    return { status: 'skipped', itemsProcessed: 0, summary: 'No webhook URL configured.', details: {} };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent.id,
      agentName: agent.name,
      executedAt: new Date().toISOString(),
      payload: agent.config?.payload || {}
    })
  });
  return {
    status: res.ok ? 'success' : 'error',
    itemsProcessed: 1,
    summary: `Webhook responded HTTP ${res.status}`,
    details: { httpStatus: res.status }
  };
}

export default async function handler(request, response) {
  // Optional CRON_SECRET verification when configured in Vercel environment
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers['authorization'] || '';
  const isManualTrigger = request.query?.manual === '1' || request.method === 'POST';
  if (cronSecret && !isManualTrigger && authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ ok: false, error: 'Unauthorized cron invocation' });
  }

  const supabase = getSupabaseAdmin();
  const targetAgentId = request.query?.agentId || request.body?.agentId || null;
  const triggerSource = isManualTrigger ? 'manual_ui' : 'vercel_cron';

  try {
    let query = supabase.from('automation_agents').select('*');
    if (targetAgentId) {
      query = query.eq('id', targetAgentId);
    } else {
      query = query.eq('is_enabled', true);
    }

    const { data: agents, error } = await query;
    if (error) {
      return response.status(500).json({ ok: false, error: error.message });
    }

    const results = [];
    for (const agent of (agents || [])) {
      const startMs = Date.now();
      let outcome;
      try {
        if (agent.agent_type === 'overdue_reminder') {
          outcome = await runOverdueReminderAgent(supabase, agent);
        } else if (agent.agent_type === 'cloud_push_sync') {
          outcome = await runCloudPushSyncAgent(supabase, agent);
        } else if (agent.agent_type === 'auto_renewal') {
          outcome = await runAutoRenewalAgent(supabase, agent);
        } else if (agent.agent_type === 'lead_summary') {
          outcome = await runLeadSummaryAgent(supabase, agent);
        } else {
          outcome = await runCustomWebhookAgent(agent);
        }
      } catch (err) {
        outcome = {
          status: 'error',
          itemsProcessed: 0,
          summary: err.message || 'Execution error',
          details: { error: err.message }
        };
      }

      const durationMs = Date.now() - startMs;
      const nowIso = new Date().toISOString();

      await supabase.from('automation_logs').insert({
        agent_id: agent.id,
        agent_name: agent.name,
        agent_type: agent.agent_type,
        status: outcome.status,
        trigger_source: triggerSource,
        items_processed: outcome.itemsProcessed || 0,
        summary: outcome.summary,
        details: outcome.details || {},
        duration_ms: durationMs,
        executed_at: nowIso
      });

      await supabase.from('automation_agents').update({
        last_run_at: nowIso,
        last_status: outcome.status,
        last_summary: outcome.summary,
        total_runs: (agent.total_runs || 0) + 1,
        updated_at: nowIso
      }).eq('id', agent.id);

      results.push({ id: agent.id, name: agent.name, ...outcome, durationMs });
    }

    return response.status(200).json({
      ok: true,
      triggerSource,
      executedCount: results.length,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (err) {
    return response.status(500).json({ ok: false, error: err.message });
  }
}
