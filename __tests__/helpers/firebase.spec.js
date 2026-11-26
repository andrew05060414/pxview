const mockGetApps = jest.fn();
const mockGetApp = jest.fn();

const mockAnalyticsInstance = { _type: 'analytics' };
const mockGetAnalytics = jest.fn(() => mockAnalyticsInstance);
const mockSetAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());
const mockLogScreenView = jest.fn(() => Promise.resolve());
const mockLogEvent = jest.fn(() => Promise.resolve());

const mockCrashlyticsInstance = { _type: 'crashlytics' };
const mockGetCrashlytics = jest.fn(() => mockCrashlyticsInstance);
const mockSetCrashlyticsCollectionEnabled = jest.fn(() => Promise.resolve());

const mockPerfInstance = {
  dataCollectionEnabled: true,
  instrumentationEnabled: true,
};
const mockGetPerformance = jest.fn(() => mockPerfInstance);

const mockDbInstance = { _type: 'database' };
const mockParentRef = { _type: 'ref', path: 'feedback' };
const mockChildRef = { _type: 'childRef', key: '-N123' };
const mockGetDatabase = jest.fn(() => mockDbInstance);
const mockRef = jest.fn(() => mockParentRef);
const mockPush = jest.fn(() => mockChildRef);
const mockSet = jest.fn(() => Promise.resolve());
const mockServerTimestamp = jest.fn(() => ({ '.sv': 'timestamp' }));

// Mock exact RNFirebase v26.4.0 modular exports (no legacy default functions).
jest.mock('@react-native-firebase/app', () => ({
  getApps: (...args) => mockGetApps(...args),
  getApp: (...args) => mockGetApp(...args),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: (...args) => mockGetAnalytics(...args),
  setAnalyticsCollectionEnabled: (...args) =>
    mockSetAnalyticsCollectionEnabled(...args),
  logScreenView: (...args) => mockLogScreenView(...args),
  logEvent: (...args) => mockLogEvent(...args),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: (...args) => mockGetCrashlytics(...args),
  setCrashlyticsCollectionEnabled: (...args) =>
    mockSetCrashlyticsCollectionEnabled(...args),
}));

jest.mock('@react-native-firebase/perf', () => ({
  getPerformance: (...args) => mockGetPerformance(...args),
}));

jest.mock('@react-native-firebase/database', () => ({
  getDatabase: (...args) => mockGetDatabase(...args),
  ref: (...args) => mockRef(...args),
  push: (...args) => mockPush(...args),
  set: (...args) => mockSet(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

const {
  isFirebaseConfigured,
  isPlaceholderProjectId,
  disableFirebaseCollectionIfUnconfigured,
  logScreenView,
  logEvent,
  getDatabaseRef,
  pushDatabaseValue,
  getDatabaseServerTimestamp,
  resetFirebaseCacheForTesting,
} = require('../../src/common/helpers/firebase');

describe('firebase helper defensive guard (RNFirebase v26 modular API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerfInstance.dataCollectionEnabled = true;
    mockPerfInstance.instrumentationEnabled = true;
    resetFirebaseCacheForTesting();
  });

  it('treats missing or placeholder project IDs as unconfigured', () => {
    expect(isPlaceholderProjectId('')).toBe(true);
    expect(isPlaceholderProjectId('pxview-ci-placeholder')).toBe(true);
    expect(isPlaceholderProjectId('dummy-project')).toBe(true);
    expect(isPlaceholderProjectId('pxview-588fc')).toBe(false);
  });

  it('silently no-ops when no Firebase app is initialized', async () => {
    mockGetApps.mockReturnValue([]);

    expect(isFirebaseConfigured()).toBe(false);
    disableFirebaseCollectionIfUnconfigured();
    logScreenView('Recommended');
    logEvent('Screen_Detail', { id: '1' });
    expect(getDatabaseRef('feedback')).toBeNull();
    await expect(pushDatabaseValue('feedback', { text: 'hi' })).rejects.toThrow(
      'Firebase is not configured',
    );

    expect(mockLogScreenView).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(mockSetAnalyticsCollectionEnabled).not.toHaveBeenCalled();
  });

  it('disables native collectors via modular APIs when a placeholder Firebase app is present', () => {
    const placeholderApp = {
      options: {
        projectId: 'pxview-ci-placeholder',
        appId: '1:123:android:abc',
        apiKey: 'AIzaSyFake',
      },
    };
    mockGetApps.mockReturnValue([placeholderApp]);
    mockGetApp.mockReturnValue(placeholderApp);

    expect(isFirebaseConfigured()).toBe(false);
    disableFirebaseCollectionIfUnconfigured();
    logScreenView('Recommended');

    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      mockAnalyticsInstance,
      false,
    );
    expect(mockSetCrashlyticsCollectionEnabled).toHaveBeenCalledWith(
      mockCrashlyticsInstance,
      false,
    );
    expect(mockPerfInstance.dataCollectionEnabled).toBe(false);
    expect(mockPerfInstance.instrumentationEnabled).toBe(false);
    expect(mockLogScreenView).not.toHaveBeenCalled();
  });

  it('forwards modular analytics and Realtime Database calls when real pxview-588fc config is active', async () => {
    const realApp = {
      options: {
        projectId: 'pxview-588fc',
        appId: '1:999:android:real',
        apiKey: 'AIzaSyRealKey123',
      },
    };
    mockGetApps.mockReturnValue([realApp]);
    mockGetApp.mockReturnValue(realApp);

    expect(isFirebaseConfigured()).toBe(true);
    disableFirebaseCollectionIfUnconfigured();
    logScreenView('Recommended');
    logEvent('Screen_Detail', { id: '42' });

    expect(mockSetAnalyticsCollectionEnabled).not.toHaveBeenCalled();
    expect(mockLogScreenView).toHaveBeenCalledWith(mockAnalyticsInstance, {
      screen_name: 'Recommended',
      screen_class: 'Recommended',
    });
    expect(mockLogEvent).toHaveBeenCalledWith(
      mockAnalyticsInstance,
      'Screen_Detail',
      { id: '42' },
    );

    expect(getDatabaseRef('feedback')).toBe(mockParentRef);
    expect(getDatabaseServerTimestamp()).toEqual({ '.sv': 'timestamp' });

    const payload = { feedback: 'Great app', createdAt: getDatabaseServerTimestamp() };
    await pushDatabaseValue('feedback', payload);
    expect(mockGetDatabase).toHaveBeenCalled();
    expect(mockRef).toHaveBeenCalledWith(mockDbInstance, 'feedback');
    expect(mockPush).toHaveBeenCalledWith(mockParentRef);
    expect(mockSet).toHaveBeenCalledWith(mockChildRef, payload);
  });
});
