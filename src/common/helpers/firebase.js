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
  // telemetry collectors silently via RNFirebase v26 modular APIs so they
  // do not spin in background retries.
  try {
    const apps = typeof getApps === 'function' ? getApps() : [];
    if (!apps || apps.length === 0) {
      return;
    }
    try {
      const analyticsMod = require('@react-native-firebase/analytics');
      if (typeof analyticsMod.getAnalytics === 'function') {
        const instance = analyticsMod.getAnalytics();
        if (typeof analyticsMod.setAnalyticsCollectionEnabled === 'function') {
          Promise.resolve(
            analyticsMod.setAnalyticsCollectionEnabled(instance, false),
          ).catch(() => {});
        } else if (instance && typeof instance.setAnalyticsCollectionEnabled === 'function') {
          Promise.resolve(instance.setAnalyticsCollectionEnabled(false)).catch(
            () => {},
          );
        }
      }
    } catch (_e) {}
    try {
      const crashlyticsMod = require('@react-native-firebase/crashlytics');
      if (typeof crashlyticsMod.getCrashlytics === 'function') {
        const instance = crashlyticsMod.getCrashlytics();
        if (typeof crashlyticsMod.setCrashlyticsCollectionEnabled === 'function') {
          Promise.resolve(
            crashlyticsMod.setCrashlyticsCollectionEnabled(instance, false),
          ).catch(() => {});
        } else if (
          instance &&
          typeof instance.setCrashlyticsCollectionEnabled === 'function'
        ) {
          Promise.resolve(instance.setCrashlyticsCollectionEnabled(false)).catch(
            () => {},
          );
        }
      }
    } catch (_e) {}
    try {
      const perfMod = require('@react-native-firebase/perf');
      if (typeof perfMod.getPerformance === 'function') {
        const instance = perfMod.getPerformance();
        if (instance) {
          if (typeof instance.setPerformanceCollectionEnabled === 'function') {
            Promise.resolve(instance.setPerformanceCollectionEnabled(false)).catch(
              () => {},
            );
          } else {
            instance.dataCollectionEnabled = false;
            instance.instrumentationEnabled = false;
          }
        }
      }
    } catch (_e) {}
  } catch (_e) {}
};

const getAnalyticsModular = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const analyticsMod = require('@react-native-firebase/analytics');
    if (typeof analyticsMod.getAnalytics === 'function') {
      return {
        mod: analyticsMod,
        instance: analyticsMod.getAnalytics(),
      };
    }
  } catch (_e) {}
  return null;
};

export const logScreenView = (screenName, screenClass) => {
  try {
    const resolved = getAnalyticsModular();
    if (!resolved || !resolved.instance) {
      return;
    }
    const payload = {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    };
    if (typeof resolved.mod.logScreenView === 'function') {
      Promise.resolve(
        resolved.mod.logScreenView(resolved.instance, payload),
      ).catch(() => {});
    } else if (typeof resolved.mod.logEvent === 'function') {
      Promise.resolve(
        resolved.mod.logEvent(resolved.instance, 'screen_view', payload),
      ).catch(() => {});
    }
  } catch (_e) {}
};

export const logEvent = (eventName, params) => {
  try {
    const resolved = getAnalyticsModular();
    if (!resolved || !resolved.instance) {
      return;
    }
    if (typeof resolved.mod.logEvent === 'function') {
      Promise.resolve(
        resolved.mod.logEvent(resolved.instance, eventName, params),
      ).catch(() => {});
    }
  } catch (_e) {}
};

export const getDatabaseRef = (path) => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const dbMod = require('@react-native-firebase/database');
    if (typeof dbMod.getDatabase === 'function' && typeof dbMod.ref === 'function') {
      const db = dbMod.getDatabase();
      return dbMod.ref(db, path);
    }
  } catch (_e) {}
  return null;
};

export const pushDatabaseValue = async (path, value) => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  const dbMod = require('@react-native-firebase/database');
  if (
    typeof dbMod.getDatabase !== 'function' ||
    typeof dbMod.ref !== 'function' ||
    typeof dbMod.push !== 'function' ||
    typeof dbMod.set !== 'function'
  ) {
    throw new Error('Firebase Realtime Database modular API unavailable');
  }
  const db = dbMod.getDatabase();
  const parentRef = dbMod.ref(db, path);
  const childRef = dbMod.push(parentRef);
  await dbMod.set(childRef, value);
  return childRef;
};

export const getDatabaseServerTimestamp = () => {
  try {
    const dbMod = require('@react-native-firebase/database');
    if (typeof dbMod.serverTimestamp === 'function') {
      return dbMod.serverTimestamp();
    }
  } catch (_e) {}
  return Date.now();
};
