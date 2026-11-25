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
  yield delay(delayMilisecond);
  const response = yield call(handleRefreshAccessToken, refreshToken);
  return response;
}

export function* refreshAccessTokenOnExpiry(authResponse) {
  if (!authResponse || typeof authResponse.expires_in !== 'number') {
    yield take(AUTH_LOGOUT.SUCCESS);
    return;
  }
  // refresh token 5 min before expire
  // convert expires in to milisecond
  let delayMilisecond = (authResponse.expires_in - 300) * 1000;
  while (true) {
    const authUser = yield select(getAuthUser);
    if (authUser) {
      // cancel scheduleRefreshAccessToken if app state changed to background
      const { background, refreshAccessTokenResponse } = yield race({
        background: take(BACKGROUND),
        refreshAccessTokenResponse: call(
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
      } else if (
        refreshAccessTokenResponse &&
        typeof refreshAccessTokenResponse.expires_in === 'number'
      ) {
        delayMilisecond = (refreshAccessTokenResponse.expires_in - 300) * 1000;
      } else {
        const retryAction = yield take(AUTH_REFRESH_ACCESS_TOKEN.REQUEST);
        const retryResponse = yield call(
          handleRefreshAccessToken,
          retryAction.payload.refreshToken,
        );
        if (retryResponse && typeof retryResponse.expires_in === 'number') {
          delayMilisecond = (retryResponse.expires_in - 300) * 1000;
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

export function* watchLoginRequestTask() {
  while (true) {
    try {
      const action = yield take(AUTH_LOGIN.REQUEST);
      const { code, codeVerifier } = action.payload;
      const authResponse = yield call(authorize, code, codeVerifier);
      yield race([
        take(AUTH_LOGOUT.SUCCESS),
        call(refreshAccessTokenOnExpiry, authResponse),
      ]);
      yield call(handleLogout);
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
      const authResponse = yield call(handleRefreshAccessToken, refreshToken);
      if (!authResponse) {
        // eslint-disable-next-line no-continue
        continue;
      }
      yield race([
        take(AUTH_LOGOUT.SUCCESS),
        call(refreshAccessTokenOnExpiry, authResponse),
      ]);
      yield call(handleLogout);
      // user logged out, next while iteration will wait for the
      // next AUTH_REFRESH_ACCESS_TOKEN.REQUEST action
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

