import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, WHITELISTED_EMAILS } from '../config/firebase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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
        const userData: User = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Anonymous',
          photoURL: fbUser.photoURL || '',
          lastSeen: serverTimestamp() as any,
        };

        // Update user document in Firestore
        try {
          await setDoc(doc(db, 'users', fbUser.uid), userData, { merge: true });
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

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    signInWithGoogle,
    signOut,
    isWhitelisted,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
