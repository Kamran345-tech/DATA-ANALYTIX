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
    if (typeof document !== 'undefined') {
      if (nextTheme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      }
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col lg:flex-row relative overflow-x-hidden font-sans transition-colors duration-200 ${
      isLight ? 'bg-[#F8FAFC] text-[#0F172A]' : 'bg-[#0B1120] text-[#F8FAFC]'
    }`}>
      {/* ========================================================================= */}
      {/* LEFT COLUMN: BRAND, DATA ENGINEERING & ANALYTICS VISUALIZATION (55% WIDTH) */}
      {/* ========================================================================= */}
      <div className={`relative lg:w-[54%] xl:w-[56%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r transition-colors duration-200 ${
        isLight 
          ? 'bg-gradient-to-br from-slate-100 via-white to-slate-100/70 border-slate-200' 
          : 'bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#121C2F] border-[#273449]'
      }`}>
        {/* Dynamic HTML5 Canvas Mesh Animation */}
        <div className="absolute inset-0 pointer-events-none opacity-80 z-0">
          <DataCanvasAnimation />
        </div>

        {/* Ambient luminous glow spots */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Geometric Data Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ 
            backgroundImage: isLight 
              ? 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)' 
              : 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px' 
          }}
        />

        {/* Left Header / Brand Lockup */}
        <div className="relative z-10 flex items-center justify-between">
          <BrandLogo size="lg" showSubtitle={true} />
          
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>
              Enterprise Engine v2.5
            </span>
          </div>
        </div>

        {/* Left Center Content: Headline & Pipeline Showcase */}
        <div className="relative z-10 my-auto py-8 lg:py-12 space-y-8 max-w-xl">
          {/* Typographic Kicker */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase">
            <span className={isLight ? 'text-cyan-700' : 'text-[#22D3EE]'}>DATA ANALYTICS</span>
            <span className="text-slate-400">·</span>
            <span className={isLight ? 'text-indigo-700' : 'text-[#818CF8]'}>DATA ENGINEERING</span>
            <span className="text-slate-400">·</span>
            <span className={isLight ? 'text-emerald-700' : 'text-[#34D399]'}>BUSINESS INTELLIGENCE</span>
          </div>

          {/* Master Headline */}
          <div className="space-y-3">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
              <span className={isLight ? 'text-slate-900' : 'text-white'}>
                Your Data. Your Insights.
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Your Next Move.
              </span>
            </h1>

            <p className={`text-base sm:text-lg leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-[#A8B3C7]'
            }`}>
              Access your analytics workspace and transform complex data into meaningful business intelligence. Ingest raw spreadsheets, construct star-schema models, synthesize verified DAX & SQL, and deliver boardroom-ready telemetry.
            </p>
          </div>

          {/* Abstract Data Engineering Pipeline DAG Visualization */}
          <div className="glass-panel p-5 rounded-2xl relative transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  Data Pipeline Architecture
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Deterministic Engine
              </span>
            </div>

            {/* 4 Pipeline Stages */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { step: '01', name: 'Ingestion', sub: 'CSV, XLSX, DB', color: 'text-cyan-400' },
                { step: '02', name: 'Quality Audit', sub: '4D Quality Score', color: 'text-indigo-400' },
                { step: '03', name: 'Star Schema', sub: '1:N Kimball ERD', color: 'text-purple-400' },
                { step: '04', name: 'PBIP & Reports', sub: 'DAX & Boardroom', color: 'text-emerald-400' }
              ].map((stage, idx) => (
                <div 
                  key={idx}
                  className="glass-card p-3 rounded-xl relative"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{stage.step}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                  <div className={`text-xs font-bold ${stage.color}`}>{stage.name}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{stage.sub}</div>
                </div>
              ))}
            </div>

            {/* Architectural Highlights */}
            <div className="mt-4 pt-3.5 border-t border-[#273449]/40 flex flex-wrap items-center justify-between gap-y-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400" /> In-Browser ANSI SQL
              </span>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" /> Python Pandas Sandbox
              </span>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Power BI PBIP Native
              </span>
            </div>
          </div>
        </div>

        {/* Left Footer: Attribution & Cloud Status */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-4 border-t border-[#273449]/30">
          <div className="flex items-center gap-2">
            <span>Architecture by <strong className="text-cyan-400 font-semibold">Kamran Badar</strong></span>
            <span>|</span>
            <span>Data Analytix</span>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Trust Enterprise Identity</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: ELEVATED AUTHENTICATION CONSOLE (46% WIDTH)                 */}
      {/* ========================================================================= */}
      <div className={`lg:w-[46%] xl:w-[44%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative z-10 transition-colors duration-200 overflow-hidden ${
        isLight ? 'bg-gradient-to-b from-slate-50 via-white to-slate-100/60' : 'bg-gradient-to-b from-[#070D1B] via-[#0B1120] to-[#0F172A]'
      }`}>
        {/* Soft Ambient Glow Orbs in Right Column */}
        <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full ambient-glow-violet blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full ambient-glow-cyan blur-3xl pointer-events-none" />

        {/* Right Top Bar: Theme Switcher & Guest Access */}
        <div className="flex items-center justify-between mb-6 lg:mb-0 relative z-10">
          <div className="lg:hidden">
            <BrandLogo size="sm" showSubtitle={false} />
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isLight 
                  ? 'glass-btn-secondary text-slate-700' 
                  : 'glass-btn-secondary text-cyan-400'
              }`}
              title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
              aria-label="Toggle Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Test Drive Button */}
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

        {/* Right Center: Elevated Authentication Card */}
        <div className="my-auto py-6 max-w-md w-full mx-auto space-y-6 relative z-10">
          {/* Card Frame */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 relative transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_30px_rgba(34,211,238,0.08)]">
            {/* Top Accent Gradient Bar with Subtle Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]" />

            {/* Header Titles */}
            <div className="space-y-1.5 pt-1 mb-5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                  isLight ? 'text-cyan-700' : 'text-cyan-400'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> SECURE GOVERNED ACCESS
                </span>
                {mode === 'forgot_password' && (
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setAuthError(null); setSuccessMsg(null); }}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    &larr; Back to Sign In
                  </button>
                )}
              </div>

              <h2 className={`font-heading text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {mode === 'signin' && 'Welcome Back'}
                {mode === 'register' && 'Create Analyst Account'}
                {mode === 'forgot_password' && 'Reset Workspace Password'}
              </h2>

              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#A8B3C7]'}`}>
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
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
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

                {/* Clean Divider */}
                <div className="relative flex items-center justify-center pt-1">
                  <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
                  <span className={`px-3 text-[10px] font-mono uppercase tracking-wider shrink-0 font-medium ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Or with Email
                  </span>
                  <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
                </div>
              </div>
            )}

            {/* Mode Switcher Tabs (Sign In / Register) */}
            {mode !== 'forgot_password' && (
              <div className={`grid grid-cols-2 p-1 rounded-xl border mb-4 glass-card ${
                isLight ? 'border-slate-300' : 'border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); setSuccessMsg(null); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'glass-btn-primary shadow-xs font-bold'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
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
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </button>
              </div>
            )}

            {/* Error Feedback Banner */}
            {authError && (
              <div className="p-3.5 rounded-xl text-xs flex flex-col gap-2 border bg-rose-500/10 border-rose-500/30 text-rose-400 animate-fadeIn mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="font-medium text-rose-300">{authError}</span>
                </div>

                {(authError.toLowerCase().includes('unauthorized-domain') || authError.toLowerCase().includes('authorized domain')) && (
                  <div className="mt-1 p-2.5 rounded-lg bg-[#0B1120] border border-slate-700 space-y-1.5 text-[11px] font-mono text-slate-300">
                    <div className="text-cyan-400 font-bold">Domain Authorization Step:</div>
                    <div>1. Open Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</div>
                    <div className="flex items-center justify-between p-1.5 bg-black/50 rounded border border-slate-700 text-cyan-300 select-all">
                      <span className="truncate pr-2">{typeof window !== 'undefined' ? window.location.hostname : 'Current Domain'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(window.location.hostname);
                            setSuccessMsg('Copied current domain to clipboard!');
                            setTimeout(() => setSuccessMsg(null), 3000);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] cursor-pointer shrink-0 font-sans font-bold"
                      >
                        Copy Domain
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Feedback Banner */}
            {successMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-fadeIn mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#A8B3C7]'}`}>
                    Analyst Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
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
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#A8B3C7]'}`}>
                  Enterprise Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
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
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#A8B3C7]'}`}>
                      Password
                    </label>
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
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
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
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Me Option */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                    />
                    <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                      Remember this session
                    </span>
                  </label>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 glass-btn-primary shadow-[0_4px_24px_rgba(8,145,178,0.45)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
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

            {/* Instant Demo Sandbox Access Card */}
            <div className={`mt-5 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <div className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 relative transition-all">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Test Drive Platform
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Instant access with demo datasets
                    </div>
                  </div>
                </div>
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

            {/* Cloud Identity Badge */}
            <div className={`mt-4 pt-3 border-t flex items-center justify-center gap-2 text-[11px] font-mono ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enterprise Identity</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 font-medium">
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
        </div>

        {/* Right Footer / Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-4 border-t border-[#273449]/30">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Encrypted 256-bit SSL Session</span>
          </div>
          <a 
            href="https://data-analytix-flax.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>data-analytix-flax.vercel.app</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
