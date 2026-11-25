-- =========================================================================
-- 24/7 AUTOMATION AGENTS & EXECUTION LOGS SCHEMA
-- Seynex Sales Manager | Server-Side & Cloud Cron Runner
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.automation_agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  agent_type text NOT NULL, -- 'overdue_reminder' | 'cloud_push_sync' | 'auto_renewal' | 'lead_summary' | 'custom_webhook'
  description text DEFAULT '',
  schedule_cron text NOT NULL DEFAULT '*/15 * * * *',
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_status text DEFAULT 'idle', -- 'idle' | 'success' | 'warning' | 'error'
  last_summary text DEFAULT 'Awaiting first 24/7 scheduled execution',
  total_runs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.automation_agents(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  agent_type text NOT NULL,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'warning' | 'error' | 'skipped'
  trigger_source text NOT NULL DEFAULT 'vercel_cron', -- 'vercel_cron' | 'manual_ui' | 'webhook'
  items_processed integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast log & agent queries
CREATE INDEX IF NOT EXISTS idx_automation_logs_agent_id ON public.automation_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON public.automation_logs(executed_at DESC);

-- Enable RLS with permissive staff/anon policies matching project standard
ALTER TABLE public.automation_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access on automation_agents" ON public.automation_agents;
CREATE POLICY "Full access on automation_agents"
  ON public.automation_agents FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access on automation_logs" ON public.automation_logs;
CREATE POLICY "Full access on automation_logs"
  ON public.automation_logs FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Seed 4 core 24/7 agents if table is empty
INSERT INTO public.automation_agents (name, agent_type, description, schedule_cron, is_enabled, config)
SELECT * FROM (
  VALUES
    (
      'Overdue Invoice & Payment Reminder Agent',
      'overdue_reminder',
      'Continuously scans unpaid invoices past due date, flags overdue accounts, alerts staff, and optionally sends payment reminder SMS.',
      '0 9 * * *',
      true,
      '{"graceDays": 1, "sendSms": false}'::jsonb
    ),
    (
      'Cloud Push Biometric Sync & Health Monitor',
      'cloud_push_sync',
      'Monitors eTechno Push biometric terminals 24/7, checks live gateway connectivity, and alerts immediately if a client device goes offline.',
      '*/15 * * * *',
      true,
      '{"alertOnOffline": true}'::jsonb
    ),
    (
      'Auto-Renewal & Recurring Invoice Agent',
      'auto_renewal',
      'Checks upcoming annual client renewals and automatically drafts renewal invoices before service expiration.',
      '0 8 * * *',
      true,
      '{"daysBeforeRenewal": 7, "autoCreateInvoice": true}'::jsonb
    ),
    (
      'Lead Follow-Up & Executive Summary Agent',
      'lead_summary',
      'Detects stale leads needing follow-up and compiles a daily revenue, debtors, and pipeline briefing.',
      '0 18 * * *',
      true,
      '{"staleDays": 3, "adminPhone": ""}'::jsonb
    )
) AS seed(name, agent_type, description, schedule_cron, is_enabled, config)
WHERE NOT EXISTS (SELECT 1 FROM public.automation_agents LIMIT 1);
