// Server-Side Executive AI Copilot Endpoint
// Endpoint: /api/agents/copilot.js
// Powered by Google Gemini 1.5/2.5 Flash with deterministic algorithmic fallback

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, message: 'Method Not Allowed. POST required.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
    const { prompt = '', context = {}, mode = 'briefing' } = body;

    const apiKey = process.env.GEMINI_API_KEY;

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

    // If Gemini API Key is available, invoke Gemini Flash
    if (apiKey) {
      try {
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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] }
            ],
            generationConfig: {
              temperature: 0.2,
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
              source: 'gemini-1.5-flash',
              briefing: replyText,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[Copilot] Gemini API call degraded, falling back to algorithmic engine:', geminiErr.message);
      }
    }

    // High-Precision Algorithmic Executive Engine (Fallback when Gemini API Key is omitted or offline)
    const overdueTotal = Number(totalOverdueAmount || 0);
    const renewalArr = Number(totalRenewalArr || 0);

    const highRiskDebtors = (debtors || []).filter(d => (d.daysOverdue || d.overdueDays || 0) >= 14);
    const topDebtor = (debtors || [])[0];

    const algorithmicBriefing = `### 🎯 Seynex Executive Intelligence Briefing
*Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*

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
      source: 'algorithmic-executive-engine',
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
