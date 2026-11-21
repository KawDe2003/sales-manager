// Server-Side Hardened Proxy for eTechno Push API Gateway (http://83.147.38.130:666)
// Handles caller JWT verification, subpath traversal sanitization, 10s timeout, and CORS handling

export default async function handler(request, response) {
  // 1. Caller Authentication Verification (Supabase JWT or internal API key)
  const incomingAuth = request.headers['authorization'] || '';
  const apiKeyHeader = request.headers['api_key'] || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!incomingAuth && !apiKeyHeader) {
      return response.status(401).json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Missing required authentication token or API key for eTechno Gateway proxy.'
      });
    }

    if (incomingAuth.startsWith('Bearer ') && supabaseUrl && supabaseAnonKey) {
      try {
        const token = incomingAuth.replace('Bearer ', '').trim();
        const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey
          }
        });
        if (!verifyRes.ok) {
          return response.status(401).json({
            ok: false,
            code: 'INVALID_TOKEN',
            message: 'Caller authorization token is invalid or expired.'
          });
        }
      } catch {
        return response.status(401).json({
          ok: false,
          code: 'AUTH_VERIFICATION_FAILED',
          message: 'Failed to verify caller authentication status.'
        });
      }
    }
  }

  // 2. Sanitize and Normalize Subpath (Prevent Path Traversal)
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  let subpath = (request.query && request.query.subpath) || urlObj.searchParams.get('subpath') || '';

  if (!subpath) {
    subpath = urlObj.pathname.replace(/^\/api\/etechno\/?/, '/');
  }
  if (!subpath.startsWith('/')) subpath = '/' + subpath;

  // Strip path traversal attempts
  subpath = subpath.replace(/\.\./g, '').replace(/\/{2,}/g, '/');

  // Remove helper 'subpath' param from query forwarded to upstream server
  urlObj.searchParams.delete('subpath');
  const queryString = urlObj.search || '';
  const targetUrl = `http://83.147.38.130:666${subpath}${queryString}`;

  // 3. Assemble Upstream Headers
  const headers = {
    'Accept': 'application/json, text/plain, */*'
  };
  if (request.headers['authorization']) headers['authorization'] = request.headers['authorization'];
  if (request.headers['api_key']) headers['api_key'] = request.headers['api_key'];
  if (request.headers['content-type']) headers['content-type'] = request.headers['content-type'];

  // 4. Execute Upstream Request with 10-Second Abort Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    const fetchOptions = {
      method: request.method || 'GET',
      headers,
      signal: controller.signal
    };

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      fetchOptions.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    const res = await fetch(targetUrl, fetchOptions);
    const text = await res.text();

    response.status(res.status);
    response.setHeader('Content-Type', res.headers.get('content-type') || 'application/json');
    return response.send(text);
  } catch (err) {
    if (err.name === 'AbortError') {
      return response.status(504).json({
        ok: false,
        code: 'GATEWAY_TIMEOUT',
        error: 'eTechno Gateway Communication Timed Out',
        message: 'The physical biometric gateway at 83.147.38.130:666 did not respond within 10 seconds.'
      });
    }

    return response.status(502).json({
      ok: false,
      code: 'GATEWAY_ERROR',
      error: 'eTechno Gateway Communication Failed',
      message: err.message || 'Could not reach eTechno server at 83.147.38.130:666'
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
