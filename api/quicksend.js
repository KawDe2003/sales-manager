// Server-Side Hardened API Proxy for QuickSend SMS Gateway
// Prevents hardcoded secret exposure and handles server-side error masking & rate limiting

// Simple in-memory rate limiter for serverless environment
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
      error: 'Too Many Requests', 
      message: 'Rate limit exceeded. Please wait a minute before broadcasting more messages.' 
    });
  }

  // 2. Validate Endpoint Parameter
  const { FUN } = request.query;
  if (!FUN || typeof FUN !== 'string') {
    return response.status(400).json({ error: 'Bad Request', message: 'Missing required FUN parameter.' });
  }

  const targetUrl = `https://quicksend.lk/Client/api.php?FUN=${encodeURIComponent(FUN)}`;

  try {
    // Read credentials from server-side environment variables ONLY
    const apiUser = process.env.QUICKSEND_API_USER;
    const apiKey = process.env.QUICKSEND_API_KEY;

    let authHeader = request.headers['authorization'];
    if (!authHeader && apiUser && apiKey) {
      authHeader = 'Basic ' + Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
    }

    if (!authHeader) {
      return response.status(401).json({ 
        error: 'Unauthorized', 
        message: 'SMS Gateway authorization credentials not configured on server.' 
      });
    }

    const bodyData = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body || {});

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: bodyData
    });

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return response.status(res.status).json(data);
    } else {
      const text = await res.text();
      return response.status(res.status).send(text);
    }
  } catch (error) {
    // Non-leaking server-side error logging
    console.error('[SMS Proxy Error]:', error.stack || error.message);
    return response.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to connect to SMS communications gateway.' 
    });
  }
}
