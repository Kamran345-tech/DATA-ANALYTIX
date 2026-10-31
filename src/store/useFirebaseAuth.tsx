import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged, 
  User,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { doc, setDoc, getDocs, collection, query } from 'firebase/firestore';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('acuitybi_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // If logged in, clear guest mode
        try {
          sessionStorage.removeItem('acuitybi_guest_mode');
        } catch {}
        setIsGuestMode(false);

        // Sync user profile document in Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || 'Analyst',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastLoginAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          } catch (e) {
            console.error('Handled user profile sync note', e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const enterAsGuest = () => {
    try {
      sessionStorage.setItem('acuitybi_guest_mode', 'true');
    } catch {}
    setIsGuestMode(true);
  };

  const exitGuestMode = () => {
    try {
      sessionStorage.removeItem('acuitybi_guest_mode');
    } catch {}
    setIsGuestMode(false);
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
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
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
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
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName) {
        await updateProfile(res.user, { displayName });
      }
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
    try {
      await sendPasswordResetEmail(auth, emailToReset);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setAuthError(err?.message || 'Failed to send password reset email');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    } finally {
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
    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      throw new Error('Please sign in to save your dashboard to the cloud.');
    }

    const uid = auth.currentUser.uid;
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

      await setDoc(doc(db, 'users', uid, 'dashboards', dashboardId), payload);
      return payload;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const fetchUserDashboards = async (): Promise<SavedCloudDashboard[]> => {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    const collPath = `users/${uid}/dashboards`;

    try {
      const q = query(collection(db, 'users', uid, 'dashboards'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as SavedCloudDashboard);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collPath);
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
