import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  verifyBeforeUpdateEmail,
  User as FirebaseUser,
  Unsubscribe
} from 'firebase/auth';
import { auth } from './config';

export const signUp = async (email: string, password: string, name: string): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });
  await user.reload();
  // Força refresh do token para que o claim "name" já esteja presente
  // na primeira chamada à API — sem isso, payload.name é null e o backend
  // usa o email como fallback.
  await user.getIdToken(true);

  return auth.currentUser || user;
};

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const updateUserName = async (name: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('Usuário não autenticado');
  await updateProfile(auth.currentUser, { displayName: name });
  await auth.currentUser.getIdToken(true);
};

export const updateUserEmail = async (newEmail: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('Usuário não autenticado');
  await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const onAuthStateChanged = (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
  return firebaseOnAuthStateChanged(auth, callback);
};
