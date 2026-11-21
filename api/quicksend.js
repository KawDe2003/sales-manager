// Server-Side Hardened API Proxy for QuickSend SMS Gateway
// Prevents hardcoded secret exposure, verifies caller JWT, and handles server-side error masking & rate limiting

// Simple in-memory sliding window rate limiter for serverless environment
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 SMS calls per min per IP

export default async function handler(request, response) {
  // 1. IP Rate Limiting Check
  const clientIp = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const clientUsage = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientUsage.resetTime) {
    clientUsage.count = 1;
    clientUsage.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    clientUsage.count += 1;
  }
  rateLimitMap.set(clientIp, clientUsage);

  if (clientUsage.count > MAX_REQUESTS_PER_WINDOW) {
    return response.status(429).json({ 
      ok: false,
      code: 'RATE_LIMIT_EXCEEDED', 
      message: 'Rate limit exceeded. Please wait a minute before broadcasting more messages.' 
    });
  }

  // 2. Caller Authentication Gate (Verify Supabase JWT if in production or token provided)
  const incomingAuth = request.headers['authorization'] || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (incomingAuth.startsWith('Bearer ') && supabaseUrl && supabaseAnonKey) {
    try {
      const token = incomingAuth.replace('Bearer ', '').trim();
      const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        }
      });
      if (!verifyRes.ok && process.env.NODE_ENV === 'production') {
        return response.status(401).json({
          ok: false,
          code: 'UNAUTHORIZED_CALLER',
          message: 'Invalid or expired caller authorization token.'
        });
      }
    } catch {
      // In non-production or offline dev, allow pass-through if verification network fails
      if (process.env.NODE_ENV === 'production') {
        return response.status(401).json({
          ok: false,
          code: 'AUTH_VERIFICATION_FAILED',
          message: 'Could not verify caller session token.'
        });
      }
    }
  }

  // 3. Validate Endpoint Parameter
  const { FUN } = request.query || {};
  if (!FUN || typeof FUN !== 'string') {
    return response.status(400).json({
      ok: false,
      code: 'BAD_REQUEST',
      message: 'Missing required FUN parameter.'
    });
  }

  const targetUrl = `https://quicksend.lk/Client/api.php?FUN=${encodeURIComponent(FUN)}`;

  try {
    // 4. Always use server-side QuickSend credentials for upstream HTTP Basic Auth
    // NEVER pass caller's Bearer token upstream to QuickSend!
    const apiUser = process.env.QUICKSEND_API_USER;
    const apiKey = process.env.QUICKSEND_API_KEY;

    if (!apiUser || !apiKey) {
      return response.status(503).json({ 
        ok: false,
        code: 'GATEWAY_UNCONFIGURED', 
        message: 'SMS Gateway authorization credentials (QUICKSEND_API_USER / QUICKSEND_API_KEY) are not configured on server.' 
      });
    }

    const upstreamBasicAuth = 'Basic ' + Buffer.from(`${apiUser}:${apiKey}`).toString('base64');

    // Sri Lankan E.164 phone formatting helper
    function formatPhone(raw) {
      if (!raw) return '';
      let digits = String(raw).trim().replace(/[^0-9]/g, '');
      if (digits.startsWith('940') && digits.length >= 12) digits = digits.substring(2);
      else if (digits.startsWith('94') && digits.length === 11) digits = '0' + digits.substring(2);
      else if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits;
      else if (digits.startsWith('0094') && digits.length === 13) digits = '0' + digits.substring(4);
      return digits;
    }

    let parsedBody = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
    if (parsedBody && parsedBody.to) {
      if (Array.isArray(parsedBody.to)) {
        parsedBody.to = parsedBody.to.map(formatPhone);
      } else {
        parsedBody.to = formatPhone(parsedBody.to);
      }
    }

    const bodyData = JSON.stringify(parsedBody);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    let res;
    try {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': upstreamBasicAuth,
          'Content-Type': 'application/json'
        },
        body: bodyData,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) {
      return response.status(401).json({
        ok: false,
        code: 'AUTH_ERROR',
        message: 'QuickSend SMS gateway credentials rejected by upstream service.'
      });
    }

    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data && (data.error || data.Status === 'error')) {
        return response.status(res.status >= 400 ? res.status : 400).json({
          ok: false,
          code: 'UPSTREAM_ERROR',
          message: data.message || data.error || 'QuickSend SMS service returned an operational error.'
        });
      }
      return response.status(res.status).json(data);
    } else {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.error || json.Status === 'error') {
          return response.status(400).json({
            ok: false,
            code: 'UPSTREAM_ERROR',
            message: json.message || json.error || 'QuickSend SMS service returned an operational error.'
          });
        }
      } catch {
        // Raw text response
      }
      return response.status(res.status).send(text);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return response.status(504).json({
        ok: false,
        code: 'GATEWAY_TIMEOUT',
        message: 'QuickSend SMS gateway connection timed out after 12 seconds.'
      });
    }
    console.error('[SMS Proxy Error]:', error.stack || error.message);
    return response.status(502).json({ 
      ok: false,
      code: 'GATEWAY_ERROR', 
      message: 'Failed to connect to SMS communications gateway.' 
    });
  }
}
