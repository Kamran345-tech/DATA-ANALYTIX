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
  LogOut,
  KeyRound
} from 'lucide-react';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { usePlatform } from '../../store/usePlatformStore';

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
    resetPassword,
    logout,
    authError, 
    setAuthError 
  } = useFirebaseAuth();

  const { themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot_password' | 'setup_guide'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError(null);
    setSuccessMsg(null);
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
    setSuccessMsg(null);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
        setSuccessMsg('Signed in successfully!');
      } else if (mode === 'register') {
        await registerWithEmail(email, password, displayName);
        setSuccessMsg('Account registered and verified successfully!');
      } else if (mode === 'forgot_password') {
        await resetPassword(email);
        setSuccessMsg(`Password reset link dispatched to ${email}. Check your inbox.`);
      }
      if (mode !== 'forgot_password') {
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      }
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
        className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 transition-colors ${
          isLight 
            ? 'glass-panel text-slate-900 border-slate-200/80 shadow-[0_16px_50px_rgba(0,0,0,0.12)]' 
            : 'glass-panel text-[#F8FAFC] shadow-[0_16px_60px_rgba(0,0,0,0.5)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400" />

        {/* Header with Close */}
        <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-[#273449]'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {currentUser ? 'Data Analytix Account' : mode === 'signin' ? 'Sign In to Data Analytix' : mode === 'register' ? 'Create Analyst Account' : mode === 'forgot_password' ? 'Reset Password' : 'Cloud Setup Guide'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentUser ? 'Connected to Firebase Firestore & Auth' : 'Cloud sync, saved dashboards & verified exports'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#1E2D4A]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {authError && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 space-y-2 animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="font-medium text-white">{authError}</span>
            </div>

            {(authError.toLowerCase().includes('unauthorized-domain') || authError.toLowerCase().includes('authorized domain')) && (
              <div className="p-2.5 rounded-xl bg-[#0B1120] border border-slate-700 space-y-1.5 text-[11px] font-mono text-slate-300">
                <div className="text-cyan-400 font-bold">Authorized Domain Setup:</div>
                <p className="text-[10px] text-slate-400">
                  Add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains:
                </p>
                <div className="flex items-center justify-between p-1 bg-black/50 rounded border border-slate-800 text-cyan-300">
                  <span className="truncate pr-1">{typeof window !== 'undefined' ? window.location.hostname : 'Current Domain'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname);
                        setSuccessMsg('Copied domain to clipboard!');
                        setTimeout(() => setSuccessMsg(null), 2500);
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] cursor-pointer font-bold"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logged in state */}
        {currentUser ? (
          <div className="space-y-5">
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121C2F] border-[#273449]'
            }`}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-12 h-12 rounded-full border border-cyan-400/50"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/30">
                  {(currentUser.displayName || currentUser.email || 'A')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {currentUser.displayName || 'Enterprise Analyst'}
                </h4>
                <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Authenticated via Firebase</span>
                </div>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#0B1120] border-[#273449] text-slate-300'
            }`}>
              <div className="flex justify-between items-center text-slate-400">
                <span>Firestore Cloud:</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">Synchronized</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Security Engine:</span>
                <span className="font-mono text-[10px] text-cyan-400 font-bold">Role-Based Access Active</span>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : mode === 'setup_guide' ? (
          /* Firebase Setup Guide Tab */
          <div className="space-y-4 text-xs text-slate-300 max-h-96 overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 text-cyan-300">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Firebase Provisioned Successfully</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Firebase Firestore and Authentication are fully connected to your Cloud project. All dashboard data is backed up to Firestore.
              </p>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">
                How to use Data Analytix Cloud:
              </h5>
              <div className="space-y-2">
                <div className="p-2.5 bg-[#121C2F] rounded-lg border border-[#273449]">
                  <strong className="text-white block mb-0.5">1. 1-Click Google Sign-In</strong>
                  <span className="text-slate-400">Sign in using your Google account to create your personal cloud profile instantly.</span>
                </div>
                <div className="p-2.5 bg-[#121C2F] rounded-lg border border-[#273449]">
                  <strong className="text-white block mb-0.5">2. Save Dashboards to Cloud</strong>
                  <span className="text-slate-400">Save custom visual cards and calculations directly to your isolated user partition.</span>
                </div>
                <div className="p-2.5 bg-[#121C2F] rounded-lg border border-[#273449]">
                  <strong className="text-white block mb-0.5">3. Multi-Device Access</strong>
                  <span className="text-slate-400">Your reports and data models are securely stored under your isolated user UID.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMode('signin')}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          /* Sign-in / Register / Forgot Password Form */
          <div className="space-y-4">
            {/* Google Sign In 1-Click */}
            {mode !== 'forgot_password' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-2.5 border border-slate-300 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
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
                  <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-[#273449]'}`} />
                  <span className={`px-2.5 text-[10px] uppercase font-mono shrink-0 ${
                    isLight ? 'bg-white text-slate-500' : 'bg-[#172338] text-slate-400'
                  }`}>
                    Or Email &amp; Password
                  </span>
                  <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-[#273449]'}`} />
                </div>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Analyst Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Lead BI Engineer"
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Enterprise Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@enterprise.com"
                    className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setAuthError(null); setSuccessMsg(null); }}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1 cursor-pointer uppercase font-heading shadow-md"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : mode === 'signin' ? (
                  <LogIn className="w-4 h-4" />
                ) : mode === 'register' ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>
                  {mode === 'signin' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Recovery Email'}
                </span>
              </button>
            </form>

            {/* Toggle Modes */}
            <div className={`flex items-center justify-between pt-2 border-t text-xs ${isLight ? 'border-slate-200' : 'border-[#273449]'}`}>
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => { setMode('register'); setAuthError(null); }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  Need an account? <strong className="text-cyan-400">Create one</strong>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  Already have an account? <strong className="text-cyan-400">Sign In</strong>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('setup_guide')}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Setup info</span>
              </button>
            </div>

            {isGuestMode && !currentUser && (
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-[#273449]'}`}>
                <button
                  type="button"
                  onClick={() => {
                    exitGuestMode();
                    onClose();
                  }}
                  className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Return to Login Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
