// Server-Side Executive AI Copilot Endpoint
// Endpoint: /api/agents/copilot.js
// Supports 100% Free AI Providers:
// 1. Google Gemini 1.5 / 2.0 Flash (Free tier via Google AI Studio: aistudio.google.com/app/apikey)
// 2. Groq Cloud LLaMA 3.3 70B (Free tier via console.groq.com/keys)
// 3. OpenRouter Free Models (openrouter.ai)
// 4. Built-in Dynamic Intelligence Engine (100% free, zero-config, zero-network fallback)

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, message: 'Method Not Allowed. POST required.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
    const { prompt = '', context = {}, customApiKey = '', customProvider = 'auto' } = body;

    // Resolve API keys (Priority: Environment Variables, then forwarded client key)
    const geminiKey = process.env.GEMINI_API_KEY || (customProvider === 'gemini' ? customApiKey : (customApiKey?.startsWith('AIzaSy') || customApiKey?.startsWith('AQ.') ? customApiKey : ''));
    const groqKey = process.env.GROQ_API_KEY || (customProvider === 'groq' ? customApiKey : (customApiKey?.startsWith('gsk_') ? customApiKey : ''));
    const openrouterKey = process.env.OPENROUTER_API_KEY || (customProvider === 'openrouter' ? customApiKey : (customApiKey?.startsWith('sk-or-') ? customApiKey : ''));

    // Destructure contextual business signals
    const {
      debtors = [],
      renewals = [],
      leads = [],
      inventory = [],
      totalOverdueAmount = 0,
      totalRenewalArr = 0,
      activeClientsCount = 0
    } = context;

    const userInquiry = prompt.trim() || 'Generate a comprehensive morning executive briefing with key revenue and operational priorities.';

    const systemPrompt = `You are the Seynex Executive AI Copilot for Seynex Technology (sales management, cloud turnstiles, and biometric access control).
You advise the leadership team with sharp, revenue-focused, LKAS-compliant recommendations.

Current Live Business Context:
- Active Enterprise Clients: ${activeClientsCount}
- Total Overdue Debtors: LKR ${Number(totalOverdueAmount).toLocaleString()} across ${debtors.length} unpaid invoices
- Top Overdue Debtors: ${JSON.stringify(debtors.slice(0, 5))}
- Subscriptions Renewing within 30 Days: ${renewals.length} accounts (Projected ARR: LKR ${Number(totalRenewalArr).toLocaleString()})
- Untouched CRM Leads: ${leads.length} leads requiring follow-up
- Low-Stock Inventory Items: ${inventory.length} items needing restock

The user is specifically asking:
"${userInquiry}"

Instructions:
- Directly and specifically address the user's inquiry above.
- If they ask about debtors or cash flow, focus deeply on debtors with specific LKR amounts and overdue aging.
- If they ask about renewals, focus on upcoming expiring accounts and annual recurring revenue retention.
- If they ask about inventory/hardware, focus on turnstile components, stock risks, and supply orders.
- If they ask for a morning briefing, provide a holistic summary across all pillars.
- Format using clean GitHub-flavored markdown with bold metrics and numbered action items.`;

    let providerError = null;

    // -------------------------------------------------------------------------
    // PROVIDER 1: Google Gemini 1.5 Flash (100% Free Tier via Google AI Studio)
    // -------------------------------------------------------------------------
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 14000);

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 1024
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return response.status(200).json({
              ok: true,
              source: 'gemini-1.5-flash (Google AI Studio Free Tier)',
              briefing: replyText,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          const errData = await geminiRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${geminiRes.status} ${geminiRes.statusText}`;
          const isUnsupported = errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || errMsg.includes('API key not valid');
          if (isUnsupported) {
            providerError = `Google Gemini rejected key (${errMsg}). This happens when your Google Cloud project (273989328724) does not have the 'Generative Language API' enabled in Google Cloud Console, or if API restrictions are blocking it. Quick fix: in Google AI Studio, click "Create API Key" → select "Create key in new project" (or use free Groq LLaMA 3.3).`;
          } else {
            providerError = `Google Gemini API Error: ${errMsg}`;
          }
          console.warn('[Copilot]', providerError);
        }
      } catch (e) {
        providerError = `Gemini connection failed: ${e.message}`;
        console.warn('[Copilot] Gemini exception:', e.message);
      }
    }

    // -------------------------------------------------------------------------
    // PROVIDER 2: Groq Cloud LLaMA 3.3 70B (100% Free Tier via console.groq.com)
    // -------------------------------------------------------------------------
    if (groqKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are the Seynex Executive AI Copilot. Provide sharp, executive business analysis.' },
              { role: 'user', content: systemPrompt }
            ],
            temperature: 0.6,
            max_tokens: 1024
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const replyText = groqData.choices?.[0]?.message?.content;
          if (replyText) {
            return response.status(200).json({
              ok: true,
              source: 'llama-3.3-70b (Groq Free Tier)',
              briefing: replyText,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          const errData = await groqRes.json().catch(() => ({}));
          providerError = `Groq API Error: ${errData.error?.message || groqRes.statusText}`;
        }
      } catch (e) {
        providerError = `Groq connection failed: ${e.message}`;
      }
    }

    // -------------------------------------------------------------------------
    // PROVIDER 3: OpenRouter Free Models (Free Tier via openrouter.ai)
    // -------------------------------------------------------------------------
    if (openrouterKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 14000);

        const routerRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.6,
            max_tokens: 1024
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (routerRes.ok) {
          const routerData = await routerRes.json();
          const replyText = routerData.choices?.[0]?.message?.content;
          if (replyText) {
            return response.status(200).json({
              ok: true,
              source: 'meta-llama-3.3-70b (OpenRouter Free Tier)',
              briefing: replyText,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (e) {}
    }

    // -------------------------------------------------------------------------
    // PROVIDER 4: Built-in Dynamic Intelligence Engine (100% Free, Zero-Config)
    // Adapts intelligently to the specific user inquiry (prompt)!
    // -------------------------------------------------------------------------
    const overdueTotal = Number(totalOverdueAmount || 0);
    const renewalArr = Number(totalRenewalArr || 0);
    const lowerInquiry = userInquiry.toLowerCase();

    let dynamicOutput = '';

    // Notice banner if a custom key had an issue
    const warningHeader = providerError ? `> ⚠️ **AI Key Notice**: ${providerError}\n> *Falling back to the Seynex Dynamic Intelligence Engine below.*\n\n---\n\n` : '';

    if (lowerInquiry.includes('debtor') || lowerInquiry.includes('debt') || lowerInquiry.includes('overdue') || lowerInquiry.includes('cash flow') || lowerInquiry.includes('unpaid')) {
      // 1. DEDICATED DEBTORS ANALYSIS
      dynamicOutput = `### 💰 Overdue Debtors & Cash Flow Intelligence
*Targeted Financial Recovery Plan — LKAS Pacing*

#### 1. Portfolio Exposure Overview
* **Total Overdue Pipeline:** **LKR ${overdueTotal.toLocaleString()}** across **${debtors.length}** invoices.
* **Aging Risk Tier:** High concentration in accounts exceeding 14–30 days payment terms.

#### 2. Critical Action Accounts
${debtors.length > 0 ? debtors.slice(0, 5).map((d, i) => {
  const name = d.clientName || d.client_name || d.prospectName || 'Corporate Client';
  const invNum = d.invoiceNumber || d.invoice_number || d.number || `#${i + 1}`;
  const bal = Number(d.outstanding_balance ?? (Number(d.total || 0) - Number(d.amount_paid || 0)));
  const days = d.daysOverdue || d.overdueDays || 14;
  return `${i + 1}. **${name}** (Inv **${invNum}**) — **LKR ${bal.toLocaleString()}** (*${days} days overdue*)\n   *Action:* Trigger Automated Debtors Agent SMS with tokenized payment link.`;
}).join('\n') : '*No overdue invoices found in current portfolio.*'}

#### 3. Strategic Recovery Recommendations
1. **Immediate SMS Payment Links:** Dispatch tokenized QuickSend SMS links directly to the financial controllers of top 3 accounts.
2. **Turnstile Grace Period Warning:** For accounts over 21 days overdue with linked hardware, send a formal notification of scheduled cloud sync suspension.
3. **Approval Queue:** Go to **Autonomous Agents → Pending Approvals** to approve pending debtor reminder dispatches.`;

    } else if (lowerInquiry.includes('renewal') || lowerInquiry.includes('subscription') || lowerInquiry.includes('arr') || lowerInquiry.includes('expir')) {
      // 2. DEDICATED 30-DAY RENEWALS STRATEGY
      dynamicOutput = `### 🔄 Cloud & Turnstile 30-Day Renewal Strategy
*SaaS Subscription Retention & ARR Preservation*

#### 1. Renewal Exposure & ARR Pipeline
* **Subscriptions Expiring in 30 Days:** **${renewals.length}** accounts.
* **Projected Annual Recurring Revenue (ARR):** **LKR ${renewalArr.toLocaleString()}**.

#### 2. Upcoming Expirations
${renewals.length > 0 ? renewals.slice(0, 5).map((r, i) => {
  const name = r.name || r.companyName || r.company_name || 'Client';
  const fee = Number(r.annualFee || r.annual_fee || 0);
  const date = r.renewalDate || r.renewal_date || 'Upcoming';
  return `${i + 1}. **${name}** — Projected ARR: **LKR ${fee.toLocaleString()}** (Due: *${date}*)\n   *Action:* Pre-generate pro-forma invoice and queue 7-day reminder SMS.`;
}).join('\n') : '*No accounts currently due for renewal within the next 30 days.*'}

#### 3. Execution Checklist
1. **Automated Pro-Forma Generation:** Authorize the Renewal Agent to draft renewal invoices into the Approval Queue.
2. **Executive Outreach:** For contracts > LKR 100,000, schedule an account manager courtesy call 14 days prior to expiry.
3. **Zero Turnstile Interruption:** Verify client payment confirmation before the auto-lock milestone date to ensure uninterrupted gate operation.`;

    } else if (lowerInquiry.includes('hardware') || lowerInquiry.includes('inventory') || lowerInquiry.includes('stock') || lowerInquiry.includes('turnstile') || lowerInquiry.includes('safety')) {
      // 3. DEDICATED HARDWARE & INVENTORY AUDIT
      dynamicOutput = `### ⚡ Hardware Health & Safety Stock Audit
*Physical Infrastructure & Turnstile Spares Readiness*

#### 1. Critical Stock Levels
* **Low-Stock Inventory SKUs:** **${inventory.length}** items currently at or below safety stock.
* **Operational Risk:** Turnstile repair delays if core RFID or motor controller spares deplete.

#### 2. Critical Parts Needing Restock
${inventory.length > 0 ? inventory.slice(0, 5).map((item, i) => {
  const name = item.name || item.item_name || 'Spare Part';
  const qty = item.stock ?? item.quantity ?? 0;
  const min = item.minStock ?? item.min_stock ?? 5;
  return `${i + 1}. **${name}** — Current Stock: **${qty}** (Minimum Safety: **${min}**)\n   *Action:* Generate procurement order with primary hardware supplier.`;
}).join('\n') : '*All hardware items and turnstile components meet safe stock thresholds.*'}

#### 3. Recommended Field Actions
1. **Supplier Purchase Orders:** Dispatch PO requests for low-stock controller boards.
2. **Cloud Push Turnstile Audit:** Check Cloud-Push portal for any offline turnstile gates with >48 hours sync latency.`;

    } else if (lowerInquiry.includes('lead') || lowerInquiry.includes('crm') || lowerInquiry.includes('sales') || lowerInquiry.includes('pipeline')) {
      // 4. DEDICATED CRM PIPELINE ACCELERATION
      dynamicOutput = `### 🎯 CRM Pipeline & Untouched Leads Acceleration
*Sales Conversion & Lead Reactivation*

#### 1. Inactivity Signals
* **Untouched Leads (>3 Days):** **${leads.length}** prospects with no recent touchpoints.
* **Pipeline Attrition Risk:** High risk of cold abandonment if response time exceeds 72 hours.

#### 2. Priority Follow-Up Targets
${leads.length > 0 ? leads.slice(0, 5).map((l, i) => {
  const name = l.name || l.company || l.contactPerson || 'Lead';
  const stage = l.stage || l.status || 'Active';
  return `${i + 1}. **${name}** (Stage: *${stage}*)\n   *Action:* Assign immediate sales follow-up task via CRM Follow-Up Agent.`;
}).join('\n') : '*All active CRM leads have been contacted within the last 48 hours.*'}

#### 3. Action Plan
1. **Automated Task Assignment:** Dispatch reminders to designated account reps for stagnant leads.
2. **Re-engagement Email/SMS:** Send product brochure or turnstile demo invitation.`;

    } else {
      // 5. COMPREHENSIVE MORNING EXECUTIVE BRIEFING
      const topDebtor = (debtors || [])[0];
      dynamicOutput = `### 🎯 Seynex Executive Intelligence Briefing
*Holistic Business Overview — Revenue, Retention & Operations*

---

#### 1. 💰 Cash Flow & Debt Recovery
* **Outstanding Debtors Pipeline:** **LKR ${overdueTotal.toLocaleString()}** across **${debtors.length}** invoices.
* **Top Debtor Priority:** ${topDebtor ? `Invoice **#${topDebtor.invoiceNumber || topDebtor.number || 'N/A'}** for **${topDebtor.clientName || topDebtor.prospectName || 'Client'}** (LKR ${Number(topDebtor.balance || topDebtor.amount || 0).toLocaleString()}) is overdue.` : 'No critical overdue accounts.'}
* **Action:** Dispatch tokenized SMS payment links to accounts over 7 days.

---

#### 2. 🔄 Subscriptions & Annual Renewals
* **30-Day Expiry Horizon:** **${renewals.length}** client subscriptions due for renewal.
* **Projected Renewal ARR:** **LKR ${renewalArr.toLocaleString()}**.
* **Action:** Approve pro-forma renewal invoices in the Autonomous Agents queue.

---

#### 3. ⚡ Operational Health & Sales Pacing
* **CRM Inactivity:** **${leads.length}** sales leads untouched for >3 days.
* **Hardware Spares:** **${inventory.length}** inventory items below safety stock.
* **Action:** Review **Autonomous Agents → Pending Approvals** to authorize pending actions.`;
    }

    return response.status(200).json({
      ok: true,
      source: 'seynex-dynamic-engine (Built-in Dynamic Fallback)',
      briefing: warningHeader + dynamicOutput,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Copilot Error]:', error.stack || error.message);
    return response.status(500).json({
      ok: false,
      code: 'COPILOT_ERROR',
      message: error.message
    });
  }
}
