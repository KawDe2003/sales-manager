// Serverless Cron Sweep & Automation Engine
// Endpoint: /api/agents/daily-sweep.js
// Runs daily via Vercel Cron at "0 3 * * *" (08:30 AM Sri Lanka Time / UTC+5:30)
// Also callable manually by authenticated staff in the In-App Agent Control Center

import { createClient } from '@supabase/supabase-js';

// Sri Lankan phone number normalizer
function formatPhone(raw) {
  if (!raw) return '';
  let digits = String(raw).trim().replace(/[^0-9]/g, '');
  if (digits.startsWith('940') && digits.length >= 12) digits = digits.substring(2);
  else if (digits.startsWith('94') && digits.length === 11) digits = '0' + digits.substring(2);
  else if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits;
  else if (digits.startsWith('0094') && digits.length === 13) digits = '0' + digits.substring(4);
  return digits;
}

// Helper to send QuickSend SMS
async function dispatchSMS(to, message) {
  const apiUser = process.env.QUICKSEND_API_USER;
  const apiKey = process.env.QUICKSEND_API_KEY;
  if (!apiUser || !apiKey) {
    return { success: false, error: 'QuickSend credentials not configured on server' };
  }

  const normalizedPhone = formatPhone(to);
  if (!normalizedPhone) {
    return { success: false, error: 'Invalid or missing recipient phone number' };
  }

  try {
    const upstreamAuth = 'Basic ' + Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
    const targetUrl = 'https://quicksend.lk/Client/api.php?FUN=SendSMS';
    const payload = {
      to: normalizedPhone,
      text: message,
      sender: 'Seynex'
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': upstreamAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    
    return {
      success: res.ok && (!json || json.Status !== 'error'),
      status: res.status,
      response: json || text
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default async function handler(request, response) {
  const startTime = Date.now();

  // 1. Caller Authentication & Cron Secret Verification
  const incomingAuth = request.headers['authorization'] || '';
  const querySecret = request.query?.secret || '';
  const cronSecret = process.env.CRON_SECRET || '';

  const isCronAuthorized = cronSecret && (
    incomingAuth === `Bearer ${cronSecret}` || 
    querySecret === cronSecret
  );

  let isStaffAuthorized = false;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  // If invoked manually from the In-App Agent Center, verify caller's Supabase JWT
  if (incomingAuth.startsWith('Bearer ') && supabaseUrl && supabaseServiceKey) {
    const token = incomingAuth.replace('Bearer ', '').trim();
    if (token !== cronSecret) {
      try {
        const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey
          }
        });
        if (verifyRes.ok) {
          isStaffAuthorized = true;
        }
      } catch (e) {
        console.warn('[Daily Sweep] Caller JWT check warning:', e.message);
      }
    }
  }

  // Allow execution if authorized via Cron Secret, Staff JWT, or running locally/unconfigured
  if (!isCronAuthorized && !isStaffAuthorized && process.env.NODE_ENV === 'production' && cronSecret) {
    return response.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing Authorization secret for daily sweep cron.'
    });
  }

  // 2. Initialize Supabase Client
  let supabase = null;
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }

  // Prepare result audit tracking
  const sweepResults = {
    timestamp: new Date().toISOString(),
    renewalAgent: { checked: 0, queued: 0, executed: 0, skipped: 0 },
    debtorsAgent: { checked: 0, queued: 0, executed: 0, skipped: 0 },
    crmAgent: { checked: 0, queued: 0, executed: 0, skipped: 0 },
    opsWatchdog: { checked: 0, queued: 0, executed: 0, skipped: 0 },
    totalQueued: 0,
    totalExecuted: 0,
    errors: []
  };

  try {
    // If Supabase is not available (e.g. offline local demo), handle gracefully
    if (!supabase) {
      return response.status(200).json({
        ok: true,
        message: 'Daily sweep simulation completed (Supabase environment variables not set).',
        results: sweepResults,
        durationMs: Date.now() - startTime
      });
    }

    // 3. Load Agent Rules
    const { data: rulesData, error: rulesErr } = await supabase
      .from('agent_rules')
      .select('*');

    const rules = (rulesData || []).reduce((acc, r) => {
      acc[r.agent_key] = r;
      return acc;
    }, {});

    // Helper to check if milestone already executed / queued
    const checkExecutedMilestone = async (agentKey, entityId, milestoneKey) => {
      try {
        const { data } = await supabase
          .from('agent_execution_logs')
          .select('id, status')
          .eq('agent_key', agentKey)
          .eq('entity_id', entityId)
          .eq('milestone_key', milestoneKey)
          .limit(1);
        return data && data.length > 0;
      } catch {
        return false;
      }
    };

    // Helper to record log
    const logExecution = async (agentKey, entityId, milestoneKey, status, details = {}) => {
      try {
        await supabase
          .from('agent_execution_logs')
          .insert({
            agent_key: agentKey,
            entity_id: String(entityId),
            milestone_key: milestoneKey,
            status: status,
            details: details,
            executed_at: new Date().toISOString()
          });
      } catch (err) {
        console.warn(`[Daily Sweep] Error logging milestone ${milestoneKey}:`, err.message);
      }
    };

    // Helper to enqueue proposed action
    const enqueueAction = async (agentKey, entityType, entityId, title, summary, proposedAction, payload) => {
      try {
        const { data, error } = await supabase
          .from('agent_queue')
          .insert({
            agent_key: agentKey,
            entity_type: entityType,
            entity_id: String(entityId),
            title: title,
            summary: summary,
            proposed_action: proposedAction,
            payload_json: payload,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        return data;
      } catch (err) {
        console.warn(`[Daily Sweep] Error enqueuing action:`, err.message);
        return null;
      }
    };

    // =========================================================================
    // AGENT 1: RENEWAL AGENT (Cloud & Turnstile License Renewal Warnings)
    // =========================================================================
    const renewalRule = rules['renewal_agent'] || { enabled: true, mode: 'approval_queue' };
    if (renewalRule.enabled) {
      try {
        const { data: customers } = await supabase
          .from('customers')
          .select('*');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const cust of (customers || [])) {
          sweepResults.renewalAgent.checked++;

          // Check if customer is exempt from annual fee
          const hasAnnualFee = cust.has_annual_cloud_fee !== false && 
                               cust.hasAnnualCloudFee !== false && 
                               (Number(cust.annual_fee || cust.annualFee || 0) > 0);
          
          const renewalDateStr = cust.renewal_date || cust.renewalDate || cust.next_cloud_renewal;
          if (!hasAnnualFee || !renewalDateStr) continue;

          const renewalDate = new Date(renewalDateStr);
          renewalDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((renewalDate - today) / (1000 * 60 * 60 * 24));

          // Check milestones: 30 days, 7 days, 1 day
          let milestone = null;
          if (diffDays >= 28 && diffDays <= 30) milestone = '30d';
          else if (diffDays >= 6 && diffDays <= 7) milestone = '7d';
          else if (diffDays >= 0 && diffDays <= 1) milestone = '1d';

          if (!milestone) continue;

          const milestoneKey = `renewal_${milestone}_${renewalDateStr}`;
          const alreadyProcessed = await checkExecutedMilestone('renewal_agent', cust.id, milestoneKey);
          if (alreadyProcessed) {
            sweepResults.renewalAgent.skipped++;
            continue;
          }

          const clientName = cust.gym_name || cust.gymName || cust.name || 'Valued Client';
          const feeAmount = Number(cust.annual_fee || cust.annualFee || 0).toLocaleString();
          const targetPhone = cust.phone || '';
          const smsText = `Dear ${clientName}, your Seynex Cloud & Turnstile license renewal is due in ${diffDays} day(s) on ${renewalDateStr}. Annual Fee: LKR ${feeAmount}. Please contact Seynex to ensure continuous device access.`;

          if (renewalRule.mode === 'auto') {
            // Autonomous Execution: Dispatch SMS immediately
            const smsRes = await dispatchSMS(targetPhone, smsText);
            await logExecution('renewal_agent', cust.id, milestoneKey, smsRes.success ? 'executed' : 'failed', {
              mode: 'auto',
              diffDays,
              phone: targetPhone,
              smsRes
            });
            sweepResults.renewalAgent.executed++;
            sweepResults.totalExecuted++;
          } else {
            // Approval Queue Mode: Enqueue for human approval
            await enqueueAction(
              'renewal_agent',
              'customer',
              cust.id,
              `Renewal Notice (${milestone}): ${clientName}`,
              `Cloud & Turnstile subscription expires in ${diffDays} day(s) on ${renewalDateStr}. Fee: LKR ${feeAmount}`,
              'send_sms',
              {
                phone: targetPhone,
                message: smsText,
                diffDays,
                renewalDate: renewalDateStr,
                annualFee: cust.annual_fee || cust.annualFee,
                customerName: clientName
              }
            );
            await logExecution('renewal_agent', cust.id, milestoneKey, 'queued', { mode: 'approval_queue', diffDays });
            sweepResults.renewalAgent.queued++;
            sweepResults.totalQueued++;
          }
        }
      } catch (err) {
        sweepResults.errors.push(`Renewal Agent Error: ${err.message}`);
      }
    }

    // =========================================================================
    // AGENT 2: DEBTORS AGENT (Overdue Invoices Recovery Reminders)
    // =========================================================================
    const debtorsRule = rules['debtors_agent'] || { enabled: true, mode: 'approval_queue' };
    if (debtorsRule.enabled) {
      try {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const inv of (invoices || [])) {
          sweepResults.debtorsAgent.checked++;

          const isPaid = inv.status === 'Paid';
          const total = Number(inv.total || inv.amount || 0);
          const paid = Number(inv.amount_paid || inv.amountPaid || 0);
          const balance = Number(inv.outstanding_balance ?? (total - paid));

          if (isPaid || balance <= 0) continue;

          const dueDateStr = inv.due_date || inv.dueDate || inv.date;
          if (!dueDateStr) continue;

          const dueDate = new Date(dueDateStr);
          dueDate.setHours(0, 0, 0, 0);
          const overdueDays = Math.round((today - dueDate) / (1000 * 60 * 60 * 24));

          // Check overdue milestones: 7d, 14d, 30d
          let milestone = null;
          if (overdueDays >= 7 && overdueDays < 14) milestone = '7d';
          else if (overdueDays >= 14 && overdueDays < 30) milestone = '14d';
          else if (overdueDays >= 30) milestone = '30d';

          if (!milestone) continue;

          const milestoneKey = `debtor_${milestone}_overdue`;
          const alreadyProcessed = await checkExecutedMilestone('debtors_agent', inv.id, milestoneKey);
          if (alreadyProcessed) {
            sweepResults.debtorsAgent.skipped++;
            continue;
          }

          const invNumber = inv.invoice_number || inv.invoiceNumber || 'INV';
          const clientName = inv.prospect_name || inv.prospectName || 'Valued Client';
          const shareToken = inv.share_token || inv.shareToken || inv.id;
          const targetPhone = inv.phone || '';
          const shareUrl = `https://salesmgr.seynextech.com/share/invoice/${shareToken}`;
          const smsText = `Payment Reminder: Invoice #${invNumber} for LKR ${balance.toLocaleString()} is ${overdueDays} days overdue. View & pay online: ${shareUrl} - Seynex Technology`;

          if (debtorsRule.mode === 'auto') {
            const smsRes = await dispatchSMS(targetPhone, smsText);
            await logExecution('debtors_agent', inv.id, milestoneKey, smsRes.success ? 'executed' : 'failed', {
              mode: 'auto',
              overdueDays,
              balance,
              phone: targetPhone,
              smsRes
            });
            sweepResults.debtorsAgent.executed++;
            sweepResults.totalExecuted++;
          } else {
            await enqueueAction(
              'debtors_agent',
              'invoice',
              inv.id,
              `Overdue Invoice #${invNumber} (${overdueDays}d overdue)`,
              `Outstanding balance LKR ${balance.toLocaleString()} for ${clientName}. Milestone: ${milestone}`,
              'send_sms',
              {
                phone: targetPhone,
                message: smsText,
                invoiceNumber: invNumber,
                clientName,
                balance,
                overdueDays,
                shareUrl
              }
            );
            await logExecution('debtors_agent', inv.id, milestoneKey, 'queued', { mode: 'approval_queue', overdueDays });
            sweepResults.debtorsAgent.queued++;
            sweepResults.totalQueued++;
          }
        }
      } catch (err) {
        sweepResults.errors.push(`Debtors Agent Error: ${err.message}`);
      }
    }

    // =========================================================================
    // AGENT 3: CRM FOLLOW-UP AGENT (Untouched Leads Monitoring)
    // =========================================================================
    const crmRule = rules['crm_agent'] || { enabled: true, mode: 'approval_queue' };
    if (crmRule.enabled) {
      try {
        const { data: leads } = await supabase
          .from('leads')
          .select('*');

        const now = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        for (const lead of (leads || [])) {
          sweepResults.crmAgent.checked++;

          const stage = (lead.stage || lead.status || '').toLowerCase();
          if (stage === 'won' || stage === 'lost' || stage === 'closed') continue;

          const lastTouch = new Date(lead.updated_at || lead.created_at || Date.now()).getTime();
          const inactiveDays = Math.floor((now - lastTouch) / (1000 * 60 * 60 * 24));

          if (inactiveDays < 3) continue;

          const milestoneKey = `crm_untouched_3d_${todayStr}`;
          const alreadyProcessed = await checkExecutedMilestone('crm_agent', lead.id, milestoneKey);
          if (alreadyProcessed) {
            sweepResults.crmAgent.skipped++;
            continue;
          }

          const leadName = lead.gym_name || lead.gymName || lead.contact_person || 'Sales Lead';
          const taskTitle = `Follow up with ${leadName} (Inactive for ${inactiveDays}d)`;
          const taskDescription = `Autonomous CRM Watchdog: Lead has had no activity for ${inactiveDays} days. Contact phone: ${lead.phone || 'N/A'}. Value: LKR ${Number(lead.deal_value || lead.estimated_value || 0).toLocaleString()}`;

          if (crmRule.mode === 'auto') {
            // Auto create task in tasks table
            try {
              await supabase.from('tasks').insert({
                title: taskTitle,
                description: taskDescription,
                priority: 'High',
                status: 'Pending',
                related_to: 'Lead',
                related_id: lead.id,
                due_date: todayStr
              });
            } catch {}

            await logExecution('crm_agent', lead.id, milestoneKey, 'executed', { mode: 'auto', inactiveDays });
            sweepResults.crmAgent.executed++;
            sweepResults.totalExecuted++;
          } else {
            await enqueueAction(
              'crm_agent',
              'lead',
              lead.id,
              taskTitle,
              `Lead in "${lead.stage || 'Pipeline'}" stage has been untouched for ${inactiveDays} days.`,
              'create_task',
              {
                title: taskTitle,
                description: taskDescription,
                leadId: lead.id,
                leadName,
                inactiveDays,
                phone: lead.phone
              }
            );
            await logExecution('crm_agent', lead.id, milestoneKey, 'queued', { mode: 'approval_queue', inactiveDays });
            sweepResults.crmAgent.queued++;
            sweepResults.totalQueued++;
          }
        }
      } catch (err) {
        sweepResults.errors.push(`CRM Agent Error: ${err.message}`);
      }
    }

    // =========================================================================
    // AGENT 4: OPS WATCHDOG AGENT (Low Stock & Offline Turnstiles)
    // =========================================================================
    const opsRule = rules['ops_watchdog'] || { enabled: true, mode: 'approval_queue' };
    if (opsRule.enabled) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Low stock check
        const { data: inventory } = await supabase
          .from('inventory')
          .select('*');

        for (const item of (inventory || [])) {
          sweepResults.opsWatchdog.checked++;
          const stock = Number(item.stock ?? 0);
          const minStock = Number(item.min_stock || item.reorder_level || 5);

          if (stock <= minStock) {
            const milestoneKey = `low_stock_${item.id}_${todayStr}`;
            const alreadyProcessed = await checkExecutedMilestone('ops_watchdog', item.id, milestoneKey);
            if (alreadyProcessed) {
              sweepResults.opsWatchdog.skipped++;
              continue;
            }

            const alertTitle = `Low Stock: ${item.name} (${stock} units left)`;
            const alertSummary = `Current stock (${stock}) has fallen below reorder threshold (${minStock}). Restock required.`;

            if (opsRule.mode === 'auto') {
              // Direct activity feed alert
              try {
                await supabase.from('system_notifications').insert({
                  event_type: 'inventory_alert',
                  title: alertTitle,
                  message: alertSummary,
                  related_type: 'inventory',
                  related_id: item.id
                });
              } catch {}
              await logExecution('ops_watchdog', item.id, milestoneKey, 'executed', { mode: 'auto', stock });
              sweepResults.opsWatchdog.executed++;
              sweepResults.totalExecuted++;
            } else {
              await enqueueAction(
                'ops_watchdog',
                'inventory',
                item.id,
                alertTitle,
                alertSummary,
                'alert',
                { itemId: item.id, itemName: item.name, stock, minStock }
              );
              await logExecution('ops_watchdog', item.id, milestoneKey, 'queued', { mode: 'approval_queue', stock });
              sweepResults.opsWatchdog.queued++;
              sweepResults.totalQueued++;
            }
          }
        }
      } catch (err) {
        sweepResults.errors.push(`Ops Watchdog Error: ${err.message}`);
      }
    }

    // 4. Update agent_rules last_run_at timestamp
    const nowIso = new Date().toISOString();
    for (const key of ['renewal_agent', 'debtors_agent', 'crm_agent', 'ops_watchdog']) {
      try {
        await supabase
          .from('agent_rules')
          .update({ last_run_at: nowIso })
          .eq('agent_key', key);
      } catch {}
    }

    return response.status(200).json({
      ok: true,
      message: 'Autonomous daily sweep completed successfully.',
      durationMs: Date.now() - startTime,
      results: sweepResults
    });

  } catch (fatalErr) {
    console.error('[Daily Sweep Fatal Error]:', fatalErr.stack || fatalErr.message);
    return response.status(500).json({
      ok: false,
      code: 'SWEEP_ERROR',
      message: fatalErr.message,
      results: sweepResults
    });
  }
}
