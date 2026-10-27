import React, { useState, useEffect } from 'react';
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
  CheckCircle,
  Activity,
  Layers,
  Database
} from 'lucide-react';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { DataCanvasAnimation } from '../auth/DataCanvasAnimation';
import { ToastContainer } from '../common/ToastContainer';

export const LoginPage: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    enterAsGuest,
    authError, 
    setAuthError 
  } = useFirebaseAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Force clean theme state on mount so light-theme styles don't conflict
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      setSuccessMsg('Google authentication verified. Entering platform...');
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
        setSuccessMsg('Authentication successful. Entering platform...');
      } else {
        await registerWithEmail(email, password, displayName);
        setSuccessMsg('Account registered and verified. Entering platform...');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="login-page-root min-h-screen w-full flex flex-col justify-between selection:bg-[#21F1A8]/30 selection:text-[#21F1A8] relative overflow-hidden font-sans"
      style={{ background: 'radial-gradient(130% 130% at 50% 0%, #182844 0%, #0e1828 45%, #080f1a 100%)', color: '#e2e8f0' }}
    >
      {/* 60fps Interactive HTML5 Data Wave & Circuit Animation */}
      <DataCanvasAnimation />

      {/* Atmospheric luminous gradient lenses */}
      <div className="absolute -top-24 -left-24 w-[520px] h-[520px] bg-[#21F1A8]/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-[520px] h-[520px] bg-[#00D2FF]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-[520px] h-[520px] bg-[#3B82F6]/18 rounded-full blur-[130px] pointer-events-none" />

      {/* Subtle Data Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.055] pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* 1. TOP HEADER BAR (BRIGHT & HIGH CONTRAST) */}
      <header 
        className="login-header relative z-30 w-full px-5 sm:px-8 py-3.5 flex items-center justify-between border-b shadow-lg"
        style={{ 
          backgroundColor: 'rgba(21, 33, 54, 0.92)', 
          borderColor: 'rgba(33, 241, 168, 0.35)',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(33,241,168,0.25)] border"
            style={{ 
              background: 'linear-gradient(135deg, rgba(33, 241, 168, 0.2), rgba(0, 210, 255, 0.2))',
              borderColor: 'rgba(33, 241, 168, 0.5)',
              color: '#21F1A8'
            }}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-wider flex items-center gap-0.5">
                <span style={{ color: '#ffffff' }}>ACUITY</span>
                <span style={{ color: '#21F1A8' }}>BI</span>
              </span>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border"
                style={{ 
                  backgroundColor: 'rgba(33, 241, 168, 0.15)', 
                  color: '#21F1A8',
                  borderColor: 'rgba(33, 241, 168, 0.35)'
                }}
              >
                v2.5 Enterprise
              </span>
            </div>
            <p className="text-[11px] font-mono tracking-tight hidden sm:block font-medium" style={{ color: '#f1f5f9' }}>
              Autonomous AI Data Analyst & BI Engineering Platform
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={enterAsGuest}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(33,241,168,0.25)] hover:shadow-[0_0_20px_rgba(33,241,168,0.4)] cursor-pointer hover:scale-[1.02]"
            style={{ backgroundColor: '#21F1A8', color: '#06101e' }}
          >
            <span>Explore as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT-SCREEN WORKSPACE */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start w-full">
          
          {/* LEFT COLUMN: LIVE STREAMING DATA ANALYTICS & MODULE PREVIEW */}
          <div className="lg:col-span-7 space-y-5 hidden lg:block pr-2">
            
            {/* Grand Branding & Headline */}
            <div className="space-y-2.5">
              <div 
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-mono font-bold tracking-wide"
                style={{ 
                  backgroundColor: 'rgba(33, 241, 168, 0.1)', 
                  color: '#21F1A8', 
                  borderColor: 'rgba(33, 241, 168, 0.3)' 
                }}
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>ENTERPRISE AUTONOMOUS DATA INTELLIGENCE</span>
              </div>

              <h1 
                className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.12]"
                style={{ color: '#ffffff' }}
              >
                Empower Decision Making with{' '}
                <span className="bg-gradient-to-r from-white via-[#21F1A8] to-[#00D2FF] bg-clip-text text-transparent">
                  Grounded Telemetry
                </span>
              </h1>

              <p className="text-sm sm:text-base max-w-xl leading-relaxed font-normal" style={{ color: '#f8fafc' }}>
                Ingest raw business datasets, auto-model Star Schemas, compute verified DAX measures, run in-browser SQL & Python labs, and export C-suite PDF reports and Power BI PBIP packages.
              </p>
            </div>

            {/* SLEEK ENTERPRISE CAPABILITY HIGHLIGHTS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div 
                className="p-4 rounded-2xl border backdrop-blur-md transition-all shadow-md"
                style={{ 
                  backgroundColor: 'rgba(16, 28, 50, 0.92)', 
                  borderColor: 'rgba(33, 241, 168, 0.35)' 
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#21F1A8] shadow-[0_0_8px_#21F1A8]" />
                  <span className="text-xs font-bold text-white tracking-wide">Auto Star Schema</span>
                </div>
                <p className="text-xs leading-relaxed font-normal" style={{ color: '#e2e8f0' }}>
                  Automated fact & dimension classification with relational integrity validation.
                </p>
              </div>

              <div 
                className="p-4 rounded-2xl border backdrop-blur-md transition-all shadow-md"
                style={{ 
                  backgroundColor: 'rgba(16, 28, 50, 0.92)', 
                  borderColor: 'rgba(0, 210, 255, 0.35)' 
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
                  <span className="text-xs font-bold text-white tracking-wide">DAX & SQL Engines</span>
                </div>
                <p className="text-xs leading-relaxed font-normal" style={{ color: '#e2e8f0' }}>
                  Synthesize time intelligence formulas, SQL models, and sandbox Python scripts.
                </p>
              </div>

              <div 
                className="p-4 rounded-2xl border backdrop-blur-md transition-all shadow-md"
                style={{ 
                  backgroundColor: 'rgba(16, 28, 50, 0.92)', 
                  borderColor: 'rgba(59, 130, 246, 0.35)' 
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  <span className="text-xs font-bold text-white tracking-wide">Power BI (.pbip)</span>
                </div>
                <p className="text-xs leading-relaxed font-normal" style={{ color: '#e2e8f0' }}>
                  Download production PBIP projects, TMDL model definitions, and executive briefs.
                </p>
              </div>
            </div>

            {/* Corner Developer Attribution Pill (Discreet & Elegant) */}
            <div className="flex items-center justify-between pt-2">
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm text-xs font-mono"
                style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.8)', 
                  borderColor: 'rgba(33, 241, 168, 0.3)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8]" />
                <span className="text-gray-400">Architected by</span>
                <span className="text-white font-semibold">Kamran Badar</span>
                <span className="text-gray-600">·</span>
                <span className="text-[#21F1A8] font-medium">Analytics Technologies</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Enterprise Pipeline Ready</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: HIGH-CONTRAST BRIGHT SLATE LOGIN CONSOLE */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div 
              className="rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 relative border"
              style={{
                backgroundColor: 'rgba(22, 36, 60, 0.95)',
                borderColor: 'rgba(33, 241, 168, 0.38)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 35px rgba(33, 241, 168, 0.15)'
              }}
            >
              {/* Subtle top glow bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
                style={{ background: 'linear-gradient(90deg, transparent, #21F1A8, #00D2FF, transparent)' }}
              />

              {/* Title Header */}
              <div className="text-center space-y-1.5 pt-1">
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold tracking-wide"
                  style={{
                    backgroundColor: 'rgba(33, 241, 168, 0.12)',
                    color: '#21F1A8',
                    borderColor: 'rgba(33, 241, 168, 0.35)'
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> SECURE GOVERNED ACCESS
                </div>
                <h2 
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                  style={{ color: '#ffffff' }}
                >
                  {mode === 'signin' ? 'Sign In to Your Workspace' : 'Create Analyst Account'}
                </h2>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {mode === 'signin' 
                    ? 'Enter your credentials to access executive telemetry, modeling & labs.' 
                    : 'Register to unlock persistent Firestore cloud dashboards & exports.'}
                </p>
              </div>

              {/* 1-Click Fast Google Sign-In Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderColor: '#cbd5e1',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
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

                {/* Elegant Divider */}
                <div className="relative flex items-center justify-center pt-1">
                  <div className="border-t w-full" style={{ borderColor: '#243b5e' }} />
                  <span 
                    className="px-3 text-[10px] font-mono uppercase tracking-wider shrink-0 font-medium"
                    style={{ backgroundColor: 'rgba(22, 36, 60, 0.95)', color: '#94a3b8' }}
                  >
                    Or with Enterprise Credentials
                  </span>
                  <div className="border-t w-full" style={{ borderColor: '#243b5e' }} />
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div 
                className="grid grid-cols-2 p-1 rounded-2xl border"
                style={{ backgroundColor: '#111d32', borderColor: '#243b5e' }}
              >
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); setSuccessMsg(null); }}
                  className="py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: mode === 'signin' ? '#21F1A8' : 'transparent',
                    color: mode === 'signin' ? '#06101e' : '#94a3b8',
                    fontWeight: mode === 'signin' ? 'bold' : 'normal',
                    boxShadow: mode === 'signin' ? '0 2px 8px rgba(33,241,168,0.3)' : 'none'
                  }}
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setAuthError(null); setSuccessMsg(null); }}
                  className="py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: mode === 'register' ? '#21F1A8' : 'transparent',
                    color: mode === 'register' ? '#06101e' : '#94a3b8',
                    fontWeight: mode === 'register' ? 'bold' : 'normal',
                    boxShadow: mode === 'register' ? '0 2px 8px rgba(33,241,168,0.3)' : 'none'
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </button>
              </div>

              {/* Alert Feedback Messages */}
              {authError && (
                <div 
                  className="p-3.5 rounded-2xl text-xs flex flex-col gap-2 border animate-fadeIn"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span className="font-medium text-white">{authError}</span>
                  </div>

                  {(authError.toLowerCase().includes('unauthorized-domain') || authError.toLowerCase().includes('authorized domain')) && (
                    <div className="mt-1 p-3 rounded-xl bg-slate-900/90 border border-slate-700/70 space-y-2 text-[11px] font-mono text-slate-300">
                      <div className="text-[#21F1A8] font-bold">Quick Fix (Firebase Console):</div>
                      <div>1. Open Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</div>
                      <div>2. Click &quot;Add domain&quot; and paste:</div>
                      <div className="flex items-center justify-between p-1.5 bg-black/70 rounded border border-slate-700 text-sky-300 select-all">
                        <span className="truncate pr-2">{typeof window !== 'undefined' ? window.location.hostname : 'Current Domain'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(window.location.hostname);
                              setSuccessMsg('Copied domain to clipboard!');
                              setTimeout(() => setSuccessMsg(null), 3000);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] cursor-pointer shrink-0 font-sans"
                        >
                          Copy Domain
                        </button>
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <a 
                          href="https://console.firebase.google.com/project/mercurial-amphora-3lxdt/authentication/settings" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#21F1A8] hover:underline flex items-center gap-1 font-semibold"
                        >
                          Open Firebase Console &rarr;
                        </a>
                        <button
                          type="button"
                          onClick={enterAsGuest}
                          className="text-amber-300 hover:underline cursor-pointer"
                        >
                          Or Explore as Guest
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div 
                  className="p-3 rounded-xl text-xs flex items-center gap-2 border animate-fadeIn"
                  style={{ backgroundColor: 'rgba(33, 241, 168, 0.15)', borderColor: 'rgba(33, 241, 168, 0.4)', color: '#21F1A8' }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Input Form with explicit inline styles (guaranteed dark inputs) */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium" style={{ color: '#cbd5e1' }}>Analyst Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lead BI Engineer"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="login-input w-full rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: '#101c30',
                          borderColor: '#263e63',
                          color: '#ffffff'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium" style={{ color: '#cbd5e1' }}>Enterprise Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="analyst@enterprise.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-input w-full rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: '#101c30',
                        borderColor: '#263e63',
                        color: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium" style={{ color: '#cbd5e1' }}>Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input w-full rounded-xl pl-9 pr-10 py-2.5 text-xs focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: '#101c30',
                        borderColor: '#263e63',
                        color: '#ffffff'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-[0_0_20px_rgba(33,241,168,0.3)] hover:shadow-[0_0_25px_rgba(33,241,168,0.45)] hover:scale-[1.01]"
                  style={{
                    background: 'linear-gradient(90deg, #21F1A8 0%, #00D2FF 100%)',
                    color: '#06101e'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Workspace...</span>
                    </>
                  ) : mode === 'signin' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In & Open Platform</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Enter</span>
                    </>
                  )}
                </button>
              </form>

              {/* Instant Test Drive / Guest Access Card */}
              <div className="pt-2 border-t" style={{ borderColor: '#233857' }}>
                <div 
                  className="rounded-2xl p-3 flex items-center justify-between gap-3 border shadow-sm"
                  style={{ backgroundColor: 'rgba(18, 29, 48, 0.95)', borderColor: '#253d62' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{ 
                        backgroundColor: 'rgba(33, 241, 168, 0.2)', 
                        color: '#21F1A8', 
                        borderColor: 'rgba(33, 241, 168, 0.4)' 
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">Test Drive Platform</div>
                      <div className="text-[10px] text-gray-300 truncate font-medium">Instant access with demo datasets</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={enterAsGuest}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border flex items-center gap-1 cursor-pointer hover:border-[#21F1A8]/60 hover:scale-[1.02]"
                    style={{ 
                      backgroundColor: '#162842', 
                      color: '#21F1A8', 
                      borderColor: '#2b4772' 
                    }}
                  >
                    <span>Launch Demo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Cloud Security & Identity Logo Badge */}
              <div 
                className="pt-2.5 border-t flex items-center justify-center gap-2 text-[11px] font-mono text-gray-400"
                style={{ borderColor: '#233857' }}
              >
                <ShieldCheck className="w-4 h-4 text-[#21F1A8]" />
                <span>Enterprise Identity</span>
                <span className="text-gray-600">·</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Firebase &amp; Google Cloud
                </span>
              </div>

              {/* Mobile Developer Attribution Notice */}
              <div className="lg:hidden text-center pt-2 border-t text-[10px] font-mono" style={{ borderColor: '#233857', color: '#94a3b8' }}>
                Developed by <span className="text-white font-semibold">Kamran Badar</span> | Analytics Technologies
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER BAR WITH TELEMETRY & DEVELOPER SIGNATURE */}
      <footer 
        className="login-header relative z-20 w-full px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono shadow-lg"
        style={{ 
          backgroundColor: 'rgba(21, 33, 54, 0.95)', 
          borderColor: 'rgba(33, 241, 168, 0.3)',
          color: '#cbd5e1'
        }}
      >
        {/* Firebase Live Cloud Telemetry */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#21F1A8] animate-pulse" />
          <span className="text-gray-300">Firebase Cloud Firestore:</span>
          <span className="text-[#21F1A8] font-bold">Online & Synchronized</span>
          <span className="text-gray-600 hidden sm:inline">·</span>
          <span className="text-gray-400 hidden sm:inline font-mono text-[10px]">mercurial-amphora-3lxdt</span>
        </div>

        {/* Developer Attribution (Requested: 'Badar' removed from company) */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Developed by:</span>
          <span className="text-white font-bold tracking-wide">Kamran Badar</span>
          <span className="text-gray-600">|</span>
          <span className="text-[#21F1A8] font-medium">Analytics Technologies</span>
        </div>
      </footer>

      {/* Global Toast Notifications for Login */}
      <ToastContainer />
    </div>
  );
};
