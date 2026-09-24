import { FIREBASE_AUTH_STATE } from '../constants/actionTypes';

const firebaseAuthStateChanged = (user) => ({
  type: FIREBASE_AUTH_STATE.SET,
  payload: user
    ? {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        emailVerified: !!user.emailVerified,
      }
    : null,
});

export default firebaseAuthStateChanged;
