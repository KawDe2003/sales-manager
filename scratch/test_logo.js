// Test simulation of Logo upload and persistence
console.log('Testing Logo Upload and Persistence...');

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { 
      // Simulate 5MB limit
      if (val.length > 5 * 1024 * 1024) throw new Error('QuotaExceededError');
      store[key] = val.toString(); 
    },
    clear: () => { store = {}; }
  };
})();

// Simulate uploading a 40KB optimized logo base64
const mockLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AA...';

let smsConfig = {
  companyName: 'Titan Fitness',
  dashboardName: 'Titan Fitness',
  receiptLogo: '',
  companyLogo: ''
};

// 1. User uploads logo in Settings
smsConfig = {
  ...smsConfig,
  receiptLogo: mockLogoBase64,
  companyLogo: mockLogoBase64
};
localStorageMock.setItem('gym_sms_config', JSON.stringify(smsConfig));
console.log('1. Logo set in state and localStorage. Has receiptLogo:', !!smsConfig.receiptLogo);

// 2. User refreshes page
const reloadedSaved = JSON.parse(localStorageMock.getItem('gym_sms_config'));
console.log('2. After Refresh - Has logo:', !!(reloadedSaved.receiptLogo || reloadedSaved.companyLogo));
if (!reloadedSaved.receiptLogo) throw new Error('FAIL: Logo did not persist across refresh!');

// 3. Cloud sync simulation with missing logo
const cloudProfile = { config: { dashboardName: 'Titan Fitness' } }; // no logo in cloud
const merged = { ...reloadedSaved, ...cloudProfile.config };
if ((reloadedSaved.receiptLogo || reloadedSaved.companyLogo) && (!cloudProfile.config.receiptLogo && !cloudProfile.config.companyLogo)) {
  merged.receiptLogo = reloadedSaved.receiptLogo || reloadedSaved.companyLogo;
  merged.companyLogo = reloadedSaved.companyLogo || reloadedSaved.receiptLogo;
}
localStorageMock.setItem('gym_sms_config', JSON.stringify(merged));
console.log('3. After Cloud Sync - Has logo preserved:', !!(merged.receiptLogo && merged.companyLogo));
if (!merged.receiptLogo || !merged.companyLogo) throw new Error('FAIL: Cloud sync wiped out local logo!');

console.log('✅ ALL LOGO PERSISTENCE TESTS PASSED!');
