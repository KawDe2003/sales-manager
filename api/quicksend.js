export default async function handler(request, response) {
  const { FUN } = request.query;
  const targetUrl = `https://quicksend.lk/Client/api.php?FUN=${FUN}`;
  
  try {
    const authHeader = request.headers['authorization'];
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.body)
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
    console.error('Proxy Error:', error);
    return response.status(500).json({ error: 'Failed to proxy request', details: error.message });
  }
}
