// Server-Side Executive AI Copilot Endpoint
// Endpoint: /api/agents/copilot.js
// Supports 100% Free AI Providers:
// 1. Google Gemini 1.5/2.0 Flash (Free tier via Google AI Studio)
// 2. Groq Cloud LLaMA 3.3 70B (Free tier via console.groq.com)
// 3. OpenRouter Free Models (openrouter.ai)
// 4. Built-in Deterministic Algorithmic Engine (100% free, zero-config, zero-network)

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, message: 'Method Not Allowed. POST required.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
    const { prompt = '', context = {}, customApiKey = '', customProvider = 'auto' } = body;

    // Resolve API keys (Priority: Environment Variables, then forwarded client key)
    const geminiKey = process.env.GEMINI_API_KEY || (customProvider === 'gemini' ? customApiKey : '');
    const groqKey = process.env.GROQ_API_KEY || (customProvider === 'groq' ? customApiKey : '');
    const openrouterKey = process.env.OPENROUTER_API_KEY || (customProvider === 'openrouter' ? customApiKey : '');

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

    const systemPrompt = `You are the Seynex Executive AI Copilot for Seynex Technology (sales management, cloud turnstiles, and biometric access control).
You advise the leadership team with sharp, revenue-focused, LKAS-compliant recommendations.

Current Live Business Context:
- Active Enterprise Clients: ${activeClientsCount}
- Total Overdue Debtors: LKR ${Number(totalOverdueAmount).toLocaleString()} across ${debtors.length} unpaid invoices
- Top Overdue Debtors: ${JSON.stringify(debtors.slice(0, 5))}
- Subscriptions Renewing within 30 Days: ${renewals.length} accounts (Projected ARR: LKR ${Number(totalRenewalArr).toLocaleString()})
- Untouched CRM Leads: ${leads.length} leads requiring follow-up
- Low-Stock Inventory Items: ${inventory.length} items needing restock

Provide a strategic, executive-grade briefing or response to the user's inquiry:
"${prompt || 'Generate a comprehensive morning executive briefing with key revenue and operational priorities.'}"

Formatting Rules:
- Format in concise GitHub-flavored markdown.
- Highlight specific LKR amounts and actionable client names.
- Provide numbered priority recommendations (Immediate Action, Follow-up, Risk Mitigation).
- Keep total response within 3-4 crisp sections.`;

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
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
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
              source: 'gemini-1.5-flash (Google AI Free Tier)',
              briefing: replyText,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.warn('[Copilot] Gemini API error, attempting fallback:', e.message);
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
            temperature: 0.2,
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
        }
      } catch (e) {
        console.warn('[Copilot] Groq API error, attempting fallback:', e.message);
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
    // PROVIDER 4: Built-in Algorithmic Executive Engine (100% Free, Zero-Config)
    // -------------------------------------------------------------------------
    const overdueTotal = Number(totalOverdueAmount || 0);
    const renewalArr = Number(totalRenewalArr || 0);

    const topDebtor = (debtors || [])[0];

    const algorithmicBriefing = `### 🎯 Seynex Executive Intelligence Briefing
*Generated by Seynex On-Premise Engine (Zero-Cost / 100% Free)*

---

#### 1. 💰 Cash Flow & Debt Recovery Alert
* **Outstanding Debtors Pipeline:** **LKR ${overdueTotal.toLocaleString()}** across **${debtors.length}** overdue invoices.
* **Critical Priority:** ${topDebtor ? `Invoice **#${topDebtor.invoiceNumber || topDebtor.number || 'N/A'}** for **${topDebtor.clientName || topDebtor.prospectName || 'Client'}** (LKR ${Number(topDebtor.balance || topDebtor.amount || 0).toLocaleString()}) is **${topDebtor.daysOverdue || topDebtor.overdueDays || 14} days overdue**.` : 'No critical overdue debt accounts.'}
* **Immediate Action:** Trigger the **Debtors Recovery Agent** to dispatch tokenized SMS payment links to accounts exceeding 7 days.

---

#### 2. 🔄 Cloud & Turnstile Annual Renewals
* **30-Day Expiry Horizon:** **${renewals.length}** client subscriptions are due for renewal.
* **Projected Renewal ARR:** **LKR ${renewalArr.toLocaleString()}**.
* **Suggested Action:** Ensure renewal invoices are auto-drafted and sent to the **Approval Queue** before turnstile auto-lock triggers.

---

#### 3. ⚡ Operational Health & Sales Pacing
* **CRM Inactivity:** **${leads.length}** active sales leads have had zero touchpoints for >3 days.
* **Inventory Stock:** **${inventory.length}** hardware units are below minimum safety stock levels.
* **Recommendation:** Review the **Approval Queue** in the Agent Control Center to authorize pending automated outreach.`;

    return response.status(200).json({
      ok: true,
      source: 'seynex-algorithmic-engine (Free Built-in)',
      briefing: algorithmicBriefing,
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
