// System Uptime, Readiness & Health Diagnostics Endpoint
export default async function handler(request, response) {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    // 1. Database Connectivity & Roundtrip Latency Probe
    if (supabaseUrl) {
      const dbCheckStart = Date.now();
      try {
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, { 
          method: 'HEAD',
          headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY || ''
          }
        });
        dbLatencyMs = Date.now() - dbCheckStart;
        if (!res.ok && res.status !== 401) {
          dbStatus = 'degraded';
        }
      } catch {
        dbStatus = 'unreachable';
      }
    } else {
      dbStatus = 'unconfigured';
    }

    // 2. Telephony Gateway Configuration Readiness
    const quicksendConfigured = Boolean(
      process.env.QUICKSEND_API_USER && 
      process.env.QUICKSEND_API_KEY
    );

    // 3. Biometric Hardware Gateway (83.147.38.130:666) Non-Blocking Probe (3-second timeout)
    let etechnoStatus = 'unreachable';
    let etechnoLatencyMs = 0;
    try {
      const eStart = Date.now();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const eRes = await fetch('http://83.147.38.130:666/v2/terminal/', { 
        method: 'HEAD', 
        signal: ctrl.signal 
      });
      clearTimeout(tid);
      etechnoLatencyMs = Date.now() - eStart;
      etechnoStatus = (eRes.ok || eRes.status === 401 || eRes.status === 404) ? 'reachable' : 'degraded';
    } catch {
      etechnoStatus = 'unreachable';
    }

    return response.status(200).json({
      status: (dbStatus === 'healthy' || dbStatus === 'unconfigured') ? 'OK' : 'DEGRADED',
      uptime_seconds: Math.floor(process.uptime ? process.uptime() : 0),
      timestamp: new Date().toISOString(),
      readiness: {
        databaseConfigured: Boolean(supabaseUrl),
        quicksendConfigured,
        etechnoGatewayReachable: etechnoStatus === 'reachable'
      },
      services: {
        api: 'operational',
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs
        },
        telecom_quicksend: {
          configured: quicksendConfigured,
          rateLimitActive: true
        },
        biometric_etechno: {
          status: etechnoStatus,
          latency_ms: etechnoLatencyMs
        }
      },
      duration_ms: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Health Check Error]:', err.message);
    return response.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: 'Service diagnostics check failed'
    });
  }
}
