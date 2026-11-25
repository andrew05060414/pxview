import { getApps, getApp } from '@react-native-firebase/app';

const PLACEHOLDER_PATTERN = /(placeholder|dummy|example|changeme|your[-_]?project|^ci[-_]|[-_]ci$)/i;

let cachedEnabled = null;
let safetyApplied = false;

export const isPlaceholderProjectId = (projectId) => {
  if (!projectId || typeof projectId !== 'string') {
    return true;
  }
  const trimmed = projectId.trim();
  if (!trimmed) {
    return true;
  }
  return PLACEHOLDER_PATTERN.test(trimmed);
};

export const isFirebaseConfigured = () => {
  if (cachedEnabled !== null) {
    return cachedEnabled;
  }
  try {
    const apps = typeof getApps === 'function' ? getApps() : [];
    if (!apps || apps.length === 0) {
      cachedEnabled = false;
      return false;
    }
    const app = typeof getApp === 'function' ? getApp() : apps[0];
    const options = app && app.options ? app.options : {};
    const projectId = options.projectId || options.projectID;
    const appId = options.appId || options.googleAppID;
    const apiKey = options.apiKey;
    if (
      isPlaceholderProjectId(projectId) ||
      !appId ||
      !apiKey ||
      PLACEHOLDER_PATTERN.test(String(appId)) ||
      PLACEHOLDER_PATTERN.test(String(apiKey))
    ) {
      cachedEnabled = false;
      return false;
    }
    cachedEnabled = true;
    return true;
  } catch (_e) {
    cachedEnabled = false;
    return false;
  }
};

export const resetFirebaseCacheForTesting = () => {
  cachedEnabled = null;
  safetyApplied = false;
};

export const disableFirebaseCollectionIfUnconfigured = () => {
  if (safetyApplied) {
    return;
  }
  safetyApplied = true;
  if (isFirebaseConfigured()) {
    return;
  }
  // If a placeholder FirebaseApp was auto-initialized natively, turn off
  // telemetry collectors silently so they do not spin in background retries.
  try {
    const apps = typeof getApps === 'function' ? getApps() : [];
    if (!apps || apps.length === 0) {
      return;
    }
    try {
      const analyticsModule = require('@react-native-firebase/analytics');
      const analyticsFn = analyticsModule && (analyticsModule.default || analyticsModule);
      if (typeof analyticsFn === 'function') {
        Promise.resolve(
          analyticsFn()?.setAnalyticsCollectionEnabled?.(false),
        ).catch(() => {});
      }
    } catch (_e) {}
    try {
      const crashlyticsModule = require('@react-native-firebase/crashlytics');
      const crashlyticsFn =
        crashlyticsModule && (crashlyticsModule.default || crashlyticsModule);
      if (typeof crashlyticsFn === 'function') {
        Promise.resolve(
          crashlyticsFn()?.setCrashlyticsCollectionEnabled?.(false),
        ).catch(() => {});
      }
    } catch (_e) {}
    try {
      const perfModule = require('@react-native-firebase/perf');
      const perfFn = perfModule && (perfModule.default || perfModule);
      if (typeof perfFn === 'function') {
        Promise.resolve(perfFn()?.setPerformanceCollectionEnabled?.(false)).catch(
          () => {},
        );
      }
    } catch (_e) {}
  } catch (_e) {}
};

const getAnalyticsInstance = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const analyticsModule = require('@react-native-firebase/analytics');
    const analyticsFn = analyticsModule && (analyticsModule.default || analyticsModule);
    if (typeof analyticsFn === 'function') {
      return analyticsFn();
    }
  } catch (_e) {}
  return null;
};

export const logScreenView = (screenName, screenClass) => {
  try {
    const instance = getAnalyticsInstance();
    if (instance && typeof instance.logScreenView === 'function') {
      Promise.resolve(
        instance.logScreenView({
          screen_name: screenName,
          screen_class: screenClass || screenName,
        }),
      ).catch(() => {});
    }
  } catch (_e) {}
};

export const logEvent = (eventName, params) => {
  try {
    const instance = getAnalyticsInstance();
    if (instance && typeof instance.logEvent === 'function') {
      Promise.resolve(instance.logEvent(eventName, params)).catch(() => {});
    }
  } catch (_e) {}
};

export const getDatabaseRef = (path) => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const dbModule = require('@react-native-firebase/database');
    const dbFn = dbModule && (dbModule.default || dbModule);
    if (typeof dbFn === 'function') {
      return dbFn().ref(path);
    }
  } catch (_e) {}
  return null;
};

export const getDatabaseServerTimestamp = () => {
  try {
    const dbModule = require('@react-native-firebase/database');
    const dbFn = dbModule && (dbModule.default || dbModule);
    if (dbFn && dbFn.ServerValue) {
      return dbFn.ServerValue.TIMESTAMP;
    }
  } catch (_e) {}
  return Date.now();
};
