const mockGetApps = jest.fn();
const mockGetApp = jest.fn();
const mockSetAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());
const mockLogScreenView = jest.fn(() => Promise.resolve());
const mockLogEvent = jest.fn(() => Promise.resolve());
const mockSetCrashlyticsCollectionEnabled = jest.fn(() => Promise.resolve());
const mockSetPerformanceCollectionEnabled = jest.fn(() => Promise.resolve());

jest.mock('@react-native-firebase/app', () => ({
  getApps: (...args) => mockGetApps(...args),
  getApp: (...args) => mockGetApp(...args),
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  setAnalyticsCollectionEnabled: mockSetAnalyticsCollectionEnabled,
  logScreenView: mockLogScreenView,
  logEvent: mockLogEvent,
}));

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  setCrashlyticsCollectionEnabled: mockSetCrashlyticsCollectionEnabled,
}));

jest.mock('@react-native-firebase/perf', () => () => ({
  setPerformanceCollectionEnabled: mockSetPerformanceCollectionEnabled,
}));

const {
  isFirebaseConfigured,
  isPlaceholderProjectId,
  disableFirebaseCollectionIfUnconfigured,
  logScreenView,
  logEvent,
  resetFirebaseCacheForTesting,
} = require('../../src/common/helpers/firebase');

describe('firebase helper defensive guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFirebaseCacheForTesting();
  });

  it('treats missing or placeholder project IDs as unconfigured', () => {
    expect(isPlaceholderProjectId('')).toBe(true);
    expect(isPlaceholderProjectId('pxview-ci-placeholder')).toBe(true);
    expect(isPlaceholderProjectId('dummy-project')).toBe(true);
    expect(isPlaceholderProjectId('pxview-588fc')).toBe(false);
  });

  it('silently no-ops when no Firebase app is initialized', () => {
    mockGetApps.mockReturnValue([]);

    expect(isFirebaseConfigured()).toBe(false);
    disableFirebaseCollectionIfUnconfigured();
    logScreenView('Recommended');
    logEvent('Screen_Detail', { id: '1' });

    expect(mockLogScreenView).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(mockSetAnalyticsCollectionEnabled).not.toHaveBeenCalled();
  });

  it('disables native collectors when a placeholder Firebase app is present', () => {
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

    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(false);
    expect(mockSetCrashlyticsCollectionEnabled).toHaveBeenCalledWith(false);
    expect(mockSetPerformanceCollectionEnabled).toHaveBeenCalledWith(false);
    expect(mockLogScreenView).not.toHaveBeenCalled();
  });

  it('forwards analytics calls when real pxview-588fc config is active', () => {
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
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: 'Recommended',
      screen_class: 'Recommended',
    });
    expect(mockLogEvent).toHaveBeenCalledWith('Screen_Detail', { id: '42' });
  });
});
