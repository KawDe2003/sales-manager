// Server-Side Proxy for eTechno Push API Gateway (http://83.147.38.130:666)
// Works seamlessly on Vercel deployments and handles CORS & Basic Auth pass-through

export default async function handler(request, response) {
  // Support both direct path rewrites (/api/etechno/v2/...) and query subpath (/api/etechno?subpath=v2/...)
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  let subpath = (request.query && request.query.subpath) || urlObj.searchParams.get('subpath') || '';

  if (!subpath) {
    subpath = urlObj.pathname.replace(/^\/api\/etechno\/?/, '/');
  }
  if (!subpath.startsWith('/')) subpath = '/' + subpath;

  // Remove helper 'subpath' param from query forwarded to upstream server
  urlObj.searchParams.delete('subpath');
  const queryString = urlObj.search || '';
  const targetUrl = `http://83.147.38.130:666${subpath}${queryString}`;

  const headers = {
    'Accept': 'application/json, text/plain, */*'
  };
  if (request.headers['authorization']) headers['authorization'] = request.headers['authorization'];
  if (request.headers['api_key']) headers['api_key'] = request.headers['api_key'];
  if (request.headers['content-type']) headers['content-type'] = request.headers['content-type'];

  try {
    const fetchOptions = {
      method: request.method || 'GET',
      headers
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
    return response.status(502).json({
      error: 'eTechno Gateway Communication Failed',
      message: err.message || 'Could not reach eTechno server at 83.147.38.130:666'
    });
  }
}
