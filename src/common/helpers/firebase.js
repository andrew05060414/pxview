import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const usersCollection = () => firestore().collection('users');

export const saveUserProfile = async (user) => {
  if (!user) {
    throw new Error('A Firebase user is required to save a profile.');
  }

  const profileRef = usersCollection().doc(user.uid);
  const profileSnapshot = await profileRef.get();
  const profile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };
  if (!profileSnapshot.exists) {
    profile.createdAt = firestore.FieldValue.serverTimestamp();
  }
  await profileRef.set(profile, { merge: true });
};

export const signInWithEmail = async (email, password) => {
  const credential = await auth().signInWithEmailAndPassword(
    email.trim(),
    password,
  );
  await saveUserProfile(credential.user);
  return credential.user;
};

export const signUpWithEmail = async (email, password, displayName) => {
  const credential = await auth().createUserWithEmailAndPassword(
    email.trim(),
    password,
  );

  if (displayName && credential.user.updateProfile) {
    await credential.user.updateProfile({ displayName: displayName.trim() });
  }

  await saveUserProfile(credential.user);
  return credential.user;
};

export const sendPasswordReset = (email) =>
  auth().sendPasswordResetEmail(email.trim());

export const signOut = () => auth().signOut();

export const currentFirebaseUser = () => auth().currentUser;
