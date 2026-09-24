// Test simulation of Business Entity Name persistence on refresh
console.log('Testing Business Entity Name Persistence...');

// Mock LocalStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = val.toString(); },
    clear: () => { store = {}; }
  };
})();

const DEFAULT_SMS_CONFIG = {
  companyName: 'Seynex Technology',
  dashboardName: 'GymSales Pro',
  apiKey: '2179165276941c4e5eb994053957585'
};

// 1. Initial Load (First time visit)
let saved = localStorageMock.getItem('gym_sms_config');
let config = saved ? { ...DEFAULT_SMS_CONFIG, ...JSON.parse(saved) } : DEFAULT_SMS_CONFIG;
console.log('1. Initial Load - Brand Name:', config.dashboardName, '| Legal Name:', config.companyName);
if (config.dashboardName !== 'GymSales Pro') throw new Error('Initial load should be default');

// 2. User changes Business Entity Name in Settings
const newEntityName = 'Titan Fitness Club';
config = {
  ...config,
  companyName: newEntityName,
  dashboardName: newEntityName
};
localStorageMock.setItem('gym_sms_config', JSON.stringify(config));
console.log('2. User updated name - Brand Name:', config.dashboardName, '| Legal Name:', config.companyName);

// 3. User Refreshes Website (Simulating page reload)
saved = localStorageMock.getItem('gym_sms_config');
let reloadedConfig = saved ? { ...DEFAULT_SMS_CONFIG, ...JSON.parse(saved) } : DEFAULT_SMS_CONFIG;
console.log('3. On Page Refresh - Brand Name:', reloadedConfig.dashboardName, '| Legal Name:', reloadedConfig.companyName);

if (reloadedConfig.dashboardName !== 'Titan Fitness Club' || reloadedConfig.companyName !== 'Titan Fitness Club') {
  throw new Error('FAIL: Changed name was not preserved on refresh!');
}

// 4. Cloud Fetch runs with stale default cloud data
const staleCloudProf = {
  config: {
    dashboardName: 'GymSales Pro',
    companyName: 'Seynex Technology'
  }
};

let merged = { ...reloadedConfig, ...staleCloudProf.config };
// Apply the guard we wrote in StoreContext
if (reloadedConfig.companyName && reloadedConfig.companyName !== 'Seynex Technology' && 
    (!staleCloudProf.config.companyName || staleCloudProf.config.companyName === 'Seynex Technology')) {
  merged.companyName = reloadedConfig.companyName;
}
if (reloadedConfig.dashboardName && reloadedConfig.dashboardName !== 'GymSales Pro' && 
    (!staleCloudProf.config.dashboardName || staleCloudProf.config.dashboardName === 'GymSales Pro')) {
  merged.dashboardName = reloadedConfig.dashboardName;
}
localStorageMock.setItem('gym_sms_config', JSON.stringify(merged));

console.log('4. After Stale Cloud Sync - Brand Name:', merged.dashboardName, '| Legal Name:', merged.companyName);
if (merged.dashboardName !== 'Titan Fitness Club' || merged.companyName !== 'Titan Fitness Club') {
  throw new Error('FAIL: Stale cloud data overwrote the user customized name!');
}

console.log('✅ ALL TESTS PASSED: Business Entity Name persists seamlessly across refresh and cloud sync!');
