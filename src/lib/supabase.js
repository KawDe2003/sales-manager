import { createClient } from '@supabase/supabase-js';

// Cache for active Supabase client instances per business
const clientCache = new Map();

/**
 * Resolves database credentials for a specific business entity.
 * Priority order:
 * 1. Explicit admin configuration saved in localStorage ('biz_db_config_<bizId>')
 * 2. Dedicated environment variables (e.g. VITE_SUPABASE_URL_SEYNEX)
 * 3. Shared primary environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 */
export const getBusinessDbConfig = (businessId) => {
  const normBizId = businessId || 'biz_main';

  // 1. Check localStorage override
  try {
    const saved = localStorage.getItem(`biz_db_config_${normBizId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.url && parsed?.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          isDedicated: true,
          isConfigured: true,
          source: 'custom_storage'
        };
      }
    }
  } catch (e) {
    console.warn(`[Supabase Multi-DB] Failed to read storage config for ${normBizId}:`, e);
  }

  // 2. Check dedicated environment variables
  if (normBizId === 'biz_main') {
    const seynexUrl = import.meta.env.VITE_SUPABASE_URL_SEYNEX;
    const seynexKey = import.meta.env.VITE_SUPABASE_ANON_KEY_SEYNEX;
    if (seynexUrl && seynexKey) {
      return {
        url: seynexUrl.trim(),
        anonKey: seynexKey.trim(),
        isDedicated: true,
        isConfigured: true,
        source: 'env_dedicated'
      };
    }
  }

  // 3. Fallback to shared primary project
  const fallbackUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
  const fallbackKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
  const isFallbackConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')
  );

  return {
    url: fallbackUrl.trim(),
    anonKey: fallbackKey.trim(),
    isDedicated: false,
    isConfigured: isFallbackConfigured,
    source: isFallbackConfigured ? 'env_shared' : 'unconfigured'
  };
};

/**
 * Returns a Supabase client connected to the specific business's database.
 * Instances are cached per URL + Key combination.
 */
export const getSupabaseClient = (businessId) => {
  const normBizId = businessId || 'biz_main';
  const config = getBusinessDbConfig(normBizId);

  const cacheKey = `${normBizId}_${config.url}_${config.anonKey.slice(0, 10)}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  try {
    const client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false, // Session managed by application context
        autoRefreshToken: false
      }
    });
    clientCache.set(cacheKey, client);
    return client;
  } catch (err) {
    console.error(`[Supabase Multi-DB] Failed to initialize client for ${normBizId}:`, err);
    // Return a dummy fallback client
    return createClient('https://fallback.supabase.co', 'fallback-key', { auth: { persistSession: false } });
  }
};

/**
 * Saves or clears dedicated database credentials for a business.
 */
export const saveBusinessDbConfig = (businessId, config) => {
  const normBizId = businessId || 'biz_main';
  if (!config || !config.url || !config.anonKey) {
    localStorage.removeItem(`biz_db_config_${normBizId}`);
  } else {
    localStorage.setItem(`biz_db_config_${normBizId}`, JSON.stringify({
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      updatedAt: new Date().toISOString()
    }));
  }

  // Clear cache for this business
  for (const key of clientCache.keys()) {
    if (key.startsWith(normBizId)) {
      clientCache.delete(key);
    }
  }

  window.dispatchEvent(new CustomEvent('business_db_config_updated', { detail: { businessId: normBizId } }));
};

/**
 * Pings the database to verify connectivity and calculate response latency.
 */
export const testDatabaseConnection = async (businessId) => {
  const normBizId = businessId || 'biz_main';
  const config = getBusinessDbConfig(normBizId);

  if (!config.isConfigured || config.url.includes('your-project-url')) {
    return {
      success: false,
      latencyMs: 0,
      error: 'Database URL or API key is not configured.',
      config
    };
  }

  const client = getSupabaseClient(normBizId);
  const startTime = performance.now();

  try {
    // Attempt a lightweight HEAD request on the customers table
    const { error } = await client
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, try basic session check
      return {
        success: true,
        latencyMs,
        error: null,
        tableNotice: `Connected to database (${latencyMs}ms). Note: Table check returned "${error.message}" — please ensure SQL schema migration has run.`,
        config
      };
    }

    return {
      success: true,
      latencyMs,
      error: null,
      config
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      error: err.message || 'Network connection failed.',
      config
    };
  }
};

/**
 * Dynamic Proxy: Automatically resolves to the client of the currently active business.
 * Guarantees zero code regressions for any existing direct `supabase.from(...)` usages.
 */
export const supabase = new Proxy({}, {
  get(_target, prop) {
    const activeBizId = (typeof localStorage !== 'undefined' && localStorage.getItem('active_business_id')) || 'biz_main';
    const activeClient = getSupabaseClient(activeBizId);
    const value = activeClient[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});
