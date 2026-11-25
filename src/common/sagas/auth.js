import {
  take,
  call,
  apply,
  put,
  race,
  select,
  fork,
  cancel,
  delay,
} from 'redux-saga/effects';
import { DeviceEventEmitter } from 'react-native';
import moment from 'moment';
import { REHYDRATE } from 'redux-persist';
import { FOREGROUND, BACKGROUND } from '../store/appStateEnhancer';
import {
  login,
  loginSuccess,
  loginFailure,
  signUpSuccess,
  signUpFailure,
  logout,
  refreshAccessToken,
  refreshAccessTokenSuccess,
  refreshAccessTokenFailure,
  rehydrateSuccess,
} from '../actions/auth';
import { setLanguage } from '../actions/i18n';
import { addError } from '../actions/error';
import pixiv from '../helpers/apiClient';
import i18n from '../helpers/i18n';
import { getAuth, getAuthUser, getLang } from '../selectors';
import {
  AUTH_LOGIN,
  AUTH_SIGNUP,
  AUTH_LOGOUT,
  AUTH_REFRESH_ACCESS_TOKEN,
} from '../constants/actionTypes';

const setProvisionalAccountOptions = (isProvisionalAccount, password) => ({
  isProvisionalAccount,
  password: isProvisionalAccount ? password : null,
});

export function* authorize(code, codeVerifier) {
  // use apply instead of call to pass this to function
  const loginResponse = yield apply(pixiv, pixiv.tokenRequest, [
    code,
    codeVerifier,
  ]);
  const options = setProvisionalAccountOptions(false);
  yield put(loginSuccess(loginResponse, options));
  return loginResponse;
}

export const isInvalidCredentialsError = (err) => {
  if (!err || typeof err !== 'object') {
    return false;
  }
  if (err.error === 'invalid_grant') {
    return true;
  }
  const sysCode = err.errors && err.errors.system && err.errors.system.code;
  if (sysCode === 1508) {
    return true;
  }
  const msg =
    (err.errors && err.errors.system && err.errors.system.message) ||
    err.error_description ||
    err.message ||
    '';
  return /invalid[_\s-]?grant|invalid refresh token|refresh token.*(invalid|expired|revoked)/i.test(
    String(msg),
  );
};

export function notifySessionExpired() {
  if (DeviceEventEmitter && typeof DeviceEventEmitter.emit === 'function') {
    DeviceEventEmitter.emit(
      'showToast',
      i18n?.sessionExpiredRelogin || 'Session expired, please log in again',
    );
  }
}

export function* handleRefreshAccessToken(refreshToken) {
  try {
    const response = yield apply(pixiv, pixiv.refreshAccessToken, [
      refreshToken,
    ]);
    const user = yield select(getAuthUser);
    const options = setProvisionalAccountOptions(
      user?.isProvisionalAccount,
      user?.password,
    );

    yield put(refreshAccessTokenSuccess(response, options));
    return response;
  } catch (err) {
    yield put(refreshAccessTokenFailure());
    if (isInvalidCredentialsError(err)) {
      yield call(notifySessionExpired);
      yield put(logout());
    }
  }
  return null;
}

export function* scheduleRefreshAccessToken(refreshToken, delayMilisecond) {
  if (delayMilisecond > 0) {
    yield delay(delayMilisecond);
  }
  yield put(refreshAccessToken(refreshToken));
  const result = yield take([
    AUTH_REFRESH_ACCESS_TOKEN.SUCCESS,
    AUTH_REFRESH_ACCESS_TOKEN.FAILURE,
    AUTH_LOGOUT.SUCCESS,
  ]);
  return result;
}

const MAX_REFRESH_RETRY_DELAY_MS = 5 * 60 * 1000;
const BASE_REFRESH_RETRY_DELAY_MS = 30 * 1000;

export function* refreshAccessTokenOnExpiry(authResponse) {
  const initialExpiresIn =
    authResponse?.expires_in ?? authResponse?.expiresIn;
  if (!authResponse || typeof initialExpiresIn !== 'number') {
    yield take(AUTH_LOGOUT.SUCCESS);
    return;
  }
  // refresh token 5 min before expire
  // convert expires in to milisecond
  let delayMilisecond = (initialExpiresIn - 300) * 1000;
  let failureCount = 0;
  while (true) {
    const authUser = yield select(getAuthUser);
    if (authUser) {
      // cancel scheduleRefreshAccessToken if app state changed to background
      const { background, refreshResult } = yield race({
        background: take(BACKGROUND),
        refreshResult: call(
          scheduleRefreshAccessToken,
          authUser.refreshToken,
          delayMilisecond,
        ),
      });
      // wait for app back to foreground before scheduleRefreshAccessToken
      if (background && background.type === BACKGROUND) {
        yield take(FOREGROUND);
        const auth = yield select(getAuth);
        const now = moment();
        const end = moment(auth.timestamp);
        const duration = moment.duration(now.diff(end));
        const ms = duration.asMilliseconds();
        delayMilisecond -= ms;
      } else if (refreshResult && refreshResult.type === AUTH_LOGOUT.SUCCESS) {
        return;
      } else if (
        refreshResult &&
        refreshResult.type === AUTH_REFRESH_ACCESS_TOKEN.SUCCESS
      ) {
        failureCount = 0;
        const nextExpiresIn = refreshResult.payload?.user?.expiresIn;
        delayMilisecond =
          typeof nextExpiresIn === 'number'
            ? (nextExpiresIn - 300) * 1000
            : MAX_REFRESH_RETRY_DELAY_MS;
      } else {
        const retryDelayMs = Math.min(
          BASE_REFRESH_RETRY_DELAY_MS * 2 ** failureCount,
          MAX_REFRESH_RETRY_DELAY_MS,
        );
        failureCount += 1;
        const { refreshed, loggedOut } = yield race({
          refreshed: take(AUTH_REFRESH_ACCESS_TOKEN.SUCCESS),
          loggedOut: take(AUTH_LOGOUT.SUCCESS),
          retryTimer: delay(retryDelayMs),
        });
        if (loggedOut) {
          return;
        }
        if (refreshed) {
          failureCount = 0;
          const nextExpiresIn = refreshed.payload?.user?.expiresIn;
          delayMilisecond =
            typeof nextExpiresIn === 'number'
              ? (nextExpiresIn - 300) * 1000
              : MAX_REFRESH_RETRY_DELAY_MS;
        } else {
          // Retry immediately on next loop iteration after backoff expires
          delayMilisecond = 0;
        }
      }
    } else {
      return;
    }
  }
}

export function* handleLogout() {
  yield apply(pixiv, pixiv.logout);
}

export function* watchTokenExpiryTask() {
  let expiryTask = null;
  while (true) {
    const action = yield take([
      AUTH_LOGIN.SUCCESS,
      AUTH_REFRESH_ACCESS_TOKEN.SUCCESS,
      AUTH_LOGOUT.SUCCESS,
    ]);
    if (expiryTask) {
      yield cancel(expiryTask);
      expiryTask = null;
    }
    if (action.type === AUTH_LOGOUT.SUCCESS) {
      yield call(handleLogout);
    } else if (action.payload && action.payload.user) {
      expiryTask = yield fork(refreshAccessTokenOnExpiry, action.payload.user);
    }
  }
}

export function* watchTokenExpiry() {
  while (true) {
    const expiryWatcherTask = yield fork(watchTokenExpiryTask);
    yield take(AUTH_LOGIN.STOP);
    yield cancel(expiryWatcherTask);
  }
}

export function* watchLoginRequestTask() {
  while (true) {
    try {
      const action = yield take(AUTH_LOGIN.REQUEST);
      const { code, codeVerifier } = action.payload;
      yield call(authorize, code, codeVerifier);
      yield take(AUTH_LOGOUT.SUCCESS);
      // user logged out, next while iteration will wait for the
      // next AUTH_LOGIN.REQUEST action
    } catch (err) {
      const errMessage =
        err.errors && err.errors.system && err.errors.system.message
          ? err.errors.system.message
          : '';
      yield put(loginFailure());
      yield put(addError(errMessage));
    }
  }
}

export function* watchLoginRequest() {
  while (true) {
    const loginRequestTask = yield fork(watchLoginRequestTask);
    yield take(AUTH_LOGIN.STOP);
    yield cancel(loginRequestTask);
  }
}

export function* watchRefreshAccessTokenRequestTask() {
  while (true) {
    try {
      const action = yield take(AUTH_REFRESH_ACCESS_TOKEN.REQUEST);
      const { refreshToken } = action.payload;
      const authUser = yield select(getAuthUser);
      if (
        !authUser ||
        !authUser.refreshToken ||
        (refreshToken && authUser.refreshToken !== refreshToken)
      ) {
        // eslint-disable-next-line no-continue
        continue;
      }
      yield call(handleRefreshAccessToken, authUser.refreshToken);
    } catch (err) {
      const errMessage =
        err.errors && err.errors.system && err.errors.system.message
          ? err.errors.system.message
          : '';
      yield put(refreshAccessTokenFailure());
      yield put(addError(errMessage));
    }
  }
}

export function* watchRefreshAccessTokenRequest() {
  while (true) {
    const refreshAccessTokenTask = yield fork(
      watchRefreshAccessTokenRequestTask,
    );
    yield take(AUTH_LOGIN.STOP);
    yield cancel(refreshAccessTokenTask);
  }
}

export function* signUp(nickname) {
  const signUpResponse = yield apply(pixiv, pixiv.createProvisionalAccount, [
    nickname,
  ]);
  yield put(signUpSuccess(signUpResponse));
  return signUpResponse;
}

export function* watchSignUpRequest() {
  while (true) {
    try {
      const action = yield take(AUTH_SIGNUP.REQUEST);
      const { nickname } = action.payload;
      const signUpResponse = yield call(signUp, nickname);
      yield put(
        login(signUpResponse.user_account, signUpResponse.password, true),
      );
    } catch (err) {
      const errMessage =
        err.errors && err.errors.system && err.errors.system.message
          ? err.errors.system.message
          : '';
      yield put(signUpFailure());
      yield put(addError(errMessage));
    }
  }
}

// wait rehydrate complete, login if authUser exist, then run other api
export function* watchRehydrate() {
  while (true) {
    try {
      yield take(REHYDRATE);
      const user = yield select(getAuthUser);
      if (user) {
        yield put(refreshAccessToken(user.refreshToken));
        yield take([
          AUTH_REFRESH_ACCESS_TOKEN.SUCCESS,
          AUTH_REFRESH_ACCESS_TOKEN.FAILURE,
          AUTH_LOGOUT.SUCCESS,
        ]);
      }
      const lang = yield select(getLang);
      yield put(setLanguage(lang));
    } catch (err) {
      // todo logout user
      // console.log('err in watchRehydrate ', err);
    } finally {
      yield put(rehydrateSuccess());
    }
  }
}

