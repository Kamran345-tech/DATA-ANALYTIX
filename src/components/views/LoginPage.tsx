import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Eye,
  EyeOff,
  BarChart3,
  Activity,
  Layers,
  Database,
  GitBranch,
  KeyRound,
  Sun,
  Moon,
  ExternalLink,
  Cpu,
  Check,
  TrendingUp,
  FileCode,
  CheckCircle
} from 'lucide-react';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { usePlatform } from '../../store/usePlatformStore';
import { BrandLogo } from '../common/BrandLogo';
import { DataCanvasAnimation } from '../auth/DataCanvasAnimation';
import { ToastContainer } from '../common/ToastContainer';
import { Login3DPillarScene } from '../modern/Hero3DScene';

export const LoginPage: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    resetPassword,
    enterAsGuest,
    authError, 
    setAuthError 
  } = useFirebaseAuth();

  const { themeMode, setThemeMode } = usePlatform();
  const isLight = themeMode === 'light';

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError(null);
    setSuccessMsg(null);
    try {
      await loginWithGoogle();
      setSuccessMsg('Google identity verified. Initializing workspace...');
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
        setSuccessMsg('Authentication successful. Entering platform...');
      } else if (mode === 'register') {
        await registerWithEmail(email, password, displayName);
        setSuccessMsg('Account registered and verified. Entering platform...');
      } else if (mode === 'forgot_password') {
        await resetPassword(email);
        setSuccessMsg(`Password reset instructions sent to ${email}. Check your inbox.`);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = isLight ? 'dark' : 'light';
    setThemeMode(nextTheme);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-x-hidden font-sans transition-colors duration-200 bg-app text-primary">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: AUTHENTICATION FORM (STACKS FIRST ON MOBILE)                 */}
      {/* ========================================================================= */}
      <div className="lg:w-[48%] xl:w-[46%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative z-10 transition-colors duration-200 overflow-hidden order-1 bg-app text-primary">
        <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full ambient-glow-violet blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full ambient-glow-cyan blur-3xl pointer-events-none" />

        {/* Left Top Bar: Brand, Theme Switcher & Guest Access */}
        <div className="flex items-center justify-between mb-6 lg:mb-0 relative z-10">
          <BrandLogo size="sm" showSubtitle={false} />

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all cursor-pointer glass-btn-secondary text-accent"
              title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
              aria-label="Toggle Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={enterAsGuest}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all glass-btn-primary cursor-pointer"
            >
              <span>Explore as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Left Center: Elevated Authentication Card */}
        <div className="my-auto py-6 max-w-md w-full mx-auto space-y-6 relative z-10">
          <div className="depth-card glass-panel rounded-[20px] overflow-hidden p-6 sm:p-8 relative transition-all duration-300 bg-card border border-subtle shadow-lg">
            <div className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none transition-all bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />

            {/* Header Titles */}
            <div className="space-y-1.5 pt-1 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 text-accent">
                  <ShieldCheck className="w-3.5 h-3.5" /> SECURE GOVERNED ACCESS
                </span>
                {mode === 'forgot_password' && (
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setAuthError(null); setSuccessMsg(null); }}
                    className="text-xs text-accent hover:underline cursor-pointer"
                  >
                    &larr; Back to Sign In
                  </button>
                )}
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                {mode === 'signin' && 'Welcome Back'}
                {mode === 'register' && 'Create Analyst Account'}
                {mode === 'forgot_password' && 'Reset Workspace Password'}
              </h2>

              <p className="text-xs leading-relaxed text-secondary">
                {mode === 'signin' && 'Sign in to access executive telemetry, modeling, labs, and saved reports.'}
                {mode === 'register' && 'Register to unlock persistent Firestore cloud models, DAX libraries, and exports.'}
                {mode === 'forgot_password' && 'Enter your enterprise email address to receive password recovery instructions.'}
              </p>
            </div>

            {/* 1-Click Google Sign-In Button */}
            {mode !== 'forgot_password' && (
              <div className="space-y-3 mb-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 glass-btn-secondary"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted" />
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

                <div className="relative flex items-center justify-center pt-1">
                  <div className="border-t w-full border-subtle" />
                  <span className="px-3 text-[10px] font-mono uppercase tracking-wider shrink-0 font-medium text-muted">
                    Or with Email
                  </span>
                  <div className="border-t w-full border-subtle" />
                </div>
              </div>
            )}

            {/* Mode Switcher Tabs (Sign In / Register) */}
            {mode !== 'forgot_password' && (
              <div className="grid grid-cols-2 p-1 rounded-xl border mb-4 glass-card border-subtle">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); setSuccessMsg(null); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'glass-btn-primary shadow-xs font-bold'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setAuthError(null); setSuccessMsg(null); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'register'
                      ? 'glass-btn-primary shadow-xs font-bold'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </button>
              </div>
            )}

            {/* Error Feedback Banner */}
            {authError && (
              <div className="p-3.5 rounded-xl text-xs flex flex-col gap-2 border bg-rose-500/10 border-rose-500/30 text-danger animate-fadeIn mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
                  <span className="font-medium text-danger">{authError}</span>
                </div>
              </div>
            )}

            {/* Success Feedback Banner */}
            {successMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/30 text-success animate-fadeIn mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Labelled Form Inputs */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label htmlFor="auth-fullname" className="block text-xs font-semibold text-secondary">
                    Analyst Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 text-muted" />
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      placeholder="e.g. Lead BI Engineer"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      className="login-input w-full rounded-xl pl-9 pr-3 py-2.5 text-xs transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="auth-email" className="block text-xs font-semibold text-secondary">
                  Enterprise Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="analyst@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="login-input w-full rounded-xl pl-9 pr-3 py-2.5 text-xs transition-colors"
                  />
                </div>
              </div>

              {mode !== 'forgot_password' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-secondary">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setAuthError(null); setSuccessMsg(null); }}
                        className="text-[11px] text-accent hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-muted" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className="login-input w-full rounded-xl pl-9 pr-10 py-2.5 text-xs transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted hover:text-primary cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-subtle text-accent focus:ring-teal-500 w-3.5 h-3.5"
                    />
                    <span className="text-secondary">
                      Remember this session
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 glass-btn-primary shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-accent" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In & Open Platform</span>
                  </>
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account & Enter</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Email</span>
                  </>
                )}
              </button>
            </form>

            {/* Try with sample data link + Instant Demo Sandbox */}
            <div className="mt-5 pt-4 border-t border-subtle">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={enterAsGuest}
                  className="text-xs font-semibold text-accent hover:underline underline-offset-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try with sample data</span>
                </button>

                <button
                  type="button"
                  onClick={enterAsGuest}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer glass-btn-secondary"
                >
                  <span>Launch Demo</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-secondary pt-4 border-t border-subtle">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>Encrypted 256-bit SSL Session</span>
          </div>
          <a 
            href="https://data-analytix-flax.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-accent hover:underline flex items-center gap-1"
          >
            <span>data-analytix-flax.vercel.app</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: SLATE PANEL WITH 3-PILLAR SCENE (52% WIDTH)                 */}
      {/* ========================================================================= */}
      <div className={`relative lg:w-[52%] xl:w-[54%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden border-t lg:border-t-0 lg:border-l transition-colors duration-200 order-2 ${
        isLight 
          ? 'bg-slate-900 text-slate-100 border-slate-200' 
          : 'bg-[#0f172a] text-slate-100 border-[#273449]'
      }`}>
        <div className="absolute inset-0 pointer-events-none opacity-45 z-0">
          <DataCanvasAnimation />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <BrandLogo size="lg" showSubtitle={true} />
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Enterprise Engine v2.5</span>
          </div>
        </div>

        {/* Center Content + 3-Pillar Isometric Scene */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl mx-auto w-full">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-teal-400">
              <span>SQL</span>
              <span className="text-slate-500">·</span>
              <span className="text-indigo-400">PYTHON</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-400">POWER BI</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
              Raw data in.{' '}
              <span className="bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                Clear decisions out.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Ingest spreadsheets, profile data quality across 4 dimensions, model star schemas, and query in ANSI SQL, DAX, or Python.
            </p>
          </div>

          {/* 3-Pillar Scene */}
          <div className="py-2 flex items-center justify-center">
            <Login3DPillarScene />
          </div>

          {/* Pipeline Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { step: '01', name: 'Ingestion', sub: 'CSV, XLSX, DB', color: 'text-teal-400' },
              { step: '02', name: 'Quality Audit', sub: '4D Quality Score', color: 'text-indigo-400' },
              { step: '03', name: 'Star Schema', sub: '1:N Kimball ERD', color: 'text-sky-400' },
              { step: '04', name: 'PBIP & Reports', sub: 'DAX & Boardroom', color: 'text-emerald-400' }
            ].map((stage, idx) => (
              <div key={idx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>{stage.step}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                </div>
                <div className={`text-xs font-bold ${stage.color}`}>{stage.name}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{stage.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Footer */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span>Architecture by <strong className="text-teal-400 font-semibold">Kamran Badar</strong></span>
            <span>|</span>
            <span>Data Analytix</span>
          </div>
          <div className="flex items-center gap-1.5 text-teal-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Trust Enterprise Identity</span>
          </div>
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};

