-- =========================================================================
-- AUTONOMOUS AGENTS & REMINDERS SYSTEM SCHEMA MIGRATION
-- Seynex Technology | Antigravity Sales Management Suite
-- Migration: 20261122133000_autonomous_agents_schema.sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AGENT RULES TABLE
-- Stores configuration, operational mode, and schedule for each autonomous agent
CREATE TABLE IF NOT EXISTS agent_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    mode TEXT NOT NULL DEFAULT 'approval_queue' CHECK (mode IN ('auto', 'approval_queue')),
    schedule_cron TEXT DEFAULT '0 3 * * *',
    config_json JSONB DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. AGENT QUEUE TABLE
-- Stores actions proposed by agents that require human review or are queued for execution
CREATE TABLE IF NOT EXISTS agent_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_key TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'customer', 'invoice', 'lead', 'inventory', 'turnstile'
    entity_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    proposed_action TEXT NOT NULL CHECK (proposed_action IN ('send_sms', 'create_task', 'create_invoice', 'alert')),
    payload_json JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    executed_at TIMESTAMP WITH TIME ZONE
);

-- 3. AGENT EXECUTION LOGS TABLE (WITH DEDUPLICATION CONSTRAINT)
-- Prevents duplicate reminders, tracks all executed or queued milestones
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_key TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    milestone_key TEXT NOT NULL,
    status TEXT NOT NULL, -- 'queued', 'executed', 'dismissed', 'failed'
    details JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_agent_execution_milestone UNIQUE (agent_key, entity_id, milestone_key)
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_agent_rules_enabled ON agent_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_queue_status ON agent_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_queue_agent_key ON agent_queue(agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_exec_logs_key_entity ON agent_execution_logs(agent_key, entity_id);
CREATE INDEX IF NOT EXISTS idx_agent_exec_logs_time ON agent_execution_logs(executed_at DESC);

-- 5. SEED DEFAULT AGENT RULES
INSERT INTO agent_rules (agent_key, name, description, enabled, mode, schedule_cron, config_json)
VALUES 
    (
        'renewal_agent',
        'Annual Cloud Renewal Agent',
        'Scans customer cloud & turnstile subscription expiry dates at 30-day, 7-day, and 1-day milestones to send automated SMS warnings and draft renewal invoices.',
        true,
        'approval_queue',
        '0 3 * * *',
        '{"milestones": [30, 7, 1], "auto_invoice": true, "send_sms": true}'::jsonb
    ),
    (
        'debtors_agent',
        'Overdue Debtors Recovery Agent',
        'Tracks unpaid or overdue invoices at 7, 14, and 30 days overdue. Dispatches SMS payment reminders containing tokenized public share links.',
        true,
        'approval_queue',
        '0 3 * * *',
        '{"milestones": [7, 14, 30], "send_sms": true, "include_share_link": true}'::jsonb
    ),
    (
        'crm_agent',
        'CRM Lead Follow-Up Agent',
        'Monitors active sales leads untouched for more than 3 days. Generates follow-up tasks and calendar reminders for sales representatives.',
        true,
        'approval_queue',
        '0 3 * * *',
        '{"inactivity_days": 3, "create_task": true, "priority": "High"}'::jsonb
    ),
    (
        'ops_watchdog',
        'Ops & Fleet Watchdog Agent',
        'Monitors low inventory stock below reorder levels and detects offline or unpaired turnstiles to push real-time alerts to the Activity Feed.',
        true,
        'approval_queue',
        '0 3 * * *',
        '{"low_stock_threshold": 5, "check_turnstiles": true}'::jsonb
    )
ON CONFLICT (agent_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE agent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_execution_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff members full read and write access
DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff full access on agent_rules" ON agent_rules;
    CREATE POLICY "Staff full access on agent_rules"
        ON agent_rules FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Staff full access on agent_queue" ON agent_queue;
    CREATE POLICY "Staff full access on agent_queue"
        ON agent_queue FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Staff full access on agent_execution_logs" ON agent_execution_logs;
    CREATE POLICY "Staff full access on agent_execution_logs"
        ON agent_execution_logs FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    -- Allow anon read access for queue verification if needed
    DROP POLICY IF EXISTS "Anon read on agent_rules" ON agent_rules;
    CREATE POLICY "Anon read on agent_rules"
        ON agent_rules FOR SELECT
        TO anon
        USING (true);
END $$;
