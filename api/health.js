// System Uptime & Health Check Endpoint
export default async function handler(request, response) {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    if (supabaseUrl) {
      const dbCheckStart = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD' });
      dbLatencyMs = Date.now() - dbCheckStart;
      if (!res.ok) {
        dbStatus = 'degraded';
      }
    } else {
      dbStatus = 'unconfigured';
    }

    return response.status(200).json({
      status: dbStatus === 'healthy' ? 'OK' : 'DEGRADED',
      uptime_seconds: Math.floor(process.uptime ? process.uptime() : 0),
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs
        }
      },
      duration_ms: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Health Check Error]:', err.message);
    return response.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: 'Service check failed'
    });
  }
}
