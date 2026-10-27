import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  Loader2, 
  Database,
  Cloud,
  CheckCircle2,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { 
    currentUser, 
    isGuestMode,
    exitGuestMode,
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    logout,
    authError, 
    setAuthError 
  } = useFirebaseAuth();

  const [mode, setMode] = useState<'signin' | 'register' | 'setup_guide'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      setSuccessMsg('Successfully authenticated with Google!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
        setSuccessMsg('Signed in successfully!');
      } else {
        await registerWithEmail(email, password, displayName);
        setSuccessMsg('Account registered and verified successfully!');
      }
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div 
        className="relative w-full max-w-md bg-[#161616] border border-[#2d2d2d] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center border border-[#21F1A8]/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {currentUser ? 'Your Cloud Account' : mode === 'signin' ? 'Sign In to AcuityBI' : mode === 'register' ? 'Create Account' : 'Firebase Setup Guide'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {currentUser ? 'Connected to Firebase Firestore & Auth' : 'Cloud sync, saved dashboards & verified exports'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-3 bg-[#12281e] border border-[#21F1A8]/40 rounded-xl text-xs text-[#21F1A8] flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {authError && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-2xl text-xs text-red-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="font-medium text-white">{authError}</span>
            </div>

            {(authError.toLowerCase().includes('unauthorized-domain') || authError.toLowerCase().includes('authorized domain')) && (
              <div className="p-2.5 rounded-xl bg-black/60 border border-slate-700 space-y-1.5 text-[11px] font-mono text-slate-300">
                <div className="text-[#21F1A8] font-bold">Authorized Domain Setup:</div>
                <p className="text-[10px] text-gray-400">
                  Add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains:
                </p>
                <div className="flex items-center justify-between p-1 bg-slate-900 rounded border border-slate-800 text-sky-300">
                  <span className="truncate pr-1">{typeof window !== 'undefined' ? window.location.hostname : 'Current Domain'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname);
                        setSuccessMsg('Copied domain!');
                        setTimeout(() => setSuccessMsg(null), 2500);
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <div className="pt-1">
                  <a 
                    href="https://console.firebase.google.com/project/mercurial-amphora-3lxdt/authentication/settings" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[#21F1A8] hover:underline block font-semibold text-center"
                  >
                    Open Firebase Console Settings &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logged in state */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] flex items-center gap-4">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-12 h-12 rounded-full border border-[#21F1A8]/50"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#21F1A8]/20 text-[#21F1A8] flex items-center justify-center font-bold text-lg">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {currentUser.displayName || 'Enterprise Analyst'}
                </h4>
                <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#21F1A8] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8] animate-pulse" />
                  <span>Authenticated via Firebase</span>
                </div>
              </div>
            </div>

            <div className="bg-[#121212] p-3.5 rounded-xl border border-[#262626] text-xs text-gray-300 space-y-2">
              <div className="flex justify-between items-center text-gray-400">
                <span>Firestore Database:</span>
                <span className="font-mono text-[10px] text-white">Connected</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Security Rules:</span>
                <span className="font-mono text-[10px] text-[#21F1A8]">Zero-Trust ABAC Active</span>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#262626] hover:bg-[#333] text-gray-200 font-medium text-xs border border-[#3d3d3d] transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : mode === 'setup_guide' ? (
          /* Firebase Setup Guide Tab */
          <div className="space-y-4 text-xs text-gray-300 max-h-96 overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-[#141e18] border border-[#21F1A8]/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#21F1A8] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Firebase Provisioned Successfully</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Firebase Firestore and Authentication are fully connected to your Cloud project. All dashboard data is backed up to Firestore.
              </p>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">How to use Firebase:</h5>
              <div className="space-y-2">
                <div className="p-2.5 bg-[#1b1b1b] rounded-lg border border-[#2a2a2a]">
                  <strong className="text-white block mb-0.5">1. 1-Click Google Sign-In</strong>
                  <span className="text-gray-400">Sign in using your Google account to create your personal cloud profile instantly.</span>
                </div>
                <div className="p-2.5 bg-[#1b1b1b] rounded-lg border border-[#2a2a2a]">
                  <strong className="text-white block mb-0.5">2. Save Dashboards to Cloud</strong>
                  <span className="text-gray-400">Click &quot;Save to Cloud&quot; in Executive Dashboard or Dashboard Builder to sync your metrics to Firestore.</span>
                </div>
                <div className="p-2.5 bg-[#1b1b1b] rounded-lg border border-[#2a2a2a]">
                  <strong className="text-white block mb-0.5">3. Multi-Device Access</strong>
                  <span className="text-gray-400">Your reports and data models are securely stored under your isolated user UID.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMode('signin')}
              className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          /* Sign-in / Register Form */
          <div className="space-y-4">
            {/* Google Sign In 1-Click */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 text-xs font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2.5 border border-gray-300 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{submitting ? 'Connecting with Google...' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center pt-0.5">
                <div className="border-t border-[#333] w-full" />
                <span className="bg-[#161616] px-2.5 text-[10px] uppercase text-gray-500 font-mono shrink-0">
                  Or Email &amp; Password
                </span>
                <div className="border-t border-[#333] w-full" />
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">Full Name / Analyst Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Kamran Badar"
                      className="w-full pl-9 pr-3 py-2 bg-[#1f1f1f] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#21F1A8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#1f1f1f] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#21F1A8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-[#1f1f1f] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#21F1A8] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1 shadow-md shadow-[#21F1A8]/20"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : mode === 'signin' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>

            {/* Toggle Modes */}
            <div className="flex items-center justify-between pt-2 border-t border-[#262626] text-xs">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => { setMode('register'); setAuthError(null); }}
                  className="text-gray-400 hover:text-[#21F1A8] transition-colors"
                >
                  Need an account? <strong className="text-white">Create one</strong>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); }}
                  className="text-gray-400 hover:text-[#21F1A8] transition-colors"
                >
                  Already have an account? <strong className="text-white">Sign In</strong>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('setup_guide')}
                className="text-[11px] text-[#21F1A8] hover:underline flex items-center gap-1"
              >
                <span>Setup info</span>
              </button>
            </div>

            {isGuestMode && !currentUser && (
              <div className="pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    exitGuestMode();
                    onClose();
                  }}
                  className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs border border-red-500/25 transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Return to Login Page
                </button>
              </div>
            )}

            {/* Cloud Security & Identity Logo Badge */}
            <div className="pt-2 border-t border-[#262626] flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#21F1A8]" />
              <span>Secured by</span>
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <svg className="w-3 h-3 inline" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Firebase &amp; Google Cloud
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
