import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';

export interface SavedCloudDashboard {
  id: string;
  ownerId: string;
  projectName: string;
  authorName?: string;
  datasetName?: string;
  rowCount?: number;
  visualCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isGuestMode: boolean;
  enterAsGuest: () => void;
  exitGuestMode: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<User>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, displayName: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveDashboardToCloud: (dashboardData: {
    projectName: string;
    authorName: string;
    datasetName: string;
    rowCount: number;
    visualCount: number;
  }) => Promise<SavedCloudDashboard | undefined>;
  fetchUserDashboards: () => Promise<SavedCloudDashboard[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FIREBASE_SESSION_KEY = 'acuitybi_has_firebase_session';

type FirebaseModules = {
  fb: typeof import('../firebase');
  fs: typeof import('firebase/firestore');
};

let firebaseModulesPromise: Promise<FirebaseModules> | null = null;

function loadFirebaseModules(): Promise<FirebaseModules> {
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = Promise.all([
      import('../firebase'),
      import('firebase/firestore')
    ]).then(([fb, fs]) => ({ fb, fs }));
  }
  return firebaseModulesPromise;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('acuitybi_guest_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [hasStoredSession] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FIREBASE_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !isGuestMode && hasStoredSession);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  const ensureAuthSubscription = useCallback(async () => {
    const { fb, fs } = await loadFirebaseModules();
    if (!authUnsubscribeRef.current) {
      authUnsubscribeRef.current = fb.onAuthStateChanged(fb.auth, async (user) => {
        setCurrentUser(user);
        setLoading(false);

        if (user) {
          try {
            sessionStorage.removeItem('acuitybi_guest_mode');
            localStorage.setItem(FIREBASE_SESSION_KEY, 'true');
          } catch {}
          setIsGuestMode(false);

          try {
            const userDocRef = fs.doc(fb.db, 'users', user.uid);
            await fs.setDoc(
              userDocRef,
              {
                uid: user.uid,
                displayName: user.displayName || 'Analyst',
                email: user.email || '',
                photoURL: user.photoURL || '',
                lastLoginAt: new Date().toISOString()
              },
              { merge: true }
            );
          } catch (err) {
            try {
              fb.handleFirestoreError(err, fb.OperationType.WRITE, `users/${user.uid}`);
            } catch (e) {
              console.error('Handled user profile sync note', e);
            }
          }
        }
      });
    }
    return { fb, fs };
  }, []);

  useEffect(() => {
    if (!isGuestMode && (hasStoredSession || isAuthModalOpen)) {
      ensureAuthSubscription().catch(() => {
        setLoading(false);
      });
    } else if (isAuthModalOpen) {
      ensureAuthSubscription().catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isGuestMode, hasStoredSession, isAuthModalOpen, ensureAuthSubscription]);

  useEffect(() => {
    return () => {
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
        authUnsubscribeRef.current = null;
      }
    };
  }, []);

  const enterAsGuest = () => {
    try {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
    } catch {}
    setIsGuestMode(true);
    setLoading(false);
  };

  const exitGuestMode = () => {
    try {
      sessionStorage.removeItem('acuitybi_guest_mode');
    } catch {}
    setIsGuestMode(false);
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    const { fb } = await ensureAuthSubscription();
    try {
      const res = await fb.signInWithPopup(fb.auth, fb.googleProvider);
      try {
        localStorage.setItem(FIREBASE_SESSION_KEY, 'true');
      } catch {}
      exitGuestMode();
      return res.user;
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthError(
          `Domain "${hostname}" is not authorized in Firebase Console yet. Please add "${hostname}" in Firebase Console > Authentication > Settings > Authorized Domains, or continue with Email/Password or Guest mode.`
        );
      } else {
        setAuthError(err?.message || 'Google sign-in failed');
      }
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const { fb } = await ensureAuthSubscription();
    try {
      const res = await fb.signInWithEmailAndPassword(fb.auth, email, pass);
      try {
        localStorage.setItem(FIREBASE_SESSION_KEY, 'true');
      } catch {}
      exitGuestMode();
      return res.user;
    } catch (err: any) {
      console.error('Email Sign-In Error:', err);
      setAuthError(err?.message || 'Email sign-in failed');
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string) => {
    setAuthError(null);
    const { fb } = await ensureAuthSubscription();
    try {
      const res = await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
      if (displayName) {
        await fb.updateProfile(res.user, { displayName });
      }
      try {
        localStorage.setItem(FIREBASE_SESSION_KEY, 'true');
      } catch {}
      exitGuestMode();
      return res.user;
    } catch (err: any) {
      console.error('Registration Error:', err);
      setAuthError(err?.message || 'Registration failed');
      throw err;
    }
  };

  const resetPassword = async (emailToReset: string) => {
    setAuthError(null);
    const { fb } = await ensureAuthSubscription();
    try {
      await fb.sendPasswordResetEmail(fb.auth, emailToReset);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setAuthError(err?.message || 'Failed to send password reset email');
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (firebaseModulesPromise) {
        const { fb } = await loadFirebaseModules();
        await fb.signOut(fb.auth);
      }
    } catch (err: any) {
      console.error('Sign-out error:', err);
    } finally {
      try {
        localStorage.removeItem(FIREBASE_SESSION_KEY);
      } catch {}
      setCurrentUser(null);
      exitGuestMode();
      setIsAuthModalOpen(false);
    }
  };

  const saveDashboardToCloud = async (dashboardData: {
    projectName: string;
    authorName: string;
    datasetName: string;
    rowCount: number;
    visualCount: number;
  }) => {
    const { fb, fs } = await ensureAuthSubscription();
    if (!fb.auth.currentUser) {
      setIsAuthModalOpen(true);
      throw new Error('Please sign in to save your dashboard to the cloud.');
    }

    const uid = fb.auth.currentUser.uid;
    const dashboardId = `dash_${Date.now()}`;
    const docPath = `users/${uid}/dashboards/${dashboardId}`;

    try {
      const payload: SavedCloudDashboard = {
        id: dashboardId,
        ownerId: uid,
        projectName: dashboardData.projectName.slice(0, 150),
        authorName: (dashboardData.authorName || 'Analyst').slice(0, 100),
        datasetName: (dashboardData.datasetName || 'Dataset').slice(0, 200),
        rowCount: dashboardData.rowCount,
        visualCount: dashboardData.visualCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await fs.setDoc(fs.doc(fb.db, 'users', uid, 'dashboards', dashboardId), payload);
      return payload;
    } catch (error) {
      fb.handleFirestoreError(error, fb.OperationType.CREATE, docPath);
    }
  };

  const fetchUserDashboards = async (): Promise<SavedCloudDashboard[]> => {
    const { fb, fs } = await ensureAuthSubscription();
    if (!fb.auth.currentUser) return [];
    const uid = fb.auth.currentUser.uid;
    const collPath = `users/${uid}/dashboards`;

    try {
      const q = fs.query(fs.collection(fb.db, 'users', uid, 'dashboards'));
      const snapshot = await fs.getDocs(q);
      return snapshot.docs.map(d => d.data() as SavedCloudDashboard);
    } catch (error) {
      fb.handleFirestoreError(error, fb.OperationType.LIST, collPath);
      return [];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isGuestMode,
        enterAsGuest,
        exitGuestMode,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authError,
        setAuthError,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        saveDashboardToCloud,
        fetchUserDashboards
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useFirebaseAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within an AuthProvider');
  }
  return context;
}
