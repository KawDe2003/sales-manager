/**
 * Cloud Push Service API Client & Monthwise Active Member Analytics
 * Integrates with eTechno Push API (http://83.147.38.130:666 / /api/etechno)
 * Postman Reference: https://documenter.getpostman.com/view/14215737/Uyxbpowh
 */

// Helper to encode Basic Auth in browser environment
export function createBasicAuthHeader(apiKey, username = '', password = '') {
  try {
    let authString = '';
    if (username && password) {
      authString = `${username}:${password}`;
    } else if (apiKey) {
      if (apiKey.includes(':')) {
        authString = apiKey;
      } else if (username) {
        authString = `${username}:${apiKey}`;
      } else {
        // Many APIs accept apiKey: or apiKey:apiKey
        authString = `${apiKey}:`;
      }
    }
    return `Basic ${btoa(authString)}`;
  } catch {
    return '';
  }
}

/**
 * Format Date to API requirement: 'YYYY-MM-DD HH:mm:ss'
 */
export function formatApiDate(date, isEnd = false) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const time = isEnd ? '23:59:59' : '00:00:00';
  return `${yyyy}-${mm}-${dd} ${time}`;
}

/**
 * Generate monthly date buckets between fromDate and toDate
 */
export function getMonthIntervals(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();
    
    // First day of month (or start date if in same month)
    const mStart = new Date(Math.max(current.getTime(), start.getTime()));
    // Last day of month
    const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const mEnd = new Date(Math.min(lastDayOfMonth.getTime(), end.getTime()));

    const monthLabel = mStart.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthShort = mStart.toLocaleString('default', { month: 'short', year: 'numeric' });
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    months.push({
      key: monthKey,
      label: monthLabel,
      shortLabel: monthShort,
      year,
      monthIndex: month,
      startDate: mStart,
      endDate: mEnd
    });

    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  return months;
}

/**
 * Split a date range into chunks of maxDays (API max 10 days constraint)
 */
export function chunkDateRange(startDate, endDate, maxDays = 9) {
  const chunks = [];
  let currStart = new Date(startDate);
  const finalEnd = new Date(endDate);

  while (currStart <= finalEnd) {
    const currEnd = new Date(currStart);
    currEnd.setDate(currEnd.getDate() + maxDays);
    const effectiveEnd = currEnd > finalEnd ? new Date(finalEnd) : currEnd;

    chunks.push({
      from: formatApiDate(currStart, false),
      to: formatApiDate(effectiveEnd, true)
    });

    currStart = new Date(effectiveEnd);
    currStart.setDate(currStart.getDate() + 1);
  }

  return chunks;
}

/**
 * Fetch Terminal Info & Status
 */
export async function getTerminalStatus({ baseUrl = '/api/etechno', accNo, serialNo, apiKey, username, password }) {
  const authHeader = createBasicAuthHeader(apiKey, username || accNo, password);
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (authHeader) headers['Authorization'] = authHeader;
  if (apiKey) headers['api_key'] = apiKey;

  const url = `${baseUrl.replace(/\/$/, '')}/v2/terminal_status/?terminal_serial=${encodeURIComponent(serialNo || '')}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`Terminal Status API Error: HTTP ${res.status} (${res.statusText})`);
  }
  return await res.json();
}

/**
 * Fetch Users assigned to Terminal / Account
 */
export async function getTerminalUsers({ baseUrl = '/api/etechno', accNo, serialNo, apiKey, username, password }) {
  const authHeader = createBasicAuthHeader(apiKey, username || accNo, password);
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (authHeader) headers['Authorization'] = authHeader;
  if (apiKey) headers['api_key'] = apiKey;

  // Try terminal_user first, fallback to user
  const url = `${baseUrl.replace(/\/$/, '')}/v2/terminal_user/?terminal_serial=${encodeURIComponent(serialNo || '')}&push_acc=${encodeURIComponent(accNo || '1')}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    // Try general user endpoint
    const fallbackUrl = `${baseUrl.replace(/\/$/, '')}/v2/user/?push_acc=${encodeURIComponent(accNo || '1')}&filter=pin&value=`;
    const fbRes = await fetch(fallbackUrl, { method: 'GET', headers });
    if (!fbRes.ok) {
      throw new Error(`Failed to fetch users: HTTP ${res.status}`);
    }
    return await fbRes.json();
  }
  return await res.json();
}

/**
 * Fetch transactions for a specific 10-day chunk
 */
export async function getTransactionsChunk({ baseUrl = '/api/etechno', accNo, serialNo, fromDate, toDate, apiKey, username, password }) {
  const authHeader = createBasicAuthHeader(apiKey, username || accNo, password);
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (authHeader) headers['Authorization'] = authHeader;
  if (apiKey) headers['api_key'] = apiKey;

  const url = `${baseUrl.replace(/\/$/, '')}/v2/transaction_date/?push_acc=${encodeURIComponent(accNo || '1')}&terminal_serial=${encodeURIComponent(serialNo || '')}&pin=&from_date=${encodeURIComponent(fromDate)}&to_Date=${encodeURIComponent(toDate)}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`Transaction API Error: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Primary Analysis Engine:
 * Fetches all transactions and users monthwise across the date range,
 * calculates active users per month, and produces billing breakdown.
 */
export async function calculateMonthwiseActiveUsers({
  baseUrl = '/api/etechno',
  accNo = '1',
  serialNo = '',
  apiKey = '',
  username = '',
  password = '',
  fromDate,
  toDate,
  ratePerUserMonth = 100,
  onProgress = null
}) {
  const months = getMonthIntervals(fromDate, toDate);
  if (months.length === 0) {
    throw new Error('Invalid date range. Please select valid From and To dates.');
  }

  let terminalUsers = [];
  try {
    const userRes = await getTerminalUsers({ baseUrl, accNo, serialNo, apiKey, username, password });
    if (Array.isArray(userRes)) {
      terminalUsers = userRes;
    } else if (userRes?.user_list && Array.isArray(userRes.user_list)) {
      terminalUsers = userRes.user_list;
    } else if (userRes?.data && Array.isArray(userRes.data)) {
      terminalUsers = userRes.data;
    }
  } catch (err) {
    console.warn('Could not fetch enrolled user roster:', err.message);
  }

  const totalEnrolled = terminalUsers.length || 0;
  const activeEnrolled = terminalUsers.filter(u => u.status === true || u.status === 1 || u.active === true).length || totalEnrolled;

  const monthResults = [];
  const allUniqueActivePins = new Set();
  const allPunchLogs = [];

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    if (onProgress) {
      onProgress({
        currentMonth: m.label,
        progressIndex: i + 1,
        totalMonths: months.length,
        percentage: Math.round(((i + 1) / months.length) * 100)
      });
    }

    const chunks = chunkDateRange(m.startDate, m.endDate, 8);
    const monthActivePins = new Set();
    let monthPunchCount = 0;

    for (const chunk of chunks) {
      try {
        const transRes = await getTransactionsChunk({
          baseUrl,
          accNo,
          serialNo,
          fromDate: chunk.from,
          toDate: chunk.to,
          apiKey,
          username,
          password
        });

        let transactions = [];
        if (Array.isArray(transRes)) {
          transactions = transRes;
        } else if (transRes?.data && Array.isArray(transRes.data)) {
          transactions = transRes.data;
        } else if (transRes?.transactions && Array.isArray(transRes.transactions)) {
          transactions = transRes.transactions;
        }

        transactions.forEach(t => {
          const pin = t.pin || t.PIN || t.user_id || t.userId;
          if (pin !== undefined && pin !== null && String(pin).trim() !== '') {
            monthActivePins.add(String(pin));
            allUniqueActivePins.add(String(pin));
          }
          monthPunchCount++;
          allPunchLogs.push(t);
        });
      } catch (err) {
        console.warn(`Chunk failed for ${chunk.from} to ${chunk.to}:`, err.message);
      }
    }

    // Determine active member count for this month
    // If transaction records exist, count unique pins who punched in this month.
    // If no transactions logged for this month, fallback to active enrolled users
    const uniquePunchUsers = monthActivePins.size;
    const activeCount = uniquePunchUsers > 0 ? uniquePunchUsers : activeEnrolled;
    const inactiveCount = Math.max(0, totalEnrolled - activeCount);
    const monthlyFee = activeCount * Number(ratePerUserMonth || 0);

    monthResults.push({
      key: m.key,
      monthLabel: m.label,
      shortLabel: m.shortLabel,
      year: m.year,
      startDate: m.startDate.toISOString().split('T')[0],
      endDate: m.endDate.toISOString().split('T')[0],
      totalEnrolled: totalEnrolled || activeCount,
      activeUsers: activeCount,
      uniquePunches: uniquePunchUsers,
      totalPunches: monthPunchCount,
      inactiveUsers: inactiveCount,
      ratePerUser: Number(ratePerUserMonth || 0),
      monthlyFee: monthlyFee
    });
  }

  // Calculate Overall Metrics
  const totalMonths = monthResults.length;
  const totalActiveSum = monthResults.reduce((acc, m) => acc + m.activeUsers, 0);
  const averageMonthlyActive = totalMonths > 0 ? Math.round(totalActiveSum / totalMonths) : 0;
  const peakActiveUsers = Math.max(...monthResults.map(m => m.activeUsers), 0);
  const minActiveUsers = Math.min(...monthResults.map(m => m.activeUsers), 0);
  const totalAnnualFee = monthResults.reduce((acc, m) => acc + m.monthlyFee, 0);

  return {
    success: true,
    accNo,
    serialNo,
    fromDate,
    toDate,
    ratePerUserMonth: Number(ratePerUserMonth || 0),
    totalMonths,
    totalEnrolledUsers: totalEnrolled,
    activeEnrolledUsers: activeEnrolled,
    allUniqueActiveMembers: allUniqueActivePins.size,
    averageMonthlyActive,
    peakActiveUsers,
    minActiveUsers,
    totalAnnualFee,
    monthResults,
    enrolledUsers: terminalUsers
  };
}

/**
 * Generate Realistic Simulated Data for Testing / Demonstration
 * Useful if the user needs to preview before connecting hardware or while off-site
 */
export function generateSimulatedMonthwiseData({
  accNo = '1',
  serialNo = 'ZKE8012557894',
  fromDate = '2025-01-01',
  toDate = '2025-12-31',
  ratePerUserMonth = 100,
  baseEnrolled = 65
}) {
  const months = getMonthIntervals(fromDate, toDate);
  const monthResults = [];

  let currentEnrolled = Number(baseEnrolled) || 50;
  
  // Growth curve with seasonal fluctuations
  const multipliers = [0.82, 0.85, 0.88, 0.91, 0.94, 0.92, 0.95, 0.97, 0.99, 1.02, 1.04, 1.06];

  months.forEach((m, idx) => {
    // Members increase slightly over the year
    currentEnrolled += Math.floor(Math.random() * 3);
    const mult = multipliers[idx % multipliers.length];
    const active = Math.min(currentEnrolled, Math.max(10, Math.round(currentEnrolled * mult)));
    const totalPunches = active * (18 + Math.floor(Math.random() * 12));
    const monthlyFee = active * Number(ratePerUserMonth || 0);

    monthResults.push({
      key: m.key,
      monthLabel: m.label,
      shortLabel: m.shortLabel,
      year: m.year,
      startDate: m.startDate.toISOString().split('T')[0],
      endDate: m.endDate.toISOString().split('T')[0],
      totalEnrolled: currentEnrolled,
      activeUsers: active,
      uniquePunches: active,
      totalPunches,
      inactiveUsers: Math.max(0, currentEnrolled - active),
      ratePerUser: Number(ratePerUserMonth || 0),
      monthlyFee
    });
  });

  const totalMonths = monthResults.length;
  const totalActiveSum = monthResults.reduce((acc, m) => acc + m.activeUsers, 0);
  const averageMonthlyActive = totalMonths > 0 ? Math.round(totalActiveSum / totalMonths) : 0;
  const peakActiveUsers = Math.max(...monthResults.map(m => m.activeUsers), 0);
  const minActiveUsers = Math.min(...monthResults.map(m => m.activeUsers), 0);
  const totalAnnualFee = monthResults.reduce((acc, m) => acc + m.monthlyFee, 0);

  return {
    success: true,
    isSimulated: true,
    accNo,
    serialNo,
    fromDate,
    toDate,
    ratePerUserMonth: Number(ratePerUserMonth || 0),
    totalMonths,
    totalEnrolledUsers: currentEnrolled,
    activeEnrolledUsers: averageMonthlyActive,
    allUniqueActiveMembers: currentEnrolled,
    averageMonthlyActive,
    peakActiveUsers,
    minActiveUsers,
    totalAnnualFee,
    monthResults,
    enrolledUsers: []
  };
}
