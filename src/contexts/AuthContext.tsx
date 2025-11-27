import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, googleProvider, db, storage, WHITELISTED_EMAILS } from '../config/firebase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  isWhitelisted: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isWhitelisted = firebaseUser?.email
    ? WHITELISTED_EMAILS.includes(firebaseUser.email)
    : false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser && fbUser.email && WHITELISTED_EMAILS.includes(fbUser.email)) {
        // Fetch existing user data to get customPhotoURL
        let existingCustomPhoto: string | undefined;
        try {
          const userDoc = await getDoc(doc(db, 'duoboard_users', fbUser.uid));
          if (userDoc.exists()) {
            existingCustomPhoto = userDoc.data().customPhotoURL;
          }
        } catch (err) {
          console.error('Error fetching user document:', err);
        }

        const userData: User = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Anonymous',
          photoURL: fbUser.photoURL || '',
          customPhotoURL: existingCustomPhoto,
          lastSeen: serverTimestamp() as any,
        };

        // Update user document in Firestore
        try {
          await setDoc(doc(db, 'duoboard_users', fbUser.uid), userData, { merge: true });
          setUser(userData);
          setError(null);
        } catch (err) {
          console.error('Error updating user document:', err);
          setError('Failed to update user profile');
        }
      } else if (fbUser && fbUser.email && !WHITELISTED_EMAILS.includes(fbUser.email)) {
        setError('Your email is not authorized to use this app.');
        setUser(null);
        // Sign out unauthorized user
        await firebaseSignOut(auth);
      } else {
        setUser(null);
        setError(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email && !WHITELISTED_EMAILS.includes(result.user.email)) {
        setError('Your email is not authorized to use this app.');
        await firebaseSignOut(auth);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out. Please try again.');
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      setError('You must be signed in to upload an avatar.');
      return;
    }

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `duoboard_avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore with new custom photo URL
      await setDoc(doc(db, 'duoboard_users', user.uid), {
        customPhotoURL: downloadURL,
      }, { merge: true });

      // Update local state
      setUser(prev => prev ? { ...prev, customPhotoURL: downloadURL } : null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar. Please try again.');
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    signInWithGoogle,
    signOut,
    uploadAvatar,
    isWhitelisted,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
